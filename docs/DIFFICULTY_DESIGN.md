# 難度分化設計文件

狀態：已定案待實作。時程見第 4 節；實作時本文件為規格，調參結果回寫第 6 節。
背景：M3 行為模擬顯示避雷啟發式策略在三難度都幾乎 100% 上市，且困難(822)略高於簡單(805)——難度沒有形成分化。

## 1. 成因分析（M3 模擬數據，2026-07-13）

| # | 成因 | 說明 |
|---|------|------|
| 1 | 事件數量是「禮物」不是「壓力」 | 種子庫機會型占比高且可冷卻重複，對高手事件愈多複利愈快；事件數矩陣目前獎勵高手 |
| 2 | 現有難度桿力道弱 | crisisWeightMul 只改頻率；negativeEffectMul 只影響隨機分支；rivalGrowthMul 被玩家競爭力雪球抵銷；upgradeThresholdMul 只延遲幾個月 |
| 3 | 經濟基本面三難度相同 | 需求、毛利、管理費率、利率無難度差；初始現金差只影響前期 |
| 4 | 金額效果不隨規模縮放 | tier3 月營收 5000 萬時「-600 萬買設備」無關痛癢，後期決策無代價感（兼遊戲性問題） |
| 5 | 計分無難度係數 | 同表現同分，玩困難沒有回報 |

## 2. 六支桿設計（全部資料驅動，改 JSON 與少量引擎觸點）

### D. 事件金額隨規模縮放【優先——必須在 M7 量產前落地】
- `data/balance.json` 新增：`"moneyScaleByTier": { "1": 1, "2": 4, "3": 15 }`（與各 tier 營收規模同步）
- `js/engine/effects.js`：套用效果時，金額類變數（kpi.cash、kpi.equity、aux.debt、aux.marketing、aux.rnd、aux.interest）的 delta 與 pct 乘以當前 tier 係數。事件 JSON 金額一律以 tier1 尺度撰寫。
- 注意：applyEffectNow/queueEffect 都要過縮放；queueEffect 於「入佇列當下」以當時 tier 定值（跨 tier 期間的延遲效果以決策當時規模計，語意單純）。
- 連動：`tools/validate-data.mjs` 註解與 `data/events.json` _doc 更新「金額一律 tier1 尺度」；`tests/engine.test.js` 加縮放測試（tier2 時 -100 實扣 400）。
- 對應成因 4。

### A. 事件組成配比隨難度改變
- `data/difficulty.json` 各難度新增：
  ```json
  "typeWeightMul": { "routine": 1.0, "opportunity": 1.2, "crisis": 0.6 }   // easy
  "typeWeightMul": { "routine": 1.0, "opportunity": 1.0, "crisis": 1.0 }   // normal
  "typeWeightMul": { "routine": 1.0, "opportunity": 0.7, "crisis": 1.6 }   // hard
  ```
- `js/engine/events.js` weightOf()：`weight × typeWeightMul[ev.type]`（chain 視同 crisis）。原 crisisWeightMul 併入本表後自 difficulty.json 移除，避免雙重口徑。
- 效果：困難的「事件多」變成救火壓力。對應成因 1、2。

### B. 經濟基本面難度係數
- `data/difficulty.json` 各難度新增：
  ```json
  "economy": { "demandMul": 1.1, "adminRateMul": 0.9,  "interestMul": 0.8 }   // easy
  "economy": { "demandMul": 1.0, "adminRateMul": 1.0,  "interestMul": 1.0 }   // normal
  "economy": { "demandMul": 0.9, "adminRateMul": 1.15, "interestMul": 1.3 }   // hard
  ```
- `js/engine/economy.js` settleMonth()：市場需求、管理費率、月利率各乘對應係數。
- 對應成因 3。

### C. 對手反擊機制（防市占雪球）
- `data/balance.json` economy 新增 `"rivalRetaliation": 0.008`；`data/difficulty.json` 各難度新增 `"retaliationMul"`：easy 0.5 / normal 1.0 / hard 1.6。
- `js/engine/economy.js` 市占侵蝕改為：
  `erosion = tierC.rivalErosion × rivalGrowthMul + k.share × eco.rivalRetaliation × retaliationMul`
- 效果：市占愈高被圍剿愈兇，壓制衝頂躺贏。對應成因 1（雪球面）。

### E. 計分難度係數
- `data/balance.json` scoring 新增 `"difficultyMul": { "easy": 0.85, "normal": 1.0, "hard": 1.2 }`。
- `js/engine/rules.js` computeScore()：總分（倒閉除外）乘係數後再查評語表；ending 物件帶 difficultyMul 供結局畫面顯示。
- 對應成因 5。

### F+G. 內容面配套（不動引擎，寫進 M7/M5 規格）
- M7 事件量產規格：tier3 危機占比 ≥ 40%；危機「擱置」選項一律接惡化版 followUp 鏈；上市審查鏈在困難難度有額外階段與失敗分支。
- M5 新聞實作：rumorTruthRate（0.8/0.6/0.45，已存在）需接上實際代價——跟著假消息做的防禦性決策要真的虧錢（例：假漲價消息 → 簽長約 → 市價反跌仍付高價）。

## 3. 明確不採用的方案（與理由）

- 直接砍困難的事件數：與使用者「困難×大型每月約15件、每4分鐘一決策」的核心需求牴觸；壓力要來自事件內容與經濟結構，不是減少互動。
- 對玩家主動選擇的代價套 negativeEffectMul：會讓選項後果不可預期，破壞「從報表學因果」的核心樂趣；惡果放大維持只作用於隨機分支。

## 4. 實作時程

