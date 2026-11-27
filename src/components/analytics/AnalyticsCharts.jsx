"use client";

import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatMoney } from "@/utils/currencies";

export function MonthlyDonutChart({
  slices,
  activeSliceIdx,
  onSliceToggle,
  currencyCode,
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={72}
          outerRadius={112}
          paddingAngle={2}
          onClick={(_, idx) => onSliceToggle?.(idx)}
        >
          {slices.map((entry, idx) => (
            <Cell
              key={entry.key}
              fill={entry.chartColor}
              opacity={
                activeSliceIdx === null || activeSliceIdx === idx ? 1 : 0.4
              }
              className="cursor-pointer outline-none"
            />
          ))}
        </Pie>
        <RechartsTooltip
          formatter={(val) => formatMoney(val, currencyCode)}
          contentStyle={{
            backgroundColor: "var(--home-card)",
            border: "1px solid var(--home-border)",
            borderRadius: "14px",
            color: "var(--home-text)",
            fontSize: "12px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function YearlyCashflowBarChart({ months, currencyCode }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={months}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--home-border)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fill: "var(--home-text-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--home-border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--home-text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <RechartsTooltip
          formatter={(val) => formatMoney(val, currencyCode)}
          contentStyle={{
            backgroundColor: "var(--home-card)",
            border: "1px solid var(--home-border)",
            borderRadius: "14px",
            color: "var(--home-text)",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <Bar
          dataKey="income"
          name="Income"
          fill="var(--home-income)"
          radius={[6, 6, 0, 0]}
        />
        <Bar
          dataKey="expense"
          name="Expense"
          fill="var(--home-expense)"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
