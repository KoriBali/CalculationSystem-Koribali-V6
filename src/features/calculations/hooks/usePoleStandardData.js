// src/features/calculations/hooks/usePoleStandardData.js
/**
 * ============================================================================
 * POLE STANDARD DATA HOOK (usePoleStandardData)
 * ============================================================================
 * Mengambil dan mengelola data master standar tiang penerangan jalan (Road Lighting Pole)
 * dari backend API (/api/master/pole-standards) dengan fallback otomatis ke
 * data katalog statis (specStandardPole.json).
 *
 * ALUR PENGAMBILAN DATA (DATA FLOW):
 * 1. Hook memanggil getPoleStandardData() dari poleStandardService.
 * 2. Cek sessionStorage ('poleStandardData') dengan cache TTL 1 jam.
 * 3. Jika cache kosong/expired, fetch GET /api/master/pole-standards.
 * 4. Data dari backend dinormalisasi menjadi:
 *    - poleStandardOptions: Daftar tipe tiang (IS, IA, LS, LA, TS, TA)
 *    - heightOptionsByStandard: Daftar tinggi tiang per tipe & posisi tanah (onGL / underGL)
 * 5. Jika backend offline/gagal, otomatis menggunakan fallback dari specStandardPole.json
 *    sehingga UI tetap dapat menampilkan spesifikasi dan gambar tiang secara lengkap.
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getPoleStandardData,
  clearPoleStandardCache,
} from "../services/poleStandardService";
import STANDARD_POLE_DATA from "../data/specStandardPole.json";

// ─── 1. HELPER PARSERS ────────────────────────────────────────────────────────

/**
 * Mengekstrak kode singkat dari format nama standar (misal "Type-I (IS)" -> "IS")
 * Digunakan untuk mencocokkan key skematik gambar SVG dan katalog dimensi.
 */
export const extractShortCode = (name) => {
  if (!name) return "";
  const match = name.match(/\(([^)]+)\)/);
  return match ? match[1] : name;
};

/**
 * Menyusun daftar pilihan ketinggian tiang dari data katalog fallback (specStandardPole.json)
 * saat backend master data belum tersedia atau offline.
 */
function deriveFallbackHeightOptions() {
  const result = {};
  const tapered =
    STANDARD_POLE_DATA?.tapered || STANDARD_POLE_DATA?.taper || {};

  Object.entries(tapered).forEach(([shortCode, groups]) => {
    const processGroup = (groundGroup, isUnderGL) => {
      const rawKeys = Object.keys(groundGroup || {}).sort(
        (a, b) => Number(a) - Number(b),
      );
      const seenStd = new Set();
      const seenLabels = new Set();
      const options = [];

      for (const k of rawKeys) {
        const item = groundGroup[k];
        const stdId = item?.standardId;
        if (stdId && seenStd.has(stdId)) continue;
        if (stdId) seenStd.add(stdId);

        const numM = Number(k);
        const displayMeter = isUnderGL
          ? `${numM} m`
          : numM === 4.5 || numM === 4.6
            ? "4.5 m"
            : numM === 5 || numM === 5.1
              ? "5 m"
              : `${Math.round(numM)} m`;

        if (seenLabels.has(displayMeter)) continue;
        seenLabels.add(displayMeter);

        options.push({
          id: String(k),
          heightId: stdId || null,
          label: `${Math.round(numM * 1000)} mm`,
          displayMeter,
        });
      }
      return options;
    };

    result[shortCode] = {
      onGL: processGroup(groups.onGL, false),
      underGL: processGroup(groups.underGL, true),
    };
  });

  return result;
}

/**
 * Menyusun daftar opsi tipe tiang standar (IS, IA, LS, LA, TS, TA)
 */
