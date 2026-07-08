import NepaliDate from "nepali-date-converter";

export function formatNepaliDate(date: Date = new Date()) {
  return new NepaliDate(date).format("DD MMMM YYYY", "en");
}

export function formatIsoDateInNepal(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}
