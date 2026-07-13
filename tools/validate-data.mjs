// 資料驗證：schema、數值範圍、枚舉、事件鏈 id、繁中(簡體字)檢查。
// 用法：node tools/validate-data.mjs   (需在專案根目錄；node 見 DEV_LOG 環境備註)
// 離開碼 0 = 全通過；1 = 有錯誤。警告不擋。

import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

function load(name) {
  try {
    return JSON.parse(readFileSync(new URL(`data/${name}`, ROOT), "utf8"));
  } catch (e) {
    err(`無法解析 data/${name}: ${e.message}`);
    return null;
  }
}

// 合法 effect 變數路徑
const VARS = new Set([
  "kpi.cash", "kpi.equity", "kpi.headcount", "kpi.product", "kpi.morale",
  "kpi.share", "kpi.brand", "kpi.satisfaction", "kpi.credit", "kpi.shareholder", "kpi.compliance",
  "aux.capacity", "aux.utilization", "aux.yieldRate", "aux.price", "aux.materialRate",
  "aux.turnover", "aux.supplierRel", "aux.channelRel", "aux.debt", "aux.interest",
  "aux.salaryAvg", "aux.marketing", "aux.rnd",
  "world.economyIndex", "world.rivalProduct",
]);
// 禁止直接下效果(結算導出值)
const FORBIDDEN_VARS = new Set(["kpi.revenue", "kpi.profit"]);
const DEPTS = new Set(["rnd", "prod", "mkt", "hr", "fin", "shareholder", "bank", "supplier", "channel", "gov", "media"]);
const TYPES = new Set(["routine", "opportunity", "crisis", "chain"]);
const OPS_COND = new Set(["<", "<=", ">", ">=", "=="]);
const OPS_EFFECT = new Set(["add", "mul"]);

// 簡體字偵測：常見簡體字集合(取樣，抓明顯洩漏)
const SIMPLIFIED = "国动产业务货币团队开关闭买卖东车间对话说话时间应该问题实际质检验证营运营销财务员额个种类别专业务实职权责压产线区块链条";
function checkSimplified(str, where) {
  for (const ch of str) {
    if (SIMPLIFIED.includes(ch)) { warn(`可能含簡體字「${ch}」：${where}`); break; }
  }
}

function validateEffect(e, where) {
  if (typeof e !== "object" || e === null) { err(`${where} effect 非物件`); return; }
  if (e.pctOf !== undefined) {
    if (!VARS.has(e.var)) err(`${where} effect.var 非法: ${e.var}`);
    if (typeof e.pct !== "number") err(`${where} pctOf 型 effect 缺 pct 數字`);
    return;
  }
  if (!VARS.has(e.var)) {
    if (FORBIDDEN_VARS.has(e.var)) err(`${where} 禁止對結算導出值下效果: ${e.var}`);
    else err(`${where} effect.var 非法: ${e.var}`);
  }
  if (e.op !== undefined && !OPS_EFFECT.has(e.op)) err(`${where} effect.op 非法: ${e.op}`);
  const d = e.delta;
  if (Array.isArray(d)) {
    if (d.length !== 2 || typeof d[0] !== "number" || typeof d[1] !== "number" || d[0] > d[1])
      err(`${where} delta 區間格式錯: ${JSON.stringify(d)}`);
  } else if (typeof d !== "number") {
    err(`${where} delta 需為數字或[min,max]: ${JSON.stringify(d)}`);
  }
  if (e.delayMonths !== undefined && (!Number.isInteger(e.delayMonths) || e.delayMonths < 0)) err(`${where} delayMonths 非法`);
  if (e.months !== undefined && (!Number.isInteger(e.months) || e.months < 1)) err(`${where} months 非法`);
}

// ---- balance.json ----
const balance = load("balance.json");
if (balance) {
  for (const t of ["1", "2", "3"]) {
    const tier = balance.tiers?.[t];
    if (!tier) { err(`balance.tiers 缺 tier ${t}`); continue; }
    for (const k of ["baseDemand", "adminRate", "bankLimit", "salaryBase"])
      if (typeof tier[k] !== "number") err(`balance.tiers.${t}.${k} 缺或非數字`);
  }
  const th = balance.thresholds;
  if (!th?.upgradeTo2 || !th?.upgradeTo3) err("balance.thresholds 缺 upgradeTo2/upgradeTo3");
  if (balance.duration?.totalMonths !== 60) warn(`duration.totalMonths = ${balance.duration?.totalMonths}(企劃為60)`);
  const grades = balance.scoring?.grades || [];
  for (let i = 1; i < grades.length; i++)
    if (grades[i].min > grades[i - 1].min) err("scoring.grades 需由高到低排序");
}

