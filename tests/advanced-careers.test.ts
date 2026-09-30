import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  allLessons,
  coreLessons,
  findLesson,
  findResource,
  getCatalog,
  isCareerCourse,
  lessonCompletion,
  validateCatalog,
} from "../src/content/catalog";
import {
  ADVANCED_SOURCE_SHA256,
  advancedGroups,
  advancedLessons,
  advancedPaths,
  advancedTargets,
  advancedProjectLanguageLessons,
  comparisonTechnologies,
} from "../src/content/advanced-careers";
import {
  advancedPackets,
  advancedProjects,
} from "../src/content/advanced-projects";
import { careerPackets } from "../src/content/career-exercises";
import {
  allCareerPackets,
  isReadinessEntity,
  projectTotals,
  readinessCount,
  readinessRecordId,
  saveReadiness,
} from "../src/domain/careers";
import {
  completeLesson,
  createProgress,
  exportProgress,
  mergeImport,
  parseImport,
  updateLesson,
} from "../src/domain/progress";
import {
  settingsSchema,
  validateProgressState,
} from "../src/domain/validation";
import {
  CAREER_COURSE_IDS,
  CAREER_PROFILE_IDS,
  CORE_TRACK_IDS,
  LEARNING_STAGES,
  READINESS_GATES,
  type ProgressState,
} from "../src/domain/types";
import {
  emptyJournal,
  recordChanges,
  recordsFromState,
  reconcileRecords,
} from "../src/state/records";
import { validateSyncRecord } from "../src/services/sync";
import { saveWrittenSelfCheck } from "../src/state/assessment";

const catalog = getCatalog();
const courses = catalog.tracks.filter((track) => isCareerCourse(track.trackId));
const newLessons = allLessons({ ...catalog, tracks: courses });
const T0 = "2026-09-20T10:00:00.000Z";
const T1 = "2026-09-30T00:01:00.000Z";
const T2 = "2026-09-30T00:02:00.000Z";
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const evidence = (id: string, gate: string) =>
  `My independent ${gate} evidence for ${id}: predicted the original fixture, exercised the actual declared boundary and retained the observed failure and correction.`;
function finish(state: ProgressState, projectId: string) {
  return READINESS_GATES.reduce(
    (next, gate) =>
      saveReadiness(
        next,
        next.ownerId,
        projectId,
        gate,
        evidence(projectId, gate),
        true,
        true,
        T1,
      ),
    state,
  );
}

