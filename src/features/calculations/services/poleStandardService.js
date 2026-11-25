// Fetches and caches pole standard master data (stepped/taper pole types,
// diameters, combinations, thicknesses, heights) from its own dedicated
// bootstrap-style endpoint — separate from /api/master/bootstrap.
const STORAGE_KEY = "poleStandardData";

// Backend refreshes its own master data cache every hour.
const CACHE_TTL_MS = 60 * 60 * 1000;

let inFlightRequest = null;

function readCache() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const { data, cachedAt } = JSON.parse(raw);
    if (!data || typeof cachedAt !== "number") {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - cachedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeCache(data) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ data, cachedAt: Date.now() }),
  );
}

async function fetchPoleStandards() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const response = await fetch(`${baseUrl}/api/master/pole-standards`);

  if (!response.ok) {
    throw new Error(`Failed to load pole standard data (status ${response.status})`);
  }

  const json = await response.json();
  if (!json?.success || !Array.isArray(json?.data)) {
    throw new Error("Invalid pole standard data response");
  }

  return json.data;
}

// Returns cached pole standard data if available, otherwise fetches it from
// /api/master/pole-standards and caches the result in sessionStorage for the
// rest of the tab's lifetime (or until it expires per CACHE_TTL_MS, whichever
// comes first). Cleared automatically when the tab is closed.
export async function getPoleStandardData() {
  const cached = readCache();
  if (cached) return cached;

  if (!inFlightRequest) {
    inFlightRequest = fetchPoleStandards()
      .then((data) => {
        writeCache(data);
        return data;
      })
      .finally(() => {
        inFlightRequest = null;
      });
  }

  return inFlightRequest;
}

export function clearPoleStandardCache() {
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Resolves the backend UUID for a road lighting pole standard height.
 * Handles both On GL (nominal height) and Under GL (nominal height + 0.3m embedment allowance).
 *
 * @param {Object} params
 * @param {string} params.poleType - Standard pole code (e.g. "IS", "IA", "LS", "LA", "TS", "TA" or "Type-I (IS)")
 * @param {number|string} params.nominalHeight - Nominal height in meters (e.g. 8, "8", 4.5)
 * @param {boolean} [params.isUnderGL=false] - Whether groundPosition is Under GL
 * @returns {Promise<string|null>} The backend UUID of the matching pole standard height
 */
export async function resolveStandardHeightId({
  poleType,
  nominalHeight,
  isUnderGL = false,
}) {
  if (!poleType || !nominalHeight) return null;
  try {
    const poleStandards = await getPoleStandardData();
    const rawCode = String(poleType).trim();
    const shortCode = rawCode.match(/\(([^)]+)\)/)?.[1] || rawCode.toUpperCase();

    const entry = poleStandards?.find((item) => {
      const name = String(item.name || "").toUpperCase();
      return name.includes(`(${shortCode})`) || name === shortCode;
    });

    if (!entry?.poleStandardHeights || !Array.isArray(entry.poleStandardHeights)) {
      return null;
    }

    const rawH = Number(nominalHeight);
    const mH = rawH > 100 ? rawH / 1000 : rawH;
    // Under GL pole heights in backend master data are nominal + 0.3m (e.g. 8m -> 8.3m, 4.5m -> 4.8m)
    const effectiveM = isUnderGL ? mH + 0.3 : mH;
    const targetMm = Math.round(effectiveM * 1000);

    const matched = entry.poleStandardHeights.find((h) => {
      const hNum = Number(h.height);
      const hMm = hNum > 100 ? Math.round(hNum) : Math.round(hNum * 1000);
      return Math.abs(hMm - targetMm) < 50;
    });

    return matched?.id || null;
  } catch (err) {
    console.warn("[resolveStandardHeightId] Error resolving standard height ID:", err);
    return null;
  }
}
