import type { Question } from "./types";

const labelledChoice = /^([A-Z])[.):]\s+(.+)$/s;

export function choiceIndex(question: Question, value: string): number | null {
  const choices = question.choices || [];
  const text = value.trim();
  if (!text || !choices.length) return null;
  const exact = choices
    .map((choice, index) => ({ choice: choice.trim(), index }))
    .filter((item) => item.choice === text);
  if (exact.length) return exact.length === 1 ? exact[0].index : null;
  const labelled = choices.flatMap((choice, index) => {
    const match = labelledChoice.exec(choice.trim());
    return match ? [{ key: match[1], text: match[2].trim(), index }] : [];
  });
  const matches = labelled.filter(
    (choice) => choice.key === text || choice.text === text,
  );
  if (matches.length) return matches.length === 1 ? matches[0].index : null;
  const keys = Array.isArray(question.answer)
    ? question.answer
    : [question.answer];
  const positionalKeys =
    !labelled.length &&
    keys.every(
      (key) =>
        typeof key === "string" &&
        /^[A-Z]$/.test(key) &&
        !choices.includes(key),
    );
  if (positionalKeys && /^[A-Z]$/.test(text)) {
    const index = text.charCodeAt(0) - 65;
    return index < choices.length ? index : null;
  }
  return null;
}

export function choiceSelections(
  question: Question,
  answer: string,
): number[] | null {
  const text = answer.trim();
  let values: unknown;
  if (text.startsWith("[")) {
    try {
      values = JSON.parse(text);
    } catch {
      return null;
    }
  } else if (text.includes("\n")) {
    values = text.split(/\r?\n/);
  } else if (question.choices?.some((choice) => choice.trim() === text)) {
    values = [text];
  } else {
    values = text.split(",");
  }
  if (
    !Array.isArray(values) ||
    !values.length ||
    values.length > 200 ||
    values.some(
      (value) => typeof value !== "string" && typeof value !== "number",
    )
  )
    return null;
  const indices = values.map((value) => choiceIndex(question, String(value)));
  if (indices.some((index) => index === null)) return null;
  const valid = indices.filter((index): index is number => index !== null);
  return new Set(valid).size === valid.length ? valid : null;
}
