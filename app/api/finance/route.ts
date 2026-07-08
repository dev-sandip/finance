import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, budgets, recurringItems, savingsGoals, transactions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  createAccountSchema,
  createBudgetSchema,
  createGoalSchema,
  createRecurringSchema,
  createTransactionSchema,
} from "@/schemas/finance";
import { getFinanceData } from "@/services/server/finance";

async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user;
}

export async function GET() {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await getFinanceData(user.id));
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const resource = body.resource as string;
  const data = body.data;

  if (resource === "account") {
    const parsed = createAccountSchema.safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: "Invalid account" }, { status: 422 });

    await db.insert(accounts).values({
      userId: user.id,
      ...parsed.data,
      currentBalance: parsed.data.openingBalance,
      currency: parsed.data.currency.toUpperCase(),
    });
  }

  if (resource === "transaction") {
    const parsed = createTransactionSchema.safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: "Invalid transaction" }, { status: 422 });

    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, parsed.data.accountId), eq(accounts.userId, user.id)))
      .limit(1);

    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const amount = Number(parsed.data.amount);
    const balanceDelta = ["expense", "transfer", "loan_payment"].includes(parsed.data.transactionType)
      ? -Math.abs(amount)
      : Math.abs(amount);
    const nextBalance = (Number(account.currentBalance) + balanceDelta).toFixed(2);

    await db.insert(transactions).values({
      userId: user.id,
      accountId: parsed.data.accountId,
      categoryId: parsed.data.categoryId || null,
      transactionDate: new Date(parsed.data.transactionDate),
      description: parsed.data.description,
      merchant: parsed.data.merchant,
      amount: Math.abs(amount).toFixed(2),
      transactionType: parsed.data.transactionType,
      notes: parsed.data.notes,
      currency: account.currency,
      balance: nextBalance,
      sourceType: "manual",
    });

    await db
      .update(accounts)
      .set({ currentBalance: nextBalance, updatedAt: new Date() })
      .where(eq(accounts.id, account.id));
  }

  if (resource === "budget") {
    const parsed = createBudgetSchema.safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: "Invalid budget" }, { status: 422 });

    await db.insert(budgets).values({
      userId: user.id,
      name: parsed.data.name,
      categoryId: parsed.data.categoryId || null,
      period: parsed.data.period,
      amount: parsed.data.amount,
    });
  }

  if (resource === "recurring") {
    const parsed = createRecurringSchema.safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: "Invalid recurring item" }, { status: 422 });

    await db.insert(recurringItems).values({
      userId: user.id,
      name: parsed.data.name,
      accountId: parsed.data.accountId || null,
      amount: parsed.data.amount,
      transactionType: parsed.data.transactionType,
      frequency: parsed.data.frequency,
      nextDueDate: new Date(parsed.data.nextDueDate),
    });
  }

  if (resource === "goal") {
    const parsed = createGoalSchema.safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: "Invalid goal" }, { status: 422 });

    await db.insert(savingsGoals).values({
      userId: user.id,
      name: parsed.data.name,
      accountId: parsed.data.accountId || null,
      targetAmount: parsed.data.targetAmount,
      currentAmount: parsed.data.currentAmount,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      monthlyContribution: parsed.data.monthlyContribution,
    });
  }

  if (!["account", "transaction", "budget", "recurring", "goal"].includes(resource)) {
    return NextResponse.json({ error: "Unsupported resource" }, { status: 400 });
  }

  return NextResponse.json(await getFinanceData(user.id));
}
