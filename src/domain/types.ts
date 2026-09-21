export const CORE_TRACK_IDS = [
  "foundation",
  "data",
  "sde",
  "quant",
  "ai",
  "gate",
  "cat",
] as const;
export const EXTRA_TOPIC_IDS = [
  "trading",
  "algorithmic-trading",
  "finance",
  "computer-security-systems",
  "ethical-hacking",
] as const;
export const TRACK_IDS = [...CORE_TRACK_IDS, ...EXTRA_TOPIC_IDS] as const;
export type CoreTrackId = (typeof CORE_TRACK_IDS)[number];
export type ExtraTopicId = (typeof EXTRA_TOPIC_IDS)[number];
export type TrackId = (typeof TRACK_IDS)[number];
export const LEARNING_STAGES = [
  "foundation",
  "intermediate",
  "advanced",
  "professional",
] as const;
export type Stage = (typeof LEARNING_STAGES)[number];
export type OwnerId = "guest" | `local:${string}` | `uid:${string}`;
export type Theme = "light" | "dark" | "system";

export interface Resource {
  id: string;
  kind: "video" | "book" | "documentation" | "practice";
  title: string;
  url: string;
  provider: string;
  access: "free" | "free-account" | "paid-optional";
  license: string;
  licenseUrl: string | null;
  redistribution: "permitted" | "link-only";
  downloadUrl: string | null;
  verifiedOn: string;
  notes: string;
  hostedPath?: string;
  hostedBytes?: number;
  sha256?: string;
  embedUrl?: string;
}

export interface Question {
  id: string;
  prompt: string;
  kind: "single-choice" | "multiple-choice" | "numeric" | "short-answer";
  choices?: string[];
  answer: string | number | string[] | number[];
  explanation: string;
  numericTolerance?: number;
  marks?: number;
  examStyle?: string;
  paperTags?: string[];
}

export interface Assignment {
  id: string;
  title: string;
  kind: "coding" | "problem-set" | "design" | "lab" | "quiz" | "project";
  instructions: string[];
  deliverables: string[];
  acceptanceCriteria: string[];
  externalUrl: string | null;
  questions: Question[];
}

export interface Lesson {
  id: string;
  title: string;
  objectives: string[];
  topics: { title: string; details: string[] }[];
  estimatedMinutes: number;
  canonicalConceptTags: string[];
  video: { resourceId: string; locator: string } | null;
  reading: { resourceId: string; locator: string };
  supplementaryResourceIds: string[];
  assignment: Assignment;
  reviewPrompts: string[];
  prerequisites?: string[];
  paperTags?: string[];
  optional?: boolean;
}

export interface Module {
  id: string;
  title: string;
  stage: Stage;
  description: string;
  prerequisites: string[];
  paperTags: string[];
  lessons: Lesson[];
  optional?: boolean;
}

export interface Source {
  title: string;
  url: string;
  notes?: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  deliverables: string[];
  acceptanceCriteria: string[];
}

export interface Project {
  id: string;
  title: string;
  tracks: TrackId[];
  variant: "A-rebuild" | "B-build" | "professional-synthetic-recreation";
  summary: string;
  scope: string;
  prerequisites: string[];
  prerequisiteTags: string[];
  prerequisiteLessons?: string[];
  historicalNote: string;
  safety: string[];
  milestones: ProjectMilestone[];
  sources: Source[];
}

export interface Track {
  schemaVersion: number;
  trackId: TrackId;
  title: string;
  sourceCheckedOn: string;
  resources: Resource[];
  modules: Module[];
  projectMappings: {
    projectTitle: string;
    resumeVariant: Project["variant"];
    recommendedAfter: string[];
    milestones: Omit<ProjectMilestone, "id">[];
  }[];
  sources: Source[];
  limitations: string[];
  stageOutcomes?: {
    stage: Stage;
    outcome: string;
    evidence: string;
  }[];
  edition?: string;
  guidance?: Record<string, unknown>;
}

export interface Catalog {
  version: string;
  tracks: Track[];
  projects: Project[];
}

export interface ReviewState {
  dueAt: string;
  intervalDays: number;
  streak: number;
  lastReviewedAt: string | null;
}

export interface LessonProgress {
  id: string;
  updatedAt: string;
  manualCompletedAt: string | null;
  evidence: string;
  rubricChecked: string[];
  note: string;
  bookmarked: boolean;
  readingPosition: string;
  review: ReviewState | null;
  assessment: {
    attemptedAt: string;
    correct: number;
    total: number;
    answers: Record<string, string>;
  } | null;
}

export interface ProjectProgress {
  id: string;
  updatedAt: string;
  milestones: string[];
  evidence: string;
}

export interface Settings {
  id: "settings";
  updatedAt: string;
  displayName: string;
  timezone: string;
  theme: Theme;
  dailyMinutes: number;
  primaryTrack: CoreTrackId;
}

export interface Goal {
  id: string;
  updatedAt: string;
  title: string;
  targetDate: string;
  trackId: CoreTrackId;
  completedAt: string | null;
  deletedAt: string | null;
}

export interface ActivityEvent {
  id: string;
  updatedAt: string;
  at: string;
  timezone: string;
  kind: "study" | "assignment" | "assessment" | "review" | "project";
  entityId: string;
  minutes: number;
  detail: string;
}

export interface ErrorEntry {
  id: string;
  updatedAt: string;
  lessonId: string;
  questionId: string;
  prompt: string;
  answer: string;
  explanation: string;
  reflection: string;
  resolvedAt: string | null;
}

export interface LegacyArchive {
  id: string;
  name: string;
  source: "local-v1" | "cloud-v1" | "export-v1";
  importedAt: string;
  payload: Record<string, unknown>;
}

export interface ProgressState {
  schemaVersion: 2;
  ownerId: OwnerId;
  settings: Settings;
  lessons: Record<string, LessonProgress>;
  projects: Record<string, ProjectProgress>;
  goals: Record<string, Goal>;
  activity: Record<string, ActivityEvent>;
  errors: Record<string, ErrorEntry>;
  legacy: Record<string, LegacyArchive>;
  updatedAt: string;
}

export type EntityCollection =
  "lessons" | "projects" | "goals" | "activity" | "errors";
export type SyncEntity =
  | Settings
  | LessonProgress
  | ProjectProgress
  | Goal
  | ActivityEvent
  | ErrorEntry;
export interface SyncRecord {
  collection: EntityCollection | "settings";
  id: string;
  data: SyncEntity;
}
