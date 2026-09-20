import { describe, expect, it } from "vitest";
import { createProgress } from "../src/domain/progress";
import { saveWrittenSelfCheck } from "../src/state/assessment";
import { trackSchema } from "../src/content/schema";
import data from "../src/content/tracks/data.json";

const lesson = trackSchema
  .parse(data)
  .modules.flatMap((module) => module.lessons)
  .find((lesson) =>
    lesson.assignment.questions.some(
      (question) => question.kind === "short-answer",
    ),
  )!;
const question = lesson.assignment.questions.find(
  (question) => question.kind === "short-answer",
)!;
describe("manual self-check reflections", () => {
  it("keeps written responses without fabricating a score, completion or streak event", () => {
    const state = saveWrittenSelfCheck(createProgress("guest"), lesson, {
      [question.id]:
        "I checked the grain, wrote a counterexample and compared it with a golden fixture.",
    });
    expect(state.lessons[lesson.id].note).toContain("My response: I checked");
    expect(state.lessons[lesson.id].assessment).toBeNull();
    expect(state.lessons[lesson.id].manualCompletedAt).toBeNull();
    expect(state.activity).toEqual({});
  });
  it("does not duplicate a reflection or record an empty answer", () => {
    const initial = createProgress("guest");
    expect(saveWrittenSelfCheck(initial, lesson, {})).toBe(initial);
    const answers = {
      [question.id]: "A specific written response with the required reasoning.",
    };
    const once = saveWrittenSelfCheck(initial, lesson, answers);
    expect(saveWrittenSelfCheck(once, lesson, answers)).toBe(once);
  });
});
