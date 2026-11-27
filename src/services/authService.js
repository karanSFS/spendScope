import { supabase, isSupabaseConfigured } from "@/lib/supabaseconfig";

export const MIN_PASSWORD_LENGTH = 12;

const assertSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      "Cloud backup is not configured yet. Continue in local guest mode or check Supabase environment keys.",
    );
  }
  return supabase;
};

/**
 * Create or update profile in public.profiles using v2 schema columns only.
 */
export const createOrUpdateProfile = async ({
  userId,
  displayName,
  fullName,
  email = null,
  phone = null,
  avatarKey = "user_pf",
  defaultCurrency = "INR",
  currency,
}) => {
  const client = assertSupabase();
  const resolvedName = String(
    displayName || fullName || email?.split("@")?.[0] || "SpendScope User",
  )
    .trim()
    .slice(0, 80);
  const resolvedCurrency = String(defaultCurrency || currency || "INR")
    .trim()
    .toUpperCase();

  const profilePayload = {
    id: userId,
    display_name: resolvedName || "SpendScope User",
    email: email || null,
    phone: phone ? String(phone).trim() : null,
    avatar_key: avatarKey || "user_pf",
    default_currency: /^[A-Z]{3}$/.test(resolvedCurrency)
      ? resolvedCurrency
      : "INR",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data || profilePayload;
};

/**
 * Get profile record for a user from public.profiles
 */
export const getProfile = async (userId) => {
  if (!userId || !isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

/**
 * Sign up a new user (requires >= 12 char password matching Supabase Auth policy).
 * Server trigger handle_new_user() creates profiles + user_preferences automatically.
 */
export const signUp = async ({
  email,
  password,
  displayName,
  fullName,
  phone = null,
  currency = "INR",
}) => {
  const client = assertSupabase();
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  const cleanName = String(
    displayName || fullName || email?.split("@")?.[0] || "SpendScope User",
  )
    .trim()
    .slice(0, 80);
  const cleanCurrency = /^[A-Z]{3}$/.test(String(currency || "").toUpperCase())
    ? String(currency).toUpperCase()
    : "INR";

  const { data, error } = await client.auth.signUp({
    email: String(email).trim(),
    password,
    options: {
      data: {
        display_name: cleanName,
        phone: phone ? String(phone).trim() : null,
        currency: cleanCurrency,
      },
    },
  });

  if (error) {
    throw error;
  }

  let profile = null;
  if (data?.session && data?.user?.id) {
    profile = await getProfile(data.user.id);
    if (!profile) {
      try {
        profile = await createOrUpdateProfile({
          userId: data.user.id,
          displayName: cleanName,
          email: data.user.email || email,
          phone,
          defaultCurrency: cleanCurrency,
        });
      } catch {
        // Ignore if email confirmation is required before profile RLS passes
      }
    }
  }

  return {
    ...data,
    profile,
  };
};

/**
 * Update existing user profile and auth metadata
 */
export const updateUserProfile = async ({
  userId,
  displayName,
  fullName,
  email,
  phone = null,
  avatarKey = "user_pf",
  defaultCurrency = "INR",
  currency,
}) => {
  const client = assertSupabase();
  const cleanName = String(displayName || fullName || "SpendScope User")
    .trim()
    .slice(0, 80);
  const cleanCurrency = String(defaultCurrency || currency || "INR")
    .trim()
    .toUpperCase();

  const authUpdates = {
    data: {
      display_name: cleanName,
      phone: phone ? String(phone).trim() : null,
      currency: cleanCurrency,
    },
  };
  if (email) {
    authUpdates.email = String(email).trim();
  }

  const { error: authErr } = await client.auth.updateUser(authUpdates);
  if (authErr) {
    throw authErr;
  }

  return await createOrUpdateProfile({
    userId,
    displayName: cleanName,
    email,
    phone,
    avatarKey,
    defaultCurrency: cleanCurrency,
  });
};

export const updateUserPassword = async (newPassword) => {
  const client = assertSupabase();
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return true;
};

/**
 * Login user and fetch their profile
 */
export const login = async ({ email, password }) => {
  const client = assertSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: String(email).trim(),
    password,
  });

  if (error) {
    throw error;
  }

  let profile = null;
  if (data?.user?.id) {
    profile = await getProfile(data.user.id);
    if (!profile) {
      try {
        profile = await createOrUpdateProfile({
          userId: data.user.id,
          displayName:
            data.user.user_metadata?.display_name ||
            data.user.user_metadata?.full_name ||
            data.user.email?.split("@")?.[0] ||
            "SpendScope User",
          email: data.user.email,
          phone: data.user.user_metadata?.phone || null,
          defaultCurrency: data.user.user_metadata?.currency || "INR",
        });
      } catch {
        // Non-fatal fallback
      }
    }
  }

  return {
    ...data,
    profile,
  };
};

export const logout = async () => {
  if (!isSupabaseConfigured || !supabase) return true;
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
  return true;
};

export const getCurrentUser = async () => {
  if (!isSupabaseConfigured || !supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getSession = async () => {
  if (!isSupabaseConfigured || !supabase) return null;
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

export const getAuthErrorMessage = (error) => {
  if (!error) return "An unexpected error occurred. Please try again.";
  if (typeof error === "string") return error;

  const rawMessage =
    error?.message || error?.error_description || error?.msg || "";
  const message = String(rawMessage).toLowerCase();
  const code = String(error?.code || error?.status || "").toLowerCase();

  if (
    code === "invalid_credentials" ||
    code === "400" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials") ||
    message.includes("invalid email or password")
  ) {
    return "Invalid email or password. Please try again.";
  }

  if (
    code === "user_not_found" ||
    message.includes("user not found") ||
    message.includes("user does not exist")
  ) {
    return "No account found with this email.";
  }

  if (
    message.includes("user already registered") ||
    message.includes("user already exists") ||
    code === "user_already_exists"
  ) {
    return "An account with this email already exists.";
  }

  if (message.includes("email not confirmed") || code === "email_not_confirmed") {
    return "Please verify your email before logging in.";
  }

  if (
    message.includes("password should be at least") ||
    message.includes("password must be at least")
  ) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (message.includes("invalid email") || code === "invalid_email") {
    return "Please enter a valid email address.";
  }

  if (
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    code === "too_many_requests" ||
    code === "429"
  ) {
    return "Too many attempts. Please try again in a moment.";
  }

  return rawMessage || "An unexpected error occurred. Please try again.";
};

export const verifyUserPassword = async (email, password) => {
  try {
    if (!email || !password) {
      return { isValid: false, error: "Please enter your password." };
    }
    const client = assertSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return {
        isValid: false,
        error: "Incorrect password. Please enter the correct password.",
      };
    }
    return { isValid: true, user: data?.user };
  } catch (err) {
    return {
      isValid: false,
      error: err?.message || "Incorrect password. Please try again.",
    };
  }
};
