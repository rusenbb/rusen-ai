import { expect, test, type Page } from "@playwright/test";

async function openPhoto(page: Page) {
  await page.goto("/photos/");
  await expect(page.locator(".theme-toggle").first()).toBeEnabled();
  await page.locator(".photo-frame").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  return page.getByRole("dialog");
}

for (const hasTouch of [false, true]) {
  test.describe(hasTouch ? "hybrid desktop" : "mouse desktop", () => {
    test.use({ hasTouch });
    test("text selection and mouse drags do not navigate; controls and keyboard still work", async ({ page }) => {
      const dialog = await openPhoto(page);
      const name = await dialog.getAttribute("aria-label");
      const story = dialog.locator(".photo-lightbox-story");
      const box = (await story.boundingBox())!;
      for (const reverse of [false, true]) {
        const start = box.x + (reverse ? box.width - 4 : 4);
        const end = box.x + (reverse ? 4 : box.width - 4);
        await page.mouse.move(start, box.y + 10);
        await page.mouse.down();
        await page.mouse.move(end, box.y + 10, { steps: 12 });
        await page.mouse.up();
        expect(await page.evaluate(() => window.getSelection()?.toString().length)).toBeGreaterThan(0);
        await expect(dialog).toHaveAttribute("aria-label", name!);
      }
      const image = (await dialog.locator("figure").boundingBox())!;
      await page.mouse.move(image.x + 100, image.y + 100);
      await page.mouse.down();
      await page.mouse.move(image.x + 220, image.y + 100, { steps: 10 });
      await page.mouse.up();
      await expect(dialog).toHaveAttribute("aria-label", name!);
      await dialog.locator(".photo-lightbox-next").click();
      await expect(dialog).not.toHaveAttribute("aria-label", name!);
      await dialog.locator(".photo-lightbox-prev").click();
      await expect(dialog).toHaveAttribute("aria-label", name!);
      await page.keyboard.press("ArrowRight");
      await expect(dialog).not.toHaveAttribute("aria-label", name!);
      await page.keyboard.press("ArrowLeft");
      await expect(dialog).toHaveAttribute("aria-label", name!);
      await dialog.locator(".photo-lightbox-close").focus();
      await page.keyboard.press("Shift+Tab");
      await expect(dialog.locator(".photo-lightbox-next")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(dialog.locator(".photo-lightbox-close")).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(page.locator(".photo-frame").first()).toBeFocused();
    });
  });
}

test.describe("touchscreen", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 }, isMobile: true });
  test("native touch swipes navigate both ways, while pinch gestures do not", async ({ page }) => {
    const dialog = await openPhoto(page);
    const name = await dialog.getAttribute("aria-label");
    const cdp = await page.context().newCDPSession(page);
    for (const [start, end] of [[280, 100], [100, 280]]) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start, y: 200 }] });
      for (let step = 1; step <= 10; step++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start + (end - start) * step / 10, y: 200 }] });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      if (start > end) await expect(dialog).not.toHaveAttribute("aria-label", name!);
      else await expect(dialog).toHaveAttribute("aria-label", name!);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 150, y: 200, id: 1 }, { x: 240, y: 200, id: 2 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 70, y: 200, id: 1 }, { x: 320, y: 200, id: 2 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(dialog).toHaveAttribute("aria-label", name!);
    expect(await dialog.evaluate(el => getComputedStyle(el).touchAction)).toContain("pinch-zoom");
  });
});
