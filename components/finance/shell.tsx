import Link from "next/link";
import {
  Banknote,
  CalendarClock,
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
      <aside className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3 lg:block lg:py-4">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                <Landmark className="size-4" />
              </span>
              <span className="truncate">Finance Ledger</span>
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
          <nav className="flex gap-1 overflow-x-auto px-3 py-2 text-sm lg:grid lg:overflow-visible lg:p-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:gap-3"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
            {user.role === "admin" ? (
              <Link
                href="/admin"
                className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:gap-3"
              >
                <Shield className="size-4" />
                Admin
              </Link>
            ) : null}
          </nav>
          <div className="mt-auto hidden border-t p-3 lg:block">
            <div className="mb-3 truncate text-xs text-muted-foreground">{user.email}</div>
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
        <div className="rail-bounded flex items-center justify-between gap-3 border-b py-3">
          <div className="text-xs leading-5 text-muted-foreground lg:hidden">
            <span className="block text-foreground">{formatDate(new Date())}</span>
            <span>{formatNepaliDate()} BS</span>
          </div>
          <div className="ml-auto w-full max-w-sm">
            <CommandMenu isAdmin={user.role === "admin"} />
          </div>
        </div>
        <div className="rail-bounded py-5 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
