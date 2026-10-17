import { describe, expect, it } from "vitest";
import {
  allLessons,
  coreLessons,
  getCatalog,
  skillBuilderPlacement,
  skillBuildersFor,
  trackHome,
} from "../src/content/catalog";
import {
  findResumeNotes,
  resumeRoleProjects,
} from "../src/content/resume-notes";
import {
  CAREER_COURSE_IDS,
  LEARNING_STAGES,
  SKILL_TRACK_IDS,
  TRACK_IDS,
} from "../src/domain/types";
import { advancedPaths } from "../src/content/advanced-careers";
import { freeLabGroups, realCloudOptions } from "../src/content/free-practice";

const catalog = getCatalog();
const skillTracks = catalog.tracks.filter((track) =>
  SKILL_TRACK_IDS.some((id) => id === track.trackId),
);

describe("skill builders inside existing sections", () => {
  it("appends eight complete skill builders without changing earlier totals", () => {
    expect(skillTracks.map((track) => track.trackId)).toEqual([
      ...SKILL_TRACK_IDS,
    ]);
    expect(coreLessons(catalog)).toHaveLength(231);
    expect(allLessons({ ...catalog, tracks: skillTracks })).toHaveLength(166);
    expect(skillTracks.flatMap((track) => track.modules)).toHaveLength(89);
  });

  it("gives every role builder four ordered stages and beginner-sized lessons", () => {
    for (const track of skillTracks) {
      if (track.trackId !== "foundation-essentials")
        expect(
          track.stageOutcomes?.map((item) => item.stage),
          track.trackId,
        ).toEqual([...LEARNING_STAGES]);
      for (const lesson of track.modules.flatMap((module) => module.lessons)) {
        expect(lesson.objectives.length, lesson.id).toBeGreaterThanOrEqual(2);
        expect(lesson.topics.length, lesson.id).toBeGreaterThanOrEqual(2);
        expect(lesson.reading.locator.length, lesson.id).toBeGreaterThan(20);
        expect(
          lesson.assignment.instructions.length,
          lesson.id,
        ).toBeGreaterThan(0);
        expect(
          lesson.assignment.questions.length,
          lesson.id,
        ).toBeGreaterThanOrEqual(2);
        expect(lesson.estimatedMinutes, lesson.id).toBeLessThanOrEqual(300);
      }
    }
  });

  it("places each builder in a real section and returns lessons there", () => {
    const courseIds = advancedPaths.map((path) => path.courseId);
    for (const id of SKILL_TRACK_IDS) {
      const placement = skillBuilderPlacement[id];
      expect(placement.shownIn.length, id).toBeGreaterThan(0);
      for (const section of placement.shownIn)
        expect(TRACK_IDS, `${id} -> ${section}`).toContain(section);
      expect(trackHome(id).href).toBe(placement.home);
      expect(
        placement.home.startsWith("#/path/") ||
          advancedPaths.some(
            (path) => placement.home === `#/career/${path.id}`,
          ),
        id,
      ).toBe(true);
    }
    expect(
      skillBuildersFor(catalog, "foundation").map((t) => t.trackId),
    ).toEqual(["foundation-essentials"]);
    for (const course of CAREER_COURSE_IDS.filter(
      (id) => id !== "systems-languages" && id !== "technical-pm-advanced",
    )) {
      expect(courseIds).toContain(course);
      expect(skillBuildersFor(catalog, course).length, course).toBeGreaterThan(
        0,
      );
    }
    expect(skillBuildersFor(catalog, "cloud-devops")).toHaveLength(0);
  });

  it("links every resume project to a beginner skill module", () => {
    const modules = new Set(
      skillTracks.flatMap((track) => track.modules.map((module) => module.id)),
    );
    const resumeProjects = catalog.projects.filter(
      (project) => project.variant === "resume-target",
    );
    expect(resumeProjects).toHaveLength(23);
    for (const project of resumeProjects) {
      expect(
        project.prerequisites.some((id) => modules.has(id)),
        project.id,
      ).toBe(true);
      expect(findResumeNotes(project.id), project.id).toBeDefined();
    }
    expect(Object.keys(resumeRoleProjects)).toHaveLength(8);
  });
});

describe("₹0 practice lab", () => {
  it("gives every cloud and security lab a free path", () => {
    for (const id of ["cloud-devops", "security-skills"]) {
      const track = catalog.tracks.find((item) => item.trackId === id)!;
      for (const lesson of track.modules.flatMap((module) => module.lessons)) {
        expect(
          lesson.practiceEnvironment?.requirements.length,
          lesson.id,
        ).toBeGreaterThan(0);
        expect(
          lesson.practiceEnvironment?.evidenceBoundary,
          lesson.id,
        ).toBeTruthy();
      }
    }
  });

  it("lists free tools and only no-charge real-cloud plans with official links", () => {
    const tools = freeLabGroups.flatMap((group) => group.tools);
    expect(tools.length).toBeGreaterThanOrEqual(12);
    for (const tool of tools) {
      expect(tool.url.startsWith("https://"), tool.name).toBe(true);
      expect(tool.setup.length, tool.name).toBeGreaterThan(0);
    }
    expect(realCloudOptions.map((option) => option.name)).toEqual([
      "AWS Free plan",
      "Azure free account",
    ]);
  });
});
