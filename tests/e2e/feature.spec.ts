import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("two peers' hues mix to the same circular-mean background on BOTH screens", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(400);

    await a.locator(".mood-slider").fill("0"); // alice = red    0°
    await b.locator(".mood-slider").fill("240"); // bob   = blue 240°
    await b.waitForTimeout(400);

    // Circular mean of 0° and 240° is 300° (magenta) — the *short* way around
    // the wheel, NOT the arithmetic mean 120°. This is what makes the test
    // falsifiable: a buggy app that stored hue in local React state (so each
    // peer only ever sees its own hue) would paint 0° on alice and 240° on
    // bob, never the shared 300°. Allow ±2 for rounding.
    const inRange = (n: number) => n >= 298 && n <= 302;
    // The rgb→hue round-trip quantises to 8-bit channels, so allow a wider band.
    const inRangeBg = (n: number) => n >= 296 && n <= 304;

    // Both peers must converge to the SAME averaged hue — proving alice's red
    // reached bob AND bob's blue reached alice through the Yjs doc.
    const avgA = Number(await a.locator(".mood-avg").getAttribute("data-avg"));
    const avgB = Number(await b.locator(".mood-avg").getAttribute("data-avg"));
    if (!inRange(avgA)) throw new Error("alice avg=" + avgA);
    if (!inRange(avgB)) throw new Error("bob avg=" + avgB);

    // And the painted background must reflect that same hue on both screens.
    // The DOM normalises `background: hsl(...)` to a computed `rgb(...)`, so
    // we read the rendered colour and convert it back to a hue degree.
    const bgHueOf = async (page: typeof a) => {
      const bg = await page
        .locator(".mood-bg")
        .evaluate((el) => getComputedStyle(el as HTMLElement).backgroundColor);
      const m = bg.match(/rgba?\(([0-9.]+),\s*([0-9.]+),\s*([0-9.]+)/);
      if (!m) throw new Error("no rgb in background: " + bg);
      const r = Number(m[1]) / 255;
      const g = Number(m[2]) / 255;
      const bl = Number(m[3]) / 255;
      const max = Math.max(r, g, bl);
      const min = Math.min(r, g, bl);
      const d = max - min;
      if (d === 0) return 0;
      let h: number;
      if (max === r) h = ((g - bl) / d) % 6;
      else if (max === g) h = (bl - r) / d + 2;
      else h = (r - g) / d + 4;
      h = h * 60;
      if (h < 0) h += 360;
      return h;
    };
    const bgA = await bgHueOf(a);
    const bgB = await bgHueOf(b);
    if (!inRangeBg(bgA)) throw new Error("alice bg hue=" + bgA);
    if (!inRangeBg(bgB)) throw new Error("bob bg hue=" + bgB);

    // Both peers list both moods in their swatch rows.
    await expect(a.locator(".mood-swatches")).toContainText("alice");
    await expect(a.locator(".mood-swatches")).toContainText("bob");
    await expect(b.locator(".mood-swatches")).toContainText("alice");
    await expect(b.locator(".mood-swatches")).toContainText("bob");
  } finally {
    await cleanup();
  }
});
