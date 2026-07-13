// 引擎單元測試(零依賴)。執行：node tests/engine.test.js
// 涵蓋：初始化/月結算/確定性重播/效果佇列/升降級與結局/邊界(M2)＋事件抽取與決策(M3)。

import { readFileSync } from "node:fs";
import { newGame, reduce, queueEffect } from "../js/engine/engine.js";
import { makeRng } from "../js/engine/rng.js";

const ROOT = new URL("../", import.meta.url);
const data = {};
for (const f of ["balance", "difficulty", "events", "npcs", "news"]) {
  data[f] = JSON.parse(readFileSync(new URL(`data/${f}.json`, ROOT), "utf8"));
}

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log(`  [O] ${name}`); }
  catch (e) { fail++; console.log(`  [X] ${name}: ${e.message}`); }
}
function eq(a, b, msg = "") { if (a !== b) throw new Error(`${msg} 期望 ${b}，實得 ${a}`); }
function ok(cond, msg = "斷言失敗") { if (!cond) throw new Error(msg); }

const OPTS = { playerName: "測試員", companyName: "測試精工", difficulty: "normal", seed: "t1" };

// 全選第 0 個選項處理完本月事件
function decideAll(s) {
  while (s.events.current && s.meta.phase === "events") s = reduce(s, { type: "DECIDE", optionIndex: 0 }, data);
  return s;
}
// 完整過一個月(含決策)
function playMonth(s) {
  s = decideAll(s);
  s = reduce(s, { type: "END_MONTH" }, data);
  if (s.meta.phase === "settled") s = reduce(s, { type: "ACK" }, data);
  return s;
}
// 略過事件、只跑結算(隔離經濟/效果測試)
function quietMonth(s) {
  const c = structuredClone(s);
  c.events.queue = []; c.events.current = null;
  let r = reduce(c, { type: "END_MONTH" }, data);
  if (r.meta.phase === "settled") r = reduce(r, { type: "ACK" }, data);
  return r;
}
function noEvents(s) {
  const c = structuredClone(s);
  c.events.queue = []; c.events.current = null;
  return c;
}

console.log("== 初始化 ==");
t("newGame 初始值符合難度設定", () => {
  const s = newGame(data, OPTS);
  eq(s.kpi.cash, data.difficulty.levels.normal.initCash, "初始現金");
  eq(s.meta.month, 1); eq(s.meta.phase, "events"); eq(s.tier, 1);
});
t("困難難度初始現金較少", () => {
  const s = newGame(data, { ...OPTS, difficulty: "hard" });
  ok(s.kpi.cash < data.difficulty.levels.normal.initCash);
});

console.log("== 月結算 ==");
t("結算產生營收且現金按損益變動", () => {
  const s0 = noEvents(newGame(data, OPTS));
  const s1 = reduce(s0, { type: "END_MONTH" }, data);
  ok(s1.kpi.revenue > 0, "營收應為正");
  const diff = Math.abs(s1.kpi.cash - (s0.kpi.cash + s1.kpi.profit));
  ok(diff < 1e-6, `現金變動應等於損益(差 ${diff})`);
  eq(s1.meta.phase, "settled");
});
t("reduce 為純函式(原 state 不被修改)", () => {
  const s0 = newGame(data, OPTS);
  const snap = JSON.stringify(s0);
  reduce(s0, { type: "DECIDE", optionIndex: 0 }, data);
  eq(JSON.stringify(s0), snap, "原 state 遭修改");
});
t("同種子 12 個月完整遊玩(含決策)重播一致", () => {
  let a = newGame(data, OPTS);
  let b = newGame(data, OPTS);
  for (let i = 0; i < 12 && a.meta.phase !== "ended"; i++) { a = playMonth(a); b = playMonth(b); }
  eq(JSON.stringify(a), JSON.stringify(b));
});

