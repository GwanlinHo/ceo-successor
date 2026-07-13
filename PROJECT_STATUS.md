# PROJECT STATUS：企業接班人養成術

- 目前階段：開發中。M0（骨架）、M1（資料初版）已完成並驗收 → 等使用者確認後進入 M2（引擎核心）
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

## 下一步
- [ ] **M3 事件系統**（抽取輪替保底+權重+條件+冷卻、DECIDE、機率結果）
- 註：M1 事件為 22 件種子版，完整 140~170 件於 M7 量產
