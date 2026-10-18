import { test, expect } from "@playwright/test";

async function mockApp(page, { responses = [], visits = [], failSave = false } = {}) {
  let settings = { title: "Mood check-in", description: "Choose how you feel.", showIceCreamShop: false, customSetting: "preserve-me" };
  const saves = [];
  const invitationReads = [];
  await page.route("https://appwrite.test/**", async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.endsWith("/account")) return route.fulfill({ json: { $id: "test-admin", email: "admin@example.test" } });
    if (url.pathname.endsWith("/global-settings")) {
      if (req.method() === "PATCH") {
        if (failSave) return route.fulfill({ status: 403, json: { message: "Not allowed" } });
        settings = JSON.parse(req.postDataJSON().data.config);
        saves.push(settings);
      }
      return route.fulfill({ json: { $id: "global-settings", config: JSON.stringify(settings) } });
    }
    if (req.method() === "POST") return route.fulfill({ status: 201, json: { $id: "test-visit" } });
    if (url.pathname.endsWith("/documents")) {
      const shared = Boolean(process.env.INVITATION_TEST_SHARED);
      const queries = [...url.searchParams.values()].join(" ");
      const isInvitations = shared ? queries.includes('"invitation"') : url.pathname.includes("test-invitations");
      if (!isInvitations) return route.fulfill({ json: { documents: visits, total: visits.length } });
      invitationReads.push(queries);
      const offset = queries.includes("cursorAfter") ? 100 : 0;
      const docs = responses.slice(offset, offset + 100).map(doc => shared ? {
        $id: doc.$id, event_type: "invitation", what_happened: doc.session_id,
        anger_level: doc.stage, what_wants: doc.answer, created_at: doc.created_at,
      } : doc);
      return route.fulfill({ json: { documents: docs, total: responses.length } });
    }
    return route.fulfill({ status: 404, json: { message: "Not found" } });
  });
  return { saves, invitationReads };
}

test("all page switches save, update navigation and block hidden public links", async ({ page }) => {
  const app = await mockApp(page);
  await page.goto("/settings");
  await expect(page.getByRole("switch")).toHaveCount(6);
  const invitation = page.getByRole("switch", { name: "Question", exact: true });
  await expect(invitation).toBeChecked();
  await invitation.click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
  await expect(invitation).not.toBeChecked();
  await expect(page.getByRole("link", { name: "Question", exact: true })).toHaveCount(0);
  expect(app.saves[0].customSetting).toBe("preserve-me");
  expect(app.saves[0].pageVisibility.invitation).toBe(false);
  await page.goto("/invitation");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Mood check-in" })).toBeVisible();
  await page.goto("/settings");
  await page.getByRole("switch", { name: "Question", exact: true }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
  await page.getByRole("link", { name: "Question", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Hey, there’s something/ })).toBeVisible();
});

test("all public pages can be hidden and admin settings remain reachable", async ({ page }) => {
  await mockApp(page);
  await page.goto("/settings");
  for (const name of ["Check In", "Question", "My Records", "Question Responses", "Settings"]) {
    await page.getByRole("switch", { name, exact: true }).click();
    await expect(page.getByText("Settings saved.")).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toHaveCount(0);
  await page.goto("/invitation");
  await expect(page.getByRole("heading", { name: "No public pages are available right now." })).toBeVisible();
  await page.getByRole("link", { name: "Admin settings" }).click();
  await expect(page.getByRole("switch")).toHaveCount(6);
  await page.getByRole("switch", { name: "Check In", exact: true }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mood check-in" })).toBeVisible();
});

test("failed visibility changes roll back without hiding a page", async ({ page }) => {
  await mockApp(page, { failSave: true });
  await page.goto("/settings");
  const invitation = page.getByRole("switch", { name: "Question", exact: true });
  await invitation.click();
  await expect(page.getByText("We couldn't update page visibility.", { exact: false })).toBeVisible();
  await expect(invitation).toBeChecked();
  await expect(page.getByRole("link", { name: "Question", exact: true })).toBeVisible();
});

test("My Records groups every invitation field across pages and offers safe contact actions", async ({ page }) => {
  const common = { session_id: "her-invitation", created_at: "2026-10-18T10:00:00.000Z" };
  const responses = Array.from({ length: 95 }, (_, index) => ({ ...common, $id: `older-${index}`, stage: "permission", answer: "yes" }));
  for (const [stage, answer] of Object.entries({ permission: "yes", invitation: "coffee", date: "2099-12-20", time: "18:30", timezone: "Asia/Dubai", contact_method: "Email", contact: "hello@example.test" })) responses.push({ ...common, $id: stage, stage, answer });
  const app = await mockApp(page, { responses });
  await page.goto("/records");
  await expect(page.getByRole("tab", { name: /All Records/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Coffee", exact: true })).toBeVisible();
  await expect(page.getByText("1 saved session")).toBeVisible();
  for (const value of ["Yes, ask me", "2099-12-20", "18:30", "Asia/Dubai", "hello@example.test"]) await expect(page.getByText(value, { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Write email" })).toHaveAttribute("href", "mailto:hello%40example.test");
  await expect(page.getByRole("button", { name: "Copy contact" })).toBeVisible();
  await expect(page.getByText("All saved entries (102)")).toBeVisible();
  expect(new Set(app.invitationReads).size).toBe(2); // React StrictMode can repeat initial effect requests.
});

test("My Records explains missing saving configuration instead of leaving an unexplained empty list", async ({ page }) => {
  await mockApp(page);
  await page.goto("/records");
  await expect(page.getByRole("tab", { name: /All Records/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("alert")).toContainText("New answers cannot be saved yet");
  await expect(page.getByRole("alert")).toContainText("APPWRITE_ADMIN_USER_ID");
  await expect(page.getByText("No invitation responses yet.", { exact: false })).toBeVisible();
});

test("device labels persist, group the same browser, and leave other visitors colorful", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mood-checkin-device", "my-browser"));
  const visits = [
    { $id: "mine-1", what_happened: "device:my-browser" },
    { $id: "mine-2", what_happened: "device:my-browser" },
    { $id: "other", what_happened: "device:other-browser" },
    { $id: "legacy" },
  ].map(row => ({ ...row, event_type: "visit", created_at: "2026-10-18T10:00:00.000Z" }));
  await mockApp(page, { visits });
  await page.goto("/records?tab=visits");
  const ownVisits = page.locator('li[data-visit-device="device:my-browser"]');
  const other = page.locator('li[data-visit-device="device:other-browser"]');
  await expect(ownVisits).toHaveCount(2);
  const visitorColor = await other.getAttribute("class");
  await page.getByRole("button", { name: "Mark this browser as mine", exact: true }).click();
  await expect(ownVisits.getByText("My device", { exact: true })).toHaveCount(2);
  await expect(other.getByText("Visitor", { exact: true })).toBeVisible();
  await page.reload();
  await expect(ownVisits.getByText("My device", { exact: true })).toHaveCount(2);
  await expect(other).toHaveAttribute("class", visitorColor);
  await page.getByRole("button", { name: "Unmark this browser", exact: true }).click();
  await expect(ownVisits.getByText("Visitor", { exact: true })).toHaveCount(2);
  const legacy = page.locator('li[data-visit-device="visit:legacy"]');
  await legacy.getByRole("button", { name: "Mark as mine", exact: true }).click();
  await expect(legacy.getByText("My device", { exact: true })).toBeVisible();
  await expect(other.getByText("Visitor", { exact: true })).toBeVisible();
});
