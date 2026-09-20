import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  runTransaction,
  type Firestore,
} from "firebase/firestore";
import { z } from "zod";
import type { SyncEntity, SyncRecord } from "../domain/types";

export const SYNC_COLLECTIONS = [
  "lessons",
  "projects",
  "goals",
  "activity",
  "errors",
  "settings",
] as const;
export const MAX_TRANSACTION_RECORDS = 100;
export const LEGACY_PROFILE_COLLECTION = "studyProgressProfiles";

export interface SyncChange {
  record: SyncRecord;
  expectedUpdatedAt: string | null;
}

export interface SyncDelete {
  collection: SyncRecord["collection"];
  id: string;
  expectedUpdatedAt: string;
}

export interface SyncConflict {
  collection: SyncRecord["collection"];
  id: string;
  expectedUpdatedAt: string | null;
  remote: SyncRecord | null;
}

export class SyncConflictError extends Error {
  readonly code = "sync/conflict";
  readonly remoteRecords: SyncRecord[];

  constructor(
    readonly conflicts: SyncConflict[],
    options?: ErrorOptions,
  ) {
    super(
      "Progress changed on another device. Review the remote version before retrying.",
      options,
    );
    this.name = "SyncConflictError";
    this.remoteRecords = conflicts.flatMap(({ remote }) =>
      remote ? [remote] : [],
    );
  }
}

export class SyncIdentityError extends Error {
  readonly code = "sync/identity-changed";

  constructor() {
    super(
      "The signed-in account changed. This sync operation has been cancelled.",
    );
    this.name = "SyncIdentityError";
  }
}

export class SyncValidationError extends Error {
  readonly code = "sync/invalid-record";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SyncValidationError";
  }
}

export interface SessionIdentity {
  readonly uid: string;
  readonly generation: number;
}

export interface SyncIdentityGuard {
  capture(uid: string): SessionIdentity;
  assertCurrent(identity: SessionIdentity): void;
}

export interface SyncRepository {
  loadRecords(uid: string): Promise<SyncRecord[]>;
  watchRecords(
    uid: string,
    onChanges: (records: SyncRecord[]) => void,
    onError: (error: Error) => void,
  ): () => void;
  commitRecords(uid: string, changes: SyncChange[]): Promise<void>;
  deleteRecords(uid: string, records: SyncDelete[]): Promise<void>;
  loadLegacyProfile(uid: string): Promise<Record<string, unknown> | null>;
}

export interface SyncRepositoryController extends SyncRepository {
  stopWatching(): void;
  dispose(): void;
}

const identifier = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:%-]*$/)
  .refine(
    (value) => !["__proto__", "prototype", "constructor"].includes(value),
  );
const eventIdentifier = z
  .string()
  .min(1)
  .max(1024)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:%-]*$/)
  .refine(
    (value) => !["__proto__", "prototype", "constructor"].includes(value),
  );
const isoTimestamp = z
  .string()
  .datetime({ precision: 3 })
  .refine(
    (value) =>
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString() === value,
  );
const nullableTimestamp = isoTimestamp.nullable();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = Date.parse(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(parsed) &&
      new Date(parsed).toISOString().slice(0, 10) === value
    );
  });
const timezone = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_+:/.-]+$/);
const ids = z
  .array(identifier)
  .max(32)
  .refine((value) => new Set(value).size === value.length);
const rubric = z
  .array(
    z
      .string()
      .min(1)
      .max(2048)
      .refine((value) => !value.includes("\u0000")),
  )
  .max(32)
  .refine((value) => new Set(value).size === value.length);
const track = z.enum([
  "foundation",
  "data",
  "sde",
  "quant",
  "ai",
  "gate",
  "cat",
]);
const base = { id: identifier, updatedAt: isoTimestamp };
const notAfter = (value: string | null, updatedAt: string) =>
  value === null || value <= updatedAt;
const review = z
  .object({
    dueAt: isoTimestamp,
    intervalDays: z.number().int().min(1).max(3650),
    streak: z.number().int().min(0).max(100000),
    lastReviewedAt: nullableTimestamp,
  })
  .strict();
const assessment = z
  .object({
    attemptedAt: isoTimestamp,
    correct: z.number().int().min(0).max(32),
    total: z.number().int().min(1).max(32),
    answers: z.record(
      identifier,
      z
        .string()
        .max(2048)
        .refine((value) => !value.includes("\u0000")),
    ),
  })
  .strict()
  .refine(
    (value) =>
      value.correct <= value.total &&
      Object.keys(value.answers).length <= value.total,
  );

