// 載入 data/*.json，並做執行期最基本的健全性檢查(完整驗證在 tools/validate-data.mjs)。
// 回傳一個 data 物件供引擎與 UI 使用。

const FILES = ["balance", "difficulty", "events", "npcs", "news"];

export async function loadData(base = "./data/") {
  const out = {};
  await Promise.all(
    FILES.map(async (name) => {
      const res = await fetch(`${base}${name}.json`);
      if (!res.ok) throw new Error(`載入 ${name}.json 失敗: HTTP ${res.status}`);
      out[name] = await res.json();
    })
  );
  sanityCheck(out);
  // 建索引方便查詢
  out.eventById = Object.fromEntries((out.events.events || []).map((e) => [e.id, e]));
  out.npcById = Object.fromEntries((out.npcs.npcs || []).map((n) => [n.id, n]));
  return out;
}

function sanityCheck(d) {
  if (!d.balance?.tiers?.["1"]) throw new Error("balance.json 結構異常");
  if (!d.difficulty?.levels?.normal) throw new Error("difficulty.json 結構異常");
  if (!Array.isArray(d.events?.events) || d.events.events.length === 0) throw new Error("events.json 無事件");
  if (!Array.isArray(d.npcs?.npcs)) throw new Error("npcs.json 結構異常");
}
