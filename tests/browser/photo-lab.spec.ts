import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

test.use({
  launchOptions: {
    args: ["--enable-unsafe-webgpu", "--use-angle=swiftshader", "--enable-features=Vulkan", "--use-vulkan=swiftshader"],
  },
  viewport: { width: 1440, height: 1000 },
});

async function openLab(page: Page) {
  await page.addInitScript(() => localStorage.setItem("photoLanguage", "en"));
  await page.goto("/photos/");
  await expect(page.locator(".theme-toggle").first()).toBeEnabled();
  await page.locator(".photo-frame").first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Photo Lab ↗", exact: true }).click();
  await expect(dialog.locator(".photo-lab")).toBeVisible();
  return dialog;
}

test("browsers without WebGPU retain the photograph and can leave Lab", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "gpu", { value: undefined }));
  const dialog = await openLab(page);
  await expect(dialog.getByRole("status")).toContainText("You can still view the original photograph");
  await expect(dialog.locator(".photo-lab-frame > img")).toBeVisible();
  await expect(dialog.getByRole("slider", { name: /^Detail/ })).toBeDisabled();
  await dialog.getByRole("button", { name: "Original", exact: true }).click();
  await expect(dialog.locator("canvas")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Back to photograph ↙", exact: true }).click();
  await expect(dialog.locator(".photo-lab")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator(".photo-frame").first()).toBeFocused();
});

test.describe("WebGPU Photo Lab", () => {
  test.setTimeout(90000);

  async function requireGpu(page: Page) {
    await page.goto("/photos/");
    const supported = await page.evaluate(async () => {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      return Boolean(await gpu?.requestAdapter());
    });
    test.skip(!supported, "The browser has no WebGPU adapter; the fallback is tested separately.");
  }

  test("all four treatments draw distinct pixels; comparison and sliders keep the active photo", async ({ page }) => {
    await requireGpu(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const dialog = await openLab(page);
    const name = await dialog.getAttribute("aria-label");
    const hashes = new Set<string>();
    for (const mode of ["ASCII", "Dither", "Newsprint", "Particles"]) {
      await dialog.getByRole("button", { name: mode, exact: true }).click();
      await expect(dialog.locator(".photo-lab-treatment")).toHaveAttribute("role", "img");
      if (mode === "Particles") await dialog.getByRole("button", { name: "Pause motion", exact: true }).click();
      const canvas = dialog.locator("canvas");
      // Catch a ready signal emitted before the image or glyph atlas has uploaded.
      await expect.poll(async () => (await sharp(await canvas.screenshot()).stats()).channels[0].stdev,
        { timeout: 15000, message: `${mode} renders nonuniform pixels` }).toBeGreaterThan(5);
      hashes.add(createHash("sha256").update(await canvas.screenshot()).digest("hex"));
      const bounds = await canvas.evaluate((element) => {
        const buffer = element as HTMLCanvasElement;
        return { width: buffer.width, height: buffer.height };
      });
      expect(Math.max(bounds.width, bounds.height)).toBeLessThanOrEqual(1200);
    }
    expect(hashes.size).toBe(4);
    await dialog.getByRole("button", { name: "ASCII", exact: true }).click();
    const detail = dialog.getByRole("slider", { name: /^Detail/ });
    await expect(detail).toBeEnabled();
    await detail.focus();
    await page.keyboard.press("ArrowRight");
    await expect(detail).toHaveValue("66");
    await expect(dialog).toHaveAttribute("aria-label", name!);
    await dialog.getByRole("button", { name: "Compare ↔", exact: true }).click();
    const boundary = dialog.getByRole("slider", { name: "Boundary between original and effect" });
    await boundary.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(boundary).toHaveValue("49");
    await expect(dialog).toHaveAttribute("aria-label", name!);
    const frame = (await dialog.locator(".photo-lab-frame").boundingBox())!;
    const divider = (await dialog.locator(".photo-lab-divider").boundingBox())!;
    await page.mouse.move(divider.x + divider.width / 2, divider.y + divider.height / 2);
    await page.mouse.down();
    await page.mouse.move(frame.x + frame.width * 0.75, divider.y + divider.height / 2, { steps: 8 });
    await page.mouse.up();
    expect(Number(await boundary.inputValue())).toBeGreaterThan(70);
    await dialog.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(detail).toHaveValue("65");
    await expect(boundary).toHaveCount(0);
    await dialog.getByRole("button", { name: "Back to photograph ↙", exact: true }).click();
    await expect(dialog.locator("canvas")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("mobile layout fits, reduced motion stays still, and touch interactions do not change photos", async ({ page }) => {
    await requireGpu(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const dialog = await openLab(page);
    // Exercise shrinking an existing canvas as well as loading at phone dimensions.
    await page.setViewportSize({ width: 390, height: 844 });
    await dialog.getByRole("button", { name: "Particles", exact: true }).click();
    await expect(dialog.locator(".photo-lab-treatment")).toHaveAttribute("role", "img");
    await expect(dialog.getByRole("button", { name: "Pause motion", exact: true })).toHaveCount(0);
    await expect.poll(async () => (await dialog.locator(".photo-lab").boundingBox())!.width).toBeLessThanOrEqual(390);
    const canvas = dialog.locator("canvas");
    await expect.poll(async () => (await sharp(await canvas.screenshot()).stats()).channels[0].stdev,
      { timeout: 15000, message: "Particles render nonuniform pixels" }).toBeGreaterThan(5);
    const first = await canvas.screenshot();
    expect(await canvas.screenshot()).toEqual(first);
    const name = await dialog.getAttribute("aria-label");
    await canvas.evaluate((element) => {
      for (const [type, x] of [["pointerdown", 250], ["pointerup", 80]] as const) {
        element.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: "touch", isPrimary: true, clientX: x, clientY: 200 }));
      }
    });
    await expect(dialog).toHaveAttribute("aria-label", name!);
    await dialog.locator(".photo-lightbox-next").click();
    await expect(dialog).not.toHaveAttribute("aria-label", name!);
    await expect(dialog.getByRole("button", { name: "ASCII", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.setViewportSize({ width: 720, height: 390 });
    await expect.poll(async () => (await dialog.locator(".photo-lab-stage").boundingBox())!.height).toBeGreaterThan(120);
  });
});
