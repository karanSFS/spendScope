import { toLocalDateKey } from "@/lib/dateUtils";

const ONES_WORDS = {
  zero: 0,
  one: 1,
  a: 1,
  an: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS_WORDS = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const SCALES = {
  hundred: 100,
  thousand: 1000,
  k: 1000,
  lakh: 100000,
  lakhs: 100000,
  lac: 100000,
  lacs: 100000,
  million: 1000000,
  crore: 10000000,
  crores: 10000000,
};

const MONTH_INDEX = {
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

const WEEKDAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const CATEGORY_KEYWORDS = [
  {
    target: "Groceries",
    keywords: [
      "groceries",
      "grocery",
      "supermarket",
      "mart",
      "vegetables",
      "fruits",
      "milk",
      "dairy",
      "provisions",
      "ration",
      "bakery",
    ],
  },
  {
    target: "Debt Payments",
    keywords: ["debt", "emi", "loan", "credit card bill", "repayment", "installment"],
  },
  {
    target: "Dining",
    keywords: [
      "dining",
      "dinner",
      "lunch",
      "breakfast",
      "brunch",
      "coffee",
      "cafe",
      "restaurant",
      "pizza",
      "burger",
      "snack",
      "tea",
      "food",
    ],
  },
  {
    target: "Transportation",
    keywords: [
      "uber",
      "ola",
      "lyft",
      "taxi",
      "cab",
      "bus",
      "train",
      "metro",
      "fuel",
      "petrol",
      "diesel",
      "gas",
      "parking",
      "toll",
      "commute",
      "transport",
    ],
  },
  {
    target: "Housing",
    keywords: ["rent", "mortgage", "lease", "maintenance", "housing", "apartment"],
  },
  {
    target: "Utilities",
    keywords: [
      "electricity",
      "water bill",
      "internet",
      "wifi",
      "broadband",
      "phone bill",
      "mobile recharge",
      "recharge",
      "utilities",
      "utility",
      "gas bill",
    ],
  },
  {
    target: "Health & Wellness",
    keywords: [
      "doctor",
      "hospital",
      "pharmacy",
      "medicine",
      "clinic",
      "gym",
      "fitness",
      "medical",
      "dental",
      "health",
    ],
  },
  {
    target: "Entertainment",
    keywords: [
      "movie",
      "cinema",
      "netflix",
      "spotify",
      "concert",
      "game",
      "gaming",
      "entertainment",
      "streaming",
    ],
  },
  {
    target: "Shopping",
    keywords: [
      "amazon",
      "flipkart",
      "shopping",
      "clothes",
      "shoes",
      "shirt",
      "dress",
      "electronics",
      "mall",
    ],
  },
  {
    target: "Education",
    keywords: ["tuition", "course", "books", "book", "school", "college", "education", "exam"],
  },
  {
    target: "Insurance",
    keywords: ["insurance", "premium", "policy", "lic"],
  },
  {
    target: "Savings & Investments",
    keywords: ["sip", "mutual fund", "stocks", "savings", "investment", "deposit", "ppf", "fd"],
  },
  {
    target: "Travel",
    keywords: ["flight", "hotel", "vacation", "trip", "travel", "booking", "airbnb"],
  },
  {
    target: "Family & Children",
    keywords: ["kids", "child", "children", "daycare", "family", "gift", "parents"],
  },
  {
    target: "Salary",
    keywords: ["salary", "paycheck", "wages", "stipend"],
  },
  {
    target: "Freelance",
    keywords: ["freelance", "consulting", "gig", "contract", "client payment"],
  },
  {
    target: "Business",
    keywords: ["business", "revenue", "sales", "invoice paid"],
  },
  {
    target: "Interest",
    keywords: ["interest", "dividend", "cashback", "yield"],
  },
];

function parseWordsInteger(tokens) {
  let total = 0;
  let current = 0;
  let consumed = false;

  for (const rawTok of tokens) {
    const t = rawTok.toLowerCase();
    if (t === "and") continue;

    if (/^\d+(?:\.\d+)?$/.test(t)) {
      current += Number(t);
      consumed = true;
    } else if (t in ONES_WORDS) {
      current += ONES_WORDS[t];
      consumed = true;
    } else if (t in TENS_WORDS) {
      current += TENS_WORDS[t];
      consumed = true;
    } else if (t === "hundred") {
      current = (current || 1) * 100;
      consumed = true;
    } else if (t in SCALES) {
      const scale = SCALES[t];
      total += (current || 1) * scale;
      current = 0;
      consumed = true;
    } else {
      break;
    }
  }

  if (!consumed) return null;
  return total + current;
}

/**
 * Fixes Android integer-only truncation by parsing decimals (`45.50`),
 * `"point"` spoken decimals (`"forty five point five zero"`), currency cents/paise,
 * and Indian/Western scale words cleanly.
 */
export function parseSpokenNumber(transcript) {
  if (!transcript || typeof transcript !== "string") return null;

  const clean = transcript.replace(/,/g, "").trim();

  // 1. Subunit phrasing: e.g., "forty five dollars and fifty cents" / "45 rupees 50 paise"
  const subUnitMatch = clean.match(
    /(?:^|\s)([a-z0-9\s.-]+?)\s*(?:dollars?|rupees?|euros?|pounds?)\s*(?:and\s*)?([a-z0-9\s-]+?)\s*(?:cents?|paise|pence)\b/i,
  );
  if (subUnitMatch) {
    const major = parseSpokenNumber(subUnitMatch[1]);
    const minor = parseSpokenNumber(subUnitMatch[2]);
    if (major !== null && minor !== null && minor < 100) {
      return Math.round((major + minor / 100) * 100) / 100;
    }
  }

  // 2. Spoken "point" decimals with optional trailing scale: e.g., "forty five point five zero" or "1.5 lakh"
  const pointScaleMatch = clean.match(
    /\b(\d+)\.(\d+)\s*(k|thousand|lakh|lakhs|lac|lacs|million|crore|crores)\b/i,
  );
  if (pointScaleMatch) {
    const base = Number(`${pointScaleMatch[1]}.${pointScaleMatch[2]}`);
    const scale = SCALES[pointScaleMatch[3].toLowerCase()] || 1;
    const val = Math.round(base * scale * 100) / 100;
    return val > 0 ? val : null;
  }

  const spokenPointMatch = clean.match(
    /\b([a-z0-9\s-]+?)\s+point\s+([a-z0-9\s-]+?)(?:\s+(k|thousand|lakh|lakhs|lac|lacs|million|crore|crores))?(?=\s|$|[,.])/i,
  );
  if (spokenPointMatch) {
    const intPart = parseSpokenNumber(spokenPointMatch[1]);
    const fracTokens = spokenPointMatch[2].trim().split(/\s+/);
    let fracDigits = "";
    for (const ft of fracTokens) {
      if (/^\d+$/.test(ft)) {
        fracDigits += ft;
      } else if (ft.toLowerCase() in ONES_WORDS && ONES_WORDS[ft.toLowerCase()] < 10) {
        fracDigits += String(ONES_WORDS[ft.toLowerCase()]);
      } else if (ft.toLowerCase() in TENS_WORDS || ft.toLowerCase() in ONES_WORDS) {
        const two =
          TENS_WORDS[ft.toLowerCase()] ?? ONES_WORDS[ft.toLowerCase()];
        fracDigits += String(two);
      } else {
        break;
      }
    }
    if (intPart !== null && fracDigits.length > 0) {
      let val = Number(`${intPart}.${fracDigits}`);
      if (spokenPointMatch[3]) {
        val *= SCALES[spokenPointMatch[3].toLowerCase()] || 1;
      }
      val = Math.round(val * 100) / 100;
      if (val > 0) return val;
    }
  }

  // 3. Direct numeric literal with optional scale word (e.g., "45.50", "5k", "2 lakh")
  const numericMatches = [
    ...clean.matchAll(
      /(?:₹|\$|€|£|¥|rs\.?|inr|usd|eur|gbp)?\s*(\d+(?:\.\d{1,2})?)\s*(k|thousand|lakh|lakhs|lac|lacs|million|crore|crores)?\b/gi,
    ),
  ];
  // Avoid matching a day number when an explicit date follows (e.g. "on May 15")
  const nonDateNumbers = [];
  for (const m of numericMatches) {
    const idx = m.index ?? 0;
    const before = clean.slice(Math.max(0, idx - 16), idx).toLowerCase();
    const after = clean.slice(idx + m[0].length, idx + m[0].length + 14).toLowerCase();
    const monthAdjacent =
      /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*$/i.test(
        before,
      ) ||
      /^\s*(?:st|nd|rd|th)?\s*(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(
        after,
      );
    if (monthAdjacent && !m[2] && !/[₹$€£¥]/.test(m[0])) {
      continue;
    }
    let val = Number(m[1]);
    if (m[2]) {
      val *= SCALES[m[2].toLowerCase()] || 1;
    }
    if (Number.isFinite(val) && val > 0) {
      nonDateNumbers.push(Math.round(val * 100) / 100);
    }
  }
  if (nonDateNumbers.length > 0) {
    return nonDateNumbers[0];
  }

  // 4. Pure number words sequence anywhere in phrase
  const words = clean.toLowerCase().split(/[\s-]+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w in ONES_WORDS || w in TENS_WORDS || w in SCALES) {
      const val = parseWordsInteger(words.slice(i));
      if (val && val > 0) return Math.round(val * 100) / 100;
    }
  }

  return null;
}

/**
 * Extracts local YYYY-MM-DD date from spoken text.
 * Specifically avoids false positive on modal verb "may" (e.g., "I may have spent 50").
 */
export function extractVoiceDate(transcript, referenceDate = new Date()) {
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  if (!transcript || typeof transcript !== "string") {
    return toLocalDateKey(ref);
  }
  const lower = transcript.toLowerCase();

  if (/\bday before yesterday\b/.test(lower)) {
    const d = new Date(ref);
    d.setDate(d.getDate() - 2);
    return toLocalDateKey(d);
  }
  if (/\byesterday\b/.test(lower)) {
    const d = new Date(ref);
    d.setDate(d.getDate() - 1);
    return toLocalDateKey(d);
  }
  if (/\btoday\b/.test(lower)) {
    return toLocalDateKey(ref);
  }
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(ref);
    d.setDate(d.getDate() + 1);
    return toLocalDateKey(d);
  }

  const weekdayMatch = lower.match(
    /\blast\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
  );
  if (weekdayMatch) {
    const targetDay = WEEKDAY_INDEX[weekdayMatch[1]];
    const diff = (ref.getDay() - targetDay + 7) % 7 || 7;
    const d = new Date(ref);
    d.setDate(d.getDate() - diff);
    return toLocalDateKey(d);
  }

  // Explicit DD Month (YYYY) — safe for "may" because a day number is required
  const dmyMatch = lower.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{4}))?\b/,
  );
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = MONTH_INDEX[dmyMatch[2]];
    const year = dmyMatch[3] ? Number(dmyMatch[3]) : ref.getFullYear();
    const d = new Date(year, month, day);
    if (d.getMonth() === month && d.getDate() === day) {
      return toLocalDateKey(d);
    }
  }

  // Explicit Month DD (YYYY) — safe for "may" because a day number follows immediately
  const mdyMatch = lower.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/,
  );
  if (mdyMatch) {
    const month = MONTH_INDEX[mdyMatch[1]];
    const day = Number(mdyMatch[2]);
    const year = mdyMatch[3] ? Number(mdyMatch[3]) : ref.getFullYear();
    const d = new Date(year, month, day);
    if (d.getMonth() === month && d.getDate() === day) {
      return toLocalDateKey(d);
    }
  }

  return toLocalDateKey(ref);
}

