import type { FinanceData } from "@/services/server/finance";

export type TransactionDraft = {
  amount?: string;
  description?: string;
  transactionType?: "income" | "expense" | "transfer" | "refund" | "loan_payment" | "investment" | "adjustment";
  transactionDate?: string;
  categoryId?: string;
  notes?: string;
};

export function parseNaturalTransaction(text: string, data: Pick<FinanceData, "categories">): TransactionDraft {
  const normalized = text.toLowerCase();
  const amount = normalized.match(/(?:rs\.?|npr|रु)?\s*([0-9]+(?:,[0-9]{3})*(?:\.\d{1,2})?)/i)?.[1]?.replace(/,/g, "");
  const transactionType = inferTransactionType(normalized);
  const categoryName = inferCategoryName(normalized);
  const categoryId = categoryName
    ? data.categories.find((category) => category.name.toLowerCase() === categoryName.toLowerCase())?.id
    : undefined;
  const description = buildDescription(text, amount);

  return {
    amount,
    transactionType,
    transactionDate: new Date().toISOString().slice(0, 10),
    categoryId,
    description,
    notes: text.trim(),
  };
}

function inferTransactionType(text: string): TransactionDraft["transactionType"] {
  if (/\b(salary|aamdani|income|paid me|received|deposit|jam(m)?a|paye|payeko)\b/.test(text)) return "income";
  if (/\b(refund|firta|return)\b/.test(text)) return "refund";
  if (/\b(transfer|pathaye|sent)\b/.test(text)) return "transfer";
  return "expense";
}

function inferCategoryName(text: string) {
  const rules: Array<[RegExp, string]> = [
    [/\b(nasta|khaja|breakfast|snack|tea|chiya|coffee|restaurant|momo|food|grocery|groceries)\b/, "Food and groceries"],
    [/\b(pathao|indrive|taxi|bus|transport|tempo|ride)\b/, "Transportation"],
    [/\b(petrol|diesel|fuel)\b/, "Fuel"],
    [/\b(internet|wifi|worldlink|dishhome)\b/, "Internet"],
    [/\b(mobile|recharge|ntc|ncell)\b/, "Mobile recharge"],
    [/\b(rent|bhada)\b/, "Rent"],
    [/\b(medicine|hospital|doctor|health)\b/, "Health"],
    [/\b(salary|aamdani|income)\b/, "Salary"],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1];
}

function buildDescription(text: string, amount?: string) {
  const cleaned = text
    .replace(/(?:rs\.?|npr|रु)?\s*[0-9]+(?:,[0-9]{3})*(?:\.\d{1,2})?/i, "")
    .replace(/\b(aja|aaja|today|maile|mai|ma|maa|karcha|kharcha|gare|garye|spent|paid|for|in|on)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned) return cleaned[0].toUpperCase() + cleaned.slice(1);
  return amount ? `Quick entry ${amount}` : "Quick entry";
}
