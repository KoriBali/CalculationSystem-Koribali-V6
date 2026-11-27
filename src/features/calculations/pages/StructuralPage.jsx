// src/features/calculations/pages/StructuralPage.jsx
/**
 * ============================================================================
 * STRUCTURAL CALCULATION PAGE (StructuralPage)
 * ============================================================================
 * Halaman utama kalkulasi teknis struktural tiang penerangan jalan (Lighting Project).
 * Berisi konfigurasi parameter desain, spesifikasi tiang, beban aksesoris,
 * kabel udara (OHW), dan lengan tiang (Arm & Arm Object Details).
 *
 * FITUR & ATURAN:
 * 1. Tata Letak Header:
 *    - Baris 1: Tombol hitam "Back to project tools" (<ChevronLeft />).
 *    - Baris 2: Tab navigasi alur: Structural > Opening > Baseplate > Foundation > Report.
 *    - Breadcrumb sistem pada Header bar: "Project Tools > Structural".
 * 2. Standard and Condition:
 *    - Hanya standar "Old JIL" yang aktif dan menampilkan input parameter.
 *    - Standar lain menampilkan pesan pemberitahuan dalam bahasa Inggris bahwa standar belum siap.
 * 3. Pole Specifications:
 *    - Lowest Height Position menampilkan diagram interaktif (LowestHeightIllustration).
 *    - Step Poles mendukung quick set jumlah tiang, copy, paste, reset, delete.
 * 4. Urutan Section Form:
 *    - Selalu: Pole -> Direct Object (jika ada/custom) -> Overhead Wire (jika ada/custom) -> Arm (jika ada/custom).
 *    - Pada mode standar, jika DO, OHW, atau Arm tidak ada, accordion-nya disembunyikan.
 *    - Pada mode custom, seluruh accordion ditampilkan.
 * 5. Tombol Aksi:
 *    - Tombol "Calculate Results" dan "Next" selalu bersebelahan di sisi kanan.
 * ============================================================================
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Check,
  CheckCircle,
  Circle,
  Plus,
  Trash2,
  Copy,
  FileText,
  Loader2,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  X,
  Calculator,
} from "lucide-react";

// Hooks Form & Kalkulasi
import { usePoleForm } from "../hooks/usePoleForm";
import { useDirectObjectForm } from "../hooks/useDirectObjectForm";
import { useOverheadWireForm } from "../hooks/useOverheadWireForm";
import { useArmForm } from "../hooks/useArmForm";
import { usePoleStandardForm } from "../hooks/usePoleStandardForm";
import { usePoleConfigForm } from "../hooks/usePoleConfigForm";
import { usePoleCalculation } from "../hooks/usePoleCalculation";
import { usePoleStandardData } from "../hooks/usePoleStandardData";
import { useReport } from "../../report/hooks/useReport";

// Komponen Ilustrasi, Tabel, & Modal
import { ProjectToolsFlowHeader } from "../components/layout/ProjectToolsFlowHeader";
import { ResultsTableView } from "../components/tables/pole-result/ResultTableView";
import { ToastModal } from "../components/modals/ToastModal";
import { ConfirmDeleteModal } from "../components/modals/ConfirmDeleteModal";
import { SchematicPreviewCard } from "../components/schematic/SchematicPreviewCard";
import { SchematicEditorModal } from "../components/schematic/SchematicEditorModal";
import {
  useSchematicBridge,
  DEFAULT_SCHEMATIC_URL,
} from "../hooks/useSchematicBridge";
import { mapInputToSchematicParameters } from "../utils/standardPoleSchematicMapper";
import { notifyCalculationProgressChanged } from "../utils/calculationProgressEvent";
import { resolveStandardHeightId } from "../services/poleStandardService";

// ─── 1. STATIC CONFIGURATION OPTIONS ──────────────────────────────────────────
const DESIGN_STANDARDS = [
  { id: "old_lighting_pole", label: "Old JIL", available: true },
  { id: "new_jil", label: "New JIL", available: false },
  { id: "act", label: "Act", available: false },
  { id: "v60", label: "V60", available: false },
  { id: "tower", label: "Tower", available: false },
  { id: "road_sign", label: "Road Sign Standard", available: false },
];

const MATERIAL_OPTIONS = [
  { value: "STK400", label: "STK400" },
  { value: "STK500", label: "STK500" },
  { value: "SS400", label: "SS400" },
  { value: "SUS304", label: "SUS304" },
];

const OBJECT_TYPE_OPTIONS = [
  { value: "omni", label: "Omni" },
  { value: "directional", label: "Directional" },
];

export default function StructuralPage() {
  const { type } = useParams();
  const navigate = useNavigate();
  const projectType =
    type || sessionStorage.getItem("projectType") || "lighting-project";

  // Pastikan mode kalkulasi aktif di sesi browser
  useEffect(() => {
    sessionStorage.setItem("projectType", projectType);
    sessionStorage.setItem("projectMode", "calculation");
  }, [projectType]);

  // ─── 2. COMPONENT STATES ────────────────────────────────────────────────────
  const [condition, setConditionState] = useState(() => {
    try {
      return (
        JSON.parse(
          sessionStorage.getItem(`${projectType}_condition`) || "{}",
        ) || {}
      );
    } catch {
      return {};
    }
  });

  const [selectedStandardTab, setSelectedStandardTab] = useState(
    condition.designStandard || "old_lighting_pole",
  );

  const updateCondition = useCallback(
    (updates) => {
      try {
        const raw = sessionStorage.getItem(`${projectType}_condition`);
        const prev = raw ? JSON.parse(raw) : {};
        const next = { ...prev, ...updates };
        sessionStorage.setItem(
          `${projectType}_condition`,
          JSON.stringify(next),
        );
        setConditionState(next);

        // Sinkronisasi status kalkulasi komponen
        const rawConfig = sessionStorage.getItem(
          `${projectType}_calculation_config`,
        );
        const prevConfig = rawConfig ? JSON.parse(rawConfig) : {};
        const nextConfig = {
          ...prevConfig,
          pole: true,
          opening:
            next.openingEnabled !== undefined
              ? Boolean(next.openingEnabled)
              : true,
          baseplate: Boolean(next.baseplateEnabled),
          foundation: Boolean(next.foundationEnabled),
        };
        sessionStorage.setItem(
          `${projectType}_calculation_config`,
          JSON.stringify(nextConfig),
        );

        notifyCalculationProgressChanged();
      } catch (e) {
        console.warn("Failed to update condition:", e);
      }
    },
    [projectType],
  );

  // Status buka/tutup (accordion) setiap section form
  const [openSections, setOpenSections] = useState({
    condition: true,
    spec: true,
    directObject: true,
    ohw: true,
    arm: true,
  });

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // ─── 3. FORM HOOKS & CALCULATION ENGINE ─────────────────────────────────────
  const poleForm = usePoleForm(projectType);
  const doForm = useDirectObjectForm(projectType);
  const ohwForm = useOverheadWireForm(projectType);
  const armForm = useArmForm(projectType);
  const poleStandardForm = usePoleStandardForm(projectType);
  const poleConfigForm = usePoleConfigForm(projectType);
  const { heightOptionsByStandard } = usePoleStandardData();

  const calculation = usePoleCalculation({
    poleForm,
    directObjectForm: doForm,
    ohwForm,
    armForm,
    poleStandardForm,
    poleConfigForm,
    expandPole: (open) => setOpenSections((p) => ({ ...p, spec: open })),
    expandDo: (open) => setOpenSections((p) => ({ ...p, directObject: open })),
    expandOhw: (open) => setOpenSections((p) => ({ ...p, ohw: open })),
    expandArm: (open) => setOpenSections((p) => ({ ...p, arm: open })),
  });

  // Flag to temporarily hide all "Reset to default spec" buttons per user instruction
  const SHOW_RESET_TO_DEFAULT = false;

  const resultsTableRef = useRef(null);

  // ─── STANDARD PRESET & GROUND POSITION ──────────────────────────────────────
  const standardPreset = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(`${projectType}_standardPreset`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [projectType]);

  const activeGroundPosition =
    poleStandardForm.taperPoleStandard?.groundPosition ||
    standardPreset?.groundPosition ||
    condition?.groundPosition ||
    "onGL";

  // ─── SCHEMATIC BRIDGE (Vector Schematic Engine) ──────────────────────────
  const schematicIframeRef = useRef(null);
  const [isSchematicEditorOpen, setIsSchematicEditorOpen] = useState(false);

  const {
    isReady: isSchematicReady,
    isGenerating: isSchematicGenerating,
    schematicData,
    finalSvg: schematicFinalSvg,
    isBlocked: isSchematicBlocked,
    sendParameters: sendSchematicParameters,
    resetToDefault: resetSchematicToDefault,
    openEditor: openSchematicEditor,
    updateData: updateSchematicData,
  } = useSchematicBridge({
    iframeRef: schematicIframeRef,
    schematicUrl: DEFAULT_SCHEMATIC_URL,
    projectType,
    onApplied: () => {
      setIsSchematicEditorOpen(false);
    },
    onCancel: () => {
      setIsSchematicEditorOpen(false);
    },
  });

  // ─── CALCULATED SCHEMATIC SNAPSHOT ─────────────────────────────────────────
  // Snapshot parameter input yang terakhir dikalkulasi (Calculate Results).
  // Skematik HANYA berubah saat kalkulasi baru dieksekusi, BUKAN secara reaktif
  // saat user masih mengetik atau mengedit form (misal saat edit embedment length).
  const [calculatedSchematicSnapshot, setCalculatedSchematicSnapshot] =
    useState(() => ({
      calcKey: calculation.calculationKey,
      poles: poleForm.poles,
      arms: armForm.arms,
      directObjects: doForm.directObjects,
      overheadWires: ohwForm.overheadWires,
      condition,
      poleConfig: poleConfigForm.poleConfig,
      groundPosition: activeGroundPosition,
      taperPoleStandard: poleStandardForm.taperPoleStandard,
    }));

  // Update snapshot skematik HANYA saat kalkulasi berhasil dijalankan
  useEffect(() => {
    if (calculation.isCalculated && calculation.calculationKey > 0) {
      setCalculatedSchematicSnapshot({
        calcKey: calculation.calculationKey,
        poles: JSON.parse(JSON.stringify(poleForm.poles || [])),
        arms: JSON.parse(JSON.stringify(armForm.arms || [])),
        directObjects: JSON.parse(JSON.stringify(doForm.directObjects || [])),
        overheadWires: JSON.parse(JSON.stringify(ohwForm.overheadWires || [])),
        condition: JSON.parse(JSON.stringify(condition || {})),
        poleConfig: JSON.parse(JSON.stringify(poleConfigForm.poleConfig || {})),
        groundPosition: activeGroundPosition,
        taperPoleStandard: poleStandardForm.taperPoleStandard
          ? JSON.parse(JSON.stringify(poleStandardForm.taperPoleStandard))
          : null,
      });
    }
  }, [
    calculation.calculationKey,
    calculation.isCalculated,
    activeGroundPosition,
  ]);

  const schematicParams = useMemo(() => {
    if (!calculatedSchematicSnapshot) return null;
    return mapInputToSchematicParameters({
      poles: calculatedSchematicSnapshot.poles,
      arms: calculatedSchematicSnapshot.arms,
      directObjects: calculatedSchematicSnapshot.directObjects,
      overheadWires: calculatedSchematicSnapshot.overheadWires,
      condition: calculatedSchematicSnapshot.condition,
      poleConfig: calculatedSchematicSnapshot.poleConfig,
      groundPosition: calculatedSchematicSnapshot.groundPosition,
      taperPoleStandard: calculatedSchematicSnapshot.taperPoleStandard,
    });
  }, [calculatedSchematicSnapshot]);

  const lastProcessedCalcKeyRef = useRef(-1);

  useEffect(() => {
    if (!schematicParams || !isSchematicReady || !schematicParams.isSupported) {
      return;
    }

    const hasSvg = Boolean(
      schematicData?.generatedSvg || schematicData?.editedSvg,
    );

    const snapshotKey = calculatedSchematicSnapshot?.calcKey ?? 0;
    const isNewCalculation =
      snapshotKey > 0 && lastProcessedCalcKeyRef.current !== snapshotKey;

    const needsInitialRender =
      !hasSvg && lastProcessedCalcKeyRef.current === -1;

    // Hanya generate ulang gambar skematik jika ada kalkulasi baru atau initial render
    if (!isNewCalculation && !needsInitialRender) {
      return;
    }

    lastProcessedCalcKeyRef.current = snapshotKey;

    sendSchematicParameters(schematicParams.payload, {
      standardId: schematicParams.standardId,
      replaceManualEdit: isNewCalculation,
    });
  }, [
    calculatedSchematicSnapshot?.calcKey,
    isSchematicReady,
    schematicParams,
    schematicData?.generatedSvg,
    schematicData?.editedSvg,
    sendSchematicParameters,
  ]);

  const handleEditSchematic = useCallback(() => {
    setIsSchematicEditorOpen(true);
    openSchematicEditor();
  }, [openSchematicEditor]);

  const handleRegenerateSchematic = useCallback(() => {
    if (schematicParams) {
      resetSchematicToDefault(schematicParams.payload, {
        standardId: schematicParams.standardId,
      });
    }
  }, [resetSchematicToDefault, schematicParams]);

  const previewSchematicSvg =
    schematicData?.editedSvg || schematicData?.generatedSvg || "";

  // Auto-scroll to calculation results table whenever calculation succeeds
  useEffect(() => {
    if (calculation.isCalculated) {
      const timer = setTimeout(() => {
        resultsTableRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [calculation.calculationKey, calculation.isCalculated]);

  const handleCalculateClick = async () => {
    try {
      await calculation.calculate();
      setTimeout(() => {
        resultsTableRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
    } catch {
      // errors handled inside calculation hook
    }
  };

  const isStandard = condition.poleType === "standard";
  const installationType =
    condition.installationPole ||
    poleStandardForm.taperPoleStandard?.installationPole ||
    "baseplate";
  const isBaseplate = installationType === "baseplate";

  // Toggle komponen tambahan
  const openingEnabled =
    condition.openingEnabled !== undefined
      ? Boolean(condition.openingEnabled)
      : isStandard
        ? true
        : false;
  const baseplateEnabled = isBaseplate;
  const foundationEnabled = Boolean(condition.foundationEnabled);

  // Auto-heal baseplateEnabled in condition to match isBaseplate
  useEffect(() => {
    if (condition.baseplateEnabled !== isBaseplate) {
      updateCondition({ baseplateEnabled: isBaseplate });
    }
  }, [isBaseplate, condition.baseplateEnabled]);

  // Auto-sort step poles: pastikan Pole-1 selalu berada di Step Pole 1
  useEffect(() => {
    if (Array.isArray(poleForm.poles) && poleForm.poles.length > 1) {
      const firstNum = (poleForm.poles[0]?.name || "").match(/\d+/)?.[0];
      const lastNum = (
        poleForm.poles[poleForm.poles.length - 1]?.name || ""
      ).match(/\d+/)?.[0];
      if (firstNum && lastNum && Number(firstNum) > Number(lastNum)) {
        const sorted = [...poleForm.poles]
          .sort((a, b) => {
            const numA = Number((a.name || "").match(/\d+/)?.[0] || 0);
            const numB = Number((b.name || "").match(/\d+/)?.[0] || 0);
            return numA - numB;
          })
          .map((p, idx) => ({
            ...p,
            id: String(idx + 1),
          }));
        poleForm.setPoles(sorted);
      }
    }
  }, [poleForm.poles]);

  // Auto-heal custom mode: jika pengguna berada di mode custom (!isStandard),
  // pastikan poles tidak membawa sisa dummy IS 8000 (165/85/4/8000). Jika ada, reset ke pole kosong.
  const customModeCleanedRef = useRef(false);
  useEffect(() => {
    if (isStandard || customModeCleanedRef.current) return;

    if (Array.isArray(poleForm.poles) && poleForm.poles.length === 1) {
      const p = poleForm.poles[0];
      const isLegacyDummyIS8 =
        String(p.lowerDiameter || "") === "165" &&
        String(p.upperDiameter || "") === "85" &&
        (String(p.zHeight || "") === "8000" ||
          String(p.height || "") === "8000");

      if (isLegacyDummyIS8) {
        customModeCleanedRef.current = true;
        poleForm.setPoles([
          {
            id: "1",
            name: "",
            material: "STK400",
            poleType: "Straight",
            type: "Straight",
            lowerDiameter: "",
            upperDiameter: "",
            lowerThickness: "",
            upperThickness: "",
            zHeight: "",
            quantity: "1",
          },
        ]);
      }
    }
  }, [isStandard, poleForm.poles]);

  // Auto-normalize arms: jika arms di session/state memiliki format raw backend (diameterMm, objects, dll.)
  // atau armObjects masih kosong padahal raw objects ada, konversikan ke format form Structural
  useEffect(() => {
    if (Array.isArray(armForm.arms) && armForm.arms.length > 0) {
      let needsUpdate = false;
      const normalized = armForm.arms.map((arm, armIdx) => {
        const hasRawBeProps =
          arm.diameterMm !== undefined ||
          arm.totalLengthM !== undefined ||
          arm.installationHeightM !== undefined ||
          Array.isArray(arm.objects);

        const rawObjects = arm.objects || arm.armObjects || [];
        const hasMissingAo =
          (!arm.armObjects || arm.armObjects.length === 0) &&
          rawObjects.length > 0;
        const hasMissingFields =
          (arm.diameter === undefined ||
            arm.diameter === "" ||
            arm.diameter == null) &&
          (arm.diameterMm !== undefined || arm.totalLengthM !== undefined);

        if (!hasRawBeProps && !hasMissingAo && !hasMissingFields) {
          return arm;
        }

        needsUpdate = true;
        const matName =
          typeof arm.material === "object"
            ? arm.material?.name || "STK400"
            : arm.material || arm.materialName || "STK400";

        const heightMm =
          arm.installationHeightM != null && arm.installationHeightM !== ""
            ? Math.round(Number(arm.installationHeightM) * 1000)
            : arm.height || arm.zHeight
              ? Math.round(Number(arm.height || arm.zHeight))
              : 4800;
        const instHeightM = Number((heightMm / 1000).toFixed(3));

        const mappedArmObjects = rawObjects.map((ao, aoIdx) => ({
          idAo: String(ao.idAo || aoIdx + 1),
          name: ao.name || "灯具",
          type:
            ao.objectKind === "directional" || ao.type === "directional"
              ? "directional"
              : "omni",
          frontArea: String(ao.frontAreaM2 ?? ao.frontArea ?? "0.1"),
          sideArea: String(ao.sideAreaM2 ?? ao.sideArea ?? ""),
          weight: String(ao.massPerUnitKg ?? ao.weight ?? "14"),
          height: String(heightMm),
          zHeight: String(heightMm),
          installationHeightM: instHeightM,
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
        const hDistanceMm =
          mappedArmObjects[0]?.hDistance ||
          (arm.hDistance ? String(arm.hDistance) : String(expLengthMm));

        // Create clean normalized arm without leaving raw BE fields
        const cleanArm = { ...arm };
        delete cleanArm.diameterMm;
        delete cleanArm.thicknessMm;
        delete cleanArm.totalLengthM;
        delete cleanArm.exposedLengthM;
        delete cleanArm.fixedAngleDeg;
        delete cleanArm.objects;

        return {
          ...cleanArm,
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
          installationHeightM: instHeightM,
          hDistance: String(hDistanceMm),
          fixAngle: String(arm.fixedAngleDeg ?? arm.fixAngle ?? "0"),
          nnC: String(arm.baseWindCoefficient ?? arm.nnC ?? "0.7"),
          quantity: String(arm.quantity ?? "1"),
          armObjects: mappedArmObjects,
        };
      });

      if (needsUpdate) {
        armForm.setArms(normalized);
      }
    }
  }, [armForm.arms]);

  // ─── 4. REPORT HOOK & GENERATION ───────────────────────────────────────────
  const report = useReport(projectType);

  const handleGenerateReport = async () => {
    if (
      !calculation.isCalculated ||
      calculation.loading ||
      calculation.isInputsChanged ||
      report.isGeneratingReport
    ) {
      return;
    }
    await report.makeReport({
      isCalculated: true,
      showToast: (msg, type) => calculation.setToast({ message: msg, type }),
    });
  };

  const handleSelectDesignStandard = (std) => {
    setSelectedStandardTab(std.id);
    if (std.id === "old_lighting_pole") {
      updateCondition({ designStandard: std.id });
    }
    calculation.resetCalculation?.();
  };

  // ─── GROUND MODE & LOWEST HEIGHT CONFIGURATION ──────────────────────────────
  const isEmbedment =
    isStandard &&
    (activeGroundPosition === "embedment" ||
      condition?.installationPole === "embedment" ||
      poleStandardForm.taperPoleStandard?.installationPole === "embedment");

  const isUnderGL =
    isStandard &&
    !isEmbedment &&
    (activeGroundPosition === "underGL" ||
      activeGroundPosition === "under_gl" ||
      condition?.groundPosition === "under_gl");

  const isOnGL = isStandard && !isEmbedment && !isUnderGL;

  const isModifiedFromPreset = useMemo(() => {
    if (!isStandard || !standardPreset) return false;
    try {
      // 1. Pole config (lowestHeight, overDesign)
      const presetLowest = String(
        standardPreset.poleConfig?.lowestHeight ?? "0",
      );
      const currentLowest = String(
        poleConfigForm.poleConfig?.lowestHeight ?? "0",
      );
      if (presetLowest !== currentLowest) return true;

      const presetOverDesign = String(
        standardPreset.poleConfig?.overDesign ?? "1",
      );
      const currentOverDesign = String(
        poleConfigForm.poleConfig?.overDesign ?? "1",
      );
      if (presetOverDesign !== currentOverDesign) return true;

      // 2. Step Poles
      const presetPoles = standardPreset.poles || [];
      const currentPoles = poleForm.poles || [];
      if (presetPoles.length !== currentPoles.length) return true;
      for (let i = 0; i < presetPoles.length; i++) {
        const p1 = presetPoles[i];
        const p2 = currentPoles[i];
        if (
          String(p1.zHeight ?? p1.height ?? "") !==
            String(p2.zHeight ?? p2.height ?? "") ||
          String(p1.lowerDiameter ?? "") !== String(p2.lowerDiameter ?? "") ||
          String(p1.upperDiameter ?? "") !== String(p2.upperDiameter ?? "") ||
          String(p1.lowerThickness ?? "") !== String(p2.lowerThickness ?? "") ||
          String(p1.upperThickness ?? "") !== String(p2.upperThickness ?? "") ||
          String(p1.material ?? "") !== String(p2.material ?? "") ||
          String(p1.poleType ?? "") !== String(p2.poleType ?? "")
        ) {
          return true;
        }
      }

      // 3. Direct Objects
      const presetDo = standardPreset.directObjects || [];
      const currentDo = doForm.directObjects || [];
      if (presetDo.length !== currentDo.length) return true;
      for (let i = 0; i < presetDo.length; i++) {
        const d1 = presetDo[i];
        const d2 = currentDo[i];
        if (
          String(d1.frontArea ?? "") !== String(d2.frontArea ?? "") ||
          String(d1.weight ?? "") !== String(d2.weight ?? "") ||
          String(d1.zHeight ?? "") !== String(d2.zHeight ?? "") ||
          String(d1.nnC ?? "1") !== String(d2.nnC ?? "1") ||
          String(d1.quantity ?? "1") !== String(d2.quantity ?? "1")
        ) {
          return true;
        }
      }

      // 4. Arms
      const presetArms = standardPreset.arms || [];
      const currentArms = armForm.arms || [];
      if (presetArms.length !== currentArms.length) return true;
      for (let i = 0; i < presetArms.length; i++) {
        const a1 = presetArms[i];
        const a2 = currentArms[i];
        if (
          String(a1.diameter ?? a1.diameterMm ?? "") !==
            String(a2.diameter ?? a2.diameterMm ?? "") ||
          String(a1.thickness ?? a1.thicknessMm ?? "") !==
            String(a2.thickness ?? a2.thicknessMm ?? "") ||
          String(a1.length ?? a1.totalLengthM ?? "") !==
            String(a2.length ?? a2.totalLengthM ?? "") ||
          String(a1.height ?? a1.zHeight ?? "") !==
            String(a2.height ?? a2.zHeight ?? "")
        ) {
          return true;
        }
      }

      // 5. Overhead Wires
      const currentOhw = ohwForm.overheadWires || [];
      if (currentOhw.length > 0) return true;

      return false;
    } catch {
      return false;
    }
  }, [
    isStandard,
    standardPreset,
    poleConfigForm.poleConfig,
    poleForm.poles,
    doForm.directObjects,
    armForm.arms,
    ohwForm.overheadWires,
  ]);

  // Per-field / per-item modification helpers against standard preset
  const isLowestHeightModified = useMemo(() => {
    if (!isStandard || !standardPreset?.poleConfig) return false;
    const defaultVal = isUnderGL ? "-300" : "0";
    const presetLowest = String(
      standardPreset.poleConfig.lowestHeight ?? defaultVal,
    );
    const currentLowest = String(poleConfigForm.poleConfig?.lowestHeight ?? "");
    return currentLowest !== "" && presetLowest !== currentLowest;
  }, [
    isStandard,
    standardPreset,
    poleConfigForm.poleConfig?.lowestHeight,
    isUnderGL,
  ]);

  const isOverdesignModified = useMemo(() => {
    if (!isStandard || !standardPreset?.poleConfig) return false;
    const presetOd = String(
      standardPreset.poleConfig.overDesign ??
        standardPreset.poleConfig.overdesignFactor ??
        "1",
    );
    const currentOd = String(
      poleConfigForm.poleConfig?.overDesign ??
        poleConfigForm.poleConfig?.overdesignFactor ??
        "1",
    );
    return presetOd !== currentOd;
  }, [
    isStandard,
    standardPreset,
    poleConfigForm.poleConfig?.overDesign,
    poleConfigForm.poleConfig?.overdesignFactor,
  ]);

  const isPoleModified = useCallback(
    (pole, idx) => {
      if (!isStandard || !standardPreset?.poles?.[idx]) return false;
      const p1 = standardPreset.poles[idx];
      const p2 = pole;
      return (
        String(p1.zHeight ?? p1.height ?? "") !==
          String(p2.zHeight ?? p2.height ?? "") ||
        String(p1.lowerDiameter ?? "") !== String(p2.lowerDiameter ?? "") ||
        String(p1.upperDiameter ?? "") !== String(p2.upperDiameter ?? "") ||
        String(p1.lowerThickness ?? "") !== String(p2.lowerThickness ?? "") ||
        String(p1.upperThickness ?? "") !== String(p2.upperThickness ?? "") ||
        String(p1.material ?? "") !== String(p2.material ?? "") ||
        String(p1.poleType ?? p1.type ?? "") !==
          String(p2.poleType ?? p2.type ?? "") ||
        String(p1.name ?? "") !== String(p2.name ?? "")
      );
    },
    [isStandard, standardPreset],
  );

  const isDoModified = useCallback(
    (doObj, idx) => {
      if (!isStandard || !standardPreset?.directObjects?.[idx]) return false;
      const d1 = standardPreset.directObjects[idx];
      const d2 = doObj;
      return (
        String(d1.frontArea ?? "") !== String(d2.frontArea ?? "") ||
        String(d1.sideArea ?? "") !== String(d2.sideArea ?? "") ||
        String(d1.weight ?? "") !== String(d2.weight ?? "") ||
        String(d1.zHeight ?? "") !== String(d2.zHeight ?? "") ||
        String(d1.nnC ?? "1") !== String(d2.nnC ?? "1") ||
        String(d1.quantity ?? "1") !== String(d2.quantity ?? "1") ||
        String(d1.name ?? "") !== String(d2.name ?? "") ||
        String(d1.type ?? "omni") !== String(d2.type ?? "omni") ||
        String(d1.fixAngle ?? "0") !== String(d2.fixAngle ?? "0")
      );
    },
    [isStandard, standardPreset],
  );

  const isArmModified = useCallback(
    (arm, armIdx) => {
      if (!isStandard || !standardPreset?.arms?.[armIdx]) return false;
      const a1 = standardPreset.arms[armIdx];
      const a2 = arm;
      return (
        String(a1.diameter ?? a1.diameterMm ?? "") !==
          String(a2.diameter ?? a2.diameterMm ?? "") ||
        String(a1.thickness ?? a1.thicknessMm ?? "") !==
          String(a2.thickness ?? a2.thicknessMm ?? "") ||
        String(a1.length ?? a1.totalLengthM ?? "") !==
          String(a2.length ?? a2.totalLengthM ?? "") ||
        String(a1.expLength ?? a1.expansionLengthMm ?? "") !==
          String(a2.expLength ?? a2.expansionLengthMm ?? "") ||
        String(a1.height ?? a1.zHeight ?? "") !==
          String(a2.height ?? a2.zHeight ?? "") ||
        String(a1.hDistance ?? "") !== String(a2.hDistance ?? "") ||
        String(a1.fixAngle ?? "0") !== String(a2.fixAngle ?? "0") ||
        String(a1.nnC ?? "0.7") !== String(a2.nnC ?? "0.7") ||
        String(a1.quantity ?? "1") !== String(a2.quantity ?? "1") ||
        String(a1.material ?? "STK400") !== String(a2.material ?? "STK400") ||
        String(a1.name ?? "") !== String(a2.name ?? "")
      );
    },
    [isStandard, standardPreset],
  );

  const isAoModified = useCallback(
    (armIdx, aoObj, aoIdx) => {
      if (!isStandard || !standardPreset?.arms?.[armIdx]?.armObjects?.[aoIdx])
        return false;
      const o1 = standardPreset.arms[armIdx].armObjects[aoIdx];
      const o2 = aoObj;
      return (
        String(o1.name ?? "") !== String(o2.name ?? "") ||
        String(o1.type ?? "omni") !== String(o2.type ?? "omni") ||
        String(o1.frontArea ?? "") !== String(o2.frontArea ?? "") ||
        String(o1.sideArea ?? "") !== String(o2.sideArea ?? "") ||
        String(o1.weight ?? "") !== String(o2.weight ?? "") ||
        String(o1.hDistance ?? "") !== String(o2.hDistance ?? "") ||
        String(o1.nnC ?? "1") !== String(o2.nnC ?? "1") ||
        String(o1.quantity ?? "1") !== String(o2.quantity ?? "1") ||
        String(o1.fixAngle ?? "0") !== String(o2.fixAngle ?? "0")
      );
    },
    [isStandard, standardPreset],
  );

  const handleResetToStandard = () => {
    if (!standardPreset) return;
    if (standardPreset.poles) {
      poleForm.setPoles(JSON.parse(JSON.stringify(standardPreset.poles)));
    }
    if (standardPreset.directObjects) {
      doForm.setDirectObjects(
        JSON.parse(JSON.stringify(standardPreset.directObjects)),
      );
    }
    if (standardPreset.arms) {
      armForm.setArms(JSON.parse(JSON.stringify(standardPreset.arms)));
    }
    if (standardPreset.overheadWires) {
      ohwForm.setOverheadWires([]);
    }
    if (standardPreset.poleConfig) {
      poleConfigForm.setPoleConfig(
        JSON.parse(JSON.stringify(standardPreset.poleConfig)),
      );
    }

    // Reset ground mode tracking and Under GL baseline
    currentGroundModeRef.current = "onGL";
    baseUnderPolesRef.current = null;
    lastProcessedLowestHeightRef.current = 0;
    poleStandardForm.updateTaperPoleStandard?.({ groundPosition: "onGL" });
    updateCondition({ groundPosition: "on_gl" });

    // Reset calculation state so user must calculate with standard values
    try {
      sessionStorage.removeItem(`${projectType}_isCalculatedPole`);
      sessionStorage.removeItem(`${projectType}_results`);
      sessionStorage.removeItem(`${projectType}_displayResult`);
      sessionStorage.removeItem(`${projectType}_resultsDo`);
      sessionStorage.removeItem(`${projectType}_resultsArm`);
      sessionStorage.removeItem(`${projectType}_resultsOhw`);
      sessionStorage.removeItem(`${projectType}_showResults`);
      sessionStorage.removeItem(`${projectType}_calculatedInputsFingerprint`);
    } catch {}

    calculation.setToast?.({
      message: "Reset to standard specifications successfully.",
      type: "success",
    });
  };

  // ─── 4B. DYNAMIC ON GL <-> UNDER GL TRANSITION HANDLER ────────────────────────
  // Logic trigger: Dynamically switches standard pole specifications between On GL and Under GL.
  // 1. Trigger conditions:
  //    - lowestHeight < 0  -> Triggers Under GL mode.
  //    - lowestHeight >= 0 -> Restores On GL mode.
  // 2. Pure Under GL Standard baseline (-300 mm burial depth):
  //    - When lowestHeight is exactly -300 mm, pure Under GL specifications are loaded from the BE API
  //      (or local catalog specStandardPole.json fallback).
  //      Example IS 8000: Pole-1 = 8300 mm, Pole-2 = 300 mm.
  //      Example IA 5000: Pole-1 = 5300 mm, Pole-2 = 3405 mm, Pole-3 = 1800 mm.
  // 3. Custom burial depth adjustment (e.g., -250 mm):
  //    - currentDepth = Math.abs(lowestHeight) (e.g. 250)
  //    - delta = currentDepth - 300 (e.g. 250 - 300 = -50 mm)
  //    - Pole-1 (top elevation segment): zHeight = baseZHeight + delta (IS: 8250 mm, IA: 5250 mm)
  //    - Bottom pole (Pole-N, buried segment): zHeight = baseZHeight + delta (IS: 250 mm, IA: 1750 mm)
  //    - Middle segments (e.g., Pole-2 on IA): remain UNCHANGED (3405 mm).
  // 4. Calculations:
  // Sinkronisasi otomatis lowestHeight berdasarkan groundPosition yang dipilih di Project Tools
  const lastSyncGroundRef = useRef(null);
  useEffect(() => {
    if (!isStandard) return;

    if (lastSyncGroundRef.current !== activeGroundPosition) {
      lastSyncGroundRef.current = activeGroundPosition;

      // Hanya inisialisasi default jika nilai lowestHeight belum pernah di-set (null atau undefined)
      const currentVal = poleConfigForm.poleConfig?.lowestHeight;
      if (currentVal === undefined || currentVal === null) {
        const defaultVal = isUnderGL ? "-300" : "0";
        poleConfigForm.updatePoleConfig({ lowestHeight: defaultVal });
      }
    }
  }, [isStandard, activeGroundPosition, isUnderGL]);

  // ─── QUICK SET & CLIPBOARD HANDLERS ────────────────────────────────────────
  // 1. Poles
  const [quickPoleCount, setQuickPoleCount] = useState("");
  const handleQuickPoleCountOk = () => {
    const num = Number(quickPoleCount);
    if (!num || isNaN(num) || num < 1) return;
    const count = Math.min(Math.max(1, num), 6);
    poleForm.setPoles((prev) => {
      const current = [...prev];
      if (count > current.length) {
        for (let i = current.length; i < count; i++) {
          current.push({
            id: String(i + 1),
            name: "",
            material: "STK400",
            poleType: "Straight",
            lowerDiameter: "",
            upperDiameter: "",
            lowerThickness: "",
            upperThickness: "",
            zHeight: "",
            quantity: "1",
          });
        }
      } else if (count < current.length) {
        return current.slice(0, count);
      }
      return current;
    });
    setQuickPoleCount("");
  };

  // ── Delete Confirmation Modal State ──
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    itemName: "",
    onConfirm: null,
  });

  const requestDelete = (itemName, onConfirmFn) => {
    setDeleteConfirm({
      open: true,
      itemName,
      onConfirm: onConfirmFn,
    });
  };

  const [poleClipboard, setPoleClipboard] = useState(null);
  const handleCopyPole = (p) => setPoleClipboard({ ...p });
  const handlePastePole = (idx) => {
    if (!poleClipboard) return;
    poleForm.setPoles((prev) => {
      const next = [...prev];
      const isStr =
        (
          poleClipboard.poleType ||
          poleClipboard.type ||
          "Straight"
        ).toLowerCase() === "straight";
      const lowerD =
        poleClipboard.lowerDiameter ?? next[idx].lowerDiameter ?? "";
      const lowerT =
        poleClipboard.lowerThickness ?? next[idx].lowerThickness ?? "";
      next[idx] = {
        ...next[idx],
        ...poleClipboard,
        id: next[idx].id,
        ...(isStr && {
          upperDiameter: lowerD,
          upperThickness: lowerT,
        }),
      };
      return next;
    });
  };
  const handleResetPole = (idx) => {
    poleForm.setPoles((prev) => {
      const next = [...prev];
      if (isStandard && standardPreset?.poles?.[idx]) {
        next[idx] = {
          ...standardPreset.poles[idx],
          id: next[idx].id || String(idx + 1),
        };
      } else {
        next[idx] = {
          id: next[idx].id,
          name: "",
          material: "STK400",
          poleType: "Straight",
          lowerDiameter: "",
          upperDiameter: "",
          lowerThickness: "",
          upperThickness: "",
          zHeight: "",
          quantity: "1",
        };
      }
      return next;
    });
  };
  const handleDeletePole = (idx) => {
    if (poleForm.poles.length <= 1) return;
    poleForm.setPoles((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleAddPole = () => {
    if (poleForm.poles.length >= 6) return;
    poleForm.setPoles((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      if (current.length >= 6) return current;
      return [
        ...current,
        {
          id: String(current.length + 1),
          name: "",
          material: "STK400",
          poleType: "Straight",
          lowerDiameter: "",
          upperDiameter: "",
          lowerThickness: "",
          upperThickness: "",
          zHeight: "",
          quantity: "1",
        },
      ];
    });
  };

  // 2. Direct Objects
  const [quickDoCount, setQuickDoCount] = useState("");
  const handleQuickDoCountOk = () => {
    const num = Number(quickDoCount);
    if (isNaN(num) || num < 0) return;
    const count = Math.min(Math.max(0, num), 10);
    doForm.setDirectObjects((prev) => {
      const current = [...prev];
      if (count > current.length) {
        for (let i = current.length; i < count; i++) {
          current.push({
            idDo: String(i + 1),
            name: "",
            type: "omni",
            frontArea: "",
            sideArea: "",
            weight: "",
            zHeight: "",
            nnC: "1",
            quantity: "1",
            fixAngle: "0",
          });
        }
      } else if (count < current.length) {
        return current.slice(0, count);
      }
      return current;
    });
    setQuickDoCount("");
  };

  const [doClipboard, setDoClipboard] = useState(null);
  const handleCopyDo = (item) => setDoClipboard({ ...item });
  const handlePasteDo = (idx) => {
    if (!doClipboard) return;
    doForm.setDirectObjects((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...doClipboard, idDo: next[idx].idDo };
      return next;
    });
  };
  const handleResetDo = (idx) => {
    doForm.setDirectObjects((prev) => {
      const next = [...prev];
      if (isStandard && standardPreset?.directObjects?.[idx]) {
        next[idx] = {
          ...standardPreset.directObjects[idx],
          idDo: next[idx].idDo || String(idx + 1),
        };
      } else {
        next[idx] = {
          idDo: next[idx].idDo,
          name: "",
          type: "omni",
          frontArea: "",
          sideArea: "",
          weight: "",
          zHeight: "",
          nnC: "1",
          quantity: "1",
          fixAngle: "0",
        };
      }
      return next;
    });
  };
  const handleDeleteDo = (idx) => {
    doForm.setDirectObjects((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleAddDirectObject = () => {
    if (doForm.directObjects.length >= 10) return;
    doForm.setDirectObjects((prev) => [
      ...prev,
      {
        idDo: String(prev.length + 1),
        name: "",
        type: "omni",
        frontArea: "",
        sideArea: "",
        weight: "",
        zHeight: "",
        nnC: "1",
        quantity: "1",
        fixAngle: "0",
      },
    ]);
  };

  // 3. Overhead Wires
  const [quickOhwCount, setQuickOhwCount] = useState("");
  const handleQuickOhwCountOk = () => {
    const num = Number(quickOhwCount);
    if (isNaN(num) || num < 0) return;
    const count = Math.min(Math.max(0, num), 4);
    ohwForm.setOverheadWires((prev) => {
      const current = [...prev];
      if (count > current.length) {
        for (let i = current.length; i < count; i++) {
          current.push({
            idOhw: String(i + 1),
            name: "",
            weight: "",
            diameter: "",
            zHeight: "",
            span: "",
            saggingRatio: "",
            nnC: "1",
            fixAngle: "0",
            verticalAngle: "0",
          });
        }
      } else if (count < current.length) {
        return current.slice(0, count);
      }
      return current;
    });
    setQuickOhwCount("");
  };

  const [ohwClipboard, setOhwClipboard] = useState(null);
  const handleCopyOhw = (item) => setOhwClipboard({ ...item });
  const handlePasteOhw = (idx) => {
    if (!ohwClipboard) return;
    ohwForm.setOverheadWires((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...ohwClipboard, idOhw: next[idx].idOhw };
      return next;
    });
  };
  const handleResetOhw = (idx) => {
    ohwForm.setOverheadWires((prev) => {
      const next = [...prev];
      next[idx] = {
        idOhw: next[idx].idOhw,
        name: "",
        weight: "",
        diameter: "",
        zHeight: "",
        span: "",
        saggingRatio: "",
        nnC: "1",
        fixAngle: "0",
        verticalAngle: "0",
      };
      return next;
    });
  };
  const handleDeleteOhw = (idx) => {
    ohwForm.setOverheadWires((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleAddOverheadWire = () => {
    if (ohwForm.overheadWires.length >= 4) return;
    ohwForm.setOverheadWires((prev) => [
      ...prev,
      {
        idOhw: String(prev.length + 1),
        name: "",
        weight: "",
        diameter: "",
        zHeight: "",
        span: "",
        saggingRatio: "",
        nnC: "1",
        fixAngle: "0",
        verticalAngle: "0",
      },
    ]);
  };

  // 4. Arms & Arm Objects
  const [quickArmCount, setQuickArmCount] = useState("");
  const handleQuickArmCountOk = () => {
    const num = Number(quickArmCount);
    if (isNaN(num) || num < 0) return;
    const count = Math.min(Math.max(0, num), 10);
    armForm.setArms((prev) => {
      const current = [...prev];
      if (count > current.length) {
        for (let i = current.length; i < count; i++) {
          current.push({
            idArm: String(i + 1),
            name: "",
            material: "STK400",
            diameter: "",
            thickness: "",
            length: "",
            expLength: "",
            height: "",
            hDistance: "",
            fixAngle: "0",
            nnC: "0.7",
            quantity: "1",
            armObjects: [],
          });
        }
      } else if (count < current.length) {
        return current.slice(0, count);
      }
      return current;
    });
    setQuickArmCount("");
  };

  const [armClipboard, setArmClipboard] = useState(null);
  const handleCopyArm = (arm) => setArmClipboard({ ...arm });
  const handlePasteArm = (idx) => {
    if (!armClipboard) return;
    armForm.setArms((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...armClipboard, idArm: next[idx].idArm };
      return next;
    });
  };
  const handleResetArm = (idx) => {
    armForm.setArms((prev) => {
      const next = [...prev];
      if (isStandard && standardPreset?.arms?.[idx]) {
        next[idx] = {
          ...standardPreset.arms[idx],
          idArm: next[idx].idArm || String(idx + 1),
        };
      } else {
        next[idx] = {
          idArm: next[idx].idArm,
          name: "",
          material: "STK400",
          diameter: "",
          thickness: "",
          length: "",
          expLength: "",
          height: "",
          hDistance: "",
          fixAngle: "0",
          nnC: "0.7",
          quantity: "1",
          armObjects: [],
        };
      }
      return next;
    });
  };
  const handleDeleteArm = (idx) => {
    armForm.setArms((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleAddArm = () => {
    if (armForm.arms.length >= 10) return;
    armForm.setArms((prev) => [
      ...prev,
      {
        idArm: String(prev.length + 1),
        name: "",
        material: "STK400",
        diameter: "",
        thickness: "",
        length: "",
        expLength: "",
        height: "",
        hDistance: "",
        fixAngle: "0",
        nnC: "0.7",
        quantity: "1",
        armObjects: [],
      },
    ]);
  };

  // Quick AO count
  const [quickAoCounts, setQuickAoCounts] = useState({});
  const handleQuickAoCountOk = (armIdx) => {
    const num = Number(quickAoCounts[armIdx]);
    if (isNaN(num) || num < 0) return;
    const count = Math.min(Math.max(0, num), 5);
    armForm.setArms((prev) => {
      const next = [...prev];
      const target = { ...next[armIdx] };
      const current = [...(target.armObjects || [])];
      if (count > current.length) {
        for (let i = current.length; i < count; i++) {
          current.push({
            idAo: `${armIdx + 1}.${i + 1}`,
            name: "",
            type: "omni",
            frontArea: "",
            weight: "",
            hDistance: "",
            nnC: "1",
            quantity: "1",
          });
        }
      } else if (count < current.length) {
        target.armObjects = current.slice(0, count);
        next[armIdx] = target;
        return next;
      }
      target.armObjects = current;
      next[armIdx] = target;
      return next;
    });
    setQuickAoCounts((p) => ({ ...p, [armIdx]: "" }));
  };

  const [aoClipboard, setAoClipboard] = useState(null);
  const handleCopyAo = (ao) => setAoClipboard({ ...ao });
  const handlePasteAo = (armIdx, aoIdx) => {
    if (!aoClipboard) return;
    armForm.setArms((prev) => {
      const next = [...prev];
      const target = { ...next[armIdx] };
      const aos = [...(target.armObjects || [])];
      aos[aoIdx] = { ...aos[aoIdx], ...aoClipboard, idAo: aos[aoIdx].idAo };
      target.armObjects = aos;
      next[armIdx] = target;
      return next;
    });
  };
  const handleResetAo = (armIdx, aoIdx) => {
    armForm.setArms((prev) => {
      const next = [...prev];
      const target = { ...next[armIdx] };
      const aos = [...(target.armObjects || [])];
      if (isStandard && standardPreset?.arms?.[armIdx]?.armObjects?.[aoIdx]) {
        aos[aoIdx] = {
          ...standardPreset.arms[armIdx].armObjects[aoIdx],
          idAo: aos[aoIdx].idAo || String(aoIdx + 1),
        };
      } else {
        aos[aoIdx] = {
          idAo: aos[aoIdx].idAo,
          name: "",
          type: "omni",
          frontArea: "",
          weight: "",
          hDistance: "",
          nnC: "1",
          quantity: "1",
          sideArea: "",
          fixAngle: "0",
        };
      }
      target.armObjects = aos;
      next[armIdx] = target;
      return next;
    });
  };
  const handleDeleteAo = (armIdx, aoIdx) => {
    armForm.setArms((prev) => {
      const next = [...prev];
      const target = { ...next[armIdx] };
      target.armObjects = (target.armObjects || []).filter(
        (_, i) => i !== aoIdx,
      );
      next[armIdx] = target;
      return next;
    });
  };
  const handleAddAo = (armIdx) => {
    armForm.setArms((prev) => {
      const next = [...prev];
      const target = { ...next[armIdx] };
      const aos = target.armObjects || [];
      if (aos.length >= 5) return prev;
      target.armObjects = [
        ...aos,
        {
          idAo: `${armIdx + 1}.${aos.length + 1}`,
          name: "",
          type: "omni",
          frontArea: "",
          weight: "",
          hDistance: "",
          nnC: "1",
          quantity: "1",
        },
      ];
      next[armIdx] = target;
      return next;
    });
  };

  // Helper pengubah nilai Arm dan Arm Objects
  const handleUpdateArmField = (armIdx, field, value) => {
    armForm.setArms((prev) => {
      const next = [...prev];
      const updated = { ...next[armIdx], [field]: value };
      if (field === "height" || field === "zHeight") {
        updated.height = value;
        updated.zHeight = value;
        const numM = Number(value) / 1000;
        const instM = !isNaN(numM) ? Number(numM.toFixed(3)) : 0;
        updated.installationHeightM = instM;
        // Otomatis sinkronkan height dari seluruh object yang ngikut di arm tersebut
        if (Array.isArray(updated.armObjects)) {
          updated.armObjects = updated.armObjects.map((ao) => ({
            ...ao,
            height: value,
            zHeight: value,
            installationHeightM: instM,
          }));
        }
      }
      next[armIdx] = updated;
      return next;
    });
  };

  const handleUpdateArmObjectField = (armIdx, aoIdx, field, value) => {
    armForm.setArms((prev) => {
      const next = [...prev];
      const targetArm = { ...next[armIdx] };
      const aos = [...(targetArm.armObjects || [])];
      aos[aoIdx] = { ...aos[aoIdx], [field]: value };
      targetArm.armObjects = aos;
      next[armIdx] = targetArm;
      return next;
    });
  };

  // ─── 5. VISIBILITY CHECKS FOR SECTIONS ──────────────────────────────────────
  const showDirectObjects =
    !isStandard || (doForm.directObjects && doForm.directObjects.length > 0);
  // Overhead Wire selalu ditampilkan apa adanya baik mode standard maupun custom
  const showOhw = true;
  const showArms = !isStandard || (armForm.arms && armForm.arms.length > 0);

  const isReadyToReport =
    Boolean(calculation.isCalculated) &&
    !calculation.loading &&
    !calculation.isInputsChanged;

  const hasCalculationResults = Boolean(
    (calculation.isCalculated || calculation.results?.length > 0) &&
    calculation.displayResult,
  );

  // ─── 6. JSX RENDER VIEW ─────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1440px] mx-auto pt-0 pb-24 sm:pb-8 px-2">
      <Helmet>
        <title>Structural · Project Tools · KORI BALI</title>
      </Helmet>

      {/* ── TOP HEADER / BREADCRUMB BAR (Unified Project Tools Flow Header) ── */}
      <ProjectToolsFlowHeader currentStep="structural" />

      {/* ── ACCORDION SECTIONS ── */}
      <div className="space-y-4">
        {/* ── SECTION 1: Standard and Condition ── */}
        <div className="border border-gray-300 rounded bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("condition")}
            className="w-full px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between text-left cursor-pointer hover:bg-gray-100/60 transition-colors"
          >
            <h2 className="text-xs md:text-sm font-semibold text-gray-900">
              Standard and Condition
            </h2>
            {openSections.condition ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {openSections.condition && (
            <div className="p-3.5 sm:p-5 grid grid-cols-[145px_1fr] sm:grid-cols-[220px_1fr] md:grid-cols-[260px_1fr] lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-3 sm:gap-5 md:gap-8">
              {/* Left: Design Standard */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1">
                  Design Standard
                </label>
                <p className="text-xs text-gray-500 mb-2.5 sm:mb-3 leading-snug">
                  Select a standard to view its required parameters.
                </p>
                <div className="space-y-1.5 sm:space-y-2">
                  {DESIGN_STANDARDS.map((std) => {
                    const isSelected = selectedStandardTab === std.id;
                    return (
                      <button
                        key={std.id}
                        type="button"
                        onClick={() => handleSelectDesignStandard(std)}
                        className={`w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 rounded border text-xs md:text-sm flex items-center justify-between gap-1.5 cursor-pointer transition-colors ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 text-blue-900 font-medium"
                            : "border-gray-200 hover:border-gray-400 text-gray-700 bg-white"
                        }`}
                      >
                        <span className="leading-tight">{std.label}</span>
                        {isSelected ? (
                          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Parameters or Under Development Notice */}
              {selectedStandardTab === "old_lighting_pole" ? (
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1">
                    Old JIL parameters
                  </label>
                  <p className="text-xs text-gray-500 mb-2.5 sm:mb-3 leading-snug">
                    Pre-filled with default values. Adjust them to match your
                    project requirements.
                  </p>
                  <div className="flex flex-col md:flex-row items-start gap-4 sm:gap-6">
                    {/* Wind Speed */}
                    <div className="w-full sm:w-[220px] max-w-[240px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-1.5">
                        Wind Speed{" "}
                        <span className="text-red-500 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={condition.designWindSpeed ?? "60"}
                          onChange={(e) =>
                            updateCondition({ designWindSpeed: e.target.value })
                          }
                          className="w-full pl-3 pr-12 py-2 rounded border border-gray-300 text-xs md:text-sm outline-none focus:border-gray-700 bg-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none whitespace-nowrap">
                          m/s
                        </span>
                      </div>
                    </div>

                    {/* Air Density */}
                    <div className="w-full sm:w-[220px] max-w-[240px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-1.5">
                        Air Density{" "}
                        <span className="text-red-500 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={condition.designAirDensity ?? "1.23"}
                          onChange={(e) =>
                            updateCondition({
                              designAirDensity: e.target.value,
                            })
                          }
                          className="w-full pl-3 pr-24 py-2 rounded border border-gray-300 text-xs md:text-sm outline-none focus:border-gray-700 bg-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none whitespace-nowrap">
                          N · sec2/m4
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[140px] flex flex-col justify-center border border-gray-200 rounded p-6 bg-gray-50/50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs md:text-sm font-semibold text-gray-900 mb-1">
                        {
                          DESIGN_STANDARDS.find(
                            (s) => s.id === selectedStandardTab,
                          )?.label
                        }{" "}
                        Standard Not Available
                      </h3>
                      <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                        The "
                        {
                          DESIGN_STANDARDS.find(
                            (s) => s.id === selectedStandardTab,
                          )?.label
                        }
                        " design standard is currently under development. Only
                        the "Old JIL" standard is available for calculations at
                        this time.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 2: Pole Specifications (Combined Lowest Height & Pole Details) ── */}
        <div className="border border-gray-300 rounded bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("spec")}
            className="w-full px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between text-left cursor-pointer hover:bg-gray-100/60 transition-colors"
          >
            <h2 className="text-xs md:text-sm font-semibold text-gray-900">
              Pole Specifications
            </h2>
            {openSections.spec ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {openSections.spec && (
            <div className="p-5 space-y-6">
              {/* ── Standard Customization Global Revert Button ── */}
              {SHOW_RESET_TO_DEFAULT && isStandard && isModifiedFromPreset && (
                <div className="flex justify-end -mb-2">
                  <button
                    type="button"
                    onClick={handleResetToStandard}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer transition-colors hover:underline"
                    title="Reset all specifications back to standard preset"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                    <span>Reset to default spec</span>
                  </button>
                </div>
              )}

              {/* ── Sub-section 0: Embedment Length (Khusus mode Embedment) ── */}
              {isEmbedment && (
                <div className="border border-gray-200 rounded p-4 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs md:text-sm font-semibold text-blue-900 flex items-center gap-2">
                        <span className="w-1 h-3.5 bg-blue-600 rounded-full inline-block" />
                        Embedment Length Input
                      </h3>
                    </div>
                  </div>

                  {/* Centered Content: Input on Left, Embedment SVG Diagram on Right */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3">
                    {/* Input Field (Style persis sama dengan Lowest Height Position) */}
                    <div className="w-44 shrink-0">
                      <label
                        htmlFor="embedmentLength"
                        className="block text-xs font-medium text-gray-700 mb-1.5"
                      >
                        Embedment Length{" "}
                        <span className="text-red-500 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="embedmentLength"
                          type="number"
                          min="0"
                          placeholder="Input Length"
                          value={
                            poleConfigForm.poleConfig?.embedmentLength ??
                            poleStandardForm.taperPoleStandard
                              ?.embedmentLength ??
                            ""
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            poleConfigForm.updatePoleConfig({
                              embedmentLength: val,
                            });
                            poleStandardForm.updateTaperPoleStandard?.({
                              embedmentLength: val,
                            });
                            if (
                              poleConfigForm.poleConfigErrors?.embedmentLength
                            ) {
                              poleConfigForm.setPoleConfigErrors((prev) => {
                                const next = { ...prev };
                                delete next.embedmentLength;
                                return next;
                              });
                            }
                          }}
                          className={`w-full h-10 pl-3.5 pr-12 rounded-md border text-sm outline-none transition-colors ${
                            poleConfigForm.poleConfigErrors?.embedmentLength
                              ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                              : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                          }`}
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium pointer-events-none">
                          mm
                        </span>
                      </div>
                      {poleConfigForm.poleConfigErrors?.embedmentLength && (
                        <p className="text-[11px] text-red-500 mt-1">
                          *{poleConfigForm.poleConfigErrors.embedmentLength}
                        </p>
                      )}
                    </div>

                    {/* Right Side: Embedment SVG Graphic (Mepet gap) */}
                    <div className="relative inline-flex items-center justify-center shrink-0 -ml-1 sm:-ml-3">
                      <img
                        src="/images/embedment.svg"
                        alt="Embedment Length Illustration"
                        className="h-40 sm:h-48 w-auto object-contain select-none shrink-0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Sub-section 1: Lowest Height Position ── */}
              <div className="border border-gray-200 rounded p-4 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs md:text-sm font-semibold text-blue-900 flex items-center gap-2">
                      <span className="w-1 h-3.5 bg-blue-600 rounded-full inline-block" />
                      Lowest Height Position
                    </h3>
                  </div>
                  {SHOW_RESET_TO_DEFAULT && isLowestHeightModified && (
                    <button
                      type="button"
                      onClick={() => {
                        const defaultVal =
                          standardPreset?.poleConfig?.lowestHeight ??
                          (isUnderGL ? "-300" : "0");
                        poleConfigForm.updatePoleConfig({
                          lowestHeight: defaultVal,
                        });
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer transition-colors hover:underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reset to default spec</span>
                    </button>
                  )}
                </div>

                {/* Input Pojok Kiri */}
                <div className="mb-4">
                  <label
                    htmlFor="lowestHeight"
                    className="block text-xs font-medium text-gray-700 mb-1.5"
                  >
                    Lowest Height{" "}
                    <span className="text-red-500 font-semibold">*</span>
                  </label>
                  <div className="relative w-44">
                    <input
                      id="lowestHeight"
                      type="number"
                      placeholder={isUnderGL ? "-300" : "0"}
                      value={poleConfigForm.poleConfig?.lowestHeight ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        poleConfigForm.updatePoleConfig({
                          lowestHeight: val,
                        });
                        if (poleConfigForm.poleConfigErrors?.lowestHeight) {
                          poleConfigForm.setPoleConfigErrors((prev) => {
                            const next = { ...prev };
                            delete next.lowestHeight;
                            return next;
                          });
                        }
                      }}
                      className={`w-full h-10 pl-3.5 pr-12 rounded-md border text-sm outline-none transition-colors ${
                        poleConfigForm.poleConfigErrors?.lowestHeight
                          ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                          : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                      }`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium pointer-events-none">
                      mm
                    </span>
                  </div>

                  {poleConfigForm.poleConfigErrors?.lowestHeight && (
                    <p className="text-[11px] text-red-500 mt-1">
                      *{poleConfigForm.poleConfigErrors.lowestHeight}
                    </p>
                  )}
                </div>

                {/* Reference Diagram Image */}
                <div className="w-full border border-gray-200 rounded-lg bg-slate-50/60 p-3 sm:p-4 flex flex-col overflow-hidden">
                  <div className="w-full mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">
                      Reference Diagram (Lowest Position)
                    </span>
                  </div>
                  <div className="w-full bg-white border border-gray-200 rounded-md p-2 sm:p-3 flex items-center justify-center">
                    <img
                      src="/images/reference_diagram_lowest_height.png"
                      alt="Reference Diagram (Lowest Position)"
                      className="w-full max-w-[950px] h-auto object-contain select-none pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              {/* ── Sub-section 2: Overdesign Factor ── */}
              <div className="border border-gray-200 rounded p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-gray-900">
                      Overdesign Factor{" "}
                      <span className="text-red-500 font-semibold">*</span>
                    </span>
                    <div className="w-44">
                      <input
                        id="overdesignFactor"
                        type="number"
                        step="any"
                        value={
                          poleConfigForm.poleConfig?.overdesignFactor ||
                          poleConfigForm.poleConfig?.overDesign ||
                          "1"
                        }
                        onChange={(e) => {
                          poleConfigForm.updatePoleConfig({
                            overdesignFactor: e.target.value,
                            overDesign: e.target.value,
                          });
                          if (
                            poleConfigForm.poleConfigErrors?.overdesignFactor ||
                            poleConfigForm.poleConfigErrors?.overDesign
                          ) {
                            poleConfigForm.setPoleConfigErrors((prev) => {
                              const next = { ...prev };
                              delete next.overdesignFactor;
                              delete next.overDesign;
                              return next;
                            });
                          }
                        }}
                        className={`w-full h-10 px-3.5 rounded-md border text-sm outline-none transition-colors ${
                          poleConfigForm.poleConfigErrors?.overdesignFactor ||
                          poleConfigForm.poleConfigErrors?.overDesign
                            ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                            : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                        }`}
                      />
                    </div>
                  </div>

                  {SHOW_RESET_TO_DEFAULT && isOverdesignModified && (
                    <button
                      type="button"
                      onClick={() => {
                        poleConfigForm.updatePoleConfig({
                          overDesign:
                            standardPreset.poleConfig?.overDesign ?? "1",
                          overdesignFactor:
                            standardPreset.poleConfig?.overDesign ?? "1",
                        });
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer transition-colors hover:underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reset to default spec</span>
                    </button>
                  )}
                </div>

                {(poleConfigForm.poleConfigErrors?.overdesignFactor ||
                  poleConfigForm.poleConfigErrors?.overDesign) && (
                  <p className="text-[11px] text-red-500 mt-1.5">
                    *
                    {poleConfigForm.poleConfigErrors?.overdesignFactor ||
                      poleConfigForm.poleConfigErrors?.overDesign}
                  </p>
                )}
              </div>

              {/* ── Sub-section 3: Step Poles ── */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs md:text-sm font-semibold text-blue-900 flex items-center gap-1.5">
                      <span className="w-1 h-3.5 bg-blue-600 rounded-full inline-block" />
                      Step Poles
                    </h3>
                    {SHOW_RESET_TO_DEFAULT &&
                      isStandard &&
                      isModifiedFromPreset && (
                        <button
                          type="button"
                          onClick={handleResetToStandard}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer transition-colors hover:underline"
                          title="Reset all specifications back to standard preset"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                          <span>Reset to default spec</span>
                        </button>
                      )}
                    {!isStandard && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Configure up to 6 Step Poles with their respective
                        specifications.
                      </p>
                    )}
                  </div>

                  {!isStandard && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700">
                        {poleForm.poles.length} / 6 Poles
                      </span>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="6"
                          value={quickPoleCount}
                          onChange={(e) => setQuickPoleCount(e.target.value)}
                          placeholder="Number of step poles"
                          className="w-36 px-2.5 py-1 text-xs border border-gray-300 rounded outline-none focus:border-gray-600 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleQuickPoleCountOk}
                          className="px-3 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-100 text-gray-700 cursor-pointer"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {(poleForm.poles || []).map((pole, idx) => (
                    <div
                      key={pole.id || idx}
                      className="p-4 rounded border border-gray-200 bg-white space-y-3 shadow-2xs"
                    >
                      {/* Pole Card Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-[#0f3d64] text-white text-[11px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-gray-900">
                            Step Pole
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {pole.poleType || "Straight"} Type
                          </span>
                        </div>

                        {/* Top-right card actions: hanya ditampilkan pada mode Custom */}
                        {!isStandard && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyPole(pole)}
                              title="Copy Pole"
                              className="p-1.5 border border-gray-200 hover:border-gray-400 rounded text-gray-600 hover:text-gray-900 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePastePole(idx)}
                              disabled={!poleClipboard}
                              title="Paste Pole"
                              className="p-1.5 border border-gray-200 hover:border-gray-400 rounded text-gray-600 hover:text-gray-900 cursor-pointer disabled:opacity-40"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetPole(idx)}
                              className="px-3 py-1 border border-red-200 rounded text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                              title="Reset Step Pole"
                            >
                              Reset
                            </button>
                            {poleForm.poles.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  requestDelete("Step Pole", () =>
                                    handleDeletePole(idx),
                                  )
                                }
                                className="px-2.5 py-1 border border-red-300 rounded text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                                title="Delete Step Pole"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Fields Grid */}
                      {(() => {
                        const poleErr =
                          poleForm.poleErrors?.[pole.id] ||
                          poleForm.poleErrors?.[String(idx + 1)] ||
                          {};
                        const poleType =
                          pole.poleType || pole.type || "Straight";
                        const isStraight =
                          poleType.toLowerCase() === "straight";
                        return (
                          <div
                            className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${isStraight ? "xl:grid-cols-7" : "xl:grid-cols-9"} gap-2.5`}
                          >
                            {/* Pole Name */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Pole Name"
                              >
                                Pole Name{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <input
                                id={`pole-${pole.id || idx + 1}-name`}
                                type="text"
                                value={pole.name || ""}
                                onChange={(e) =>
                                  poleForm.updatePole(
                                    pole.id || String(idx + 1),
                                    {
                                      name: e.target.value,
                                    },
                                  )
                                }
                                className={`w-full h-10 px-2.5 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                  poleErr.name
                                    ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                    : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                }`}
                              />
                              {typeof poleErr.name === "string" && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{poleErr.name}
                                </p>
                              )}
                            </div>

                            {/* Material */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Material"
                              >
                                Material{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <select
                                id={`pole-${pole.id || idx + 1}-material`}
                                value={pole.material || "STK400"}
                                onChange={(e) =>
                                  poleForm.updatePole(
                                    pole.id || String(idx + 1),
                                    {
                                      material: e.target.value,
                                    },
                                  )
                                }
                                className="w-full h-10 px-2 rounded-md border border-gray-300 text-xs md:text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 bg-white cursor-pointer transition-colors"
                              >
                                {MATERIAL_OPTIONS.map((m) => (
                                  <option key={m.value} value={m.value}>
                                    {m.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Pole Type */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Pole Type"
                              >
                                Pole Type{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <select
                                id={`pole-${pole.id || idx + 1}-poleType`}
                                value={pole.poleType || pole.type || "Straight"}
                                onChange={(e) => {
                                  const newType = e.target.value;
                                  const updates = {
                                    poleType: newType,
                                    type: newType,
                                  };
                                  if (newType.toLowerCase() === "straight") {
                                    updates.upperDiameter =
                                      pole.lowerDiameter ||
                                      pole.upperDiameter ||
                                      "";
                                    updates.upperThickness =
                                      pole.lowerThickness ||
                                      pole.upperThickness ||
                                      "";
                                  }
                                  poleForm.updatePole(
                                    pole.id || String(idx + 1),
                                    updates,
                                  );
                                }}
                                className="w-full h-10 px-2 rounded-md border border-gray-300 text-xs md:text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 bg-white cursor-pointer transition-colors"
                              >
                                <option value="Straight">Straight</option>
                                <option value="Taper">Taper</option>
                              </select>
                            </div>

                            {/* Diameter (Lower / Straight) */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title={
                                  isStraight ? "Diameter" : "Lower Diameter"
                                }
                              >
                                {isStraight ? "Diameter" : "Lower Diameter"}{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`pole-${pole.id || idx + 1}-lowerDiameter`}
                                  type="number"
                                  value={pole.lowerDiameter || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    poleForm.updatePole(
                                      pole.id || String(idx + 1),
                                      {
                                        lowerDiameter: val,
                                        ...(isStraight && {
                                          upperDiameter: val,
                                        }),
                                      },
                                    );
                                  }}
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    poleErr.lowerDiameter ||
                                    (isStraight && poleErr.upperDiameter)
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  mm
                                </span>
                              </div>
                              {(poleErr.lowerDiameter ||
                                (isStraight && poleErr.upperDiameter)) && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *
                                  {poleErr.lowerDiameter ||
                                    (isStraight && poleErr.upperDiameter)}
                                </p>
                              )}
                            </div>

                            {/* Upper Diameter (Taper only) */}
                            {!isStraight && (
                              <div>
                                <label
                                  className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                  title="Upper Diameter"
                                >
                                  Upper Diameter{" "}
                                  <span className="text-red-500 font-semibold">
                                    *
                                  </span>
                                </label>
                                <div className="relative">
                                  <input
                                    id={`pole-${pole.id || idx + 1}-upperDiameter`}
                                    type="number"
                                    value={pole.upperDiameter || ""}
                                    onChange={(e) =>
                                      poleForm.updatePole(
                                        pole.id || String(idx + 1),
                                        {
                                          upperDiameter: e.target.value,
                                        },
                                      )
                                    }
                                    className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                      poleErr.upperDiameter
                                        ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                        : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                    }`}
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                    mm
                                  </span>
                                </div>
                                {typeof poleErr.upperDiameter === "string" && (
                                  <p className="text-[10px] text-red-500 mt-1 truncate">
                                    *{poleErr.upperDiameter}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Thickness (Lower / Straight) */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title={
                                  isStraight ? "Thickness" : "Lower Thickness"
                                }
                              >
                                {isStraight ? "Thickness" : "Lower Thickness"}{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`pole-${pole.id || idx + 1}-lowerThickness`}
                                  type="number"
                                  step="any"
                                  value={pole.lowerThickness || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    poleForm.updatePole(
                                      pole.id || String(idx + 1),
                                      {
                                        lowerThickness: val,
                                        ...(isStraight && {
                                          upperThickness: val,
                                        }),
                                      },
                                    );
                                  }}
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    poleErr.lowerThickness ||
                                    (isStraight && poleErr.upperThickness)
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  mm
                                </span>
                              </div>
                              {(poleErr.lowerThickness ||
                                (isStraight && poleErr.upperThickness)) && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *
                                  {poleErr.lowerThickness ||
                                    (isStraight && poleErr.upperThickness)}
                                </p>
                              )}
                            </div>

                            {/* Upper Thickness (Taper only) */}
                            {!isStraight && (
                              <div>
                                <label
                                  className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                  title="Upper Thickness"
                                >
                                  Upper Thickness{" "}
                                  <span className="text-red-500 font-semibold">
                                    *
                                  </span>
                                </label>
                                <div className="relative">
                                  <input
                                    id={`pole-${pole.id || idx + 1}-upperThickness`}
                                    type="number"
                                    step="any"
                                    value={pole.upperThickness || ""}
                                    onChange={(e) =>
                                      poleForm.updatePole(
                                        pole.id || String(idx + 1),
                                        {
                                          upperThickness: e.target.value,
                                        },
                                      )
                                    }
                                    className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                      poleErr.upperThickness
                                        ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                        : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                    }`}
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                    mm
                                  </span>
                                </div>
                                {typeof poleErr.upperThickness === "string" && (
                                  <p className="text-[10px] text-red-500 mt-1 truncate">
                                    *{poleErr.upperThickness}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Height */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Height"
                              >
                                Height{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`pole-${pole.id || idx + 1}-zHeight`}
                                  type="number"
                                  value={pole.zHeight || ""}
                                  onChange={(e) =>
                                    poleForm.updatePole(
                                      pole.id || String(idx + 1),
                                      {
                                        zHeight: e.target.value,
                                      },
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    poleErr.zHeight
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  mm
                                </span>
                              </div>
                              {typeof poleErr.zHeight === "string" && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{poleErr.zHeight}
                                </p>
                              )}
                            </div>

                            {/* Quantity */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Quantity"
                              >
                                Quantity{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`pole-${pole.id || idx + 1}-quantity`}
                                  type="number"
                                  min="1"
                                  value={pole.quantity || "1"}
                                  onChange={(e) =>
                                    poleForm.updatePole(
                                      pole.id || String(idx + 1),
                                      {
                                        quantity: e.target.value,
                                      },
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    poleErr.quantity
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  pcs
                                </span>
                              </div>
                              {typeof poleErr.quantity === "string" && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{poleErr.quantity}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}

                  {/* Add Step Pole Button */}
                  {!isStandard && poleForm.poles.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddPole}
                      className="w-full py-3 rounded border border-dashed border-blue-800 text-blue-900 font-medium text-xs md:text-sm hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Step Pole</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 3: Direct Object Specifications ── */}
        {showDirectObjects && (
          <div className="border border-gray-300 rounded bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("directObject")}
              className="w-full px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between text-left cursor-pointer hover:bg-gray-100/60 transition-colors"
            >
              <h2 className="text-xs md:text-sm font-semibold text-gray-900">
                Direct Object Specifications
              </h2>
              {openSections.directObject ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {openSections.directObject && (
              <div className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-xs md:text-sm font-semibold text-blue-900 flex items-center gap-1.5">
                      <span className="w-1 h-3.5 bg-blue-600 rounded-full inline-block" />
                      Direct Objects
                    </h3>
                    {!isStandard && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Configure up to 10 Direct Objects with their respective
                        specifications.
                      </p>
                    )}
                  </div>

                  {!isStandard && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700">
                        {doForm.directObjects.length} / 10 Objects
                      </span>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={quickDoCount}
                          onChange={(e) => setQuickDoCount(e.target.value)}
                          placeholder="Number of direct objects"
                          className="w-40 px-2.5 py-1 text-xs border border-gray-300 rounded outline-none focus:border-gray-600 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleQuickDoCountOk}
                          className="px-3 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-100 text-gray-700 cursor-pointer"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {doForm.directObjects.length === 0 ? (
                  <div className="py-8 text-center text-xs md:text-sm text-gray-400 border border-gray-200 rounded bg-gray-50/50 select-none">
                    No Direct Objects added yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {doForm.directObjects.map((obj, idx) => {
                      const doErr =
                        doForm.doErrors?.[obj.idDo] ||
                        doForm.doErrors?.[obj.id] ||
                        doForm.doErrors?.[String(idx + 1)] ||
                        {};

                      return (
                        <div
                          key={obj.idDo || idx}
                          className="p-4 rounded border border-gray-200 bg-white space-y-3 shadow-2xs"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-[#0f3d64] text-white text-[11px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-semibold text-gray-900">
                                Direct Object
                              </span>
                              <span className="text-[11px] text-gray-500">
                                {obj.type === "directional"
                                  ? "Directional"
                                  : "Omni"}{" "}
                                Type
                              </span>
                            </div>

                            {/* Top-right card actions: hanya ditampilkan pada mode Custom */}
                            {!isStandard && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyDo(obj)}
                                  title="Copy"
                                  className="p-1.5 border border-gray-200 hover:border-gray-400 rounded text-gray-600 hover:text-gray-900 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePasteDo(idx)}
                                  disabled={!doClipboard}
                                  title="Paste"
                                  className="p-1.5 border border-gray-200 hover:border-gray-400 rounded text-gray-600 hover:text-gray-900 cursor-pointer disabled:opacity-40"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResetDo(idx)}
                                  className="px-3 py-1 border border-red-200 rounded text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                                  title="Reset Direct Object"
                                >
                                  Reset
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    requestDelete("Direct Object", () =>
                                      handleDeleteDo(idx),
                                    )
                                  }
                                  className="px-2.5 py-1 border border-red-300 rounded text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                                  title="Delete Direct Object"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>

                          <div
                            className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${
                              obj.type === "directional"
                                ? "xl:grid-cols-9"
                                : "xl:grid-cols-7"
                            } gap-2.5`}
                          >
                            {/* Object Name */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Object Name"
                              >
                                Object Name{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <input
                                id={`do-${obj.idDo || obj.id || idx + 1}-name`}
                                type="text"
                                value={obj.name || ""}
                                onChange={(e) =>
                                  doForm.updateDo(obj.idDo || String(idx + 1), {
                                    name: e.target.value,
                                  })
                                }
                                className={`w-full h-10 px-2.5 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                  doErr.name
                                    ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                    : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                }`}
                              />
                              {doErr.name && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{doErr.name}
                                </p>
                              )}
                            </div>

                            {/* Object Type */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Object Type"
                              >
                                Object Type{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <select
                                id={`do-${obj.idDo || obj.id || idx + 1}-type`}
                                value={obj.type || "omni"}
                                onChange={(e) =>
                                  doForm.updateDo(obj.idDo || String(idx + 1), {
                                    type: e.target.value,
                                  })
                                }
                                className={`w-full h-10 px-2 rounded-md border text-xs md:text-sm outline-none cursor-pointer transition-colors ${
                                  doErr.type
                                    ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                    : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                }`}
                              >
                                {OBJECT_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {doErr.type && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{doErr.type}
                                </p>
                              )}
                            </div>

                            {/* Front Area */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Front Area"
                              >
                                Front Area{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`do-${obj.idDo || obj.id || idx + 1}-frontArea`}
                                  type="number"
                                  step="any"
                                  value={obj.frontArea || ""}
                                  onChange={(e) =>
                                    doForm.updateDo(
                                      obj.idDo || String(idx + 1),
                                      {
                                        frontArea: e.target.value,
                                      },
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    doErr.frontArea
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  m²
                                </span>
                              </div>
                              {doErr.frontArea && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{doErr.frontArea}
                                </p>
                              )}
                            </div>

                            {/* Side Area - only if Directional */}
                            {obj.type === "directional" && (
                              <div>
                                <label
                                  className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                  title="Side Area"
                                >
                                  Side Area{" "}
                                  <span className="text-red-500 font-semibold">
                                    *
                                  </span>
                                </label>
                                <div className="relative">
                                  <input
                                    id={`do-${obj.idDo || obj.id || idx + 1}-sideArea`}
                                    type="number"
                                    step="any"
                                    value={obj.sideArea || ""}
                                    onChange={(e) =>
                                      doForm.updateDo(
                                        obj.idDo || String(idx + 1),
                                        {
                                          sideArea: e.target.value,
                                        },
                                      )
                                    }
                                    className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                      doErr.sideArea
                                        ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                        : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                    }`}
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                    m²
                                  </span>
                                </div>
                                {doErr.sideArea && (
                                  <p className="text-[10px] text-red-500 mt-1 truncate">
                                    *{doErr.sideArea}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Weight */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Weight"
                              >
                                Weight{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`do-${obj.idDo || obj.id || idx + 1}-weight`}
                                  type="number"
                                  step="any"
                                  value={obj.weight || ""}
                                  onChange={(e) =>
                                    doForm.updateDo(
                                      obj.idDo || String(idx + 1),
                                      {
                                        weight: e.target.value,
                                      },
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    doErr.weight
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  kg
                                </span>
                              </div>
                              {doErr.weight && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{doErr.weight}
                                </p>
                              )}
                            </div>

                            {/* Height */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Height"
                              >
                                Height{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`do-${obj.idDo || obj.id || idx + 1}-zHeight`}
                                  type="number"
                                  value={obj.zHeight || ""}
                                  onChange={(e) =>
                                    doForm.updateDo(
                                      obj.idDo || String(idx + 1),
                                      {
                                        zHeight: e.target.value,
                                      },
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    doErr.zHeight
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  mm
                                </span>
                              </div>
                              {doErr.zHeight && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{doErr.zHeight}
                                </p>
                              )}
                            </div>

                            {/* nnC */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="nnC"
                              >
                                nnC{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <input
                                id={`do-${obj.idDo || obj.id || idx + 1}-nnC`}
                                type="number"
                                step="any"
                                value={obj.nnC || "1"}
                                onChange={(e) =>
                                  doForm.updateDo(obj.idDo || String(idx + 1), {
                                    nnC: e.target.value,
                                  })
                                }
                                className={`w-full h-10 px-2.5 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                  doErr.nnC
                                    ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                    : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                }`}
                              />
                              {doErr.nnC && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{doErr.nnC}
                                </p>
                              )}
                            </div>

                            {/* Quantity */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Quantity"
                              >
                                Quantity{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`do-${obj.idDo || obj.id || idx + 1}-quantity`}
                                  type="number"
                                  min="1"
                                  value={obj.quantity || "1"}
                                  onChange={(e) =>
                                    doForm.updateDo(
                                      obj.idDo || String(idx + 1),
                                      {
                                        quantity: e.target.value,
                                      },
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    doErr.quantity
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  pcs
                                </span>
                              </div>
                              {doErr.quantity && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{doErr.quantity}
                                </p>
                              )}
                            </div>

                            {/* Fix Angle - only if Directional */}
                            {obj.type === "directional" && (
                              <div>
                                <label
                                  className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                  title="Fix Angle"
                                >
                                  Fix Angle{" "}
                                  <span className="text-red-500 font-semibold">
                                    *
                                  </span>
                                </label>
                                <div className="relative">
                                  <input
                                    id={`do-${obj.idDo || obj.id || idx + 1}-fixAngle`}
                                    type="number"
                                    value={obj.fixAngle || "0"}
                                    onChange={(e) =>
                                      doForm.updateDo(
                                        obj.idDo || String(idx + 1),
                                        {
                                          fixAngle: e.target.value,
                                        },
                                      )
                                    }
                                    className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                      doErr.fixAngle
                                        ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                        : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                    }`}
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                    deg
                                  </span>
                                </div>
                                {doErr.fixAngle && (
                                  <p className="text-[10px] text-red-500 mt-1 truncate">
                                    *{doErr.fixAngle}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Direct Object Button */}
                {!isStandard && doForm.directObjects.length < 10 && (
                  <button
                    type="button"
                    onClick={handleAddDirectObject}
                    className="w-full py-3 rounded border border-dashed border-blue-800 text-blue-900 font-medium text-xs md:text-sm hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Direct Object</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 4: Overhead Wire (OHW) Specifications ── */}
        {showOhw && (
          <div className="border border-gray-300 rounded bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("ohw")}
              className="w-full px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between text-left cursor-pointer hover:bg-gray-100/60 transition-colors"
            >
              <h2 className="text-xs md:text-sm font-semibold text-gray-900">
                Overhead Wire (OHW) Specifications
              </h2>
              {openSections.ohw ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {openSections.ohw && (
              <div className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-xs md:text-sm font-semibold text-blue-900 flex items-center gap-1.5">
                      <span className="w-1 h-3.5 bg-blue-600 rounded-full inline-block" />
                      Overhead Wires
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure up to 4 Overhead Wires with their respective
                      specifications.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700">
                      {ohwForm.overheadWires.length} / 4 Overhead Wires
                    </span>

                    {!isStandard && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="4"
                          value={quickOhwCount}
                          onChange={(e) => setQuickOhwCount(e.target.value)}
                          placeholder="Number of overhead wires"
                          className="w-44 px-2.5 py-1 text-xs border border-gray-300 rounded outline-none focus:border-gray-600 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleQuickOhwCountOk}
                          className="px-3 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-100 text-gray-700 cursor-pointer"
                        >
                          OK
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {ohwForm.overheadWires.length === 0 ? (
                  <div className="py-8 text-center text-xs md:text-sm text-gray-400 border border-gray-200 rounded bg-gray-50/50 select-none">
                    No Overhead Wires added yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ohwForm.overheadWires.map((wire, idx) => {
                      const ohwErr =
                        ohwForm.ohwErrors?.[wire.idOhw] ||
                        ohwForm.ohwErrors?.[wire.id] ||
                        ohwForm.ohwErrors?.[String(idx + 1)] ||
                        {};

                      return (
                        <div
                          key={wire.idOhw || idx}
                          className="p-4 rounded border border-gray-200 bg-white space-y-3 shadow-2xs"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-[#0f3d64] text-white text-[11px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-semibold text-gray-900">
                                Overhead Wire
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyOhw(wire)}
                                title="Copy"
                                className="p-1.5 border border-gray-200 hover:border-gray-400 rounded text-gray-600 hover:text-gray-900 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePasteOhw(idx)}
                                disabled={!ohwClipboard}
                                title="Paste"
                                className="p-1.5 border border-gray-200 hover:border-gray-400 rounded text-gray-600 hover:text-gray-900 cursor-pointer disabled:opacity-40"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResetOhw(idx)}
                                className="px-3 py-1 border border-red-200 rounded text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                              >
                                Reset
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  requestDelete("Overhead Wire", () =>
                                    handleDeleteOhw(idx),
                                  )
                                }
                                className="px-2.5 py-1 border border-red-300 rounded text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                                title="Delete Overhead Wire"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5">
                            {/* 1. Overhead Wire Name */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Overhead Wire Name"
                              >
                                Overhead Wire Name{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <input
                                id={`ohw-${wire.idOhw || wire.id || idx + 1}-name`}
                                type="text"
                                placeholder="e.g., DV2.6-2C"
                                value={wire.name || ""}
                                onChange={(e) =>
                                  ohwForm.updateOhw(
                                    wire.idOhw || String(idx + 1),
                                    {
                                      name: e.target.value,
                                    },
                                  )
                                }
                                className={`w-full h-10 px-2.5 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                  ohwErr.name
                                    ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                    : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                }`}
                              />
                              {ohwErr.name && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{ohwErr.name}
                                </p>
                              )}
                            </div>

                            {/* 2. Weight */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Weight"
                              >
                                Weight{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`ohw-${wire.idOhw || wire.id || idx + 1}-weight`}
                                  type="number"
                                  step="any"
                                  value={wire.weight || ""}
                                  onChange={(e) =>
                                    ohwForm.updateOhw(
                                      wire.idOhw || String(idx + 1),
                                      {
                                        weight: e.target.value,
                                      },
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-11 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    ohwErr.weight
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-medium pointer-events-none">
                                  kg/m
                                </span>
                              </div>
                              {ohwErr.weight && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{ohwErr.weight}
                                </p>
                              )}
                            </div>

                            {/* 3. Diameter */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Diameter"
                              >
                                Diameter{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`ohw-${wire.idOhw || wire.id || idx + 1}-diameter`}
                                  type="number"
                                  step="any"
                                  value={wire.diameter || ""}
                                  onChange={(e) =>
                                    ohwForm.updateOhw(
                                      wire.idOhw || String(idx + 1),
                                      {
                                        diameter: e.target.value,
                                      },
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    ohwErr.diameter
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  mm
                                </span>
                              </div>
                              {ohwErr.diameter && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{ohwErr.diameter}
                                </p>
                              )}
                            </div>

                            {/* 4. Height */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Height"
                              >
                                Height{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`ohw-${wire.idOhw || wire.id || idx + 1}-zHeight`}
                                  type="number"
                                  step="any"
                                  value={wire.zHeight || ""}
                                  onChange={(e) =>
                                    ohwForm.updateOhw(
                                      wire.idOhw || String(idx + 1),
                                      {
                                        zHeight: e.target.value,
                                      },
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    ohwErr.zHeight
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  mm
                                </span>
                              </div>
                              {ohwErr.zHeight && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{ohwErr.zHeight}
                                </p>
                              )}
                            </div>

                            {/* 5. Span */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Span"
                              >
                                Span{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`ohw-${wire.idOhw || wire.id || idx + 1}-span`}
                                  type="number"
                                  step="any"
                                  value={wire.span || ""}
                                  onChange={(e) =>
                                    ohwForm.updateOhw(
                                      wire.idOhw || String(idx + 1),
                                      {
                                        span: e.target.value,
                                      },
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    ohwErr.span
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  mm
                                </span>
                              </div>
                              {ohwErr.span && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{ohwErr.span}
                                </p>
                              )}
                            </div>

                            {/* 6. Sagging Ratio */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Sagging Ratio"
                              >
                                Sagging Ratio{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`ohw-${wire.idOhw || wire.id || idx + 1}-saggingRatio`}
                                  type="number"
                                  step="any"
                                  value={wire.saggingRatio || ""}
                                  onChange={(e) =>
                                    ohwForm.updateOhw(
                                      wire.idOhw || String(idx + 1),
                                      {
                                        saggingRatio: e.target.value,
                                      },
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-7 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    ohwErr.saggingRatio
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  %
                                </span>
                              </div>
                              {ohwErr.saggingRatio && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{ohwErr.saggingRatio}
                                </p>
                              )}
                            </div>

                            {/* 7. nnC */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="nnC"
                              >
                                nnC{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <input
                                id={`ohw-${wire.idOhw || wire.id || idx + 1}-nnC`}
                                type="number"
                                step="any"
                                value={wire.nnC ?? "1"}
                                onChange={(e) =>
                                  ohwForm.updateOhw(
                                    wire.idOhw || String(idx + 1),
                                    {
                                      nnC: e.target.value,
                                    },
                                  )
                                }
                                className={`w-full h-10 px-2.5 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                  ohwErr.nnC
                                    ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                    : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                }`}
                              />
                              {ohwErr.nnC && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{ohwErr.nnC}
                                </p>
                              )}
                            </div>

                            {/* 8. Fix Angle */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Fix Angle"
                              >
                                Fix Angle{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`ohw-${wire.idOhw || wire.id || idx + 1}-fixAngle`}
                                  type="number"
                                  step="any"
                                  value={wire.fixAngle ?? "0"}
                                  onChange={(e) =>
                                    ohwForm.updateOhw(
                                      wire.idOhw || String(idx + 1),
                                      {
                                        fixAngle: e.target.value,
                                      },
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    ohwErr.fixAngle
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  deg
                                </span>
                              </div>
                              {ohwErr.fixAngle && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{ohwErr.fixAngle}
                                </p>
                              )}
                            </div>

                            {/* 9. Vertical Angle */}
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Vertical Angle"
                              >
                                Vertical Angle{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`ohw-${wire.idOhw || wire.id || idx + 1}-verticalAngle`}
                                  type="number"
                                  step="any"
                                  value={wire.verticalAngle ?? "0"}
                                  onChange={(e) =>
                                    ohwForm.updateOhw(
                                      wire.idOhw || String(idx + 1),
                                      {
                                        verticalAngle: e.target.value,
                                      },
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    ohwErr.verticalAngle
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  deg
                                </span>
                              </div>
                              {ohwErr.verticalAngle && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{ohwErr.verticalAngle}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Overhead Wire Button */}
                {ohwForm.overheadWires.length < 4 && (
                  <button
                    type="button"
                    onClick={handleAddOverheadWire}
                    className="w-full py-3 rounded border border-dashed border-blue-800 text-blue-900 font-medium text-xs md:text-sm hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Overhead Wire</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 5: Arm and Object Specifications ── */}
        {showArms && (
          <div className="border border-gray-300 rounded bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("arm")}
              className="w-full px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between text-left cursor-pointer hover:bg-gray-100/60 transition-colors"
            >
              <h2 className="text-xs md:text-sm font-semibold text-gray-900">
                Arm and Object Specifications
              </h2>
              {openSections.arm ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {openSections.arm && (
              <div className="p-5 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-xs md:text-sm font-semibold text-blue-900 flex items-center gap-1.5">
                      <span className="w-1 h-3.5 bg-blue-600 rounded-full inline-block" />
                      Arms
                    </h3>
                    {!isStandard && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Configure up to 10 Arms with their respective
                        specifications.
                      </p>
                    )}
                  </div>

                  {!isStandard && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700">
                        {armForm.arms.length} / 10 Arms
                      </span>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={quickArmCount}
                          onChange={(e) => setQuickArmCount(e.target.value)}
                          placeholder="Number of arms"
                          className="w-36 px-2.5 py-1 text-xs border border-gray-300 rounded outline-none focus:border-gray-600 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleQuickArmCountOk}
                          className="px-3 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-100 text-gray-700 cursor-pointer"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {armForm.arms.length === 0 ? (
                  <div className="py-8 text-center text-xs md:text-sm text-gray-400 border border-gray-200 rounded bg-gray-50/50 select-none">
                    No Arms added yet
                  </div>
                ) : (
                  <div className="space-y-6">
                    {armForm.arms.map((arm, armIdx) => {
                      const armErr =
                        armForm.armsErrors?.[arm.idArm] ||
                        armForm.armsErrors?.[arm.id] ||
                        armForm.armsErrors?.[String(armIdx + 1)] ||
                        {};

                      return (
                        <div
                          key={arm.idArm || armIdx}
                          className="p-4 rounded border border-gray-200 bg-white space-y-4 shadow-2xs"
                        >
                          {/* Arm Header Badge */}
                          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-[#0f3d64] text-white text-[11px] font-bold flex items-center justify-center">
                                {armIdx + 1}
                              </span>
                              <span className="text-xs font-semibold text-gray-900">
                                Arm
                              </span>
                            </div>

                            {/* Top-right card actions: hanya ditampilkan pada mode Custom */}
                            {!isStandard && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyArm(arm)}
                                  title="Copy"
                                  className="p-1.5 border border-gray-200 hover:border-gray-400 rounded text-gray-600 hover:text-gray-900 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePasteArm(armIdx)}
                                  disabled={!armClipboard}
                                  title="Paste"
                                  className="p-1.5 border border-gray-200 hover:border-gray-400 rounded text-gray-600 hover:text-gray-900 cursor-pointer disabled:opacity-40"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResetArm(armIdx)}
                                  className="px-3 py-1 border border-red-200 rounded text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                                  title="Reset Arm"
                                >
                                  Reset
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    requestDelete("Arm", () =>
                                      handleDeleteArm(armIdx),
                                    )
                                  }
                                  className="px-2.5 py-1 border border-red-300 rounded text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                                  title="Delete Arm"
                                >
                                  Delete Arm
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Arm Input Fields */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-11 gap-2.5">
                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Arm Name"
                              >
                                Arm Name{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <input
                                id={`arm-${arm.idArm || arm.id || armIdx + 1}-name`}
                                type="text"
                                value={arm.name || ""}
                                onChange={(e) =>
                                  handleUpdateArmField(
                                    armIdx,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                className={`w-full h-10 px-2.5 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                  armErr.name
                                    ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                    : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                }`}
                              />
                              {armErr.name && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{armErr.name}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Material"
                              >
                                Material{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <select
                                id={`arm-${arm.idArm || arm.id || armIdx + 1}-material`}
                                value={arm.material || "STK400"}
                                onChange={(e) =>
                                  handleUpdateArmField(
                                    armIdx,
                                    "material",
                                    e.target.value,
                                  )
                                }
                                className={`w-full h-10 px-2 rounded-md border text-xs md:text-sm outline-none cursor-pointer transition-colors ${
                                  armErr.material
                                    ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                    : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                }`}
                              >
                                {MATERIAL_OPTIONS.map((m) => (
                                  <option key={m.value} value={m.value}>
                                    {m.label}
                                  </option>
                                ))}
                              </select>
                              {armErr.material && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{armErr.material}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Diameter"
                              >
                                Diameter{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`arm-${arm.idArm || arm.id || armIdx + 1}-diameter`}
                                  type="number"
                                  step="any"
                                  value={arm.diameter || ""}
                                  onChange={(e) =>
                                    handleUpdateArmField(
                                      armIdx,
                                      "diameter",
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    armErr.diameter
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  mm
                                </span>
                              </div>
                              {armErr.diameter && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{armErr.diameter}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Thickness"
                              >
                                Thickness{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`arm-${arm.idArm || arm.id || armIdx + 1}-thickness`}
                                  type="number"
                                  step="any"
                                  value={arm.thickness || ""}
                                  onChange={(e) =>
                                    handleUpdateArmField(
                                      armIdx,
                                      "thickness",
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    armErr.thickness
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  mm
                                </span>
                              </div>
                              {armErr.thickness && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{armErr.thickness}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Length"
                              >
                                Length{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`arm-${arm.idArm || arm.id || armIdx + 1}-length`}
                                  type="number"
                                  value={arm.length || ""}
                                  onChange={(e) =>
                                    handleUpdateArmField(
                                      armIdx,
                                      "length",
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    armErr.length
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  mm
                                </span>
                              </div>
                              {armErr.length && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{armErr.length}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Exp.Length"
                              >
                                Exp.Length{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`arm-${arm.idArm || arm.id || armIdx + 1}-expLength`}
                                  type="number"
                                  value={arm.expLength || ""}
                                  onChange={(e) =>
                                    handleUpdateArmField(
                                      armIdx,
                                      "expLength",
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    armErr.expLength
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  mm
                                </span>
                              </div>
                              {armErr.expLength && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{armErr.expLength}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Height"
                              >
                                Height{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`arm-${arm.idArm || arm.id || armIdx + 1}-zHeight`}
                                  type="number"
                                  value={arm.height ?? arm.zHeight ?? ""}
                                  onChange={(e) =>
                                    handleUpdateArmField(
                                      armIdx,
                                      "height",
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    armErr.zHeight || armErr.height
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  mm
                                </span>
                              </div>
                              {(armErr.zHeight || armErr.height) && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{armErr.zHeight || armErr.height}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="H-Distance"
                              >
                                H-Distance{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`arm-${arm.idArm || arm.id || armIdx + 1}-hDistance`}
                                  type="number"
                                  value={arm.hDistance || ""}
                                  onChange={(e) =>
                                    handleUpdateArmField(
                                      armIdx,
                                      "hDistance",
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    armErr.hDistance
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  mm
                                </span>
                              </div>
                              {armErr.hDistance && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{armErr.hDistance}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Fix Angle"
                              >
                                Fix Angle{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`arm-${arm.idArm || arm.id || armIdx + 1}-fixAngle`}
                                  type="number"
                                  value={arm.fixAngle || "0"}
                                  onChange={(e) =>
                                    handleUpdateArmField(
                                      armIdx,
                                      "fixAngle",
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    armErr.fixAngle
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  deg
                                </span>
                              </div>
                              {armErr.fixAngle && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{armErr.fixAngle}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="nnC"
                              >
                                nnC{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <input
                                id={`arm-${arm.idArm || arm.id || armIdx + 1}-nnC`}
                                type="number"
                                step="any"
                                value={arm.nnC || "0.7"}
                                onChange={(e) =>
                                  handleUpdateArmField(
                                    armIdx,
                                    "nnC",
                                    e.target.value,
                                  )
                                }
                                className={`w-full h-10 px-2.5 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                  armErr.nnC
                                    ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                    : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                }`}
                              />
                              {armErr.nnC && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{armErr.nnC}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                title="Quantity"
                              >
                                Quantity{" "}
                                <span className="text-red-500 font-semibold">
                                  *
                                </span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`arm-${arm.idArm || arm.id || armIdx + 1}-quantity`}
                                  type="number"
                                  min="1"
                                  value={arm.quantity || "1"}
                                  onChange={(e) =>
                                    handleUpdateArmField(
                                      armIdx,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                    armErr.quantity
                                      ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                      : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                  pcs
                                </span>
                              </div>
                              {armErr.quantity && (
                                <p className="text-[10px] text-red-500 mt-1 truncate">
                                  *{armErr.quantity}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Nested Sub-section: Arm Objects */}
                          <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50/50 p-3.5 rounded border border-gray-200/80">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                              <div>
                                <h4 className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                                  <span className="w-1 h-3 bg-blue-500 rounded-full inline-block" />
                                  Arm Objects
                                </h4>
                                {!isStandard && (
                                  <p className="text-[11px] text-gray-500">
                                    Configure up to 5 Arm Objects with their
                                    respective specifications.
                                  </p>
                                )}
                              </div>

                              {!isStandard && (
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded bg-white border border-gray-200 text-[11px] font-medium text-gray-700">
                                    {(arm.armObjects || []).length} / 5 Objects
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max="5"
                                      value={quickAoCounts[armIdx] || ""}
                                      onChange={(e) =>
                                        setQuickAoCounts((p) => ({
                                          ...p,
                                          [armIdx]: e.target.value,
                                        }))
                                      }
                                      placeholder="Number of objects"
                                      className="w-36 px-2 py-0.5 text-xs border border-gray-300 rounded outline-none focus:border-gray-600 bg-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleQuickAoCountOk(armIdx)
                                      }
                                      className="px-2.5 py-0.5 text-xs font-medium border border-gray-300 rounded hover:bg-gray-100 text-gray-700 cursor-pointer"
                                    >
                                      OK
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {!arm.armObjects || arm.armObjects.length === 0 ? (
                              <div className="py-6 text-center text-xs text-gray-400 border border-gray-200 rounded bg-white select-none">
                                No Arm objects added yet
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {arm.armObjects.map((ao, aoIdx) => {
                                  const aoCompoundId = `${arm.idArm || armIdx + 1}_${ao.idAo || aoIdx + 1}`;
                                  const aoErr =
                                    armForm.aoErrors?.[aoCompoundId] ||
                                    armForm.aoErrors?.[ao.idAo] ||
                                    armForm.aoErrors?.[ao.id] ||
                                    armForm.aoErrors?.[String(aoIdx + 1)] ||
                                    {};

                                  return (
                                    <div
                                      key={ao.idAo || aoIdx}
                                      className="p-3.5 rounded border border-gray-200 bg-white space-y-3 shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                        <div className="flex items-center gap-2">
                                          <span className="px-1.5 py-0.5 rounded bg-[#0f3d64] text-white text-[10px] font-bold">
                                            {armIdx + 1}.{aoIdx + 1}
                                          </span>
                                          <span className="text-xs font-semibold text-gray-900">
                                            Arm Object
                                          </span>
                                          <span className="text-[10px] text-gray-500">
                                            {ao.type === "directional"
                                              ? "Directional"
                                              : "Omni"}{" "}
                                            Type
                                          </span>
                                        </div>

                                        {/* Top-right card actions: hanya ditampilkan pada mode Custom */}
                                        {!isStandard && (
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => handleCopyAo(ao)}
                                              title="Copy"
                                              className="p-1 border border-gray-200 hover:border-gray-400 rounded text-gray-600 hover:text-gray-900 cursor-pointer"
                                            >
                                              <Copy className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handlePasteAo(armIdx, aoIdx)
                                              }
                                              disabled={!aoClipboard}
                                              title="Paste"
                                              className="p-1 border border-gray-200 hover:border-gray-400 rounded text-gray-600 hover:text-gray-900 cursor-pointer disabled:opacity-40"
                                            >
                                              <FileText className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleResetAo(armIdx, aoIdx)
                                              }
                                              className="px-2.5 py-0.5 border border-red-200 rounded text-red-600 text-[11px] font-medium hover:bg-red-50 cursor-pointer"
                                              title="Reset Arm Object"
                                            >
                                              Reset
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                requestDelete("Arm Object", () =>
                                                  handleDeleteAo(armIdx, aoIdx),
                                                )
                                              }
                                              className="px-2 py-0.5 border border-red-300 rounded text-red-600 text-[11px] font-medium hover:bg-red-50 cursor-pointer"
                                              title="Delete Arm Object"
                                            >
                                              Delete Object
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      <div
                                        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${
                                          ao.type === "directional"
                                            ? "xl:grid-cols-8"
                                            : "xl:grid-cols-7"
                                        } gap-2.5`}
                                      >
                                        <div>
                                          <label
                                            className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                            title="Object Name"
                                          >
                                            Object Name{" "}
                                            <span className="text-red-500 font-semibold">
                                              *
                                            </span>
                                          </label>
                                          <input
                                            id={`arm-${aoCompoundId}-name`}
                                            type="text"
                                            value={ao.name || ""}
                                            onChange={(e) =>
                                              handleUpdateArmObjectField(
                                                armIdx,
                                                aoIdx,
                                                "name",
                                                e.target.value,
                                              )
                                            }
                                            className={`w-full h-10 px-2.5 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                              aoErr.name
                                                ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                                : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                            }`}
                                          />
                                          {aoErr.name && (
                                            <p className="text-[10px] text-red-500 mt-1 truncate">
                                              *{aoErr.name}
                                            </p>
                                          )}
                                        </div>

                                        <div>
                                          <label
                                            className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                            title="Object Type"
                                          >
                                            Object Type{" "}
                                            <span className="text-red-500 font-semibold">
                                              *
                                            </span>
                                          </label>
                                          <select
                                            id={`arm-${aoCompoundId}-type`}
                                            value={ao.type || "omni"}
                                            onChange={(e) =>
                                              handleUpdateArmObjectField(
                                                armIdx,
                                                aoIdx,
                                                "type",
                                                e.target.value,
                                              )
                                            }
                                            className={`w-full h-10 px-2 rounded-md border text-xs md:text-sm outline-none cursor-pointer transition-colors ${
                                              aoErr.type
                                                ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                                : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                            }`}
                                          >
                                            {OBJECT_TYPE_OPTIONS.map((opt) => (
                                              <option
                                                key={opt.value}
                                                value={opt.value}
                                              >
                                                {opt.label}
                                              </option>
                                            ))}
                                          </select>
                                          {aoErr.type && (
                                            <p className="text-[10px] text-red-500 mt-1 truncate">
                                              *{aoErr.type}
                                            </p>
                                          )}
                                        </div>

                                        <div>
                                          <label
                                            className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                            title="Front Area"
                                          >
                                            Front Area{" "}
                                            <span className="text-red-500 font-semibold">
                                              *
                                            </span>
                                          </label>
                                          <div className="relative">
                                            <input
                                              id={`arm-${aoCompoundId}-frontArea`}
                                              type="number"
                                              step="any"
                                              value={ao.frontArea || ""}
                                              onChange={(e) =>
                                                handleUpdateArmObjectField(
                                                  armIdx,
                                                  aoIdx,
                                                  "frontArea",
                                                  e.target.value,
                                                )
                                              }
                                              className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                                aoErr.frontArea
                                                  ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                                  : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                              }`}
                                            />
                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                              m²
                                            </span>
                                          </div>
                                          {aoErr.frontArea && (
                                            <p className="text-[10px] text-red-500 mt-1 truncate">
                                              *{aoErr.frontArea}
                                            </p>
                                          )}
                                        </div>

                                        {/* Side Area - only if Directional */}
                                        {ao.type === "directional" && (
                                          <div>
                                            <label
                                              className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                              title="Side Area"
                                            >
                                              Side Area{" "}
                                              <span className="text-red-500 font-semibold">
                                                *
                                              </span>
                                            </label>
                                            <div className="relative">
                                              <input
                                                id={`arm-${aoCompoundId}-sideArea`}
                                                type="number"
                                                step="any"
                                                value={ao.sideArea || ""}
                                                onChange={(e) =>
                                                  handleUpdateArmObjectField(
                                                    armIdx,
                                                    aoIdx,
                                                    "sideArea",
                                                    e.target.value,
                                                  )
                                                }
                                                className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                                  aoErr.sideArea
                                                    ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                                    : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                                }`}
                                              />
                                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                                m²
                                              </span>
                                            </div>
                                            {aoErr.sideArea && (
                                              <p className="text-[10px] text-red-500 mt-1 truncate">
                                                *{aoErr.sideArea}
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        <div>
                                          <label
                                            className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                            title="Weight"
                                          >
                                            Weight{" "}
                                            <span className="text-red-500 font-semibold">
                                              *
                                            </span>
                                          </label>
                                          <div className="relative">
                                            <input
                                              id={`arm-${aoCompoundId}-weight`}
                                              type="number"
                                              step="any"
                                              value={ao.weight || ""}
                                              onChange={(e) =>
                                                handleUpdateArmObjectField(
                                                  armIdx,
                                                  aoIdx,
                                                  "weight",
                                                  e.target.value,
                                                )
                                              }
                                              className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                                aoErr.weight
                                                  ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                                  : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                              }`}
                                            />
                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                              kg
                                            </span>
                                          </div>
                                          {aoErr.weight && (
                                            <p className="text-[10px] text-red-500 mt-1 truncate">
                                              *{aoErr.weight}
                                            </p>
                                          )}
                                        </div>

                                        <div>
                                          <label
                                            className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                            title="H-Distance"
                                          >
                                            H-Distance{" "}
                                            <span className="text-red-500 font-semibold">
                                              *
                                            </span>
                                          </label>
                                          <div className="relative">
                                            <input
                                              id={`arm-${aoCompoundId}-hDistance`}
                                              type="number"
                                              value={ao.hDistance || ""}
                                              onChange={(e) =>
                                                handleUpdateArmObjectField(
                                                  armIdx,
                                                  aoIdx,
                                                  "hDistance",
                                                  e.target.value,
                                                )
                                              }
                                              className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                                aoErr.hDistance
                                                  ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                                  : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                              }`}
                                            />
                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                              mm
                                            </span>
                                          </div>
                                          {aoErr.hDistance && (
                                            <p className="text-[10px] text-red-500 mt-1 truncate">
                                              *{aoErr.hDistance}
                                            </p>
                                          )}
                                        </div>

                                        <div>
                                          <label
                                            className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                            title="nnC"
                                          >
                                            nnC{" "}
                                            <span className="text-red-500 font-semibold">
                                              *
                                            </span>
                                          </label>
                                          <input
                                            id={`arm-${aoCompoundId}-nnC`}
                                            type="number"
                                            step="any"
                                            value={ao.nnC || "1"}
                                            onChange={(e) =>
                                              handleUpdateArmObjectField(
                                                armIdx,
                                                aoIdx,
                                                "nnC",
                                                e.target.value,
                                              )
                                            }
                                            className={`w-full h-10 px-2.5 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                              aoErr.nnC
                                                ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                                : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                            }`}
                                          />
                                          {aoErr.nnC && (
                                            <p className="text-[10px] text-red-500 mt-1 truncate">
                                              *{aoErr.nnC}
                                            </p>
                                          )}
                                        </div>

                                        <div>
                                          <label
                                            className="block text-xs font-medium text-gray-700 mb-1.5 truncate"
                                            title="Quantity"
                                          >
                                            Quantity{" "}
                                            <span className="text-red-500 font-semibold">
                                              *
                                            </span>
                                          </label>
                                          <div className="relative">
                                            <input
                                              id={`arm-${aoCompoundId}-quantity`}
                                              type="number"
                                              min="1"
                                              value={ao.quantity || "1"}
                                              onChange={(e) =>
                                                handleUpdateArmObjectField(
                                                  armIdx,
                                                  aoIdx,
                                                  "quantity",
                                                  e.target.value,
                                                )
                                              }
                                              className={`w-full h-10 pl-2.5 pr-8 rounded-md border text-xs md:text-sm outline-none transition-colors ${
                                                aoErr.quantity
                                                  ? "border-red-500 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                                                  : "border-gray-300 bg-white text-gray-900 focus:border-gray-800 focus:ring-1 focus:ring-gray-800"
                                              }`}
                                            />
                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-medium pointer-events-none">
                                              pcs
                                            </span>
                                          </div>
                                          {aoErr.quantity && (
                                            <p className="text-[10px] text-red-500 mt-1 truncate">
                                              *{aoErr.quantity}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Add Arm Object Button */}
                            {!isStandard &&
                              (arm.armObjects || []).length < 5 && (
                                <button
                                  type="button"
                                  onClick={() => handleAddAo(armIdx)}
                                  className="w-full mt-3 py-2 rounded border border-dashed border-gray-300 text-gray-700 font-medium text-xs hover:border-gray-400 hover:bg-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add Object</span>
                                </button>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Arm Button */}
                {!isStandard && armForm.arms.length < 10 && (
                  <button
                    type="button"
                    onClick={handleAddArm}
                    className="w-full py-3 rounded border border-dashed border-blue-800 text-blue-900 font-medium text-xs md:text-sm hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Arm</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ACTION BUTTONS: Calculate Results & Generate Report Side-by-Side (Above Results Table) ── */}
      <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleCalculateClick}
          disabled={calculation.loading}
          className={`px-6 py-2.5 rounded text-xs md:text-sm font-medium transition-all flex items-center gap-2 ${
            calculation.loading
              ? "bg-[#0d3b66] text-white opacity-60 cursor-not-allowed shadow-sm"
              : isReadyToReport
                ? "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-xs cursor-pointer"
                : "bg-[#0d3b66] hover:bg-[#0a2e50] text-white shadow-sm cursor-pointer"
          }`}
        >
          {calculation.loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Calculating...</span>
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4" />
              <span>Calculate Results</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleGenerateReport}
          disabled={!isReadyToReport || report.isGeneratingReport}
          className={`px-6 py-2.5 rounded text-xs md:text-sm font-medium transition-all flex items-center gap-2 shadow-sm ${
            isReadyToReport && !report.isGeneratingReport
              ? "bg-[#0d3b66] text-white hover:bg-[#0a2e50] cursor-pointer shadow-sm"
              : "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed"
          }`}
          title={
            !calculation.isCalculated
              ? "Please calculate results first before generating report."
              : calculation.isInputsChanged
                ? "Inputs changed. Please recalculate first."
                : "Generate Report"
          }
        >
          {report.isGeneratingReport ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Report...</span>
            </>
          ) : (
            <>
              <span>Generate Report</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* ── CALCULATION RESULTS TABLE & SCHEMATIC PREVIEW (Visible upon calculation, below action buttons) ── */}
      {hasCalculationResults && (
        <div
          ref={resultsTableRef}
          id="calculation-results-section"
          className="mt-8 space-y-6 scroll-mt-6"
        >
          <ResultsTableView
            results={calculation.results}
            display={calculation.displayResult}
            calculationKey={calculation.calculationKey}
          />

          {/* ── SCHEMATIC PREVIEW CARD (Below Results Table) ── */}
          <SchematicPreviewCard
            svg={previewSchematicSvg}
            isGenerating={isSchematicGenerating}
            isReady={isSchematicReady}
            isSupported={schematicParams?.isSupported ?? true}
            unsupportedMessage={schematicParams?.unsupportedReason}
          />
        </div>
      )}

      {/* Floating Prompt if manual SVG edit is preserved after new calculation */}
      {isSchematicBlocked && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-white border border-amber-300 rounded-xl shadow-xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">
                Manual Edits Preserved
              </p>
              <p>
                Previous manual SVG edits were kept. Would you like to overwrite them with the new calculation parameters?
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={() => updateSchematicData({ isBlocked: false })}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
            >
              Keep Manual Edits
            </button>
            <button
              type="button"
              onClick={() => {
                if (schematicParams) {
                  sendSchematicParameters(schematicParams.payload, {
                    standardId: schematicParams.standardId,
                    replaceManualEdit: true,
                  });
                }
              }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#0d3b66] hover:bg-[#0a2e50] rounded-md transition-colors shadow-xs cursor-pointer"
            >
              Overwrite & Apply
            </button>
          </div>
        </div>
      )}

      {/* Schematic SVG-Edit Modal (Iframe always mounted & ready in background) */}
      <SchematicEditorModal
        isOpen={isSchematicEditorOpen}
        onClose={() => setIsSchematicEditorOpen(false)}
        iframeRef={schematicIframeRef}
        schematicUrl={DEFAULT_SCHEMATIC_URL}
        onOpenEditor={openSchematicEditor}
        onReset={handleRegenerateSchematic}
        isEdited={Boolean(schematicData?.editedSvg)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={deleteConfirm.open}
        itemName={deleteConfirm.itemName}
        onClose={() =>
          setDeleteConfirm({ open: false, itemName: "", onConfirm: null })
        }
        onConfirm={async () => {
          if (deleteConfirm.onConfirm) {
            await deleteConfirm.onConfirm();
          }
        }}
      />

      {/* Toast Modal for feedback/notifications */}
      <ToastModal
        toast={calculation.toast}
        onClose={() => calculation.setToast(null)}
      />
    </div>
  );
}
