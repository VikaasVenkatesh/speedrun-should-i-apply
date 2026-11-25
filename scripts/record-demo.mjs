// Records docs/demo.gif against the live app with Playwright (uses your installed Chrome).
// Usage: node scripts/record-demo.mjs docs/demo.gif docs/sample-resume.pdf   (BASE=http://localhost:3000 to record locally)
import { chromium } from "playwright-core";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;
import pngjs from "pngjs";
const { PNG } = pngjs;
import fs from "node:fs";

const BASE = process.env.BASE ?? "https://speedrun-should-i-apply.vercel.app";
const OUT = process.argv[2];
const PDF = process.argv[3];
const W = 1200, H = 750, SCALE = 0.75;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "light" });
const page = await ctx.newPage();

const frames = []; // {buf, delay}
let mode = "normal";
let recording = true;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const loop = (async () => {
  while (recording) {
    const t0 = Date.now();
    const fast = mode === "fast";
    const buf = await page.screenshot({ type: "png" }).catch(() => null);
    if (buf) {
      const delay = fast ? 110 : 220;
      const last = frames[frames.length - 1];
      if (last && last.buf.equals(buf)) last.delay += delay;
      else frames.push({ buf, delay });
    }
    const interval = fast ? 1100 : 220;
    await sleep(Math.max(0, interval - (Date.now() - t0)));
  }
})();

async function smoothScroll(dy, steps = 12) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await sleep(60);
  }
}

await page.goto(BASE, { waitUntil: "networkidle" });
await sleep(3000);
await page.mouse.move(400, 560);
await sleep(800);

// 1. upload the PDF
mode = "fast";
await page.setInputFiles('input[type="file"]', PDF);
await page.getByText("Here's what Claude read").waitFor({ timeout: 90000 });
mode = "normal";
await sleep(2500);
await smoothScroll(380);
await sleep(1500);
await page.getByRole("switch", { name: "Open to relocating" }).click();
await sleep(1000);
await smoothScroll(400);
await sleep(1200);

// 2. matches
await page.getByRole("button", { name: "Find my matches" }).click();
await sleep(1500);
mode = "fast";
await page.waitForFunction(() => /\d+\/\d+ scored/.test(document.body.innerText) && !document.querySelector("main .shimmer"), null, { timeout: 180000 });
mode = "normal";
await sleep(2500);
await smoothScroll(500, 16);
await sleep(1800);
await smoothScroll(500, 16);
await sleep(1500);
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await sleep(900);
await page.locator("main").getByRole("button", { name: /^Skip/ }).first().click();
await sleep(2800);
await page.locator("main").getByRole("button", { name: /^All/ }).first().click();
await sleep(1200);

// 3. tailor the top role
await page.getByRole("button", { name: "Tailor my resume" }).first().click();
mode = "fast";
await page.getByText("Download PDF").or(page.getByRole("link", { name: /PDF/ })).first().waitFor({ timeout: 180000 });
await sleep(1500);
mode = "normal";
await sleep(3500);
await page.getByRole("dialog").getByRole("button", { name: /Flags/ }).click();
await sleep(3000);
await page.getByRole("dialog").getByRole("button", { name: /Answers/ }).click();
await sleep(3500);
await page.getByRole("button", { name: "Close" }).click();
await sleep(800);

// 4. founders view
await page.goto(BASE + "/founders", { waitUntil: "networkidle" });
await sleep(1500);
await page.getByRole("button", { name: "product engineer", exact: true }).click();
await page.getByText("speedrun · San Francisco").first().waitFor({ timeout: 30000 });
await sleep(800);
await page.getByText("speedrun · San Francisco").first().click();
mode = "fast";
await page.locator("ol li").first().waitFor({ timeout: 120000 });
mode = "normal";
await sleep(2500);
await smoothScroll(450, 14);
await sleep(3000);

recording = false;
await loop;

// mobile screenshot for README
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const mp = await m.newPage();
await mp.goto(BASE, { waitUntil: "networkidle" });
await sleep(1500);
await mp.screenshot({ path: OUT.replace(/\.gif$/, "-mobile.png") });
await browser.close();

// encode GIF
console.log("frames", frames.length, "duration", frames.reduce((a, f) => a + f.delay, 0) / 1000, "s");
const ow = Math.round(W * SCALE), oh = Math.round(H * SCALE);
const gif = GIFEncoder();
for (const f of frames) {
  const png = PNG.sync.read(f.buf);
  const out = new Uint8Array(ow * oh * 4);
  const sx = png.width / ow, sy = png.height / oh;
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const i = (yy * png.width + xx) * 4;
        r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2]; n++;
      }
      const o = (y * ow + x) * 4;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
    }
  }
  const palette = quantize(out, 256);
  gif.writeFrame(applyPalette(out, palette), ow, oh, { palette, delay: Math.min(f.delay, 6000) });
}
gif.finish();
fs.writeFileSync(OUT, gif.bytes());
console.log("wrote", OUT, (fs.statSync(OUT).size / 1e6).toFixed(1), "MB");
