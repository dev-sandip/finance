"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinanceData } from "@/services/server/finance";
import { formatNpr } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const colors = ["#176C5C", "#D39B2A", "#6B7280", "#9A3412", "#2563EB", "#7C3AED"];

export function DashboardCharts({ data }: { data: FinanceData }) {
  const cashFlow = buildCashFlow(data);
  const typeMix = buildTypeMix(data);
  const accounts = data.accounts.map((account) => ({
    name: account.name,
    balance: Number(account.currentBalance),
  }));

  return (
    <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <ChartPanel title="Cash flow trend" description="Recent transaction movement by day.">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={cashFlow} margin={{ left: 8, right: 16, top: 12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatNpr(Number(value))} />
            <Area type="monotone" dataKey="income" stackId="1" stroke="#176C5C" fill="#176C5C" fillOpacity={0.18} />
            <Area type="monotone" dataKey="expense" stackId="2" stroke="#D39B2A" fill="#D39B2A" fillOpacity={0.22} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Type mix" description="Where transaction volume is concentrated.">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={typeMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
              {typeMix.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatNpr(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Account balances" description="Current balance by account.">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={accounts} margin={{ left: 8, right: 16, top: 12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatNpr(Number(value))} />
            <Bar dataKey="balance" fill="#176C5C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </section>
  );
}

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
      {children}
      </CardContent>
    </Card>
  );
}

function buildCashFlow(data: FinanceData) {
  const byDate = new Map<string, { date: string; income: number; expense: number }>();

  for (const transaction of [...data.transactions].reverse()) {
    const date = new Date(transaction.transactionDate).toLocaleDateString("en-NP", {
      month: "short",
      day: "2-digit",
    });
    const row = byDate.get(date) ?? { date, income: 0, expense: 0 };
    if (transaction.transactionType === "income" || transaction.transactionType === "refund") {
      row.income += Number(transaction.amount);
    }
    if (["expense", "loan_payment", "investment"].includes(transaction.transactionType)) {
      row.expense += Number(transaction.amount);
    }
    byDate.set(date, row);
  }

  return [...byDate.values()];
}

function buildTypeMix(data: FinanceData) {
  const byType = new Map<string, number>();
  for (const transaction of data.transactions) {
    byType.set(transaction.transactionType, (byType.get(transaction.transactionType) ?? 0) + Number(transaction.amount));
  }
  return [...byType.entries()].map(([name, value]) => ({ name: name.replaceAll("_", " "), value }));
}
