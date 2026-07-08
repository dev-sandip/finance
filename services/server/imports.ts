import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, importHistory, transactions } from "@/db/schema";
import { parseKhaltiStatementBytes } from "@/lib/khalti-parser";

export async function importKhaltiStatement(userId: string, file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(bytes).digest("hex");

  const [existingImport] = await db
    .select({ id: importHistory.id })
    .from(importHistory)
    .where(and(eq(importHistory.userId, userId), eq(importHistory.fileHash, fileHash)))
    .limit(1);

  if (existingImport) {
    return { importedRows: 0, skippedRows: 0, invalidRows: 0, duplicateFile: true };
  }

  const validRows = parseKhaltiStatementBytes(bytes);
  const invalidRows = validRows.length ? 0 : 1;

  const account = await ensureKhaltiAccount(userId);
  const [importRecord] = await db
    .insert(importHistory)
    .values({
      userId,
      accountId: account.id,
      source: "khalti",
      filename: sanitizeFilename(file.name),
      fileHash,
      importedRows: 0,
      skippedRows: 0,
      invalidRows,
    })
    .returning({ id: importHistory.id });

  const categoryRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
    })
    .from(categories)
    .where(eq(categories.userId, userId));
  let importedRows = 0;
  let skippedRows = 0;

  for (const row of validRows) {
    const [duplicate] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.accountId, account.id),
          eq(transactions.sourceFile, fileHash),
          eq(transactions.sourceRow, row.sourceRow),
        ),
      )
      .limit(1);

    if (duplicate) {
      skippedRows += 1;
      continue;
    }

    const type = row.amount >= 0 ? "income" : "expense";
    const categoryId = inferCategoryId(row.description, type, categoryRows);
    await db.insert(transactions).values({
      userId,
      accountId: account.id,
      transactionDate: row.date,
      description: row.description,
      referenceNumber: row.reference,
      amount: Math.abs(row.amount).toFixed(2),
      transactionType: type,
      categoryId,
      balance: row.balance?.toFixed(2),
      currency: "NPR",
      sourceType: "import",
      sourceFile: fileHash,
      sourceRow: row.sourceRow,
      importId: importRecord.id,
    });
    importedRows += 1;
  }

  const latestBalance = [...validRows].reverse().find((row) => typeof row.balance === "number")?.balance;
  if (typeof latestBalance === "number") {
    await db.update(accounts).set({ currentBalance: latestBalance.toFixed(2), updatedAt: new Date() }).where(eq(accounts.id, account.id));
  }

  await db.update(importHistory).set({
    importedRows,
    skippedRows,
    invalidRows,
  }).where(eq(importHistory.id, importRecord.id));

  return { importedRows, skippedRows, invalidRows, duplicateFile: false };
}

async function ensureKhaltiAccount(userId: string) {
  const [existing] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.name, "Khalti Wallet")))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(accounts)
    .values({
      userId,
      name: "Khalti Wallet",
      institutionName: "Khalti",
      type: "digital_wallet",
      currency: "NPR",
      openingBalance: "0",
      currentBalance: "0",
      icon: "wallet",
      status: "active",
    })
    .returning();
  return created;
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^\w.\- ]/g, "").slice(0, 160);
}

function inferCategoryId(
  description: string,
  type: "income" | "expense",
  categoryRows: Array<{ id: string; name: string; type: "income" | "expense" | "transfer" | "refund" | "loan_payment" | "investment" | "adjustment" }>,
) {
  const text = description.toLowerCase();
  const rules =
    type === "income"
      ? [
          { category: "Refund", pattern: /\b(refund|cashback|reversal)\b/ },
          { category: "Business income", pattern: /\b(received|payment received|service)\b/ },
          { category: "Other income", pattern: /.*/ },
        ]
      : [
          { category: "Food and groceries", pattern: /\b(nasta|khaja|food|grocery|mart|bhatbhateni|restaurant|cafe|momo)\b/ },
          { category: "Transportation", pattern: /\b(pathao|indrive|taxi|bus|fuel|petrol|transport)\b/ },
          { category: "Internet", pattern: /\b(internet|worldlink|vianet|dishhome|net)\b/ },
          { category: "Mobile recharge", pattern: /\b(recharge|ntc|ncell|mobile)\b/ },
          { category: "Bank charges", pattern: /\b(charge|fee|bank debit)\b/ },
          { category: "Other expenses", pattern: /.*/ },
        ];

  for (const rule of rules) {
    if (!rule.pattern.test(text)) continue;
    const match = categoryRows.find((category) => category.type === type && category.name === rule.category);
    if (match) return match.id;
  }

  return null;
}
