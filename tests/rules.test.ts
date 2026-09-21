import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteApp, getApps } from "firebase/app";
import { applyActionCode, deleteUser, getAuth } from "firebase/auth";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  setLogLevel,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import type { LessonProgress, SyncRecord } from "../src/domain/types";
import { EXTRA_TOPIC_IDS } from "../src/domain/types";
import { trackSchema } from "../src/content/schema";
import {
  assessLesson,
  completeLesson,
  createProgress,
  updateLesson,
} from "../src/domain/progress";
import { recordsFromState } from "../src/state/records";
import { initializeCloud, type CloudClient } from "../src/services/firebase";
import {
  createSyncRepository,
  SyncConflictError,
  SyncIdentityError,
  type SyncIdentityGuard,
} from "../src/services/sync";

const PROJECT = "demo-progress-tracker";
const T0 = "2026-09-01T10:00:00.000Z";
const T1 = "2026-09-01T10:00:01.000Z";
const T2 = "2026-09-01T10:00:02.000Z";
const fixtures = (): SyncRecord[] => [
  {
    collection: "lessons",
    id: "foundation:lesson-1",
    data: {
      id: "foundation:lesson-1",
      updatedAt: T0,
      manualCompletedAt: null,
      evidence: "",
      rubricChecked: [],
      note: "A useful note",
      bookmarked: true,
      readingPosition: "section-1",
      review: null,
      assessment: null,
    },
  },
  {
    collection: "projects",
    id: "portfolio-1",
    data: {
      id: "portfolio-1",
      updatedAt: T0,
      milestones: ["milestone-1"],
      evidence: "https://example.org/project",
    },
  },
  {
    collection: "goals",
    id: "goal-1",
    data: {
      id: "goal-1",
      updatedAt: T0,
      title: "Learn the foundation",
      targetDate: "2026-12-31",
      trackId: "foundation",
      completedAt: null,
      deletedAt: null,
    },
  },
  {
    collection: "activity",
    id: "event-1",
    data: {
      id: "event-1",
      updatedAt: T0,
      at: T0,
      timezone: "Asia/Kolkata",
      kind: "study",
      entityId: "foundation:lesson-1",
      minutes: 25,
      detail: "Practised examples",
    },
  },
  {
    collection: "errors",
    id: "error-1",
    data: {
      id: "error-1",
      updatedAt: T0,
      lessonId: "foundation:lesson-1",
      questionId: "question-1",
      prompt: "Explain the concept",
      answer: "An attempt",
      explanation: "Expected reasoning",
      reflection: "",
      resolvedAt: null,
    },
  },
  {
    collection: "settings",
    id: "settings",
    data: {
      id: "settings",
      updatedAt: T0,
      displayName: "Learner",
      timezone: "Asia/Kolkata",
      theme: "system",
      dailyMinutes: 60,
      primaryTrack: "foundation",
    },
  },
];
const fixture = (name: SyncRecord["collection"]) =>
  fixtures().find((item) => item.collection === name)!;
const reference = (db: Firestore, record: SyncRecord, uid = "alice") =>
  doc(db, "learners", uid, record.collection, record.id);
