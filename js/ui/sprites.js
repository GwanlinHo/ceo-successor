// sprites.js — 「企業接班人養成術」SVG 素材產生器
//
// 座標系規範：
//   - NPC 人物：viewBox="0 0 100 200"，人物置中站立，頭頂約 y=8~14，腳底約 y=195。
//     採「2 頭身」Q 版比例：頭部圓形明顯大於身體，身體矮胖、四肢簡短。
//   - 物件：viewBox="0 0 100 100"。
//
// 美術風格規範（嚴格遵守，勿改動色碼）：
//   - 色盤僅限辦公室中性色：近黑 #2b2b29、次要 #55524c、米黃 #f4f1ea、
//     米黃深 #eae5da、近白 #fdfcf9、線 #cfc9bc、灰 #b3afa2 / #8a8578、
//     深灰 #4a4640。膚色統一 #e8d5c0，髮色統一 #3a3632（老年角色可用灰階髮色）。
//     植物葉片例外使用低彩度灰綠 #6b7469。
//   - 嚴禁 emoji、嚴禁高彩度顏色。線條簡潔（simple line + flat fill），
//     最多一層極淡陰影，不做複雜漸層。
//   - 所有人物共用同一套骨架比例（頭、頸、軀幹、四肢、腿、腳的座標一致），
//     僅以髮型、配件、服裝深淺色與表情做區分。
//
// 本檔案為 ES module，對外僅匯出 NPC_IDS / npcSprite() / objectSprite() 三者。

// ------------------------------------------------------------------
// 色盤
// ------------------------------------------------------------------
const C = {
  black: '#2b2b29',
  secondary: '#55524c',
  cream: '#f4f1ea',
  creamDark: '#eae5da',
  white: '#fdfcf9',
  line: '#cfc9bc',
  gray1: '#b3afa2',
  gray2: '#8a8578',
  darkGray: '#4a4640',
  skin: '#e8d5c0',
  hair: '#3a3632',
  leaf: '#6b7469',
};

// ------------------------------------------------------------------
// 共用骨架座標常數（所有 NPC 一致）
// ------------------------------------------------------------------
const HEAD = { cx: 50, cy: 46, r: 30 };

// ------------------------------------------------------------------
// 共用骨架零件產生函式
// ------------------------------------------------------------------

// 腿與鞋
function legs(pants = C.secondary, shoe = C.darkGray) {
  return `
<rect x="35" y="134" width="12" height="42" rx="6" fill="${pants}" stroke="${C.line}" stroke-width="1"/>
<rect x="53" y="134" width="12" height="42" rx="6" fill="${pants}" stroke="${C.line}" stroke-width="1"/>
<ellipse cx="41" cy="182" rx="9" ry="7" fill="${shoe}"/>
<ellipse cx="59" cy="182" rx="9" ry="7" fill="${shoe}"/>`;
}

// 軀幹：加寬到接近頭寬(22~78)，頂部圓角形成肩膀，避免肩膀下陷。
function torso(shirt = C.cream) {
  return `<rect x="22" y="76" width="56" height="60" rx="18" fill="${shirt}" stroke="${C.line}" stroke-width="1"/>`;
}

// 雙臂：手臂內側嵌進軀幹兩側(繪製順序在軀幹之前，接合處被軀幹蓋住 → 手臂自然從身體兩側伸出)。
// raisedRight=true 右手舉起；hideRight / hideLeft 隱藏該側(背手、抱物等由呼叫端自畫)。
function arms(sleeve = C.cream, skin = C.skin, opts = {}) {
  const { raisedRight = false, hideLeft = false, hideRight = false } = opts;
  let left = '';
  let right = '';
  if (!hideLeft) {
    left = `<rect x="13" y="84" width="15" height="40" rx="7.5" fill="${sleeve}" stroke="${C.line}" stroke-width="1"/><circle cx="20.5" cy="126" r="7" fill="${skin}"/>`;
  }
  if (!hideRight) {
    if (raisedRight) {
      right = `<g transform="rotate(-32 76 116)"><rect x="72" y="84" width="15" height="40" rx="7.5" fill="${sleeve}" stroke="${C.line}" stroke-width="1"/><circle cx="79.5" cy="80" r="7" fill="${skin}"/></g>`;
    } else {
      right = `<rect x="72" y="84" width="15" height="40" rx="7.5" fill="${sleeve}" stroke="${C.line}" stroke-width="1"/><circle cx="79.5" cy="126" r="7" fill="${skin}"/>`;
    }
  }
  return left + right;
}

