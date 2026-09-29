import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { careerProfiles } from "../../src/content/careers";
import { careerPackets } from "../../src/content/career-exercises";
import {
  LEARNING_STAGES,
  READINESS_GATES,
  type Lesson,
} from "../../src/domain/types";
import {
  createProgress,
  completeLesson,
  updateLesson,
} from "../../src/domain/progress";
import { progressStorageKey } from "../../src/domain/storage";
import { validateProgressState } from "../../src/domain/validation";
import { trackSchema } from "../../src/content/schema";

const storageKey = progressStorageKey("guest");
const stages = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Professional Practice",
];
const gates = ["Explain", "Modify", "Debug", "Test and defend"];
const projectId = "sde-order-orchestrator";
const pm = trackSchema.parse(
  JSON.parse(
    fs.readFileSync(
      path.resolve(
        "src",
        "content",
        "tracks",
        "technical-product-management.json",
      ),
      "utf8",
    ),
  ),
);
async function guest(page: Page) {
  const raw = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );
  // A pristine guest has no persisted record until an explicit mutation.
  return raw === null
    ? createProgress("guest", "2026-09-20T10:00:00.000Z")
    : validateProgressState(JSON.parse(raw));
}
async function openReadiness(page: Page) {
  await page.goto(`./#/project/${projectId}`);
  await expect(
    page.getByRole("region", {
      name: "Career exercises and independent readiness",
    }),
  ).toBeVisible();
}
async function recordGate(page: Page, index: number) {
  const editor = page.locator(
    `[data-readiness-gate="${READINESS_GATES[index]}"]`,
  );
  await editor
    .getByLabel(`Evidence for ${gates[index]}`, { exact: true })
    .fill(
      `My independent ${gates[index]} evidence: retained the synthetic input, predicted this gate's boundary behavior and recorded the actual regression result.`,
    );
  for (const checkbox of await editor.getByRole("checkbox").all())
    await checkbox.check();
  await editor
    .getByRole("button", {
      name: `Record ${gates[index]} readiness`,
      exact: true,
    })
    .click();
  await expect(
    editor.getByText("Independent practice recorded (self-reported).", {
      exact: true,
    }),
  ).toBeVisible();
}

test("all six profiles expose four stages and canonical evidence without writes or eager media", async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (
      /\.pdf(?:[?#]|$)|youtube(?:-nocookie)?\.com\/embed|api\.github\.com|github\.com\/vijay-0107\/(commerce|tenant|model|retrieval|replayable|point-in-time|paper|portfolio|supply)/.test(
        request.url(),
      )
    )
      requests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page
    .getByRole("link", { name: "Explore career preparation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Career Preparation", exact: true }),
  ).toBeVisible();
  const before = await guest(page);
  for (const profile of careerProfiles) {
    await page.goto(`./#/career/${profile.id}`);
    await expect(
      page.getByRole("heading", { name: profile.title, exact: true }),
    ).toBeVisible();
    await expect(page).toHaveTitle(`Progress | ${profile.title}`);
    await expect(
      page
        .getByRole("region", { name: "Three career projects" })
        .locator(".career-card"),
    ).toHaveCount(3);
    for (const [index, label] of stages.entries()) {
      await page
        .getByRole("region", { name: "Career preparation stages" })
        .getByRole("button", { name: `Show ${label}`, exact: true })
        .click();
      await expect(
        page.getByLabel("Preparation stage", { exact: true }),
      ).toHaveValue(LEARNING_STAGES[index]);
      await expect(
        page
          .getByRole("region", { name: "Competency evidence map" })
          .locator(".career-card"),
      ).toHaveCount(profile.stages[index].competencies.length);
    }
    await page.getByLabel("Evidence gaps only").check();
    expect((await guest(page)).settings).toEqual(before.settings);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  expect(await guest(page)).toEqual(before);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  await page.goto("./#/career/not-a-profile");
  await expect(
    page.getByRole("heading", { name: "Career profile not found" }),
  ).toBeVisible();
  await page.goto("./#/search?q=transactional%20outbox");
  await expect(
    page.getByRole("heading", { name: careerProfiles[0].title, exact: true }),
  ).toBeVisible();
  await page.goto("./#/search?q=commerce-workflow-engine");
  await expect(page.locator(".search-result")).toHaveCount(1);
  await page.goto("./#/projects?career=security");
  await expect(page.locator(".project-card")).toHaveCount(3);
});

