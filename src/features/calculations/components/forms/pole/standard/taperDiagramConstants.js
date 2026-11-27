// src/features/calculations/components/forms/pole/standard/taperDiagramConstants.js
import STANDARD_POLE_DATA from "../../../../data/specStandardPole.json";

// === IMAGES (12 cases: 6 pole types × 2 ground positions) ===
export const DIAGRAM_IMAGE_MAP = {
  IS: {
    onGL: "/images/IS_OnGL.svg",
    underGL: "/images/IS_UnderGL.svg",
  },
  IA: {
    onGL: "/images/IA_OnGL.svg",
    underGL: "/images/IA_UnderGL.svg",
  },
  LS: {
    onGL: "/images/LS_OnGL.svg",
    underGL: "/images/LS_UnderGL.svg",
  },
  LA: {
    onGL: "/images/LA_OnGL.svg",
    underGL: "/images/LA_UnderGL.svg",
  },
  TS: {
    onGL: "/images/TS_OnGL.svg",
    underGL: "/images/TS_UnderGL.svg",
  },
  TA: {
    onGL: "/images/TA_OnGL.svg",
    underGL: "/images/TA_UnderGL.svg",
  },
};

// Embedment variant (used when !isBaseplate) for each pole type
export const EMBED_IMAGE_MAP = Object.fromEntries(
  Object.keys(DIAGRAM_IMAGE_MAP).map((type) => [
    type,
    `/images/${type}_Embedment.svg`,
  ]),
);

export const ALL_DIAGRAM_IMAGES = [
  ...Object.values(DIAGRAM_IMAGE_MAP).flatMap((byGround) =>
    Object.values(byGround),
  ),
  ...Object.values(EMBED_IMAGE_MAP),
];

export const DEFAULT_HEIGHT_GAP_PX = 8;
export const BASE_DIMENSION_MM = 750;
export const UNDER_GL_DEPTH_MM = 300;
export const ARM_TOP_DIMENSION_MM = 300;

