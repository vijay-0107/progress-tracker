import type { ProgressState, SyncEntity, SyncRecord } from "../domain/types";
import { sameValue } from "../domain/validation";

export function recordKey(
  record: Pick<SyncRecord, "collection" | "id">,
): string {
  return `${record.collection}/${record.id}`;
}

export function recordsFromState(state: ProgressState): SyncRecord[] {
  return [
    { collection: "settings", id: "settings", data: state.settings },
    ...Object.values(state.lessons).map((data): SyncRecord => ({
      collection: "lessons",
      id: data.id,
      data,
    })),
    ...Object.values(state.projects).map((data): SyncRecord => ({
      collection: "projects",
      id: data.id,
      data,
    })),
    ...Object.values(state.goals).map((data): SyncRecord => ({
      collection: "goals",
      id: data.id,
      data,
    })),
    ...Object.values(state.activity).map((data): SyncRecord => ({
      collection: "activity",
      id: data.id,
      data,
    })),
    ...Object.values(state.errors).map((data): SyncRecord => ({
      collection: "errors",
      id: data.id,
      data,
    })),
  ];
}

export function applyRecord(
  state: ProgressState,
  record: SyncRecord,
): ProgressState {
  if (record.id !== record.data.id)
    throw new Error("Cloud record ID does not match its payload.");
  const data: SyncEntity = record.data;
  if (
    record.collection === "settings" &&
    "timezone" in data &&
    "primaryTrack" in data
  )
    return { ...state, settings: data };
  if (record.collection === "lessons" && "manualCompletedAt" in data)
    return { ...state, lessons: { ...state.lessons, [record.id]: data } };
  if (record.collection === "projects" && "milestones" in data)
    return { ...state, projects: { ...state.projects, [record.id]: data } };
  if (record.collection === "goals" && "targetDate" in data)
    return { ...state, goals: { ...state.goals, [record.id]: data } };
  if (record.collection === "activity" && "at" in data)
    return { ...state, activity: { ...state.activity, [record.id]: data } };
  if (record.collection === "errors" && "questionId" in data)
    return { ...state, errors: { ...state.errors, [record.id]: data } };
  throw new Error(
    `Cloud record has an invalid shape for ${record.collection}.`,
  );
}

export function sameRecord(
  a: SyncRecord | undefined,
  b: SyncRecord | undefined,
): boolean {
  return sameValue(a, b);
}

export interface PendingConflict {
  key: string;
  local: SyncRecord;
  remote: SyncRecord | null;
}

export interface SyncJournal {
  version: 1;
  ownerId: string;
  stamps: Record<string, string>;
  pending: string[];
  conflicts: PendingConflict[];
}

export function emptyJournal(ownerId: string): SyncJournal {
  return { version: 1, ownerId, stamps: {}, pending: [], conflicts: [] };
}

export function reconcileRecords(
  state: ProgressState,
  journal: SyncJournal,
  remote: SyncRecord[],
): { state: ProgressState; journal: SyncJournal } {
  if (state.ownerId !== journal.ownerId)
    throw new Error("Sync journal belongs to another workspace.");
  let next = state;
  const updated: SyncJournal = {
    ...journal,
    stamps: { ...journal.stamps },
    pending: [...journal.pending],
    conflicts: [...journal.conflicts],
  };
  const local = new Map(
    recordsFromState(state).map((record) => [recordKey(record), record]),
  );
  for (const record of remote) {
    const key = recordKey(record);
    const mine = local.get(key);
    if (updated.pending.includes(key) && mine && !sameRecord(mine, record)) {
      if (record.data.updatedAt !== updated.stamps[key]) {
        updated.conflicts = [
          ...updated.conflicts.filter((conflict) => conflict.key !== key),
          { key, local: mine, remote: record },
        ];
      }
      continue;
    }
    next = applyRecord(next, record);
    updated.stamps[key] = record.data.updatedAt;
    updated.pending = updated.pending.filter((item) => item !== key);
    updated.conflicts = updated.conflicts.filter((item) => item.key !== key);
  }
  return { state: next, journal: updated };
}

export function recordChanges(
  before: ProgressState,
  after: ProgressState,
  journal: SyncJournal,
): SyncJournal {
  if (before.ownerId !== after.ownerId || journal.ownerId !== after.ownerId)
    throw new Error("A learning update cannot switch account ownership.");
  const previous = new Map(
    recordsFromState(before).map((record) => [recordKey(record), record]),
  );
  const pending = new Set(journal.pending);
  const conflicts = journal.conflicts.map((conflict) => ({ ...conflict }));
  recordsFromState(after).forEach((record) => {
    const key = recordKey(record);
    if (!sameRecord(previous.get(key), record)) {
      pending.add(key);
      const conflict = conflicts.find((item) => item.key === key);
      if (conflict) conflict.local = record;
    }
  });
  return { ...journal, pending: [...pending], conflicts };
}