console.log("== 效果佇列 ==");
t("延遲效果於到期月才生效", () => {
  let s = newGame(data, OPTS);
  queueEffect(s, { var: "kpi.product", delta: 10, delayMonths: 2 }, makeRng(1));
  const p0 = s.kpi.product;
  s = quietMonth(s);
  ok(Math.abs(s.kpi.product - p0) < 2, "不應提前生效(僅漂移)");
  s = quietMonth(s);
  s = reduce(noEvents(s), { type: "END_MONTH" }, data);
  ok(s.kpi.product > p0 + 7, `到期後應大幅提升(實得 ${s.kpi.product.toFixed(1)})`);
});
t("持續效果連續套用 N 個月後停止", () => {
  let s = newGame(data, OPTS);
  s.effects = []; // 隔離：清掉新聞排程的效果
  queueEffect(s, { var: "aux.marketing", delta: 100, months: 3 }, makeRng(1));
  const m0 = s.aux.marketing;
  s = quietMonth(s); s = quietMonth(s); s = quietMonth(s);
  eq(s.aux.marketing, m0 + 300, "三個月共 +300");
  ok(!s.effects.some((e) => e.var === "aux.marketing"), "行銷效果應已消耗完畢");
  s = quietMonth(s);
  eq(s.aux.marketing, m0 + 300, "第四個月不再套用");
});
t("mul 效果與 pctOf 效果", () => {
  let s = newGame(data, OPTS);
  queueEffect(s, { var: "aux.salaryAvg", op: "mul", delta: 1.1 }, makeRng(1));
  const sal = s.aux.salaryAvg;
  s = reduce(noEvents(s), { type: "END_MONTH" }, data);
  ok(Math.abs(s.aux.salaryAvg - sal * 1.1) < 1e-9, "薪資 ×1.1");
  let s2 = quietMonth(newGame(data, OPTS));
  const rev = s2.kpi.revenue;
  ok(rev > 0);
  queueEffect(s2, { var: "kpi.cash", pctOf: "kpi.revenue", pct: -0.08 }, makeRng(1));
  const cash = s2.kpi.cash;
  const s3 = reduce(noEvents(s2), { type: "END_MONTH" }, data);
  const expected = cash - rev * 0.08 + s3.kpi.profit;
  ok(Math.abs(s3.kpi.cash - expected) < 1e-6, `pctOf 扣款(差 ${(s3.kpi.cash - expected).toFixed(2)})`);
});
t("區間 delta 以種子亂數取值且落在區間內", () => {
  const s = newGame(data, OPTS);
  s.effects = []; // 隔離：清掉新聞排程的效果
  queueEffect(s, { var: "kpi.brand", delta: [3, 6] }, makeRng(7), data);
  const d = s.effects[0].delta;
  ok(d >= 3 && d <= 6, `delta=${d}`);
});
t("桿D：金額效果隨 tier 縮放，刻度值不縮放", () => {
  const scale2 = data.balance.moneyScaleByTier["2"];
  // tier1：-100 現金原值
  let s1 = noEvents(newGame(data, OPTS)); s1.effects = [];
  queueEffect(s1, { var: "kpi.cash", delta: -100 }, makeRng(1), data);
  eq(s1.effects[0].delta, -100, "tier1 金額");
  // tier2：-100 現金應 ×scale
  let s2 = noEvents(newGame(data, OPTS)); s2.effects = []; s2.tier = 2;
  queueEffect(s2, { var: "kpi.cash", delta: -100 }, makeRng(1), data);
  eq(s2.effects[0].delta, -100 * scale2, `tier2 金額應×${scale2}`);
  // 刻度值(品牌)不因 tier 縮放
  queueEffect(s2, { var: "kpi.brand", delta: 5 }, makeRng(1), data);
  eq(s2.effects[1].delta, 5, "刻度值不縮放");
});

