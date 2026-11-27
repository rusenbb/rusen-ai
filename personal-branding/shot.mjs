// node shot.mjs <page.html> <out.png> <width> <height> [scale]
import { chromium } from "playwright";

const [, , src, out, w, h, s] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(s || 1) });
await page.goto("file://" + src, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out });
await browser.close();
