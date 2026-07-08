"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  appSettings,
  budgets,
  recurringItems,
  savingsGoals,
  transactions,
  users,
  stockHoldings,
  aiReports,
} from "@/db/schema";
import {
  ADMIN_EMAIL,
  createSession,
  ensureSettings,
  hasAdminUser,
  hashPassword,
  requireAdmin,
  requireUser,
  seedDefaultCategories,
  signOut,
  verifyPassword,
} from "@/lib/auth";
import {
  createAccountSchema,
  createBudgetSchema,
  createGoalSchema,
  createRecurringSchema,
  createTransactionSchema,
  createUserSchema,
  loginSchema,
  setupAdminSchema,
} from "@/schemas/finance";
import { createSpendingReport } from "@/services/server/reports";
import { importKhaltiStatement } from "@/services/server/imports";
import { createStockHoldingSchema } from "@/schemas/stocks";
import { fetchNepseLive } from "@/services/server/stocks";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseForm<T extends Record<string, unknown>>(formData: FormData, keys: string[]) {
  return keys.reduce((acc, key) => ({ ...acc, [key]: getString(formData, key) }), {}) as T;
}

function formError(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

export async function setupAdminAction(formData: FormData) {
  if (await hasAdminUser()) redirect("/login");

  const parsed = setupAdminSchema.safeParse(
    parseForm(formData, ["name", "email", "password", "confirmPassword"]),
  );

  if (!parsed.success || parsed.data.email !== ADMIN_EMAIL) {
    redirect(`/setup?error=${encodeURIComponent("Use contact@thesandip.dev and a valid password.")}`);
  }

  await ensureSettings();
  const [admin] = await db
    .insert(users)
    .values({
      email: ADMIN_EMAIL,
      name: parsed.data.name,
      passwordHash: hashPassword(parsed.data.password),
      role: "admin",
      status: "active",
      emailVerified: true,
    })
    .returning();

  await seedDefaultCategories(admin.id);
  await createSession(admin.id);
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse(parseForm(formData, ["email", "password"]));
  if (!parsed.success) formError("Enter a valid email and password.");

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);

  if (!user || user.status !== "active" || !verifyPassword(parsed.data.password, user.passwordHash)) {
    formError("Invalid credentials or inactive account.");
  }

  await seedDefaultCategories(user.id);
  await createSession(user.id);
  redirect("/dashboard");
}

export async function registerAction(formData: FormData) {
  const settings = await ensureSettings();
  if (!settings.registrationEnabled) redirect("/login");

  const parsed = createUserSchema.safeParse({ ...parseForm(formData, ["name", "email", "password"]), role: "user" });
  if (!parsed.success) redirect(`/register?error=${encodeURIComponent("Enter valid registration details.")}`);

  const [created] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash: hashPassword(parsed.data.password),
      role: "user",
      status: "active",
      emailVerified: false,
    })
    .returning();

  await seedDefaultCategories(created.id);
  await createSession(created.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await signOut();
  redirect("/login");
}

export async function toggleRegistrationAction(formData: FormData) {
  await requireAdmin();
  await ensureSettings();

  await db
    .update(appSettings)
    .set({
      registrationEnabled: getString(formData, "registrationEnabled") === "on",
      updatedAt: new Date(),
    })
    .where(eq(appSettings.id, 1));

  revalidatePath("/admin");
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();
  const parsed = createUserSchema.safeParse(parseForm(formData, ["name", "email", "password", "role"]));
  if (!parsed.success) redirect(`/admin?error=${encodeURIComponent("Enter valid user details.")}`);

  const [created] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash: hashPassword(parsed.data.password),
      role: parsed.data.role,
      status: "active",
      emailVerified: true,
    })
    .returning();

  await seedDefaultCategories(created.id);
  revalidatePath("/admin");
}

export async function updateUserStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = getString(formData, "id");
  const status = getString(formData, "status");

  if (!["active", "suspended", "deleted"].includes(status) || id === admin.id) return;

  await db
    .update(users)
    .set({ status: status as "active" | "suspended" | "deleted", updatedAt: new Date() })
    .where(eq(users.id, id));

  revalidatePath("/admin");
}

export async function createAccountAction(formData: FormData) {
  const user = await requireUser();
  const parsed = createAccountSchema.safeParse(
    parseForm(formData, [
      "name",
      "institutionName",
      "maskedAccountNumber",
      "type",
      "currency",
      "openingBalance",
    ]),
  );

  if (!parsed.success) redirect(`/dashboard?error=${encodeURIComponent("Enter valid account details.")}`);

  await db.insert(accounts).values({
    userId: user.id,
    ...parsed.data,
    currentBalance: parsed.data.openingBalance,
    currency: parsed.data.currency.toUpperCase(),
  });

  revalidatePath("/dashboard");
}

export async function createTransactionAction(formData: FormData) {
  const user = await requireUser();
  const parsed = createTransactionSchema.safeParse(
    parseForm(formData, [
      "accountId",
      "categoryId",
      "transactionDate",
      "description",
      "merchant",
      "amount",
      "transactionType",
      "notes",
    ]),
  );

  if (!parsed.success) redirect(`/dashboard?error=${encodeURIComponent("Enter valid transaction details.")}`);

  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, parsed.data.accountId), eq(accounts.userId, user.id)))
    .limit(1);
  if (!account) redirect("/dashboard");

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

  revalidatePath("/dashboard");
}

