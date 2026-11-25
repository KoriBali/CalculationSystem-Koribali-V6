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

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { CheckCircle, Circle, RotateCcw, ArrowRight, Loader2 } from "lucide-react";
import { usePoleStandardData } from "../hooks/usePoleStandardData";
import { getMasterPoleStandardHeightGeometry } from "../services/requestService";
import STANDARD_POLE_DATA from "../data/specStandardPole.json";
import {
  DIAGRAM_IMAGE_MAP,
  DIAGRAM_LABEL_LAYOUT,
  getDiagramLabels,
} from "../components/forms/pole/standard/taperDiagramConstants";

export default function ProjectToolsPage() {
  const navigate = useNavigate();

  // Pengambilan data master standar dari backend API (dengan fallback katalog otomatis)
  const { heightOptionsByStandard } = usePoleStandardData();

  // Helper untuk membaca nilai awal pilihan dari sessionStorage (jika ada)
  const getSavedSelection = () => {
    try {
      const saved = sessionStorage.getItem("lighting-project_projectToolsSelection");
      if (saved) return JSON.parse(saved);
      const legacy = sessionStorage.getItem("lighting-project_taperPoleStandard");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return {
          selectedStandard: parsed.poleType || "",
          selectedHeight: parsed.height || "",
          selectedHeightId: parsed.poleStandardHeightId || "",
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
  const [isNavigating, setIsNavigating] = useState(false);

  // Simpan setiap perubahan pilihan ke sessionStorage
  useEffect(() => {
    try {
      const payload = {
        selectedStandard,
        selectedHeight,
        selectedHeightId,
        installationType: "baseplate",
        lowestHeightPosition: "onGL",
      };
      sessionStorage.setItem(
        "lighting-project_projectToolsSelection",
        JSON.stringify(payload),
      );
    } catch (e) {
      console.warn("Failed to save project tools selection to sessionStorage:", e);
    }
  }, [selectedStandard, selectedHeight, selectedHeightId]);

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
        const rawKeys = Object.keys(group).sort((a, b) => Number(a) - Number(b));
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
  // Gambar diagram SVG standar tiang (On GL)
  const currentImage = useMemo(() => {
    if (!selectedStandard) return null;
    return DIAGRAM_IMAGE_MAP[selectedStandard]?.onGL || null;
  }, [selectedStandard]);

  // Label dimensi angka pada diagram tiang
  const diagramLabels = useMemo(() => {
    if (!selectedStandard || !selectedHeight) return null;
    return getDiagramLabels(selectedStandard, "onGL", selectedHeight, null);
  }, [selectedStandard, selectedHeight]);

  // Tata letak anchor diagram SVG
  const diagramLayout = useMemo(() => {
    if (!selectedStandard) return null;
    return DIAGRAM_LABEL_LAYOUT[`${selectedStandard}.onGL`] || null;
  }, [selectedStandard]);

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
    } catch {}

    if (selectedStandard === shortCode && selectedHeight === heightKey) {
      setSelectedStandard("");
      setSelectedHeight("");
      setSelectedHeightId("");
    } else {
      setSelectedStandard(shortCode);
      setSelectedHeight(heightKey);
      setSelectedHeightId(heightId || "");
    }
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
    } catch {}
  };

  // Reset semua pilihan
  const handleReset = () => {
    setSelectedStandard("");
    setSelectedHeight("");
    setSelectedHeightId("");
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
        const taper =
          STANDARD_POLE_DATA.tapered || STANDARD_POLE_DATA.taper || {};
        const entry =
          taper[selectedStandard]?.onGL?.[selectedHeight] || {};

        const poleStandardHeightId =
          selectedHeightId || entry.standardId || "";

        let poles = entry.poles || [];
        let rawDirectObjects = entry.directObjects || [];
        let arms = entry.arms || [];
        let beData = null;

        // Ambil spesifikasi geometri murni dari backend API
        if (
          poleStandardHeightId &&
          String(poleStandardHeightId) !== "null" &&
          String(poleStandardHeightId) !== "undefined"
        ) {
          try {
            const beGeom = await getMasterPoleStandardHeightGeometry(poleStandardHeightId);
            beData = beGeom?.data || beGeom;

            if (Array.isArray(beData?.stepPoles) && beData.stepPoles.length > 0) {
              // Urutkan step poles agar Pole-1 selalu di Step Pole 1, Pole-2 di Step Pole 2, Pole-3 di Step Pole 3
              const sortedStepPoles = [...beData.stepPoles].sort((a, b) => {
                const getNum = (name) => {
                  const m = String(name || "").match(/\d+/);
                  return m ? Number(m[0]) : 0;
                };
                const numA = getNum(a.name);
                const numB = getNum(b.name);
                if (numA && numB) return numA - numB;
                return Number(b.topElevationM ?? 0) - Number(a.topElevationM ?? 0);
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

            if (Array.isArray(beData?.directObjects) && beData.directObjects.length > 0) {
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
            console.warn("[ProjectTools] Fallback to local catalog geometry:", beErr?.message);
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
                : (ao.hDistance ?? (arm.exposedLengthM != null ? Math.round(Number(arm.exposedLengthM) * 1000) : "180"))
            ),
            nnC: String(ao.baseWindCoefficient ?? ao.nnC ?? "1"),
            quantity: String(ao.quantity ?? "1"),
            fixAngle: String(ao.fixedAngleDeg ?? ao.fixAngle ?? "0"),
          }));

          const totalLengthMm =
            arm.totalLengthM != null
              ? Math.round(Number(arm.totalLengthM) * 1000)
              : (arm.length ? Math.round(Number(arm.length)) : 180);
          const expLengthMm =
            arm.exposedLengthM != null
              ? Math.round(Number(arm.exposedLengthM) * 1000)
              : (arm.expLength ? Math.round(Number(arm.expLength)) : totalLengthMm);
          const heightMm =
            arm.installationHeightM != null
              ? Math.round(Number(arm.installationHeightM) * 1000)
              : (arm.height || arm.zHeight ? Math.round(Number(arm.height || arm.zHeight)) : 4800);
          const hDistanceMm =
            armObjects[0]?.hDistance || (arm.hDistance ? String(arm.hDistance) : String(expLengthMm));

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

        // Default: On GL dengan lowest height = 0 mm
        const lowestHeightVal = "0";

        sessionStorage.setItem("projectType", "lighting-project");
        sessionStorage.setItem("projectMode", "calculation");
        sessionStorage.setItem(
          "lighting-project_condition",
          JSON.stringify({
            designStandard: "old_lighting_pole",
            designWindSpeed: "60",
            designAirDensity: "1.23",
            poleType: "standard",
            installationPole: "baseplate",
            openingEnabled: false,
            baseplateEnabled: true,
            foundationEnabled: false,
          }),
        );
        sessionStorage.setItem(
          "lighting-project_taperPoleStandard",
          JSON.stringify({
            poleStandardHeightId,
            poleType: selectedStandard,
            installationPole: "baseplate",
            groundPosition: "onGL",
            height: selectedHeight,
            embedmentLength: "",
          }),
        );
        sessionStorage.setItem("lighting-project_poles", JSON.stringify(poles));
        sessionStorage.setItem(
          "lighting-project_directObjects",
          JSON.stringify(directObjects),
        );
        sessionStorage.setItem("lighting-project_arms", JSON.stringify(resolvedArms));
        sessionStorage.setItem(
          "lighting-project_overheadWires",
          JSON.stringify([]),
        );
        sessionStorage.setItem(
          "lighting-project_poleConfig",
          JSON.stringify({
            lowestHeight: lowestHeightVal,
            overDesign: "1",
          }),
        );
        sessionStorage.setItem(
          "lighting-project_standardPreset",
          JSON.stringify({
            poleType: selectedStandard,
            height: selectedHeight,
            poleStandardHeightId,
            poles,
            directObjects,
            arms: resolvedArms,
            overheadWires: [],
            poleConfig: {
              lowestHeight: lowestHeightVal,
              overDesign: "1",
            },
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
        sessionStorage.removeItem("lighting-project_calculatedInputsFingerprint");
        sessionStorage.removeItem("lighting-project_reportSnapshot");
        sessionStorage.removeItem("lighting-project_report");
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
        sessionStorage.removeItem("lighting-project_calculatedInputsFingerprint");
        sessionStorage.removeItem("lighting-project_standardPreset");
        sessionStorage.removeItem("lighting-project_reportSnapshot");
        sessionStorage.removeItem("lighting-project_report");

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
    <div className="w-full">
      <Helmet>
        <title>Pole Type Configuration · KORI BALI</title>
      </Helmet>

      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
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

      {/* 2-Column Grid Layout: Equal Height Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[400px_1fr] gap-6 items-stretch">
        {/* ── LEFT PANEL: Pole Standard List Group (Scrollable, same height as Preview) ── */}
        <div className="border border-gray-300 rounded-lg p-4 md:p-5 flex flex-col bg-white shadow-xs h-[680px] lg:h-[760px]">
          <div className="mb-3.5 pb-2 border-b border-gray-200">
            <h2 className="text-xs md:text-sm font-semibold text-gray-900">
              Select Pole Standard
            </h2>
          </div>

          {/* List Group Container (Inner scrollable list) */}
          <div className="flex-1 overflow-y-auto pr-1.5 space-y-3.5 min-h-0">
            {groupedStandardList.map((group) => (
              <div
                key={group.type}
                className="border border-gray-200 rounded-lg p-3 bg-white"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between mb-2.5 px-0.5">
                  <span className="text-xs font-semibold text-gray-800 tracking-wide">
                    {group.title}
                  </span>
                  <span className="text-[11px] font-normal text-gray-500">
                    {group.items.length} items
                  </span>
                </div>

                {/* Group Items */}
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const isSelected =
                      selectedStandard === group.type &&
                      selectedHeight === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          handleSelectItem(group.type, item.key, item.heightId)
                        }
                        className={`w-full text-left px-3.5 py-2.5 rounded border text-xs md:text-sm flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 text-blue-900 font-medium"
                            : "border-gray-200 hover:border-gray-400 text-gray-700 bg-white"
                        }`}
                      >
                        <span>{item.label}</span>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs ${
                              isSelected ? "text-blue-700/80" : "text-gray-400"
                            }`}
                          >
                            {item.heightMm} mm
                          </span>
                          {isSelected ? (
                            <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL: Diagram Preview (Matching height) ── */}
        <div className="border border-gray-300 rounded-lg p-4 md:p-5 flex flex-col bg-white shadow-xs h-[680px] lg:h-[760px]">
          {/* Header Bar */}
          <div className="mb-3.5 pb-2 border-b border-gray-200">
            <h2 className="text-xs md:text-sm font-semibold text-gray-900">
              Pole Diagram Preview
            </h2>
          </div>

          {/* Diagram Preview Canvas */}
          <div className="border border-dashed border-gray-300 rounded-lg p-4 md:p-6 flex-1 min-h-0 flex items-center justify-center bg-white relative overflow-hidden">
            {!selectedStandard ? (
              <div className="text-center text-gray-400 text-sm md:text-base font-medium select-none py-12">
                <p>Select a pole standard type from the list to preview the diagram.</p>
              </div>
            ) : !currentImage ? (
              <div className="text-center text-gray-400 text-sm md:text-base font-medium select-none py-12">
                <p>Diagram preview not available for this type.</p>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center py-4">
                <div
                  className="relative flex items-center justify-center max-w-full max-h-full h-[500px] md:h-[560px] lg:h-[620px] xl:h-[650px]"
                  style={
                    diagramLayout
                      ? {
                          aspectRatio: `${diagramLayout.viewBox.width} / ${diagramLayout.viewBox.height}`,
                        }
                      : { height: "620px" }
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
                      className={`absolute pointer-events-none whitespace-nowrap text-xs md:text-sm [--label-lh:15px] md:[--label-lh:18px] leading-[var(--label-lh)] text-[#1d4ed8] ${
                        label.isCentered ? "text-center" : ""
                      }`}
                    >
                      {label.isLeader ? (
                        <>
                          <div className="px-[3px]">{label.lines[0]}</div>
                          <div className="h-px bg-transparent my-0.5" />
                          <div className="px-[3px] pt-px">{label.lines[1]}</div>
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
      </div>

      {/* ── BOTTOM ACTIONS ── */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 rounded text-xs md:text-sm font-medium cursor-pointer transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5 text-gray-600" />
          <span>Reset</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={isNavigating}
          className="px-6 py-2.5 rounded text-xs md:text-sm font-medium transition-all flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm disabled:opacity-60"
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
  );
}
