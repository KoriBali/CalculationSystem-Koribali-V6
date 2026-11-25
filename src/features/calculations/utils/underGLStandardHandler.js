// src/features/calculations/utils/underGLStandardHandler.js
/**
 * ============================================================================
 * UNDER GL STANDARD POLE HANDLER
 * ============================================================================
 * Menangani transisi dinamis antara mode On GL (lowestHeight >= 0) dan Under GL (lowestHeight < 0)
 * untuk tiang standar pada halaman Structural Calculation (/project-tools/structural).
 *
 * ATURAN LOGIKA BISNIS (BUSINESS RULES):
 * 1. Pemicu Under GL:
 *    - Ketika `lowestHeight < 0` (misal -300 mm, -250 mm), otomatis memicu mode Under GL.
 *    - Ketika `lowestHeight >= 0` (misal 0 mm), otomatis kembali ke mode On GL.
 *
 * 2. Basis Data Master Under GL:
 *    - Spesifikasi standar Under GL dari BE / katalog memiliki kedalaman tanam basis 300 mm (-300 mm).
 *    - Jika input lowestHeight tepat -300 mm, seluruh segmen tiang dimuat murni apa adanya dari BE/katalog:
 *      * Contoh IS 8000 mm -> Pole-1: 8300 mm, Pole-2: 300 mm
 *      * Contoh IA 5000 mm -> Pole-1: 5300 mm, Pole-2: 3405 mm, Pole-3: 1800 mm
 *
 * 3. Penyesuaian Kedalaman Custom (misal -250 mm):
 *    - delta = Math.abs(lowestHeight) - 300 (misal: 250 - 300 = -50 mm).
 *    - Pole-1 (segmen teratas / elevasi total): zHeight = baseZHeight + delta
 *      * Contoh IS 8000: 8300 + (-50) = 8250 mm
 *      * Contoh IA 5000: 5300 + (-50) = 5250 mm
 *    - Pole terbawah / Pole-N (segmen tertanam di tanah): zHeight = baseZHeight + delta
 *      * Contoh IS 8000: 300 + (-50) = 250 mm
 *      * Contoh IA 5000: 1800 + (-50) = 1750 mm
 *    - Segmen perantara (Pole-2 pada IA): Ketinggian TETAP SAMA (3405 mm).
 * ============================================================================
 */

import STANDARD_POLE_DATA from "../data/specStandardPole.json";
import { getMasterPoleStandardHeightGeometry } from "../services/requestService.js";

/**
 * Mengonversi key nominal ketinggian On GL ke key Under GL (+0.3m).
 * Contoh: "8" -> "8.3", "5" -> "5.3", "4.5" -> "4.8", "12.1" -> "12.4"
 */
export function getUnderGLKey(onGLKey) {
  if (!onGLKey) return "";
  const numM = Number(onGLKey);
  if (isNaN(numM)) return "";
  return String(Math.round((numM + 0.3) * 10) / 10);
}

/**
 * Mengambil data spesifikasi tiang standar Under GL (basis kedalaman tanam standar 300 mm).
 * Mengutamakan pemanggilan API backend (getMasterPoleStandardHeightGeometry),
 * dan fallback ke katalog lokal specStandardPole.json jika offline/gagal.
 */
