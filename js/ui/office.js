// 辦公室場景：整個場景畫成單一 SVG(viewBox 900x600)，所有元素隨容器等比縮放、
// 縮放瀏覽器也絕不跑位。人物半身像坐在桌後，桌上不放東西。純視覺，不影響狀態。

import { npcBust, objectSprite } from "./sprites.js";

const VW = 900, VH = 600;

// 三個 tier 的場景設定：規模愈大，牆/地色調不同、標題不同
const TIER_SCENE = {
  1: { name: "一層辦公室", wall: "#efe9dd", floor: "#d8cfbd", cornerRight: "cabinet" },
  2: { name: "整棟小樓", wall: "#ece5d6", floor: "#d0c6b2", cornerRight: "printer" },
  3: { name: "企業總部大樓", wall: "#e8e0cf", floor: "#c8bda7", cornerRight: "printer" },
};

// 五個內部部門：後排三、前排二(前排較大、營造景深)
const DESK_LAYOUT = [
  { id: "shen", dept: "研發部", cx: 165, row: "back" },
  { id: "hao", dept: "生產部", cx: 450, row: "back" },
  { id: "jia", dept: "行銷業務部", cx: 735, row: "back" },
  { id: "you", dept: "人事部", cx: 300, row: "front" },
  { id: "qian", dept: "財務部", cx: 600, row: "front" },
];

// 將 objectSprite / npcBust 產生的 <svg> 以巢狀 svg 放進場景座標(x,y,w,h)。
// 子 svg 依自身 viewBox 自動縮放進指定框，故整體隨父 viewBox 等比縮放。
function place(svg, x, y, w, h) {
  return svg
    .replace("<svg ", `<svg x="${x}" y="${y}" `)
    .replace(/width="[^"]*"/, `width="${w}"`)
    .replace(/height="[^"]*"/, `height="${h}"`);
}

// 一個工作站：半身像坐在桌後(桌面擋住半身下緣) + 桌腳 + 桌面銘牌
function workstation(d) {
  const isBack = d.row === "back";
  const floorY = isBack ? 392 : 574;      // 桌腳落地線
  const deskW = isBack ? 200 : 250;       // 放大桌面
  const figH = isBack ? 150 : 190;
  const figW = figH * 0.94;               // 半身像 viewBox 比例
  const deskTopH = 30, legH = isBack ? 34 : 42;
  const deskTopY = floorY - legH - deskTopH;
  const deskX = d.cx - deskW / 2;
  // 半身像：底部剛好被桌面上緣遮住一點(像坐在桌後)
  const figY = deskTopY + 10 - figH;
  const figX = d.cx - figW / 2;
  const legInset = deskW * 0.12;
  const font = isBack ? 20 : 23;
  const plateW = deskW * 0.86;
  return `
    <!-- ${d.dept} -->
    ${place(npcBust(d.id, 100), figX, figY, figW, figH)}
    <rect x="${deskX + legInset}" y="${deskTopY + deskTopH}" width="9" height="${legH}" fill="#9c9078" stroke="#cfc9bc"/>
    <rect x="${deskX + deskW - legInset - 9}" y="${deskTopY + deskTopH}" width="9" height="${legH}" fill="#9c9078" stroke="#cfc9bc"/>
    <rect x="${deskX}" y="${deskTopY}" width="${deskW}" height="${deskTopH}" rx="4" fill="#c1b598" stroke="#cfc9bc"/>
    <rect x="${d.cx - plateW / 2}" y="${deskTopY + 4}" width="${plateW}" height="${deskTopH - 8}" rx="3" fill="#fdfcf9" opacity="0.9"/>
    <text x="${d.cx}" y="${deskTopY + deskTopH / 2 + font * 0.35}" text-anchor="middle" font-size="${font}" fill="#3a352c" font-family="sans-serif" font-weight="600">${d.dept}</text>`;
}

// 主畫面辦公室場景：單一 SVG，牆+地板+工作站(人坐桌後)+角落擺設
export function renderOffice(s) {
  const scene = TIER_SCENE[s.tier] || TIER_SCENE[1];
  // 後排先畫(在後)，前排後畫(在前)，形成前後景深
  const back = DESK_LAYOUT.filter((d) => d.row === "back").map(workstation).join("");
  const front = DESK_LAYOUT.filter((d) => d.row === "front").map(workstation).join("");
  return `
    <div class="office">
      <svg class="office-svg" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="辦公室場景">
        <rect x="0" y="0" width="${VW}" height="300" fill="${scene.wall}"/>
        <rect x="0" y="300" width="${VW}" height="300" fill="${scene.floor}"/>
        <line x1="0" y1="300" x2="${VW}" y2="300" stroke="rgba(43,43,41,0.10)" stroke-width="2"/>
        ${[180, 360, 540, 720].map((x) => `<line x1="${x}" y1="300" x2="${x}" y2="600" stroke="rgba(43,43,41,0.05)" stroke-width="1"/>`).join("")}
        ${place(objectSprite("clock", 100), VW / 2 - 55, 34, 110, 110)}
        ${back}
        ${place(objectSprite("screen", 100), 250, 300, 170, 170)}
        ${front}
        ${place(objectSprite("plant", 100), 8, 400, 150, 150)}
        ${place(objectSprite(scene.cornerRight, 100), VW - 150, 430, 140, 140)}
      </svg>
      <div class="office-caption">${scene.name}</div>
    </div>`;
}

// 事件對話框用的 NPC 半身像(頭部+肩胸，特徵醒目)
export function npcAvatar(id, size = 120) {
  return `<div class="npc-avatar">${npcBust(id, size)}</div>`;
}

// 對話框背後的淡化辦公室背景(營造「在辦公室對話」氛圍)
export function officeBackdrop(s) {
  return `<div class="dialog-bg" aria-hidden="true">${renderOffice(s)}</div>`;
}
