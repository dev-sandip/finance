import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { formatIsoDateInNepal } from "@/lib/nepali-date";

export type ForexRate = {
  currency: {
    iso3: string;
    name: string;
    unit: number;
  };
  buy: string;
  sell: string;
};

type NrbForexResponse = {
  status: { code: number };
  data: {
    payload: Array<{
      date: string;
      published_on: string;
      modified_on: string;
      rates: ForexRate[];
    }> | null;
  };
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = formatIsoDateInNepal();
  const url = new URL("https://www.nrb.org.np/api/forex/v1/rates");
  url.searchParams.set("from", today);
  url.searchParams.set("to", today);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", "1");

  const response = await fetch(url, { next: { revalidate: 60 * 60 } });
  if (!response.ok) {
    return NextResponse.json({ error: "NRB forex service unavailable" }, { status: 502 });
  }

  const result = (await response.json()) as NrbForexResponse;
  const payload = result.data.payload?.[0];

  return NextResponse.json({
    date: payload?.date ?? today,
    publishedOn: payload?.published_on ?? null,
    modifiedOn: payload?.modified_on ?? null,
    rates: payload?.rates ?? [],
  });
}