// 頭部底色圓
function headCircle(skin = C.skin) {
  return `<circle cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}" fill="${skin}" stroke="${C.line}" stroke-width="1"/>`;
}

// 一隻大眼睛(白眼球+瞳孔+高光)。left 決定高光位置。
function bigEye(cx, cy, rx, ry, ink) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.white}" stroke="${C.line}" stroke-width="0.6"/>`
    + `<circle cx="${cx}" cy="${cy + 0.6}" r="${(rx * 0.62).toFixed(1)}" fill="${ink}"/>`
    + `<circle cx="${(cx - rx * 0.3).toFixed(1)}" cy="${(cy - ry * 0.3).toFixed(1)}" r="1" fill="${C.white}"/>`;
}

// 五官放大倍率：圍繞臉部中心等比放大五官與眼鏡/鬍子(字面 5 倍會超出頭部，
// 此值為在頭內能容納的大幅放大；要更大改這個數字即可)。
const FEATURE_SCALE = 1.7;
const FACE_CX = 50, FACE_CY = 47;
function scaleFeatures(inner, k = FEATURE_SCALE) {
  if (k === 1) return inner;
  const tx = (FACE_CX * (1 - k)).toFixed(2), ty = (FACE_CY * (1 - k)).toFixed(2);
  return `<g transform="matrix(${k},0,0,${k},${tx},${ty})">${inner}</g>`;
}

