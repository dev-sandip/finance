import { AppShell } from "@/components/finance/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KhaltiImportForm } from "@/components/finance/khalti-import-form";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; imported?: string; skipped?: string; invalid?: string; duplicate?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  return (
    <AppShell user={user}>
      <div className="space-y-8">
        <section className="border-b pb-6 sm:pb-8">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Secure import</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Khalti statement import</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Upload a Khalti CSV, XLS, or XLSX export. The file is parsed in memory, hashed for duplicate detection,
            and not stored as a raw file.
          </p>
        </section>

        {params.error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {params.error}
          </p>
        ) : null}
        {params.imported ? (
          <p className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            {params.duplicate === "1"
              ? "This file was already imported. No duplicate rows were added."
              : `Import completed: ${params.imported} added, ${params.skipped ?? 0} skipped, ${params.invalid ?? 0} invalid.`}{" "}
            Open Transactions to review synced rows.
          </p>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <KhaltiImportForm />

          <Card>
            <CardHeader>
              <CardTitle>Expected columns</CardTitle>
              <CardDescription>How the local importer maps Khalti exports.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              <p>
                The importer scans for common Khalti export headers such as date, description, amount, debit, credit,
                balance, and reference. Metadata rows above the real table are skipped automatically.
              </p>
              <div className="mt-5 grid gap-2 text-xs">
                <p className="rounded-md border bg-muted/30 px-3 py-2">Date: date, transaction date, created at</p>
                <p className="rounded-md border bg-muted/30 px-3 py-2">Details: description, remarks, narration, service</p>
                <p className="rounded-md border bg-muted/30 px-3 py-2">Money: amount, debit, credit, balance</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
