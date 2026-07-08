import { ForexRates } from "@/components/finance/forex-rates";
import { AppShell } from "@/components/finance/shell";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ForexPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <div className="space-y-8">
        <section className="border-b pb-6 sm:pb-8">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nepal Rastra Bank</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Forex rates</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Today&apos;s official NRB buy and sell rates with currency flags for quick scanning.
          </p>
        </section>
        <ForexRates />
      </div>
    </AppShell>
  );
}
