"use client";

import { FormEvent, useState } from "react";
import { Banknote, CalendarClock, Goal, Landmark, Plus, ReceiptText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, inputClass, selectClass, textareaClass } from "@/components/finance/fields";
import { formatDate, formatNpr } from "@/lib/format";
import type { FinanceData } from "@/services/server/finance";
import { useCreateFinanceResource, useFinance } from "@/hooks/use-finance";
import { parseNaturalTransaction, type TransactionDraft } from "@/lib/quick-transaction";
import { deleteResourceAction } from "@/app/actions";

type ResourceKind = "accounts" | "transactions" | "budgets" | "goals" | "recurring";

const meta: Record<ResourceKind, { title: string; label: string; description: string; icon: React.ReactNode }> = {
  accounts: {
    title: "Accounts",
    label: "Ledger sources",
    description: "Create bank, cash, wallet, card, loan, and investment accounts before recording transactions.",
    icon: <Landmark className="size-4" />,
  },
  transactions: {
    title: "Transactions",
    label: "Daily entries",
    description: "Record income, expenses, transfers, refunds, loan payments, and investment activity.",
    icon: <ReceiptText className="size-4" />,
  },
  budgets: {
    title: "Budgets",
    label: "Spending plans",
    description: "Set weekly, monthly, or annual limits for categories and track planned spending.",
    icon: <Banknote className="size-4" />,
  },
  goals: {
    title: "Savings goals",
    label: "Targets",
    description: "Track target amounts, current progress, linked accounts, and monthly contributions.",
    icon: <Goal className="size-4" />,
  },
  recurring: {
    title: "Recurring",
    label: "Bills and income",
    description: "Keep upcoming bills, subscriptions, and recurring income visible.",
    icon: <CalendarClock className="size-4" />,
  },
};

