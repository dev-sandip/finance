import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { accounts, budgets, categories, recurringItems, savingsGoals, transactions } from "@/db/schema";

export async function getFinanceData(userId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [accountRows, categoryRows, transactionRows, budgetRows, recurringRows, goalRows, monthRows] =
    await Promise.all([
      db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(accounts.name),
      db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.name),
      db
        .select()
        .from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.isDeleted, false)))
        .orderBy(desc(transactions.transactionDate))
        .limit(8),
      db.select().from(budgets).where(eq(budgets.userId, userId)).orderBy(desc(budgets.createdAt)).limit(6),
      db.select().from(recurringItems).where(eq(recurringItems.userId, userId)).orderBy(recurringItems.nextDueDate).limit(6),
      db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId)).orderBy(desc(savingsGoals.createdAt)).limit(6),
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.isDeleted, false),
            gte(transactions.transactionDate, monthStart),
          ),
        ),
    ]);

  const totalBalance = accountRows.reduce((sum, account) => sum + Number(account.currentBalance), 0);
  const monthIncome = monthRows
    .filter((row) => row.transactionType === "income" || row.transactionType === "refund")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const monthExpenses = monthRows
    .filter((row) => ["expense", "loan_payment", "investment"].includes(row.transactionType))
    .reduce((sum, row) => sum + Number(row.amount), 0);

  return {
    accounts: accountRows,
    categories: categoryRows,
    transactions: transactionRows,
    budgets: budgetRows,
    recurring: recurringRows,
    goals: goalRows,
    summary: {
      totalBalance,
      monthIncome,
      monthExpenses,
      currentMonthSavings: monthIncome - monthExpenses,
      savingsRate: monthIncome > 0 ? ((monthIncome - monthExpenses) / monthIncome) * 100 : 0,
    },
  };
}

export type FinanceData = Awaited<ReturnType<typeof getFinanceData>>;