test("per-gate readiness requires meaningful evidence and stays out of lesson/build totals", async ({
  page,
}) => {
  await openReadiness(page);
  const explain = page.locator('[data-readiness-gate="explain"]');
  const modify = page.locator('[data-readiness-gate="modify"]');
  await expect(
    modify.getByRole("button", {
      name: "Record Modify readiness",
      exact: true,
    }),
  ).toBeDisabled();
  await explain
    .getByLabel("Evidence for Explain", { exact: true })
    .fill("done ".repeat(15));
  for (const checkbox of await explain.getByRole("checkbox").all())
    await checkbox.check();
  await explain
    .getByRole("button", { name: "Record Explain readiness", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("meaningful evidence");
  expect(Object.keys((await guest(page)).activity)).toHaveLength(0);
  await explain
    .getByLabel("Evidence for Explain", { exact: true })
    .fill(
      "A draft explaining my original synthetic fixture and the transaction/provider boundary.",
    );
  await explain
    .getByRole("button", { name: "Save Explain evidence", exact: true })
    .click();
  expect(Object.keys((await guest(page)).activity)).toHaveLength(0);
  await page.reload();
  await expect(
    explain.getByLabel("Evidence for Explain", { exact: true }),
  ).toHaveValue(/A draft explaining/);
  await expect(
    explain.getByText("Not yet independently demonstrated.", { exact: true }),
  ).toBeVisible();
  for (let index = 0; index < gates.length; index++)
    await recordGate(page, index);
  const saved = await guest(page);
  expect(Object.keys(saved.projects)).toHaveLength(4);
  expect(saved.projects[projectId]).toBeUndefined();
  expect(saved.lessons).toEqual({});
  expect(Object.keys(saved.activity)).toHaveLength(4);
  await page.reload();
  for (const [index, gate] of READINESS_GATES.entries()) {
    const editor = page.locator(`[data-readiness-gate="${gate}"]`);
    await expect(
      editor.getByLabel(`Evidence for ${gates[index]}`, { exact: true }),
    ).toHaveValue(
      saved.projects[`career-readiness-${projectId}-${gate}`].evidence,
    );
    await expect(
      editor.getByRole("button", {
        name: `${gates[index]} recorded`,
        exact: true,
      }),
    ).toBeDisabled();
  }
  for (const id of ["backend", "technical-pm"]) {
    await page.goto(`./#/career/${id}`);
    await expect(
      page
        .getByRole("region", { name: "Three career projects" })
        .locator(".career-card")
        .filter({ hasText: "Durable Commerce Workflow Engine" }),
    ).toContainText("4/4 independent readiness");
  }
  await page.goto("./#/dashboard");
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
  ).toHaveText("1 day");
  await expect(page.locator(".portfolio-progress")).toContainText(
    "0 of 21 original projects complete",
  );
  await expect(page.locator(".portfolio-progress")).toContainText(
    "0 of 84 original build gates",
  );
  await expect(page.locator(".portfolio-progress")).toContainText(
    "0 of 20 additional build gates",
  );
  await page.goto("./#/planner");
  await expect(page.locator(".activity-log li")).toHaveCount(4);
  for (const badge of await page.locator(".activity-log .stage-badge").all())
    await expect(badge).toHaveText("readiness");
  await expect(page.locator(".activity-log")).toContainText(
    "not project completion or certification",
  );
  await page.goto("./#/settings");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export my learning data" }).click();
  const filename = await (await downloading).path();
  const exported = validateProgressState(
    JSON.parse(fs.readFileSync(filename!, "utf8")),
  );
  expect(exported.projects).toEqual(saved.projects);
  expect(exported.settings.primaryTrack).toBe("foundation");
});

test("PM lesson evidence persists alongside old records and separate optional totals", async ({
  page,
}) => {
  const foundation = trackSchema.parse(
    JSON.parse(
      fs.readFileSync(
        path.resolve("src", "content", "tracks", "foundation.json"),
        "utf8",
      ),
    ),
  );
  let initial = createProgress("guest", "2026-09-20T10:00:00.000Z");
  for (const lesson of foundation.modules.flatMap((module) => module.lessons))
    initial = completeLesson(
      updateLesson(
        initial,
        lesson.id,
        {
          evidence:
            "Disposable prior learning evidence: I retained the original fixture and explained its result.",
          rubricChecked: lesson.assignment.acceptanceCriteria,
        },
        "2026-09-20T10:00:00.000Z",
      ),
      lesson,
      "2026-09-20T10:00:00.000Z",
    );
  initial.settings.primaryTrack = "data";
  initial.settings.dailyMinutes = 65;
  initial.projects["data-shopping-mall-operations"] = {
    id: "data-shopping-mall-operations",
    updatedAt: initial.updatedAt,
    milestones: [],
    evidence: "Original synthetic project evidence that must remain unchanged.",
  };
  await page.addInitScript(
    ({ key, state }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(state));
    },
    { key: storageKey, state: initial },
  );
  const lesson: Lesson = pm.modules[0].lessons[0];
  await page.goto(`./#/lesson/${lesson.id}`);
  await expect(page.getByText("Watch the relevant lecture")).toHaveCount(0);
  await page.getByRole("button", { name: "Bookmark", exact: true }).click();
  await page.getByLabel("Reading position").fill("Define the problem");
  await page.getByRole("button", { name: "Save position" }).click();
  await page.getByRole("tab", { name: "Your notes" }).click();
  await page
    .getByLabel("Lesson notes")
    .fill(
      "My hypothetical discovery notes separate facts, assumptions and ethical research choices.",
    );
  await page.getByRole("button", { name: "Save notes", exact: true }).click();
  await page.getByRole("tab", { name: "Self-check", exact: true }).click();
  const choice = lesson.assignment.questions.find(
    (question) => question.kind === "single-choice",
  )!;
  await page
    .locator(`input[name="${choice.id}"]`)
    .nth(choice.choices!.indexOf(String(choice.answer)))
    .check();
  await page
    .getByRole("button", { name: "Check answers", exact: true })
    .click();
  await expect(page.locator(".score-summary strong")).toHaveText("1/1");
  expect((await guest(page)).lessons[lesson.id].manualCompletedAt).toBeNull();
  await page.getByRole("tab", { name: "Assignment", exact: true }).click();
  await page
    .getByLabel("Assignment evidence")
    .fill(
      "I wrote an original synthetic discovery brief, separated assumptions and documented voluntary consent, withdrawal and a no-build decision.",
    );
  for (const checkbox of await page.locator(".rubric-list input").all())
    await checkbox.check();
  await page.getByRole("button", { name: "Record manual completion" }).click();
  await expect(
    page.getByText(/Self-reported assignment completion recorded/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Bookmarked", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Reading position")).toHaveValue(
    "Define the problem",
  );
  const saved = await guest(page);
  expect(saved.lessons[lesson.id].review).not.toBeNull();
  expect(saved.settings).toEqual(initial.settings);
  expect(saved.projects).toEqual(initial.projects);
  for (const [id, record] of Object.entries(initial.lessons))
    expect(saved.lessons[id]).toEqual(record);
  await page.goto("./#/dashboard");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Lessons completed" })
      .locator("strong"),
  ).toHaveText("22");
  await expect(
    page.getByRole("region", { name: "Extra Topics" }),
  ).toContainText("0 / 124 extra lessons complete");
  await page.goto("./#/careers");
  await expect(
    page.getByRole("region", {
      name: "New optional curriculum: Technical Product Management",
    }),
  ).toContainText("1/16 PM lessons recorded");
  await page.goto("./#/library");
  await page.getByLabel("Resource type").selectOption("all");
  await page
    .getByLabel("Resource learning path")
    .selectOption("technical-product-management");
  await expect(page.locator(".resource-card")).not.toHaveCount(0);
});

