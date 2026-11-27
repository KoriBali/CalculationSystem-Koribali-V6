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
        const newTitle = doc.createElementNS("http://www.w3.org/2000/svg", "title");
        newTitle.textContent = "Structural Schematic Preview";
        root.insertBefore(newTitle, root.firstChild);
      }

      // Read coordinate viewBox
      const viewBoxAttr = root.getAttribute("viewBox");
      let minX = 0;
      let minY = 0;
      let vbWidth = 210;
      let vbHeight = 297;
      let hasValidVb = false;

      if (viewBoxAttr) {
        const vb = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
        if (vb.length === 4 && !vb.some(isNaN)) {
          [minX, minY, vbWidth, vbHeight] = vb;
          hasValidVb = true;
        }
      }

      // 1. Remove page header/boilerplate titles if present in SVGs
      const textElements = Array.from(root.querySelectorAll("text"));
      textElements.forEach((el) => {
        const text = (el.textContent || "").trim();
        if (
          text.includes("Pole with Parametric Dimensions") ||
          text.includes("Model units") ||
          text.includes("A4 portrait") ||
          text.includes("仕様略図") ||
          text === "P-2" ||
          text.startsWith("No.")
        ) {
          el.remove();
        }
      });

      // 2. Remove full-canvas background rects and A4 page border frames
      // ("jangan terlihat seperti page juga, jadi pure gambarnya aja")
      const rectElements = Array.from(root.querySelectorAll("rect"));
      rectElements.forEach((el) => {
        if (el.closest("defs, clipPath, marker")) return;
        const wStr = el.getAttribute("width") || "";
        const hStr = el.getAttribute("height") || "";
        if (wStr.includes("%") || hStr.includes("%")) {
          el.remove();
          return;
        }
        const w = parseFloat(wStr);
        const h = parseFloat(hStr);
        if (
          (!isNaN(w) && w >= vbWidth * 0.7 && !isNaN(h) && h >= vbHeight * 0.7) ||
          (!isNaN(w) && w >= vbWidth * 0.88) ||
          (!isNaN(h) && h >= vbHeight * 0.88)
        ) {
          el.remove();
        }
      });

      // 3. Remove page border lines / full-width margin divider lines
      const lineElements = Array.from(root.querySelectorAll("line"));
      lineElements.forEach((el) => {
        if (el.closest("defs, clipPath, marker")) return;
        const x1 = parseFloat(el.getAttribute("x1"));
        const y1 = parseFloat(el.getAttribute("y1"));
        const x2 = parseFloat(el.getAttribute("x2"));
        const y2 = parseFloat(el.getAttribute("y2"));
        if (!isNaN(x1) && !isNaN(x2) && !isNaN(y1) && !isNaN(y2)) {
          const dx = Math.abs(x2 - x1);
          const dy = Math.abs(y2 - y1);
          if (
            dx >= vbWidth * 0.7 &&
            (Math.min(y1, y2) <= minY + 35 || Math.max(y1, y2) >= minY + vbHeight - 35)
          ) {
            el.remove();
          } else if (dy >= vbHeight * 0.7) {
            el.remove();
          }
        }
      });

      // 4. Remove page border rectangle paths
      const pathElements = Array.from(root.querySelectorAll("path"));
      pathElements.forEach((el) => {
        if (el.closest("defs, clipPath, marker")) return;
        const d = el.getAttribute("d") || "";
        const matches = d.match(/[-+]?[0-9]*\.?[0-9]+/g);
        if (matches && matches.length >= 8 && matches.length <= 12) {
          const xs = [];
          const ys = [];
          for (let i = 0; i < matches.length; i += 2) {
            xs.push(parseFloat(matches[i]));
            if (i + 1 < matches.length) ys.push(parseFloat(matches[i + 1]));
          }
          const boxW = Math.max(...xs) - Math.min(...xs);
          const boxH = Math.max(...ys) - Math.min(...ys);
          if (boxW >= vbWidth * 0.7 && boxH >= vbHeight * 0.7) {
            el.remove();
          }
        }
      });

      // 5. Auto-crop excessive empty top and bottom whitespace from the A4 report coordinate space
      if (hasValidVb) {
        let contentMinY = Infinity;
        let contentMaxY = -Infinity;

        const remaining = root.querySelectorAll(
          "path, line, rect, circle, ellipse, text, polyline, polygon"
        );
        remaining.forEach((el) => {
          if (el.closest("defs, clipPath, marker")) return;
          const tag = el.localName.toLowerCase();
          if (tag === "line") {
            const y1 = parseFloat(el.getAttribute("y1"));
            const y2 = parseFloat(el.getAttribute("y2"));
            if (!isNaN(y1)) {
              contentMinY = Math.min(contentMinY, y1);
              contentMaxY = Math.max(contentMaxY, y1);
            }
            if (!isNaN(y2)) {
              contentMinY = Math.min(contentMinY, y2);
              contentMaxY = Math.max(contentMaxY, y2);
            }
          } else if (tag === "rect") {
            const y = parseFloat(el.getAttribute("y"));
            const h = parseFloat(el.getAttribute("height")) || 0;
            if (!isNaN(y)) {
              contentMinY = Math.min(contentMinY, y);
              contentMaxY = Math.max(contentMaxY, y + h);
            }
          } else if (tag === "circle" || tag === "ellipse") {
            const cy = parseFloat(el.getAttribute("cy"));
            const r = parseFloat(el.getAttribute("r") || el.getAttribute("ry") || 0);
            if (!isNaN(cy)) {
              contentMinY = Math.min(contentMinY, cy - r);
              contentMaxY = Math.max(contentMaxY, cy + r);
            }
          } else if (tag === "text") {
            const y = parseFloat(el.getAttribute("y"));
            if (!isNaN(y)) {
              contentMinY = Math.min(contentMinY, y - 5);
              contentMaxY = Math.max(contentMaxY, y + 2);
            }
          } else if (tag === "path") {
            const d = el.getAttribute("d") || "";
            const matches = d.match(/[-+]?[0-9]*\.?[0-9]+/g);
            if (matches && matches.length >= 2) {
              for (let i = 1; i < matches.length; i += 2) {
                const y = parseFloat(matches[i]);
                if (!isNaN(y)) {
                  contentMinY = Math.min(contentMinY, y);
                  contentMaxY = Math.max(contentMaxY, y);
                }
              }
            }
          } else if (tag === "polyline" || tag === "polygon") {
            const pointsAttr = el.getAttribute("points") || "";
            const matches = pointsAttr.match(/[-+]?[0-9]*\.?[0-9]+/g);
            if (matches && matches.length >= 2) {
              for (let i = 1; i < matches.length; i += 2) {
                const y = parseFloat(matches[i]);
                if (!isNaN(y)) {
                  contentMinY = Math.min(contentMinY, y);
                  contentMaxY = Math.max(contentMaxY, y);
                }
              }
            }
          }
        });

        // Trim top and bottom blank whitespace if drawing bounds were detected
        if (contentMinY !== Infinity && contentMaxY !== -Infinity && contentMaxY > contentMinY) {
          const topPadding = 6;
          const bottomPadding = 6;
          const croppedMinY = Math.max(minY, contentMinY - topPadding);
          const croppedMaxY = Math.min(minY + vbHeight, contentMaxY + bottomPadding);
          const newHeight = croppedMaxY - croppedMinY;
          if (newHeight > 20 && newHeight < vbHeight) {
            root.setAttribute("viewBox", `${minX} ${croppedMinY} ${vbWidth} ${newHeight}`);
          }
        }
      }

      // Scaling matching the Report Page (large, clear, and responsive)
      root.setAttribute("width", "100%");
      root.removeAttribute("height");
      root.setAttribute("preserveAspectRatio", "xMidYMid meet");
      root.setAttribute(
        "style",
        "max-height: 245mm; width: 100%; height: auto; max-width: 100%; margin: 0 auto; display: block;"
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
              All structural calculations and engineering checks above remain fully computed and verified.
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
        ) : typeof svg === "string" && (svg.startsWith("/") || svg.startsWith("http")) ? (
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
            <p className="text-xs text-gray-400 mt-1">
              Ensure calculation has completed to view the parametric drawing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SchematicPreviewCard;
