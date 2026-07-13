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

  // M6 美術：事件對話框含 NPC 頭像 SVG
  await page.waitForSelector('.dialog');
  ok(await page.$('.npc-avatar svg') !== null, "事件對話框顯示 NPC 頭像 SVG");

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

  // M6：某個月處理完事件後主畫面應出現辦公室場景(含至少一個部門 NPC)
  {
    // 推進到本月事件清空
    let g3 = 0;
    while (g3++ < 30 && await page.$('.option')) { await page.click('.option'); await page.waitForNetworkIdle({ idleTime: 40 }).catch(() => {}); }
    if (await page.$('.office-scene')) {
      ok((await page.$$('.office-fig')).length === 5, "辦公室場景五個部門站位");
      ok(await page.$('.office-scene svg') !== null, "辦公室場景含 SVG 素材");
    }
  }

  // 存讀檔：在結算畫面存檔離開→重載→繼續
  if (await page.$('[data-act="ack"]')) {
    const monthBefore = await page.$eval('.hud-month', (e) => e.textContent).catch(() => null);
    const cashBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("ceo_successor_save_v1")).kpi.cash);
    await page.click('[data-act="save-quit"]');
    await page.waitForSelector('[data-act="continue"]');
    await page.reload({ waitUntil: "networkidle0" });
    await page.click('[data-act="continue"]');
    await page.waitForSelector('.hud');
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
} finally {
  await browser.close();
}
console.log(`\n結果: ${passed} 通過, ${failed} 失敗`);
process.exit(failed ? 1 : 0);
