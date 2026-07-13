// 非遊戲中畫面：開始、遊戲說明、開局設定、結局。

import { esc } from "./hud.js";
import { DIFF_LABELS, TIER_NAMES, money, score100 } from "./labels.js";

export function renderStart(hasSaveFlag) {
  return `
    <div class="screen center">
      <div class="title-block">
        <h1 class="game-title">企業接班人養成術</h1>
        <p class="game-sub">從小型企業總經理，走向成功上市的接班之路</p>
      </div>
      <div class="menu">
        ${hasSaveFlag ? `<button class="btn btn-primary" data-act="continue">繼續遊戲</button>` : ""}
        <button class="btn ${hasSaveFlag ? "" : "btn-primary"}" data-act="new">新遊戲</button>
        <button class="btn" data-act="how">遊戲說明</button>
        <button class="btn" data-act="import">匯入存檔</button>
      </div>
    </div>`;
}

const HOW_PAGES = [
  { h: "你的目標", p: "你是一位小型企業的總經理。用五年（60 個遊戲月）的時間，處理內外部事件、做出決策，讓公司從小型成長為中型，最後成功上市為大型企業。" },
  { h: "怎麼玩", p: "每個月會有數件來自各部門與外部單位的事件等你決策。做完當月所有決策後，按「結束本月」進行結算，數據隨之變化，再進入下一個月。決策的效果往往在一兩個月後才顯現。" },
  { h: "要盯什麼", p: "上方常駐顯示現金、營收、淨利、士氣、市占、股東信心。現金見底又借不到錢會倒閉；股東信心歸零會被撤換。報表中心（後續版本）能看到完整的內外部數據與趨勢。" },
  { h: "怎麼升級", p: "當營收、淨值、員工數、連續獲利月數等關鍵數據同時達標並維持一段時間，公司規模就會升級。規模愈大，市場愈大、但管理成本與競爭壓力也愈高——賺得快，燒得也快。" },
  { h: "難度", p: "簡單／普通／困難影響事件數量、危機頻率、經濟環境與計分。困難難度事件多、環境嚴苛，但通關評分更高。選項在普通以上難度不顯示精確數字，你得從報表回饋中學會因果——這正是「養成術」的核心。" },
];

export function renderHowTo(page = 0) {
  const p = HOW_PAGES[page];
  return `
    <div class="screen center">
      <div class="card howto">
        <div class="howto-step">說明 ${page + 1} / ${HOW_PAGES.length}</div>
        <h2>${esc(p.h)}</h2>
        <p>${esc(p.p)}</p>
        <div class="howto-nav">
          ${page > 0 ? `<button class="btn" data-act="how-prev">上一頁</button>` : "<span></span>"}
          ${page < HOW_PAGES.length - 1
            ? `<button class="btn btn-primary" data-act="how-next">下一頁</button>`
            : `<button class="btn btn-primary" data-act="how-done">開始</button>`}
        </div>
      </div>
    </div>`;
}
export const HOW_PAGE_COUNT = HOW_PAGES.length;

export function renderConfirmNew() {
  return `
    <div class="screen center">
      <div class="card howto">
        <h2>開新遊戲？</h2>
        <p>你有一局尚未結束的遊戲。開新遊戲會<b>覆蓋目前的存檔</b>，這局進度將無法復原。</p>
        <p style="color:var(--ink-soft);font-size:0.9rem;">想保留這局，可先返回、用「繼續遊戲」進入後「匯出存檔」備份。</p>
        <div class="setup-actions">
          <button class="btn" data-act="back">返回</button>
          <button class="btn btn-primary" data-act="confirm-new">覆蓋並開新局</button>
        </div>
      </div>
    </div>`;
}

export function renderSetup() {
  return `
    <div class="screen center">
      <div class="card setup">
        <h2>開局設定</h2>
        <label class="field">總經理姓名
          <input id="in-player" type="text" maxlength="10" placeholder="請輸入你的名字" value="李承翰">
        </label>
        <label class="field">公司名稱
          <input id="in-company" type="text" maxlength="14" placeholder="請輸入公司名稱" value="大山精工">
        </label>
        <div class="field">難度
          <div class="diff-group">
            ${Object.entries(DIFF_LABELS).map(([k, v], i) =>
              `<button class="btn diff-btn ${i === 1 ? "on" : ""}" data-diff="${k}">${v}</button>`).join("")}
          </div>
        </div>
        <div class="setup-actions">
          <button class="btn" data-act="back">返回</button>
          <button class="btn btn-primary" data-act="start-game">開始經營</button>
        </div>
      </div>
    </div>`;
}

export function renderEnding(s, data) {
  const e = s.ending;
  const typeText = {
    ipo: "成功上市！", timeup: "五年任期屆滿", bankrupt: "公司倒閉", fired: "遭董事會撤換",
  }[e.type] || "遊戲結束";
  const p = e.parts;
  const rows = p ? [
    ["規模達成", p.tier],
    ["財務成就", p.finance],
    ["經營品質", p.quality],
    ["特殊成就", p.achievement],
  ] : [];
  const log = s.log.slice(-12);
  return `
    <div class="screen center">
      <div class="card ending">
        <div class="ending-type">${esc(typeText)}</div>
        <div class="ending-score">${e.score}<span>分</span></div>
        <div class="ending-grade">評定：${esc(e.grade)}</div>
        <div class="ending-final">${esc(TIER_NAMES[s.tier])}・${esc(s.meta.companyName)}・淨值 ${money(s.kpi.equity)}</div>
        ${rows.length ? `<table class="ledger">${rows.map(([l, v]) => `<tr><td>${l}</td><td class="num">${v}</td></tr>`).join("")}</table>` : ""}
        <div class="ending-log">
          <h3>經營大事記</h3>
          <ul>${log.map((l) => `<li>[第${l.month}月] ${esc(l.text)}</li>`).join("")}</ul>
        </div>
        <button class="btn btn-primary" data-act="to-start">回到主畫面</button>
      </div>
    </div>`;
}
