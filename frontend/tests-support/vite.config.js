// Integration tests only: an isolated clock lets tests exercise a 12-hour delay.
// This config and its clock endpoint are never used by the normal dev/deploy build.
import { defineConfig, loadEnv } from "vite";
import applicationConfig from "../vite.config.js";
import { createInvitationHandler } from "../api/invitations.js";

export default defineConfig(context => {
  const config = applicationConfig(context);
  config.plugins = config.plugins.filter(plugin => plugin.name !== "local-invitation-api");
  config.plugins.push({
    name: "test-invitation-api",
    configureServer(server) {
      let currentTime = Date.now();
      const handler = createInvitationHandler({ env: { ...loadEnv(context.mode, process.cwd(), ""), ...process.env }, now: () => currentTime });
      server.middlewares.use((req, res, next) => {
        if (req.url === "/__test/clock" && req.method === "POST") {
          void (async () => {
            let raw = "";
            for await (const chunk of req) raw += chunk;
            const body = JSON.parse(raw);
            currentTime = body.reset ? Date.now() : currentTime + body.advanceMs;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ now: currentTime }));
          })();
          return;
        }
        if (req.url?.split("?")[0] === "/api/invitations") { void handler(req, res); return; }
        next();
      });
    },
  });
  return config;
});
