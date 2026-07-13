// M9 PWA 離線測試：驗證 Service Worker 註冊、precache、斷網後仍可完整載入遊玩。
// 用法：PORT=xxxx node tests/e2e-pwa.mjs
import puppeteer from "/home/pi/WorkDir/browser-tool/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";

const PORT = process.env.PORT || "8744";
const URL = `http://localhost:${PORT}/`;
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log(`  [O] ${m}`); } else { failed++; console.log(`  [X] ${m}`); } };

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium-browser", headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());

  // 等 SW 啟用並控制頁面
  const swReady = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    // 等 controller 就緒(最多 5 秒)
    for (let i = 0; i < 50 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 100));
    return !!reg.active;
  });
  ok(swReady, "Service Worker 啟用");

  // 讓 SW 完整 precache 後，切離線
  await new Promise((r) => setTimeout(r, 800));
  await page.setOfflineMode(true);

  // 離線重載，應仍能載入開始畫面
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-act="new"]', { timeout: 8000 }).catch(() => {});
  ok(await page.$(".game-title") !== null, "離線後開始畫面可載入");

  // 離線開新局(需 fetch data/*.json，測 precache 是否涵蓋)
  await page.click('[data-act="new"]');
  await page.waitForSelector("#in-company", { timeout: 5000 }).catch(() => {});
  await page.click('[data-act="start-game"]');
  const gotHud = await page.waitForSelector(".hud", { timeout: 5000 }).then(() => true).catch(() => false);
  ok(gotHud, "離線可開新局(data/*.json 已 precache)");
  const gotDialog = await page.$(".dialog") !== null;
  ok(gotDialog, "離線可顯示事件(資料完整載入)");

  ok(errors.length === 0, `離線無 JS 錯誤${errors.length ? "：" + errors.join(" | ") : ""}`);
} finally {
  await browser.close();
}
console.log(`\n結果: ${passed} 通過, ${failed} 失敗`);
process.exit(failed ? 1 : 0);