export function inferVoiceKind(transcript) {
  if (!transcript || typeof transcript !== "string") return "expense";
  const lower = transcript.toLowerCase();
  if (
    /\b(received|earned|got paid|income|salary|paycheck|freelance payment|refund|bonus|credited|dividend)\b/.test(
      lower,
    )
  ) {
    return "income";
  }
  return "expense";
}

export function inferVoiceCategory(transcript, categories = [], kind = "expense") {
  if (!Array.isArray(categories) || categories.length === 0) return "";
  const lower = String(transcript || "").toLowerCase();
  const sameKindCats = categories.filter(
    (c) => String(c.kind || c.type || "expense").toLowerCase() === kind,
  );
  const pool = sameKindCats.length > 0 ? sameKindCats : categories;

  // 1. Direct exact/substring match with user's own category names
  for (const cat of pool) {
    const catName = String(cat.name || "").trim().toLowerCase();
    if (catName && lower.includes(catName)) {
      return cat.id;
    }
  }

  // 2. Keyword dictionary -> matching SpendScope default category
  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      const targetLower = rule.target.toLowerCase();
      const matched = pool.find((c) => {
        const n = String(c.name || "").toLowerCase();
        return n === targetLower || n.includes(targetLower.split(" ")[0]);
      });
      if (matched) return matched.id;
    }
  }

  // Fallback to "Other" / first category of kind
  const other = pool.find((c) =>
    String(c.name || "").toLowerCase().startsWith("other"),
  );
  return other?.id || pool[0]?.id || "";
}

export function parseVoiceTransaction(
  transcript,
  categories = [],
  referenceDate = new Date(),
) {
  const cleanText = String(transcript || "").trim();
  const kind = inferVoiceKind(cleanText);
  const amount = parseSpokenNumber(cleanText);
  const date = extractVoiceDate(cleanText, referenceDate);
  const categoryId = inferVoiceCategory(cleanText, categories, kind);

  return {
    amount,
    kind,
    categoryId,
    date,
    note: cleanText,
    transcript: cleanText,
  };
}

export function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createVoiceRecognizer({
  lang = "en-US",
  onInterim,
  onResult,
  onError,
  onEnd,
} = {}) {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRec();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  let finished = false;

  recognition.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) {
        finalText += res[0].transcript;
      } else {
        interim += res[0].transcript;
      }
    }
    if (interim) onInterim?.(interim.trim());
    if (finalText && !finished) {
      finished = true;
      onResult?.(finalText.trim());
    }
  };

  recognition.onerror = (event) => {
    onError?.(event?.error || "speech-error");
  };

  recognition.onend = () => {
    onEnd?.();
  };

  return recognition;
}
