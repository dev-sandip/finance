"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FinanceData } from "@/services/server/finance";

export const FINANCE_QUERY_KEY = ["finance"] as const;

async function fetchFinance() {
  const response = await fetch("/api/finance");
  if (!response.ok) throw new Error("Unable to load finance data");
  return (await response.json()) as FinanceData;
}

async function createFinanceResource(resource: string, data: Record<string, string>) {
  const response = await fetch("/api/finance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource, data }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Unable to save");
  }
  return (await response.json()) as FinanceData;
}

export function useFinance(initialData: FinanceData) {
  return useQuery({
    queryKey: FINANCE_QUERY_KEY,
    queryFn: fetchFinance,
    initialData,
  });
}

export function useCreateFinanceResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ resource, data }: { resource: string; data: Record<string, string> }) =>
      createFinanceResource(resource, data),
    onMutate: async ({ resource, data }) => {
      await queryClient.cancelQueries({ queryKey: FINANCE_QUERY_KEY });
      const previous = queryClient.getQueryData<FinanceData>(FINANCE_QUERY_KEY);

      if (previous) {
        queryClient.setQueryData<FinanceData>(FINANCE_QUERY_KEY, makeOptimisticSnapshot(previous, resource, data));
      }

      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(FINANCE_QUERY_KEY, context.previous);
      toast.error(error.message || "Save failed.");
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(FINANCE_QUERY_KEY, data);
      toast.success(savedMessage(variables.resource));
    },
  });
}

function savedMessage(resource: string) {
  const labels: Record<string, string> = {
    account: "Account added.",
    transaction: "Transaction recorded.",
    budget: "Budget added.",
    recurring: "Recurring item added.",
    goal: "Savings goal added.",
  };

  return labels[resource] ?? "Saved changes.";
}

function makeOptimisticSnapshot(data: FinanceData, resource: string, form: Record<string, string>): FinanceData {
  const id = `optimistic-${Date.now()}`;
  const now = new Date().toISOString();

  if (resource === "account") {
    const openingBalance = form.openingBalance || "0";
    return {
      ...data,
      accounts: [
        {
          id,
          userId: "optimistic",
          name: form.name,
          institutionName: form.institutionName || null,
          maskedAccountNumber: form.maskedAccountNumber || null,
          type: form.type as FinanceData["accounts"][number]["type"],
          currency: (form.currency || "NPR").toUpperCase(),
          openingBalance,
          currentBalance: openingBalance,
          icon: "wallet",
          status: "active",
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
        ...data.accounts,
      ],
      summary: {
        ...data.summary,
        totalBalance: data.summary.totalBalance + Number(openingBalance || 0),
      },
    };
  }

  if (resource === "transaction") {
    const amount = Math.abs(Number(form.amount || 0));
    const selectedAccount = data.accounts.find((account) => account.id === form.accountId);
    const isOutflow = ["expense", "transfer", "loan_payment"].includes(form.transactionType);
    const delta = isOutflow ? -amount : amount;

    return {
      ...data,
      accounts: data.accounts.map((account) =>
        account.id === form.accountId
          ? { ...account, currentBalance: (Number(account.currentBalance) + delta).toFixed(2) }
          : account,
      ),
      transactions: [
        {
          id,
          userId: "optimistic",
          accountId: form.accountId,
          linkedTransactionId: null,
          transactionDate: new Date(form.transactionDate || now),
          valueDate: null,
          description: form.description,
          merchant: form.merchant || null,
          referenceNumber: null,
          amount: amount.toFixed(2),
          transactionType: form.transactionType as FinanceData["transactions"][number]["transactionType"],
          balance: selectedAccount ? (Number(selectedAccount.currentBalance) + delta).toFixed(2) : null,
          currency: selectedAccount?.currency ?? "NPR",
          categoryId: form.categoryId || null,
          subcategoryId: null,
          notes: form.notes || null,
          sourceType: "manual",
          sourceFile: null,
          sourceRow: null,
          importId: null,
          isDeleted: false,
          cleared: true,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
        ...data.transactions,
      ],
      summary: {
        ...data.summary,
        totalBalance: data.summary.totalBalance + delta,
        monthIncome:
          form.transactionType === "income" || form.transactionType === "refund"
            ? data.summary.monthIncome + amount
            : data.summary.monthIncome,
        monthExpenses: ["expense", "loan_payment", "investment"].includes(form.transactionType)
          ? data.summary.monthExpenses + amount
          : data.summary.monthExpenses,
      },
    };
  }

  return data;
}