export async function createBudgetAction(formData: FormData) {
  const user = await requireUser();
  const parsed = createBudgetSchema.safeParse(parseForm(formData, ["name", "categoryId", "period", "amount"]));
  if (!parsed.success) redirect("/dashboard");

  await db.insert(budgets).values({
    userId: user.id,
    name: parsed.data.name,
    categoryId: parsed.data.categoryId || null,
    period: parsed.data.period,
    amount: parsed.data.amount,
  });

  revalidatePath("/dashboard");
}

export async function createRecurringAction(formData: FormData) {
  const user = await requireUser();
  const parsed = createRecurringSchema.safeParse(
    parseForm(formData, ["name", "accountId", "amount", "transactionType", "frequency", "nextDueDate"]),
  );
  if (!parsed.success) redirect("/dashboard");

  await db.insert(recurringItems).values({
    userId: user.id,
    name: parsed.data.name,
    accountId: parsed.data.accountId || null,
    amount: parsed.data.amount,
    transactionType: parsed.data.transactionType,
    frequency: parsed.data.frequency,
    nextDueDate: new Date(parsed.data.nextDueDate),
  });

  revalidatePath("/dashboard");
}

export async function createGoalAction(formData: FormData) {
  const user = await requireUser();
  const parsed = createGoalSchema.safeParse(
    parseForm(formData, ["name", "accountId", "targetAmount", "currentAmount", "targetDate", "monthlyContribution"]),
  );
  if (!parsed.success) redirect("/dashboard");

  await db.insert(savingsGoals).values({
    userId: user.id,
    name: parsed.data.name,
    accountId: parsed.data.accountId || null,
    targetAmount: parsed.data.targetAmount,
    currentAmount: parsed.data.currentAmount,
    targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
    monthlyContribution: parsed.data.monthlyContribution,
  });

  revalidatePath("/dashboard");
}

export async function createAiReportAction() {
  const user = await requireUser();
  await createSpendingReport(user.id);
  revalidatePath("/reports");
  redirect("/reports");
}

export async function importKhaltiAction(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("statement");
  if (!(file instanceof File) || file.size === 0) redirect("/imports?error=Choose a statement file.");

  const result = await importKhaltiStatement(user.id, file);
  revalidatePath("/imports");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  redirect(
    `/imports?imported=${result.importedRows}&skipped=${result.skippedRows}&invalid=${result.invalidRows}&duplicate=${result.duplicateFile ? "1" : "0"}`,
  );
}

export async function createStockHoldingAction(formData: FormData) {
  const user = await requireUser();
  const parsed = createStockHoldingSchema.safeParse(parseForm(formData, ["symbol", "name", "quantity", "averageCost", "notes"]));
  if (!parsed.success) redirect("/stocks?error=Enter a valid stock symbol and holding details.");
  const live = await fetchNepseLive(parsed.data.symbol).catch(() => null);
  const liveStock = live?.stocks?.[0];

  await db.insert(stockHoldings).values({
    userId: user.id,
    symbol: parsed.data.symbol,
    name: parsed.data.name || liveStock?.companyName || null,
    quantity: parsed.data.quantity,
    averageCost: parsed.data.averageCost,
    notes: parsed.data.notes || null,
  });

  revalidatePath("/stocks");
  redirect("/stocks?saved=1");
}

export async function deleteAiReportAction(formData: FormData) {
  const user = await requireUser();
  const id = getString(formData, "id");
  await db.delete(aiReports).where(and(eq(aiReports.id, id), eq(aiReports.userId, user.id)));
  revalidatePath("/reports");
}

export async function updateStockHoldingAction(formData: FormData) {
  const user = await requireUser();
  const id = getString(formData, "id");
  const parsed = createStockHoldingSchema.safeParse(parseForm(formData, ["symbol", "name", "quantity", "averageCost", "notes"]));
  if (!parsed.success) redirect("/stocks?error=Enter valid stock details.");
  const live = await fetchNepseLive(parsed.data.symbol).catch(() => null);
  const liveStock = live?.stocks?.[0];

  await db
    .update(stockHoldings)
    .set({
      symbol: parsed.data.symbol,
      name: parsed.data.name || liveStock?.companyName || null,
      quantity: parsed.data.quantity,
      averageCost: parsed.data.averageCost,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    })
    .where(and(eq(stockHoldings.id, id), eq(stockHoldings.userId, user.id)));

  revalidatePath("/stocks");
  redirect("/stocks?saved=1");
}

export async function deleteStockHoldingAction(formData: FormData) {
  const user = await requireUser();
  const id = getString(formData, "id");
  await db.delete(stockHoldings).where(and(eq(stockHoldings.id, id), eq(stockHoldings.userId, user.id)));
  revalidatePath("/stocks");
}

export async function deleteResourceAction(formData: FormData) {
  const user = await requireUser();
  const id = getString(formData, "id");
  const resource = getString(formData, "resource");

  if (resource === "account") {
    await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));
    revalidatePath("/accounts");
  }
  if (resource === "transaction") {
    await db
      .update(transactions)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));
    revalidatePath("/transactions");
  }
  if (resource === "budget") {
    await db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, user.id)));
    revalidatePath("/budgets");
  }
  if (resource === "goal") {
    await db.delete(savingsGoals).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id)));
    revalidatePath("/goals");
  }
  if (resource === "recurring") {
    await db.delete(recurringItems).where(and(eq(recurringItems.id, id), eq(recurringItems.userId, user.id)));
    revalidatePath("/recurring");
  }

  revalidatePath("/dashboard");
}
