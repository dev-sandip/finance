import { TrendingUp } from "lucide-react";
import { createStockHoldingAction, deleteStockHoldingAction, updateStockHoldingAction } from "@/app/actions";
import { AppShell } from "@/components/finance/shell";
import { Field, inputClass, textareaClass } from "@/components/finance/fields";
import { SubmitButton } from "@/components/finance/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { formatNpr } from "@/lib/format";
import { fetchNepseLive, getStockHoldings } from "@/services/server/stocks";

export const dynamic = "force-dynamic";

export default async function StocksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const holdings = await getStockHoldings(user.id);
  const market = await fetchNepseLive().catch(() => ({ stocks: [], summary: undefined }));
  const liveBySymbol = new Map(market.stocks.map((stock) => [stock.stockSymbol, stock]));
  const asOf = market.stocks[0]?.asOfDateString;
  const portfolio = holdings.reduce(
    (total, holding) => {
      const live = liveBySymbol.get(holding.symbol);
      const quantity = Number(holding.quantity);
      const averageCost = Number(holding.averageCost);
      const livePrice = Number(live?.closingPrice ?? 0);
      total.shares += quantity;
      total.value += quantity * livePrice;
      total.cost += quantity * averageCost;
      return total;
    },
    { shares: 0, value: 0, cost: 0 },
  );

  return (
    <AppShell user={user}>
      <div className="space-y-8">
        <section className="border-b pb-6 sm:pb-8">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">NEPSE</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Stocks</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Track saved symbols and view live NepaliPaisa market data. Prices are refreshed through the server cache.
          </p>
        </section>

        {params.error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{params.error}</p>
        ) : null}
        {params.saved ? (
          <p className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">Stock saved.</p>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Portfolio value" value={formatNpr(portfolio.value)} />
          <Metric label="Total stock units" value={portfolio.shares.toLocaleString("en-NP")} />
          <Metric label="Total cost" value={formatNpr(portfolio.cost)} />
          <Metric label="Unrealized P/L" value={formatNpr(portfolio.value - portfolio.cost)} />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Market turnover" value={formatNpr(market.summary?.totalAmount ?? 0)} />
          <Metric label="Market shares" value={Number(market.summary?.totalShares ?? 0).toLocaleString("en-NP")} />
          <Metric label="Market transactions" value={Number(market.summary?.totalTxns ?? 0).toLocaleString("en-NP")} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <div>
                <CardTitle>Add stock</CardTitle>
                <CardDescription>Enter a symbol and your quantity. Company and price details load automatically.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form action={createStockHoldingAction} className="grid gap-4">
                <Field label="Symbol">
                  <input className={inputClass} name="symbol" placeholder="MCHL" required />
                </Field>
                <input type="hidden" name="name" value="" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Quantity">
                    <input className={inputClass} name="quantity" inputMode="decimal" placeholder="10" required />
                  </Field>
                  <Field label="Average cost optional">
                    <input className={inputClass} name="averageCost" inputMode="decimal" placeholder="0" />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea className={textareaClass} name="notes" />
                </Field>
                <SubmitButton pendingText="Saving...">Save stock</SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your stocks</CardTitle>
              <CardDescription>{asOf ?? "Live market data unavailable."}</CardDescription>
            </CardHeader>
            <div className="divide-y">
              {holdings.length ? (
                holdings.map((holding) => {
                  const live = liveBySymbol.get(holding.symbol);
                  const quantity = Number(holding.quantity);
                  const averageCost = Number(holding.averageCost);
                  const livePrice = Number(live?.closingPrice ?? 0);
                  const currentValue = quantity * livePrice;
                  const costValue = quantity * averageCost;
                  return (
                    <div key={holding.id} className="grid gap-4 px-5 py-4 text-sm leading-7 sm:px-7">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{holding.symbol}</p>
                          <Badge variant={(live?.percentChange ?? 0) >= 0 ? "secondary" : "outline"}>
                            {live ? `${live.percentChange}%` : "No live data"}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{live?.companyName || holding.name || "Saved stock"}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty {quantity.toLocaleString("en-NP")} · Avg {averageCost ? formatNpr(averageCost) : "not set"}
                        </p>
                      </div>
                      <div className="text-left lg:text-right">
                        <p className="font-semibold">LTP {live ? formatNpr(live.closingPrice) : "-"}</p>
                        <p className="text-xs text-muted-foreground">Holding value {live ? formatNpr(currentValue) : "-"}</p>
                        <p className="text-xs text-muted-foreground">P/L {live && averageCost ? formatNpr(currentValue - costValue) : "add avg cost"}</p>
                      </div>
                      <div className="grid gap-2 rounded-md border bg-muted/20 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                        <p>Open {live ? formatNpr(live.openingPrice) : "-"}</p>
                        <p>High {live ? formatNpr(live.maxPrice) : "-"}</p>
                        <p>Low {live ? formatNpr(live.minPrice) : "-"}</p>
                        <p>Volume {live ? live.volume.toLocaleString("en-NP") : "-"}</p>
                      </div>
                      <form action={updateStockHoldingAction} className="grid gap-3 rounded-md border bg-muted/20 p-3 lg:grid-cols-[1fr_0.8fr_0.8fr_auto]">
                        <input type="hidden" name="id" value={holding.id} />
                        <input className={inputClass} name="symbol" defaultValue={holding.symbol} required />
                        <input type="hidden" name="name" value={holding.name ?? ""} />
                        <input className={inputClass} name="quantity" inputMode="decimal" defaultValue={holding.quantity} required />
                        <input className={inputClass} name="averageCost" inputMode="decimal" defaultValue={holding.averageCost} placeholder="Avg cost" />
                        <input type="hidden" name="notes" value={holding.notes ?? ""} />
                        <Button type="submit" size="sm">Update</Button>
                      </form>
                      <form action={deleteStockHoldingAction}>
                        <input type="hidden" name="id" value={holding.id} />
                        <Button type="submit" variant="destructive" size="xs">Delete stock</Button>
                      </form>
                    </div>
                  );
                })
              ) : (
                <p className="px-5 py-10 text-sm text-muted-foreground sm:px-7">No stocks saved yet.</p>
              )}
            </div>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Market movers</CardTitle>
            <CardDescription>First live rows from NepaliPaisa overall feed.</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium sm:px-7">Symbol</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 text-right font-medium">Close</th>
                  <th className="px-5 py-3 text-right font-medium">Change</th>
                  <th className="px-5 py-3 text-right font-medium">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {market.stocks.slice(0, 20).map((stock) => (
                  <tr key={stock.stockSymbol} className="transition-colors hover:bg-accent/30">
                    <td className="px-5 py-3 font-semibold sm:px-7">{stock.stockSymbol}</td>
                    <td className="max-w-[280px] truncate px-5 py-3">{stock.companyName}</td>
                    <td className="px-5 py-3 text-right">{formatNpr(stock.closingPrice)}</td>
                    <td className="px-5 py-3 text-right">{stock.differenceRs} ({stock.percentChange}%)</td>
                    <td className="px-5 py-3 text-right">{stock.volume.toLocaleString("en-NP")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
