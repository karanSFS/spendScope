"use client";

import React, { useState, useEffect } from "react";
import { HiXMark } from "react-icons/hi2";
import { BUCKET_PRESET_ICONS } from "@/lib/defaultSeeds";
import CategoryIcon from "@/components/shared/CategoryIcon";
import IconPickerModal from "@/components/shared/IconPickerModal";

export default function BucketFormModal({
  open,
  initialBucket = null,
  onSave,
  onClose,
}) {
  const isEditing = Boolean(initialBucket?.id);
  const [name, setName] = useState("");
  const [imageKey, setImageKey] = useState("house_bucket");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (initialBucket) {
      setName(initialBucket.name || "");
      setImageKey(initialBucket.image_key || "house_bucket");
    } else {
      setName("");
      setImageKey("house_bucket");
    }
  }, [open, initialBucket]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Bucket name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await onSave?.({
        id: initialBucket?.id || null,
        name: name.trim(),
        imageKey,
      });
      if (res?.success === false) {
        setError(res.error || "Unable to save bucket.");
        return;
      }
      onClose?.();
    } catch (err) {
      setError(err?.message || "Unable to save bucket.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Edit Spend Bucket" : "Create Spend Bucket"}
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[28px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] p-6 shadow-2xl space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">
              {isEditing ? "Edit Spend Bucket" : "New Spend Bucket"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close bucket modal"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-background)] text-xs font-semibold text-[var(--home-destructive)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Icon selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)]">
                  Bucket Icon
                </span>
                <button
                  type="button"
                  onClick={() => setIconPickerOpen(true)}
                  className="text-xs font-semibold text-[var(--home-accent)] hover:underline cursor-pointer"
                >
                  Browse all 96 icons →
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {BUCKET_PRESET_ICONS.map((icon) => {
                  const selected = icon === imageKey;
                  return (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setImageKey(icon)}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                        selected
                          ? "border-[var(--home-accent)] bg-[var(--home-track)] scale-105"
                          : "border-[var(--home-border)] bg-[var(--home-background)]"
                      }`}
                    >
                      <CategoryIcon
                        iconKey={icon}
                        color={selected ? "var(--home-accent)" : "var(--home-text)"}
                        size={20}
                      />
                    </button>
                  );
                })}
                {!BUCKET_PRESET_ICONS.includes(imageKey) && (
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center border border-[var(--home-accent)] bg-[var(--home-track)]">
                    <CategoryIcon
                      iconKey={imageKey}
                      color="var(--home-accent)"
                      size={20}
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="bucket-name"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
              >
                Bucket Name
              </label>
              <input
                id="bucket-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Goa Trip, Wedding Fund, Car Repairs"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm focus:outline-none focus:border-[var(--home-accent)]"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-[2] py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving…" : isEditing ? "Save Bucket" : "Create Bucket"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <IconPickerModal
        open={iconPickerOpen}
        selectedIconKey={imageKey}
        onSelect={setImageKey}
        onClose={() => setIconPickerOpen(false)}
        title="Choose Bucket Icon"
      />
    </>
  );
}
