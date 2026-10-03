import { expect, test } from "@playwright/test";

test("video volume filters, scrubs, plays, resets, and resizes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/video-volume");
  const volume = page.getByRole("img", { name: /^Time volume/ });
  await expect
    .poll(() =>
      volume.evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        return canvas.getContext("2d")?.getImageData(0, 0, 1, 1).data[3];
      }),
    )
    .toBe(255);
  await expect(page.locator("#query-result")).toContainText(
    "3 tracks visible · cars",
  );
  const initialPixels = await volume.evaluate((el) =>
    (el as HTMLCanvasElement).toDataURL(),
  );
  await page.getByRole("button", { name: "People", exact: true }).click();
  await expect(page.locator("#query-result")).toContainText(
    "3 tracks visible · people",
  );
  await expect
    .poll(() => volume.evaluate((el) => (el as HTMLCanvasElement).toDataURL()))
    .not.toBe(initialPixels);
  await page.getByLabel("Find objects in time").fill("bicycle");
  await expect(page.locator("#query-result")).toContainText(
    "No matching tracks",
  );
  await page.getByRole("button", { name: "All objects" }).click();
  await expect(page.locator("#query-result")).toContainText("6 tracks visible");
  const time = page.getByRole("slider", { name: "Time slice" });
  await time.focus();
  await time.press("End");
  await expect(page.getByTestId("time-output")).toHaveText("8.00 / 8.00 s");
  await time.press("Home");
  await expect(page.getByTestId("time-output")).toHaveText("0.00 / 8.00 s");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => time.inputValue()).not.toBe("0");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await time.inputValue();
  await page.waitForTimeout(120);
  await expect(time).toHaveValue(paused);
  await volume.scrollIntoViewIfNeeded();
  const box = await volume.boundingBox();
  if (!box) throw new Error("Missing volume");
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await time.inputValue()))
    .toBeGreaterThan(Number(paused));
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await volume.scrollIntoViewIfNeeded();
  const orbitBox = await volume.boundingBox();
  if (!orbitBox) throw new Error("Missing volume");
  await page.mouse.move(
    orbitBox.x + orbitBox.width * 0.4,
    orbitBox.y + orbitBox.height * 0.5,
  );
  await page.mouse.down();
  await page.mouse.move(
    orbitBox.x + orbitBox.width * 0.5,
    orbitBox.y + orbitBox.height * 0.4,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(
    page.getByRole("slider", { name: "Rotation", exact: true }),
  ).not.toHaveValue("42");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(time).toHaveValue("0.35");
    await expect(
      page.getByRole("slider", { name: "Rotation", exact: true }),
    ).toHaveValue("42");
    await expect(page.getByLabel("Find objects in time")).toHaveValue("car");
    await expect(
      page.getByRole("button", { name: "Play", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Show faint frame stack" }),
    ).toBeChecked();
  }
  expect(errors).toEqual([]);
});

test("touch scrubbing and reduced-motion initial state", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/video-volume");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  const volume = page.getByRole("img", { name: /^Time volume/ });
  await volume.scrollIntoViewIfNeeded();
  const box = await volume.boundingBox();
  if (!box) throw new Error("Missing volume");
  const session = await context.newCDPSession(page);
  const x = box.x + box.width * 0.3,
    y = box.y + box.height * 0.5;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let step = 1; step <= 8; step++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + step * 10, y }],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () =>
      Number(
        await page.getByRole("slider", { name: "Time slice" }).inputValue(),
      ),
    )
    .toBeGreaterThan(0.35);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Time slice" })).toHaveValue(
    "0.35",
  );
  await context.close();
});
