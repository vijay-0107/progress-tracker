import type { OwnerId, ProgressState } from "./types";
import {
  archiveLegacy,
  createProgress,
  exportProgress,
  parseImport,
  sanitizeLegacyPayload,
} from "./progress";
import {
  MAX_JSON_LENGTH,
  ProgressValidationError,
  idSchema,
  ownerIdSchema,
  timestamp,
} from "./validation";

export const LEGACY_USERS_KEY = "progress-tracker-users-v1";
export const LEGACY_ACTIVE_USER_KEY = "progress-tracker-active-user-v1";
export const LEGACY_GLOBAL_PROFILE_ID = "legacy:global";
const GLOBAL_KEYS = {
  completions: "progress-tracker-completion-v1",
  notes: "progress-tracker-notes-v1",
  review: "progress-tracker-review-v1",
} as const;

export type StorageErrorCode =
  "read" | "corrupt" | "write" | "backup" | "rollback";

export class ProgressStorageError extends Error {
  constructor(
    public readonly code: StorageErrorCode,
    message: string,
    public readonly key: string,
    public readonly originalError?: unknown,
    public readonly rollbackError?: unknown,
  ) {
    super(message);
    this.name = "ProgressStorageError";
  }
}

export function progressStorageKey(ownerId: OwnerId): string {
  ownerIdSchema.parse(ownerId);
  return `progress-tracker-progress-v2:${encodeURIComponent(ownerId)}`;
}

export function backupStoragePrefix(ownerId: OwnerId): string {
  return `${progressStorageKey(ownerId)}:backup:`;
}

function read(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch (error) {
    throw new ProgressStorageError(
      "read",
      "Browser storage could not be read. Existing data was not reset.",
      key,
      error,
    );
  }
}

function parseSaved(
  text: string,
  ownerId: OwnerId,
  key: string,
): ProgressState {
  try {
    return parseImport(text, ownerId);
  } catch (error) {
    throw new ProgressStorageError(
      "corrupt",
      "Saved progress is invalid. Export or back it up before an explicit reset.",
      key,
      error,
    );
  }
}

function writeWithRollback(
  storage: Storage,
  key: string,
  value: string,
  previous: string | null,
  code: "write" | "backup",
): void {
  try {
    storage.setItem(key, value);
    if (storage.getItem(key) !== value)
      throw new Error("Storage did not retain the complete write.");
  } catch (error) {
    let rollbackError: unknown;
    try {
      let needsRollback = true;
      try {
        needsRollback = storage.getItem(key) !== previous;
      } catch {
        /* A failed read cannot prove the write was atomic. */
      }
      if (needsRollback) {
        if (previous === null) storage.removeItem(key);
        else storage.setItem(key, previous);
        if (storage.getItem(key) !== previous)
          throw new Error("Could not verify the restored storage value.");
      }
    } catch (failure) {
      rollbackError = failure;
    }
    throw new ProgressStorageError(
      rollbackError ? "rollback" : code,
      rollbackError
        ? "Saving failed and the previous value could not be restored. Do not reset; recover from a backup."
        : code === "backup"
          ? "The backup could not be saved; progress was not reset. Browser storage may be full."
          : "Progress could not be saved; the previous value was retained. Browser storage may be full.",
      key,
      error,
      rollbackError,
    );
  }
}

/** Never reads a remembered account or imports legacy data implicitly. */
export function loadProgress(
  storage: Storage,
  ownerId: OwnerId,
): ProgressState {
  const key = progressStorageKey(ownerId);
  const text = read(storage, key);
  return text === null
    ? createProgress(ownerId)
    : parseSaved(text, ownerId, key);
}

export function saveProgress(storage: Storage, state: ProgressState): void {
  const key = progressStorageKey(state.ownerId);
  const serialized = exportProgress(state);
  const previous = read(storage, key);
  if (previous !== null) parseSaved(previous, state.ownerId, key);
  writeWithRollback(storage, key, serialized, previous, "write");
}

/** Backs up the exact old bytes, including corrupt data, before replacing this owner only. */
export function resetProgress(
  storage: Storage,
  ownerId: OwnerId,
  now?: string,
): ProgressState {
  const at = timestamp(now);
  const key = progressStorageKey(ownerId);
  const previous = read(storage, key);
  const state = createProgress(ownerId, at);
  const serialized = exportProgress(state);
  if (previous !== null) {
    const base = `${backupStoragePrefix(ownerId)}${encodeURIComponent(at)}`;
    let backupKey = base;
    let suffix = 0;
    while (read(storage, backupKey) !== null) {
      suffix += 1;
      if (suffix >= 10_000)
        throw new ProgressStorageError(
          "backup",
          "Too many backups share this timestamp.",
          base,
        );
      backupKey = `${base}:${suffix}`;
    }
    writeWithRollback(storage, backupKey, previous, null, "backup");
  }
  writeWithRollback(storage, key, serialized, previous, "write");
  return state;
}