const schemas = {
  lessons: z
    .object({
      ...base,
      manualCompletedAt: nullableTimestamp,
      evidence: z.string().max(16000),
      rubricChecked: rubric,
      note: z.string().max(16000),
      bookmarked: z.boolean(),
      readingPosition: z.string().max(1000),
      review: review.nullable(),
      assessment: assessment.nullable(),
    })
    .strict()
    .refine(
      (value) =>
        notAfter(value.manualCompletedAt, value.updatedAt) &&
        notAfter(value.review?.lastReviewedAt ?? null, value.updatedAt) &&
        notAfter(value.assessment?.attemptedAt ?? null, value.updatedAt),
    ),
  projects: z
    .object({ ...base, milestones: ids, evidence: z.string().max(16000) })
    .strict(),
  goals: z
    .object({
      ...base,
      title: z.string().min(1).max(200),
      targetDate: date,
      trackId: track,
      completedAt: nullableTimestamp,
      deletedAt: nullableTimestamp,
    })
    .strict()
    .refine(
      (value) =>
        notAfter(value.completedAt, value.updatedAt) &&
        notAfter(value.deletedAt, value.updatedAt),
    ),
  activity: z
    .object({
      ...base,
      id: eventIdentifier,
      at: isoTimestamp,
      timezone,
      kind: z.enum(["study", "assignment", "assessment", "review", "project"]),
      entityId: identifier,
      minutes: z.number().int().min(0).max(240),
      detail: z.string().max(2000),
    })
    .strict()
    .refine((value) => value.at <= value.updatedAt),
  errors: z
    .object({
      ...base,
      id: eventIdentifier,
      lessonId: identifier,
      questionId: identifier,
      prompt: z.string().max(4000),
      answer: z.string().max(2048),
      explanation: z.string().max(16000),
      reflection: z.string().max(16000),
      resolvedAt: nullableTimestamp,
    })
    .strict()
    .refine((value) => notAfter(value.resolvedAt, value.updatedAt)),
  settings: z
    .object({
      id: z.literal("settings"),
      updatedAt: isoTimestamp,
      displayName: z.string().max(120),
      timezone,
      theme: z.enum(["light", "dark", "system"]),
      dailyMinutes: z.number().int().min(5).max(1440),
      primaryTrack: track,
    })
    .strict(),
};

export function validateSyncRecord(record: SyncRecord): SyncRecord {
  if (!record || !Object.hasOwn(schemas, record.collection)) {
    throw new SyncValidationError("Unknown progress collection.");
  }
  const result = schemas[record.collection].safeParse(record.data);
  const recordIdentifier =
    record.collection === "activity" || record.collection === "errors"
      ? eventIdentifier
      : identifier;
  if (
    !recordIdentifier.safeParse(record.id).success ||
    !result.success ||
    result.data.id !== record.id
  ) {
    throw new SyncValidationError(
      `Invalid ${record.collection} record ${String(record.id)}. Check field types, lengths, IDs, and ISO timestamps.`,
      result.success ? undefined : { cause: result.error },
    );
  }
  return {
    collection: record.collection,
    id: record.id,
    data: result.data as SyncEntity,
  };
}

function readRecord(
  name: SyncRecord["collection"],
  snapshot: { id: string; data(): unknown },
): SyncRecord {
  return validateSyncRecord({
    collection: name,
    id: snapshot.id,
    data: snapshot.data() as SyncEntity,
  });
}

const asError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

