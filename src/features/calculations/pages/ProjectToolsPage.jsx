// src/features/calculations/pages/ProjectToolsPage.jsx
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { CheckCircle2, Circle, RotateCcw, ArrowRight } from "lucide-react";
import STANDARD_POLE_DATA from "../data/specStandardPole.json";
import {
  DIAGRAM_IMAGE_MAP,
  EMBED_IMAGE_MAP,
  DIAGRAM_LABEL_LAYOUT,
  getDiagramLabels,
  DEFAULT_HEIGHT_GAP_PX,
} from "../components/forms/pole/standard/taperDiagramConstants";

// Available Road Lighting Pole standard types
const STANDARD_POLE_TYPES = [
  { id: "IS", label: "Type-I (IS)" },
  { id: "IA", label: "Type-I (IA)" },
  { id: "LS", label: "Type-L (LS)" },
  { id: "LA", label: "Type-L (LA)" },
  { id: "TS", label: "Type-T (TS)" },
  { id: "TA", label: "Type-T (TA)" },
];

export default function ProjectToolsPage() {
  const navigate = useNavigate();

  // Selection states (empty by default for Custom mode)
  const [selectedStandard, setSelectedStandard] = useState("");
  const [installationType, setInstallationType] = useState("baseplate"); // 'baseplate' | 'embedment'
  const [lowestHeightPosition, setLowestHeightPosition] = useState("onGL"); // 'onGL' | 'underGL'
  const [embedmentLength, setEmbedmentLength] = useState("1800");
  const [selectedHeight, setSelectedHeight] = useState("");

  // Ensure default backend project parameters on mount
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

  // Compute available heights based on selected standard and ground position
  const availableHeights = useMemo(() => {
    if (!selectedStandard) return [];
    const taper = STANDARD_POLE_DATA.tapered || STANDARD_POLE_DATA.taper || {};
    const group = taper[selectedStandard] || {};
    const groundKey =
      installationType === "embedment" ? "onGL" : lowestHeightPosition;
    const entries = group[groundKey] || {};

    const rawKeys = Object.keys(entries);
    // Sort heights numerically
    const sorted = [...rawKeys].sort((a, b) => Number(a) - Number(b));

    // Prefer clean heights
    return sorted.map((key) => {
      const numM = Number(key);
      const isUnderGL =
        installationType === "baseplate" && lowestHeightPosition === "underGL";
      const displayLabel = isUnderGL
        ? `${numM} m`
        : `${Math.round(numM)} m`;
      return {
        key,
        numM,
        displayLabel,
      };
    });
  }, [selectedStandard, installationType, lowestHeightPosition]);

  // If selected height is not in available heights when standard changes, auto-select first or clear
  useEffect(() => {
    if (availableHeights.length > 0) {
      const match = availableHeights.find((h) => h.key === selectedHeight);
      if (!match) {
        setSelectedHeight(availableHeights[0].key);
      }
    } else {
      setSelectedHeight("");
    }
  }, [availableHeights, selectedHeight]);

  // Diagram image resolution
  const currentImage = useMemo(() => {
    if (!selectedStandard) return null;
    if (installationType === "embedment") {
      return EMBED_IMAGE_MAP[selectedStandard] || null;
    }
    const groundKey =
      lowestHeightPosition === "underGL" ? "underGL" : "onGL";
    return DIAGRAM_IMAGE_MAP[selectedStandard]?.[groundKey] || null;
  }, [selectedStandard, installationType, lowestHeightPosition]);

  const effectiveGroundPosition =
    installationType === "embedment" ? "embedment" : lowestHeightPosition;

  // Diagram labels with dimensions
  const diagramLabels = useMemo(() => {
    if (!selectedStandard || !selectedHeight) return null;
    return getDiagramLabels(
      selectedStandard,
      effectiveGroundPosition,
      selectedHeight,
      null,
    );
  }, [selectedStandard, effectiveGroundPosition, selectedHeight]);

  const diagramLayout = useMemo(() => {
    if (!selectedStandard) return null;
    return (
      DIAGRAM_LABEL_LAYOUT[
        `${selectedStandard}.${effectiveGroundPosition}`
      ] || null
    );
  }, [selectedStandard, effectiveGroundPosition]);

  // Reset all selections back to empty
  const handleReset = () => {
    setSelectedStandard("");
    setInstallationType("baseplate");
    setLowestHeightPosition("onGL");
    setEmbedmentLength("1800");
    setSelectedHeight("");
  };

  // Next Button state logic:
  // - If standard is empty -> Next is ENABLED (Custom mode)
  // - If standard is selected -> Next is DISABLED until all required fields are filled
  const isFormComplete = useMemo(() => {
    if (!selectedStandard) {
      // Empty standard = Custom mode is permitted immediately
      return true;
    }
    // Standard mode requires installation, height, and embedment if applicable
    if (!selectedHeight) return false;
    if (installationType === "embedment" && (!embedmentLength || Number(embedmentLength) <= 0)) {
      return false;
    }
    return true;
  }, [selectedStandard, selectedHeight, installationType, embedmentLength]);

  // Handle Proceed to Structural step
  const handleNext = () => {
    const isStandard = Boolean(selectedStandard);

    if (isStandard) {
      // STANDARD MODE
      const taper = STANDARD_POLE_DATA.tapered || STANDARD_POLE_DATA.taper || {};
      const groundKey =
        installationType === "embedment" ? "onGL" : lowestHeightPosition;
      const entry = taper[selectedStandard]?.[groundKey]?.[selectedHeight] || {};

      const rawPoles = entry.poles || [];
      const resolvedPoles = rawPoles.map((p, idx) => ({
        name: p.name || `支柱−${idx + 1}`,
        material: p.material || "STK400",
        poleType: p.poleType || "Taper",
        lowerDiameter: String(p.lowerDiameter || "165"),
        upperDiameter: String(p.upperDiameter || "85"),
        lowerThickness: String(p.lowerThickness || "4"),
        upperThickness: String(p.upperThickness || "4"),
        zHeight: String(p.zHeight || (Number(selectedHeight) * 1000)),
        quantity: String(p.quantity || "1"),
      }));

      const rawDirectObjects = entry.directObjects || [];
      const resolvedDo = rawDirectObjects.map((d) => ({
        name: d.name || "灯具",
        type: d.type || "directional",
        frontArea: String(d.frontArea ?? "0.1"),
        sideArea: String(d.sideArea ?? "0.1"),
        weight: String(d.weight ?? "14"),
        zHeight: String(d.zHeight ?? (Number(selectedHeight) * 1000)),
        nnC: String(d.nnC ?? "1"),
        quantity: String(d.quantity ?? "1"),
        fixAngle: String(d.fixAngle ?? "0"),
      }));

      const rawArms = entry.arms || [];
      const lowestHeightVal =
        installationType === "embedment"
          ? String(embedmentLength || "1800")
          : lowestHeightPosition === "underGL"
            ? "300"
            : "0";

      // Persist Standard session state
      sessionStorage.setItem("projectType", "lighting-project");
      sessionStorage.setItem("projectMode", "calculation");
      sessionStorage.setItem(
        "lighting-project_condition",
        JSON.stringify({
          designStandard: "old_lighting_pole",
          designWindSpeed: "60",
          designAirDensity: "1.23",
          poleType: "standard",
          installationPole: installationType,
          openingEnabled: true,
          baseplateEnabled: installationType === "baseplate",
        }),
      );
      sessionStorage.setItem(
        "lighting-project_taperPoleStandard",
        JSON.stringify({
          poleType: selectedStandard,
          installationPole: installationType,
          groundPosition:
            installationType === "embedment" ? "underGL" : lowestHeightPosition,
          height: selectedHeight,
          embedmentLength:
            installationType === "embedment" ? embedmentLength : "",
        }),
      );
      sessionStorage.setItem(
        "lighting-project_poles",
        JSON.stringify(resolvedPoles),
      );
      sessionStorage.setItem(
        "lighting-project_directObjects",
        JSON.stringify(
          resolvedDo.length > 0
            ? resolvedDo
            : [
                {
                  name: "灯具",
                  type: "directional",
                  frontArea: "0.1",
                  sideArea: "0.1",
                  weight: "14",
                  zHeight: String(Number(selectedHeight) * 1000 || "8000"),
                  nnC: "1",
                  quantity: "1",
                  fixAngle: "0",
                },
              ],
        ),
      );
      sessionStorage.setItem(
        "lighting-project_arms",
        JSON.stringify(rawArms),
      );
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
        "lighting-project_poleTypeStandard",
        JSON.stringify({ type: "taper" }),
      );
    } else {
      // CUSTOM MODE
      sessionStorage.setItem("projectType", "lighting-project");
      sessionStorage.setItem("projectMode", "calculation");
      sessionStorage.setItem(
        "lighting-project_condition",
        JSON.stringify({
          designStandard: "old_lighting_pole",
          designWindSpeed: "60",
          designAirDensity: "1.23",
          poleType: "custom",
          installationPole: installationType,
          openingEnabled: true,
          baseplateEnabled: installationType === "baseplate",
        }),
      );
      sessionStorage.setItem(
        "lighting-project_poles",
        JSON.stringify([
          {
            name: "支柱",
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
        JSON.stringify([
          {
            name: "灯具",
            type: "omni",
            frontArea: "0.1",
            sideArea: "0.1",
            weight: "14",
            zHeight: "8000",
            nnC: "1",
            quantity: "1",
            fixAngle: "0",
          },
        ]),
      );
      sessionStorage.setItem(
        "lighting-project_overheadWires",
        JSON.stringify([]),
      );
      sessionStorage.setItem("lighting-project_arms", JSON.stringify([]));
      sessionStorage.setItem(
        "lighting-project_poleConfig",
        JSON.stringify({
          lowestHeight: installationType === "embedment" ? embedmentLength : "0",
          overDesign: "1",
        }),
      );
    }

    navigate("/project-tools/structural");
  };

  return (
    <div className="min-h-full flex flex-col bg-white">
      <Helmet>
        <title>Pole Type Configuration · KORI BALI</title>
      </Helmet>

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
            Pole type configuration
          </h1>
          <p className="text-gray-500 mt-1 text-xs md:text-sm">
            Choose a road lighting pole standard to apply its predefined specifications.
          </p>
        </div>

        {/* Informational Banner */}
        <div className="mb-6 px-4 py-2.5 rounded border border-amber-300 bg-amber-50/70 text-amber-900 text-xs md:text-sm flex items-center justify-between">
          <p>
            If not using a Road Lighting Pole standard, click{" "}
            <span className="font-bold text-amber-950">NEXT</span> to enter specifications manually.
          </p>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[400px_1fr] gap-6">
          {/* ── LEFT PANEL: Pole Standard Selection ── */}
          <div className="border border-gray-300 rounded p-4 md:p-5 flex flex-col gap-5 bg-white">
            {/* Section 1: Standard Type */}
            <div>
              <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2.5">
                Select Pole Standard Type
              </label>
              <div className="flex flex-col gap-2">
                {STANDARD_POLE_TYPES.map((type) => {
                  const isSelected = selectedStandard === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() =>
                        setSelectedStandard(isSelected ? "" : type.id)
                      }
                      className={`w-full text-left px-3.5 py-2.5 rounded border text-xs md:text-sm transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/60 text-blue-900 font-medium"
                          : "border-gray-200 hover:border-gray-400 text-gray-800 bg-white"
                      }`}
                    >
                      <span>{type.label}</span>
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

            {/* Section 2: Installation Type */}
            <div className="pt-2 border-t border-gray-200">
              <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2.5">
                Select Installation Type
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { id: "baseplate", label: "Baseplate" },
                  { id: "embedment", label: "Embedment" },
                ].map((item) => {
                  const isSelected = installationType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setInstallationType(item.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded border text-xs md:text-sm transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/60 text-blue-900 font-medium"
                          : "border-gray-200 hover:border-gray-400 text-gray-800 bg-white"
                      }`}
                    >
                      <span>{item.label}</span>
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

            {/* Section 3: Baseplate -> Lowest Height Position */}
            {installationType === "baseplate" && (
              <div className="pt-2 border-t border-gray-200">
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2.5">
                  Select Lowest Height Position
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    { id: "onGL", label: "On GL" },
                    { id: "underGL", label: "Under GL" },
                  ].map((pos) => {
                    const isSelected = lowestHeightPosition === pos.id;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setLowestHeightPosition(pos.id)}
                        className={`w-full text-left px-3.5 py-2.5 rounded border text-xs md:text-sm transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/60 text-blue-900 font-medium"
                            : "border-gray-200 hover:border-gray-400 text-gray-800 bg-white"
                        }`}
                      >
                        <span>{pos.label}</span>
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
            )}

            {/* Section 3: Embedment -> Embedment Length */}
            {installationType === "embedment" && (
              <div className="pt-2 border-t border-gray-200">
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2.5">
                  Embedment Length
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={embedmentLength}
                    onChange={(e) => setEmbedmentLength(e.target.value)}
                    placeholder="1800"
                    className="w-full pl-3 pr-12 py-2 rounded border border-gray-300 text-xs md:text-sm outline-none focus:border-gray-700 bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs md:text-sm pointer-events-none">
                    mm
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL: Height Selector & Diagram Preview ── */}
          <div className="border border-gray-300 rounded p-4 md:p-5 flex flex-col bg-white">
            {/* Height selection row */}
            <div className="mb-4">
              <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2">
                Select Pole Height
              </label>

              {!selectedStandard ? (
                <div className="w-full bg-gray-50 border border-gray-200 rounded px-4 py-3 text-xs md:text-sm text-gray-400 italic">
                  Select a pole standard type first.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableHeights.map((h) => {
                    const isSelected = selectedHeight === h.key;
                    return (
                      <button
                        key={h.key}
                        type="button"
                        onClick={() => setSelectedHeight(h.key)}
                        className={`px-4 py-2 rounded border text-xs md:text-sm font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                            : "border-gray-300 text-gray-700 hover:border-gray-400 bg-white"
                        }`}
                      >
                        {h.displayLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Diagram Preview Area */}
            <div className="border border-dashed border-gray-300 rounded p-4 flex-1 flex items-center justify-center min-h-[480px] lg:min-h-[580px] bg-white relative overflow-hidden">
              {!selectedStandard || !currentImage ? (
                <div className="text-center text-gray-400 text-sm md:text-base font-medium select-none">
                  Select a standard to preview the pole.
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Aspect-ratio pinned wrapper matching diagramLayout viewBox */}
                  <div
                    className="relative flex items-center justify-center max-w-full max-h-full"
                    style={
                      diagramLayout
                        ? {
                            width: `min(100%, calc(520px * ${diagramLayout.viewBox.width} / ${diagramLayout.viewBox.height}))`,
                            aspectRatio: `${diagramLayout.viewBox.width} / ${diagramLayout.viewBox.height}`,
                            height: "520px",
                          }
                        : { height: "520px" }
                    }
                  >
                    {/* Background SVG diagram */}
                    <img
                      src={currentImage}
                      alt={`${selectedStandard} diagram`}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />

                    {/* Render Dimension Text Overlays */}
                    {diagramLabels?.map((label) => (
                      <div
                        key={`${label.key}:${label.lines.join("|")}`}
                        style={label.style}
                        className={`absolute pointer-events-none whitespace-nowrap text-[11px] md:text-xs leading-none text-blue-700 font-medium ${
                          label.isCentered ? "text-center" : ""
                        }`}
                      >
                        {label.isLeader ? (
                          <>
                            <div>{label.lines[0]}</div>
                            <div className="h-px bg-transparent my-0.5" />
                            <div>{label.lines[1]}</div>
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
            className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs md:text-sm font-medium cursor-pointer transition-colors"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!isFormComplete}
            className={`px-6 py-2.5 rounded text-xs md:text-sm font-medium transition-all flex items-center gap-2 ${
              isFormComplete
                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm"
                : "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300"
            }`}
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
