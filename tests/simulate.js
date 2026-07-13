// 平衡模擬：N 局 × 3 難度 × 多種策略 bot，輸出統計供 M8 調參。
// 用法：node tests/simulate.js [每組局數，預設100]
// bot：random(亂選) / cautious(選最不傷現金) / rational(多維度加權評分，近似理性玩家)

import { readFileSync } from "node:fs";
import { newGame, reduce } from "../js/engine/engine.js";
import { makeRng } from "../js/engine/rng.js";

const ROOT = new URL("../", import.meta.url);
const data = {};
for (const f of ["balance", "difficulty", "events", "npcs", "news"]) {
  data[f] = JSON.parse(readFileSync(new URL(`data/${f}.json`, ROOT), "utf8"));
}
const N = parseInt(process.argv[2] || "100", 10);

// 理性 bot 的變數邊際價值(粗略；正=越高越好)。mul 型另計。
const VAL = {
  "kpi.cash": 1, "kpi.equity": 0.4, "kpi.headcount": 8, "kpi.product": 45,
  "kpi.morale": 18, "kpi.share": 90, "kpi.brand": 22, "kpi.satisfaction": 14,
  "kpi.credit": 12, "kpi.shareholder": 30, "kpi.compliance": 14,
  "aux.supplierRel": 6, "aux.channelRel": 6, "aux.debt": -0.35, "aux.interest": -35,
  "world.rivalProduct": -30,
};
// mul 型變數：每 +1.0 倍率的價值(delta-1 乘此)
const VAL_MUL = {
  "aux.materialRate": -3000, "aux.turnover": -2500, "aux.salaryAvg": -1500,
  "aux.yieldRate": 2500, "aux.capacity": 2000, "aux.price": 4000,
  "aux.interest": -3000, "aux.debt": -800,
};

function effectValue(eff, s) {
  if (eff.pctOf !== undefined) {
    // 依營收百分比：用上月營收估
    const base = s.kpi.revenue || 500;
    return (VAL[eff.var] ?? 1) * base * eff.pct;
  }
  const d = Array.isArray(eff.delta) ? (eff.delta[0] + eff.delta[1]) / 2 : eff.delta;
  const timeDisc = 1 / (1 + 0.15 * (eff.delayMonths || 0)); // 延遲折現
  const months = eff.months || 1;
  if ((eff.op || "add") === "mul") {
    return (VAL_MUL[eff.var] ?? 0) * (d - 1) * timeDisc * months;
  }
  return (VAL[eff.var] ?? 0) * d * timeDisc * months;
}

function optionScore(opt, s) {
  let sc = 0;
  for (const e of opt.effects || []) sc += effectValue(e, s);
  for (const b of opt.random || []) {
    let bs = 0;
    for (const e of b.effects || []) bs += effectValue(e, s);
    sc += b.chance * bs;
  }
  // 情境加權：現金危急時放大現金權重
  if (s.kpi.cash < 800) {
    for (const e of opt.effects || []) if (e.var === "kpi.cash" && !Array.isArray(e.delta)) sc += e.delta * 3;
  }
  return sc;
}

const BOTS = {
  random: (s, ev, rng) => rng.int(0, ev.options.length - 1),
  cautious: (s, ev) => {
    let best = 0, bs = -Infinity;
    ev.options.forEach((o, i) => {
      let c = 0;
      for (const e of o.effects || []) if (e.var === "kpi.cash" && typeof e.delta === "number") c += e.delta;
      if (c > bs) { bs = c; best = i; }
    });
    return best;
  },
  rational: (s, ev) => {
    let best = 0, bs = -Infinity;
    ev.options.forEach((o, i) => { const sc = optionScore(o, s); if (sc > bs) { bs = sc; best = i; } });
    return best;
  },
};

function runGame(botName, difficulty, seed) {
  const bot = BOTS[botName];
  const rng = makeRng(seed >>> 0);
  let s = newGame(data, { playerName: "bot", companyName: "bot", difficulty, seed: "s" + seed });
  let guard = 0;
  while (s.meta.phase !== "ended" && guard++ < 900) {
    if (s.events.current) {
      const ev = data.events.events.find((e) => e.id === s.events.current);
      s = reduce(s, { type: "DECIDE", optionIndex: bot(s, ev, rng) }, data);
    } else if (s.meta.phase === "events") {
      s = reduce(s, { type: "END_MONTH" }, data);
    } else {
      s = reduce(s, { type: "ACK" }, data);
    }
  }
  return s;
}

function pctile(arr, p) { const a = [...arr].sort((x, y) => x - y); return a[Math.floor(a.length * p)] ?? 0; }

function summarize(games) {
  const n = games.length;
  const cnt = (f) => games.filter(f).length;
  const rate = (f) => (100 * cnt(f) / n).toFixed(0) + "%";
  const scores = games.map((g) => g.ending.score);
  const months = games.map((g) => g.meta.month);
  return {
    timeup: rate((g) => g.ending.type === "timeup"),
    bankrupt: rate((g) => g.ending.type === "bankrupt"),
    fired: rate((g) => g.ending.type === "fired"),
    t2: rate((g) => g.tier >= 2),
    t3: rate((g) => g.tier === 3),
    ipo: rate((g) => g.flags.ipoApproved),
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / n),
    medMonth: pctile(months, 0.5),
  };
}

console.log(`模擬 ${N} 局/組 × 3 難度 × 3 bot\n`);
const DIFFS = ["easy", "normal", "hard"];
for (const bot of ["random", "cautious", "rational"]) {
  console.log(`── bot: ${bot} ──`);
  console.log("難度   期滿 倒閉 撤換  達T2 達T3  上市  均分 存活月中位");
  for (const diff of DIFFS) {
    const games = [];
    for (let g = 0; g < N; g++) games.push(runGame(bot, diff, 100000 * DIFFS.indexOf(diff) + g));
    const r = summarize(games);
    console.log(
      `${diff.padEnd(6)} ${r.timeup.padStart(4)} ${r.bankrupt.padStart(4)} ${r.fired.padStart(4)}  ` +
      `${r.t2.padStart(4)} ${r.t3.padStart(4)}  ${r.ipo.padStart(4)}  ${String(r.avgScore).padStart(4)} ${String(r.medMonth).padStart(6)}`
    );
  }
  console.log();
}
