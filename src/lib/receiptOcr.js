import { toLocalDateKey } from "@/lib/dateUtils";

const CURRENCY_PATTERNS = {
  INR: /(?:₹|rs\.?|inr)\s*/i,
  USD: /(?:\$|us\$|usd)\s*/i,
  EUR: /(?:€|eur)\s*/i,
  GBP: /(?:£|gbp)\s*/i,
  JPY: /(?:¥|jp¥|jpy)\s*/i,
  AED: /(?:aed|د\.إ)\s*/i,
  CAD: /(?:ca\$|c\$|cad)\s*/i,
  AUD: /(?:au\$|a\$|aud)\s*/i,
  SGD: /(?:sg\$|s\$|sgd)\s*/i,
  CNY: /(?:cn¥|rmb|cny|¥)\s*/i,
  BRL: /(?:r\$|brl)\s*/i,
  RUB: /(?:₽|rub)\s*/i,
};

const ALL_CURRENCY_PREFIX =
  /(?:₹|rs\.?|inr|\$|us\$|ca\$|a\$|s\$|r\$|usd|€|eur|£|gbp|¥|jpy|aed|د\.إ|cad|aud|sgd|rmb|cny|brl|₽|rub)\s*/i;

const MONTH_MAP = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function normalizeNumericToken(token) {
  if (!token) return null;
  const cleaned = token.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  // Handle European decimal comma (e.g., "45,99" or "1.245,50")
  if (/^\d{1,3}(?:\.\d{3})*,\d{1,2}$/.test(cleaned)) {
    const val = Number(cleaned.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(val) ? val : null;
  }
  if (/^\d+,\d{1,2}$/.test(cleaned)) {
    const val = Number(cleaned.replace(",", "."));
    return Number.isFinite(val) ? val : null;
  }

  // Standard comma thousands + dot decimal (e.g., "1,250.50" or "1,25,000.00")
  const normalized = cleaned.replace(/,/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const val = Number(normalized);
  if (!Number.isFinite(val) || val <= 0 || val > 99999999) return null;
  return Math.round(val * 100) / 100;
}

function extractNumbersFromLine(line) {
  const matches = [];
  const regex =
    /(?:(?:₹|rs\.?|inr|\$|us\$|ca\$|a\$|s\$|r\$|usd|€|eur|£|gbp|¥|jpy|aed|د\.إ|cad|aud|sgd|rmb|cny|brl|₽|rub)\s*)?(\d{1,3}(?:[.,]\d{2,3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi;

  let m;
  while ((m = regex.exec(line)) !== null) {
    const full = m[0];
    const numStr = m[1];
    // Skip obvious dates/times/phone numbers/long IDs
    const start = m.index;
    const after = line.slice(start + full.length, start + full.length + 2);
    const before = line.slice(Math.max(0, start - 1), start);
    if (after.startsWith("/") || after.startsWith("-") || after.startsWith(":")) {
      continue;
    }
    if (before === "/" || before === "-" || before === ":") {
      continue;
    }
    if (numStr.replace(/[^\d]/g, "").length > 9) {
      continue;
    }
    const val = normalizeNumericToken(numStr);
    if (val !== null) {
      matches.push({
        value: val,
        hasCurrencySymbol: ALL_CURRENCY_PREFIX.test(full),
        hasDecimals: /[.,]\d{2}$/.test(numStr),
      });
    }
  }
  return matches;
}

export function parseReceiptAmount(rawText, currencyCode = "INR") {
  if (!rawText || typeof rawText !== "string") return null;
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const activeCurrencyRegex =
    CURRENCY_PATTERNS[String(currencyCode || "INR").toUpperCase()] ||
    ALL_CURRENCY_PREFIX;

  const candidates = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Exclude non-payable lines when scoring total keywords
    const isExcludedLine =
      /\b(sub\s*total|subtotal|tax|gst|cgst|sgst|igst|vat|discount|savings|change|cash\s*tendered|tendered|round\s*off|invoice\s*no|receipt\s*no|order\s*id|gstin|tin|phone|tel|qty|rate)\b/i.test(
        lower,
      );

    let linePriority = 0;
    if (!isExcludedLine) {
      if (/\b(grand\s*total|net\s*total|total\s*payable|amount\s*payable|amount\s*due|balance\s*due|total\s*due|final\s*amount)\b/i.test(lower)) {
        linePriority = 100;
      } else if (/\b(total|net\s*amt|net\s*amount|bill\s*amount|paid|charged|amount)\b/i.test(lower)) {
        linePriority = 75;
      }
    }

    const nums = extractNumbersFromLine(line);
    for (const item of nums) {
      let score = linePriority;
      if (item.hasCurrencySymbol) score += 20;
      if (activeCurrencyRegex.test(line)) score += 10;
      if (item.hasDecimals) score += 10;
      if (isExcludedLine) score -= 40;
      // Later lines on receipts are more likely to be the final total
      score += Math.round((i / Math.max(1, lines.length)) * 12);

      candidates.push({
        value: item.value,
        score,
        hasDecimals: item.hasDecimals,
        hasCurrencySymbol: item.hasCurrencySymbol,
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.value - a.value;
  });

  return candidates[0].value;
}

function expandTwoDigitYear(yy) {
  const num = Number(yy);
  const currentTwoDigit = new Date().getFullYear() % 100;
  return num <= currentTwoDigit + 5 ? 2000 + num : 1900 + num;
}

function buildValidLocalDate(year, monthIndex, day) {
  if (
    year < 1990 ||
    year > 2100 ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const d = new Date(year, monthIndex, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== monthIndex ||
    d.getDate() !== day
  ) {
    return null;
  }
  return toLocalDateKey(d);
}

export function parseReceiptDate(rawText, currencyCode = "INR") {
  if (!rawText || typeof rawText !== "string") return null;

  const preferMdy = String(currencyCode || "").toUpperCase() === "USD";

  // 1. ISO: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = rawText.match(/\b(20\d{2}|19\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const res = buildValidLocalDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3]),
    );
    if (res) return res;
  }

  // 2. Named Month: DD MMM YYYY / DD MMM YY (e.g. 26 Nov 2026 or 26-Nov-26)
  const dmyTextMatch = rawText.match(
    /\b(0?[1-9]|[12]\d|3[01])[\s\-/.]+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s,\-/.]+(\d{2,4})\b/i,
  );
  if (dmyTextMatch) {
    const day = Number(dmyTextMatch[1]);
    const mon = MONTH_MAP[dmyTextMatch[2].toLowerCase()];
    const yrRaw = dmyTextMatch[3];
    const year = yrRaw.length === 2 ? expandTwoDigitYear(yrRaw) : Number(yrRaw);
    const res = buildValidLocalDate(year, mon, day);
    if (res) return res;
  }

  // 3. Named Month first: MMM DD, YYYY / MMM DD YY (e.g. Nov 26, 2026)
  const mdyTextMatch = rawText.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?[,\s\-]+(\d{2,4})\b/i,
  );
  if (mdyTextMatch) {
    const mon = MONTH_MAP[mdyTextMatch[1].toLowerCase()];
    const day = Number(mdyTextMatch[2]);
    const yrRaw = mdyTextMatch[3];
    const year = yrRaw.length === 2 ? expandTwoDigitYear(yrRaw) : Number(yrRaw);
    const res = buildValidLocalDate(year, mon, day);
    if (res) return res;
  }

  // 4. Numeric: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, MM/DD/YYYY, MM/DD/YY
  const numericMatch = rawText.match(
    /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/,
  );
  if (numericMatch) {
    const p1 = Number(numericMatch[1]);
    const p2 = Number(numericMatch[2]);
    const yrRaw = numericMatch[3];
    const year = yrRaw.length === 2 ? expandTwoDigitYear(yrRaw) : Number(yrRaw);

    if (p1 > 12) {
      const res = buildValidLocalDate(year, p2 - 1, p1);
      if (res) return res;
    } else if (p2 > 12) {
      const res = buildValidLocalDate(year, p1 - 1, p2);
      if (res) return res;
    } else if (preferMdy) {
      const res = buildValidLocalDate(year, p1 - 1, p2);
      if (res) return res;
    } else {
      const res = buildValidLocalDate(year, p2 - 1, p1);
      if (res) return res;
    }
  }

  return null;
}

export function parseReceiptMerchant(rawText) {
  if (!rawText || typeof rawText !== "string") return "";
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 6)) {
    if (line.length < 3 || line.length > 48) continue;
    if (/^(receipt|tax\s*invoice|invoice|welcome|bill|date|time|tel|gstin|store)/i.test(line)) {
      continue;
    }
    if (!/[a-zA-Z]{3,}/.test(line)) continue;
    if (/^\d+$/.test(line.replace(/[\s\-/.:]/g, ""))) continue;
    return line;
  }
  return "";
}

export function parseReceiptText(rawText, currencyCode = "INR") {
  return {
    amount: parseReceiptAmount(rawText, currencyCode),
    date: parseReceiptDate(rawText, currencyCode),
    note: parseReceiptMerchant(rawText),
    rawText: String(rawText || ""),
  };
}

/**
 * Downscales large images and boosts grayscale contrast before running OCR.
 */
export async function preprocessReceiptImage(imageBlob) {
  if (
    typeof document === "undefined" ||
    typeof createImageBitmap === "undefined"
  ) {
    return imageBlob;
  }

  const bitmap = await createImageBitmap(imageBlob);
  try {
    const maxDim = 1800;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return imageBlob;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Luminance grayscale + moderate contrast stretch
    const contrast = 1.35;
    const intercept = 128 * (1 - contrast);
    for (let i = 0; i < data.length; i += 4) {
      const gray =
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const boosted = Math.max(
        0,
        Math.min(255, gray * contrast + intercept),
      );
      data[i] = boosted;
      data[i + 1] = boosted;
      data[i + 2] = boosted;
    }
    ctx.putImageData(imgData, 0, 0);

    return await new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob || imageBlob),
        "image/png",
        0.95,
      );
    });
  } finally {
    bitmap.close?.();
  }
}

