import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchNepseLive } from "@/services/server/stocks";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || undefined;

  try {
    return NextResponse.json(await fetchNepseLive(symbol));
  } catch {
    return NextResponse.json({ error: "Unable to load NEPSE data" }, { status: 502 });
  }
}
