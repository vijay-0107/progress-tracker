import type {
  ActivityEvent,
  EntityCollection,
  LegacyArchive,
  Lesson,
  LessonProgress,
  OwnerId,
  ProgressState,
  Question,
  SyncEntity,
} from "./types";
import { choiceIndex, choiceSelections } from "./answers";
import {
  MAX_COLLECTION_ENTRIES,
  MAX_JSON_LENGTH,
  ProgressValidationError,
  activitySchema,
  archiveSchema,
  assertSafeJson,
  errorEntrySchema,
  idSchema,
  isDateKey,
  isMeaningfulEvidence,
  isSafeKey,
  legacyPayloadSchema,
  legacyProfileSchema,
  legacyReviewSchema,
  lessonPatchSchema,
  lessonProgressSchema,
  ownerIdSchema,
  parseJson,
  sameValue,
  timestamp,
  timezoneSchema,
  validateProgressState,
} from "./validation";

export {
  MIN_EVIDENCE_LENGTH,
  ProgressValidationError,
  isMeaningfulEvidence,
  validateProgressState,
} from "./validation";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export type LessonPatch = Partial<
  Pick<
    LessonProgress,
    "evidence" | "rubricChecked" | "note" | "bookmarked" | "readingPosition"
  >
> & { manualCompletedAt?: null };
export type ReviewRating = "again" | "hard" | "good";

const has = (record: object, key: string) =>
  Object.prototype.hasOwnProperty.call(record, key);
const latest = (left: string, right: string) =>
  Date.parse(left) > Date.parse(right) ? left : right;
const entityPart = (id: string) => encodeURIComponent(idSchema.parse(id));

function ensureCapacity(records: Record<string, unknown>, id: string): void {
  if (
    !has(records, id) &&
    Object.keys(records).length >= MAX_COLLECTION_ENTRIES
  ) {
    throw new ProgressValidationError(
      "The saved record limit has been reached.",
    );
  }
}

export function createProgress(ownerId: OwnerId, now?: string): ProgressState {
  ownerIdSchema.parse(ownerId);
  const at = timestamp(now);
  return {
    schemaVersion: 2,
    ownerId,
    settings: {
      id: "settings",
      updatedAt: at,
      displayName: "",
      timezone: DEFAULT_TIMEZONE,
      theme: "system",
      dailyMinutes: 60,
      primaryTrack: "foundation",
    },
    lessons: {},
    projects: {},
    goals: {},
    activity: {},
    errors: {},
    legacy: {},
    updatedAt: at,
  };
}

export function emptyLesson(id: string, now?: string): LessonProgress {
  idSchema.parse(id);
  return {
    id,
    updatedAt: timestamp(now),
    manualCompletedAt: null,
    evidence: "",
    rubricChecked: [],
    note: "",
    bookmarked: false,
    readingPosition: "",
    review: null,
    assessment: null,
  };
}

export function updateLesson(
  state: ProgressState,
  id: string,
  patch: LessonPatch,
  now?: string,
): ProgressState {
  idSchema.parse(id);
  assertSafeJson(patch);
  const changes = lessonPatchSchema.parse(patch);
  const at = timestamp(now);
  const previous = has(state.lessons, id)
    ? state.lessons[id]
    : emptyLesson(id, at);
  if (
    Object.entries(changes).every(([key, value]) =>
      sameValue(previous[key as keyof LessonProgress], value),
    )
  ) {
    return state;
  }
  if (Date.parse(at) < Date.parse(previous.updatedAt)) {
    throw new ProgressValidationError(
      "A lesson update cannot precede its saved version.",
    );
  }
  ensureCapacity(state.lessons, id);
  const lesson = lessonProgressSchema.parse({
    ...previous,
    ...changes,
    review: changes.manualCompletedAt === null ? null : previous.review,
    updatedAt: at,
  });
  return {
    ...state,
    lessons: { ...state.lessons, [id]: lesson },
    updatedAt: latest(state.updatedAt, at),
  };
}

