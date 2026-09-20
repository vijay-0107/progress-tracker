import type {
  Catalog,
  Lesson,
  Module,
  ProgressState,
  Resource,
  Track,
  TrackId,
} from "../domain/types";
import { TRACK_IDS } from "../domain/types";
import { trackSchema } from "./schema";
import { projects } from "./projects";
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
};

export const CAREER_TRACKS: TrackId[] = ["data", "sde", "quant", "ai"];
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
  const mappedProjects = projects.map((project) => {
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
    version: "2026.09.20.1",
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
        if (resources.get(lesson.video.resourceId)?.kind !== "video")
          throw new Error(`${lesson.id} needs a known lecture/video`);
        if (resources.get(lesson.reading.resourceId)?.kind !== "book")
          throw new Error(`${lesson.id} needs a known book reading`);
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
}

export function allLessons(catalog: Catalog): Lesson[] {
  return catalog.tracks.flatMap((track) =>
    track.modules.flatMap((module) => module.lessons),
  );
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
