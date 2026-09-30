import type {
  Catalog,
  Lesson,
  Module,
  ProgressState,
  Resource,
  Stage,
  Track,
  TrackId,
} from "../domain/types";
import {
  CORE_TRACK_IDS,
  CAREER_COURSE_IDS,
  EXTRA_TOPIC_IDS,
  LEARNING_STAGES,
  TRACK_IDS,
} from "../domain/types";
import { trackSchema } from "./schema";
import { projects } from "./projects";
import { careerProjects } from "./career-projects";
import { careerProfiles } from "./careers";
import { careerPackets } from "./career-exercises";
import { advancedProjects, advancedPackets } from "./advanced-projects";
import { advancedVersion, validateAdvancedCareers } from "./advanced-careers";
import { CAREER_PROFILE_IDS, READINESS_GATES } from "../domain/types";
import hostedBooks from "./hosted-books.json";
import verifiedEmbeds from "./verified-embeds.json";

interface HostedBook {
  downloadUrl: string;
  originalUrl: string;
  path: string;
  sha256: string;
  bytes: number;
}

export const trackMeta: Record<
  TrackId,
  {
    label: string;
    short: string;
    description: string;
    color: string;
    code: string;
  }
> = {
  foundation: {
    label: "Common Foundation",
    short: "Foundation",
    description: "Start here. The shared skills behind every career path.",
    color: "#236b50",
    code: "01",
  },
  data: {
    label: "Data Engineering",
    short: "Data",
    description: "From reliable SQL to tested, recoverable data platforms.",
    color: "#2563a6",
    code: "02",
  },
  sde: {
    label: "Software Engineering",
    short: "SDE",
    description: "Build software that is correct, secure and maintainable.",
    color: "#7858a6",
    code: "03",
  },
  quant: {
    label: "Quantitative Development",
    short: "Quant",
    description: "Reason about uncertainty. Engineer financial systems.",
    color: "#ae7430",
    code: "04",
  },
  ai: {
    label: "Applied AI",
    short: "AI",
    description: "Learn, evaluate and responsibly ship model-backed systems.",
    color: "#ab5365",
    code: "05",
  },
  gate: {
    label: "GATE Preparation",
    short: "GATE",
    description: "CS/IT and Data Science & AI paper paths.",
    color: "#397780",
    code: "06",
  },
  cat: {
    label: "CAT Preparation",
    short: "CAT",
    description: "VARC, DILR and QA with deliberate timed practice.",
    color: "#b66532",
    code: "07",
  },
  trading: {
    label: "Trading",
    short: "Trading",
    description:
      "Understand markets, execution and risk using paper-only evidence.",
    color: "#976122",
    code: "E1",
  },
  "algorithmic-trading": {
    label: "Algorithmic Trading",
    short: "Algo Trading",
    description:
      "Build reproducible research and guarded paper-execution systems.",
    color: "#326d82",
    code: "E2",
  },
  finance: {
    label: "Finance",
    short: "Finance",
    description:
      "From household decisions to audited financial analysis and valuation.",
    color: "#5f6f35",
    code: "E3",
  },
  "computer-security-systems": {
    label: "Computer Security Systems",
    short: "Security",
    description:
      "Explain, test and operate defensive controls in authorized isolated labs.",
    color: "#7858a6",
    code: "E4",
  },
  "ethical-hacking": {
    label: "Ethical Hacking",
    short: "Ethical Hacking",
    description:
      "Assess authorized isolated labs, validate findings and verify remediation.",
    color: "#865442",
    code: "E5",
  },
  "technical-product-management": {
    label: "Technical Product Management",
    short: "Technical PM",
    description:
      "Discovery, evidence, economics and responsible product decisions.",
    color: "#397780",
    code: "C1",
  },
  "systems-languages": {
    label: "Shared Systems & Languages",
    short: "Systems",
    description:
      "Required Rust, Go, C++, C, Python, SQL, Java, Bash and GPU depth with explicit environment gates.",
    color: "#236b50",
    code: "S",
  },
  "backend-platform-advanced": {
    label: "Backend & Platform: required learning",
    short: "Backend",
    description:
      "From native languages and protocols to consensus, proxies and platform operation.",
    color: "#7858a6",
    code: "C1",
  },
  "ai-systems-advanced": {
    label: "AI Infrastructure & ML Systems: required learning",
    short: "AI Systems",
    description:
      "Models, serving runtimes, CUDA/Triton kernels and honestly gated distributed hardware.",
    color: "#ab5365",
    code: "C2",
  },
  "cloud-security-advanced": {
    label: "Product & Cloud Security: required learning",
    short: "Cloud Security",
    description:
      "Identity, policy, kernel boundaries, conservative analysis and accountable assurance.",
    color: "#865442",
    code: "C3",
  },
  "data-platform-advanced": {
    label: "Data Platform & Analytics: required learning",
    short: "Data Platform",
    description:
      "Open tables, real streaming, query federation, SQL lineage and data governance.",
    color: "#2563a6",
    code: "C4",
  },
  "quant-infrastructure-advanced": {
    label: "Quant Development & Research: required learning",
    short: "Quant Systems",
    description:
      "Native queues, paper-only feeds/execution and measured research infrastructure.",
    color: "#ae7430",
    code: "C5",
  },
  "technical-pm-advanced": {
    label: "Technical Product Management: required learning",
    short: "Technical PM",
    description:
      "Product contracts, experiments, FinOps, migration and executive decisions.",
    color: "#397780",
    code: "C6",
  },
};

