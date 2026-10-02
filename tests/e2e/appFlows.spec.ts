import { expect, test } from "@playwright/test";

test("app starts directly on settings and refresh keeps client routes", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Manage local data" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
});

test("QR and manual profile entry show a consent-gated local preview", async ({ page }) => {
  await page.goto("/enroll");
  await page.getByText("Enter QR data manually").click();
  await page.getByLabel("Paste person QR JSON").fill(JSON.stringify({ version: 1, person_id: "QR-E2E-01", name: "QR Demo Person", role: "Visitor" }));
  await page.getByRole("button", { name: "Validate QR data" }).click();
  await expect(page.getByRole("heading", { name: "Review profile before saving" })).toBeVisible();
  await expect(page.locator(".profile-preview-grid")).toContainText("QR Demo Person");

  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByLabel("Person ID").fill("MAN-E2E-01");
  await page.getByLabel("Name", { exact: true }).fill("Manual Demo Person");
  await page.getByLabel("Role").fill("Student");
  await page.getByRole("button", { name: "Preview profile" }).click();
  await expect(page.getByRole("heading", { name: "Review profile before saving" })).toBeVisible();
  await expect(page.locator(".profile-preview-grid")).toContainText("Manual Demo Person");
  await expect(page.getByRole("button", { name: "Save profile and continue" })).toBeDisabled();
  await page.getByLabel(/I confirm this person has consented/).check();
  await page.getByRole("button", { name: "Save profile and continue" }).click();
  await expect(page.getByRole("heading", { name: "Ready to capture Manual Demo Person" })).toBeVisible();
});

test("model errors offer retry and test-only fixture detections are identified", async ({ page }) => {
  await page.goto("/console?e2eModelError=1");
  await page.getByRole("button", { name: "Start vision" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Playwright fixture model failed once" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("TEST ADAPTER - NOT LIVE INFERENCE")).toBeVisible();
  await expect(page.getByText("bottle", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Stop vision" }).click();
});

test("camera permission errors are recoverable", async ({ page }) => {
  await page.goto("/console?e2eCameraDenied=1");
  await page.getByRole("button", { name: "Start vision" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Camera access was denied" })).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("TEST ADAPTER - NOT LIVE INFERENCE")).toBeVisible();
  await page.getByRole("button", { name: "Stop vision" }).click();
});

test("demo history exports and destructive data controls require confirmation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load demo workspace" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Demo workspace is ready" })).toBeVisible();

  await page.goto("/history");
  await expect(page.getByText("Demo User 01", { exact: true }).first()).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("visionid-events.csv");

  await page.goto("/settings");
  await page.getByRole("button", { name: "Delete all data" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete all local data?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("This cannot be undone");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
