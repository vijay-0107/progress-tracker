import { z } from "zod";
import raw from "./advanced-contract.json";
import {
  CAREER_COURSE_IDS,
  CAREER_PROFILE_IDS,
  LEARNING_STAGES,
  type AdvancedCareerPath,
  type AdvancedTarget,
  type Catalog,
  type ProgressState,
  type Stage,
} from "../domain/types";

export const ADVANCED_SOURCE_SHA256 =
  "2a4e89a2b7e8eb1171695faacf9af760726018e04cc1d6ba9b3ac25b38e6f6de";
const id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9.-]*$/)
  .max(160);
const text = z.string().trim().min(1);
const ids = z.array(id).min(1);
const fourIds = z.tuple([id, id, id, id]);
const groupSchema = z
  .object({
    id,
    stage: z.enum(LEARNING_STAGES),
    label: text,
    requestedDescription: text,
    lessonIds: ids,
    capabilities: z
      .array(z.object({ id, label: text, lessonIds: ids }).strict())
      .min(1),
    priorCoverage: z.enum(["full", "partial", "missing"]),
    overlapNote: text,
  })
  .strict();
const pathSchema = z
  .object({
    id: z.enum(CAREER_PROFILE_IDS),
    number: z.number().int().min(1).max(6),
    title: text,
    summary: text,
    courseId: z.enum(CAREER_COURSE_IDS),
    technologies: z.array(text).min(1),
    projectIds: fourIds,
    stages: z
      .array(
        z
          .object({
            stage: z.enum(LEARNING_STAGES),
            outcome: text,
            evidence: text,
            groups: z.array(groupSchema).min(1),
          })
          .strict(),
      )
      .length(4),
  })
  .strict();
const targetSchema = z
  .object({
    number: z.number().int().min(1).max(24),
    id,
    requirementId: id,
    domain: z.number().int().min(1).max(6),
    title: text,
    repository: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    required: text,
    overlap: text,
    skillGroups: ids,
    stages: z.tuple([text, text, text, text]),
    executionGates: z.array(text).min(1),
    unverifiedTargets: z.array(text).min(1),
    referenceStatus: z.enum([
      "pending-parent-review",
      "accepted-local-reference",
      "reviewed-scoped-reference",
      "reviewed-partial-reference",
    ]),
    referenceLabel: text,
    coverage: z.array(text),
    limitations: z.array(text).min(1),
    availability: z
      .object({
        snapshotOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reviewScope: z.enum([
          "scoped-software",
          "partial-cpu",
          "experimental-owned-lab",
        ]),
        publication: z.enum([
          "merged",
          "awaiting-merge",
          "unmerged-draft",
          "follow-up-pending",
        ]),
        publicationHold: z.boolean(),
        verification: z.enum([
          "recorded-main-ci-passed",
          "owner-triage-required",
          "cpu-checks-passed-hardware-open",
          "failed-main-follow-up-pending",
          "qualification-blocked",
          "not-observed",
        ]),
        publicationNote: text,
        targetQualification: text,
        codeUrl: z.string().url(),
        codeLabel: text,
        followUpUrl: z.string().url().optional(),
        followUpLabel: text.optional(),
      })
      .strict(),
  })
  .strict();
