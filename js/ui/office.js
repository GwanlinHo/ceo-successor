// 辦公室場景：依規模 tier 呈現三種辦公空間，五個內部部門 NPC 站位。
// 依賴 sprites.js 的 npcSprite/objectSprite 契約。純視覺，不影響遊戲狀態。

import { npcSprite, objectSprite } from "./sprites.js";

// 三個 tier 的場景設定：規模愈大，家具愈多、標題不同
const TIER_SCENE = {
  1: { name: "一層辦公室", objects: ["desk", "monitor", "plant", "cup"], floor: "#eae5da" },
  2: { name: "整棟小樓", objects: ["desk", "monitor", "cabinet", "printer", "plant", "cup"], floor: "#e4ded2" },
  3: { name: "企業總部大樓", objects: ["desk", "monitor", "cabinet", "printer", "plant", "cup", "cabinet"], floor: "#ded7c8" },
};

// 五個內部部門 NPC 與其站位(百分比座標；上排三、下排二，離邊界留白避免標籤溢出)
const DESK_LAYOUT = [
  { id: "shen", dept: "研發部", x: 20, y: 32 },
  { id: "hao", dept: "生產部", x: 50, y: 28 },
  { id: "jia", dept: "行銷業務部", x: 80, y: 32 },
  { id: "you", dept: "人事部", x: 35, y: 70 },
  { id: "qian", dept: "財務部", x: 65, y: 70 },
];

// 主畫面辦公室俯視場景
export function renderOffice(s) {
  const scene = TIER_SCENE[s.tier] || TIER_SCENE[1];
  const figures = DESK_LAYOUT.map((d) => `
    <div class="office-fig" style="left:${d.x}%;top:${d.y}%" title="${d.dept}">
      <div class="office-sprite">${npcSprite(d.id, 76)}</div>
      <div class="office-desk">${objectSprite("desk", 44)}</div>
      <span class="office-tag">${d.dept}</span>
    </div>`).join("");
  // 角落擺設
  const props = `
    <div class="office-prop" style="left:4%;bottom:6%">${objectSprite("plant", 46)}</div>
    <div class="office-prop" style="right:4%;bottom:6%">${objectSprite(scene.objects.includes("printer") ? "printer" : "cabinet", 48)}</div>`;
  return `
    <div class="office" style="--floor:${scene.floor}">
      <div class="office-scene">
        ${figures}
        ${props}
      </div>
      <div class="office-caption">${scene.name}</div>
    </div>`;
}

// 事件對話框用的 NPC 頭像(單人半身，用同一 sprite 上半)
export function npcAvatar(id, size = 96) {
  return `<div class="npc-avatar">${npcSprite(id, size)}</div>`;
}
