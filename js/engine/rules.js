// 規則判定：升級/降級/倒閉紓困/撤換/期滿，與結局計分。於每月結算後呼叫。

export function checkRules(s, data) {
  const th = data.balance.thresholds;
  const diffL = data.difficulty.levels[s.meta.difficulty];
  const mul = diffL.upgradeThresholdMul;
  const k = s.kpi;

  // --- 倒閉判定(優先)：現金見底 → 嘗試銀行紓困 ---
  if (k.cash < th.bankrupt.cashFloor) {
    const tierC = data.balance.tiers[String(s.tier)];
    const need = Math.ceil(-k.cash + 200); // 補到正數再留緩衝
    const canRescue = k.credit >= th.bankrupt.rescueMinCredit && s.aux.debt + need <= tierC.bankLimit;
    if (canRescue) {
      s.aux.debt += need;
      k.cash += need;
      k.credit = Math.max(0, k.credit - 10);
      s.log.push({ month: s.meta.month, text: `[!] 現金見底，銀行緊急紓困 ${need} 萬(信用受損)。` });
    } else {
      return endGame(s, data, "bankrupt", "現金耗盡且銀行拒絕紓困，公司宣告倒閉。");
    }
  }

  // --- 股東信心歸零 → 撤換 ---
  if (k.shareholder <= 0) {
    return endGame(s, data, "fired", "股東信心崩盤，董事會決議撤換總經理。");
  }

  // --- 升級 ---
  if (s.tier === 1) {
    const t = th.upgradeTo2;
    const ok = k.revenue >= t.revenue * mul && k.equity >= t.equity * mul &&
      k.headcount >= t.headcount * mul && s.streaks.profitMonths >= t.profitStreak;
    s.streaks.upgradeHold = ok ? s.streaks.upgradeHold + 1 : 0;
    if (ok && s.streaks.upgradeHold >= t.holdMonths) {
      s.tier = 2;
      s.streaks.upgradeHold = 0;
      s.log.push({ month: s.meta.month, text: "[O] 公司規模升級：中型企業。市場更大，管理成本與競爭壓力也更高。" });
    }
  } else if (s.tier === 2) {
    const t = th.upgradeTo3;
    const ok = k.revenue >= t.revenue * mul && k.equity >= t.equity * mul &&
      k.headcount >= t.headcount * mul && s.streaks.profitMonths >= t.profitStreak &&
      k.shareholder >= t.shareholder && k.compliance >= t.compliance && k.brand >= t.brand;
    s.streaks.upgradeHold = ok ? s.streaks.upgradeHold + 1 : 0;
    if (ok && s.streaks.upgradeHold >= t.holdMonths) {
      // TODO(M7): requireIpoChain 改由「上市審查」事件鏈把關；種子版直接視為通過審查
      s.tier = 3;
      s.streaks.upgradeHold = 0;
      s.flags.ipoDone = true;
      s.log.push({ month: s.meta.month, text: "[O] 通過上市審查，正式掛牌！公司晉升大型企業。" });
    }
  }

  // --- 降級 ---
  if (s.tier > 1) {
    const t = th.downgrade;
    const floor = (s.tier === 2 ? th.upgradeTo2 : th.upgradeTo3);
    const bad = s.streaks.lossMonths >= t.lossStreak ||
      k.equity < floor.equity * mul * t.equityFloorRatio ||
      k.headcount < floor.headcount * mul * t.equityFloorRatio;
    s.streaks.downgradeHold = bad ? s.streaks.downgradeHold + 1 : 0;
    if (bad && s.streaks.downgradeHold >= t.holdMonths) {
      s.tier -= 1;
      s.streaks.downgradeHold = 0;
      if (s.flags.ipoDone && s.tier < 3) s.flags.ipoDone = false;
      s.log.push({ month: s.meta.month, text: "[X] 營運惡化，公司規模降級為" + data.balance.tiers[String(s.tier)].name + "。" });
    }
  }

  // --- 期滿 ---
  if (s.meta.month >= data.balance.duration.totalMonths) {
    return endGame(s, data, "timeup", "五年任期屆滿，董事會進行總驗收。");
  }
  return null;
}

export function endGame(s, data, type, text) {
  const { score, parts, grade } = computeScore(s, data, type);
  s.ending = { type, text, score, parts, grade };
  s.meta.phase = "ended";
  s.log.push({ month: s.meta.month, text: `${text} 最終評分 ${score}，評定「${grade}」。` });
  return s.ending;
}

export function computeScore(s, data, endType) {
  const sc = data.balance.scoring;
  const k = s.kpi;
  const tierPts = endType === "bankrupt" ? sc.tierPoints.bankrupt : sc.tierPoints[String(s.tier)];
  const equityBase = data.balance.init.kpi.equity;
  const growth = Math.max(0, k.equity / equityBase);
  const financePts = Math.round(sc.financeMax * Math.min(1, growth / sc.equityGrowthTargetMultiple));
  const qualityAvg = sc.qualityMetrics.reduce((sum, m) => sum + k[m], 0) / sc.qualityMetrics.length;
  const qualityPts = Math.round(sc.qualityMax * qualityAvg / 100);
  const achievementPts = 0; // TODO(M9): 特殊成就
  const score = endType === "bankrupt" ? 0 : tierPts + financePts + qualityPts + achievementPts;
  const grade = endType === "bankrupt"
    ? sc.grades[sc.grades.length - 1].label
    : sc.grades.find((g, i) => i < sc.grades.length - 1 && score >= g.min)?.label ?? sc.grades[sc.grades.length - 2].label;
  return { score, parts: { tier: tierPts, finance: financePts, quality: qualityPts, achievement: achievementPts }, grade };
}
