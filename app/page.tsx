import { redirect } from "next/navigation";
import { getCurrentUser, hasAdminUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  if (!(await hasAdminUser())) redirect("/setup");
  redirect("/login");
}
