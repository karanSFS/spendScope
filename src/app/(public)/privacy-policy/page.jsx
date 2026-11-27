"use client";

import React from "react";
import Link from "next/link";
import {
  HiOutlineDevicePhoneMobile,
  HiOutlineShieldCheck,
  HiOutlineEyeSlash,
  HiOutlineDocumentArrowDown,
} from "react-icons/hi2";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const AT_A_GLANCE = [
  {
    icon: HiOutlineDevicePhoneMobile,
    title: "On-Device Guest Mode",
    desc: "All guest ledgers, buckets, and loan profiles live solely in your browser's IndexedDB.",
  },
  {
    icon: HiOutlineShieldCheck,
    title: "Row-Level Security Sync",
    desc: "Signed-in cloud sync enforces strict per-user PostgreSQL RLS policies on every table.",
  },
  {
    icon: HiOutlineEyeSlash,
    title: "Zero Ads & Zero Trackers",
    desc: "No third-party ad networks, no analytics pixels, and zero receipt image uploads.",
  },
];

const POLICY_SECTIONS = [
  {
    id: "guest-storage",
    number: "01",
    title: "Local-First Guest Storage",
    body: "When you continue as a Guest without signing in, every account, transaction, category, Spend Bucket, and calculator scenario stays solely in your browser's IndexedDB on this device. Nothing is uploaded until you explicitly choose to sign in and trigger Cloud Backup.",
  },
  {
    id: "cloud-sync",
    number: "02",
    title: "Private Cloud Sync & Row-Level Security",
    body: "When you sign in with a SpendScope account, your data syncs privately over HTTPS to our Supabase Postgres database protected by strict PostgreSQL Row-Level Security (RLS) policies scoped strictly to your authenticated user ID. Each authenticated browser profile is also isolated in its own IndexedDB namespace so shared browsers never mix users.",
  },
  {
    id: "on-device-tools",
    number: "03",
    title: "On-Device OCR, Voice & App Lock",
    body: "Receipt scanning runs locally in your browser using self-hosted Tesseract WASM and language assets — receipt photos are never uploaded to external servers. Voice entry uses your browser's built-in Speech Recognition API only after a one-time notice. App Lock PIN hashes (salted PBKDF2) and WebAuthn passkeys remain bound to your device only and are never synced to the cloud.",
  },
  {
    id: "export-deletion",
    number: "04",
    title: "Data Export & Permanent Deletion Rights",
    body: "You can export your complete transaction history anytime in RFC-4180 CSV or multi-page PDF format from the Transactions view. Inside Settings → Reset Data, you can selectively wipe transactions, buckets, accounts, or categories scoped strictly to your own account, or sign out and remove all local data from the browser.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--home-background)] text-[var(--home-text)]">
      <Header />
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-10">
        {/* Hero Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-accent)]">
            <span>Privacy &amp; Data Architecture</span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--home-text-muted)]">
              Updated Nov 2026
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl tracking-tight text-[var(--home-text)]">
            SpendScope Privacy Policy
          </h1>
          <p className="text-sm sm:text-base text-[var(--home-text-secondary)] leading-relaxed">
            Built local-first from day one: your finances belong on your device
            and — only if you choose — in your private, row-level-secured cloud
            workspace.
          </p>
        </div>

        {/* 3-Card Privacy At-a-Glance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AT_A_GLANCE.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-3"
              >
                <div className="w-11 h-11 rounded-2xl bg-[var(--home-background)] border border-[var(--home-border)] text-[var(--home-accent)] flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-[var(--home-text)]">
                  {item.title}
                </h2>
                <p className="text-xs sm:text-sm leading-relaxed text-[var(--home-text-secondary)]">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Index + Numbered Policy Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Sticky Quick-Jump Index */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--home-text-muted)]">
              On This Page
            </h2>
            <nav aria-label="Privacy policy sections" className="space-y-1.5">
              {POLICY_SECTIONS.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--home-text-secondary)] hover:text-[var(--home-text)] hover:bg-[var(--home-background)] transition-colors"
                >
                  <span className="font-mono-num text-[11px] text-[var(--home-accent)]">
                    {sec.number}
                  </span>
                  <span>{sec.title}</span>
                </a>
              ))}
            </nav>

            <div className="pt-3 border-t border-[var(--home-border)] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--home-income)]">
                <HiOutlineDocumentArrowDown className="w-4 h-4 shrink-0" />
                <span>Full CSV &amp; PDF export included</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard"
                  className="flex-1 text-center px-4 py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold hover:opacity-95 transition-opacity"
                >
                  Open Workspace
                </Link>
                <Link
                  href="/"
                  className="px-4 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold text-[var(--home-text)] hover:border-[var(--home-accent)] transition-colors"
                >
                  Home
                </Link>
              </div>
            </div>
          </aside>

          {/* Policy Cards */}
          <div className="lg:col-span-8 space-y-4">
            {POLICY_SECTIONS.map((sec) => (
              <section
                key={sec.id}
                id={sec.id}
                className="scroll-mt-24 rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-6 sm:p-8 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono-num text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--home-background)] border border-[var(--home-border)] text-[var(--home-accent)]">
                    {sec.number}
                  </span>
                  <h2 className="font-display text-xl sm:text-2xl text-[var(--home-text)]">
                    {sec.title}
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-[var(--home-text-secondary)]">
                  {sec.body}
                </p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
