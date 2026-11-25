// src/features/calculations/components/forms/pole/LowestHeightIllustration.jsx
import React from "react";

export function LowestHeightIllustration({ installationType, lowestHeight, embedmentLength }) {
  if (installationType === "embedment") {
    const displayLen = embedmentLength || 1800;
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-3.5 flex flex-col justify-between min-h-[160px] w-full shadow-2xs">
        {/* Status Badge */}
        <div className="w-full flex justify-end mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Embedded ({displayLen} mm)
          </span>
        </div>

        {/* Embedment SVG Graphic */}
        <div className="w-full flex-1 flex items-center justify-center py-1">
          <svg
            viewBox="0 0 240 135"
            className="w-full max-w-[260px] h-[120px] max-h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="embedSoilHatch"
                width="8"
                height="8"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" strokeWidth="0.8" />
              </pattern>
            </defs>

            {/* Soil area below GL */}
            <rect x="40" y="55" width="160" height="75" fill="url(#embedSoilHatch)" />

            {/* Ground Line G.L. */}
            <line x1="30" y1="55" x2="210" y2="55" stroke="#334155" strokeWidth="2" />
            <text x="195" y="48" fill="#0f172a" fontSize="12" fontWeight="700" fontFamily="sans-serif">
              GL
            </text>

            {/* Pole Shaft */}
            <rect x="111" y="10" width="18" height="120" rx="1" fill="#94a3b8" stroke="#334155" strokeWidth="1.2" />

            {/* Dimension Line for Embedment Length (l) */}
            <line x1="90" y1="55" x2="90" y2="130" stroke="#2563eb" strokeWidth="1.5" />
            <line x1="85" y1="55" x2="95" y2="55" stroke="#2563eb" strokeWidth="1.5" />
            <line x1="85" y1="130" x2="95" y2="130" stroke="#2563eb" strokeWidth="1.5" />
            <text x="76" y="96" fill="#2563eb" fontSize="11" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">
              l
            </text>
          </svg>
        </div>
      </div>
    );
  }

  // Baseplate Illustration
  const numVal = Number(lowestHeight) || 0;
  const isUnderGL = numVal < 0 || lowestHeight === "underGL";
  const isUpperGL = numVal > 0;
  const absVal = Math.abs(numVal);

  const GL_Y = 95;
  const baseplateY = isUnderGL ? 112 : isUpperGL ? 78 : 90;
  const poleBottomY = baseplateY;

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-3.5 flex flex-col justify-between min-h-[160px] w-full shadow-2xs">
      {/* Status Badge */}
      <div className="w-full flex justify-end mb-1">
        {numVal === 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            On GL (0 mm)
          </span>
        ) : isUpperGL ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Upper GL (+{absVal} mm)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Under GL ({numVal} mm)
          </span>
        )}
      </div>

      {/* Baseplate SVG Graphic */}
      <div className="w-full flex-1 flex items-center justify-center py-1">
        <svg
          viewBox="0 0 240 135"
          className="w-full max-w-[260px] h-[120px] max-h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="baseSoilHatch"
              width="8"
              height="8"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" strokeWidth="0.8" />
            </pattern>
          </defs>

          {/* Hatched Soil below GL */}
          <rect x="30" y={GL_Y} width="180" height="38" fill="url(#baseSoilHatch)" />

          {/* Concrete pedestal if Upper GL */}
          {isUpperGL && (
            <rect
              x="85"
              y={baseplateY + 5}
              width="70"
              height={GL_Y - (baseplateY + 5)}
              fill="#e2e8f0"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          )}

          {/* Excavation pit outline if Under GL */}
          {isUnderGL && (
            <rect
              x="85"
              y={GL_Y}
              width="70"
              height={baseplateY + 5 - GL_Y}
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeWidth="0.8"
              strokeDasharray="3 3"
            />
          )}

          {/* Ground Line G.L. */}
          <line x1="25" y1={GL_Y} x2="215" y2={GL_Y} stroke="#334155" strokeWidth="2" />
          <text x="198" y={GL_Y - 4} fill="#0f172a" fontSize="12" fontWeight="700" fontFamily="sans-serif">
            GL
          </text>

          {/* Baseplate Flange */}
          <rect
            x="90"
            y={baseplateY}
            width="60"
            height="5"
            rx="1"
            fill="#64748b"
            stroke="#334155"
            strokeWidth="1.2"
          />

          {/* Pole Shaft */}
          <rect
            x="111"
            y="10"
            width="18"
            height={poleBottomY - 10}
            rx="1"
            fill="#94a3b8"
            stroke="#334155"
            strokeWidth="1.2"
          />

          {/* Blue Dimension line (h) if not 0 */}
          {numVal !== 0 && (
            <g>
              <line x1="68" y1={GL_Y} x2="68" y2={baseplateY + 2.5} stroke="#2563eb" strokeWidth="1.5" />
              <line x1="63" y1={GL_Y} x2="73" y2={GL_Y} stroke="#2563eb" strokeWidth="1.5" />
              <line x1="63" y1={baseplateY + 2.5} x2="73" y2={baseplateY + 2.5} stroke="#2563eb" strokeWidth="1.5" />
              <text x="54" y={(GL_Y + baseplateY) / 2 + 4} fill="#2563eb" fontSize="11" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">
                (h)
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
