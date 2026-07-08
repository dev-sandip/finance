import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthCard, AuthLink } from "@/components/finance/auth-card";
import { Field, inputClass } from "@/components/finance/fields";
import { ensureSettings, getCurrentUser, hasAdminUser } from "@/lib/auth";
import { loginAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  if (!(await hasAdminUser())) redirect("/setup");
  const settings = await ensureSettings();
  const { error } = await searchParams;

  return (
    <AuthCard
      title="Sign in"
      description="Use the account created by the administrator. Public registration is off unless an admin enables it."
      error={error}
      footer={
        settings.registrationEnabled ? (
          <>
            Need an account? <AuthLink href="/register">Register</AuthLink>
          </>
        ) : (
          "Registration is currently disabled."
        )
      }
    >
      <form action={loginAction} className="grid gap-4">
        <Field label="Email">
          <input className={inputClass} name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <input className={inputClass} name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" size="lg">Sign in</Button>
      </form>
    </AuthCard>
  );
}
