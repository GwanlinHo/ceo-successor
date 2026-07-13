// 頂部 KPI 列與月結算摘要。M4 純文字版；M6 加入辦公室場景。

import { KPI_LABELS, TIER_NAMES, DIFF_LABELS, money, pct, score100, trendClass } from "./labels.js";

// 頂部常駐列：月份進度 + 規模 + 六個關鍵 KPI
export function renderHud(s, data) {
  const k = s.kpi;
  const total = data.balance.duration.totalMonths;
  const cells = [
    ["現金", money(k.cash), k.cash < 0 ? "val-bad" : ""],
    ["月營收", money(k.revenue), ""],
    ["月淨利", money(k.profit), trendClass(k.profit)],
    ["士氣", score100(k.morale), k.morale < 35 ? "val-bad" : ""],
    ["市占", pct(k.share), ""],
    ["股東信心", score100(k.shareholder), k.shareholder < 30 ? "val-bad" : ""],
  ];
  return `
    <div class="hud">
      <div class="hud-title">
        <span class="hud-company">${esc(s.meta.companyName)}</span>
        <span class="hud-tier">${TIER_NAMES[s.tier]}</span>
        <span class="hud-month">第 ${s.meta.month} / ${total} 月・${DIFF_LABELS[s.meta.difficulty]}</span>
      </div>
      <div class="hud-kpis">
        ${cells.map(([l, v, c]) => `<div class="kpi"><span class="kpi-l">${l}</span><span class="kpi-v ${c}">${v}</span></div>`).join("")}
      </div>
    </div>`;
}

// 月結算摘要卡
export function renderSettlement(s) {
  const r = s.lastReport;
  if (!r) return "";
  const c = r.cost;
  // 本月是否有規模變動/上市等重大事件(從 log 抓)
  const bigNews = s.log.filter((l) => l.month === s.meta.month &&
    /升級|降級|上市|紓困|倒閉|撤換/.test(l.text));
  const banner = bigNews.map((l) => {
    const kind = /升級|上市/.test(l.text) ? "up" : (/降級|倒閉|撤換/.test(l.text) ? "down" : "warn");
    return `<div class="scale-banner scale-${kind}">${esc(l.text)}</div>`;
  }).join("");
  const rows = [
    ["月營收", money(r.revenue), ""],
    ["　原料成本", "-" + money(c.material), ""],
    ["　人事成本", "-" + money(c.personnel), ""],
    ["　行銷費", "-" + money(c.marketing), ""],
    ["　研發費", "-" + money(c.rnd), ""],
    ["　管理費", "-" + money(c.admin), ""],
    ["　利息", "-" + money(c.interest), ""],
    ["　稅", "-" + money(c.tax), ""],
    ["月淨利", money(r.profit), trendClass(r.profit)],
  ];
  return `
    ${banner}
    <div class="settlement card">
      <h2>第 ${r.month} 月結算</h2>
      <table class="ledger">
        ${rows.map(([l, v, cl]) => `<tr><td>${l}</td><td class="num ${cl}">${v}</td></tr>`).join("")}
      </table>
      <div class="settle-kpi">現金 ${money(s.kpi.cash)}　淨值 ${money(s.kpi.equity)}　員工 ${Math.round(s.kpi.headcount)} 人</div>
      ${r.notes.length ? `<ul class="notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
    </div>`;
}

export function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
