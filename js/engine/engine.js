// 引擎入口：純函式 reducer。UI 只能經由 reduce() 改變遊戲狀態。
// reduce(state, action, data) → newState(不修改原 state)。
// action: {type: "END_MONTH"} | {type: "ACK"} | {type: "DECIDE", optionIndex}(M3)
// 新局用 newGame(data, opts)。

import { makeRng } from "./rng.js";
import { initState, getVar, setVar } from "./state.js";
import { settleMonth } from "./economy.js";
import { checkRules } from "./rules.js";

export function newGame(data, opts) {
  const s = initState(data, opts);
  // TODO(M3): 抽第 1 月事件進 s.events.queue
  return s;
}

export function reduce(state, action, data) {
  if (state.meta.phase === "ended") throw new Error("遊戲已結束");
  const s = structuredClone(state);
  const rng = makeRng(s.meta.rngState);

  switch (action.type) {
    case "END_MONTH": {
      if (s.meta.phase !== "events") throw new Error(`END_MONTH 不允許於 phase=${s.meta.phase}`);
      applyDueEffects(s, rng);
      settleMonth(s, data, rng);
      const ending = checkRules(s, data);
      if (!ending) s.meta.phase = "settled";
      break;
    }
    case "ACK": {
      if (s.meta.phase !== "settled") throw new Error(`ACK 不允許於 phase=${s.meta.phase}`);
      s.meta.month += 1;
      s.meta.phase = "events";
      // TODO(M3): 抽本月事件與新聞
      break;
    }
    case "DECIDE":
      throw new Error("DECIDE 於 M3 實作");
    default:
      throw new Error(`未知 action: ${action.type}`);
  }

  s.meta.rngState = rng.getState();
  return s;
}

// 將效果排入佇列(決策當下呼叫；區間 delta 需先以 rng 解析為定值)
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

// 立即套用單一效果(delayMonths=0 且 months=1 時可直接用)
export function applyEffectNow(s, eff, rng) {
  const delta = Array.isArray(eff.delta) ? rng.float(eff.delta[0], eff.delta[1]) : eff.delta;
  if (eff.pctOf !== undefined) {
    setVar(s, eff.var, getVar(s, eff.var) + getVar(s, eff.pctOf) * eff.pct);
    return;
  }
  const cur = getVar(s, eff.var);
  setVar(s, eff.var, (eff.op || "add") === "mul" ? cur * delta : cur + delta);
}

// 結算前套用到期效果；multi-month 效果遞減並順延
function applyDueEffects(s, rng) {
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
