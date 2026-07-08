import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, categories, sessions, users } from "@/db/schema";

export const ADMIN_EMAIL = "contact@thesandip.dev";
const SESSION_COOKIE = "finance_session";
const SESSION_DAYS = 30;

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  status: "active" | "suspended" | "deleted";
};

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${key}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, key] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !key) return false;

  const candidate = Buffer.from(scryptSync(password, salt, 64).toString("hex"));
  const expected = Buffer.from(key);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function ensureSettings() {
  const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  if (settings) return settings;

  const [created] = await db
    .insert(appSettings)
    .values({ id: 1, registrationEnabled: false })
    .onConflictDoNothing()
    .returning();

  return created ?? (await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1))[0];
}

export async function hasAdminUser() {
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
  return Boolean(admin);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row || row.status !== "active") return null;
  return row;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export async function seedDefaultCategories(userId: string) {
  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userId))
    .limit(1);

  if (existing) return;

  const expenses = [
    "Food and groceries",
    "Restaurants",
    "Transportation",
    "Fuel",
    "Rent",
    "Electricity",
    "Water",
    "Internet",
    "Mobile recharge",
    "Education",
    "Health",
    "Medicine",
    "Insurance",
    "Clothing",
    "Entertainment",
    "Travel",
    "Personal care",
    "Family support",
    "Donations",
    "Government fees",
    "Tax",
    "Loan repayment",
    "Bank charges",
    "Investments",
    "Agriculture",
    "Business expenses",
    "Other expenses",
  ];
  const income = [
    "Salary",
    "Business income",
    "Freelance income",
    "Remittance",
    "Interest",
    "Investment income",
    "Rental income",
    "Refund",
    "Gift",
    "Agricultural income",
    "Other income",
  ];

  await db.insert(categories).values([
    ...expenses.map((name) => ({ userId, name, type: "expense" as const, isDefault: true })),
    ...income.map((name) => ({ userId, name, type: "income" as const, isDefault: true })),
  ]);
}
