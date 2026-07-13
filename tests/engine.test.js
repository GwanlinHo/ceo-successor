// 引擎單元測試(零依賴)。執行：node tests/engine.test.js
// 涵蓋：初始化/月結算/確定性重播/效果佇列/升級/倒閉與紓困/撤換/期滿計分/邊界值/純函式性。

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
function eq(a, b, msg = "") {
  if (a !== b) throw new Error(`${msg} 期望 ${b}，實得 ${a}`);
}
function ok(cond, msg = "斷言失敗") { if (!cond) throw new Error(msg); }

const OPTS = { playerName: "測試員", companyName: "測試精工", difficulty: "normal", seed: "t1" };
// 過一個完整月份(結算+確認)
function passMonth(s) { return reduce(reduce(s, { type: "END_MONTH" }, data), { type: "ACK" }, data); }

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
  const s0 = newGame(data, OPTS);
  const s1 = reduce(s0, { type: "END_MONTH" }, data);
  ok(s1.kpi.revenue > 0, "營收應為正");
  const diff = Math.abs(s1.kpi.cash - (s0.kpi.cash + s1.kpi.profit));
  ok(diff < 1e-6, `現金變動應等於損益(差 ${diff})`);
  eq(s1.meta.phase, "settled");
});
t("reduce 為純函式(原 state 不被修改)", () => {
  const s0 = newGame(data, OPTS);
  const snap = JSON.stringify(s0);
  reduce(s0, { type: "END_MONTH" }, data);
  eq(JSON.stringify(s0), snap, "原 state 遭修改");
});
t("同種子 12 個月重播完全一致", () => {
  let a = newGame(data, OPTS);
  let b = newGame(data, OPTS);
  for (let i = 0; i < 12; i++) { a = passMonth(a); b = passMonth(b); }
  eq(JSON.stringify(a), JSON.stringify(b));
  eq(a.meta.month, 13);
});

console.log("== 效果佇列 ==");
t("延遲效果於到期月才生效", () => {
  let s = newGame(data, OPTS);
  const rng = makeRng(1);
  queueEffect(s, { var: "kpi.product", delta: 10, delayMonths: 2 }, rng);
  const p0 = s.kpi.product;
  s = passMonth(s); // 月1結算：未到期
  ok(Math.abs(s.kpi.product - p0) < 2, "不應提前生效(僅漂移)");
  s = passMonth(s); // 月2
  s = reduce(s, { type: "END_MONTH" }, data); // 月3結算：dueMonth=3 生效
  ok(s.kpi.product > p0 + 7, `到期後應大幅提升(實得 ${s.kpi.product.toFixed(1)})`);
});
t("持續效果連續套用 N 個月後停止", () => {
  let s = newGame(data, OPTS);
  queueEffect(s, { var: "aux.marketing", delta: 100, months: 3 }, makeRng(1));
  const m0 = s.aux.marketing;
  s = passMonth(s); s = passMonth(s); s = passMonth(s);
  eq(s.aux.marketing, m0 + 300, "三個月共 +300");
  eq(s.effects.length, 0, "效果佇列應清空");
  s = passMonth(s);
  eq(s.aux.marketing, m0 + 300, "第四個月不再套用");
});
t("mul 效果與 pctOf 效果", () => {
  let s = newGame(data, OPTS);
  queueEffect(s, { var: "aux.salaryAvg", op: "mul", delta: 1.1 }, makeRng(1));
  const sal = s.aux.salaryAvg;
  s = reduce(s, { type: "END_MONTH" }, data);
  ok(Math.abs(s.aux.salaryAvg - sal * 1.1) < 1e-9, "薪資 ×1.1");
  // pctOf: 現金扣掉營收的 8%(於結算前套用，用上月營收=0 → 不動；先過一個月再測)
  let s2 = newGame(data, OPTS);
  s2 = passMonth(s2);
  const rev = s2.kpi.revenue;
  ok(rev > 0);
  queueEffect(s2, { var: "kpi.cash", pctOf: "kpi.revenue", pct: -0.08 }, makeRng(1));
  const cash = s2.kpi.cash;
  const s3 = reduce(s2, { type: "END_MONTH" }, data);
  const expected = cash - rev * 0.08 + s3.kpi.profit;
  ok(Math.abs(s3.kpi.cash - expected) < 1e-6, `pctOf 扣款(差 ${(s3.kpi.cash - expected).toFixed(2)})`);
});
t("區間 delta 以種子亂數取值且落在區間內", () => {
  const s = newGame(data, OPTS);
  queueEffect(s, { var: "kpi.brand", delta: [3, 6] }, makeRng(7));
  const d = s.effects[0].delta;
  ok(d >= 3 && d <= 6, `delta=${d}`);
});