export const CAREER_TRACKS: TrackId[] = ["data", "sde", "quant", "ai"];
export function isExtraTopic(id: TrackId): boolean {
  return EXTRA_TOPIC_IDS.some((topic) => topic === id);
}
export function isCoreTrack(id: TrackId): boolean {
  return CORE_TRACK_IDS.some((core) => core === id);
}
export function isCareerCourse(id: TrackId): boolean {
  return CAREER_COURSE_IDS.some((course) => course === id);
}

export function stageLabel(stage: Stage, trackId: TrackId): string {
  if (isExtraTopic(trackId) || isCareerCourse(trackId)) {
    if (stage === "foundation") return "Beginner";
    if (stage === "professional") return "Professional Practice";
  }
  return stage === "foundation"
    ? "Foundations"
    : stage.charAt(0).toUpperCase() + stage.slice(1);
}

const handoffs = import.meta.glob("./tracks/*.json", {
  eager: true,
  import: "default",
});

export function buildCatalog(rawTracks: unknown[]): Catalog {
  const tracks: Track[] = rawTracks.map((raw) => {
    const parsed = trackSchema.parse(raw);
    const rawMetadata = parsed.officialExamMetadata || parsed.examMetadata;
    const metadata =
      rawMetadata &&
      typeof rawMetadata === "object" &&
      !Array.isArray(rawMetadata)
        ? (rawMetadata as Record<string, unknown>)
        : {};
    const edition =
      parsed.edition ||
      (typeof metadata.targetEdition === "string"
        ? metadata.targetEdition
        : typeof metadata.latestVerifiedEdition === "number"
          ? `${parsed.trackId.toUpperCase()} ${metadata.latestVerifiedEdition}`
          : undefined);
    const guidance = Object.fromEntries(
      [
        "officialExamMetadata",
        "examMetadata",
        "learningDesign",
        "coverageNotes",
        "examContext",
        "assessmentPolicy",
        "licensingPolicy",
        "syllabusCoverage",
      ]
        .filter((key) => parsed[key] !== undefined)
        .map((key) => [key, parsed[key]]),
    );
    return { ...parsed, edition, guidance };
  });
  const hosted: HostedBook[] = hostedBooks;
  for (const track of tracks) {
    track.resources = track.resources.map((resource) => {
      const verified = verifiedEmbeds.find(
        (item) => item.sourceUrl === resource.url,
      );
      const enriched = verified
        ? { ...resource, embedUrl: verified.embedUrl }
        : resource;
      const book = hosted.find(
        (item) =>
          item.downloadUrl === resource.downloadUrl ||
          item.originalUrl === resource.url,
      );
      return book && resource.redistribution === "permitted"
        ? {
            ...enriched,
            hostedPath: book.path,
            hostedBytes: book.bytes,
            sha256: book.sha256,
          }
        : enriched;
    });
  }
  tracks.sort(
    (a, b) => TRACK_IDS.indexOf(a.trackId) - TRACK_IDS.indexOf(b.trackId),
  );
  const mappedProjects = [
    ...projects,
    ...careerProjects,
    ...advancedProjects,
  ].map((project) => {
    const mappings = tracks
      .flatMap((track) => track.projectMappings)
      .filter(
        (mapping) =>
          mapping.projectTitle.toLowerCase() === project.title.toLowerCase() ||
          (project.title === "Microsoft Fabric Reporting Workflows" &&
            mapping.projectTitle ===
              "Synthetic Fabric Reporting Workflow Recreation"),
      );
    const prerequisites = [
      ...new Set(mappings.flatMap((mapping) => mapping.recommendedAfter)),
    ];
    return {
      ...project,
      prerequisites: prerequisites.length
        ? prerequisites
        : project.prerequisites,
      ...(project.id === "sde-product-search"
        ? {
            prerequisiteLessons: [
              "sde-l27-lexical-search",
              "sde-l28-rerank-evaluation",
            ],
          }
        : {}),
    };
  });
  const catalog: Catalog = {
    version: advancedVersion,
    tracks,
    projects: mappedProjects,
  };
  validateCatalog(catalog);
  return catalog;
}

