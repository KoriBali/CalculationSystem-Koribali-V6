import React, { useMemo } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { validateSvg } from "../../utils/schematicValidator";
import "../../../report/styles/report.css";

/**
 * SchematicPreviewCard
 * Displays pure vector schematic drawing below the calculation results table on StructuralPage.
 * Clean, tight preview view without artificial document margins or bloated whitespace.
 */
export function SchematicPreviewCard({
  svg,
  isGenerating = false,
  isReady = true,
  isSupported = true,
  unsupportedMessage = null,
}) {
  // Validate, parse, and auto-crop SVG markup for a tight, high-clarity preview
  const sanitizedSvgContent = useMemo(() => {
    if (!svg || typeof svg !== "string" || !svg.includes("<svg")) return null;
    try {
      let clean = svg;
      try {
        clean = validateSvg(svg);
      } catch (vErr) {
        clean = svg
          .replace(/<\?xml[^>]*\?>/gi, "")
          .replace(/<!DOCTYPE[^>]*>/gi, "")
          .trim();
      }
      const doc = new DOMParser().parseFromString(clean, "image/svg+xml");
      const root = doc.documentElement;
      if (doc.querySelector("parsererror") || root.localName !== "svg") {
        return null;
      }

      // Ensure proper title in English
      const titleElem = root.querySelector("title");
      if (titleElem) {
        titleElem.textContent = "Structural Schematic Preview";
      } else {
        const newTitle = doc.createElementNS(
          "http://www.w3.org/2000/svg",
          "title",
        );
        newTitle.textContent = "Structural Schematic Preview";
        root.insertBefore(newTitle, root.firstChild);
      }

      // Remove unwanted page header text if present in cached/legacy SVGs
      const textElements = Array.from(root.querySelectorAll("text"));
      textElements.forEach((el) => {
        const text = (el.textContent || "").trim();
        if (
          text.includes("Pole with Parametric Dimensions") ||
          text.includes("Model units: mm | A4 portrait") ||
          text.includes("仕様略図") ||
          text === "P-2" ||
          text.startsWith("No.")
        ) {
          el.remove();
        }
      });

      // Remove full-page background rect if any (keep all drawing and dimension elements intact)
      const bgRect = root.querySelector(
        "rect[width='100%'][height='100%'], rect[width='210'][height='297']",
      );
      if (bgRect) bgRect.remove();

      // Ensure proper scaling and display with pure vector fidelity
      root.setAttribute("width", "100%");
      root.removeAttribute("height");
      root.setAttribute("preserveAspectRatio", "xMidYMid meet");
      root.setAttribute(
        "style",
        "max-height: 245mm; width: 100%; height: auto; max-width: 100%; margin: 0 auto; display: block;",
      );
      return new XMLSerializer().serializeToString(root);
    } catch (err) {
      console.error("[SchematicPreviewCard] Failed to parse SVG:", err);
      return null;
    }
  }, [svg]);

  return (
    <div className="bg-white rounded border border-gray-300 overflow-hidden">
      {/* ── Header (Matches Calculation Results header design) ── */}
      <div className="px-6 py-4 hp:px-4 hp:py-3 flex items-center gap-3 hp:gap-2 border-b border-gray-200">
        <div className="bg-gray-100 p-2 hp:p-1.5 rounded shrink-0 border border-gray-200">
          <CheckCircle2 className="w-5 h-5 text-gray-800" />
        </div>
        <div>
          <h2 className="text-gray-900 text-sm hp:text-xs font-semibold">
            Structural Schematic Preview
          </h2>
        </div>
      </div>

      {/* ── Schematic Drawing Content (Pure Vector Drawing, Tight Gap) ── */}
      <div className="py-3 px-2 sm:py-4 sm:px-4 bg-white flex items-start justify-center overflow-x-auto">
        {!isSupported ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 max-w-lg mx-auto text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1.5">
              Schematic Preview Unavailable
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              {unsupportedMessage ||
                "The structural schematic drawing engine currently supports configurations up to 3 pole segments. Full schematic visualization for 4+ segments will be supported in an upcoming update."}
            </p>
            <p className="text-[11px] text-gray-400 mt-2">
              All structural calculations and engineering checks above remain
              fully computed and verified.
            </p>
          </div>
        ) : isGenerating && !sanitizedSvgContent ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-semibold text-gray-700">
              Generating schematic preview...
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Rendering parametric CAD lines and dimensions
            </p>
          </div>
        ) : sanitizedSvgContent ? (
          <div className="w-full max-w-[720px] mx-auto flex items-start justify-center schematic-svg-container">
            <div
              className="w-full flex items-start justify-center schematic-svg-inner"
              dangerouslySetInnerHTML={{ __html: sanitizedSvgContent }}
            />
          </div>
        ) : typeof svg === "string" &&
          (svg.startsWith("/") || svg.startsWith("http")) ? (
          <div className="w-full max-w-[720px] mx-auto flex items-start justify-center">
            <img
              src={svg}
              alt="Structural Schematic Preview"
              className="max-h-[245mm] max-w-full mx-auto object-contain block"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-center max-w-md">
            <AlertCircle className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-600">
              Schematic preview is being prepared...
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Ensure calculation has completed to view the parametric drawing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SchematicPreviewCard;
