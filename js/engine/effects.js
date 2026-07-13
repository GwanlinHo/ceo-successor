// 效果佇列與套用。effect 格式見 docs/ARCHITECTURE.md 3.3。
// 兩階段：resolve(以 rng 定值＋難度惡果放大＋金額隨規模縮放，只做一次) → apply(確定性套用)。
// 佇列內存的是「已解析」效果，故 applyDueEffects 只做確定性 apply、不再抽亂數或縮放。

import { getVar, setVar } from "./state.js";

// 金額類變數(絕對值 add 效果隨企業規模縮放，桿 D)
const MONEY_VARS = new Set([
  "kpi.cash", "kpi.equity", "aux.debt", "aux.marketing", "aux.rnd", "aux.interest",
]);

// 變數方向：難度惡果放大只作用於「有害方向」
const GOOD_UP = new Set([
  "kpi.cash", "kpi.equity", "kpi.headcount", "kpi.product", "kpi.morale",
  "kpi.share", "kpi.brand", "kpi.satisfaction", "kpi.credit", "kpi.shareholder", "kpi.compliance",
  "aux.supplierRel", "aux.channelRel", "aux.yieldRate", "aux.capacity",
]);
const BAD_UP = new Set([
  "aux.materialRate", "aux.turnover", "aux.interest", "aux.debt", "world.rivalProduct",
]);

export function moneyScale(s, data) {
  return data.balance.moneyScaleByTier?.[String(s.tier)] ?? 1;
}

// 將原始 effect 解析為確定性效果：抽區間亂數、金額縮放。回傳新物件(不含 timing)。
function resolveEffect(s, eff, rng, mScale) {
  const out = { var: eff.var, op: eff.op || "add", pctOf: eff.pctOf, pct: eff.pct };
  if (eff.pctOf !== undefined) return out; // 百分比型：pctOf 變數已隨規模，免縮放
  let delta = Array.isArray(eff.delta) ? rng.float(eff.delta[0], eff.delta[1]) : eff.delta;
  if (out.op === "add" && MONEY_VARS.has(eff.var)) delta *= mScale;
  out.delta = delta;
  return out;
}

// 確定性套用已解析效果(無 rng、無縮放)
function applyResolved(s, r) {
  if (r.pctOf !== undefined) {
    setVar(s, r.var, getVar(s, r.var) + getVar(s, r.pctOf) * r.pct);
    return;
  }
  const cur = getVar(s, r.var);
  setVar(s, r.var, r.op === "mul" ? cur * r.delta : cur + r.delta);
}

// 立即套用(delayMonths=0 且 months=1 且非 pctOf)
export function applyEffectNow(s, eff, rng, data) {
  applyResolved(s, resolveEffect(s, eff, rng, data ? moneyScale(s, data) : 1));
}

// 排入佇列(解析後保存，含 timing)
export function queueEffect(s, eff, rng, data) {
  const r = resolveEffect(s, eff, rng, data ? moneyScale(s, data) : 1);
  s.effects.push({
    ...r,
    dueMonth: s.meta.month + (eff.delayMonths || 0),
    monthsLeft: eff.months || 1,
    note: eff.note || "",
  });
}

// 難度惡果放大(僅用於事件隨機分支；作用於原始 eff，resolve 前)
export function scaleBadEffect(eff, badMul) {
  if (badMul === 1) return eff;
  const e = { ...eff };
  if (e.pct !== undefined) {
    if (e.pct < 0) e.pct *= badMul;
    return e;
  }
  const d = Array.isArray(e.delta) ? e.delta[0] : e.delta;
  const op = e.op || "add";
  const harmful = op === "add"
    ? (d < 0 && GOOD_UP.has(e.var)) || (d > 0 && BAD_UP.has(e.var))
    : (d < 1 && GOOD_UP.has(e.var)) || (d > 1 && BAD_UP.has(e.var));
  if (!harmful) return e;
  const scale = (x) => (op === "mul" ? 1 + (x - 1) * badMul : x * badMul);
  e.delta = Array.isArray(e.delta) ? [scale(e.delta[0]), scale(e.delta[1])] : scale(e.delta);
  return e;
}

// 結算前套用到期效果；持續效果遞減並順延(已解析，直接確定性套用)
export function applyDueEffects(s, rng) {
  const remain = [];
  for (const r of s.effects) {
    if (r.dueMonth > s.meta.month) { remain.push(r); continue; }
    applyResolved(s, r);
    if (r.monthsLeft > 1) remain.push({ ...r, monthsLeft: r.monthsLeft - 1, dueMonth: s.meta.month + 1 });
  }
  s.effects = remain;
}