export function dayKey(instant: string | Date, timezone: string): string {
  timezoneSchema.parse(timezone);
  const date =
    instant instanceof Date
      ? new Date(instant.getTime())
      : new Date(timestamp(instant));
  if (!Number.isFinite(date.getTime()))
    throw new ProgressValidationError("Invalid activity date.");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (name: string) =>
    parts.find((value) => value.type === name)?.value ?? "";
  const key = `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`;
  if (!isDateKey(key))
    throw new ProgressValidationError(
      "Calendar date is outside the supported range.",
    );
  return key;
}

export function addDays(dateKey: string, days: number): string {
  if (!isDateKey(dateKey) || !Number.isSafeInteger(days)) {
    throw new ProgressValidationError(
      "Use a valid calendar date and a whole number of days.",
    );
  }
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  if (!Number.isFinite(date.getTime()))
    throw new ProgressValidationError(
      "Calendar date is outside the supported range.",
    );
  const result = date.toISOString().slice(0, 10);
  if (!isDateKey(result))
    throw new ProgressValidationError(
      "Calendar date is outside the supported range.",
    );
  return result;
}

function localClock(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const part = (name: string) =>
    parts.find((value) => value.type === name)?.value ?? "";
  return Date.parse(
    `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}.${String(instant.getUTCMilliseconds()).padStart(3, "0")}Z`,
  );
}

function reviewDueAt(at: string, days: number, timezone: string): string {
  const instant = new Date(at);
  const targetDay = addDays(dayKey(instant, timezone), days);
  const clock = localClock(instant, timezone);
  const wanted = Date.parse(
    `${targetDay}T${new Date(clock).toISOString().slice(11)}`,
  );
  let candidate = wanted - (clock - instant.getTime());
  const visited: number[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const delta = wanted - localClock(new Date(candidate), timezone);
    if (delta === 0) return timestamp(new Date(candidate).toISOString());
    visited.push(candidate);
    candidate += delta;
    // A missing DST wall-clock time moves forward across the gap, never backward.
    if (visited.includes(candidate))
      return timestamp(new Date(Math.max(candidate, ...visited)).toISOString());
  }
  throw new ProgressValidationError("Could not schedule this calendar review.");
}

export function recordActivity(
  state: ProgressState,
  event: ActivityEvent,
  now?: string,
): ProgressState {
  assertSafeJson(event);
  const valid = activitySchema.parse(event);
  const reference = Date.parse(timestamp(now));
  if (
    Date.parse(valid.at) > reference ||
    Date.parse(valid.updatedAt) > reference
  ) {
    throw new ProgressValidationError("Future activity is not allowed.");
  }
  if (has(state.activity, valid.id)) {
    if (sameValue(state.activity[valid.id], valid)) return state;
    throw new ProgressValidationError(
      `Activity ID "${valid.id}" already has different data.`,
    );
  }
  ensureCapacity(state.activity, valid.id);
  return {
    ...state,
    activity: { ...state.activity, [valid.id]: valid },
    updatedAt: latest(state.updatedAt, valid.updatedAt),
  };
}

