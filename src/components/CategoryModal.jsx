"use client";

import React, { useState, useEffect } from "react";
import { HiXMark, HiOutlineSwatch, HiOutlineSquares2X2 } from "react-icons/hi2";
import CategoryIcon from "@/components/shared/CategoryIcon";
import IconPickerModal from "@/components/shared/IconPickerModal";
import ColorPickerModal from "@/components/shared/ColorPickerModal";

export default function CategoryModal({
  isOpen,
  onClose,
  createCategory,
  updateCategory,
  initialEditCategory = null,
  initialType = "Expense",
}) {
  const isEditing = Boolean(initialEditCategory?.id);

  const [nameInput, setNameInput] = useState("");
  const [kindInput, setKindInput] = useState("expense");
  const [iconKey, setIconKey] = useState("other");
  const [colorInput, setColorInput] = useState("#C88856");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormError("");
    if (initialEditCategory) {
      setNameInput(initialEditCategory.name || "");
      setKindInput(
        String(initialEditCategory.kind || initialEditCategory.type || "expense").toLowerCase() ===
          "income"
          ? "income"
          : "expense",
      );
      setIconKey(
        initialEditCategory.icon_key || initialEditCategory.icon || "other",
      );
      setColorInput(
        initialEditCategory.color || initialEditCategory.color_code || "#C88856",
      );
    } else {
      const normalized =
        String(initialType || "expense").toLowerCase() === "income"
          ? "income"
          : "expense";
      setNameInput("");
      setKindInput(normalized);
      setIconKey(normalized === "income" ? "salary" : "other");
      setColorInput(normalized === "income" ? "#6C7555" : "#C88856");
    }
  }, [initialEditCategory, initialType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setFormError("Category name is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    const payload = {
      name: trimmed,
      kind: kindInput,
      type: kindInput === "income" ? "Income" : "Expense",
      icon_key: iconKey,
      color: colorInput,
    };

    try {
      const res = isEditing
        ? await updateCategory(initialEditCategory.id, payload)
        : await createCategory(payload);

      if (res?.success) {
        onClose?.();
      } else {
        setFormError(res?.error || "Unable to save category.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Edit Category" : "New Category"}
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[28px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] p-6 shadow-2xl space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">
              {isEditing ? "Edit Category" : "New Category"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close category modal"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:bg-[var(--home-track)] cursor-pointer"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="p-3 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-background)] text-xs font-semibold text-[var(--home-destructive)]">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Kind Toggle (locked while editing so linked transactions stay same-kind) */}
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1.5">
                Type
              </span>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[22px] bg-[var(--home-track)] border border-[var(--home-border)]">
                {[
                  { id: "expense", label: "Expense" },
                  { id: "income", label: "Income" },
                ].map((tab) => {
                  const active = kindInput === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      disabled={isEditing}
                      onClick={() => {
                        setKindInput(tab.id);
                        if (!isEditing) {
                          setIconKey(tab.id === "income" ? "salary" : "other");
                        }
                      }}
                      className={`py-2 rounded-[18px] text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed ${
                        active
                          ? tab.id === "income"
                            ? "bg-[var(--home-income)] text-white shadow-xs"
                            : "bg-[var(--home-expense)] text-white shadow-xs"
                          : "text-[var(--home-text-secondary)]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview + Icon & Color Triggers */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIconPickerOpen(true)}
                className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)] hover:border-[var(--home-accent)] transition-colors text-left cursor-pointer"
              >
                <CategoryIcon
                  iconKey={iconKey}
                  color={colorInput}
                  size={20}
                  withBadge
                  badgeSize={38}
                />
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-text-muted)] block">
                    Icon
                  </span>
                  <span className="text-xs font-bold inline-flex items-center gap-1">
                    <HiOutlineSquares2X2 className="w-3.5 h-3.5" />
                    <span>Choose</span>
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setColorPickerOpen(true)}
                className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)] hover:border-[var(--home-accent)] transition-colors text-left cursor-pointer"
              >
                <span
                  className="w-9 h-9 rounded-full border border-black/15 shrink-0"
                  style={{ backgroundColor: colorInput }}
                />
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-text-muted)] block">
                    Color
                  </span>
                  <span className="text-xs font-mono-num font-bold inline-flex items-center gap-1">
                    <HiOutlineSwatch className="w-3.5 h-3.5" />
                    <span>{colorInput}</span>
                  </span>
                </div>
              </button>
            </div>

            <div>
              <label
                htmlFor="cat-name-input"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
              >
                Category Name
              </label>
              <input
                id="cat-name-input"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g., Coffee, Freelance, Subscriptions"
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
                disabled={isSubmitting}
                className="flex-[2] py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isSubmitting
                  ? "Saving…"
                  : isEditing
                    ? "Save Category"
                    : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <IconPickerModal
        open={iconPickerOpen}
        selectedIconKey={iconKey}
        onSelect={setIconKey}
        onClose={() => setIconPickerOpen(false)}
        title="Choose Category Icon"
      />

      <ColorPickerModal
        open={colorPickerOpen}
        initialColor={colorInput}
        onSelect={setColorInput}
        onClose={() => setColorPickerOpen(false)}
      />
    </>
  );
}
