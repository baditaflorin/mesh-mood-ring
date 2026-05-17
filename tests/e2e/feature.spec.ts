import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("two peers' hues mix to circular-mean on the wall", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(400);

    await a.locator(".mood-slider").fill("0"); // alice = red 0°
    await b.locator(".mood-slider").fill("120"); // bob   = green 120°
    await b.waitForTimeout(400);

    // circular mean of 0 and 120 is 60 (yellow). Allow ±2.
    const avg = await b.locator(".mood-avg").getAttribute("data-avg");
    const n = Number(avg);
    if (!(n >= 58 && n <= 62)) throw new Error("avg=" + avg);

    await expect(b.locator(".mood-swatches")).toContainText("alice");
    await expect(b.locator(".mood-swatches")).toContainText("bob");
  } finally {
    await cleanup();
  }
});
