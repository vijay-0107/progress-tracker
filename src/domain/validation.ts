import { z } from "zod";
import { CORE_TRACK_IDS, type ProgressState } from "./types";

export const MAX_JSON_LENGTH = 5_000_000;
export const MAX_COLLECTION_ENTRIES = 10_000;
export const MIN_EVIDENCE_LENGTH = 20;
const unsafeKeys = new Set(["__proto__", "prototype", "constructor"]);

export class ProgressValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProgressValidationError";
  }
}

export function isSafeKey(key: string): boolean {
  return (
    key.length > 0 &&
    key.length <= 2_048 &&
    !unsafeKeys.has(key) &&
    !/[\u0000-\u001f\u007f]/u.test(key)
  );
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function isInstant(value: string): boolean {
  const match =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/u.exec(
      value,
    );
  return (
    !!match &&
    isDateKey(match[1]) &&
    Number(match[2]) < 24 &&
    Number(match[3]) < 60 &&
    Number(match[4]) < 60 &&
    (!match[7] ||
      (Number(match[7]) <= 14 &&
        Number(match[8]) < 60 &&
        (Number(match[7]) < 14 || Number(match[8]) === 0))) &&
    Number.isFinite(Date.parse(value))
  );
}

export function isTimezone(value: string): boolean {
  if (!value || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function isMeaningfulEvidence(value: string): boolean {
  const text = value.trim();
  if (text.length < MIN_EVIDENCE_LENGTH) return false;
  const words = text.toLocaleLowerCase("en").match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.join("").length >= 10 && new Set(words).size >= 3;
}

export const ownerIdSchema = z
  .string()
  .max(260)
  .refine(
    (value) =>
      value === "guest" ||
      /^(local|uid):[^\s\u0000-\u001f\u007f]{1,128}$/u.test(value),
    "Invalid progress owner.",
  );
export const idSchema = z
  .string()
  .max(160)
  .refine(
    (value) => isSafeKey(value) && /^[A-Za-z0-9][A-Za-z0-9_.:%-]*$/.test(value),
    "Invalid entity ID.",
  );
const eventIdSchema = z
  .string()
  .max(1_024)
  .refine(
    (value) => isSafeKey(value) && /^[A-Za-z0-9][A-Za-z0-9_.:%-]*$/.test(value),
    "Invalid event ID.",
  );
const archiveKeySchema = z
  .string()
  .max(2_048)
  .refine(isSafeKey, "Invalid archive key.");
export const instantSchema = z
  .string()
  .max(40)
  .refine(isInstant, "Use an ISO timestamp with a timezone.")
  .transform((value) => new Date(value).toISOString());
export const timezoneSchema = z
  .string()
  .max(100)
  .refine(isTimezone, "Unknown timezone.");
const dateKeySchema = z.string().refine(isDateKey, "Invalid calendar date.");
const evidenceSchema = z.string().max(16_000);
const rubricSchema = z
  .array(
    z
      .string()
      .min(1)
      .max(2_048)
      .refine((value) => !value.includes("\u0000")),
  )
  .max(32)
  .refine(
    (values) => new Set(values).size === values.length,
    "Duplicate rubric checks.",
  );
const boundedNumber = (max: number) =>
  z.number().finite().int().min(0).max(max);
const stringAnswersSchema = z
  .record(
    idSchema,
    z
      .string()
      .max(2_048)
      .refine((value) => !value.includes("\u0000")),
  )
  .refine(
    (value) => Object.keys(value).length <= 32,
    "Too many assessment answers.",
  );

export const settingsSchema = z
  .object({
    id: z.literal("settings"),
    updatedAt: instantSchema,
    displayName: z.string().max(120),
    timezone: timezoneSchema,
    theme: z.enum(["light", "dark", "system"]),
    dailyMinutes: z.number().finite().int().min(5).max(1_440),
    primaryTrack: z.enum(CORE_TRACK_IDS),
  })
  .strict();

export const reviewSchema = z
  .object({
    dueAt: instantSchema,
    intervalDays: z.number().finite().int().min(1).max(3_650),
    streak: boundedNumber(100_000),
    lastReviewedAt: instantSchema.nullable(),
  })
  .strict();

export const lessonProgressSchema = z
  .object({
    id: idSchema,
    updatedAt: instantSchema,
    manualCompletedAt: instantSchema.nullable(),
    evidence: evidenceSchema,
    rubricChecked: rubricSchema,
    note: z.string().max(16_000),
    bookmarked: z.boolean(),
    readingPosition: z.string().max(1_000),
    review: reviewSchema.nullable(),
    assessment: z
      .object({
        attemptedAt: instantSchema,
        correct: boundedNumber(32),
        total: z.number().finite().int().min(1).max(32),
        answers: stringAnswersSchema,
      })
      .strict()
      .refine(
        (value) => value.correct <= value.total,
        "Invalid assessment score.",
      )
      .refine(
        (value) => Object.keys(value.answers).length === value.total,
        "Assessment answer count does not match total.",
      )
      .nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.manualCompletedAt !== null &&
      !isMeaningfulEvidence(value.evidence)
    ) {
      context.addIssue({
        code: "custom",
        path: ["evidence"],
        message: "Completed lessons require meaningful evidence.",
      });
    }
    if (value.review !== null && value.manualCompletedAt === null) {
      context.addIssue({
        code: "custom",
        path: ["review"],
        message: "Only completed lessons can have a review schedule.",
      });
    }
  });

export const lessonPatchSchema = z
  .object({
    evidence: evidenceSchema.optional(),
    rubricChecked: rubricSchema.optional(),
    note: z.string().max(16_000).optional(),
    bookmarked: z.boolean().optional(),
    readingPosition: z.string().max(1_000).optional(),
    manualCompletedAt: z.null().optional(),
  })
  .strict();

export const activitySchema = z
  .object({
    id: eventIdSchema,
    updatedAt: instantSchema,
    at: instantSchema,
    timezone: timezoneSchema,
    kind: z.enum(["study", "assignment", "assessment", "review", "project"]),
    entityId: idSchema,
    minutes: boundedNumber(240),
    detail: z.string().max(2_000),
  })
  .strict()
  .superRefine((event, context) => {
    if (
      event.kind === "study"
        ? event.minutes < 5
        : !isMeaningfulEvidence(event.detail)
    ) {
      context.addIssue({
        code: "custom",
        message:
          event.kind === "study"
            ? "Study sessions must last between 5 and 240 minutes."
            : "This activity requires meaningful evidence (at least 20 descriptive characters).",
      });
    }
    if (Date.parse(event.updatedAt) < Date.parse(event.at)) {
      context.addIssue({
        code: "custom",
        message: "Activity cannot be updated before it occurred.",
      });
    }
  });

const projectProgressSchema = z
  .object({
    id: idSchema,
    updatedAt: instantSchema,
    milestones: z
      .array(idSchema)
      .max(32)
      .refine(
        (values) => new Set(values).size === values.length,
        "Duplicate milestones.",
      ),
    evidence: evidenceSchema,
  })
  .strict();

const goalSchema = z
  .object({
    id: idSchema,
    updatedAt: instantSchema,
    title: z.string().min(1).max(200),
    targetDate: dateKeySchema,
    trackId: z.enum(CORE_TRACK_IDS),
    completedAt: instantSchema.nullable(),
    deletedAt: instantSchema.nullable(),
  })
  .strict();

export const errorEntrySchema = z
  .object({
    id: eventIdSchema,
    updatedAt: instantSchema,
    lessonId: idSchema,
    questionId: idSchema,
    prompt: z.string().max(4_000),
    answer: z.string().max(2_048),
    explanation: z.string().max(16_000),
    reflection: z.string().max(16_000),
    resolvedAt: instantSchema.nullable(),
  })
  .strict();

export const legacyProfileSchema = z
  .object({
    id: z.string().max(200).optional(),
    cloudUid: z.string().max(128).nullable().optional(),
    name: z.string().max(200).optional(),
    email: z.string().max(254).nullable().optional(),
    dailyTarget: z.number().finite().optional(),
    weekdayTarget: z.number().finite().optional(),
    weekendTarget: z.number().finite().optional(),
    planStartDate: z.string().max(100).optional(),
    lastPlanRebasedAt: z.string().max(100).optional(),
    lastPlanRebaseReason: z.string().max(200).optional(),
    lastStreakResetAt: z.string().max(100).optional(),
    createdAt: z.string().max(100).optional(),
    updatedAt: z.string().max(100).optional(),
    sync: z.string().max(200).optional(),
  })
  .strip();

export const legacyReviewSchema = z
  .object({
    confidence: z.number().finite().optional(),
    difficulty: z.number().finite().optional(),
    status: z.string().max(100).optional(),
    bookmarked: z.boolean().optional(),
    dueAt: z.string().max(100).optional(),
    interval: z.number().finite().optional(),
    intervalDays: z.number().finite().optional(),
    lastReviewedAt: z.string().max(100).nullable().optional(),
  })
  .strip();

export const legacyPayloadSchema = z
  .object({
    profile: legacyProfileSchema.optional(),
    completions: z
      .record(
        archiveKeySchema,
        z.union([
          z.boolean(),
          z.object({ completedAt: z.string().max(100) }).strip(),
        ]),
      )
      .optional(),
    notes: z.record(archiveKeySchema, z.string().max(100_000)).optional(),
    review: z.record(archiveKeySchema, legacyReviewSchema).optional(),
    completedDayIds: z
      .array(archiveKeySchema)
      .max(MAX_COLLECTION_ENTRIES)
      .optional(),
    exportedAt: z.string().max(100).optional(),
    sourceGeneratedAt: z.string().max(100).optional(),
    cloudUid: z.string().max(128).optional(),
    __legacyOwnerUid: z.string().max(128).optional(),
  })
  .strip();

export const archiveSchema = z
  .object({
    id: archiveKeySchema,
    name: z.string().min(1).max(200),
    source: z.enum(["local-v1", "cloud-v1", "export-v1"]),
    importedAt: instantSchema,
    payload: legacyPayloadSchema,
  })
  .strict();

function collection<T extends z.ZodTypeAny>(schema: T) {
  return z.record(archiveKeySchema, schema).superRefine((records, context) => {
    if (Object.keys(records).length > MAX_COLLECTION_ENTRIES) {
      context.addIssue({ code: "custom", message: "Too many saved records." });
    }
    for (const [key, value] of Object.entries(records)) {
      if ((value as { id: string }).id !== key) {
        context.addIssue({
          code: "custom",
          path: [key, "id"],
          message: "Record key must match its ID.",
        });
      }
    }
  });
}

export const progressSchema = z
  .object({
    schemaVersion: z.literal(2),
    ownerId: ownerIdSchema,
    settings: settingsSchema,
    lessons: collection(lessonProgressSchema),
    projects: collection(projectProgressSchema),
    goals: collection(goalSchema),
    activity: collection(activitySchema),
    errors: collection(errorEntrySchema),
    legacy: collection(archiveSchema),
    updatedAt: instantSchema,
  })
  .strict();

export function assertSafeJson(value: unknown): void {
  const ancestors = new Set<object>();
  let nodes = 0;
  let characters = 0;
  function visit(item: unknown, depth: number): void {
    if (++nodes > 200_000 || depth > 24)
      throw new ProgressValidationError(
        "Progress data is too large or deeply nested.",
      );
    if (item === null || typeof item === "boolean") return;
    if (typeof item === "string") {
      if (item.length > 100_000)
        throw new ProgressValidationError("A saved text field is too long.");
      characters += item.length;
      if (characters > MAX_JSON_LENGTH)
        throw new ProgressValidationError(
          "Progress data exceeds the size limit.",
        );
      return;
    }
    if (typeof item === "number" && Number.isFinite(item)) return;
    if (typeof item !== "object")
      throw new ProgressValidationError(
        "Progress must contain only JSON values.",
      );
    if (ancestors.has(item))
      throw new ProgressValidationError(
        "Circular progress data is not supported.",
      );
    const prototype = Object.getPrototypeOf(item);
    if (
      Array.isArray(item)
        ? prototype !== Array.prototype
        : prototype !== Object.prototype && prototype !== null
    ) {
      throw new ProgressValidationError(
        "Progress contains an unsafe object prototype.",
      );
    }
    if (Array.isArray(item) && item.length > MAX_COLLECTION_ENTRIES) {
      throw new ProgressValidationError("A saved array is too large.");
    }
    ancestors.add(item);
    for (const key of Reflect.ownKeys(item)) {
      if (Array.isArray(item) && key === "length") continue;
      if (typeof key !== "string" || !isSafeKey(key))
        throw new ProgressValidationError(
          "Unsafe property key in progress data.",
        );
      characters += key.length;
      if (characters > MAX_JSON_LENGTH)
        throw new ProgressValidationError(
          "Progress data exceeds the size limit.",
        );
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new ProgressValidationError(
          "Progress cannot contain accessors or hidden properties.",
        );
      }
      visit(descriptor.value, depth + 1);
    }
    ancestors.delete(item);
  }
  visit(value, 0);
}

export function parseJson(text: string): unknown {
  if (typeof text !== "string" || text.length > MAX_JSON_LENGTH) {
    throw new ProgressValidationError("Progress file exceeds the size limit.");
  }
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new ProgressValidationError("Progress file is not valid JSON.");
  }
  assertSafeJson(value);
  return value;
}

