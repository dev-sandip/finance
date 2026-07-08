import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "deleted",
]);
export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "hidden",
  "archived",
]);
export const accountTypeEnum = pgEnum("account_type", [
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
]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
  "refund",
  "loan_payment",
  "investment",
  "adjustment",
]);
export const sourceTypeEnum = pgEnum("source_type", ["manual", "import"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("user"),
    status: userStatusEnum("status").notNull().default("active"),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: index("sessions_token_hash_idx").on(table.tokenHash),
  }),
);

export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  registrationEnabled: boolean("registration_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    institutionName: text("institution_name"),
    maskedAccountNumber: text("masked_account_number"),
    type: accountTypeEnum("type").notNull(),
    currency: text("currency").notNull().default("NPR"),
    openingBalance: numeric("opening_balance", { precision: 14, scale: 2 }).notNull().default("0"),
    currentBalance: numeric("current_balance", { precision: 14, scale: 2 }).notNull().default("0"),
    icon: text("icon").notNull().default("wallet"),
    status: accountStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("accounts_user_idx").on(table.userId),
  }),
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    type: transactionTypeEnum("type").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userTypeIdx: index("categories_user_type_idx").on(table.userId, table.type),
  }),
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    linkedTransactionId: uuid("linked_transaction_id"),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
    valueDate: timestamp("value_date", { withTimezone: true }),
    description: text("description").notNull(),
    merchant: text("merchant"),
    referenceNumber: text("reference_number"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    transactionType: transactionTypeEnum("transaction_type").notNull(),
    balance: numeric("balance", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("NPR"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    subcategoryId: uuid("subcategory_id").references(() => categories.id, { onDelete: "set null" }),
    notes: text("notes"),
    sourceType: sourceTypeEnum("source_type").notNull().default("manual"),
    sourceFile: text("source_file"),
    sourceRow: integer("source_row"),
    importId: uuid("import_id"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    cleared: boolean("cleared").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDateIdx: index("transactions_user_date_idx").on(table.userId, table.transactionDate),
    accountIdx: index("transactions_account_idx").on(table.accountId),
  }),
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    period: text("period").notNull().default("monthly"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    rollover: boolean("rollover").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const recurringItems = pgTable("recurring_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  frequency: text("frequency").notNull().default("monthly"),
  nextDueDate: timestamp("next_due_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savingsGoals = pgTable("savings_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  targetAmount: numeric("target_amount", { precision: 14, scale: 2 }).notNull(),
  currentAmount: numeric("current_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  targetDate: timestamp("target_date", { withTimezone: true }),
  monthlyContribution: numeric("monthly_contribution", { precision: 14, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiReports = pgTable(
  "ai_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    content: text("content").notNull(),
    model: text("model").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCreatedIdx: index("ai_reports_user_created_idx").on(table.userId, table.createdAt),
  }),
);

export const importHistory = pgTable(
  "import_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    source: text("source").notNull(),
    filename: text("filename").notNull(),
    fileHash: text("file_hash").notNull(),
    importedRows: integer("imported_rows").notNull().default(0),
    skippedRows: integer("skipped_rows").notNull().default(0),
    invalidRows: integer("invalid_rows").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userHashIdx: index("import_history_user_hash_idx").on(table.userId, table.fileHash),
  }),
);

export const stockHoldings = pgTable(
  "stock_holdings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    name: text("name"),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull().default("0"),
    averageCost: numeric("average_cost", { precision: 14, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userSymbolIdx: index("stock_holdings_user_symbol_idx").on(table.userId, table.symbol),
  }),
);
