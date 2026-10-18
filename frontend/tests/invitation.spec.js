import { test, expect } from "@playwright/test";
import { makeFollowupToken } from "../api/followup.js";

async function mockDatabase(page, onWrite = () => ({})) {
  const writes = [];
  const requests = [];
  let sessionId;
  await page.route("https://appwrite.test/**", async route => {
    const request = route.request();
    requests.push({ method: request.method(), url: request.url() });
    if (request.url().endsWith("/global-settings")) {
      await route.fulfill({ json: { config: "{}" } });
      return;
    }
    if (request.method() === "POST" && request.url().endsWith("/documents") && request.postDataJSON().data?.event_type === "visit") {
      await route.fulfill({ status: 201, json: { $id: request.postDataJSON().documentId } });
      return;
    }
    await route.fulfill({ status: 401, json: { message: "Not signed in", code: 401, type: "user_unauthorized" } });
  });
  await page.route("**/api/invitations*", async route => {
    const request = route.request();
    requests.push({ method: request.method(), url: request.url() });
    if (request.method() === "GET") {
      const params = new URL(request.url()).searchParams;
      await route.fulfill({ json: params.has("status") ? { configured: true, missing: [] } : { ready: true, sessionId, availableAt: new Date(Date.now() + 43200000).toISOString() } });
      return;
    }
    const { id, ...data } = request.postDataJSON();
    if (data.stage === "permission") sessionId = data.session_id;
    const body = { documentId: id, data };
    writes.push(body);
    const response = onWrite(body, writes.length);
    await route.fulfill({ status: response.status ?? 200, json: response.json ?? { saved: true, ...(data.stage === "permission" && data.answer === "yes" ? { followup: makeFollowupToken(data.session_id, new Date().toISOString(), "browser-test-secret") } : {}) } });
  });
  return { writes, requests };
}

async function sayYesAndOpenNext(page) {
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await page.getByRole("button", { name: /rather not share contact details/ }).click();
  await expect(page.getByRole("heading", { name: /Would you like to go out for coffee or dinner/ })).toBeVisible();
}

test("opening no ends gently and stores only the declined answer", async ({ page }) => {
  const { writes, requests } = await mockDatabase(page);
  await page.goto("/invitation");
  await expect(page.getByRole("heading", { name: "Hey, there’s something I’ve been wanting to ask you." })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thank you for being honest." })).toBeVisible();
  await expect(page.getByText("Your answer has been sent.")).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].data).toMatchObject({ stage: "permission", answer: "no" });
  expect(requests.filter(request => request.method === "POST" && request.url.endsWith("/api/invitations"))).toHaveLength(1);
  expect(requests.filter(request => request.method === "POST" && request.url.endsWith("/documents"))).toHaveLength(1); // One page-load visit, including the invitation page.
  expect(requests.some(request => request.url.endsWith("/account"))).toBe(false);
  await expect(page.getByRole("button", { name: "Coffee", exact: true })).toHaveCount(0);
});

