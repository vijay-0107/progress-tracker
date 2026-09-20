import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import type { Track } from "../../src/domain/types";
import { gradeQuestion } from "../../src/domain/progress";

const foundation = JSON.parse(
  fs.readFileSync(
    path.resolve("src", "content", "tracks", "foundation.json"),
    "utf8",
  ),
) as Track;
const firstLesson = foundation.modules[0].lessons[0];
const cat = JSON.parse(
  fs.readFileSync(path.resolve("src", "content", "tracks", "cat.json"), "utf8"),
) as Track;

test("guest learning has no seeded progress and persists notes, bookmarks, reading and assignment evidence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: /Your next chapter/ }),
  ).toBeVisible();
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Lessons completed" })
      .locator("strong"),
  ).toHaveText("0");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Learning streak" })
      .locator("strong"),
  ).toHaveText("0 days");
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: /Common Foundation/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Common Foundation", exact: true }),
  ).toBeVisible();
  await page.locator(".module-card").first().locator("summary").first().click();
  await page
    .getByRole("link", { name: firstLesson.title, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: firstLesson.title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bookmark", exact: true }).click();
  await page
    .getByLabel("Reading position")
    .fill("Chapter 1, section to resume");
  await page.getByRole("button", { name: "Save position" }).click();
  await page.getByRole("tab", { name: "Your notes" }).click();
  await page
    .getByLabel("Lesson notes")
    .fill(
      "I traced the boundary case and can explain why the invariant holds. <script>alert('not executed')</script>",
    );
  await page.getByRole("button", { name: "Save notes", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Bookmarked", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Reading position")).toHaveValue(
    "Chapter 1, section to resume",
  );
  await page.getByRole("tab", { name: "Your notes" }).click();
  await expect(page.getByLabel("Lesson notes")).toHaveValue(/<script>alert/);
  await page.getByRole("tab", { name: "Assignment", exact: true }).click();
  await page.getByRole("button", { name: "Record manual completion" }).click();
  await expect(page.getByRole("alert")).toContainText(/evidence|rubric/i);
  await page
    .getByLabel("Assignment evidence")
    .fill(
      "Built a deterministic fixture, ran the stated acceptance checks and documented the failure case in my local notebook.",
    );
  for (const checkbox of await page.locator(".rubric-list input").all())
    await checkbox.check();
  await page.getByRole("button", { name: "Record manual completion" }).click();
  await expect(
    page.getByText(/Self-reported assignment completion recorded/),
  ).toBeVisible();
  await page.getByLabel("Minutes studied").fill("25");
  await page
    .getByLabel("What did you work on?")
    .fill(
      "Read the assigned sections and tested my implementation against two edge cases.",
    );
  await page.getByRole("button", { name: "Log study time" }).click();
  await page.goto("./#/dashboard");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Lessons completed" })
      .locator("strong"),
  ).toHaveText("1");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Studied today" })
      .locator("strong"),
  ).toHaveText("25 min");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Learning streak" })
      .locator("strong"),
  ).toHaveText("1 day");
  await page.reload();
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Lessons completed" })
      .locator("strong"),
  ).toHaveText("1");
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("original self-checks report checked results without granting manual completion", async ({
  page,
}) => {
  const lesson = cat.modules
    .flatMap((module) => module.lessons)
    .find((lesson) =>
      lesson.assignment.questions.some(
        (question) => question.kind === "single-choice",
      ),
    )!;
  expect(lesson).toBeDefined();
  await page.goto(`./#/lesson/${lesson.id}`);
  await page.getByRole("tab", { name: "Self-check" }).click();
  for (const question of lesson.assignment.questions) {
    if (question.kind === "single-choice") {
      const wrong = question.choices!.find(
        (choice) => gradeQuestion(question, choice) === false,
      )!;
      await page
        .locator(`input[name="${question.id}"]`)
        .nth(question.choices!.indexOf(wrong))
        .check();
    } else if (question.kind === "multiple-choice") {
      await page
        .getByRole("group", { name: question.prompt, exact: false })
        .getByRole("checkbox")
        .first()
        .check();
    } else if (question.kind === "numeric") {
      await page.getByLabel(question.prompt).fill("-9999917");
    } else if (question.kind === "short-answer") {
      await page
        .getByLabel(question.prompt)
        .fill(
          "My initial reasoning needs comparison with the model answer before I can claim understanding.",
        );
    }
  }
  await page
    .getByRole("button", { name: "Check answers", exact: true })
    .click();
  await expect(page.locator(".score-summary")).toBeVisible();
  await expect(page.locator(".answer-explanation").first()).toBeVisible();
  await page.goto("./#/dashboard");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Lessons completed" })
      .locator("strong"),
  ).toHaveText("0");
  await page.goto("./#/review");
  await page.getByRole("button", { name: /Error notebook/ }).click();
  await expect(
    page.getByRole("heading", { name: "Come back a little stronger." }),
  ).toBeVisible();
  await expect(page.locator(".review-card")).not.toHaveCount(0);
});

