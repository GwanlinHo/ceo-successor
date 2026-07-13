# 技術架構文件：企業接班人養成術

本文件是引擎與 UI 的共同契約。所有開發（含 sub-agent）必須遵守本文件；若需變更契約，先改本文件再改程式。

## 1. 技術選型（已於企劃階段初步確認）

- 純原生 HTML / CSS / JavaScript（ES Modules），無框架、無 build 工具、無 npm 執行期依賴
- 遊戲資料外部化為 JSON（`data/*.json`），fetch 載入
- PWA：manifest + Service Worker（cache-first），完全離線可玩
- 引擎為純函式 reducer，可在 Node.js 直接執行（單元測試與 1000 局模擬不需瀏覽器）
- 種子化亂數（mulberry32），同種子同結果，支援存檔一致性與確定性測試
- 本機開發用 `python3 -m http.server` 起靜態伺服器（fetch JSON 需要 http，file:// 不行）

## 2. 目錄結構

```
ceo_successor/
├── index.html               # 唯一頁面，UI 全部動態建立
├── css/style.css            # 全域樣式（黑白灰米黃色盤變數）
├── js/
│   ├── main.js              # 進入點：載入資料、畫面路由、SW 註冊
│   ├── engine/              # 純邏輯層（不得 import ui/、不得碰 DOM）
│   │   ├── rng.js           # mulberry32 種子化亂數
│   │   ├── state.js         # initState(config, seed) 初始狀態工廠
│   │   ├── economy.js       # 月結算公式（企劃第 5 節）
│   │   ├── events.js        # 事件抽取：輪替保底 + 權重 + 觸發條件；效果佇列
│   │   ├── rules.js         # 升降級 / 倒閉 / 上市 / 撤換 / 結局計分
│   │   └── engine.js        # reduce(state, action) → newState（組合以上模組）
│   ├── ui/                  # 表現層（只讀 state、只發 action）
│   │   ├── screens.js       # 開始 / 說明 / 開局設定 / 結局畫面
│   │   ├── office.js        # 主畫面辦公室場景（三個 tier 各一張）
│   │   ├── sprites.js       # 全部 SVG 素材（NPC、物件）以 template string 內嵌
│   │   ├── hud.js           # 頂部 KPI 列、月結算摘要
│   │   ├── dialog.js        # 事件對話框
│   │   ├── reports.js       # 報表中心六分頁（趨勢圖以 SVG 折線繪製）
│   │   └── news.js          # 新聞面板
│   ├── save.js              # localStorage 存讀檔、匯出 / 匯入 JSON
│   └── data-loader.js       # fetch data/*.json + 執行期 schema 檢查
├── data/
│   ├── balance.json         # 經濟常數（三個 tier 常數組）、升降級門檻
│   ├── difficulty.json      # 簡單 / 普通 / 困難 倍率覆蓋 + 每月事件數矩陣（難度 × tier）
│   ├── events.json          # 事件庫（決策樹本體）
│   ├── npcs.json            # NPC 名單與頭像 id
│   └── news.json            # 新聞 / 小道消息模板
├── tests/
│   ├── engine.test.js       # 引擎單元測試（node tests/engine.test.js）
│   └── simulate.js          # 1000 局隨機策略平衡模擬（node tests/simulate.js）
├── tools/
│   └── validate-data.mjs    # 資料驗證：schema、數值範圍、事件鏈 id 存在性、繁中檢查
├── docs/                    # GAME_DESIGN.md / ARCHITECTURE.md / DEV_PLAN.md
├── manifest.webmanifest
├── sw.js
├── PROJECT_STATUS.md        # 目前階段 / 已完成 / 下一步（每次 session 更新）
├── DEV_LOG.md               # 開發日誌
└── TEST_LOG.md              # 測試日誌
```

## 3. 引擎與 UI 契約

### 3.1 單一狀態樹

整局遊戲 = 一個可 JSON 序列化的 state 物件。存檔即 `JSON.stringify(state)`。

```js
state = {
  meta:    { version, seed, rngState, difficulty, playerName, companyName,
             month,            // 1..60
             phase },          // 'briefing' | 'events' | 'settled' | 'ended'
  tier:    1,                  // 1 小型 / 2 中型 / 3 大型上市
  kpi:     { cash, equity, revenue, profit, headcount, product, morale,      // 內部 7
             share, brand, satisfaction, credit, shareholder, compliance },  // 外部 6
  aux:     { capacity, utilization, yieldRate, price, materialRate,
             turnover, supplierRel, channelRel, debt, interest,
             salaryAvg, marketing, rnd },
  world:   { economyIndex, rivalProduct, rivalErosion },
  streaks: { profitMonths, lossMonths, upgradeHold, downgradeHold },
  events:  { queue: [eventId...],        // 本月待處理事件
             current: eventId | null,
             history: [{month, eventId, optionIndex}...],
             onceFired: [eventId...],
             chains: {chainId: stage} },
  effects: [ {dueMonth, var, delta, note} ... ],   // 延遲效果佇列
  news:    [ {month, type, text, truth} ... ],
  flags:   {},                 // 事件旗標（如 exclusiveDeal、pollutionRisk）
  log:     [ {month, text} ... ]   // 大事記（結局回顧用）
}
```

