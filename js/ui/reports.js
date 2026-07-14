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

// 財報閱讀指引：本遊戲的「養成」核心——教玩家看懂報表與三表關係
const FLOW_DIAGRAM = `
  <div class="guide-flow">
    <div class="flow-title">三張財務報表的關係</div>
    <pre class="flow-pre">損益表(這個月賺或賠)
   │
   ├─ 累積 ──▶ 資產負債(公司身家:淨值)
   └─ 進出 ──▶ 現金流(生存線:現金水位)</pre>
  </div>`;

const GUIDES = {
  pnl: `
    <p><b>這張表回答：這個月有沒有賺錢？</b>公式是「營收 − 各項成本費用 − 稅 = 月淨利」。</p>
    <ul>
      <li><b>月營收</b>：賣出去的錢 = 銷售量 × 單價。銷售量受市占與產能限制(詳見市場報告)。</li>
      <li><b>原料成本</b>：賣越多花越多的「變動成本」，成本率受供應商關係與議價影響。</li>
      <li><b>人事成本</b>：員工數 × 平均月薪，相對固定——營收衰退時它不會自己變小，是虧損的常見主因。</li>
      <li><b>行銷費 / 研發費</b>：投資未來的費用。砍掉短期獲利馬上變好看，但市占與競爭力會慢慢流失。</li>
      <li><b>管理費</b>：規模愈大費率愈高——這就是「規模愈大，燒得也愈快」。</li>
      <li><b>利息</b>：負債的代價，每月固定吃掉獲利。</li>
    </ul>
    <p><b>判讀要點</b>：看趨勢別看單月。若「營收成長但淨利下降」，代表成本結構惡化——回頭查原料率或人事成本。</p>
    ${FLOW_DIAGRAM}`,
  balance: `
    <p><b>這張表回答：公司到目前為止累積了多少身家？</b>核心是「淨值 = 資產 − 負債」。</p>
    <ul>
      <li><b>淨值</b>：歷月淨利的累積。賺錢它變厚、虧錢它變薄——公司升級門檻看的就是它。</li>
      <li><b>負債</b>：借錢不是壞事——若擴張賺的錢超過利息，借錢就划算(這叫槓桿)。但利息每月吃損益。</li>
      <li>借款當下「現金增加、負債同額增加」，淨值不變——身家沒變多，只是手頭變寬。</li>
    </ul>
    <p><b>判讀要點</b>：淨值趨勢向上 = 公司在變厚實。負債相對淨值過高時，景氣一轉、銀行抽銀根就危險。</p>
    ${FLOW_DIAGRAM}`,
  cashflow: `
    <p><b>這張表回答：公司會不會突然死掉？</b>記住鐵律：<b>現金不等於獲利</b>。</p>
    <ul>
      <li>帳上有賺錢、現金卻見底，一樣會倒閉——這叫「黑字倒閉」。本遊戲的倒閉條件正是「現金歸零且借不到錢」。</li>
      <li>現金變動 = 月淨利 ± 借還款 ± 事件的一次性收支(事件花費大多直接扣現金)。</li>
      <li><b>銀行可用額度</b>是最後防線；信用太差時，危急關頭會借不到紓困。</li>
    </ul>
    <p><b>判讀要點</b>：現金水位至少留下幾個月的成本開銷；做大投資決策前，先開這張表確認扛不扛得住。</p>
    ${FLOW_DIAGRAM}`,
  dept: `
    <p><b>這是「未來損益表」的預告</b>：部門指標今天的變化，是兩三個月後營收獲利的原因。</p>
    <ul>
      <li><b>產品競爭力</b>：研發投入慢慢累積，驅動市占消長——輸給對手，市占就被侵蝕。</li>
      <li><b>員工士氣</b>：影響生產效率與離職率。士氣崩了，產能與人才一起流失。</li>
      <li><b>良率 / 產能利用率</b>：利用率長期 100% 代表訂單吃不下——該考慮擴產了。</li>
      <li><b>員工數</b>：隨營收自然增減，人事成本的來源。</li>
    </ul>
    <p><b>判讀要點</b>：損益表變差時來這裡找原因；這裡先惡化時，趁損益表還沒反映趕快處理。</p>`,
  market: `
    <p><b>這張表拆解營收的來源</b>：營收 ≈ 市場需求 × 市占率 × 單價。</p>
    <ul>
      <li><b>市占率</b>：與對手的拉鋸戰——我方競爭力、行銷投入推升它；對手成長、市占愈高被圍剿愈兇則侵蝕它。</li>
      <li><b>品牌知名度</b>：撐大需求、也撐住定價空間。</li>
      <li><b>單價指數</b>：降價換單會壓縮毛利，且會慢慢回歸市場行情。</li>
      <li><b>產業景氣</b>：外部變數，讀新聞可以提前預判。</li>
    </ul>
    <p><b>判讀要點</b>：市占高但營收上不去？多半是產能卡住了(查部門儀表板的利用率)。</p>`,
  relations: `
    <p><b>信任是看不見的資產</b>：平常慢慢累積，關鍵時刻救你一命。</p>
    <ul>
      <li><b>股東信心</b>：歸零 = 你被撤換。整季獲利它升、整季虧損它跌——業績是最好的溝通。</li>
      <li><b>銀行信用</b>：決定融資額度與利率；信用差時現金見底借不到紓困，直接倒閉。</li>
      <li><b>供應商 / 通路關係</b>：影響原料成本與市占的隱形推手。</li>
      <li><b>政府合規</b>：重大違規擋上市；平常累積，稽查來時見真章。</li>
    </ul>
    <p><b>判讀要點</b>：這些指標跌到警戒線(紅色)才處理就晚了——低於 40 就該找機會修補。</p>`,
};

export function renderReports(s, data, activeTab = "pnl", showGuide = false) {
  const tabs = REPORT_TABS.map((t) =>
    `<button class="rtab ${t.key === activeTab ? "on" : ""}" data-rtab="${t.key}">${t.label}</button>`).join("");
  const guide = showGuide && GUIDES[activeTab]
    ? `<div class="guide">${GUIDES[activeTab]}</div>` : "";
  return `
    <div class="overlay" data-overlay="reports">
      <div class="panel">
        <div class="panel-head">
          <h2>報表中心</h2>
          <div class="panel-head-actions">
            <button class="btn btn-tool ${showGuide ? "on-guide" : ""}" data-act="toggle-guide">閱讀指引</button>
            <button class="btn btn-ghost" data-act="close-overlay">關閉</button>
          </div>
        </div>
        <div class="rtabs">${tabs}</div>
        <div class="panel-body">${guide}${renderTab(s, data, activeTab)}</div>
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