export const DIAGRAM_LABEL_LAYOUT = {
  "IS.onGL": {
    viewBox: { width: 315, height: 771 },
    heightLineX: 11.7,
    heightGap: 7,
    positions: {
      totalHeight: { x: -3, y: 384, anchor: "vertical" },
      upperDiameter: { x: 194.2, y: 42.05, anchor: "bottom-left" },
      poleSpec: { x: 184.6, y: 347.4, anchor: "leader" },
      baseDimension: { x: 61, y: 725, anchor: "vertical" },
      lowerDiameter: { x: 173.2, y: 718, anchor: "bottom-left" },
    },
  },
  "IS.underGL": {
    viewBox: { width: 363, height: 771 },
    heightLineX: 8,
    heightGap: 7,
    positions: {
      totalHeight: { x: -7, y: 384, anchor: "vertical" },
      upperDiameter: { x: 243, y: 42.5, anchor: "bottom-left" },
      poleSpec: { x: 232.6, y: 347.3, anchor: "leader" },
      aboveGroundHeight: { x: 45, y: 371, anchor: "vertical" },
      baseDimension: { x: 110, y: 700, anchor: "vertical" },
      lowerDiameter: { x: 221.5, y: 695, anchor: "bottom-left" },
      underGroundDepth: { x: 45, y: 741.5, anchor: "vertical" },
    },
  },
  "IA.onGL": {
    viewBox: { width: 370, height: 772 },
    heightLineX: 7.75,
    heightGap: 7,
    positions: {
      totalHeight: { x: -7.5, y: 384.55, anchor: "vertical" },
      diameter1: { x: 248.75, y: 42.5, anchor: "bottom-left" },
      diameter2: { x: 248.75, y: 181.05, anchor: "bottom-left" },
      poleSpec: { x: 240.15, y: 346.3, anchor: "leader" },
      diameter3: { x: 228.25, y: 584, anchor: "bottom-left" },
      diameter4: { x: 228.25, y: 719.05, anchor: "bottom-left" },
      topSectionLength: { x: 46.25, y: 77.05, anchor: "vertical" },
      taperSectionLength: { x: 46.25, y: 384.55, anchor: "vertical" },
      bottomSectionLength: { x: 46.25, y: 692.05, anchor: "vertical" },
      baseDimension: { x: 116.5, y: 726.55, anchor: "vertical" },
    },
  },
  "IA.underGL": {
    viewBox: { width: 364, height: 772 },
    heightLineX: 8,
    heightGap: 7,
    textsFromOnGL: true,
    positions: {
      totalHeight: { x: -6.5, y: 386.2, anchor: "vertical" },
      diameter1: { x: 244, y: 43.5, anchor: "bottom-left" },
      diameter2: { x: 244, y: 181.5, anchor: "bottom-left" },
      poleSpec: { x: 234, y: 348.3, anchor: "leader" },
      diameter3: { x: 223.5, y: 558.5, anchor: "bottom-left" },
      diameter4: { x: 223.5, y: 696, anchor: "bottom-left" },
      topSectionLength: { x: 47, y: 78, anchor: "vertical" },
      taperSectionLength: { x: 47, y: 372.2, anchor: "vertical" },
      bottomSectionLength: { x: 47, y: 667.2, anchor: "vertical" },
      underGroundDepth: { x: 47, y: 742.5, anchor: "vertical" },
      baseDimension: { x: 110, y: 702.5, anchor: "vertical" },
    },
  },
  "LS.onGL": {
    viewBox: { width: 385, height: 868 },
    heightLineX: 8.85,
    positions: {
      totalHeight: { x: -6.5, y: 478, anchor: "vertical" },
      armTopDimension: { x: 225.8, y: 3.95, anchor: "bottom-center" },
      armLength: { x: 192, y: 37.95, anchor: "bottom-right" },
      upperDiameter: { x: 280.35, y: 54, anchor: "bottom-left" },
      armSpec: { x: 254.5, y: 139, anchor: "leader", centered: true },
      poleSpec: { x: 238.25, y: 443, anchor: "leader" },
      poleTopOffset: { x: 46.5, y: 81.65, anchor: "vertical" },
      armHeight: { x: 46.5, y: 484.95, anchor: "vertical" },
      baseDimension: { x: 112, y: 822.45, anchor: "vertical" },
      lowerDiameter: { x: 226, y: 813.95, anchor: "bottom-left" },
    },
  },
  "LS.underGL": {
    viewBox: { width: 384, height: 868 },
    heightLineX: 8.05,
    textsFromOnGL: true,
    positions: {
      totalHeight: { x: -7, y: 474, anchor: "vertical" },
      armTopDimension: { x: 223.5, y: 3.95, anchor: "bottom-center" },
      armLength: { x: 191, y: 37.95, anchor: "bottom-right" },
      upperDiameter: { x: 279.55, y: 54, anchor: "bottom-left" },
      armSpec: { x: 252.5, y: 139, anchor: "leader", centered: true },
      poleSpec: { x: 238.2, y: 442.95, anchor: "leader" },
      poleTopOffset: { x: 46, y: 82.65, anchor: "vertical" },
      armHeight: { x: 46, y: 472.45, anchor: "vertical" },
      underGroundDepth: { x: 46, y: 837.8, anchor: "vertical" },
      baseDimension: { x: 112, y: 799.45, anchor: "vertical" },
      lowerDiameter: { x: 224.55, y: 792.2, anchor: "bottom-left" },
    },
  },
  "LA.onGL": {
    viewBox: { width: 386, height: 868 },
    heightLineX: 8.2,
    positions: {
      totalHeight: { x: -7.5, y: 481, anchor: "vertical" },
      armTopDimension: { x: 226.5, y: 3.35, anchor: "bottom-center" },
      armLength: { x: 193.5, y: 38.35, anchor: "bottom-right" },
      diameter1: { x: 281, y: 55, anchor: "bottom-left" },
      armSpec: { x: 256.8, y: 140, anchor: "leader", centered: true },
      diameter2: { x: 245.2, y: 306.5, anchor: "bottom-left" },
      poleSpec: { x: 239, y: 446.4, anchor: "leader" },
      diameter3: { x: 226.7, y: 680, anchor: "bottom-left" },
      diameter4: { x: 226.7, y: 815, anchor: "bottom-left" },
      poleTopOffset: { x: 45.7, y: 83.2, anchor: "vertical" },
      topSectionLength: { x: 45.7, y: 193.35, anchor: "vertical" },
      taperSectionLength: { x: 45.7, y: 495.85, anchor: "vertical" },
      bottomSectionLength: { x: 45.7, y: 788.34, anchor: "vertical" },
      baseDimension: { x: 115, y: 822.85, anchor: "vertical" },
    },
  },
  "LA.underGL": {
    viewBox: { width: 385, height: 868 },
    heightLineX: 8.05,
    textsFromOnGL: true,
    positions: {
      totalHeight: { x: -7.5, y: 480.1, anchor: "vertical" },
      armTopDimension: { x: 226, y: 3.35, anchor: "bottom-center" },
      armLength: { x: 193, y: 38.35, anchor: "bottom-right" },
      diameter1: { x: 279, y: 54, anchor: "bottom-left" },
      armSpec: { x: 256, y: 140, anchor: "leader", centered: true },
      diameter2: { x: 243, y: 278.6, anchor: "bottom-left" },
      poleSpec: { x: 238.5, y: 442.1, anchor: "leader" },
      diameter3: { x: 228, y: 656.1, anchor: "bottom-left" },
      diameter4: { x: 228, y: 793.1, anchor: "bottom-left" },
      poleTopOffset: { x: 43.7, y: 81.2, anchor: "vertical" },
      topSectionLength: { x: 43.7, y: 177.6, anchor: "vertical" },
      taperSectionLength: { x: 43.7, y: 468.1, anchor: "vertical" },
      bottomSectionLength: { x: 43.7, y: 762.1, anchor: "vertical" },
      underGroundDepth: { x: 43.7, y: 836.6, anchor: "vertical" },
      baseDimension: { x: 112, y: 797.6, anchor: "vertical" },
    },
  },
  "TS.onGL": {
    viewBox: { width: 386, height: 871 },
    heightLineX: 8,
    positions: {
      totalHeight: { x: -7, y: 484, anchor: "vertical" },
      armTopDimension: { x: 148.8, y: 8, anchor: "bottom-right" },
      armTopDimensionRight: { x: 256.2, y: 8, anchor: "bottom-left" },
      armLength: { x: 155.6, y: 41, anchor: "bottom-right" },
      armLengthRight: { x: 251.5, y: 41, anchor: "bottom-left" },
      armSpec: { x: 277, y: 74, anchor: "leader", centered: true },
      upperDiameter: { x: 248, y: 143, anchor: "bottom-left" },
      poleSpec: { x: 239, y: 449.1, anchor: "leader" },
      poleTopOffset: { x: 44.5, y: 85.9, anchor: "vertical" },
      armHeight: { x: 44.5, y: 488, anchor: "vertical" },
      baseDimension: { x: 113, y: 827.5, anchor: "vertical" },
      lowerDiameter: { x: 225.5, y: 817, anchor: "bottom-left" },
    },
  },
  "TS.underGL": {
    viewBox: { width: 386, height: 872 },
    heightLineX: 8,
    textsFromOnGL: true,
    positions: {
      totalHeight: { x: -7, y: 472, anchor: "vertical" },
      armTopDimension: { x: 148.8, y: 8, anchor: "bottom-right" },
      armTopDimensionRight: { x: 256.2, y: 8, anchor: "bottom-left" },
      armLength: { x: 155.6, y: 41, anchor: "bottom-right" },
      armLengthRight: { x: 251.5, y: 41, anchor: "bottom-left" },
      armSpec: { x: 277, y: 74, anchor: "leader", centered: true },
      upperDiameter: { x: 248, y: 143, anchor: "bottom-left" },
      poleSpec: { x: 239.5, y: 451, anchor: "leader" },
      poleTopOffset: { x: 43, y: 86, anchor: "vertical" },
      armHeight: { x: 43, y: 476, anchor: "vertical" },
      underGroundDepth: { x: 43, y: 842, anchor: "vertical" },
      baseDimension: { x: 113, y: 803.5, anchor: "vertical" },
      lowerDiameter: { x: 226, y: 796, anchor: "bottom-left" },
    },
  },
  "TA.onGL": {
    viewBox: { width: 386, height: 871 },
    heightLineX: 8.2,
    positions: {
      totalHeight: { x: -7.5, y: 484, anchor: "vertical" },
      armTopDimension: { x: 148.8, y: 8, anchor: "bottom-right" },
      armTopDimensionRight: { x: 256.2, y: 8, anchor: "bottom-left" },
      armLength: { x: 155.6, y: 41, anchor: "bottom-right" },
      armLengthRight: { x: 251.5, y: 41, anchor: "bottom-left" },
      armSpec: { x: 277, y: 74, anchor: "leader", centered: true },
      diameter1: { x: 248, y: 142.5, anchor: "bottom-left" },
      diameter2: { x: 248, y: 310.3, anchor: "bottom-left" },
      poleSpec: { x: 239.5, y: 450, anchor: "leader" },
      diameter3: { x: 226, y: 682.8, anchor: "bottom-left" },
      diameter4: { x: 226, y: 818, anchor: "bottom-left" },
      poleTopOffset: { x: 43.7, y: 83.2, anchor: "vertical" },
      topSectionLength: { x: 43.7, y: 193.35, anchor: "vertical" },
      taperSectionLength: { x: 43.7, y: 495.85, anchor: "vertical" },
      bottomSectionLength: { x: 43.7, y: 790.34, anchor: "vertical" },
      baseDimension: { x: 113, y: 825, anchor: "vertical" },
    },
  },
  "TA.underGL": {
    viewBox: { width: 386, height: 872 },
    heightLineX: 7.85,
    textsFromOnGL: true,
    positions: {
      totalHeight: { x: -7.5, y: 472, anchor: "vertical" },
      armTopDimension: { x: 148, y: 8, anchor: "bottom-right" },
      armTopDimensionRight: { x: 256.2, y: 8, anchor: "bottom-left" },
      armLength: { x: 154.6, y: 41, anchor: "bottom-right" },
      armLengthRight: { x: 251, y: 41, anchor: "bottom-left" },
      armSpec: { x: 277, y: 74, anchor: "leader", centered: true },
      diameter1: { x: 248, y: 142.5, anchor: "bottom-left" },
      diameter2: { x: 248, y: 283, anchor: "bottom-left" },
      poleSpec: { x: 239, y: 450.85, anchor: "leader" },
      diameter3: { x: 224.35, y: 661.2, anchor: "bottom-left" },
      diameter4: { x: 224.35, y: 795.5, anchor: "bottom-left" },
      poleTopOffset: { x: 42, y: 82.98, anchor: "vertical" },
      topSectionLength: { x: 42, y: 177.6, anchor: "vertical" },
      taperSectionLength: { x: 42, y: 468.1, anchor: "vertical" },
      bottomSectionLength: { x: 42, y: 765.1, anchor: "vertical" },
      underGroundDepth: { x: 42, y: 841.8, anchor: "vertical" },
      baseDimension: { x: 113.81, y: 802.6, anchor: "vertical" },
    },
  },
  "IS.embedment": {
    viewBox: { width: 315, height: 771 },
    heightLineX: 11.7,
    heightGap: 7,
    positions: {
      totalHeight: { x: -4, y: 340, anchor: "vertical" },
      upperDiameter: { x: 182.5, y: 74.05, anchor: "bottom-left" },
      poleSpec: { x: 180.6, y: 351.3, anchor: "leader" },
      baseDimension: { x: 63.5, y: 594.55, anchor: "vertical" },
      lowerDiameter: { x: 166.2, y: 583.4, anchor: "bottom-left" },
    },
  },
  "IA.embedment": {
    viewBox: { width: 370, height: 772 },
    heightLineX: 7.75,
    heightGap: 7,
    positions: {
      totalHeight: { x: -7, y: 340, anchor: "vertical" },
      diameter1: { x: 235.75, y: 70, anchor: "bottom-left" },
      diameter2: { x: 235.75, y: 190, anchor: "bottom-left" },
      poleSpec: { x: 227.15, y: 349.3, anchor: "leader" },
      diameter3: { x: 216.25, y: 470, anchor: "bottom-left" },
      diameter4: { x: 216.25, y: 588.5, anchor: "bottom-left" },
      topSectionLength: { x: 45.5, y: 105.05, anchor: "vertical" },
      taperSectionLength: { x: 45.5, y: 340, anchor: "vertical" },
      bottomSectionLength: { x: 45.5, y: 566, anchor: "vertical" },
      baseDimension: { x: 114.5, y: 599, anchor: "vertical" },
    },
  },
  "LS.embedment": {
    viewBox: { width: 385, height: 868 },
    heightLineX: 8.85,
    positions: {
      totalHeight: { x: -6.5, y: 425, anchor: "vertical" },
      armTopDimension: { x: 223.8, y: 21, anchor: "bottom-center" },
      armLength: { x: 192, y: 56, anchor: "bottom-right" },
      upperDiameter: { x: 277.35, y: 69.5, anchor: "bottom-left" },
      armSpec: { x: 254.5, y: 150, anchor: "leader", centered: true },
      poleSpec: { x: 238.25, y: 443, anchor: "leader" },
      poleTopOffset: { x: 48, y: 94, anchor: "vertical" },
      armHeight: { x: 48, y: 430, anchor: "vertical" },
      baseDimension: { x: 116.81, y: 699, anchor: "vertical" },
      lowerDiameter: { x: 226, y: 686.95, anchor: "bottom-left" },
    },
  },
  "LA.embedment": {
    viewBox: { width: 408, height: 879 },
    heightLineX: 7.9,
    positions: {
      totalHeight: { x: -8, y: 428.3, anchor: "vertical" },
      armTopDimension: { x: 236.5, y: 3.2, anchor: "bottom-center" },
      armLength: { x: 206, y: 38.5, anchor: "bottom-right" },
      diameter1: { x: 294, y: 55, anchor: "bottom-left" },
      armSpec: { x: 268, y: 136.5, anchor: "leader", centered: true },
      diameter2: { x: 257.5, y: 272.8, anchor: "bottom-left" },
      poleSpec: { x: 252, y: 449.3, anchor: "leader" },
      diameter3: { x: 242, y: 581.3, anchor: "bottom-left" },
      diameter4: { x: 242, y: 712.3, anchor: "bottom-left" },
      poleTopOffset: { x: 50.5, y: 84, anchor: "vertical" },
      topSectionLength: { x: 50.5, y: 174.8, anchor: "vertical" },
      taperSectionLength: { x: 50.5, y: 428.3, anchor: "vertical" },
      bottomSectionLength: { x: 50.5, y: 685.3, anchor: "vertical" },
      baseDimension: { x: 127, y: 721, anchor: "vertical" },
    },
  },
  "TS.embedment": {
    viewBox: { width: 386, height: 871 },
    heightLineX: 8,
    positions: {
      totalHeight: { x: -7.5, y: 435, anchor: "vertical" },
      armTopDimension: { x: 157.8, y: 29, anchor: "bottom-right" },
      armTopDimensionRight: { x: 251.5, y: 29, anchor: "bottom-left" },
      armLength: { x: 163.6, y: 58.95, anchor: "bottom-right" },
      armLengthRight: { x: 246, y: 58.95, anchor: "bottom-left" },
      armSpec: { x: 271, y: 88, anchor: "leader", centered: true },
      upperDiameter: { x: 247, y: 154, anchor: "bottom-left" },
      poleSpec: { x: 238, y: 449.1, anchor: "leader" },
      poleTopOffset: { x: 48, y: 98.9, anchor: "vertical" },
      armHeight: { x: 48, y: 440, anchor: "vertical" },
      baseDimension: { x: 119, y: 703.5, anchor: "vertical" },
      lowerDiameter: { x: 226.5, y: 694, anchor: "bottom-left" },
    },
  },
  "TA.embedment": {
    viewBox: { width: 386, height: 871 },
    heightLineX: 8.2,
    positions: {
      totalHeight: { x: -7.5, y: 440, anchor: "vertical" },
      armTopDimension: { x: 157.8, y: 29, anchor: "bottom-right" },
      armTopDimensionRight: { x: 251.5, y: 29, anchor: "bottom-left" },
      armLength: { x: 163.6, y: 58.95, anchor: "bottom-right" },
      armLengthRight: { x: 246, y: 58.95, anchor: "bottom-left" },
      armSpec: { x: 275, y: 88.5, anchor: "leader", centered: true },
      diameter1: { x: 247, y: 154, anchor: "bottom-left" },
      diameter2: { x: 247, y: 280, anchor: "bottom-left" },
      poleSpec: { x: 238.5, y: 449, anchor: "leader" },
      diameter3: { x: 226, y: 569.8, anchor: "bottom-left" },
      diameter4: { x: 226, y: 695.65, anchor: "bottom-left" },
      poleTopOffset: { x: 48.5, y: 98, anchor: "vertical" },
      topSectionLength: { x: 48.5, y: 190.35, anchor: "vertical" },
      taperSectionLength: { x: 48.5, y: 445, anchor: "vertical" },
      bottomSectionLength: { x: 48.5, y: 670.34, anchor: "vertical" },
      baseDimension: { x: 118, y: 706.5, anchor: "vertical" },
    },
  },
};

