// src/features/calculations/components/forms/pole/LowestHeightIllustration.jsx
import React from "react";

export function LowestHeightIllustration({ installationType, lowestHeight, embedmentLength }) {
  if (installationType === "embedment") {
    const displayLen = embedmentLength || 1800;
    return (
      <div className="relative border border-gray-200 rounded bg-gray-50/50 p-4 flex flex-col items-center justify-center min-h-[160px]">
        {/* Status Badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Embedded {displayLen} mm
          </span>
        </div>

        {/* Embedment SVG Graphic */}
        <svg
          viewBox="0 0 240 140"
          className="w-48 h-28 max-w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hatched soil pattern */}
          <defs>
            <pattern
              id="soilHatch"
              width="8"
              height="8"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="8" stroke="#cbd5e1" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Soil area below GL */}
          <rect x="70" y="55" width="110" height="75" fill="url(#soilHatch)" />
          <rect x="70" y="55" width="110" height="75" stroke="#cbd5e1" strokeWidth="1" />

          {/* Ground Line G.L. */}
          <line x1="50" y1="55" x2="200" y2="55" stroke="#334155" strokeWidth="2" />
          <text x="185" y="50" fill="#334155" fontSize="10" fontWeight="600" fontFamily="sans-serif">
            G.L.
          </text>

          {/* Pole Shaft */}
          <rect x="115" y="15" width="18" height="110" rx="1" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />

          {/* Dimension Line for Embedment Length (l) */}
          <line x1="95" y1="55" x2="95" y2="125" stroke="#2563eb" strokeWidth="1.5" />
          <line x1="90" y1="55" x2="100" y2="55" stroke="#2563eb" strokeWidth="1.5" />
          <line x1="90" y1="125" x2="100" y2="125" stroke="#2563eb" strokeWidth="1.5" />
          <text x="80" y="93" fill="#2563eb" fontSize="11" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">
            l
          </text>
        </svg>
      </div>
    );
  }

  // Baseplate Illustration
  const isUnderGL = lowestHeight < 0 || lowestHeight === "underGL";
  return (
    <div className="relative border border-gray-200 rounded bg-gray-50/50 p-4 flex flex-col items-center justify-center min-h-[160px]">
      {/* Status Badge */}
      <div className="absolute top-2.5 right-2.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {isUnderGL ? `Under GL (${lowestHeight} mm)` : "On GL (0 mm)"}
        </span>
      </div>

      {/* Baseplate SVG Graphic */}
      <svg
        viewBox="0 0 240 140"
        className="w-48 h-28 max-w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ground Line G.L. */}
        <line x1="50" y1="105" x2="200" y2="105" stroke="#334155" strokeWidth="2" />
        <text x="185" y="100" fill="#334155" fontSize="10" fontWeight="600" fontFamily="sans-serif">
          G.L.
        </text>

        {/* Baseplate Flange sitting on GL */}
        <rect x="95" y="100" width="58" height="6" rx="1" fill="#64748b" stroke="#334155" strokeWidth="1.5" />

        {/* Pole Shaft */}
        <rect x="115" y="20" width="18" height="80" rx="1" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
