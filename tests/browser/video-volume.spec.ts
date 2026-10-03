import { expect, test } from "@playwright/test";
test("real gallery selects all clips, scrubs, plays, resets and resizes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/video-volume");
  const volume = page.getByRole("img", { name: /^Time volume/ }),
    time = page.getByRole("slider", { name: "Time slice" });
  await expect(volume).toBeVisible();
  const pixels = () =>
    volume.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  const initial = await pixels();
  for (const title of [
    "Duck on the move",
    "Riverside run",
    "San Francisco traffic",
    "Wild horses",
    "Sunlit cat",
  ]) {
    await page.getByRole("button", { name: title, exact: true }).click();
    await expect(volume).toBeVisible();
    await expect(
      page.getByRole("button", { name: title, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await time.focus();
    await time.press("End");
    await expect(page.getByTestId("time-output")).toHaveText(
      "2.875 s · Frame 24 / 24",
    );
    await expect.poll(pixels).not.toBe(initial);
  }
  await time.press("Home");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => time.inputValue()).not.toBe("0");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await time.inputValue();
  await page.waitForTimeout(250);
  await expect(time).toHaveValue(paused);
  await volume.scrollIntoViewIfNeeded();
  let box = await volume.boundingBox();
  if (!box) throw new Error("No canvas");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await time.inputValue()))
    .toBeGreaterThan(Number(paused));
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await volume.scrollIntoViewIfNeeded();
  box = await volume.boundingBox();
  if (!box) throw new Error("No canvas");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(
    page.getByRole("slider", { name: "Rotation", exact: true }),
  ).not.toHaveValue("42");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(time).toHaveValue("0");
    await expect(
      page.getByRole("slider", { name: "Rotation", exact: true }),
    ).toHaveValue("42");
    await expect(
      page.getByRole("checkbox", { name: "Show faint frame stack" }),
    ).toBeChecked();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await page
    .getByRole("button", { name: "San Francisco traffic", exact: true })
    .click();
  await expect(volume).toBeVisible();
  await page.getByRole("button", { name: "car", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "Track legend" }),
  ).not.toContainText("bus");
  expect(errors).toEqual([]);
});
test("cancel, retry, failed loading and rapid switching never retain stale frames", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/cat/analysis.json", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue().catch(() => {});
  });
  await page.goto("/video-volume");
  await page.getByRole("button", { name: "Cancel loading" }).click();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await page.unroute("**/cat/analysis.json");
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("img", { name: /^Time volume/ })).toBeVisible();
  await page.route("**/duck/analysis.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page
    .getByRole("button", { name: "Duck on the move", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await page.unroute("**/duck/analysis.json");
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("img", { name: /^Time volume/ })).toBeVisible();
  for (let i = 0; i < 3; i++)
    for (const title of ["Wild horses", "Riverside run", "Sunlit cat"]) {
      await page.getByRole("button", { name: title, exact: true }).click();
    }
  await expect(page.getByRole("img", { name: /^Time volume/ })).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Sunlit cat, selected frame/ }),
  ).toBeVisible();
  await expect(page.getByTestId("time-output")).toHaveText(
    "0.000 s · Frame 1 / 24",
  );
  expect(errors).toEqual([]);
});
test("touch scrubbing starts paused with reduced motion", async ({
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
  const volume = page.getByRole("img", { name: /^Time volume/ });
  await expect(volume).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled();
  await volume.scrollIntoViewIfNeeded();
  const box = await volume.boundingBox();
  if (!box) throw new Error("No canvas");
  const session = await context.newCDPSession(page),
    x = box.x + box.width * 0.3,
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
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Time slice" })).toHaveValue(
    "0",
  );
  await context.close();
});
