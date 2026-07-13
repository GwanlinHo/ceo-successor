// 引擎入口：純函式 reducer。UI 只能經由 reduce() 改變遊戲狀態。
// reduce(state, action, data) → newState(不修改原 state)。
// action: {type:"DECIDE", optionIndex} | {type:"END_MONTH"} | {type:"ACK"}
// 新局用 newGame(data, opts)。

import { makeRng } from "./rng.js";
import { initState } from "./state.js";
import { settleMonth } from "./economy.js";
import { checkRules } from "./rules.js";
import { applyDueEffects } from "./effects.js";
import { drawMonthlyEvents, applyDecision } from "./events.js";
import { generateNews } from "./news.js";

// 舊介面相容(測試與 UI 由此取用效果函式)
export { queueEffect, applyEffectNow } from "./effects.js";

export function newGame(data, opts) {
  const s = initState(data, opts);
  const rng = makeRng(s.meta.rngState);
  drawMonthlyEvents(s, data, rng);
  generateNews(s, data, rng);
  s.meta.rngState = rng.getState();
  return s;
}

export function reduce(state, action, data) {
  if (state.meta.phase === "ended") throw new Error("遊戲已結束");
  const s = structuredClone(state);
  const rng = makeRng(s.meta.rngState);

  switch (action.type) {
    case "DECIDE": {
      if (s.meta.phase !== "events") throw new Error(`DECIDE 不允許於 phase=${s.meta.phase}`);
      applyDecision(s, action, data, rng);
      break;
    }
    case "END_MONTH": {
      if (s.meta.phase !== "events") throw new Error(`END_MONTH 不允許於 phase=${s.meta.phase}`);
      if (s.events.current) throw new Error(`尚有 ${s.events.queue.length} 件事件未決策`);
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
      drawMonthlyEvents(s, data, rng);
      generateNews(s, data, rng);
      break;
    }
    default:
      throw new Error(`未知 action: ${action.type}`);
  }

  s.meta.rngState = rng.getState();
  return s;
}
