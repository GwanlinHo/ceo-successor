// 進入點(M0 骨架版)：載入資料、顯示啟動確認。畫面路由於 M4 實作。
import { loadData } from "./data-loader.js";

async function boot() {
  const bootEl = document.getElementById("boot");
  try {
    const data = await loadData();
    const n = data.events.events.length;
    bootEl.innerHTML =
      `<div class="card" style="max-width:520px;margin:3rem auto;">` +
      `<h1 style="font-size:1.4rem;margin-bottom:.5rem;">企業接班人養成術</h1>` +
      `<p style="color:var(--ink-soft)">[O] 資料載入成功：事件 ${n} 件、NPC ${data.npcs.npcs.length} 位。</p>` +
      `<p style="color:var(--ink-soft);margin-top:.5rem;">遊戲畫面開發中（里程碑 M4）。</p>` +
      `</div>`;
    window.__CEO_DATA = data; // 開發期除錯用
  } catch (e) {
    bootEl.innerHTML = `<div class="card" style="max-width:520px;margin:3rem auto;">` +
      `<p class="val-bad">[X] 載入失敗：${e.message}</p>` +
      `<p style="color:var(--ink-soft)">請以 http 伺服器開啟（file:// 無法 fetch）。</p></div>`;
  }
}

boot();
