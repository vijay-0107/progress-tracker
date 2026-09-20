import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProgress, updateLesson } from "../src/domain/progress";
import {
  LEGACY_ACTIVE_USER_KEY,
  LEGACY_GLOBAL_PROFILE_ID,
  LEGACY_USERS_KEY,
  ProgressStorageError,
  backupStoragePrefix,
  importLegacyProfile,
  listLegacyProfiles,
  listProgressBackups,
  loadProgress,
  progressStorageKey,
  resetProgress,
  saveProgress,
} from "../src/domain/storage";
import type { OwnerId } from "../src/domain/types";

const NOW = "2026-06-30T12:00:00.000Z";

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();
  get length(): number {
    return this.values.size;
  }
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
  clear(): void {
    this.values.clear();
  }
}

function saved(
  storage: Storage,
  ownerId: OwnerId = "guest",
  note = "Existing notes",
) {
  const state = updateLesson(
    createProgress(ownerId, NOW),
    "lesson",
    { note },
    NOW,
  );
  saveProgress(storage, state);
  return state;
}

function legacyStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(
    LEGACY_USERS_KEY,
    JSON.stringify({
      first: {
        id: "first",
        name: "First local reader",
        pinHash: "local-pin-hash",
        weekdayTarget: 2,
      },
      second: {
        id: "second",
        name: "Second local reader",
        pinHash: "another-hash",
      },
      cloud: {
        id: "cloud",
        name: "Cached Alice",
        cloudUid: "alice",
        email: "alice@example.test",
      },
      foreign: { id: "foreign", name: "Cached Bob", cloudUid: "bob" },
    }),
  );
  storage.setItem(LEGACY_ACTIVE_USER_KEY, "cloud");
  storage.setItem("active-user-v1", "cloud");
  for (const id of ["first", "second", "cloud", "foreign"]) {
    storage.setItem(
      `progress-tracker-user-${id}-completions-v1`,
      JSON.stringify({
        [`${id}-old`]: true,
        [`${id}-dated`]: { completedAt: "2020-01-01T00:00:00.000Z" },
      }),
    );
    storage.setItem(
      `progress-tracker-user-${id}-notes-v1`,
      JSON.stringify({ [`${id}-old`]: `${id} old notes` }),
    );
    storage.setItem(
      `progress-tracker-user-${id}-review-v1`,
      JSON.stringify({ [`${id}-old`]: { dueAt: "2020-02-01", interval: 7 } }),
    );
  }
  return storage;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("isolated local persistence", () => {
  it("returns a new empty state without writing or selecting the active legacy/cloud user", () => {
    const storage = legacyStorage();
    const snapshot = new Map(storage.values);
    const state = loadProgress(storage, "guest");
    expect(state.ownerId).toBe("guest");
    expect(state.lessons).toEqual({});
    expect(state.activity).toEqual({});
    expect(state.legacy).toEqual({});
    expect(state.settings.displayName).toBe("");
    expect(storage.values).toEqual(snapshot);
  });

  it("round-trips states using exact, separate keys for every owner", () => {
    const storage = new MemoryStorage();
    const owners: OwnerId[] = [
      "guest",
      "uid:alice",
      "uid:bob",
      "local:alice",
      "local:a:b",
      "local:a%3Ab",
    ];
    const states = owners.map((owner) =>
      saved(storage, owner, `Private note for ${owner}`),
    );
    expect(new Set(owners.map(progressStorageKey)).size).toBe(owners.length);
    owners.forEach((owner, index) =>
      expect(loadProgress(storage, owner)).toEqual(states[index]),
    );
    expect([...storage.values.keys()]).toHaveLength(owners.length);
    expect(loadProgress(storage, "uid:unknown").lessons).toEqual({});
  });

  it("does not silently remap a state stored under another owner's key", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      progressStorageKey("guest"),
      JSON.stringify(createProgress("uid:alice", NOW)),
    );
    expect(() => loadProgress(storage, "guest")).toThrow(ProgressStorageError);
    expect(() => saved(storage)).toThrow(/invalid/i);
    expect(
      JSON.parse(storage.getItem(progressStorageKey("guest"))!).ownerId,
    ).toBe("uid:alice");
  });

  it("surfaces corrupt JSON and schema errors without overwriting or deleting data", () => {
    const storage = new MemoryStorage();
    const key = progressStorageKey("guest");
    for (const bad of ["{broken", "null", '{"schemaVersion":1}', ""]) {
      storage.setItem(key, bad);
      expect(() => loadProgress(storage, "guest")).toThrow(/invalid/i);
      expect(() => saveProgress(storage, createProgress("guest", NOW))).toThrow(
        /invalid/i,
      );
      expect(storage.getItem(key)).toBe(bad);
    }
  });

  it("surfaces denied reads instead of presenting an empty/reset account", () => {
    const storage = new MemoryStorage();
    vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new Error("Storage denied");
    });
    expect(() => loadProgress(storage, "guest")).toThrow(/could not be read/i);
    expect(() => saveProgress(storage, createProgress("guest", NOW))).toThrow(
      /could not be read/i,
    );
  });

  it("rejects unsafe/invalid owners before accessing storage", () => {
    const storage = new MemoryStorage();
    const spy = vi.spyOn(storage, "getItem");
    for (const owner of ["", "alice", "uid:", "local:", "uid:has space"]) {
      expect(() => loadProgress(storage, owner as OwnerId)).toThrow();
    }
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("storage failure and rollback", () => {
  it("keeps previous progress when storage quota fails atomically", () => {
    const storage = new MemoryStorage();
    const first = saved(storage);
    const previous = storage.getItem(progressStorageKey("guest"));
    vi.spyOn(storage, "setItem").mockImplementationOnce(() => {
      throw new DOMException("Quota full", "QuotaExceededError");
    });
    const next = updateLesson(first, "lesson", { note: "New note" }, NOW);
    expect(() => saveProgress(storage, next)).toThrow(
      /previous value was retained/i,
    );
    expect(storage.getItem(progressStorageKey("guest"))).toBe(previous);
    expect(loadProgress(storage, "guest")).toEqual(first);
  });

  it("rolls back a storage adapter that writes partially before throwing", () => {
    const storage = new MemoryStorage();
    const first = saved(storage);
    const previous = storage.getItem(progressStorageKey("guest"));
    let failed = false;
    vi.spyOn(storage, "setItem").mockImplementation((key, value) => {
      MemoryStorage.prototype.setItem.call(storage, key, value);
      if (!failed) {
        failed = true;
        throw new Error("Interrupted write");
      }
    });
    expect(() =>
      saveProgress(
        storage,
        updateLesson(first, "lesson", { note: "changed" }, NOW),
      ),
    ).toThrow(/previous value was retained/i);
    expect(storage.getItem(progressStorageKey("guest"))).toBe(previous);
  });

  it("removes a partially written first save when there was no previous value", () => {
    const storage = new MemoryStorage();
    vi.spyOn(storage, "setItem").mockImplementation((key, value) => {
      MemoryStorage.prototype.setItem.call(storage, key, value);
      throw new Error("Interrupted write");
    });
    expect(() => saveProgress(storage, createProgress("guest", NOW))).toThrow(
      /previous value was retained/i,
    );
    expect(storage.getItem(progressStorageKey("guest"))).toBeNull();
  });

  it("reports rollback failure distinctly instead of promising that data was restored", () => {
    const storage = new MemoryStorage();
    const first = saved(storage);
    let attempts = 0;
    vi.spyOn(storage, "setItem").mockImplementation((key, value) => {
      attempts += 1;
      if (attempts === 1)
        MemoryStorage.prototype.setItem.call(storage, key, value);
      throw new Error("Write unavailable");
    });
    try {
      saveProgress(
        storage,
        updateLesson(first, "lesson", { note: "changed" }, NOW),
      );
      expect.unreachable("The failed write must not appear successful.");
    } catch (error) {
      expect(error).toBeInstanceOf(ProgressStorageError);
      expect((error as ProgressStorageError).code).toBe("rollback");
      expect((error as ProgressStorageError).rollbackError).toBeInstanceOf(
        Error,
      );
      expect((error as Error).message).toMatch(/could not be restored/i);
    }
  });
});

describe("explicit reset with backups", () => {
  it("backs up exact bytes before resetting one owner while preserving others and all v1 keys", () => {
    const storage = legacyStorage();
    saved(storage, "guest");
    const other = saved(storage, "uid:alice");
    const key = progressStorageKey("guest");
    const previous = storage.getItem(key);
    const legacyBefore = [...storage.values].filter(([entry]) =>
      entry.endsWith("-v1"),
    );
    const writes: string[] = [];
    vi.spyOn(storage, "setItem").mockImplementation((writeKey, value) => {
      writes.push(writeKey);
      MemoryStorage.prototype.setItem.call(storage, writeKey, value);
    });
    const empty = resetProgress(storage, "guest", NOW);
    const backups = listProgressBackups(storage, "guest");
    expect(backups).toHaveLength(1);
    expect(storage.getItem(backups[0])).toBe(previous);
    expect(writes).toEqual([backups[0], key]);
    expect(empty.lessons).toEqual({});
    expect(loadProgress(storage, "guest")).toEqual(empty);
    expect(loadProgress(storage, "uid:alice")).toEqual(other);
    expect(
      [...storage.values].filter(([entry]) => entry.endsWith("-v1")),
    ).toEqual(legacyBefore);
  });

  it("backs up corrupt raw data and never clobbers same-timestamp backups", () => {
    const storage = new MemoryStorage();
    const key = progressStorageKey("guest");
    storage.setItem(key, "{bad data");
    resetProgress(storage, "guest", NOW);
    const first = listProgressBackups(storage, "guest")[0];
    expect(storage.getItem(first)).toBe("{bad data");
    resetProgress(storage, "guest", NOW);
    const backups = listProgressBackups(storage, "guest");
    expect(backups).toHaveLength(2);
    expect(storage.getItem(first)).toBe("{bad data");
    expect(listProgressBackups(storage, "uid:guest")).toEqual([]);
  });

  it("refuses to reset if the backup cannot be written", () => {
    const storage = new MemoryStorage();
    const first = saved(storage);
    const before = new Map(storage.values);
    vi.spyOn(storage, "setItem").mockImplementation((key, value) => {
      if (key.startsWith(backupStoragePrefix("guest")))
        throw new Error("Backup quota exceeded");
      MemoryStorage.prototype.setItem.call(storage, key, value);
    });
    expect(() => resetProgress(storage, "guest", NOW)).toThrow(
      /backup.*could not be saved/i,
    );
    expect(storage.values).toEqual(before);
    expect(loadProgress(storage, "guest")).toEqual(first);
  });

  it("retains the original and its backup when the reset write fails", () => {
    const storage = new MemoryStorage();
    saved(storage);
    const key = progressStorageKey("guest");
    const before = storage.getItem(key);
    vi.spyOn(storage, "setItem").mockImplementation((writeKey, value) => {
      if (writeKey === key) throw new Error("Reset quota exceeded");
      MemoryStorage.prototype.setItem.call(storage, writeKey, value);
    });
    expect(() => resetProgress(storage, "guest", NOW)).toThrow(
      /previous value was retained/i,
    );
    expect(storage.getItem(key)).toBe(before);
    const backup = listProgressBackups(storage, "guest")[0];
    expect(storage.getItem(backup)).toBe(before);
  });
});

describe("explicit legacy migration", () => {
  it("lists local profiles but never exposes cloud caches as guest-selectable accounts", () => {
    const storage = legacyStorage();
    expect(listLegacyProfiles(storage).map((profile) => profile.id)).toEqual([
      "first",
      "second",
    ]);
    expect(
      listLegacyProfiles(storage, "local:alice").map((profile) => profile.id),
    ).toEqual(["first", "second"]);
    expect(
      listLegacyProfiles(storage, "uid:alice").map((profile) => profile.id),
    ).toEqual(["first", "second", "cloud"]);
    expect(listLegacyProfiles(storage)[0]).not.toHaveProperty("pinHash");
    expect(storage.getItem(LEGACY_ACTIVE_USER_KEY)).toBe("cloud");
    expect(storage.getItem("active-user-v1")).toBe("cloud");
  });

  it("archives exactly the selected old profile, preserving original raw keys and destination settings", () => {
    const storage = legacyStorage();
    const before = new Map(storage.values);
    const destination = createProgress("guest", NOW);
    destination.settings.displayName = "New learner";
    const imported = importLegacyProfile(storage, destination, "second", NOW);
    expect(Object.keys(imported.legacy)).toEqual(["local-v1:second"]);
    const payload = imported.legacy["local-v1:second"].payload;
    expect(payload.completions).toEqual({
      "second-old": true,
      "second-dated": { completedAt: "2020-01-01T00:00:00.000Z" },
    });
    expect(payload.notes).toEqual({ "second-old": "second old notes" });
    expect(payload.review).toEqual({
      "second-old": { dueAt: "2020-02-01", interval: 7 },
    });
    expect(payload.profile).toEqual({
      id: "second",
      name: "Second local reader",
    });
    expect(imported.settings).toEqual(destination.settings);
    expect(imported.lessons).toEqual({});
    expect(imported.activity).toEqual({});
    expect(storage.values).toEqual(before);
    expect(importLegacyProfile(storage, imported, "second", NOW)).toBe(
      imported,
    );
  });

  it("requires an explicitly selected profile instead of guessing one from the active key", () => {
    const storage = legacyStorage();
    expect(() =>
      importLegacyProfile(storage, createProgress("guest", NOW), "", NOW),
    ).toThrow();
    expect(() =>
      importLegacyProfile(
        storage,
        createProgress("guest", NOW),
        "missing",
        NOW,
      ),
    ).toThrow(/select/i);
    expect(() =>
      importLegacyProfile(storage, createProgress("guest", NOW), "cloud", NOW),
    ).toThrow(/UID/i);
    expect(() =>
      importLegacyProfile(
        storage,
        createProgress("uid:bob", NOW),
        "cloud",
        NOW,
      ),
    ).toThrow(/UID/i);
  });

  it("allows only the authenticated user's own legacy cloud cache", () => {
    const storage = legacyStorage();
    const imported = importLegacyProfile(
      storage,
      createProgress("uid:alice", NOW),
      "cloud",
      NOW,
    );
    expect(imported.legacy["cloud-v1:cloud"].source).toBe("cloud-v1");
    expect(imported.legacy["cloud-v1:cloud"].payload.profile).toMatchObject({
      cloudUid: "alice",
    });
    expect(imported.activity).toEqual({});
    saveProgress(storage, imported);
    expect(loadProgress(storage, "uid:alice")).toEqual(imported);
    expect(loadProgress(storage, "guest").legacy).toEqual({});
  });

  it("preserves unassigned global legacy data until explicitly archived", () => {
    const storage = new MemoryStorage();
    storage.setItem("progress-tracker-completion-v1", '{"old-day":true}');
    storage.setItem("progress-tracker-notes-v1", '{"old-day":"Old notes"}');
    const state = loadProgress(storage, "guest");
    expect(state.legacy).toEqual({});
    expect(listLegacyProfiles(storage).map((profile) => profile.id)).toEqual([
      LEGACY_GLOBAL_PROFILE_ID,
    ]);
    const next = importLegacyProfile(
      storage,
      state,
      LEGACY_GLOBAL_PROFILE_ID,
      NOW,
    );
    expect(Object.values(next.legacy)[0].payload).toEqual({
      completions: { "old-day": true },
      notes: { "old-day": "Old notes" },
      review: {},
    });
    expect(next.lessons).toEqual({});
    expect(next.activity).toEqual({});
    expect(storage.getItem("progress-tracker-completion-v1")).toBe(
      '{"old-day":true}',
    );
  });

  it("surfaces malformed legacy data without replacing it with empty progress", () => {
    const storage = legacyStorage();
    storage.setItem("progress-tracker-user-first-notes-v1", "{broken");
    const before = new Map(storage.values);
    expect(() =>
      importLegacyProfile(storage, createProgress("guest", NOW), "first", NOW),
    ).toThrow(/legacy data is invalid/i);
    expect(storage.values).toEqual(before);
    storage.setItem(
      LEGACY_USERS_KEY,
      '{"first":{"id":"first","cloudUid":false}}',
    );
    expect(() => listLegacyProfiles(storage)).toThrow(
      /profile index is invalid/i,
    );
  });
});
