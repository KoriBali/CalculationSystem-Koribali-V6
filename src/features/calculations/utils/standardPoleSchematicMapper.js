/**
 * standardPoleSchematicMapper.js
 * Maps pole calculation inputs (both Standard & Custom) directly from active
 * input states (poles, arms, directObjects, overheadWires) into the exact
 * parameters payload expected by Pak Amir's Drawing Engine (/test_FE_schematic).
 */

import STANDARD_POLE_DATA from "../data/specStandardPole.json";

// Supported standard pole types for schematic generation
export const SUPPORTED_SCHEMATIC_POLE_TYPES = [
  "IA",
  "IS",
  "LA",
  "LS",
  "TA",
  "TS",
  "STRAIGHT",
  "STEPPEDPOLE",
  "CUSTOM",
];

/**
 * Checks whether a given pole type is supported by the schematic drawing engine.
 * @param {string} poleType
 * @returns {boolean}
 */
export function isSchematicSupportedPole(poleType) {
  if (!poleType) return true; // By default all custom and standard inputs are supported
  return true;
}

/**
 * Resolves segment heights (length of each segment) if heights are provided
 * as strictly decreasing cumulative elevations (from top down to bottom).
 * e.g. [12300, 9800, 1800] -> [2500, 8000, 1800]
 * e.g. [8300, 300] -> [8000, 300]
 * e.g. [8000] -> [8000]
 */
export function resolveSegmentHeights(rawHeights) {
  if (!Array.isArray(rawHeights) || rawHeights.length <= 1) {
    return rawHeights || [];
  }

  const isStrictlyDecreasing = rawHeights.every(
    (val, i) => i === 0 || val < rawHeights[i - 1],
  );

  if (isStrictlyDecreasing) {
    const segmentHeights = [];
    for (let i = 0; i < rawHeights.length; i++) {
      if (i === rawHeights.length - 1) {
        segmentHeights.push(rawHeights[i]);
      } else {
        segmentHeights.push(rawHeights[i] - rawHeights[i + 1]);
      }
    }
    return segmentHeights;
  }

  return rawHeights;
}

/**
 * Maps frontend overhead wire list to the format expected by the Drawing Engine (overHeadWires).
 * @param {Array} rawList
 * @returns {Array}
 */
export function mapSchematicOverheadWires(rawList) {
  if (!Array.isArray(rawList) || rawList.length === 0) return [];

  return rawList
    .filter(
      (w) =>
        w &&
        (w.name ||
          w.zHeight != null ||
          w.elevationM != null ||
          w.diameter != null ||
          w.weight != null),
    )
    .map((w, idx) => {
      const rawZ = Number(
        w.zHeight ??
          (w.elevationM
            ? w.elevationM < 100
              ? w.elevationM * 1000
              : w.elevationM
            : 0),
      );
      const height = isNaN(rawZ) ? 0 : rawZ;

      const rawDia = Number(w.diameter ?? w.diameterMm ?? 0);
      const diameter = isNaN(rawDia) ? 0 : rawDia;

      const rawSpan = Number(w.span ?? w.spanLengthM ?? w.spanLength ?? 0);
      const span = isNaN(rawSpan)
        ? 0
        : rawSpan > 0 && rawSpan < 500
          ? rawSpan * 1000
          : rawSpan;

      const rawWeight = Number(w.weight ?? w.massPerLengthKgM ?? 0);
      const weight = isNaN(rawWeight) ? 0 : rawWeight;

      const rawFixAngle = Number(w.fixAngle ?? w.fixedAngleDeg ?? 0);
      const fixAngle = isNaN(rawFixAngle) ? 0 : rawFixAngle;

      const rawVertAngle = Number(w.verticalAngle ?? w.verticalAngleDeg ?? 0);
      const verticalAngle = isNaN(rawVertAngle) ? 0 : rawVertAngle;

      return {
        name: String(w.name || `Overhead Wire ${idx + 1}`).trim(),
        height,
        elevation: height,
        diameter,
        span,
        weight,
        fixAngle,
        verticalAngle,
      };
    });
}

/**
 * Resolves installation setting object for Amir's Schematic Engine V2.
 * Output: { type: 'on-gl' | 'embedment' | 'baseplate-under-gl', depth: number }
 */
