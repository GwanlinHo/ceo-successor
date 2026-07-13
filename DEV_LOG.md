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

---

[2026-07-13] [M3] 完成事件系統，28 項測試全過，行為模擬驗證因果鏈成立。
工作內容：
- js/engine/effects.js：效果函式自 engine.js 獨立(避免循環相依)；新增 scaleBadEffect(隨機惡果依難度 negativeEffectMul 放大，僅套用於 random 分支，玩家主動選擇的代價不放大)。
- js/engine/events.js：drawMonthlyEvents(難度×tier 件數矩陣、輪替保底=3個月未登場單位優先且亂數洗牌、危機權重×難度、冷卻/once/條件過濾、庫存不足自動縮水)＋applyDecision(立即效果 vs 佇列、隨機分支單擲累積機率、setFlag、followUp 插隊列首可跨 tier 強制、歷史紀錄、lastDecision 供 UI)。
- engine.js 接線 DECIDE/ACK 抽事件；END_MONTH 擋未決策完。
決策與理由(過程中修的三個系統 bug)：
1. aux.utilization 原為靜態值→P-03(唯一擴產事件)觸發條件永不成立→產能死鎖。改為每月結算導出值(salesValue/capacityValue)。
2. M-01 促銷把 aux.marketing(月支出水位)永久疊加→20次後月燒1200萬必死。改為 +N 後 delayMonths 2 自動 -N。
3. S-01 質詢改為僅 kpi.profit<0 時觸發；獲利季度改由結算的季度自動評價(±quarterlyShareholderSwing=5)處理——原本股東信心無回升管道，任何玩法都陰跌至撤換。
- 其他：P-03 適用 tier 擴為[1,2,3](中大型原本無擴產手段)；P-01/M-01 冷卻 2→1；validator 條件變數允許 kpi.profit/revenue(效果仍禁止)。
驗收：28/28；行為模擬三組對照(亂玩必敗/爛策略必虧/避雷策略可上市)。
[!] M8 待辦：難度分化、聰明策略勝率、事件庫量能(見 TEST_LOG)。
下一步：M4 可玩雛形(main.js 路由、hud、事件對話框、開局設定；純文字版可完整玩60個月)。

---

[2026-07-13] [設計] 難度分化解法定案，記錄於 docs/DIFFICULTY_DESIGN.md(使用者已核准)。
決策與理由：
- 成因五項：事件多=送機會、難度桿力道弱、經濟基本面無難度差、金額不隨規模縮放、計分無難度係數。
- 六支桿：D 金額×tier係數(1/4/15,優先,M7前必落地)、A 事件配比typeWeightMul(困難機會0.7/危機1.6)、B 經濟係數(需求/管理費/利率)、C 對手反擊(市占愈高侵蝕愈兇)、E 計分難度係數(0.85/1.0/1.2)、F+G 內容配套(併M7/M5規格)。
- 不採用：砍困難事件數(牴觸每4分鐘一決策的核心需求)、主動選擇代價放大(破壞因果可預期性)。
- A/B/C/E 集中於 M8 一次實作+100局×3策略×3難度模擬調參(分開調互相干擾)；M8 驗收標準已量化並更新至 DEV_PLAN。
下一步：M4 可玩雛形(不變)。

---

[2026-07-13] [M4] 完成可玩雛形，E2E 完整一局通過。含順手落地桿 D。
工作內容：
- 桿 D 金額縮放：effects.js 重構為 resolve(rng+難度惡果+金額×tier係數，一次)→apply(確定性)兩階段；佇列存已解析效果，applyDueEffects 不再重抽/重縮放。balance.json 加 moneyScaleByTier{1,4,15}；事件 JSON 金額一律 tier1 尺度。
- save.js：localStorage 單槽自動存讀(rngState 整數，讀檔亂數無縫續走)+匯出/匯入 JSON+版本檢查。
- UI 層：ui/labels.js(中文標籤+萬/億格式化)、ui/hud.js(頂部KPI列+月結算摘要)、ui/dialog.js(事件對話框，簡單難度顯示效果數字)、ui/screens.js(開始/5頁說明/開局設定/結局+大事記)。
- main.js：控制器(phase→畫面路由、事件委派、每步存檔、結束轉結局清存檔)。
- css：M4 全畫面樣式(sticky HUD、選項卡、帳表、結局)；index.html 移除 manifest 連結(M9 再加)避免 404。
決策與理由：
- effects 兩階段化是桿D的必要重構：原本 applyEffectNow 同時服務「立即套用」與「佇列出列」，金額縮放只能發生一次，故把 resolve/apply 拆開，佇列存解析後結果。順帶更嚴謹(區間亂數不會因多月持續而重抽)。
- 開局預設玩家「李承翰」公司「大山精工」可改；難度預設普通。
驗收：單元 29/29(含桿D)；E2E puppeteer 11/11(完整一局+存讀檔+結局+零JS錯誤)；三張截圖確認色盤與版面。
下一步：M5 報表中心六分頁(SVG趨勢圖)+新聞/小道消息系統(接 rumorTruthRate)。

---

