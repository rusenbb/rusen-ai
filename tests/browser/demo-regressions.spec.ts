import { expect, test } from "@playwright/test";
import sharp from "sharp";

for (const width of [320, 390]) {
  for (const slug of ["outguess", "optimizer-racetrack", "classify-anything", "steering-llms"]) {
    test(`${slug} fits a ${width}px phone`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/${slug}/`);
      await expect(page.locator("h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
}

test("kernel typing preserves negative and fractional weights and shows the calculated precision", async ({ page }) => {
  await page.goto("/convolution-lab/");
  const weight = page.getByLabel("Kernel row 1, column 2");
  await weight.fill("");
  await weight.pressSequentially("-1");
  await expect(weight).toHaveValue("-1");
  await weight.fill("");
  await weight.pressSequentially("0.125");
  await expect(weight).toHaveValue("0.125");
  await weight.press("Tab");
  await expect(weight).toHaveValue("0.125");

  const png = await sharp({ create: { width: 3, height: 3, channels: 3, background: { r: 100, g: 100, b: 100 } } }).png().toBuffer();
  await page.getByLabel("Convolution source image").setInputFiles({ name: "flat100.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: /^b\/w · luminance$/i }).click();
  await page.getByLabel("Convolution padding").fill("0");
  for (let row = 1; row <= 3; row++) {
    for (let col = 1; col <= 3; col++) await page.getByLabel(`Kernel row ${row}, column ${col}`).fill("0");
  }
  const center = page.getByLabel("Kernel row 2, column 2");
  await center.fill("0.125");
  const calculation = page.getByText(/100×0\.125/);
  await expect(calculation).toContainText("≈ 12.50");
  await center.fill("999");
  await expect(center).toHaveAttribute("aria-invalid", "true");
  await expect(calculation).toContainText("≈ 12.50");
  await center.press("Tab");
  await expect(center).toHaveValue("0.125");
});

test("Outguess explains Frequency using its actual counts and next-key probabilities", async ({ page }) => {
  await page.goto("/outguess/");
  await page.getByRole("heading", { name: "Outguess" }).click();
  for (let i = 0; i < 25; i++) await page.keyboard.press("f");
  await page.keyboard.press("j");
  await expect(page.getByLabel("Next-key probabilities")).toContainText("92.9%");
  await expect(page.getByText("Next guess:")).toContainText("Frequency");
  await page.getByText("Counts behind the prediction", { exact: true }).click();
  await expect(page.getByText("Whole session: F 25 · J 1", { exact: true })).toBeVisible();
});

test.describe("Arena touch controls", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("holding moves, releasing stops, and fullscreen keeps the controls", async ({ page }) => {
    await page.goto("/adaptive-arena/");
    const start = page.getByRole("button", { name: "Start Match", exact: true });
    await expect(start).toBeEnabled({ timeout: 30000 });
    await start.tap();
    const arena = page.getByRole("img", { name: /^Arena\. You:/ });
    const position = async () => (await arena.getAttribute("aria-label"))!.match(/You: \((\d+), (\d+)\)/)![0];
    const before = await position();
    const move = page.getByRole("button", { name: "move right", exact: true });
    await move.scrollIntoViewIfNeeded();
    const box = (await move.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    await expect.poll(position).not.toBe(before);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(move).toHaveAttribute("aria-pressed", "false");
    await page.waitForTimeout(150);
    const after = await position();
    await page.waitForTimeout(300);
    expect(await position()).toBe(after);
    await page.getByRole("button", { name: "Go fullscreen" }).tap();
    await expect(page.getByRole("button", { name: "Exit fullscreen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "move right", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Attack", exact: true })).toBeEnabled();
    const fullscreenMove = page.getByRole("button", { name: "move right", exact: true });
    const attack = page.getByRole("button", { name: "Attack", exact: true });
    const moveBox = (await fullscreenMove.boundingBox())!;
    const attackBox = (await attack.boundingBox())!;
    const movePoint = { x: moveBox.x + moveBox.width / 2, y: moveBox.y + moveBox.height / 2, id: 1 };
    const attackPoint = { x: attackBox.x + attackBox.width / 2, y: attackBox.y + attackBox.height / 2, id: 2 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [movePoint] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [movePoint, attackPoint] });
    await expect(fullscreenMove).toHaveAttribute("aria-pressed", "true");
    await expect(attack).toHaveAttribute("aria-pressed", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(fullscreenMove).toHaveAttribute("aria-pressed", "false");
    await fullscreenMove.focus();
    await page.keyboard.down("Space");
    await expect(fullscreenMove).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await page.keyboard.up("Space");
    await expect(fullscreenMove).toHaveAttribute("aria-pressed", "false");
    // Let the three-tick attack buffer finish before checking movement.
    await page.waitForTimeout(600);
    const beforeActivation = await position();
    // Screen readers can activate a button without pointer or keyboard events.
    await fullscreenMove.evaluate((button) => (button as HTMLButtonElement).click());
    await expect.poll(position).not.toBe(beforeActivation);
    await expect(fullscreenMove).toHaveAttribute("aria-pressed", "false");


  });
});

test("the paused Fourier legend redraws with a readable color after a theme change", async ({ page }) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof original>) {
      if (args[0].includes("reconstruction")) document.documentElement.dataset.legendInk = String(this.fillStyle);
      original.apply(this, args);
    };
  });
  await page.goto("/fourier-sketch/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = await page.locator("html").getAttribute("data-legend-ink");
  await page.getByRole("button", { name: /switch to .* theme/i }).first().click();
  await expect(page.locator("html")).not.toHaveAttribute("data-legend-ink", before!);
  const color = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--muted").trim());
  await expect(page.locator("html")).toHaveAttribute("data-legend-ink", color);
});
