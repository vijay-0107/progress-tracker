import { useCallback, useEffect, useRef, useState } from "react";
import {
  archiveLegacy,
  createProgress,
  exportProgress,
  importLegacyExport,
  mergeImport,
} from "../domain/progress";
import {
  importLegacyProfile,
  listLegacyProfiles,
  loadProgress,
  resetProgress,
  saveProgress,
} from "../domain/storage";
import { validateProgressState } from "../domain/validation";
import type { OwnerId, ProgressState, SyncRecord } from "../domain/types";
import type { CloudClient, CloudUser } from "../services/firebase";
import type { SyncConflictError } from "../services/sync";
import {
  applyRecord,
  emptyJournal,
  reconcileRecords,
  recordChanges,
  recordKey,
  recordsFromState,
  sameRecord,
  type SyncJournal,
} from "./records";

type SyncStatus =
  "local" | "loading" | "queued" | "saving" | "synced" | "conflict" | "error";

const journalKey = (ownerId: OwnerId) =>
  `progress-tracker-sync-v2:${encodeURIComponent(ownerId)}`;
const message = (error: unknown) => {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const known: Record<string, string> = {
    "auth/unauthorized-domain":
      "This hostname is not authorized in Firebase Auth. Check localhost, 127.0.0.1 and the actual Pages hostname in the existing project's authorized domains.",
    "auth/popup-blocked":
      "Your browser blocked the Google sign-in popup. Allow popups for this site or use email sign-in.",
    "auth/popup-closed-by-user":
      "Google sign-in was closed before authentication finished. Try again or use email sign-in.",
    "auth/email-already-in-use":
      "This email already has an account. Choose Sign in or Reset password; no replacement account was created.",
    "auth/invalid-credential":
      "The email/password combination was not accepted. Check it or request a password reset.",
    "auth/network-request-failed":
      "Authentication could not reach Firebase. Check your connection and retry.",
    "permission-denied":
      "Firestore denied this account's request. Confirm the version-2 UID-owned rules are published in the existing project, then retry. Do not loosen cross-user permissions.",
    "resource-exhausted":
      "The database's current quota was reached. Keep your local export and retry later; no billing upgrade is required.",
  };
  return (
    known[code] ||
    (error instanceof Error
      ? error.message
      : "An unexpected operation failed. Your saved data has not been intentionally changed.")
  );
};
const isSyncConflict = (error: unknown): error is SyncConflictError =>
  error instanceof Error &&
  "code" in error &&
  error.code === "sync/conflict" &&
  "conflicts" in error &&
  Array.isArray(error.conflicts);

function loadJournal(ownerId: OwnerId): SyncJournal {
  const text = localStorage.getItem(journalKey(ownerId));
  if (!text) return emptyJournal(ownerId);
  const parsed: unknown = JSON.parse(text);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("version" in parsed) ||
    parsed.version !== 1 ||
    !("ownerId" in parsed) ||
    parsed.ownerId !== ownerId ||
    !("stamps" in parsed) ||
    !parsed.stamps ||
    typeof parsed.stamps !== "object" ||
    !Object.values(parsed.stamps).every((value) => typeof value === "string") ||
    !("pending" in parsed) ||
    !Array.isArray(parsed.pending) ||
    !parsed.pending.every((value) => typeof value === "string") ||
    !("conflicts" in parsed) ||
    !Array.isArray(parsed.conflicts)
  )
    throw new Error(
      "Your saved cloud-sync journal is invalid. Export your learning records before restoring this browser's sync state.",
    );
  return parsed as SyncJournal;
}

function saveBundle(state: ProgressState, journal: SyncJournal) {
  const key = journalKey(state.ownerId);
  const previous = localStorage.getItem(key);
  localStorage.setItem(key, JSON.stringify(journal));
  try {
    saveProgress(localStorage, state);
  } catch (error) {
    try {
      if (previous === null) localStorage.removeItem(key);
      else localStorage.setItem(key, previous);
    } catch (rollback) {
      throw new Error(
        `Progress was not saved and its sync journal could not be restored. Export your open workspace now. ${message(rollback)}`,
        { cause: error },
      );
    }
    throw error;
  }
}