export function resolveInstallationSettings({
  condition = {},
  poleConfig = {},
  groundPosition = null,
  taperPoleStandard = null,
}) {
  const gp = String(
    groundPosition ||
      taperPoleStandard?.groundPosition ||
      condition?.groundPosition ||
      condition?.activeGroundPosition ||
      ""
  ).toLowerCase();

  const lowestHeightNum = Number(
    poleConfig?.lowestHeight ?? condition?.lowestHeight ?? 0
  );
  const isEmbed =
    gp.includes("embed") ||
    condition?.isEmbedment ||
    condition?.installationPole === "embedment" ||
    taperPoleStandard?.installationPole === "embedment" ||
    Boolean(condition?.embedmentLengthMm) ||
    Boolean(poleConfig?.embedmentLength) ||
    Boolean(taperPoleStandard?.embedmentLength);

  const isUnder = !isEmbed && (gp.includes("under") || lowestHeightNum < 0);

  if (isEmbed) {
    const embedValue =
      poleConfig?.embedmentLength ??
      taperPoleStandard?.embedmentLength ??
      condition?.embedmentLengthMm ??
      condition?.embedmentLength ??
      condition?.embedmentDepth ??
      condition?.depth;

    const rawDepth = Math.abs(Number(embedValue));
    const depth =
      !isNaN(rawDepth) && rawDepth > 0
        ? rawDepth
        : lowestHeightNum !== 0
          ? Math.abs(lowestHeightNum)
          : 1500;
    return { type: "embedment", depth };
  }

  if (isUnder) {
    const rawDepth = Math.abs(
      lowestHeightNum !== 0
        ? lowestHeightNum
        : Number(condition?.depth ?? 300)
    );
    const depth = isNaN(rawDepth) || rawDepth <= 0 ? 300 : rawDepth;
    return { type: "baseplate-under-gl", depth };
  }

  return { type: "on-gl", depth: 0 };
}

/**
 * MAPPING DATA INPUTAN MURNI KE SKEMATIK PAK AMIR:
 * Memetakan langsung dari variabel input aktif (poles, arms, directObjects, overheadWires)
 * tanpa bergantung pada spec data standar katalog statis.
 * Baik mode Custom maupun Standard menggunakan variabel input yang sama.
 */
