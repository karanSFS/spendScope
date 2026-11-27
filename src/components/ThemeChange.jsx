"use client";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  changePrimaryColor,
  changeTheme,
  resetThemeAccent,
} from "@/redux/slices/themeSlice";
import { saveAppearancePreference } from "@/services/preferencesService";
import { ACCENT_PRESETS } from "@/utils/theme";
import { HiXMark, HiSun, HiMoon, HiArrowPath } from "react-icons/hi2";

const ThemeChange = ({ handleClose }) => {
  const dispatch = useDispatch();
  const userId = useSelector((state) => state?.authSlice?.userId) || null;
  const themeState = useSelector((state) => state?.themeSlice);
  const isDark = themeState?.mode === "dark";
  const customAccent = themeState?.customAccent || null;

  const persistAppearance = (nextMode, nextAccent) => {
    saveAppearancePreference(userId, {
      appearanceMode: nextMode,
      accentColor: nextAccent,
    }).catch(() => {});
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[1px]"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-label="Appearance & Accent Palette"
        className="fixed top-16 right-4 sm:right-6 z-[9999] w-[272px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] p-4 shadow-xl"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold tracking-tight">Appearance</span>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close theme selector"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] transition-colors cursor-pointer"
          >
            <HiXMark className="w-4 h-4" />
          </button>
        </div>

        {/* Light / Dark segmented switch */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--home-track)] mb-3.5">
          <button
            type="button"
            onClick={() => {
              dispatch(changeTheme("light"));
              persistAppearance("light", customAccent);
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              !isDark
                ? "bg-[var(--home-card)] text-[var(--home-text)] shadow-xs"
                : "text-[var(--home-text-secondary)] hover:text-[var(--home-text)]"
            }`}
          >
            <HiSun className="w-3.5 h-3.5" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch(changeTheme("dark"));
              persistAppearance("dark", customAccent);
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isDark
                ? "bg-[var(--home-card)] text-[var(--home-text)] shadow-xs"
                : "text-[var(--home-text-secondary)] hover:text-[var(--home-text)]"
            }`}
          >
            <HiMoon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
        </div>

        {/* Optional Accent Swatches */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-text-muted)]">
            Accent Override
          </span>
          {customAccent && (
            <button
              type="button"
              onClick={() => {
                dispatch(resetThemeAccent());
                persistAppearance(isDark ? "dark" : "light", null);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--home-accent)] hover:underline cursor-pointer"
            >
              <HiArrowPath className="w-3 h-3" />
              <span>Default</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((color) => {
            const isSelected =
              customAccent?.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => {
                  dispatch(changePrimaryColor(color));
                  persistAppearance(isDark ? "dark" : "light", color);
                }}
                title={color}
                aria-label={`Select accent color ${color}`}
                className={`w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110 border ${
                  isSelected
                    ? "ring-2 ring-offset-2 ring-[var(--home-text)] border-white"
                    : "border-black/15 dark:border-white/15"
                }`}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
      </div>
    </>
  );
};

export default ThemeChange;
