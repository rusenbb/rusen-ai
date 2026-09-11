import { expect, test } from "@playwright/test";

import projects from "../../src/content/projects.json" with { type: "json" };

const liveProjectRoutes = projects
  .filter((project) => project.status === "live")
  .map((project) =>
    project.collection === "bulletin"
      ? `/bulletin/${project.slug}/`
      : `/${project.slug}/`,
  );
const coreRoutes = [
  "/",
  "/demos/",
  "/nerdy-stuff/",
  "/bulletin/",
  "/photos/",
  "/blogs/",
  "/cv/",
  "/cv/tr/",
  "/cv/ja/",
];

for (const pathname of [...coreRoutes, ...liveProjectRoutes]) {
  test(`${pathname} renders its exported document`, async ({ page }) => {
    const response = await page.goto(pathname, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
  });
}

test("desktop navigation and theme preference remain interactive", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const before = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: /switch to .* theme/i }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", before ?? "");
  await page.getByRole("link", { name: "Photos" }).click();
  await expect(page).toHaveURL(/\/photos\/$/);
});

test("mobile navigation returns focus when Escape closes it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const toggle = page.getByRole("button", { name: "Toggle menu" });
  await toggle.click();
  await expect(page.locator("#mobile-nav")).toBeVisible();
  await page.locator("#mobile-nav a").first().focus();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-nav")).toBeHidden();
  await expect(toggle).toBeFocused();
});

test("photo locale and lightbox work together", async ({ page }) => {
  await page.goto("/photos/", { waitUntil: "domcontentloaded" });
  await page.locator(".photo-language-picker button", { hasText: "TR" }).click();
  await expect(page.locator(".photos-page")).toHaveAttribute("lang", "tr");
  await page.locator(".photo-frame").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator("img")).toHaveAttribute("srcset");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("blog sections fit a narrow phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/blogs/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const heading = page.locator(".acc-toggle").first();
  await heading.click();
  await expect(heading).toHaveAttribute("aria-expanded", "false");
  await heading.click();
  await expect(heading).toHaveAttribute("aria-expanded", "true");
});

test("mobile menu stays usable on a short landscape screen", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  const menu = page.locator("#mobile-nav");
  const bounds = await menu.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(375);
  const before = await page.locator("html").getAttribute("data-theme");
  await menu.getByRole("button", { name: /switch to .* theme/i }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", before ?? "");
});
