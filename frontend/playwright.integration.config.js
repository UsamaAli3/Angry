import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests-integration", workers: 1, reporter: "list",
  use: { baseURL: "http://127.0.0.1:5182", browserName: "chromium", channel: process.platform === "win32" ? "msedge" : undefined, reducedMotion: "reduce" },
  webServer: [
    { command: "node tests-support/appwrite-server.mjs", url: "http://127.0.0.1:5181/__test/state", reuseExistingServer: false },
    {
      command: "npm run dev -- --config tests-support/vite.config.js --host 127.0.0.1 --port 5182 --strictPort", url: "http://127.0.0.1:5182", reuseExistingServer: false,
      env: {
        VITE_APPWRITE_ENDPOINT: "http://127.0.0.1:5181/v1", VITE_APPWRITE_PROJECT_ID: "test-project", VITE_APPWRITE_DATABASE_ID: "test-db", VITE_APPWRITE_COLLECTION_ID: "test-checkins",
        VITE_APPWRITE_SETTINGS_COLLECTION_ID: "test-settings", VITE_APPWRITE_INVITATION_COLLECTION_ID: "test-invitations",
        APPWRITE_ENDPOINT: "http://127.0.0.1:5181/v1", APPWRITE_PROJECT_ID: "test-project", APPWRITE_DATABASE_ID: "test-db", APPWRITE_INVITATION_COLLECTION_ID: "test-invitations",
        APPWRITE_API_KEY: "integration-only-key", APPWRITE_ADMIN_USER_ID: "test-admin",
        INVITATION_LINK_SECRET: "integration-only-link-secret",
      },
    },
  ],
});