| 時機 | 項目 | 理由 |
|------|------|------|
| M7 之前（併入 M4~M6 任一 session 順手做） | D 金額縮放 | 量產文案的金額基準依賴它，晚做全部重調 |
| M7 量產規格 | F+G | 寫進量產 prompt 與驗收條件 |
| M8 平衡調參 | A、B、C、E 一次實作 | 四支桿需靠 1000 局模擬一起調，分開調互相干擾 |

## 5. M8 驗收標準（量化）

三種固定策略（隨機／全選0／避雷啟發式，策略碼已於 M3 模擬驗證過）各 100 局 × 3 難度：
- 避雷策略上市率：簡單 ≥ 60%、普通 30~55%、困難 10~25%（單調遞減）
- 隨機策略：三難度倒閉+撤換率皆 ≥ 80%，且困難存活月數中位數 < 簡單
- 同策略「未乘難度係數」原始分：簡單 > 普通 > 困難（單調）
- 無 NaN／爆表；每月實際事件數達矩陣目標 90% 以上（M7 後回驗）

## 5.5 M7 後浮現的平衡退化【M8 第一優先】

M7 把事件庫從 22 擴到 160 件後，每月實際事件數從 ~2.5 升到 ~5.2（tier1；高難度高規模更多）。經濟基礎常數是在 ~2.5 事件/月時代定的，未跟上：

- **症狀**：naive bot（全選0 / 選最省現金）中位數存活僅 18~26 月，0 局達 tier2。追蹤顯示——事件多 → 每月事件驅動的淨損疊加超過基礎獲利 → 現金/士氣/市占任一維度失守就死亡螺旋。
- **非死鎖**：市占跌到地板 0.1 後仍能靠 product 優勢+行銷回升（trace 中月9 由 0.1→4.8），故是調參而非壞機制。
- **M8 對策**（在既有 A/B/C/E 桿之外新增）：
  1. 提高基礎獲利率 or 降低事件負面效果密度，使「事件多」的淨期望不至於必死；可調 economy 常數（capacityUnitValue、adminRate、taxRate）或對事件效果總量做 per-month 上限。
  2. 考慮市占單月跌幅上限（避免一個月從 9→0.1 的雪崩），或抬高 share 地板的回復力。
  3. 每月事件數矩陣或許需微降 tier1（目前 normal tier1 = 4~6，配 160 件庫體感偏重）。
- **驗收基準改用「理性玩家」而非 naive bot**：naive bot 本就該死；M8 需寫一個會兼顧多維度的啟發式 bot 作為勝率基準，或以「存活月中位數」與「達 tier2 比例」為指標。

## 6. 調參結果（M8 完成 2026-07-13）

### 實作的桿與經濟修復
- **桿A** typeWeightMul：events.js weightOf 依難度調事件類型權重（困難 opportunity×0.7 / crisis×1.6）。
- **桿B** 經濟難度係數：economy.js 市場需求×demandMul、管理費×adminRateMul、利率×interestMul（困難 0.9/1.15/1.3）。
- **桿C** 對手反擊：economy.js 市占侵蝕加 `share×rivalRetaliation×retaliationMul`（易0.5/普1/難1.6），壓制市占雪球。
- **桿E** 計分難度係數：rules.js computeScore 總分×difficultyMul（0.85/1.0/1.2）。
- **修 5.5 平衡退化**（比桿更關鍵）：
  1. 單價/產能均值回歸（priceRevert 0.04→1.0、capacityMaintain 0.05→baseline 1.0）：終結「單價腰斬/產能歸零」的單向死亡棘輪。
  2. 股東信心錨點弱回歸（anchor 45、drift 0.6）：終結事件噪音把信心磨到撤換的螺旋；績效持續差時季度-swing 仍會壓垮，撤換仍是真實失敗。
  3. 升級產能跳升（upgradeCapacityBoost ×4）：升級後市場放大6倍，產能同步跳升才能承接，否則升級即被×N事件成本壓垮降級。
  4. moneyScaleByTier 放緩 4/15 → 3/8（升級衝擊小一點）。
  5. tier2 員工門檻 50→30（原門檻在營收800萬下不可達，營收只養得起~27人）。

### 驗收模擬（80局/組×3難度，rational bot=多維度加權近似理性玩家）
| 指標 | easy | normal | hard | 目標 | 判定 |
|------|------|--------|------|------|------|
| 上市率(ipoApproved) | 74% | 31% | 21% | ≥60 / 30~55 / 10~25 單調 | [O] |
| 達 tier3 | 48% | 19% | 1% | 單調遞減 | [O] |
| 倒閉率 | 21% | 19% | 54% | 困難最高 | [O] |
| 存活到期滿 | 79% | 81% | 46% | 困難最低 | [O] |
| raw 分數(去difficultyMul) | 541 | 355 | 148 | 易>普>難 | [O] |
| random bot 失敗率 | 100% | 100% | 100% | ≥80% | [O] |
| random 存活月中位 | 11 | 9 | 6 | 困難<簡單 | [O] |
| 每月事件數 | 達標 | 達標 | 略高(tier3 17.8) | 達矩陣90% | [O]* |

*困難 tier3 每月 17.8 略高於矩陣 14~16，因劇情鏈額外事件疊加，壓力方向正確，可接受。

### 殘留（非阻擋，可日後微調）
- normal 上市率 31% 落在 30~55 區間下緣，偏挑戰；如要更親民可微升 demandMul 或降 upgradeThresholdMul。
- 桿F tier3 危機占比 32%<40%（M7 量產未完全達標），可日後補幾則 tier3 危機。
- cautious bot（純看現金）幾乎必倒——刻意的笨策略，非平衡問題。
- rational bot 為粗略代理，真人讀報表/新聞應更好；勿為 bot 過度調校。
