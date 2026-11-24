// src/features/calculations/pages/StructuralPage.jsx
/**
 * ============================================================================
 * STRUCTURAL CALCULATION PAGE (StructuralPage)
 * ============================================================================
 * Halaman utama kalkulasi teknis struktural tiang penerangan jalan (Lighting Project).
 * Berisi konfigurasi parameter desain, spesifikasi tiang, beban aksesoris,
 * kabel udara (OHW), dan lengan tiang (Arm & Arm Object Details).
 *
 * FITUR & ATURAN UTAMA:
 * 1. Tata Letak Header:
 *    - Baris 1: Tombol hitam "Back to project tools" (<ChevronLeft />).
 *    - Baris 2: Tab navigasi alur: Structural > Opening > Baseplate > Foundation > Report.
 *    - Breadcrumb sistem pada Header bar: "Project Tools > Structural".
 * 2. Standard and Condition:
 *    - Hanya standar "Old JIL" yang aktif dan dapat digunakan.
 *    - Memilih standar lain akan memunculkan peringatan (alert) dalam bahasa Inggris:
 *      "* This design standard is currently under development. Only 'Old JIL' is supported."
 * 3. Pole Specifications (Tergabung):
 *    - "Lowest Height Position" dan "Pole Details" berada dalam satu section yang sama.
 *    - Gambar ilustrasi tiang pada Lowest Height Position dihapus dan diganti kotak kosong netral wireframe.
 * 4. Arm and Object Details:
 *    - Menampilkan detail teknis spesifikasi lengan (Arm 1, Arm 2, dst) beserta sub-objek
 *      lampu/aksesoris (Arm Object) sesuai standar desain (misal Type-T / TA / TS).
 * 5. Validasi Tombol Next:
 *    - Tombol "Next: Opening" (atau langkah berikutnya) DINONAKTIFKAN (disabled)
 *      sampai user berhasil menjalankan kalkulasi struktural ("Calculate Results").
 * ============================================================================
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Loader2,
  ArrowRight,
  DoorOpen,
  Layers,
  Box,
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

// Komponen Tabel & Modal
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
  // Baca parameter kondisi desain dari sessionStorage
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

  // State pesan peringatan jika memilih standard selain Old JIL
  const [standardAlert, setStandardAlert] = useState("");

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

  // Engine eksekusi kalkulasi struktural tiang
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

  // Toggle komponen tambahan untuk Custom Mode
  const openingEnabled =
    condition.openingEnabled !== undefined
      ? Boolean(condition.openingEnabled)
      : true;
  const baseplateEnabled = isBaseplate
    ? condition.baseplateEnabled !== undefined
      ? Boolean(condition.baseplateEnabled)
      : true
    : false;
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
    if (baseplateEnabled) {
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
  }, [isStandard, openingEnabled, baseplateEnabled, foundationEnabled]);

  const handleNextStep = () => {
    if (calculation.isCalculated && !calculation.isInputsChanged) {
      navigate(nextRoute);
    }
  };

  // Handler klik standar desain: hanya Old JIL yang diizinkan
  const handleSelectDesignStandard = (std) => {
    if (std.id !== "old_lighting_pole") {
      setStandardAlert(
        `* The "${std.label}" standard is currently under development. Only "Old JIL" is supported.`,
      );
      return;
    }
    setStandardAlert("");
    updateCondition({ designStandard: std.id });
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

  // ─── 5. JSX RENDER VIEW ─────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <Helmet>
        <title>Structural · Project Tools · KORI BALI</title>
      </Helmet>

      {/* ── TOP HEADER / BREADCRUMB BAR (Stacked Layout) ── */}
      <div className="mb-6 space-y-3 pb-4 border-b border-gray-200">
        {/* Row 1: Back to project tools */}
        <div>
          <Link
            to="/project-tools"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-900 text-white text-xs md:text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to project tools</span>
          </Link>
        </div>

        {/* Row 2: Navigation Steps Tabs */}
        <div className="flex items-center gap-2 text-xs md:text-sm font-medium flex-wrap">
          {/* Structural (Active Tab) */}
          <span className="px-3 py-1.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-xs">
            Structural
          </span>

          {/* Opening Step */}
          {(isStandard || openingEnabled) && (
            <>
              <span className="text-gray-400">&gt;</span>
              {calculation.isCalculated && !calculation.isInputsChanged ? (
                <Link
                  to="/project-tools/opening"
                  className="px-3 py-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  Opening
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-gray-400 cursor-not-allowed select-none">
                  Opening
                </span>
              )}
            </>
          )}

          {/* Baseplate Step */}
          {(isStandard ? isBaseplate : baseplateEnabled) && (
            <>
              <span className="text-gray-400">&gt;</span>
              {calculation.isCalculated && !calculation.isInputsChanged ? (
                <Link
                  to="/project-tools/baseplate"
                  className="px-3 py-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  Baseplate
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-gray-400 cursor-not-allowed select-none">
                  Baseplate
                </span>
              )}
            </>
          )}

          {/* Foundation Step */}
          {foundationEnabled && (
            <>
              <span className="text-gray-400">&gt;</span>
              {calculation.isCalculated && !calculation.isInputsChanged ? (
                <Link
                  to="/project-tools/foundation"
                  className="px-3 py-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  Foundation
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-gray-400 cursor-not-allowed select-none">
                  Foundation
                </span>
              )}
            </>
          )}

          {/* Report Step */}
          <span className="text-gray-400">&gt;</span>
          {calculation.isCalculated && !calculation.isInputsChanged ? (
            <Link
              to="/project-tools/report"
              className="px-3 py-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Report
            </Link>
          ) : (
            <span className="px-3 py-1.5 text-gray-400 cursor-not-allowed select-none">
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
                    const isSelected =
                      (condition.designStandard || "old_lighting_pole") ===
                      std.id;
                    return (
                      <button
                        key={std.id}
                        type="button"
                        onClick={() => handleSelectDesignStandard(std)}
                        className={`w-full text-left px-3.5 py-2 rounded border text-xs md:text-sm flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 text-blue-900 font-medium"
                            : "border-gray-200 hover:border-gray-400 text-gray-700 bg-white"
                        }`}
                      >
                        <span>{std.label}</span>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Warning Alert in English if unavailable standard is clicked */}
                {standardAlert && (
                  <div className="mt-3 p-2.5 rounded border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{standardAlert}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStandardAlert("")}
                      className="text-amber-700 hover:text-amber-900 p-0.5 ml-2 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Parameters */}
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
                        className="w-full pl-3 pr-20 py-2 rounded border border-gray-300 text-xs md:text-sm outline-none focus:border-gray-700 bg-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
                        N·sec2/m4
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
              <div>
                <h3 className="text-xs md:text-sm font-semibold text-gray-900 mb-3">
                  Lowest Height Position
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Left: Inputs */}
                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">
                        Installation Type
                      </span>
                      <div className="px-3.5 py-2 rounded border border-gray-200 bg-gray-50 text-xs md:text-sm font-medium text-gray-800">
                        {isBaseplate ? "Baseplate" : "Embedment"}
                      </div>
                    </div>

                    {isBaseplate ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Lowest Height
                        </label>
                        <div className="relative">
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
                        <div className="relative">
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

                  {/* Right: Empty wireframe box (Illustration removed per requirement) */}
                  <div className="border border-dashed border-gray-300 rounded bg-gray-50/50 min-h-[140px] flex items-center justify-center text-xs text-gray-400 select-none">
                    {/* Empty Box */}
                  </div>
                </div>

                {/* Overdesign Factor */}
                <div className="mt-4 max-w-xs">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Overdesign Factor
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={poleConfigForm.poleConfig?.overDesign ?? "1"}
                    onChange={(e) =>
                      poleConfigForm.updatePoleConfig({
                        overDesign: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded border border-gray-300 text-xs md:text-sm outline-none focus:border-gray-700 bg-white"
                  />
                </div>
              </div>

              {/* Divider between Lowest Height and Pole Details */}
              <div className="border-t border-gray-200" />

              {/* ── Sub-section 2: Pole Details ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-900">
                    Pole Details
                  </h3>
                  {!isStandard && (
                    <button
                      type="button"
                      onClick={poleForm.addPole}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Step Pole</span>
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {(poleForm.poles || []).map((pole, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded border border-gray-200 bg-gray-50/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900">
                          {idx + 1} Step Pole: {pole.name || `支柱−${idx + 1}`}{" "}
                          ({pole.poleType || "Taper"} Type)
                        </span>
                        {!isStandard && poleForm.poles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => poleForm.removePole(idx)}
                            className="text-red-500 hover:text-red-700 p-1 rounded"
                            title="Remove step pole"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
                        {/* Pole Name */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Pole Name
                          </label>
                          <input
                            type="text"
                            value={pole.name || ""}
                            onChange={(e) =>
                              poleForm.updatePole(idx, "name", e.target.value)
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
                              poleForm.updatePole(
                                idx,
                                "material",
                                e.target.value,
                              )
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
                            value={pole.poleType || "Taper"}
                            onChange={(e) =>
                              poleForm.updatePole(
                                idx,
                                "poleType",
                                e.target.value,
                              )
                            }
                            className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                          >
                            <option value="Taper">Taper</option>
                            <option value="Straight">Straight</option>
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
                                poleForm.updatePole(
                                  idx,
                                  "lowerDiameter",
                                  e.target.value,
                                )
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
                                poleForm.updatePole(
                                  idx,
                                  "upperDiameter",
                                  e.target.value,
                                )
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
                              value={pole.lowerThickness || ""}
                              onChange={(e) =>
                                poleForm.updatePole(
                                  idx,
                                  "lowerThickness",
                                  e.target.value,
                                )
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
                              value={pole.upperThickness || ""}
                              onChange={(e) =>
                                poleForm.updatePole(
                                  idx,
                                  "upperThickness",
                                  e.target.value,
                                )
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
                                poleForm.updatePole(
                                  idx,
                                  "zHeight",
                                  e.target.value,
                                )
                              }
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 3: Direct Object Specifications ── */}
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
              <div className="flex items-center justify-between">
                <h3 className="text-xs md:text-sm font-semibold text-gray-900">
                  Direct Object Details
                </h3>
                {!isStandard && (
                  <button
                    type="button"
                    onClick={doForm.addDirectObject}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Direct Object</span>
                  </button>
                )}
              </div>

              {(doForm.directObjects || []).map((obj, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded border border-gray-200 bg-gray-50/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800">
                      {idx + 1} Direct Object: {obj.name || "灯具"} (
                      {(obj.type || "Omni").toUpperCase()} Type)
                    </span>
                    {!isStandard && doForm.directObjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => doForm.removeDirectObject(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove direct object"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    {/* Object Name */}
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Object Name
                      </label>
                      <input
                        type="text"
                        value={obj.name || ""}
                        onChange={(e) =>
                          doForm.updateDirectObject(idx, "name", e.target.value)
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
                          doForm.updateDirectObject(idx, "type", e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                      >
                        {OBJECT_TYPE_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
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
                            doForm.updateDirectObject(
                              idx,
                              "frontArea",
                              e.target.value,
                            )
                          }
                          className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                          m²
                        </span>
                      </div>
                    </div>

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
                            doForm.updateDirectObject(
                              idx,
                              "weight",
                              e.target.value,
                            )
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
                            doForm.updateDirectObject(
                              idx,
                              "zHeight",
                              e.target.value,
                            )
                          }
                          className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                          mm
                        </span>
                      </div>
                    </div>

                    {/* nrC */}
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        nrC
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={obj.nnC || "1"}
                        onChange={(e) =>
                          doForm.updateDirectObject(idx, "nnC", e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={obj.quantity || "1"}
                        onChange={(e) =>
                          doForm.updateDirectObject(
                            idx,
                            "quantity",
                            e.target.value,
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                      />
                    </div>

                    {/* Fix Angle */}
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Fix Angle
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={obj.fixAngle || "0"}
                          onChange={(e) =>
                            doForm.updateDirectObject(
                              idx,
                              "fixAngle",
                              e.target.value,
                            )
                          }
                          className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                          deg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SECTION 4: Overhead Wire (OHW) Specifications ── */}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs md:text-sm font-semibold text-gray-900">
                    Overhead Wires
                  </h3>
                  <p className="text-xs text-gray-500">
                    Configure up to 4 Overhead Wires with their respective
                    specifications.
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  {(ohwForm.overheadWires || []).length} / 4 Overhead Wires
                </span>
              </div>

              {/* Daftar Kabel Udara jika ada */}
              {(ohwForm.overheadWires || []).map((wire, wIdx) => (
                <div
                  key={wIdx}
                  className="p-3 rounded border border-gray-200 bg-gray-50 flex items-center justify-between gap-4"
                >
                  <span className="text-xs font-semibold text-gray-800">
                    Wire {wIdx + 1}: {wire.name || `OHW-${wIdx + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => ohwForm.removeOverheadWire(wIdx)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Tombol tambah kabel */}
              {(ohwForm.overheadWires || []).length < 4 && (
                <button
                  type="button"
                  onClick={() =>
                    ohwForm.addOverheadWire({
                      name: `Wire ${(ohwForm.overheadWires || []).length + 1}`,
                      diameter: "10",
                      spanLength: "30",
                      zHeight: "7500",
                      tension: "2000",
                    })
                  }
                  className="w-full py-2.5 rounded border border-dashed border-gray-300 text-xs md:text-sm font-medium text-gray-700 hover:border-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Overhead Wire</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 5: Arm Specifications (Arm and Object Details) ── */}
        <div className="border border-gray-300 rounded bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("arm")}
            className="w-full px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between text-left cursor-pointer hover:bg-gray-100/60 transition-colors"
          >
            <h2 className="text-xs md:text-sm font-semibold text-gray-900">
              Arm Specifications
            </h2>
            {openSections.arm ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {openSections.arm && (
            <div className="p-5 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs md:text-sm font-semibold text-gray-900">
                  Arm and Object Details
                </h3>
                {!isStandard && (
                  <button
                    type="button"
                    onClick={() => {
                      const newIdx = (armForm.arms || []).length + 1;
                      armForm.setArms((prev) => [
                        ...prev,
                        {
                          idArm: String(newIdx),
                          name: `照明アーム${newIdx}`,
                          material: "STK400",
                          diameter: "60.5",
                          thickness: "3.2",
                          length: "180",
                          expLength: "180",
                          zHeight: "8000",
                          hDistance: "90",
                          fixAngle: newIdx === 2 ? "180" : "0",
                          nnC: "0.7",
                          quantity: "1",
                          armObjects: [
                            {
                              idAo: `${newIdx}.1`,
                              name: "灯具",
                              type: "omni",
                              frontArea: "0.1",
                              weight: "14",
                              hDistance: "180",
                              nnC: "1",
                              quantity: "1",
                            },
                          ],
                        },
                      ]);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Arm</span>
                  </button>
                )}
              </div>

              {(!armForm.arms || armForm.arms.length === 0) ? (
                <div className="p-4 rounded border border-gray-200 bg-gray-50 text-xs text-gray-500 italic text-center">
                  No arms configured for this pole standard.
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
                          <span className="w-5 h-5 rounded bg-blue-900 text-white text-[11px] font-bold flex items-center justify-center">
                            {armIdx + 1}
                          </span>
                          <span className="text-xs font-semibold text-gray-900">
                            Arm: {arm.name || `照明アーム${armIdx + 1}`}
                          </span>
                        </div>
                        {!isStandard && (
                          <button
                            type="button"
                            onClick={() =>
                              armForm.setArms((prev) =>
                                prev.filter((_, idx) => idx !== armIdx),
                              )
                            }
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remove arm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Arm Input Fields (Row 1 & Row 2 matching screenshot) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        {/* Arm Name */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Arm Name
                          </label>
                          <input
                            type="text"
                            value={arm.name || ""}
                            onChange={(e) =>
                              handleUpdateArmField(
                                armIdx,
                                "name",
                                e.target.value,
                              )
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
                            value={arm.material || "STK400"}
                            onChange={(e) =>
                              handleUpdateArmField(
                                armIdx,
                                "material",
                                e.target.value,
                              )
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

                        {/* Diameter */}
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
                                handleUpdateArmField(
                                  armIdx,
                                  "diameter",
                                  e.target.value,
                                )
                              }
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>

                        {/* Thickness */}
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
                                handleUpdateArmField(
                                  armIdx,
                                  "thickness",
                                  e.target.value,
                                )
                              }
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>

                        {/* Length */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Length
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={arm.length || ""}
                              onChange={(e) =>
                                handleUpdateArmField(
                                  armIdx,
                                  "length",
                                  e.target.value,
                                )
                              }
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>

                        {/* Exp.Length */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Exp.Length
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={arm.expLength || arm.length || ""}
                              onChange={(e) =>
                                handleUpdateArmField(
                                  armIdx,
                                  "expLength",
                                  e.target.value,
                                )
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
                              value={arm.zHeight || ""}
                              onChange={(e) =>
                                handleUpdateArmField(
                                  armIdx,
                                  "zHeight",
                                  e.target.value,
                                )
                              }
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: H-Distance, Fix Angle, nnC, Quantity */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
                        {/* H-Distance */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            H-Distance
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={arm.hDistance || ""}
                              onChange={(e) =>
                                handleUpdateArmField(
                                  armIdx,
                                  "hDistance",
                                  e.target.value,
                                )
                              }
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>

                        {/* Fix Angle */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Fix Angle
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={arm.fixAngle || "0"}
                              onChange={(e) =>
                                handleUpdateArmField(
                                  armIdx,
                                  "fixAngle",
                                  e.target.value,
                                )
                              }
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              deg
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
                            value={arm.nnC || "0.7"}
                            onChange={(e) =>
                              handleUpdateArmField(
                                armIdx,
                                "nnC",
                                e.target.value,
                              )
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
                              value={arm.quantity || "1"}
                              onChange={(e) =>
                                handleUpdateArmField(
                                  armIdx,
                                  "quantity",
                                  e.target.value,
                                )
                              }
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                              pcs
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Sub-card: Arm Objects (Matching 1.1 Arm Object: 灯具) ── */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="space-y-3">
                          {(arm.armObjects || []).map((ao, aoIdx) => (
                            <div
                              key={ao.idAo || aoIdx}
                              className="p-3.5 rounded border border-gray-200 bg-gray-50/60 space-y-3"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-blue-900 text-white text-[10px] font-bold flex items-center justify-center">
                                  {armIdx + 1}.{aoIdx + 1}
                                </span>
                                <span className="text-xs font-semibold text-gray-800">
                                  Arm Object: {ao.name || "灯具"} (
                                  {(ao.type || "omni").toUpperCase()} Type)
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                {/* Object Name */}
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
                                    className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                                  />
                                </div>

                                {/* Object Type */}
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
                                    className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                                  >
                                    {OBJECT_TYPE_OPTIONS.map((t) => (
                                      <option key={t.value} value={t.value}>
                                        {t.label}
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
                                      value={ao.frontArea || ""}
                                      onChange={(e) =>
                                        handleUpdateArmObjectField(
                                          armIdx,
                                          aoIdx,
                                          "frontArea",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                      m²
                                    </span>
                                  </div>
                                </div>

                                {/* Weight */}
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
                                      className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">
                                      kg
                                    </span>
                                  </div>
                                </div>

                                {/* H-Distance */}
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
                                    value={ao.nnC || "1"}
                                    onChange={(e) =>
                                      handleUpdateArmObjectField(
                                        armIdx,
                                        aoIdx,
                                        "nnC",
                                        e.target.value,
                                      )
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
                                      value={ao.quantity || "1"}
                                      onChange={(e) =>
                                        handleUpdateArmObjectField(
                                          armIdx,
                                          aoIdx,
                                          "quantity",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full pl-2 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CALCULATION RESULTS DISPLAY ── */}
      {(calculation.showResults ||
        (calculation.results && calculation.results.length > 0)) && (
        <div id="results-pole" className="mt-8 space-y-6">
          <ResultsTableView
            results={calculation.results}
            display={calculation.displayResult}
            calculationKey={calculation.calculationKey}
          />

          {/* ── ADDITIONAL COMPONENTS SELECTION CARD (FOR CUSTOM MODE) ── */}
          {!isStandard && (
            <div className="border border-gray-300 rounded bg-white p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="text-xs md:text-sm font-semibold text-gray-900">
                  Additional Components
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select which components you would like to include in this
                  custom calculation:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                {/* Opening Toggle Card */}
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
                  <div
                    className={`p-2 rounded ${
                      openingEnabled
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <DoorOpen className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">Opening</span>
                      {openingEnabled ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Configure pole maintenance handhole & cover
                    </p>
                  </div>
                </button>

                {/* Baseplate Toggle Card (if baseplate installation) */}
                {isBaseplate && (
                  <button
                    type="button"
                    onClick={() =>
                      updateCondition({ baseplateEnabled: !baseplateEnabled })
                    }
                    className={`p-3.5 rounded border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      baseplateEnabled
                        ? "border-blue-500 bg-blue-50/50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                    }`}
                  >
                    <div
                      className={`p-2 rounded ${
                        baseplateEnabled
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Baseplate</span>
                        {baseplateEnabled ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Design anchor bolts, rib plates, and base plate
                      </p>
                    </div>
                  </button>
                )}

                {/* Foundation Toggle Card */}
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
                  <div
                    className={`p-2 rounded ${
                      foundationEnabled
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Box className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">Foundation</span>
                      {foundationEnabled ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Verify soil bearing capacity and concrete footing
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BOTTOM ACTIONS: Calculate Results & Next Step Buttons ── */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
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

        {/* Next Button — DISABLED until calculation is successfully executed */}
        <button
          type="button"
          onClick={handleNextStep}
          disabled={
            !calculation.isCalculated ||
            calculation.loading ||
            calculation.isInputsChanged
          }
          className={`px-6 py-2.5 rounded text-xs md:text-sm font-medium transition-all flex items-center gap-2 ${
            calculation.isCalculated &&
            !calculation.loading &&
            !calculation.isInputsChanged
              ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm"
              : "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed"
          }`}
          title={
            !calculation.isCalculated || calculation.isInputsChanged
              ? "Please calculate results first before proceeding to the next step."
              : `Proceed to ${nextLabel}`
          }
        >
          <span>{nextLabel}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Toast Modal for feedback/notifications */}
      <ToastModal
        open={Boolean(calculation.toast)}
        type={calculation.toast?.type || "info"}
        message={calculation.toast?.message || ""}
        onClose={() =>
          calculation.setToast(null)
        }
      />
    </div>
  );
}
