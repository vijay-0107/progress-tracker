import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  allLessons,
  buildCatalog,
  coreLessons,
  findLesson,
  findResource,
  isExtraTopic,
  lessonCompletion,
  moduleComplete,
  recommendedLessons,
  requiredLessons,
  stageLabel,
  validateCatalog,
} from "../src/content/catalog";
import {
  CORE_TRACK_IDS,
  EXTRA_TOPIC_IDS,
  LEARNING_STAGES,
  TRACK_IDS,
  type Lesson,
  type ProgressState,
} from "../src/domain/types";
import {
  assessLesson,
  completeLesson,
  createProgress,
  exportProgress,
  parseImport,
  updateLesson,
} from "../src/domain/progress";
import { loadProgress, saveProgress } from "../src/domain/storage";
import { settingsSchema } from "../src/domain/validation";
import { validateSyncRecord } from "../src/services/sync";
import {
  emptyJournal,
  recordChanges,
  recordsFromState,
  reconcileRecords,
} from "../src/state/records";

const rawTracks = () =>
  TRACK_IDS.map((id) =>
    JSON.parse(
      fs.readFileSync(
        path.resolve("src", "content", "tracks", `${id}.json`),
        "utf8",
      ),
    ),
  );
const catalog = buildCatalog(rawTracks());
const extras = catalog.tracks.filter((track) => isExtraTopic(track.trackId));
const T0 = "2026-09-20T10:00:00.000Z";
const T1 = "2026-09-21T10:00:00.000Z";
const T2 = "2026-09-21T10:01:00.000Z";

function finish(state: ProgressState, lesson: Lesson, at = T1): ProgressState {
  return completeLesson(
    updateLesson(
      state,
      lesson.id,
      {
        evidence:
          "Synthetic test evidence: I retained the original fixture, checked each acceptance case and documented the failed scenario.",
        rubricChecked: lesson.assignment.acceptanceCriteria,
      },
      at,
    ),
    lesson,
    at,
  );
}

