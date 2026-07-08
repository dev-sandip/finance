import { z } from "zod";

const money = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .regex(/^-?\d+(\.\d{1,2})?$/, "Use a valid amount");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});

export const setupAdminSchema = loginSchema.extend({
  name: z.string().trim().min(2).default("Admin"),
  confirmPassword: z.string().min(8),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const createUserSchema = loginSchema.extend({
  name: z.string().trim().min(2),
  role: z.enum(["admin", "user"]).default("user"),
});

export const createAccountSchema = z.object({
  name: z.string().trim().min(1),
  institutionName: z.string().trim().optional(),
  maskedAccountNumber: z.string().trim().optional(),
  type: z.enum([
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
  ]),
  currency: z.string().trim().min(3).max(3).default("NPR"),
  openingBalance: money,
});

export const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  transactionDate: z.string().min(1),
  description: z.string().trim().min(1),
  merchant: z.string().trim().optional(),
  amount: money,
  transactionType: z.enum(["income", "expense", "transfer", "refund", "loan_payment", "investment", "adjustment"]),
  notes: z.string().trim().optional(),
});

export const createBudgetSchema = z.object({
  name: z.string().trim().min(1),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  period: z.enum(["weekly", "monthly", "annual"]).default("monthly"),
  amount: money,
});

export const createRecurringSchema = z.object({
  name: z.string().trim().min(1),
  accountId: z.string().uuid().optional().or(z.literal("")),
  amount: money,
  transactionType: z.enum(["income", "expense"]),
  frequency: z.enum(["weekly", "monthly", "annual"]).default("monthly"),
  nextDueDate: z.string().min(1),
});

export const createGoalSchema = z.object({
  name: z.string().trim().min(1),
  accountId: z.string().uuid().optional().or(z.literal("")),
  targetAmount: money,
  currentAmount: money.default("0"),
  targetDate: z.string().optional(),
  monthlyContribution: money.default("0"),
});