test("PM numeric grading distinguishes percent units without granting assignment completion", async ({
  page,
}) => {
  const lesson = pm.modules
    .flatMap((module) => module.lessons)
    .find((item) => item.id === "tpm-l04-outcome-metrics")!;
  const choice = lesson.assignment.questions.find(
    (question) => question.kind === "single-choice",
  )!;
  const numeric = lesson.assignment.questions.find(
    (question) => question.kind === "numeric",
  )!;
  await page.goto(`./#/lesson/${lesson.id}`);
  await page.getByRole("tab", { name: "Self-check" }).click();
  await page
    .locator(`input[name="${choice.id}"]`)
    .nth(choice.choices!.indexOf(String(choice.answer)))
    .check();
  await page.getByLabel(numeric.prompt, { exact: true }).fill("0.25");
  await page
    .getByRole("button", { name: "Check answers", exact: true })
    .click();
  await expect(page.locator(".score-summary strong")).toHaveText("1/2");
  await page
    .getByRole("button", { name: "Try again without answer hints" })
    .click();
  await page
    .locator(`input[name="${choice.id}"]`)
    .nth(choice.choices!.indexOf(String(choice.answer)))
    .check();
  await page.getByLabel(numeric.prompt, { exact: true }).fill("25");
  await page
    .getByRole("button", { name: "Check answers", exact: true })
    .click();
  await expect(page.locator(".score-summary strong")).toHaveText("2/2");
  expect((await guest(page)).lessons[lesson.id].manualCompletedAt).toBeNull();
});