export function downloadJson(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useWorkspace() {
  const [state, setState] = useState(() => loadProgress(localStorage, "guest"));
  const stateRef = useRef(state);
  const journalRef = useRef<SyncJournal>(emptyJournal("guest"));
  const [journal, setJournal] = useState(journalRef.current);
  const [user, setUser] = useState<CloudUser | null>(null);
  const [client, setClient] = useState<CloudClient | null>(null);
  const clientRef = useRef<CloudClient | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(true);
  const readyRef = useRef(true);
  const generation = useRef(0);
  const stopWatching = useRef<(() => void) | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const inFlightRecords = useRef(new Map<string, SyncRecord>());
  const inFlightOwner = useRef<OwnerId | null>(null);
  const [revision, setRevision] = useState(0);

  const notify = useCallback((text: string) => setNotice(text), []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const publish = useCallback(
    (next: ProgressState, nextJournal: SyncJournal, persist = true) => {
      if (persist) saveBundle(next, nextJournal);
      stateRef.current = next;
      journalRef.current = nextJournal;
      setState(next);
      setJournal(nextJournal);
      setRevision((value) => value + 1);
    },
    [],
  );

  const statusFor = (nextJournal: SyncJournal): SyncStatus =>
    nextJournal.conflicts.length
      ? "conflict"
      : nextJournal.pending.length
        ? "queued"
        : "synced";

  const acceptRemote = useCallback(
    (uid: string, token: number, records: SyncRecord[]) => {
      if (
        generation.current !== token ||
        stateRef.current.ownerId !== `uid:${uid}`
      )
        return;
      try {
        const acknowledged = {
          ...journalRef.current,
          stamps: { ...journalRef.current.stamps },
        };
        records.forEach((record) => {
          const key = recordKey(record);
          if (
            inFlightOwner.current === stateRef.current.ownerId &&
            sameRecord(inFlightRecords.current.get(key), record)
          )
            acknowledged.stamps[key] = record.data.updatedAt;
        });
        const reconciled = reconcileRecords(
          stateRef.current,
          acknowledged,
          records,
        );
        publish(reconciled.state, reconciled.journal);
        setSyncStatus(statusFor(reconciled.journal));
      } catch (failure) {
        setError(message(failure));
        setSyncStatus("error");
      }
    },
    [publish],
  );

  const openAccount = useCallback(
    async (currentUser: CloudUser | null, cloud: CloudClient) => {
      const token = ++generation.current;
      stopWatching.current?.();
      stopWatching.current = null;
      readyRef.current = false;
      setReady(false);
      setError("");
      setUser(currentUser);
      const ownerId: OwnerId = currentUser ? `uid:${currentUser.uid}` : "guest";
      publish(createProgress(ownerId), emptyJournal(ownerId), false);
      let cacheLoaded = false;
      try {
        const local = loadProgress(localStorage, ownerId);
        const storedJournal = currentUser
          ? loadJournal(ownerId)
          : emptyJournal(ownerId);
        publish(local, storedJournal, false);
        cacheLoaded = true;
        if (!currentUser) {
          setSyncStatus("local");
          return;
        }
        setSyncStatus("loading");
        const remote = await cloud.loadRecords(currentUser.uid);
        if (generation.current !== token) return;
        const remoteKeys = new Set(remote.map(recordKey));
        const localRecords = recordsFromState(stateRef.current);
        const nextJournal = {
          ...journalRef.current,
          stamps: { ...journalRef.current.stamps },
          pending: [...journalRef.current.pending],
        };
        // A server-side reset removes acknowledged records; unsynced edits remain explicit conflicts.
        let nextState = stateRef.current;
        for (const record of localRecords) {
          const key = recordKey(record);
          if (remoteKeys.has(key) || !nextJournal.stamps[key]) continue;
          if (nextJournal.pending.includes(key)) {
            nextJournal.conflicts = [
              ...nextJournal.conflicts.filter((item) => item.key !== key),
              { key, local: record, remote: null },
            ];
          } else if (record.collection !== "settings") {
            const entries = { ...nextState[record.collection] };
            delete entries[record.id];
            nextState = { ...nextState, [record.collection]: entries };
            delete nextJournal.stamps[key];
          }
        }
        publish(nextState, nextJournal);
        acceptRemote(currentUser.uid, token, remote);
        if (
          !remoteKeys.has("settings/settings") &&
          !journalRef.current.pending.includes("settings/settings")
        ) {
          const settings = {
            ...stateRef.current.settings,
            displayName:
              currentUser.displayName || stateRef.current.settings.displayName,
            updatedAt: new Date().toISOString(),
          };
          const next = { ...stateRef.current, settings };
          publish(next, {
            ...journalRef.current,
            pending: [...journalRef.current.pending, "settings/settings"],
          });
        }
        stopWatching.current = cloud.watchRecords(
          currentUser.uid,
          (records) => acceptRemote(currentUser.uid, token, records),
          (failure) => {
            if (generation.current !== token) return;
            setError(
              `${message(failure)} Use Retry sync after checking your connection and account permissions.`,
            );
            setSyncStatus("error");
          },
        );
        setSyncStatus(statusFor(journalRef.current));
      } catch (failure) {
        if (generation.current !== token) return;
        setError(
          `${message(failure)} Local work remains private to this workspace. Retry when the connection or Firestore rules are ready.`,
        );
        setSyncStatus("error");
      } finally {
        if (generation.current === token) {
          readyRef.current = cacheLoaded;
          setReady(cacheLoaded);
        }
      }
    },
    [acceptRemote, publish],
  );

  useEffect(() => {
    let disposed = false;
    let initialized: CloudClient | null = null;
    let earlyUser: CloudUser | null = null;
    let sawEarlyUser = false;
    import("../services/firebase")
      .then(({ initializeCloud }) =>
        initializeCloud(
          (currentUser) => {
            if (disposed) return;
            if (!initialized) {
              earlyUser = currentUser;
              sawEarlyUser = true;
              return;
            }
            void openAccount(currentUser, initialized);
          },
          (failure) => {
            if (!disposed) {
              setError(message(failure));
              setSyncStatus("error");
            }
          },
        ),
      )
      .then((cloud) => {
        if (disposed) {
          cloud.dispose();
          return;
        }
        initialized = cloud;
        clientRef.current = cloud;
        setClient(cloud);
        if (sawEarlyUser) void openAccount(earlyUser, cloud);
      })
      .catch((failure: unknown) => {
        if (!disposed) {
          setError(
            `Cloud initialization failed: ${message(failure)} Guest work is still available.`,
          );
          setSyncStatus("error");
        }
      });
    return () => {
      disposed = true;
      generation.current++;
      stopWatching.current?.();
      initialized?.dispose();
    };
  }, [openAccount]);

  const mutate = useCallback(
    (recipe: (current: ProgressState) => ProgressState): boolean => {
      if (stateRef.current.ownerId !== state.ownerId) {
        setError(
          "The account changed before this draft could be saved. Reopen the current workspace; no data was reassigned.",
        );
        return false;
      }
      if (!readyRef.current) {
        notify(
          "The account workspace is loading. Please wait before changing progress.",
        );
        return false;
      }
      try {
        const before = stateRef.current;
        let next = recipe(before);
        if (before.ownerId !== next.ownerId)
          throw new Error("A learning update cannot change account ownership.");
        const previous = new Map(
          recordsFromState(before).map((record) => [recordKey(record), record]),
        );
        for (const record of recordsFromState(next)) {
          const key = recordKey(record);
          if (sameRecord(previous.get(key), record)) continue;
          const minimum = Math.max(
            Date.parse(previous.get(key)?.data.updatedAt || "") || 0,
            Date.parse(journalRef.current.stamps[key] || "") || 0,
          );
          if (Date.parse(record.data.updatedAt) <= minimum)
            next = applyRecord(next, {
              ...record,
              data: {
                ...record.data,
                updatedAt: new Date(
                  Math.max(Date.now(), minimum + 1),
                ).toISOString(),
              },
            });
        }
        next = validateProgressState(next);
        const nextJournal = next.ownerId.startsWith("uid:")
          ? recordChanges(before, next, journalRef.current)
          : emptyJournal(next.ownerId);
        publish(next, nextJournal);
        if (next.ownerId.startsWith("uid:"))
          setSyncStatus(statusFor(nextJournal));
        else setSyncStatus("local");
        return true;
      } catch (failure) {
        setError(message(failure));
        return false;
      }
    },
    [notify, publish, state.ownerId],
  );

  const flush = useCallback(async () => {
    const cloud = clientRef.current;
    const currentUser = cloud?.getUser();
    if (
      !cloud ||
      !currentUser ||
      !readyRef.current ||
      inFlight.current ||
      stateRef.current.ownerId !== `uid:${currentUser.uid}`
    )
      return;
    const token = generation.current;
    const pending = new Set(journalRef.current.pending);
    const conflictKeys = new Set(
      journalRef.current.conflicts.map((conflict) => conflict.key),
    );
    const changes = recordsFromState(stateRef.current)
      .filter(
        (record) =>
          pending.has(recordKey(record)) &&
          !conflictKeys.has(recordKey(record)),
      )
      .slice(0, 100)
      .map((record) => ({
        record,
        expectedUpdatedAt: journalRef.current.stamps[recordKey(record)] || null,
      }));
    if (!changes.length) return;
    inFlightRecords.current = new Map(
      changes.map(({ record }) => [recordKey(record), record]),
    );
    inFlightOwner.current = stateRef.current.ownerId;
    setSyncStatus("saving");
    const operation = (async () => {
      try {
        await cloud.commitRecords(currentUser.uid, changes);
        if (generation.current !== token) return;
        const currentRecords = new Map(
          recordsFromState(stateRef.current).map((record) => [
            recordKey(record),
            record,
          ]),
        );
        const nextJournal = {
          ...journalRef.current,
          stamps: { ...journalRef.current.stamps },
          pending: [...journalRef.current.pending],
        };
        changes.forEach(({ record }) => {
          const key = recordKey(record);
          nextJournal.stamps[key] = record.data.updatedAt;
          if (sameRecord(currentRecords.get(key), record))
            nextJournal.pending = nextJournal.pending.filter(
              (item) => item !== key,
            );
        });
        publish(stateRef.current, nextJournal);
        setSyncStatus(statusFor(nextJournal));
        setError("");
      } catch (failure) {
        if (generation.current !== token) return;
        if (isSyncConflict(failure)) {
          const currentRecords = new Map(
            recordsFromState(stateRef.current).map((record) => [
              recordKey(record),
              record,
            ]),
          );
          const conflicts = failure.conflicts.flatMap((conflict) => {
            const key = recordKey(conflict);
            const local = currentRecords.get(key);
            return local ? [{ key, local, remote: conflict.remote }] : [];
          });
          const nextJournal = {
            ...journalRef.current,
            conflicts: [
              ...journalRef.current.conflicts.filter(
                (item) =>
                  !conflicts.some((conflict) => conflict.key === item.key),
              ),
              ...conflicts,
            ],
          };
          publish(stateRef.current, nextJournal);
          setSyncStatus("conflict");
          setError(
            "Another device changed the same records. Review both versions in Settings; nothing has been silently overwritten.",
          );
        } else {
          setError(
            `Cloud sync failed: ${message(failure)} Your edits remain queued locally for this account. Use Retry sync.`,
          );
          setSyncStatus("error");
        }
      } finally {
        inFlight.current = null;
        inFlightRecords.current = new Map();
        inFlightOwner.current = null;
        setRevision((value) => value + 1);
      }
    })();
    inFlight.current = operation;
    await operation;
  }, [publish]);

  useEffect(() => {
    if (
      !ready ||
      syncStatus === "error" ||
      syncStatus === "loading" ||
      !journal.pending.length
    )
      return;
    const timer = window.setTimeout(() => {
      void flush();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [revision, ready, syncStatus, journal.pending.length, flush]);

  useEffect(() => {
    const offline = () => {
      if (stateRef.current.ownerId.startsWith("uid:")) {
        setSyncStatus("error");
        setError(
          "You are offline. Your account's edits are saved on this browser; retry sync when you reconnect.",
        );
      }
    };
    window.addEventListener("offline", offline);
    return () => window.removeEventListener("offline", offline);
  }, []);

  const runCloud = async (
    action: (cloud: CloudClient) => Promise<unknown>,
    success?: string,
  ) => {
    if (!clientRef.current) {
      setError("Cloud authentication is still initializing.");
      return false;
    }
    setBusy(true);
    setError("");
    try {
      await action(clientRef.current);
      if (success) notify(success);
      return true;
    } catch (failure) {
      setError(message(failure));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const retrySync = async () => {
    const cloud = clientRef.current;
    if (!cloud) return;
    await openAccount(cloud.getUser(), cloud);
  };

  const resolveConflict = (key: string, choice: "local" | "remote") => {
    if (stateRef.current.ownerId !== state.ownerId) {
      setError(
        "The account changed. Reopen the current workspace before resolving a conflict.",
      );
      return;
    }
    const conflict = journalRef.current.conflicts.find(
      (item) => item.key === key,
    );
    if (!conflict) return;
    if (
      choice === "local" &&
      conflict.local.collection === "activity" &&
      conflict.remote
    ) {
      setError(
        "Recorded activity is immutable. Keep the server's first recorded event; the local version can be retained in a private export.",
      );
      return;
    }
    try {
      const backupKey = `${journalKey(stateRef.current.ownerId)}:conflict:${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(conflict));
      let next = stateRef.current;
      const nextJournal = {
        ...journalRef.current,
        stamps: { ...journalRef.current.stamps },
        pending: [...journalRef.current.pending],
        conflicts: journalRef.current.conflicts.filter(
          (item) => item.key !== key,
        ),
      };
      if (conflict.remote)
        nextJournal.stamps[key] = conflict.remote.data.updatedAt;
      else delete nextJournal.stamps[key];
      if (choice === "remote") {
        if (conflict.remote) next = applyRecord(next, conflict.remote);
        else if (conflict.local.collection !== "settings") {
          const entries = { ...next[conflict.local.collection] };
          delete entries[conflict.local.id];
          next = { ...next, [conflict.local.collection]: entries };
        }
        nextJournal.pending = nextJournal.pending.filter(
          (item) => item !== key,
        );
      } else {
        const time = new Date(
          Math.max(
            Date.now(),
            Date.parse(conflict.remote?.data.updatedAt || "") + 1 || 0,
          ),
        ).toISOString();
        next = applyRecord(next, {
          ...conflict.local,
          data: { ...conflict.local.data, updatedAt: time },
        });
      }
      publish(next, nextJournal);
      setError("");
      setSyncStatus(statusFor(nextJournal));
      notify(
        "Conflict resolved explicitly. Both versions were backed up on this browser.",
      );
    } catch (failure) {
      setError(message(failure));
    }
  };

  const importText = (
    text: string,
    crossOwner: boolean,
    expectedOwner: OwnerId = state.ownerId,
  ) => {
    if (stateRef.current.ownerId !== expectedOwner) {
      setError(
        "The account changed while reading the import file. Select it again in the intended workspace; nothing was imported.",
      );
      return false;
    }
    let summary = "";
    const success = mutate((current) => {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === "object" && "schemaVersion" in parsed) {
        const result = mergeImport(current, text, {
          allowCrossOwner: crossOwner,
        });
        summary = result.conflicts.length
          ? `Imported new records. ${result.conflicts.length} differing existing records (including settings) were kept unchanged; no overwrite was performed. Keep the source export to compare these versions.`
          : "Progress imported without overwriting existing records.";
        return result.state;
      }
      summary = "Original export preserved as a distinct legacy archive.";
      return importLegacyExport(current, text);
    });
    if (success) notify(summary);
    return success;
  };

  const importGuest = () => {
    if (!stateRef.current.ownerId.startsWith("uid:")) return;
    try {
      importText(exportProgress(loadProgress(localStorage, "guest")), true);
    } catch (failure) {
      setError(message(failure));
    }
  };
  const importLocalLegacy = (id: string) => {
    if (mutate((current) => importLegacyProfile(localStorage, current, id)))
      notify(
        "Selected learning history archived; original keys were left untouched.",
      );
  };
  const importCloudLegacy = () =>
    runCloud(async (cloud) => {
      const account = cloud.getUser();
      if (!account)
        throw new Error("Sign in to read your own original Firestore profile.");
      const token = generation.current;
      const payload = await cloud.loadLegacyProfile(account.uid);
      if (
        token !== generation.current ||
        stateRef.current.ownerId !== `uid:${account.uid}`
      )
        throw new Error("Account changed before the legacy import finished.");
      if (!payload) {
        notify("No original Firestore profile exists for this account.");
        return;
      }
      if (
        mutate((current) =>
          archiveLegacy(current, {
            id: `cloud-v1:${account.uid}`,
            name: account.displayName || "Original cloud learning history",
            source: "cloud-v1",
            ownerUid: account.uid,
            payload,
          }),
        )
      )
        notify(
          "Original cloud history archived for this UID only. Its Firestore document is unchanged.",
        );
    });

  const resetWorkspace = async () => {
    const ownerId = state.ownerId;
    const token = generation.current;
    if (stateRef.current.ownerId !== ownerId) {
      setError("The account changed before reset. No reset was started.");
      return;
    }
    setBusy(true);
    readyRef.current = false;
    setReady(false);
    try {
      await inFlight.current;
      if (generation.current !== token || stateRef.current.ownerId !== ownerId)
        throw new Error("The account changed; reset was cancelled.");
      const preferences = stateRef.current.settings;
      const cloud = clientRef.current;
      if (ownerId.startsWith("uid:")) {
        if (!cloud || cloud.getUser()?.uid !== ownerId.slice(4))
          throw new Error(
            "Sign in to this account before resetting its cloud progress.",
          );
        stopWatching.current?.();
        stopWatching.current = null;
        const records = (await cloud.loadRecords(ownerId.slice(4))).filter(
          (record) => record.collection !== "settings",
        );
        if (
          generation.current !== token ||
          stateRef.current.ownerId !== ownerId
        )
          throw new Error("The account changed; reset was cancelled.");
        downloadJson(
          `progress-backup-before-reset-${new Date().toISOString().slice(0, 10)}.json`,
          exportProgress(stateRef.current),
        );
        for (let index = 0; index < records.length; index += 100) {
          await cloud.deleteRecords(
            ownerId.slice(4),
            records.slice(index, index + 100).map((record) => ({
              collection: record.collection,
              id: record.id,
              expectedUpdatedAt: record.data.updatedAt,
            })),
          );
        }
      }
      if (generation.current !== token || stateRef.current.ownerId !== ownerId)
        throw new Error(
          "The account changed before local reset. Reopen the current account to check server state.",
        );
      const fresh = {
        ...resetProgress(localStorage, ownerId),
        settings: preferences,
      };
      publish(fresh, emptyJournal(ownerId));
      if (cloud && ownerId.startsWith("uid:"))
        await openAccount(cloud.getUser(), cloud);
      else setSyncStatus("local");
      notify(
        "Current progress reset after a local backup. Original legacy storage and Firestore profiles were not deleted.",
      );
    } catch (failure) {
      setError(
        `Reset did not finish: ${message(failure)} Retry sync before making further changes.`,
      );
      setSyncStatus("error");
    } finally {
      if (stateRef.current.ownerId === ownerId) {
        readyRef.current = true;
        setReady(true);
      }
      setBusy(false);
    }
  };

  let legacyProfiles: ReturnType<typeof listLegacyProfiles> = [];
  let legacyError = "";
  try {
    legacyProfiles = listLegacyProfiles(localStorage, state.ownerId);
  } catch (failure) {
    legacyError = message(failure);
  }

  return {
    state,
    mutate,
    notify,
    notice,
    error,
    setError,
    user,
    client,
    syncStatus,
    busy,
    ready,
    pendingCount: journal.pending.length,
    conflicts: journal.conflicts,
    resolveConflict,
    runCloud,
    retrySync,
    importText,
    importGuest,
    importLocalLegacy,
    importCloudLegacy,
    resetWorkspace,
    legacyProfiles,
    legacyError,
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
