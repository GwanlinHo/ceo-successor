// 效果佇列與套用。effect 格式見 docs/ARCHITECTURE.md 3.3。
// delta 區間 [min,max] 於「進佇列/套用當下」以種子亂數解析為定值，確保重播一致。

import { getVar, setVar } from "./state.js";

// 變數方向：負面效果倍率(難度)只放大「有害方向」的隨機惡果
const GOOD_UP = new Set([
  "kpi.cash", "kpi.equity", "kpi.headcount", "kpi.product", "kpi.morale",
  "kpi.share", "kpi.brand", "kpi.satisfaction", "kpi.credit", "kpi.shareholder", "kpi.compliance",
  "aux.supplierRel", "aux.channelRel", "aux.yieldRate", "aux.capacity",
]);
const BAD_UP = new Set([
  "aux.materialRate", "aux.turnover", "aux.interest", "aux.debt", "world.rivalProduct",
]);

export function queueEffect(s, eff, rng) {
  const delta = Array.isArray(eff.delta) ? rng.float(eff.delta[0], eff.delta[1]) : eff.delta;
  s.effects.push({
    var: eff.var,
    op: eff.op || "add",
    delta,
    pctOf: eff.pctOf,
    pct: eff.pct,
    dueMonth: s.meta.month + (eff.delayMonths || 0),
    monthsLeft: eff.months || 1,
    note: eff.note || "",
  });
}

export function applyEffectNow(s, eff, rng) {
  if (eff.pctOf !== undefined) {
    setVar(s, eff.var, getVar(s, eff.var) + getVar(s, eff.pctOf) * eff.pct);
    return;
  }
  const delta = Array.isArray(eff.delta) ? rng.float(eff.delta[0], eff.delta[1]) : eff.delta;
  const cur = getVar(s, eff.var);
  setVar(s, eff.var, (eff.op || "add") === "mul" ? cur * delta : cur + delta);
}

// 對「有害方向」的效果套上難度倍率(僅用於事件的隨機惡果分支)
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

// 結算前套用到期效果；持續效果遞減並順延至下月
export function applyDueEffects(s, rng) {
  const remain = [];
  for (const eff of s.effects) {
    if (eff.dueMonth > s.meta.month) { remain.push(eff); continue; }
    applyEffectNow(s, eff, rng);
    if (eff.monthsLeft > 1) {
      remain.push({ ...eff, monthsLeft: eff.monthsLeft - 1, dueMonth: s.meta.month + 1 });
    }
  }
  s.effects = remain;
}