/** Counts per saved local calendar date; changing settings never re-buckets history. */
export function getActivityDays(
  state: ProgressState,
  now?: string,
): Record<string, number> {
  const reference = Date.parse(timestamp(now));
  const result: Record<string, number> = {};
  const seen = new Set<string>();
  for (const candidate of Object.values(state.activity)) {
    const parsed = activitySchema.safeParse(candidate);
    if (!parsed.success) continue;
    const event = parsed.data;
    if (
      seen.has(event.id) ||
      Date.parse(event.at) > reference ||
      Date.parse(event.updatedAt) > reference
    )
      continue;
    seen.add(event.id);
    const key = dayKey(event.at, event.timezone);
    result[key] = (result[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(result).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function getStreak(state: ProgressState, now?: string): number {
  const at = timestamp(now);
  const days = getActivityDays(state, at);
  let cursor = dayKey(at, state.settings.timezone);
  if (!has(days, cursor)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (has(days, cursor)) {
    streak += 1;
    if (cursor === "0000-01-01") break;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function completeLesson(
  state: ProgressState,
  lesson: Lesson,
  now?: string,
): ProgressState {
  idSchema.parse(lesson.id);
  const at = timestamp(now);
  const current = has(state.lessons, lesson.id)
    ? state.lessons[lesson.id]
    : emptyLesson(lesson.id, at);
  if (!isMeaningfulEvidence(current.evidence)) {
    throw new ProgressValidationError(
      "Add meaningful assignment evidence (at least 20 descriptive characters) before completing.",
    );
  }
  const criteria = lesson.assignment.acceptanceCriteria;
  if (
    !Array.isArray(criteria) ||
    criteria.length > 200 ||
    criteria.some(
      (criterion) =>
        typeof criterion !== "string" ||
        !criterion.trim() ||
        !current.rubricChecked.includes(criterion),
    )
  ) {
    throw new ProgressValidationError(
      "Check every assignment acceptance criterion before completing.",
    );
  }
  if (current.manualCompletedAt !== null) return state;
  if (Date.parse(at) < Date.parse(current.updatedAt)) {
    throw new ProgressValidationError(
      "Completion cannot precede the saved lesson.",
    );
  }
  ensureCapacity(state.lessons, lesson.id);
  const completed = lessonProgressSchema.parse({
    ...current,
    manualCompletedAt: at,
    updatedAt: at,
    review: {
      dueAt: reviewDueAt(at, 1, state.settings.timezone),
      intervalDays: 1,
      streak: 0,
      lastReviewedAt: null,
    },
  });
  const next = {
    ...state,
    lessons: { ...state.lessons, [lesson.id]: completed },
    updatedAt: latest(state.updatedAt, at),
  };
  const eventId = `assignment:${entityPart(lesson.id)}`;
  if (has(state.activity, eventId)) {
    const original = state.activity[eventId];
    if (original.kind !== "assignment" || original.entityId !== lesson.id) {
      throw new ProgressValidationError(
        "The completion activity ID is already in use.",
      );
    }
    // Undo/recomplete must keep the original day, not manufacture another learning day.
    return next;
  }
  return recordActivity(
    next,
    {
      id: eventId,
      updatedAt: at,
      at,
      timezone: state.settings.timezone,
      kind: "assignment",
      entityId: lesson.id,
      minutes: 0,
      detail: current.evidence,
    },
    at,
  );
}

export function reviewLesson(
  state: ProgressState,
  id: string,
  rating: ReviewRating,
  now?: string,
): ProgressState {
  idSchema.parse(id);
  if (!["again", "hard", "good"].includes(rating))
    throw new ProgressValidationError("Unknown review rating.");
  const current = has(state.lessons, id) ? state.lessons[id] : undefined;
  if (
    !current?.manualCompletedAt ||
    !current.review ||
    !isMeaningfulEvidence(current.evidence)
  ) {
    throw new ProgressValidationError(
      "Complete the lesson with evidence before recording a recall review.",
    );
  }
  const at = timestamp(now);
  const event: ActivityEvent = {
    id: `review:${entityPart(id)}:${at}`,
    updatedAt: at,
    at,
    timezone: state.settings.timezone,
    kind: "review",
    entityId: id,
    minutes: 0,
    detail: `Recall review for ${id}; self-assessed ${rating}. Assignment evidence: ${current.evidence.slice(0, 18_000)}`,
  };
  const withActivity = recordActivity(state, event, at);
  if (withActivity === state) return state;
  if (Date.parse(at) < Date.parse(current.updatedAt)) {
    throw new ProgressValidationError(
      "Review cannot precede the saved lesson.",
    );
  }
  const intervalDays =
    rating === "again"
      ? 1
      : Math.min(
          3_650,
          Math.ceil(
            current.review.intervalDays * (rating === "hard" ? 1.5 : 2.5),
          ),
        );
  const next = lessonProgressSchema.parse({
    ...current,
    updatedAt: at,
    review: {
      dueAt: reviewDueAt(at, intervalDays, state.settings.timezone),
      intervalDays,
      streak: rating === "again" ? 0 : current.review.streak + 1,
      lastReviewedAt: at,
    },
  });
  return { ...withActivity, lessons: { ...state.lessons, [id]: next } };
}

export function gradeQuestion(
  question: Question,
  answer: string,
): boolean | null {
  if (typeof answer !== "string" || answer.length > 10_000)
    throw new ProgressValidationError("Invalid assessment answer.");
  if (question.kind === "short-answer") return null;
  const text = answer.trim();
  if (!text) return false;
  if (question.kind === "single-choice") {
    if (
      typeof question.answer !== "string" &&
      typeof question.answer !== "number"
    ) {
      throw new ProgressValidationError(
        "Single-choice questions need one answer.",
      );
    }
    const expected = choiceIndex(question, String(question.answer));
    if (expected === null)
      throw new ProgressValidationError(
        "The single-choice answer key does not identify one available option.",
      );
    return choiceIndex(question, text) === expected;
  }
  if (question.kind === "multiple-choice") {
    if (!Array.isArray(question.answer))
      throw new ProgressValidationError(
        "Multiple-choice questions need an answer list.",
      );
    const expected = choiceSelections(
      question,
      JSON.stringify(question.answer),
    );
    if (expected === null)
      throw new ProgressValidationError(
        "The multiple-choice answer key must identify a unique set of available options.",
      );
    const selected = choiceSelections(question, text);
    return (
      selected !== null &&
      selected.length === expected.length &&
      expected.every((value) => selected.includes(value))
    );
  }
  if (question.kind === "numeric") {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu.test(text))
      return false;
    const number = Number(text);
    const expected =
      typeof question.answer === "number"
        ? question.answer
        : typeof question.answer === "string" &&
            /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu.test(
              question.answer.trim(),
            )
          ? Number(question.answer)
          : NaN;
    if (!Number.isFinite(expected))
      throw new ProgressValidationError(
        "Numeric questions need a finite answer.",
      );
    const tolerance =
      question.numericTolerance ?? 1e-9 * Math.max(1, Math.abs(expected));
    if (!Number.isFinite(tolerance) || tolerance < 0)
      throw new ProgressValidationError(
        "Numeric answer tolerance must be a nonnegative finite number.",
      );
    const rounding =
      tolerance === 0
        ? 0
        : Number.EPSILON *
          Math.max(1, Math.abs(expected), Math.abs(number)) *
          4;
    return (
      Number.isFinite(number) &&
      Math.abs(number - expected) <= tolerance + rounding
    );
  }
  throw new ProgressValidationError("Unknown question kind.");
}

export function assessLesson(
  state: ProgressState,
  lesson: Lesson,
  answers: Record<string, string>,
  now?: string,
): ProgressState {
  idSchema.parse(lesson.id);
  assertSafeJson(answers);
  if (!answers || Array.isArray(answers) || typeof answers !== "object") {
    throw new ProgressValidationError("Assessment answers must be an object.");
  }
  const questions = lesson.assignment.questions;
  if (
    !Array.isArray(questions) ||
    questions.length > 200 ||
    new Set(questions.map((question) => question.id)).size !== questions.length
  ) {
    throw new ProgressValidationError(
      "Invalid assessment question IDs or count.",
    );
  }
  const knownIds = new Set(
    questions.map((question) => idSchema.parse(question.id)),
  );
  for (const [id, answer] of Object.entries(answers)) {
    if (
      !knownIds.has(id) ||
      typeof answer !== "string" ||
      answer.length > 10_000
    ) {
      throw new ProgressValidationError(
        "Unknown question or invalid assessment answer.",
      );
    }
  }
  const checkable = questions.filter(
    (question) => question.kind !== "short-answer",
  );
  if (
    !checkable.length ||
    !checkable.some((question) => (answers[question.id] ?? "").trim())
  ) {
    throw new ProgressValidationError(
      "Submit at least one checkable answer; short answers require manual comparison.",
    );
  }
  const at = timestamp(now);
  const current = has(state.lessons, lesson.id)
    ? state.lessons[lesson.id]
    : emptyLesson(lesson.id, at);
  const results = checkable.map((question) => {
    const answer = has(answers, question.id) ? answers[question.id].trim() : "";
    return {
      question,
      answer,
      correct: gradeQuestion(question, answer) === true,
    };
  });
  const assessment: NonNullable<LessonProgress["assessment"]> = {
    attemptedAt: at,
    correct: results.filter((result) => result.correct).length,
    total: results.length,
    answers: Object.fromEntries(
      results.map((result) => [result.question.id, result.answer]),
    ),
  };
  const eventId = `assessment:${entityPart(lesson.id)}:${at}`;
  if (has(state.activity, eventId)) {
    if (sameValue(current.assessment, assessment)) return state;
    throw new ProgressValidationError(
      "This assessment attempt already has different saved answers.",
    );
  }
  if (Date.parse(at) < Date.parse(current.updatedAt)) {
    throw new ProgressValidationError(
      "Assessment cannot precede the saved lesson.",
    );
  }
  ensureCapacity(state.lessons, lesson.id);
  const nextLesson = lessonProgressSchema.parse({
    ...current,
    updatedAt: at,
    assessment,
  });
  const errors = { ...state.errors };
  for (const result of results) {
    const errorId = `error:${entityPart(lesson.id)}:${entityPart(result.question.id)}`;
    const previous = has(errors, errorId) ? errors[errorId] : undefined;
    if (!result.correct) {
      ensureCapacity(errors, errorId);
      errors[errorId] = errorEntrySchema.parse({
        id: errorId,
        updatedAt: at,
        lessonId: lesson.id,
        questionId: result.question.id,
        prompt: result.question.prompt,
        answer: result.answer,
        explanation: result.question.explanation,
        reflection: previous?.reflection ?? "",
        resolvedAt: null,
      });
    } else if (previous && !previous.resolvedAt) {
      errors[errorId] = { ...previous, updatedAt: at, resolvedAt: at };
    }
  }
  return recordActivity(
    {
      ...state,
      lessons: { ...state.lessons, [lesson.id]: nextLesson },
      errors,
      updatedAt: latest(state.updatedAt, at),
    },
    {
      id: eventId,
      updatedAt: at,
      at,
      timezone: state.settings.timezone,
      kind: "assessment",
      entityId: lesson.id,
      minutes: 0,
      detail: `Submitted ${results.filter((result) => result.answer).length} checkable answers for ${lesson.id}; ${assessment.correct} of ${assessment.total} correct. Short answers are not auto-graded.`,
    },
    at,
  );
}

export function exportProgress(state: ProgressState): string {
  const text = JSON.stringify(validateProgressState(state), null, 2);
  if (text.length > MAX_JSON_LENGTH)
    throw new ProgressValidationError(
      "Progress exceeds the export size limit.",
    );
  return text;
}

export function parseImport(text: string, ownerId: OwnerId): ProgressState {
  ownerIdSchema.parse(ownerId);
  const imported = validateProgressState(parseJson(text));
  if (imported.ownerId !== ownerId) {
    throw new ProgressValidationError(
      "Import owner mismatch. Use an explicitly confirmed cross-owner merge instead.",
    );
  }
  return imported;
}

export interface ImportConflict {
  collection: EntityCollection | "settings" | "legacy";
  id: string;
  existing: SyncEntity | LegacyArchive;
  incoming: SyncEntity | LegacyArchive;
}
export interface ImportMergeResult {
  state: ProgressState;
  conflicts: ImportConflict[];
}
export interface ImportMergeOptions {
  allowCrossOwner?: boolean;
}

/** Keeps destination settings and existing conflicting records; reports every conflict. */
export function mergeImport(
  destination: ProgressState,
  text: string,
  options: ImportMergeOptions = {},
): ImportMergeResult {
  const existing = validateProgressState(destination);
  const incoming = validateProgressState(parseJson(text));
  if (
    existing.ownerId !== incoming.ownerId &&
    options.allowCrossOwner !== true
  ) {
    throw new ProgressValidationError(
      "Import owner mismatch. Explicit cross-owner confirmation is required.",
    );
  }
  const state = {
    ...existing,
    updatedAt: latest(existing.updatedAt, incoming.updatedAt),
  };
  const conflicts: ImportConflict[] = [];
  if (!sameValue(existing.settings, incoming.settings)) {
    conflicts.push({
      collection: "settings",
      id: "settings",
      existing: existing.settings,
      incoming: incoming.settings,
    });
  }
  const collections = [
    "lessons",
    "projects",
    "goals",
    "activity",
    "errors",
    "legacy",
  ] as const;
  for (const collection of collections) {
    const merged = { ...existing[collection] } as Record<
      string,
      SyncEntity | LegacyArchive
    >;
    for (const [id, value] of Object.entries(incoming[collection])) {
      if (has(merged, id)) {
        if (!sameValue(merged[id], value))
          conflicts.push({
            collection,
            id,
            existing: merged[id],
            incoming: value,
          });
      } else {
        ensureCapacity(merged, id);
        merged[id] = value;
      }
    }
    Object.assign(state, { [collection]: merged });
  }
  return { state: validateProgressState(state), conflicts };
}

const sensitiveLegacyKeys =
  /^(?:pin|pinHash|password|passwordHash|accessToken|refreshToken|idToken|token|credentials?|secret|privateKey|apiKey)$/iu;

export function sanitizeLegacyPayload(value: unknown): Record<string, unknown> {
  const ancestors = new Set<object>();
  let nodes = 0;
  let characters = 0;
  function clean(item: unknown, depth: number): unknown {
    if (++nodes > 200_000 || depth > 24)
      throw new ProgressValidationError(
        "Legacy archive is too large or deeply nested.",
      );
    if (item === null || typeof item === "boolean") return item;
    if (typeof item === "string") {
      if (item.length > 100_000)
        throw new ProgressValidationError("Legacy text is too long.");
      characters += item.length;
      if (characters > MAX_JSON_LENGTH)
        throw new ProgressValidationError(
          "Legacy archive exceeds the size limit.",
        );
      return item;
    }
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (typeof item !== "object")
      throw new ProgressValidationError(
        "Legacy archive must contain only JSON data.",
      );
    if (ancestors.has(item))
      throw new ProgressValidationError(
        "Circular legacy data is not supported.",
      );
    const prototype = Object.getPrototypeOf(item);
    if (
      Array.isArray(item)
        ? prototype !== Array.prototype
        : prototype !== Object.prototype && prototype !== null
    ) {
      throw new ProgressValidationError("Unsafe legacy object prototype.");
    }
    if (
      (Array.isArray(item) ? item.length : Object.keys(item).length) >
      MAX_COLLECTION_ENTRIES
    ) {
      throw new ProgressValidationError("Too many legacy records.");
    }
    ancestors.add(item);
    let result: unknown;
    if (Array.isArray(item)) {
      const entries: unknown[] = [];
      for (let index = 0; index < item.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(item, String(index));
        if (descriptor && !("value" in descriptor))
          throw new ProgressValidationError(
            "Legacy accessors are not supported.",
          );
        entries.push(descriptor ? clean(descriptor.value, depth + 1) : null);
      }
      result = entries;
    } else {
      const entries: [string, unknown][] = [];
      for (const key of Object.keys(item)) {
        if (!isSafeKey(key) || sensitiveLegacyKeys.test(key)) continue;
        characters += key.length;
        if (characters > MAX_JSON_LENGTH)
          throw new ProgressValidationError(
            "Legacy archive exceeds the size limit.",
          );
        const descriptor = Object.getOwnPropertyDescriptor(item, key);
        if (!descriptor || !("value" in descriptor))
          throw new ProgressValidationError(
            "Legacy accessors are not supported.",
          );
        entries.push([key, clean(descriptor.value, depth + 1)]);
      }
      result = Object.fromEntries(entries);
    }
    ancestors.delete(item);
    return result;
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProgressValidationError("Legacy payload must be an object.");
  }
  const sanitized = clean(value, 0) as Record<string, unknown>;
  if (JSON.stringify(sanitized).length > MAX_JSON_LENGTH)
    throw new ProgressValidationError("Legacy archive exceeds the size limit.");
  return sanitized;
}

export type ArchiveLegacyInput = Omit<LegacyArchive, "importedAt"> & {
  ownerUid?: string;
};

function selectedLegacyFields(
  value: unknown,
  fields: string[],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ProgressValidationError(
      "Legacy learning fields must be an object.",
    );
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    if (!descriptor) continue;
    if (!("value" in descriptor))
      throw new ProgressValidationError(
        "Legacy learning fields cannot contain accessors.",
      );
    result[field] = descriptor.value;
  }
  return result;
}

function learningArchivePayload(value: unknown): Record<string, unknown> {
  const payload = selectedLegacyFields(
    value,
    Object.keys(legacyPayloadSchema.shape),
  );
  if (payload.profile)
    payload.profile = selectedLegacyFields(
      payload.profile,
      Object.keys(legacyProfileSchema.shape),
    );
  for (const name of ["completions", "review"] as const) {
    if (!payload[name]) continue;
    const map = payload[name];
    if (typeof map !== "object" || Array.isArray(map))
      throw new ProgressValidationError(
        `Legacy ${name} must be a learning-record map.`,
      );
    payload[name] = Object.fromEntries(
      Object.keys(map)
        .filter(isSafeKey)
        .map((id) => {
          const descriptor = Object.getOwnPropertyDescriptor(map, id);
          if (!descriptor || !("value" in descriptor))
            throw new ProgressValidationError(
              "Legacy records cannot contain accessors.",
            );
          const raw = descriptor.value;
          return [
            id,
            typeof raw === "boolean" && name === "completions"
              ? raw
              : selectedLegacyFields(
                  raw,
                  name === "completions"
                    ? ["completedAt"]
                    : Object.keys(legacyReviewSchema.shape),
                ),
          ];
        }),
    );
  }
  return legacyPayloadSchema.parse(sanitizeLegacyPayload(payload));
}

export function archiveLegacy(
  state: ProgressState,
  input: ArchiveLegacyInput,
  now?: string,
): ProgressState {
  const at = timestamp(now);
  const payload = learningArchivePayload(input.payload);
  const profile =
    payload.profile &&
    typeof payload.profile === "object" &&
    !Array.isArray(payload.profile)
      ? (payload.profile as Record<string, unknown>)
      : {};
  const claimed = [
    input.ownerUid,
    payload.__legacyOwnerUid,
    payload.cloudUid,
    profile.cloudUid,
  ].filter((value) => value !== undefined && value !== null);
  if (input.source === "cloud-v1" && !claimed.length) {
    throw new ProgressValidationError(
      "Cloud legacy import requires its authenticated UID.",
    );
  }
  if (
    claimed.some(
      (uid) =>
        typeof uid !== "string" || !uid || state.ownerId !== `uid:${uid}`,
    )
  ) {
    throw new ProgressValidationError(
      "Cloud legacy data can only be archived by its own authenticated UID.",
    );
  }
  if (claimed.length) payload.__legacyOwnerUid = claimed[0];
  const archive = archiveSchema.parse({
    id: input.id,
    name: input.name,
    source: input.source,
    importedAt: at,
    payload,
  });
  if (has(state.legacy, archive.id)) {
    const previous = state.legacy[archive.id];
    if (
      previous.name === archive.name &&
      previous.source === archive.source &&
      sameValue(previous.payload, archive.payload)
    )
      return state;
    throw new ProgressValidationError(
      "This legacy archive already exists with different data; nothing was overwritten.",
    );
  }
  ensureCapacity(state.legacy, archive.id);
  return {
    ...state,
    legacy: { ...state.legacy, [archive.id]: archive },
    updatedAt: latest(state.updatedAt, at),
  };
}

export function importLegacyExport(
  state: ProgressState,
  text: string,
  now?: string,
): ProgressState {
  if (typeof text !== "string" || text.length > MAX_JSON_LENGTH)
    throw new ProgressValidationError("Legacy export exceeds the size limit.");
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new ProgressValidationError("Legacy export is not valid JSON.");
  }
  const payload = sanitizeLegacyPayload(raw);
  const profile = payload.profile;
  if (
    !profile ||
    typeof profile !== "object" ||
    Array.isArray(profile) ||
    typeof (profile as Record<string, unknown>).id !== "string" ||
    !Array.isArray(payload.completedDayIds) ||
    payload.completedDayIds.some((id) => typeof id !== "string") ||
    !payload.notes ||
    typeof payload.notes !== "object" ||
    Array.isArray(payload.notes) ||
    !payload.review ||
    typeof payload.review !== "object" ||
    Array.isArray(payload.review)
  ) {
    throw new ProgressValidationError(
      "Not a recognized legacy progress export.",
    );
  }
  const metadata = profile as Record<string, unknown>;
  const id = idSchema.parse(metadata.id);
  return archiveLegacy(
    state,
    {
      id: `export-v1:${entityPart(id)}`,
      name:
        typeof metadata.name === "string" && metadata.name.trim()
          ? metadata.name
          : id,
      source: "export-v1",
      payload,
    },
    now,
  );
}
