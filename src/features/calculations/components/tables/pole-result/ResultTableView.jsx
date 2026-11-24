// src/features/calculations/components/tables/pole-result/ResultTableView.jsx
import React from "react";
import PropTypes from "prop-types";
import { FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { SummaryResultTable } from "./SummaryResultTable";

export function ResultsTableView({
  results = [],
  display = null,
  calculationKey = 0,
}) {
  const hasResults = Array.isArray(results) && results.length > 0;

  return (
    <div className="bg-white rounded border border-gray-300 overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-4 hp:px-4 hp:py-3 flex items-center gap-3 hp:gap-2 border-b border-gray-200">
        <div className="bg-gray-100 p-2 hp:p-1.5 rounded shrink-0 border border-gray-200">
          <CheckCircle2 className="w-5 h-5 text-gray-800" />
        </div>
        <div>
          <h2 className="text-gray-900 text-sm hp:text-xs font-semibold mb-0.5">
            Calculation Results
          </h2>
          <p className="text-gray-500 text-xs font-normal hp:hidden">
            Comprehensive structural analysis output
          </p>
        </div>
      </div>

      {/* ── Old JIL Evaluation Summary Table ── */}
      {hasResults ? (
        <SummaryResultTable
          resultPole={results}
          display={display}
          calculationKey={calculationKey}
        />
      ) : (
        <div className="p-12 text-center">
          <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-xs md:text-sm">
            No calculation results yet. Please input pole data and click Calculate Results.
          </p>
        </div>
      )}
    </div>
  );
}

ResultsTableView.propTypes = {
  results: PropTypes.arrayOf(PropTypes.object),
  display: PropTypes.object,
  calculationKey: PropTypes.number,
};
