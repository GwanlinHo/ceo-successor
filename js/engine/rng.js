// 種子化亂數：mulberry32。狀態為單一 32-bit 整數，可 O(1) 存讀檔續走。
// 全專案唯一亂數來源，禁止使用 Math.random()。

export function makeRng(state) {
  // state 為 32-bit 無號整數；未給則由 seed 字串雜湊產生
  let s = state >>> 0;
  const rng = {
    // 回傳 [0,1)
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    // 整數 [min, max]（含兩端）
    int(min, max) {
      return min + Math.floor(rng.next() * (max - min + 1));
    },
    // 浮點 [min, max)
    float(min, max) {
      return min + rng.next() * (max - min);
    },
    // 機率判定
    chance(p) {
      return rng.next() < p;
    },
    // 從陣列依權重挑一個 index；weights 為正數陣列
    weightedIndex(weights) {
      let total = 0;
      for (const w of weights) total += w;
      let r = rng.next() * total;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r < 0) return i;
      }
      return weights.length - 1;
    },
    // 現在的內部狀態（存檔用）
    getState() {
      return s >>> 0;
    },
  };
  return rng;
}

// 由字串種子產生初始 32-bit 狀態（xfnv1a）
export function seedFromString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