export async function convertHeicIfNeeded(file) {
  if (!file) throw new Error("No receipt file selected.");
  const name = String(file.name || "").toLowerCase();
  const type = String(file.type || "").toLowerCase();
  const isHeic =
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");

  if (!isHeic) return file;

  const heicModule = await import("heic2any");
  const heic2any = heicModule.default || heicModule;
  const converted = await heic2any({
    blob: file,
    toType: "image/png",
    quality: 0.92,
  });
  return Array.isArray(converted) ? converted[0] : converted;
}

/**
 * Lazy-loads self-hosted tesseract.js (zero external CDN calls) and extracts
 * prefill amount/date/merchant from PNG, JPG, WebP, or HEIC receipts.
 */
export async function extractReceiptData(
  file,
  currencyCode = "INR",
  onProgress,
) {
  onProgress?.({ stage: "preparing", progress: 0.1 });
  const normalizedBlob = await convertHeicIfNeeded(file);
  const processedBlob = await preprocessReceiptImage(normalizedBlob);

  onProgress?.({ stage: "loading_ocr", progress: 0.25 });
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker("eng", 1, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract",
    langPath: "/tesseract",
    logger: (msg) => {
      if (msg?.status === "recognizing text" && typeof msg.progress === "number") {
        onProgress?.({
          stage: "recognizing",
          progress: 0.35 + msg.progress * 0.6,
        });
      }
    },
  });

  try {
    const result = await worker.recognize(processedBlob);
    const rawText = result?.data?.text || "";
    const confidence = result?.data?.confidence ?? null;
    const parsed = parseReceiptText(rawText, currencyCode);
    onProgress?.({ stage: "done", progress: 1 });
    return {
      ...parsed,
      confidence,
    };
  } finally {
    await worker.terminate();
  }
}
