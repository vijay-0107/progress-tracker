import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  allLessons,
  coreLessons,
  isCareerCourse,
  findLesson,
  getCatalog,
  lessonCompletion,
  requiredLessons,
} from "../src/content/catalog";
import { careerProfiles } from "../src/content/careers";
import { careerPackets } from "../src/content/career-exercises";
import { careerProjects } from "../src/content/career-projects";
import {
  careerLessons,
  competencyEvidence,
  isReadinessEntity,
  projectTotals,
  readinessCount,
  readinessMilestoneId,
  readinessRecorded,
  readinessRecordId,
  saveReadiness,
} from "../src/domain/careers";
import {
  assessLesson,
  completeLesson,
  createProgress,
  exportProgress,
  getActivityDays,
  getStreak,
  gradeQuestion,
  mergeImport,
  parseImport,
  updateLesson,
} from "../src/domain/progress";
import {
  CAREER_PROFILE_IDS,
  CORE_TRACK_IDS,
  LEARNING_STAGES,
  READINESS_GATES,
  type ProgressState,
} from "../src/domain/types";
import {
  settingsSchema,
  validateProgressState,
} from "../src/domain/validation";
import {
  emptyJournal,
  recordChanges,
  recordsFromState,
  reconcileRecords,
} from "../src/state/records";
import { validateSyncRecord } from "../src/services/sync";
import books from "../src/content/hosted-books.json";

const catalog = getCatalog();
const pm = catalog.tracks.find(
  (track) => track.trackId === "technical-product-management",
)!;
const T0 = "2026-09-20T10:00:00.000Z";
const T1 = "2026-09-29T10:00:00.000Z";
const T2 = "2026-09-29T10:01:00.000Z";
const T3 = "2026-09-29T10:02:00.000Z";
const evidence = (gate: string) =>
  `My ${gate} evidence: independently reproduced the synthetic fixture, predicted the boundary result and retained the observed regression output.`;
const expectedMappings = {
  backend: [
    "commerce-workflow-engine",
    "tenant-policy-service",
    "model-serving-gateway",
  ],
  "ai-systems": [
    "model-serving-gateway",
    "retrieval-evaluation-lab",
    "model-observability-lab",
  ],
  security: [
    "tenant-policy-service",
    "model-serving-gateway",
    "supply-chain-verifier",
  ],
  "data-platform": [
    "replayable-data-platform",
    "point-in-time-workbench",
    "portfolio-risk-service",
  ],
  "quant-developer": [
    "paper-exchange-engine",
    "point-in-time-workbench",
    "portfolio-risk-service",
  ],
  "technical-pm": [
    "commerce-workflow-engine",
    "retrieval-evaluation-lab",
    "replayable-data-platform",
  ],
};
// Learning-only label/order fingerprints from the approved intent, without its private metadata.
const intentHashes = {
  backend: "fe45a4e00f9277fe37399d67f15aba8eb0d3211e61445a8dd086762ec6ba44db",
  "ai-systems":
    "165a512ff94f65e9f30a7010289e2e158be5bcdb9525812b0976e38369e670aa",
  security: "0c87eb31a8c642b6b7e7889aa0b8ce6e51b99b0fdae2d6a891f07579bfe3e30c",
  "data-platform":
    "6b5a28c6dc2508b8213fc65faf784d9ae0d00bdbf69dbefbad96b2cc529ee3e6",
  "quant-developer":
    "ddd576f29829943eae959966b08618b3b7d56a1d85645d0e249fba8861557f3e",
  "technical-pm":
    "8b6b47431932668a9de2c5767615204c43a275a3d09d7c22ac6d5f0291fb110d",
};
function finishReadiness(state: ProgressState, projectId: string) {
  return READINESS_GATES.reduce(
    (next, gate) =>
      saveReadiness(
        next,
        next.ownerId,
        projectId,
        gate,
        evidence(gate),
        true,
        true,
        T1,
      ),
    state,
  );
}

