// src/features/calculations/pages/ProjectToolsPage.jsx
/**
 * ============================================================================
 * POLE TYPE CONFIGURATION PAGE (ProjectToolsPage)
 * ============================================================================
 * Halaman pemilihan konfigurasi tiang standar (Road Lighting Pole Standard)
 * atau custom mode sebelum masuk ke tahapan kalkulasi struktural (/project-tools/structural).
 *
 * ARSITEKTUR & ALUR DATA (DATA RESOLUTION FLOW):
 * 1. Default State:
 *    - Semua input awal berstatus KOSONG / UNSELECTED (mati):
 *      selectedStandard = "", installationType = "", lowestHeightPosition = "",
 *      embedmentLength = "", selectedHeight = "".
 * 2. Toggle / Unselect Behavior:
 *    - Semua tombol pilihan (Pole Standard, Installation, Position, Height) bersifat
 *      toggleable: jika opsi yang sedang aktif diklik kembali, opsi tersebut akan
 *      menjadi unselected (kosong) dan mereset pilihan turunannya.
 * 3. Validasi Pemilihan Bertahap:
 *    - Jika user mencoba mengklik "Select Installation Type" sebelum memilih
 *      "Select Pole Standard Type", sistem menolak aksi tersebut dan memunculkan
 *      pesan kesalahan validasi: "* Select a pole standard type first."
 * 4. Sumber Data Master (BE API vs Fallback Catalog):
 *    - Data master standar tiang diambil via usePoleStandardData() dari endpoint BE
 *      (/api/master/pole-standards).
 *    - Jika backend offline, sistem secara otomatis fallback ke specStandardPole.json
 *      sehingga seluruh spesifikasi (diameter atas/bawah, ketebalan, material STK400,
 *      arm, beban lampu/direct objects, skematik gambar SVG) tetap berfungsi penuh.
 * 5. Logika Transisi Mode (Standard vs Custom):
 *    - CUSTOM MODE: Jika user membiarkan pole standard kosong (""), tombol NEXT aktif.
 *      Ketika diklik, aplikasi menginisialisasi parameter tiang custom default.
 *    - STANDARD MODE: Jika user memilih salah satu tipe standar (IS, IA, LS, LA, TS, TA),
 *      tombol NEXT dinonaktifkan (disabled) sampai seluruh isian wajib terpenuhi
 *      (Installation Type -> Ground Position / Embedment Length -> Pole Height).
 * ============================================================================
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { CheckCircle2, Circle, RotateCcw, ArrowRight } from "lucide-react";
import { usePoleStandardData } from "../hooks/usePoleStandardData";
import STANDARD_POLE_DATA from "../data/specStandardPole.json";
import {
  DIAGRAM_IMAGE_MAP,
  EMBED_IMAGE_MAP,
  DIAGRAM_LABEL_LAYOUT,
  getDiagramLabels,
} from "../components/forms/pole/standard/taperDiagramConstants";

// ─── 1. STATIC MASTER DATA CONFIGURATION ──────────────────────────────────────
const FALLBACK_POLE_TYPES = [
  { id: "IS", label: "Type-I (IS)" },
  { id: "IA", label: "Type-I (IA)" },
  { id: "LS", label: "Type-L (LS)" },
  { id: "LA", label: "Type-L (LA)" },
  { id: "TS", label: "Type-T (TS)" },
  { id: "TA", label: "Type-T (TA)" },
];

export default function ProjectToolsPage() {
  const navigate = useNavigate();

  // Pengambilan data master standar dari backend API (dengan fallback katalog otomatis)
  const { poleStandardOptions } = usePoleStandardData();

  // ─── 2. COMPONENT STATE (DEFAULT ALL UNSELECTED / EMPTY) ────────────────────
  const [selectedStandard, setSelectedStandard] = useState("");
  const [installationType, setInstallationType] = useState(""); // 'baseplate' | 'embedment' | ''
  const [lowestHeightPosition, setLowestHeightPosition] = useState(""); // 'onGL' | 'underGL' | ''
  const [embedmentLength, setEmbedmentLength] = useState(""); // String angka, tanpa default 1800
  const [selectedHeight, setSelectedHeight] = useState(""); // Tidak ada auto-select default
  const [installationError, setInstallationError] = useState(""); // Pesan error jika klik installation sebelum standard

  // Pastikan parameter workflow project tersimpan di sessionStorage saat halaman dimuat
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

  // Opsi tipe tiang standar (mengutamakan opsi dari backend jika tersedia)
  const standardTypes = useMemo(() => {
    return poleStandardOptions && poleStandardOptions.length > 0
      ? poleStandardOptions
      : FALLBACK_POLE_TYPES;
  }, [poleStandardOptions]);

  // ─── 3. COMPUTED SPECIFICATIONS & HEIGHT OPTIONS ───────────────────────────
  // Menentukan kunci posisi tanah untuk query katalog data standar
  const effectiveGroundKey = useMemo(() => {
    if (installationType === "embedment") return "onGL";
    if (installationType === "baseplate" && lowestHeightPosition) {
      return lowestHeightPosition;
    }
    return null;
  }, [installationType, lowestHeightPosition]);

  // Daftar ketinggian yang tersedia berdasarkan tipe tiang dan posisi tanah yang dipilih
  const availableHeights = useMemo(() => {
    if (!selectedStandard || !effectiveGroundKey) return [];

    const taper = STANDARD_POLE_DATA.tapered || STANDARD_POLE_DATA.taper || {};
    const group = taper[selectedStandard] || {};
    const entries = group[effectiveGroundKey] || {};

    const rawKeys = Object.keys(entries);
    const sorted = [...rawKeys].sort((a, b) => Number(a) - Number(b));

    return sorted.map((key) => {
      const numM = Number(key);
      const isUnderGL =
        installationType === "baseplate" && lowestHeightPosition === "underGL";
      const displayLabel = isUnderGL ? `${numM} m` : `${Math.round(numM)} m`;
      return {
        key,
        numM,
        displayLabel,
      };
    });
  }, [
    selectedStandard,
    effectiveGroundKey,
    installationType,
    lowestHeightPosition,
  ]);

  // Menjaga agar selectedHeight hanya dibersihkan jika tidak lagi valid
  // (TIDAK melakukan auto-select; user wajib memilih sendiri)
  useEffect(() => {
    if (selectedHeight) {
      const exists = availableHeights.some((h) => h.key === selectedHeight);
      if (!exists) {
        setSelectedHeight("");
      }
    }
  }, [availableHeights, selectedHeight]);

  // ─── 4. DIAGRAM IMAGE & SCHEMATIC OVERLAY RESOLUTION ─────────────────────────
  // Gambar diagram SVG berdasarkan tipe tiang dan mode instalasi
  const currentImage = useMemo(() => {
    if (!selectedStandard || !installationType) return null;
    if (installationType === "embedment") {
      return EMBED_IMAGE_MAP[selectedStandard] || null;
    }
    if (installationType === "baseplate" && lowestHeightPosition) {
      return (
        DIAGRAM_IMAGE_MAP[selectedStandard]?.[lowestHeightPosition] || null
      );
    }
    return null;
  }, [selectedStandard, installationType, lowestHeightPosition]);

  // Posisi ground untuk perhitungan tata letak dimensi diagram
  const effectiveGroundPositionForDiagram =
    installationType === "embedment" ? "embedment" : lowestHeightPosition;

  // Label dimensi angka dan spesifikasi teknis tiang pada diagram
  const diagramLabels = useMemo(() => {
    if (
      !selectedStandard ||
      !effectiveGroundPositionForDiagram ||
      !selectedHeight
    ) {
      return null;
    }
    return getDiagramLabels(
      selectedStandard,
      effectiveGroundPositionForDiagram,
      selectedHeight,
      null,
    );
  }, [selectedStandard, effectiveGroundPositionForDiagram, selectedHeight]);

  // Konfigurasi viewBox dan koordinat anchor diagram SVG
  const diagramLayout = useMemo(() => {
    if (!selectedStandard || !effectiveGroundPositionForDiagram) return null;
    return (
      DIAGRAM_LABEL_LAYOUT[
        `${selectedStandard}.${effectiveGroundPositionForDiagram}`
      ] || null
    );
  }, [selectedStandard, effectiveGroundPositionForDiagram]);

  // ─── 5. FORM VALIDATION & NEXT READINESS LOGIC ─────────────────────────────
  /**
   * Aturan Validasi Tombol Next:
   * 1. Jika selectedStandard KOSONG -> User memilih Custom Mode.
   *    Tombol Next LANGSUNG AKTIF (enabled).
   * 2. Jika selectedStandard DIPILIH -> User memilih Standard Mode.
   *    Tombol Next DINONAKTIFKAN (disabled) sampai seluruh isian lengkap:
   *    - installationType harus dipilih ('baseplate' atau 'embedment')
   *    - jika baseplate -> lowestHeightPosition harus dipilih ('onGL' atau 'underGL')
   *    - jika embedment -> embedmentLength harus diisi angka > 0
   *    - selectedHeight harus dipilih (misal: 8m, 10m, atau 12m)
   */
  const isFormComplete = useMemo(() => {
    // Mode Custom: diizinkan langsung next tanpa spesifikasi standar
    if (!selectedStandard) {
      return true;
    }

    // Mode Standard: seluruh field wajib diisi lengkap
    if (!installationType) return false;

    if (installationType === "baseplate") {
      if (!lowestHeightPosition) return false;
    } else if (installationType === "embedment") {
      if (!embedmentLength || Number(embedmentLength) <= 0) return false;
    }

    if (!selectedHeight) return false;

    return true;
  }, [
    selectedStandard,
    installationType,
    lowestHeightPosition,
    embedmentLength,
    selectedHeight,
  ]);

  // ─── 6. EVENT HANDLERS (TOGGLE & VALIDATION GUARD) ──────────────────────────

  /**
   * Pemilihan Tipe Standar Tiang (IS, IA, LS, LA, TS, TA)
   * Mendukung Unselect: Mengklik item yang sedang aktif akan mereset kembali ke kosong.
   */
  const handleSelectStandard = (typeId) => {
    if (selectedStandard === typeId) {
      // Toggle off / unselect: reset seluruh state downstream
      setSelectedStandard("");
      setInstallationType("");
      setLowestHeightPosition("");
      setEmbedmentLength("");
      setSelectedHeight("");
      setInstallationError("");
    } else {
      // Pilih standar baru: bersihkan error validasi dan tinggi sebelumnya
      setSelectedStandard(typeId);
      setSelectedHeight("");
      setInstallationError("");
    }
  };

  /**
   * Pemilihan Tipe Instalasi (Baseplate / Embedment)
   * Guard: Wajib memilih pole standard type terlebih dahulu.
   * Mendukung Unselect: Mengklik item aktif akan mereset instalasi.
   */
  const handleSelectInstallation = (typeId) => {
    if (!selectedStandard) {
      setInstallationError("* Select a pole standard type first.");
      return;
    }
    setInstallationError("");

    if (installationType === typeId) {
      // Toggle off / unselect
      setInstallationType("");
      setLowestHeightPosition("");
      setEmbedmentLength("");
      setSelectedHeight("");
    } else {
      // Pilih instalasi baru
      setInstallationType(typeId);
      setLowestHeightPosition("");
      setEmbedmentLength("");
      setSelectedHeight("");
    }
  };

  /**
   * Pemilihan Posisi Ketinggian Terbawah untuk Baseplate (On GL / Under GL)
   * Mendukung Unselect: Mengklik item aktif akan mereset pilihan posisi.
   */
  const handleSelectPosition = (posId) => {
    if (lowestHeightPosition === posId) {
      // Toggle off / unselect
      setLowestHeightPosition("");
      setSelectedHeight("");
    } else {
      setLowestHeightPosition(posId);
      setSelectedHeight("");
    }
  };

  /**
   * Pemilihan Ketinggian Tiang (8m, 10m, 12m, dll)
   * Mendukung Unselect: Mengklik tinggi aktif akan mereset pilihan tinggi.
   */
  const handleSelectHeight = (heightKey) => {
    if (selectedHeight === heightKey) {
      // Toggle off / unselect
      setSelectedHeight("");
    } else {
      setSelectedHeight(heightKey);
    }
  };

  /**
   * Reset Menyeluruh: Mengembalikan semua state ke kondisi kosong / mati
   */
  const handleReset = () => {
    setSelectedStandard("");
    setInstallationType("");
    setLowestHeightPosition("");
    setEmbedmentLength("");
    setSelectedHeight("");
    setInstallationError("");
  };

  // ─── 7. STEP NAVIGATION & PERSISTENCE ───────────────────────────────────────
  const handleNext = () => {
    const isStandard = Boolean(selectedStandard);

    if (isStandard) {
      // ── MODE STANDARD ──
      const taper =
        STANDARD_POLE_DATA.tapered || STANDARD_POLE_DATA.taper || {};
      const entry =
        taper[selectedStandard]?.[effectiveGroundKey]?.[selectedHeight] || {};

      // Ekstraksi spesifikasi segmen tiang standar
      const rawPoles = entry.poles || [];
      const resolvedPoles = rawPoles.map((p, idx) => ({
        name: p.name || `支柱−${idx + 1}`,
        material: p.material || "STK400",
        poleType: p.poleType || "Taper",
        lowerDiameter: String(p.lowerDiameter || "165"),
        upperDiameter: String(p.upperDiameter || "85"),
        lowerThickness: String(p.lowerThickness || "4"),
        upperThickness: String(p.upperThickness || "4"),
        zHeight: String(p.zHeight || Number(selectedHeight) * 1000),
        quantity: String(p.quantity || "1"),
      }));

      // Ekstraksi spesifikasi beban aksesoris / lampu (direct objects)
      const rawDirectObjects = entry.directObjects || [];
      const resolvedDo = rawDirectObjects.map((d) => ({
        name: d.name || "灯具",
        type: d.type || "directional",
        frontArea: String(d.frontArea ?? "0.1"),
        sideArea: String(d.sideArea ?? "0.1"),
        weight: String(d.weight ?? "14"),
        zHeight: String(d.zHeight ?? Number(selectedHeight) * 1000),
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

      // Simpan konfigurasi lengkap standar ke sessionStorage untuk tahap kalkulasi struktural
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
      sessionStorage.setItem("lighting-project_arms", JSON.stringify(rawArms));
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
      // ── MODE CUSTOM ──
      // Default parameter awal untuk spesifikasi custom manual
      sessionStorage.setItem("projectType", "lighting-project");
      sessionStorage.setItem("projectMode", "calculation");
      sessionStorage.setItem(
        "lighting-project_condition",
        JSON.stringify({
          designStandard: "old_lighting_pole",
          designWindSpeed: "60",
          designAirDensity: "1.23",
          poleType: "custom",
          installationPole: installationType || "baseplate",
          openingEnabled: true,
          baseplateEnabled: installationType !== "embedment",
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
          lowestHeight:
            installationType === "embedment" ? embedmentLength || "0" : "0",
          overDesign: "1",
        }),
      );
    }

    navigate("/project-tools/structural");
  };

  // ─── 8. JSX RENDER VIEW ─────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <Helmet>
        <title>Pole Type Configuration · KORI BALI</title>
      </Helmet>

      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
          Pole type configuration
        </h1>
        <p className="text-gray-500 mt-1 text-xs md:text-sm">
          Choose a road lighting pole standard to apply its predefined
          specifications.
        </p>
      </div>

      {/* Informational Wireframe Banner */}
      <div className="mb-6 px-4 py-2.5 rounded border border-gray-300 bg-gray-50 text-gray-700 text-xs md:text-sm flex items-center justify-between">
        <p>
          If not using a Road Lighting Pole standard, click{" "}
          <span className="font-bold text-gray-900">NEXT</span> to enter
          specifications manually.
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
              {standardTypes.map((type) => {
                const isSelected = selectedStandard === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleSelectStandard(type.id)}
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
                    onClick={() => handleSelectInstallation(item.id)}
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
            {/* Validation Warning Hint */}
            {installationError && (
              <p className="text-xs text-red-600 font-medium mt-2">
                {installationError}
              </p>
            )}
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
                      onClick={() => handleSelectPosition(pos.id)}
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
                  placeholder="e.g. 1800"
                  className="w-full pl-3 pr-12 py-2 rounded border border-gray-300 text-xs md:text-sm outline-none focus:border-gray-900 bg-white text-gray-900"
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
            ) : !installationType ? (
              <div className="w-full bg-gray-50 border border-gray-200 rounded px-4 py-3 text-xs md:text-sm text-gray-400 italic">
                Select an installation type first.
              </div>
            ) : installationType === "baseplate" && !lowestHeightPosition ? (
              <div className="w-full bg-gray-50 border border-gray-200 rounded px-4 py-3 text-xs md:text-sm text-gray-400 italic">
                Select lowest height position first.
              </div>
            ) : availableHeights.length === 0 ? (
              <div className="w-full bg-gray-50 border border-gray-200 rounded px-4 py-3 text-xs md:text-sm text-gray-400 italic">
                No height options available for this configuration.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableHeights.map((h) => {
                  const isSelected = selectedHeight === h.key;
                  return (
                    <button
                      key={h.key}
                      type="button"
                      onClick={() => handleSelectHeight(h.key)}
                      className={`px-4 py-2 rounded border text-xs md:text-sm font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm font-semibold"
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
            {!selectedStandard || !installationType ? (
              <div className="text-center text-gray-400 text-sm md:text-base font-medium select-none">
                Select a standard to preview the pole.
              </div>
            ) : installationType === "baseplate" && !lowestHeightPosition ? (
              <div className="text-center text-gray-400 text-sm md:text-base font-medium select-none">
                Select lowest height position to preview the pole.
              </div>
            ) : !currentImage ? (
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
          className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 rounded text-xs md:text-sm font-medium cursor-pointer transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5 text-gray-600" />
          <span>Reset</span>
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
  );
}
