// 控制器：載入資料、畫面路由、事件委派、呼叫引擎、自動存檔。

import { loadData } from "./data-loader.js";
import { newGame, reduce } from "./engine/engine.js";
import { saveGame, loadGame, hasSave, clearSave, exportSave, importSave, requestPersistentStorage, sanitizeSave } from "./save.js";
import { renderHud, renderSettlement } from "./ui/hud.js";
import { renderDialog, renderDecisionResult } from "./ui/dialog.js";
import { renderStart, renderHowTo, renderSetup, renderConfirmNew, renderEnding, HOW_PAGE_COUNT } from "./ui/screens.js";
import { renderReports } from "./ui/reports.js";
import { renderNews } from "./ui/news.js";
import { renderOffice, officeBackdrop } from "./ui/office.js";
import { GAME_VERSION } from "./version.js";

let DATA = null;
let state = null;                 // 遊戲 state
const view = { screen: "start", howPage: 0, diff: "normal", overlay: null, reportTab: "pnl", reportGuide: false }; // UI 視圖
const app = () => document.getElementById("app");

async function boot() {
  try {
    requestPersistentStorage(); // 請瀏覽器把存檔標為持久，降低被自動清除的機率
    DATA = await loadData();
    // 自動載入：有未結束的存檔就直接進遊戲(想重來:遊戲中「存檔並離開」→「新遊戲」)
    const saved = loadGame();
    if (saved && saved.meta.phase !== "ended") {
      state = sanitizeSave(saved, DATA); // 進版防崩潰：清掉已不存在的事件 id
      view.screen = "game";
    }
    render();
  } catch (e) {
    app().innerHTML = `<div class="screen center"><div class="card"><p class="val-bad">[X] 載入失敗：${e.message}</p>
      <p style="color:var(--ink-soft)">請以 http 伺服器開啟（file:// 無法 fetch）。</p></div></div>`;
  }
}

function render() {
  let html;
  if (view.screen === "start") html = renderStart(hasSave(), DATA, GAME_VERSION);
  else if (view.screen === "howto") html = renderHowTo(view.howPage);
  else if (view.screen === "confirmNew") html = renderConfirmNew();
  else if (view.screen === "setup") html = renderSetup();
  else if (view.screen === "ending") html = renderEnding(state, DATA);
  else html = renderGame();
  app().innerHTML = html;
  // 畫面轉場淡入：僅在「畫面/月份/階段」改變時觸發(決策內小重繪不閃爍)
  const sig = `${view.screen}|${state?.meta.phase ?? ""}|${state?.meta.month ?? ""}`;
  if (sig !== lastViewSig) {
    lastViewSig = sig;
    const root = app().firstElementChild;
    if (root) { root.classList.remove("view-enter"); void root.offsetWidth; root.classList.add("view-enter"); }
  }
}
let lastViewSig = null;

// 遊戲主畫面：HUD +（事件對話框 或 月結算摘要）+ 操作列
function renderGame() {
  const inSettle = state.meta.phase === "settled";
  let body;
  if (inSettle) {
    // 月結算畫面帶辦公室場景(每月必看，人物固定曝光)
    body = renderOffice(state) + renderSettlement(state);
  } else if (state.events.current) {
    // 事件對話框疊在淡化的辦公室背景上
    body = `<div class="dialog-stage">${officeBackdrop(state)}<div class="dialog-fg">${renderDecisionResult(state) + renderDialog(state, DATA)}</div></div>`;
  } else {
    body = renderOffice(state) + `<div class="card month-clear"><p>本月事件都處理完了。準備好就結算本月。</p></div>`;
  }
  const actions = inSettle
    ? `<button class="btn btn-primary" data-act="ack">進入下一個月</button>`
    : (state.events.current
        ? ""
        : `<button class="btn btn-primary" data-act="end-month">結束本月・進行結算</button>`);
  const newsCount = (state.news || []).length;
  let overlay = "";
  if (view.overlay === "reports") overlay = renderReports(state, DATA, view.reportTab, view.reportGuide);
  else if (view.overlay === "news") overlay = renderNews(state);
  return `
    ${renderHud(state, DATA)}
    <div class="tool-bar">
      <button class="btn btn-tool" data-act="open-reports">報表中心</button>
      <button class="btn btn-tool" data-act="open-news">新聞情報${newsCount ? `<span class="badge">${newsCount}</span>` : ""}</button>
    </div>
    <div class="game-body">${body}</div>
    <div class="action-bar">
      ${actions}
      <button class="btn btn-ghost" data-act="export">匯出存檔</button>
      <button class="btn btn-ghost" data-act="save-quit">存檔並離開</button>
    </div>
    ${overlay}`;
}

