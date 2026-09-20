import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.argv[2] || "http://127.0.0.1:4177/";
const origin = new URL(url);
if (!["127.0.0.1", "localhost"].includes(origin.hostname)) {
  throw new Error(
    "This local QA measurement script is restricted to a loopback preview.",
  );
}
const output = path.resolve(
  process.argv[3] || path.join("test-results", "performance"),
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const reports = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const requests = [];
    const errors = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.__previewMetrics = { cls: 0, longTasks: [] };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__previewMetrics.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        window.__previewMetrics.longTasks.push(
          ...list.getEntries().map((entry) => entry.duration),
        );
      }).observe({ type: "longtask", buffered: true });
    });
    const started = Date.now();
    await page.goto(url, { waitUntil: "load" });
    await page.getByRole("heading", { name: /Your next chapter/ }).waitFor();
    const readyMs = Date.now() - started;
    await page.waitForTimeout(1500);
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      return {
        domContentLoadedMs: navigation.domContentLoadedEventEnd,
        firstContentfulPaintMs:
          performance.getEntriesByName("first-contentful-paint")[0]
            ?.startTime ?? null,
        layoutShift: window.__previewMetrics.cls,
        longestObservedTaskMs: Math.max(
          0,
          ...window.__previewMetrics.longTasks,
        ),
        observedLongTasks: window.__previewMetrics.longTasks.length,
        transferredBytes: resources.reduce(
          (sum, item) => sum + item.transferSize,
          0,
        ),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    await page.screenshot({
      path: path.join(output, `dashboard-${width}-clean.png`),
      fullPage: width < 600,
      animations: "disabled",
    });
    reports.push({
      viewportWidth: width,
      readyMs,
      ...metrics,
      automaticPdfRequests: requests.filter((request) =>
        /\.pdf(?:[?#]|$)/i.test(request),
      ).length,
      automaticVideoRequests: requests.filter((request) =>
        /youtube.*\/embed\//i.test(request),
      ).length,
      errors,
    });
    await context.close();
  }
} finally {
  await browser.close();
}
const result = {
  measuredAt: new Date().toISOString(),
  scope:
    "Production-build local loopback preview in fresh independent Chromium contexts; unthrottled Windows machine with other work possibly running. These are observations, not global mobile-network or 60fps guarantees.",
  reports,
};
await writeFile(
  path.join(output, "preview-performance.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
