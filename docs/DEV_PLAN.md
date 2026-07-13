# 開發計畫：企業接班人養成術

依 GAME_DESIGN.md（企劃）與 ARCHITECTURE.md（架構）執行。每個里程碑完成即更新 PROJECT_STATUS.md 與 DEV_LOG.md，測試結果記入 TEST_LOG.md，確保中斷後可快速恢復。

## 1. 里程碑與驗收標準

| # | 里程碑 | 內容 | 驗收標準 |
|---|--------|------|----------|
| M0 | 專案骨架 | 目錄結構、index.html、css 色盤變數、rng.js、data-loader.js、validate-data.mjs、git init | validate 工具可跑；rng 同種子輸出一致（測試通過） |
| M1 | 資料初版 | balance.json（三 tier 常數）、difficulty.json（含事件數矩陣）、npcs.json、events.json 種子事件 22 件（企劃 4.3 的 19 件範例 + 3 件例行） | validate-data.mjs 全數通過 |
| M2 | 引擎核心 | state.js、economy.js、rules.js、engine.js（NEW_GAME / END_MONTH）；月結算、延遲效果、升降級 / 倒閉 / 上市 / 計分 | engine.test.js 覆蓋公式與規則，全部通過 |
| M3 | 事件系統 | events.js：輪替保底 + 權重 + 條件抽取、DECIDE、機率結果、followUp 事件鏈、危機擱置惡化 | 單元測試：保底輪替、鏈觸發、同種子重播一致 |
| M4 | 可玩雛形 | main.js 路由、hud.js、dialog.js、開局設定畫面；純文字版可完整玩 60 個月 | 瀏覽器手動走完一局；決策後存檔、重載可續玩 |
| M5 | 報表與新聞 | reports.js 六分頁（SVG 趨勢圖）、news.js（新聞 / 小道消息產生與真偽） | 報表數字與引擎 state 對帳一致；新聞真偽率符合難度設定 |
| M6 | 美術與畫面 | sprites.js（11 位 NPC + 物件 SVG）、office.js 三張 tier 場景、開始 / 說明 / 月結算 / 升級 / 結局畫面 | 全部畫面走查；色盤僅黑白灰米黃；無 emoji |
| M7 | 事件庫量產 | 事件擴充至 140~170 件（tier 2/3 加重）+ 連鎖劇情 6 條 + news.json 模板庫；例行事件參數隨機化、冷卻設定；金額一律以 tier1 尺度撰寫（依 DIFFICULTY_DESIGN 桿 D）；tier3 危機占比 ≥ 40%、危機擱置選項接惡化 followUp 鏈、上市審查鏈困難有額外階段（桿 F） | validate 通過；每 tier 每單位事件數達下限（tier 3 需足以支撐每月 14~16 件不明顯重複）；人工抽查 20% 文案 |
| M8 | 平衡調參 | 實作 DIFFICULTY_DESIGN 桿 A/B/C/E（事件配比、經濟係數、對手反擊、計分係數）；simulate.js 跑 100 局 × 3 策略 × 3 難度調參 | 依 DIFFICULTY_DESIGN 第 5 節量化標準：避雷策略上市率簡單 ≥60%／普通 30~55%／困難 10~25% 單調遞減；隨機策略失敗率 ≥80%；原始分單調；無數值爆炸；報告存 TEST_LOG.md 並回寫 DIFFICULTY_DESIGN 第 6 節 |
| M9 | PWA 與收尾 | manifest、sw.js（precache 含 data/*.json）、存檔匯出匯入、遊戲說明內容 | 離線斷網可完整遊玩；匯出檔可匯入還原 |
| M10 | 端到端測試與部署 | puppeteer-core 自動走完整局；建 GitHub repo、Pages 上線 | E2E 通過；線上網址可玩；TEST_LOG.md 完整 |

里程碑順序即依賴順序：M2 依賴 M1 的資料、M4 依賴 M2/M3、M8 依賴 M7。M5 與 M6 可並行。
[!] 桿 D（事件金額隨規模縮放，見 docs/DIFFICULTY_DESIGN.md）須於 M7 之前落地——併入 M4~M6 任一 session 順手實作。

## 2. 開發進程（預估）

以「一個開發 session ≈ 一次連續工作」計：M0+M1 一個 session；M2、M3 各一個；M4 一個；M5、M6 各一到兩個；M7 一到兩個（量產 + 校對）；M8 一個（模擬跑批於背景低優先執行）；M9+M10 一個。**共約 9~12 個 session**。中斷恢復依 PROJECT_STATUS.md 的「下一步」欄位接續。

## 3. 開發資源分配（Raspberry Pi 4 限制）

**硬性上限：同時執行的 sub-agent 不超過 2 個**；跑 1000 局模擬或 puppeteer 時不併發其他重型工作（沿用既有 heavy_lock 精神）。

| 工作 | 執行者 | 模型 | 理由 |
|------|--------|------|------|
| 架構、引擎（M2/M3）、契約維護、整合、程式審查 | 主線（本體） | 主線模型 | 邏輯核心，錯誤成本最高 |
| UI 元件、報表繪製（M4/M5） | sub-agent × 1 | Sonnet | 模式明確、有契約可依循 |
| SVG 素材、場景（M6） | sub-agent × 1 | Sonnet | 產出量大但規格明確 |
| 事件文案量產（M7，分批每批 10~15 件） | sub-agent × 1~2 | Haiku | 依 schema 範本量產，validate 工具把關 |
| 測試腳本撰寫 | sub-agent × 1 | Sonnet | 依測試策略文件撰寫 |
| 平衡模擬、資料驗證執行 | 主線（Bash） | 不耗模型 | Node 腳本 |

原則：高階模型額度只花在主線的設計與審查；所有 sub-agent 產出一律經 validate 工具 + 主線審查後才合入。

## 4. 紀錄規範

- `PROJECT_STATUS.md`：目前里程碑、已完成清單、下一步（每次 session 結束必更新）
- `DEV_LOG.md`：格式 `[日期] [里程碑] 工作內容摘要 / 決策與理由 / 下一步`（沿用 monopoly WORKLOG 格式）
- `TEST_LOG.md`：格式 `[日期] [測試類型] 範圍 / 結果 [O]/[X] / 問題與處置`
- git：每個里程碑至少一個 commit；push 前確認無未追蹤檔案並經使用者同意

## 5. 風險與對策

| 風險 | 對策 |
|------|------|
| 事件量產文案品質不齊 | schema 驗證 + 每批人工抽查；範例事件作為 few-shot 範本 |
| 數值平衡失控（太easy或必倒） | M8 以模擬驅動調參，門檻常數全在 JSON，不改程式 |
| Pi 4 資源耗盡 | sub-agent ≤ 2、重型工作序列化、模擬分批跑 |
| 開發中斷 | 三份紀錄檔 + git commit 粒度小，任何 session 可從 PROJECT_STATUS.md 恢復 |
