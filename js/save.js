// 存檔：localStorage 自動存讀 + 匯出/匯入 JSON。單一存檔槽。
// state 本身可 JSON 序列化(含 rngState 整數)，讀檔後亂數流無縫續走。

import { STATE_VERSION } from "./engine/state.js";

const KEY = "ceo_successor_save_v1";

export function saveGame(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn("存檔失敗:", e.message);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s?.meta?.version !== STATE_VERSION) {
      console.warn(`存檔版本不符(${s?.meta?.version} vs ${STATE_VERSION})，忽略。`);
      return null;
    }
    return s;
  } catch (e) {
    console.warn("讀檔失敗:", e.message);
    return null;
  }
}

export function hasSave() {
  return !!localStorage.getItem(KEY);
}

export function clearSave() {
  localStorage.removeItem(KEY);
}

// 匯出：觸發下載
export function exportSave(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = `${state.companyName}_月${state.meta.month}`;
  a.href = url;
  a.download = `ceo存檔_${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 匯入：讀檔並驗證版本，回傳 state 或 throw
export function importSave(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const s = JSON.parse(reader.result);
        if (s?.meta?.version !== STATE_VERSION) throw new Error("存檔版本不符或格式錯誤");
        resolve(s);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("讀取檔案失敗"));
    reader.readAsText(file);
  });
}
