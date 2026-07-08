import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { stockHoldings } from "@/db/schema";

export type NepseStock = {
  stockSymbol: string;
  companyName: string;
  noOfTransactions: number;
  maxPrice: number;
  minPrice: number;
  openingPrice: number;
  closingPrice: number;
  amount: number;
  previousClosing: number;
  differenceRs: number;
  percentChange: number;
  volume: number;
  asOfDate: string;
  asOfDateString: string;
  tradeDate: string;
};

type NepaliPaisaResponse = {
  statusCode: number;
  message: string;
  result: {
    stocks: NepseStock[];
    summary?: {
      totalAmount: number;
      totalShares: number;
      totalTxns: number;
    };
  };
};

export async function getStockHoldings(userId: string) {
  return db.select().from(stockHoldings).where(eq(stockHoldings.userId, userId)).orderBy(desc(stockHoldings.createdAt));
}

export async function fetchNepseLive(symbol?: string) {
  const url = new URL("https://nepalipaisa.com/api/GetStockLive");
  if (symbol) url.searchParams.set("stockSymbol", symbol.toUpperCase());

  const response = await fetch(url, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Unable to load NEPSE live data");
  const data = (await response.json()) as NepaliPaisaResponse;
  return data.result;
}
