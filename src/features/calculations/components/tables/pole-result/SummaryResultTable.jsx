import { motion } from "framer-motion";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";

// Status pill — shows the actual comparison (value vs limit) INSIDE the
// badge itself, e.g. "0.9 < 1.0", so the verdict is self-explanatory.
//
// When `value` is missing (null/undefined/"-"), we show a distinct
// "No Data" state instead of defaulting to NG — a missing safety factor
// means the check hasn't produced a number yet, not that it failed.
function StatusBadge({ value, limit }) {
  const displayLimit = limit ?? 1.0;
  const numericValue = typeof value === "number" ? value : Number(value);
  const hasValue =
    value != null && value !== "-" && !Number.isNaN(numericValue);

  if (!hasValue) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm hp:text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
        <HelpCircle className="w-4 h-4 hp:w-3.5 hp:h-3.5 shrink-0" />
        <span>No Data</span>
      </span>
    );
  }

  const isOk = numericValue < displayLimit;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm hp:text-[10px] font-semibold transition-all
      ${
        isOk
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs"
          : "bg-red-50 text-red-700 border border-red-200 shadow-xs"
      }`}
    >
      {isOk ? (
        <CheckCircle2 className="w-4 h-4 hp:w-3.5 hp:h-3.5 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 hp:w-3.5 hp:h-3.5 shrink-0" />
      )}
      <span>{isOk ? "OK" : "NG"}</span>
      <span className="opacity-40">·</span>
      <span className="tabular-nums font-normal">
        {numericValue} {isOk ? "<" : ">"} {displayLimit}
      </span>
    </span>
  );
}

// The 3 wind-load conditions evaluated for every pole. Pulled out as data
// instead of the table markup being copy-pasted 3 times.
const WIND_CONDITIONS = [
  "Direct Wind Condition A",
  "Direct Wind Condition B",
  "Oblique Wind Condition",
];

function ConditionTable({ label, rows, calculationKey = 0 }) {
  return (
    <div className="mb-8 last:mb-0">
      {/* Condition divider */}
      <div className="flex items-center mt-6 mb-4">
        <div className="flex-1 h-px bg-gray-200" />
        <h4 className="mx-4 px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded border border-gray-200 whitespace-nowrap">
          {label}
        </h4>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Table container */}
      <div className="overflow-x-auto rounded border border-gray-300 bg-white">
        <table className="min-w-full table-fixed text-sm hp:text-[10px]">
          <colgroup>
            <col className="w-12" />
            <col className="w-[32%]" />
            <col className="w-[20%]" />
            <col className="w-[38%]" />
          </colgroup>

          <thead>
            <tr className="bg-slate-100 border-b border-gray-300 divide-x divide-gray-300">
              <th className="px-4 py-3 hp:px-3 hp:py-2 text-center font-semibold hp:font-medium text-slate-500">
                No
              </th>
              <th className="px-4 py-3 hp:px-3 hp:py-2 text-left font-semibold hp:font-medium text-slate-500">
                Description
              </th>
              <th className="px-4 py-3 hp:px-3 hp:py-2 text-right font-semibold hp:font-medium text-slate-500">
                Safety Factor
              </th>
              <th className="px-4 py-3 hp:px-3 hp:py-2 text-center font-semibold hp:font-medium text-slate-500">
                Result
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => {
              const rawSf =
                row.safetyFactor != null && row.safetyFactor !== "-"
                  ? row.safetyFactor
                  : null;
              const safetyFactor =
                rawSf != null && !Number.isNaN(Number(rawSf))
                  ? Number(Number(rawSf).toFixed(3))
                  : null;
              const limit = row.limit ?? 1.0;
              return (
                <motion.tr
                  key={`${calculationKey}-${i}-${row.description}`}
                  initial={{ opacity: 0.35, backgroundColor: "rgba(224, 242, 254, 0.5)" }}
                  animate={{ opacity: 1, backgroundColor: "transparent" }}
                  transition={{ duration: 0.45, delay: i * 0.04 }}
                  className="border-b border-gray-300 last:border-b-0 divide-x divide-gray-200 hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-4 py-3 hp:px-3 hp:py-2 text-center text-slate-500 tabular-nums">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 hp:px-3 hp:py-2 text-slate-700 truncate font-medium">
                    {row.description}
                  </td>
                  <td className="px-4 py-3 hp:px-3 hp:py-2 text-right text-slate-700 tabular-nums font-semibold">
                    <motion.span
                      key={`${calculationKey}-${safetyFactor ?? "none"}`}
                      initial={{ scale: 1.18, color: "#0284c7" }}
                      animate={{ scale: 1, color: "#1e293b" }}
                      transition={{ duration: 0.35 }}
                      className="inline-block"
                    >
                      {safetyFactor != null ? safetyFactor : "-"}
                    </motion.span>
                  </td>
                  <td className="px-4 py-3 hp:px-3 hp:py-2 text-center">
                    <motion.div
                      key={`${calculationKey}-${safetyFactor ?? "none"}`}
                      initial={{ scale: 0.88, opacity: 0.6 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="inline-flex justify-center"
                    >
                      <StatusBadge value={safetyFactor} limit={limit} />
                    </motion.div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SummaryResultTable({ resultPole, display = null, isOldJil = null, calculationKey = 0 }) {
  const detectedOldJil = isOldJil ?? (() => {
    try {
      const cond = JSON.parse(
        sessionStorage.getItem("lighting-project_condition") ||
        sessionStorage.getItem("condition") ||
        "{}"
      );
      const std = String(cond.designStandard || cond.standard || "").toLowerCase();
      return (
        (std.includes("jil") ||
          std.includes("lighting") ||
          std === "old_lighting_pole" ||
          std === "old_jil" ||
          std === "jil") &&
        !std.includes("new")
      );
    } catch {
      return false;
    }
  })();

  const conditionsToRender = detectedOldJil ? ["Direct Wind"] : WIND_CONDITIONS;

  // Sesuai kebutuhan: cukup satu tabel Structural Evaluation tanpa pengulangan per pole
  const posList =
    (Array.isArray(display?.checks) && display.checks.length > 0
      ? display.checks
      : null) ||
    (Array.isArray(display?.positions) && display.positions.length > 0
      ? display.positions
      : null) ||
    (Array.isArray(display?.sections) && display.sections.length > 0
      ? display.sections
      : null) ||
    (display?.governing ? [display.governing] : null) ||
    (Array.isArray(display) && display.length > 0 ? display : null);

  const rows =
    posList && posList.length > 0
      ? posList.map((pos, pIdx) => {
          const rawRatio =
            pos.utilizationRatio ??
            pos.utilization_ratio ??
            pos.safetyFactor ??
            pos.safety_factor ??
            pos.safetyRatio ??
            pos.stressRatio ??
            pos.ratio ??
            pos.value;
          const sf =
            rawRatio != null && !Number.isNaN(Number(rawRatio))
              ? Number(Number(rawRatio).toFixed(3))
              : resultPole?.[pIdx]?.safetyFactor ??
                null;
          const desc =
            pos.name ||
            pos.evaluatedPoleName ||
            pos.poleName ||
            resultPole?.[pIdx]?.description ||
            resultPole?.[pIdx]?.name ||
            `Pole-${pIdx + 1}`;
          return {
            description: desc,
            safetyFactor: sf,
            limit: pos.limit ?? pos.allowableRatio ?? 1.0,
          };
        })
      : (Array.isArray(resultPole) ? resultPole : []).map((item, pIdx) => {
          const rawRatio = item?.safetyFactor ?? item?.utilizationRatio;
          const sf =
            rawRatio != null && !Number.isNaN(Number(rawRatio))
              ? Number(Number(rawRatio).toFixed(3))
              : null;
          return {
            description: item?.description || item?.name || `Pole-${pIdx + 1}`,
            safetyFactor: sf,
            limit: item?.limit ?? 1.0,
          };
        });

  return (
    <div className="mx-6 my-6 hp:mx-2 hp:mt-4 hp:mb-8">
      <div className="bg-white rounded border border-gray-300 p-5 hp:p-4">
        {/* Header Tabel Tunggal */}
        <div className="flex items-center gap-2">
          <h3 className="text-gray-900 font-semibold text-sm hp:text-xs leading-tight">
            Structural Evaluation
          </h3>
        </div>

        {conditionsToRender.map((label) => (
          <ConditionTable
            key={label}
            label={label}
            rows={rows}
            calculationKey={calculationKey}
          />
        ))}
      </div>
    </div>
  );
}
