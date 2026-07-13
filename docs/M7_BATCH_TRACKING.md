# M7 事件量產批次進度

規範：docs/EVENT_AUTHORING.md　工具：tools/merge-batch.mjs　批次檔暫存於 data/batches/
目標：140~170 件（既有 22 → 需 +120 左右）；每內部部門 12~15、每外部單位 10~12、+6 連鎖劇情。

## 各部門目標與現況

| dept | 字首 | 既有 | 目標 | 需新增 | 批次 | 狀態 |
|------|------|------|------|--------|------|------|
| rnd | R | 2 | 13 | +11 | A | [O] 已合併(14) |
| prod | P | 3 | 13 | +10 | B | [O] 已合併(14) |
| mkt | M | 3 | 13 | +10 | C | [O] 已合併(14) |
| hr | H | 2 | 13 | +11 | D | [O] 已合併(14) |
| fin | F | 2 | 13 | +11 | E | [O] 已合併(14) |
| shareholder | S | 2 | 11 | +9 | F | [O] 已合併(12) |
| bank | B | 2 | 11 | +9 | G | [O] 已合併(12) |
| supplier | U | 2 | 11 | +9 | H | [O] 已合併(12) |
| channel | C | 1 | 11 | +10 | I | [O] 已合併(12) |
| gov | G | 2 | 11 | +9 | J | [O] 已合併(12) |
| media | N | 1 | 11 | +10 | K | [O] 已合併(14) |
| chains | (混) | 0 | 6 | +16 | L | [O] 主線親撰,已合併 |

## 波次（Pi 4 上限：同時 2 個 sub-agent）

- 波1：A(rnd)、B(prod)
- 波2：C(mkt)、D(hr)
- 波3：E(fin)、F(shareholder)
- 波4：G(bank)、H(supplier)
- 波5：I(channel)、J(gov)
- 波6：K(media)、L(chains)

每波：2 agent 各寫 data/batches/<批次>.json → 主線 `node tools/merge-batch.mjs <檔> --dry` 抽查 → 通過則去掉 --dry 合併 → 更新本表狀態。

## 進度記錄

- 波1(2026-07-13)：A-rnd(+12含1鏈)、B-prod(+11含1鏈) 已驗證合併，events 22→45。引擎34/34+20局冒煙0崩潰。
- 波2(2026-07-13)：C-mkt(+11含1鏈)、D-hr(+12含1鏈) 已合併，events 45→68。引擎34/34。
- 波3(2026-07-13)：E-fin(+12含1鏈)、F-shareholder(+10含1鏈) 已合併，events 68→90。引擎34/34。內部5部門全數完成(各14)。
- 波4(2026-07-13)：G-bank(+10含1鏈)、H-supplier(+10含1鏈) 已合併，events 90→110。引擎34/34。
- 波5(2026-07-13)：J-gov(+10)先合併,I-channel(+11,agent自修JSON後)合併,events 120→131。
- 波6(2026-07-13)：K-media(+13含3鏈)合併,L-chains(主線親撰16件:上市審查4段/勞資風暴3段/技術外流2段/家族內鬥3段/金融風暴2段/殺手級新產品2段)合併,events 131→160。
- **M7 完成:160件事件(達標140~170)**。新增引擎功能:followUpDelay延月觸發劇情、random分支setFlag、上市審查閘門(flags.ipoApproved把關tier2→3)。
- 批次暫存 data/batches/ 已清理。
