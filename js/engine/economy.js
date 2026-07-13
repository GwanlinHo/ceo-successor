// 月結算：套用企劃第 5 節公式。mutate 傳入的 state(由 engine 先 clone)，回傳結算報告。
// 金額單位萬元；0~100 刻度；rate 0~1；index 基準 1.0。

import { getVar, setVar } from "./state.js";

export function settleMonth(s, data, rng) {
  const eco = data.balance.economy;
  const tierC = data.balance.tiers[String(s.tier)];
  const k = s.kpi, a = s.aux, w = s.world;

  // --- 營收 ---
  const demand = tierC.baseDemand * w.economyIndex * (1 + k.brand / eco.brandDemandFactor);
  const moraleEff = 1 + (k.morale - 50) * eco.moraleEffSlope;
  const capacityValue = a.capacity * eco.capacityUnitValue * a.yieldRate * moraleEff;
  const demandValue = demand * (k.share / 100);
  const salesValue = Math.min(demandValue, capacityValue);
  const revenue = salesValue * a.price;
  const capped = capacityValue < demandValue; // 產能不足吃不下需求
  // 利用率為導出值(供報表顯示與事件觸發條件，如產線瓶頸)
  setVar(s, "aux.utilization", capacityValue > 0 ? salesValue / capacityValue : 0);

  // --- 成本 ---
  const material = salesValue * a.materialRate;
  const personnel = k.headcount * a.salaryAvg;
  const admin = revenue * tierC.adminRate;
  const interest = a.interest + a.debt * eco.debtMonthlyRate;
  const totalCost = material + personnel + a.marketing + a.rnd + admin + interest;

  // --- 損益 ---
  const pretax = revenue - totalCost;
  const tax = pretax > 0 ? pretax * eco.taxRate : 0;
  const profit = pretax - tax;
  k.cash += profit;
  k.equity += profit;
  k.revenue = revenue;
  k.profit = profit;

  // --- 連續獲利/虧損 ---
  if (profit > 0) { s.streaks.profitMonths += 1; s.streaks.lossMonths = 0; }
  else { s.streaks.lossMonths += 1; s.streaks.profitMonths = 0; }

  // --- 季度自動評價：整季獲利股東信心升、整季虧損則跌(企劃 S-01 的自動評價部分) ---
  if (s.meta.month % 3 === 0) {
    const swing = eco.quarterlyShareholderSwing;
    if (s.streaks.profitMonths >= 3) setVar(s, "kpi.shareholder", k.shareholder + swing);
    else if (s.streaks.lossMonths >= 3) setVar(s, "kpi.shareholder", k.shareholder - swing);
  }

  // --- 漂移(每月自然變化) ---
  // 研發累積產品競爭力，同時自然折舊
  setVar(s, "kpi.product", k.product + a.rnd * eco.rndEffect - eco.productDecay);
  // 對手成長(難度加成)
  const diffL = data.difficulty.levels[s.meta.difficulty];
  setVar(s, "world.rivalProduct", w.rivalProduct + eco.rivalGrowthBase * diffL.rivalGrowthMul);
  // 市占拉鋸：產品差距 + 行銷投入 - 對手侵蝕
  const shareDelta =
    (k.product - w.rivalProduct) / eco.shareGainDivisor +
    a.marketing / (tierC.baseDemand * eco.marketingSharePct) -
    tierC.rivalErosion * diffL.rivalGrowthMul;
  setVar(s, "kpi.share", k.share + shareDelta);
  // 員工數向「營收/人均產值」靠攏，扣除離職
  const targetHead = revenue / tierC.revenuePerEmployee;
  const hire = (targetHead - k.headcount) * eco.hireSpeed;
  const quits = k.headcount * a.turnover * (k.morale < 40 ? 2 : 1);
  setVar(s, "kpi.headcount", k.headcount + hire - quits);
  // 獲利時小幅自然添購產能
  if (profit > 0) setVar(s, "aux.capacity", a.capacity * (1 + eco.capacityDrift));
  // 景氣隨機漫步
  setVar(s, "world.economyIndex", w.economyIndex + rng.float(-eco.economyWalk, eco.economyWalk));
  // 均值回歸(防鎖死於極端)
  for (const [key, target] of Object.entries(eco.regressTargets)) {
    const path = key in k ? `kpi.${key}` : `aux.${key}`;
    const v = getVar(s, path);
    if (v > target) setVar(s, path, v - eco.regressToMean);
    else if (v < target) setVar(s, path, v + eco.regressToMean);
  }

  const report = {
    month: s.meta.month,
    revenue: Math.round(revenue),
    cost: {
      material: Math.round(material), personnel: Math.round(personnel),
      marketing: Math.round(a.marketing), rnd: Math.round(a.rnd),
      admin: Math.round(admin), interest: Math.round(interest), tax: Math.round(tax),
    },
    profit: Math.round(profit),
    capped,
    notes: [],
  };
  if (capped) report.notes.push("[!] 產能不足，部分市場需求未能消化");
  if (k.cash < revenue * 0.5) report.notes.push("[!] 現金水位偏低");
  s.lastReport = report;
  return report;
}
