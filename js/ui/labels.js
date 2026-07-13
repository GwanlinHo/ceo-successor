// UI 文字標籤與格式化。所有顯示用中文名稱集中於此。

export const KPI_LABELS = {
  cash: "現金", equity: "淨值", revenue: "月營收", profit: "月淨利",
  headcount: "員工數", product: "產品競爭力", morale: "員工士氣",
  share: "市占率", brand: "品牌知名度", satisfaction: "客戶滿意度",
  credit: "銀行信用", shareholder: "股東信心", compliance: "政府合規",
};

export const AUX_LABELS = {
  capacity: "產能", utilization: "產能利用率", yieldRate: "良率",
  price: "平均單價指數", materialRate: "原料成本率", turnover: "離職率",
  supplierRel: "供應商關係", channelRel: "通路關係",
  debt: "負債", interest: "月利息", salaryAvg: "平均月薪",
  marketing: "行銷月支出", rnd: "研發月支出",
};

export const TIER_NAMES = { 1: "小型企業", 2: "中型企業", 3: "大型企業（上市）" };
export const DIFF_LABELS = { easy: "簡單", normal: "普通", hard: "困難" };

// 金額(萬元)：大額轉億
export function money(wan) {
  const v = Math.round(wan);
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(2)} 億`;
  return `${v.toLocaleString("zh-TW")} 萬`;
}

// 百分比刻度(0~100)
export function pct(v) { return `${v.toFixed(1)}%`; }
export function score100(v) { return Math.round(v).toString(); }

// 帶正負號的變化量
export function delta(v, unit = "") {
  const r = Math.round(v * 10) / 10;
  if (r === 0) return "—";
  return `${r > 0 ? "+" : ""}${r}${unit}`;
}

// 數值變化的語意色 class
export function trendClass(v) {
  if (v > 0) return "val-good";
  if (v < 0) return "val-bad";
  return "";
}
