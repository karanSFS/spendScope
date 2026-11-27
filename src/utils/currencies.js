export const CURRENCIES = [
  {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    flag: "🇮🇳",
    locale: "en-IN",
  },
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    flag: "🇺🇸",
    locale: "en-US",
  },
  {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    flag: "🇪🇺",
    locale: "de-DE",
  },
  {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    flag: "🇬🇧",
    locale: "en-GB",
  },
  {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    flag: "🇯🇵",
    locale: "ja-JP",
  },
  {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    flag: "🇦🇺",
    locale: "en-AU",
  },
  {
    code: "CAD",
    symbol: "C$",
    name: "Canadian Dollar",
    flag: "🇨🇦",
    locale: "en-CA",
  },
  {
    code: "CNY",
    symbol: "¥",
    name: "Chinese Yuan",
    flag: "🇨🇳",
    locale: "zh-CN",
  },
  {
    code: "BRL",
    symbol: "R$",
    name: "Brazilian Real",
    flag: "🇧🇷",
    locale: "pt-BR",
  },
  {
    code: "RUB",
    symbol: "₽",
    name: "Russian Ruble",
    flag: "🇷🇺",
    locale: "ru-RU",
  },
  {
    code: "AED",
    symbol: "د.إ",
    name: "UAE Dirham",
    flag: "🇦🇪",
    locale: "ar-AE",
  },
  {
    code: "SGD",
    symbol: "S$",
    name: "Singapore Dollar",
    flag: "🇸🇬",
    locale: "en-SG",
  },
];

export const DEFAULT_CURRENCY = CURRENCIES[0]; // INR ₹

export const getCurrencySymbol = (currencyCode = "INR") => {
  const code = String(currencyCode || "INR").toUpperCase();
  const found = CURRENCIES.find((c) => c.code === code);
  return found ? found.symbol : "₹";
};

export const getCurrencyConfig = (currencyCode = "INR") => {
  const code = String(currencyCode || "INR").toUpperCase();
  return CURRENCIES.find((c) => c.code === code) || DEFAULT_CURRENCY;
};

const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND"]);

/**
 * Formats an amount using the active account currency without Android's
 * [0.0, 0.1] * 100 truncation bug.
 */
export const formatMoney = (
  value,
  currencyCode = "INR",
  { minimumFractionDigits = 0, maximumFractionDigits = 2, showSign = false } = {},
) => {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  const config = getCurrencyConfig(currencyCode);
  const maxFrac = ZERO_DECIMAL_CURRENCIES.has(config.code)
    ? 0
    : maximumFractionDigits;
  const minFrac = Math.min(minimumFractionDigits, maxFrac);
  const factor = Math.pow(10, maxFrac);
  const abs = Math.abs(safe);
  const rounded = Math.round((abs + Number.EPSILON) * factor) / factor;
  const formattedNumber = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  }).format(rounded);

  const prefix =
    rounded > 0 && safe < 0 ? "-" : showSign && rounded > 0 && safe > 0 ? "+" : "";
  return `${prefix}${config.symbol}${formattedNumber}`;
};
