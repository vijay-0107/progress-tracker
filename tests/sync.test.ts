import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import type { LessonProgress, SyncRecord } from "../src/domain/types";
import {
  createSyncRepository,
  MAX_TRANSACTION_RECORDS,
  SyncConflictError,
  SyncIdentityError,
  SyncValidationError,
  validateSyncRecord,
  type SessionIdentity,
  type SyncIdentityGuard,
} from "../src/services/sync";

const sdk = vi.hoisted(() => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocFromServer: vi.fn(),
  getDocsFromServer: vi.fn(),
  onSnapshot: vi.fn(),
  runTransaction: vi.fn(),
}));
vi.mock("firebase/firestore", () => sdk);

const T0 = "2026-09-01T10:00:00.000Z";
const T1 = "2026-09-01T10:00:01.000Z";
const db = {} as Firestore;
const lesson = (updatedAt = T0, note = "Original note"): SyncRecord => ({
  collection: "lessons",
  id: "foundation:lesson-1",
  data: {
    id: "foundation:lesson-1",
    updatedAt,
    manualCompletedAt: null,
    evidence: "https://example.org/evidence",
    rubricChecked: [],
    note,
    bookmarked: false,
    readingPosition: "",
    review: null,
    assessment: null,
  },
});
const path = (record: SyncRecord) =>
  `learners/alice/${record.collection}/${record.id}`;
