export function formatNpr(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-NP", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}
