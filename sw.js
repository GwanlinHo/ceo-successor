// Service Worker：cache-first，precache 全部資源(含 data/*.json)，安裝後完全離線可玩。
// 改版時更新 CACHE 版本號即可讓使用者取得新資源。

const CACHE = "ceo-successor-v1";

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

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
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
