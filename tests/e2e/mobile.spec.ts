import { expect, test } from "@playwright/test";

for (const width of [320, 360, 390, 768, 1024]) {
  test(`${width}px layout keeps navigation, lessons, notes and settings usable`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("./");
    await expect(
      page.getByRole("heading", { name: /Your next chapter/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/dashboard-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    if (width <= 780) {
      const menu = page.getByRole("button", { name: "Open navigation" });
      await expect(menu).toBeVisible();
      const box = await menu.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await menu.click();
      const dialog = page.getByRole("dialog", { name: "Learning navigation" });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("link", { name: /Common Foundation/ }).click();
      await expect(dialog).not.toBeVisible();
    } else {
      await page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("link", { name: /Common Foundation/ })
        .click();
    }
    await expect(
      page.getByRole("heading", { name: "Common Foundation", exact: true }),
    ).toBeVisible();
    await page
      .locator(".module-card")
      .first()
      .locator("summary")
      .first()
      .focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".roadmap-lesson").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/roadmap-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.locator(".roadmap-lesson").first().locator("h3").click();
    await expect(page.getByRole("tab", { name: "Your notes" })).toBeVisible();
    await page.getByRole("tab", { name: "Your notes" }).click();
    await page
      .getByLabel("Lesson notes")
      .fill(`A private note written comfortably at a ${width}px viewport.`);
    await page.getByRole("button", { name: "Save notes" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/lesson-notes-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    if (width <= 520) {
      const size = await page
        .locator(
          ".lesson-main .lesson-section > p:not(.eyebrow):not(.quiet-note)",
        )
        .first()
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
      expect(size).toBeGreaterThanOrEqual(16);
      const inputSize = await page
        .getByLabel("Lesson notes")
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
      expect(inputSize).toBeGreaterThanOrEqual(16);
    }
    await page.goto("./#/settings");
    await expect(
      page.getByRole("heading", { name: "Account & preferences." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.goto("./#/projects");
    await expect(
      page.getByRole("heading", { name: "Build something that holds up." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.goto("./#/library");
    await expect(
      page.getByRole("heading", { name: "Your learning bookshelf." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await page.evaluate(
        () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
  });
}
