"use client";

import { flagClassForCurrency } from "@/lib/flags";
import { useForex } from "@/hooks/use-forex";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export function ForexRates({ compact = false }: { compact?: boolean }) {
  const forex = useForex();
  const rates = compact
    ? forex.data?.rates.filter((rate) => ["USD", "EUR", "GBP", "INR"].includes(rate.currency.iso3))
    : forex.data?.rates;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-5">
        <div>
          <CardTitle>NRB live forex</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {forex.data?.date ? `Published for ${forex.data.date}` : "Fetching Nepal Rastra Bank rates"}
          </p>
        </div>
        <Badge variant="muted">NPR</Badge>
      </CardHeader>
        <div className={compact ? "grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4" : "grid sm:grid-cols-2 xl:grid-cols-3"}>
        {forex.isLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading rates...</p>
        ) : forex.isError ? (
          <p className="px-5 py-8 text-sm text-destructive">Unable to load NRB rates.</p>
        ) : (
          rates?.map((rate, index) => (
            <div
              key={rate.currency.iso3}
              className={`px-5 py-5 leading-relaxed transition-colors hover:bg-accent/30 sm:px-7 ${
                !compact && index % 3 !== 0 ? "xl:border-l xl:border-dashed xl:border-border" : ""
              } ${!compact && index >= 3 ? "xl:border-t xl:border-dashed xl:border-border" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className={flagClassForCurrency(rate.currency.iso3)} aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">{rate.currency.iso3}</p>
                  <p className="text-xs text-muted-foreground">{rate.currency.name}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Unit {rate.currency.unit} · Buy {rate.buy} · Sell {rate.sell}
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
