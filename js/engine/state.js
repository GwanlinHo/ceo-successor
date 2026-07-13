// 初始狀態工廠。state 為單一可 JSON 序列化物件(引擎與 UI 的共同契約，見 docs/ARCHITECTURE.md 3.1)。

import { seedFromString } from "./rng.js";

export const STATE_VERSION = 1;

export function initState(data, opts) {
  const { playerName, companyName, difficulty = "normal", seed = "seed" } = opts;
  const bal = data.balance;
  const diff = data.difficulty.levels[difficulty];
  if (!diff) throw new Error(`未知難度: ${difficulty}`);
  const init = bal.init;

  return {
    meta: {
      version: STATE_VERSION,
      seed: String(seed),
      rngState: seedFromString(String(seed)),
      difficulty,
      playerName,
      companyName,
      month: 1,                 // 1..totalMonths
      phase: "events",          // events | settled | ended
    },
    tier: init.tier,
    kpi: { ...init.kpi, cash: diff.initCash, revenue: 0, profit: 0 },
    aux: { ...init.aux },
    world: { ...init.world },
    streaks: { profitMonths: 0, lossMonths: 0, upgradeHold: 0, downgradeHold: 0 },
    events: {
      queue: [],               // 本月待處理事件 id
      current: null,
      history: [],             // {month, eventId, optionIndex}
      onceFired: [],
      lastFired: {},           // eventId -> 上次觸發月(冷卻用)
      deptLast: {},            // dept -> 上次登場月(輪替保底用)
      pending: [],             // 延月觸發的事件鏈 {eventId, dueMonth}(劇情跨月用)
      chains: {},
    },
    lastDecision: null,        // {eventId, optionIndex, label, resultText} UI 顯示隨機結果用
    effects: [],               // 延遲/持續效果佇列 {var, op, delta, pctOf, pct, dueMonth, monthsLeft, note}
    metrics: [],               // 每月數據快照(報表趨勢圖用，最近 24 個月)
    news: [],                  // 本月新聞 {id, type, text, truth} truth: true 真/false 假/null 中性
    newsSeen: [],              // 歷史新聞(最近數月，供新聞面板回顧)
    flags: {},
    log: [{ month: 0, text: `${companyName} 新任總經理 ${playerName} 上任。` }],
    lastReport: null,          // 上月結算報告(UI 顯示用)
    ending: null,              // {type: timeup|bankrupt|fired|ipo, score, grade}
  };
}

// 數值邊界(引擎唯一出口，防爆表/鎖死)
const CLAMPS = {
  "kpi.product": [0, 100], "kpi.morale": [0, 100], "kpi.share": [0.1, 90],
  "kpi.brand": [0, 100], "kpi.satisfaction": [0, 100], "kpi.credit": [0, 100],
  "kpi.shareholder": [0, 100], "kpi.compliance": [0, 100],
  "kpi.headcount": [3, 100000],
  "aux.capacity": [0.2, 1000], "aux.utilization": [0, 1], "aux.yieldRate": [0.6, 1],
  "aux.price": [0.5, 2], "aux.materialRate": [0.2, 0.8], "aux.turnover": [0.005, 0.3],
  "aux.supplierRel": [0, 100], "aux.channelRel": [0, 100],
  "aux.debt": [0, 10000000], "aux.interest": [0, 100000],
  "aux.salaryAvg": [2, 100], "aux.marketing": [0, 100000], "aux.rnd": [0, 100000],
  "world.economyIndex": [0.7, 1.3], "world.rivalProduct": [0, 100],
};

export function getVar(s, path) {
  const [a, b] = path.split(".");
  return s[a][b];
}

export function setVar(s, path, value) {
  const [a, b] = path.split(".");
  const c = CLAMPS[path];
  s[a][b] = c ? Math.min(c[1], Math.max(c[0], value)) : value;
}
