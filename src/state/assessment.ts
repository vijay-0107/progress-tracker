import type { Lesson, ProgressState } from "../domain/types";
import { emptyLesson, updateLesson } from "../domain/progress";

export function saveWrittenSelfCheck(
  state: ProgressState,
  lesson: Lesson,
  answers: Record<string, string>,
  now?: string,
): ProgressState {
  const written = lesson.assignment.questions
    .filter(
      (question) =>
        question.kind === "short-answer" && answers[question.id]?.trim(),
    )
    .map(
      (question) =>
        `${question.prompt}\nMy response: ${answers[question.id].trim()}`,
    );
  if (!written.length) return state;
  const previous = state.lessons[lesson.id] || emptyLesson(lesson.id, now);
  const block = `Written self-check - manual comparison, not automatically graded\n\n${written.join("\n\n")}`;
  if (previous.note.includes(block)) return state;
  return updateLesson(
    state,
    lesson.id,
    { note: `${previous.note}${previous.note ? "\n\n" : ""}${block}` },
    now,
  );
}
