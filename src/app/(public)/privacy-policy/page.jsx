"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--home-background)] text-[var(--home-text)]">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div className="rounded-[22px] border border-[var(--home-border)] bg-[var(--home-card)] p-6 sm:p-8 space-y-5">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--home-accent)]">
              Privacy &amp; Data Architecture
            </span>
            <h1 className="font-display text-3xl text-[var(--home-text)] mt-1">
              SpendScope Privacy Policy
            </h1>
          </div>

          <section className="space-y-2 text-sm text-[var(--home-text-secondary)] leading-relaxed">
            <h2 className="text-base font-bold text-[var(--home-text)]">
              1. Local-First Guest Storage
            </h2>
            <p>
              When you continue as a Guest without signing in, every account, transaction, category, Spend Bucket, and calculator scenario stays solely in your browser&apos;s IndexedDB on this device. Nothing is uploaded until you explicitly choose to sign in and enable Cloud Backup.
            </p>
          </section>

          <section className="space-y-2 text-sm text-[var(--home-text-secondary)] leading-relaxed">
            <h2 className="text-base font-bold text-[var(--home-text)]">
              2. Private Cloud Sync &amp; Row-Level Security
            </h2>
            <p>
              When you sign in with a SpendScope account, your data syncs privately over HTTPS to our Supabase Postgres database protected by strict PostgreSQL Row-Level Security policies scoped to your authenticated user ID. No third-party ad networks or analytics trackers receive your financial entries.
            </p>
          </section>

          <section className="space-y-2 text-sm text-[var(--home-text-secondary)] leading-relaxed">
            <h2 className="text-base font-bold text-[var(--home-text)]">
              3. On-Device OCR, Voice &amp; App Lock
            </h2>
            <p>
              Receipt scanning runs locally in your browser without uploading receipt photos to external servers. App Lock PIN hashes and WebAuthn passkeys remain bound to your device only.
            </p>
          </section>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm font-semibold"
            >
              Open Workspace
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-sm font-semibold text-[var(--home-text)]"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
