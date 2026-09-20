import { describe, expect, it } from "vitest";
import { gradeQuestion } from "../src/domain/progress";
import { choiceIndex, choiceSelections } from "../src/domain/answers";
import { trackSchema } from "../src/content/schema";
import gateData from "../src/content/tracks/gate.json";
import catData from "../src/content/tracks/cat.json";
import type { Question } from "../src/domain/types";

const bank = [gateData, catData].flatMap((raw) =>
  trackSchema
    .parse(raw)
    .modules.flatMap((module) =>
      module.lessons.flatMap((lesson) => lesson.assignment.questions),
    ),
);

describe("real rendered choice values", () => {
  it.each(bank.filter((question) => question.kind === "single-choice"))(
    "$id grades the literal radio value, not only its bare key",
    (question) => {
      const index = choiceIndex(question, String(question.answer));
      expect(index).not.toBeNull();
      const choices = question.choices!;
      expect(gradeQuestion(question, choices[index!])).toBe(true);
      choices.forEach((choice, position) =>
        expect(gradeQuestion(question, choice)).toBe(position === index),
      );
      expect(gradeQuestion(question, "Z. not an available option")).toBe(false);
    },
  );
  it.each(bank.filter((question) => question.kind === "multiple-choice"))(
    "$id requires exactly the selected checkbox set",
    (question) => {
      const correct = choiceSelections(
        question,
        JSON.stringify(question.answer),
      )!;
      const selected = correct.map((index) => question.choices![index]);
      expect(gradeQuestion(question, selected.join("\n"))).toBe(true);
      expect(
        gradeQuestion(question, selected.slice().reverse().join("\n")),
      ).toBe(true);
      expect(gradeQuestion(question, selected.slice(1).join("\n"))).toBe(false);
      expect(
        gradeQuestion(question, [...selected, selected[0]].join("\n")),
      ).toBe(false);
      const extra = question.choices!.find(
        (_, index) => !correct.includes(index),
      );
      if (extra)
        expect(gradeQuestion(question, [...selected, extra].join("\n"))).toBe(
          false,
        );
    },
  );
  it("does not split a single checkbox's comma-containing label", () => {
    const question: Question = {
      id: "comma",
      kind: "multiple-choice",
      prompt: "Select the bounded choice.",
      choices: [
        "A. A finite deadline, a retry cap and a terminal error",
        "B. Unlimited retries",
      ],
      answer: ["A"],
      explanation: "Only A is bounded.",
    };
    expect(gradeQuestion(question, question.choices![0])).toBe(true);
  });
  it("keeps manual responses ungraded and honors exact or explicit numeric tolerance", () => {
    const numeric = bank.find(
      (question) => question.numericTolerance && question.numericTolerance > 0,
    )!;
    const expected = Number(numeric.answer);
    expect(
      gradeQuestion(numeric, String(expected + numeric.numericTolerance! / 2)),
    ).toBe(true);
    expect(
      gradeQuestion(numeric, String(expected + numeric.numericTolerance! * 2)),
    ).toBe(false);
    expect(
      gradeQuestion(
        { ...numeric, numericTolerance: 0 },
        String(expected + 0.00000001),
      ),
    ).toBe(false);
    for (const value of ["", " ", "NaN", "Infinity", "1/0", "1+1"])
      expect(gradeQuestion(numeric, value)).toBe(false);
    expect(
      gradeQuestion(
        {
          ...numeric,
          kind: "short-answer",
          answer: "A full explanatory sentence.",
        },
        "A full explanatory sentence.",
      ),
    ).toBeNull();
  });
});
