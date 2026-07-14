# 進版發佈檢查清單

每次要發佈新版（改了任何 `js/` `css/` `data/` `index.html` 等會影響玩家端的檔案）都照這份走，避免「老玩家看不到更新」或「舊存檔崩潰/消失」。

## 一、發佈前必做

1. **[必做] 更新版本號（兩處，同號）**
   - `sw.js`：`const CACHE = "ceo-successor-vN"` 版本號 +1。不改的話，已快取玩家永遠停在舊版。
   - `js/version.js`：`GAME_VERSION` 同步 +1（顯示於首頁，玩家據此判斷有沒有拿到新版）。**不改的話，已安裝/已快取的玩家永遠停在舊版**（cache-first 會一直吃舊快取）。
   - 若新增/刪除了檔案，同步更新 `sw.js` 的 `ASSETS` 清單。

2. **[必做] 跑完整測試，全綠才發**
   ```
   export PATH="$HOME/.config/nvm/versions/node/v22.17.0/bin:$PATH"
   node tools/validate-data.mjs        # 資料驗證
   node tests/engine.test.js           # 引擎單元
   # E2E(需先起 http.server 並設 PORT)
   python3 -m http.server 8080 & 
   PORT=8080 node tests/e2e-m4.mjs
   PORT=8080 node tests/e2e-pwa.mjs
   ```

3. **[平衡有動時] 跑模擬確認難度沒跑掉**
   - 動了 `balance.json` / `difficulty.json` / 經濟公式，跑 `node tests/simulate.js 80`，確認上市率仍「簡單>普通>困難」單調（見 docs/DIFFICULTY_DESIGN.md 第 6 節基準）。

## 二、存檔相容性規則（改事件/狀態時遵守）

舊玩家的進行中存檔會用**新版程式 + 新版資料**繼續跑，所以：

1. **事件 id 只增不刪、不改名。**
   - 要淘汰某事件：把它的 `trigger.weight` 設很小或加不可能成立的 `conditions` 讓它不再被抽到，但**保留 id 與選項結構**。
   - 真的刪了也不會崩潰（`sanitizeSave` 會把存檔中不存在的 id 清掉），但玩家佇列裡那件事會憑空消失，體驗不佳。

2. **狀態欄位盡量只加不改。**
   - 新增欄位請在 `state.js` 的 `initState` 給預設值；舊存檔缺這個欄位時，讀進來會是 `undefined`，程式要能容忍（或在 `sanitizeSave` 補預設）。
   - **不要**改既有欄位的型別或語意。

3. **真的必須破壞結構時，才 bump `STATE_VERSION`（state.js）。**
   - bump 後，`loadGame` 會判定舊存檔版本不符並忽略 → 玩家進行中的那局會消失。
   - 這種情況請「寫存檔轉換（migration）」把舊格式升級到新格式，而不是無聲丟棄；或至少在 UI 告知玩家「因遊戲大改版，舊存檔無法沿用」。

## 三、發佈與驗證

1. `git add -A && git commit`（訊息含版本重點），推 `git push origin main`（推前確認無未追蹤檔案）。
2. 等 GitHub Pages 建置完成（`built`）。
3. 開線上網址確認：新版載入正常；已開過的裝置上，應會跳「遊戲已有新版本，重新整理更新」橫幅，點一下即更新。

## 版本歷程

- v1（2026-07-13）首發：M0~M10 完成上線。
- v2（2026-07-13）：新遊戲覆蓋確認、自動載入、持久化、進版安全機制（存檔防崩潰＋SW 更新提示）。
- v3（2026-07-14）：事件動畫（對話框進場/頭像彈入/選項逐一浮現）、決策參考導引（事件內建相關報表與新聞捷徑）、全面趨勢化（HUD 漲跌指示、結算與上月比較、部門/關係/市場/資產負債補趨勢折線圖；metrics 快照擴充 shareholder/credit/compliance/debt，舊存檔相容）。
- v4（2026-07-14）：NPC 改半身像(特徵更醒目)並加大；首頁全員陣容＋版本號顯示；辦公室場景進月結算畫面、事件對話框疊淡化辦公室背景；財報教學系統（報表中心「閱讀指引」按鈕，六分頁白話解說＋三表關係圖＋判讀要點；遊戲說明加「學會看財報」頁）。
