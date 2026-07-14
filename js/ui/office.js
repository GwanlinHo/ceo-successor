// 辦公室場景：依規模 tier 呈現三種辦公空間，五個內部部門 NPC 站位。
// 依賴 sprites.js 的 npcSprite/objectSprite 契約。純視覺，不影響遊戲狀態。

import { npcBust, objectSprite } from "./sprites.js";

// 三個 tier 的場景設定：規模愈大，牆/地色調不同、標題不同
const TIER_SCENE = {
  1: { name: "一層辦公室", wall: "#efe9dd", floor: "#d8cfbd", cornerRight: "cabinet" },
  2: { name: "整棟小樓", wall: "#ece5d6", floor: "#d0c6b2", cornerRight: "printer" },
  3: { name: "企業總部大樓", wall: "#e8e0cf", floor: "#c8bda7", cornerRight: "printer" },
};

// 五個內部部門工作站(百分比座標)：後排三、前排二，前排較大營造景深
const DESK_LAYOUT = [
  { id: "shen", dept: "研發部", x: 22, row: "back" },
  { id: "hao", dept: "生產部", x: 50, row: "back" },
  { id: "jia", dept: "行銷業務部", x: 78, row: "back" },
  { id: "you", dept: "人事部", x: 34, row: "front" },
  { id: "qian", dept: "財務部", x: 66, row: "front" },
];

// 各工作站桌上擺設(輪流不同物件，增加辦公室細節)
const DESK_ITEMS = {
  shen: ["monitor", "folder"],
  hao: ["monitor", "phone"],
  jia: ["phone", "cup"],
  you: ["monitor", "folder"],
  qian: ["monitor", "phone", "folder"],
};

// 一個工作站：半身像坐在椅上、桌後 + 桌面擺設 + 銘牌
function workstation(d) {
  const size = d.row === "back" ? 72 : 92;
  const itemSize = d.row === "back" ? 22 : 28;
  const items = (DESK_ITEMS[d.id] || []).map((it) =>
    `<span class="ws-item">${objectSprite(it, itemSize)}</span>`).join("");
  return `
    <div class="ws ws-${d.row}" style="left:${d.x}%">
      <div class="ws-fig">${npcBust(d.id, size)}</div>
      <div class="ws-deskitems">${items}</div>
      <div class="ws-desk"><span class="ws-plate">${d.dept}</span></div>
    </div>`;
}

// 主畫面辦公室場景：牆面+地板+工作站+角落擺設，清楚呈現辦公空間
export function renderOffice(s) {
  const scene = TIER_SCENE[s.tier] || TIER_SCENE[1];
  const back = DESK_LAYOUT.filter((d) => d.row === "back").map(workstation).join("");
  const front = DESK_LAYOUT.filter((d) => d.row === "front").map(workstation).join("");
  return `
    <div class="office" style="--wall:${scene.wall};--floor:${scene.floor}">
      <div class="office-scene">
        <div class="office-wall">
          <div class="wall-clock" title="時鐘">${objectSprite("clock", 40)}</div>
        </div>
        <div class="office-floor"></div>
        <div class="office-prop prop-plant" title="盆栽">${objectSprite("plant", 52)}</div>
        <div class="office-prop prop-screen" title="屏風">${objectSprite("screen", 72)}</div>
        <div class="office-prop prop-corner" title="設備">${objectSprite(scene.cornerRight, 54)}</div>
        <div class="ws-row ws-row-back">${back}</div>
        <div class="ws-row ws-row-front">${front}</div>
      </div>
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