console.log("== 升降級與結局 ==");
function strongState() {
  const s = noEvents(newGame(data, OPTS));
  s.kpi.share = 16; s.kpi.equity = 4000; s.kpi.headcount = 60;
  s.aux.capacity = 2.0; s.streaks.profitMonths = 3;
  return s;
}
t("達標並維持 holdMonths 後升級中型", () => {
  let s = strongState();
  s = quietMonth(s);
  eq(s.tier, 1, "第一個月僅累積 hold");
  s = reduce(noEvents(s), { type: "END_MONTH" }, data);
  eq(s.tier, 2, "第二個月升級");
  ok(s.log.some((l) => l.text.includes("中型企業")), "應留下升級日誌");
});
t("現金見底且信用差 → 倒閉，計分 0 敗家子", () => {
  let s = noEvents(newGame(data, OPTS));
  s.kpi.cash = -5000; s.kpi.credit = 10;
  s = reduce(s, { type: "END_MONTH" }, data);
  eq(s.meta.phase, "ended");
  eq(s.ending.type, "bankrupt");
  eq(s.ending.score, 0);
  eq(s.ending.grade, "敗家子");
});
t("現金見底但信用好 → 銀行紓困續命", () => {
  let s = noEvents(newGame(data, OPTS));
  s.kpi.cash = -500; s.kpi.credit = 80;
  s = reduce(s, { type: "END_MONTH" }, data);
  eq(s.meta.phase, "settled", "應存活");
  ok(s.kpi.cash > 0, "現金應補回正數");
  ok(s.aux.debt > 0, "負債增加");
  ok(s.log.some((l) => l.text.includes("紓困")));
});
t("股東信心歸零 → 撤換結局", () => {
  let s = noEvents(newGame(data, OPTS));
  s.kpi.shareholder = 0;
  s = reduce(s, { type: "END_MONTH" }, data);
  eq(s.meta.phase, "ended");
  eq(s.ending.type, "fired");
});
t("60 個月期滿 → timeup 結局且有分數評語", () => {
  let s = noEvents(newGame(data, OPTS));
  s.meta.month = 60;
  s = reduce(s, { type: "END_MONTH" }, data);
  eq(s.ending.type, "timeup");
  ok(s.ending.score > 0 && s.ending.score <= 1000, `分數 ${s.ending.score}`);
  ok(typeof s.ending.grade === "string" && s.ending.grade.length > 0);
});
t("遊戲結束後拒絕任何 action", () => {
  let s = noEvents(newGame(data, OPTS));
  s.meta.month = 60;
  s = reduce(s, { type: "END_MONTH" }, data);
  let threw = false;
  try { reduce(s, { type: "ACK" }, data); } catch { threw = true; }
  ok(threw);
});

console.log("== 邊界 ==");
t("0~100 刻度效果不會爆表", () => {
  let s = newGame(data, OPTS);
  queueEffect(s, { var: "kpi.morale", delta: 500 }, makeRng(1));
  s = reduce(noEvents(s), { type: "END_MONTH" }, data);
  ok(s.kpi.morale <= 100, `morale=${s.kpi.morale}`);
});
t("均值回歸將高品牌往 50 拉", () => {
  let s = noEvents(newGame(data, OPTS));
  s.kpi.brand = 90;
  s = reduce(s, { type: "END_MONTH" }, data);
  ok(s.kpi.brand < 90, "品牌應回落");
});
t("長期完整遊玩 24 個月無 NaN/Infinity", () => {
  let s = newGame(data, OPTS);
  for (let i = 0; i < 24 && s.meta.phase !== "ended"; i++) s = playMonth(s);
  for (const [k, v] of [...Object.entries(s.kpi), ...Object.entries(s.aux)]) {
    ok(Number.isFinite(v), `${k}=${v} 非有限數`);
  }
});

console.log("== 事件抽取(M3) ==");
t("首月抽取數量於難度×規模區間內", () => {
  const s = newGame(data, OPTS);
  const [lo, hi] = data.difficulty.levels.normal.eventsPerMonth["1"];
  ok(s.events.queue.length >= Math.min(lo, 12) && s.events.queue.length <= hi,
    `抽了 ${s.events.queue.length} 件`);
  eq(s.events.current, s.events.queue[0]);
});
t("佇列無重複事件", () => {
  const s = newGame(data, OPTS);
  eq(new Set(s.events.queue).size, s.events.queue.length);
});
t("冷卻：本月抽過的事件下月不重抽(庫內冷卻皆>=2)", () => {
  let s = newGame(data, OPTS);
  const m1 = new Set(s.events.queue);
  s = playMonth(s);
  for (const id of s.events.queue) ok(!m1.has(id), `${id} 違反冷卻`);
});
t("抽中事件更新單位輪替紀錄 deptLast", () => {
  const s = newGame(data, OPTS);
  for (const id of s.events.queue) {
    const ev = data.events.events.find((e) => e.id === id);
    eq(s.events.deptLast[ev.dept], 1, `dept ${ev.dept}`);
  }
});
t("END_MONTH 於事件未決策完時被拒絕", () => {
  const s = newGame(data, OPTS);
  ok(s.events.current, "首月應有事件");
  let threw = false;
  try { reduce(s, { type: "END_MONTH" }, data); } catch { threw = true; }
  ok(threw);
});
t("DECIDE 套用效果、寫入歷史並推進佇列", () => {
  const s0 = newGame(data, OPTS);
  const n = s0.events.queue.length;
  const s1 = reduce(s0, { type: "DECIDE", optionIndex: 0 }, data);
  eq(s1.events.history.length, 1);
  eq(s1.events.queue.length, n - 1);
  eq(s1.events.history[0].eventId, s0.events.current);
});

