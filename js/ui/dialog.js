// 事件對話框。顯示 NPC、情境、2~4 選項。簡單難度顯示效果數字提示。

import { esc } from "./hud.js";
import { getEvent } from "../engine/events.js";
import { npcAvatar } from "./office.js";

const DEPT_TAG = {
  rnd: "研發部", prod: "生產部", mkt: "行銷業務部", hr: "人事部", fin: "財務部",
  shareholder: "大股東", bank: "銀行", supplier: "供應商", channel: "客戶", gov: "政府", media: "媒體",
};
const TYPE_TAG = { routine: "例行", opportunity: "機會", crisis: "危機", chain: "劇情" };

// 變數 → 相關報表分頁(決策參考導引用)
const VAR_TAB = {
  "kpi.cash": "cashflow", "kpi.equity": "balance", "aux.debt": "balance", "aux.interest": "balance",
  "kpi.share": "market", "kpi.brand": "market", "kpi.satisfaction": "market", "aux.price": "market",
  "world.rivalProduct": "market", "world.economyIndex": "market",
  "kpi.product": "dept", "kpi.morale": "dept", "aux.yieldRate": "dept", "aux.capacity": "dept",
  "aux.salaryAvg": "dept", "aux.turnover": "dept", "kpi.headcount": "dept",
  "aux.marketing": "dept", "aux.rnd": "dept", "aux.materialRate": "dept",
  "kpi.credit": "relations", "kpi.shareholder": "relations", "kpi.compliance": "relations",
  "aux.supplierRel": "relations", "aux.channelRel": "relations",
};
const TAB_LABEL = { pnl: "損益表", balance: "資產負債", cashflow: "現金流", dept: "部門儀表板", market: "市場報告", relations: "外部關係" };

// 從事件全部選項的效果，統計最相關的 1~2 個報表分頁
function relevantTabs(ev) {
  const freq = {};
  const bump = (v) => { const t = VAR_TAB[v]; if (t) freq[t] = (freq[t] || 0) + 1; };
  for (const o of ev.options || []) {
    for (const e of o.effects || []) bump(e.var);
    for (const b of o.random || []) for (const e of b.effects || []) bump(e.var);
    for (const e of o.effects || []) if (e.pctOf) freq.pnl = (freq.pnl || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t);
}

// 顯示目前事件；回傳 HTML。無事件回傳空字串。
export function renderDialog(s, data) {
  const evId = s.events.current;
  if (!evId) return "";
  const ev = getEvent(data, evId);
  const npc = data.npcById[ev.speaker];
  const showNum = data.difficulty.levels[s.meta.difficulty].showNumbers;
  const idxInMonth = s.events.history.filter((h) => h.month === s.meta.month).length + 1;
  const totalMonth = idxInMonth + s.events.queue.length - 1;

  return `
    <div class="dialog card">
      <div class="dialog-head">
        <span class="tag tag-${ev.type}">${TYPE_TAG[ev.type] || ""}</span>
        <span class="tag">${DEPT_TAG[ev.dept] || ""}</span>
        <span class="dialog-progress">本月第 ${idxInMonth} / ${totalMonth} 件</span>
      </div>
      <h2 class="dialog-title">${esc(ev.title)}</h2>
      <div class="dialog-speaker">
        ${npc ? npcAvatar(npc.id, 88) : ""}
        <div class="dialog-speech">
          ${npc ? `<div class="dialog-npc">${esc(npc.name)}・${esc(npc.role)}</div>` : ""}
          <p class="dialog-text">${esc(ev.text)}</p>
        </div>
      </div>
      ${renderRefs(ev, s)}
      <div class="dialog-options">
        ${ev.options.map((o, i) => `
          <button class="btn option" data-opt="${i}">
            <span class="option-label">${esc(o.label)}</span>
            ${o.hint ? `<span class="option-hint">${esc(o.hint)}</span>` : ""}
            ${showNum ? `<span class="option-num">${effectPreview(o)}</span>` : ""}
          </button>`).join("")}
      </div>
    </div>`;
}

// 決策參考列：相關報表捷徑 + 本月新聞捷徑(拿不準時先查證再決策)
function renderRefs(ev, s) {
  const tabs = relevantTabs(ev);
  const newsCount = (s.news || []).length;
  if (!tabs.length && !newsCount) return "";
  return `
    <div class="dialog-refs">
      <span class="refs-label">決策參考</span>
      ${tabs.map((t) => `<button class="btn btn-ref" data-open-rtab="${t}">${TAB_LABEL[t]}</button>`).join("")}
      ${newsCount ? `<button class="btn btn-ref" data-act="open-news">本月新聞(${newsCount})</button>` : ""}
    </div>`;
}

// 簡單難度的效果數字提示(粗略摘要)
function effectPreview(opt) {
  const parts = [];
  for (const e of opt.effects || []) {
    const d = Array.isArray(e.delta) ? `${e.delta[0]}~${e.delta[1]}` : e.delta;
    if (e.pctOf) parts.push(`${labelVar(e.var)} ${Math.round(e.pct * 100)}%營收`);
    else if (e.op === "mul") parts.push(`${labelVar(e.var)} ×${d}`);
    else parts.push(`${labelVar(e.var)} ${d > 0 ? "+" : ""}${d}`);
  }
  if ((opt.random || []).length) parts.push("(含機率結果)");
  return parts.join("、") || "無直接影響";
}

function labelVar(path) {
  const short = { "kpi.cash": "現金", "kpi.product": "競爭力", "kpi.morale": "士氣", "kpi.share": "市占",
    "kpi.brand": "品牌", "kpi.satisfaction": "滿意度", "kpi.credit": "信用", "kpi.shareholder": "股東",
    "kpi.compliance": "合規", "aux.materialRate": "原料率", "aux.capacity": "產能", "aux.price": "單價",
    "aux.salaryAvg": "薪資", "aux.supplierRel": "供應商", "aux.channelRel": "通路", "aux.marketing": "行銷",
    "aux.debt": "負債", "aux.interest": "利息", "aux.yieldRate": "良率" };
  return short[path] || path;
}

// 決策後的隨機結果提示(若有)
export function renderDecisionResult(s) {
  const d = s.lastDecision;
  if (!d || !d.resultText) return "";
  return `<div class="decision-result">${esc(d.resultText)}</div>`;
}
