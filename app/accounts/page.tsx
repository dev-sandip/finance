import { AppShell } from "@/components/finance/shell";
import { ResourcePage } from "@/components/finance/resource-page";
import { requireUser } from "@/lib/auth";
import { getFinanceData } from "@/services/server/finance";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await requireUser();
  const initialData = await getFinanceData(user.id);

  return (
    <AppShell user={user}>
      <ResourcePage kind="accounts" initialData={initialData} />
    </AppShell>
  );
}
