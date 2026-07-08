import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { registerAction } from "@/app/actions";
import { AuthCard, AuthLink } from "@/components/finance/auth-card";
import { Field, inputClass } from "@/components/finance/fields";
import { ensureSettings, getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const settings = await ensureSettings();
  if (!settings.registrationEnabled) redirect("/login");
  const { error } = await searchParams;

  return (
    <AuthCard
      title="Create account"
      description="Registration is currently enabled by the administrator."
      error={error}
      footer={
        <>
          Already have an account? <AuthLink href="/login">Sign in</AuthLink>
        </>
      }
    >
      <form action={registerAction} className="grid gap-4">
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Email">
          <input className={inputClass} name="email" type="email" required />
        </Field>
        <Field label="Password">
          <input className={inputClass} name="password" type="password" minLength={8} required />
        </Field>
        <Button type="submit" size="lg">Create account</Button>
      </form>
    </AuthCard>
  );
}
