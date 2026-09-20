import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import type { Lesson, Track } from "../../src/domain/types";

const track = (id: string) =>
  JSON.parse(
    fs.readFileSync(
      path.resolve("src", "content", "tracks", `${id}.json`),
      "utf8",
    ),
  ) as Track;
const lessons = (id: string): Lesson[] =>
  track(id).modules.flatMap((module) => module.lessons);

for (const id of ["gate", "cat"]) {
  test(`${id.toUpperCase()} grades actual labelled radio values correctly and incorrectly after reload`, async ({
    page,
  }) => {
    const lesson = lessons(id).find(
      (lesson) =>
        lesson.assignment.questions.length === 1 &&
        lesson.assignment.questions[0].kind === "single-choice",
    )!;
    const question = lesson.assignment.questions[0];
    const correct = question.choices!.findIndex((choice) =>
      choice.startsWith(`${question.answer}. `),
    );
    expect(correct).toBeGreaterThanOrEqual(0);
    await page.goto(`./#/lesson/${lesson.id}`);
    await page.getByRole("tab", { name: "Self-check" }).click();
    const radios = page.getByRole("radio");
    await expect(radios.nth(correct)).toHaveValue(question.choices![correct]);
    await radios.nth(correct).check();
    await page
      .getByRole("button", { name: "Check answers", exact: true })
      .click();
    await expect(page.locator(".score-summary > strong")).toHaveText("1/1");
    await expect(
      page.getByText(/Self-reported assignment completion recorded/),
    ).not.toBeVisible();
    await page.reload();
    await page.getByRole("tab", { name: "Self-check" }).click();
    await expect(page.locator(".score-summary > strong")).toHaveText("1/1");
    const wrong = correct === 0 ? 1 : 0;
    await page.getByRole("radio").nth(wrong).check();
    await page
      .getByRole("button", { name: "Check answers", exact: true })
      .click();
    await expect(page.locator(".score-summary > strong")).toHaveText("0/1");
    await page.goto("./#/review");
    await page.getByRole("button", { name: /Error notebook/ }).click();
    await expect(
      page.getByRole("heading", { name: question.prompt, exact: true }),
    ).toBeVisible();
  });
}

test("GATE checkbox values are exact-set scored with no partial or extra-option credit", async ({
  page,
}) => {
  const lesson = lessons("gate").find(
    (lesson) =>
      lesson.assignment.questions.length === 1 &&
      lesson.assignment.questions[0].kind === "multiple-choice",
  )!;
  const question = lesson.assignment.questions[0];
  const keys = question.answer as string[];
  const indices = question.choices!.flatMap((choice, index) =>
    keys.some((key) => choice.startsWith(`${key}. `)) ? [index] : [],
  );
  expect(indices.length).toBe(keys.length);
  await page.goto(`./#/lesson/${lesson.id}`);
  await page.getByRole("tab", { name: "Self-check" }).click();
  for (const index of indices) {
    await expect(page.getByRole("checkbox").nth(index)).toHaveValue(
      question.choices![index],
    );
    await page.getByRole("checkbox").nth(index).check();
  }
  await page
    .getByRole("button", { name: "Check answers", exact: true })
    .click();
  await expect(page.locator(".score-summary > strong")).toHaveText("1/1");
  await page
    .getByRole("button", { name: "Try again without answer hints" })
    .click();
  await page.getByRole("checkbox").nth(indices[0]).check();
  await page
    .getByRole("button", { name: "Check answers", exact: true })
    .click();
  await expect(page.locator(".score-summary > strong")).toHaveText("0/1");
  await page
    .getByRole("button", { name: "Try again without answer hints" })
    .click();
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.check();
  await page
    .getByRole("button", { name: "Check answers", exact: true })
    .click();
  await expect(page.locator(".score-summary > strong")).toHaveText("0/1");
});

test("GATE numerical checking applies the published item tolerance and never turns blanks into zero", async ({
  page,
}) => {
  const lesson = lessons("gate").find(
    (lesson) =>
      lesson.assignment.questions.length === 1 &&
      (lesson.assignment.questions[0].numericTolerance || 0) > 0,
  )!;
  const question = lesson.assignment.questions[0];
  await page.goto(`./#/lesson/${lesson.id}`);
  await page.getByRole("tab", { name: "Self-check" }).click();
  await page
    .getByRole("button", { name: "Check answers", exact: true })
    .click();
  await expect(page.locator(".score-summary")).toHaveCount(0);
  await page
    .locator(".question-field input")
    .fill(String(Number(question.answer) + question.numericTolerance! / 2));
  await page
    .getByRole("button", { name: "Check answers", exact: true })
    .click();
  await expect(page.locator(".score-summary > strong")).toHaveText("1/1");
});

test("written self-checks persist as ungraded notes, never as a checked score or mastery", async ({
  page,
}) => {
  const lesson = lessons("data").find(
    (lesson) =>
      lesson.assignment.questions.length === 1 &&
      lesson.assignment.questions[0].kind === "short-answer",
  )!;
  await page.goto(`./#/lesson/${lesson.id}`);
  await page.getByRole("tab", { name: "Self-check" }).click();
  const reflection =
    "I checked the business grain, constructed a counterexample and compared row counts with a golden fixture.";
  await page.locator(".question-field textarea").fill(reflection);
  await page.getByRole("button", { name: "Save reflection & compare" }).click();
  await expect(page.locator(".score-summary")).toHaveCount(0);
  await page.getByRole("tab", { name: "Your notes" }).click();
  await expect(page.getByLabel("Lesson notes")).toHaveValue(
    new RegExp(reflection.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  await page.reload();
  await page.getByRole("tab", { name: "Your notes" }).click();
  await expect(page.getByLabel("Lesson notes")).toHaveValue(
    /manual comparison, not automatically graded/,
  );
  await page.goto("./#/dashboard");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Learning streak" })
      .locator("strong"),
  ).toHaveText("0 days");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Lessons completed" })
      .locator("strong"),
  ).toHaveText("0");
});
