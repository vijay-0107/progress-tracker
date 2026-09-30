import type {
  CareerCompetency,
  CareerProfile,
  CareerProjectPacket,
  Catalog,
  OwnerId,
  ProgressState,
  ReadinessGate,
  Stage,
} from "./types";
import { LEARNING_STAGES, READINESS_GATES } from "./types";
import { careerPackets } from "../content/career-exercises";
import { advancedPackets } from "../content/advanced-projects";
import { careerProfiles } from "../content/careers";
import { allLessons, findLesson } from "../content/catalog";
import { recordActivity } from "./progress";
import {
  isMeaningfulEvidence,
  ProgressValidationError,
  timestamp,
  validateProgressState,
} from "./validation";

export const readinessLabels: Record<ReadinessGate, string> = {
  explain: "Explain",
  modify: "Modify",
  debug: "Debug",
  "test-defend": "Test and defend",
};
export const preparationStageLabels: Record<Stage, string> = {
  foundation: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  professional: "Professional Practice",
};
export const readinessRecordId = (projectId: string, gate: ReadinessGate) =>
  `career-readiness-${projectId}-${gate}`;
export const readinessMilestoneId = (projectId: string, gate: ReadinessGate) =>
  `${readinessRecordId(projectId, gate)}-recorded`;
export const allCareerPackets = [...careerPackets, ...advancedPackets];

export function findCareer(id: string): CareerProfile | undefined {
  return careerProfiles.find((profile) => profile.id === id);
}
export function findCareerPacket(
  projectId: string,
): CareerProjectPacket | undefined {
  return allCareerPackets.find((packet) => packet.projectId === projectId);
}
export function readinessRecorded(
  state: ProgressState,
  projectId: string,
  gate: ReadinessGate,
): boolean {
  const record = state.projects[readinessRecordId(projectId, gate)];
  return Boolean(
    record &&
    record.milestones.includes(readinessMilestoneId(projectId, gate)) &&
    record.evidence.trim().length >= 30 &&
    isMeaningfulEvidence(record.evidence),
  );
}
export function readinessCount(
  state: ProgressState,
  projectId: string,
): number {
  return READINESS_GATES.filter((gate) =>
    readinessRecorded(state, projectId, gate),
  ).length;
}
export function isReadinessEntity(id: string): boolean {
  return allCareerPackets.some((packet) =>
    READINESS_GATES.some(
      (gate) => readinessRecordId(packet.projectId, gate) === id,
    ),
  );
}