export const LABEL_ANCHOR_TRANSFORM = {
  left: "translate(0, -50%)",
  right: "translate(-100%, -50%)",
  "bottom-left": "translate(0, -100%)",
  leader: "translate(0, calc(-1 * var(--label-lh, 16px) - 0.5px))",
  vertical: "translate(-50%, -50%) rotate(-90deg)",
  "bottom-center": "translate(-50%, -100%)",
  "bottom-right": "translate(-100%, -100%)",
};

export const toMm = (val) => {
  if (val == null) return null;
  const num = Number(val);
  if (Number.isNaN(num)) return null;
  return num < 50 ? Math.round(num * 1000) : Math.round(num);
};

export function getDiagramLabels(
  poleType,
  groundPosition,
  height,
  beGeometry = null,
) {
  if (!height || !poleType) return null;
  const lookupKey = `${poleType}.${groundPosition}`;
  const layout = DIAGRAM_LABEL_LAYOUT[lookupKey];
  if (!layout) return null;

  const numH = Number(height);
  const mH = numH > 100 ? numH / 1000 : numH;
  const isUnderGL =
    groundPosition === "underGL" || groundPosition === "under_gl";
  const isEmbedment = groundPosition === "embedment";

  const dataGround =
    layout.textsFromOnGL || isEmbedment ? "onGL" : groundPosition;
  const dataTaper =
    STANDARD_POLE_DATA.tapered || STANDARD_POLE_DATA.taper || {};
  const group = dataTaper?.[poleType]?.[dataGround] || {};

  let nominalM = mH;
  if (isUnderGL) {
    if (
      String(mH).endsWith(".3") ||
      String(mH).endsWith(".4") ||
      String(mH).endsWith(".8") ||
      String(mH).endsWith(".9")
    ) {
      nominalM = Math.round((mH - UNDER_GL_DEPTH_MM / 1000) * 10) / 10;
    }
  }

  let entry = null;
  const isTypeWith100 = poleType !== "IS" && poleType !== "IA";
  if (dataGround === "onGL") {
    const k1 = String(nominalM);
    const k2 = isTypeWith100
      ? String(Math.round((nominalM + 0.1) * 10) / 10)
      : String(Math.round((nominalM - 0.1) * 10) / 10);
    const k3 = isTypeWith100
      ? String(Math.round((nominalM - 0.1) * 10) / 10)
      : String(Math.round((nominalM + 0.1) * 10) / 10);
    entry = group[k1] || group[k2] || group[k3];
  } else {
    const underM = Math.round((nominalM + UNDER_GL_DEPTH_MM / 1000) * 10) / 10;
    const k1 = String(underM);
    const k2 = isTypeWith100
      ? String(Math.round((underM + 0.1) * 10) / 10)
      : String(Math.round((underM - 0.1) * 10) / 10);
    const k3 = isTypeWith100
      ? String(Math.round((underM - 0.1) * 10) / 10)
      : String(Math.round((underM + 0.1) * 10) / 10);
    entry = group[k1] || group[k2] || group[k3] || group[String(nominalM)];
  }

  if (!entry) {
    const fallbackGroup = dataTaper?.[poleType]?.onGL || {};
    const k1 = String(nominalM);
    const k2 = String(Math.round((nominalM + 0.1) * 10) / 10);
    const k3 = String(Math.round((nominalM - 0.1) * 10) / 10);
    entry = fallbackGroup[k1] || fallbackGroup[k2] || fallbackGroup[k3];
  }

  const poles = entry?.poles;
  const arm = entry?.arms?.[0];
  const arm2 = entry?.arms?.[1];
  const pole = poles?.[0];
  if (!pole) return null;

  let beStepPoles = null;
  let beTopPole = null;
  let beBottomPole = null;
  let beTaperPole = null;

  if (
    beGeometry &&
    Array.isArray(beGeometry.stepPoles) &&
    beGeometry.stepPoles.length > 0
  ) {
    const sortedAsc = [...beGeometry.stepPoles].sort(
      (a, b) => Number(a.topElevationM || 0) - Number(b.topElevationM || 0),
    );
    const sortedDesc = [...sortedAsc].reverse();
    beStepPoles = sortedAsc;
    beBottomPole = sortedAsc[0];
    beTopPole = sortedDesc[0];
    beTaperPole =
      sortedAsc.find(
        (p) => String(p.poleType || "").toLowerCase() === "taper",
      ) || beTopPole;
  }

  const taper = poles.find((p) => p.poleType === "Taper") ?? pole;
  const fallbackThickness = Number(taper.upperThickness).toFixed(1);

  const beThick =
    beTaperPole?.thicknessLowerMm ??
    beTaperPole?.thicknessUpperMm ??
    beTopPole?.thicknessLowerMm ??
    fallbackThickness;
  const beMat =
    beTaperPole?.materialName ||
    beTaperPole?.material?.name ||
    (typeof beTaperPole?.material === "string" ? beTaperPole.material : null) ||
    taper.material;

  const [top, middle, bottom] = poles;
  const isStepped = poles.length >= 3;

  const heightInMm = numH > 100 ? Math.round(numH) : Math.round(mH * 1000);
  let totalHeightMm =
    beGeometry?.height != null
      ? beGeometry.height > 100
        ? Math.round(beGeometry.height)
        : toMm(beGeometry.height)
      : pole?.zHeight
        ? Number(pole.zHeight)
        : heightInMm;

  if (isUnderGL && layout.textsFromOnGL) {
    totalHeightMm += UNDER_GL_DEPTH_MM;
  }

  const upperDia =
    beTopPole?.diameterUpperMm ??
    beTopPole?.diameterLowerMm ??
    pole.upperDiameter;
  const lowerDia = beBottomPole?.diameterLowerMm ?? pole.lowerDiameter;

  let dia1 = top?.upperDiameter;
  let dia2 = taper.upperDiameter;
  let dia3 = taper.lowerDiameter;
  let dia4 = poles[poles.length - 1]?.lowerDiameter;

  let topLen = 0;
  let midLen = 0;
  let botLen = 0;

  if (isStepped && middle && bottom) {
    topLen = ((arm ?? top)?.zHeight ?? 0) - (middle?.zHeight ?? 0);
    midLen = (middle?.zHeight ?? 0) - (bottom?.zHeight ?? 0);
    botLen = bottom?.zHeight ?? 0;
  }

  if (beStepPoles && beStepPoles.length >= 3) {
    const topSeg = beStepPoles[beStepPoles.length - 1];
    const midSeg = beStepPoles[1];
    const botSeg = beStepPoles[0];

    dia1 = topSeg.diameterUpperMm ?? topSeg.diameterLowerMm ?? dia1;
    dia2 = midSeg.diameterUpperMm ?? dia2;
    dia3 = midSeg.diameterLowerMm ?? dia3;
    dia4 = botSeg.diameterLowerMm ?? botSeg.diameterUpperMm ?? dia4;

    const botElevMm = toMm(botSeg.topElevationM);
    const midElevMm = toMm(midSeg.topElevationM);
    const topElevMm = toMm(topSeg.topElevationM);

    if (botElevMm) botLen = botElevMm;
    if (midElevMm && botElevMm) midLen = midElevMm - botElevMm;
    if (topElevMm && midElevMm) {
      const armOffset = arm ? pole.zHeight - arm.zHeight : 0;
      topLen = topElevMm - midElevMm - armOffset;
    }
  }

  const texts = {
    totalHeight: [`${totalHeightMm}`],
    upperDiameter: [`φ${upperDia}`],
    poleSpec: [`t${Number(beThick).toFixed(1)}`, `[JIS G3444 ${beMat}]`],
    baseDimension: [`${BASE_DIMENSION_MM}`],
    lowerDiameter: [`φ${lowerDia}`],
    aboveGroundHeight: [`${totalHeightMm - UNDER_GL_DEPTH_MM}`],
    underGroundDepth: [`${UNDER_GL_DEPTH_MM}`],
    diameter1: [`φ${dia1}`],
    diameter2: [`φ${dia2}`],
    diameter3: [`φ${dia3}`],
    diameter4: [`φ${dia4}`],
    ...(arm && {
      poleTopOffset: [`${pole.zHeight - arm.zHeight}`],
      armHeight: [`${arm.zHeight}`],
      armTopDimension: [`${ARM_TOP_DIMENSION_MM}`],
      armLength: [`(${arm.length})`],
      ...((arm2 || poleType === "TS" || poleType === "TA") && {
        armTopDimensionRight: [`${ARM_TOP_DIMENSION_MM}`],
        armLengthRight: [`(${arm2?.length ?? arm.length})`],
      }),
      armSpec: [
        `φ${arm.diameter}×t${Number(arm.thickness).toFixed(1)}`,
        arm.material,
      ],
    }),
    ...(isStepped && {
      topSectionLength: [`${topLen}`],
      taperSectionLength: [`${midLen}`],
      bottomSectionLength: [`${botLen}`],
    }),
  };

  return Object.entries(layout.positions)
    .filter(([k]) => texts[k])
    .map(([k, pos]) => ({
      key: k,
      isLeader: pos.anchor === "leader",
      isCentered: !!pos.centered,
      lines: texts[k],
      style: {
        left: `${(pos.x / layout.viewBox.width) * 100}%`,
        top: `${(pos.y / layout.viewBox.height) * 100}%`,
        transform: LABEL_ANCHOR_TRANSFORM[pos.anchor],
      },
    }));
}
