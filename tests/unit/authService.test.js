import { describe, it, expect, vi, beforeEach } from "vitest";

const authMocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
  from: vi.fn(),
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
    from: authMocks.from,
  },
}));

import {
  MIN_PASSWORD_LENGTH,
  signUp,
  createOrUpdateProfile,
  profileFromUser,
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

  it("stores profile fields in Auth user_metadata (shared DB has no profiles table)", async () => {
    authMocks.updateUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "alex@example.com",
          user_metadata: {
            display_name: "Alex Morgan",
            phone: "+91 9999999999",
            avatar_key: "user_pf2",
            currency: "USD",
          },
        },
      },
      error: null,
    });

    const profile = await createOrUpdateProfile({
      displayName: "Alex Morgan",
      email: "alex@example.com",
      phone: "+91 9999999999",
      avatarKey: "user_pf2",
      defaultCurrency: "usd",
    });

    expect(authMocks.updateUser).toHaveBeenCalledTimes(1);
    expect(authMocks.updateUser.mock.calls[0][0]).toEqual({
      data: {
        display_name: "Alex Morgan",
        phone: "+91 9999999999",
        avatar_key: "user_pf2",
        currency: "USD",
      },
    });
    // No table access: the shared schema has no `profiles` table.
    expect(authMocks.from).not.toHaveBeenCalled();
    expect(profile).toMatchObject({
      id: "user-123",
      display_name: "Alex Morgan",
      email: "alex@example.com",
      phone: "+91 9999999999",
      avatar_key: "user_pf2",
      default_currency: "USD",
    });
  });

  it("builds a profile from a user object with safe defaults", () => {
    expect(profileFromUser(null)).toBeNull();
    expect(
      profileFromUser({ id: "u1", email: "sam@example.com", user_metadata: {} }),
    ).toMatchObject({
      id: "u1",
      display_name: "sam",
      avatar_key: "user_pf",
      default_currency: "INR",
    });
  });

  it("maps Supabase password length errors cleanly", () => {
    expect(
      getAuthErrorMessage({
        message: "Password should be at least 12 characters",
      }),
    ).toBe("Password must be at least 12 characters.");
  });
});
