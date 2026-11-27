import { calculatePole } from "../../services/poleService";
import {
  calculateCase,
  calculateProjectToolsPole,
} from "../../services/requestService";
import {
  resolveDesignStandardId,
  mapCalculationStepPoles,
  mapCalculationDirectObjects,
  mapCalculationOverheadWires,
  mapCalculationArms,
  calculateEvaluatedPositionsM,
  calculateEvaluatedPositionM,
  toMeters,
} from "../../utils/requestPayloadMapper";
import {
  getMasterDesignStandards,
  getMasterMaterials,
} from "../../services/masterDataService";
import { resolveStandardHeightId } from "../../services/poleStandardService";

function transformBackendCalculationResult(
  res,
  poles,
  directObjects,
  overheadWires = [],
  arms = [],
) {
  if (
    !res ||
    (!res.status &&
      !res.display &&
      !res.positions &&
      !res.sections &&
      !res.checks &&
      !res.governing)
  ) {
    return null;
  }

  const resolvedDisplay = res.display || {
    status: res.status,
    displayDirection: res.displayDirection || "N",
    positions: res.positions || res.sections || [],
    checks: res.checks || [],
    governing: res.governing || null,
  };

  const posList =
    (Array.isArray(resolvedDisplay.checks) && resolvedDisplay.checks.length > 0
      ? resolvedDisplay.checks
      : null) ||
    (Array.isArray(resolvedDisplay.positions) &&
    resolvedDisplay.positions.length > 0
      ? resolvedDisplay.positions
      : null) ||
    (Array.isArray(resolvedDisplay.sections) &&
    resolvedDisplay.sections.length > 0
      ? resolvedDisplay.sections
      : null) ||
    (resolvedDisplay.governing ? [resolvedDisplay.governing] : []);

  const mappedResults = (poles && poles.length > 0 ? poles : [{}]).map(
    (p, i) => {
      const matchPos = posList[i] || posList[0] || {};
      const rawSf =
        matchPos.utilizationRatio ??
        matchPos.utilization_ratio ??
        matchPos.safetyFactor ??
        matchPos.safety_factor ??
        null;
      const sf =
        rawSf != null && !Number.isNaN(Number(rawSf))
          ? Number(Number(rawSf).toFixed(3))
          : null;
      return {
        ...p,
        description:
          matchPos.name ||
          matchPos.evaluatedPoleName ||
          matchPos.poleName ||
          p.description ||
          p.name ||
          `Pole-${i + 1}`,
        safetyFactor: sf,
        utilizationRatio: sf,
        limit: matchPos.limit ?? matchPos.allowableRatio ?? 1.0,
        status:
          matchPos.status ||
          (sf != null ? (sf < 1.0 ? "OK" : "NG") : null),
      };
    },
  );

  return {
    results: mappedResults,
    resultsDo: directObjects || [],
    resultsOhw: overheadWires || [],
    resultsArm: arms || [],
    display: {
      ...resolvedDisplay,
      positions: posList,
      checks: resolvedDisplay.checks || posList,
    },
  };
}

function formatCalculationError(apiErr) {
  console.error("Backend calculation failed:", apiErr);
  const detail = apiErr?.response?.data?.detail;
  let msg = "Structural calculation failed on the backend server.";
  if (typeof detail === "string") {
    msg = detail;
  } else if (Array.isArray(detail)) {
    msg = detail
      .map(
        (item) =>
          `${item?.loc ? item.loc.filter((p) => p !== "body").join(" -> ") : "Parameter"}: ${item?.msg || "invalid"}`,
      )
      .join("\n");
  } else if (detail?.reason) {
    const reasonMessages = {
      wind_speed_missing:
        "Wind speed has not been specified in the Calculation Conditions.",
      design_standard_not_calculable:
        "This design standard is not currently supported by the calculation engine.",
      pole_height_not_calculable:
        "This pole height is not calculable or catalog geometry is unavailable on the server.",
      engine_unavailable:
        "The calculation engine service is currently unavailable. Please try again later.",
    };
    msg = reasonMessages[detail.reason] || detail.message || detail.reason;
  } else if (detail?.message) {
    msg = detail.message;
  } else if (apiErr?.response?.data?.message) {
    msg = apiErr.response.data.message;
  } else if (apiErr?.message) {
    msg = apiErr.message;
  }
  return new Error(msg);
}

