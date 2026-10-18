import { test, expect } from "@playwright/test";

// Real browser -> real local API -> local Appwrite-compatible database -> reader.
// No page.route interception. No connection to the user's production database.
const state = async request => (await request.get("http://127.0.0.1:5181/__test/state")).json();
test.beforeEach(async ({ request }) => { await request.post("/__test/clock", { data: { reset: true } }); });

async function openAfterWait(page, request, shareContact = false) {
  await expect(page.getByRole("heading", { name: "Where should I send the next link?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Coffee", exact: true })).toHaveCount(0);
  if (shareContact) {
    await page.getByLabel("Send the next link via").selectOption("Email");
    await page.getByLabel("Email address").fill("next-link@example.test");
    await page.getByRole("button", { name: "Save my preference" }).click();
  } else await page.getByRole("button", { name: "I’d rather not share contact details" }).click();
  await expect(page.getByText("Your answer has been sent.")).toBeVisible();
  const link = await page.getByRole("link", { name: "Open my private return link" }).getAttribute("href");
  const token = new URL(link, "http://127.0.0.1:5182").searchParams.get("next");
  const early = await request.get(`/api/invitations?next=${encodeURIComponent(token)}`);
  expect((await early.json()).ready).toBe(false);
  await page.goto("/records?tab=invitations");
  await expect(page.getByRole("heading", { name: "Waiting for your approval" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy next question link" })).toBeEnabled();
  await page.getByRole("button", { name: "Allow next question" }).click();
  await expect(page.getByRole("heading", { name: "Next question allowed" })).toBeVisible();
  await page.getByRole("button", { name: "Block next question" }).click();
  await expect(page.getByRole("heading", { name: "Waiting for your approval" })).toBeVisible();
  expect((await (await request.get(`/api/invitations?next=${encodeURIComponent(token)}`)).json()).ready).toBe(false);
  await page.getByRole("button", { name: "Allow next question" }).click();
  await expect(page.getByRole("heading", { name: "Next question allowed" })).toBeVisible();
  await page.goto(link);
  await expect(page.getByRole("heading", { name: /Would you like to go out for coffee or dinner/ })).toBeVisible();
}

test("visit retry, invitation details, pagination and My Records work together over HTTP", async ({ page, request }) => {
  await request.post("http://127.0.0.1:5181/__test/reset", { data: { seedVisits: 125, failNextVisit: true } });
  await page.goto("/invitation");
  await expect.poll(async () => (await state(request)).visitAttempts.length).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(async () => (await state(request)).visits).toBe(126);
  const attempts = (await state(request)).visitAttempts;
  expect(attempts[0]).toBe(attempts[1]);
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await openAfterWait(page, request, true);
  await page.getByRole("button", { name: "Coffee", exact: true }).click();
  await page.getByRole("button", { name: "Suggest a time or contact (optional)" }).click();
  await page.getByLabel("Preferred date").fill("2099-12-20");
  await page.getByLabel("Preferred time").fill("18:30");
  await page.getByLabel("Where can I contact you?").selectOption("Email");
  await page.getByLabel("Email address").fill("hello@example.test");
  await page.getByRole("button", { name: "Send my details" }).click();
  await expect(page.getByText("Your answer has been sent.")).toBeVisible();
  await expect.poll(async () => (await state(request)).answers).toBe(11);
  await page.goto("/records");
  await expect(page.getByRole("heading", { name: "Coffee", exact: true })).toBeVisible();
  await expect(page.getByText("hello@example.test", { exact: true })).toBeVisible();
  await expect(page.getByText("2099-12-20", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Write email" })).toHaveAttribute("href", "mailto:hello%40example.test");
  await expect(page.getByRole("region", { name: "Website visit records" })).toBeVisible();
  await expect(page.getByText("Seed platform 0", { exact: true })).toBeVisible();
  await expect.poll(async () => (await state(request)).visits).toBe(129);
  await expect(page.getByRole("tab", { name: /129 Website Visits/ })).toBeVisible();
  await expect(page.getByText("New answers cannot be saved yet", { exact: false })).toHaveCount(0);
});

for (const answer of ["no", "maybe"]) {
  test(`saves ${answer} and displays it in My Records`, async ({ page, request }) => {
    await request.post("http://127.0.0.1:5181/__test/reset", { data: {} });
    await page.goto("/invitation");
    if (answer === "no") await page.getByRole("button", { name: "No", exact: true }).click();
    else {
      await page.getByRole("button", { name: "Yes", exact: true }).click();
      await openAfterWait(page, request);
      await page.getByRole("button", { name: "😊 Maybe another time" }).click();
    }
    await expect(page.getByText("Your answer has been sent.")).toBeVisible();
    await page.goto("/records");
    await expect(page.getByRole("heading", { name: answer === "no" ? "Declined" : "Maybe another time", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Website visit records" })).toBeVisible();
  });
}

test("a failed check-in reader does not hide successful website visits", async ({ page, request }) => {
  await request.post("http://127.0.0.1:5181/__test/reset", { data: { seedVisits: 3, failCheckinReads: true } });
  await page.goto("/records");
  await expect(page.getByText("Check-ins couldn't be loaded. Refresh to retry.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Website visit records" })).toBeVisible();
  await expect(page.getByText("Seed platform 0", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: /4 Website Visits/ })).toBeVisible();
});

test("single and bulk deletion require confirmation and preserve other record types", async ({ page, request }) => {
  await request.post("http://127.0.0.1:5181/__test/reset", { data: { seedVisits: 125 } });
  await page.goto("/invitation");
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Where should I send the next link?" })).toBeVisible();
  await expect.poll(async () => (await state(request)).answers).toBe(2); // Permission and private link.
  await page.goto("/records");
  await expect(page.getByRole("button", { name: "Delete visit", exact: true }).first()).toBeVisible();
  const before = (await state(request)).visits;
  await page.getByRole("button", { name: "Delete visit", exact: true }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await state(request)).visits).toBe(before);
  await page.getByRole("button", { name: "Delete visit", exact: true }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete permanently" }).click();
  await expect.poll(async () => (await state(request)).visits).toBe(before - 1);
  expect((await state(request)).answers).toBe(2);
  await page.getByRole("button", { name: "Delete all visits", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete permanently" }).click();
  await expect.poll(async () => (await state(request)).visits).toBe(0);
  expect((await state(request)).answers).toBe(2);
  await page.getByRole("button", { name: "Delete invitation", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete permanently" }).click();
  await expect.poll(async () => (await state(request)).answers).toBe(0);
  await expect(page.getByText("No invitation responses yet.", { exact: false })).toBeVisible();
});

test("delete all clears all record types but failed reads never begin deletion", async ({ page, request }) => {
  await request.post("http://127.0.0.1:5181/__test/reset", { data: { seedVisits: 3, failCheckinReads: true } });
  await page.goto("/records");
  await page.getByRole("button", { name: "Delete all records", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete permanently" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Failed to load check-ins");
  expect((await state(request)).visits).toBe(4);
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  await request.post("http://127.0.0.1:5181/__test/reset", { data: { seedVisits: 105, seedCheckins: 2 } });
  await page.goto("/invitation");
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByText("Your answer has been sent.")).toBeVisible();
  await page.goto("/records");
  await expect(page.getByRole("heading", { name: "Declined", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Delete all records", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete permanently" }).click();
  await expect.poll(async () => (await state(request)).visits).toBe(0);
  await expect.poll(async () => (await state(request)).answers).toBe(0);
  await expect(page.getByRole("tab", { name: /0 Website Visits/ })).toBeVisible();
  expect((await state(request)).checkins).toBe(0);
});