function deriveTaperOptions(taperEntries) {
  if (!taperEntries || taperEntries.length === 0) {
    const tapered =
      STANDARD_POLE_DATA?.tapered || STANDARD_POLE_DATA?.taper || {};
    const fullNameMap = {
      IS: "Type-I (IS)",
      IA: "Type-I (IA)",
      LS: "Type-L (LS)",
      LA: "Type-L (LA)",
      TS: "Type-T (TS)",
      TA: "Type-T (TA)",
    };
    return Object.keys(tapered).map((shortCode) => ({
      id: shortCode,
      label: fullNameMap[shortCode] || `Type-${shortCode} (${shortCode})`,
    }));
  }

  return taperEntries.map((entry) => ({
    id: extractShortCode(entry.name),
    label: entry.name,
    backendId: entry.id,
  }));
}

/**
 * Menyusun pemetaan ketinggian tiang dari entitas master data backend
 * Memetakan ketinggian On GL dan Under GL (selisih kedalaman tanam 0.3m).
 */
function deriveHeightOptions(taperEntries) {
  const fallback = deriveFallbackHeightOptions();
  if (!taperEntries || taperEntries.length === 0) {
    return fallback;
  }

  const result = { ...fallback };

  taperEntries.forEach((entry) => {
    const shortCode = extractShortCode(entry.name);
    const rawItems = entry.poleStandardHeights || [];
    if (rawItems.length === 0) return;

    const heightMap = new Map();
    const heights = [];

    rawItems.forEach((item) => {
      const hRaw = Number(item.height);
      const inMeters = hRaw > 100 ? hRaw / 1000 : hRaw;
      const roundedM = Math.round(inMeters * 10) / 10;
      heightMap.set(Math.round(roundedM * 10), item.id);
      heights.push(roundedM);
    });

    const heightSet = new Set(heights.map((h) => Math.round(h * 10)));
    const onGL = [];
    const underGL = [];
    const seenOnGL = new Set();
    const seenUnderGL = new Set();

    heights.forEach((h) => {
      const hasUnderGLPair = heightSet.has(Math.round((h + 0.3) * 10));
      const isUnderGLPair = heightSet.has(Math.round((h - 0.3) * 10));

      if (hasUnderGLPair && !seenOnGL.has(h)) {
        seenOnGL.add(h);
        onGL.push(h);
      } else if (isUnderGLPair && !seenUnderGL.has(h)) {
        seenUnderGL.add(h);
        underGL.push(h);
      }
    });

    const toOption = (h) => {
      const isDecimal = h % 1 !== 0;
      const displayMeter = isDecimal ? `${h} m` : `${Math.round(h)} m`;
      return {
        id: String(h),
        heightId: heightMap.get(Math.round(h * 10)) || null,
        label: `${Math.round(h * 1000)} mm`,
        displayMeter,
      };
    };

    if (onGL.length > 0 || underGL.length > 0) {
      result[shortCode] = {
        onGL: onGL.sort((a, b) => a - b).map(toOption),
        underGL: underGL.sort((a, b) => a - b).map(toOption),
      };
    }
  });

  return result;
}

// ─── 2. MAIN HOOK ─────────────────────────────────────────────────────────────

export function usePoleStandardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Eksekusi pengambilan data master dari service
  const runFetch = useCallback(() => {
    getPoleStandardData()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err) => {
        console.warn("Using local standard pole fallback data:", err?.message);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    runFetch();
  }, [runFetch]);

  // Fungsi untuk membersihkan cache sessionStorage dan fetch ulang jika diperlukan
  const refetch = useCallback(() => {
    clearPoleStandardCache();
    setLoading(true);
    setError(null);
    runFetch();
  }, [runFetch]);

  // Filter khusus standar tiang taper (IS, IA, LS, LA, TS, TA)
  const taperEntries = useMemo(
    () =>
      data?.filter(
        (item) => item.type === "taper" || item.type === "tapered",
      ) || [],
    [data],
  );

  const poleStandardOptions = useMemo(
    () => deriveTaperOptions(taperEntries),
    [taperEntries],
  );

  const heightOptionsByStandard = useMemo(
    () => deriveHeightOptions(taperEntries),
    [taperEntries],
  );

  return {
    data,
    loading,
    error,
    refetch,
    poleStandardOptions,
    heightOptionsByStandard,
  };
}
