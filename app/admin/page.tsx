import { desc } from "drizzle-orm";
import { Shield, UserPlus, UsersRound } from "lucide-react";
import { db } from "@/db";
import { appSettings, users } from "@/db/schema";
import { createUserAction, toggleRegistrationAction, updateUserStatusAction } from "@/app/actions";
import { AppShell } from "@/components/finance/shell";
import { Field, inputClass, selectClass } from "@/components/finance/fields";
import { SubmitButton } from "@/components/finance/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureSettings, requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdmin();
  const settings = (await ensureSettings()) ?? (await db.select().from(appSettings).limit(1))[0];
  const userRows = await db.select().from(users).orderBy(desc(users.createdAt));
  const { error } = await searchParams;

  return (
    <AppShell user={admin}>
      <div className="space-y-6">
        <section className="border-b pb-6 sm:pb-8">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">User and access control</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Keep registration closed by default, create accounts manually, and suspend or delete users when needed.
          </p>
        </section>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <section className="grid gap-5 sm:gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <Panel title="Registration" icon={<Shield className="size-4" />}>
              <form action={toggleRegistrationAction} className="grid gap-4">
                <label className="flex items-center justify-between gap-4 rounded-md border px-3 py-3 text-sm">
                  <span>
                    <span className="block font-medium">Allow public registration</span>
                    <span className="text-muted-foreground">Existing users can always sign in.</span>
                  </span>
                  <input name="registrationEnabled" type="checkbox" defaultChecked={settings.registrationEnabled} />
                </label>
                <SubmitButton pendingText="Saving setting...">Save setting</SubmitButton>
              </form>
            </Panel>

            <Panel title="Create user" icon={<UserPlus className="size-4" />}>
              <form action={createUserAction} className="grid gap-4">
                <Field label="Name">
                  <input className={inputClass} name="name" required />
                </Field>
                <Field label="Email">
                  <input className={inputClass} name="email" type="email" required />
                </Field>
                <Field label="Password">
                  <input className={inputClass} name="password" type="password" minLength={8} required />
                </Field>
                <Field label="Role">
                  <select className={selectClass} name="role" defaultValue="user">
                    <option value="user">Standard user</option>
                    <option value="admin">Admin</option>
                  </select>
                </Field>
                <SubmitButton pendingText="Creating user...">Create user</SubmitButton>
              </form>
            </Panel>
          </div>

          <Panel title="Users" icon={<UsersRound className="size-4" />}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">User</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Created</th>
                    <th className="py-2 pr-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {userRows.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-accent/30">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </td>
                      <td className="py-3 pr-4 capitalize">{user.role}</td>
                      <td className="py-3 pr-4 capitalize">{user.status}</td>
                      <td className="py-3 pr-4">{formatDate(user.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex justify-end gap-2">
                          {(["active", "suspended", "deleted"] as const).map((status) => (
                            <form key={status} action={updateUserStatusAction}>
                              <input type="hidden" name="id" value={user.id} />
                              <input type="hidden" name="status" value={status} />
                              <Button
                                type="submit"
                                size="xs"
                                variant={status === "deleted" ? "destructive" : "outline"}
                                disabled={user.id === admin.id || user.status === status}
                              >
                                {status}
                              </Button>
                            </form>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <span className="text-primary">{icon}</span>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
      {children}
      </CardContent>
    </Card>
  );
}