/**
 * Menyiapkan payload dan mengeksekusi API kalkulasi pole.
 * Pastikan data yang dipassing ke sini adalah data yang sudah divalidasi
 * dan sudah di-resolve (untuk mode standard).
 */
export async function executePoleCalculation({
  condition,
  poleTypeStandard,
  poleConfig,
  poles, // Jika standard, ini adalah hasil resolvedPoles
  directObjects, // Jika standard, ini adalah hasil resolvedDirectObjects
  overheadWires, // Jika standard, ini adalah hasil resolvedOverheadWires
  arms, // Jika standard, ini adalah hasil resolvedArms
  straightPoleStandard, // Penamaan disamakan dengan validator sebelumnya
  taperPoleStandard, // Tambahkan ini jika dibutuhkan
  requestId = null,
  caseId = null,
}) {
  // 1. Validasi dasar sebelum kirim ke BE
  if (!poles || poles.length === 0) {
    throw new Error("Pole data is required for calculation.");
  }

  const resolvedRequestId =
    requestId ||
    (caseId ? sessionStorage.getItem(`case_request_id_${caseId}`) : null) ||
    sessionStorage.getItem("active_request_id") ||
    null;

  // ── Penyiapan parameter kalkulasi (Standard vs Custom) ──
  const isStandard = condition?.poleType === "standard";

  // Nilai lowestHeight dari input front end (default "0")
  const lowestHeight =
    poleConfig?.lowestHeight !== undefined && poleConfig?.lowestHeight !== ""
      ? poleConfig.lowestHeight
      : "0";

  const isEmbedment =
    isStandard &&
    (taperPoleStandard?.groundPosition === "embedment" ||
      taperPoleStandard?.installationPole === "embedment" ||
      condition?.groundPosition === "embedment" ||
      condition?.installationPole === "embedment");

  const isUnderGL =
    isStandard &&
    !isEmbedment &&
    (taperPoleStandard?.groundPosition === "underGL" ||
      taperPoleStandard?.groundPosition === "under_gl" ||
      condition?.groundPosition === "under_gl");

  // Kode tipe tiang standard (misal: "IS", "IA", "LS", "LA", "TS", "TA")
  // Hanya berlaku untuk mode standard
  const poleStandardType = isStandard
    ? (taperPoleStandard?.poleType ||
        condition?.taperPoleType ||
        straightPoleStandard?.poleType ||
        "")
    : "";

  // poleStandardHeightId:
  // - Mode standard: ambil dari taperPoleStandard atau straightPoleStandard
  // - Mode custom: jangan sertakan / null
  let poleStandardHeightId = isStandard
    ? (taperPoleStandard?.poleStandardHeightId ||
        straightPoleStandard?.poleStandardHeightId ||
        null)
    : null;

  // Pastikan poleStandardHeightId sinkron dengan posisi tanah (On GL vs Under GL):
  // Di backend, ID tiang On GL (misal 8000 mm) dan Under GL (misal 8300 mm) adalah entitas berbeda.
  // Jika groundPosition adalah under_gl, WAJIB menggunakan ID entitas Under GL agar tidak ditolak BE
  // dengan error: "groundPosition under_gl is not available for this pole".
  if (isStandard && poleStandardType) {
    const nominalH =
      taperPoleStandard?.height ||
      condition?.height ||
      (poles?.[0]?.zHeight ? Number(poles[0].zHeight) / 1000 : null);

    const dynamicallyResolvedId = await resolveStandardHeightId({
      poleType: poleStandardType,
      nominalHeight: nominalH,
      isUnderGL,
    });
    if (dynamicallyResolvedId) {
      poleStandardHeightId = dynamicallyResolvedId;
    }
  }

  const groundPosition = isEmbedment
    ? "embedment"
    : isUnderGL
      ? "under_gl"
      : "on_gl";

  // Hitung evaluatedPositionsM berdasarkan spesifikasi:
  // 1. Standard Embedment:
  //    - IS, LS, TS => [lowestHeightM]
  //    - IA, LA, TA => [heightPole2M, lowestHeightM]
  // 2. Standard On GL / Under GL:
  //    - IS, LS, TS => [0]
  //    - IA, LA, TA => [heightPole2M, 0]
  // 3. Custom:
  //    - 1 pole => [lowestHeightM]
  //    - >1 poles => [heightPole2M, heightPole3M, ..., lowestHeightM]
  const evaluatedPositionsM = calculateEvaluatedPositionsM({
    isStandard,
    poleStandardType,
    poles,
    lowestHeight,
    groundPosition,
    isEmbedment,
  });

  const std = String(condition?.designStandard || condition?.standard || "").toLowerCase();
  const isOldJil =
    (std.includes("jil") ||
      std.includes("lighting") ||
      std === "old_lighting_pole" ||
      std === "old_jil" ||
      std === "jil") &&
    !std.includes("new");

  const materialsList = await getMasterMaterials();

  // Kirim spec step pole berdasarkan apa yang ada di input front end saat itu
  const calcStepPoles = mapCalculationStepPoles(poles, materialsList);
  const calcDirectObjects = mapCalculationDirectObjects(directObjects, isOldJil);
  const calcOverheadWires = mapCalculationOverheadWires(overheadWires);
  const calcArms = mapCalculationArms(arms, materialsList, isOldJil);

  const embedmentLengthMm =
    isEmbedment &&
    (taperPoleStandard?.embedmentLength || poleConfig?.embedmentLength)
      ? Number(taperPoleStandard?.embedmentLength || poleConfig?.embedmentLength)
      : null;

  // ── 1.A. JIKA DALAM KONTEKS CALCULATION CASE (Standard maupun Custom) ──
  if (resolvedRequestId && caseId) {
    try {
      const res = await calculateCase(resolvedRequestId, caseId, {
        ...(isStandard && poleStandardHeightId ? { poleStandardHeightId } : {}),
        stepPoles: calcStepPoles,
        evaluatedPositionsM,
        directObjects: calcDirectObjects,
        overheadWires: calcOverheadWires,
        arms: calcArms,
        groundPosition,
        ...(isStandard && embedmentLengthMm !== null ? { embedmentLengthMm } : {}),
      });

      const parsed = transformBackendCalculationResult(
        res,
        poles,
        directObjects,
        overheadWires,
        arms,
      );
      if (parsed) return parsed;
    } catch (apiErr) {
      throw formatCalculationError(apiErr);
    }
  }

  // ── 1.B. JIKA DALAM KONTEKS PROJECT TOOLS (Standalone / tanpa caseId) ──
  if (!caseId) {
    // Resolve designStandardId — async fetch from master data, no hardcoded UUIDs
    let designStandardId = condition?.designStandardId;
    if (!designStandardId) {
      const standardsList = await getMasterDesignStandards();
      designStandardId = resolveDesignStandardId(
        condition?.designStandard || condition?.standard,
        standardsList,
      );
    }
    if (!designStandardId) {
      throw new Error(
        "Design standard could not be resolved. Please ensure master data is loaded or re-select the standard from the Initial step.",
      );
    }

    const sessionPayload = {
      conditions: {
        designStandardId,
        windSpeed: Number(condition?.designWindSpeed ?? condition?.windSpeed ?? 60),
        airDensity: Number(condition?.designAirDensity ?? condition?.airDensity ?? 1.23),
        horizontalAcceleration: condition?.horizontalAcceleration
          ? Number(condition.horizontalAcceleration)
          : null,
        responseRatio: condition?.responseRatio
          ? Number(condition.responseRatio)
          : null,
      },
      input: {
        ...(isStandard && poleStandardHeightId ? { poleStandardHeightId } : {}),
        stepPoles: calcStepPoles,
        evaluatedPositionsM,
        directObjects: calcDirectObjects,
        overheadWires: calcOverheadWires,
        arms: calcArms,
        groundPosition,
        ...(isStandard && embedmentLengthMm !== null ? { embedmentLengthMm } : {}),
      },
    };

    try {
      const res = await calculateProjectToolsPole(sessionPayload);
      const parsed = transformBackendCalculationResult(
        res,
        poles,
        directObjects,
        overheadWires,
        arms,
      );
      if (parsed) return parsed;
    } catch (apiErr) {
      if (apiErr?.response?.status && apiErr.response.status !== 404) {
        throw formatCalculationError(apiErr);
      }
      console.warn(
        "calculateProjectToolsPole returned 404 or failed, falling back to calculatePole...",
        apiErr,
      );
    }
  }

  // 2. Inisialisasi fallback payload untuk endpoint generic calculatePole
  let payload = {
    condition,
    poleConfig: {
      ...poleConfig,
      lowestHeight: String(lowestHeight),
      groundPosition: Number(lowestHeight) < 0 ? "underGL" : "onGL",
    },
    ...(isStandard && poleStandardHeightId ? { poleStandardHeightId } : {}),
    stepPoles: calcStepPoles,
    evaluatedPositionsM,
    groundPosition,
    ...(isStandard && embedmentLengthMm !== null ? { embedmentLengthMm } : {}),
  };

  // 3. Mapping Payload berdasarkan poleType
  switch (condition.poleType) {
    case "custom":
      // Kirim semua data mentah dari user
      payload = {
        ...payload,
        poles,
        directObjects,
        overheadWires,
        arms,
      };
      break;

    case "standard":
      // Pastikan type ada
      const type = poleTypeStandard?.type;
      if (!type) {
        throw new Error("Pole type is required for standard mode");
      }

      payload = {
        ...payload,
        poleTypeStandard,
        poles,
        directObjects,
        overheadWires,
        arms,
      };

      if (type === "taper" || type === "tapered") {
        // Untuk taper, BE butuh selection user + data hasil resolve
        const lowestStep =
          poleConfig?.lowestHeight !== undefined && poleConfig?.lowestHeight !== ""
            ? String(poleConfig.lowestHeight)
            : taperPoleStandard?.groundPosition === "onGL"
              ? "0"
              : String(taperPoleStandard?.embedmentLength || "-300");

        payload = {
          ...payload,
          taperPoleStandard,
          poleConfig: {
            ...poleConfig,
            lowestHeight: lowestStep,
            groundPosition:
              taperPoleStandard?.groundPosition ||
              (Number(lowestStep) < 0 ? "underGL" : "onGL"),
          },
        };
      } else if (type === "straight") {
        // Untuk straight, kirim konfigurasi spec-nya + hasil resolve poles
        const lowestStep =
          straightPoleStandard?.groundPosition === "onGL"
            ? "0"
            : String(straightPoleStandard?.lowestHeight ?? "0");

        payload = {
          ...payload,
          straightPoleStandard,
          poleConfig: {
            ...poleConfig,
            lowestHeight: lowestStep,
            groundPosition: straightPoleStandard?.groundPosition || "onGL",
          },
        };
      }
      break;

    default:
      throw new Error("Invalid calculation poleType");
  }

  // 4. Eksekusi API call
  try {
    return await calculatePole(payload);
  } catch (error) {
    // Logika handling error API (opsional)
    console.error("Calculation API Error:", error);
    throw error;
  }
}
