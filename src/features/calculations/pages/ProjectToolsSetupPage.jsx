import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  Circle,
  Calculator,
  DraftingCompass,
  Info,
  Layers,
  Sliders,
} from "lucide-react";
import { projectTypeLabel } from "../constants/projectTypes";
import { ConfirmResetAllModal } from "../components/modals/ConfirmResetAllModal";

// Reusable section title
const SectionTitle = ({ children }) => (
  <h3 className="text-gray-900 mb-2 flex items-center gap-2 text-xs md:text-sm font-semibold">
    {children}
  </h3>
);

// Reusable section card wrapper
const SectionCard = ({ children }) => (
  <div className="bg-white px-4 md:px-5 py-5 rounded border border-gray-300">
    {children}
  </div>
);

// CardOption matching wireframe structure
const CardOption = ({ label, desc, icon: Icon, current, value, onChange }) => {
  const isActive = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`group w-full flex items-center justify-between px-3 xl:px-4 py-2.5 lg:py-3 relative rounded border transition-all duration-200 cursor-pointer ${
        isActive
          ? "border-2 border-gray-900 bg-gray-50"
          : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-1.5 rounded border ${
            isActive
              ? "bg-gray-200 border-gray-400 text-gray-900"
              : "bg-gray-100 border-gray-200 text-gray-600"
          }`}
        >
          <Icon size={16} />
        </div>
        <div className="flex flex-col items-start text-left">
          <p
            className={`text-[12px] md:text-sm font-semibold ${
              isActive ? "text-gray-900" : "text-gray-800"
            }`}
          >
            {label}
          </p>
          <p className="text-[12px] md:text-[13px] mt-0.5 text-gray-500">
            {desc}
          </p>
        </div>
      </div>
      <div className="shrink-0 ml-2 flex items-center">
        {isActive ? (
          <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-gray-900" />
        ) : (
          <Circle className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-gray-600" />
        )}
      </div>
    </button>
  );
};

