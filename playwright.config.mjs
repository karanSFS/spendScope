import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

const systemChromePath =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const useSystemChrome =
  !process.env.CI && fs.existsSync(systemChromePath);

const sharedUse = {
  ...devices["Desktop Chrome"],
  ...(useSystemChrome ? { channel: "chrome" } : {}),
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3005",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...sharedUse,
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "tablet",
      use: {
        ...sharedUse,
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "mobile",
      use: {
        ...sharedUse,
        viewport: { width: 375, height: 812 },
      },
    },
  ],
  webServer: {
    command: "npx next start -p 3005 -H 127.0.0.1",
    url: "http://127.0.0.1:3005",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
