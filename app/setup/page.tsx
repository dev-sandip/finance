import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setupAdminAction } from "@/app/actions";
import { AuthCard } from "@/components/finance/auth-card";
import { Field, inputClass } from "@/components/finance/fields";
import { ADMIN_EMAIL, hasAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await hasAdminUser()) redirect("/login");
  const { error } = await searchParams;

  return (
    <AuthCard
      title="Create admin"
      description="Bootstrap the first administrator. This app only accepts the configured admin email for setup."
      error={error}
    >
      <form action={setupAdminAction} className="grid gap-4">
        <Field label="Name">
          <input className={inputClass} name="name" defaultValue="Sandip" required />
        </Field>
        <Field label="Admin email">
          <input className={inputClass} name="email" type="email" defaultValue={ADMIN_EMAIL} required />
        </Field>
        <Field label="Password">
          <input className={inputClass} name="password" type="password" minLength={8} required />
        </Field>
        <Field label="Confirm password">
          <input className={inputClass} name="confirmPassword" type="password" minLength={8} required />
        </Field>
        <Button type="submit" size="lg">Create admin</Button>
      </form>
    </AuthCard>
  );
}