console.log("== 事件決策(M3, 固定夾具) ==");
const FX_EVENTS = [
  { id: "E-ONCE", dept: "rnd", tier: [1], type: "routine",
    trigger: { weight: 10, once: true, cooldown: 0, conditions: [] },
    title: "一次性事件", speaker: "shen", text: "測試",
    options: [
      { label: "選我", hint: "", effects: [{ var: "kpi.brand", delta: 1 }], random: [], followUp: null, setFlag: null },
      { label: "不要", hint: "", effects: [], random: [], followUp: null, setFlag: null },
    ] },
  { id: "E-FUP", dept: "prod", tier: [1], type: "routine",
    trigger: { weight: 10, once: false, cooldown: 0, conditions: [] },
    title: "會觸發後續的事件", speaker: "hao", text: "測試",
    options: [
      { label: "啟動鏈", hint: "", effects: [], random: [], followUp: "E-CHAIN", setFlag: "chained" },
      { label: "不啟動", hint: "", effects: [], random: [], followUp: null, setFlag: null },
    ] },
  { id: "E-CHAIN", dept: "prod", tier: [3], type: "chain",
    trigger: { weight: 0.001, once: false, cooldown: 0, conditions: [] },
    title: "鏈事件", speaker: "hao", text: "測試",
    options: [
      { label: "收尾", hint: "", effects: [{ var: "kpi.morale", delta: 2 }], random: [], followUp: null, setFlag: null },
      { label: "算了", hint: "", effects: [], random: [], followUp: null, setFlag: null },
    ] },
  { id: "E-BAD", dept: "fin", tier: [1], type: "crisis",
    trigger: { weight: 10, once: false, cooldown: 0, conditions: [] },
    title: "必倒楣事件", speaker: "qian", text: "測試",
    options: [
      { label: "硬上", hint: "", effects: [], random: [{ chance: 1, effects: [{ var: "kpi.brand", delta: -10 }], resultText: "倒楣了" }], followUp: null, setFlag: null },
      { label: "不上", hint: "", effects: [], random: [], followUp: null, setFlag: null },
    ] },
  { id: "E-COND", dept: "mkt", tier: [1], type: "routine",
    trigger: { weight: 10, once: false, cooldown: 0, conditions: [{ var: "kpi.product", op: "<", value: 70 }] },
    title: "條件事件", speaker: "jia", text: "測試",
    options: [
      { label: "好", hint: "", effects: [], random: [], followUp: null, setFlag: null },
      { label: "否", hint: "", effects: [], random: [], followUp: null, setFlag: null },
    ] },
];
const FX = { ...data, events: { events: FX_EVENTS } };
function fxDecide(s, wantId, optionIndex) {
  // 依序決策直到處理完 wantId(其餘選安全選項1)
  while (s.events.current) {
    const isTarget = s.events.current === wantId;
    s = reduce(s, { type: "DECIDE", optionIndex: isTarget ? optionIndex : 1 }, FX);
    if (isTarget) return s;
  }
  throw new Error(`佇列中沒有 ${wantId}`);
}
t("once 事件觸發一次後不再出現", () => {
  let s = newGame(FX, OPTS);
  ok(s.events.queue.includes("E-ONCE"), "首月應抽到(池小必中)");
  s = fxDecide(s, "E-ONCE", 0);
  while (s.events.current) s = reduce(s, { type: "DECIDE", optionIndex: 1 }, FX);
  s = reduce(s, { type: "END_MONTH" }, FX);
  s = reduce(s, { type: "ACK" }, FX);
  ok(!s.events.queue.includes("E-ONCE"), "第二個月不應再出現");
});
t("followUp 事件鏈立即插入佇列最前端(可跨 tier 強制觸發)", () => {
  let s = newGame(FX, OPTS);
  s = fxDecide(s, "E-FUP", 0);
  eq(s.events.current, "E-CHAIN", "鏈事件應為下一件");
  eq(s.flags.chained, true, "旗標應設定");
  const m = s.kpi.morale;
  s = reduce(s, { type: "DECIDE", optionIndex: 0 }, FX);
  eq(s.kpi.morale, m + 2, "鏈事件效果");
});
t("隨機惡果於普通難度原值、困難難度放大", () => {
  let sn = newGame(FX, OPTS);
  const bn = sn.kpi.brand;
  sn = fxDecide(sn, "E-BAD", 0);
  eq(sn.kpi.brand, bn - 10, "普通 -10");
  ok(sn.log.some((l) => l.text.includes("倒楣了")), "隨機結果應寫入日誌");
  let sh = newGame(FX, { ...OPTS, difficulty: "hard" });
  const bh = sh.kpi.brand;
  sh = fxDecide(sh, "E-BAD", 0);
  const mul = data.difficulty.levels.hard.negativeEffectMul;
  ok(Math.abs(sh.kpi.brand - (bh - 10 * mul)) < 1e-9, `困難應 -${10 * mul}，實得 ${bh - sh.kpi.brand}`);
});
t("條件不符的事件不會被抽中", () => {
  let s = newGame(FX, OPTS);
  ok(s.events.queue.includes("E-COND"), "product=40 應可抽中");
  while (s.events.current) s = reduce(s, { type: "DECIDE", optionIndex: 1 }, FX);
  s = reduce(s, { type: "END_MONTH" }, FX);
  s.kpi.product = 90; // 使條件 product<70 不成立
  s = reduce(s, { type: "ACK" }, FX);
  ok(!s.events.queue.includes("E-COND"), "product=90 不應抽中");
});