export function saveReadiness(
  state: ProgressState,
  expectedOwner: OwnerId,
  projectId: string,
  gate: ReadinessGate,
  evidence: string,
  recordGate = false,
  acknowledged = false,
  now?: string,
  expectedUpdatedAt?: string | null,
): ProgressState {
  if (state.ownerId !== expectedOwner)
    throw new ProgressValidationError(
      "The account changed. Reopen the readiness editor for the current owner.",
    );
  const packet = findCareerPacket(projectId);
  if (!packet || !READINESS_GATES.includes(gate))
    throw new ProgressValidationError(
      "Unknown career readiness project or gate.",
    );
  const id = readinessRecordId(projectId, gate);
  const milestone = readinessMilestoneId(projectId, gate);
  const prior = state.projects[id];
  if (
    expectedUpdatedAt !== undefined &&
    expectedUpdatedAt !== (prior?.updatedAt || null)
  )
    throw new ProgressValidationError(
      "Saved readiness evidence changed while you were editing. Keep your draft and review the latest saved version before retrying.",
    );
  const completed = prior?.milestones.includes(milestone) || false;
  if (
    (recordGate || completed) &&
    (evidence.trim().length < 30 || !isMeaningfulEvidence(evidence))
  )
    throw new ProgressValidationError(
      "Add meaningful evidence for this gate: at least 30 characters explaining your own work and result.",
    );
  if (recordGate) {
    if (!acknowledged)
      throw new ProgressValidationError(
        "Confirm this gate's acceptance checks and your independent work before recording it.",
      );
    const earlier = READINESS_GATES.slice(0, READINESS_GATES.indexOf(gate));
    if (earlier.some((item) => !readinessRecorded(state, projectId, item)))
      throw new ProgressValidationError(
        "Record the earlier readiness gates first; each needs its own evidence.",
      );
  }
  if (
    (recordGate || completed) &&
    READINESS_GATES.some(
      (item) =>
        item !== gate &&
        readinessRecorded(state, projectId, item) &&
        state.projects[readinessRecordId(projectId, item)]?.evidence.trim() ===
          evidence.trim(),
    )
  )
    throw new ProgressValidationError(
      "Use distinct evidence for this gate, not a copy of another gate's explanation.",
    );
  const milestones = recordGate || completed ? [milestone] : [];
  if (
    prior?.evidence === evidence &&
    prior.milestones.join() === milestones.join()
  )
    return state;
  const at = timestamp(now);
  if (prior && at <= prior.updatedAt)
    throw new ProgressValidationError(
      "Readiness evidence must be newer than its saved version. Retry with the current record.",
    );
  const next: ProgressState = {
    ...state,
    updatedAt: at > state.updatedAt ? at : state.updatedAt,
    projects: {
      ...state.projects,
      [id]: { id, updatedAt: at, milestones, evidence },
    },
  };
  validateProgressState(next);
  if (!recordGate || completed) return next;
  const eventId = `project:readiness:${id}`;
  if (state.activity[eventId]) {
    const original = state.activity[eventId];
    if (original.kind !== "project" || original.entityId !== id)
      throw new ProgressValidationError(
        "The readiness activity ID already belongs to different data.",
      );
    return next;
  }
  return recordActivity(
    next,
    {
      id: eventId,
      at,
      updatedAt: at,
      timezone: state.settings.timezone,
      kind: "project",
      entityId: id,
      minutes: 0,
      detail: `Independent readiness: ${readinessLabels[gate]} - ${packet.title}. Learner-recorded practice, not project completion or certification.`,
    },
    at,
  );
}

export function careerLessons(
  catalog: Catalog,
  profile: CareerProfile,
  stage?: Stage,
) {
  const ids = new Set(
    profile.stages
      .filter((item) => !stage || item.stage === stage)
      .flatMap((item) => item.competencies.flatMap((skill) => skill.lessonIds)),
  );
  return allLessons(catalog).filter((lesson) => ids.has(lesson.id));
}
export function competencyEvidence(
  state: ProgressState,
  skill: CareerCompetency,
) {
  const lessonsRecorded = skill.lessonIds.every((id) =>
    Boolean(state.lessons[id]?.manualCompletedAt),
  );
  const practiceRecorded = skill.exerciseIds.every((id) => {
    const packet = careerPackets.find((item) =>
      item.exercises.some((exercise) => exercise.id === id),
    );
    const exercise = packet?.exercises.find((item) => item.id === id);
    return Boolean(
      packet &&
      exercise &&
      readinessRecorded(
        state,
        packet.projectId,
        READINESS_GATES[LEARNING_STAGES.indexOf(exercise.stage)],
      ),
    );
  });
  return {
    lessonsRecorded,
    practiceRecorded,
    gap: !lessonsRecorded || !practiceRecorded,
  };
}
export function projectTotals(
  catalog: Catalog,
  state: ProgressState,
  group: "original" | "career" | "advanced",
) {
  const projects = catalog.projects.filter((project) =>
    group === "advanced"
      ? project.variant === "advanced-target"
      : group === "career"
        ? project.variant === "career-practice"
        : [
            "A-rebuild",
            "B-build",
            "professional-synthetic-recreation",
          ].includes(project.variant),
  );
  return {
    total: projects.length,
    gates: projects.flatMap((project) => project.milestones).length,
    recorded: projects.reduce(
      (count, project) =>
        count +
        project.milestones.filter((gate) =>
          state.projects[project.id]?.milestones.includes(gate.id),
        ).length,
      0,
    ),
    completed: projects.filter((project) =>
      project.milestones.every((gate) =>
        state.projects[project.id]?.milestones.includes(gate.id),
      ),
    ).length,
  };
}
export function lessonTitle(catalog: Catalog, id: string): string {
  const found = findLesson(catalog, id);
  if (!found) throw new Error(`Career lesson is unavailable: ${id}`);
  return found.lesson.title;
}
