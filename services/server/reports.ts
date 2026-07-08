import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { accounts, aiReports, categories, transactions } from "@/db/schema";
import { formatNpr } from "@/lib/format";

const REPORT_MODEL = "gemini-2.5-flash";

export async function getReports(userId: string) {
  return db
    .select()
    .from(aiReports)
    .where(eq(aiReports.userId, userId))
    .orderBy(desc(aiReports.createdAt))
    .limit(12);
}

export async function createSpendingReport(userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  since.setHours(0, 0, 0, 0);

  const [transactionRows, accountRows, categoryRows] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.isDeleted, false), gte(transactions.transactionDate, since)))
      .orderBy(desc(transactions.transactionDate))
      .limit(200),
    db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(accounts.name),
    db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.name),
  ]);

  const income = transactionRows
    .filter((row) => row.transactionType === "income" || row.transactionType === "refund")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const expenses = transactionRows
    .filter((row) => ["expense", "loan_payment", "investment"].includes(row.transactionType))
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const payload = {
    period: {
      from: since.toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
    },
    totals: {
      income: formatNpr(income),
      expenses: formatNpr(expenses),
      net: formatNpr(income - expenses),
    },
    accounts: accountRows.map((account) => ({
      name: account.name,
      type: account.type,
      currency: account.currency,
      balance: account.currentBalance,
    })),
    categories: categoryRows.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
    })),
    transactions: transactionRows.map((transaction) => ({
      date: transaction.transactionDate.toISOString().slice(0, 10),
      description: transaction.description,
      merchant: transaction.merchant,
      type: transaction.transactionType,
      amount: transaction.amount,
      currency: transaction.currency,
      categoryId: transaction.categoryId,
    })),
  };

  if (!transactionRows.length) {
    const [emptyReport] = await db
      .insert(aiReports)
      .values({
        userId,
        title: "Spending analysis",
        summary: "There are no transactions in the last 90 days to analyze yet.",
        content: "Add transactions or import bank statements, then run analysis again.",
        model: "none",
        periodStart: since,
        periodEnd: new Date(),
        metadata: { transactionCount: 0 },
      })
      .returning();
    return emptyReport;
  }

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const { text } = await generateText({
    model: google(REPORT_MODEL),
    system:
      "You are a careful personal finance analyst for a Nepal-focused NPR finance app. Give practical observations, avoid investment advice, and do not invent data.",
    prompt: `Analyze this user's spending data and return a concise report in markdown.

Required structure:
# Spending analysis
## Snapshot
3-5 bullets.
## What changed
3 bullets about patterns.
## Watchouts
3 bullets about risks or habits.
## Actions for next month
5 concrete actions.

Data:
${JSON.stringify(payload, null, 2)}`,
  });

  const summary =
    text
      .split("\n")
      .map((line) => line.replace(/^#+\s*/, "").trim())
      .find((line) => line && !line.toLowerCase().includes("spending analysis")) ??
    "Generated spending analysis for the last 90 days.";

  const [report] = await db
    .insert(aiReports)
    .values({
      userId,
      title: "Spending analysis",
      summary,
      content: text,
      model: REPORT_MODEL,
      periodStart: since,
      periodEnd: new Date(),
      metadata: {
        transactionCount: transactionRows.length,
        income,
        expenses,
      },
    })
    .returning();

  return report;
}
