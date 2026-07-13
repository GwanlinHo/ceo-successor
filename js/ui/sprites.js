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

// 軀幹（可自訂寬度以呈現略胖/略挺的差異）
function torso(shirt = C.cream) {
  return `<rect x="30" y="78" width="40" height="58" rx="16" fill="${shirt}" stroke="${C.line}" stroke-width="1"/>`;
}

// 雙臂：raisedRight=true 時右手舉起（打招呼/比手勢用）
// hideRight / hideLeft 可隱藏該側手臂（用於背手、抱物品等姿勢由呼叫端自行畫手）
function arms(sleeve = C.cream, skin = C.skin, opts = {}) {
  const { raisedRight = false, hideLeft = false, hideRight = false } = opts;
  let left = '';
  let right = '';
  if (!hideLeft) {
    left = `<rect x="16" y="86" width="14" height="38" rx="7" fill="${sleeve}" stroke="${C.line}" stroke-width="1"/><circle cx="23" cy="128" r="7" fill="${skin}"/>`;
  }
  if (!hideRight) {
    if (raisedRight) {
      right = `<g transform="rotate(-35 74 118)"><rect x="67" y="86" width="14" height="38" rx="7" fill="${sleeve}" stroke="${C.line}" stroke-width="1"/><circle cx="74" cy="82" r="7" fill="${skin}"/></g>`;
    } else {
      right = `<rect x="70" y="86" width="14" height="38" rx="7" fill="${sleeve}" stroke="${C.line}" stroke-width="1"/><circle cx="77" cy="128" r="7" fill="${skin}"/>`;
    }
  }
  return left + right;
}

// 頭部底色圓
function headCircle(skin = C.skin) {
  return `<circle cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}" fill="${skin}" stroke="${C.line}" stroke-width="1"/>`;
}

