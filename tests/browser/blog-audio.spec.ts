import { expect, test } from "@playwright/test";

const editions = [
  { slug: "we-are-the-bottleneck", label: "English audio edition", speed: "Playback speed", play: "Play audio", pause: "Pause audio", position: "Playback position", forward: "Forward 15 seconds", backward: "Back 15 seconds" },
  { slug: "darbogaz-biziz", label: "Türkçe sesli sürüm", speed: "Oynatma hızı", play: "Sesi oynat", pause: "Sesi duraklat", position: "Dinleme konumu", forward: "15 saniye ileri", backward: "15 saniye geri" },
];

for (const edition of editions) {
  for (const width of [1280, 320]) {
    test(`${edition.slug} audio plays and seeks at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      const audioRequests: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes("/audio/blog/")) audioRequests.push(request.url());
      });
      await page.goto(`/blogs/${edition.slug}/`);
      const audio = page.getByLabel(edition.label);
      await expect(page.getByRole("button", { name: edition.play, exact: true })).toBeVisible();
      await expect(page.locator(".article-audio-wave svg")).toBeVisible();
      await expect(audio).toHaveAttribute("preload", "none");
      await expect(audio).not.toHaveAttribute("autoplay");
      expect(audioRequests).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

      await page.getByRole("button", { name: edition.play, exact: true }).click();
      await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
      const duration = await audio.evaluate((element: HTMLAudioElement) => element.duration);
      expect(duration).toBeGreaterThan(600);
      expect(await audio.evaluate((element: HTMLAudioElement) => element.error)).toBeNull();
      await page.getByLabel(edition.speed).selectOption("1.5");
      expect(await audio.evaluate((element: HTMLAudioElement) => element.playbackRate)).toBe(1.5);
      await page.getByRole("button", { name: edition.forward }).click();
      await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(14);
      await page.getByRole("button", { name: edition.backward }).click();
      await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeLessThan(5);
      const slider = page.getByRole("slider", { name: edition.position });
      const bounds = (await slider.boundingBox())!;
      await slider.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
      await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(duration * 0.4);
      await page.getByRole("button", { name: edition.pause, exact: true }).click();
      expect(await audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
      await slider.focus();
      await slider.press("Home");
      await slider.press("ArrowRight");
      await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBe(1);
      expect(audioRequests.length).toBeGreaterThan(0);
      await expect(page.locator(".article-audio a[download]")).toHaveAttribute("href", `/audio/blog/${edition.slug}.m4a`);
    });
  }
}

test("seeking before play loads audio without starting it", async ({ page }) => {
  await page.goto("/blogs/we-are-the-bottleneck/");
  await page.getByLabel("Playback speed").selectOption("1.75");
  const slider = page.getByRole("slider", { name: "Playback position" });
  await slider.focus();
  await slider.press("ArrowRight");
  const audio = page.getByLabel("English audio edition");
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBe(1);
  expect(await audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  expect(await audio.evaluate((element: HTMLAudioElement) => element.playbackRate)).toBe(1.75);
  await expect(page.getByRole("button", { name: "Play audio", exact: true })).toBeVisible();
});

test("a failed audio load shows feedback and can be retried by the listener", async ({ page }) => {
  await page.route("**/audio/blog/*.m4a", (route) => route.abort());
  await page.goto("/blogs/we-are-the-bottleneck/");
  await page.getByRole("button", { name: "Play audio", exact: true }).click();
  await expect(page.locator(".article-audio").getByRole("alert")).toContainText("could not be loaded");
  await page.unroute("**/audio/blog/*.m4a");
  await page.getByRole("button", { name: "Play audio", exact: true }).click();
  await expect.poll(() => page.getByLabel("English audio edition").evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
  await expect(page.locator(".article-audio").getByRole("alert")).toHaveCount(0);
});

test("posts without narration do not show an empty audio player", async ({ page }) => {
  await page.goto("/blogs/");
  const hrefs = await page.locator('a[href^="/blogs/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  const post = hrefs.find((href) => href && !href.includes("/series/") && !href.includes("/tag/") && !editions.some((e) => href.includes(e.slug)) && href !== "/blogs/" && href !== "/blogs/feed.xml");
  expect(post).toBeTruthy();
  await page.goto(post!);
  await expect(page.locator(".post-prose")).toBeVisible();
  await expect(page.locator(".article-audio")).toHaveCount(0);
});