test("practice timer survives reload, expires and locks answers without inventing a full mock exam", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("./#/practice/cat");
  await page.getByLabel("Practice minutes").fill("1");
  await page.getByRole("button", { name: "Start focused practice" }).click();
  await expect(page.locator(".practice-timer")).toContainText("01:00");
  await page.reload();
  await expect(page.locator(".practice-timer")).toBeVisible();
  await page.clock.fastForward(61000);
  await expect(page.locator(".practice-timer")).toContainText("Time is up");
  const fields = page.locator(
    ".question-field input, .question-field textarea",
  );
  expect(await fields.count()).toBeGreaterThan(0);
  for (const field of await fields.all()) await expect(field).toBeDisabled();
});

test("goal, theme, timezone and safe versioned export/import work without cloud auth", async ({
  page,
}) => {
  await page.goto("./#/planner");
  await page
    .getByLabel("A concrete goal")
    .fill("Build and explain one tested fixture");
  await page.getByRole("button", { name: "Add personal goal" }).click();
  await expect(
    page.getByRole("heading", { name: "Build and explain one tested fixture" }),
  ).toBeVisible();
  await page.goto("./#/settings");
  await page.getByLabel("Preferred name").fill("Local learner");
  await page.getByLabel("Planning timezone").fill("America/New_York");
  await page.getByLabel("Appearance").selectOption("dark");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export my learning data" }).click();
  const download = await downloading;
  const file = await download.path();
  const exported = JSON.parse(fs.readFileSync(file!, "utf8"));
  expect(exported.schemaVersion).toBe(2);
  expect(exported.ownerId).toBe("guest");
  expect(exported.settings.timezone).toBe("America/New_York");
  expect(Object.keys(exported.goals)).toHaveLength(1);
  expect(JSON.stringify(exported)).not.toMatch(
    /pinHash|refreshToken|accessToken/,
  );
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Type RESET to confirm").fill("RESET");
  await page
    .getByRole("button", { name: "Reset this workspace", exact: true })
    .click();
  await page.getByLabel(/I own this learning data/).check();
  await page.getByLabel("Choose a progress JSON export").setInputFiles({
    name: "learning-export.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await page.goto("./#/planner");
  await expect(
    page.getByRole("heading", { name: "Build and explain one tested fixture" }),
  ).toBeVisible();
});

test("base-path resource requests and legacy archive are real and navigable", async ({
  page,
}) => {
  await page.goto("./#/library");
  await expect(
    page.getByRole("heading", { name: "Your learning bookshelf." }),
  ).toBeVisible();
  const hosted = page
    .locator(".resource-card")
    .filter({ hasText: "Open Data Structures" })
    .getByRole("link", { name: "Read licensed PDF" });
  expect(await hosted.count()).toBeGreaterThan(0);
  const href = await hosted.first().getAttribute("href");
  expect(href).toContain("/progress-tracker/books/");
  const response = await page.request.get(href!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("pdf");
  await page.goto("./#/legacy");
  await expect(
    page.getByRole("heading", { name: "The original study archive." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "35 original topics · 436 subtopics · 1,300 scheduled sessions.",
    ),
  ).toBeVisible();
  await expect(page.locator(".module-card")).toHaveCount(35);
});
