const currencyFlagCodes: Record<string, string> = {
  AED: "ae",
  AUD: "au",
  BHD: "bh",
  CAD: "ca",
  CHF: "ch",
  CNY: "cn",
  DKK: "dk",
  EUR: "eu",
  GBP: "gb",
  HKD: "hk",
  INR: "in",
  JPY: "jp",
  KRW: "kr",
  KWD: "kw",
  MYR: "my",
  OMR: "om",
  QAR: "qa",
  SAR: "sa",
  SEK: "se",
  SGD: "sg",
  THB: "th",
  USD: "us",
};

export function flagClassForCurrency(iso3: string) {
  const code = currencyFlagCodes[iso3];
  return code ? `fi fi-${code}` : "fi";
}