describe("exact six-domain advanced learning contract", () => {
  it("retains all 114 full source descriptions and 24 numbered titles, not just keywords", () => {
    expect(ADVANCED_SOURCE_SHA256).toBe(
      "2a4e89a2b7e8eb1171695faacf9af760726018e04cc1d6ba9b3ac25b38e6f6de",
    );
    expect(advancedPaths.map((item) => item.id)).toEqual([
      ...CAREER_PROFILE_IDS,
    ]);
    expect(advancedGroups).toHaveLength(114);
    expect(
      digest(
        advancedGroups.map((group) => [
          group.id,
          group.label,
          group.requestedDescription,
        ]),
      ),
    ).toBe("d7ee35876d8a8ac0cdccba17ffa42e5db7b762e7768b1a27609a752f3151dae8");
    expect(
      digest(advancedTargets.map((target) => [target.number, target.title])),
    ).toBe("882f5d97013968a164fcd4db66fcca58b48f3a059897ce759291f8ad947aff2c");
    expect(
      digest(
        advancedGroups.flatMap((group) =>
          group.capabilities.map((capability) => [
            capability.id,
            capability.label,
            capability.lessonIds,
          ]),
        ),
      ),
    ).toBe("9e2351cf86499def505d3dff2ffcf9382a6b72a1e65002c69153e92f114d250d");
    expect(advancedTargets.map((target) => target.number)).toEqual(
      Array.from({ length: 24 }, (_, i) => i + 1),
    );
    expect(
      advancedGroups.filter((group) => group.priorCoverage === "full"),
    ).toHaveLength(5);
    expect(
      advancedGroups.filter((group) => group.priorCoverage === "partial"),
    ).toHaveLength(67);
    expect(
      advancedGroups.filter((group) => group.priorCoverage === "missing"),
    ).toHaveLength(42);
    for (const career of advancedPaths) {
      expect(career.stages.map((item) => item.stage)).toEqual([
        ...LEARNING_STAGES,
      ]);
      expect(career.stages.map((item) => item.groups.length)).toEqual([
        5, 5, 5, 4,
      ]);
      expect(career.projectIds).toHaveLength(4);
      expect(new Set(career.projectIds).size).toBe(4);
      for (const id of career.projectIds) {
        expect(advancedTargets.find((target) => target.id === id)?.domain).toBe(
          career.number,
        );
        expect(advancedProjectLanguageLessons(id).length).toBeGreaterThan(0);
      }
    }
  });

  it("appends seven complete courses and 137 original, substantive, four-stage units", () => {
    expect(courses.map((course) => course.trackId)).toEqual([
      ...CAREER_COURSE_IDS,
    ]);
    expect(newLessons).toHaveLength(137);
    expect(courses.flatMap((course) => course.modules)).toHaveLength(109);
    expect(courses[0].modules).toHaveLength(8);
    expect(courses[0].modules.flatMap((module) => module.lessons)).toHaveLength(
      24,
    );
    expect(allLessons(catalog)).toHaveLength(508);
    const explanations = new Set<string>();
    const assignments = new Set<string>();
    for (const course of courses) {
      expect(course.stageOutcomes?.map((item) => item.stage)).toEqual([
        ...LEARNING_STAGES,
      ]);
      for (const stage of LEARNING_STAGES)
        expect(course.modules.some((module) => module.stage === stage)).toBe(
          true,
        );
      for (const lesson of course.modules.flatMap((module) => module.lessons)) {
        expect(lesson.optional).toBe(false);
        expect(lesson.video).toBeNull();
        expect(lesson.objectives).toHaveLength(2);
        expect(lesson.topics.length).toBeGreaterThanOrEqual(2);
        const explanation = lesson.topics
          .map((topic) => topic.details[0])
          .join(" ");
        expect(explanation.length, lesson.id).toBeGreaterThan(400);
        explanations.add(explanation);
        expect(lesson.assignment.instructions.length).toBeGreaterThanOrEqual(4);
        expect(lesson.assignment.instructions[0].length).toBeGreaterThan(80);
        expect(lesson.assignment.instructions[2].length).toBeGreaterThan(80);
        assignments.add(JSON.stringify(lesson.assignment.instructions));
        expect(lesson.assignment.deliverables.length).toBeGreaterThanOrEqual(3);
        expect(
          lesson.assignment.acceptanceCriteria.length,
        ).toBeGreaterThanOrEqual(3);
        expect(lesson.assignment.questions.length).toBeGreaterThanOrEqual(1);
        expect(
          lesson.assignment.questions[0].explanation.length,
        ).toBeGreaterThan(60);
        expect(lesson.practiceEnvironment?.requirements.length).toBeGreaterThan(
          0,
        );
        expect(lesson.practiceEnvironment?.unavailableAction).toMatch(
          /incomplete|unchecked/,
        );
        expect(lesson.prerequisites?.length).toBeGreaterThan(0);
      }
    }
    expect(explanations.size).toBe(137);
    expect(assignments.size).toBe(137);
  });

  it("gives every required unit a free accessible primary at a precise locator", () => {
    for (const lesson of newLessons) {
      const reading = findResource(catalog, lesson.reading.resourceId);
      expect(reading.access, lesson.id).toBe("free");
      expect(reading.availability, lesson.id).not.toBe("access-limited");
      expect(lesson.reading.locator.length, lesson.id).toBeGreaterThan(60);
      expect(reading.url).toMatch(/^https:\/\//);
      for (const id of lesson.supplementaryResourceIds) {
        const source = findResource(catalog, id);
        if (source.availability === "access-limited")
          expect(source.access).toBe("unverified-optional");
      }
    }
    const altered = structuredClone(catalog);
    const course = altered.tracks.find(
      (track) => track.trackId === "systems-languages",
    )!;
    const lesson = course.modules[0].lessons[0];
    const resource = altered.tracks
      .flatMap((track) => track.resources)
      .find((item) => item.id === lesson.reading.resourceId)!;
    resource.availability = "access-limited";
    expect(() => validateCatalog(altered)).toThrow(/accessible free primary/);
  });

  it("retains factual C++23 comparison-table coverage without changing the 114-group contract", () => {
    expect(comparisonTechnologies).toHaveLength(1);
    const comparison = comparisonTechnologies[0];
    expect(comparison.sourceContext).toMatch(/comparison table.*C\+\+20\/23/i);
    expect(comparison.scopeNote).toMatch(/does not publish hiring-demand/i);
    expect(comparison.lessonIds).toEqual([
      "systems-foundation-cpp-values",
      "systems-professional-runtime-contracts",
    ]);
    const values = findLesson(catalog, comparison.lessonIds[0])!.lesson;
    expect(values.canonicalConceptTags).toContain("technology:c++23");
    expect(
      values.topics.map((topic) => topic.details.join(" ")).join(" "),
    ).toMatch(/__cpp_lib_expected.*202202L/);
    expect(values.assignment.instructions.join(" ")).toMatch(
      /C\+\+17, C\+\+20 and C\+\+23/,
    );
    expect(
      values.assignment.questions.some((question) =>
        question.prompt.includes("-std=c++23"),
      ),
    ).toBe(true);
    expect(findResource(catalog, values.reading.resourceId).url).toContain(
      "/2023/n4950.pdf",
    );
    expect(values.reading.locator).toContain("[version.syn]");
    expect(advancedGroups).toHaveLength(114);
    expect(advancedTargets).toHaveLength(24);
  });

  it("maps every named capability to registered teaching without conflating the two Tritons", () => {
    const capabilities = advancedGroups.flatMap((group) => group.capabilities);
    expect(capabilities).toHaveLength(527);
    expect(new Set(capabilities.map((item) => item.id)).size).toBe(527);
    for (const group of advancedGroups) {
      expect(group.lessonIds.length).toBeGreaterThan(0);
      for (const capability of group.capabilities) {
        expect(capability.lessonIds.length).toBeGreaterThan(0);
        for (const id of capability.lessonIds) {
          expect(group.lessonIds).toContain(id);
          expect(findLesson(catalog, id)).toBeDefined();
        }
      }
    }
    const server = findLesson(
      catalog,
      "advanced-d2-foundation-03-serving-runtimes",
    )!.lesson;
    const dsl = findLesson(catalog, "systems-advanced-triton")!.lesson;
    expect(server.reading.resourceId).not.toBe(dsl.reading.resourceId);
    expect(server.assignment.instructions.join(" ")).toMatch(
      /Inference Server/,
    );
    expect(dsl.assignment.instructions.join(" ")).toMatch(/masked|tile/i);
    for (const language of [
      "rust",
      "go",
      "c++",
      "c",
      "python",
      "sql",
      "bash",
      "java",
      "cuda",
      "triton dsl",
      "triton inference server",
    ])
      expect(
        newLessons.some((lesson) =>
          lesson.canonicalConceptTags.includes(`technology:${language}`),
        ),
        language,
      ).toBe(true);
    const coreLanguages = advancedGroups.find(
      (group) => group.id === "advanced-d1-foundation-01",
    )!;
    expect(
      coreLanguages.capabilities.find((capability) => capability.label === "Go")
        ?.lessonIds,
    ).toEqual(["systems-foundation-go"]);
    expect(
      coreLanguages.capabilities.find(
        (capability) => capability.label === "RAII",
      )?.lessonIds,
    ).toEqual(["systems-foundation-cpp-memory"]);
    const gpu = advancedGroups.find(
      (group) => group.id === "advanced-d2-advanced-01",
    )!;
    expect(
      gpu.capabilities.find((capability) => capability.label === "Triton DSL")
        ?.lessonIds,
    ).toEqual(["systems-advanced-triton"]);
  });

  it("reuses canonical lessons once and keeps all earlier content and preferences separate", () => {
    expect(coreLessons(catalog)).toHaveLength(231);
    expect(
      catalog.tracks.filter((track) => !isCareerCourse(track.trackId)),
    ).toHaveLength(13);
    expect(
      allLessons({
        ...catalog,
        tracks: catalog.tracks.filter(
          (track) => !isCareerCourse(track.trackId),
        ),
      }),
    ).toHaveLength(371);
    for (const path of advancedPaths) {
      const lessons = advancedLessons(catalog, path);
      expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(
        lessons.length,
      );
      expect(
        path.stages
          .flatMap((stage) => stage.groups)
          .some((group) =>
            group.lessonIds.some(
              (id) => !newLessons.some((lesson) => lesson.id === id),
            ),
          ),
      ).toBe(true);
    }
    const state = createProgress("guest", T0);
    for (const id of CAREER_COURSE_IDS)
      expect(
        settingsSchema.safeParse({ ...state.settings, primaryTrack: id })
          .success,
      ).toBe(false);
    expect(CORE_TRACK_IDS).toHaveLength(7);
    const ai = advancedPaths.find((path) => path.id === "ai-systems")!;
    expect(
      advancedLessons(catalog, ai, "foundation").map((lesson) => lesson.id),
    ).not.toContain("systems-advanced-cuda");
    expect(
      advancedLessons(catalog, ai, "advanced").map((lesson) => lesson.id),
    ).toContain("systems-advanced-cuda");
    const quant = advancedPaths.find((path) => path.id === "quant-developer")!;
    expect(
      advancedLessons(catalog, quant, "foundation").map((lesson) => lesson.id),
    ).not.toContain("systems-advanced-cpp-spsc-arenas");
  });

  it("preserves earlier preparation and Firebase bytes while adding new content", () => {
    const hashes = {
      "src/content/careers.ts":
        "98622004530ef55a89903e43e04cfda5d78302aab63112f299b07bd58d7e3e21",
      "src/content/career-exercises.ts":
        "96e71eb6e807bc93eb6fb35e205f6e13f9a14439ae0ad70942856b253478b74e",
      "src/content/career-projects.ts":
        "842645915bfda315e19e6817dddc76945ea776e68d50cbbea6b9536758cb83f3",
      "firebase.rules":
        "23e0e66989b612c4ef681ddb19a7aaa28732b792616c74d7a40bffb7310fc2a4",
      "firebase.json":
        "8364b8f59c828606829cf512c81eb78b4d932d67211a156f2cf570e454cffb6c",
      "firebase-config.js":
        "eb2e920d70e42c7788977dad5c20e786a65135464dc9a1bc5018146bad88424b",
    };
    for (const [name, hash] of Object.entries(hashes)) {
      const bytes = fs.readFileSync(path.resolve(...name.split("/")));
      // This legacy root JS file uses platform checkout EOLs; its Git content is unchanged.
      const content =
        name === "firebase-config.js"
          ? Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"))
          : bytes;
      expect(createHash("sha256").update(content).digest("hex"), name).toBe(
        hash,
      );
    }
  });
});

describe("new advanced scopes never inherit earlier readiness", () => {
  it("keeps 24 projects/96 gates and 96 exercises/readiness identities distinct", () => {
    expect(advancedProjects).toHaveLength(24);
    expect(
      advancedProjects.flatMap((project) => project.milestones),
    ).toHaveLength(96);
    const exercises = advancedPackets.flatMap((packet) => packet.exercises);
    expect(exercises).toHaveLength(96);
    expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(96);
    expect(
      new Set(
        exercises.map((exercise) => JSON.stringify(exercise.instructions)),
      ).size,
    ).toBe(96);
    expect(allCareerPackets).toHaveLength(34);
    expect(careerPackets).toHaveLength(10);
    expect(
      advancedPackets.find(
        (packet) => packet.projectId === "advanced-target-17",
      )?.repository,
    ).toBe("paper-exchange-engine");
    for (const packet of advancedPackets) {
      expect(packet.exercises.map((exercise) => exercise.stage)).toEqual([
        ...LEARNING_STAGES,
      ]);
      if (packet.referenceStatus === "pending-parent-review")
        expect(packet.coverage).toEqual([]);
      for (const gate of READINESS_GATES) {
        const id = readinessRecordId(packet.projectId, gate);
        expect(id.length).toBeLessThanOrEqual(160);
        expect(isReadinessEntity(id)).toBe(true);
      }
    }
  });

  it("does not infer advanced completion from any old build, readiness or accepted reference", () => {
    let state = createProgress("guest", T0);
    for (const project of catalog.projects.filter(
      (project) => project.variant !== "advanced-target",
    ))
      state.projects[project.id] = {
        id: project.id,
        updatedAt: T0,
        milestones: project.milestones.map((gate) => gate.id),
        evidence: evidence(project.id, "old build"),
      };
    for (const packet of careerPackets) state = finish(state, packet.projectId);
    expect(projectTotals(catalog, state, "original")).toMatchObject({
      total: 21,
      gates: 84,
      completed: 21,
    });
    expect(projectTotals(catalog, state, "career")).toMatchObject({
      total: 5,
      gates: 20,
      completed: 5,
    });
    expect(projectTotals(catalog, state, "advanced")).toEqual({
      total: 24,
      gates: 96,
      recorded: 0,
      completed: 0,
    });
    for (const target of advancedTargets)
      expect(readinessCount(state, target.id)).toBe(0);
    expect(state.projects["quant-multi-instrument-ledger"]).toBeDefined();
    expect(state.projects["advanced-target-17"]).toBeUndefined();
    expect(state.lessons).toEqual({});
  });

  it("requires meaningful distinct evidence, ordered gates and rejects stale/wrong-owner edits", () => {
    const state = createProgress("uid:alice", T0);
    const id = "advanced-target-17";
    expect(() =>
      saveReadiness(
        state,
        state.ownerId,
        id,
        "modify",
        evidence(id, "modify"),
        true,
        true,
        T1,
      ),
    ).toThrow(/earlier/);
    expect(() =>
      saveReadiness(
        state,
        state.ownerId,
        id,
        "explain",
        "done ".repeat(20),
        true,
        true,
        T1,
      ),
    ).toThrow(/meaningful/);
    expect(() =>
      saveReadiness(
        state,
        state.ownerId,
        id,
        "explain",
        evidence(id, "explain"),
        true,
        false,
        T1,
      ),
    ).toThrow(/Confirm/);
    const first = saveReadiness(
      state,
      state.ownerId,
      id,
      "explain",
      evidence(id, "explain"),
      true,
      true,
      T1,
    );
    expect(() =>
      saveReadiness(
        first,
        first.ownerId,
        id,
        "modify",
        evidence(id, "explain"),
        true,
        true,
        T2,
      ),
    ).toThrow(/distinct/);
    expect(() =>
      saveReadiness(
        first,
        "uid:bob",
        id,
        "explain",
        evidence(id, "new"),
        false,
        false,
        T2,
      ),
    ).toThrow(/account changed/i);
    expect(() =>
      saveReadiness(
        first,
        first.ownerId,
        id,
        "explain",
        evidence(id, "new"),
        false,
        false,
        T2,
        null,
      ),
    ).toThrow(/changed while/);
    expect(first.projects[readinessRecordId(id, "explain")].evidence).toBe(
      evidence(id, "explain"),
    );
  });

  it("round-trips all 96 new records through existing UID exports, journals and sync without old-data loss", () => {
    const before = createProgress("uid:alice", T0);
    before.settings.primaryTrack = "data";
    before.projects["sde-order-orchestrator"] = {
      id: "sde-order-orchestrator",
      updatedAt: T0,
      milestones: [],
      evidence: evidence("old", "preserved"),
    };
    let next = before;
    for (const packet of advancedPackets) next = finish(next, packet.projectId);
    expect(Object.keys(next.projects)).toHaveLength(97);
    expect(Object.keys(next.activity)).toHaveLength(96);
    expect(next.projects["sde-order-orchestrator"]).toEqual(
      before.projects["sde-order-orchestrator"],
    );
    expect(next.settings).toEqual(before.settings);
    expect(next.lessons).toEqual({});
    expect(validateProgressState(next)).toEqual(next);
    expect(parseImport(exportProgress(next), next.ownerId)).toEqual(next);
    expect(() => parseImport(exportProgress(next), "uid:bob")).toThrow(
      /owner mismatch/,
    );
    const journal = recordChanges(before, next, {
      ...emptyJournal(next.ownerId),
      pending: ["projects/sde-order-orchestrator"],
    });
    expect(journal.pending).toContain("projects/sde-order-orchestrator");
    expect(journal.pending).not.toContain("settings/settings");
    const records = recordsFromState(next).map(validateSyncRecord);
    expect(
      reconcileRecords(before, emptyJournal(next.ownerId), records).state
        .projects,
    ).toEqual(next.projects);
    const conflict = saveReadiness(
      before,
      before.ownerId,
      "advanced-target-17",
      "explain",
      evidence("destination", "draft"),
      false,
      false,
      T2,
    );
    const imported = mergeImport(conflict, exportProgress(next));
    expect(
      imported.state.projects[
        readinessRecordId("advanced-target-17", "explain")
      ].evidence,
    ).toBe(evidence("destination", "draft"));
    expect(projectTotals(catalog, next, "advanced").recorded).toBe(0);
  });

  it("uses normal lesson notes, manual self-checks, rubric completion and reviews without seeding projects", () => {
    const lesson = findLesson(catalog, "systems-foundation-rust")!.lesson;
    const before = createProgress("uid:alice", T0);
    const question = lesson.assignment.questions[0];
    const reflection = saveWrittenSelfCheck(
      before,
      lesson,
      {
        [question.id]:
          "A lifetime describes borrowing relationships; it cannot extend an allocation.",
      },
      T1,
    );
    expect(reflection.lessons[lesson.id].manualCompletedAt).toBeNull();
    const next = completeLesson(
      updateLesson(
        reflection,
        lesson.id,
        {
          evidence: evidence(lesson.id, "actual fixture"),
          rubricChecked: lesson.assignment.acceptanceCriteria,
          note: "Private ownership explanation",
          bookmarked: true,
          readingPosition: "Ownership and borrowing",
        },
        T2,
      ),
      lesson,
      T2,
    );
    expect(next.lessons[lesson.id].review).not.toBeNull();
    expect(next.projects).toEqual({});
    expect(lessonCompletion(coreLessons(catalog), next).completed).toBe(0);
    expect(parseImport(exportProgress(next), next.ownerId)).toEqual(next);
  });

  it("retains technical limitations and excludes private operational metadata", () => {
    const publicText = JSON.stringify([
      courses,
      advancedPaths,
      advancedTargets,
      advancedPackets,
    ]);
    expect(publicText).not.toMatch(
      /copilot-worktrees|\\\\Users\\\\|\.copilot|sourceAttachment|comparisonMatrixSource|run_id|artifactPath|NomulaVijayShashank/,
    );
    expect(publicText).not.toMatch(/(?<![a-f0-9])[a-f0-9]{40}(?![a-f0-9])/);
    expect(advancedTargets[13].limitations.join(" ")).toMatch(
      /same-host|Same-host/,
    );
    expect(advancedTargets[16].limitations.join(" ")).toMatch(/worst-case/);
    expect(advancedTargets[20].limitations.join(" ")).toMatch(/volatile/);
    for (const packet of advancedPackets)
      expect(packet.exercises[3].acceptanceCriteria.join(" ")).toMatch(
        /Missing required execution does not satisfy/,
      );
  });
});