export async function fetchStandardUnderGLPoles({
  shortCode,
  nominalHeight,
  underGLHeightId = null,
}) {
  if (!shortCode || !nominalHeight) return null;
  const underKey = getUnderGLKey(nominalHeight);
  let rawStepPoles = null;

  // 1. Coba ambil spesifikasi geometri murni dari backend API jika underGLHeightId tersedia
  if (
    underGLHeightId &&
    String(underGLHeightId) !== "null" &&
    String(underGLHeightId) !== "undefined"
  ) {
    try {
      const beGeom = await getMasterPoleStandardHeightGeometry(underGLHeightId);
      const beData = beGeom?.data || beGeom;
      if (Array.isArray(beData?.stepPoles) && beData.stepPoles.length > 0) {
        rawStepPoles = beData.stepPoles;
      }
    } catch (err) {
      console.warn(
        `[underGLStandardHandler] Fallback to local catalog for ${shortCode} ${underKey}:`,
        err?.message,
      );
    }
  }

  // 2. Jika data BE belum didapat, ambil dari katalog lokal specStandardPole.json
  if (!rawStepPoles) {
    const taper =
      STANDARD_POLE_DATA?.tapered || STANDARD_POLE_DATA?.taper || {};
    const entry = taper[shortCode]?.underGL?.[underKey] || {};
    if (Array.isArray(entry.poles) && entry.poles.length > 0) {
      return entry.poles.map((p, idx) => ({
        id: String(idx + 1),
        name: p.name
          ? p.name.includes("−")
            ? `Pole-${idx + 1}`
            : p.name
          : `Pole-${idx + 1}`,
        material: p.material || "STK400",
        poleType: p.poleType || "Taper",
        lowerDiameter: String(p.lowerDiameter),
        upperDiameter: String(p.upperDiameter || p.lowerDiameter),
        lowerThickness: String(p.lowerThickness || "4"),
        upperThickness: String(p.upperThickness || p.lowerThickness || "4"),
        zHeight: String(p.zHeight),
        quantity: String(p.quantity || "1"),
      }));
    }
    return null;
  }

  // 3. Normalisasi data step poles dari BE (urutkan Pole-1, Pole-2, ...)
  const sorted = [...rawStepPoles].sort((a, b) => {
    const getNum = (name) => {
      const m = String(name || "").match(/\d+/);
      return m ? Number(m[0]) : 0;
    };
    const numA = getNum(a.name);
    const numB = getNum(b.name);
    if (numA && numB) return numA - numB;
    return Number(b.topElevationM ?? 0) - Number(a.topElevationM ?? 0);
  });

  return sorted.map((sp, idx) => {
    const elevM = Number(sp.topElevationM ?? sp.elevationM ?? 0);
    const heightMm = Math.round(elevM * 1000);
    const poleTypeStr = sp.poleType
      ? sp.poleType.toLowerCase() === "straight"
        ? "Straight"
        : "Taper"
      : "Taper";
    const lowerDia = String(sp.diameterLowerMm ?? sp.lowerDiameter ?? "165");
    const upperDia =
      poleTypeStr === "Straight"
        ? lowerDia
        : String(sp.diameterUpperMm ?? sp.upperDiameter ?? lowerDia);
    const lowerThk = String(
      sp.thicknessLowerMm ?? sp.thicknessMm ?? sp.lowerThickness ?? "4",
    );
    const upperThk =
      poleTypeStr === "Straight"
        ? lowerThk
        : String(
            sp.thicknessUpperMm ??
              sp.thicknessMm ??
              sp.upperThickness ??
              lowerThk,
          );
    const matName =
      typeof sp.material === "object"
        ? sp.material?.name || "STK400"
        : sp.material || sp.materialName || "STK400";

    return {
      id: String(idx + 1),
      name: sp.name || `Pole-${idx + 1}`,
      material: matName,
      poleType: poleTypeStr,
      lowerDiameter: lowerDia,
      upperDiameter: upperDia,
      lowerThickness: lowerThk,
      upperThickness: upperThk,
      zHeight: String(heightMm),
      quantity: String(sp.quantity || "1"),
    };
  });
}

/**
 * Mengambil data spesifikasi tiang standar On GL (lowestHeight = 0 mm).
 */
export function getStandardOnGLPoles(shortCode, nominalHeight) {
  const taper =
    STANDARD_POLE_DATA?.tapered || STANDARD_POLE_DATA?.taper || {};
  const entry = taper[shortCode]?.onGL?.[nominalHeight] || {};
  if (Array.isArray(entry.poles) && entry.poles.length > 0) {
    return entry.poles.map((p, idx) => ({
      id: String(idx + 1),
      name: p.name
        ? p.name.includes("−")
          ? `Pole-${idx + 1}`
          : p.name
        : `Pole-${idx + 1}`,
      material: p.material || "STK400",
      poleType: p.poleType || "Taper",
      lowerDiameter: String(p.lowerDiameter),
      upperDiameter: String(p.upperDiameter || p.lowerDiameter),
      lowerThickness: String(p.lowerThickness || "4"),
      upperThickness: String(p.upperThickness || p.lowerThickness || "4"),
      zHeight: String(p.zHeight),
      quantity: String(p.quantity || "1"),
    }));
  }
  return null;
}

/**
 * Menyesuaikan ketinggian step poles Under GL berdasarkan nilai Lowest Height custom.
 *
 * Aturan Penyesuaian:
 * - currentDepth = Math.abs(lowestHeight)
 * - delta = currentDepth - 300
 * - Jika delta === 0 (-300 mm): mengembalikan basis apa adanya dari BE/katalog
 * - Jika delta !== 0 (misal: -250 mm):
 *   * Pole-1 (segmen teratas) = baseHeight + delta
 *   * Pole terbawah (segmen tanah) = baseHeight + delta
 *   * Segmen tengah = tetap sama
 */
export function adjustPolesForLowestHeight(baseUnderPoles, lowestHeight) {
  if (!Array.isArray(baseUnderPoles) || baseUnderPoles.length === 0) {
    return baseUnderPoles;
  }

  const numLowest = Number(lowestHeight);
  if (isNaN(numLowest) || numLowest >= 0) {
    return baseUnderPoles;
  }

  const currentDepth = Math.abs(numLowest);
  const STANDARD_DEPTH = 300;
  const delta = currentDepth - STANDARD_DEPTH;

  // Jika tepat -300 mm, gunakan persis dari master data
  if (delta === 0) {
    return baseUnderPoles.map((p) => ({ ...p }));
  }

  const lastIdx = baseUnderPoles.length - 1;

  return baseUnderPoles.map((p, idx) => {
    const baseH = Number(p.zHeight || 0);

    // 1. Pole-1 (segmen teratas): disesuaikan dengan delta
    if (idx === 0) {
      return {
        ...p,
        zHeight: String(Math.max(0, baseH + delta)),
      };
    }

    // 2. Pole terbawah (segmen tanah): disesuaikan dengan delta
    if (idx === lastIdx) {
      return {
        ...p,
        zHeight: String(Math.max(0, baseH + delta)),
      };
    }

    // 3. Segmen tiang tengah (misal Pole-2 pada IA): TETAP SAMA
    return {
      ...p,
    };
  });
}
