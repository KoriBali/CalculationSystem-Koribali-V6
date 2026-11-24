// src/features/calculations/pages/StructuralPage.jsx
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
} from "lucide-react";

import { usePoleForm } from "../hooks/usePoleForm";
import { useDirectObjectForm } from "../hooks/useDirectObjectForm";
import { useOverheadWireForm } from "../hooks/useOverheadWireForm";
import { useArmForm } from "../hooks/useArmForm";
import { usePoleStandardForm } from "../hooks/usePoleStandardForm";
import { usePoleConfigForm } from "../hooks/usePoleConfigForm";
import { usePoleCalculation } from "../hooks/usePoleCalculation";

import { LowestHeightIllustration } from "../components/forms/pole/LowestHeightIllustration";
import { ResultsTableView } from "../components/tables/pole-result/ResultTableView";
import { ToastModal } from "../components/modals/ToastModal";
import { notifyCalculationProgressChanged } from "../utils/calculationProgressEvent";

// Design Standards available for Old/New JIL
const DESIGN_STANDARDS = [
  { id: "old_lighting_pole", label: "Old JIL" },
  { id: "new_jil", label: "New JIL" },
  { id: "act", label: "Act" },
  { id: "v60", label: "V60" },
  { id: "tower", label: "Tower" },
  { id: "road_sign", label: "Road Sign Standard" },
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
  const projectType = type || sessionStorage.getItem("projectType") || "lighting-project";

  // Ensure default projectType and calculation mode
  useEffect(() => {
    sessionStorage.setItem("projectType", projectType);
    sessionStorage.setItem("projectMode", "calculation");
  }, [projectType]);

  // Read condition state from sessionStorage
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

  const updateCondition = useCallback(
    (updates) => {
      try {
        const raw = sessionStorage.getItem(`${projectType}_condition`);
        const prev = raw ? JSON.parse(raw) : {};
        const next = { ...prev, ...updates };
        sessionStorage.setItem(`${projectType}_condition`, JSON.stringify(next));
        setConditionState(next);

        // Keep calculation_config in sync with component toggles
        const rawConfig = sessionStorage.getItem(`${projectType}_calculation_config`);
        const prevConfig = rawConfig ? JSON.parse(rawConfig) : {};
        const nextConfig = {
          ...prevConfig,
          pole: true,
          opening: next.openingEnabled !== undefined ? Boolean(next.openingEnabled) : true,
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

  // Accordion open/collapse states
  const [openSections, setOpenSections] = useState({
    condition: true,
    spec: true,
    pole: true,
    directObject: true,
    ohw: true,
  });

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Form Hooks
  const poleForm = usePoleForm(projectType);
  const doForm = useDirectObjectForm(projectType);
  const ohwForm = useOverheadWireForm(projectType);
  const armForm = useArmForm(projectType);
  const poleStandardForm = usePoleStandardForm(projectType);
  const poleConfigForm = usePoleConfigForm(projectType);

  // Calculation Hook
  const calculation = usePoleCalculation({
    poleForm,
    directObjectForm: doForm,
    ohwForm,
    armForm,
    poleStandardForm,
    poleConfigForm,
    expandPole: (open) => setOpenSections((p) => ({ ...p, pole: open })),
    expandDo: (open) => setOpenSections((p) => ({ ...p, directObject: open })),
    expandOhw: (open) => setOpenSections((p) => ({ ...p, ohw: open })),
    expandArm: () => {},
  });

  const isStandard = condition.poleType === "standard";
  const installationType =
    condition.installationPole ||
    poleStandardForm.taperPoleStandard?.installationPole ||
    "baseplate";
  const isBaseplate = installationType === "baseplate";

  // Component toggles for Custom mode
  const openingEnabled =
    condition.openingEnabled !== undefined ? Boolean(condition.openingEnabled) : true;
  const baseplateEnabled = isBaseplate
    ? condition.baseplateEnabled !== undefined
      ? Boolean(condition.baseplateEnabled)
      : true
    : false;
  const foundationEnabled = Boolean(condition.foundationEnabled);

  // Determine next step path and label
  const { nextLabel, nextRoute } = useMemo(() => {
    if (isStandard) {
      return {
        nextLabel: "Next: Opening",
        nextRoute: "/project-tools/opening",
      };
    }

    // Custom Mode dynamic navigation
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
    navigate(nextRoute);
  };

  return (
    <div className="min-h-full flex flex-col bg-white">
      <Helmet>
        <title>Structural · Project Tools · KORI BALI</title>
      </Helmet>

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-5">
        {/* ── TOP HEADER / BREADCRUMB BAR ── */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Link
              to="/project-tools"
              className="inline-flex items-center gap-1.5 text-xs md:text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to project tools</span>
            </Link>
          </div>

          {/* Breadcrumb Steps */}
          <div className="flex items-center gap-2 text-xs md:text-sm font-medium flex-wrap">
            <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Structural
            </span>

            {/* Opening step */}
            {(isStandard || openingEnabled) && (
              <>
                <span className="text-gray-400">&gt;</span>
                <Link
                  to="/project-tools/opening"
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Opening
                </Link>
              </>
            )}

            {/* Baseplate step */}
            {(isStandard ? isBaseplate : baseplateEnabled) && (
              <>
                <span className="text-gray-400">&gt;</span>
                <Link
                  to="/project-tools/baseplate"
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Baseplate
                </Link>
              </>
            )}

            {/* Foundation step */}
            {foundationEnabled && (
              <>
                <span className="text-gray-400">&gt;</span>
                <Link
                  to="/project-tools/foundation"
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Foundation
                </Link>
              </>
            )}

            {/* Report step */}
            <span className="text-gray-400">&gt;</span>
            <Link
              to="/project-tools/report"
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              Report
            </Link>
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
                          onClick={() =>
                            updateCondition({ designStandard: std.id })
                          }
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
                </div>

                {/* Right: Parameters */}
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1">
                    Old JIL parameters
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Pre-filled with default values. Adjust them to match your project requirements.
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

          {/* ── SECTION 2: Pole Specifications ── */}
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
              <div className="p-5 space-y-5">
                <div>
                  <h3 className="text-xs md:text-sm font-semibold text-gray-900 mb-3">
                    Lowest Height Position
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* Left Form */}
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
                              value={poleConfigForm.poleConfig?.lowestHeight ?? "0"}
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
                            Embedment Length (l)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={
                                poleStandardForm.taperPoleStandard?.embedmentLength ||
                                poleConfigForm.poleConfig?.lowestHeight ||
                                "1800"
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                poleStandardForm.updateTaperPoleStandard({
                                  embedmentLength: val,
                                });
                                poleConfigForm.updatePoleConfig({
                                  lowestHeight: val,
                                });
                              }}
                              className="w-full pl-3 pr-12 py-2 rounded border border-gray-300 text-xs md:text-sm outline-none focus:border-gray-700 bg-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Graphic Illustration */}
                    <LowestHeightIllustration
                      installationType={installationType}
                      lowestHeight={poleConfigForm.poleConfig?.lowestHeight ?? "0"}
                      embedmentLength={
                        poleStandardForm.taperPoleStandard?.embedmentLength ||
                        poleConfigForm.poleConfig?.lowestHeight ||
                        "1800"
                      }
                    />
                  </div>
                </div>

                {/* Overdesign Factor */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="max-w-xs">
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
              </div>
            )}
          </div>

          {/* ── SECTION 3: Pole Details ── */}
          <div className="border border-gray-300 rounded bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("pole")}
              className="w-full px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between text-left cursor-pointer hover:bg-gray-100/60 transition-colors"
            >
              <h2 className="text-xs md:text-sm font-semibold text-gray-900">
                Pole Details
              </h2>
              {openSections.pole ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {openSections.pole && (
              <div className="p-5 space-y-6">
                {(poleForm.poles || []).map((pole, idx) => (
                  <div key={idx} className="space-y-3">
                    <h3 className="text-xs md:text-sm font-semibold text-gray-900">
                      {idx + 1} Step Pole: {pole.name || `支柱−${idx + 1}`} ({pole.poleType || "Taper"} Type)
                    </h3>

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
                            poleForm.updatePole(idx, "material", e.target.value)
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
                        <input
                          type="text"
                          readOnly
                          value={pole.poleType || "Taper"}
                          className="w-full px-2.5 py-1.5 rounded border border-gray-200 bg-gray-50 text-xs text-gray-700"
                        />
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
                            className="w-full pl-2.5 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
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
                            className="w-full pl-2.5 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
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
                            className="w-full pl-2.5 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
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
                            className="w-full pl-2.5 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
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
                              poleForm.updatePole(idx, "zHeight", e.target.value)
                            }
                            className="w-full pl-2.5 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
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
            )}
          </div>

          {/* ── SECTION 4: Direct Object Specifications ── */}
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
              <div className="p-5 space-y-5">
                <h3 className="text-xs md:text-sm font-semibold text-gray-900">
                  Direct Object Details
                </h3>

                {(doForm.directObjects || []).map((obj, idx) => (
                  <div key={idx} className="space-y-3 pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                    <h4 className="text-xs font-semibold text-gray-800">
                      {idx + 1} Direct Object: {obj.name || "灯具"} ({(obj.type || "Omni").toUpperCase()} Type)
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
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
                            className="w-full pl-2.5 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
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
                            className="w-full pl-2.5 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
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
                            className="w-full pl-2.5 pr-7 py-1.5 rounded border border-gray-300 text-xs outline-none focus:border-gray-700 bg-white"
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── SECTION 5: Overhead Wire (OHW) Specifications ── */}
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
                      Configure up to 4 Overhead Wires with their respective specifications.
                    </p>
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    {(ohwForm.overheadWires || []).length} / 4 Overhead Wires
                  </span>
                </div>

                {/* List wires if added */}
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

                {/* Add wire button */}
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
        </div>

        {/* ── BOTTOM ACTIONS: Calculate Results Button ── */}
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

          {/* In standard mode, show Next button before results if already calculated */}
          {isStandard && (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded border border-gray-300 hover:border-gray-500 text-gray-800 text-xs md:text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{nextLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── CALCULATION RESULTS DISPLAY (Image 1) ── */}
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
                    Select which components you would like to include in this custom calculation:
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
                        openingEnabled ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
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
                        Cable access handhole opening
                      </p>
                    </div>
                  </button>

                  {/* Baseplate Toggle Card (if installation is baseplate) */}
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
                          baseplateEnabled ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <Box className="w-4 h-4" />
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
                          Baseplate and anchor rib analysis
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
                        foundationEnabled ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <Layers className="w-4 h-4" />
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
                        Concrete foundation & caisson check
                      </p>
                    </div>
                  </button>
                </div>

                {/* Proceed button in Custom Mode */}
                <div className="flex justify-end pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 rounded bg-gray-900 hover:bg-gray-800 text-white text-xs md:text-sm font-medium transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span>{nextLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      <ToastModal
        toast={calculation.toast}
        onClose={() => calculation.showToast(null)}
      />
    </div>
  );
}
