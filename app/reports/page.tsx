import { Sparkles } from "lucide-react";
import { createAiReportAction, deleteAiReportAction } from "@/app/actions";
import { AppShell } from "@/components/finance/shell";
import { SubmitButton } from "@/components/finance/submit-button";
import { MarkdownReport } from "@/components/finance/markdown-report";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getReports } from "@/services/server/reports";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireUser();
  const reports = await getReports(user.id);

  return (
    <AppShell user={user}>
      <div className="space-y-8">
        <section className="grid gap-5 border-b pb-6 sm:pb-8 xl:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gemini analysis</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Spending reports</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Generate a concise spending analysis from your recent transactions and keep each report in the database.
            </p>
          </div>
          <form action={createAiReportAction} className="self-start">
            <SubmitButton pendingText="Analyzing...">
              <Sparkles className="size-4" />
              Analyze spending
            </SubmitButton>
          </form>
        </section>

        <section className="grid gap-6">
          {reports.length ? (
            reports.map((report) => (
              <Card key={report.id}>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{report.summary}</p>
                  </div>
                  <div className="shrink-0 text-left text-xs leading-5 text-muted-foreground sm:text-right">
                    <span className="block">{formatDate(report.createdAt)}</span>
                    <Badge variant="outline">{report.model}</Badge>
                    <form action={deleteAiReportAction} className="mt-3">
                      <input type="hidden" name="id" value={report.id} />
                      <Button type="submit" variant="destructive" size="xs">
                        Delete
                      </Button>
                    </form>
                  </div>
                </CardHeader>
                <CardContent>
                  <MarkdownReport content={report.content} />
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-sm leading-7 text-muted-foreground">
              No reports yet. Run your first spending analysis after adding transactions.
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}
