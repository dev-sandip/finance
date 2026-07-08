import Link from "next/link";
import { Landmark } from "lucide-react";

export function AuthCard({
  title,
  description,
  children,
  footer,
  error,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  error?: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_20%_15%,rgba(216,170,70,0.20),transparent_28%),linear-gradient(135deg,#f9f6ed,#eef5ef)] px-4">
      <section className="w-full max-w-md rounded-lg border bg-background/95 p-6 shadow-sm">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Finance Ledger</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <Landmark className="size-5" />
          </span>
        </div>
        {error ? (
          <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {children}
        {footer ? <div className="mt-5 text-sm text-muted-foreground">{footer}</div> : null}
      </section>
    </main>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="font-medium text-primary hover:underline" href={href}>
      {children}
    </Link>
  );
}
