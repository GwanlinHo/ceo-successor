# PROJECT STATUS：企業接班人養成術

- 目前階段：**全部完成並上線**。M0~M10 已交付，線上可玩。
- 專案位置：/home/pi/WorkDir/ceo_successor/
- 目標部署：GitHub Pages（repo: ceo-successor）
- Node 環境：非互動 shell 需手動加 PATH：`export PATH="$HOME/.config/nvm/versions/node/v22.17.0/bin:$PATH"`
- 本機測試：`python3 -m http.server <port>`（fetch JSON 需 http，file:// 不行）

## 已完成
- [O] 2026-07-13 企劃書（docs/GAME_DESIGN.md）+ 事件數矩陣修訂（困難×大型 14~16）已同意
- [O] 2026-07-13 技術架構（docs/ARCHITECTURE.md）、開發計畫 M0~M10（docs/DEV_PLAN.md）
- [O] 2026-07-13 **M0 骨架**：rng.js（種子亂數，確定性測試通過）、data-loader.js、tools/validate-data.mjs、index.html、css/style.css、main.js（骨架版）
- [O] 2026-07-13 **M1 資料初版**：balance.json、difficulty.json、npcs.json、news.json、events.json（22 件種子事件）；validate-data.mjs 0 錯 0 警告通過；http server 全資源 200、JSON 可載入
- [O] 2026-07-13 **M2 引擎核心**：state/economy/rules/engine 完成，18 項單元測試全過，60月基準模擬走勢合理
- [O] 2026-07-13 **M3 事件系統**：抽取(件數矩陣/輪替保底/權重/冷卻/條件)+DECIDE(隨機分支/事件鏈/難度惡果放大)，28 項測試全過；修三個系統bug；行為模擬因果鏈成立
- [O] 2026-07-13 **M4 可玩雛形**：save+UI+main控制器；順手落地桿D金額縮放；單元29/29、E2E 11/11；截圖 m4-*
- [O] 2026-07-13 **M5 報表+新聞**：六分頁報表(SVG趨勢圖)、新聞/小道消息系統；單元34/34、E2E 14/14；截圖 m5-*
- [O] 2026-07-13 **M6 美術與畫面**：sprites.js(11 NPC+6物件)、office.js三tier場景、對話框頭像、月結算橫幅；E2E 15/15；截圖 m6-*
- [O] 2026-07-13 **M7 事件庫量產**：22→160件+連鎖劇情;引擎新功能(followUpDelay/分支setFlag/上市審查閘門);揭露平衡退化
- [O] 2026-07-13 **M8 平衡調參**：桿A/B/C/E+修平衡退化;模擬達標(上市率易74/普31/難21%單調);單元38/38、E2E 15/15
- [O] 2026-07-13 **M9 PWA與收尾**：manifest+sw.js離線(precache全資源)、icon;office站位微調;補3則tier3危機(占比35%);離線測試5/5(斷網完整可玩)、E2E 15/15;events 163件

## 下一步
- [O] 2026-07-13 **M10 端到端測試與部署**：README+TEST_REPORT;建 GitHub repo(GwanlinHo/ceo-successor,public)、推送、啟用Pages;線上實站puppeteer冒煙全過

## 已上線
- 線上遊玩：https://gwanlinho.github.io/ceo-successor/
- Repo：https://github.com/GwanlinHo/ceo-successor
- [ ] 難度分化：桿D已落地(M4)；A/B/C/E 於 M8 實作調參 → docs/DIFFICULTY_DESIGN.md
- 註：M1 事件為 22 件種子版，完整 140~170 件於 M7 量產