export function listProgressBackups(
  storage: Storage,
  ownerId: OwnerId,
): string[] {
  const prefix = backupStoragePrefix(ownerId);
  const keys: string[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
  } catch (error) {
    throw new ProgressStorageError(
      "read",
      "Progress backups could not be listed.",
      prefix,
      error,
    );
  }
  return keys.sort();
}

export interface LegacyProfile {
  id: string;
  name: string;
  source: "local-v1" | "cloud-v1";
  cloudUid: string | null;
  global: boolean;
}

function legacyObject(storage: Storage, key: string): Record<string, unknown> {
  const text = read(storage, key);
  if (text === null) return {};
  try {
    if (text.length > MAX_JSON_LENGTH)
      throw new ProgressValidationError("Legacy data exceeds the size limit.");
    return sanitizeLegacyPayload(JSON.parse(text) as unknown);
  } catch (error) {
    throw new ProgressStorageError(
      "corrupt",
      "Legacy data is invalid and was left untouched.",
      key,
      error,
    );
  }
}

function legacyProfile(id: string, value: unknown): LegacyProfile {
  idSchema.parse(id);
  if (id === LEGACY_GLOBAL_PROFILE_ID)
    throw new ProgressValidationError("Reserved legacy profile ID.");
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProgressValidationError("Invalid legacy profile.");
  }
  const profile = value as Record<string, unknown>;
  if (profile.id !== undefined && profile.id !== id)
    throw new ProgressValidationError(
      "Legacy profile ID does not match its key.",
    );
  const uid = profile.cloudUid;
  if (uid !== undefined && uid !== null && (typeof uid !== "string" || !uid)) {
    throw new ProgressValidationError("Invalid legacy cloud identity.");
  }
  if (typeof uid === "string") ownerIdSchema.parse(`uid:${uid}`);
  const name = profile.name;
  if (name !== undefined && (typeof name !== "string" || name.length > 200)) {
    throw new ProgressValidationError("Invalid legacy profile name.");
  }
  return {
    id,
    name: typeof name === "string" && name.trim() ? name : id,
    source: typeof uid === "string" ? "cloud-v1" : "local-v1",
    cloudUid: typeof uid === "string" ? uid : null,
    global: false,
  };
}

/** Only explicitly selectable local profiles and the authenticated owner's cloud cache. */
export function listLegacyProfiles(
  storage: Storage,
  ownerId: OwnerId = "guest",
): LegacyProfile[] {
  ownerIdSchema.parse(ownerId);
  const users = legacyObject(storage, LEGACY_USERS_KEY);
  const profiles: LegacyProfile[] = [];
  try {
    for (const [id, value] of Object.entries(users)) {
      const profile = legacyProfile(id, value);
      if (profile.cloudUid === null || ownerId === `uid:${profile.cloudUid}`)
        profiles.push(profile);
    }
  } catch (error) {
    throw new ProgressStorageError(
      "corrupt",
      "The legacy profile index is invalid and was left untouched.",
      LEGACY_USERS_KEY,
      error,
    );
  }
  if (Object.values(GLOBAL_KEYS).some((key) => read(storage, key) !== null)) {
    profiles.push({
      id: LEGACY_GLOBAL_PROFILE_ID,
      name: "Unassigned legacy data",
      source: "local-v1",
      cloudUid: null,
      global: true,
    });
  }
  return profiles;
}

function legacyUserKey(id: string, scope: keyof typeof GLOBAL_KEYS): string {
  return `progress-tracker-user-${id}-${scope}-v1`;
}

/** Archives the selected profile only; never maps obsolete day IDs to new lesson credit. */
export function importLegacyProfile(
  storage: Storage,
  state: ProgressState,
  profileId: string,
  now?: string,
): ProgressState {
  idSchema.parse(profileId);
  const selected = listLegacyProfiles(storage, state.ownerId).find(
    (profile) => profile.id === profileId,
  );
  if (!selected)
    throw new ProgressValidationError(
      "Select an available legacy profile; cloud caches require their own authenticated UID.",
    );
  let payload: Record<string, unknown>;
  if (selected.global) {
    payload = {
      completions: legacyObject(storage, GLOBAL_KEYS.completions),
      notes: legacyObject(storage, GLOBAL_KEYS.notes),
      review: legacyObject(storage, GLOBAL_KEYS.review),
    };
  } else {
    const users = legacyObject(storage, LEGACY_USERS_KEY);
    const current = legacyProfile(profileId, users[profileId]);
    if (current.cloudUid !== selected.cloudUid)
      throw new ProgressValidationError(
        "The selected legacy identity changed; select it again.",
      );
    payload = {
      profile: users[profileId],
      completions: legacyObject(
        storage,
        legacyUserKey(profileId, "completions"),
      ),
      notes: legacyObject(storage, legacyUserKey(profileId, "notes")),
      review: legacyObject(storage, legacyUserKey(profileId, "review")),
    };
  }
  return archiveLegacy(
    state,
    {
      id: `${selected.source}:${encodeURIComponent(profileId)}`,
      name: selected.name,
      source: selected.source,
      payload,
      ...(selected.cloudUid ? { ownerUid: selected.cloudUid } : {}),
    },
    now,
  );
}