let cached: Catalog | undefined;
export function getCatalog(): Catalog {
  if (!cached) cached = buildCatalog(Object.values(handoffs));
  return cached;
}

export function validateCatalog(catalog: Catalog): void {
  const missing = TRACK_IDS.filter(
    (id) => !catalog.tracks.some((track) => track.trackId === id),
  );
  if (missing.length)
    throw new Error(
      `Curated curriculum not yet available: ${missing.join(", ")}. Nothing has been substituted with placeholder content.`,
    );
  const ids = new Set<string>();
  const claim = (id: string) => {
    if (ids.has(id)) throw new Error(`Duplicate curriculum ID: ${id}`);
    ids.add(id);
  };
  const resources = new Map<string, Resource>();
  const modules = new Map<string, Module>();
  const lessons = new Map(
    allLessons(catalog).map((lesson) => [lesson.id, lesson]),
  );
  catalog.tracks.forEach((track) => {
    claim(track.trackId);
    track.resources.forEach((resource) => {
      claim(resource.id);
      resources.set(resource.id, resource);
    });
    track.modules.forEach((module) => {
      claim(module.id);
      modules.set(module.id, module);
    });
  });
  for (const track of catalog.tracks) {
    if (
      (isExtraTopic(track.trackId) || isCareerCourse(track.trackId)) &&
      (track.stageOutcomes?.map((item) => item.stage).join(",") !==
        LEARNING_STAGES.join(",") ||
        LEARNING_STAGES.some(
          (stage) => !track.modules.some((module) => module.stage === stage),
        ))
    )
      throw new Error(`${track.trackId} needs all four ordered stage outcomes`);
    for (const module of track.modules) {
      for (const prerequisite of module.prerequisites) {
        if (!modules.has(prerequisite))
          throw new Error(
            `Unknown prerequisite ${prerequisite} in ${module.id}`,
          );
      }
      for (const lesson of module.lessons) {
        claim(lesson.id);
        claim(lesson.assignment.id);
        lesson.assignment.questions.forEach((question) => claim(question.id));
        lesson.prerequisites?.forEach((id) => {
          if (!lessons.has(id))
            throw new Error(
              `${lesson.id} references unknown prerequisite lesson ${id}`,
            );
        });
        if (
          lesson.video
            ? resources.get(lesson.video.resourceId)?.kind !== "video"
            : isCoreTrack(track.trackId)
        )
          throw new Error(`${lesson.id} needs a known lecture/video`);
        const readingKind = resources.get(lesson.reading.resourceId)?.kind;
        if (
          readingKind !== "book" &&
          !(
            (isExtraTopic(track.trackId) || isCareerCourse(track.trackId)) &&
            readingKind === "documentation"
          )
        )
          throw new Error(
            `${lesson.id} needs a known book or official reading`,
          );
        if (isCareerCourse(track.trackId)) {
          const reading = resources.get(lesson.reading.resourceId);
          if (
            reading?.access !== "free" ||
            reading.availability === "access-limited" ||
            lesson.reading.locator.length < 60 ||
            !lesson.practiceEnvironment
          )
            throw new Error(
              `${lesson.id} needs an accessible free primary reading, a precise locator and explicit practice environment.`,
            );
        }
        for (const resourceId of lesson.supplementaryResourceIds) {
          if (!resources.has(resourceId))
            throw new Error(
              `${lesson.id} references unknown resource ${resourceId}`,
            );
        }
      }
    }
    track.projectMappings.forEach((mapping) =>
      mapping.recommendedAfter.forEach((id) => {
        if (!modules.has(id))
          throw new Error(`Project mapping references unknown module ${id}`);
      }),
    );
  }
  const done = new Set<string>();
  const active = new Set<string>();
  function visit(id: string) {
    if (active.has(id))
      throw new Error(`Curriculum prerequisite cycle at ${id}`);
    if (done.has(id)) return;
    active.add(id);
    modules.get(id)?.prerequisites.forEach(visit);
    active.delete(id);
    done.add(id);
  }
  modules.forEach((_, id) => visit(id));
  done.clear();
  active.clear();
  function visitLesson(id: string) {
    if (active.has(id)) throw new Error(`Lesson prerequisite cycle at ${id}`);
    if (done.has(id)) return;
    active.add(id);
    lessons.get(id)?.prerequisites?.forEach(visitLesson);
    active.delete(id);
    done.add(id);
  }
  lessons.forEach((_, id) => visitLesson(id));
  for (const paper of ["CS", "DA"]) {
    const eligible = catalog.tracks
      .find((track) => track.trackId === "gate")!
      .modules.flatMap((module) => eligibleLessons(module, paper));
    const eligibleIds = new Set(eligible.map((lesson) => lesson.id));
    eligible.forEach((lesson) =>
      lesson.prerequisites?.forEach((id) => {
        if (!eligibleIds.has(id))
          throw new Error(
            `${paper} lesson ${lesson.id} requires a lesson outside that paper: ${id}`,
          );
      }),
    );
  }
  catalog.projects.forEach((project) => {
    claim(project.id);
    project.prerequisites.forEach((id) => {
      if (!modules.has(id))
        throw new Error(
          `Project ${project.id} references unknown prerequisite ${id}`,
        );
    });
    project.prerequisiteLessons?.forEach((id) => {
      if (!lessons.has(id))
        throw new Error(
          `Project ${project.id} references unknown prerequisite lesson ${id}`,
        );
    });
    project.milestones.forEach((milestone) => claim(milestone.id));
  });
  validateCareers(catalog, claim);
  validateAdvancedCareers(catalog, claim);
  const lessonIds = new Set(allLessons(catalog).map((lesson) => lesson.id));
  const advancedRepositories = new Set<string>();
  for (const packet of advancedPackets) {
    if (
      advancedRepositories.has(packet.repository) ||
      (careerPackets.some((old) => old.repository === packet.repository) &&
        !(
          packet.projectId === "advanced-target-17" &&
          packet.repository === "paper-exchange-engine"
        )) ||
      packet.exercises.map((exercise) => exercise.stage).join() !==
        LEARNING_STAGES.join()
    )
      throw new Error(
        `Invalid advanced packet scope or ordered exercises: ${packet.projectId}`,
      );
    advancedRepositories.add(packet.repository);
    for (const exercise of packet.exercises) {
      claim(exercise.id);
      if (
        !exercise.lessonIds.length ||
        exercise.lessonIds.some((id) => !lessonIds.has(id))
      )
        throw new Error(
          `Unknown or empty advanced exercise preparation: ${exercise.id}`,
        );
      const url = new URL(exercise.reading.url);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        exercise.reading.locator.length < 35
      )
        throw new Error(`Invalid advanced exercise reading: ${exercise.id}`);
    }
    for (const gate of READINESS_GATES) {
      const id = `career-readiness-${packet.projectId}-${gate}`;
      if (id.length > 160)
        throw new Error("Advanced readiness ID exceeds the deployed contract");
      claim(id);
      claim(`${id}-recorded`);
    }
  }
}

