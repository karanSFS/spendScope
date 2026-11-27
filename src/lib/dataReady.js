"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny non-persisted store: "has the data for the current owner arrived yet?"
 *
 * - Guest: ready as soon as local defaults are seeded.
 * - Signed-in, already synced before on this device: ready immediately (local
 *   IndexedDB is the source of truth, cloud sync runs in the background).
 * - Signed-in, first time on this device: pending until the first cloud pull
 *   settles (or a safety timeout), so screens show skeletons instead of
 *   empty/zero states.
 */

let ready = false;
let safetyTimer = null;
const listeners = new Set();

function emit() {
  listeners.forEach((l) => l());
}

export function markDataReady() {
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
  if (ready) return;
  ready = true;
  emit();
}

export function markDataPending(safetyMs = 12000) {
  if (safetyTimer) clearTimeout(safetyTimer);
  safetyTimer = setTimeout(markDataReady, safetyMs);
  if (!ready) return;
  ready = false;
  emit();
}

export function isDataReady() {
  return ready;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDataReady() {
  return useSyncExternalStore(
    subscribe,
    () => ready,
    () => false,
  );
}