for (const answer of ["Coffee", "Dinner", "😊 Maybe another time"]) {
  test(`opening yes then ${answer} saves both distinct choices`, async ({ page }) => {
    const { writes } = await mockDatabase(page);
    await page.goto("/invitation");
    await sayYesAndOpenNext(page);
    await expect(page.getByRole("heading", { name: /Would you like to go out for coffee or dinner/ })).toBeVisible();
    await page.getByRole("button", { name: answer, exact: true }).click();
    await expect(page.getByText("Your answer has been sent.")).toBeVisible();
    await expect(page.getByRole("heading", { name: answer.includes("Maybe") ? "Another time is okay." : `${answer} it is.` })).toBeVisible();
    expect(writes).toHaveLength(3);
    expect(writes[0].data).toMatchObject({ stage: "permission", answer: "yes" });
    expect(writes[2].data).toMatchObject({ stage: "invitation", answer: answer.includes("Maybe") ? "maybe" : answer.toLowerCase() });
    expect(writes[0].data.session_id).toBe(writes[2].data.session_id);
    expect(writes[0].documentId).not.toBe(writes[2].documentId);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("paused project keeps the Yes and delivery preference queued for retry", async ({ page }) => {
  let paused = true;
  const { writes } = await mockDatabase(page, () => paused ? { status: 503, json: { error: "Your answer hasn't been saved: the Appwrite project is paused." } } : {});
  await page.goto("/invitation");
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("project is paused");
  await page.getByRole("button", { name: /rather not share contact details/ }).click();
  await expect(page.getByText("Your answer has been sent.")).toHaveCount(0);
  paused = false;
  await page.getByRole("button", { name: "Retry sending" }).click();
  await expect(page.getByRole("heading", { name: /Would you like to go out for coffee or dinner/ })).toBeVisible();
  await page.getByRole("button", { name: "Coffee", exact: true }).click();
  await expect(page.getByText("Your answer has been sent.")).toBeVisible();
  expect(writes.filter(write => write.documentId === writes[0].documentId).length).toBeGreaterThan(1);
  expect(writes.at(-1).data.answer).toBe("coffee");
});

test("retry after a lost confirmation sends the same event ID", async ({ page }) => {
  let attempt = 0;
  const { writes } = await mockDatabase(page, () => ++attempt === 1 ? {
    status: 503, json: { error: "Your answer hasn't been saved. Please try again." },
  } : {});
  await page.goto("/invitation");
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Retry sending" }).click();
  await expect(page.getByText("Your answer has been sent.")).toBeVisible();
  expect(writes[0].documentId).toBe(writes[1].documentId);
});

test("admin response route requires sign-in", async ({ page }) => {
  await mockDatabase(page);
  await page.goto("/invitation-responses");
  await expect(page.getByRole("heading", { name: "Sign in to view records" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("accepting offers date, time and contact and saves them under the same reference", async ({ page }) => {
  const { writes } = await mockDatabase(page);
  await page.goto("/invitation");
  await sayYesAndOpenNext(page);
  await page.getByRole("button", { name: "Coffee", exact: true }).click();
  await expect(page.getByText("That made me smile. Thank you for saying yes.")).toBeVisible();
  await expect(page.getByLabel("Preferred date")).toHaveCount(0);
  await page.getByRole("button", { name: "Suggest a time or contact (optional)" }).click();
  await page.getByRole("button", { name: "Send my details" }).click();
  expect(writes).toHaveLength(3); // Empty form cannot send details.
  await page.getByLabel("Preferred date").fill("2099-12-20");
  await page.getByLabel("Preferred time").fill("18:30");
  await page.getByLabel("Where can I contact you?").selectOption("Email");
  await page.getByLabel("Email address").fill("hello@example.test");
  await page.getByRole("button", { name: "Send my details" }).click();
  await expect(page.getByText("Thank you for sharing what works for you.", { exact: false })).toBeVisible();
  await expect(page.getByText("Your answer has been sent.")).toBeVisible();
  expect(writes).toHaveLength(8);
  const details = Object.fromEntries(writes.slice(3).map(write => [write.data.stage, write.data.answer]));
  expect(details).toMatchObject({ date: "2099-12-20", time: "18:30", contact_method: "Email", contact: "hello@example.test" });
  expect(details.timezone).toBe(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone));
  expect(new Set(writes.map(write => write.data.session_id)).size).toBe(1);
  expect(new Set(writes.map(write => write.documentId)).size).toBe(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("deciding details later does not send draft contact information", async ({ page }) => {
  const { writes } = await mockDatabase(page);
  await page.goto("/invitation");
  await sayYesAndOpenNext(page);
  await page.getByRole("button", { name: "Dinner", exact: true }).click();
  await page.getByRole("button", { name: "Suggest a time or contact (optional)" }).click();
  await page.getByLabel("Phone number").fill("+971 50 123 4567");
  await page.getByRole("button", { name: "We can decide later" }).click();
  await expect(page.getByText("We can find a day and a place", { exact: false })).toBeVisible();
  await expect(page.getByText("Your answer has been sent.")).toBeVisible();
  expect(writes).toHaveLength(3);
});

test("admin reads saved responses from the configured storage and excludes check-ins", async ({ page }) => {
  const shared = Boolean(process.env.INVITATION_TEST_SHARED);
  let readResponses = false;
  await page.route("https://appwrite.test/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/v1/account") {
      await route.fulfill({ json: { $id: "test-admin", email: "admin@example.test" } });
    } else if (request.method() === "GET" && url.pathname.endsWith(`/collections/${shared ? "test-checkins" : "test-invitations"}/documents`)) {
      readResponses = true;
      if (shared) expect([...url.searchParams.values()].join(" ")).toContain('"invitation"');
      const common = { $id: "test-response", created_at: "2026-10-18T10:00:00.000Z" };
      const documents = shared ? [
        { ...common, event_type: "invitation", what_happened: "session-reference", anger_level: "invitation", what_wants: "coffee" },
        { ...common, $id: "contact-response", event_type: "invitation", what_happened: "session-reference", anger_level: "contact", what_wants: "hello@example.test" },
        { $id: "mood-record", event_type: "checkin", what_happened: "Not an invitation" },
      ] : [{ ...common, session_id: "session-reference", stage: "invitation", answer: "coffee" },
        { ...common, $id: "contact-response", session_id: "session-reference", stage: "contact", answer: "hello@example.test" }];
      await route.fulfill({ json: { total: documents.length, documents } });
    } else {
      await route.fulfill({ status: 401, json: { message: "Not available in test", code: 401 } });
    }
  });
  await page.goto("/invitation-responses");
  await expect(page.getByRole("cell", { name: "session-reference", exact: true })).toHaveCount(2);
  await expect(page.getByRole("cell", { name: "Coffee", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "hello@example.test", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Contact details", exact: true })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(3);
  expect(readResponses).toBe(true);
});

test("responsive layout and animated keyboard transitions work at phone, tablet and desktop sizes", async ({ page }, testInfo) => {
  await mockDatabase(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/invitation");
    await expect(page.getByRole("heading")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Yes", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /rather not share contact details/ }).click();
    const heading = page.getByRole("heading", { name: /Would you like to go out for coffee or dinner/ });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(page.getByRole("button", { name: "😊 Maybe another time" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`invitation-${width}.png`), fullPage: true, animations: "disabled" });
    await page.getByRole("button", { name: "😊 Maybe another time" }).click();
    await expect(page.getByRole("heading", { name: "Another time is okay." })).toBeFocused();
    await expect(page.getByRole("button", { name: "Suggest a time or contact (optional)" })).toHaveCount(0);
  }
});

test("local API is connected and reports missing server configuration without pretending to save", async ({ request, baseURL }) => {
  const response = await request.post("/api/invitations", {
    headers: { origin: baseURL },
    data: { id: "test-event", session_id: "test-session", stage: "permission", answer: "yes", created_at: new Date().toISOString() },
  });
  expect(response.status()).toBe(503);
  expect(await response.json()).toEqual({ error: "Your answer hasn't been saved. The owner needs to configure the private invitation API." });
});

test("Yes asks for next-link delivery and hides the real question while waiting", async ({ page }) => {
  const { writes } = await mockDatabase(page);
  await page.route("**/api/invitations?next=*", route => route.fulfill({ json: { ready: false, availableAt: new Date(Date.now() + 43200000).toISOString() } }));
  await page.goto("/invitation");
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await page.getByLabel("Send the next link via").selectOption("Email");
  await page.getByLabel("Email address").fill("next-link@example.test");
  await page.getByRole("button", { name: "Save my preference" }).click();
  await expect(page.getByRole("heading", { name: "A little patience…" })).toBeVisible();
  await expect(page.getByText("Your answer has been sent.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Coffee", exact: true })).toHaveCount(0);
  expect(writes.map(write => [write.data.stage, write.data.answer])).toEqual([
    ["permission", "yes"], ["delivery_method", "Email"], ["delivery_contact", "next-link@example.test"],
  ]);
  await expect(page.getByRole("link", { name: "Open my private return link" })).toBeVisible();
});
