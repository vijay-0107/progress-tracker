import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { trackSchema } from "../../src/content/schema";
import { EXTRA_TOPIC_IDS, type Lesson } from "../../src/domain/types";
import {
  completeLesson,
  createProgress,
  exportProgress,
  updateLesson,
} from "../../src/domain/progress";
import { progressStorageKey } from "../../src/domain/storage";
import { validateProgressState } from "../../src/domain/validation";

const topics = EXTRA_TOPIC_IDS.map((id) =>
  trackSchema.parse(
    JSON.parse(
      fs.readFileSync(
        path.resolve("src", "content", "tracks", `${id}.json`),
        "utf8",
      ),
    ),
  ),
);
const labels = [
  "Trading",
  "Algorithmic Trading",
  "Finance",
  "Computer Security Systems",
  "Ethical Hacking",
];
const stages = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Professional Practice",
];
const storageKey = progressStorageKey("guest");
const hostedBooks = z
  .array(z.object({ title: z.string(), path: z.string() }))
  .parse(
    JSON.parse(
      fs.readFileSync(
        path.resolve("src", "content", "hosted-books.json"),
        "utf8",
      ),
    ),
  );

async function guestState(page: Page) {
  const raw: unknown = await page.evaluate((key) => {
    const saved = localStorage.getItem(key);
    if (!saved) throw new Error("Expected a saved disposable guest workspace");
    return JSON.parse(saved);
  }, storageKey);
  return validateProgressState(raw);
}

async function completeAssignment(page: Page, lesson: Lesson) {
  await page.getByRole("tab", { name: "Assignment", exact: true }).click();
  await page
    .getByLabel("Assignment evidence")
    .fill(
      `Disposable browser-test evidence for ${lesson.title}: retained the synthetic fixture, compared expected outcomes and documented the relevant failure case.`,
    );
  for (const checkbox of await page.locator(".rubric-list input").all())
    await checkbox.check();
  await page.getByRole("button", { name: "Record manual completion" }).click();
  await expect(
    page.getByText(/Self-reported assignment completion recorded/),
  ).toBeVisible();
}

