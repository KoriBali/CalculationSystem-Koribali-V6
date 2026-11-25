// src/features/calculations/components/layout/ProjectToolsFlowHeader.jsx
/**
 * ============================================================================
 * PROJECT TOOLS FLOW HEADER (ProjectToolsFlowHeader)
 * ============================================================================
 * Komponen header navigasi untuk alur Project Tools:
 * Hanya menampilkan tombol hitam "< Back to project tools" (<ChevronLeft />).
 * Tab navigasi disembunyikan secara total sesuai instruksi pengguna.
 * Tinggi dan padding tombol diperbesar agar lebih proporsional dan mudah diklik.
 * ============================================================================
 */

import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export function ProjectToolsFlowHeader() {
  return (
    <div className="mb-6 pb-4 border-b border-gray-200">
      {/* ── Back to Project Tools Button Only (Height & Padding Enhanced) ── */}
      <div>
        <Link
          to="/project-tools"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Back to project tools</span>
        </Link>
      </div>
    </div>
  );
}