// 五官：眼睛一律偏大(不再是小點)。可調眼距與眼睛大小，讓每人不同。
// eye: 'big'(預設) | 'huge' | 'round' | 'sleepy'(半月上彎) | 'shrewd'(精明微瞇，仍有神)
// gap: 半瞳距(眼睛離臉中線的距離，預設 9；大=眼距寬、小=眼距窄)
// eyeScale: 眼睛大小倍率(預設 1)
// brow: 'none' | 'thick'(濃眉) | 'flat'(一字眉) | 'worried'
// mouth: 'smile' | 'bigsmile' | 'neutral' | 'frown'(嘴角下彎) | 'small'
// fold: true 加法令紋
function face(opts = {}) {
  const { eye = 'big', brow = 'none', mouth = 'smile', fold = false, ink = C.hair, gap = 9, eyeScale = 1 } = opts;
  const LX = 50 - gap, RX = 50 + gap, EY = 46;
  // 各眼型的基準半徑，再乘 eyeScale
  const R = { huge: [5, 6], round: [4.4, 4.8], shrewd: [4.4, 3.2], big: [4.2, 5] };
  const es = (s) => (s * eyeScale).toFixed(2);
  let eyes = '';
  if (eye === 'sleepy') {
    const w = 4 * eyeScale;
    eyes = `<path d="M${LX - w},47 Q${LX},42 ${LX + w},47" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      + `<path d="M${RX - w},47 Q${RX},42 ${RX + w},47" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  } else {
    const [rx, ry] = R[eye] || R.big;
    eyes = bigEye(LX, EY, es(rx), es(ry), ink) + bigEye(RX, EY, es(rx), es(ry), ink);
  }
  let brows = '';
  if (brow === 'thick') {
    brows = `<path d="M${LX - 6},37 Q${LX},33 ${LX + 6},37" stroke="${ink}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`
      + `<path d="M${RX - 6},37 Q${RX},33 ${RX + 6},37" stroke="${ink}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  } else if (brow === 'flat') {
    brows = `<line x1="${LX - 5}" y1="37.5" x2="${LX + 5}" y2="37.5" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`
      + `<line x1="${RX - 5}" y1="37.5" x2="${RX + 5}" y2="37.5" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`;
  } else if (brow === 'worried') {
    brows = `<path d="M${LX - 5},36 Q${LX},39 ${LX + 5},38" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`
      + `<path d="M${RX - 5},38 Q${RX},39 ${RX + 5},36" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  let mouthPath = '';
  if (mouth === 'smile') {
    mouthPath = `<path d="M42,57 Q50,63 58,57" stroke="${C.darkGray}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  } else if (mouth === 'bigsmile') {
    mouthPath = `<path d="M40,56 Q50,67 60,56 Q50,61 40,56 Z" fill="${C.darkGray}"/>`;
  } else if (mouth === 'frown') {
    mouthPath = `<path d="M42,61 Q50,55 58,61" stroke="${C.darkGray}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  } else if (mouth === 'frownsmall') {
    mouthPath = `<path d="M45.5,60 Q50,56.5 54.5,60" stroke="${C.darkGray}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  } else if (mouth === 'small') {
    mouthPath = `<line x1="46" y1="58" x2="54" y2="58" stroke="${C.darkGray}" stroke-width="2.2" stroke-linecap="round"/>`;
  } else {
    mouthPath = `<line x1="43" y1="58" x2="57" y2="58" stroke="${C.darkGray}" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  // 法令紋：八字形——上端窄(近鼻翼 x47/53)、往斜下外八張開(到 x41/59)
  const folds = fold
    ? `<path d="M47,54 Q44,58 41,63" stroke="${C.gray2}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`
      + `<path d="M53,54 Q56,58 59,63" stroke="${C.gray2}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`
    : '';
  return scaleFeatures(eyes + brows + mouthPath) + folds;
}

// ===== 髮型庫（皆可傳色；花白傳 C.gray2、白髮傳 C.gray1）=====
// 標準短髮／瀏海
function hairShort(color = C.hair) {
  return `<path d="M20,42 Q23,14 50,14 Q77,14 80,42 Q70,22 50,22 Q30,22 20,42 Z" fill="${color}"/>`;
}
// 西裝頭（側分、俐落上梳）
function hairSlick(color = C.hair) {
  return `<path d="M20,44 Q22,13 50,13 Q78,13 80,44 Q73,26 55,24 Q60,30 58,36 Q52,26 34,28 Q26,32 20,44 Z" fill="${color}"/>`;
}
// 長髮披肩（兩側垂到肩）
function hairLong(color = C.hair) {
  return `<path d="M16,70 Q12,30 50,12 Q88,30 84,70 Q80,58 74,54 Q78,34 50,22 Q22,34 26,54 Q20,58 16,70 Z" fill="${color}"/>`;
}
// 大波浪捲髮（垂肩+波浪邊）
function hairWave(color = C.hair) {
  return `<path d="M16,66 Q14,28 50,12 Q86,28 84,66 Q88,72 82,74 Q84,66 79,62 Q83,70 76,70 Q80,62 74,58 Q80,36 50,22 Q20,36 26,58 Q20,62 24,70 Q17,70 21,62 Q16,66 18,74 Q12,72 16,66 Z" fill="${color}"/>`;
}
// 爆炸頭（大蓬鬆圓）
function hairAfro(color = C.hair) {
  return `<circle cx="50" cy="34" r="30" fill="${color}"/>`
    + `<circle cx="26" cy="40" r="11" fill="${color}"/><circle cx="74" cy="40" r="11" fill="${color}"/>`
    + `<circle cx="34" cy="20" r="12" fill="${color}"/><circle cx="66" cy="20" r="12" fill="${color}"/><circle cx="50" cy="14" r="13" fill="${color}"/>`;
}
// 地中海禿（頭頂光、兩側與後方留髮）
function hairBald(color = C.gray2) {
  return `<path d="M18,50 Q18,36 24,30 Q24,44 30,48 Q26,40 30,34 L30,50 Z" fill="${color}"/>`
    + `<path d="M82,50 Q82,36 76,30 Q76,44 70,48 Q74,40 70,34 L70,50 Z" fill="${color}"/>`
    + `<path d="M24,50 Q22,46 22,42 Q35,44 50,44 Q65,44 78,42 Q78,46 76,50 Q50,47 24,50 Z" fill="${color}" opacity="0.85"/>`;
}
// 全禿（僅極少側髮＋反光）
function hairBaldShiny() {
  return `<path d="M22,50 Q21,44 23,40 Q26,45 30,47 Z" fill="${C.gray2}"/>`
    + `<path d="M78,50 Q79,44 77,40 Q74,45 70,47 Z" fill="${C.gray2}"/>`
    + `<ellipse cx="44" cy="26" rx="7" ry="4" fill="${C.white}" opacity="0.5"/>`;
}
// 髮圈綁的馬尾（後方，明顯垂在右側）
function ponytail(color = C.hair) {
  return `<path d="M72,24 Q95,30 93,58 Q92,78 82,74 Q88,58 82,44 Q78,34 68,32 Z" fill="${color}"/>`
    + `<ellipse cx="73" cy="30" rx="5" ry="4" fill="${C.secondary}"/>`; // 髮圈
}
// 髮飾（側邊小髮夾）
function hairclip(color = C.gray1) {
  return `<rect x="28" y="26" width="10" height="4" rx="2" fill="${color}" stroke="${C.line}" stroke-width="0.6"/>`;
}
// 眼鏡（shape: 'round' | 'square'）— 依眼距 gap 對齊放大後的眼睛
function glasses(shape = 'round', color = C.darkGray, gap = 9) {
  const LX = 50 - gap, RX = 50 + gap;
  let g;
  if (shape === 'square') {
    g = `<rect x="${LX - 6.5}" y="40" width="13" height="11" rx="1.5" fill="none" stroke="${color}" stroke-width="2"/>`
      + `<rect x="${RX - 6.5}" y="40" width="13" height="11" rx="1.5" fill="none" stroke="${color}" stroke-width="2"/>`
      + `<line x1="${LX + 6.5}" y1="45" x2="${RX - 6.5}" y2="45" stroke="${color}" stroke-width="2"/>`;
  } else {
    g = `<circle cx="${LX}" cy="46" r="7" fill="none" stroke="${color}" stroke-width="2"/>`
      + `<circle cx="${RX}" cy="46" r="7" fill="none" stroke="${color}" stroke-width="2"/>`
      + `<line x1="${LX + 7}" y1="46" x2="${RX - 7}" y2="46" stroke="${color}" stroke-width="2"/>`;
  }
  return scaleFeatures(g);
}
// 鬍子（八字鬍+下巴）— 與放大後的嘴巴對齊
function beard(color = C.hair) {
  return scaleFeatures(`<path d="M42,56 Q50,60 58,56" stroke="${color}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    + `<path d="M44,64 Q50,68 56,64" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>`);
}

// 向後相容別名
function hairFront(color = C.hair) { return hairShort(color); }

// 包裝：組出完整 <svg>
function wrapNpc(label, inner, size) {
  const w = (size * 0.5).toFixed(1);
  const h = size.toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="${w}" height="${h}" role="img" aria-label="${label}">${inner}</svg>`;
}

// 半身像：裁切至頭部+肩胸(y 6~112)，角色特徵(髮型/眼鏡/配件)更醒目、上下更精簡。
// 利用 SVG 預設 overflow:hidden，改 viewBox 即完成裁切。
export function npcBust(id, size = 96) {
  const full = npcSprite(id, size);
  const VB_Y = 6, VB_H = 106; // 從 y=6 起、高 106(到胸口)
  const w = ((size * 100) / VB_H).toFixed(1);
  return full
    .replace('viewBox="0 0 100 200"', `viewBox="0 ${VB_Y} 100 ${VB_H}"`)
    .replace(/width="[^"]*"/, `width="${w}"`)
    .replace(/height="[^"]*"/, `height="${size.toFixed(1)}"`);
}

// ------------------------------------------------------------------
// 11 位 NPC 個別繪製函式
// 每個函式回傳 { name, svg } ；svg 為 <svg> 內部的 inner content（不含 <svg> 標籤本身）
// ------------------------------------------------------------------

const NPC_BUILDERS = {
  // 沈技安：研發經理 — 圓框眼鏡、短髮+呆毛、好奇大眼、白襯衫
  shen() {
    const body = [
      legs(C.secondary, C.darkGray),
      arms(C.white, C.skin),
      torso(C.white),
      `<rect x="34" y="90" width="6" height="10" fill="${C.gray1}"/>`,
      `<line x1="37" y1="90" x2="37" y2="82" stroke="${C.darkGray}" stroke-width="1.5"/>`,
      headCircle(),
      hairShort(),
      `<path d="M50,14 Q55,3 60,9" stroke="${C.hair}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      face({ eye: 'huge', mouth: 'smile', gap: 8.5, eyeScale: 1.05 }),
      glasses('round', C.darkGray, 8.5),
    ].join('');
    return { name: '沈技安', body };
  },

  // 郝製造：廠長 — 禿頭反光、絡腮鬍、憨厚、工作服+工具帶
  hao() {
    const body = [
      legs(C.darkGray, C.black),
      arms(C.gray2, C.skin),
      torso(C.gray2),
      `<rect x="28" y="118" width="44" height="8" fill="${C.darkGray}"/>`,
      `<rect x="60" y="118" width="10" height="14" fill="${C.gray1}" stroke="${C.line}"/>`,
      headCircle(),
      hairBaldShiny(),
      face({ eye: 'big', mouth: 'smile', gap: 8, eyeScale: 1.05 }),
      beard(),
    ].join('');
    return { name: '郝製造', body };
  },

  // 賈推銷：業務總監 — 西裝頭、濃眉、開口大笑、領帶、招牌手勢
  jia() {
    const body = [
      legs(C.darkGray, C.black),
      arms(C.secondary, C.skin, { raisedRight: true }),
      torso(C.secondary),
      `<path d="M42,78 L50,90 L58,78 Z" fill="${C.white}"/>`,
      `<path d="M47,80 L53,80 L51,112 L49,112 Z" fill="${C.black}"/>`,
      headCircle(),
      hairSlick(),
      face({ eye: 'big', brow: 'thick', mouth: 'bigsmile', gap: 7, eyeScale: 1.0 }),
    ].join('');
    return { name: '賈推銷', body };
  },

  // 尤仁慈：人資經理 — 長髮披肩+髮飾、溫和大眼、開襟外套
  you() {
    const body = [
      legs(C.creamDark, C.darkGray),
      `<path d="M30,80 L22,132 L34,132 L38,80 Z" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>`,
      `<path d="M70,80 L78,132 L66,132 L62,80 Z" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>`,
      arms(C.cream, C.skin),
      torso(C.cream),
      hairLong(),
      headCircle(),
      hairLong(),
      face({ eye: 'huge', mouth: 'smile', gap: 7, eyeScale: 1.15 }),
      hairclip(),
    ].join('');
    return { name: '尤仁慈', body };
  },

  // 錢守成：財務長 — 地中海禿+花白、方框眼鏡、法令紋、嘴角下彎、背心+帳本
  qian() {
    const body = [
      legs(C.darkGray, C.black),
      arms(C.white, C.skin),
      torso(C.darkGray),
      `<path d="M42,78 L50,88 L58,78 Z" fill="${C.white}"/>`,
      `<line x1="50" y1="88" x2="50" y2="130" stroke="${C.gray2}" stroke-width="1.5"/>`,
      `<rect x="8" y="118" width="18" height="13" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>`,
      headCircle(),
      hairBald(C.gray2),
      face({ eye: 'big', mouth: 'frown', fold: true, gap: 8.5, eyeScale: 0.9 }),
      glasses('square', C.darkGray, 8.5),
      beard(C.gray2),
    ].join('');
    return { name: '錢守成', body };
  },

  // 董大川：董事長 — 花白西裝頭、濃眉、法令紋、威嚴、黑西裝+拐杖
  dong() {
    const body = [
      legs(C.black, C.black),
      arms(C.black, C.skin, { hideRight: true }),
      torso(C.black),
      `<path d="M40,84 L44,84 L42,90 Z" fill="${C.white}"/>`,
      `<line x1="82" y1="96" x2="82" y2="180" stroke="${C.darkGray}" stroke-width="3" stroke-linecap="round"/>`,
      `<path d="M82,96 Q90,92 89,102" stroke="${C.darkGray}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      `<circle cx="80" cy="110" r="6" fill="${C.skin}"/>`,
      headCircle(),
      hairSlick(C.gray1),
      face({ eye: 'big', brow: 'thick', mouth: 'frownsmall', fold: true, ink: C.gray2, gap: 8.5, eyeScale: 0.9 }),
    ].join('');
    return { name: '董大川', body };
  },

  // 田利息：銀行經理 — 西裝頭、精明微瞇眼、營業笑、領帶夾+公事包
  tian() {
    const body = [
      legs(C.darkGray, C.black),
      arms(C.secondary, C.skin, { hideLeft: true }),
      torso(C.secondary),
      `<path d="M42,78 L50,90 L58,78 Z" fill="${C.white}"/>`,
      `<path d="M47,80 L53,80 L51,110 L49,110 Z" fill="${C.darkGray}"/>`,
      `<line x1="46" y1="95" x2="54" y2="95" stroke="${C.gray1}" stroke-width="2"/>`,
      `<rect x="8" y="120" width="20" height="16" rx="2" fill="${C.darkGray}" stroke="${C.line}" stroke-width="1"/>`,
      `<rect x="14" y="116" width="8" height="5" fill="${C.darkGray}"/>`,
      `<circle cx="18" cy="128" r="6" fill="${C.skin}"/>`,
      headCircle(),
      hairSlick(),
      face({ eye: 'shrewd', mouth: 'smile', gap: 6.5, eyeScale: 0.95 }),
    ].join('');
    return { name: '田利息', body };
  },

  // 石原料：供應商老闆 — 短髮、絡腮鬍、憨厚圓眼、捲袖+搬箱
  shi() {
    const body = [
      legs(C.secondary, C.darkGray),
      `<rect x="16" y="86" width="14" height="20" rx="7" fill="${C.gray2}" stroke="${C.line}" stroke-width="1"/>`,
      `<rect x="70" y="86" width="14" height="20" rx="7" fill="${C.gray2}" stroke="${C.line}" stroke-width="1"/>`,
      `<circle cx="23" cy="118" r="7" fill="${C.skin}"/>`,
      `<circle cx="77" cy="118" r="7" fill="${C.skin}"/>`,
      torso(C.gray2),
      `<rect x="34" y="108" width="32" height="24" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1.5"/>`,
      `<line x1="50" y1="108" x2="50" y2="132" stroke="${C.line}"/>`,
      headCircle(),
      hairShort(),
      face({ eye: 'round', mouth: 'small', gap: 8.5, eyeScale: 1.1 }),
      // 下巴短鬍(位於嘴下方，不與嘴重疊，避免嘴巴看起來太厚)
      `<path d="M45,64 Q50,69 55,64" stroke="${C.hair}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ].join('');
    return { name: '石原料', body };
  },

  // 白買家：大客戶採購長 — 大波浪捲髮、精算微瞇眼、平板清單
  bai() {
    const body = [
      legs(C.darkGray, C.black),
      arms(C.secondary, C.skin, { hideLeft: true }),
      torso(C.secondary),
      `<rect x="6" y="94" width="20" height="26" rx="2" fill="${C.white}" stroke="${C.line}" stroke-width="1"/>`,
      `<line x1="9" y1="100" x2="23" y2="100" stroke="${C.gray1}" stroke-width="1.5"/>`,
      `<line x1="9" y1="106" x2="23" y2="106" stroke="${C.gray1}" stroke-width="1.5"/>`,
      `<line x1="9" y1="112" x2="23" y2="112" stroke="${C.gray1}" stroke-width="1.5"/>`,
      `<circle cx="16" cy="126" r="6" fill="${C.skin}"/>`,
      hairWave(),
      headCircle(),
      hairWave(),
      face({ eye: 'shrewd', mouth: 'neutral', gap: 7.5, eyeScale: 0.95 }),
    ].join('');
    return { name: '白買家', body };
  },

  // 官正義：政府科長 — 一字眉、中規中矩短髮、公事公辦、識別證
  guan() {
    const body = [
      legs(C.darkGray, C.black),
      arms(C.secondary, C.skin),
      torso(C.secondary),
      `<path d="M42,78 L50,88 L58,78 Z" fill="${C.white}"/>`,
      `<line x1="50" y1="86" x2="50" y2="104" stroke="${C.line}" stroke-width="1.5"/>`,
      `<rect x="44" y="104" width="12" height="16" rx="1" fill="${C.white}" stroke="${C.line}" stroke-width="1"/>`,
      `<rect x="46" y="107" width="8" height="6" fill="${C.gray1}"/>`,
      headCircle(),
      hairShort(),
      face({ eye: 'big', brow: 'flat', mouth: 'neutral', gap: 8, eyeScale: 0.95 }),
      glasses('round', C.darkGray, 8),
    ].join('');
    return { name: '官正義', body };
  },

  // 麻雀姐：財經記者 — 綁馬尾、洋裝、機靈大眼、開口笑
  maque() {
    const body = [
      legs(C.creamDark, C.darkGray),
      arms(C.cream, C.skin),
      torso(C.cream),
      // 洋裝 A 字裙擺(從腰部外擴，蓋住大腿)
      `<path d="M28,120 L72,120 L82,152 L18,152 Z" fill="${C.cream}" stroke="${C.line}" stroke-width="1"/>`,
      ponytail(),
      headCircle(),
      hairShort(),
      face({ eye: 'huge', mouth: 'bigsmile', gap: 6.5, eyeScale: 1.15 }),
    ].join('');
    return { name: '麻雀姐', body };
  },
};

export const NPC_IDS = [
  'shen', 'hao', 'jia', 'you', 'qian', 'dong', 'tian', 'shi', 'bai', 'guan', 'maque',
];

// 找不到對應 id 時的備用泛用剪影（灰階，同一套骨架）在 npcSprite 內直接組裝

export function npcSprite(id, size = 120) {
  const builder = NPC_BUILDERS[id];
  if (!builder) {
    const body = [
      legs(C.gray1, C.gray2),
      arms(C.gray1, C.gray2),
      torso(C.gray1),
      headCircle(C.gray1),
      face({ eye: 'normal', mouth: 'neutral', ink: C.gray2 }),
    ].join('');
    return wrapNpc('未知角色', body, size);
  }
  const { name, body } = builder();
  return wrapNpc(name, body, size);
}

// ------------------------------------------------------------------
// 物件 SVG（viewBox 0 0 100 100）
// ------------------------------------------------------------------

function wrapObj(inner, size) {
  const s = size.toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${s}" height="${s}" role="img" aria-label="辦公室物件">${inner}</svg>`;
}

const OBJECT_BUILDERS = {
  // 辦公桌
  desk() {
    return `
<rect x="10" y="40" width="80" height="8" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>
<rect x="16" y="48" width="6" height="30" fill="${C.gray2}"/>
<rect x="78" y="48" width="6" height="30" fill="${C.gray2}"/>
<rect x="40" y="50" width="24" height="20" fill="${C.cream}" stroke="${C.line}" stroke-width="1"/>
<line x1="40" y1="60" x2="64" y2="60" stroke="${C.line}" stroke-width="1"/>`;
  },

  // 電腦螢幕
  monitor() {
    return `
<rect x="24" y="18" width="52" height="36" rx="2" fill="${C.darkGray}" stroke="${C.line}" stroke-width="1"/>
<rect x="29" y="23" width="42" height="26" fill="${C.gray1}"/>
<rect x="46" y="54" width="8" height="12" fill="${C.gray2}"/>
<rect x="36" y="66" width="28" height="6" rx="2" fill="${C.gray2}"/>`;
  },

  // 盆栽
  plant() {
    return `
<path d="M38,70 L62,70 L58,92 L42,92 Z" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>
<path d="M50,72 Q30,60 34,36 Q46,46 50,64 Z" fill="${C.leaf}"/>
<path d="M50,72 Q70,60 66,36 Q54,46 50,64 Z" fill="#7c8478"/>
<path d="M50,72 Q50,50 50,28 Q56,44 50,64 Z" fill="#5a6259"/>`;
  },

  // 文件櫃
  cabinet() {
    return `
<rect x="26" y="14" width="48" height="76" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>
<rect x="30" y="20" width="40" height="20" fill="${C.cream}" stroke="${C.line}" stroke-width="1"/>
<rect x="30" y="44" width="40" height="20" fill="${C.cream}" stroke="${C.line}" stroke-width="1"/>
<rect x="30" y="68" width="40" height="16" fill="${C.cream}" stroke="${C.line}" stroke-width="1"/>
<circle cx="64" cy="30" r="1.8" fill="${C.gray2}"/>
<circle cx="64" cy="54" r="1.8" fill="${C.gray2}"/>
<circle cx="64" cy="76" r="1.8" fill="${C.gray2}"/>`;
  },

  // 影印機
  printer() {
    return `
<rect x="16" y="36" width="68" height="40" rx="3" fill="${C.gray1}" stroke="${C.line}" stroke-width="1"/>
<rect x="24" y="20" width="52" height="20" rx="2" fill="${C.gray2}" stroke="${C.line}" stroke-width="1"/>
<rect x="30" y="70" width="40" height="10" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>
<rect x="60" y="44" width="14" height="10" fill="${C.darkGray}"/>`;
  },

  // 馬克杯
  cup() {
    return `
<path d="M30,34 L70,34 L66,78 Q50,84 34,78 Z" fill="${C.white}" stroke="${C.line}" stroke-width="1.5"/>
<path d="M70,42 Q86,44 84,58 Q82,68 68,66" fill="none" stroke="${C.line}" stroke-width="4"/>
<ellipse cx="50" cy="34" rx="20" ry="5" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>`;
  },

  // 辦公椅（側視：椅背+座面+氣壓桿+五爪腳輪）
  chair() {
    return `
<rect x="34" y="20" width="10" height="40" rx="4" fill="${C.darkGray}" stroke="${C.line}" stroke-width="1"/>
<rect x="34" y="52" width="34" height="10" rx="4" fill="${C.gray2}" stroke="${C.line}" stroke-width="1"/>
<rect x="48" y="62" width="6" height="18" fill="${C.gray1}"/>
<path d="M30,84 L72,84 L66,80 L36,80 Z" fill="${C.gray2}" stroke="${C.line}" stroke-width="1"/>
<circle cx="32" cy="85" r="3" fill="${C.darkGray}"/>
<circle cx="70" cy="85" r="3" fill="${C.darkGray}"/>`;
  },

  // 桌上電話（機身+聽筒+按鍵+線）
  phone() {
    return `
<rect x="24" y="52" width="52" height="26" rx="4" fill="${C.darkGray}" stroke="${C.line}" stroke-width="1"/>
<rect x="46" y="58" width="24" height="14" rx="2" fill="${C.gray1}"/>
<circle cx="32" cy="60" r="1.6" fill="${C.gray1}"/><circle cx="38" cy="60" r="1.6" fill="${C.gray1}"/>
<circle cx="32" cy="66" r="1.6" fill="${C.gray1}"/><circle cx="38" cy="66" r="1.6" fill="${C.gray1}"/>
<path d="M22,48 Q22,42 30,42 L70,42 Q78,42 78,48 L72,48 Q72,46 68,46 L32,46 Q28,46 28,48 Z" fill="${C.secondary}" stroke="${C.line}" stroke-width="1"/>
<path d="M78,54 Q88,58 84,72" fill="none" stroke="${C.line}" stroke-width="2"/>`;
  },

  // 時鐘（掛牆圓鐘）
  clock() {
    return `
<circle cx="50" cy="50" r="34" fill="${C.white}" stroke="${C.darkGray}" stroke-width="3.5"/>
<circle cx="50" cy="50" r="34" fill="none" stroke="${C.line}" stroke-width="1"/>
<line x1="50" y1="50" x2="50" y2="31" stroke="${C.black}" stroke-width="4.5" stroke-linecap="round"/>
<line x1="50" y1="50" x2="73" y2="39" stroke="${C.black}" stroke-width="3" stroke-linecap="round"/>
<circle cx="50" cy="22" r="2" fill="${C.gray2}"/><circle cx="78" cy="50" r="2" fill="${C.gray2}"/>
<circle cx="50" cy="78" r="2" fill="${C.gray2}"/><circle cx="22" cy="50" r="2" fill="${C.gray2}"/>
<circle cx="50" cy="50" r="2.8" fill="${C.black}"/>`;
  },

  // 文件夾（兩本立著的資料夾+標籤）
  folder() {
    return `
<rect x="30" y="30" width="16" height="52" rx="1" fill="${C.secondary}" stroke="${C.line}" stroke-width="1"/>
<rect x="47" y="26" width="16" height="56" rx="1" fill="${C.gray2}" stroke="${C.line}" stroke-width="1"/>
<rect x="63" y="32" width="14" height="50" rx="1" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>
<rect x="33" y="38" width="10" height="6" fill="${C.cream}"/>
<rect x="50" y="34" width="10" height="6" fill="${C.white}"/>
<rect x="65" y="40" width="9" height="6" fill="${C.white}"/>`;
  },

  // 屏風／隔板（三折辦公隔屏，側斜擺放）
  screen() {
    return `
<path d="M12,30 L40,24 L40,86 L12,92 Z" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>
<path d="M40,24 L68,30 L68,86 L40,86 Z" fill="${C.cream}" stroke="${C.line}" stroke-width="1"/>
<path d="M68,30 L88,26 L88,84 L68,86 Z" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>
<line x1="40" y1="24" x2="40" y2="86" stroke="${C.line}" stroke-width="1"/>
<line x1="68" y1="30" x2="68" y2="86" stroke="${C.line}" stroke-width="1"/>`;
  },
};

export function objectSprite(name, size = 80) {
  const builder = OBJECT_BUILDERS[name];
  if (!builder) return '';
  return wrapObj(builder(), size);
}
