import { describe, expect, it } from "vitest";
import {
  allLessons,
  buildCatalog,
  eligibleLessons,
  moduleComplete,
  resourceEmbed,
} from "../src/content/catalog";
import { TRACK_IDS } from "../src/domain/types";
import { createProgress, emptyLesson } from "../src/domain/progress";
import fs from "node:fs";
import path from "node:path";

const directory = path.resolve("src", "content", "tracks");
const raw = () =>
  TRACK_IDS.map((id) =>
    JSON.parse(fs.readFileSync(path.join(directory, `${id}.json`), "utf8")),
  );

describe("curated catalog", () => {
  it("ships every researched path with complete original learning units and reference integrity", () => {
    const catalog = buildCatalog(raw());
    expect(catalog.tracks.map((track) => track.trackId)).toEqual([
      ...TRACK_IDS,
    ]);
    expect(catalog.projects).toHaveLength(21);
    for (const lesson of allLessons(catalog)) {
      expect(lesson.objectives.length).toBeGreaterThan(0);
      expect(lesson.topics.every((topic) => topic.details.length > 0)).toBe(
        true,
      );
      expect(lesson.assignment.deliverables.length).toBeGreaterThan(0);
      expect(lesson.assignment.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(lesson.reviewPrompts.length).toBeGreaterThan(0);
    }
    for (const track of catalog.tracks.filter((track) =>
      ["data", "sde", "quant", "ai"].includes(track.trackId),
    )) {
      const foundation = catalog.tracks.find(
        (item) => item.trackId === "foundation",
      )!;
      expect(
        new Set(
          [...foundation.modules, ...track.modules].map(
            (module) => module.stage,
          ),
        ),
      ).toEqual(
        new Set(["foundation", "intermediate", "advanced", "professional"]),
      );
    }
    for (const project of catalog.projects)
      expect(project.prerequisites.length, project.title).toBeGreaterThan(0);
  });

  it("rejects missing tracks instead of publishing placeholders", () => {
    expect(() => buildCatalog([])).toThrow("not yet available");
  });

  it("does not turn search or arbitrary resource links into fabricated video embeds", () => {
    const catalog = buildCatalog(raw());
    const video = catalog.tracks[0].resources.find(
      (resource) => resource.kind === "video",
    )!;
    expect(
      resourceEmbed({
        ...video,
        embedUrl: undefined,
        url: "https://www.youtube.com/results?search_query=python",
      }),
    ).toBeNull();
    expect(
      resourceEmbed({
        ...video,
        embedUrl: undefined,
        url: "https://example.com/watch?v=dQw4w9WgXcQ",
      }),
    ).toBeNull();
    expect(
      resourceEmbed({
        ...video,
        embedUrl: undefined,
        url: "http://nil.csail.mit.edu/6.824/2020/schedule.html",
      }),
    ).toBeNull();
    const shell = catalog.tracks
      .flatMap((track) => track.resources)
      .find(
        (resource) =>
          resource.url === "https://missing.csail.mit.edu/2020/course-shell/",
      )!;
    expect(resourceEmbed(shell)).toBe(
      "https://www.youtube-nocookie.com/embed/Z56Jmr9Z34Q",
    );
  });

  it("keeps paper eligibility and specialist branches out of unrelated completion gates", () => {
    const catalog = buildCatalog(raw());
    const gate = catalog.tracks.find((track) => track.trackId === "gate")!;
    expect(
      gate.modules.flatMap((module) => eligibleLessons(module, "CS")),
    ).toHaveLength(39);
    expect(
      gate.modules.flatMap((module) => eligibleLessons(module, "DA")),
    ).toHaveLength(31);
    const sde = catalog.tracks.find((track) => track.trackId === "sde")!;
    expect(
      sde.modules
        .flatMap((module) => module.lessons)
        .filter((lesson) => lesson.optional),
    ).toHaveLength(4);
    const state = createProgress("guest");
    for (const module of sde.modules) {
      for (const lesson of module.lessons.filter((item) => !item.optional)) {
        state.lessons[lesson.id] = {
          ...emptyLesson(lesson.id),
          manualCompletedAt: new Date().toISOString(),
        };
      }
      expect(moduleComplete(module, state)).toBe(true);
    }
    expect(
      catalog.projects.find((project) => project.id === "sde-product-search")
        ?.prerequisiteLessons,
    ).toEqual(["sde-l27-lexical-search", "sde-l28-rerank-evaluation"]);
    const optionalQuant = catalog.tracks
      .find((track) => track.trackId === "quant")!
      .modules.find((module) => module.optional)!;
    expect(optionalQuant).toBeDefined();
    expect(
      catalog.projects.every(
        (project) => !project.prerequisites.includes(optionalQuant.id),
      ),
    ).toBe(true);
  });

  it("publishes no private research paths, account history or workflow chatter", () => {
    const text = JSON.stringify(raw());
    expect(text).not.toMatch(
      /copilot-worktrees|\\\\Users\\\\|\.copilot|fileWritten|intendedArtifactPath|localPath|DP-100|OneDrive|MAQ\/client|Historical December 2023|Historical March 2022/,
    );
  });
});
