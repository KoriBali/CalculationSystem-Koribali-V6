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
      upperDiameter: { x: 196.2, y: 42.05, anchor: "bottom-left" },
      poleSpec: { x: 184.6, y: 349.4, anchor: "leader" },
      baseDimension: { x: 65, y: 725, anchor: "vertical" },
      lowerDiameter: { x: 173.2, y: 719, anchor: "bottom-left" },
    },
  },
  "IS.underGL": {
    viewBox: { width: 363, height: 771 },
    heightLineX: 8,
    heightGap: 7,
    positions: {
      upperDiameter: { x: 245, y: 42.5, anchor: "bottom-left" },
      poleSpec: { x: 232.6, y: 349.3, anchor: "leader" },
      aboveGroundHeight: { x: 46, y: 371, anchor: "vertical" },
      baseDimension: { x: 112, y: 700.5, anchor: "vertical" },
      lowerDiameter: { x: 221.5, y: 696, anchor: "bottom-left" },
      underGroundDepth: { x: 46, y: 745, anchor: "vertical" },
    },
  },
  "IA.onGL": {
    viewBox: { width: 370, height: 772 },
    heightLineX: 7.75,
    heightGap: 7,
    positions: {
      diameter1: { x: 251.75, y: 41.55, anchor: "bottom-left" },
      diameter2: { x: 251.75, y: 181.05, anchor: "bottom-left" },
      poleSpec: { x: 240.15, y: 349.3, anchor: "leader" },
      diameter3: { x: 228.25, y: 585, anchor: "bottom-left" },
      diameter4: { x: 228.25, y: 720.05, anchor: "bottom-left" },
      topSectionLength: { x: 48.25, y: 77.05, anchor: "vertical" },
      taperSectionLength: { x: 48.25, y: 384.55, anchor: "vertical" },
      bottomSectionLength: { x: 48.25, y: 692.05, anchor: "vertical" },
      baseDimension: { x: 118.5, y: 726.55, anchor: "vertical" },
    },
  },
  "IA.underGL": {
    viewBox: { width: 364, height: 772 },
    heightLineX: 8,
    heightGap: 7,
    textsFromOnGL: true,
    positions: {
      diameter1: { x: 246, y: 42.5, anchor: "bottom-left" },
      diameter2: { x: 246, y: 181.5, anchor: "bottom-left" },
      poleSpec: { x: 234, y: 350.3, anchor: "leader" },
      diameter3: { x: 223.5, y: 559.5, anchor: "bottom-left" },
      diameter4: { x: 223.5, y: 696.5, anchor: "bottom-left" },
      topSectionLength: { x: 48.5, y: 77.2, anchor: "vertical" },
      taperSectionLength: { x: 48.5, y: 372.2, anchor: "vertical" },
      bottomSectionLength: { x: 48.5, y: 667.2, anchor: "vertical" },
      underGroundDepth: { x: 48.5, y: 746.5, anchor: "vertical" },
      baseDimension: { x: 114, y: 701.7, anchor: "vertical" },
    },
  },
  "LS.onGL": {
    viewBox: { width: 385, height: 868 },
    heightLineX: 8.85,
    positions: {
      armTopDimension: { x: 224.8, y: 4.95, anchor: "bottom-center" },
      armLength: { x: 192, y: 37.95, anchor: "bottom-right" },
      upperDiameter: { x: 282.35, y: 54, anchor: "bottom-left" },
      armSpec: { x: 254.5, y: 141, anchor: "leader", centered: true },
      poleSpec: { x: 238.25, y: 446, anchor: "leader" },
      poleTopOffset: { x: 48, y: 82.65, anchor: "vertical" },
      armHeight: { x: 48, y: 484.95, anchor: "vertical" },
      baseDimension: { x: 114, y: 822.45, anchor: "vertical" },
      lowerDiameter: { x: 226, y: 813.95, anchor: "bottom-left" },
    },
  },
  "LS.underGL": {
    viewBox: { width: 384, height: 868 },
    heightLineX: 8.05,
    textsFromOnGL: true,
    positions: {
      armTopDimension: { x: 223.5, y: 4.95, anchor: "bottom-center" },
      armLength: { x: 191, y: 37.95, anchor: "bottom-right" },
      upperDiameter: { x: 281.55, y: 54, anchor: "bottom-left" },
      armSpec: { x: 252.5, y: 141, anchor: "leader", centered: true },
      poleSpec: { x: 238.2, y: 444.95, anchor: "leader" },
      poleTopOffset: { x: 48, y: 82.65, anchor: "vertical" },
      armHeight: { x: 48, y: 472.45, anchor: "vertical" },
      underGroundDepth: { x: 48, y: 840.8, anchor: "vertical" },
      baseDimension: { x: 114, y: 797.45, anchor: "vertical" },
      lowerDiameter: { x: 224.55, y: 791.2, anchor: "bottom-left" },
    },
  },
  "LA.onGL": {
    viewBox: { width: 386, height: 868 },
    heightLineX: 8.2,
    positions: {
      armTopDimension: { x: 226.5, y: 5.35, anchor: "bottom-center" },
      armLength: { x: 193.5, y: 38.35, anchor: "bottom-right" },
      diameter1: { x: 284, y: 54.5, anchor: "bottom-left" },
      armSpec: { x: 256.8, y: 142, anchor: "leader", centered: true },
      diameter2: { x: 248.2, y: 307, anchor: "bottom-left" },
      poleSpec: { x: 239, y: 449.4, anchor: "leader" },
      diameter3: { x: 226.7, y: 680, anchor: "bottom-left" },
      diameter4: { x: 226.7, y: 815, anchor: "bottom-left" },
      poleTopOffset: { x: 47.7, y: 84.2, anchor: "vertical" },
      topSectionLength: { x: 47.7, y: 193.35, anchor: "vertical" },
      taperSectionLength: { x: 47.7, y: 495.85, anchor: "vertical" },
      bottomSectionLength: { x: 47.7, y: 788.34, anchor: "vertical" },
      baseDimension: { x: 115, y: 822.85, anchor: "vertical" },
    },
  },
  "LA.underGL": {
    viewBox: { width: 385, height: 868 },
    heightLineX: 8.05,
    textsFromOnGL: true,
    positions: {
      armTopDimension: { x: 226, y: 5.35, anchor: "bottom-center" },
      armLength: { x: 193, y: 38.35, anchor: "bottom-right" },
      diameter1: { x: 283.5, y: 54.5, anchor: "bottom-left" },
      armSpec: { x: 256, y: 142, anchor: "leader", centered: true },
      diameter2: { x: 247.7, y: 307, anchor: "bottom-left" },
      poleSpec: { x: 238.5, y: 449.4, anchor: "leader" },
      diameter3: { x: 226, y: 680, anchor: "bottom-left" },
      diameter4: { x: 226, y: 815, anchor: "bottom-left" },
      poleTopOffset: { x: 47.7, y: 84.2, anchor: "vertical" },
      topSectionLength: { x: 47.7, y: 193.35, anchor: "vertical" },
      taperSectionLength: { x: 47.7, y: 495.85, anchor: "vertical" },
      bottomSectionLength: { x: 47.7, y: 788.34, anchor: "vertical" },
      underGroundDepth: { x: 47.7, y: 840.8, anchor: "vertical" },
      baseDimension: { x: 115, y: 822.85, anchor: "vertical" },
    },
  },
  "TS.onGL": {
    viewBox: { width: 385, height: 868 },
    heightLineX: 8.85,
    positions: {
      armTopDimension: { x: 224.8, y: 4.95, anchor: "bottom-center" },
      armLength: { x: 192, y: 37.95, anchor: "bottom-right" },
      upperDiameter: { x: 282.35, y: 54, anchor: "bottom-left" },
      armSpec: { x: 254.5, y: 141, anchor: "leader", centered: true },
      poleSpec: { x: 238.25, y: 446, anchor: "leader" },
      poleTopOffset: { x: 48, y: 82.65, anchor: "vertical" },
      armHeight: { x: 48, y: 484.95, anchor: "vertical" },
      baseDimension: { x: 114, y: 822.45, anchor: "vertical" },
      lowerDiameter: { x: 226, y: 813.95, anchor: "bottom-left" },
    },
  },
  "TS.underGL": {
    viewBox: { width: 384, height: 868 },
    heightLineX: 8.05,
    textsFromOnGL: true,
    positions: {
      armTopDimension: { x: 223.5, y: 4.95, anchor: "bottom-center" },
      armLength: { x: 191, y: 37.95, anchor: "bottom-right" },
      upperDiameter: { x: 281.55, y: 54, anchor: "bottom-left" },
      armSpec: { x: 252.5, y: 141, anchor: "leader", centered: true },
      poleSpec: { x: 238.2, y: 444.95, anchor: "leader" },
      poleTopOffset: { x: 48, y: 82.65, anchor: "vertical" },
      armHeight: { x: 48, y: 472.45, anchor: "vertical" },
      underGroundDepth: { x: 48, y: 840.8, anchor: "vertical" },
      baseDimension: { x: 114, y: 797.45, anchor: "vertical" },
      lowerDiameter: { x: 224.55, y: 791.2, anchor: "bottom-left" },
    },
  },
  "TA.onGL": {
    viewBox: { width: 386, height: 868 },
    heightLineX: 8.2,
    positions: {
      armTopDimension: { x: 226.5, y: 5.35, anchor: "bottom-center" },
      armLength: { x: 193.5, y: 38.35, anchor: "bottom-right" },
      diameter1: { x: 284, y: 54.5, anchor: "bottom-left" },
      armSpec: { x: 256.8, y: 142, anchor: "leader", centered: true },
      diameter2: { x: 248.2, y: 307, anchor: "bottom-left" },
      poleSpec: { x: 239, y: 449.4, anchor: "leader" },
      diameter3: { x: 226.7, y: 680, anchor: "bottom-left" },
      diameter4: { x: 226.7, y: 815, anchor: "bottom-left" },
      poleTopOffset: { x: 47.7, y: 84.2, anchor: "vertical" },
      topSectionLength: { x: 47.7, y: 193.35, anchor: "vertical" },
      taperSectionLength: { x: 47.7, y: 495.85, anchor: "vertical" },
      bottomSectionLength: { x: 47.7, y: 788.34, anchor: "vertical" },
      baseDimension: { x: 115, y: 822.85, anchor: "vertical" },
    },
  },
  "TA.underGL": {
    viewBox: { width: 385, height: 868 },
    heightLineX: 8.05,
    textsFromOnGL: true,
    positions: {
      armTopDimension: { x: 226, y: 5.35, anchor: "bottom-center" },
      armLength: { x: 193, y: 38.35, anchor: "bottom-right" },
      diameter1: { x: 283.5, y: 54.5, anchor: "bottom-left" },
      armSpec: { x: 256, y: 142, anchor: "leader", centered: true },
      diameter2: { x: 247.7, y: 307, anchor: "bottom-left" },
      poleSpec: { x: 238.5, y: 449.4, anchor: "leader" },
      diameter3: { x: 226, y: 680, anchor: "bottom-left" },
      diameter4: { x: 226, y: 815, anchor: "bottom-left" },
      poleTopOffset: { x: 47.7, y: 84.2, anchor: "vertical" },
      topSectionLength: { x: 47.7, y: 193.35, anchor: "vertical" },
      taperSectionLength: { x: 47.7, y: 495.85, anchor: "vertical" },
      bottomSectionLength: { x: 47.7, y: 788.34, anchor: "vertical" },
      underGroundDepth: { x: 47.7, y: 840.8, anchor: "vertical" },
      baseDimension: { x: 115, y: 822.85, anchor: "vertical" },
    },
  },
  "IS.embedment": {
    viewBox: { width: 315, height: 771 },
    heightLineX: 11.7,
    heightGap: 7,
    positions: {
      upperDiameter: { x: 184.5, y: 74.05, anchor: "bottom-left" },
      poleSpec: { x: 180.6, y: 353.3, anchor: "leader" },
      baseDimension: { x: 65.5, y: 594.55, anchor: "vertical" },
      lowerDiameter: { x: 166.2, y: 583.4, anchor: "bottom-left" },
    },
  },
  "IA.embedment": {
    viewBox: { width: 370, height: 772 },
    heightLineX: 7.75,
    heightGap: 7,
    positions: {
      diameter1: { x: 237.75, y: 68.55, anchor: "bottom-left" },
      diameter2: { x: 237.75, y: 180.05, anchor: "bottom-left" },
      poleSpec: { x: 227.15, y: 349.3, anchor: "leader" },
      diameter3: { x: 215.25, y: 475, anchor: "bottom-left" },
      diameter4: { x: 215.25, y: 588.05, anchor: "bottom-left" },
      topSectionLength: { x: 49, y: 120.05, anchor: "vertical" },
      taperSectionLength: { x: 49, y: 340, anchor: "vertical" },
      bottomSectionLength: { x: 49, y: 566, anchor: "vertical" },
      baseDimension: { x: 116.5, y: 599, anchor: "vertical" },
    },
  },
  "LS.embedment": {
    viewBox: { width: 385, height: 868 },
    heightLineX: 8.85,
    positions: {
      armTopDimension: { x: 224.8, y: 4.95, anchor: "bottom-center" },
      armLength: { x: 192, y: 37.95, anchor: "bottom-right" },
      upperDiameter: { x: 282.35, y: 54, anchor: "bottom-left" },
      armSpec: { x: 254.5, y: 141, anchor: "leader", centered: true },
      poleSpec: { x: 238.25, y: 446, anchor: "leader" },
      poleTopOffset: { x: 48, y: 82.65, anchor: "vertical" },
      armHeight: { x: 48, y: 484.95, anchor: "vertical" },
      baseDimension: { x: 114.81, y: 692, anchor: "vertical" },
      lowerDiameter: { x: 226, y: 686.95, anchor: "bottom-left" },
    },
  },
  "LA.embedment": {
    viewBox: { width: 386, height: 868 },
    heightLineX: 8.2,
    positions: {
      armTopDimension: { x: 226.5, y: 5.35, anchor: "bottom-center" },
      armLength: { x: 193.5, y: 38.35, anchor: "bottom-right" },
      diameter1: { x: 284, y: 54.5, anchor: "bottom-left" },
      armSpec: { x: 256.8, y: 142, anchor: "leader", centered: true },
      diameter2: { x: 248.2, y: 307, anchor: "bottom-left" },
      poleSpec: { x: 239, y: 449.4, anchor: "leader" },
      diameter3: { x: 226.7, y: 575, anchor: "bottom-left" },
      diameter4: { x: 226.7, y: 698, anchor: "bottom-left" },
      poleTopOffset: { x: 47.7, y: 84.2, anchor: "vertical" },
      topSectionLength: { x: 47.7, y: 193.35, anchor: "vertical" },
      taperSectionLength: { x: 47.7, y: 440, anchor: "vertical" },
      bottomSectionLength: { x: 47.7, y: 660, anchor: "vertical" },
      baseDimension: { x: 117.81, y: 700, anchor: "vertical" },
    },
  },
  "TS.embedment": {
    viewBox: { width: 385, height: 868 },
    heightLineX: 8.85,
    positions: {
      armTopDimension: { x: 224.8, y: 4.95, anchor: "bottom-center" },
      armLength: { x: 192, y: 37.95, anchor: "bottom-right" },
      upperDiameter: { x: 282.35, y: 54, anchor: "bottom-left" },
      armSpec: { x: 254.5, y: 141, anchor: "leader", centered: true },
      poleSpec: { x: 238.25, y: 446, anchor: "leader" },
      poleTopOffset: { x: 48, y: 82.65, anchor: "vertical" },
      armHeight: { x: 48, y: 484.95, anchor: "vertical" },
      baseDimension: { x: 114.81, y: 692, anchor: "vertical" },
      lowerDiameter: { x: 226, y: 686.95, anchor: "bottom-left" },
    },
  },
  "TA.embedment": {
    viewBox: { width: 386, height: 868 },
    heightLineX: 8.2,
    positions: {
      armTopDimension: { x: 226.5, y: 5.35, anchor: "bottom-center" },
      armLength: { x: 193.5, y: 38.35, anchor: "bottom-right" },
      diameter1: { x: 284, y: 54.5, anchor: "bottom-left" },
      armSpec: { x: 256.8, y: 142, anchor: "leader", centered: true },
      diameter2: { x: 248.2, y: 307, anchor: "bottom-left" },
      poleSpec: { x: 239, y: 449.4, anchor: "leader" },
      diameter3: { x: 226.7, y: 575, anchor: "bottom-left" },
      diameter4: { x: 226.7, y: 698, anchor: "bottom-left" },
      poleTopOffset: { x: 47.7, y: 84.2, anchor: "vertical" },
      topSectionLength: { x: 47.7, y: 193.35, anchor: "vertical" },
      taperSectionLength: { x: 47.7, y: 440, anchor: "vertical" },
      bottomSectionLength: { x: 47.7, y: 660, anchor: "vertical" },
      baseDimension: { x: 117.81, y: 700, anchor: "vertical" },
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

export function getDiagramLabels(poleType, groundPosition, height, beGeometry = null) {
  if (!height || !poleType) return null;
  const lookupKey = `${poleType}.${groundPosition}`;
  const layout = DIAGRAM_LABEL_LAYOUT[lookupKey];
  if (!layout) return null;

  const dataGround =
    layout.textsFromOnGL || groundPosition === "embedment"
      ? "onGL"
      : groundPosition;
  const numH = Number(height);
  const mH = numH > 100 ? numH / 1000 : numH;
  const dataHeight = layout.textsFromOnGL
    ? String(Math.round((mH - UNDER_GL_DEPTH_MM / 1000) * 10) / 10)
    : String(mH);
  const dataTaper = STANDARD_POLE_DATA.tapered || STANDARD_POLE_DATA.taper;
  const group = dataTaper?.[poleType]?.[dataGround] || {};
  const isTypeWith100 = poleType !== "IS" && poleType !== "IA";
  const nominalHeight = isTypeWith100
    ? String(Math.round((Number(dataHeight) - 0.1) * 10) / 10)
    : String(Math.round((Number(dataHeight) + 0.1) * 10) / 10);

  const entry =
    group[dataHeight] ||
    group[nominalHeight] ||
    group[String(Math.round(Number(dataHeight) * 10) / 10)];
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
  const totalHeightMm = beGeometry?.height
    ? beGeometry.height > 100
      ? Math.round(beGeometry.height)
      : toMm(beGeometry.height)
    : heightInMm;

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
      ...(arm2 && {
        armTopDimensionRight: [`${ARM_TOP_DIMENSION_MM}`],
        armLengthRight: [`(${arm2.length})`],
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
