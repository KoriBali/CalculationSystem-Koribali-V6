import {
  RotateCcw,
  ChevronRight,
  DoorOpen,
  Layers,
} from "lucide-react";
import { useState } from "react";
import { BaseplateIcon } from "../../../../../assets/icon";
import { ConfirmResetAllModal } from "../../modals/ConfirmResetAllModal";
import { FormSelect } from "../../../../../shared/components/FormSelect";

const CONDITION_STANDARD_OPTIONS = [
  { value: "old_lighting_pole", label: "Old Lighting Pole" },
  { value: "new_jil", label: "New JIL" },
];

/**
 * HELPER COMPONENTS & FUNCTIONS
 */
// Returns input className based on validation state
const inputStyle = (hasError) =>
  `w-full pl-3 md:pl-4 py-2 lg:py-2.5 rounded text-xs md:text-sm outline-none transition-all border
  ${
    hasError
      ? "border-red-500 bg-red-50 ring-1 ring-red-200"
      : "border-gray-300 bg-white focus:border-gray-700 focus:ring-1 focus:ring-gray-700"
  }`;

// Renders a red error message below an invalid field
const ErrorStyle = ({ show, text }) =>
  show && typeof text === "string" ? (
    <div className="absolute left-0 -bottom-4 md:-bottom-5 flex items-center gap-1 text-[9px] md:text-[11px] text-red-500">
      <span>*{text}</span>
    </div>
  ) : null;

// Reusable section title
const SectionTitle = ({ children }) => (
  <h3 className="text-gray-900 mb-3 text-xs md:text-sm font-semibold">
    {children}
  </h3>
);

// Reusable section card wrapper
const SectionCard = ({ children }) => (
  <div className="bg-white px-4 md:px-5 py-5 rounded border border-gray-300">
    {children}
  </div>
);

// Reusable number input with unit suffix
const UnitInput = ({
  value,
  onChange,
  unit,
  unitPadding,
  hasError,
  className,
  ...props
}) => (
  <div className="relative">
    <input
      type="number"
      step="any"
      min={0}
      value={value}
      onChange={onChange}
      onWheel={(e) => e.target.blur()}
      className={
        className ||
        `${inputStyle(hasError)} ${unitPadding || (unit ? "pr-10" : "pr-3 md:pr-4")}`
      }
      {...props}
    />
    {unit && (
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none select-none">
        {unit}
      </span>
    )}
  </div>
);

/**
 * MAIN COMPONENT: ConditionForm
 */
