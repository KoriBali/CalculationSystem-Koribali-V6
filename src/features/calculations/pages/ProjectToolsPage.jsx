// src/features/calculations/pages/ProjectToolsPage.jsx
/**
 * ============================================================================
 * POLE TYPE CONFIGURATION PAGE (ProjectToolsPage)
 * ============================================================================
 * Halaman pemilihan konfigurasi tiang standar (Road Lighting Pole Standard)
 * atau custom mode sebelum masuk ke tahapan kalkulasi struktural (/project-tools/structural).
 *
 * TAMPILAN 2-KOLOM:
 * - Kolom Kiri: List group tipe standar (Type IS, Type IA, Type LS, Type LA, Type TS, Type TA)
 *   dengan daftar ketinggian masing-masing (IS 8, IS 10, IS 12, IA 4.5, dll).
 * - Kolom Kanan: Preview diagram tiang beserta overlay dimensi.
 * - Tanpa opsi embedment & under_gl untuk saat ini (default: baseplate On GL, lowest height = 0 mm).
 * ============================================================================
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  CheckCircle,
  Circle,
  RotateCcw,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { usePoleStandardData } from "../hooks/usePoleStandardData";
import { getMasterPoleStandardHeightGeometry } from "../services/requestService";
import STANDARD_POLE_DATA from "../data/specStandardPole.json";
import {
  DIAGRAM_IMAGE_MAP,
  EMBED_IMAGE_MAP,
  DIAGRAM_LABEL_LAYOUT,
  getDiagramLabels,
} from "../components/forms/pole/standard/taperDiagramConstants";
import {
  fetchStandardUnderGLPoles,
  getUnderGLKey,
} from "../utils/underGLStandardHandler";
import { resolveStandardHeightId } from "../services/poleStandardService";

export default function ProjectToolsPage() {
  const navigate = useNavigate();
  const previewRef = useRef(null);

  // Pengambilan data master standar dari backend API (dengan fallback katalog otomatis)
  const { heightOptionsByStandard } = usePoleStandardData();

  // Helper untuk membaca nilai awal pilihan dari sessionStorage (jika ada)
  const getSavedSelection = () => {
    try {
      const saved = sessionStorage.getItem(
        "lighting-project_projectToolsSelection",
      );
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          selectedStandard: parsed.selectedStandard || "",
          selectedHeight: parsed.selectedHeight || "",
          selectedHeightId: parsed.selectedHeightId || "",
          selectedGroundPosition: parsed.selectedGroundPosition || "onGL",
        };
      }
      const legacy = sessionStorage.getItem(
        "lighting-project_taperPoleStandard",
      );
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return {
          selectedStandard: parsed.poleType || "",
          selectedHeight: parsed.height || "",
          selectedHeightId: parsed.poleStandardHeightId || "",
          selectedGroundPosition: parsed.groundPosition || "onGL",
        };
      }
    } catch {}
    return {};
  };

  const initialSelection = useMemo(() => getSavedSelection(), []);

  // ─── COMPONENT STATE ────────────────────────────────────────────────────────
  const [selectedStandard, setSelectedStandard] = useState(
    () => initialSelection.selectedStandard || "",
  );
  const [selectedHeight, setSelectedHeight] = useState(
    () => initialSelection.selectedHeight || "",
  );
  const [selectedHeightId, setSelectedHeightId] = useState(
    () => initialSelection.selectedHeightId || "",
  );
  const [selectedGroundPosition, setSelectedGroundPosition] = useState(
    () => initialSelection.selectedGroundPosition || "onGL",
  );
  const [hasStandardError, setHasStandardError] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Cek apakah opsi Embedment tersedia untuk tinggi yang dipilih (khusus 8, 10, 12 m)
  const isEmbedmentAllowed = useMemo(() => {
    if (!selectedHeight) return true;
    const numH = Number(selectedHeight);
    return numH >= 7.9 && numH <= 13;
  }, [selectedHeight]);

  // Simpan setiap perubahan pilihan ke sessionStorage
  useEffect(() => {
    try {
      const payload = {
        selectedStandard,
        selectedHeight,
        selectedHeightId,
        selectedGroundPosition,
        installationType:
          selectedGroundPosition === "embedment" ? "embedment" : "baseplate",
        lowestHeightPosition: selectedGroundPosition,
      };
      sessionStorage.setItem(
        "lighting-project_projectToolsSelection",
        JSON.stringify(payload),
      );
    } catch (e) {
      console.warn(
        "Failed to save project tools selection to sessionStorage:",
        e,
      );
    }
  }, [
    selectedStandard,
    selectedHeight,
    selectedHeightId,
    selectedGroundPosition,
  ]);

  // Inisialisasi parameter workflow project saat halaman dimuat
  useEffect(() => {
    sessionStorage.setItem("projectType", "lighting-project");
    sessionStorage.setItem("projectMode", "calculation");
    sessionStorage.setItem(
      "lighting-project_workflow",
      JSON.stringify({
        projectType: "lighting-project",
        projectMode: "calculation",
      }),
    );
  }, []);

  // ─── LIST GROUP MASTER DATA ────────────────────────────────────────────────
  // Membangun daftar kelompok standar tiang: IS, IA, LS, LA, TS, TA
  const groupedStandardList = useMemo(() => {
    const types = ["IS", "IA", "LS", "LA", "TS", "TA"];
    const tapered =
      STANDARD_POLE_DATA?.tapered || STANDARD_POLE_DATA?.taper || {};

    return types.map((shortCode) => {
      const beOptions = heightOptionsByStandard?.[shortCode]?.onGL;
      const items = [];

      if (Array.isArray(beOptions) && beOptions.length > 0) {
        const seen = new Set();
        for (const opt of beOptions) {
          const numM = Number(opt.id);
          const cleanHeight =
            numM === 4.5 || numM === 4.6
              ? "4.5"
              : numM === 5 || numM === 5.1
                ? "5"
                : String(Math.round(numM));
          const label = `${shortCode} ${cleanHeight}`;
          if (!seen.has(label)) {
            seen.add(label);
            items.push({
              key: opt.id,
              heightId: opt.heightId,
              numM,
              label,
              heightMm: Math.round(numM * 1000),
            });
          }
        }
      } else {
        const group = tapered[shortCode]?.onGL || {};
        const rawKeys = Object.keys(group).sort(
          (a, b) => Number(a) - Number(b),
        );
        const seenStd = new Set();
        const seenLabels = new Set();

        for (const key of rawKeys) {
          const entry = group[key] || {};
          const stdId = entry.standardId;
          if (stdId && seenStd.has(stdId)) continue;
          if (stdId) seenStd.add(stdId);

          const numM = Number(key);
          const cleanHeight =
            numM === 4.5 || numM === 4.6
              ? "4.5"
              : numM === 5 || numM === 5.1
                ? "5"
                : String(Math.round(numM));
          const label = `${shortCode} ${cleanHeight}`;

          if (seenLabels.has(label)) continue;
          seenLabels.add(label);

          items.push({
            key,
            heightId: stdId || null,
            numM,
            label,
            heightMm: Math.round(numM * 1000),
          });
        }
      }

      return {
        type: shortCode,
        title: `Type ${shortCode}`,
        items,
      };
    });
  }, [heightOptionsByStandard]);

  // ─── DIAGRAM PREVIEW RESOLUTION ────────────────────────────────────────────
  // Gambar diagram SVG standar tiang (On GL, Under GL, atau Embedment)
  const currentImage = useMemo(() => {
    if (!selectedStandard) return null;
    if (selectedGroundPosition === "embedment") {
      return EMBED_IMAGE_MAP[selectedStandard] || null;
    }
    if (selectedGroundPosition === "underGL") {
      return DIAGRAM_IMAGE_MAP[selectedStandard]?.underGL || null;
    }
    return DIAGRAM_IMAGE_MAP[selectedStandard]?.onGL || null;
  }, [selectedStandard, selectedGroundPosition]);

  // Label dimensi angka pada diagram tiang
  const diagramLabels = useMemo(() => {
    if (!selectedStandard || !selectedHeight) return null;
    return getDiagramLabels(
      selectedStandard,
      selectedGroundPosition,
      selectedHeight,
      null,
    );
  }, [selectedStandard, selectedHeight, selectedGroundPosition]);

  // Tata letak anchor diagram SVG
  const diagramLayout = useMemo(() => {
    if (!selectedStandard) return null;
    return (
      DIAGRAM_LABEL_LAYOUT[`${selectedStandard}.${selectedGroundPosition}`] ||
      DIAGRAM_LABEL_LAYOUT[`${selectedStandard}.onGL`] ||
      null
    );
  }, [selectedStandard, selectedGroundPosition]);

  // ─── EVENT HANDLERS ────────────────────────────────────────────────────────
  // Pemilihan item tiang standar: mengklik item yang aktif akan unselect (toggle off)
  const handleSelectItem = (shortCode, heightKey, heightId) => {
    try {
      sessionStorage.removeItem("lighting-project_isCalculatedPole");
      sessionStorage.removeItem("lighting-project_results");
      sessionStorage.removeItem("lighting-project_displayResult");
      sessionStorage.removeItem("lighting-project_resultsDo");
      sessionStorage.removeItem("lighting-project_resultsArm");
      sessionStorage.removeItem("lighting-project_resultsOhw");
      sessionStorage.removeItem("lighting-project_showResults");
      sessionStorage.removeItem("lighting-project_calculatedInputsFingerprint");
      sessionStorage.removeItem("lighting-project_standardPreset");
      sessionStorage.removeItem("lighting-project_reportSnapshot");
      sessionStorage.removeItem("lighting-project_report");
      sessionStorage.removeItem("lighting-project_schematic_data");
    } catch {}

    if (selectedStandard === shortCode && selectedHeight === heightKey) {
      setSelectedStandard("");
      setSelectedHeight("");
      setSelectedHeightId("");
      setSelectedGroundPosition("onGL");
    } else {
      setSelectedStandard(shortCode);
      setSelectedHeight(heightKey);
      setSelectedHeightId(heightId || "");
      setSelectedGroundPosition("onGL"); // Default selalu On GL setiap pilih standar
      setHasStandardError(false); // Hapus indikator error jika sebelumnya ada

      // Auto-trigger: saat item dipilih, scroll halaman agar kartu preview langsung berada di posisi sticky (tepat di bawah header)
      setTimeout(() => {
        if (previewRef.current) {
          const isMobile = window.innerWidth < 768;
          const navHeaderOffset = 80; // md:top-20 (80px), posisi sticky tepat di bawah header
          const rect = previewRef.current.getBoundingClientRect();

          if (isMobile) {
            // Pada mobile (layout vertikal), scroll agar kartu diagram preview terlihat di layar
            const scrollTop =
              window.pageYOffset || document.documentElement.scrollTop;
            const targetY = rect.top + scrollTop - navHeaderOffset;
            window.scrollTo({ top: targetY, behavior: "smooth" });
          } else {
            // Pada desktop/tablet (layout 2 kolom berdampingan):
            // Jika kartu preview belum mencapai posisi sticky (rect.top > 80px) atau terdorong ke atas (rect.top < 80px),
            // scroll secara halus agar bagian atas preview ("Pole Diagram Preview" & ujung tiang) selalu tampil sempurna tepat di posisi sticky.
            if (
              rect.top > navHeaderOffset + 10 ||
              rect.top < navHeaderOffset - 10
            ) {
              const scrollTop =
                window.pageYOffset || document.documentElement.scrollTop;
              const targetY = scrollTop + (rect.top - navHeaderOffset);
              window.scrollTo({ top: targetY, behavior: "smooth" });
            }
          }
        }
      }, 50);
    }
  };

  // Pemilihan posisi tanah (On GL, Under GL, Embedment) langsung dari item standar
  const handleSelectGroundPosition = (
    shortCode,
    heightKey,
    heightId,
    groundPos,
  ) => {
    try {
      sessionStorage.removeItem("lighting-project_isCalculatedPole");
      sessionStorage.removeItem("lighting-project_results");
      sessionStorage.removeItem("lighting-project_displayResult");
      sessionStorage.removeItem("lighting-project_resultsDo");
      sessionStorage.removeItem("lighting-project_resultsArm");
      sessionStorage.removeItem("lighting-project_resultsOhw");
      sessionStorage.removeItem("lighting-project_showResults");
      sessionStorage.removeItem("lighting-project_calculatedInputsFingerprint");
      sessionStorage.removeItem("lighting-project_standardPreset");
      sessionStorage.removeItem("lighting-project_reportSnapshot");
      sessionStorage.removeItem("lighting-project_report");
      sessionStorage.removeItem("lighting-project_schematic_data");
    } catch {}

    setSelectedStandard(shortCode);
    setSelectedHeight(heightKey);
    setSelectedHeightId(heightId || "");
    setSelectedGroundPosition(groundPos);
    setHasStandardError(false);

    setTimeout(() => {
      if (previewRef.current) {
        const isMobile = window.innerWidth < 768;
        const navHeaderOffset = 80;
        const rect = previewRef.current.getBoundingClientRect();

        if (isMobile) {
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;
          const targetY = rect.top + scrollTop - navHeaderOffset;
          window.scrollTo({ top: targetY, behavior: "smooth" });
        } else {
          if (
            rect.top > navHeaderOffset + 10 ||
            rect.top < navHeaderOffset - 10
          ) {
            const scrollTop =
              window.pageYOffset || document.documentElement.scrollTop;
            const targetY = scrollTop + (rect.top - navHeaderOffset);
            window.scrollTo({ top: targetY, behavior: "smooth" });
          }
        }
      }
    }, 50);
  };

  // Helper pembersih data spesifikasi standar agar tidak terbawa ke mode custom
  const clearStandardPresetData = () => {
    try {
      sessionStorage.removeItem("lighting-project_taperPoleStandard");
      sessionStorage.removeItem("lighting-project_poleTypeStandard");
      sessionStorage.removeItem("lighting-project_straightPoleStandard");
      sessionStorage.removeItem("lighting-project_standardPreset");
      sessionStorage.removeItem("lighting-project_projectToolsSelection");
      sessionStorage.removeItem("lighting-project_openingType");
      sessionStorage.removeItem("lighting-project_boxType");
      sessionStorage.removeItem("lighting-project_calculatedOp");
      sessionStorage.removeItem("lighting-project_baseplateType");
      sessionStorage.removeItem("lighting-project_calculatedBaseplate");
      sessionStorage.removeItem("lighting-project_foundationType");
      sessionStorage.removeItem("lighting-project_squareCaisson");
      sessionStorage.removeItem("lighting-project_roundCaisson");
      sessionStorage.removeItem("lighting-project_calculatedFoundation");
      sessionStorage.removeItem("lighting-project_schematic_data");
    } catch {}
  };

  // Reset semua pilihan
  const handleReset = () => {
    setSelectedStandard("");
    setSelectedHeight("");
    setSelectedHeightId("");
    setSelectedGroundPosition("onGL");
    setHasStandardError(false);
    try {
      sessionStorage.removeItem("lighting-project_projectToolsSelection");
      sessionStorage.removeItem("lighting-project_isCalculatedPole");
      sessionStorage.removeItem("lighting-project_results");
      sessionStorage.removeItem("lighting-project_displayResult");
      sessionStorage.removeItem("lighting-project_resultsDo");
      sessionStorage.removeItem("lighting-project_resultsArm");
      sessionStorage.removeItem("lighting-project_resultsOhw");
      sessionStorage.removeItem("lighting-project_showResults");
      sessionStorage.removeItem("lighting-project_calculatedInputsFingerprint");
      sessionStorage.removeItem("lighting-project_standardPreset");
      sessionStorage.removeItem("lighting-project_reportSnapshot");
      sessionStorage.removeItem("lighting-project_report");
      sessionStorage.removeItem("lighting-project_schematic_data");
      clearStandardPresetData();
    } catch {}
  };

  // ─── NAVIGATION & DATA PERSISTENCE ─────────────────────────────────────────
  const handleNext = async () => {
    const isStandard = Boolean(selectedStandard && selectedHeight);
    setIsNavigating(true);

    try {
      if (isStandard) {
        // ── MODE STANDARD ──
        const isEmbedment = selectedGroundPosition === "embedment";
        const isUnderGL = selectedGroundPosition === "underGL";

        const taper =
          STANDARD_POLE_DATA.tapered || STANDARD_POLE_DATA.taper || {};
        const entry = taper[selectedStandard]?.onGL?.[selectedHeight] || {};

        let poleStandardHeightId = selectedHeightId || entry.standardId || "";
        let poles = entry.poles || [];
        let rawDirectObjects = entry.directObjects || [];
        let arms = entry.arms || [];
        let beData = null;

        if (isUnderGL) {
          // Resolve Under GL height ID and Under GL poles
          const underKey = getUnderGLKey(selectedHeight);
          const underOption = heightOptionsByStandard?.[
            selectedStandard
          ]?.underGL?.find(
            (opt) =>
              opt.id === underKey || opt.displayMeter === `${underKey} m`,
          );
          let underGLHeightId = underOption?.heightId || null;
          if (!underGLHeightId) {
            underGLHeightId = await resolveStandardHeightId({
              poleType: selectedStandard,
              nominalHeight: selectedHeight,
              isUnderGL: true,
            });
          }
          if (underGLHeightId) {
            poleStandardHeightId = underGLHeightId;
          }

          const underPoles = await fetchStandardUnderGLPoles({
            shortCode: selectedStandard,
            nominalHeight: selectedHeight,
            underGLHeightId,
          });
          if (underPoles && underPoles.length > 0) {
            poles = underPoles;
          }
        } else {
          // On GL or Embedment:
          // Default data dari BE / entry adalah On GL
          if (
            poleStandardHeightId &&
            String(poleStandardHeightId) !== "null" &&
            String(poleStandardHeightId) !== "undefined"
          ) {
            try {
              const beGeom =
                await getMasterPoleStandardHeightGeometry(poleStandardHeightId);
              beData = beGeom?.data || beGeom;

              if (
                Array.isArray(beData?.stepPoles) &&
                beData.stepPoles.length > 0
              ) {
                // Urutkan step poles agar Pole-1 selalu di Step Pole 1, Pole-2 di Step Pole 2, Pole-3 di Step Pole 3
                const sortedStepPoles = [...beData.stepPoles].sort((a, b) => {
                  const getNum = (name) => {
                    const m = String(name || "").match(/\d+/);
                    return m ? Number(m[0]) : 0;
                  };
                  const numA = getNum(a.name);
                  const numB = getNum(b.name);
                  if (numA && numB) return numA - numB;
                  return (
                    Number(b.topElevationM ?? 0) - Number(a.topElevationM ?? 0)
                  );
                });

                poles = sortedStepPoles.map((sp, idx) => {
                  const elevM = Number(sp.topElevationM ?? sp.elevationM ?? 0);
                  const heightMm = Math.round(elevM * 1000);

                  const poleTypeStr = sp.poleType
                    ? sp.poleType.toLowerCase() === "straight"
                      ? "Straight"
                      : "Taper"
                    : "Taper";

                  const lowerDia = String(
                    sp.diameterLowerMm ?? sp.lowerDiameter ?? "165",
                  );
                  const upperDia =
                    poleTypeStr === "Straight"
                      ? lowerDia
                      : String(
                          sp.diameterUpperMm ?? sp.upperDiameter ?? lowerDia,
                        );

                  const lowerThk = String(
                    sp.thicknessLowerMm ??
                      sp.thicknessMm ??
                      sp.lowerThickness ??
                      "4",
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

              if (
                Array.isArray(beData?.directObjects) &&
                beData.directObjects.length > 0
              ) {
                rawDirectObjects = beData.directObjects.map((d, idx) => ({
                  idDo: String(idx + 1),
                  name: d.name || "灯具",
                  type: "omni",
                  frontArea: String(d.frontAreaM2 ?? d.frontArea ?? "0.1"),
                  sideArea: "",
                  weight: String(d.massPerUnitKg ?? d.weight ?? "14"),
                  zHeight: String(
                    d.elevationM
                      ? Math.round(Number(d.elevationM) * 1000)
                      : (d.zHeight ?? Number(selectedHeight) * 1000),
                  ),
                  nnC: String(d.baseWindCoefficient ?? d.nnC ?? "1"),
                  quantity: String(d.quantity ?? "1"),
                  fixAngle: "0",
                }));
              }

              if (Array.isArray(beData?.arms)) {
                arms = beData.arms;
              }
            } catch (beErr) {
              console.warn(
                "[ProjectTools] Fallback to local catalog geometry:",
                beErr?.message,
              );
            }
          }
        }

        const directObjects = rawDirectObjects.map((d) => ({
          ...d,
          type: "omni",
          sideArea: "",
          fixAngle: "0",
        }));

        const resolvedArms = (arms || []).map((arm, armIdx) => {
          const matName =
            typeof arm.material === "object"
              ? arm.material?.name || "STK400"
              : arm.material || arm.materialName || "STK400";

          const rawObjects = arm.objects || arm.armObjects || [];
          const armObjects = rawObjects.map((ao, aoIdx) => ({
            idAo: String(ao.idAo || aoIdx + 1),
            name: ao.name || "灯具",
            type:
              ao.objectKind === "directional" || ao.type === "directional"
                ? "directional"
                : "omni",
            frontArea: String(ao.frontAreaM2 ?? ao.frontArea ?? "0.1"),
            sideArea: String(ao.sideAreaM2 ?? ao.sideArea ?? ""),
            weight: String(ao.massPerUnitKg ?? ao.weight ?? "14"),
            hDistance: String(
              ao.horizontalLoadDistanceM != null
                ? Math.round(Number(ao.horizontalLoadDistanceM) * 1000)
                : (ao.hDistance ??
                    (arm.exposedLengthM != null
                      ? Math.round(Number(arm.exposedLengthM) * 1000)
                      : "180")),
            ),
            nnC: String(ao.baseWindCoefficient ?? ao.nnC ?? "1"),
            quantity: String(ao.quantity ?? "1"),
            fixAngle: String(ao.fixedAngleDeg ?? ao.fixAngle ?? "0"),
          }));

          const totalLengthMm =
            arm.totalLengthM != null
              ? Math.round(Number(arm.totalLengthM) * 1000)
              : arm.length
                ? Math.round(Number(arm.length))
                : 180;
          const expLengthMm =
            arm.exposedLengthM != null
              ? Math.round(Number(arm.exposedLengthM) * 1000)
              : arm.expLength
                ? Math.round(Number(arm.expLength))
                : totalLengthMm;
          const heightMm =
            arm.installationHeightM != null
              ? Math.round(Number(arm.installationHeightM) * 1000)
              : arm.height || arm.zHeight
                ? Math.round(Number(arm.height || arm.zHeight))
                : 4800;
          const hDistanceMm =
            armObjects[0]?.hDistance ||
            (arm.hDistance ? String(arm.hDistance) : String(expLengthMm));

          return {
            idArm: String(arm.idArm || armIdx + 1),
            id: String(arm.id || armIdx + 1),
            name: arm.name || `Arm-${armIdx + 1}`,
            material: matName,
            armType: arm.armType || arm.type || "Straight",
            type: arm.type || arm.armType || "Straight",
            diameter: String(arm.diameterMm ?? arm.diameter ?? "60.5"),
            thickness: String(arm.thicknessMm ?? arm.thickness ?? "3.8"),
            length: String(totalLengthMm),
            expLength: String(expLengthMm),
            height: String(heightMm),
            zHeight: String(heightMm),
            hDistance: String(hDistanceMm),
            fixAngle: String(arm.fixedAngleDeg ?? arm.fixAngle ?? "0"),
            nnC: String(arm.baseWindCoefficient ?? arm.nnC ?? "0.7"),
            quantity: String(arm.quantity ?? "1"),
            armObjects,
          };
        });

        // Lowest Height & Installation setup
        const lowestHeightVal = isUnderGL ? "-300" : "0";
        const installationPole = isEmbedment ? "embedment" : "baseplate";
        const groundPositionCondition = isEmbedment
          ? "embedment"
          : isUnderGL
            ? "under_gl"
            : "on_gl";

        sessionStorage.setItem("projectType", "lighting-project");
        sessionStorage.setItem("projectMode", "calculation");
        sessionStorage.setItem(
          "lighting-project_condition",
          JSON.stringify({
            designStandard: "old_lighting_pole",
            designWindSpeed: "60",
            designAirDensity: "1.23",
            poleType: "standard",
            installationPole,
            groundPosition: groundPositionCondition,
            openingEnabled: false,
            baseplateEnabled: !isEmbedment,
            foundationEnabled: false,
          }),
        );
        sessionStorage.setItem(
          "lighting-project_taperPoleStandard",
          JSON.stringify({
            poleStandardHeightId,
            poleType: selectedStandard,
            installationPole,
            groundPosition: selectedGroundPosition,
            height: selectedHeight,
            embedmentLength: "",
          }),
        );
        sessionStorage.setItem("lighting-project_poles", JSON.stringify(poles));
        sessionStorage.setItem(
          "lighting-project_directObjects",
          JSON.stringify(directObjects),
        );
        sessionStorage.setItem(
          "lighting-project_arms",
          JSON.stringify(resolvedArms),
        );
        sessionStorage.setItem(
          "lighting-project_overheadWires",
          JSON.stringify([]),
        );
        sessionStorage.setItem(
          "lighting-project_poleConfig",
          JSON.stringify({
            lowestHeight: lowestHeightVal,
            embedmentLength: "",
            overDesign: "1",
          }),
        );
        sessionStorage.setItem(
          "lighting-project_standardPreset",
          JSON.stringify({
            poleType: selectedStandard,
            height: selectedHeight,
            groundPosition: selectedGroundPosition,
            installationPole,
            poleStandardHeightId,
            poles,
            directObjects,
            arms: resolvedArms,
            overheadWires: [],
          }),
        );
        sessionStorage.setItem(
          "lighting-project_projectToolsSelection",
          JSON.stringify({
            selectedStandard,
            selectedHeight,
            selectedHeightId: poleStandardHeightId,
            selectedGroundPosition,
            installationType: installationPole,
            lowestHeightPosition: selectedGroundPosition,
          }),
        );
        sessionStorage.setItem(
          "lighting-project_poleTypeStandard",
          JSON.stringify({ type: "taper" }),
        );

        // Data spesifikasi opening & baseplate default
        sessionStorage.setItem(
          "lighting-project_openingType",
          JSON.stringify({ type: "box" }),
        );
        sessionStorage.setItem(
          "lighting-project_boxType",
          JSON.stringify({
            boxWidth: "150",
            opWidth: "130",
            boxHeight: "6",
            opSurfaceHeight: "750",
            opLength: "600",
            openingDirection: "0",
          }),
        );
        sessionStorage.setItem(
          "lighting-project_calculatedOp",
          JSON.stringify({
            isCalculated: true,
            openingType: { type: "box" },
            boxWidth: "150",
            opWidth: "130",
            boxHeight: "6",
            opSurfaceHeight: "750",
            opLength: "600",
          }),
        );
        sessionStorage.setItem(
          "lighting-project_baseplateType",
          JSON.stringify({
            shape: "square",
            ribType: "four",
            sideLength: "350",
            thickness: "16",
            anchorBoltDiameter: "24",
            anchorBoltCount: "4",
          }),
        );
        sessionStorage.setItem(
          "lighting-project_calculatedBaseplate",
          JSON.stringify({
            isCalculated: true,
          }),
        );

        // Reset pole calculation state so user MUST recalculate for this selected standard pole
        sessionStorage.removeItem("lighting-project_isCalculatedPole");
        sessionStorage.removeItem("lighting-project_results");
        sessionStorage.removeItem("lighting-project_displayResult");
        sessionStorage.removeItem("lighting-project_resultsDo");
        sessionStorage.removeItem("lighting-project_resultsArm");
        sessionStorage.removeItem("lighting-project_resultsOhw");
        sessionStorage.removeItem("lighting-project_showResults");
        sessionStorage.removeItem(
          "lighting-project_calculatedInputsFingerprint",
        );
        sessionStorage.removeItem("lighting-project_reportSnapshot");
        sessionStorage.removeItem("lighting-project_report");
        sessionStorage.removeItem("lighting-project_schematic_data");
      } else {
        // ── MODE CUSTOM ──
        sessionStorage.setItem("projectType", "lighting-project");
        sessionStorage.setItem("projectMode", "calculation");
        sessionStorage.setItem(
          "lighting-project_condition",
          JSON.stringify({
            designStandard: "old_lighting_pole",
            designWindSpeed: "60",
            designAirDensity: "1.23",
            poleType: "custom",
            installationPole: "baseplate",
            openingEnabled: false,
            baseplateEnabled: true,
            foundationEnabled: false,
          }),
        );
        sessionStorage.setItem(
          "lighting-project_poles",
          JSON.stringify([
            {
              id: "1",
              name: "Pole-1",
              material: "STK400",
              poleType: "Taper",
              lowerDiameter: "165",
              upperDiameter: "85",
              lowerThickness: "4",
              upperThickness: "4",
              zHeight: "8000",
              quantity: "1",
            },
          ]),
        );
        sessionStorage.setItem(
          "lighting-project_directObjects",
          JSON.stringify([]),
        );
        sessionStorage.setItem("lighting-project_arms", JSON.stringify([]));
        sessionStorage.setItem(
          "lighting-project_overheadWires",
          JSON.stringify([]),
        );
        sessionStorage.setItem(
          "lighting-project_poleConfig",
          JSON.stringify({
            lowestHeight: "0",
            overDesign: "1",
          }),
        );

        // Reset pole calculation state for custom mode
        sessionStorage.removeItem("lighting-project_isCalculatedPole");
        sessionStorage.removeItem("lighting-project_results");
        sessionStorage.removeItem("lighting-project_displayResult");
        sessionStorage.removeItem("lighting-project_resultsDo");
        sessionStorage.removeItem("lighting-project_resultsArm");
        sessionStorage.removeItem("lighting-project_resultsOhw");
        sessionStorage.removeItem("lighting-project_showResults");
        sessionStorage.removeItem(
          "lighting-project_calculatedInputsFingerprint",
        );
        sessionStorage.removeItem("lighting-project_standardPreset");
        sessionStorage.removeItem("lighting-project_reportSnapshot");
        sessionStorage.removeItem("lighting-project_report");
        sessionStorage.removeItem("lighting-project_schematic_data");

        // Clear all standard preset configurations so custom mode starts 100% fresh / blank
        clearStandardPresetData();
      }

      navigate("/project-tools/structural");
    } finally {
      setIsNavigating(false);
    }
  };

  // ─── JSX RENDER VIEW ─────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1440px] mx-auto">
      <Helmet>
        <title>Pole Type Configuration · KORI BALI</title>
      </Helmet>

      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-md md:text-lg font-bold text-gray-900 tracking-tight">
          Pole type configuration
        </h1>
        <p className="text-gray-500 mt-1 text-xs md:text-sm">
          Choose a road lighting pole standard to apply its predefined
          specifications.
        </p>
      </div>

      {/* Informational Wireframe Banner */}
      <div className="mb-6 px-4 py-2.5 rounded border border-gray-300 bg-gray-50 text-gray-700 text-xs md:text-sm flex items-center justify-between">
        <p>
          If not using a Road Lighting Pole standard, click{" "}
          <span className="font-bold text-gray-900">NEXT</span> to enter
          specifications manually.
        </p>
      </div>

      {/* 2-Column Grid Layout: Side-by-Side (kiri-kanan) on tablet & desktop (md+), stacked vertically (bagi 2 ke bawah) only on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-[390px_1fr] lg:grid-cols-[420px_1fr] xl:grid-cols-[460px_1fr] gap-6 items-start">
        {/* ── LEFT PANEL: Pole Standard List Group (Full height down to bottom, page scrolls) ── */}
        <div
          className={`border rounded-lg p-3.5 sm:p-4 flex flex-col bg-white shadow-xs transition-colors duration-200 ${
            hasStandardError
              ? "border-red-500 ring-2 ring-red-400/40"
              : "border-gray-300"
          }`}
        >
          <div className="mb-3.5 pb-2 border-b border-gray-200 flex items-center justify-between gap-2">
            <h2 className="text-xs md:text-sm font-semibold text-gray-900">
              Select Pole Standard
            </h2>
            {hasStandardError && (
              <span className="text-[11px] md:text-xs font-semibold text-red-600 animate-pulse">
                *Select pole standard first
              </span>
            )}
          </div>

          {/* List Group Container */}
          <div className="space-y-3">
            {groupedStandardList.map((group) => (
              <div
                key={group.type}
                className="border border-gray-200 rounded-lg p-3 bg-white"
              >
                {/* Group Header */}
                <div className="mb-2.5 px-0.5">
                  <span className="text-xs font-semibold text-gray-800 tracking-wide">
                    {group.title}
                  </span>
                </div>

                {/* Group Items */}
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const isSelected =
                      selectedStandard === group.type &&
                      selectedHeight === item.key;
                    const allowsEmbed = item.numM >= 7.9 && item.numM <= 13;
                    const groundOptions = [
                      { value: "onGL", label: "On GL" },
                      { value: "underGL", label: "Under GL" },
                      ...(allowsEmbed
                        ? [{ value: "embedment", label: "Embedment" }]
                        : []),
                    ];

                    return (
                      <div
                        key={item.key}
                        className={`w-full rounded-lg border px-3 py-2 text-xs md:text-sm bg-white transition-all ${
                          isSelected
                            ? "border-blue-500 ring-1 ring-blue-500/20 shadow-xs"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-1.5">
                          {/* Nama Tipe Standard (e.g. IS 8) */}
                          <button
                            type="button"
                            onClick={() =>
                              handleSelectItem(
                                group.type,
                                item.key,
                                item.heightId,
                              )
                            }
                            className="flex items-center gap-2 cursor-pointer text-left group shrink-0 py-0.5"
                          >
                            <div className="flex items-center">
                              {isSelected ? (
                                <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0" />
                              )}
                            </div>
                            <span
                              className={`font-medium tracking-tight whitespace-nowrap ${
                                isSelected ? "text-blue-900" : "text-gray-800"
                              }`}
                            >
                              {item.label}
                            </span>
                          </button>

                          {/* Pilihan Ground Position: On GL, Under GL, Embedment */}
                          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap shrink-0">
                            {groundOptions.map((opt) => {
                              const isOptSelected =
                                isSelected &&
                                selectedGroundPosition === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectGroundPosition(
                                      group.type,
                                      item.key,
                                      item.heightId,
                                      opt.value,
                                    );
                                  }}
                                  className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                                    isOptSelected
                                      ? "border border-blue-500 bg-blue-50 text-blue-600 font-medium"
                                      : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  <div className="flex items-center">
                                    {isOptSelected ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    ) : (
                                      <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Diagram Preview Section & Action Buttons ── */}
        <div
          ref={previewRef}
          className="flex flex-col md:sticky md:top-20 scroll-mt-20"
        >
          {/* Section Div Gambar (Diagram Preview Card terpisah) */}
          <div className="border border-gray-300 rounded-lg p-4 md:p-5 flex flex-col bg-white shadow-xs h-[660px] md:h-[660px] xl:h-[695px]">
            {/* Header Bar: Pure Diagram Preview (tanpa dropdown Ground Position) */}
            <div className="flex items-center justify-between gap-2.5 mb-3.5 pb-2 border-b border-gray-200">
              <h2 className="text-xs md:text-sm font-semibold text-gray-900 shrink-0">
                Pole Diagram Preview
              </h2>
            </div>

            {/* Diagram Preview Canvas */}
            <div
              className={`border border-dashed border-gray-300 rounded-lg p-3 sm:p-4 md:p-6 flex-1 min-h-0 flex items-center justify-center relative overflow-hidden transition-colors duration-200 ${
                selectedStandard && currentImage ? "bg-slate-50" : "bg-white"
              }`}
            >
              {!selectedStandard ? (
                <div className="text-center text-gray-400 text-sm md:text-base font-medium select-none py-12">
                  <p>
                    Select a pole standard type from the list to preview the
                    diagram.
                  </p>
                </div>
              ) : !currentImage ? (
                <div className="text-center text-gray-400 text-sm md:text-base font-medium select-none py-12">
                  <p>Diagram preview not available for this type.</p>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center pt-8 pb-3 px-5 sm:px-6">
                  <div
                    className="relative flex items-center justify-center max-w-full max-h-full h-full w-auto"
                    style={
                      diagramLayout
                        ? {
                            aspectRatio: `${diagramLayout.viewBox.width} / ${diagramLayout.viewBox.height}`,
                          }
                        : { height: "100%" }
                    }
                  >
                    <img
                      src={currentImage}
                      alt={`Type ${selectedStandard} diagram`}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />

                    {/* Render Dimension Text Overlays */}
                    {diagramLabels?.map((label) => (
                      <div
                        key={`${label.key}:${label.lines.join("|")}`}
                        style={label.style}
                        className={`absolute pointer-events-none whitespace-nowrap text-[10px] sm:text-[12px] lg:text-[13px] xl:text-[14px] leading-tight text-[#1d4ed8] ${
                          label.isCentered ? "text-center" : ""
                        }`}
                      >
                        {label.isLeader ? (
                          <>
                            <div className="px-[3px]">{label.lines[0]}</div>
                            <div className="h-px bg-transparent my-0.5" />
                            <div className="px-[3px] pt-px">
                              {label.lines[1]}
                            </div>
                          </>
                        ) : (
                          label.lines.map((l) => <div key={l}>{l}</div>)
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── ACTION BUTTONS: Benar-benar di bawah div section gambarnya ── */}
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 rounded text-xs md:text-sm font-medium cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-600" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={isNavigating}
              className="px-6 py-2.5 rounded text-xs md:text-sm font-medium transition-all flex items-center gap-2 bg-[#0d3b66] text-white hover:bg-[#0a2e50] cursor-pointer shadow-sm disabled:opacity-60"
            >
              {isNavigating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
