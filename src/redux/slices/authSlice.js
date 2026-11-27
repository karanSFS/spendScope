import { createSlice } from "@reduxjs/toolkit";
import { emptyStore } from "../actions.js";
import Cookies from "js-cookie";

const initialState = {
  authReady: false,
  isGuest: true,
  userId: null,
  email: null,
  profile: null,
  userData: null,
  token: null,
};

export const clearLegacySessionArtifacts = () => {
  try {
    Cookies.remove("token");
    Cookies.remove("use_role");
  } catch {
    // Ignore cookie errors in non-DOM tests
  }
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthSession: (state, action) => {
      clearLegacySessionArtifacts();
      const { user = null, session = null, profile = null } =
        action?.payload || {};
      state.authReady = true;
      if (user?.id) {
        state.isGuest = false;
        state.userId = user.id;
        state.email = profile?.email || user.email || null;
        state.profile = profile || state.profile || null;
        state.token = session?.access_token || null;
        state.userData = {
          ...user,
          email: profile?.email || user.email,
          name:
            profile?.display_name ||
            user.user_metadata?.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "SpendScope User",
          profile: profile || state.profile || null,
        };
      } else {
        state.isGuest = true;
        state.userId = null;
        state.email = null;
        state.profile = null;
        state.token = null;
        state.userData = null;
      }
    },
    enterGuestMode: (state) => {
      clearLegacySessionArtifacts();
      state.authReady = true;
      state.isGuest = true;
      state.userId = null;
      state.email = null;
      state.profile = null;
      state.token = null;
      state.userData = null;
    },
    // Legacy-compatible action aliases kept for existing consumers during phased migration
    logingAuth: (state, action) => {
      clearLegacySessionArtifacts();
      const payload = action?.payload || {};
      const userData = payload.userData || {};
      const userId = payload.userId || userData.user?.id || userData.id || null;
      state.authReady = true;
      state.isGuest = !userId;
      state.userId = userId;
      state.token = payload.token || userData.session?.access_token || null;
      state.email = userData.profile?.email || userData.email || null;
      state.profile = userData.profile || null;
      state.userData = userId ? userData : null;
    },
    logoutUser: (state) => {
      clearLegacySessionArtifacts();
      state.authReady = true;
      state.isGuest = true;
      state.userId = null;
      state.email = null;
      state.profile = null;
      state.token = null;
      state.userData = null;
    },
    updateProfile: (state, action) => {
      const nextProfile = action?.payload?.profile || action?.payload || null;
      state.profile = nextProfile
        ? { ...(state.profile || {}), ...nextProfile }
        : state.profile;
      state.userData = {
        ...(state.userData || {}),
        ...(action?.payload || {}),
        profile: state.profile,
      };
      if (state.profile?.email) {
        state.email = state.profile.email;
      }
    },
  },
  extraReducers(builder) {
    builder.addCase(emptyStore, () => {
      clearLegacySessionArtifacts();
      return { ...initialState, authReady: true };
    });
  },
});

export const {
  setAuthSession,
  enterGuestMode,
  logingAuth,
  logoutUser,
  updateProfile,
} = authSlice.actions;
export default authSlice.reducer;
