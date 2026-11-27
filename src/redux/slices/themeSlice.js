import { createSlice } from "@reduxjs/toolkit";
import { buildTheme } from "../../utils/theme.js";

const initialTheme = buildTheme("light", null);

const initialState = {
  mode: initialTheme.mode,
  customAccent: null,
  tokens: initialTheme.tokens,
  colors: initialTheme.colors,
};

const themeSlice = createSlice({
  name: "theme-color",
  initialState,
  reducers: {
    changePrimaryColor: (state, action) => {
      const nextAccent = action?.payload || null;
      const built = buildTheme(state.mode || "light", nextAccent);
      state.customAccent = built.customAccent;
      state.tokens = built.tokens;
      state.colors = built.colors;
    },
    changeTheme: (state, action) => {
      const nextMode =
        action?.payload === "dark" || action?.payload === "light"
          ? action.payload
          : state.mode === "light"
            ? "dark"
            : "light";
      const built = buildTheme(nextMode, state.customAccent || null);
      state.mode = built.mode;
      state.tokens = built.tokens;
      state.colors = built.colors;
    },
    resetThemeAccent: (state) => {
      const built = buildTheme(state.mode || "light", null);
      state.customAccent = null;
      state.tokens = built.tokens;
      state.colors = built.colors;
    },
    applyPreferencesTheme: (state, action) => {
      const mode = action?.payload?.appearance_mode || state.mode || "light";
      const accent =
        action?.payload?.accent_color !== undefined
          ? action.payload.accent_color
          : state.customAccent;
      const built = buildTheme(mode, accent);
      state.mode = built.mode;
      state.customAccent = built.customAccent;
      state.tokens = built.tokens;
      state.colors = built.colors;
    },
  },
});

export const {
  changePrimaryColor,
  changeTheme,
  resetThemeAccent,
  applyPreferencesTheme,
} = themeSlice.actions;
export default themeSlice.reducer;
