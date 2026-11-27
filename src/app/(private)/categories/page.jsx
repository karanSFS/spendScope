"use client";

import React, { useState, useMemo } from "react";
import { SkeletonGrid } from "@/components/shared/Skeleton";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  HiPlus,
  HiOutlineBars3,
  HiOutlineArrowUp,
  HiOutlineArrowDown,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import useCategories from "@/hooks/useCategories";
import CategoryIcon from "@/components/shared/CategoryIcon";
import CategoryModal from "@/components/CategoryModal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import EmptyStateCard from "@/components/shared/EmptyStateCard";

function SortableCategoryRow({
  category,
  index,
  total,
  linkedCount,
  onEdit,
  onDelete,
  onMove,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="min-h-[64px] px-4 py-3 rounded-[20px] border border-[var(--home-border)] bg-[var(--home-card)] flex items-center justify-between gap-3 hover:border-[var(--home-accent)]/60 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          aria-label={`Drag to reorder ${category.name}`}
          {...attributes}
          {...listeners}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-grab active:cursor-grabbing shrink-0"
        >
          <HiOutlineBars3 className="w-4 h-4" />
        </button>

        <CategoryIcon
          iconKey={category.icon_key || category.icon || "other"}
          color={category.color || category.color_code || "#C88856"}
          size={18}
          withBadge
          badgeSize={40}
        />

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[var(--home-text)] truncate">
              {category.name}
            </span>
            {category.is_default && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--home-track)] text-[var(--home-text-muted)]">
                Default
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block border border-black/10"
              style={{
                backgroundColor:
                  category.color || category.color_code || "#C88856",
              }}
            />
            <span className="font-mono-num text-[11px] text-[var(--home-text-muted)]">
              {(category.color || category.color_code || "#C88856").toUpperCase()}
            </span>
            {linkedCount > 0 && (
              <span className="text-[11px] text-[var(--home-text-secondary)] font-semibold">
                · {linkedCount} {linkedCount === 1 ? "tx" : "txs"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          aria-label={`Move ${category.name} up`}
          disabled={index === 0}
          onClick={() => onMove(index, -1)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] disabled:opacity-30 cursor-pointer"
        >
          <HiOutlineArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Move ${category.name} down`}
          disabled={index === total - 1}
          onClick={() => onMove(index, 1)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] disabled:opacity-30 cursor-pointer"
        >
          <HiOutlineArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Edit ${category.name}`}
          onClick={() => onEdit(category)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
        >
          <HiOutlinePencilSquare className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${category.name}`}
          onClick={() => onDelete(category)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-destructive)] hover:bg-[var(--home-track)] cursor-pointer"
        >
          <HiOutlineTrash className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const {
    categories,
    linkedCounts,
    loading,
    createCategory,
    updateCategory,
    reorderCategories,
    deleteCategory,
  } = useCategories();

  const [activeKind, setActiveKind] = useState("expense"); // "expense" | "income"
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const [bannerNotice, setBannerNotice] = useState("");

  const activeList = useMemo(
    () =>
      categories
        .filter((c) => (c.kind || "expense").toLowerCase() === activeKind)
        .sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
    [categories, activeKind],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activeList.findIndex((c) => c.id === active.id);
    const newIndex = activeList.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(activeList, oldIndex, newIndex).map((c) => c.id);
    await reorderCategories(reordered);
  };

  const handleMoveStep = async (index, delta) => {
    const nextIdx = index + delta;
    if (nextIdx < 0 || nextIdx >= activeList.length) return;
    const reordered = arrayMove(activeList, index, nextIdx).map((c) => c.id);
    await reorderCategories(reordered);
  };

  const deleteTargetCount = deleteTarget
    ? linkedCounts[deleteTarget.id] || 0
    : 0;
  const isDeleteTargetOtherWithTxs =
    deleteTarget &&
    String(deleteTarget.name || "").trim().toLowerCase() === "other" &&
    deleteTargetCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-[var(--home-text)]">
            Categories
          </h1>
          <p className="text-xs sm:text-sm text-[var(--home-text-secondary)]">
            Customize icons, RGB/Grid/Spectrum colors, and drag to reorder Expense &amp; Income categories.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCat(null);
            setModalOpen(true);
          }}
          className="h-10 px-5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <HiPlus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Expense / Income Pill Switch */}
      <div
        role="tablist"
        aria-label="Category type"
        className="grid grid-cols-2 max-w-xs gap-1.5 p-1 rounded-[22px] bg-[var(--home-track)] border border-[var(--home-border)]"
      >
        {[
          { id: "expense", label: "Expense" },
          { id: "income", label: "Income" },
        ].map((tab) => {
          const active = activeKind === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => {
                setActiveKind(tab.id);
                setBannerError("");
                setBannerNotice("");
              }}
              className={`py-2 px-4 rounded-[18px] text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                active
                  ? "bg-[var(--home-card)] text-[var(--home-text)] shadow-xs"
                  : "text-[var(--home-text-secondary)] hover:text-[var(--home-text)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {bannerError && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-card)] text-xs font-semibold text-[var(--home-destructive)] flex items-center gap-2"
        >
          <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0" />
          <span>{bannerError}</span>
        </div>
      )}

      {bannerNotice && (
        <div className="p-3.5 rounded-2xl border border-[var(--home-income)]/40 bg-[var(--home-income-soft)] text-xs font-semibold text-[var(--home-income)]">
          {bannerNotice}
        </div>
      )}

      {loading ? (
        <SkeletonGrid
          items={8}
          label="Loading categories"
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          itemClassName="h-[72px]"
        />
      ) : activeList.length === 0 ? (
        <EmptyStateCard
          title={`No ${activeKind} categories`}
          description="Create a custom category to organize your spending or income entries."
          actionLabel="Add Category"
          onAction={() => {
            setEditingCat(null);
            setModalOpen(true);
          }}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activeList.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeList.map((cat, idx) => (
                <SortableCategoryRow
                  key={cat.id}
                  category={cat}
                  index={idx}
                  total={activeList.length}
                  linkedCount={linkedCounts[cat.id] || 0}
                  onEdit={(c) => {
                    setEditingCat(c);
                    setModalOpen(true);
                  }}
                  onDelete={(c) => {
                    setBannerError("");
                    setBannerNotice("");
                    setDeleteTarget(c);
                  }}
                  onMove={handleMoveStep}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <CategoryModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCat(null);
        }}
        createCategory={createCategory}
        updateCategory={updateCategory}
        initialEditCategory={editingCat}
        initialType={activeKind === "income" ? "Income" : "Expense"}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={
          isDeleteTargetOtherWithTxs
            ? `Cannot Delete "${deleteTarget?.name}"`
            : `Delete "${deleteTarget?.name || "Category"}"?`
        }
        description={
          isDeleteTargetOtherWithTxs
            ? `"Other" currently holds ${deleteTargetCount} transaction(s). Reassign or delete those transactions first.`
            : deleteTargetCount > 0
              ? `${deleteTargetCount} transaction(s) use "${deleteTarget?.name}". Deleting it will move them to same-kind "Other".`
              : "This permanently removes this category."
        }
        confirmLabel={
          isDeleteTargetOtherWithTxs
            ? "Got it"
            : deleteTargetCount > 0
              ? "Reassign & Delete"
              : "Delete Category"
        }
        destructive={!isDeleteTargetOtherWithTxs}
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          if (isDeleteTargetOtherWithTxs) {
            setDeleteTarget(null);
            return;
          }
          setDeleting(true);
          try {
            const res = await deleteCategory(deleteTarget.id);
            if (!res?.success) {
              setBannerError(res?.error || "Unable to delete category.");
            } else if (res.reassignedCount > 0) {
              setBannerNotice(
                `Deleted "${deleteTarget.name}" and reassigned ${res.reassignedCount} transaction(s) to "Other".`,
              );
            }
            setDeleteTarget(null);
          } finally {
            setDeleting(false);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
