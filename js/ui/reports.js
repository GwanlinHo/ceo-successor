// 報表中心：六分頁。overlay 抽屜，唯讀 state，不改遊戲狀態。

import { esc } from "./hud.js";
import { lineChart, meter } from "./charts.js";
import { money, pct, score100, TIER_NAMES } from "./labels.js";

export const REPORT_TABS = [
  { key: "pnl", label: "損益表" },
  { key: "balance", label: "資產負債" },
  { key: "cashflow", label: "現金流" },
  { key: "dept", label: "部門儀表板" },
  { key: "market", label: "市場報告" },
  { key: "relations", label: "外部關係" },
];

export function renderReports(s, data, activeTab = "pnl") {
  const tabs = REPORT_TABS.map((t) =>
    `<button class="rtab ${t.key === activeTab ? "on" : ""}" data-rtab="${t.key}">${t.label}</button>`).join("");
  return `
    <div class="overlay" data-overlay="reports">
      <div class="panel">
        <div class="panel-head">
          <h2>報表中心</h2>
          <button class="btn btn-ghost" data-act="close-overlay">關閉</button>
        </div>
        <div class="rtabs">${tabs}</div>
        <div class="panel-body">${renderTab(s, data, activeTab)}</div>
      </div>
    </div>`;
}

function series(s, field) {
  // 過濾 undefined：舊版存檔的快照可能沒有新欄位
  return s.metrics.filter((m) => m[field] !== undefined).map((m) => ({ month: m.month, value: m[field] }));
}

function renderTab(s, data, tab) {
  const k = s.kpi, a = s.aux;
  if (tab === "pnl") {
    const r = s.lastReport;
    return `
      ${chartBlock("月營收趨勢", series(s, "revenue"), "var(--accent)")}
      ${chartBlock("月淨利趨勢", series(s, "profit"), "var(--good)")}
      ${r ? `<table class="ledger">
        <tr><td>本月營收</td><td class="num">${money(r.revenue)}</td></tr>
        <tr><td>原料成本</td><td class="num">-${money(r.cost.material)}</td></tr>
        <tr><td>人事成本</td><td class="num">-${money(r.cost.personnel)}</td></tr>
        <tr><td>行銷費</td><td class="num">-${money(r.cost.marketing)}</td></tr>
        <tr><td>研發費</td><td class="num">-${money(r.cost.rnd)}</td></tr>
        <tr><td>管理費</td><td class="num">-${money(r.cost.admin)}</td></tr>
        <tr><td>利息</td><td class="num">-${money(r.cost.interest)}</td></tr>
        <tr><td>稅</td><td class="num">-${money(r.cost.tax)}</td></tr>
        <tr><td><b>月淨利</b></td><td class="num"><b>${money(r.profit)}</b></td></tr>
      </table>` : `<p class="chart-empty">尚未有月結算資料</p>`}`;
  }
  if (tab === "balance") {
    return `
      ${chartBlock("淨值趨勢", series(s, "equity"), "var(--accent)")}
      ${chartBlock("負債趨勢", series(s, "debt"), "var(--bad)")}
      <table class="ledger">
        <tr><td>現金</td><td class="num">${money(k.cash)}</td></tr>
        <tr><td>淨值</td><td class="num">${money(k.equity)}</td></tr>
        <tr><td>負債</td><td class="num">${money(a.debt)}</td></tr>
        <tr><td>月利息負擔</td><td class="num">${money(a.interest + a.debt * data.balance.economy.debtMonthlyRate)}</td></tr>
        <tr><td>規模</td><td class="num">${TIER_NAMES[s.tier]}</td></tr>
      </table>`;
  }
  if (tab === "cashflow") {
    return `
      ${chartBlock("現金水位趨勢", series(s, "cash"), "var(--good)")}
      <table class="ledger">
        <tr><td>目前現金</td><td class="num">${money(k.cash)}</td></tr>
        <tr><td>上月淨利(營運現金流)</td><td class="num">${money(k.profit)}</td></tr>
        <tr><td>負債總額</td><td class="num">${money(a.debt)}</td></tr>
        <tr><td>銀行可用額度</td><td class="num">${money(data.balance.tiers[String(s.tier)].bankLimit - a.debt)}</td></tr>
      </table>
      <p class="report-note">現金見底且銀行拒絕紓困即倒閉，注意水位。</p>`;
  }
  if (tab === "dept") {
    return `
      ${chartBlock("產品競爭力趨勢", series(s, "product"), "var(--accent)")}
      ${chartBlock("員工士氣趨勢", series(s, "morale"), "var(--good)")}
      ${chartBlock("員工數趨勢", series(s, "headcount"), "var(--warn)")}
      <div class="meters">
        ${meter(k.product, { label: "產品競爭力" })}
        ${meter(k.morale, { label: "員工士氣" })}
        ${meter(a.yieldRate * 100, { label: "良率" })}
        ${meter(a.utilization * 100, { label: "產能利用率", warn: 0 })}
      </div>
      <table class="ledger">
        <tr><td>員工數</td><td class="num">${Math.round(k.headcount)} 人</td></tr>
        <tr><td>平均月薪</td><td class="num">${money(a.salaryAvg)}</td></tr>
        <tr><td>離職率</td><td class="num">${(a.turnover * 100).toFixed(1)}%</td></tr>
        <tr><td>產能指數</td><td class="num">${a.capacity.toFixed(2)}</td></tr>
        <tr><td>原料成本率</td><td class="num">${(a.materialRate * 100).toFixed(1)}%</td></tr>
        <tr><td>研發月支出</td><td class="num">${money(a.rnd)}</td></tr>
      </table>`;
  }
  if (tab === "market") {
    return `
      ${chartBlock("市占率趨勢", series(s, "share"), "var(--accent)")}
      ${chartBlock("品牌知名度趨勢", series(s, "brand"), "var(--warn)")}
      ${chartBlock("客戶滿意度趨勢", series(s, "satisfaction"), "var(--good)")}
      <table class="ledger">
        <tr><td>市占率</td><td class="num">${pct(k.share)}</td></tr>
        <tr><td>品牌知名度</td><td class="num">${score100(k.brand)}</td></tr>
        <tr><td>客戶滿意度</td><td class="num">${score100(k.satisfaction)}</td></tr>
        <tr><td>平均單價指數</td><td class="num">${a.price.toFixed(2)}</td></tr>
        <tr><td>產業景氣</td><td class="num">${s.world.economyIndex.toFixed(2)}</td></tr>
        <tr><td>對手競爭力</td><td class="num">${score100(s.world.rivalProduct)}（我方 ${score100(k.product)}）</td></tr>
      </table>`;
  }
  if (tab === "relations") {
    return `
      ${chartBlock("股東信心趨勢", series(s, "shareholder"), "var(--accent)")}
      ${chartBlock("銀行信用趨勢", series(s, "credit"), "var(--warn)")}
      <div class="meters">
        ${meter(k.shareholder, { label: "股東信心", warn: 30 })}
        ${meter(k.credit, { label: "銀行信用", warn: 30 })}
        ${meter(a.supplierRel, { label: "供應商關係" })}
        ${meter(a.channelRel, { label: "通路關係" })}
        ${meter(k.satisfaction, { label: "客戶滿意度" })}
        ${meter(k.compliance, { label: "政府合規", warn: 30 })}
      </div>
      <p class="report-note">股東信心歸零會被撤換；銀行信用過低現金見底時借不到紓困。</p>`;
  }
  return "";
}

function chartBlock(title, points, color) {
  return `<div class="chart-block"><div class="chart-title">${esc(title)}</div>${lineChart(points, { label: title, color })}</div>`;
}
