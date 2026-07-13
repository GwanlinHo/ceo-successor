// Service Worker：cache-first，precache 全部資源(含 data/*.json)，安裝後完全離線可玩。
//
// ★ 進版必做：每次要發佈新版(改任何 js/css/data/html)，把下面 CACHE 版本號 +1。
//   這是「唯一」要改的地方；改了瀏覽器才會偵測到新 SW、抓新檔、觸發更新提示。
//   詳見 docs/RELEASE.md。
const CACHE = "ceo-successor-v2";

const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./js/main.js",
  "./js/data-loader.js",
  "./js/save.js",
  "./js/engine/rng.js",
  "./js/engine/state.js",
  "./js/engine/economy.js",
  "./js/engine/rules.js",
  "./js/engine/effects.js",
  "./js/engine/events.js",
  "./js/engine/news.js",
  "./js/engine/engine.js",
  "./js/ui/labels.js",
  "./js/ui/hud.js",
  "./js/ui/dialog.js",
  "./js/ui/screens.js",
  "./js/ui/charts.js",
  "./js/ui/reports.js",
  "./js/ui/news.js",
  "./js/ui/sprites.js",
  "./js/ui/office.js",
  "./data/balance.json",
  "./data/difficulty.json",
  "./data/events.json",
  "./data/npcs.json",
  "./data/news.json",
];

// 安裝：precache 新版資源。不自動 skipWaiting——等使用者按「更新」再切換，
// 避免遊戲進行中突然抽換資源(更新流程由頁面控制，見 main.js)。
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 頁面通知「立即更新」時才 skipWaiting(接著頁面會偵測 controllerchange 並重整)
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

// cache-first：命中快取即回，否則抓網路並存快取(離線後仍可用)
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
