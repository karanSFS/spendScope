"use client";

import React from "react";
import AppShell from "@/components/shared/AppShell";
import AppLockGate from "@/components/shared/AppLockGate";

export default function PrivateLayout({ children }) {
  return (
    <AppLockGate>
      <AppShell>{children}</AppShell>
    </AppLockGate>
  );
}
