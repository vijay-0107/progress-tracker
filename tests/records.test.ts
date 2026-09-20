import { describe, expect, it } from "vitest";
import { createProgress, emptyLesson } from "../src/domain/progress";
import {
  applyRecord,
  emptyJournal,
  reconcileRecords,
  recordChanges,
  sameRecord,
} from "../src/state/records";
import type { SyncRecord } from "../src/domain/types";

const time = "2026-09-20T04:00:00.000Z";
describe("account-scoped record reconciliation", () => {
  it("downloads new cloud records without copying guest content", () => {
    const state = createProgress("uid:alice", time);
    const record: SyncRecord = {
      collection: "lessons",
      id: "lesson-one",
      data: { ...emptyLesson("lesson-one", time), note: "Alice only" },
    };
    const result = reconcileRecords(state, emptyJournal(state.ownerId), [
      record,
    ]);
    expect(result.state.lessons["lesson-one"].note).toBe("Alice only");
    expect(result.state.ownerId).toBe("uid:alice");
    expect(result.journal.pending).toEqual([]);
  });
  it("keeps an unsynced local note and surfaces a concurrent remote edit", () => {
    const before = createProgress("uid:alice", time);
    const original: SyncRecord = {
      collection: "lessons",
      id: "lesson-one",
      data: emptyLesson("lesson-one", time),
    };
    const base = reconcileRecords(before, emptyJournal(before.ownerId), [
      original,
    ]);
    const after = applyRecord(base.state, {
      ...original,
      data: {
        ...emptyLesson("lesson-one", "2026-09-20T05:00:00.000Z"),
        note: "Offline edit",
      },
    });
    const journal = recordChanges(base.state, after, base.journal);
    const remote: SyncRecord = {
      ...original,
      data: {
        ...emptyLesson("lesson-one", "2026-09-20T06:00:00.000Z"),
        note: "Other device",
      },
    };
    const result = reconcileRecords(after, journal, [remote]);
    expect(result.state.lessons["lesson-one"].note).toBe("Offline edit");
    expect(result.journal.conflicts).toHaveLength(1);
    expect(result.journal.conflicts[0].remote).toEqual(remote);
  });
  it("does not confuse an unchanged remote base with a conflict", () => {
    const state = createProgress("uid:alice", time);
    const record: SyncRecord = {
      collection: "lessons",
      id: "lesson-one",
      data: emptyLesson("lesson-one", time),
    };
    const base = reconcileRecords(state, emptyJournal(state.ownerId), [record]);
    const after = applyRecord(base.state, {
      ...record,
      data: {
        ...emptyLesson("lesson-one", "2026-09-20T05:00:00.000Z"),
        note: "Pending",
      },
    });
    const result = reconcileRecords(
      after,
      recordChanges(base.state, after, base.journal),
      [record],
    );
    expect(result.journal.conflicts).toEqual([]);
    expect(result.journal.pending).toEqual(["lessons/lesson-one"]);
    expect(result.state.lessons["lesson-one"].note).toBe("Pending");
  });
  it("rejects journals and writes from a different account", () => {
    expect(() =>
      reconcileRecords(
        createProgress("uid:alice", time),
        emptyJournal("uid:bob"),
        [],
      ),
    ).toThrow("another workspace");
    expect(() =>
      recordChanges(
        createProgress("guest", time),
        createProgress("uid:alice", time),
        emptyJournal("guest"),
      ),
    ).toThrow("ownership");
  });
  it("compares Firestore records independently of object field order", () => {
    const data = emptyLesson("lesson-one", time);
    const first: SyncRecord = { collection: "lessons", id: data.id, data };
    const second: SyncRecord = {
      id: data.id,
      data: Object.fromEntries(Object.entries(data).reverse()) as typeof data,
      collection: "lessons",
    };
    expect(sameRecord(first, second)).toBe(true);
  });
});
