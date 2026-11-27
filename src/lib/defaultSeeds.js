export const AVATAR_KEYS = [
  "user_pf",
  "user_pf1",
  "user_pf2",
  "user_pf3",
  "user_pf4",
  "user_pf5",
  "user_pf6",
  "user_pf7",
  "user_pf8",
  "user_pf9",
];

// First 15 colors from spend_scope_android/app/src/main/res/raw/colors.json
export const ANDROID_DEFAULT_CATEGORY_COLORS = [
  { name: "astral", hex: "#327da0" },
  { name: "your pink", hex: "#ffc3c0" },
  { name: "willpower orange", hex: "#fd5800" },
  { name: "yale blue", hex: "#0f4d92" },
  { name: "zomp", hex: "#39a78e" },
  { name: "june bud", hex: "#bdda57" },
  { name: "well read", hex: "#b43332" },
  { name: "zest", hex: "#e5841b" },
  { name: "yukon gold", hex: "#7b6608" },
  { name: "peanut", hex: "#782f16" },
  { name: "woodland", hex: "#4d5328" },
  { name: "russian green", hex: "#679267" },
  { name: "governor bay", hex: "#2f3cb3" },
  { name: "purple", hex: "#800080" },
  { name: "alabama crimson", hex: "#af002a" },
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Housing", icon_key: "housing" },
  { name: "Utilities", icon_key: "utilities" },
  { name: "Dining Out", icon_key: "dining" },
  { name: "Transportation", icon_key: "transportation" },
  { name: "Groceries", icon_key: "groceries" },
  { name: "Health", icon_key: "health_wellness" },
  { name: "Education", icon_key: "education" },
  { name: "Entertainment", icon_key: "entertainment" },
  { name: "Shopping", icon_key: "shopping" },
  { name: "Insurance", icon_key: "insurance" },
  { name: "Savings", icon_key: "savings_investments" },
  { name: "Family", icon_key: "family_children" },
  { name: "Travel", icon_key: "travel" },
  { name: "Debt Payments", icon_key: "debt_payments" },
  { name: "Other", icon_key: "other" },
].map((cat, idx) => ({
  ...cat,
  kind: "expense",
  position: idx + 1,
  color: ANDROID_DEFAULT_CATEGORY_COLORS[idx].hex,
  color_name: ANDROID_DEFAULT_CATEGORY_COLORS[idx].name,
  is_default: true,
}));

export const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salary", icon_key: "salary" },
  { name: "Transfer", icon_key: "transfer" },
  { name: "Business Income", icon_key: "business_income" },
  { name: "Freelance", icon_key: "freelance" },
  { name: "Interest Income", icon_key: "interest_income" },
  { name: "Other", icon_key: "other_income" },
].map((cat, idx) => ({
  ...cat,
  kind: "income",
  position: idx + 1,
  color: ANDROID_DEFAULT_CATEGORY_COLORS[idx].hex,
  color_name: ANDROID_DEFAULT_CATEGORY_COLORS[idx].name,
  is_default: true,
}));

export const ICON_GROUPS = [
  {
    id: "bills",
    label: "Bills & Utilities",
    icons: [
      "bill_mobile",
      "bill_wifi",
      "bill_fire",
      "bill_router_fill",
      "bill_lightning_fill",
      "bill_droplet_fill",
      "bill_tap",
      "bill_tv",
      "bill_hotspot",
      "bill_world",
    ],
  },
  {
    id: "household",
    label: "Household & Gifts",
    icons: [
      "house_heart_fill",
      "house_gift_fill",
      "house_heart_gift",
      "house_cart_fill",
      "house_bag",
      "house_bucket",
      "house_color",
      "house_profile",
      "house_couple",
      "house_stamp",
      "house_pencil_fill",
      "house_sunglasses",
      "house_paint",
      "house_email",
    ],
  },
  {
    id: "food",
    label: "Food & Drink",
    icons: [
      "food_plate",
      "food_spoon",
      "food_burger",
      "food_pizza",
      "food_drink",
    ],
  },
  {
    id: "clothing",
    label: "Clothing",
    icons: [
      "cloth_tshirt",
      "cloth_frok",
      "cloth_hanger",
      "cloth_tie",
      "cloth_band",
      "cloth_hat",
      "cloth_shoes",
      "cloth_shandle",
    ],
  },
  {
    id: "health",
    label: "Health & Personal",
    icons: [
      "health_plus",
      "health_safe",
      "health_make_up",
      "health_teeth",
      "health_band",
      "health_smile",
      "health_sad",
      "health_family",
    ],
  },
  {
    id: "sports",
    label: "Sports & Fitness",
    icons: [
      "sport_dumble",
      "sport_cricket",
      "sport_baseball",
      "sport_basketball",
      "sport_football",
      "sport_cycle",
      "sport_scating",
      "sport_swiming",
      "sport_run",
    ],
  },
  {
    id: "entertainment",
    label: "Entertainment",
    icons: [
      "entertain_player",
      "entertain_pc",
      "entertain_horse",
      "entertain_joystic",
      "entertain_mask",
    ],
  },
  {
    id: "home",
    label: "Home & Family",
    icons: ["home_sofa", "home_tree", "home_xmas", "home_ring"],
  },
  {
    id: "travel",
    label: "Travel & Commute",
    icons: ["travel_train", "travel_scotty", "travel_flight", "travel_car"],
  },
  {
    id: "money",
    label: "Money & Finance",
    icons: [
      "money_bag",
      "money_transfer",
      "money_invest",
      "money_timer",
      "money_sync",
      "money_graph",
      "money_pig",
      "money_card",
    ],
  },
  {
    id: "defaults",
    label: "Default Categories",
    icons: [
      "housing",
      "utilities",
      "dining",
      "transportation",
      "groceries",
      "health_wellness",
      "education",
      "entertainment",
      "shopping",
      "insurance",
      "savings_investments",
      "family_children",
      "travel",
      "debt_payments",
      "other",
      "salary",
      "transfer",
      "business_income",
      "freelance",
      "interest_income",
      "other_income",
    ],
  },
];

export const ALL_ICON_KEYS = Array.from(
  new Set(ICON_GROUPS.flatMap((g) => g.icons)),
);

export const BUCKET_PRESET_ICONS = [
  "travel_flight",
  "house_heart_fill",
  "house_gift_fill",
  "health_plus",
  "travel_car",
  "money_pig",
  "house_bucket",
  "health_smile",
];

export function generateUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function buildDefaultAccount(ownerId, currencyCode = "INR") {
  const now = new Date().toISOString();
  return {
    id: generateUuid(),
    owner_id: ownerId || null,
    name: "Default",
    avatar_key: "user_pf",
    currency_code: currencyCode || "INR",
    is_default: true,
    spending_period: "Monthly",
    budget_amount: null,
    include_income: false,
    budget_mode: false,
    expense_amount: null,
    reminders: "Never",
    reminder_hour: null,
    reminder_minute: null,
    hide_transactions: false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}

export function buildDefaultCategories(ownerId) {
  const now = new Date().toISOString();
  return [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES].map(
    (cat) => ({
      id: generateUuid(),
      owner_id: ownerId || null,
      kind: cat.kind,
      name: cat.name,
      icon_key: cat.icon_key,
      color: cat.color,
      color_name: cat.color_name,
      position: cat.position,
      is_default: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }),
  );
}