export function ResourcePage({ kind, initialData }: { kind: ResourceKind; initialData: FinanceData }) {
  const finance = useFinance(initialData);
  const createResource = useCreateFinanceResource();
  const data = finance.data;
  const page = meta[kind];
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft>({});

  function submit(resource: string) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const payload = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
      createResource.mutate(
        { resource, data: payload },
        {
          onSuccess: () => form.reset(),
        },
      );
    };
  }

  return (
    <div className="space-y-8">
      <section className="border-b pb-6 sm:pb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{page.label}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{page.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{page.description}</p>
      </section>

      {createResource.isError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Save failed. Check the fields and try again.
        </p>
      ) : null}

      {kind === "transactions" ? (
        <QuickTransactionText data={data} onDraft={setTransactionDraft} />
      ) : null}

      <section className="grid gap-5 sm:gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title={`Add ${page.title.toLowerCase()}`} icon={page.icon}>
          {kind === "accounts" ? <AccountForm onSubmit={submit("account")} pending={createResource.isPending} /> : null}
          {kind === "transactions" ? (
            <TransactionForm
              data={data}
              draft={transactionDraft}
              onSubmit={submit("transaction")}
              pending={createResource.isPending}
            />
          ) : null}
          {kind === "budgets" ? <BudgetForm data={data} onSubmit={submit("budget")} pending={createResource.isPending} /> : null}
          {kind === "goals" ? <GoalForm data={data} onSubmit={submit("goal")} pending={createResource.isPending} /> : null}
          {kind === "recurring" ? (
            <RecurringForm data={data} onSubmit={submit("recurring")} pending={createResource.isPending} />
          ) : null}
        </Panel>

        <Panel title={`${page.title} list`} icon={page.icon}>
          <div className="divide-y">
            {kind === "accounts" &&
              data.accounts.map((account) => (
                <Row
                  key={account.id}
                  id={account.id}
                  resource="account"
                  label={account.name}
                  meta={`${account.type.replaceAll("_", " ")} · ${account.currency}`}
                  value={formatNpr(account.currentBalance)}
                />
              ))}
            {kind === "transactions" &&
              data.transactions.map((transaction) => (
                <Row
                  key={transaction.id}
                  id={transaction.id}
                  resource="transaction"
                  label={transaction.description}
                  meta={`${transaction.transactionType.replaceAll("_", " ")} · ${formatDate(transaction.transactionDate)}`}
                  value={formatNpr(transaction.amount)}
                />
              ))}
            {kind === "budgets" &&
              data.budgets.map((budget) => (
                <Row key={budget.id} id={budget.id} resource="budget" label={budget.name} meta={budget.period} value={formatNpr(budget.amount)} />
              ))}
            {kind === "goals" &&
              data.goals.map((goal) => (
                <Row
                  key={goal.id}
                  id={goal.id}
                  resource="goal"
                  label={goal.name}
                  meta={`${Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100).toFixed(0)}% funded`}
                  value={formatNpr(goal.targetAmount)}
                />
              ))}
            {kind === "recurring" &&
              data.recurring.map((item) => (
                <Row
                  key={item.id}
                  id={item.id}
                  resource="recurring"
                  label={item.name}
                  meta={`${item.frequency} · due ${formatDate(item.nextDueDate)}`}
                  value={formatNpr(item.amount)}
                />
              ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function QuickTransactionText({
  data,
  onDraft,
}: {
  data: FinanceData;
  onDraft: (draft: TransactionDraft) => void;
}) {
  const [text, setText] = useState("");

  function parseText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onDraft(parseNaturalTransaction(text, data));
  }

  return (
    <Card id="quick-entry">
      <CardHeader className="flex flex-row items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <div>
          <CardTitle>Quick text entry</CardTitle>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Type Roman Nepali or English. We will fill the transaction form; you confirm the account and save.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={parseText} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className={inputClass}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder='Aja maile 120 nasta ma karcha gare'
          />
          <Button type="submit" disabled={!text.trim()}>
            Fill form
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AccountForm({ onSubmit, pending }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Account name">
        <input className={inputClass} name="name" placeholder="Nabil savings" required />
      </Field>
      <Field label="Account type">
        <select className={selectClass} name="type" defaultValue="savings">
          {[
            "savings",
            "current",
            "salary",
            "fixed_deposit",
            "cash",
            "digital_wallet",
            "credit_card",
            "loan",
            "cooperative",
            "investment",
            "foreign_currency",
          ].map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Bank or institution">
        <input className={inputClass} name="institutionName" placeholder="Nabil Bank" />
      </Field>
      <Field label="Currency">
        <input className={inputClass} name="currency" defaultValue="NPR" maxLength={3} required />
      </Field>
      <Field label="Opening balance">
        <input className={inputClass} name="openingBalance" inputMode="decimal" defaultValue="0.00" required />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        <Plus className="size-4" />
        {pending ? "Saving..." : "Add account"}
      </Button>
    </form>
  );
}

function TransactionForm({
  data,
  draft,
  onSubmit,
  pending,
}: {
  data: FinanceData;
  draft: TransactionDraft;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}) {
  return (
    <form
      key={`${draft.amount ?? ""}-${draft.description ?? ""}-${draft.categoryId ?? ""}-${draft.transactionType ?? ""}`}
      onSubmit={onSubmit}
      className="grid gap-4"
    >
      <Field label="Account">
        <select className={selectClass} name="accountId" required>
          <option value="">Select account</option>
          {data.accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Type">
        <select className={selectClass} name="transactionType" defaultValue={draft.transactionType ?? "expense"}>
          {["income", "expense", "transfer", "refund", "loan_payment", "investment", "adjustment"].map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input className={inputClass} name="transactionDate" type="date" defaultValue={draft.transactionDate} required />
      </Field>
      <Field label="Amount">
        <input className={inputClass} name="amount" inputMode="decimal" defaultValue={draft.amount} required />
      </Field>
      <Field label="Category">
        <select className={selectClass} name="categoryId" defaultValue={draft.categoryId ?? ""}>
          <option value="">Uncategorized</option>
          {data.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <input className={inputClass} name="description" defaultValue={draft.description} required />
      </Field>
      <Field label="Notes">
        <textarea className={textareaClass} name="notes" defaultValue={draft.notes} />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving..." : "Add transaction"}
      </Button>
    </form>
  );
}


function BudgetForm({ data, onSubmit, pending }: FormProps) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Name">
        <input className={inputClass} name="name" required />
      </Field>
      <Field label="Category">
        <select className={selectClass} name="categoryId">
          <option value="">All categories</option>
          {data.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Period">
        <select className={selectClass} name="period" defaultValue="monthly">
          <option value="weekly">weekly</option>
          <option value="monthly">monthly</option>
          <option value="annual">annual</option>
        </select>
      </Field>
      <Field label="Amount">
        <input className={inputClass} name="amount" inputMode="decimal" required />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving..." : "Add budget"}
      </Button>
    </form>
  );
}

function GoalForm({ data, onSubmit, pending }: FormProps) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Goal name">
        <input className={inputClass} name="name" required />
      </Field>
      <Field label="Linked account">
        <select className={selectClass} name="accountId">
          <option value="">No account</option>
          {data.accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Target amount">
        <input className={inputClass} name="targetAmount" inputMode="decimal" required />
      </Field>
      <Field label="Current amount">
        <input className={inputClass} name="currentAmount" inputMode="decimal" defaultValue="0.00" required />
      </Field>
      <Field label="Target date">
        <input className={inputClass} name="targetDate" type="date" />
      </Field>
      <Field label="Monthly contribution">
        <input className={inputClass} name="monthlyContribution" inputMode="decimal" defaultValue="0.00" required />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving..." : "Add goal"}
      </Button>
    </form>
  );
}

function RecurringForm({ data, onSubmit, pending }: FormProps) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Name">
        <input className={inputClass} name="name" required />
      </Field>
      <Field label="Account">
        <select className={selectClass} name="accountId">
          <option value="">No account</option>
          {data.accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Amount">
        <input className={inputClass} name="amount" inputMode="decimal" required />
      </Field>
      <Field label="Type">
        <select className={selectClass} name="transactionType" defaultValue="expense">
          <option value="expense">expense</option>
          <option value="income">income</option>
        </select>
      </Field>
      <Field label="Frequency">
        <select className={selectClass} name="frequency" defaultValue="monthly">
          <option value="weekly">weekly</option>
          <option value="monthly">monthly</option>
          <option value="annual">annual</option>
        </select>
      </Field>
      <Field label="Next due date">
        <input className={inputClass} name="nextDueDate" type="date" required />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving..." : "Add recurring"}
      </Button>
    </form>
  );
}

type FormProps = {
  data: FinanceData;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
};

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <span className="text-primary">{icon}</span>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
      {children}
      </CardContent>
    </Card>
  );
}

function Row({
  id,
  resource,
  label,
  meta,
  value,
}: {
  id: string;
  resource: "account" | "transaction" | "budget" | "goal" | "recurring";
  label: string;
  meta: string;
  value: string;
}) {
  return (
    <div className="grid gap-3 px-3 py-4 text-sm leading-relaxed transition-colors hover:bg-accent/30 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-5 sm:px-4">
      <div className="min-w-0 pr-1">
        <p className="truncate font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
        <p className="min-w-0 truncate font-medium sm:text-right">{value}</p>
        <form action={deleteResourceAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="resource" value={resource} />
          <Button type="submit" variant="destructive" size="xs">
            Delete
          </Button>
        </form>
      </div>
    </div>
  );
}