export function mapInputToSchematicParameters({
  poles = [],
  arms = [],
  directObjects = [],
  overheadWires = [],
  condition = {},
  poleConfig = {},
  groundPosition = null,
  taperPoleStandard = null,
}) {
  if (!Array.isArray(poles) || poles.length === 0) {
    return null;
  }

  const isSupported = poles.length >= 1 && poles.length <= 3;
  const unsupportedReason =
    poles.length > 3
      ? "The structural schematic drawing engine currently supports configurations up to 3 pole segments. Full schematic visualization for 4+ segments will be supported in an upcoming update. All structural calculations and engineering checks above remain fully computed and verified."
      : null;

  // 1. Installation Settings
  const installation = resolveInstallationSettings({
    condition,
    poleConfig,
    groundPosition,
    taperPoleStandard,
  });

  // 2. Hitung panjang segmen masing-masing step pole
  const rawHeights = poles.map((p) => {
    const raw = Number(p.zHeight ?? p.height ?? p.H ?? 0);
    return isNaN(raw) ? 0 : raw;
  });

  const segmentHeights = resolveSegmentHeights(rawHeights);

  // 3. Petakan Step Poles (Maksimal 3 segmen untuk drawing engine)
  const mappedPoles = poles.slice(0, 3).map((p, idx) => {
    const rawType = String(p.poleType || p.type || "").toLowerCase();
    const isTapered =
      rawType.includes("taper") ||
      (Number(p.lowerDiameter) !== Number(p.upperDiameter) &&
        Number(p.upperDiameter) > 0);

    const lowerD = Number(p.lowerDiameter ?? p.Lower_D ?? p.diameter ?? 165);
    const upperD = isTapered
      ? Number(p.upperDiameter ?? p.Upper_D ?? lowerD)
      : lowerD;

    const lowerThk = Number(
      p.lowerThickness ?? p.thickness ?? p.t ?? 4,
    );
    const upperThk = isTapered
      ? Number(p.upperThickness ?? p.upper_t ?? lowerThk)
      : lowerThk;

    const segHeight = segmentHeights[idx] || rawHeights[idx] || 0;

    return {
      name: p.name || `Pole-${idx + 1}`,
      material:
        typeof p.material === "object"
          ? p.material?.name || "STK400"
          : p.material || "STK400",
      type: isTapered ? "tapered" : "straight",
      Lower_D: lowerD,
      Upper_D: upperD,
      lowerDiameter: lowerD,
      upperDiameter: upperD,
      thickness: lowerThk,
      lowerThickness: lowerThk,
      upperThickness: upperThk,
      height: segHeight,
      quantity: Number(p.quantity || 1),
    };
  });

  // 4. Petakan Arms (Maksimal 2 arms untuk drawing engine)
  const mappedArms = (arms || []).slice(0, 2).map((a, idx) => {
    const armType = String(a.armType || a.type || "")
      .toLowerCase()
      .includes("taper")
      ? "tapered"
      : "straight";

    const dia = Number(a.diameter ?? a.Lower_D ?? 60.5);
    const thk = Number(a.thickness ?? a.t ?? 3.2);
    const h = Number(a.zHeight ?? a.height ?? a.elevation ?? a.H ?? 0);
    const len = Number(a.length ?? a.L ?? 1500);
    const fixAngle = Number(a.fixAngle ?? 0);
    const vertAngle = Number(a.verticalAngle ?? 0);

    return {
      name: a.name || `Arm ${idx + 1}`,
      material:
        typeof a.material === "object"
          ? a.material?.name || "STK400"
          : a.material || "STK400",
      type: armType,
      diameter: dia,
      Lower_D: dia,
      Upper_D: dia,
      thickness: thk,
      height: h,
      length: len,
      fixAngle,
      verticalAngle: vertAngle,
    };
  });

  // 5. Petakan Direct Objects (Maksimal 3 untuk drawing engine V2)
  const mappedDOs = (directObjects || [])
    .filter(
      (d) =>
        d &&
        (d.name ||
          d.zHeight != null ||
          d.height != null ||
          d.areaFront != null ||
          d.areaSide != null)
    )
    .slice(0, 3)
    .map((d, idx) => {
      const areaF = Number(d.areaFront ?? d.frontArea ?? d.area ?? 0.1);
      const areaS = Number(d.areaSide ?? d.sideArea ?? 0.1);
      const h = Number(d.zHeight ?? d.height ?? d.H ?? d.elevation ?? 0);
      return {
        name: String(d.name || `Object ${idx + 1}`).trim(),
        areaFront: isNaN(areaF) || areaF <= 0 ? 0.1 : areaF,
        areaSide: isNaN(areaS) || areaS < 0 ? 0.1 : areaS,
        height: isNaN(h) ? 0 : h,
        quantity: Math.max(1, Number(d.quantity || 1)),
      };
    });

  // 6. Petakan Overhead Wires (Maksimal 4 untuk drawing engine)
  const mappedOHWs = mapSchematicOverheadWires(overheadWires);

  // Buat signature standarId unik untuk identifikasi & perbandingan cache
  const installSig = `${installation.type}_${installation.depth}`;
  const poleSig = mappedPoles
    .map((p) => `${p.type}_${p.Lower_D}_${p.Upper_D}_${p.height}`)
    .join("-");
  const armSig = mappedArms
    .map((a) => `${a.height}_${a.length}_${a.fixAngle}`)
    .join("-");
  const doSig = mappedDOs
    .map((d) => `${d.height}_${d.areaFront}_${d.quantity}`)
    .join("-");
  const ohwSig = mappedOHWs
    .map((o) => `${o.height}_${o.span}_${o.fixAngle}`)
    .join("-");

  const standardId = `SCH-${installSig}-${poleSig}${armSig ? `_a${armSig}` : ""}${doSig ? `_d${doSig}` : ""}${ohwSig ? `_o${ohwSig}` : ""}`;

  return {
    isSupported,
    unsupportedReason,
    standardId,
    poleType: mappedPoles[0]?.type || "tapered",
    payload: {
      installation,
      poles: mappedPoles,
      arms: mappedArms,
      directObjects: mappedDOs,
      overheadWires: mappedOHWs,
      overHeadWires: mappedOHWs,
    },
  };
}

/**
 * Resolves standard pole entry and builds the exact payload structure required by Amir's Drawing Engine.
 * Prioritizes input data when poles array is provided.
 */