describe("six career maps and append-only inventory", () => {
  it("maps the exact 141 competencies and 19 later specializations in their approved stages", () => {
    expect(careerProfiles.map((profile) => profile.id)).toEqual([
      ...CAREER_PROFILE_IDS,
    ]);
    expect(
      careerProfiles.flatMap((profile) =>
        profile.stages.flatMap((stage) => stage.competencies),
      ),
    ).toHaveLength(141);
    expect(
      careerProfiles.flatMap((profile) => profile.laterSpecializations),
    ).toHaveLength(19);
    for (const profile of careerProfiles) {
      expect(profile.stages.map((stage) => stage.stage)).toEqual([
        ...LEARNING_STAGES,
      ]);
      const canonical = {
        labels: profile.stages.map((stage) =>
          stage.competencies.map((skill) => skill.label),
        ),
        later: profile.laterSpecializations,
      };
      expect(
        createHash("sha256").update(JSON.stringify(canonical)).digest("hex"),
        profile.id,
      ).toBe(intentHashes[profile.id]);
      expect(
        profile.projectIds.map(
          (id) =>
            careerPackets.find((packet) => packet.projectId === id)!.repository,
        ),
      ).toEqual(expectedMappings[profile.id]);
      for (const stage of profile.stages) {
        expect(stage.outcome.length).toBeGreaterThan(60);
        expect(stage.evidence.length).toBeGreaterThan(60);
        for (const skill of stage.competencies) {
          expect(skill.lessonIds.length).toBeGreaterThan(0);
          expect(skill.coverageNote.length).toBeGreaterThan(50);
          for (const id of skill.lessonIds)
            expect(findLesson(catalog, id), skill.id).toBeDefined();
        }
      }
    }
  });
  it("adds exactly 16 optional lessons and five projects without redefining old totals", () => {
    const earlierTracks = catalog.tracks.filter(
      (track) => !isCareerCourse(track.trackId),
    );
    expect(earlierTracks).toHaveLength(13);
    expect(allLessons({ ...catalog, tracks: earlierTracks })).toHaveLength(371);
    expect(coreLessons(catalog)).toHaveLength(231);
    expect(careerProjects).toHaveLength(5);
    expect(
      careerProjects.flatMap((project) => project.milestones),
    ).toHaveLength(20);
    expect(
      catalog.projects.filter(
        (project) => project.variant !== "advanced-target",
      ),
    ).toHaveLength(26);
    const state = createProgress("guest", T0);
    expect(projectTotals(catalog, state, "original")).toEqual({
      total: 21,
      gates: 84,
      recorded: 0,
      completed: 0,
    });
    expect(projectTotals(catalog, state, "career")).toEqual({
      total: 5,
      gates: 20,
      recorded: 0,
      completed: 0,
    });
    expect(books).toHaveLength(6);
    expect(books.reduce((sum, book) => sum + book.bytes, 0)).toBe(90535922);
  });
  it("keeps profile selection out of the seven-ID settings and goal contract", () => {
    const state = createProgress("guest", T0);
    expect(CORE_TRACK_IDS).toEqual([
      "foundation",
      "data",
      "sde",
      "quant",
      "ai",
      "gate",
      "cat",
    ]);
    for (const profile of careerProfiles) {
      expect(
        settingsSchema.safeParse({
          ...state.settings,
          primaryTrack: profile.id,
        }).success,
      ).toBe(false);
      careerLessons(catalog, profile);
      for (const skill of profile.stages.flatMap((stage) => stage.competencies))
        competencyEvidence(state, skill);
    }
    expect(state).toEqual(createProgress("guest", T0));
    expect(
      settingsSchema.safeParse({ ...state.settings, primaryTrack: pm.trackId })
        .success,
    ).toBe(false);
  });
  it("deduplicates canonical lesson records across competency mappings", () => {
    const profile = careerProfiles[0];
    const lessons = careerLessons(catalog, profile);
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(
      lessons.length,
    );
    const shared = lessons.find(
      (lesson) => lesson.id === "sde-l06-concurrent-checkout",
    )!;
    const state = completeLesson(
      updateLesson(
        createProgress("guest", T0),
        shared.id,
        {
          evidence: evidence("concurrency"),
          rubricChecked: shared.assignment.acceptanceCriteria,
        },
        T1,
      ),
      shared,
      T1,
    );
    expect(lessonCompletion(lessons, state).completed).toBe(1);
    expect(Object.keys(state.lessons)).toEqual([shared.id]);
    expect(Object.keys(state.activity)).toHaveLength(1);
  });
});

