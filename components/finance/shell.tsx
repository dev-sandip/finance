import Link from "next/link";
import {
  Banknote,
  CalendarClock,
  ExternalLink,
  Goal,
  Landmark,
  LayoutDashboard,
  LogOut,
  NotebookText,
  ReceiptText,
  Shield,
  TrendingUp,
  Upload,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { CommandMenu } from "@/components/finance/command-menu";
import { formatDate } from "@/lib/format";
import { formatNepaliDate } from "@/lib/nepali-date";
import { ThemeToggle } from "@/components/finance/theme-toggle";
import { NavLink } from "@/components/finance/nav-link";

export function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Accounts", href: "/accounts", icon: WalletCards },
    { label: "Transactions", href: "/transactions", icon: ReceiptText },
    { label: "Budgets", href: "/budgets", icon: Banknote },
    { label: "Goals", href: "/goals", icon: Goal },
    { label: "Recurring", href: "/recurring", icon: CalendarClock },
    { label: "Reports", href: "/reports", icon: NotebookText },
    { label: "Imports", href: "/imports", icon: Upload },
    { label: "Forex", href: "/forex", icon: Landmark },
    { label: "Stocks", href: "/stocks", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/82 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3 lg:block lg:py-4">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
                <Landmark className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate leading-tight">Finance Ledger</span>
                <span className="hidden text-[11px] font-medium text-muted-foreground sm:block lg:hidden">
                  Built for NPR-first tracking
                </span>
              </span>
            </Link>
            <div className="hidden pt-4 text-xs leading-5 text-muted-foreground lg:block">
              <span className="block text-foreground">{formatDate(new Date())}</span>
              <span>{formatNepaliDate()} BS</span>
            </div>
            <form className="lg:hidden" action={logoutAction}>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button type="submit" variant="outline" size="icon-sm" title="Sign out">
                  <LogOut className="size-4" />
                </Button>
              </div>
            </form>
          </div>
          <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 py-2 lg:grid lg:overflow-visible lg:p-3">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href} icon={<item.icon className="size-4" />}>
                {item.label}
              </NavLink>
            ))}
            {user.role === "admin" ? (
              <NavLink href="/admin" icon={<Shield className="size-4" />}>
                Admin
              </NavLink>
            ) : null}
          </nav>
          <div className="mt-auto hidden border-t p-3 lg:block">
            <div className="mb-3 rounded-md bg-muted/60 p-3">
              <p className="truncate text-xs font-medium">{user.email}</p>
              <a
                href="https://github.com/dev-sandip"
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="size-3.5" />
                Developer @dev-sandip
              </a>
            </div>
            <form action={logoutAction}>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button type="submit" variant="outline" size="icon-sm" title="Sign out">
                  <LogOut className="size-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </aside>
      <main className="page-rails min-w-0">
        <div className="rail-bounded flex flex-col gap-3 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-5 text-muted-foreground lg:hidden">
            <span className="block text-foreground">{formatDate(new Date())}</span>
            <span>{formatNepaliDate()} BS</span>
          </div>
          <div className="w-full sm:ml-auto sm:max-w-sm">
            <CommandMenu isAdmin={user.role === "admin"} />
          </div>
        </div>
        <div className="rail-bounded py-5 sm:py-8">{children}</div>
        <footer className="rail-bounded border-t py-5 text-xs text-muted-foreground lg:hidden">
          <a
            href="https://github.com/dev-sandip"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
            Developer @dev-sandip
          </a>
        </footer>
      </main>
    </div>
  );
}