// ---- 事件委派 ----
document.addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-act], [data-opt], [data-diff], [data-rtab], [data-open-rtab]");
  if (!btn) return;
  if (btn.dataset.openRtab !== undefined) { view.overlay = "reports"; view.reportTab = btn.dataset.openRtab; return render(); }
  if (btn.dataset.opt !== undefined) return onDecide(parseInt(btn.dataset.opt, 10));
  if (btn.dataset.diff !== undefined) return onPickDiff(btn.dataset.diff);
  if (btn.dataset.rtab !== undefined) { view.reportTab = btn.dataset.rtab; return render(); }
  onAction(btn.dataset.act);
});

function onAction(act) {
  switch (act) {
    case "new": view.screen = hasSave() ? "confirmNew" : "setup"; return render();
    case "confirm-new": view.screen = "setup"; return render();
    case "how": view.howPage = 0; view.screen = "howto"; return render();
    case "how-next": view.howPage = Math.min(HOW_PAGE_COUNT - 1, view.howPage + 1); return render();
    case "how-prev": view.howPage = Math.max(0, view.howPage - 1); return render();
    case "how-done": view.screen = "setup"; return render();
    case "back": case "to-start": view.screen = "start"; return render();
    case "continue": {
      const s = loadGame();
      if (!s) return alert("找不到存檔");
      state = sanitizeSave(s, DATA); view.screen = "game"; return render();
    }
    case "start-game": return onStartGame();
    case "import": return onImport();
    case "ack": return step({ type: "ACK" });
    case "end-month": return step({ type: "END_MONTH" });
    case "save-quit": saveGame(state); view.screen = "start"; return render();
    case "export": return exportSave(state);
    case "open-reports": view.overlay = "reports"; return render();
    case "open-news": view.overlay = "news"; return render();
    case "close-overlay": view.overlay = null; return render();
    case "toggle-guide": view.reportGuide = !view.reportGuide; return render();
  }
}

function onPickDiff(d) {
  view.diff = d;
  document.querySelectorAll(".diff-btn").forEach((b) => b.classList.toggle("on", b.dataset.diff === d));
}

function onStartGame() {
  const player = (document.getElementById("in-player").value || "李承翰").trim();
  const company = (document.getElementById("in-company").value || "大山精工").trim();
  const seed = `${company}-${player}-${Date.now()}`;
  state = newGame(DATA, { playerName: player, companyName: company, difficulty: view.diff, seed });
  saveGame(state);
  view.screen = "game";
  render();
}

function onDecide(optionIndex) {
  step({ type: "DECIDE", optionIndex });
}

// 執行一個 action：呼叫引擎、存檔、若結束轉結局畫面、重繪
function step(action) {
  try {
    state = reduce(state, action, DATA);
  } catch (e) {
    console.error(e);
    return alert(e.message);
  }
  view.overlay = null;
  if (state.meta.phase === "ended") {
    clearSave();
    view.screen = "ending";
  } else {
    saveGame(state);
  }
  render();
}

function onImport() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = async () => {
    if (!input.files[0]) return;
    try {
      state = sanitizeSave(await importSave(input.files[0]), DATA);
      saveGame(state);
      view.screen = state.meta.phase === "ended" ? "ending" : "game";
      render();
    } catch (e) {
      alert("匯入失敗：" + e.message);
    }
  };
  input.click();
}

// 註冊 Service Worker(離線可玩)＋進版更新提示；失敗不影響遊戲
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      // 偵測到新版 SW 安裝完成(且非首次安裝) → 顯示更新橫幅
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) showUpdateBanner(reg);
        });
      });
      // 僅在「使用者按了更新」後、新 SW 接管時才重整(首次安裝的 claim 不重整)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (window.__ceoUpdating) location.reload();
      });
    } catch (e) {
      console.warn("SW 註冊失敗:", e.message);
    }
  });
}

function showUpdateBanner(reg) {
  if (document.querySelector(".update-bar")) return;
  const bar = document.createElement("div");
  bar.className = "update-bar";
  bar.innerHTML = `<span>遊戲已有新版本</span><button class="btn btn-primary" data-update="1">重新整理更新</button>`;
  document.body.appendChild(bar);
  bar.querySelector("[data-update]").addEventListener("click", () => {
    window.__ceoUpdating = true;
    if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
    else location.reload();
  });
}

boot();