// ---- difficulty.json ----
const diff = load("difficulty.json");
if (diff) {
  for (const lvl of ["easy", "normal", "hard"]) {
    const L = diff.levels?.[lvl];
    if (!L) { err(`difficulty.levels 缺 ${lvl}`); continue; }
    for (const t of ["1", "2", "3"]) {
      const r = L.eventsPerMonth?.[t];
      if (!Array.isArray(r) || r.length !== 2 || r[0] > r[1] || r[0] < 1)
        err(`difficulty.${lvl}.eventsPerMonth.${t} 格式錯: ${JSON.stringify(r)}`);
    }
    if (typeof L.initCash !== "number") err(`difficulty.${lvl}.initCash 缺`);
  }
  // 檢查困難×大型中心值接近15
  const h3 = diff.levels?.hard?.eventsPerMonth?.["3"];
  if (h3 && (h3[0] + h3[1]) / 2 < 13) warn(`困難×大型每月事件中心值 ${(h3[0]+h3[1])/2}(設計目標約15)`);
}

// ---- npcs.json ----
const npcs = load("npcs.json");
const npcIds = new Set();
if (npcs) {
  for (const n of npcs.npcs || []) {
    if (npcIds.has(n.id)) err(`npc id 重複: ${n.id}`);
    npcIds.add(n.id);
    if (!DEPTS.has(n.dept)) err(`npc ${n.id} dept 非法: ${n.dept}`);
    checkSimplified(n.name + n.role, `npc ${n.id}`);
  }
}

// ---- events.json ----
const eventsFile = load("events.json");
const eventIds = new Set();
const followUps = [];
if (eventsFile) {
  const list = eventsFile.events || [];
  const deptCount = {};
  for (const ev of list) {
    const w = `event ${ev.id}`;
    if (!ev.id) { err("有事件缺 id"); continue; }
    if (eventIds.has(ev.id)) err(`event id 重複: ${ev.id}`);
    eventIds.add(ev.id);
    if (!DEPTS.has(ev.dept)) err(`${w} dept 非法: ${ev.dept}`);
    deptCount[ev.dept] = (deptCount[ev.dept] || 0) + 1;
    if (!Array.isArray(ev.tier) || ev.tier.some((t) => ![1, 2, 3].includes(t))) err(`${w} tier 非法: ${JSON.stringify(ev.tier)}`);
    if (!TYPES.has(ev.type)) err(`${w} type 非法: ${ev.type}`);
    const tr = ev.trigger || {};
    if (typeof tr.weight !== "number" || tr.weight <= 0) err(`${w} trigger.weight 需正數`);
    if (tr.cooldown !== undefined && (!Number.isInteger(tr.cooldown) || tr.cooldown < 0)) err(`${w} cooldown 非法`);
    for (const c of tr.conditions || []) {
      if (!VARS.has(c.var)) err(`${w} condition.var 非法: ${c.var}`);
      if (!OPS_COND.has(c.op)) err(`${w} condition.op 非法: ${c.op}`);
      if (typeof c.value !== "number") err(`${w} condition.value 需數字`);
    }
    if (ev.speaker && !npcIds.has(ev.speaker)) err(`${w} speaker 不存在: ${ev.speaker}`);
    checkSimplified((ev.title || "") + (ev.text || ""), w);
    const opts = ev.options || [];
    if (opts.length < 2 || opts.length > 4) err(`${w} 選項數需 2~4，實為 ${opts.length}`);
    opts.forEach((o, i) => {
      const ow = `${w} 選項${i}`;
      if (!o.label) err(`${ow} 缺 label`);
      checkSimplified((o.label || "") + (o.hint || ""), ow);
      for (const e of o.effects || []) validateEffect(e, ow);
      let chanceSum = 0;
      for (const r of o.random || []) {
        if (typeof r.chance !== "number" || r.chance < 0 || r.chance > 1) err(`${ow} random.chance 非法: ${r.chance}`);
        chanceSum += r.chance;
        for (const e of r.effects || []) validateEffect(e, `${ow} random`);
      }
      if (chanceSum > 1.001) warn(`${ow} random chance 總和 ${chanceSum.toFixed(2)} > 1`);
      if (o.followUp) followUps.push({ from: ev.id, to: o.followUp });
    });
  }
  // 事件鏈 id 存在性
  for (const f of followUps) if (!eventIds.has(f.to)) err(`event ${f.from} 的 followUp 指向不存在事件: ${f.to}`);
  // 每 dept 至少 1 件(種子版下限；M7 會提高)
  for (const d of DEPTS) if (!deptCount[d]) warn(`dept ${d} 尚無事件(種子版可接受)`);
  console.log(`事件總數: ${list.length}，各部門: ${JSON.stringify(deptCount)}`);
}

// ---- news.json ----
const news = load("news.json");
if (news) {
  for (const t of news.templates || []) {
    if (!["industry", "company", "rumor"].includes(t.type)) err(`news ${t.id} type 非法: ${t.type}`);
    checkSimplified(t.text || "", `news ${t.id}`);
  }
}

// ---- 輸出 ----
console.log(`\n[驗證結果] 錯誤 ${errors.length}，警告 ${warns.length}`);
for (const w of warns) console.log(`  [!] ${w}`);
for (const e of errors) console.log(`  [X] ${e}`);
if (errors.length === 0) console.log("  [O] 所有資料檔通過驗證");
process.exit(errors.length ? 1 : 0);
