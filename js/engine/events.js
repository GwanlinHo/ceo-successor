// 事件系統：每月抽取(難度×規模件數、單位輪替保底、權重、觸發條件、冷卻)與決策處理(DECIDE)。

import { getVar } from "./state.js";
import { queueEffect, applyEffectNow, scaleBadEffect } from "./effects.js";

export const DEPTS = ["rnd", "prod", "mkt", "hr", "fin", "shareholder", "bank", "supplier", "channel", "gov", "media"];

const COND_OPS = {
  "<": (a, b) => a < b, "<=": (a, b) => a <= b,
  ">": (a, b) => a > b, ">=": (a, b) => a >= b, "==": (a, b) => a === b,
};

export function getEvent(data, id) {
  const ev = (data.events.events || []).find((e) => e.id === id);
  if (!ev) throw new Error(`事件不存在: ${id}`);
  return ev;
}

function isEligible(s, ev, month) {
  if (!ev.tier.includes(s.tier)) return false;
  if (ev.trigger.once && s.events.onceFired.includes(ev.id)) return false;
  const last = s.events.lastFired[ev.id];
  if (last !== undefined && month - last < (ev.trigger.cooldown ?? 0) + 1) return false;
  for (const c of ev.trigger.conditions || []) {
    if (!COND_OPS[c.op](getVar(s, c.var), c.value)) return false;
  }
  return true;
}

function weightOf(ev, diffL) {
  return ev.trigger.weight * (ev.type === "crisis" ? diffL.crisisWeightMul : 1);
}

// 每月抽事件：輪替保底(3個月未登場的單位優先) + 權重抽取。抽好寫入 s.events.queue。
export function drawMonthlyEvents(s, data, rng) {
  const month = s.meta.month;
  const diffL = data.difficulty.levels[s.meta.difficulty];
  const [lo, hi] = diffL.eventsPerMonth[String(s.tier)];
  const target = rng.int(lo, hi);

  const eligible = (data.events.events || []).filter((ev) => isEligible(s, ev, month));
  const picked = [];
  const pickedIds = new Set();
  const take = (ev) => { picked.push(ev); pickedIds.add(ev.id); };

  // 1) 輪替保底：超過 3 個月未登場的單位優先各補一件(順序由亂數洗牌，避免固定偏袒)
  const due = DEPTS.filter((d) => (s.events.deptLast[d] ?? -99) <= month - 3);
  for (let i = due.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [due[i], due[j]] = [due[j], due[i]];
  }
  for (const d of due) {
    if (picked.length >= target) break;
    const pool = eligible.filter((e) => e.dept === d && !pickedIds.has(e.id));
    if (!pool.length) continue; // 該單位暫無可用事件(冷卻中/條件不符)，本月放行
    take(pool[rng.weightedIndex(pool.map((e) => weightOf(e, diffL)))]);
  }
  // 2) 其餘名額按權重抽(危機權重受難度倍率影響)
  while (picked.length < target) {
    const pool = eligible.filter((e) => !pickedIds.has(e.id));
    if (!pool.length) break; // 事件庫抽乾(種子版可能發生)，件數縮水
    take(pool[rng.weightedIndex(pool.map((e) => weightOf(e, diffL)))]);
  }

  s.events.queue = picked.map((e) => e.id);
  s.events.current = s.events.queue[0] ?? null;
  for (const e of picked) {
    s.events.lastFired[e.id] = month;
    s.events.deptLast[e.dept] = month;
  }
}

// 處理一次決策：套用/排程效果、擲隨機分支(惡果受難度倍率放大)、旗標、事件鏈、推進佇列。
export function applyDecision(s, action, data, rng) {
  const evId = s.events.current;
  if (!evId) throw new Error("目前沒有待決策事件");
  const ev = getEvent(data, evId);
  const opt = ev.options[action.optionIndex];
  if (!opt) throw new Error(`事件 ${evId} 無選項 ${action.optionIndex}`);
  const diffL = data.difficulty.levels[s.meta.difficulty];

  const applyOrQueue = (eff) => {
    if ((eff.delayMonths || 0) === 0 && (eff.months || 1) === 1 && eff.pctOf === undefined) {
      applyEffectNow(s, eff, rng, data);
    } else {
      queueEffect(s, eff, rng, data);
    }
  };

  for (const eff of opt.effects || []) applyOrQueue(eff);

  // 隨機分支：擲一次骰，依累積機率落點決定唯一分支；惡果效果套 negativeEffectMul
  let resultText = null;
  if ((opt.random || []).length > 0) {
    const roll = rng.next();
    let acc = 0;
    for (const branch of opt.random) {
      acc += branch.chance;
      if (roll < acc) {
        for (const eff of branch.effects || []) {
          applyOrQueue(scaleBadEffect(eff, diffL.negativeEffectMul));
        }
        resultText = branch.resultText || null;
        break;
      }
    }
  }

  if (opt.setFlag) s.flags[opt.setFlag] = true;
  if (ev.trigger.once) s.events.onceFired.push(ev.id);
  s.events.history.push({ month: s.meta.month, eventId: evId, optionIndex: action.optionIndex });
  s.lastDecision = { eventId: evId, optionIndex: action.optionIndex, label: opt.label, resultText };
  if (resultText) s.log.push({ month: s.meta.month, text: `${ev.title}：${resultText}` });

  // 推進佇列；followUp 事件鏈插到最前面
  s.events.queue.shift();
  if (opt.followUp) {
    s.events.queue.unshift(opt.followUp);
    s.events.lastFired[opt.followUp] = s.meta.month;
  }
  s.events.current = s.events.queue[0] ?? null;
}
