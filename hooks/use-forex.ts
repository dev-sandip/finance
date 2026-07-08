"use client";

import { useQuery } from "@tanstack/react-query";
import type { ForexRate } from "@/app/api/forex/route";

export type ForexData = {
  date: string;
  publishedOn: string | null;
  modifiedOn: string | null;
  rates: ForexRate[];
};

export function useForex() {
  return useQuery({
    queryKey: ["forex", "nrb", "today"],
    queryFn: async () => {
      const response = await fetch("/api/forex");
      if (!response.ok) throw new Error("Unable to load forex rates");
      return (await response.json()) as ForexData;
    },
    staleTime: 60 * 60 * 1000,
  });
}