for (const [index, topic] of topics.entries()) {
  test(`${labels[index]} is discoverable, staged, separately counted and persistent`, async ({
    page,
  }, testInfo) => {
    const pageErrors: string[] = [];
    const eagerMedia: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      if (
        /\.pdf(?:[?#]|$)|youtube(?:-nocookie)?\.com\/embed\//.test(
          request.url(),
        )
      )
        eagerMedia.push(request.url());
    });
    await page.goto("./");
    const extras = page.getByRole("region", { name: "Extra Topics" });
    await expect(extras).toBeVisible();
    await expect(extras.locator(".path-card")).toHaveCount(5);
    await expect(extras).toContainText("0 / 124 extra lessons complete");
    for (const row of await page.locator(".path-card-metrics").all()) {
      await expect(row).toHaveCSS("display", "flex");
      await expect(row).toHaveCSS("justify-content", "space-between");
      const modules = await row.locator(":scope > span").boundingBox();
      const percent = await row.locator(":scope > strong").boundingBox();
      expect(percent!.x - (modules!.x + modules!.width)).toBeGreaterThan(4);
    }
    const summary = page
      .locator(".stat-card")
      .filter({ hasText: "Lessons completed" });
    await expect(summary).toContainText("of 231 core lessons");
    await expect(summary.locator("strong")).toHaveText("0");
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "Open navigation" }).click();
      const drawer = page.getByRole("dialog", { name: "Learning navigation" });
      await expect(
        drawer.getByText("EXTRA TOPICS", { exact: true }),
      ).toBeVisible();
      await drawer
        .getByRole("link", { name: labels[index], exact: true })
        .click();
      await expect(drawer).not.toBeVisible();
    } else {
      await page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("link", { name: labels[index], exact: true })
        .click();
    }
    await expect(
      page.getByRole("heading", { name: labels[index], exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Optional learning, with its own progress"),
    ).toBeVisible();
    const stageRegion = page.getByRole("region", { name: "Topic stages" });
    for (const [stageIndex, label] of stages.entries()) {
      await expect(
        stageRegion.getByRole("heading", { name: label, exact: true }),
      ).toBeVisible();
      await stageRegion
        .getByRole("button", { name: `Show ${label} lessons`, exact: true })
        .click();
      const stage = ["foundation", "intermediate", "advanced", "professional"][
        stageIndex
      ];
      await expect(page.locator(".module-card")).toHaveCount(
        topic.modules.filter((module) => module.stage === stage).length,
      );
    }
    await page.getByLabel("Learning stage").selectOption("foundation");
    await page
      .locator(".module-card")
      .first()
      .locator("summary")
      .first()
      .focus();
    await page.keyboard.press("Enter");
    const lesson = topic.modules[0].lessons[0];
    await page.getByRole("link", { name: lesson.title, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: lesson.title, exact: true }),
    ).toBeVisible();
    if (!lesson.video) {
      await expect(page.locator(".lesson-checklist p")).toHaveCount(3);
      await expect(page.locator(".lesson-checklist")).not.toContainText(
        "Watch the relevant lecture",
      );
      await expect(page.locator(".lesson-checklist p").first()).toContainText(
        "01Read and connect the ideas",
      );
      await expect(
        page.getByText("02 / CONNECT THE CONCEPTS", { exact: true }),
      ).toBeVisible();
    } else {
      await expect(page.locator(".lesson-checklist p")).toHaveCount(4);
    }
    await page.getByRole("button", { name: "Bookmark", exact: true }).click();
    await page
      .getByLabel("Reading position")
      .fill("Verified source section to revisit");
    await page.getByRole("button", { name: "Save position" }).click();
    await page.getByRole("tab", { name: "Your notes" }).click();
    await page
      .getByLabel("Lesson notes")
      .fill(
        "Synthetic topic notes: I can distinguish the mechanism from its limitations.",
      );
    await page.getByRole("button", { name: "Save notes", exact: true }).click();
    await page.getByRole("tab", { name: "Self-check", exact: true }).click();
    for (const question of lesson.assignment.questions) {
      if (
        question.kind === "single-choice" &&
        typeof question.answer === "string"
      ) {
        const answerIndex = question.choices!.indexOf(question.answer);
        expect(answerIndex).toBeGreaterThanOrEqual(0);
        await page
          .locator(`input[name="${question.id}"]`)
          .nth(answerIndex)
          .check();
      } else if (
        question.kind === "numeric" ||
        question.kind === "short-answer"
      ) {
        await page
          .getByLabel(question.prompt, { exact: true })
          .fill(String(question.answer));
      } else {
        throw new Error(`Add an explicit browser answer for ${question.id}`);
      }
    }
    await page
      .getByRole("button", { name: "Check answers", exact: true })
      .click();
    await expect(page.locator(".score-summary strong")).toHaveText("1/1");
    await expect(page.locator(".answer-explanation")).toHaveCount(2);
    expect(
      (await guestState(page)).lessons[lesson.id].manualCompletedAt,
    ).toBeNull();
    await completeAssignment(page, lesson);
    const completed = (await guestState(page)).lessons[lesson.id];
    expect(completed.review).not.toBeNull();
    expect(completed.assessment?.total).toBe(1);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Bookmarked", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Reading position")).toHaveValue(
      "Verified source section to revisit",
    );
    await page.getByRole("tab", { name: "Your notes" }).click();
    await expect(page.getByLabel("Lesson notes")).toHaveValue(
      /Synthetic topic notes/,
    );
    expect((await guestState(page)).lessons[lesson.id]).toEqual(completed);
    await page.goto(`./#/path/${topic.trackId}`);
    const total = topic.modules.flatMap((module) => module.lessons).length;
    const beginners = topic.modules
      .filter((module) => module.stage === "foundation")
      .flatMap((module) => module.lessons).length;
    await expect(
      page.getByRole("progressbar", { name: "Topic completion", exact: true }),
    ).toHaveAttribute("aria-valuenow", String(Math.round(100 / total)));
    await expect(
      page.getByRole("progressbar", {
        name: "Beginner completion",
        exact: true,
      }),
    ).toHaveAttribute("aria-valuenow", String(Math.round(100 / beginners)));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: path.join(
        "test-results",
        `${topic.trackId}-${testInfo.project.name}.png`,
      ),
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("./#/dashboard");
    await expect(
      page
        .locator(".stat-card")
        .filter({ hasText: "Lessons completed" })
        .locator("strong"),
    ).toHaveText("0");
    await expect(
      page.getByRole("region", { name: "Extra Topics" }),
    ).toContainText("1 / 124 extra lessons complete");
    expect((await guestState(page)).settings.primaryTrack).toBe("foundation");
    await page.goto("./#/library");
    await page.getByLabel("Resource type").selectOption("all");
    await page.getByLabel("Resource learning path").selectOption(topic.trackId);
    await expect(page.locator(".resource-card")).not.toHaveCount(0);
    await page.goto(`./#/search?q=${encodeURIComponent(labels[index])}`);
    await expect(
      page.getByRole("heading", { name: lesson.title, exact: true }),
    ).toBeVisible();
    expect(eagerMedia).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}