const snapshot = (
  data: SyncRecord["data"] | null,
  id = data?.id ?? "foundation:lesson-1",
) => ({
  id,
  exists: () => data !== null,
  data: () => data,
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

describe("per-entity sync repository", () => {
  let uid: string | null;
  let generation: number;
  let guard: SyncIdentityGuard;
  let records: Map<string, SyncRecord["data"]>;
  let transactions: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  }[];
  let listeners: {
    path: string;
    next: (value: unknown) => void;
    error: (value: unknown) => void;
    unsubscribe: ReturnType<typeof vi.fn>;
  }[];

  beforeEach(() => {
    vi.resetAllMocks();
    uid = "alice";
    generation = 1;
    records = new Map();
    transactions = [];
    listeners = [];
    guard = {
      capture(requestedUid) {
        const identity = { uid: requestedUid, generation };
        this.assertCurrent(identity);
        return identity;
      },
      assertCurrent(identity: SessionIdentity) {
        if (!uid || uid !== identity.uid || generation !== identity.generation)
          throw new SyncIdentityError();
      },
    };
    const reference = (_database: unknown, ...segments: string[]) => ({
      path: segments.join("/"),
      id: segments.at(-1),
    });
    sdk.doc.mockImplementation(reference);
    sdk.collection.mockImplementation(reference);
    sdk.getDocFromServer.mockImplementation(
      async (ref: { path: string; id: string }) =>
        snapshot(records.get(ref.path) ?? null, ref.id),
    );
    sdk.getDocsFromServer.mockImplementation(async (ref: { path: string }) => ({
      docs: [...records]
        .filter(([key]) => key.startsWith(`${ref.path}/`))
        .map(([, data]) => snapshot(data)),
    }));
    sdk.runTransaction.mockImplementation(async (_database, action) => {
      const transaction = {
        get: vi.fn(async (ref: { path: string; id: string }) =>
          snapshot(records.get(ref.path) ?? null, ref.id),
        ),
        set: vi.fn(),
        delete: vi.fn(),
      };
      transactions.push(transaction);
      await action(transaction);
      for (const [ref, data] of transaction.set.mock.calls)
        records.set(ref.path, data);
      for (const [ref] of transaction.delete.mock.calls)
        records.delete(ref.path);
    });
    sdk.onSnapshot.mockImplementation((ref, _options, next, error) => {
      const unsubscribe = vi.fn();
      listeners.push({ path: ref.path, next, error, unsubscribe });
      return unsubscribe;
    });
  });

  it("reads only the current learner's bounded collections from the server", async () => {
    const item = lesson();
    records.set(path(item), item.data);
    const repository = createSyncRepository(db, guard);
    expect(await repository.loadRecords("alice")).toEqual([item]);
    expect(sdk.getDocsFromServer).toHaveBeenCalledTimes(5);
    expect(sdk.getDocFromServer).toHaveBeenCalledWith({
      path: "learners/alice/settings/settings",
      id: "settings",
    });
    expect(
      sdk.getDocsFromServer.mock.calls.every(([ref]) =>
        ref.path.startsWith("learners/alice/"),
      ),
    ).toBe(true);
  });

  it("creates and updates complete entity records with compare-and-set versions", async () => {
    const repository = createSyncRepository(db, guard);
    await repository.commitRecords("alice", [
      { record: lesson(), expectedUpdatedAt: null },
    ]);
    await repository.commitRecords("alice", [
      { record: lesson(T1, "Revised"), expectedUpdatedAt: T0 },
    ]);
    expect(records.get(path(lesson()))).toEqual(lesson(T1, "Revised").data);
    expect(
      transactions.every(
        (transaction) => transaction.get.mock.calls.length === 1,
      ),
    ).toBe(true);
  });

  it("deletes only explicit, unchanged owner records and preserves concurrent edits", async () => {
    const repository = createSyncRepository(db, guard);
    records.set(path(lesson()), lesson().data);
    await expect(
      repository.deleteRecords("bob", [
        { collection: "lessons", id: lesson().id, expectedUpdatedAt: T0 },
      ]),
    ).rejects.toBeInstanceOf(SyncIdentityError);
    await expect(
      repository.deleteRecords("alice", [
        { collection: "lessons", id: lesson().id, expectedUpdatedAt: T1 },
      ]),
    ).rejects.toBeInstanceOf(SyncConflictError);
    expect(records.has(path(lesson()))).toBe(true);
    await repository.deleteRecords("alice", [
      { collection: "lessons", id: lesson().id, expectedUpdatedAt: T0 },
    ]);
    expect(records.has(path(lesson()))).toBe(false);
  });

  it("cancels a reset when its asynchronous read crosses accounts", async () => {
    const pending = deferred<ReturnType<typeof snapshot>>();
    const transaction = {
      get: vi.fn(() => pending.promise),
      set: vi.fn(),
      delete: vi.fn(),
    };
    sdk.runTransaction.mockImplementation(async (_database, action) =>
      action(transaction),
    );
    const result = createSyncRepository(db, guard).deleteRecords("alice", [
      { collection: "lessons", id: lesson().id, expectedUpdatedAt: T0 },
    ]);
    uid = "bob";
    generation++;
    pending.resolve(snapshot(lesson().data));
    await expect(result).rejects.toBeInstanceOf(SyncIdentityError);
    expect(transaction.delete).not.toHaveBeenCalled();
  });

  it("returns remote conflicts without overwriting notes or evidence, or partially writing a batch", async () => {
    const repository = createSyncRepository(db, guard);
    const remote = lesson(T1, "Edited on another device");
    records.set(path(remote), remote.data);
    const newRecord = lesson();
    newRecord.id = "another-lesson";
    newRecord.data.id = newRecord.id;
    const result = repository.commitRecords("alice", [
      { record: newRecord, expectedUpdatedAt: null },
      { record: lesson(T1, "Local edit"), expectedUpdatedAt: T0 },
    ]);
    await expect(result).rejects.toMatchObject({
      code: "sync/conflict",
      remoteRecords: [remote],
      conflicts: [
        { collection: "lessons", id: remote.id, expectedUpdatedAt: T0, remote },
      ],
    });
    expect(transactions[0].set).not.toHaveBeenCalled();
    expect(records.get(path(remote))).toEqual(remote.data);
    expect(records.has(path(newRecord))).toBe(false);
  });

  it("reports a missing expected remote document as a typed conflict", async () => {
    const repository = createSyncRepository(db, guard);
    const result = repository.commitRecords("alice", [
      { record: lesson(T1), expectedUpdatedAt: T0 },
    ]);
    await expect(result).rejects.toBeInstanceOf(SyncConflictError);
    await expect(result).rejects.toMatchObject({
      remoteRecords: [],
      conflicts: [{ remote: null }],
    });
  });

  it("reconciles a server-side stale-timestamp rejection into a conflict without retrying writes", async () => {
    const remote = lesson(T1, "Won the race");
    records.set(path(remote), remote.data);
    const denied = Object.assign(new Error("stale write denied"), {
      code: "permission-denied",
    });
    sdk.runTransaction.mockRejectedValue(denied);
    const result = createSyncRepository(db, guard).commitRecords("alice", [
      { record: lesson(T1, "Lost the race"), expectedUpdatedAt: T0 },
    ]);
    await expect(result).rejects.toMatchObject({
      code: "sync/conflict",
      remoteRecords: [remote],
      cause: denied,
    });
    expect(sdk.runTransaction).toHaveBeenCalledTimes(1);
    expect(records.get(path(remote))).toEqual(remote.data);
  });

  it("preserves genuine permission failures when the remote version has not changed", async () => {
    const remote = lesson();
    records.set(path(remote), remote.data);
    const denied = Object.assign(new Error("writes disabled"), {
      code: "permission-denied",
    });
    sdk.runTransaction.mockRejectedValue(denied);
    await expect(
      createSyncRepository(db, guard).commitRecords("alice", [
        { record: lesson(T1), expectedUpdatedAt: T0 },
      ]),
    ).rejects.toBe(denied);
  });

  it("rejects invalid versions, duplicate paths, oversized batches, and malformed records before writing", async () => {
    const repository = createSyncRepository(db, guard);
    await expect(
      repository.commitRecords("alice", [
        { record: lesson(), expectedUpdatedAt: T0 },
      ]),
    ).rejects.toBeInstanceOf(SyncValidationError);
    await expect(
      repository.commitRecords("alice", [
        { record: lesson(T1), expectedUpdatedAt: "yesterday" },
      ]),
    ).rejects.toBeInstanceOf(SyncValidationError);
    const change = { record: lesson(), expectedUpdatedAt: null };
    await expect(
      repository.commitRecords("alice", [change, change]),
    ).rejects.toBeInstanceOf(SyncValidationError);
    await expect(
      repository.commitRecords(
        "alice",
        Array.from({ length: MAX_TRANSACTION_RECORDS + 1 }, () => change),
      ),
    ).rejects.toBeInstanceOf(SyncValidationError);
    await expect(
      repository.commitRecords("alice", [
        { record: lesson(T0, "x".repeat(16001)), expectedUpdatedAt: null },
      ]),
    ).rejects.toBeInstanceOf(SyncValidationError);
    expect(sdk.runTransaction).not.toHaveBeenCalled();
  });

  it("explains immutable activity and final goal tombstones without attempting forbidden writes", async () => {
    const repository = createSyncRepository(db, guard);
    const activity: SyncRecord = {
      collection: "activity",
      id: "event-1",
      data: {
        id: "event-1",
        updatedAt: T1,
        at: T0,
        timezone: "UTC",
        kind: "study",
        entityId: "lesson-1",
        minutes: 25,
        detail: "",
      },
    };
    await expect(
      repository.commitRecords("alice", [
        { record: activity, expectedUpdatedAt: T0 },
      ]),
    ).rejects.toThrow("append-only");
    expect(sdk.runTransaction).not.toHaveBeenCalled();
    const deleted: SyncRecord = {
      collection: "goals",
      id: "goal-1",
      data: {
        id: "goal-1",
        updatedAt: T0,
        title: "Deleted",
        targetDate: "2026-10-01",
        trackId: "foundation",
        completedAt: null,
        deletedAt: T0,
      },
    };
    records.set(path(deleted), deleted.data);
    await expect(
      repository.commitRecords("alice", [
        {
          record: { ...deleted, data: { ...deleted.data, updatedAt: T1 } },
          expectedUpdatedAt: T0,
        },
      ]),
    ).rejects.toThrow("Deleted goals cannot be changed");
    expect(transactions[0].set).not.toHaveBeenCalled();
  });

  it("guards every API against unauthenticated and cross-user access", async () => {
    const repository = createSyncRepository(db, guard);
    for (const requestedUid of ["bob", "../alice", ""]) {
      await expect(repository.loadRecords(requestedUid)).rejects.toBeInstanceOf(
        SyncIdentityError,
      );
      await expect(
        repository.loadLegacyProfile(requestedUid),
      ).rejects.toBeInstanceOf(SyncIdentityError);
      await expect(
        repository.commitRecords(requestedUid, []),
      ).rejects.toBeInstanceOf(SyncIdentityError);
      expect(() =>
        repository.watchRecords(requestedUid, vi.fn(), vi.fn()),
      ).toThrow(SyncIdentityError);
    }
    uid = null;
    await expect(repository.loadRecords("alice")).rejects.toBeInstanceOf(
      SyncIdentityError,
    );
    expect(sdk.getDocsFromServer).not.toHaveBeenCalled();
    expect(sdk.runTransaction).not.toHaveBeenCalled();
    expect(sdk.onSnapshot).not.toHaveBeenCalled();
  });

  it.each(["account switch", "same-account reauthentication"])(
    "discards pending reads after %s",
    async (scenario) => {
      const pending = deferred<{ docs: never[] }>();
      sdk.getDocsFromServer.mockReturnValue(pending.promise);
      const result = createSyncRepository(db, guard).loadRecords("alice");
      generation++;
      if (scenario === "account switch") uid = "bob";
      pending.resolve({ docs: [] });
      await expect(result).rejects.toBeInstanceOf(SyncIdentityError);
    },
  );

  it("reads exactly the old cloud profile path without any migration write", async () => {
    const payload = {
      profile: { name: "Original" },
      notes: { old: "Keep unchanged" },
    };
    sdk.getDocFromServer.mockResolvedValue({
      exists: () => true,
      data: () => payload,
    });
    const repository = createSyncRepository(db, guard);
    expect(await repository.loadLegacyProfile("alice")).toEqual(payload);
    expect(sdk.doc).toHaveBeenLastCalledWith(
      db,
      "studyProgressProfiles",
      "alice",
    );
    expect(sdk.runTransaction).not.toHaveBeenCalled();

    const pending = deferred<ReturnType<typeof snapshot>>();
    sdk.getDocFromServer.mockReturnValue(pending.promise);
    const result = repository.loadLegacyProfile("alice");
    generation++;
    uid = "bob";
    pending.resolve(snapshot(null));
    await expect(result).rejects.toBeInstanceOf(SyncIdentityError);
  });

  it("checks the captured account again before writes and on transaction retries", async () => {
    const retry = { get: vi.fn(), set: vi.fn() };
    sdk.runTransaction.mockImplementation(async (_database, action) => {
      const first = { get: vi.fn(async () => snapshot(null)), set: vi.fn() };
      await action(first);
      uid = "bob";
      generation++;
      await action(retry);
    });
    await expect(
      createSyncRepository(db, guard).commitRecords("alice", [
        { record: lesson(), expectedUpdatedAt: null },
      ]),
    ).rejects.toBeInstanceOf(SyncIdentityError);
    expect(retry.get).not.toHaveBeenCalled();
    expect(retry.set).not.toHaveBeenCalled();
  });

  it("does not continue a transaction after its asynchronous read crosses accounts", async () => {
    const pending = deferred<ReturnType<typeof snapshot>>();
    const transaction = { get: vi.fn(() => pending.promise), set: vi.fn() };
    sdk.runTransaction.mockImplementation(async (_database, action) =>
      action(transaction),
    );
    const result = createSyncRepository(db, guard).commitRecords("alice", [
      { record: lesson(), expectedUpdatedAt: null },
    ]);
    uid = "bob";
    generation++;
    pending.resolve(snapshot(null));
    await expect(result).rejects.toBeInstanceOf(SyncIdentityError);
    expect(transaction.set).not.toHaveBeenCalled();
  });

  it("waits for server acknowledgement and rejects late acknowledgements after sign-out", async () => {
    const acknowledged = deferred<void>();
    sdk.runTransaction.mockImplementation(async (_database, action) => {
      await action({ get: vi.fn(async () => snapshot(null)), set: vi.fn() });
      await acknowledged.promise;
    });
    let succeeded = false;
    const result = createSyncRepository(db, guard)
      .commitRecords("alice", [{ record: lesson(), expectedUpdatedAt: null }])
      .then(() => {
        succeeded = true;
      });
    await Promise.resolve();
    expect(succeeded).toBe(false);
    uid = null;
    generation++;
    acknowledged.resolve();
    await expect(result).rejects.toBeInstanceOf(SyncIdentityError);
    expect(succeeded).toBe(false);
  });

  it("does not report an offline/rejected transaction as saved", async () => {
    const offline = new Error("Firestore is unavailable");
    sdk.runTransaction.mockRejectedValue(offline);
    await expect(
      createSyncRepository(db, guard).commitRecords("alice", [
        { record: lesson(), expectedUpdatedAt: null },
      ]),
    ).rejects.toBe(offline);
  });

  it("clones caller data before asynchronous transaction work", async () => {
    const pending = deferred<ReturnType<typeof snapshot>>();
    const transaction = { get: vi.fn(() => pending.promise), set: vi.fn() };
    sdk.runTransaction.mockImplementation(async (_database, action) =>
      action(transaction),
    );
    const record = lesson();
    const result = createSyncRepository(db, guard).commitRecords("alice", [
      { record, expectedUpdatedAt: null },
    ]);
    (record.data as LessonProgress).note = "Mutated while saving";
    pending.resolve(snapshot(null));
    await result;
    expect(transaction.set.mock.calls[0][1].note).toBe("Original note");
  });

  it("delivers only server-confirmed watch changes and suppresses old-account callbacks", () => {
    const onChanges = vi.fn();
    const onError = vi.fn();
    const repository = createSyncRepository(db, guard);
    repository.watchRecords("alice", onChanges, onError);
    const listener = listeners.find((item) => item.path.endsWith("/lessons"))!;
    const emit = (fromCache = false, hasPendingWrites = false) =>
      listener.next({
        metadata: { fromCache, hasPendingWrites },
        docChanges: () => [{ type: "added", doc: snapshot(lesson().data) }],
      });
    emit(true);
    emit(false, true);
    expect(onChanges).not.toHaveBeenCalled();
    emit();
    expect(onChanges).toHaveBeenCalledWith([lesson()]);
    generation++;
    uid = "bob";
    emit();
    listener.error(new Error("Late old-account error"));
    expect(onChanges).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    repository.stopWatching();
    expect(
      listeners.every((item) => item.unsubscribe.mock.calls.length === 1),
    ).toBe(true);
  });

  it("surfaces watch errors, stops all listeners, and makes disposal idempotent", async () => {
    const onError = vi.fn();
    const onChanges = vi.fn();
    const repository = createSyncRepository(db, guard);
    const stop = repository.watchRecords("alice", onChanges, onError);
    const error = new Error("Permission denied");
    listeners[0].error(error);
    expect(onError).toHaveBeenCalledWith(error);
    expect(
      listeners.every((item) => item.unsubscribe.mock.calls.length === 1),
    ).toBe(true);
    stop();
    repository.dispose();
    repository.dispose();
    listeners[0].error(new Error("late"));
    expect(onError).toHaveBeenCalledTimes(1);
    await expect(repository.loadRecords("alice")).rejects.toBeInstanceOf(
      SyncIdentityError,
    );
    expect(onChanges).not.toHaveBeenCalled();
  });

  it("rejects invalid nested payloads, impossible dates, path IDs, and unknown fields", () => {
    const invalid = [
      { ...lesson(), id: "../lesson" },
      { ...lesson(), collection: "__proto__" },
      { ...lesson(), data: { ...lesson().data, unexpected: true } },
      {
        ...lesson(),
        data: { ...lesson().data, updatedAt: "2026-02-30T10:00:00.000Z" },
      },
      { ...lesson(), data: { ...lesson().data, rubricChecked: [4] } },
      {
        ...lesson(),
        data: {
          ...lesson().data,
          assessment: { attemptedAt: T0, correct: 2, total: 1, answers: {} },
        },
      },
      {
        ...lesson(),
        data: {
          ...lesson().data,
          assessment: {
            attemptedAt: T0,
            correct: 1,
            total: 1,
            answers: { question: "answer\u0000injected" },
          },
        },
      },
    ];
    for (const record of invalid)
      expect(() => validateSyncRecord(record as SyncRecord)).toThrow(
        SyncValidationError,
      );
  });
});
