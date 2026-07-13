// 新聞與小道消息系統。每月產生 2~4 條，讓「監控外部情勢」成為有價值的玩法：
// - industry 產業新聞：可信，預告 1~2 個月後的真實市場變動(排入延遲效果)。
// - rumor 小道消息：依難度 rumorTruthRate 決定真偽；真→排入延遲效果，假→無事(但玩家可能白花錢避險)。
// - company 公司新聞：純敘述玩家決策後果，無額外效果。

import { queueEffect } from "./effects.js";

// hint → 真實效果工廠(回傳原始 effect 陣列，交由 queueEffect 解析)
const HINT_EFFECTS = {
  economyUp: () => [{ var: "world.economyIndex", delta: 0.06, delayMonths: 1, note: "景氣回升" }],
  materialUp: () => [{ var: "aux.materialRate", op: "mul", delta: 1.06, delayMonths: 1, note: "原料漲價" }],
  rivalUp: () => [{ var: "world.rivalProduct", delta: 4, delayMonths: 2, note: "對手擴張" }],
  channelShift: () => [{ var: "kpi.share", delta: -2, delayMonths: 2, note: "通路洗牌" }],
  govAudit: () => [{ var: "kpi.compliance", delta: -3, delayMonths: 1, note: "稽查趨嚴" }],
  neutral: () => [],
};

// 產生本月新聞。於進入新月份(ACK)時呼叫。
export function generateNews(s, data, rng) {
  const diffL = data.difficulty.levels[s.meta.difficulty];
  const truthRate = diffL.rumorTruthRate ?? 0.6;
  const pool = (data.news.templates || []).filter((t) => t.tier.includes(s.tier));
  const count = rng.int(2, 4);

  // 洗牌後取前 count 條
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked = shuffled.slice(0, Math.min(count, shuffled.length));

  const items = [];
  for (const t of picked) {
    let truth = null;
    if (t.type === "industry") truth = true;          // 產業新聞可信
    else if (t.type === "rumor") truth = rng.next() < truthRate; // 小道消息真偽
    // 真實效果：產業新聞必發、小道消息為真才發
    if ((t.type === "industry" || (t.type === "rumor" && truth)) && HINT_EFFECTS[t.hint]) {
      for (const eff of HINT_EFFECTS[t.hint]()) queueEffect(s, eff, rng, data);
    }
    items.push({ id: t.id, type: t.type, text: fill(t.text, s), truth });
  }

  s.news = items;
  // 併入歷史(留最近 12 條)
  s.newsSeen = [...(s.newsSeen || []), ...items.map((n) => ({ ...n, month: s.meta.month }))].slice(-12);
}

function fill(text, s) {
  return text
    .replace(/\{company\}/g, s.meta.companyName)
    .replace(/\{rival\}/g, "隆對手企業");
}