export default function ProjectToolsSetupPage() {
  const navigate = useNavigate();
  const { type: projectType = "lighting-project" } = useParams();

  const storageKey = `projectTools_setup_${projectType}`;

  // Work Type: "calculation" | "drawing"
  const [workType, setWorkType] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.workType) return parsed.workType;
      }
    } catch {
      // ignore
    }
    return "calculation";
  });

  // Design Type: "standard" | "custom"
  const [designType, setDesignType] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.designType) return parsed.designType;
      }
      const existing = JSON.parse(
        sessionStorage.getItem(`${projectType}_condition`) || "{}"
      );
      if (existing.poleType) return existing.poleType;
    } catch {
      // ignore
    }
    return "standard";
  });

  const [showResetModal, setShowResetModal] = useState(false);

  // Persists the setup + a base condition to sessionStorage.
  const persistSetup = (
    nextWorkType = workType,
    nextDesignType = designType,
    { resetPoleType = false } = {}
  ) => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        projectType,
        workType: nextWorkType,
        designType: nextDesignType,
        updatedAt: new Date().toISOString(),
      })
    );
    sessionStorage.setItem("projectType", projectType);
    sessionStorage.setItem("projectMode", nextWorkType);
    sessionStorage.setItem(
      `${projectType}_workflow`,
      JSON.stringify({ projectMode: nextWorkType, withReport: false })
    );

    let existingCondition = {};
    try {
      const existingRaw = sessionStorage.getItem(`${projectType}_condition`);
      existingCondition = existingRaw ? JSON.parse(existingRaw) : {};
    } catch {
      // ignore
    }

    const poleType = resetPoleType
      ? "standard"
      : nextDesignType || existingCondition.poleType || "standard";

    sessionStorage.setItem(
      `${projectType}_condition`,
      JSON.stringify({
        designStandard:
          existingCondition.designStandard === "new_jil"
            ? "new_jil"
            : "old_lighting_pole",
        designWindSpeed: existingCondition.designWindSpeed || "60",
        designAirDensity: existingCondition.designAirDensity || "1.23",
        horizontalAcceleration:
          existingCondition.horizontalAcceleration || "4.71",
        responseRatio: existingCondition.responseRatio || "1.00",
        poleType,
        openingEnabled:
          existingCondition.openingEnabled !== undefined
            ? existingCondition.openingEnabled
            : true,
        baseplateEnabled: existingCondition.baseplateEnabled === true,
        foundationEnabled:
          existingCondition.foundationEnabled !== undefined
            ? existingCondition.foundationEnabled
            : false,
      })
    );
    sessionStorage.setItem(
      `${projectType}_calculation_config`,
      JSON.stringify({
        pole: true,
        opening: true,
        baseplate: existingCondition.baseplateEnabled === true,
        foundation: false,
      })
    );
  };

  // Auto-sync selection changes to sessionStorage
  useEffect(() => {
    try {
      persistSetup(workType, designType);
    } catch (err) {
      console.warn("Failed to persist setup in sessionStorage:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectType, workType, designType, storageKey]);

  const handleReset = () => {
    setWorkType("calculation");
    setDesignType("standard");
    const keysToRemove = [
      "drawing_general",
      "drawing_pole",
      "drawing_opening",
      "drawing_baseplate",
      "drawing_foundation",
      "drawing_coupling",
      "drawing_surface",
      "drawing_completed",
      "drawing_pole_completed",
      "drawing_opening_completed",
      "drawing_baseplate_completed",
      "drawing_foundation_completed",
      "drawing_coupling_completed",
      "drawing_coupling_confirmed",
      "drawing_started",
      "poles",
      "poleConfig",
      "directObjects",
      "arms",
      "overheadWires",
      "results",
      "resultsDo",
      "resultsArm",
      "resultsOhw",
      "calculatedOp",
      "calculatedBaseplate",
      "calculatedFoundation",
      "isCalculatedPole",
      "isCalculatedOp",
      "isCalculatedBp",
      "isCalculatedFd",
      "cover",
      "reportSnapshot",
      "hasReport",
    ];
    keysToRemove.forEach((k) => {
      sessionStorage.removeItem(`${projectType}_${k}`);
    });
    try {
      persistSetup("calculation", "standard", { resetPoleType: true });
    } catch (err) {
      console.warn("Failed to reset setup in sessionStorage:", err);
    }
    setShowResetModal(false);
  };

  const handleNext = () => {
    try {
      persistSetup(workType, designType);
      if (workType === "drawing") {
        navigate(`/project-tools/${projectType}/drawing/drawing-setup`);
      } else {
        navigate(`/project-tools/${projectType}/initial`);
      }
    } catch (err) {
      console.error("Failed to save setup:", err);
    }
  };

  const isDrawing = workType === "drawing";
  const nextLabel = isDrawing ? "Next: Drawing General" : "Next: Initial Condition Input";
  const nextHint = isDrawing
    ? "Next, you will enter general drawing information and configure the drawing components."
    : designType === "standard"
      ? "Next, you will choose standard design conditions and select from standard catalog models."
      : "Next, you will define custom dimensions, materials, and specific structural parameters.";

  const projectTitle = projectTypeLabel(projectType);

  return (
    <div className="flex flex-col h-full">
      <Helmet>
        <title>Setup — {projectTitle} · Project Tools</title>
      </Helmet>

      <div className="w-full max-w-[1440px] mx-auto pt-0 pb-24 sm:pb-8 px-2 space-y-6">
        {/* ─── TOP WIREFRAME BAR ─── */}
        <div className="rounded border border-gray-300 bg-white px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/project-tools")}
            className="flex items-center justify-center gap-1.5 sm:gap-2 text-gray-700 px-3 py-1.5 rounded text-xs sm:text-sm font-medium border border-gray-300 hover:bg-gray-100 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span className="truncate">Back to project type</span>
          </button>

          <span className="text-xs sm:text-sm text-gray-600 font-medium hidden sm:inline">
            {projectTitle}
          </span>
        </div>

        {/* ─── FORM CONTAINER ─── */}
        <div className="bg-white rounded border border-gray-300 overflow-hidden">
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* ── Project Setup Section ── */}
            <div>
              <SectionTitle>Project Setup</SectionTitle>
              <p className="mb-4 text-[12px] md:text-[13px] text-gray-500">
                Choose the type of work to start for this {projectTitle.toLowerCase()}.
              </p>
              <SectionCard>
                <p className="mb-3 md:mb-4 text-xs md:text-sm font-medium text-gray-700">
                  What would you like to do?
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <CardOption
                    label="Structural Calculation"
                    desc="Run structural checks and generate a calculation report."
                    icon={Calculator}
                    value="calculation"
                    current={workType}
                    onChange={setWorkType}
                  />
                  <CardOption
                    label="Technical Drawing"
                    desc="Configure pole details and generate a technical drawing."
                    icon={DraftingCompass}
                    value="drawing"
                    current={workType}
                    onChange={setWorkType}
                  />
                </div>

                {/* Next-step hint */}
                <p className="mt-3 md:mt-4 flex items-start gap-1.5 text-[12px] md:text-[13px] text-gray-500">
                  <Info className="w-4 h-4 mt-[2.5px]" />
                  <span>{nextHint}</span>
                </p>
              </SectionCard>
            </div>

            {/* ── Design Type Section ── */}
            <div>
              <SectionTitle>Design Type</SectionTitle>
              <p className="mb-4 text-[12px] md:text-[13px] text-gray-500">
                Choose whether to use standard predefined specifications or customize your own.
              </p>
              <SectionCard>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CardOption
                    label="Standard Type"
                    desc="Use predefined specifications."
                    icon={Layers}
                    value="standard"
                    current={designType}
                    onChange={setDesignType}
                  />
                  <CardOption
                    label="Custom Type"
                    desc="Define your own specifications."
                    icon={Sliders}
                    value="custom"
                    current={designType}
                    onChange={setDesignType}
                  />
                </div>
              </SectionCard>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Footer Buttons */}
            <div className="flex justify-between items-center pt-4 md:pt-0">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded bg-white text-gray-700 font-medium text-xs md:text-sm hover:bg-gray-100 transition-colors border border-gray-300 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="flex justify-center items-center gap-2 px-5 py-2.5 rounded font-medium bg-gray-900 text-white text-xs md:text-sm hover:bg-gray-800 transition-colors border border-gray-900 cursor-pointer"
              >
                {nextLabel}
                <ChevronRight className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Reset Modal */}
      <ConfirmResetAllModal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        onReset={handleReset}
        title="Reset all inputs on this section?"
        description="This will clear all inputs entered in this section. This action cannot be undone."
      />
    </div>
  );
}
