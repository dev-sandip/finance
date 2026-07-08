"use client";

import { useId, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { importKhaltiAction } from "@/app/actions";
import { previewKhaltiRows, type ParsedKhaltiRow } from "@/lib/khalti-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/finance/submit-button";
import { formatNpr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function KhaltiImportForm() {
  const inputId = useId();
  const [preview, setPreview] = useState<ParsedKhaltiRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  async function onFileChange(file?: File) {
    setError(null);
    setPreview([]);
    setFilename(file?.name ?? null);
    if (!file) return;

    try {
      const bytes = await file.arrayBuffer();
      const rows = previewKhaltiRows(bytes, 15);
      if (!rows.length) {
        setError("No transaction rows were detected. Check that this is a Khalti CSV, XLS, or XLSX export.");
        return;
      }
      setPreview(rows);
    } catch {
      setError("Could not read this file. Try exporting it again as CSV, XLS, or XLSX.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Upload className="size-4 text-primary" />
        <CardTitle>Upload export</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={importKhaltiAction}>
          <input
            id={inputId}
            className="sr-only"
            name="statement"
            type="file"
            accept=".csv,.xls,.xlsx"
            required
            onChange={(event) => onFileChange(event.target.files?.[0])}
          />
          <label
            htmlFor={inputId}
            className="group flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/25 px-5 py-8 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
          >
            <span className="grid size-12 place-items-center rounded-md border bg-background text-primary transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
              <FileSpreadsheet className="size-5" />
            </span>
            <span className="mt-4 text-sm font-medium">
              {filename ?? "Choose Khalti export file"}
            </span>
            <span className="mt-1 text-xs leading-5 text-muted-foreground">
              CSV, XLS, or XLSX. Preview appears before import.
            </span>
            <span className="mt-4 inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
              Browse file
            </span>
          </label>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Privacy note: preview and import parsing happen locally/in your server. The raw statement is not sent to
            Gemini and is not stored as a file.
          </p>
          {preview.length ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{preview.length} preview rows</Badge>
              <Badge variant="outline">Ready to import</Badge>
            </div>
          ) : null}
          {error ? <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          {preview.length ? (
            <div className="mt-5 overflow-x-auto rounded-md border">
              <table className="min-w-[720px] w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2 text-right font-medium">Balance</th>
                    <th className="px-3 py-2 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.map((row) => (
                    <tr key={row.sourceRow}>
                      <td className="px-3 py-2">{row.date.toLocaleDateString("en-NP")}</td>
                      <td className="max-w-[260px] truncate px-3 py-2">{row.description}</td>
                      <td className="px-3 py-2 text-right">{formatNpr(row.amount)}</td>
                      <td className="px-3 py-2 text-right">{row.balance === undefined ? "-" : formatNpr(row.balance)}</td>
                      <td className="max-w-[180px] truncate px-3 py-2">{row.reference ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="mt-6">
            <SubmitButton pendingText="Importing...">Import Khalti statement</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