export function timestamp(now?: string): string {
  const value = now ?? new Date().toISOString();
  if (!isInstant(value))
    throw new ProgressValidationError(
      "Invalid timestamp; include its timezone.",
    );
  return new Date(value).toISOString();
}

export function validateProgressState(
  value: unknown,
  now?: string,
): ProgressState {
  assertSafeJson(value);
  const result = progressSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ProgressValidationError(
      `${issue.path.join(".") || "progress"}: ${issue.message}`,
    );
  }
  const reference = Date.parse(timestamp(now));
  for (const event of Object.values(result.data.activity)) {
    if (
      Date.parse(event.at) > reference ||
      Date.parse(event.updatedAt) > reference
    ) {
      throw new ProgressValidationError("Future activity is not allowed.");
    }
  }
  for (const archive of Object.values(result.data.legacy)) {
    const profile = archive.payload.profile;
    const profileUid =
      profile && typeof profile === "object" && !Array.isArray(profile)
        ? (profile as Record<string, unknown>).cloudUid
        : undefined;
    const claims = [
      archive.payload.__legacyOwnerUid,
      archive.payload.cloudUid,
      profileUid,
    ].filter((uid) => uid !== undefined && uid !== null);
    if (
      (archive.source === "cloud-v1" && !claims.length) ||
      claims.some(
        (uid) =>
          typeof uid !== "string" ||
          !uid ||
          result.data.ownerId !== `uid:${uid}`,
      )
    ) {
      throw new ProgressValidationError(
        "Cloud legacy data requires its own authenticated owner.",
      );
    }
  }
  return result.data as ProgressState;
}

export function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  )
    return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = Object.keys(leftRecord);
  return (
    keys.length === Object.keys(rightRecord).length &&
    keys.every(
      (key) =>
        Object.hasOwn(rightRecord, key) &&
        sameValue(leftRecord[key], rightRecord[key]),
    )
  );
}