const identityGuard = (uid: string): SyncIdentityGuard => ({
  capture(requestedUid) {
    if (uid !== requestedUid) throw new SyncIdentityError();
    return { uid, generation: 1 };
  },
  assertCurrent(identity) {
    if (identity.uid !== uid || identity.generation !== 1)
      throw new SyncIdentityError();
  },
});

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)(
  "Firestore rules and emulator integration (demo project only)",
  () => {
    let environment: RulesTestEnvironment;
    let alice: Firestore;
    let bob: Firestore;
    let anonymous: Firestore;

    beforeAll(async () => {
      expect(["127.0.0.1:8080", "localhost:8080"]).toContain(
        process.env.FIRESTORE_EMULATOR_HOST,
      );
      setLogLevel("silent");
      environment = await initializeTestEnvironment({
        projectId: PROJECT,
        firestore: {
          host: "127.0.0.1",
          port: 8080,
          rules: await readFile(resolve("firebase.rules"), "utf8"),
        },
      });
      alice = environment
        .authenticatedContext("alice")
        .firestore() as unknown as Firestore;
      bob = environment
        .authenticatedContext("bob")
        .firestore() as unknown as Firestore;
      anonymous = environment
        .unauthenticatedContext()
        .firestore() as unknown as Firestore;
    });

    beforeEach(async () => {
      await environment.clearFirestore();
    });

    afterAll(async () => {
      await environment?.cleanup();
      setLogLevel("error");
    });

    it.each(EXTRA_TOPIC_IDS)(
      "syncs %s lesson evidence with the unchanged rules and rejects other UIDs",
      async (trackId) => {
        const track = trackSchema.parse(
          JSON.parse(
            await readFile(
              resolve("src", "content", "tracks", `${trackId}.json`),
              "utf8",
            ),
          ),
        );
        const lesson = track.modules[0].lessons[0];
        const answers = Object.fromEntries(
          lesson.assignment.questions
            .filter((question) => question.kind !== "short-answer")
            .map((question) => [question.id, String(question.answer)]),
        );
        const state = completeLesson(
          updateLesson(
            assessLesson(createProgress("uid:alice", T0), lesson, answers, T0),
            lesson.id,
            {
              note: "Synthetic owner-only topic notes.",
              bookmarked: true,
              readingPosition: "Named official reading section",
              evidence:
                "Synthetic emulator evidence: retained the fixture, checked every criterion and explained the failure case.",
              rubricChecked: lesson.assignment.acceptanceCriteria,
            },
            T0,
          ),
          lesson,
          T0,
        );
        for (const record of recordsFromState(state)) {
          await assertSucceeds(setDoc(reference(alice, record), record.data));
          expect(
            (await assertSucceeds(getDoc(reference(alice, record)))).data(),
          ).toEqual(record.data);
          await assertFails(getDoc(reference(bob, record)));
          await assertFails(getDoc(reference(anonymous, record)));
        }
        expect(state.settings.primaryTrack).toBe("foundation");
      },
    );

    it("keeps optional topic IDs out of the unchanged core settings and goal contract", async () => {
      for (const trackId of EXTRA_TOPIC_IDS) {
        const settings = fixture("settings");
        const goal = fixture("goals");
        await assertFails(
          setDoc(reference(alice, settings), {
            ...settings.data,
            primaryTrack: trackId,
          }),
        );
        await assertFails(
          setDoc(reference(alice, goal), { ...goal.data, trackId }),
        );
      }
    });

    it.each(fixtures().map((item) => [item.collection, item] as const))(
      "permits owner creation/read and monotonic %s updates",
      async (name, record) => {
        await assertSucceeds(setDoc(reference(alice, record), record.data));
        expect(
          (await assertSucceeds(getDoc(reference(alice, record)))).data(),
        ).toEqual(record.data);
        if (name !== "settings") {
          expect(
            (
              await assertSucceeds(
                getDocs(collection(alice, "learners", "alice", name)),
              )
            ).size,
          ).toBe(1);
        }
        if (name !== "activity") {
          await assertSucceeds(
            updateDoc(reference(alice, record), { updatedAt: T1 }),
          );
          expect(
            (await getDoc(reference(alice, record))).data()?.updatedAt,
          ).toBe(T1);
        }
        await assertSucceeds(deleteDoc(reference(alice, record)));
      },
    );

    it.each(fixtures().map((item) => [item.collection, item] as const))(
      "denies unauthenticated and cross-user %s reads, writes, and queries",
      async (_name, record) => {
        await setDoc(reference(alice, record), record.data);
        for (const unauthorized of [bob, anonymous]) {
          await assertFails(getDoc(reference(unauthorized, record)));
          await assertFails(
            setDoc(reference(unauthorized, record), {
              ...record.data,
              updatedAt: T1,
            }),
          );
          await assertFails(deleteDoc(reference(unauthorized, record)));
          await assertFails(
            getDocs(
              collection(unauthorized, "learners", "alice", record.collection),
            ),
          );
        }
        await assertFails(setDoc(reference(alice, record, "bob"), record.data));
      },
    );

    it("denies unscoped collection-group queries, learner roots, unknown collections, and arbitrary settings IDs", async () => {
      const record = fixture("lessons");
      await setDoc(reference(alice, record), record.data);
      await assertFails(getDocs(collectionGroup(alice, "lessons")));
      await assertFails(getDocs(collection(anonymous, "learners")));
      await assertFails(
        setDoc(doc(alice, "learners", "alice"), { anything: true }),
      );
      await assertFails(
        setDoc(doc(alice, "learners", "alice", "arbitrary", "entry"), {
          id: "entry",
        }),
      );
      await assertFails(
        setDoc(doc(alice, "learners", "alice", "settings", "other"), {
          ...fixture("settings").data,
          id: "other",
        }),
      );
      await assertFails(
        getDoc(doc(alice, "learners", "alice", "settings", "other")),
      );
    });

    it.each(fixtures().map((item) => [item.collection, item] as const))(
      "denies unknown fields, missing fields, identity mismatches, and stale %s timestamps",
      async (_name, record) => {
        const ref = reference(alice, record);
        await assertFails(
          setDoc(ref, { ...record.data, unexpected: "not allowed" }),
        );
        const missing = { ...record.data } as Record<string, unknown>;
        delete missing.updatedAt;
        await assertFails(setDoc(ref, missing));
        await assertFails(setDoc(ref, { ...record.data, id: "different-id" }));
        await assertFails(
          setDoc(ref, { ...record.data, updatedAt: new Date(T0) }),
        );
        await assertFails(
          setDoc(ref, {
            ...record.data,
            updatedAt: "2026-09-01T10:00:00+00:00",
          }),
        );
        await assertFails(
          setDoc(ref, {
            ...record.data,
            updatedAt: "2026-02-30T10:00:00.000Z",
          }),
        );
        await setDoc(ref, record.data);
        await assertFails(updateDoc(ref, { updatedAt: T0 }));
        await assertFails(
          updateDoc(ref, { updatedAt: "2026-01-01T00:00:00.000Z" }),
        );
      },
    );

    it("validates leap-day timestamps rather than accepting impossible dates", async () => {
      const record = fixture("projects");
      await assertFails(
        setDoc(reference(alice, record), {
          ...record.data,
          updatedAt: "2026-02-29T10:00:00.000Z",
        }),
      );
      await assertSucceeds(
        setDoc(reference(alice, record), {
          ...record.data,
          updatedAt: "2028-02-29T10:00:00.000Z",
        }),
      );
    });

    it("bounds lesson text, full rubric criteria, reviews, and assessment answer maps", async () => {
      const record = fixture("lessons");
      const bad = [
        { note: "x".repeat(16001) },
        { evidence: "x".repeat(16001) },
        { readingPosition: "x".repeat(1001) },
        { bookmarked: "true" },
        { rubricChecked: [""] },
        { rubricChecked: [42] },
        { rubricChecked: ["x".repeat(2049)] },
        { rubricChecked: ["criterion\u0000injected"] },
        { rubricChecked: ["same", "same"] },
        {
          rubricChecked: Array.from(
            { length: 33 },
            (_, index) => `rubric-${index}`,
          ),
        },
        {
          review: {
            dueAt: T1,
            intervalDays: 1.5,
            streak: 1,
            lastReviewedAt: T0,
          },
        },
        {
          review: { dueAt: T1, intervalDays: 1, streak: 1, lastReviewedAt: T1 },
        },
        {
          review: {
            dueAt: T1,
            intervalDays: 1,
            streak: 1,
            lastReviewedAt: T0,
            extra: true,
          },
        },
        { assessment: { attemptedAt: T0, correct: 2, total: 1, answers: {} } },
        {
          assessment: {
            attemptedAt: T0,
            correct: 1,
            total: 1,
            answers: { question: 3 },
          },
        },
        {
          assessment: {
            attemptedAt: T0,
            correct: 1,
            total: 1,
            answers: { question: { nested: "not text" } },
          },
        },
        {
          assessment: {
            attemptedAt: T0,
            correct: 1,
            total: 1,
            answers: { question: "x".repeat(2049) },
          },
        },
        {
          assessment: {
            attemptedAt: T0,
            correct: 1,
            total: 1,
            answers: { question: "answer\u0000injected" },
          },
        },
        {
          assessment: {
            attemptedAt: T0,
            correct: 1,
            total: 1,
            answers: { ["x".repeat(161)]: "answer" },
          },
        },
        {
          assessment: {
            attemptedAt: T0,
            correct: 1,
            total: 1,
            answers: { question: "answer", other: "answer" },
          },
        },
        { assessment: { attemptedAt: T0, correct: 0, total: 33, answers: {} } },
      ];
      for (const change of bad)
        await assertFails(
          setDoc(reference(alice, record), { ...record.data, ...change }),
        );
      await assertSucceeds(
        setDoc(reference(alice, record), {
          ...record.data,
          rubricChecked: [
            "Reject ../unsafe paths and preserve each source/target audit row.",
          ],
          manualCompletedAt: T0,
          review: { dueAt: T1, intervalDays: 1, streak: 1, lastReviewedAt: T0 },
          assessment: {
            attemptedAt: T0,
            correct: 1,
            total: 3,
            answers: {
              first: "",
              second: "answer\nwith multiple lines",
              third: "",
            },
          },
        }),
      );
    });

    it("accepts the documented maximum bounded rubric and answer lists", async () => {
      const record = fixture("lessons");
      const data = {
        ...record.data,
        rubricChecked: Array.from(
          { length: 32 },
          (_, index) => `rubric-${index}`,
        ),
        assessment: {
          attemptedAt: T0,
          correct: 32,
          total: 32,
          answers: Object.fromEntries(
            Array.from({ length: 32 }, (_, index) => [
              `question-${index}`,
              "x".repeat(2048),
            ]),
          ),
        },
      };
      await assertFails(
        setDoc(reference(alice, record), {
          ...data,
          assessment: {
            ...data.assessment,
            answers: {
              ...data.assessment.answers,
              "question-31": "x".repeat(2049),
            },
          },
        }),
      );
      await assertFails(
        setDoc(reference(alice, record), {
          ...data,
          rubricChecked: [...data.rubricChecked.slice(0, 31), 4],
        }),
      );
      await assertSucceeds(setDoc(reference(alice, record), data));
    });

    it("bounds project fields, goal fields, settings, and error-notebook payloads", async () => {
      const cases: [SyncRecord["collection"], Record<string, unknown>][] = [
        ["projects", { evidence: "x".repeat(16001) }],
        ["projects", { milestones: [{ unbounded: "object" }] }],
        [
          "projects",
          {
            milestones: Array.from(
              { length: 33 },
              (_, index) => `milestone-${index}`,
            ),
          },
        ],
        ["goals", { title: "" }],
        ["goals", { title: "x".repeat(201) }],
        ["goals", { targetDate: "2026-02-30" }],
        ["goals", { trackId: "unknown" }],
        ["goals", { completedAt: T1 }],
        ["goals", { deletedAt: "today" }],
        ["settings", { displayName: "x".repeat(121) }],
        ["settings", { timezone: "" }],
        ["settings", { theme: "unknown" }],
        ["settings", { dailyMinutes: 1441 }],
        ["settings", { dailyMinutes: 1.5 }],
        ["settings", { dailyMinutes: 0 }],
        ["settings", { primaryTrack: "unknown" }],
        ["errors", { prompt: "x".repeat(4001) }],
        ["errors", { answer: "x".repeat(2049) }],
        ["errors", { explanation: "x".repeat(16001) }],
        ["errors", { reflection: "x".repeat(16001) }],
        ["errors", { lessonId: "../unsafe" }],
        ["errors", { questionId: 42 }],
        ["errors", { resolvedAt: T1 }],
      ];
      for (const [name, changes] of cases) {
        const record = fixture(name);
        await assertFails(
          setDoc(reference(alice, record), { ...record.data, ...changes }),
        );
      }
    });

    it("validates immutable activity IDs, timestamps, kinds, durations, and payload bounds", async () => {
      const record = fixture("activity");
      for (const change of [
        { id: "other-event" },
        { at: T1 },
        { kind: "anything" },
        { minutes: -1 },
        { minutes: 1.5 },
        { minutes: 1441 },
        { detail: "x".repeat(2001) },
        { entityId: "../unsafe" },
        { timezone: "x".repeat(101) },
      ]) {
        await assertFails(
          setDoc(reference(alice, record), { ...record.data, ...change }),
        );
      }
      await assertSucceeds(setDoc(reference(alice, record), record.data));
      await assertFails(
        updateDoc(reference(alice, record), { updatedAt: T1, minutes: 40 }),
      );
      await assertSucceeds(deleteDoc(reference(alice, record)));
    });

    it("preserves goal tombstones, prevents resurrection and permits owner-scoped reset deletion", async () => {
      const record = fixture("goals");
      const ref = reference(alice, record);
      await setDoc(ref, record.data);
      await assertFails(updateDoc(ref, { updatedAt: T1, deletedAt: T2 }));
      await assertSucceeds(updateDoc(ref, { updatedAt: T1, deletedAt: T1 }));
      expect((await getDoc(ref)).data()?.title).toBe("Learn the foundation");
      await assertFails(updateDoc(ref, { updatedAt: T2, deletedAt: null }));
      await assertFails(
        updateDoc(ref, { updatedAt: T2, title: "Changed tombstone" }),
      );
      await assertSucceeds(deleteDoc(ref));
      const offlineTombstone = {
        ...record.data,
        id: "deleted-offline",
        updatedAt: T1,
        deletedAt: T1,
      };
      await assertSucceeds(
        setDoc(
          doc(alice, "learners", "alice", "goals", "deleted-offline"),
          offlineTombstone,
        ),
      );
      const editedOffline = { ...record.data, id: "edited-offline" };
      const editedRef = doc(
        alice,
        "learners",
        "alice",
        "goals",
        "edited-offline",
      );
      await setDoc(editedRef, editedOffline);
      await assertSucceeds(
        updateDoc(editedRef, {
          updatedAt: T1,
          title: "Edit then delete while offline",
          deletedAt: T1,
        }),
      );
      expect((await getDoc(editedRef)).data()?.title).toBe(
        "Edit then delete while offline",
      );
    });

    it("keeps legacy owner-write compatibility without letting new sync mutate the archive", async () => {
      const legacy = {
        profile: { name: "Original learner" },
        notes: { "old-lesson": "Never overwrite this" },
        completions: { old: true },
      };
      await environment.withSecurityRulesDisabled(async (context) => {
        const admin = context.firestore() as unknown as Firestore;
        await setDoc(doc(admin, "studyProgressProfiles", "alice"), legacy);
        await setDoc(doc(admin, "studyProgressCatalog", "current"), {
          version: 1,
        });
        await setDoc(
          doc(admin, "studyProgressCatalog", "current", "topics", "topic-1"),
          { title: "Legacy catalog" },
        );
      });
      const repository = createSyncRepository(alice, identityGuard("alice"));
      expect(await repository.loadLegacyProfile("alice")).toEqual(legacy);
      for (const client of [bob, anonymous]) {
        await assertFails(
          setDoc(doc(client, "studyProgressProfiles", "alice"), legacy),
        );
        await assertFails(
          deleteDoc(doc(client, "studyProgressProfiles", "alice")),
        );
      }
      await assertSucceeds(
        setDoc(doc(alice, "studyProgressProfiles", "alice"), legacy),
      );
      for (const client of [alice, bob, anonymous]) {
        await assertSucceeds(
          getDoc(doc(client, "studyProgressCatalog", "current")),
        );
        await assertSucceeds(
          getDocs(
            collection(client, "studyProgressCatalog", "current", "topics"),
          ),
        );
        await assertFails(
          setDoc(doc(client, "studyProgressCatalog", "current"), {
            version: 2,
          }),
        );
        await assertFails(
          setDoc(
            doc(client, "studyProgressCatalog", "current", "topics", "topic-1"),
            { changed: true },
          ),
        );
      }
      for (const client of [bob, anonymous]) {
        await assertFails(
          getDoc(doc(client, "studyProgressProfiles", "alice")),
        );
        await assertFails(getDocs(collection(client, "studyProgressProfiles")));
      }
      await repository.commitRecords("alice", [
        { record: fixture("settings"), expectedUpdatedAt: null },
      ]);
      await repository.deleteRecords("alice", [
        { collection: "settings", id: "settings", expectedUpdatedAt: T0 },
      ]);
      expect(await repository.loadLegacyProfile("alice")).toEqual(legacy);
      repository.dispose();
    });

    it("resets only selected owner records and rejects a concurrent version change", async () => {
      const original = fixture("lessons");
      await setDoc(reference(alice, original), original.data);
      await setDoc(reference(bob, original, "bob"), original.data);
      const repository = createSyncRepository(alice, identityGuard("alice"));
      await updateDoc(reference(alice, original), {
        updatedAt: T1,
        note: "Newer work must not be erased",
      });
      await expect(
        repository.deleteRecords("alice", [
          { collection: "lessons", id: original.id, expectedUpdatedAt: T0 },
        ]),
      ).rejects.toBeInstanceOf(SyncConflictError);
      expect((await getDoc(reference(alice, original))).data()?.note).toBe(
        "Newer work must not be erased",
      );
      await repository.deleteRecords("alice", [
        { collection: "lessons", id: original.id, expectedUpdatedAt: T1 },
      ]);
      expect((await getDoc(reference(alice, original))).exists()).toBe(false);
      expect((await getDoc(reference(bob, original, "bob"))).exists()).toBe(
        true,
      );
      await expect(
        repository.deleteRecords("bob", [
          { collection: "lessons", id: original.id, expectedUpdatedAt: T0 },
        ]),
      ).rejects.toBeInstanceOf(SyncIdentityError);
      repository.dispose();
    });

    it("atomically rejects concurrent edits with a typed conflict containing the winning remote record", async () => {
      const original = fixture("lessons");
      await setDoc(reference(alice, original), original.data);
      const first = createSyncRepository(alice, identityGuard("alice"));
      const second = createSyncRepository(alice, identityGuard("alice"));
      const edit = (note: string): SyncRecord => ({
        ...original,
        data: { ...(original.data as LessonProgress), updatedAt: T1, note },
      });
      const results = await Promise.allSettled([
        first.commitRecords("alice", [
          { record: edit("First device note"), expectedUpdatedAt: T0 },
        ]),
        second.commitRecords("alice", [
          { record: edit("Second device note"), expectedUpdatedAt: T0 },
        ]),
      ]);
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      const rejected = results.find(
        (result) => result.status === "rejected",
      ) as PromiseRejectedResult;
      expect(rejected.reason).toBeInstanceOf(SyncConflictError);
      const actual = (await getDoc(reference(alice, original))).data();
      expect(rejected.reason.remoteRecords).toEqual([
        { ...original, data: actual },
      ]);
      expect(["First device note", "Second device note"]).toContain(
        actual?.note,
      );
      first.dispose();
      second.dispose();
    });

    it("uses real Auth and Firestore emulators for registration, verification, reset, sign-in, and sync", async () => {
      expect(["127.0.0.1:9099", "localhost:9099"]).toContain(
        process.env.FIREBASE_AUTH_EMULATOR_HOST,
      );
      vi.stubEnv("VITE_USE_EMULATORS", "true");
      vi.stubGlobal("location", {
        origin: "http://127.0.0.1:5177",
        hostname: "127.0.0.1",
      });
      const email = `rules-${Date.now()}@example.test`;
      const password = "emulator-only-strong-password";
      const onUser = vi.fn();
      let client: CloudClient | undefined;
      try {
        client = await initializeCloud(onUser);
        expect(onUser).toHaveBeenCalledWith(null);
        const registered = await client.register(email, password);
        expect(registered.emailVerified).toBe(false);
        const app = getApps().find(
          (item) => item.name === `progress-tracker-emulator-${PROJECT}`,
        )!;
        expect(app.options.projectId).toBe(PROJECT);
        const codes = (await fetch(
          `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/oobCodes`,
        ).then((response) => response.json())) as {
          oobCodes: { email: string; requestType: string; oobCode: string }[];
        };
        const verification = codes.oobCodes.find(
          (code) => code.email === email && code.requestType === "VERIFY_EMAIL",
        );
        expect(verification).toBeDefined();
        await applyActionCode(getAuth(app), verification!.oobCode);
        await client.resendVerification();
        expect(client.getUser()?.emailVerified).toBe(true);
        await client.commitRecords(registered.uid, [
          { record: fixture("settings"), expectedUpdatedAt: null },
        ]);
        expect(await client.loadRecords(registered.uid)).toEqual([
          fixture("settings"),
        ]);
        await expect(
          client.loadRecords("other-account"),
        ).rejects.toBeInstanceOf(SyncIdentityError);
        await client.resetPassword(email);
        await client.signOut();
        await expect(client.loadRecords(registered.uid)).rejects.toBeInstanceOf(
          SyncIdentityError,
        );
        await expect(
          client.signIn(email, "incorrect-password"),
        ).rejects.toBeDefined();
        expect((await client.signIn(email, password)).uid).toBe(registered.uid);
        await deleteUser(getAuth(app).currentUser!);
      } finally {
        client?.dispose();
        const app = getApps().find(
          (item) => item.name === `progress-tracker-emulator-${PROJECT}`,
        );
        if (app) await deleteApp(app);
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
      }
    });
  },
);
