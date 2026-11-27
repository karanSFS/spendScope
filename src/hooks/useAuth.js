"use client";

import { useSelector, useDispatch } from "react-redux";
import {
  setAuthSession,
  enterGuestMode,
  logoutUser,
  updateProfile,
} from "@/redux/slices/authSlice";
import { resetAppUiState } from "@/redux/slices/appSlice";
import {
  login as apiLogin,
  signUp as apiSignUp,
  logout as apiLogout,
  getProfile,
} from "@/services/authService";
import { closeOwnerDb, deleteOwnerDb } from "@/lib/localDb";
import { syncNow } from "@/lib/syncEngine";
import { useRouter } from "next/navigation";

export const useAuth = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const authState = useSelector((state) => state?.authSlice) || {};

  const signIn = async ({ email, password }) => {
    const previousOwnerId = authState.userId || null;
    if (previousOwnerId) {
      await closeOwnerDb(previousOwnerId);
    }
    const data = await apiLogin({ email, password });
    const user = data?.user;
    const session = data?.session;
    const profile = data?.profile;

    if (session && user?.id) {
      dispatch(resetAppUiState());
      dispatch(setAuthSession({ user, session, profile }));
      await syncNow(user.id, {
        defaultCurrency: profile?.default_currency || "INR",
      });
    }
    return data;
  };

  const signUp = async ({
    email,
    password,
    displayName,
    fullName,
    phone,
    currency,
  }) => {
    const data = await apiSignUp({
      email,
      password,
      displayName: displayName || fullName,
      phone,
      currency,
    });
    const user = data?.user;
    const session = data?.session;
    const profile = data?.profile;

    if (session && user?.id) {
      dispatch(resetAppUiState());
      dispatch(setAuthSession({ user, session, profile }));
      await syncNow(user.id, {
        defaultCurrency: profile?.default_currency || currency || "INR",
      });
    }
    return data;
  };

  const continueAsGuest = () => {
    dispatch(enterGuestMode());
    router.push("/dashboard");
  };

  const logout = async ({ wipeLocal = false } = {}) => {
    const currentUserId = authState.userId;
    try {
      await apiLogout();
    } catch {
      // Ignore API logout error and clear local session anyway
    } finally {
      if (currentUserId) {
        if (wipeLocal) {
          await deleteOwnerDb(currentUserId);
        } else {
          await closeOwnerDb(currentUserId);
        }
      }
      dispatch(resetAppUiState());
      dispatch(logoutUser());
      router.replace("/");
    }
  };

  const fetchProfile = async () => {
    if (!authState.userId) return null;
    try {
      const profile = await getProfile(authState.userId);
      if (profile) {
        dispatch(updateProfile({ profile }));
      }
      return profile;
    } catch {
      return null;
    }
  };

  const userData = authState.userData || {};
  const profile = authState.profile || userData.profile || null;
  const displayName =
    profile?.display_name ||
    userData.user_metadata?.display_name ||
    userData.user_metadata?.full_name ||
    userData.name ||
    "";
  const email = profile?.email || authState.email || userData.email || "";
  const phone = profile?.phone || "";
  const defaultCurrency = profile?.default_currency || "INR";

  return {
    user: userData,
    userId: authState.userId || null,
    token: authState.token || null,
    authReady: Boolean(authState.authReady),
    isGuest: authState.isGuest !== false && !authState.userId,
    isAuthenticated: Boolean(authState.userId),
    profile,
    displayName,
    fullName: displayName,
    email,
    phone,
    defaultCurrency,
    signIn,
    login: signIn,
    signUp,
    signup: signUp,
    continueAsGuest,
    logout,
    fetchProfile,
  };
};

export default useAuth;
