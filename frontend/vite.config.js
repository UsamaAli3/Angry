import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createInvitationHandler } from "./api/invitations.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: "local-invitation-api",
    configureServer(server) {
      const handler = createInvitationHandler({ env: { ...loadEnv(mode, process.cwd(), ""), ...process.env } });
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/api/invitations") return next();
        void handler(req, res).catch(() => { res.statusCode = 500; res.end('{"error":"Unable to save your answer. Please retry."}'); });
      });
    },
  }],
  server: {
    port: 5173,
  },
}));
