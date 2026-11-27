import { combineReducers } from "@reduxjs/toolkit";
import authSlice from "./slices/authSlice.js";
import themeSlice from "./slices/themeSlice.js";
import appSlice from "./slices/appSlice.js";
export { emptyStore } from "./actions.js";

const rootReducer = combineReducers({
  authSlice,
  themeSlice,
  appSlice,
});

export default rootReducer;
