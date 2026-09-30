import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  findLesson,
  getCatalog,
  validateCatalog,
} from "../src/content/catalog";
import {
  advancedGroups,
  advancedTargets,
} from "../src/content/advanced-careers";
import {
  advancedPackets,
  advancedProjects,
} from "../src/content/advanced-projects";
import {
  advancedTargetReadings,
  ITCH_SPEC,
  OUCH_SPEC,
  SOUP_SPEC,
} from "../src/content/advanced-readings";
import type { Lesson } from "../src/domain/types";

const catalog = getCatalog();
const lesson = (id: string): Lesson => {
  const found = findLesson(catalog, id);
  if (!found) throw new Error(`Missing teaching unit ${id}`);
  return found.lesson;
};
const content = (id: string) => JSON.stringify(lesson(id));
const packet = (number: number) =>
  advancedPackets.find(
    (item) =>
      item.projectId === `advanced-target-${String(number).padStart(2, "0")}`,
  )!;
const project = (number: number) =>
  advancedProjects.find(
    (item) => item.id === `advanced-target-${String(number).padStart(2, "0")}`,
  )!;

describe("mechanism-specific curriculum acceptance", () => {
  it("uses real versioned Nasdaq message and transport specs instead of a checked soft-404", () => {
    const resources = catalog.tracks.flatMap((track) => track.resources);
    expect(
      resources.some(
        (resource) => resource.id === "advanced-reading-24215d14d71f",
      ),
    ).toBe(false);
    expect(
      resources.some((resource) =>
        /id=TechnicalSupport|id=http404/.test(resource.url),
      ),
    ).toBe(false);
    for (const [url, name] of [
      [ITCH_SPEC, "ITCH 5.0"],
      [OUCH_SPEC, "OUCH 5.0"],
      [SOUP_SPEC, "3.00"],
    ]) {
      const source = resources.find((resource) => resource.url === url)!;
      expect(source.title).toContain(name);
      expect(source.access).toBe("free");
      expect(source.redistribution).toBe("link-only");
      expect(source.hostedPath).toBeUndefined();
    }
    const parser = content("advanced-d5-intermediate-02-protocol-parsers");
    expect(parser).toMatch(/1\.3\.1/);
    expect(parser).toMatch(/October 2025|October2025/);
    expect(parser).toContain("SoupBinTCP");
    expect(parser).toContain("length 37");
    expect(1 + 36).toBe(37);
    expect(2 + 1 + 36).toBe(39);
    expect(advancedTargetReadings(19).map((reading) => reading.url)).toEqual(
      expect.arrayContaining([ITCH_SPEC, OUCH_SPEC, SOUP_SPEC]),
    );
    const changed = structuredClone(catalog);
    const candidate = changed.tracks.find(
      (track) => track.trackId === "quant-infrastructure-advanced",
    )!.resources[0];
    candidate.title = "Page Not Available";
    candidate.access = "free";
    candidate.availability = "checked";
    expect(() => validateCatalog(changed)).toThrow(
      /Unavailable\/error-page body/,
    );
  });

  it("teaches a distinct workflow replay/timer mechanism and requires it for all target03 exercises", () => {
    const id = "advanced-d1-advanced-04-workflow-replay";
    const value = content(id);
    for (const term of [
      "reserve-0",
      "wait-1",
      "receipt-2",
      "ActivityCompleted",
      "TimerScheduled",
      "TimerFired",
      "60000",
      "history cursor",
      "version",
      "unrecorded",
      "idempotency",
    ])
      expect(value, term).toContain(term);
    expect(value).toContain("without calling the provider again");
    expect(value).toContain("not arbitrary Go code as a sandbox");
    expect(lesson(id).prerequisites).toContain("quant-l15-command-log-replay");
    expect(project(3).prerequisiteLessons).toContain(id);
    for (const exercise of packet(3).exercises) {
      expect(exercise.lessonIds).toContain(id);
      expect(exercise.reading.url).toBe(
        "https://docs.temporal.io/workflow-definition",
      );
      expect(exercise.reading.locator).toContain("Deterministic constraints");
      expect(
        exercise.additionalReadings?.map((reading) => reading.url),
      ).toContain("https://docs.temporal.io/develop/go/workflows/timers");
      expect(exercise.instructions.join(" ")).toMatch(
        /history|timer|version|replay/i,
      );
    }
    expect(advancedGroups).toHaveLength(114);
    expect(advancedTargets).toHaveLength(24);
  });

  it("reuses the existing knowledge-time oracle in the complete feature-store preparation graph", () => {
    for (const exercise of packet(7).exercises) {
      expect(exercise.lessonIds).toContain("quant-l10-availability-time");
      expect(exercise.lessonIds).toContain("data-l25");
      expect(exercise.lessonIds).toContain("systems-foundation-arrays-frames");
      expect(exercise.reading.url).toBe(
        "https://pandas.pydata.org/docs/reference/api/pandas.merge_asof.html",
      );
    }
    expect(project(7).prerequisiteLessons).toContain(
      "quant-l10-availability-time",
    );
    expect(
      packet(7)
        .exercises.map((exercise) => exercise.instructions.join(" "))
        .join(" "),
    ).toMatch(/event-time-only\/latest-revision implementation leaks A=9\/B=7/);
    const rows = [
      { entity: "A", event: 10, available: 11, revision: 1, value: 5 },
      { entity: "A", event: 10, available: 15, revision: 2, value: 9 },
      { entity: "B", event: 10, available: 14, revision: 1, value: 7 },
    ];
    const oracle = (cutoff: number, ignoreAvailability = false) =>
      Object.fromEntries(
        ["A", "B"].map((entity) => {
          const eligible = rows.filter(
            (row) =>
              row.entity === entity &&
              row.event <= cutoff &&
              (ignoreAvailability || row.available <= cutoff),
          );
          eligible.sort(
            (a, b) =>
              a.event - b.event ||
              a.available - b.available ||
              a.revision - b.revision,
          );
          return [entity, eligible.at(-1)?.value ?? null];
        }),
      );
    expect(oracle(12)).toEqual({ A: 5, B: null });
    expect(oracle(16)).toEqual({ A: 9, B: 7 });
    expect(oracle(11)).toEqual({ A: 5, B: null });
    expect(oracle(12, true)).toEqual({ A: 9, B: 7 });
    expect(oracle(12, true)).not.toEqual(oracle(12));
  });

  it("preserves a domain-aware allowed positive and deny/resolution cases rather than IP-only policy", () => {
    const target = advancedTargets.find((target) => target.number === 8)!;
    expect(target.required).toMatch(/DOMAIN whitelists/);
    expect(target.required).toMatch(/DNS-pinned application proxy/);
    for (const id of [
      "advanced-d2-advanced-05-sandbox-runtimes",
      "advanced-d3-advanced-05-linux-sandbox",
    ]) {
      const text = content(id);
      for (const word of ["domain", "proxy", "TLS", "direct-IP", "resolution"])
        expect(text, `${id}/${word}`).toContain(word);
      expect(text).toMatch(/positive/);
    }
    const practice = packet(8)
      .exercises.map((exercise) => exercise.instructions.join(" "))
      .join(" ");
    for (const word of [
      "allowed.test",
      "denied.test",
      "direct-IP",
      "rebound DNS",
      "TLS",
      "vsock",
    ])
      expect(practice).toContain(word);
    expect(practice).toContain("fixture-bridge substitute");
  });

  it("teaches actual receiving-side XDP direction and separate process attribution", () => {
    for (const id of [
      "systems-advanced-c-ebpf",
      "advanced-d3-advanced-01-runtime-events",
    ]) {
      const text = content(id);
      expect(text).toContain("workload-veth TX -> peer-veth RX/XDP");
      expect(text).toMatch(/ingress/);
      expect(text).toMatch(/ifindex/);
      expect(text).toMatch(/tc\/cgroup/);
      expect(text).toMatch(/current PID|current-task\/PID/);
    }
    const target = advancedTargets.find((target) => target.number === 9)!;
    expect(target.required).toContain("peer-veth RX/XDP");
    expect(target.required).not.toContain("XDP egress enforcement");
    for (const exercise of packet(9).exercises)
      expect(exercise.reading.locator).toContain(
        "XDP executes when the driver receives",
      );
  });

  it("gives all 96 packet readings the curated per-target sections/APIs and additional references", () => {
    const readingContract = Array.from({ length: 24 }, (_, index) => [
      index + 1,
      advancedTargetReadings(index + 1).map((reading) => [
        reading.title,
        reading.url,
        reading.locator,
      ]),
    ]);
    expect(
      createHash("sha256")
        .update(JSON.stringify(readingContract))
        .digest("hex"),
    ).toBe("d094f7b0feb04b33350e22b7c3f8ecd24cd6fe44d5a863d000d42c8e728fa9c2");
    expect(advancedPackets.flatMap((packet) => packet.exercises)).toHaveLength(
      96,
    );
    for (const target of advancedTargets) {
      const readings = advancedTargetReadings(target.number);
      expect(readings.length).toBeGreaterThanOrEqual(2);
      expect(
        project(target.number).sources.map((source) => source.url),
      ).toEqual(readings.map((reading) => reading.url));
      for (const exercise of packet(target.number).exercises) {
        expect(exercise.reading).toEqual(readings[0]);
        expect(exercise.additionalReadings).toEqual(readings.slice(1));
        for (const reading of [
          exercise.reading,
          ...(exercise.additionalReadings || []),
        ]) {
          expect(reading.url).toMatch(/^https:\/\//);
          expect(reading.locator).not.toMatch(
            /Locate the documented mechanism|Read the protocol\/runtime sections relevant/,
          );
          expect(reading.locator.length).toBeGreaterThan(60);
        }
      }
    }
  });
});
