# 事件撰寫規範（M7 量產用）

所有批次 sub-agent 依本規範產出事件。產出後由主線以 tools/validate-data.mjs 驗證、抽查、合併進 data/events.json。

## 輸出格式

寫一個 JSON 檔，頂層為 `{ "batch": "<批次名>", "events": [ ...事件... ] }`。只含你被指派的事件，不要複製既有事件。

## 單一事件 schema

```json
{
  "id": "R-11",               // 部門字首-兩位數；字首見下表；不可與既有 id 重複
  "dept": "rnd",              // 見枚舉
  "tier": [1],                // 適用規模子集 [1,2,3]；tier1~2 寫 [1,2]
  "type": "routine",          // routine 例行 | opportunity 機會 | crisis 危機 | chain 連鎖
  "trigger": {
    "weight": 10,             // routine 8、一般 10、crisis 12
    "once": false,            // 是否整局僅觸發一次
    "cooldown": 6,            // 重抽冷卻月數：routine 1~2、opportunity/crisis 6
    "conditions": []          // 可空；元素 {"var":"kpi.product","op":"<","value":70}，op 限 < <= > >= ==
  },
  "title": "...",             // 事件標題(不含精確數字)
  "text": "...",              // 情境敘述，含 NPC 口吻，一到三句(不含精確數字)
  "speaker": "shen",          // NPC id，見下表
  "options": [                // 2~4 個
    {
      "label": "...",         // 選項名(不含精確數字)
      "hint": "...",          // 方向提示，如「花錢、長期見效」(不含精確數字)
      "effects": [ ... ],     // 可空陣列
      "random": [ ... ],      // 可空陣列
      "followUp": null,       // 事件鏈才填 id，否則 null
      "setFlag": null         // 需要時填字串旗標，否則 null
    }
  ]
}
```

## dept 字首與 NPC

| dept | 字首 | 中文 | speaker id / 名字 |
|------|------|------|-------------------|
| rnd | R | 研發部 | shen 沈技安 |
| prod | P | 生產部 | hao 郝製造 |
| mkt | M | 行銷業務部 | jia 賈推銷 |
| hr | H | 人事部 | you 尤仁慈 |
| fin | F | 財務部 | qian 錢守成 |
| shareholder | S | 大股東 | dong 董大川 |
| bank | B | 銀行 | tian 田利息 |
| supplier | U | 供應商 | shi 石原料 |
| channel | C | 通路客戶 | bai 白買家 |
| gov | G | 政府 | guan 官正義 |
| media | N | 媒體 | maque 麻雀姐 |

## effect 格式

- `{ "var": "kpi.cash", "delta": -300, "delayMonths": 0, "months": 1 }` — delta 可為數字或 `[min,max]` 區間(引擎抽亂數取值)。delayMonths 預設 0(立即)，months 預設 1(>1 表連續每月套用)。
- 乘法(比率/指數類)：`{ "var": "aux.materialRate", "op": "mul", "delta": 1.15 }`
- 百分比型(依營收)：`{ "var": "kpi.cash", "pctOf": "kpi.revenue", "pct": -0.08, "months": 3 }`

### 可用變數（僅限這些，路徑照抄）
kpi.cash, kpi.equity, kpi.headcount, kpi.product, kpi.morale, kpi.share, kpi.brand, kpi.satisfaction, kpi.credit, kpi.shareholder, kpi.compliance,
aux.capacity, aux.utilization, aux.yieldRate, aux.price, aux.materialRate, aux.turnover, aux.supplierRel, aux.channelRel, aux.debt, aux.interest, aux.salaryAvg, aux.marketing, aux.rnd,
world.economyIndex, world.rivalProduct

**嚴禁**對 kpi.revenue 與 kpi.profit 直接下 effect（它們是每月結算導出值）。設計「營收+X%」改映射到因果變數：量→kpi.share、價→aux.price。條件(conditions)可用 kpi.profit/revenue。

### 量綱與金額尺度（重要）
- 金額類(kpi.cash/equity、aux.debt/marketing/rnd/interest)單位「萬元」，且**一律以小型企業(tier1)尺度撰寫**——引擎會依規模自動放大(中型×4、大型×15)。例：小型「花 300 萬」寫 -300，同一事件在大型會自動變成 -4500 萬。
- 0~100 刻度：kpi 的 product/morale/share/brand/satisfaction/credit/shareholder/compliance、aux.supplierRel/channelRel。share 是百分點(市占+4% → delta 4)。
- 比率 0~1：aux.materialRate/utilization/yieldRate/turnover(用 op mul，如原料漲15% → mul 1.15)。
- 指數基準1.0：aux.price(單價-12% → mul 0.88)、aux.capacity(產能+25% → mul 1.25)、aux.salaryAvg(薪資+5% → mul 1.05)。

## random 分支
`{ "chance": 0.3, "effects": [...], "resultText": "結果敘述" }`。chance 0~1。互斥分支各列一元素(如60%成功/40%失敗寫兩個，chance 相加≤1；引擎依序擲骰落點)。惡果分支的負面效果引擎會依難度自動放大，你只寫基準值。

## 事件鏈(chain)寫法
- 主事件某選項 `"followUp": "後續事件id"`，後續事件 type 設 "chain"、weight 設極小(如 0.001)、tier 設全 [1,2,3]（避免被隨機抽到，只由 followUp 觸發）。
- 危機事件的「擱置/觀望」選項，應以 followUp 接一個「惡化版」chain 事件（1~2月後更嚴重）。

## 品質要求
- 全繁體中文，**嚴禁簡體字**、嚴禁 emoji。語氣辦公室寫實、可帶淡淡幽默。
- title/text/label/hint **不得出現精確效果數字**（數字只存在 effects）。
- 每個選項要有清楚的取捨(trade-off)，不要有明顯最優解。
- 同部門事件之間情境不重複；善用 tier 分層(tier1 給小公司情境、tier3 給大企業情境)。
- id 連號接續既有最大號(例：rnd 既有 R-01/R-07，新增從 R-11 起跳避開)。

## 既有事件 id（避免重複）
R-01 R-07 / P-01 P-03 P-09 / M-01 M-02 M-08 / H-01 H-06 / F-02 F-07 / S-01 S-05 / B-02 B-06 / U-01 U-04 / C-03 / G-02 G-05 / N-01