class MemoryStorage implements Storage {
  values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("optional Extra Topics content contract", () => {
  it("publishes complete, current provenance without changing original packaged core checksums", () => {
    const provenance = JSON.parse(
      fs.readFileSync(
        path.resolve("public", "curriculum-provenance.json"),
        "utf8",
      ),
    );
    expect(provenance.version).toBe(catalog.version);
    expect(provenance.complete).toBe(true);
    expect(
      provenance.tracks.map((track: { trackId: string }) => track.trackId),
    ).toEqual([...TRACK_IDS]);
    for (const track of catalog.tracks) {
      const entry = provenance.tracks.find(
        (item: { trackId: string }) => item.trackId === track.trackId,
      );
      const bytes = fs.readFileSync(
        path.resolve("src", "content", "tracks", `${track.trackId}.json`),
      );
      expect(entry.packagedSha256, track.trackId).toBe(
        createHash("sha256").update(bytes).digest("hex"),
      );
      expect(entry.modules).toBe(track.modules.length);
      expect(entry.lessons).toBe(
        track.modules.flatMap((module) => module.lessons).length,
      );
      expect(entry.sourceCheckedOn).toBe(track.sourceCheckedOn);
      if (isExtraTopic(track.trackId)) expect(entry.group).toBe("extra");
    }
  });

  it("appends five complete topics without changing the released core inventory", () => {
    expect(catalog.version).toBe("2026.09.21.1");
    expect(
      catalog.tracks
        .filter((track) => !isExtraTopic(track.trackId))
        .map((track) => track.trackId),
    ).toEqual([...CORE_TRACK_IDS]);
    expect(coreLessons(catalog)).toHaveLength(231);
    expect(
      catalog.tracks
        .filter((track) => !isExtraTopic(track.trackId))
        .flatMap((track) => track.modules),
    ).toHaveLength(66);
    expect(catalog.projects).toHaveLength(21);
    expect(extras.map((track) => track.trackId)).toEqual([...EXTRA_TOPIC_IDS]);
    expect(
      extras.map((track) => [
        track.modules.length,
        requiredLessons(track).length,
      ]),
    ).toEqual([
      [8, 20],
      [8, 24],
      [10, 24],
      [12, 32],
      [10, 24],
    ]);
    expect(allLessons(catalog)).toHaveLength(355);
  });

  for (const track of extras) {
    it(`${track.trackId} has balanced static answer positions without changing answer meaning`, () => {
      const positions = [0, 0, 0];
      for (const question of requiredLessons(track)
        .flatMap((lesson) => lesson.assignment.questions)
        .filter((question) => question.kind === "single-choice")) {
        expect(question.choices).toHaveLength(3);
        expect(typeof question.answer).toBe("string");
        const index = question.choices!.indexOf(String(question.answer));
        expect(index).toBeGreaterThanOrEqual(0);
        positions[index] += 1;
      }
      expect(positions.every((count) => count > 0)).toBe(true);
      expect(
        Math.max(...positions) - Math.min(...positions),
      ).toBeLessThanOrEqual(1);
    });

    it(`${track.trackId} has substantive ordered outcomes, original work and a capstone`, () => {
      expect(track.stageOutcomes?.map((outcome) => outcome.stage)).toEqual([
        ...LEARNING_STAGES,
      ]);
      expect(stageLabel("foundation", track.trackId)).toBe("Beginner");
      expect(stageLabel("professional", track.trackId)).toBe(
        "Professional Practice",
      );
      const stages = track.modules.map((module) =>
        LEARNING_STAGES.indexOf(module.stage),
      );
      expect(stages).toEqual([...stages].sort((a, b) => a - b));
      for (const stage of LEARNING_STAGES) {
        const units = requiredLessons(track, "all", stage);
        expect(units.length).toBeGreaterThanOrEqual(4);
        const outcome = track.stageOutcomes!.find(
          (item) => item.stage === stage,
        )!;
        expect(outcome.outcome.length).toBeGreaterThan(60);
        expect(outcome.evidence.length).toBeGreaterThan(60);
        expect(units.some((lesson) => lesson.assignment.kind !== "quiz")).toBe(
          true,
        );
      }
      const instructions = new Set<string>();
      const questionPrompts = new Set<string>();
      for (const module of track.modules) {
        expect(module.optional).toBe(false);
        for (const lesson of module.lessons) {
          expect(lesson.optional).toBe(false);
          expect(lesson.id.length).toBeLessThanOrEqual(160);
          expect(lesson.objectives.length).toBeGreaterThanOrEqual(2);
          expect(lesson.topics.length).toBeGreaterThanOrEqual(2);
          expect(
            lesson.topics.every((topic) => topic.details.length >= 2),
          ).toBe(true);
          expect(lesson.assignment.instructions.length).toBeGreaterThanOrEqual(
            3,
          );
          expect(lesson.assignment.deliverables.length).toBeGreaterThanOrEqual(
            2,
          );
          expect(
            lesson.assignment.acceptanceCriteria.length,
          ).toBeGreaterThanOrEqual(3);
          expect(lesson.assignment.questions.length).toBeGreaterThanOrEqual(2);
          expect(
            lesson.assignment.questions.some(
              (question) => question.kind !== "short-answer",
            ),
          ).toBe(true);
          instructions.add(lesson.assignment.instructions.join("\n"));
          for (const question of lesson.assignment.questions) {
            expect(question.explanation.length).toBeGreaterThan(40);
            questionPrompts.add(question.prompt);
          }
          expect(lesson.reading.locator.length).toBeGreaterThan(35);
          const resources = [
            lesson.reading.resourceId,
            ...(lesson.video ? [lesson.video.resourceId] : []),
            ...lesson.supplementaryResourceIds,
          ].map((id) => findResource(catalog, id));
          for (const resource of resources) {
            expect(resource.access).not.toBe("paid-optional");
            expect(resource.url).not.toMatch(/search_query=|[?&]q=|\/search\?/);
          }
          if (lesson.video)
            expect(lesson.video.locator.length).toBeGreaterThan(35);
        }
      }
      expect(instructions.size).toBe(requiredLessons(track).length);
      expect(questionPrompts.size).toBe(
        requiredLessons(track).reduce(
          (sum, lesson) => sum + lesson.assignment.questions.length,
          0,
        ),
      );
      const capstones = requiredLessons(track).filter(
        (lesson) => lesson.assignment.kind === "project",
      );
      expect(capstones).toHaveLength(1);
      expect(findLesson(catalog, capstones[0].id)?.module.stage).toBe(
        "professional",
      );
      expect(
        capstones[0].assignment.deliverables.length,
      ).toBeGreaterThanOrEqual(4);
      expect(
        capstones[0].assignment.acceptanceCriteria.length,
      ).toBeGreaterThanOrEqual(6);
      expect(track.limitations.join(" ")).toMatch(
        /not .*certification|not a professional certification/i,
      );
    });
  }

  it("reuses canonical shared lesson and hosted-book IDs instead of cloning them", () => {
    const shared = extras.flatMap((track) =>
      requiredLessons(track).flatMap((lesson) =>
        (lesson.prerequisites || []).filter(
          (id) => !isExtraTopic(findLesson(catalog, id)!.track.trackId),
        ),
      ),
    );
    for (const prefix of ["foundation-", "quant-", "sde-", "ai-"])
      expect(shared.some((id) => id.startsWith(prefix))).toBe(true);
    for (const id of shared)
      expect(
        allLessons(catalog).filter((lesson) => lesson.id === id),
      ).toHaveLength(1);
    expect(findResource(catalog, "sde-book-asvs").hostedPath).toBeTruthy();
    expect(
      extras
        .flatMap((track) => track.resources)
        .every((resource) => !resource.hostedPath && !resource.downloadUrl),
    ).toBe(true);
    expect(
      new Set(
        catalog.tracks
          .flatMap((track) => track.resources)
          .flatMap((resource) =>
            resource.hostedPath ? [resource.hostedPath] : [],
          ),
      ).size,
    ).toBe(6);
  });

  it("rejects missing stages, unknown references, duplicate IDs and prerequisite cycles", () => {
    const missing = buildCatalog(rawTracks());
    missing.tracks
      .find((track) => track.trackId === "finance")!
      .stageOutcomes!.pop();
    expect(() => validateCatalog(missing)).toThrow(
      /four ordered stage outcomes/,
    );
    const unknown = buildCatalog(rawTracks());
    findLesson(unknown, "trading-l01-market-map")!.lesson.prerequisites = [
      "missing-lesson",
    ];
    expect(() => validateCatalog(unknown)).toThrow(/unknown prerequisite/);
    const duplicate = buildCatalog(rawTracks());
    findLesson(duplicate, "finance-l01-budget")!.lesson.assignment.id =
      "trading-a01";
    expect(() => validateCatalog(duplicate)).toThrow(/Duplicate curriculum ID/);
    const lessonCycle = buildCatalog(rawTracks());
    findLesson(lessonCycle, "trading-l01-market-map")!.lesson.prerequisites = [
      "trading-l20-capstone",
    ];
    expect(() => validateCatalog(lessonCycle)).toThrow(
      /Lesson prerequisite cycle/,
    );
    const moduleCycle = buildCatalog(rawTracks());
    moduleCycle.tracks.find(
      (track) => track.trackId === "finance",
    )!.modules[0].prerequisites = ["finance-m10-decision-evidence"];
    expect(() => validateCatalog(moduleCycle)).toThrow(
      /Curriculum prerequisite cycle/,
    );
  });

  it("permits honest reading-led extra lessons but does not weaken the existing core lecture contract", () => {
    expect(
      requiredLessons(extras[0]).some((lesson) => lesson.video === null),
    ).toBe(true);
    const invalid = buildCatalog(rawTracks());
    invalid.tracks[0].modules[0].lessons[0].video = null;
    expect(() => validateCatalog(invalid)).toThrow(/known lecture/);
  });
});

describe("core and optional progress separation", () => {
  it("leaves full core completion at 100% with every extra topic still at zero", () => {
    let state = createProgress("guest", T0);
    for (const lesson of coreLessons(catalog)) state = finish(state, lesson);
    expect(lessonCompletion(coreLessons(catalog), state)).toEqual({
      completed: 231,
      total: 231,
      percent: 100,
    });
    for (const track of extras) {
      expect(lessonCompletion(requiredLessons(track), state).completed).toBe(0);
      expect(
        track.modules.some((module) => moduleComplete(module, state)),
      ).toBe(false);
    }
  });

  it("counts each topic and each stage without making an optional track vacuously complete", () => {
    let state = createProgress("guest", T0);
    for (const track of extras) {
      const stageLessons = requiredLessons(track, "all", "foundation");
      for (const lesson of stageLessons) state = finish(state, lesson);
      expect(lessonCompletion(stageLessons, state).percent).toBe(100);
      expect(lessonCompletion(requiredLessons(track), state).completed).toBe(
        stageLessons.length,
      );
      expect(
        lessonCompletion(requiredLessons(track, "all", "professional"), state)
          .percent,
      ).toBe(0);
      expect(
        track.modules
          .filter((module) => module.stage === "foundation")
          .every((module) => moduleComplete(module, state)),
      ).toBe(true);
    }
    expect(lessonCompletion(coreLessons(catalog), state)).toEqual({
      completed: 0,
      total: 231,
      percent: 0,
    });
  });

  it("preserves common-first and exam-specific recommendations for every saved core focus", () => {
    const previousCatalog = {
      ...catalog,
      tracks: catalog.tracks.filter((track) => !isExtraTopic(track.trackId)),
    };
    for (const primaryTrack of CORE_TRACK_IDS) {
      const state = createProgress("guest", T0);
      state.settings.primaryTrack = primaryTrack;
      expect(recommendedLessons(catalog, state)).toEqual(
        recommendedLessons(previousCatalog, state),
      );
      expect(
        recommendedLessons(catalog, state).every(
          (item) => item && !isExtraTopic(item.track.trackId),
        ),
      ).toBe(true);
    }
  });
});

describe("append-only progress compatibility", () => {
  it("preserves a legacy v2 export, core settings, project evidence, reviews and the pending journal while adding extras", () => {
    const first = catalog.tracks[0].modules[0].lessons[0];
    let old = finish(createProgress("uid:synthetic-owner", T0), first, T0);
    old = updateLesson(
      old,
      first.id,
      {
        note: "Original private note",
        bookmarked: true,
        readingPosition: "Page 7",
      },
      T0,
    );
    old.settings = {
      ...old.settings,
      primaryTrack: "data",
      theme: "dark",
      dailyMinutes: 65,
      displayName: "Synthetic legacy learner",
    };
    const project = catalog.projects[0];
    old.projects[project.id] = {
      id: project.id,
      updatedAt: T0,
      milestones: [project.milestones[0].id],
      evidence: "Original synthetic project evidence and fixture description.",
    };
    old.goals["legacy-goal"] = {
      id: "legacy-goal",
      updatedAt: T0,
      title: "Original core goal",
      targetDate: "2026-12-01",
      trackId: "data",
      completedAt: null,
      deletedAt: null,
    };
    const exportBefore = exportProgress(old);
    const baseline = parseImport(exportBefore, old.ownerId);
    expect(exportProgress(baseline)).toBe(exportBefore);
    const initialJournal = {
      ...emptyJournal(old.ownerId),
      pending: [`lessons/${first.id}`],
    };
    let next = baseline;
    for (const track of extras) next = finish(next, requiredLessons(track)[0]);
    const journal = recordChanges(baseline, next, initialJournal);
    expect(next.settings).toEqual(old.settings);
    expect(next.lessons[first.id]).toEqual(old.lessons[first.id]);
    expect(next.projects).toEqual(old.projects);
    expect(next.goals).toEqual(old.goals);
    expect(journal.pending).toContain(`lessons/${first.id}`);
    expect(journal.pending).not.toContain("settings/settings");
    expect(lessonCompletion(coreLessons(catalog), next)).toEqual(
      lessonCompletion(coreLessons(catalog), old),
    );
    const storage = new MemoryStorage();
    saveProgress(storage, next);
    expect(loadProgress(storage, old.ownerId)).toEqual(next);
    expect(parseImport(exportProgress(next), old.ownerId)).toEqual(next);
    expect(loadProgress(storage, "uid:different-owner").lessons).toEqual({});
  });

  for (const track of extras) {
    it(`${track.trackId} round-trips notes, bookmarks, quizzes, completion, review and UID-scoped sync`, () => {
      const lesson = requiredLessons(track)[0];
      const before = createProgress("uid:extra-topic-test", T0);
      const answers = Object.fromEntries(
        lesson.assignment.questions
          .filter((question) => question.kind !== "short-answer")
          .map((question) => [
            question.id,
            typeof question.answer === "object"
              ? JSON.stringify(question.answer)
              : String(question.answer),
          ]),
      );
      let next = assessLesson(before, lesson, answers, T1);
      expect(next.lessons[lesson.id].assessment?.correct).toBe(1);
      expect(next.lessons[lesson.id].manualCompletedAt).toBeNull();
      next = finish(next, lesson);
      next = updateLesson(
        next,
        lesson.id,
        {
          note: "Topic-specific synthetic notes",
          bookmarked: true,
          readingPosition: "Named section to revisit",
        },
        T2,
      );
      expect(next.lessons[lesson.id].review).not.toBeNull();
      const imported = parseImport(exportProgress(next), next.ownerId);
      expect(imported).toEqual(next);
      const records = recordsFromState(imported).map(validateSyncRecord);
      const journal = recordChanges(before, next, emptyJournal(next.ownerId));
      expect(journal.pending).toContain(`lessons/${lesson.id}`);
      const synced = reconcileRecords(
        before,
        emptyJournal(next.ownerId),
        records,
      ).state;
      expect(synced.lessons).toEqual(next.lessons);
      expect(synced.activity).toEqual(next.activity);
      expect(synced.settings.primaryTrack).toBe("foundation");
      expect(() =>
        parseImport(exportProgress(next), "uid:not-the-owner"),
      ).toThrow(/owner mismatch/);
    });
  }

  it("does not broaden the deployed seven-ID settings/goal contract", () => {
    const old = createProgress("guest", T0);
    for (const id of EXTRA_TOPIC_IDS) {
      expect(
        settingsSchema.safeParse({ ...old.settings, primaryTrack: id }).success,
      ).toBe(false);
      expect(() =>
        parseImport(
          JSON.stringify({
            ...old,
            settings: { ...old.settings, primaryTrack: id },
          }),
          "guest",
        ),
      ).toThrow();
      expect(() =>
        parseImport(
          JSON.stringify({
            ...old,
            goals: {
              test: {
                id: "test",
                updatedAt: T0,
                title: "Invalid category",
                targetDate: "2026-12-01",
                trackId: id,
                completedAt: null,
                deletedAt: null,
              },
            },
          }),
          "guest",
        ),
      ).toThrow();
    }
  });
});