[2026-07-13] [M5] 完成報表中心與新聞系統，34單元+14 E2E 全過。
工作內容：
- 引擎：economy 每月結算推 metrics 快照(最近24月，供趨勢圖)；新增 engine/news.js(每月2~4條，industry恆真並排真實延遲效果、rumor依rumorTruthRate決定真偽真才發效果、company純敘述)；engine newGame/ACK 呼叫 generateNews；state 加 metrics/news/newsSeen。
- UI：ui/charts.js(純SVG折線圖+0~100量表,含零軸虛線)、ui/reports.js(六分頁:損益/資產負債/現金流/部門儀表板/市場/外部關係,唯讀overlay)、ui/news.js(新聞面板三類分色)；main.js 加 overlay 狀態與工具列(報表中心/新聞情報,新聞數badge)。
- css：overlay抽屜、報表分頁、SVG圖表、量表、新聞樣式。
決策與理由：
- 新聞有實質效果才有玩法價值：industry/真rumor 透過 queueEffect 排延遲效果(景氣/原料/對手/通路/稽查)，玩家可據以提前避險；假rumor無效果(跟了就白花錢)。真偽在當下不揭示。
- metrics 與 news 進 state → 存檔涵蓋、讀檔後趨勢圖與新聞一致；含新聞的完整流程仍通過同種子重播測試。
- 三項舊隔離測試因新聞排程效果佔據 s.effects[0] 而失敗，改為測試前清空 s.effects(隔離效果機制本身)。
驗收：單元34/34、E2E puppeteer 14/14、5張截圖(報表趨勢圖/六分頁/新聞分色)確認。
下一步：M6 美術與畫面(sprites.js NPC/物件SVG、office.js三tier場景、開始/說明/月結算/升級/結局的視覺強化)。

---

[2026-07-13] [M6] 完成美術與場景，15 E2E 全過，截圖確認風格。
工作內容：
- sprites.js(Sonnet sub-agent 產出，48.8k tokens)：11 NPC 2頭身Q版SVG(共用骨架,靠配件/髮型/服裝深淺區分:研發眼鏡/生產安全帽/業務領帶/人事包頭/財務背心/董事長拐杖/銀行公事包/供應商搬箱/客戶平板/政府識別證/記者相機)+6物件(desk/monitor/plant/cabinet/printer/cup);viewBox統一0 0 100 200。
- office.js(主線)：三tier辦公室俯視場景(floor色與角落家具依規模變化)、五內部部門NPC站位、npcAvatar 給對話框。
- 整合(主線)：dialog.js 對話框加NPC頭像版位；main.js 主畫面(事件清空時)顯示辦公室場景；hud.js 月結算加升級/降級/上市/紓困重大變動橫幅(從log抓,分up/down/warn配色+淡入動畫);M6 CSS。
決策與理由：
- API契約在派工prompt先定死(npcSprite/objectSprite/NPC_IDS + viewBox),主線同時獨立寫office.js與整合,agent回來即接上,零返工。
- sub-agent 這次順利完成(前兩次因session額度中斷);素材經風格稽核(無emoji/低彩度/API)才整合。
- 修一個整合bug:sprites.js 檔尾有 `if(import.meta.url===file://${process.argv[1]})` 自我檢查,瀏覽器無 process 致整個模組載入崩潰(開始畫面空白)。移除該區塊(node驗證改由外部測試腳本做)。
驗收：單元34/34不受影響、E2E 15/15(新增頭像檢查)、風格稽核通過、3張截圖(對話框頭像/辦公室五部門場景)。
[!] 小瑕疵:office 部分站位標籤偏移/重疊,列入M9收尾微調。
下一步：M7 事件庫量產(擴至140~170件,tier2/3加重,金額tier1尺度,含桿F內容配套:tier3危機≥40%、擱置接惡化鏈)。

---

[2026-07-13] [M7] 事件庫 22→160件,含引擎新功能,揭露平衡退化(轉M8)。
工作內容:
- 量產:6波分批,每波2個Haiku agent各寫獨立批次檔(避免寫入衝突)→ tools/merge-batch.mjs 驗證(schema/簡體/精確數字/id唯一/followUp存在)→主線抽查→合併。11部門各+9~12件。連鎖劇情L(16件)由主線親撰:上市審查4段/勞資風暴3段/技術外流2段/家族內鬥3段/金融風暴2段/殺手級新產品2段。
- 引擎新功能(為劇情跨月與上市機制):
  1. followUpDelay:選項可延月觸發後續(state.events.pending佇列,drawMonthlyEvents到期強制插入),劇情跨月展開;既有立即鏈不受影響(delay預設0)。
  2. random分支setFlag:分支層級旗標(如上市打點成功才設ipoApproved)。
  3. 上市審查閘門:rules.js tier2→3 需 flags.ipoApproved(由IPO劇情設定);財務達標未過審會log提示。
決策與理由:
- 連鎖劇情主線親撰而非派agent:牽涉followUp跨階段wiring與ipoApproved機制,正確性敏感。
- Haiku量產+validator把關+主線抽查的流水線有效:一個agent(channel)產出JSON語法錯,自我驗證階段自行修好才回報。
驗收:validate 0錯;單元37/37(含3新機制);E2E 15/15;30局冒煙0崩潰;每月事件5.2(vs前2.5)。
[X][!] **揭露平衡退化**:事件變多但經濟常數未跟上,naive bot存活中位數18~26月、0達tier2。非死鎖(市占可回升),是調參問題。已詳記 DIFFICULTY_DESIGN 5.5 列M8第一優先。桿F tier3危機32%<40%亦列M8。
下一步:M8 平衡調參(實作桿A/B/C/E + 修M7平衡退化 + 1000局模擬,這是最需要模擬迭代的一關)。
