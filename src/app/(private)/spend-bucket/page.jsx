"use client";

import React, { useState, useEffect } from "react";
import { SkeletonHero, SkeletonGrid } from "@/components/shared/Skeleton";
import Link from "next/link";
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
  HiOutlineArchiveBox,
  HiOutlineInformationCircle,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineBars3,
  HiOutlineArrowUp,
  HiOutlineArrowDown,
  HiXMark,
} from "react-icons/hi2";
import useAccounts from "@/hooks/useAccounts";
import useBuckets from "@/hooks/useBuckets";
import { formatMoney } from "@/utils/currencies";
import CategoryIcon from "@/components/shared/CategoryIcon";
import ProportionalBar from "@/components/shared/ProportionalBar";
import BucketFormModal from "@/components/buckets/BucketFormModal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import EmptyStateCard from "@/components/shared/EmptyStateCard";

const TIP_DISMISSED_KEY = "spendscope_buckets_tip_dismissed";

function SortableBucketCard({
  bucket,
  index,
  total,
  currencyCode,
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
  } = useSortable({ id: bucket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  const funded = Number(bucket.fund_amount) || 0;
  const spent = Number(bucket.expense_amount) || 0;
  const left = Math.round((funded - spent) * 100) / 100;
  const totalFlow = funded + spent;
  const fundPct = totalFlow > 0 ? Math.round((funded / totalFlow) * 100) : 50;
  const spentPct = totalFlow > 0 ? 100 - fundPct : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 transition-colors hover:border-[var(--home-accent)]/60 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            aria-label={`Drag to reorder ${bucket.name}`}
            {...attributes}
            {...listeners}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-grab active:cursor-grabbing shrink-0"
          >
            <HiOutlineBars3 className="w-4 h-4" />
          </button>

          <Link
            href={`/spend-bucket/${bucket.id}`}
            className="flex items-center gap-3 min-w-0 group"
          >
            <CategoryIcon
              iconKey={bucket.image_key || "house_bucket"}
              color="var(--home-accent)"
              size={20}
              withBadge
              badgeSize={44}
            />
            <div className="min-w-0">
              <h3 className="font-display text-lg text-[var(--home-text)] truncate group-hover:text-[var(--home-accent)] transition-colors">
                {bucket.name}
              </h3>
              <p className="text-xs text-[var(--home-text-muted)]">
                Open bucket details →
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label={`Move ${bucket.name} up`}
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] disabled:opacity-30 cursor-pointer"
          >
            <HiOutlineArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Move ${bucket.name} down`}
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] disabled:opacity-30 cursor-pointer"
          >
            <HiOutlineArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Edit ${bucket.name}`}
            onClick={() => onEdit(bucket)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${bucket.name}`}
            onClick={() => onDelete(bucket)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-destructive)] hover:bg-[var(--home-track)] cursor-pointer"
          >
            <HiOutlineTrash className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Link href={`/spend-bucket/${bucket.id}`} className="block space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl p-2.5 bg-[var(--home-income-soft)]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--home-income)] block">
              Funded
            </span>
            <span className="font-mono-num font-bold text-[var(--home-income)]">
              {formatMoney(funded, currencyCode)}
            </span>
          </div>
          <div
            className="rounded-xl p-2.5"
            style={{ backgroundColor: "var(--add-operator-key-bg)" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--home-expense)] block">
              Spent
            </span>
            <span className="font-mono-num font-bold text-[var(--home-expense)]">
              {formatMoney(spent, currencyCode)}
            </span>
          </div>
          <div className="rounded-xl p-2.5 bg-[var(--home-background)] border border-[var(--home-border)]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--home-text-muted)] block">
              Left
            </span>
            <span
              className={`font-mono-num font-bold ${
                left < 0
                  ? "text-[var(--home-destructive)]"
                  : "text-[var(--home-text)]"
              }`}
            >
              {formatMoney(left, currencyCode)}
            </span>
          </div>
        </div>

        <ProportionalBar leftPct={fundPct} rightPct={spentPct} height={8} />
      </Link>
    </div>
  );
}

export default function SpendBucketPage() {
  const { activeAccount, loading: accountsLoading } = useAccounts();
  const currencyCode = activeAccount?.currency_code || "INR";

  const {
    buckets,
    summary,
    loading: bucketsLoading,
    createBucket,
    updateBucket,
    deleteBucket,
    reorderBuckets,
  } = useBuckets();

  const loading = bucketsLoading || accountsLoading;
  const [tipDismissed, setTipDismissed] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBucket, setEditingBucket] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(TIP_DISMISSED_KEY) === "1") {
        setTipDismissed(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = buckets.findIndex((b) => b.id === active.id);
    const newIndex = buckets.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(buckets, oldIndex, newIndex).map((b) => b.id);
    await reorderBuckets(reordered);
  };

  const handleMoveStep = async (index, delta) => {
    const nextIdx = index + delta;
    if (nextIdx < 0 || nextIdx >= buckets.length) return;
    const reordered = arrayMove(buckets, index, nextIdx).map((b) => b.id);
    await reorderBuckets(reordered);
  };

  const handleSaveBucket = async (payload) => {
    if (payload.id) {
      return await updateBucket(payload.id, {
        name: payload.name,
        imageKey: payload.imageKey,
      });
    }
    return await createBucket({
      name: payload.name,
      imageKey: payload.imageKey,
    });
  };

  const totalFlow = summary.totalFunded + summary.totalSpent;
  const aggLeftPct =
    totalFlow > 0 ? Math.round((summary.totalFunded / totalFlow) * 100) : 50;
  const aggRightPct = totalFlow > 0 ? 100 - aggLeftPct : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-2xl sm:text-3xl text-[var(--home-text)]">
            Spend Buckets
          </h1>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            aria-label="How Spend Buckets work"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
          >
            <HiOutlineInformationCircle className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingBucket(null);
            setFormOpen(true);
          }}
          className="h-10 px-5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <HiPlus className="w-4 h-4" />
          <span>New Bucket</span>
        </button>
      </div>

      {/* Dismissible Tip Card */}
      {!tipDismissed && (
        <div className="rounded-[22px] border border-[var(--home-border)] bg-[var(--home-card)] p-4 flex items-start justify-between gap-3">
          <div className="text-xs sm:text-sm text-[var(--home-text-secondary)] leading-relaxed">
            <strong className="text-[var(--home-text)]">Goal envelopes:</strong>{" "}
            Track dedicated goals (e.g., Travel, House, Emergency) independently from your main account ledger. Drag cards to reorder priorities.
          </div>
          <button
            type="button"
            onClick={() => {
              setTipDismissed(true);
              try {
                localStorage.setItem(TIP_DISMISSED_KEY, "1");
              } catch {
                // Ignore
              }
            }}
            aria-label="Dismiss tip"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:bg-[var(--home-track)] shrink-0 cursor-pointer"
          >
            <HiXMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Aggregate Summary Card */}
      {loading ? (
        <SkeletonHero />
      ) : (
      <section className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--home-text-muted)] block mb-1">
              Left Across Buckets
            </span>
            <p className="font-display text-3xl text-[var(--home-text)] tabular-nums">
              {formatMoney(summary.leftAcrossBuckets, currencyCode)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className="rounded-2xl p-3 bg-[var(--home-income-soft)] border border-[var(--home-border)]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-income)] block">
                Total Funded
              </span>
              <span className="font-mono-num text-sm sm:text-base font-bold text-[var(--home-income)]">
                {formatMoney(summary.totalFunded, currencyCode)}
              </span>
            </div>
            <div
              className="rounded-2xl p-3 border border-[var(--home-border)]"
              style={{ backgroundColor: "var(--add-operator-key-bg)" }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-expense)] block">
                Total Spent
              </span>
              <span className="font-mono-num text-sm sm:text-base font-bold text-[var(--home-expense)]">
                {formatMoney(summary.totalSpent, currencyCode)}
              </span>
            </div>
          </div>
        </div>
        <ProportionalBar leftPct={aggLeftPct} rightPct={aggRightPct} height={10} />
      </section>
      )}

      {/* Buckets List */}
      {loading ? (
        <SkeletonGrid
          items={4}
          label="Loading buckets"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          itemClassName="h-36"
        />
      ) : buckets.length === 0 ? (
        <EmptyStateCard
          icon={<HiOutlineArchiveBox className="w-6 h-6" />}
          title="No spend buckets yet"
          description="Create your first goal bucket to fund and track dedicated trips, upgrades, or sinking funds."
          actionLabel="Create First Bucket"
          onAction={() => {
            setEditingBucket(null);
            setFormOpen(true);
          }}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={buckets.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {buckets.map((bucket, idx) => (
                <SortableBucketCard
                  key={bucket.id}
                  bucket={bucket}
                  index={idx}
                  total={buckets.length}
                  currencyCode={currencyCode}
                  onEdit={(b) => {
                    setEditingBucket(b);
                    setFormOpen(true);
                  }}
                  onDelete={(b) => setDeleteTarget(b)}
                  onMove={handleMoveStep}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Info Dialog */}
      {infoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="About Spend Buckets"
          className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setInfoOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-[var(--home-border)] bg-[var(--home-card)] p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl text-[var(--home-text)]">
              How Spend Buckets Work
            </h3>
            <p className="text-xs sm:text-sm text-[var(--home-text-secondary)] leading-relaxed">
              Each bucket acts like a dedicated envelope (e.g., Vacation, Car Maintenance, Wedding). Add <strong>Fund</strong> entries when setting money aside and <strong>Expense</strong> entries as you spend from that envelope. Bucket entries stay separate from your monthly Spending Overview so one-off goals never skew daily budgets.
            </p>
            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              className="w-full py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <BucketFormModal
        open={formOpen}
        initialBucket={editingBucket}
        onSave={handleSaveBucket}
        onClose={() => {
          setFormOpen(false);
          setEditingBucket(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete "${deleteTarget?.name || "Bucket"}"?`}
        description="This permanently deletes the bucket and all fund/expense entries inside it."
        confirmLabel="Delete Bucket"
        destructive
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            await deleteBucket(deleteTarget.id);
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
