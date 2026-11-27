"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  HiPlus,
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
} from "react-icons/hi2";
import useAccounts from "@/hooks/useAccounts";
import { useBucketDetails } from "@/hooks/useBuckets";
import { formatMoney } from "@/utils/currencies";
import CategoryIcon from "@/components/shared/CategoryIcon";
import ProportionalBar from "@/components/shared/ProportionalBar";
import BucketFormModal from "@/components/buckets/BucketFormModal";
import BucketEntryModal from "@/components/buckets/BucketEntryModal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import EmptyStateCard from "@/components/shared/EmptyStateCard";
import {
  Skeleton,
  SkeletonCard,
  SkeletonHero,
  SkeletonList,
} from "@/components/shared/Skeleton";

export default function SingleBucketPage() {
  const params = useParams();
  const bucketId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const { activeAccount } = useAccounts();
  const currencyCode = activeAccount?.currency_code || "INR";

  const {
    bucket,
    entries,
    loading,
    updateBucket,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useBucketDetails(bucketId);

  const [editBucketOpen, setEditBucketOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [defaultEntryKind, setDefaultEntryKind] = useState("expense");
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-40" />
        <SkeletonHero />
        <SkeletonCard className="px-4 sm:px-6 py-2">
          <SkeletonList rows={5} label="Loading bucket entries" />
        </SkeletonCard>
      </div>
    );
  }

  if (!bucket) {
    return (
      <div className="space-y-4">
        <Link
          href="/spend-bucket"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--home-accent)] hover:underline"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          <span>Back to Spend Buckets</span>
        </Link>
        <EmptyStateCard
          title="Bucket not found"
          description="This bucket may have been deleted or does not belong to the active profile."
        />
      </div>
    );
  }

  const funded = Number(bucket.fund_amount) || 0;
  const spent = Number(bucket.expense_amount) || 0;
  const leftToSpend = Math.round((funded - spent) * 100) / 100;
  const totalFlow = funded + spent;
  const leftPct = totalFlow > 0 ? Math.round((funded / totalFlow) * 100) : 50;
  const rightPct = totalFlow > 0 ? 100 - leftPct : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/spend-bucket"
            aria-label="Back to Spend Buckets"
            className="w-10 h-10 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] flex items-center justify-center text-[var(--home-text-secondary)] hover:text-[var(--home-text)] shrink-0"
          >
            <HiOutlineArrowLeft className="w-4 h-4" />
          </Link>
          <CategoryIcon
            iconKey={bucket.image_key || "house_bucket"}
            color="var(--home-accent)"
            size={22}
            withBadge
            badgeSize={46}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl text-[var(--home-text)] truncate">
                {bucket.name}
              </h1>
              <button
                type="button"
                aria-label="Edit bucket"
                onClick={() => setEditBucketOpen(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer shrink-0"
              >
                <HiOutlinePencilSquare className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--home-text-muted)]">
              {entries.length} entries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingEntry(null);
              setDefaultEntryKind("fund");
              setEntryModalOpen(true);
            }}
            className="h-10 px-4 rounded-full bg-[var(--home-income)] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <HiPlus className="w-4 h-4" />
            <span>Add Fund</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingEntry(null);
              setDefaultEntryKind("expense");
              setEntryModalOpen(true);
            }}
            className="h-10 px-4 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <HiPlus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* 3 KPI Cards */}
      <section className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl p-4 bg-[var(--home-income-soft)] border border-[var(--home-border)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-income)] block">
              FUNDED
            </span>
            <span className="font-mono-num text-xl font-bold text-[var(--home-income)]">
              {formatMoney(funded, currencyCode)}
            </span>
          </div>
          <div
            className="rounded-2xl p-4 border border-[var(--home-border)]"
            style={{ backgroundColor: "var(--add-operator-key-bg)" }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-expense)] block">
              SPENT
            </span>
            <span className="font-mono-num text-xl font-bold text-[var(--home-expense)]">
              {formatMoney(spent, currencyCode)}
            </span>
          </div>
          <div className="rounded-2xl p-4 bg-[var(--home-background)] border border-[var(--home-border)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-text-muted)] block">
              LEFT TO SPEND
            </span>
            <span
              className={`font-mono-num text-xl font-bold ${
                leftToSpend < 0
                  ? "text-[var(--home-destructive)]"
                  : "text-[var(--home-text)]"
              }`}
            >
              {formatMoney(leftToSpend, currencyCode)}
            </span>
          </div>
        </div>
        <ProportionalBar leftPct={leftPct} rightPct={rightPct} height={10} />
      </section>

      {/* Entries List */}
      <section className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-3">
        <h2 className="font-display text-lg text-[var(--home-text)]">
          Bucket Entries
        </h2>

        {entries.length === 0 ? (
          <EmptyStateCard
            title="No entries inside this bucket"
            description="Add a Fund entry to set money aside or log an Expense when spending from this bucket."
            actionLabel="Add Fund"
            onAction={() => {
              setEditingEntry(null);
              setDefaultEntryKind("fund");
              setEntryModalOpen(true);
            }}
          />
        ) : (
          <div className="divide-y divide-[var(--home-border)]">
            {entries.map((entry) => {
              const isFund = entry.kind === "fund";
              return (
                <div
                  key={entry.id}
                  className="min-h-[60px] py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isFund
                            ? "bg-[var(--home-income-soft)] text-[var(--home-income)]"
                            : "bg-[var(--home-track)] text-[var(--home-expense)]"
                        }`}
                      >
                        {isFund ? "Fund" : "Expense"}
                      </span>
                      <span className="text-xs text-[var(--home-text-muted)]">
                        {entry.date}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-sm font-medium text-[var(--home-text)] truncate mt-0.5">
                        {entry.note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono-num text-sm font-bold ${
                        isFund
                          ? "text-[var(--home-income)]"
                          : "text-[var(--home-expense)]"
                      }`}
                    >
                      {isFund ? "+" : "-"}
                      {formatMoney(entry.amount, currencyCode)}
                    </span>
                    <button
                      type="button"
                      aria-label="Edit bucket entry"
                      onClick={() => {
                        setEditingEntry(entry);
                        setEntryModalOpen(true);
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
                    >
                      <HiOutlinePencilSquare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete bucket entry"
                      onClick={() => setDeleteTarget(entry)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-destructive)] hover:bg-[var(--home-track)] cursor-pointer"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <BucketFormModal
        open={editBucketOpen}
        initialBucket={bucket}
        onSave={async (payload) =>
          await updateBucket({
            name: payload.name,
            imageKey: payload.imageKey,
          })
        }
        onClose={() => setEditBucketOpen(false)}
      />

      <BucketEntryModal
        open={entryModalOpen}
        initialEntry={editingEntry}
        defaultKind={defaultEntryKind}
        currencyCode={currencyCode}
        onSave={async (payload) => {
          if (payload.id) {
            return await updateEntry(payload.id, payload);
          }
          return await addEntry(payload);
        }}
        onClose={() => {
          setEntryModalOpen(false);
          setEditingEntry(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Bucket Entry?"
        description="Deleting this entry updates the bucket totals immediately."
        confirmLabel="Delete Entry"
        destructive
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            await deleteEntry(deleteTarget.id);
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
