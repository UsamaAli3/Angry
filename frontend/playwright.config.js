import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5175",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5175 --strictPort",
    url: "http://127.0.0.1:5175",
    reuseExistingServer: false,
    env: {
      VITE_APPWRITE_ENDPOINT: "https://appwrite.test/v1",
      VITE_APPWRITE_PROJECT_ID: "test-project",
      VITE_APPWRITE_DATABASE_ID: "test-database",
      VITE_APPWRITE_COLLECTION_ID: "test-checkins",
      VITE_APPWRITE_SETTINGS_COLLECTION_ID: "test-settings",
      VITE_APPWRITE_INVITATION_COLLECTION_ID: process.env.INVITATION_TEST_SHARED ? "" : "test-invitations",
      APPWRITE_API_KEY: "",
      APPWRITE_ADMIN_USER_ID: "",
    },
  },
});
