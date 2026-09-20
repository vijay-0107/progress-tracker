import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { trackSchema } from "../src/content/schema";
import { gradeQuestion } from "../src/domain/progress";

const directory = path.resolve("src", "content", "tracks");
const files = fs
  .readdirSync(directory)
  .filter((name) => name.endsWith(".json"));

describe.each(files)("research handoff %s", (file) => {
  const raw = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
  it("conforms to the typed lesson/resource/source contract", () => {
    expect(() => trackSchema.parse(raw)).not.toThrow();
  });
  it("has answer keys that the local checker can faithfully understand", () => {
    const track = trackSchema.parse(raw);
    for (const question of track.modules.flatMap((module) =>
      module.lessons.flatMap((lesson) => lesson.assignment.questions),
    )) {
      if (question.kind === "short-answer") {
        expect(gradeQuestion(question, String(question.answer))).toBeNull();
      } else if (question.kind === "single-choice") {
        expect(
          question.choices?.filter((choice) => gradeQuestion(question, choice)),
          question.id,
        ).toHaveLength(1);
      } else if (question.kind === "numeric") {
        expect(
          gradeQuestion(question, String(question.answer)),
          question.id,
        ).toBe(true);
        expect(gradeQuestion(question, "")).toBe(false);
        if (question.numericTolerance && typeof question.answer === "number") {
          expect(
            gradeQuestion(
              question,
              String(question.answer + question.numericTolerance / 2),
            ),
            `${question.id} accepts its documented tolerance`,
          ).toBe(true);
          expect(
            gradeQuestion(
              question,
              String(question.answer + question.numericTolerance * 2),
            ),
            `${question.id} rejects values beyond its tolerance`,
          ).toBe(false);
        }
      } else {
        expect(
          gradeQuestion(question, JSON.stringify(question.answer)),
          question.id,
        ).toBe(true);
      }
    }
  });
});
