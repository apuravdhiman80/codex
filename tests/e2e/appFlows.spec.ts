import { expect, test } from "@playwright/test";

test("object detection opens directly and survives a refresh", async ({ page }) => {
  await page.goto("/objects");
  await expect(page.getByRole("heading", { name: "Object Detection Console", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Object Detection" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Object Detection Console", level: 1 })).toBeVisible();
});

test("live detection shows object fixtures without person results", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start object detection" }).click();
  await expect(page.getByText("TEST ADAPTER - NOT LIVE INFERENCE")).toBeVisible();
  await expect(page.getByText("bottle", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Faces and identities" })).toHaveCount(0);
  await page.getByRole("button", { name: "Stop detection" }).click();
});

test("model errors offer retry in object-only mode", async ({ page }) => {
  await page.goto("/?e2eModelError=1");
  await page.getByRole("button", { name: "Start object detection" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Playwright fixture model failed once" })).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("TEST ADAPTER - NOT LIVE INFERENCE")).toBeVisible();
  await expect(page.getByText("bottle", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Stop detection" }).click();
});

test("camera permission errors are recoverable", async ({ page }) => {
  await page.goto("/?e2eCameraDenied=1");
  await page.getByRole("button", { name: "Start object detection" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Camera access was denied" })).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("TEST ADAPTER - NOT LIVE INFERENCE")).toBeVisible();
  await page.getByRole("button", { name: "Stop detection" }).click();
});