export function ConditionForm({
  projectType,
  projectMode,
  condition = {},
  onUpdate,
  onFinish,
  errors = {},
  readOnly = false,
}) {
  // State for reset confirmation modal
  const [showResetModal, setShowResetModal] = useState(false);

  // Resets condition to defaults
  const handleReset = () => {
    if (readOnly) return;
    const isStandard = condition?.poleType === "standard";
    const resetValues = {
      designStandard: "old_lighting_pole",
      designWindSpeed: "60",
      designAirDensity: "1.23",
      horizontalAcceleration: "4.71",
      responseRatio: "1.00",
    };

    // Only reset additional components toggles for custom mode,
    // where they are actually configured on this page.
    if (!isStandard) {
      resetValues.openingEnabled = true;
      resetValues.baseplateEnabled = false;
      resetValues.foundationEnabled = false;
    }

    onUpdate(resetValues);
  };

  const isNewJil = condition?.designStandard === "new_jil";

  return (
    <div className="relative">
      <div className="bg-white rounded border border-gray-300 overflow-hidden">
        <div className="p-4 md:p-6 space-y-6">
          {/* ── Standard and Condition ── */}
          <div>
            <SectionTitle>Standard and Condition</SectionTitle>
            <SectionCard>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
                {/* Condition Standard */}
                <div className="relative">
                  <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                    Condition Standard{" "}
                    <span className="text-red-500 ml-1 font-semibold">*</span>
                  </label>
                  <FormSelect
                    id="designStandard"
                    value={condition?.designStandard || "old_lighting_pole"}
                    onChange={(val) => onUpdate({ designStandard: val })}
                    options={CONDITION_STANDARD_OPTIONS}
                    placeholder="Select Standard"
                    disabled={readOnly}
                    hasError={!!errors?.designStandard}
                  />
                  <ErrorStyle
                    show={errors?.designStandard}
                    text={errors?.designStandard}
                  />
                </div>

                {/* Wind Speed */}
                <div className="relative">
                  <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                    Wind Speed{" "}
                    <span className="text-red-500 ml-1 font-semibold">*</span>
                  </label>
                  <UnitInput
                    id="designWindSpeed"
                    value={condition?.designWindSpeed ?? ""}
                    onChange={(e) =>
                      onUpdate({ designWindSpeed: e.target.value })
                    }
                    unit="m/s"
                    unitPadding="pr-12"
                    placeholder="60"
                    disabled={readOnly}
                    hasError={!!errors?.designWindSpeed}
                  />
                  <ErrorStyle
                    show={errors?.designWindSpeed}
                    text={errors?.designWindSpeed}
                  />
                </div>

                {/* Air Density */}
                <div className="relative">
                  <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                    Air Density{" "}
                    <span className="text-red-500 ml-1 font-semibold">*</span>
                  </label>
                  <UnitInput
                    id="designAirDensity"
                    value={condition?.designAirDensity ?? ""}
                    onChange={(e) =>
                      onUpdate({ designAirDensity: e.target.value })
                    }
                    unit={
                      <span>
                        N・sec<sup>2</sup>/m<sup>4</sup>
                      </span>
                    }
                    unitPadding="pr-[92px]"
                    placeholder="1.23"
                    disabled={readOnly}
                    hasError={!!errors?.designAirDensity}
                  />
                  <ErrorStyle
                    show={errors?.designAirDensity}
                    text={errors?.designAirDensity}
                  />
                </div>
              </div>

              {/* Conditional Seismic Inputs for New JIL */}
              {isNewJil && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <p className="text-xs md:text-sm font-medium text-[#0d3b66] mb-4 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3399cc]" />
                    Condition for calculation of seismic
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                    {/* Horizontal Acceleration (EQa) */}
                    <div className="relative">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        Horizontal Acceleration (EQa){" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <UnitInput
                        id="horizontalAcceleration"
                        value={condition?.horizontalAcceleration ?? ""}
                        onChange={(e) =>
                          onUpdate({ horizontalAcceleration: e.target.value })
                        }
                        unit={
                          <span>
                            m/s<sup>2</sup>
                          </span>
                        }
                        unitPadding="pr-12"
                        placeholder="4.71"
                        disabled={readOnly}
                        hasError={!!errors?.horizontalAcceleration}
                      />
                      <ErrorStyle
                        show={errors?.horizontalAcceleration}
                        text={errors?.horizontalAcceleration}
                      />
                    </div>

                    {/* Response Ratio (EQr) */}
                    <div className="relative">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        Response Ratio (EQr){" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <UnitInput
                        id="responseRatio"
                        value={condition?.responseRatio ?? ""}
                        onChange={(e) =>
                          onUpdate({ responseRatio: e.target.value })
                        }
                        placeholder="1.00"
                        disabled={readOnly}
                        hasError={!!errors?.responseRatio}
                      />
                      <ErrorStyle
                        show={errors?.responseRatio}
                        text={errors?.responseRatio}
                      />
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Additional Component (toggles) — only for custom mode ── */}
          {condition.poleType !== "standard" && (
            <div>
              <SectionTitle>Additional Components</SectionTitle>
              <SectionCard>
                <div className="grid xl:grid-cols-3 gap-6">
                  {/* Opening */}
                  <ToggleCard
                    label="Opening"
                    icon={<DoorOpen size={16} />}
                    enabled={condition.openingEnabled}
                    disabled={
                      readOnly ||
                      (projectMode === "both" && condition.poleType === "standard")
                    }
                    onToggle={() =>
                      !readOnly && onUpdate({ openingEnabled: !condition.openingEnabled })
                    }
                  />

                  {/* Baseplate */}
                  <ToggleCard
                    label="Baseplate"
                    icon={<BaseplateIcon size={18} />}
                    enabled={condition.baseplateEnabled}
                    disabled={readOnly}
                    onToggle={() =>
                      !readOnly && onUpdate({ baseplateEnabled: !condition.baseplateEnabled })
                    }
                  />

                  {/* Foundation */}
                  <ToggleCard
                    label="Foundation"
                    icon={<Layers size={16} />}
                    enabled={condition.foundationEnabled}
                    disabled={readOnly}
                    onToggle={() =>
                      !readOnly &&
                      onUpdate({
                        foundationEnabled: !condition.foundationEnabled,
                      })
                    }
                  />
                </div>
              </SectionCard>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Footer */}
          <div className={`flex ${readOnly ? "justify-end" : "justify-between"} items-center pt-4 md:pt-0`}>
            {/* Reset => clears all fields (hidden in readOnly) */}
            {!readOnly && (
              <button
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded bg-white text-gray-700 font-medium text-xs md:text-sm hover:bg-gray-100 transition-colors border border-gray-300 cursor-pointer"
              >
                <RotateCcw className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                Reset
              </button>
            )}

            {/* Finish => proceeds to next step */}
            <button
              onClick={onFinish}
              className="flex justify-center items-center gap-2 px-5 py-2.5 rounded font-medium bg-gray-900 hover:bg-gray-800 text-white text-xs md:text-sm border border-gray-900 transition-colors cursor-pointer"
            >
              Next: Pole
              <ChevronRight className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
            </button>
          </div>
        </div>
      </div>
      <ConfirmResetAllModal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        onReset={handleReset}
      />
    </div>
  );
}

// ─── SUB-COMPONENT ───────────────────────────────────────────────────────────

// Reusable toggle card for additional components (Opening, Baseplate, Foundation)
function ToggleCard({ label, icon, enabled, onToggle, disabled = false }) {
  return (
    <div
      onClick={disabled ? undefined : onToggle}
      className={`relative rounded border px-3 xl:px-4 py-2 lg:py-3 transition-colors
        ${disabled ? "cursor-not-allowed" : "cursor-pointer"}
        ${disabled && !enabled ? "bg-gray-100 opacity-60" : ""}
        ${
          enabled
            ? "border-2 border-gray-900 bg-white"
            : disabled
              ? "border-gray-200"
              : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={`p-1.5 rounded border ${
              enabled
                ? "bg-gray-100 border-gray-300 text-gray-900"
                : "bg-gray-100 border-gray-200 text-gray-500"
            }`}
          >
            {icon}
          </div>
          {/* Label */}
          <p
            className={`text-[12px] md:text-sm font-medium ${enabled ? "text-gray-900" : "text-gray-600"}`}
          >
            {label}
          </p>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onToggle();
          }}
          className={`relative inline-flex h-5 w-10 md:h-6 md:w-11 items-center rounded-full ${
            enabled ? "bg-gray-900" : "bg-gray-300"
          } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`inline-block h-2.5 w-2.5 md:h-4 md:w-4 transform rounded-full bg-white transition ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