function validateCareers(catalog: Catalog, claim: (id: string) => void) {
  const lessons = new Set(allLessons(catalog).map((lesson) => lesson.id));
  const projectIds = new Set(catalog.projects.map((project) => project.id));
  const exerciseIds = new Set<string>();
  const repositories = new Set<string>();
  const packetProjects = new Set<string>();
  for (const packet of careerPackets) {
    if (
      !projectIds.has(packet.projectId) ||
      packetProjects.has(packet.projectId) ||
      repositories.has(packet.repository)
    )
      throw new Error(
        `Invalid or duplicate career project: ${packet.projectId}`,
      );
    packetProjects.add(packet.projectId);
    repositories.add(packet.repository);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(packet.repository))
      throw new Error("Invalid private reference repository name");
    if (
      packet.referenceStatus === "pending-parent-review" &&
      packet.coverage.length
    )
      throw new Error(
        "Pending references cannot assert implemented capabilities",
      );
    if (
      packet.referenceStatus === "accepted-local-reference" &&
      !packet.coverage.length
    )
      throw new Error("Accepted references need scoped capability notes");
    if (
      packet.exercises.map((item) => item.stage).join() !==
      LEARNING_STAGES.join()
    )
      throw new Error(
        `${packet.projectId} needs four ordered career exercises`,
      );
    for (const exercise of packet.exercises) {
      claim(exercise.id);
      exerciseIds.add(exercise.id);
      for (const id of exercise.lessonIds)
        if (!lessons.has(id))
          throw new Error(`Unknown career exercise lesson: ${id}`);
      const url = new URL(exercise.reading.url);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        exercise.reading.locator.length < 35
      )
        throw new Error(`Invalid career reading for ${exercise.id}`);
    }
    for (const gate of READINESS_GATES) {
      const id = `career-readiness-${packet.projectId}-${gate}`;
      if (id.length > 160)
        throw new Error("Career readiness ID exceeds the deployed contract");
      claim(id);
      claim(`${id}-recorded`);
    }
  }
  if (
    careerProfiles.map((profile) => profile.id).join() !==
    CAREER_PROFILE_IDS.join()
  )
    throw new Error("Career profiles must retain the six canonical identities");
  for (const profile of careerProfiles) {
    if (
      new Set(profile.projectIds).size !== 3 ||
      profile.projectIds.some((id) => !packetProjects.has(id))
    )
      throw new Error(
        `${profile.id} needs three distinct registered project packets`,
      );
    if (
      profile.stages.map((item) => item.stage).join() !== LEARNING_STAGES.join()
    )
      throw new Error(`${profile.id} needs four ordered preparation stages`);
    for (const stage of profile.stages) {
      if (!stage.competencies.length)
        throw new Error(`${profile.id} has an empty stage`);
      for (const skill of stage.competencies) {
        claim(skill.id);
        if (
          !skill.lessonIds.length ||
          new Set(skill.lessonIds).size !== skill.lessonIds.length
        )
          throw new Error(
            `Missing or repeated canonical learning references: ${skill.id}`,
          );
        for (const id of skill.lessonIds)
          if (!lessons.has(id))
            throw new Error(`Unknown competency lesson: ${id}`);
        for (const id of skill.exerciseIds)
          if (
            !exerciseIds.has(id) ||
            !careerPackets.some(
              (packet) =>
                profile.projectIds.includes(packet.projectId) &&
                packet.exercises.some((exercise) => exercise.id === id),
            )
          )
            throw new Error(`Unknown or unrelated competency exercise: ${id}`);
      }
    }
  }
}

