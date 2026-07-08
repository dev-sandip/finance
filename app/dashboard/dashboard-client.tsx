"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Landmark, PiggyBank, Plus } from "lucide-react";
import { ForexRates } from "@/components/finance/forex-rates";
import { DashboardCharts } from "@/components/finance/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatNpr } from "@/lib/format";
import type { FinanceData } from "@/services/server/finance";
import { useFinance } from "@/hooks/use-finance";

export function DashboardClient({ initialData }: { initialData: FinanceData }) {
  const finance = useFinance(initialData);
  const data = finance.data;
  const savingsRate = data.summary.monthIncome
    ? ((data.summary.monthIncome - data.summary.monthExpenses) / data.summary.monthIncome) * 100
    : 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-5 border-b pb-6 sm:pb-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dashboard</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Money snapshot</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            A calm overview of balances, this month&apos;s flow, recent activity, and live NRB rates.
          </p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap xl:justify-end">
          <Link
            href="/transactions"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
          >
            <Plus className="size-4" />
            Add transaction
          </Link>
          <Link
            href="/accounts"
            className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            Add account
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Landmark />} label="Total balance" value={formatNpr(data.summary.totalBalance)} />
        <Metric icon={<ArrowDownLeft />} label="Month income" value={formatNpr(data.summary.monthIncome)} />
        <Metric icon={<ArrowUpRight />} label="Month expenses" value={formatNpr(data.summary.monthExpenses)} />
        <Metric icon={<PiggyBank />} label="Savings rate" value={`${savingsRate.toFixed(1)}%`} />
      </section>

      <DashboardCharts data={data} />

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ListPanel title="Recent transactions" empty="No transactions yet." actionHref="/transactions">
          {data.transactions.map((transaction) => (
            <Row
              key={transaction.id}
              label={transaction.description}
              meta={`${transaction.transactionType.replaceAll("_", " ")} · ${formatDate(transaction.transactionDate)}`}
              value={formatNpr(transaction.amount)}
            />
          ))}
        </ListPanel>
        <ListPanel title="Accounts" empty="No accounts yet." actionHref="/accounts">
          {data.accounts.map((account) => (
            <Row
              key={account.id}
              label={account.name}
              meta={`${account.type.replaceAll("_", " ")} · ${account.currency}`}
              value={formatNpr(account.currentBalance)}
            />
          ))}
        </ListPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ListPanel title="Budgets" empty="No budgets yet." actionHref="/budgets">
          {data.budgets.map((budget) => (
            <Row key={budget.id} label={budget.name} meta={budget.period} value={formatNpr(budget.amount)} />
          ))}
        </ListPanel>
        <ListPanel title="Goals" empty="No savings goals yet." actionHref="/goals">
          {data.goals.map((goal) => (
            <Row
              key={goal.id}
              label={goal.name}
              meta={`${Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100).toFixed(0)}% funded`}
              value={formatNpr(goal.targetAmount)}
            />
          ))}
        </ListPanel>
      </section>

      <ForexRates compact />
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="leading-relaxed transition-colors hover:bg-accent/30">
      <CardContent>
      <div className="mb-4 flex items-center justify-between text-muted-foreground">
        <span className="[&_svg]:size-4">{icon}</span>
        <Badge variant="muted">{label}</Badge>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function ListPanel({
  title,
  empty,
  actionHref,
  children,
}: {
  title: string;
  empty: string;
  actionHref: string;
  children: React.ReactNode[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{title}</CardTitle>
        <Link href={actionHref} className="text-sm font-medium text-primary hover:underline">
          Open
        </Link>
      </CardHeader>
      <div className="divide-y">
        {children.length ? children : <p className="px-5 py-10 text-sm text-muted-foreground sm:px-7">{empty}</p>}
      </div>
    </Card>
  );
}

function Row({ label, meta, value }: { label: string; meta: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-5 px-5 py-4 text-sm leading-relaxed transition-colors hover:bg-accent/30 sm:px-7">
      <div className="min-w-0">
        <p className="truncate font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <p className="shrink-0 font-medium">{value}</p>
    </div>
  );
}