console.log("== 報表數據與新聞(M5) ==");
t("每月結算累積 metrics 快照", () => {
  let s = newGame(data, OPTS);
  eq(s.metrics.length, 0, "開局尚無結算快照");
  s = playMonth(s);
  eq(s.metrics.length, 1);
  ok(s.metrics[0].revenue > 0 && Number.isFinite(s.metrics[0].cash), "快照含營收與現金");
  s = playMonth(s);
  eq(s.metrics.length, 2);
  eq(s.metrics[1].month, 2);
});
t("metrics 只保留最近 24 個月", () => {
  let s = newGame(data, OPTS);
  for (let i = 0; i < 30 && s.meta.phase !== "ended"; i++) s = playMonth(s);
  ok(s.metrics.length <= 24, `實際 ${s.metrics.length}`);
});
t("開局即產生本月新聞(2~4 條)", () => {
  const s = newGame(data, OPTS);
  ok(s.news.length >= 2 && s.news.length <= 4, `新聞 ${s.news.length} 條`);
  for (const n of s.news) ok(["industry", "company", "rumor"].includes(n.type), "新聞型別合法");
});
t("產業新聞恆真、小道消息有真有假(難度真偽率)", () => {
  // 跑多局統計小道消息真值分佈
  let trueCnt = 0, total = 0, industryAllTrue = true;
  for (let g = 0; g < 40; g++) {
    let s = newGame(data, { ...OPTS, difficulty: "hard", seed: "news" + g });
    for (let i = 0; i < 3 && s.meta.phase !== "ended"; i++) {
      for (const n of s.news) {
        if (n.type === "industry" && n.truth !== true) industryAllTrue = false;
        if (n.type === "rumor") { total++; if (n.truth) trueCnt++; }
      }
      s = playMonth(s);
    }
  }
  ok(industryAllTrue, "產業新聞恆為真");
  ok(total > 0, "有出現小道消息");
  const rate = trueCnt / total;
  ok(rate > 0.2 && rate < 0.7, `困難小道消息真值率 ${rate.toFixed(2)} 應接近 0.45`);
});
t("新聞排程的真實效果會在往後月份生效(確定性重播含新聞)", () => {
  let a = newGame(data, OPTS);
  let b = newGame(data, OPTS);
  for (let i = 0; i < 6 && a.meta.phase !== "ended"; i++) { a = playMonth(a); b = playMonth(b); }
  eq(JSON.stringify(a), JSON.stringify(b), "含新聞的完整流程仍可重播一致");
});

console.log(`\n結果: ${pass} 通過, ${fail} 失敗`);
process.exit(fail ? 1 : 0);
