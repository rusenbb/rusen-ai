import { expect, test } from "@playwright/test";

const editions = [
  { slug: "we-are-the-bottleneck", label: "English audio edition", speed: "Playback speed" },
  { slug: "darbogaz-biziz", label: "Türkçe sesli sürüm", speed: "Oynatma hızı" },
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
      await expect(audio).toBeVisible();
      await expect(audio).toHaveAttribute("preload", "none");
      await expect(audio).not.toHaveAttribute("autoplay");
      expect(audioRequests).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

      await audio.evaluate((element: HTMLAudioElement) => element.play());
      await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
      const duration = await audio.evaluate((element: HTMLAudioElement) => element.duration);
      expect(duration).toBeGreaterThan(600);
      expect(await audio.evaluate((element: HTMLAudioElement) => element.error)).toBeNull();
      await page.getByLabel(edition.speed).selectOption("1.5");
      expect(await audio.evaluate((element: HTMLAudioElement) => element.playbackRate)).toBe(1.5);
      await audio.evaluate((element: HTMLAudioElement) => { element.currentTime = element.duration / 2; });
      await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(duration / 2 - 1);
      await audio.evaluate((element: HTMLAudioElement) => element.pause());
      expect(await audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
      expect(audioRequests.length).toBeGreaterThan(0);
      await expect(page.locator(".article-audio a[download]")).toHaveAttribute("href", `/audio/blog/${edition.slug}.m4a`);
    });
  }
}

test("posts without narration do not show an empty audio player", async ({ page }) => {
  await page.goto("/blogs/");
  const hrefs = await page.locator('a[href^="/blogs/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  const post = hrefs.find((href) => href && !href.includes("/series/") && !href.includes("/tag/") && !editions.some((e) => href.includes(e.slug)) && href !== "/blogs/" && href !== "/blogs/feed.xml");
  expect(post).toBeTruthy();
  await page.goto(post!);
  await expect(page.locator(".post-prose")).toBeVisible();
  await expect(page.locator(".article-audio")).toHaveCount(0);
});
