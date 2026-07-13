// 驗證單一批次事件檔並合併進 data/events.json。
// 用法：node tools/merge-batch.mjs <batch.json> [--dry]
// --dry 只驗證不寫入。驗證不過則不合併、離開碼 1。

import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const batchPath = args.find((a) => !a.startsWith("--"));
if (!batchPath) { console.error("用法: node tools/merge-batch.mjs <batch.json> [--dry]"); process.exit(2); }

const VARS = new Set([
  "kpi.cash", "kpi.equity", "kpi.headcount", "kpi.product", "kpi.morale",
  "kpi.share", "kpi.brand", "kpi.satisfaction", "kpi.credit", "kpi.shareholder", "kpi.compliance",
  "aux.capacity", "aux.utilization", "aux.yieldRate", "aux.price", "aux.materialRate",
  "aux.turnover", "aux.supplierRel", "aux.channelRel", "aux.debt", "aux.interest",
  "aux.salaryAvg", "aux.marketing", "aux.rnd", "world.economyIndex", "world.rivalProduct",
]);
const COND_VARS = new Set([...VARS, "kpi.revenue", "kpi.profit"]);
const DEPTS = new Set(["rnd", "prod", "mkt", "hr", "fin", "shareholder", "bank", "supplier", "channel", "gov", "media"]);
const NPCS = new Set(["shen", "hao", "jia", "you", "qian", "dong", "tian", "shi", "bai", "guan", "maque"]);
const TYPES = new Set(["routine", "opportunity", "crisis", "chain"]);
const OPS_COND = new Set(["<", "<=", ">", ">=", "=="]);
const SIMPLIFIED = "国动产业务货币团队开关闭买卖东车间对话说话时间应该问题实际质检验证营运营销财务员额个种类别专业务实职权责压产线区块链条这来会给决";

const errors = [];
const err = (m) => errors.push(m);

const main = JSON.parse(readFileSync(new URL("data/events.json", ROOT), "utf8"));
const existingIds = new Set(main.events.map((e) => e.id));
const batch = JSON.parse(readFileSync(batchPath, "utf8"));
const list = batch.events || [];
const batchIds = new Set();
// 收集本批 followUp 目標(允許指向同批或既有)
const allIds = new Set([...existingIds]);
for (const ev of list) allIds.add(ev.id);

function checkText(str, where) {
  for (const ch of str || "") if (SIMPLIFIED.includes(ch)) { err(`${where} 疑似簡體字「${ch}」`); break; }
  if (/[0-9]{2,}/.test(str || "")) err(`${where} 疑似含精確數字(文案不應出現)`);
}
function checkEffect(e, where) {
  if (e.pctOf !== undefined) {
    if (!VARS.has(e.var)) err(`${where} pctOf effect.var 非法: ${e.var}`);
    if (typeof e.pct !== "number") err(`${where} 缺 pct`);
    return;
  }
  if (!VARS.has(e.var)) err(`${where} effect.var 非法或禁用: ${e.var}`);
  if (e.op && !["add", "mul"].includes(e.op)) err(`${where} op 非法`);
  const d = e.delta;
  if (Array.isArray(d)) { if (d.length !== 2 || d[0] > d[1]) err(`${where} delta 區間錯`); }
  else if (typeof d !== "number") err(`${where} delta 需數字或區間`);
}

for (const ev of list) {
  const w = `事件 ${ev.id}`;
  if (!ev.id) { err("有事件缺 id"); continue; }
  if (existingIds.has(ev.id)) err(`${w} id 與既有重複`);
  if (batchIds.has(ev.id)) err(`${w} id 批次內重複`);
  batchIds.add(ev.id);
  if (!DEPTS.has(ev.dept)) err(`${w} dept 非法: ${ev.dept}`);
  if (!Array.isArray(ev.tier) || ev.tier.some((t) => ![1, 2, 3].includes(t))) err(`${w} tier 非法`);
  if (!TYPES.has(ev.type)) err(`${w} type 非法`);
  if (!ev.speaker || !NPCS.has(ev.speaker)) err(`${w} speaker 非法: ${ev.speaker}`);
  const tr = ev.trigger || {};
  if (typeof tr.weight !== "number" || tr.weight <= 0) err(`${w} weight 需正數`);
  for (const c of tr.conditions || []) {
    if (!COND_VARS.has(c.var)) err(`${w} condition.var 非法: ${c.var}`);
    if (!OPS_COND.has(c.op)) err(`${w} condition.op 非法`);
    if (typeof c.value !== "number") err(`${w} condition.value 需數字`);
  }
  checkText(ev.title, `${w} title`);
  checkText(ev.text, `${w} text`);
  const opts = ev.options || [];
  if (opts.length < 2 || opts.length > 4) err(`${w} 選項數需 2~4，實為 ${opts.length}`);
  opts.forEach((o, i) => {
    const ow = `${w} 選項${i}`;
    if (!o.label) err(`${ow} 缺 label`);
    checkText(o.label, `${ow} label`);
    checkText(o.hint, `${ow} hint`);
    for (const e of o.effects || []) checkEffect(e, ow);
    let sum = 0;
    for (const r of o.random || []) {
      if (typeof r.chance !== "number" || r.chance < 0 || r.chance > 1) err(`${ow} random.chance 非法`);
      sum += r.chance;
      for (const e of r.effects || []) checkEffect(e, `${ow} random`);
    }
    if (sum > 1.001) err(`${ow} random chance 總和 ${sum.toFixed(2)} > 1`);
    if (o.followUp && !allIds.has(o.followUp)) err(`${ow} followUp 指向不存在事件: ${o.followUp}`);
  });
}

console.log(`批次 ${batch.batch || batchPath}：${list.length} 事件，錯誤 ${errors.length}`);
for (const e of errors) console.log(`  [X] ${e}`);
if (errors.length) process.exit(1);

if (dry) { console.log("[O] 驗證通過(dry，未寫入)"); process.exit(0); }

main.events.push(...list);
writeFileSync(new URL("data/events.json", ROOT), JSON.stringify(main, null, 2) + "\n");
console.log(`[O] 已合併 ${list.length} 事件，events.json 現有 ${main.events.length} 件`);
