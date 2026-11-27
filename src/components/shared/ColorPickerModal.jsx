"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { HiXMark, HiCheck } from "react-icons/hi2";
import { ANDROID_DEFAULT_CATEGORY_COLORS } from "@/lib/defaultSeeds";

const GRID_HUES = [190, 215, 240, 260, 280, 320, 5, 20, 38, 52, 72, 105];
const GRID_ROWS = 10;
const RECENT_COLORS_KEY = "spendscope_recent_colors";

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

function rgbToHex(r, g, b) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToRgb(hex) {
  const clean = String(hex || "").replace(/^#/, "").trim();
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return [200, 136, 86];
}

function rgbToHsv(r, g, b) {
  const r1 = r / 255;
  const g1 = g / 255;
  const b1 = b / 255;
  const max = Math.max(r1, g1, b1);
  const min = Math.min(r1, g1, b1);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r1) h = ((g1 - b1) / d) % 6;
    else if (max === g1) h = (b1 - r1) / d + 2;
    else h = (r1 - g1) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return [h, s, v];
}

export default function ColorPickerModal({
  open,
  initialColor = "#C88856",
  onSelect,
  onClose,
}) {
  const [mode, setMode] = useState("grid"); // "grid" | "spectrum" | "sliders"
  const [rgb, setRgb] = useState(() => hexToRgb(initialColor));
  const [hexInput, setHexInput] = useState(() =>
    rgbToHex(...hexToRgb(initialColor)),
  );
  const [recentColors, setRecentColors] = useState([]);
  const spectrumRef = useRef(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const nextRgb = hexToRgb(initialColor);
    setRgb(nextRgb);
    setHexInput(rgbToHex(...nextRgb));
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_COLORS_KEY) || "[]");
      if (Array.isArray(saved)) setRecentColors(saved.slice(0, 8));
    } catch {
      setRecentColors([]);
    }
  }, [open, initialColor]);

  const currentHex = useMemo(() => rgbToHex(...rgb), [rgb]);

  // 12x10 Android grid palette
  const gridPalette = useMemo(() => {
    const rows = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      const row = [];
      for (let c = 0; c < GRID_HUES.length; c++) {
        const hue = GRID_HUES[c];
        const ratio = r / (GRID_ROWS - 1);
        const sat = ratio <= 0.45 ? 0.25 + (ratio / 0.45) * 0.65 : 0.95;
        const val = ratio <= 0.45 ? 1.0 : Math.max(0.28, 1.0 - (ratio - 0.45) * 1.25);
        const [rr, gg, bb] = hsvToRgb(hue, sat, val);
        row.push(rgbToHex(rr, gg, bb));
      }
      rows.push(row);
    }
    return rows;
  }, []);

  // Draw Spectrum 2D HSV canvas
  useEffect(() => {
    if (!open || mode !== "spectrum") return;
    const canvas = spectrumRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const yRatio = y / Math.max(1, h - 1);
      const sat = yRatio <= 0.5 ? yRatio * 2 : 1;
      const val = yRatio <= 0.5 ? 1 : Math.max(0.2, 1 - (yRatio - 0.5) * 1.6);
      for (let x = 0; x < w; x++) {
        const hue = (x / Math.max(1, w - 1)) * 360;
        const [rr, gg, bb] = hsvToRgb(hue, sat, val);
        const idx = (y * w + x) * 4;
        img.data[idx] = rr;
        img.data[idx + 1] = gg;
        img.data[idx + 2] = bb;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [open, mode]);

  if (!open) return null;

  const updateFromRgb = (nextRgb) => {
    setRgb(nextRgb);
    setHexInput(rgbToHex(...nextRgb));
  };

  const sampleSpectrum = (e) => {
    const canvas = spectrumRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const hue = (x / Math.max(1, rect.width)) * 360;
    const yRatio = y / Math.max(1, rect.height);
    const sat = yRatio <= 0.5 ? yRatio * 2 : 1;
    const val = yRatio <= 0.5 ? 1 : Math.max(0.2, 1 - (yRatio - 0.5) * 1.6);
    updateFromRgb(hsvToRgb(hue, sat, val));
  };

  const [selH, selS, selV] = rgbToHsv(...rgb);
  const markerLeftPct = Math.max(0, Math.min(100, (selH / 360) * 100));
  const markerTopRatio =
    selS < 0.999 ? selS / 2 : 0.5 + (1 - selV) / 1.6;
  const markerTopPct = Math.max(0, Math.min(100, markerTopRatio * 100));

  const handleConfirm = () => {
    try {
      const nextRecent = [
        currentHex,
        ...recentColors.filter((c) => c.toUpperCase() !== currentHex),
      ].slice(0, 8);
      localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(nextRecent));
    } catch {
      // Ignore storage errors
    }
    onSelect?.(currentHex);
    onClose?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Category Color Picker"
      className="fixed inset-0 z-[10000] bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[28px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] p-5 sm:p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-full border border-black/15 shadow-xs shrink-0"
              style={{ backgroundColor: currentHex }}
            />
            <div>
              <h3 className="font-display text-lg">Category Color</h3>
              <p className="font-mono-num text-xs text-[var(--home-text-muted)]">
                {currentHex}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close color picker"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:bg-[var(--home-track)] cursor-pointer"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs: Grid | Spectrum | Sliders */}
        <div
          role="tablist"
          aria-label="Color picker mode"
          className="grid grid-cols-3 gap-1 p-1 rounded-[22px] bg-[var(--home-track)] border border-[var(--home-border)]"
        >
          {[
            { id: "grid", label: "Grid" },
            { id: "spectrum", label: "Spectrum" },
            { id: "sliders", label: "Sliders" },
          ].map((t) => {
            const active = mode === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setMode(t.id)}
                className={`py-1.5 rounded-[18px] text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-[var(--home-card)] text-[var(--home-text)] shadow-xs"
                    : "text-[var(--home-text-secondary)] hover:text-[var(--home-text)]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Mode 1: 12x10 Color Grid */}
        {mode === "grid" && (
          <div
            className="grid grid-cols-12 rounded-2xl overflow-hidden border border-[var(--home-border)]"
            role="grid"
            aria-label="12x10 Color grid"
          >
            {gridPalette.flatMap((row, rIdx) =>
              row.map((hex, cIdx) => {
                const selected = hex === currentHex;
                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    type="button"
                    aria-label={`Color ${hex}`}
                    onClick={() => updateFromRgb(hexToRgb(hex))}
                    className="h-6 sm:h-7 w-full relative cursor-pointer focus:outline-none"
                    style={{ backgroundColor: hex }}
                  >
                    {selected && (
                      <span className="absolute inset-0 flex items-center justify-center ring-2 ring-inset ring-white">
                        <HiCheck className="w-3.5 h-3.5 text-white drop-shadow" />
                      </span>
                    )}
                  </button>
                );
              }),
            )}
          </div>
        )}

        {/* Mode 2: 2D Spectrum Canvas */}
        {mode === "spectrum" && (
          <div className="relative rounded-2xl overflow-hidden border border-[var(--home-border)] h-[220px] touch-none select-none">
            <canvas
              ref={spectrumRef}
              width={360}
              height={220}
              onPointerDown={(e) => {
                draggingRef.current = true;
                sampleSpectrum(e);
              }}
              onPointerMove={(e) => {
                if (draggingRef.current) sampleSpectrum(e);
              }}
              onPointerUp={() => {
                draggingRef.current = false;
              }}
              onPointerCancel={() => {
                draggingRef.current = false;
              }}
              className="w-full h-full block cursor-crosshair"
            />
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md"
              style={{
                left: `${markerLeftPct}%`,
                top: `${markerTopPct}%`,
                backgroundColor: currentHex,
              }}
            />
          </div>
        )}

        {/* Mode 3: RGB Sliders + #RRGGBB Hex */}
        {mode === "sliders" && (
          <div className="space-y-3 py-1">
            {[
              { label: "Red", idx: 0, accent: "#EF4444" },
              { label: "Green", idx: 1, accent: "#10B981" },
              { label: "Blue", idx: 2, accent: "#3B82F6" },
            ].map((ch) => (
              <div key={ch.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{ch.label}</span>
                  <span className="font-mono-num">{rgb[ch.idx]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={255}
                  aria-label={`${ch.label} channel`}
                  value={rgb[ch.idx]}
                  onChange={(e) => {
                    const next = [...rgb];
                    next[ch.idx] = Number(e.target.value);
                    updateFromRgb(next);
                  }}
                  style={{ accentColor: ch.accent }}
                  className="w-full cursor-pointer"
                />
              </div>
            ))}

            <div>
              <label
                htmlFor="picker-hex-input"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
              >
                Hex Code
              </label>
              <input
                id="picker-hex-input"
                type="text"
                value={hexInput}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setHexInput(val);
                  if (/^#?[0-9A-F]{6}$/.test(val.trim())) {
                    const normalized = val.trim().startsWith("#")
                      ? val.trim()
                      : `#${val.trim()}`;
                    setRgb(hexToRgb(normalized));
                  }
                }}
                placeholder="#C88856"
                className="w-full px-3.5 py-2 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] font-mono-num text-sm focus:outline-none focus:border-[var(--home-accent)]"
              />
            </div>
          </div>
        )}

        {/* Preset + Recent Swatches */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-text-muted)] block">
            Presets {recentColors.length > 0 ? "& Recent" : ""}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(
              new Set([
                ...recentColors,
                ...ANDROID_DEFAULT_CATEGORY_COLORS.map((c) => c.hex.toUpperCase()),
              ]),
            )
              .slice(0, 15)
              .map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Preset ${hex}`}
                  onClick={() => updateFromRgb(hexToRgb(hex))}
                  className={`w-6 h-6 rounded-full border cursor-pointer transition-transform hover:scale-110 ${
                    hex === currentHex
                      ? "ring-2 ring-offset-1 ring-[var(--home-text)] border-white"
                      : "border-black/15"
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-[2] py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer"
          >
            Apply Color
          </button>
        </div>
      </div>
    </div>
  );
}