const contract = z
  .object({
    version: text,
    sourceSha256: z.literal(ADVANCED_SOURCE_SHA256),
    paths: z.array(pathSchema).length(6),
    targets: z.array(targetSchema).length(24),
    comparisonTechnologies: z
      .array(
        z
          .object({
            id,
            label: text,
            sourceContext: text,
            lessonIds: ids,
            scopeNote: text,
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .parse(raw);

export const advancedVersion = contract.version;
export const advancedPaths: AdvancedCareerPath[] = contract.paths;
export const advancedTargets: AdvancedTarget[] = contract.targets;
export const comparisonTechnologies = contract.comparisonTechnologies;
export const advancedGroups = advancedPaths.flatMap((path) =>
  path.stages.flatMap((stage) => stage.groups),
);
const projectLanguageLessons: Record<number, string[]> = {
  1: ["systems-foundation-rust", "systems-intermediate-rust-sync"],
  2: ["systems-foundation-rust", "systems-advanced-async-io"],
  3: ["systems-foundation-go", "systems-intermediate-go-sync-net"],
  4: ["systems-foundation-rust", "systems-intermediate-sql-depth"],
  5: [
    "systems-foundation-cpp-memory",
    "systems-foundation-tensors",
    "systems-advanced-cuda",
  ],
  6: ["systems-foundation-python-depth", "systems-foundation-tensors"],
  7: ["systems-foundation-arrays-frames", "systems-intermediate-sql-depth"],
  8: [
    "systems-foundation-go",
    "systems-foundation-c-posix",
    "systems-foundation-python-depth",
  ],
  9: [
    "systems-foundation-c-posix",
    "systems-foundation-go",
    "systems-advanced-c-ebpf",
  ],
  10: ["systems-foundation-go", "systems-intermediate-go-sync-net"],
  11: ["systems-foundation-python-depth"],
  12: [
    "systems-foundation-python-depth",
    "systems-foundation-go",
    "systems-intermediate-java-ast-jdbc",
  ],
  13: ["systems-foundation-arrays-frames", "systems-intermediate-sql-depth"],
  14: ["systems-foundation-python-depth", "systems-intermediate-sql-depth"],
  15: ["systems-foundation-python-depth"],
  16: ["systems-foundation-python-depth", "systems-intermediate-sql-depth"],
  17: ["systems-foundation-cpp-values", "systems-advanced-cpp-spsc-arenas"],
  18: [
    "systems-foundation-arrays-frames",
    "systems-foundation-cpp-values",
    "systems-advanced-native-ml-bindings",
  ],
  19: ["systems-foundation-cpp-values", "systems-foundation-arrays-frames"],
  20: ["systems-intermediate-python-workers"],
  21: ["systems-foundation-go", "systems-intermediate-go-sync-net"],
  22: ["systems-foundation-python-depth", "systems-intermediate-sql-depth"],
  23: ["systems-foundation-python-depth"],
  24: ["systems-foundation-python-depth", "systems-intermediate-sql-depth"],
};

export function advancedProjectLanguageLessons(projectId: string): string[] {
  const target = advancedTargets.find((item) => item.id === projectId);
  if (!target)
    throw new Error(`Advanced project is not registered: ${projectId}`);
  const lessons = projectLanguageLessons[target.number];
  if (!lessons?.length)
    throw new Error(
      `Advanced project language preparation is missing: ${projectId}`,
    );
  return lessons;
}

export function findAdvancedPath(id: string) {
  return advancedPaths.find((path) => path.id === id);
}

export function advancedLessons(
  catalog: Catalog,
  path: AdvancedCareerPath,
  stage?: Stage,
) {
  const required = new Set(
    path.stages
      .filter((item) => !stage || item.stage === stage)
      .flatMap((item) => item.groups.flatMap((group) => group.lessonIds)),
  );
  return catalog.tracks.flatMap((track) =>
    track.modules.flatMap((module) =>
      module.lessons.filter((lesson) => required.has(lesson.id)),
    ),
  );
}

export function advancedGroupRecorded(
  state: ProgressState,
  lessonIds: string[],
) {
  return (
    lessonIds.length > 0 &&
    lessonIds.every((id) => Boolean(state.lessons[id]?.manualCompletedAt))
  );
}

export function validateAdvancedCareers(
  catalog: Catalog,
  claim: (id: string) => void,
) {
  const lessons = new Map(
    catalog.tracks.flatMap((track) =>
      track.modules.flatMap((module) =>
        module.lessons.map((lesson) => [lesson.id, lesson] as const),
      ),
    ),
  );
  const groups = new Set<string>();
  const projects = new Set(catalog.projects.map((project) => project.id));
  const targetIds = new Set(advancedTargets.map((target) => target.id));
  for (const context of comparisonTechnologies) {
    claim(context.id);
    if (
      new Set(context.lessonIds).size !== context.lessonIds.length ||
      context.lessonIds.some((id) => !lessons.has(id))
    )
      throw new Error(
        `Invalid comparison-table technology context: ${context.id}`,
      );
  }
  if (
    advancedPaths.map((path) => path.id).join() !== CAREER_PROFILE_IDS.join() ||
    advancedGroups.length !== 114 ||
    targetIds.size !== 24
  )
    throw new Error(
      "Advanced paths require the exact six-role, 114-group, 24-target contract.",
    );
  for (const [index, path] of advancedPaths.entries()) {
    if (
      path.number !== index + 1 ||
      path.stages.map((item) => item.stage).join() !== LEARNING_STAGES.join() ||
      new Set(path.projectIds).size !== 4 ||
      path.projectIds.some((id) => !targetIds.has(id) || !projects.has(id))
    )
      throw new Error(
        `Invalid advanced path identity, stages or four-target mapping: ${path.id}`,
      );
    for (const [stageIndex, stage] of path.stages.entries()) {
      if (stage.groups.length !== (stageIndex === 3 ? 4 : 5))
        throw new Error(
          `Incorrect required group count: ${path.id}/${stage.stage}`,
        );
      for (const [groupIndex, group] of stage.groups.entries()) {
        const expected = `advanced-d${path.number}-${stage.stage}-${String(groupIndex + 1).padStart(2, "0")}`;
        if (
          group.id !== expected ||
          group.stage !== stage.stage ||
          groups.has(group.id)
        )
          throw new Error(
            `Incorrect or duplicate advanced requirement: ${group.id}`,
          );
        groups.add(group.id);
        if (new Set(group.lessonIds).size !== group.lessonIds.length)
          throw new Error(`Repeated canonical lesson in ${group.id}`);
        for (const id of group.lessonIds)
          if (!lessons.has(id))
            throw new Error(`Unknown advanced lesson: ${id}`);
        for (const capability of group.capabilities) {
          claim(capability.id);
          if (
            new Set(capability.lessonIds).size !==
              capability.lessonIds.length ||
            capability.lessonIds.some((id) => !group.lessonIds.includes(id))
          )
            throw new Error(
              `Invalid capability teaching map: ${capability.id}`,
            );
        }
      }
    }
  }
  for (const [index, target] of advancedTargets.entries()) {
    const number = String(index + 1).padStart(2, "0");
    const path = advancedPaths[Math.floor(index / 4)];
    if (
      target.number !== index + 1 ||
      target.id !== `advanced-target-${number}` ||
      target.requirementId !== `requested-project-${number}` ||
      target.domain !== path.number ||
      !path.projectIds.includes(target.id) ||
      target.skillGroups.some((id) => !groups.has(id)) ||
      (target.referenceStatus === "pending-parent-review" &&
        target.coverage.length > 0) ||
      (target.referenceStatus !== "pending-parent-review" &&
        !target.coverage.length)
    )
      throw new Error(
        `Invalid advanced target identity, scope or reference claims: ${target.id}`,
      );
    const availability = target.availability;
    const repositoryPath = `/vijay-0107/${target.repository}`;
    for (const value of [availability.codeUrl, availability.followUpUrl].filter(
      (value): value is string => Boolean(value),
    )) {
      const url = new URL(value);
      if (
        url.origin !== "https://github.com" ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        !(
          url.pathname === repositoryPath ||
          new RegExp(`^${repositoryPath}/pull/[1-9][0-9]*$`).test(url.pathname)
        )
      )
        throw new Error(`Invalid opt-in private code locator: ${target.id}`);
    }
    if (
      availability.publication === "unmerged-draft" &&
      (!availability.publicationHold ||
        !availability.codeUrl.includes("/pull/"))
    )
      throw new Error(
        `An unmerged held reference must link its actual private PR: ${target.id}`,
      );
    if (
      availability.reviewScope === "partial-cpu" &&
      (target.referenceStatus !== "reviewed-partial-reference" ||
        !availability.publicationHold)
    )
      throw new Error(
        `Partial CPU artifacts must remain explicitly partial and held: ${target.id}`,
      );
    if (
      ["failed-main-follow-up-pending", "qualification-blocked"].includes(
        availability.verification,
      ) &&
      (!availability.publicationHold ||
        availability.publication !== "follow-up-pending" ||
        !availability.followUpUrl ||
        !availability.followUpLabel)
    )
      throw new Error(
        `Failed latest verification requires a held follow-up state: ${target.id}`,
      );
    if (
      !advancedProjectLanguageLessons(target.id).length ||
      advancedProjectLanguageLessons(target.id).some((id) => !lessons.has(id))
    )
      throw new Error(
        `Missing advanced project language preparation: ${target.id}`,
      );
  }
}
