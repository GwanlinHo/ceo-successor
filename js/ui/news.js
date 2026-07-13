// 新聞面板：overlay 抽屜。顯示本月新聞與近期回顧。真偽在事後才揭曉(當下不標示)。

import { esc } from "./hud.js";

const TYPE_LABEL = { industry: "產業", company: "公司", rumor: "小道消息" };

export function renderNews(s) {
  const now = (s.news || []).map((n) => newsItem(n, false)).join("");
  const history = (s.newsSeen || []).slice(0, -Math.max(0, s.news?.length || 0)).reverse();
  return `
    <div class="overlay" data-overlay="news">
      <div class="panel">
        <div class="panel-head">
          <h2>新聞・情報</h2>
          <button class="btn btn-ghost" data-act="close-overlay">關閉</button>
        </div>
        <div class="panel-body">
          <h3 class="news-section">本月（第 ${s.meta.month} 月）</h3>
          <div class="news-list">${now || `<p class="chart-empty">本月暫無新聞</p>`}</div>
          <p class="report-note">小道消息真假難辨，跟不跟由你判斷；產業新聞通常可信。</p>
        </div>
      </div>
    </div>`;
}

function newsItem(n) {
  return `
    <div class="news-item news-${n.type}">
      <span class="news-tag">${TYPE_LABEL[n.type] || ""}</span>
      <span class="news-text">${esc(n.text)}</span>
    </div>`;
}