### 3.2 Action 介面（UI → 引擎的唯一通道）

```js
Engine.reduce(state, action, data) → newState    // 純函式，不修改原 state
```

| action.type | payload | 說明 |
|-------------|---------|------|
| NEW_GAME | { playerName, companyName, difficulty, seed } | 建立初始 state 並抽第 1 月事件 |
| DECIDE | { optionIndex } | 對 events.current 做決策，套用立即效果、排入延遲效果，推進下一事件 |
| END_MONTH | — | 月結算：economy → effects 到期生效 → rules 升降級檢查 → 抽下月事件與新聞 |
| ACK | — | 確認月結算 / 升級畫面，進入下月 briefing |

規則：
- UI 絕不直接改 state；引擎絕不碰 DOM。
- 亂數只能來自 state 內建的 rng（`meta.seed` + `meta.rngCount` 前進），任何模組不得用 `Math.random()`。
- 引擎丟出的錯誤一律為資料問題（事件 id 不存在等），由 validate-data.mjs 在開發期攔截。

### 3.3 資料 schema 要點（完整定義見 tools/validate-data.mjs 註解）

事件（events.json，企劃 4.1 節 schema 落地）：

```json
{ "id": "R-01", "dept": "rnd", "tier": [1], "type": "opportunity",
  "trigger": { "weight": 10, "once": false, "cooldown": 6,
               "conditions": [{ "var": "kpi.product", "op": "<", "value": 70 }] },
  "title": "...", "text": "...", "speaker": "shen",
  "options": [
    { "label": "...", "hint": "花錢、長期見效",
      "effects": [{ "var": "kpi.cash", "delta": -1000000, "delayMonths": 0 }],
      "random":  [{ "chance": 0.3, "effects": [...], "resultText": "..." }],
      "followUp": null, "setFlag": null }
  ]
}
```

- `hint` 為選項的方向提示；簡單難度額外顯示精確數字（由 difficulty.json 的 `showNumbers` 控制）。
- 連鎖劇情：`followUp` 指向下一事件 id，或以 `chains` 狀態 + trigger conditions 實作跨月階段。
- 防重複機制（支撐高難度高規模的每月 14~16 件）：`trigger.cooldown` 為重抽冷卻月數（例行類可設 0~2，機會 / 危機類設 6+）；`effects[].delta` 允許 `[min, max]` 區間寫法，抽取時以 state 的 rng 隨機取值（參數隨機化），事件文案以模板變數呈現實際數字。

## 4. 畫面路由

`main.js` 依 `state.meta.phase` 與 UI 區域狀態切換八個畫面（企劃 6.1 節）。報表中心與新聞面板為主畫面上的抽屜（overlay），開啟不影響遊戲狀態。

## 5. 存檔

- 鍵名 `ceo_successor_save_v1`；每次 DECIDE 與 END_MONTH 後即寫入（同步、資料量小免 debounce）。
- 匯出：下載 `state` JSON 檔；匯入：讀檔 + version 檢查 + validate 後覆蓋。
- 讀檔後以存檔內的 rngState（mulberry32 內部狀態，單一整數）直接續走亂數流，O(1) 恢復，保證與中斷前一致。

## 6. 測試策略

| 層級 | 工具 | 內容 |
|------|------|------|
| 資料驗證 | tools/validate-data.mjs | schema、範圍、事件鏈 id、每 tier 事件數下限、簡體字檢查 |
| 單元測試 | tests/engine.test.js（Node，零依賴） | 結算公式、事件抽取輪替保底、延遲效果、升降級 / 倒閉 / 上市、計分、同種子重播一致 |
| 平衡模擬 | tests/simulate.js | 1000 局 × 3 難度隨機策略：倒閉率、平均達成 tier、分數分布，輸出報告進 TEST_LOG.md |
| 端到端 | puppeteer-core（既有環境） | 完整一局：開局→決策→存檔→重載→讀檔→結局；離線（SW）冒煙測試 |

驗收門檻（普通難度、隨機策略基準）：倒閉率 15%~40%、上市率 ≤ 10%（隨機亂玩不該輕易上市）、無 NaN / 數值爆炸。實際門檻於 M7 調參時定案並記錄。