for (const width of [320, 390]) {
  test(`${width}px career views keep controls, evidence and private links usable`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("./#/careers");
    await page.getByRole("button", { name: "Open navigation" }).click();
    const drawer = page.getByRole("dialog", { name: "Learning navigation" });
    await drawer
      .getByRole("link", { name: "Career Preparation", exact: true })
      .click();
    await expect(drawer).not.toBeVisible();
    await page
      .getByRole("heading", {
        name: "Backend and Platform Software Engineering",
        exact: true,
      })
      .getByRole("link")
      .click();
    await page
      .getByLabel("Preparation stage", { exact: true })
      .selectOption("advanced");
    await page
      .getByLabel("Find a competency", { exact: true })
      .fill("idempotency");
    await expect(
      page
        .getByRole("region", { name: "Competency evidence map" })
        .locator(".career-card"),
    ).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.goto(`./#/project/${projectId}?stage=foundation`);
    await page
      .getByRole("button", {
        name: "Jump to career exercises and readiness",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Career exercises and independent readiness",
        exact: true,
      }),
    ).toBeInViewport();
    const editor = page.locator('[data-readiness-gate="explain"]');
    const textarea = editor.getByLabel("Evidence for Explain", { exact: true });
    await expect(textarea).toBeVisible();
    expect(
      await textarea.evaluate((element) =>
        parseFloat(getComputedStyle(element).fontSize),
      ),
    ).toBeGreaterThanOrEqual(16);
    for (const button of await editor.getByRole("button").all()) {
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    for (const label of await editor.locator(".rubric-list label").all()) {
      const box = await label.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const link = page.getByRole("link", {
      name: /Private GitHub repository: commerce-workflow-engine/,
    });
    await expect(link).toHaveAttribute(
      "href",
      "https://github.com/vijay-0107/commerce-workflow-engine",
    );
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(
      page.getByText(/Requires an authorized GitHub account/),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    await page.screenshot({
      path: path.join(
        "test-results",
        `career-readiness-${width}-${testInfo.project.name}.png`,
      ),
      fullPage: true,
      animations: "disabled",
    });
  });
}

test("every packet's reference limits and four original exercises are discoverable", async ({
  page,
}) => {
  for (const packet of careerPackets) {
    await page.goto(`./#/project/${packet.projectId}`);
    const region = page.getByRole("region", {
      name: "Career exercises and independent readiness",
    });
    await expect(region.locator("[data-exercise-id]")).toHaveCount(4);
    for (const limit of packet.limitations)
      await expect(region.getByText(limit, { exact: true })).toBeVisible();
    await expect(region).toContainText(
      "0/4 independent readiness gates recorded",
    );
    if (packet.referenceStatus === "pending-parent-review")
      await expect(
        region.getByText("Reference review pending", { exact: true }),
      ).toBeVisible();
  }
  expect(Object.keys((await guest(page)).activity)).toHaveLength(0);
});