export function allLessons(catalog: Catalog): Lesson[] {
  return catalog.tracks.flatMap((track) =>
    track.modules.flatMap((module) => module.lessons),
  );
}

export function coreLessons(catalog: Catalog): Lesson[] {
  return allLessons({
    ...catalog,
    tracks: catalog.tracks.filter((track) => isCoreTrack(track.trackId)),
  });
}

export function requiredLessons(
  track: Track,
  paper = "all",
  stage?: Stage,
): Lesson[] {
  return track.modules
    .filter((module) => !module.optional && (!stage || module.stage === stage))
    .flatMap((module) =>
      eligibleLessons(module, paper).filter((lesson) => !lesson.optional),
    );
}

export function lessonCompletion(lessons: Lesson[], state: ProgressState) {
  const completed = lessons.filter(
    (lesson) => state.lessons[lesson.id]?.manualCompletedAt,
  ).length;
  return {
    completed,
    total: lessons.length,
    percent: lessons.length
      ? Math.round((completed / lessons.length) * 100)
      : 0,
  };
}

export function findLesson(
  catalog: Catalog,
  id: string,
): { track: Track; module: Module; lesson: Lesson } | undefined {
  for (const track of catalog.tracks) {
    for (const module of track.modules) {
      const lesson = module.lessons.find((item) => item.id === id);
      if (lesson) return { track, module, lesson };
    }
  }
}

export function findModule(catalog: Catalog, id: string): Module | undefined {
  return catalog.tracks
    .flatMap((track) => track.modules)
    .find((module) => module.id === id);
}

