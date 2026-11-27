import { describe, it, expect, vi, beforeEach } from "vitest";

const authMocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
  upsert: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabaseconfig", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signUp: authMocks.signUp,
      signInWithPassword: authMocks.signInWithPassword,
      signOut: authMocks.signOut,
      updateUser: authMocks.updateUser,
    },
    from: vi.fn(() => ({
      upsert: vi.fn((payload) => {
        authMocks.upsert(payload);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: payload, error: null }),
          }),
        };
      }),
      select: () => ({
        eq: () => ({
          maybeSingle: authMocks.maybeSingle,
        }),
      }),
    })),
  },
}));

import {
  MIN_PASSWORD_LENGTH,
  signUp,
  createOrUpdateProfile,
  getAuthErrorMessage,
} from "@/services/authService";

describe("authService v2 policy & profile schema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces minimum 12-character password on signUp", async () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
    await expect(
      signUp({
        email: "alex@example.com",
        password: "shortpass",
        displayName: "Alex",
      }),
    ).rejects.toThrow("at least 12 characters");
    expect(authMocks.signUp).not.toHaveBeenCalled();
  });

  it("writes only v2 public.profiles columns (never legacy role/full_name/currency)", async () => {
    await createOrUpdateProfile({
      userId: "user-123",
      displayName: "Alex Morgan",
      email: "alex@example.com",
      phone: "+91 9999999999",
      avatarKey: "user_pf2",
      defaultCurrency: "usd",
    });

    expect(authMocks.upsert).toHaveBeenCalledTimes(1);
    const written = authMocks.upsert.mock.calls[0][0];
    expect(written).toMatchObject({
      id: "user-123",
      display_name: "Alex Morgan",
      email: "alex@example.com",
      phone: "+91 9999999999",
      avatar_key: "user_pf2",
      default_currency: "USD",
    });
    expect(written.role).toBeUndefined();
    expect(written.full_name).toBeUndefined();
    expect(written.currency).toBeUndefined();
  });

  it("maps Supabase password length errors cleanly", () => {
    expect(
      getAuthErrorMessage({
        message: "Password should be at least 12 characters",
      }),
    ).toBe("Password must be at least 12 characters.");
  });
});
