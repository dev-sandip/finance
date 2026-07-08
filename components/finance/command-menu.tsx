"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  Goal,
  Landmark,
  LayoutDashboard,
  NotebookText,
  Plus,
  ReceiptText,
  Search,
  Shield,
  TrendingUp,
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FINANCE_QUERY_KEY } from "@/hooks/use-finance";
import { parseNaturalTransaction } from "@/lib/quick-transaction";
import type { FinanceData } from "@/services/server/finance";

export function CommandMenu({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [quickAccountId, setQuickAccountId] = useState("");

  const finance = useQuery({
    queryKey: FINANCE_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/finance");
      if (!response.ok) throw new Error("Unable to load finance data");
      return (await response.json()) as FinanceData;
    },
    enabled: open,
    staleTime: 2 * 60 * 1000,
  });

  const quickDraft = finance.data && quickText.trim() ? parseNaturalTransaction(quickText, finance.data) : null;
  const quickMutation = useMutation({
    mutationFn: async () => {
      if (!quickDraft || !quickAccountId) throw new Error("Missing account or transaction text");
      const response = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "transaction",
          data: {
            accountId: quickAccountId,
            transactionType: quickDraft.transactionType ?? "expense",
            transactionDate: quickDraft.transactionDate ?? new Date().toISOString().slice(0, 10),
            amount: quickDraft.amount ?? "",
            categoryId: quickDraft.categoryId ?? "",
            description: quickDraft.description ?? "Quick entry",
            notes: quickDraft.notes ?? quickText,
          },
        }),
      });
      if (!response.ok) throw new Error("Unable to save quick transaction");
      return (await response.json()) as FinanceData;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(FINANCE_QUERY_KEY, data);
      setQuickText("");
      setQuickAccountId("");
      setOpen(false);
    },
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function runCommand(command: () => void) {
    setOpen(false);
    command();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full min-w-0 items-center justify-between gap-3 rounded-md border bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Open command menu"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Search className="size-3.5 shrink-0" />
          <span className="truncate">Search actions</span>
        </span>
        <kbd className="shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-start bg-foreground/25 px-3 pt-[8vh] backdrop-blur-sm sm:px-4 sm:pt-[12vh]"
          onMouseDown={() => setOpen(false)}
        >
          <Command
            className="mx-auto w-full max-w-2xl overflow-hidden rounded-lg border bg-background shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Search className="size-4 text-muted-foreground" />
              <Command.Input
                autoFocus
                placeholder="Search pages, records, or actions..."
                className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close command menu"
              >
                <X className="size-4" />
              </button>
            </div>
            <Command.List className="max-h-[68vh] overflow-y-auto p-2 sm:max-h-[28rem]">
              <Command.Empty className="grid place-items-center px-4 py-12 text-center">
                <div>
                  <p className="text-sm font-medium">No command found</p>
                  <p className="mt-1 text-xs text-muted-foreground">Try “transaction”, “forex”, or “budget”.</p>
                </div>
              </Command.Empty>

              <Command.Group heading="Pages" className="command-group">
                <CommandItem
                  icon={<LayoutDashboard className="size-4" />}
                  label="Dashboard"
                  description="Balances, cash flow, and recent activity"
                  value="dashboard overview balance reports"
                  onSelect={() => runCommand(() => router.push("/dashboard"))}
                />
                <CommandItem
                  icon={<WalletCards className="size-4" />}
                  label="Accounts"
                  description="Bank, cash, wallet, card, loan, and investment accounts"
                  value="accounts bank cash wallet credit card loan investment"
                  onSelect={() => runCommand(() => router.push("/accounts"))}
                />
                <CommandItem
                  icon={<ReceiptText className="size-4" />}
                  label="Transactions"
                  description="Income, expenses, transfers, refunds, and notes"
                  value="transactions income expense transfer refund"
                  onSelect={() => runCommand(() => router.push("/transactions"))}
                />
                <CommandItem
                  icon={<Banknote className="size-4" />}
                  label="Budgets"
                  description="Weekly, monthly, and annual spending plans"
                  value="budgets monthly weekly annual category"
                  onSelect={() => runCommand(() => router.push("/budgets"))}
                />
                <CommandItem
                  icon={<Goal className="size-4" />}
                  label="Goals"
                  description="Savings targets and contribution tracking"
                  value="goals savings target contribution"
                  onSelect={() => runCommand(() => router.push("/goals"))}
                />
                <CommandItem
                  icon={<CalendarClock className="size-4" />}
                  label="Recurring"
                  description="Bills, subscriptions, and recurring income"
                  value="recurring bills subscriptions income"
                  onSelect={() => runCommand(() => router.push("/recurring"))}
                />
                <CommandItem
                  icon={<NotebookText className="size-4" />}
                  label="Reports"
                  description="AI spending analysis and saved reports"
                  value="reports ai spending analysis gemini"
                  onSelect={() => runCommand(() => router.push("/reports"))}
                />
                <CommandItem
                  icon={<Upload className="size-4" />}
                  label="Imports"
                  description="Upload Khalti statement exports"
                  value="imports upload khalti statement csv xlsx"
                  onSelect={() => runCommand(() => router.push("/imports"))}
                />
                <CommandItem
                  icon={<Landmark className="size-4" />}
                  label="Forex"
                  description="Live NRB foreign exchange rates"
                  value="forex nrb currency exchange rates"
                  onSelect={() => runCommand(() => router.push("/forex"))}
                />
                <CommandItem
                  icon={<TrendingUp className="size-4" />}
                  label="Stocks"
                  description="NEPSE market status and saved stock holdings"
                  value="stocks nepse market status portfolio shares"
                  onSelect={() => runCommand(() => router.push("/stocks"))}
                />
                {isAdmin ? (
                  <CommandItem
                    icon={<Shield className="size-4" />}
                    label="Admin panel"
                    description="Users, registration, and access control"
                    value="admin users settings registration"
                    onSelect={() => runCommand(() => router.push("/admin"))}
                  />
                ) : null}
              </Command.Group>

              <Command.Separator className="my-2 h-px bg-border" />

              <Command.Group heading="Quick actions" className="command-group">
                <div className="mx-2 mb-2 rounded-md border bg-muted/30 p-3">
                  <form
                    className="grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      quickMutation.mutate();
                    }}
                  >
                    <div className="grid gap-2">
                      <Input
                        value={quickText}
                        onChange={(event) => setQuickText(event.target.value)}
                        placeholder="Aja maile 120 nasta ma karcha gare"
                      />
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/15"
                        value={quickAccountId}
                        onChange={(event) => setQuickAccountId(event.target.value)}
                        required
                      >
                        <option value="">Select account</option>
                        {finance.data?.accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {quickDraft ? (
                      <p className="text-xs leading-5 text-muted-foreground">
                        {quickDraft.transactionType ?? "expense"} · NPR {quickDraft.amount ?? "?"} ·{" "}
                        {quickDraft.description ?? "Quick entry"}
                      </p>
                    ) : null}
                    {quickMutation.isError ? (
                      <p className="text-xs text-destructive">Could not save. Check account and amount.</p>
                    ) : null}
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!quickText.trim() || !quickAccountId || !quickDraft?.amount || quickMutation.isPending}
                    >
                      {quickMutation.isPending ? "Saving..." : "Save quick transaction"}
                    </Button>
                  </form>
                </div>
                <CommandItem
                  icon={<Landmark className="size-4" />}
                  label="Add account"
                  description="Open the account creation page"
                  value="create add account bank wallet cash"
                  onSelect={() => runCommand(() => router.push("/accounts"))}
                />
                <CommandItem
                  icon={<Plus className="size-4" />}
                  label="Add transaction"
                  description="Record income, expense, transfer, or refund"
                  value="create add transaction income expense transfer"
                  onSelect={() => runCommand(() => router.push("/transactions"))}
                />
                <CommandItem
                  icon={<ReceiptText className="size-4" />}
                  label="Text to transaction"
                  description="Type Roman Nepali or English and fill the form"
                  value="natural language roman nepali text transaction nasta kharcha spending"
                  onSelect={() => runCommand(() => router.push("/transactions#quick-entry"))}
                />
                <CommandItem
                  icon={<Banknote className="size-4" />}
                  label="Add budget"
                  description="Create a category or period budget"
                  value="create add monthly budget category"
                  onSelect={() => runCommand(() => router.push("/budgets"))}
                />
                <CommandItem
                  icon={<Goal className="size-4" />}
                  label="Add savings goal"
                  description="Track a target amount and date"
                  value="create add savings goal target"
                  onSelect={() => runCommand(() => router.push("/goals"))}
                />
              </Command.Group>
            </Command.List>
            <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
              <span>Enter to open</span>
              <span>Esc to close</span>
            </div>
          </Command>
        </div>
      ) : null}
    </>
  );
}

function CommandItem({
  icon,
  label,
  description,
  value,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-md px-3 py-3 text-sm text-foreground outline-none transition-colors",
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-background text-primary transition-colors group-data-[selected=true]:border-primary/30 group-data-[selected=true]:bg-primary/10">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
    </Command.Item>
  );
}
