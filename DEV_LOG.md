# DEV LOG：企業接班人養成術

格式：[日期] [里程碑] 工作內容摘要 / 決策與理由 / 下一步

---

[2026-07-13] [規劃] 完成遊戲企劃書（使用者已同意）、技術架構文件、開發計畫 M0~M10。
決策與理由：
- 技術棧採 monopoly 式純原生 JS + 純函式引擎 + 種子化亂數（利於確定性測試與 1000 局平衡模擬），資料外部化採 noir 式 JSON + CI 驗證工具。
- 使用者追加需求：每月事件數隨難度與規模遞增（簡單 tier1 為 3~5，困難 tier3 為 14~16、中心值 15，模擬每 4 分鐘一次決策 / 真實總經理每週 3~4 項重要決策的壓力），已寫入 GAME_DESIGN.md 4.2 與 difficulty.json 規格。
- 因應高事件數：事件庫目標由 110~130 上調至 140~170 件（tier 2/3 加重），schema 增加 trigger.cooldown 冷卻與 delta 區間隨機化（防重複感），已同步 ARCHITECTURE.md 3.3 與 DEV_PLAN M7。
- Pi 4 限制：sub-agent 同時上限 2；文案量產用 Haiku、UI/素材用 Sonnet、引擎與審查由主線負責。
下一步：待使用者確認程式規劃後執行 M0（專案骨架）。

---

[2026-07-13] [M0+M1] 完成專案骨架與資料初版。
工作內容：
- M0：js/engine/rng.js（mulberry32 種子亂數，狀態單一整數可 O(1) 存讀檔）、js/data-loader.js、tools/validate-data.mjs（schema/範圍/枚舉/事件鏈/簡體字檢查）、index.html、css/style.css（黑白灰米黃色盤）、js/main.js 骨架版。
- M1：data/ 五檔——balance.json（三 tier 常數+升降級門檻+計分）、difficulty.json（含每月事件數矩陣）、npcs.json（11 位 NPC）、news.json（7 條種子模板）、events.json（22 件種子事件，涵蓋 11 個部門/單位）。
決策與理由：
- 原派給 sub-agent 的 events.json 因帳號 session 額度上限中斷（1:40pm 重置），改由主線親自撰寫，避免再開 agent 消耗共用額度。
- 環境坑：node 不在非互動 shell 的 PATH，實際在 nvm v22.17.0（~/.config/nvm/versions/node/v22.17.0/bin），已記於 PROJECT_STATUS。
- events schema 落地決定：禁對 kpi.revenue/profit 直接下效果（結算導出值），設計中「營收+X%」改映射到 kpi.share / aux.price 等因果變數；後續事件暫以 random 延遲效果表達（事件鏈 M7 才建）。
驗收：validate-data.mjs 0 錯 0 警告（22 事件）；rng 確定性/狀態恢復/分布測試通過；python http.server 全 11 資源 HTTP 200、五 JSON 可 fetch 解析。
下一步：待使用者確認 → M2 引擎核心（state/economy/rules/engine + engine.test.js）。