// 五官：eye = 'normal' | 'narrow' | 'round'；mouth = 'smile' | 'neutral' | 'open'
function face(opts = {}) {
  const { eye = 'normal', mouth = 'smile', ink = C.hair } = opts;
  let eyes = '';
  if (eye === 'narrow') {
    eyes = `<rect x="39" y="44.5" width="7" height="2" rx="1" fill="${ink}"/><rect x="54" y="44.5" width="7" height="2" rx="1" fill="${ink}"/>`;
  } else if (eye === 'round') {
    eyes = `<circle cx="42" cy="46" r="3.2" fill="${ink}"/><circle cx="58" cy="46" r="3.2" fill="${ink}"/>`;
  } else {
    eyes = `<circle cx="42" cy="46" r="2.4" fill="${ink}"/><circle cx="58" cy="46" r="2.4" fill="${ink}"/>`;
  }
  let mouthPath = '';
  if (mouth === 'smile') {
    mouthPath = `<path d="M41,57 Q50,63 59,57" stroke="${C.darkGray}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else if (mouth === 'open') {
    mouthPath = `<path d="M42,56 Q50,65 58,56 Q50,60 42,56 Z" fill="${C.darkGray}"/>`;
  } else {
    mouthPath = `<line x1="43" y1="58" x2="57" y2="58" stroke="${C.darkGray}" stroke-width="2" stroke-linecap="round"/>`;
  }
  return eyes + mouthPath;
}

// 標準瀏海／短髮（正面，蓋住頭頂）
function hairFront(color = C.hair) {
  return `<path d="M20,42 Q23,14 50,14 Q77,14 80,42 Q70,22 50,22 Q30,22 20,42 Z" fill="${color}"/>`;
}

// 包裝：組出完整 <svg>
function wrapNpc(label, inner, size) {
  const w = (size * 0.5).toFixed(1);
  const h = size.toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="${w}" height="${h}" role="img" aria-label="${label}">${inner}</svg>`;
}

// ------------------------------------------------------------------
// 11 位 NPC 個別繪製函式
// 每個函式回傳 { name, svg } ；svg 為 <svg> 內部的 inner content（不含 <svg> 標籤本身）
// ------------------------------------------------------------------

const NPC_BUILDERS = {
  // 沈技安：研發經理 — 圓框眼鏡、白襯衫、呆毛、書卷氣
  shen() {
    const body = [
      legs(C.secondary, C.darkGray),
      arms(C.white, C.skin),
      torso(C.white),
      headCircle(),
      face({ eye: 'normal', mouth: 'neutral' }),
      hairFront(),
      `<path d="M50,14 Q55,3 60,9" stroke="${C.hair}" stroke-width="2" fill="none" stroke-linecap="round"/>`, // 呆毛
      `<circle cx="42" cy="46" r="7" fill="none" stroke="${C.darkGray}" stroke-width="2"/>`,
      `<circle cx="58" cy="46" r="7" fill="none" stroke="${C.darkGray}" stroke-width="2"/>`,
      `<line x1="49" y1="46" x2="51" y2="46" stroke="${C.darkGray}" stroke-width="2"/>`,
      `<rect x="34" y="90" width="6" height="10" fill="${C.gray1}"/>`, // 口袋筆
      `<line x1="37" y1="90" x2="37" y2="82" stroke="${C.darkGray}" stroke-width="1.5"/>`,
    ].join('');
    return { name: '沈技安', body };
  },

  // 郝製造：廠長 — 灰色安全帽、工作服、工具帶
  hao() {
    const body = [
      legs(C.darkGray, C.black),
      arms(C.gray2, C.skin),
      torso(C.gray2),
      `<rect x="28" y="118" width="44" height="8" fill="${C.darkGray}"/>`, // 工具帶
      `<rect x="60" y="118" width="10" height="14" fill="${C.gray1}" stroke="${C.line}"/>`, // 工具袋
      headCircle(),
      face({ eye: 'normal', mouth: 'neutral' }),
      `<path d="M17,44 Q50,3 83,44 Z" fill="${C.gray1}" stroke="${C.line}" stroke-width="1"/>`, // 安全帽圓頂
      `<rect x="13" y="40" width="74" height="7" rx="3.5" fill="${C.gray1}" stroke="${C.line}" stroke-width="1"/>`, // 帽緣
    ].join('');
    return { name: '郝製造', body };
  },

  // 賈推銷：業務總監 — 西裝領帶、俐落髮型、笑臉、招牌手勢
  jia() {
    const body = [
      legs(C.darkGray, C.black),
      arms(C.secondary, C.skin, { raisedRight: true }),
      torso(C.secondary),
      `<path d="M42,78 L50,90 L58,78 Z" fill="${C.white}"/>`, // 白襯衫領口
      `<path d="M47,80 L53,80 L51,112 L49,112 Z" fill="${C.black}"/>`, // 領帶
      headCircle(),
      face({ eye: 'normal', mouth: 'open' }),
      hairFront(),
      `<path d="M20,40 Q40,18 50,20 Q40,26 22,42 Z" fill="${C.hair}"/>`, // 側分俐落感
    ].join('');
    return { name: '賈推銷', body };
  },

  // 尤仁慈：人資經理 — 包頭、開襟外套、親切表情
  you() {
    const body = [
      legs(C.creamDark, C.darkGray),
      `<path d="M30,80 L22,132 L34,132 L38,80 Z" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>`, // 外套左片
      `<path d="M70,80 L78,132 L66,132 L62,80 Z" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>`, // 外套右片
      arms(C.cream, C.skin),
      torso(C.cream),
      headCircle(),
      face({ eye: 'normal', mouth: 'smile' }),
      hairFront(),
      `<circle cx="50" cy="17" r="7" fill="${C.hair}"/>`, // 包頭
    ].join('');
    return { name: '尤仁慈', body };
  },

  // 錢守成：財務長 — 年長、背心、方框眼鏡、夾筆、帳本
  qian() {
    const body = [
      legs(C.darkGray, C.black),
      arms(C.white, C.skin),
      torso(C.darkGray), // 背心
      `<path d="M42,78 L50,88 L58,78 Z" fill="${C.white}"/>`,
      `<line x1="50" y1="88" x2="50" y2="130" stroke="${C.gray2}" stroke-width="1.5"/>`, // 背心中線／釦子
      `<rect x="8" y="118" width="18" height="13" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1"/>`, // 帳本
      headCircle(),
      face({ eye: 'normal', mouth: 'neutral' }),
      `<path d="M20,42 Q23,14 50,14 Q77,14 80,42 Q70,22 50,22 Q30,22 20,42 Z" fill="${C.gray2}"/>`, // 灰髮
      `<rect x="35" y="41" width="12" height="9" rx="1" fill="none" stroke="${C.darkGray}" stroke-width="2"/>`, // 方框眼鏡
      `<rect x="53" y="41" width="12" height="9" rx="1" fill="none" stroke="${C.darkGray}" stroke-width="2"/>`,
      `<line x1="47" y1="45" x2="53" y2="45" stroke="${C.darkGray}" stroke-width="2"/>`,
      `<path d="M44,55 Q50,58 56,55" stroke="${C.hair}" stroke-width="2" fill="none" stroke-linecap="round"/>`, // 鬍
    ].join('');
    return { name: '錢守成', body };
  },

  // 董大川：董事長 — 年長、白髮、體面西裝、背手拄杖、氣派
  dong() {
    const body = [
      legs(C.black, C.black),
      arms(C.black, C.skin, { hideRight: true }),
      torso(C.black),
      `<path d="M40,84 L44,84 L42,90 Z" fill="${C.white}"/>`, // 口袋巾
      `<line x1="82" y1="96" x2="82" y2="180" stroke="${C.darkGray}" stroke-width="3" stroke-linecap="round"/>`, // 拐杖
      `<path d="M82,96 Q90,92 89,102" stroke="${C.darkGray}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      `<circle cx="80" cy="110" r="6" fill="${C.skin}"/>`, // 扶杖的手
      headCircle(),
      face({ eye: 'normal', mouth: 'smile' }),
      `<path d="M20,42 Q23,14 50,14 Q77,14 80,42 Q70,22 50,22 Q30,22 20,42 Z" fill="${C.gray1}"/>`, // 白髮
      `<path d="M37,37 Q41,35 45,37" stroke="${C.gray2}" stroke-width="2" fill="none" stroke-linecap="round"/>`, // 眉
      `<path d="M55,37 Q59,35 63,37" stroke="${C.gray2}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ].join('');
    return { name: '董大川', body };
  },

  // 田利息：銀行經理 — 西裝、領帶夾、公事包、精明營業笑容
  tian() {
    const body = [
      legs(C.darkGray, C.black),
      arms(C.secondary, C.skin, { hideLeft: true }),
      torso(C.secondary),
      `<path d="M42,78 L50,90 L58,78 Z" fill="${C.white}"/>`,
      `<path d="M47,80 L53,80 L51,110 L49,110 Z" fill="${C.darkGray}"/>`, // 領帶
      `<line x1="46" y1="95" x2="54" y2="95" stroke="${C.gray1}" stroke-width="2"/>`, // 領帶夾
      `<rect x="8" y="120" width="20" height="16" rx="2" fill="${C.darkGray}" stroke="${C.line}" stroke-width="1"/>`, // 公事包
      `<rect x="14" y="116" width="8" height="5" fill="${C.darkGray}"/>`,
      `<circle cx="18" cy="128" r="6" fill="${C.skin}"/>`, // 提包的手
      headCircle(),
      face({ eye: 'normal', mouth: 'smile' }),
      hairFront(),
    ].join('');
    return { name: '田利息', body };
  },

  // 石原料：供應商老闆 — 樸實、捲袖夾克、憨厚、搬箱手勢
  shi() {
    const body = [
      legs(C.secondary, C.darkGray),
      `<rect x="16" y="86" width="14" height="20" rx="7" fill="${C.gray2}" stroke="${C.line}" stroke-width="1"/>`, // 捲袖左臂（短）
      `<rect x="70" y="86" width="14" height="20" rx="7" fill="${C.gray2}" stroke="${C.line}" stroke-width="1"/>`, // 捲袖右臂（短）
      `<circle cx="23" cy="118" r="7" fill="${C.skin}"/>`,
      `<circle cx="77" cy="118" r="7" fill="${C.skin}"/>`,
      torso(C.gray2),
      `<rect x="34" y="108" width="32" height="24" fill="${C.creamDark}" stroke="${C.line}" stroke-width="1.5"/>`, // 搬的箱子
      `<line x1="50" y1="108" x2="50" y2="132" stroke="${C.line}"/>`,
      headCircle(),
      face({ eye: 'normal', mouth: 'smile' }),
      hairFront(),
      `<path d="M44,55 Q50,58 56,55" stroke="${C.hair}" stroke-width="2" fill="none" stroke-linecap="round"/>`, // 鬍
    ].join('');
    return { name: '石原料', body };
  },

  // 白買家：大客戶採購長 — 幹練、平板/清單、精算表情，短髮俐落
  bai() {
    const body = [
      legs(C.darkGray, C.black),
      arms(C.secondary, C.skin, { hideLeft: true }),
      torso(C.secondary),
      `<rect x="6" y="94" width="20" height="26" rx="2" fill="${C.white}" stroke="${C.line}" stroke-width="1"/>`, // 平板
      `<line x1="9" y1="100" x2="23" y2="100" stroke="${C.gray1}" stroke-width="1.5"/>`,
      `<line x1="9" y1="106" x2="23" y2="106" stroke="${C.gray1}" stroke-width="1.5"/>`,
      `<line x1="9" y1="112" x2="23" y2="112" stroke="${C.gray1}" stroke-width="1.5"/>`,
      `<circle cx="16" cy="126" r="6" fill="${C.skin}"/>`, // 拿平板的手
      headCircle(),
      face({ eye: 'narrow', mouth: 'neutral' }),
      `<path d="M20,44 Q22,14 50,14 Q78,14 80,44 L80,60 Q74,52 74,44 Q70,20 50,20 Q30,20 26,44 Q26,52 20,60 Z" fill="${C.hair}"/>`, // 俐落短鮑伯
    ].join('');
    return { name: '白買家', body };
  },

  // 官正義：政府科長 — 公務員感、識別證掛牌、公事公辦
  guan() {
    const body = [
      legs(C.darkGray, C.black),
      arms(C.secondary, C.skin),
      torso(C.secondary),
      `<path d="M42,78 L50,88 L58,78 Z" fill="${C.white}"/>`,
      headCircle(),
      face({ eye: 'normal', mouth: 'neutral' }),
      hairFront(),
      `<path d="M38,38 Q42,36.5 46,38" stroke="${C.hair}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`, // 一字眉
      `<path d="M54,38 Q58,36.5 62,38" stroke="${C.hair}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
      `<line x1="50" y1="86" x2="50" y2="104" stroke="${C.line}" stroke-width="1.5"/>`, // 識別證掛繩
      `<rect x="44" y="104" width="12" height="16" rx="1" fill="${C.white}" stroke="${C.line}" stroke-width="1"/>`, // 識別證
      `<rect x="46" y="107" width="8" height="6" fill="${C.gray1}"/>`,
    ].join('');
    return { name: '官正義', body };
  },

  // 麻雀姐：財經記者 — 馬尾、掛相機、機靈表情
  maque() {
    const body = [
      legs(C.secondary, C.darkGray),
      arms(C.creamDark, C.skin),
      torso(C.creamDark),
      `<path d="M74,28 Q88,34 83,56 Q78,50 74,38 Z" fill="${C.hair}"/>`, // 馬尾（先畫在頭後方位置）
      headCircle(),
      face({ eye: 'round', mouth: 'open' }),
      hairFront(),
      `<line x1="40" y1="80" x2="34" y2="90" stroke="${C.line}" stroke-width="1.5"/>`, // 相機背帶
      `<line x1="60" y1="80" x2="66" y2="90" stroke="${C.line}" stroke-width="1.5"/>`,
      `<rect x="40" y="90" width="20" height="14" rx="2" fill="${C.darkGray}" stroke="${C.line}" stroke-width="1"/>`, // 相機機身
      `<circle cx="50" cy="97" r="6" fill="${C.gray2}" stroke="${C.line}" stroke-width="1"/>`, // 鏡頭
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
};

export function objectSprite(name, size = 80) {
  const builder = OBJECT_BUILDERS[name];
  if (!builder) return '';
  return wrapObj(builder(), size);
}
