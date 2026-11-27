import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activeAccountId: null,
  sidebarCollapsed: false,
  isAppLocked: false,
  syncStatus: {
    state: "idle", // idle | local | syncing | synced | offline | error
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
  },
  quickAddOpen: false,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setActiveAccountId: (state, action) => {
      state.activeAccountId = action?.payload || null;
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = Boolean(action?.payload);
    },
    setAppLocked: (state, action) => {
      state.isAppLocked = Boolean(action?.payload);
    },
    setSyncStatus: (state, action) => {
      state.syncStatus = {
        ...state.syncStatus,
        ...(action?.payload || {}),
      };
    },
    setQuickAddOpen: (state, action) => {
      state.quickAddOpen = Boolean(action?.payload);
    },
    resetAppUiState: (state) => {
      state.activeAccountId = null;
      state.isAppLocked = false;
      state.syncStatus = initialState.syncStatus;
    },
  },
});

export const {
  setActiveAccountId,
  toggleSidebarCollapsed,
  setSidebarCollapsed,
  setAppLocked,
  setSyncStatus,
  setQuickAddOpen,
  resetAppUiState,
} = appSlice.actions;
export default appSlice.reducer;