describe("forty substantive original project exercises", () => {
  it("has ten shared packets, four ordered exercises each and no duplicated assignment bodies", () => {
    expect(careerPackets).toHaveLength(10);
    expect(
      careerPackets.every(
        (packet) => packet.referenceStatus === "accepted-local-reference",
      ),
    ).toBe(true);
    expect(new Set(careerPackets.map((packet) => packet.projectId)).size).toBe(
      10,
    );
    const exercises = careerPackets.flatMap((packet) => packet.exercises);
    expect(exercises).toHaveLength(40);
    expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(40);
    expect(
      new Set(exercises.map((exercise) => exercise.instructions.join())).size,
    ).toBe(40);
    for (const packet of careerPackets) {
      expect(packet.exercises.map((exercise) => exercise.stage)).toEqual([
        ...LEARNING_STAGES,
      ]);
      expect(packet.limitations.length).toBeGreaterThan(0);
      if (packet.referenceStatus === "pending-parent-review")
        expect(packet.coverage).toEqual([]);
      for (const exercise of packet.exercises) {
        expect(exercise.concepts).toHaveLength(2);
        expect(exercise.instructions).toHaveLength(3);
        expect(exercise.deliverables).toHaveLength(2);
        expect(exercise.acceptanceCriteria).toHaveLength(3);
        expect(exercise.reading.url).toMatch(/^https:\/\//);
        expect(exercise.reading.locator.length).toBeGreaterThan(35);
        expect(exercise.selfCheck.explanation.length).toBeGreaterThan(40);
        for (const id of exercise.lessonIds)
          expect(findLesson(catalog, id)).toBeDefined();
      }
    }
  });
  it("retains the reviewed reference limitations rather than inferring full original-project coverage", () => {
    const limits = (repository: string) =>
      careerPackets
        .find((packet) => packet.repository === repository)!
        .limitations.join(" ");
    expect(limits("paper-exchange-engine")).toMatch(
      /no account balances.*Windows.*blocked/i,
    );
    expect(limits("portfolio-risk-service")).toMatch(
      /no derivatives.*realized P&L.*not historical knowledge-time.*not VaR/i,
    );
    expect(limits("commerce-workflow-engine")).toMatch(
      /not.*PostgreSQL.*at-least-once.*not.*exactly-once.*exclude HTTP/i,
    );
    expect(limits("tenant-policy-service")).toMatch(
      /does not enforce.*external resources.*Not AWS IAM/i,
    );
    expect(limits("model-serving-gateway")).toMatch(
      /No LLM.*SHA integrity is not a publisher signature.*not a randomized product experiment/i,
    );
    expect(limits("replayable-data-platform")).toMatch(
      /full gold rematerialization.*not partial CDC.*not Parquet alone/i,
    );
    expect(limits("point-in-time-workbench")).toMatch(
      /raw ZIP.*full history.*future events.*not guarantees.*never|raw ZIP.*full history.*future events.*not guarantees.*do not infer/i,
    );
    expect(limits("supply-chain-verifier")).toMatch(
      /floats or negative zero.*signature.*digest fails.*No SLSA level, Sigstore/i,
    );
    expect(limits("retrieval-evaluation-lab")).toMatch(
      /2 of 8.*irrelevant.*1 of 5.*rollback.*restore older ACLs/i,
    );
    expect(limits("model-observability-lab")).toMatch(
      /Single-tenant, unauthenticated.*not production.*do not guarantee.*excludes HTTP and storage/i,
    );
  });
  it("publishes only learning concepts and permitted links, not private planning/receipt/resume metadata", () => {
    const text = JSON.stringify({
      careerProfiles,
      careerPackets,
      careerProjects,
      pm,
    });
    expect(text).not.toMatch(
      /copilot-worktrees|\.copilot|C:\\\\|accountBoundary|deliveryDirectory|newProjectRoot|privateSourcePath|-----BEGIN .*PRIVATE KEY-----|candidate[0-9a-f]{8}/,
    );
  });
});

describe("new PM curriculum quality and independent numeric grading", () => {
  it("has four substantive lessons per stage with balanced explained choices and one capstone", () => {
    expect(pm.modules).toHaveLength(8);
    expect(pm.stageOutcomes?.map((outcome) => outcome.stage)).toEqual([
      ...LEARNING_STAGES,
    ]);
    const positions = [0, 0, 0];
    for (const stage of LEARNING_STAGES)
      expect(requiredLessons(pm, "all", stage)).toHaveLength(4);
    for (const lesson of requiredLessons(pm)) {
      expect(lesson.video).toBeNull();
      expect(lesson.objectives.length).toBeGreaterThanOrEqual(2);
      expect(lesson.topics.every((topic) => topic.details.length >= 2)).toBe(
        true,
      );
      expect(lesson.assignment.instructions.length).toBeGreaterThanOrEqual(3);
      expect(lesson.assignment.deliverables.length).toBeGreaterThanOrEqual(2);
      expect(
        lesson.assignment.acceptanceCriteria.length,
      ).toBeGreaterThanOrEqual(3);
      expect(lesson.assignment.questions.length).toBeGreaterThanOrEqual(2);
      expect(lesson.reading.locator.length).toBeGreaterThan(35);
      for (const question of lesson.assignment.questions) {
        expect(question.explanation.length).toBeGreaterThan(40);
        if (question.kind === "single-choice") {
          expect(question.choices).toHaveLength(3);
          const position = question.choices!.indexOf(String(question.answer));
          expect(position).toBeGreaterThanOrEqual(0);
          positions[position] += 1;
        }
      }
    }
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(
      1,
    );
    const capstones = requiredLessons(pm).filter(
      (lesson) => lesson.assignment.kind === "project",
    );
    expect(capstones).toHaveLength(1);
    expect(capstones[0].assignment.deliverables.length).toBeGreaterThanOrEqual(
      4,
    );
    expect(
      capstones[0].assignment.acceptanceCriteria.length,
    ).toBeGreaterThanOrEqual(6);
    expect(
      pm.resources.every(
        (resource) =>
          resource.access === "free" &&
          resource.redistribution === "link-only" &&
          !resource.hostedPath &&
          !resource.downloadUrl,
      ),
    ).toBe(true);
  });
  const numericFixtures: Record<string, number> = {
    "tpm-q04-numeric": (20 * 100) / 80,
    "tpm-q06-numeric": (120 * 2 * 0.5) / 4,
    "tpm-q07-numeric": (1 * 100) / 2,
    "tpm-q10-numeric": (600 - 500) ** 2 / 500 + (400 - 500) ** 2 / 500,
    "tpm-q11-numeric": 2400 / (12 - 8),
    "tpm-q15-numeric": ((12 * 80 - 8 * 100) * 100) / (100 * 80),
  };
  it.each(Object.entries(numericFixtures))(
    "%s uses an independently calculated key and exact unit/tolerance boundaries",
    (id, expected) => {
      const question = requiredLessons(pm)
        .flatMap((lesson) => lesson.assignment.questions)
        .find((question) => question.id === id)!;
      expect(question.answer).toBe(expected);
      expect(gradeQuestion(question, String(expected))).toBe(true);
      const tolerance = question.numericTolerance || 0;
      expect(gradeQuestion(question, String(expected + tolerance))).toBe(true);
      expect(gradeQuestion(question, String(expected - tolerance))).toBe(true);
      expect(
        gradeQuestion(
          question,
          String(expected + (tolerance ? tolerance * 2 : 0.0001)),
        ),
      ).toBe(false);
      expect(gradeQuestion(question, String(expected / 100))).toBe(false);
      for (const invalid of [
        "",
        "NaN",
        "Infinity",
        "1/0",
        `${expected}%`,
        "undefined",
      ])
        expect(gradeQuestion(question, invalid)).toBe(false);
    },
  );
  it("keeps the zero-contribution and causal-inference cases explained rather than inventing numeric answers", () => {
    const economics = findLesson(catalog, "tpm-l11-unit-economics")!.lesson;
    const question = economics.assignment.questions.find(
      (question) => question.kind === "single-choice",
    )!;
    expect(
      gradeQuestion(
        question,
        "There is no finite break-even volume under this model",
      ),
    ).toBe(true);
    expect(gradeQuestion(question, "Break-even volume is zero")).toBe(false);
    const written = findLesson(
      catalog,
      "tpm-l10-experiment-validity",
    )!.lesson.assignment.questions.find(
      (question) => question.kind === "short-answer",
    )!;
    expect(gradeQuestion(written, String(written.answer))).toBeNull();
  });
});

describe("independent per-gate readiness records", () => {
  const projectId = "sde-order-orchestrator";
  it("never derives readiness from reference availability or existing original build completion", () => {
    const state = createProgress("uid:alice", T0);
    const project = catalog.projects.find(
      (project) => project.id === projectId,
    )!;
    state.projects[projectId] = {
      id: projectId,
      updatedAt: T0,
      milestones: project.milestones.map((gate) => gate.id),
      evidence: evidence("old build"),
    };
    expect(readinessCount(state, projectId)).toBe(0);
    expect(projectTotals(catalog, state, "original").completed).toBe(1);
    expect(
      careerPackets.find((packet) => packet.projectId === projectId)!
        .referenceStatus,
    ).toBe("accepted-local-reference");
  });
  it("requires meaningful distinct evidence, rubric acknowledgement and ordered gates", () => {
    const state = createProgress("uid:alice", T0);
    for (const invalid of ["", "x".repeat(100), "done ".repeat(20), "short"])
      expect(() =>
        saveReadiness(
          state,
          state.ownerId,
          projectId,
          "explain",
          invalid,
          true,
          true,
          T1,
        ),
      ).toThrow(/meaningful/);
    expect(() =>
      saveReadiness(
        state,
        state.ownerId,
        projectId,
        "explain",
        evidence("explain"),
        true,
        false,
        T1,
      ),
    ).toThrow(/Confirm/);
    expect(() =>
      saveReadiness(
        state,
        state.ownerId,
        projectId,
        "modify",
        evidence("modify"),
        true,
        true,
        T1,
      ),
    ).toThrow(/earlier/);
    const next = saveReadiness(
      state,
      state.ownerId,
      projectId,
      "explain",
      evidence("explain"),
      true,
      true,
      T1,
    );
    expect(() =>
      saveReadiness(
        next,
        next.ownerId,
        projectId,
        "modify",
        evidence("explain"),
        true,
        true,
        T2,
      ),
    ).toThrow(/distinct/);
    expect(() =>
      saveReadiness(
        next,
        next.ownerId,
        projectId,
        "explain",
        "",
        false,
        false,
        T2,
      ),
    ).toThrow(/meaningful/);
    const finished = finishReadiness(state, projectId);
    expect(() =>
      saveReadiness(
        finished,
        finished.ownerId,
        projectId,
        "explain",
        evidence("modify"),
        false,
        false,
        T2,
      ),
    ).toThrow(/distinct/);
  });
  it("isolates each gate's evidence and excludes all readiness from old and new build totals", () => {
    const before = createProgress("uid:alice", T0);
    const next = finishReadiness(before, projectId);
    expect(readinessCount(next, projectId)).toBe(4);
    expect(Object.keys(next.projects)).toHaveLength(4);
    expect(Object.keys(next.lessons)).toHaveLength(0);
    expect(next.settings).toEqual(before.settings);
    for (const gate of READINESS_GATES) {
      const id = readinessRecordId(projectId, gate);
      expect(next.projects[id].evidence).toBe(evidence(gate));
      expect(next.projects[id].milestones).toEqual([
        readinessMilestoneId(projectId, gate),
      ]);
      expect(isReadinessEntity(id)).toBe(true);
      expect(id.length).toBeLessThanOrEqual(160);
    }
    expect(projectTotals(catalog, next, "original")).toEqual(
      projectTotals(catalog, before, "original"),
    );
    expect(projectTotals(catalog, next, "career")).toEqual(
      projectTotals(catalog, before, "career"),
    );
    expect(lessonCompletion(coreLessons(catalog), next).completed).toBe(0);
    expect(isReadinessEntity("career-readiness-forged-project")).toBe(false);
    expect(isReadinessEntity(projectId)).toBe(false);
  });
  it("records substantive calendar/streak activity once, not on drafts or repeated completion", () => {
    const before = createProgress("uid:alice", T0);
    const draft = saveReadiness(
      before,
      before.ownerId,
      projectId,
      "explain",
      evidence("explain"),
      false,
      false,
      T1,
    );
    expect(Object.keys(draft.activity)).toHaveLength(0);
    const next = saveReadiness(
      draft,
      draft.ownerId,
      projectId,
      "explain",
      evidence("explain"),
      true,
      true,
      T2,
    );
    expect(getActivityDays(next, T3)).toEqual({ "2026-09-29": 1 });
    expect(getStreak(next, T3)).toBe(1);
    const event = Object.values(next.activity)[0];
    expect(event.kind).toBe("project");
    expect(event.detail).toMatch(
      /Independent readiness: Explain.*not project completion/,
    );
    expect(isReadinessEntity(event.entityId)).toBe(true);
    const repeat = saveReadiness(
      next,
      next.ownerId,
      projectId,
      "explain",
      evidence("explain"),
      true,
      true,
      T3,
    );
    expect(repeat).toBe(next);
    expect(Object.keys(repeat.activity)).toHaveLength(1);
  });
  it("rejects owner switches, stale editor versions and old timestamps without altering records", () => {
    const state = createProgress("uid:alice", T0);
    expect(() =>
      saveReadiness(
        state,
        "uid:bob",
        projectId,
        "explain",
        evidence("explain"),
        true,
        true,
        T1,
      ),
    ).toThrow(/account changed/);
    const next = saveReadiness(
      state,
      state.ownerId,
      projectId,
      "explain",
      evidence("explain"),
      false,
      false,
      T1,
      null,
    );
    expect(() =>
      saveReadiness(
        next,
        next.ownerId,
        projectId,
        "explain",
        evidence("different"),
        false,
        false,
        T2,
        null,
      ),
    ).toThrow(/changed while/);
    expect(() =>
      saveReadiness(
        next,
        next.ownerId,
        projectId,
        "explain",
        evidence("different"),
        false,
        false,
        T0,
        T1,
      ),
    ).toThrow(/newer/);
    expect(
      next.projects[readinessRecordId(projectId, "explain")].evidence,
    ).toBe(evidence("explain"));
  });
  it.each(careerPackets)(
    "$repository readiness survives export/import and UID journals without touching old records",
    (packet) => {
      const before = createProgress("uid:alice", T0);
      before.settings.primaryTrack = "data";
      const oldId = catalog.projects[0].id;
      before.projects[oldId] = {
        id: oldId,
        updatedAt: T0,
        milestones: [],
        evidence: evidence("original"),
      };
      const next = finishReadiness(before, packet.projectId);
      expect(next.projects[oldId]).toEqual(before.projects[oldId]);
      expect(parseImport(exportProgress(next), next.ownerId)).toEqual(next);
      expect(validateProgressState(next)).toEqual(next);
      const journal = recordChanges(before, next, {
        ...emptyJournal(next.ownerId),
        pending: [`projects/${oldId}`],
      });
      expect(journal.pending).toContain(`projects/${oldId}`);
      expect(journal.pending).not.toContain("settings/settings");
      const records = recordsFromState(next).map(validateSyncRecord);
      const synced = reconcileRecords(
        before,
        emptyJournal(next.ownerId),
        records,
      ).state;
      expect(synced.projects).toEqual(next.projects);
      expect(() => parseImport(exportProgress(next), "uid:bob")).toThrow(
        /owner mismatch/,
      );
      const conflicting = saveReadiness(
        before,
        before.ownerId,
        packet.projectId,
        "explain",
        evidence("destination"),
        false,
        false,
        T2,
      );
      const merge = mergeImport(conflicting, exportProgress(next));
      expect(
        merge.state.projects[readinessRecordId(packet.projectId, "explain")]
          .evidence,
      ).toBe(evidence("destination"));
    },
  );
  it("new PM self-check and assignment records use existing lesson, error and review behavior", () => {
    const lesson = requiredLessons(pm)[0];
    const state = createProgress("uid:alice", T0);
    const question = lesson.assignment.questions.find(
      (question) => question.kind === "single-choice",
    )!;
    const attempt = assessLesson(
      state,
      lesson,
      { [question.id]: String(question.answer) },
      T1,
    );
    expect(attempt.lessons[lesson.id].manualCompletedAt).toBeNull();
    const next = completeLesson(
      updateLesson(
        attempt,
        lesson.id,
        {
          evidence: evidence("PM discovery"),
          rubricChecked: lesson.assignment.acceptanceCriteria,
          bookmarked: true,
          note: "My private assumptions and ethical research notes.",
          readingPosition: "Define the problem",
        },
        T2,
      ),
      lesson,
      T2,
    );
    expect(next.lessons[lesson.id].review).not.toBeNull();
    expect(next.settings.primaryTrack).toBe("foundation");
    expect(lessonCompletion(coreLessons(catalog), next).completed).toBe(0);
    expect(parseImport(exportProgress(next), next.ownerId)).toEqual(next);
    expect(readinessRecorded(next, projectId, "explain")).toBe(false);
  });
});