test("shared PDFs keep saved pages and require fresh reader consent in extra lessons", async ({
  page,
}) => {
  const asvs = hostedBooks.find((book) => book.title.startsWith("OWASP"))!;
  const postgres = hostedBooks.find((book) =>
    book.title.startsWith("PostgreSQL"),
  )!;
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/books/")) requests.push(request.url());
  });
  await page.goto("./#/lesson/security-l19-asvs-evidence");
  await expect(
    page.getByRole("button", { name: "Open PDF reader", exact: true }),
  ).toBeVisible();
  await expect(page.locator("object.pdf-reader")).toHaveCount(0);
  expect(requests).toEqual([]);
  await page.getByLabel("Reading position").fill("Page 9");
  await page
    .getByRole("button", { name: "Save position", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Reading position")).toHaveValue("Page 9");
  await expect(page.locator("object.pdf-reader")).toHaveCount(0);
  expect(requests).toEqual([]);
  await page
    .getByRole("button", { name: "Open PDF reader", exact: true })
    .click();
  await expect(page.locator("object.pdf-reader")).toHaveAttribute(
    "data",
    `/progress-tracker/${asvs.path}#page=9`,
  );
  // Headless browsers may use the fallback instead of loading a native PDF object.
  await expect(page.locator("object.pdf-reader a")).toHaveAttribute(
    "href",
    `/progress-tracker/${asvs.path}`,
  );
  const fallback = await page.request.get(`/progress-tracker/${asvs.path}`);
  expect(fallback.ok()).toBe(true);
  expect(fallback.headers()["content-type"]).toContain("pdf");
  expect((await fallback.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await page.goto("./#/lesson/security-l16-database");
  await expect(
    page.getByRole("button", { name: "Open PDF reader", exact: true }),
  ).toBeVisible();
  await expect(page.locator("object.pdf-reader")).toHaveCount(0);
  expect(requests.some((url) => url.includes(postgres.path))).toBe(false);
  await page.goto("./#/lesson/security-l19-asvs-evidence");
  await expect(page.getByLabel("Reading position")).toHaveValue("Page 9");
  await expect(page.locator("object.pdf-reader")).toHaveCount(0);
});

test("a pre-addition v2 guest record and new topic evidence survive reload and export/import", async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const foundation = trackSchema.parse(
    JSON.parse(
      fs.readFileSync(
        path.resolve("src", "content", "tracks", "foundation.json"),
        "utf8",
      ),
    ),
  );
  const lesson = foundation.modules[0].lessons[0];
  const time = "2026-09-20T12:00:00.000Z";
  let previous = createProgress("guest", time);
  previous.settings = {
    ...previous.settings,
    primaryTrack: "data",
    dailyMinutes: 65,
    theme: "dark",
    displayName: "Synthetic compatibility QA",
  };
  previous = completeLesson(
    updateLesson(
      previous,
      lesson.id,
      {
        note: "Original release note with canonical lesson identity.",
        evidence:
          "Synthetic legacy evidence: traced the original fixture and retained every acceptance check.",
        rubricChecked: lesson.assignment.acceptanceCriteria,
        bookmarked: true,
        readingPosition: "Page 4",
      },
      time,
    ),
    lesson,
    time,
  );
  const serialized = exportProgress(previous);
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: storageKey, value: serialized },
  );
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Lessons completed" })
      .locator("strong"),
  ).toHaveText("1");
  await page.goto("./#/settings");
  await expect(page.getByLabel("Primary learning focus")).toHaveValue("data");
  await expect(
    page.getByLabel("Primary learning focus").locator("option"),
  ).toHaveCount(7);
  await expect(
    page.getByText(/Extra Topics are optional, opened independently/),
  ).toBeVisible();
  const extra = topics[0].modules[0].lessons[0];
  await page.goto(`./#/lesson/${extra.id}`);
  await completeAssignment(page, extra);
  await page.reload();
  const after = await guestState(page);
  expect(after.settings).toEqual(previous.settings);
  expect(after.lessons[lesson.id]).toEqual(previous.lessons[lesson.id]);
  expect(after.projects).toEqual(previous.projects);
  expect(after.goals).toEqual(previous.goals);
  await page.goto("./#/settings");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export my learning data" }).click();
  const download = await downloadEvent;
  const filename = await download.path();
  const exported = fs.readFileSync(filename!, "utf8");
  expect(validateProgressState(JSON.parse(exported))).toEqual(after);
  const context = await browser.newContext();
  try {
    const fresh = await context.newPage();
    await fresh.goto(page.url());
    await fresh.getByLabel(/I own this learning data/).check();
    const confirmations: string[] = [];
    fresh.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toMatch(
        /^Import "synthetic-extra-topic-roundtrip\.json" into this guest workspace\?/,
      );
      confirmations.push(dialog.message());
      await dialog.accept();
    });
    await fresh.getByLabel("Choose a progress JSON export").setInputFiles({
      name: "synthetic-extra-topic-roundtrip.json",
      mimeType: "application/json",
      buffer: Buffer.from(exported),
    });
    await expect(
      fresh.getByText(/Import finished|Imported|Import complete/i).first(),
    ).toBeVisible();
    expect(confirmations).toHaveLength(1);
    const imported = await guestState(fresh);
    expect(imported.lessons).toEqual(after.lessons);
    expect(imported.activity).toEqual(after.activity);
    // Import still keeps the receiving workspace's existing preferences.
    expect(imported.settings.primaryTrack).toBe("foundation");
    await fresh.goto(new URL("#/path/trading", page.url()).href);
    await expect(
      fresh.getByRole("progressbar", { name: "Topic completion" }),
    ).toHaveAttribute("aria-valuenow", "5");
  } finally {
    await context.close();
  }
});
