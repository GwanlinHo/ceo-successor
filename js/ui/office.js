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
  { id: "shen", dept: "研發部", x: 19, row: "back" },
  { id: "hao", dept: "生產部", x: 50, row: "back" },
  { id: "jia", dept: "行銷業務部", x: 81, row: "back" },
  { id: "you", dept: "人事部", x: 33, row: "front" },
  { id: "qian", dept: "財務部", x: 63, row: "front" },
];

// 各工作站桌上的主要設備(放大，看得清楚)
const DESK_TOP = {
  shen: "monitor", hao: "phone", jia: "monitor", you: "folder", qian: "monitor",
};
// 人物站在桌子哪一側(相鄰工作站不互相面對，避免人物擠在一起)
const FIG_SIDE = { shen: "left", hao: "left", jia: "left", you: "left", qian: "right" };

// 一個工作站：人物站在桌子「旁邊」，桌子有桌腳，桌上有放大的設備 + 銘牌
function workstation(d, figSize, deskW, itemSize) {
  const side = FIG_SIDE[d.id] || "left";
  const fig = `<div class="ws-fig">${npcBust(d.id, figSize)}</div>`;
  const desk = `
    <div class="ws-desk" style="width:${deskW}px">
      <div class="ws-deskitem">${objectSprite(DESK_TOP[d.id] || "monitor", itemSize)}</div>
      <div class="ws-desktop"></div>
      <div class="ws-leg ws-leg-l"></div><div class="ws-leg ws-leg-r"></div>
      <span class="ws-plate">${d.dept}</span>
    </div>`;
  return `
    <div class="ws ws-${d.row} ws-side-${side}" style="left:${d.x}%">
      ${side === "left" ? fig + desk : desk + fig}
    </div>`;
}

// 主畫面辦公室場景：牆面+地板+工作站(人在桌旁、桌有腳)+角落擺設，放大填滿空間
export function renderOffice(s) {
  const scene = TIER_SCENE[s.tier] || TIER_SCENE[1];
  const back = DESK_LAYOUT.filter((d) => d.row === "back").map((d) => workstation(d, 96, 118, 46)).join("");
  const front = DESK_LAYOUT.filter((d) => d.row === "front").map((d) => workstation(d, 120, 150, 58)).join("");
  return `
    <div class="office" style="--wall:${scene.wall};--floor:${scene.floor}">
      <div class="office-scene">
        <div class="office-wall">
          <div class="wall-clock" title="時鐘">${objectSprite("clock", 54)}</div>
        </div>
        <div class="office-floor"></div>
        <div class="office-prop prop-plant" title="盆栽">${objectSprite("plant", 84)}</div>
        <div class="office-prop prop-screen" title="屏風">${objectSprite("screen", 108)}</div>
        <div class="office-prop prop-corner" title="設備">${objectSprite(scene.cornerRight, 88)}</div>
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
