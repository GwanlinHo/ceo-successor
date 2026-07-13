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

---

[2026-07-13] [M2] 完成引擎核心，18 項單元測試全過。
工作內容：
- js/engine/state.js：initState 工廠 + getVar/setVar(含全變數 clamp 表，引擎唯一數值出口)。
- js/engine/economy.js：月結算(營收=min(需求×市占,產能鏈)×單價；成本=原料+人事+行銷+研發+管理+利息；稅後損益入現金/淨值)+漂移(研發累積競爭力、對手成長、市占拉鋸、員工數向營收/人均產值靠攏、景氣隨機漫步、均值回歸)。
- js/engine/rules.js：倒閉(先嘗試銀行紓困:信用>=30且額度內自動借款)、撤換(股東信心<=0)、升降級(門檻×難度倍率+holdMonths)、期滿、computeScore(規模+財務+品質+成就四塊，倒閉0分敗家子)。
- js/engine/engine.js：reduce 純函式(END_MONTH/ACK；DECIDE 留 M3)+效果佇列(queueEffect/applyDueEffects，支援 delay/months 持續/mul/pctOf/區間 delta)。
決策與理由：
- 股東信心自 regressTargets 移除：否則歸零撤換條件永不成立；信心只由事件與業績驅動。
- capacityUnitValue 12000→1200(尺度修正)；tiers 加 revenuePerEmployee(員工數隨營收自然靠攏，升級門檻的員工數項因此與營收成長耦合，不需獨立招募微管理)。
- upgradeTo3 的 requireIpoChain 種子版直接視為通過(TODO M7 改由上市審查事件鏈把關)。
驗收：18/18 單元測試通過；60月放置模擬三難度走勢合理(easy平盤/normal衰退/hard近倒閉)；validate 仍 0 錯 0 警告。
下一步：M3 事件系統(抽取輪替保底+權重+條件+冷卻、DECIDE、機率結果、followUp)。
