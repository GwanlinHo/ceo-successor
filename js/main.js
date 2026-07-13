// 控制器：載入資料、畫面路由、事件委派、呼叫引擎、自動存檔。

import { loadData } from "./data-loader.js";
import { newGame, reduce } from "./engine/engine.js";
import { saveGame, loadGame, hasSave, clearSave, exportSave, importSave } from "./save.js";
import { renderHud, renderSettlement } from "./ui/hud.js";
import { renderDialog, renderDecisionResult } from "./ui/dialog.js";
import { renderStart, renderHowTo, renderSetup, renderEnding, HOW_PAGE_COUNT } from "./ui/screens.js";

let DATA = null;
let state = null;                 // 遊戲 state
const view = { screen: "start", howPage: 0, diff: "normal" }; // UI 視圖
const app = () => document.getElementById("app");

async function boot() {
  try {
    DATA = await loadData();
    render();
  } catch (e) {
    app().innerHTML = `<div class="screen center"><div class="card"><p class="val-bad">[X] 載入失敗：${e.message}</p>
      <p style="color:var(--ink-soft)">請以 http 伺服器開啟（file:// 無法 fetch）。</p></div></div>`;
  }
}

function render() {
  let html;
  if (view.screen === "start") html = renderStart(hasSave());
  else if (view.screen === "howto") html = renderHowTo(view.howPage);
  else if (view.screen === "setup") html = renderSetup();
  else if (view.screen === "ending") html = renderEnding(state, DATA);
  else html = renderGame();
  app().innerHTML = html;
}

// 遊戲主畫面：HUD +（事件對話框 或 月結算摘要）+ 操作列
function renderGame() {
  const inSettle = state.meta.phase === "settled";
  let body;
  if (inSettle) {
    body = renderSettlement(state);
  } else if (state.events.current) {
    body = renderDecisionResult(state) + renderDialog(state, DATA);
  } else {
    body = `<div class="card month-clear"><p>本月事件都處理完了。準備好就結算本月。</p></div>`;
  }
  const actions = inSettle
    ? `<button class="btn btn-primary" data-act="ack">進入下一個月</button>`
    : (state.events.current
        ? ""
        : `<button class="btn btn-primary" data-act="end-month">結束本月・進行結算</button>`);
  return `
    ${renderHud(state, DATA)}
    <div class="game-body">${body}</div>
    <div class="action-bar">
      ${actions}
      <button class="btn btn-ghost" data-act="export">匯出存檔</button>
      <button class="btn btn-ghost" data-act="save-quit">存檔並離開</button>
    </div>`;
}

// ---- 事件委派 ----
document.addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-act], [data-opt], [data-diff]");
  if (!btn) return;
  if (btn.dataset.opt !== undefined) return onDecide(parseInt(btn.dataset.opt, 10));
  if (btn.dataset.diff !== undefined) return onPickDiff(btn.dataset.diff);
  onAction(btn.dataset.act);
});

function onAction(act) {
  switch (act) {
    case "new": view.screen = "setup"; return render();
    case "how": view.howPage = 0; view.screen = "howto"; return render();
    case "how-next": view.howPage = Math.min(HOW_PAGE_COUNT - 1, view.howPage + 1); return render();
    case "how-prev": view.howPage = Math.max(0, view.howPage - 1); return render();
    case "how-done": view.screen = "setup"; return render();
    case "back": case "to-start": view.screen = "start"; return render();
    case "continue": {
      const s = loadGame();
      if (!s) return alert("找不到存檔");
      state = s; view.screen = "game"; return render();
    }
    case "start-game": return onStartGame();
    case "import": return onImport();
    case "ack": return step({ type: "ACK" });
    case "end-month": return step({ type: "END_MONTH" });
    case "save-quit": saveGame(state); view.screen = "start"; return render();
    case "export": return exportSave(state);
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
      state = await importSave(input.files[0]);
      saveGame(state);
      view.screen = state.meta.phase === "ended" ? "ending" : "game";
      render();
    } catch (e) {
      alert("匯入失敗：" + e.message);
    }
  };
  input.click();
}

boot();
