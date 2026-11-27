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
import { ArrowLeft } from "lucide-react";
import { forgetProjectToolsPath } from "../../utils/requestsLastPath";

export function ProjectToolsFlowHeader() {
  return (
    <div className="mb-6 pb-4 border-b border-gray-200">
      {/* ── Back to Project Tools Button Only ── */}
      <div>
        <Link
          to="/project-tools"
          onClick={() => forgetProjectToolsPath()}
          className="h-9 px-3 sm:px-4 text-xs sm:text-sm bg-white text-[#0d3b66] border border-[#0d3b66] rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer font-medium shadow-xs"
          title="Back to project tools"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Back to project tools</span>
        </Link>
      </div>
    </div>
  );
}