export function createSyncRepository(
  db: Firestore,
  guard: SyncIdentityGuard,
): SyncRepositoryController {
  let disposed = false;
  const watchers = new Set<() => void>();

  const capture = (uid: string) => {
    if (disposed || !uid || uid.includes("/")) throw new SyncIdentityError();
    return guard.capture(uid);
  };
  const assertCurrent = (identity: SessionIdentity) => {
    if (disposed) throw new SyncIdentityError();
    guard.assertCurrent(identity);
  };
  const isCurrent = (identity: SessionIdentity) => {
    try {
      assertCurrent(identity);
      return true;
    } catch {
      return false;
    }
  };
  const reference = (uid: string, name: SyncRecord["collection"], id: string) =>
    doc(db, "learners", uid, name, id);

  return {
    async loadRecords(uid) {
      const identity = capture(uid);
      try {
        const groups = await Promise.all(
          SYNC_COLLECTIONS.map(async (name) => {
            assertCurrent(identity);
            if (name === "settings") {
              const snapshot = await getDocFromServer(
                reference(uid, name, "settings"),
              );
              assertCurrent(identity);
              return snapshot.exists() ? [readRecord(name, snapshot)] : [];
            }
            const snapshot = await getDocsFromServer(
              collection(db, "learners", uid, name),
            );
            assertCurrent(identity);
            return snapshot.docs.map((item) => readRecord(name, item));
          }),
        );
        assertCurrent(identity);
        return groups.flat();
      } catch (error) {
        assertCurrent(identity);
        throw error;
      }
    },

    watchRecords(uid, onChanges, onError) {
      const identity = capture(uid);
      let stopped = false;
      const subscriptions: (() => void)[] = [];
      const stop = () => {
        stopped = true;
        for (const unsubscribe of subscriptions.splice(0)) unsubscribe();
        watchers.delete(stop);
      };
      const reportError = (error: unknown) => {
        if (stopped || !isCurrent(identity)) return;
        stop();
        onError(asError(error));
      };
      const deliver = (records: SyncRecord[]) => {
        if (!stopped && records.length && isCurrent(identity))
          onChanges(records);
      };
      watchers.add(stop);
      try {
        for (const name of SYNC_COLLECTIONS) {
          if (stopped || !isCurrent(identity)) break;
          const options = { includeMetadataChanges: true };
          const unsubscribe =
            name === "settings"
              ? onSnapshot(
                  reference(uid, name, "settings"),
                  options,
                  (snapshot) => {
                    if (stopped || !isCurrent(identity)) return;
                    if (
                      snapshot.metadata.fromCache ||
                      snapshot.metadata.hasPendingWrites
                    )
                      return;
                    try {
                      if (snapshot.exists())
                        deliver([readRecord(name, snapshot)]);
                    } catch (error) {
                      reportError(error);
                    }
                  },
                  reportError,
                )
              : onSnapshot(
                  collection(db, "learners", uid, name),
                  options,
                  (snapshot) => {
                    if (stopped || !isCurrent(identity)) return;
                    if (
                      snapshot.metadata.fromCache ||
                      snapshot.metadata.hasPendingWrites
                    )
                      return;
                    try {
                      const changes = snapshot.docChanges({
                        includeMetadataChanges: true,
                      });
                      if (changes.some((change) => change.type === "removed")) {
                        throw new SyncValidationError(
                          "A remote record was removed. Reload progress before making further changes.",
                        );
                      }
                      deliver(
                        changes.map((change) => readRecord(name, change.doc)),
                      );
                    } catch (error) {
                      reportError(error);
                    }
                  },
                  reportError,
                );
          if (stopped) unsubscribe();
          else subscriptions.push(unsubscribe);
        }
      } catch (error) {
        stop();
        assertCurrent(identity);
        throw error;
      }
      if (!isCurrent(identity)) stop();
      return stop;
    },

    async commitRecords(uid, changes) {
      const identity = capture(uid);
      if (!Array.isArray(changes) || changes.length > MAX_TRANSACTION_RECORDS) {
        throw new SyncValidationError(
          `Commit at most ${MAX_TRANSACTION_RECORDS} records per transaction.`,
        );
      }
      const seen = new Set<string>();
      const edits = changes.map((change) => {
        const record = validateSyncRecord(change.record);
        if (
          change.expectedUpdatedAt !== null &&
          (!isoTimestamp.safeParse(change.expectedUpdatedAt).success ||
            record.data.updatedAt <= change.expectedUpdatedAt)
        ) {
          throw new SyncValidationError(
            "An update must have a newer ISO timestamp than its expected version.",
          );
        }
        if (
          record.collection === "activity" &&
          change.expectedUpdatedAt !== null
        ) {
          throw new SyncValidationError(
            "Study activity is append-only. Record a new event instead of changing an existing one.",
          );
        }
        const key = `${record.collection}/${record.id}`;
        if (seen.has(key))
          throw new SyncValidationError(
            "A transaction cannot contain duplicate records.",
          );
        seen.add(key);
        return { record, expectedUpdatedAt: change.expectedUpdatedAt };
      });
      if (!edits.length) return;
      const findConflicts = (
        snapshots: { id: string; exists(): boolean; data(): unknown }[],
      ): SyncConflict[] =>
        snapshots.flatMap((snapshot, index) => {
          const { record, expectedUpdatedAt } = edits[index];
          const remote = snapshot.exists()
            ? readRecord(record.collection, snapshot)
            : null;
          return (remote?.data.updatedAt ?? null) === expectedUpdatedAt
            ? []
            : [
                {
                  collection: record.collection,
                  id: record.id,
                  expectedUpdatedAt,
                  remote,
                },
              ];
        });

      try {
        // Transactions only resolve after server acknowledgement; they never queue offline writes as success.
        await runTransaction(db, async (transaction) => {
          assertCurrent(identity);
          const snapshots = await Promise.all(
            edits.map(({ record }) =>
              transaction.get(reference(uid, record.collection, record.id)),
            ),
          );
          assertCurrent(identity);
          const conflicts = findConflicts(snapshots);
          if (conflicts.length) throw new SyncConflictError(conflicts);
          snapshots.forEach((snapshot, index) => {
            if (
              edits[index].record.collection === "goals" &&
              snapshot.exists() &&
              snapshot.data()?.deletedAt !== null
            ) {
              throw new SyncValidationError(
                "Deleted goals cannot be changed or restored. Create a new goal instead.",
              );
            }
          });
          for (const { record } of edits) {
            assertCurrent(identity);
            transaction.set(
              reference(uid, record.collection, record.id),
              record.data,
            );
          }
        });
        assertCurrent(identity);
      } catch (error) {
        assertCurrent(identity);
        const code =
          error && typeof error === "object" && "code" in error
            ? error.code
            : null;
        if (
          [
            "permission-denied",
            "aborted",
            "failed-precondition",
            "already-exists",
          ].includes(String(code))
        ) {
          // Rules may reject a stale timestamp before Firestore evaluates a transaction's version
          // precondition. Re-read, but never retry writes or turn an uncertain failure into success.
          try {
            const snapshots = await Promise.all(
              edits.map(({ record }) => {
                assertCurrent(identity);
                return getDocFromServer(
                  reference(uid, record.collection, record.id),
                );
              }),
            );
            assertCurrent(identity);
            const conflicts = findConflicts(snapshots);
            if (conflicts.length)
              throw new SyncConflictError(conflicts, { cause: error });
          } catch (readError) {
            assertCurrent(identity);
            if (readError instanceof SyncConflictError) throw readError;
          }
        }
        assertCurrent(identity);
        throw error;
      }
    },

    async deleteRecords(uid, records) {
      const identity = capture(uid);
      if (!Array.isArray(records) || records.length > MAX_TRANSACTION_RECORDS) {
        throw new SyncValidationError(
          `Delete at most ${MAX_TRANSACTION_RECORDS} explicitly selected records per transaction.`,
        );
      }
      const deletions = records.map((record) => ({ ...record }));
      const seen = new Set<string>();
      for (const record of deletions) {
        const id =
          record.collection === "activity" || record.collection === "errors"
            ? eventIdentifier
            : identifier;
        if (
          !SYNC_COLLECTIONS.includes(record.collection) ||
          !id.safeParse(record.id).success ||
          !isoTimestamp.safeParse(record.expectedUpdatedAt).success ||
          (record.collection === "settings" && record.id !== "settings")
        ) {
          throw new SyncValidationError(
            "A reset must reference a valid, versioned record in this account's learning collections.",
          );
        }
        const key = `${record.collection}/${record.id}`;
        if (seen.has(key))
          throw new SyncValidationError(
            "A reset transaction cannot contain duplicate records.",
          );
        seen.add(key);
      }
      if (!deletions.length) return;
      await runTransaction(db, async (transaction) => {
        assertCurrent(identity);
        const snapshots = await Promise.all(
          deletions.map((record) =>
            transaction.get(reference(uid, record.collection, record.id)),
          ),
        );
        assertCurrent(identity);
        const conflicts: SyncConflict[] = snapshots.flatMap(
          (snapshot, index) => {
            const record = deletions[index];
            const remote = snapshot.exists()
              ? readRecord(record.collection, snapshot)
              : null;
            return remote?.data.updatedAt === record.expectedUpdatedAt
              ? []
              : [{ ...record, remote }];
          },
        );
        if (conflicts.length) throw new SyncConflictError(conflicts);
        deletions.forEach((record) => {
          assertCurrent(identity);
          transaction.delete(reference(uid, record.collection, record.id));
        });
      });
      assertCurrent(identity);
    },

    async loadLegacyProfile(uid) {
      const identity = capture(uid);
      try {
        const snapshot = await getDocFromServer(
          doc(db, LEGACY_PROFILE_COLLECTION, uid),
        );
        assertCurrent(identity);
        return snapshot.exists()
          ? (snapshot.data() as Record<string, unknown>)
          : null;
      } catch (error) {
        assertCurrent(identity);
        throw error;
      }
    },

    stopWatching() {
      for (const stop of [...watchers]) stop();
    },

    dispose() {
      disposed = true;
      for (const stop of [...watchers]) stop();
    },
  };
}
