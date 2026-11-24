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

import { useState, useEffect, useMemo, useCallback } from "react";
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
  X,
} from "lucide-react";

// Hooks Form & Kalkulasi
import { usePoleForm } from "../hooks/usePoleForm";
import { useDirectObjectForm } from "../hooks/useDirectObjectForm";
import { useOverheadWireForm } from "../hooks/useOverheadWireForm";
import { useArmForm } from "../hooks/useArmForm";
import { usePoleStandardForm } from "../hooks/usePoleStandardForm";
import { usePoleConfigForm } from "../hooks/usePoleConfigForm";
import { usePoleCalculation } from "../hooks/usePoleCalculation";

// Komponen Ilustrasi, Tabel, & Modal
import { LowestHeightIllustration } from "../components/forms/pole/LowestHeightIllustration";
import { ResultsTableView } from "../components/tables/pole-result/ResultTableView";
import { ToastModal } from "../components/modals/ToastModal";
import { notifyCalculationProgressChanged } from "../utils/calculationProgressEvent";

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
        JSON.parse(sessionStorage.getItem(`${projectType}_condition`) || "{}") ||
        {}
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
        sessionStorage.setItem(`${projectType}_condition`, JSON.stringify(next));
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

  // ─── 4. STEP NAVIGATION CALCULATION ─────────────────────────────────────────
  const { nextLabel, nextRoute } = useMemo(() => {
    if (isStandard) {
      return {
        nextLabel: "Next: Opening",
        nextRoute: "/project-tools/opening",
      };
    }

    if (openingEnabled) {
      return {
        nextLabel: "Next: Opening",
        nextRoute: "/project-tools/opening",
      };
    }
    if (isBaseplate) {
      return {
        nextLabel: "Next: Baseplate",
        nextRoute: "/project-tools/baseplate",
      };
    }
    if (foundationEnabled) {
      return {
        nextLabel: "Next: Foundation",
        nextRoute: "/project-tools/foundation",
      };
    }
    return {
      nextLabel: "Generate Report",
      nextRoute: "/project-tools/report",
    };
  }, [isStandard, openingEnabled, isBaseplate, foundationEnabled]);

  const handleNextStep = () => {
    if (calculation.isCalculated && !calculation.isInputsChanged) {
      navigate(nextRoute);
    }
  };

  const handleSelectDesignStandard = (std) => {
    setSelectedStandardTab(std.id);
    if (std.id === "old_lighting_pole") {
      updateCondition({ designStandard: std.id });
    }
  };

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

  const [poleClipboard, setPoleClipboard] = useState(null);
  const handleCopyPole = (p) => setPoleClipboard({ ...p });
  const handlePastePole = (idx) => {
    if (!poleClipboard) return;
    poleForm.setPoles((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...poleClipboard, id: next[idx].id };
      return next;
    });
  };
  const handleResetPole = (idx) => {
    poleForm.setPoles((prev) => {
      const next = [...prev];
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
      return next;
    });
  };
  const handleDeletePole = (idx) => {
    poleForm.setPoles((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleAddPole = () => {
    if (poleForm.poles.length >= 6) return;
    poleForm.setPoles((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
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
    ]);
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
            diameter: "",
            tension: "",
            angle: "0",
            zHeight: "",
            quantity: "1",
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
        diameter: "",
        tension: "",
        angle: "0",
        zHeight: "",
        quantity: "1",
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
        diameter: "",
        tension: "",
        angle: "0",
        zHeight: "",
        quantity: "1",
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
      aos[aoIdx] = {
        idAo: aos[aoIdx].idAo,
        name: "",
        type: "omni",
        frontArea: "",
        weight: "",
        hDistance: "",
        nnC: "1",
        quantity: "1",
      };
      target.armObjects = aos;
      next[armIdx] = target;
      return next;
    });
  };
  const handleDeleteAo = (armIdx, aoIdx) => {
    armForm.setArms((prev) => {
      const next = [...prev];
      const target = { ...next[armIdx] };
      target.armObjects = (target.armObjects || []).filter((_, i) => i !== aoIdx);
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
      next[armIdx] = { ...next[armIdx], [field]: value };
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
  const showOhw =
    !isStandard || (ohwForm.overheadWires && ohwForm.overheadWires.length > 0);
  const showArms =
    !isStandard || (armForm.arms && armForm.arms.length > 0);

  // ─── 6. JSX RENDER VIEW ─────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <Helmet>
        <title>Structural · Project Tools · KORI BALI</title>
      </Helmet>

      {/* ── TOP HEADER / BREADCRUMB BAR (Stacked Layout) ── */}
      <div className="mb-6 space-y-3 pb-4 border-b border-gray-200">
        <div>
          <Link
            to="/project-tools"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-900 text-white text-xs md:text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to project tools</span>
          </Link>
        </div>

        {/* Step Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs md:text-sm font-medium">
          <span className="px-3 py-1.5 rounded bg-gray-900 text-white font-semibold">
            Structural
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />

          {/* Opening Tab */}
          {openingEnabled && (
            <>
              {calculation.isCalculated && !calculation.isInputsChanged ? (
                <Link
                  to="/project-tools/opening"
                  className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Opening
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed">
                  Opening
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </>
          )}

          {/* Baseplate Tab */}
          {isBaseplate && (
            <>
              {calculation.isCalculated && !calculation.isInputsChanged ? (
                <Link
                  to="/project-tools/baseplate"
                  className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Baseplate
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed">
                  Baseplate
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </>
          )}

          {/* Foundation Tab */}
          {foundationEnabled && (
            <>
              {calculation.isCalculated && !calculation.isInputsChanged ? (
                <Link
                  to="/project-tools/foundation"
                  className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Foundation
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed">
                  Foundation
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </>
          )}

          {/* Report Tab */}
          {calculation.isCalculated && !calculation.isInputsChanged ? (
            <Link
              to="/project-tools/report"
              className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Report
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed">
              Report
            </span>
          )}
        </div>
      </div>

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
            <div className="p-5 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-6">
              {/* Left: Design Standard */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1">
                  Design Standard
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Select a standard to view its required parameters.
                </p>
                <div className="space-y-2">
                  {DESIGN_STANDARDS.map((std) => {
                    const isSelected = selectedStandardTab === std.id;
                    return (
                      <button
                        key={std.id}
                        type="button"
                        onClick={() => handleSelectDesignStandard(std)}
                        className={`w-full text-left px-3.5 py-2.5 rounded border text-xs md:text-sm flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 text-blue-900 font-medium"
                            : "border-gray-200 hover:border-gray-400 text-gray-700 bg-white"
                        }`}
                      >
                        <span>{std.label}</span>
                        {isSelected ? (
                          <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
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
                  <p className="text-xs text-gray-500 mb-3">
                    Pre-filled with default values. Adjust them to match your
                    project requirements.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Wind Speed */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Wind Speed
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
                          m/s
                        </span>
                      </div>
                    </div>

                    {/* Air Density */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Air Density
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
                          className="w-full pl-3 pr-16 py-2 rounded border border-gray-300 text-xs md:text-sm outline-none focus:border-gray-700 bg-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
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
                      <p className="text-xs text-gray-600 leading-relaxed">
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
              {/* ── Sub-section 1: Lowest Height Position ── */}
              <div className="border border-gray-200 rounded p-4 bg-white">
                <h3 className="text-xs md:text-sm font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-3.5 bg-blue-600 rounded-full inline-block" />
                  Lowest Height Position
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Left: Inputs */}
                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs font-semibold text-gray-700 mb-2">
                        Select Installation Type
                      </span>
                      {!isStandard ? (
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: "baseplate", label: "Baseplate" },
                            { id: "embedment", label: "Embedment" },
                          ].map((item) => {
                            const isSel =
                              (condition.installationPole || "baseplate") ===
                              item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  updateCondition({
                                    installationPole: item.id,
                                    baseplateEnabled: item.id === "baseplate",
                                  });
                                }}
                                className={`px-4 py-2 rounded border text-xs md:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                                  isSel
                                    ? "border-blue-500 bg-blue-50/60 text-blue-900 font-medium"
                                    : "border-gray-200 hover:border-gray-400 text-gray-800 bg-white"
                                }`}
                              >
                                <span>{item.label}</span>
                                {isSel ? (
                                  <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-3.5 py-2 rounded border border-gray-200 bg-gray-50 text-xs md:text-sm font-medium text-gray-800">
                          {isBaseplate ? "Baseplate" : "Embedment"}
                        </div>
                      )}
                    </div>

                    {isBaseplate ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Lowest Height
                        </label>
                        <div className="relative max-w-sm">
                          <input
                            type="number"
                            value={
                              poleConfigForm.poleConfig?.lowestHeight ?? "0"
                            }
                            onChange={(e) =>
                              poleConfigForm.updatePoleConfig({
                                lowestHeight: e.target.value,
                              })
                            }
                            className="w-full pl-3 pr-12 py-2 rounded border border-gray-300 text-xs md:text-sm outline-none focus:border-gray-700 bg-white"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
                            mm
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Embedment Length
                        </label>
                        <div className="relative max-w-sm">
                          <input
                            type="number"
                            value={
                              poleConfigForm.poleConfig?.lowestHeight ?? "1800"
                            }
                            onChange={(e) =>
                              poleConfigForm.updatePoleConfig({
                                lowestHeight: e.target.value,
                              })
                            }
                            className="w-full pl-3 pr-12 py-2 rounded border border-gray-300 text-xs md:text-sm outline-none focus:border-gray-700 bg-white"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
                            mm
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Interactive Illustration Graphic */}
                  <div className="w-full">
                    <LowestHeightIllustration
                      installationType={isBaseplate ? "baseplate" : "embedment"}
                      lowestHeight={poleConfigForm.poleConfig?.lowestHeight}
                      embedmentLength={poleConfigForm.poleConfig?.lowestHeight}
                    />
                  </div>
                </div>

                {/* Overdesign Factor */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
                  <span className="text-xs font-semibold text-gray-900">
                    Overdesign Factor
                  </span>
                  <div className="w-36">
                    <input
                      type="number"
                      step="any"
                      value={poleConfigForm.poleConfig?.overDesign ?? "1"}
                      onChange={(e) =>
                        poleConfigForm.updatePoleConfig({
                          overDesign: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded border border-gray-300 text-xs md:text-sm outline-none focus:border-gray-700 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* ── Sub-section 2: Step Poles ── */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-xs md:text-sm font-semibold text-blue-900 flex items-center gap-1.5">
                      <span className="w-1 h-3.5 bg-blue-600 rounded-full inline-block" />
                      Step Poles
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure up to 6 Step Poles with their respective
                      specifications.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700">
                      {poleForm.poles.length} / 6 Poles
                    </span>

                    {!isStandard && (
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
                    )}
                  </div>
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

                        {/* Top-right card actions */}
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
                          >
                            Reset
                          </button>
                          {!isStandard && poleForm.poles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeletePole(idx)}
                              className="px-2.5 py-1 border border-red-300 rounded text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                              title="Delete Step Pole"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Fields Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        {/* Pole Name */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Pole Name
                          </label>
                          <input
                            type="text"
                            value={pole.name || ""}
                            onChange={(e) =>
                              poleForm.updatePole(pole.id || String(idx + 1), {
                                name: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                          />
                        </div>

                        {/* Material */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Material
                          </label>
                          <select
                            value={pole.material || "STK400"}
                            onChange={(e) =>
                              poleForm.updatePole(pole.id || String(idx + 1), {
                                material: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
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
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Pole Type
                          </label>
                          <select
                            value={pole.poleType || "Straight"}
                            onChange={(e) =>
                              poleForm.updatePole(pole.id || String(idx + 1), {
                                poleType: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                          >
                            <option value="Straight">Straight</option>
                            <option value="Taper">Taper</option>
                          </select>
                        </div>

                        {/* Lower Diameter */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Lower Diameter
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={pole.lowerDiameter || ""}
                              onChange={(e) =>
                                poleForm.updatePole(pole.id || String(idx + 1), {
                                  lowerDiameter: e.target.value,
                                })
                              }
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>

                        {/* Upper Diameter */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Upper Diameter
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={pole.upperDiameter || ""}
                              onChange={(e) =>
                                poleForm.updatePole(pole.id || String(idx + 1), {
                                  upperDiameter: e.target.value,
                                })
                              }
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>

                        {/* Lower Thickness */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Lower Thickness
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              value={pole.lowerThickness || ""}
                              onChange={(e) =>
                                poleForm.updatePole(pole.id || String(idx + 1), {
                                  lowerThickness: e.target.value,
                                })
                              }
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>

                        {/* Upper Thickness */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Upper Thickness
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              value={pole.upperThickness || ""}
                              onChange={(e) =>
                                poleForm.updatePole(pole.id || String(idx + 1), {
                                  upperThickness: e.target.value,
                                })
                              }
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>

                        {/* Height */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Height
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={pole.zHeight || ""}
                              onChange={(e) =>
                                poleForm.updatePole(pole.id || String(idx + 1), {
                                  zHeight: e.target.value,
                                })
                              }
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Quantity
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              value={pole.quantity || "1"}
                              onChange={(e) =>
                                poleForm.updatePole(pole.id || String(idx + 1), {
                                  quantity: e.target.value,
                                })
                              }
                              className="w-full pl-2 pr-8 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              pcs
                            </span>
                          </div>
                        </div>
                      </div>
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
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure up to 10 Direct Objects with their respective
                      specifications.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700">
                      {doForm.directObjects.length} / 10 Objects
                    </span>

                    {!isStandard && (
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
                    )}
                  </div>
                </div>

                {doForm.directObjects.length === 0 ? (
                  <div className="py-8 text-center text-xs md:text-sm text-gray-400 border border-gray-200 rounded bg-gray-50/50 select-none">
                    No Direct Objects added yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {doForm.directObjects.map((obj, idx) => (
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
                            >
                              Reset
                            </button>
                            {!isStandard && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDo(idx)}
                                className="px-2.5 py-1 border border-red-300 rounded text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                          {/* Object Name */}
                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Object Name
                            </label>
                            <input
                              type="text"
                              value={obj.name || ""}
                              onChange={(e) =>
                                doForm.updateDo(obj.idDo || String(idx + 1), {
                                  name: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                          </div>

                          {/* Object Type */}
                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Object Type
                            </label>
                            <select
                              value={obj.type || "omni"}
                              onChange={(e) =>
                                doForm.updateDo(obj.idDo || String(idx + 1), {
                                  type: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            >
                              {OBJECT_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Front Area */}
                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Front Area
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                value={obj.frontArea || ""}
                                onChange={(e) =>
                                  doForm.updateDo(obj.idDo || String(idx + 1), {
                                    frontArea: e.target.value,
                                  })
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                m²
                              </span>
                            </div>
                          </div>

                          {/* Side Area */}
                          {obj.type === "directional" && (
                            <div>
                              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                Side Area
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="any"
                                  value={obj.sideArea || ""}
                                  onChange={(e) =>
                                    doForm.updateDo(obj.idDo || String(idx + 1), {
                                      sideArea: e.target.value,
                                    })
                                  }
                                  className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                  m²
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Weight */}
                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Weight
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                value={obj.weight || ""}
                                onChange={(e) =>
                                  doForm.updateDo(obj.idDo || String(idx + 1), {
                                    weight: e.target.value,
                                  })
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                kg
                              </span>
                            </div>
                          </div>

                          {/* Height */}
                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Height
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={obj.zHeight || ""}
                                onChange={(e) =>
                                  doForm.updateDo(obj.idDo || String(idx + 1), {
                                    zHeight: e.target.value,
                                  })
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                mm
                              </span>
                            </div>
                          </div>

                          {/* nnC */}
                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              nnC
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={obj.nnC || "1"}
                              onChange={(e) =>
                                doForm.updateDo(obj.idDo || String(idx + 1), {
                                  nnC: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                          </div>

                          {/* Quantity */}
                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Quantity
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                value={obj.quantity || "1"}
                                onChange={(e) =>
                                  doForm.updateDo(obj.idDo || String(idx + 1), {
                                    quantity: e.target.value,
                                  })
                                }
                                className="w-full pl-2 pr-8 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                pcs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
                    <span className="px-3 py-1 rounded bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700">
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
                    {ohwForm.overheadWires.map((wire, idx) => (
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
                            {!isStandard && (
                              <button
                                type="button"
                                onClick={() => handleDeleteOhw(idx)}
                                className="px-2.5 py-1 border border-red-300 rounded text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Wire Name
                            </label>
                            <input
                              type="text"
                              value={wire.name || ""}
                              onChange={(e) =>
                                ohwForm.updateOhw(wire.idOhw || String(idx + 1), {
                                  name: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Wire Diameter
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                value={wire.diameter || ""}
                                onChange={(e) =>
                                  ohwForm.updateOhw(wire.idOhw || String(idx + 1), {
                                    diameter: e.target.value,
                                  })
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                mm
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Wire Tension
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                value={wire.tension || ""}
                                onChange={(e) =>
                                  ohwForm.updateOhw(wire.idOhw || String(idx + 1), {
                                    tension: e.target.value,
                                  })
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                N
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Angle
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={wire.angle || "0"}
                                onChange={(e) =>
                                  ohwForm.updateOhw(wire.idOhw || String(idx + 1), {
                                    angle: e.target.value,
                                  })
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                deg
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Height
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={wire.zHeight || ""}
                                onChange={(e) =>
                                  ohwForm.updateOhw(wire.idOhw || String(idx + 1), {
                                    zHeight: e.target.value,
                                  })
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                mm
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Quantity
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                value={wire.quantity || "1"}
                                onChange={(e) =>
                                  ohwForm.updateOhw(wire.idOhw || String(idx + 1), {
                                    quantity: e.target.value,
                                  })
                                }
                                className="w-full pl-2 pr-8 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                pcs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Overhead Wire Button */}
                {!isStandard && ohwForm.overheadWires.length < 4 && (
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
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure up to 10 Arms with their respective specifications.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700">
                      {armForm.arms.length} / 10 Arms
                    </span>

                    {!isStandard && (
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
                    )}
                  </div>
                </div>

                {armForm.arms.length === 0 ? (
                  <div className="py-8 text-center text-xs md:text-sm text-gray-400 border border-gray-200 rounded bg-gray-50/50 select-none">
                    No Arms added yet
                  </div>
                ) : (
                  <div className="space-y-6">
                    {armForm.arms.map((arm, armIdx) => (
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
                            >
                              Reset
                            </button>
                            {!isStandard && (
                              <button
                                type="button"
                                onClick={() => handleDeleteArm(armIdx)}
                                className="px-2.5 py-1 border border-red-300 rounded text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                              >
                                Delete Arm
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Arm Input Fields */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Arm Name
                            </label>
                            <input
                              type="text"
                              value={arm.name || ""}
                              onChange={(e) =>
                                handleUpdateArmField(armIdx, "name", e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Material
                            </label>
                            <select
                              value={arm.material || "STK400"}
                              onChange={(e) =>
                                handleUpdateArmField(armIdx, "material", e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            >
                              {MATERIAL_OPTIONS.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Diameter
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                value={arm.diameter || ""}
                                onChange={(e) =>
                                  handleUpdateArmField(armIdx, "diameter", e.target.value)
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                mm
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Thickness
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                value={arm.thickness || ""}
                                onChange={(e) =>
                                  handleUpdateArmField(armIdx, "thickness", e.target.value)
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                mm
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Length
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={arm.length || ""}
                                onChange={(e) =>
                                  handleUpdateArmField(armIdx, "length", e.target.value)
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                mm
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Exp.Length
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={arm.expLength || ""}
                                onChange={(e) =>
                                  handleUpdateArmField(armIdx, "expLength", e.target.value)
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                mm
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Height
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={arm.height ?? arm.zHeight ?? ""}
                                onChange={(e) =>
                                  handleUpdateArmField(armIdx, "height", e.target.value)
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                mm
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              H-Distance
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={arm.hDistance || ""}
                                onChange={(e) =>
                                  handleUpdateArmField(armIdx, "hDistance", e.target.value)
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                mm
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Fix Angle
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={arm.fixAngle || "0"}
                                onChange={(e) =>
                                  handleUpdateArmField(armIdx, "fixAngle", e.target.value)
                                }
                                className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                deg
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              nnC
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={arm.nnC || "0.7"}
                              onChange={(e) =>
                                handleUpdateArmField(armIdx, "nnC", e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                              Quantity
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                value={arm.quantity || "1"}
                                onChange={(e) =>
                                  handleUpdateArmField(armIdx, "quantity", e.target.value)
                                }
                                className="w-full pl-2 pr-8 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                pcs
                              </span>
                            </div>
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
                              <p className="text-[11px] text-gray-500">
                                Configure up to 5 Arm Objects with their respective specifications.
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded bg-white border border-gray-200 text-[11px] font-semibold text-gray-700">
                                {(arm.armObjects || []).length} / 5 Objects
                              </span>

                              {!isStandard && (
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
                                    onClick={() => handleQuickAoCountOk(armIdx)}
                                    className="px-2.5 py-0.5 text-xs font-medium border border-gray-300 rounded hover:bg-gray-100 text-gray-700 cursor-pointer"
                                  >
                                    OK
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {(!arm.armObjects || arm.armObjects.length === 0) ? (
                            <div className="py-6 text-center text-xs text-gray-400 border border-gray-200 rounded bg-white select-none">
                              No Arm objects added yet
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {arm.armObjects.map((ao, aoIdx) => (
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
                                        {ao.type === "directional" ? "Directional" : "Omni"} Type
                                      </span>
                                    </div>

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
                                        onClick={() => handlePasteAo(armIdx, aoIdx)}
                                        disabled={!aoClipboard}
                                        title="Paste"
                                        className="p-1 border border-gray-200 hover:border-gray-400 rounded text-gray-600 hover:text-gray-900 cursor-pointer disabled:opacity-40"
                                      >
                                        <FileText className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleResetAo(armIdx, aoIdx)}
                                        className="px-2.5 py-0.5 border border-red-200 rounded text-red-600 text-[11px] font-medium hover:bg-red-50 cursor-pointer"
                                      >
                                        Reset
                                      </button>
                                      {!isStandard && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteAo(armIdx, aoIdx)}
                                          className="px-2 py-0.5 border border-red-300 rounded text-red-600 text-[11px] font-medium hover:bg-red-50 cursor-pointer"
                                        >
                                          Delete Object
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                    <div>
                                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                        Object Name
                                      </label>
                                      <input
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
                                        className="w-full px-2 py-1 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                        Object Type
                                      </label>
                                      <select
                                        value={ao.type || "omni"}
                                        onChange={(e) =>
                                          handleUpdateArmObjectField(
                                            armIdx,
                                            aoIdx,
                                            "type",
                                            e.target.value,
                                          )
                                        }
                                        className="w-full px-2 py-1 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                                      >
                                        {OBJECT_TYPE_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                        Front Area
                                      </label>
                                      <div className="relative">
                                        <input
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
                                          className="w-full pl-2 pr-7 py-1 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                          m²
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                        Weight
                                      </label>
                                      <div className="relative">
                                        <input
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
                                          className="w-full pl-2 pr-7 py-1 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                          kg
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                        H-Distance
                                      </label>
                                      <div className="relative">
                                        <input
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
                                          className="w-full pl-2 pr-7 py-1 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                          mm
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                        nnC
                                      </label>
                                      <input
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
                                        className="w-full px-2 py-1 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                        Quantity
                                      </label>
                                      <div className="relative">
                                        <input
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
                                          className="w-full pl-2 pr-8 py-1 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                          pcs
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Arm Object Button */}
                          {!isStandard && (arm.armObjects || []).length < 5 && (
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
                    ))}
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

      {/* ── CALCULATION RESULTS & NEXT STEP CARDS ── */}
      {calculation.isCalculated && (
        <div className="mt-8 space-y-6">
          {/* ── NEXT STEP CARD (Matches Image 5 & 6) ── */}
          <div className="border border-gray-300 rounded bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-xs md:text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-blue-600 rounded-full inline-block" />
                  Next Step
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Add optional steps, or continue without them.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Calculation complete</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Option 1: Opening */}
              <button
                type="button"
                onClick={() =>
                  updateCondition({ openingEnabled: !openingEnabled })
                }
                className={`p-3.5 rounded border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  openingEnabled
                    ? "border-blue-500 bg-blue-50/50 text-blue-900"
                    : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                }`}
              >
                <div className="pt-0.5">
                  {openingEnabled ? (
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold">Opening</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Add the Opening step to this calculation.
                  </div>
                </div>
              </button>

              {/* Option 2: Foundation */}
              <button
                type="button"
                onClick={() =>
                  updateCondition({ foundationEnabled: !foundationEnabled })
                }
                className={`p-3.5 rounded border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  foundationEnabled
                    ? "border-blue-500 bg-blue-50/50 text-blue-900"
                    : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                }`}
              >
                <div className="pt-0.5">
                  {foundationEnabled ? (
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold">Foundation</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Add the Foundation step to this calculation.
                  </div>
                </div>
              </button>
            </div>

            {/* Bottom Row of Next Step Card: Flow Status on Left, Buttons on Right (Side-by-side) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-600 flex-wrap">
                <span className="font-medium text-gray-700">Flow</span>
                <span className="px-2 py-0.5 rounded bg-gray-900 text-white font-medium text-[11px]">
                  Structural
                </span>
                {openingEnabled && (
                  <>
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    <span className="px-2 py-0.5 rounded bg-gray-900 text-white font-medium text-[11px]">
                      Opening
                    </span>
                  </>
                )}
                {isBaseplate && (
                  <>
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    <span className="px-2 py-0.5 rounded bg-gray-900 text-white font-medium text-[11px]">
                      Baseplate
                    </span>
                  </>
                )}
                {foundationEnabled && (
                  <>
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    <span className="px-2 py-0.5 rounded bg-gray-900 text-white font-medium text-[11px]">
                      Foundation
                    </span>
                  </>
                )}
                <ChevronRight className="w-3 h-3 text-gray-400" />
                <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 font-medium text-[11px]">
                  Report
                </span>
              </div>

              {/* Side-by-side action buttons */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={calculation.calculate}
                  disabled={calculation.loading}
                  className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-medium transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {calculation.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Calculating...</span>
                    </>
                  ) : (
                    <span>Calculate Results</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={
                    !calculation.isCalculated ||
                    calculation.loading ||
                    calculation.isInputsChanged
                  }
                  className={`px-5 py-2 rounded text-xs md:text-sm font-medium transition-all flex items-center gap-2 ${
                    calculation.isCalculated &&
                    !calculation.loading &&
                    !calculation.isInputsChanged
                      ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm"
                      : "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed"
                  }`}
                >
                  <span>{nextLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results Table View */}
          <ResultsTableView
            results={calculation.results}
            display={calculation.displayResult}
            calculationKey={calculation.calculationKey}
          />
        </div>
      )}

      {/* ── BOTTOM ACTIONS (When NOT yet calculated): Calculate & Next Side-by-Side ── */}
      {!calculation.isCalculated && (
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={calculation.calculate}
            disabled={calculation.loading}
            className="px-6 py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-medium transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {calculation.loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Calculating...</span>
              </>
            ) : (
              <span>Calculate Results</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleNextStep}
            disabled={true}
            className="px-6 py-2.5 rounded text-xs md:text-sm font-medium transition-all flex items-center gap-2 bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed"
            title="Please calculate results first before proceeding to the next step."
          >
            <span>{nextLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toast Modal for feedback/notifications */}
      <ToastModal
        open={Boolean(calculation.toast)}
        type={calculation.toast?.type || "info"}
        message={calculation.toast?.message || ""}
        onClose={() => calculation.setToast(null)}
      />
    </div>
  );
}
