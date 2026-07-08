import { AppShell } from "@/components/finance/shell";
import { requireUser } from "@/lib/auth";
import { getFinanceData } from "@/services/server/finance";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const initialData = await getFinanceData(user.id);

  return (
    <AppShell user={user}>
      <DashboardClient initialData={initialData} />
    </AppShell>
  );
}