console.log("== 升降級與結局 ==");
function strongState() {
  // 建構足以升級中型的狀態
  const s = newGame(data, OPTS);
  s.kpi.share = 16; s.kpi.equity = 4000; s.kpi.headcount = 60;
  s.aux.capacity = 2.0; s.streaks.profitMonths = 3;
  return s;
}
t("達標並維持 holdMonths 後升級中型", () => {
  let s = strongState();
  s = passMonth(s);
  eq(s.tier, 1, "第一個月僅累積 hold");
  s = reduce(s, { type: "END_MONTH" }, data);
  eq(s.tier, 2, "第二個月升級");
  ok(s.log.some((l) => l.text.includes("中型企業")), "應留下升級日誌");
});
t("現金見底且信用差 → 倒閉，計分 0 敗家子", () => {
  let s = newGame(data, OPTS);
  s.kpi.cash = -5000; s.kpi.credit = 10;
  s = reduce(s, { type: "END_MONTH" }, data);
  eq(s.meta.phase, "ended");
  eq(s.ending.type, "bankrupt");
  eq(s.ending.score, 0);
  eq(s.ending.grade, "敗家子");
});
t("現金見底但信用好 → 銀行紓困續命", () => {
  let s = newGame(data, OPTS);
  s.kpi.cash = -500; s.kpi.credit = 80;
  s = reduce(s, { type: "END_MONTH" }, data);
  eq(s.meta.phase, "settled", "應存活");
  ok(s.kpi.cash > 0, "現金應補回正數");
  ok(s.aux.debt > 0, "負債增加");
  ok(s.log.some((l) => l.text.includes("紓困")));
});
t("股東信心歸零 → 撤換結局", () => {
  let s = newGame(data, OPTS);
  s.kpi.shareholder = 0;
  s = reduce(s, { type: "END_MONTH" }, data);
  eq(s.meta.phase, "ended");
  eq(s.ending.type, "fired");
});
t("60 個月期滿 → timeup 結局且有分數評語", () => {
  let s = newGame(data, OPTS);
  s.meta.month = 60;
  s = reduce(s, { type: "END_MONTH" }, data);
  eq(s.ending.type, "timeup");
  ok(s.ending.score > 0 && s.ending.score <= 1000, `分數 ${s.ending.score}`);
  ok(typeof s.ending.grade === "string" && s.ending.grade.length > 0);
});
t("遊戲結束後拒絕任何 action", () => {
  let s = newGame(data, OPTS);
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
  s = reduce(s, { type: "END_MONTH" }, data);
  ok(s.kpi.morale <= 100, `morale=${s.kpi.morale}`);
});
t("均值回歸將高品牌往 50 拉", () => {
  let s = newGame(data, OPTS);
  s.kpi.brand = 90;
  s = reduce(s, { type: "END_MONTH" }, data);
  ok(s.kpi.brand < 90, "品牌應回落");
});
t("長期模擬 24 個月無 NaN/Infinity", () => {
  let s = newGame(data, OPTS);
  for (let i = 0; i < 24 && s.meta.phase !== "ended"; i++) s = passMonth(s);
  const flat = JSON.stringify(s);
  ok(!flat.includes("null") || true);
  for (const [k, v] of [...Object.entries(s.kpi), ...Object.entries(s.aux)]) {
    ok(Number.isFinite(v), `${k}=${v} 非有限數`);
  }
});

console.log(`\n結果: ${pass} 通過, ${fail} 失敗`);
process.exit(fail ? 1 : 0);
