// M4 端到端測試：puppeteer 驅動完整一局。驗證開局→決策→結算→存讀檔→結局。
// 用法：node tests/e2e-m4.mjs  (需先啟動 http.server 於 PORT)
import puppeteer from "/home/pi/WorkDir/browser-tool/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";

const PORT = process.env.PORT || "8733";
const URL = `http://localhost:${PORT}/`;
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log(`  [O] ${m}`); } else { failed++; console.log(`  [X] ${m}`); } };

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium-browser",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(URL, { waitUntil: "networkidle0" });

  // 清掉舊存檔
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });

  // 開始畫面
  await page.waitForSelector('[data-act="new"]');
  ok(await page.$('.game-title') !== null, "開始畫面標題出現");
  ok((await page.$$('.lineup-npc svg')).length === 11, "首頁顯示 11 位 NPC 全員陣容");
  ok(await page.$eval('.version-tag', (e) => e.textContent).then((t) => /版本 v\d+/.test(t)), "首頁顯示遊戲版本號");

  // 進入設定
  await page.click('[data-act="new"]');
  await page.waitForSelector('#in-company');
  await page.click('[data-diff="hard"]');
  await page.$eval('#in-company', (el) => (el.value = "端測精工"));
  await page.$eval('#in-player', (el) => (el.value = "阿測"));
  await page.click('[data-act="start-game"]');

  // 遊戲畫面
  await page.waitForSelector('.hud');
  ok((await page.$eval('.hud-company', (e) => e.textContent)) === "端測精工", "HUD 顯示自訂公司名");
  ok((await page.$eval('.hud-tier', (e) => e.textContent)).includes("小型"), "初始為小型企業");

  // M6/v4 美術：事件對話框含 NPC 半身像 + 淡化辦公室背景
  await page.waitForSelector('.dialog');
  ok(await page.$('.npc-avatar svg') !== null, "事件對話框顯示 NPC 頭像 SVG");
  ok(await page.$eval('.npc-avatar svg', (e) => /^0 \d+ 100 \d+$/.test(e.getAttribute("viewBox")) && e.getAttribute("viewBox") !== "0 0 100 200"), "頭像為半身裁切");
  ok(await page.$('.dialog-bg .office-svg') !== null, "對話框背後有淡化辦公室場景");

  // v4 財報教學：閱讀指引開關
  await page.click('[data-act="open-reports"]');
  await page.waitForSelector('[data-overlay="reports"]');
  ok(await page.$('.guide') === null, "指引預設關閉");
  await page.click('[data-act="toggle-guide"]');
  await page.waitForSelector('.guide');
  ok(await page.$eval('.guide', (e) => e.textContent.includes("有沒有賺錢")), "損益表指引內容正確");
  await page.click('[data-rtab="cashflow"]');
  await page.waitForSelector('.guide');
  ok(await page.$eval('.guide', (e) => e.textContent.includes("黑字倒閉")), "切分頁指引跟著換(現金流)");
  ok(await page.$('.flow-pre') !== null, "指引含三表關係圖");
  await page.click('[data-act="toggle-guide"]');
  await page.waitForFunction(() => !document.querySelector('.guide'));
  await page.click('[data-act="close-overlay"]');
  await page.waitForFunction(() => !document.querySelector('[data-overlay="reports"]'));

  // 決策參考導引：點相關報表捷徑應直接開到該分頁
  {
    const refBtn = await page.$('.dialog-refs [data-open-rtab]');
    ok(refBtn !== null, "事件對話框有決策參考捷徑");
    if (refBtn) {
      const wantTab = await refBtn.evaluate((e) => e.dataset.openRtab);
      await refBtn.click();
      await page.waitForSelector('[data-overlay="reports"]');
      const onTab = await page.$eval('.rtab.on', (e) => e.dataset.rtab);
      ok(onTab === wantTab, `捷徑開到正確分頁(${onTab})`);
      await page.click('[data-act="close-overlay"]');
      await page.waitForFunction(() => !document.querySelector('[data-overlay="reports"]'));
    }
  }

  // 新聞面板(M5)
  await page.click('[data-act="open-news"]');
  await page.waitForSelector('[data-overlay="news"]');
  ok((await page.$$('.news-item')).length >= 1, "新聞面板顯示本月新聞");
  await page.click('[data-act="close-overlay"]');
  await page.waitForFunction(() => !document.querySelector('[data-overlay="news"]'));

  // 報表中心(M5)：切換分頁
  await page.click('[data-act="open-reports"]');
  await page.waitForSelector('[data-overlay="reports"]');
  ok((await page.$$('.rtab')).length === 6, "報表六分頁");
  await page.click('[data-rtab="market"]');
  await page.waitForSelector('.rtab.on');
  ok((await page.$eval('.rtab.on', (e) => e.textContent)) === "市場報告", "可切換到市場報告分頁");
  await page.click('[data-rtab="relations"]');
  ok((await page.$$('.meter-row')).length >= 4, "外部關係分頁顯示量表");
  await page.click('[data-act="close-overlay"]');
  await page.waitForFunction(() => !document.querySelector('[data-overlay="reports"]'));

  // 自動玩：處理事件→結算→下一月，直到結局或到達 20 個月
  let months = 0, decisions = 0, guard = 0;
  while (guard++ < 400) {
    if (await page.$('.ending')) break;
    const opt = await page.$('.option');
    if (opt) { await opt.click(); decisions++; await page.waitForNetworkIdle({ idleTime: 60 }).catch(() => {}); continue; }
    const end = await page.$('[data-act="end-month"]');
    if (end) { await end.click(); months++; await page.waitForSelector('.settlement, .ending'); continue; }
    const ack = await page.$('[data-act="ack"]');
    if (ack) {
      if (months >= 20) {
        // 存檔並離開→重載→繼續，驗證存讀檔
        break;
      }
      await ack.click(); await page.waitForSelector('.hud, .ending');
      continue;
    }
    break;
  }
  ok(decisions > 0, `有做出決策(${decisions} 次)`);
  ok(months > 0, `有完成月結算(${months} 個月)`);
  // 趨勢化：玩過至少兩個月後 HUD 應出現漲跌指示
  if (months >= 2 && !(await page.$('.ending'))) {
    ok(await page.$('.kpi-d') !== null, "HUD 顯示與上月比較的漲跌指示");
  }
  // 畫面轉場動畫類別存在
  ok(await page.$('.view-enter') !== null, "畫面轉場淡入類別已套用");

  // M6：某個月處理完事件後主畫面應出現辦公室場景(含至少一個部門 NPC)
  {
    // 推進到本月事件清空
    let g3 = 0;
    while (g3++ < 30 && await page.$('.option')) { await page.click('.option'); await page.waitForNetworkIdle({ idleTime: 40 }).catch(() => {}); }
    if (await page.$('.office-svg')) {
      // 辦公室為單一 SVG：5 個部門半身像(巢狀 svg) + 部門名字 text + 場景元素
      ok((await page.$$('.office-svg svg')).length >= 8, "辦公室含多個巢狀 SVG 素材(人物+擺設)");
      const depts = await page.$$eval('.office-svg text', (ts) => ts.map((t) => t.textContent));
      ok(["研發部", "生產部", "行銷業務部", "人事部", "財務部"].every((d) => depts.includes(d)), "五個部門名字都在");
    }
  }

  // 存讀檔：在結算畫面存檔離開→重載→繼續
  if (await page.$('[data-act="ack"]')) {
    const monthBefore = await page.$eval('.hud-month', (e) => e.textContent).catch(() => null);
    const cashBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("ceo_successor_save_v1")).kpi.cash);
    await page.click('[data-act="save-quit"]');
    await page.waitForSelector('[data-act="new"]');
    await page.reload({ waitUntil: "networkidle0" });
    // 自動載入：有存檔應直接進遊戲(不需點繼續遊戲)
    const autoResumed = await page.waitForSelector('.hud', { timeout: 5000 }).then(() => true).catch(() => false);
    ok(autoResumed, "重新開啟自動載入存檔直接進遊戲");
    const cashAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("ceo_successor_save_v1")).kpi.cash);
    ok(cashBefore === cashAfter, "讀檔後現金一致(存讀檔無損)");
  }

  // 快轉到結局：直接把 state 月份設高並結算(透過 UI 反覆推進)
  let g2 = 0;
  while (g2++ < 800 && !(await page.$('.ending'))) {
    const opt = await page.$('.option');
    if (opt) { await opt.click(); await page.waitForNetworkIdle({ idleTime: 40 }).catch(() => {}); continue; }
    const end = await page.$('[data-act="end-month"]');
    if (end) { await end.click(); await page.waitForSelector('.settlement, .ending'); continue; }
    const ack = await page.$('[data-act="ack"]');
    if (ack) { await ack.click(); await page.waitForSelector('.hud, .ending'); continue; }
    break;
  }
  ok(await page.$('.ending') !== null, "能走到結局畫面");
  const score = await page.$eval('.ending-score', (e) => parseInt(e.textContent, 10)).catch(() => null);
  ok(Number.isInteger(score), `結局顯示分數(${score})`);
  ok(await page.$eval('.ending-grade', (e) => e.textContent).then((t) => t.includes("評定")), "結局顯示評語");

  // 回主畫面後存檔已清除
  await page.click('[data-act="to-start"]');
  await page.waitForSelector('[data-act="new"]');
  const cleared = await page.evaluate(() => !localStorage.getItem("ceo_successor_save_v1"));
  ok(cleared, "結局後存檔已清除");

  ok(errors.length === 0, `無 JS 錯誤${errors.length ? "：" + errors.join(" | ") : ""}`);

  // 新遊戲覆蓋確認流程(獨立、不依賴前面遊戲狀態)
  // 開一局以產生存檔
  await page.click('[data-act="new"]');
  await page.waitForSelector('#in-company');
  await page.click('[data-act="start-game"]');
  await page.waitForSelector('.hud');
  await page.click('[data-act="save-quit"]');
  await page.waitForSelector('[data-act="new"]');
  // 有存檔時點新遊戲 → 應跳覆蓋確認
  await page.click('[data-act="new"]');
  const gotConfirm = await page.waitForSelector('[data-act="confirm-new"]', { timeout: 3000 }).then(() => true).catch(() => false);
  ok(gotConfirm, "有存檔時新遊戲先跳覆蓋確認");
  ok(await page.evaluate(() => !!localStorage.getItem("ceo_successor_save_v1")), "確認畫面尚未覆蓋存檔");
  // 取消(返回) → 存檔仍在
  await page.click('[data-act="back"]');
  await page.waitForSelector('[data-act="continue"]');
  ok(await page.evaluate(() => !!localStorage.getItem("ceo_successor_save_v1")), "取消後存檔仍在");
  // 確認覆蓋 → 進設定 → 開新局後存檔被新局覆蓋
  const cashOld = await page.evaluate(() => JSON.parse(localStorage.getItem("ceo_successor_save_v1")).kpi.cash);
  await page.click('[data-act="new"]');
  await page.waitForSelector('[data-act="confirm-new"]');
  await page.click('[data-act="confirm-new"]');
  await page.waitForSelector('#in-company');
  await page.click('[data-diff="easy"]'); // 換難度以區分
  await page.click('[data-act="start-game"]');
  await page.waitForSelector('.hud');
  const cashNew = await page.evaluate(() => JSON.parse(localStorage.getItem("ceo_successor_save_v1")).kpi.cash);
  ok(cashNew !== cashOld, "確認覆蓋後開新局，存檔已更新為新局");
} finally {
  await browser.close();
}
console.log(`\n結果: ${passed} 通過, ${failed} 失敗`);
process.exit(failed ? 1 : 0);