export function getStandardPoleSchematicParameters({
  poles = [],
  arms = [],
  directObjects = [],
  overheadWires = [],
  taperPoleStandard = null,
  straightPoleStandard = null,
  poleTypeStandard = null,
  condition = {},
  poleConfig = {},
  groundPosition = null,
}) {
  // Jika data input poles tersedia, petakan langsung dari data input
  if (Array.isArray(poles) && poles.length > 0) {
    return mapInputToSchematicParameters({
      poles,
      arms,
      directObjects,
      overheadWires,
      condition,
      poleConfig,
      groundPosition,
      taperPoleStandard,
    });
  }

  // Fallback straight pole standard
  const isStraight =
    poleTypeStandard?.type === "straight" ||
    (!taperPoleStandard?.poleType && Boolean(straightPoleStandard?.combination));

  if (isStraight && straightPoleStandard?.combination) {
    const combination = straightPoleStandard.combination;
    const selectedPole = STANDARD_POLE_DATA?.straight?.[combination];
    if (selectedPole && Array.isArray(selectedPole.poles) && selectedPole.poles.length >= 2) {
      const upperLength = Number(straightPoleStandard.upperLength || 0);
      const lowerLength = Number(straightPoleStandard.lowerLength || 0);
      const upperThickness = Number(straightPoleStandard.upperThickness || 0);
      const lowerThickness = Number(straightPoleStandard.lowerThickness || 0);

      const [topRaw, bottomRaw] = selectedPole.poles;
      const mappedP = [
        {
          name: topRaw.name || "上柱",
          material: topRaw.material || "STK400",
          type: "straight",
          Lower_D: Number(topRaw.lowerDiameter),
          Upper_D: Number(topRaw.upperDiameter),
          lowerDiameter: Number(topRaw.lowerDiameter),
          upperDiameter: Number(topRaw.upperDiameter),
          thickness: upperThickness,
          lowerThickness: upperThickness,
          upperThickness: upperThickness,
          height: upperLength,
          quantity: 1,
        },
        {
          name: bottomRaw.name || "下柱",
          material: bottomRaw.material || "STK400",
          type: "straight",
          Lower_D: Number(bottomRaw.lowerDiameter),
          Upper_D: Number(bottomRaw.upperDiameter),
          lowerDiameter: Number(bottomRaw.lowerDiameter),
          upperDiameter: Number(bottomRaw.upperDiameter),
          thickness: lowerThickness,
          lowerThickness: lowerThickness,
          upperThickness: lowerThickness,
          height: lowerLength,
          quantity: 1,
        },
      ];

      return mapInputToSchematicParameters({
        poles: mappedP,
        arms,
        directObjects,
        overheadWires,
        condition,
        poleConfig,
      });
    }
  }

  // Fallback taper pole standard
  if (!taperPoleStandard || !taperPoleStandard.poleType) return null;

  const type = taperPoleStandard.poleType.toUpperCase();
  const rawHeight = Number(taperPoleStandard.height);
  const mHeight = rawHeight > 100 ? rawHeight / 1000 : rawHeight;
  const normalizedHeight =
    !isNaN(mHeight) && mHeight > 0
      ? String(Math.round(mHeight * 10) / 10)
      : String(taperPoleStandard.height || "");

  const heightKey = normalizedHeight;
  const dataTaper = STANDARD_POLE_DATA?.tapered || STANDARD_POLE_DATA?.taper || {};
  const rawGroundPos =
    taperPoleStandard?.groundPosition || condition?.groundPosition || "onGL";
  const normalizedGroundPos =
    rawGroundPos === "under_gl" || rawGroundPos === "underGL" ? "underGL" : "onGL";
  const groundGroup = dataTaper?.[type]?.[normalizedGroundPos] || {};
  const isTypeWith100 = type !== "IS" && type !== "IA";
  const nominalKey = isTypeWith100
    ? String(Math.round((Number(heightKey) - 0.1) * 10) / 10)
    : String(Math.round((Number(heightKey) + 0.1) * 10) / 10);
  const selectedPole =
    groundGroup[heightKey] ||
    groundGroup[nominalKey] ||
    groundGroup[String(rawHeight)] ||
    Object.values(groundGroup)[0];

  if (!selectedPole) return null;

  return mapInputToSchematicParameters({
    poles: selectedPole.poles || [],
    arms: selectedPole.arms || arms,
    directObjects: selectedPole.directObjects || directObjects,
    overheadWires,
    condition,
    poleConfig,
    groundPosition,
    taperPoleStandard,
  });
}
