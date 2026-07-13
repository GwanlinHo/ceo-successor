// 純 SVG 折線圖(無外部依賴)。中性色盤，配合報表趨勢顯示。

// data: [{month, value}]；回傳 SVG 字串。
export function lineChart(points, opts = {}) {
  const { width = 320, height = 90, color = "var(--accent)", label = "" } = opts;
  if (!points || points.length === 0) {
    return `<div class="chart-empty">尚無資料</div>`;
  }
  if (points.length === 1) {
    return `<div class="chart-empty">${label}：${points[0].value}（累積一個月後顯示趨勢）</div>`;
  }
  const pad = { l: 6, r: 6, t: 8, b: 14 };
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const range = max - min;
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const x = (i) => pad.l + (i / (points.length - 1)) * iw;
  const y = (v) => pad.t + ih - ((v - min) / range) * ih;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(pad.t + ih).toFixed(1)} L${x(0).toFixed(1)},${(pad.t + ih).toFixed(1)} Z`;
  const zeroLine = (min < 0 && max > 0)
    ? `<line x1="${pad.l}" y1="${y(0).toFixed(1)}" x2="${width - pad.r}" y2="${y(0).toFixed(1)}" class="chart-zero"/>`
    : "";
  const last = points[points.length - 1];
  const first = points[0];

  return `
    <svg class="chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${label}趨勢">
      <path d="${area}" class="chart-area" style="fill:${color}"/>
      ${zeroLine}
      <path d="${line}" class="chart-line" style="stroke:${color}"/>
      <circle cx="${x(points.length - 1).toFixed(1)}" cy="${y(last.value).toFixed(1)}" r="2.5" style="fill:${color}"/>
      <text x="${pad.l}" y="${height - 3}" class="chart-tick">第${first.month}月</text>
      <text x="${width - pad.r}" y="${height - 3}" class="chart-tick" text-anchor="end">第${last.month}月</text>
    </svg>`;
}

// 水平量表(0~100)：士氣、品牌等
export function meter(value, opts = {}) {
  const { max = 100, label = "", warn = 35 } = opts;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const cls = value < warn ? "meter-bad" : "";
  return `
    <div class="meter-row">
      <span class="meter-label">${label}</span>
      <span class="meter-bar"><span class="meter-fill ${cls}" style="width:${pct.toFixed(0)}%"></span></span>
      <span class="meter-val">${Math.round(value)}</span>
    </div>`;
}