export function findResource(catalog: Catalog, id: string): Resource {
  const resource = catalog.tracks
    .flatMap((track) => track.resources)
    .find((item) => item.id === id);
  if (!resource) throw new Error(`Resource ${id} is unavailable`);
  return resource;
}

export function eligibleLessons(module: Module, paper = "all"): Lesson[] {
  if (paper === "all") return module.lessons;
  return module.lessons.filter((lesson) => {
    const tags = lesson.paperTags?.length ? lesson.paperTags : module.paperTags;
    return (
      !tags.length ||
      tags.some((tag) => tag.toLowerCase().includes(paper.toLowerCase()))
    );
  });
}

export function moduleComplete(
  module: Module,
  state: ProgressState,
  paper = "all",
): boolean {
  return eligibleLessons(module, paper)
    .filter((lesson) => !lesson.optional)
    .every((lesson) => Boolean(state.lessons[lesson.id]?.manualCompletedAt));
}

export function moduleRequirements(catalog: Catalog, module: Module): Module[] {
  const track = catalog.tracks.find((candidate) =>
    candidate.modules.some((item) => item.id === module.id),
  );
  const foundation =
    track && CAREER_TRACKS.includes(track.trackId)
      ? (catalog.tracks.find((item) => item.trackId === "foundation")
          ?.modules ?? [])
      : [];
  return [
    ...new Map(
      [
        ...foundation,
        ...module.prerequisites
          .map((id) => findModule(catalog, id))
          .filter((item): item is Module => Boolean(item)),
      ].map((item) => [item.id, item]),
    ).values(),
  ];
}

export function unmetRequirements(
  catalog: Catalog,
  module: Module,
  state: ProgressState,
  paper = "all",
): Module[] {
  return moduleRequirements(catalog, module).filter(
    (item) => !moduleComplete(item, state, paper),
  );
}

export function unmetLessonRequirements(
  catalog: Catalog,
  lesson: Lesson,
  state: ProgressState,
): Lesson[] {
  return (lesson.prerequisites || [])
    .map((id) => findLesson(catalog, id)?.lesson)
    .filter((item): item is Lesson =>
      Boolean(item && !state.lessons[item.id]?.manualCompletedAt),
    );
}

export function recommendedLessons(
  catalog: Catalog,
  state: ProgressState,
  limit = 3,
): ReturnType<typeof findLesson>[] {
  const focusIsExam =
    state.settings.primaryTrack === "gate" ||
    state.settings.primaryTrack === "cat";
  const tracks = catalog.tracks
    .filter((track) =>
      focusIsExam
        ? track.trackId === state.settings.primaryTrack
        : track.trackId === "foundation" ||
          track.trackId === state.settings.primaryTrack,
    )
    .sort((a, b) => {
      const priority = (id: TrackId) =>
        id === "foundation" ? 0 : id === state.settings.primaryTrack ? 1 : 2;
      return priority(a.trackId) - priority(b.trackId);
    });
  const result: ReturnType<typeof findLesson>[] = [];
  for (const track of tracks) {
    for (const module of track.modules) {
      if (
        module.optional &&
        track.modules.some(
          (item) => !item.optional && !moduleComplete(item, state),
        )
      )
        continue;
      if (unmetRequirements(catalog, module, state).length) continue;
      const required = module.lessons.filter((lesson) => !lesson.optional);
      const electives = track.modules
        .filter((item) => !item.optional)
        .every((item) => moduleComplete(item, state))
        ? module.lessons.filter((lesson) => lesson.optional)
        : [];
      for (const lesson of [...required, ...electives]) {
        if (
          state.lessons[lesson.id]?.manualCompletedAt ||
          unmetLessonRequirements(catalog, lesson, state).length
        )
          continue;
        result.push({ track, module, lesson });
        if (result.length >= limit) return result;
      }
    }
  }
  return result;
}

export function resourceEmbed(resource: Resource): string | null {
  if (resource.embedUrl) {
    const url = new URL(resource.embedUrl);
    if (
      url.hostname === "www.youtube-nocookie.com" &&
      url.pathname.startsWith("/embed/")
    )
      return url.href;
  }
  const url = new URL(resource.url);
  if (url.protocol !== "https:") return null;
  const videoId =
    url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : ["www.youtube.com", "youtube.com"].includes(url.hostname) &&
          url.pathname === "/watch"
        ? url.searchParams.get("v")
        : null;
  if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId))
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  return null;
}

export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}
