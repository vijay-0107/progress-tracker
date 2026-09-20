import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { trackSchema } from "../src/content/schema";
import {
  assessLesson,
  completeLesson,
  createProgress,
  gradeQuestion,
  updateLesson,
} from "../src/domain/progress";
import { recordsFromState } from "../src/state/records";
import { validateSyncRecord } from "../src/services/sync";

const directory = path.resolve("src", "content", "tracks");
const tracks = fs
  .readdirSync(directory)
  .filter((file) => file.endsWith(".json"))
  .map((file) => ({
    file,
    data: JSON.parse(fs.readFileSync(path.join(directory, file), "utf8")),
  }));
const time = "2026-09-20T02:00:00.000Z";

describe.each(tracks)("$file persistence contract", ({ data }) => {
  it("can persist real assignment rubric text and generated activity IDs using the cloud schema", () => {
    const track = trackSchema.parse(data);
    for (const lesson of track.modules.flatMap((module) => module.lessons)) {
      const state = completeLesson(
        updateLesson(
          createProgress("uid:test-learner", time),
          lesson.id,
          {
            note: "My private notes explain the edge cases I checked.",
            evidence:
              "I built the original fixture, recorded the acceptance checks and retained an explicit failure case and explanation.",
            rubricChecked: lesson.assignment.acceptanceCriteria,
          },
          time,
        ),
        lesson,
        time,
      );
      for (const record of recordsFromState(state))
        expect(
          () => validateSyncRecord(record),
          `${lesson.id}: ${record.collection}`,
        ).not.toThrow();
    }
  });
  it("can persist original assessment scores and mistake entries without a manual-completion claim", () => {
    const track = trackSchema.parse(data);
    for (const lesson of track.modules.flatMap((module) => module.lessons)) {
      const objective = lesson.assignment.questions.filter(
        (question) => question.kind !== "short-answer",
      );
      if (!objective.length) continue;
      const answers = Object.fromEntries(
        objective.map((question) => [
          question.id,
          question.kind === "single-choice"
            ? question.choices!.find(
                (choice) => gradeQuestion(question, choice) === false,
              ) || question.choices![0]
            : question.kind === "multiple-choice"
              ? JSON.stringify(question.answer)
              : String(question.answer),
        ]),
      );
      const state = assessLesson(
        createProgress("uid:test-learner", time),
        lesson,
        answers,
        time,
      );
      expect(state.lessons[lesson.id].manualCompletedAt).toBeNull();
      for (const record of recordsFromState(state))
        expect(
          () => validateSyncRecord(record),
          `${lesson.id}: ${record.collection}`,
        ).not.toThrow();
    }
  });
});
