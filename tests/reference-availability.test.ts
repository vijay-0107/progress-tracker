import { describe, expect, it } from "vitest";
import { advancedTargets } from "../src/content/advanced-careers";
import { advancedPackets } from "../src/content/advanced-projects";
import { careerPackets } from "../src/content/career-exercises";
import { getCatalog } from "../src/content/catalog";
import { readinessCount, projectTotals } from "../src/domain/careers";
import { createProgress } from "../src/domain/progress";

const target = (number: number) => {
  const result = advancedTargets.find((item) => item.number === number);
  if (!result) throw new Error(`Missing target ${number}`);
  return result;
};

describe("dated reference availability is not full-spec completion or learner mastery", () => {
  it("records all 24 scoped reviews with partial CPU portions and publication holds distinct", () => {
    expect(advancedTargets).toHaveLength(24);
    expect(
      advancedTargets
        .filter((item) => item.referenceStatus === "reviewed-partial-reference")
        .map((item) => item.number),
    ).toEqual([5, 6]);
    expect(
      advancedTargets.filter(
        (item) => item.referenceStatus === "reviewed-scoped-reference",
      ),
    ).toHaveLength(22);
    expect(
      advancedTargets
        .filter((item) => item.availability.publicationHold)
        .map((item) => item.number),
    ).toEqual([3, 5, 6, 10, 23]);
    expect(
      advancedTargets
        .filter((item) => item.availability.publication === "merged")
        .map((item) => item.number),
    ).toEqual([
      1, 2, 4, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24,
    ]);
    for (const item of advancedTargets) {
      expect(item.availability.snapshotOn).toBe("2026-09-30");
      expect(item.coverage.length).toBeGreaterThan(0);
      expect(item.availability.targetQualification.length).toBeGreaterThan(60);
      expect(
        advancedPackets.find((packet) => packet.projectId === item.id)
          ?.availability,
      ).toEqual(item.availability);
    }
  });

  it("links actual private draft implementations, never seed-only main as delivered code", () => {
    const repos = {
      3: "durable-workflow-runtime",
      5: "paged-llm-inference",
      6: "heterogeneous-inference-router",
      10: "workload-identity-broker",
    };
    for (const [key, repo] of Object.entries(repos)) {
      const availability = target(Number(key)).availability;
      expect(availability.publication).toBe("unmerged-draft");
      expect(availability.publicationHold).toBe(true);
      expect(availability.codeUrl).toBe(
        `https://github.com/vijay-0107/${repo}/pull/1`,
      );
      expect(availability.publicationNote).toContain("seed-only");
    }
    expect(target(3).availability.verification).toBe("owner-triage-required");
    expect(target(10).availability.verification).toBe("owner-triage-required");
    expect(target(5).availability.verification).toBe(
      "cpu-checks-passed-hardware-open",
    );
    expect(target(6).availability.verification).toBe(
      "cpu-checks-passed-hardware-open",
    );
  });

  it("preserves partial-model and skipped-hardware distinctions rather than relabelling CPU as GPU", () => {
    const p5 = JSON.stringify(target(5));
    for (const text of [
      "156",
      "19 EXPLICIT SKIPS",
      "17 GPU",
      "two native-ABI",
      "NO",
      "OPEN",
    ])
      expect(p5).toContain(text);
    expect(target(5).availability.reviewScope).toBe("partial-cpu");
    const p6 = JSON.stringify(target(6));
    for (const text of [
      "UNTRAINED 4-16-3",
      "NOT an LLM",
      "FP32 dequantized",
      "POLICY",
      "TTFT",
      "ITL",
      "null",
      "hardwareUnavailable=true",
    ])
      expect(p6).toContain(text);
    expect(target(6).availability.reviewScope).toBe("partial-cpu");
    expect(target(9).availability.reviewScope).toBe("experimental-owned-lab");
    expect(JSON.stringify(target(9))).toContain(
      "attempts, not completed writes",
    );
    expect(JSON.stringify(target(9))).toContain(
      "TCP was only compiled/verifier-checked",
    );
  });

  it("keeps failed/unattempted targets beside their actual measured boundaries", () => {
    const expectations: Record<number, RegExp[]> = {
      2: [/NOT ATTEMPTED/, /202048/, /65536/, /1000\/10000/],
      4: [/24-hour.*UNVERIFIED/, /ONE PG database/, /injected-clock/],
      7: [
        /15\.795 ms MISSES/,
        /0\.986/,
        /0\.3 s/,
        /consumer ingestion\/acceptance/,
        /NOT first HTTP/,
      ],
      8: [/422\.77 ms FAILS/, /42\.32/, /5\.86/, /not a cold pass/],
      9: [/174\.61%/, /9\.55%/, /FAIL/, /EXPERIMENTAL/],
      10: [/SOFTWARE swtpm/, /STS NOT IMPLEMENTED/, /not a wall-clock soak/],
      12: [/STATIC subset/, /70% reduction is UNVERIFIED/],
      13: [
        /NOT petabyte\/SLO/,
        /metadata-only/,
        /physical GC is NOT/,
        /DRY RUN/,
      ],
      15: [/NOT MET/, /2\.134 s/, /18000/, /RELATIVE/],
      17: [/typed C\+\+20 core only/, /EPYC miss/, /not end-to-end/],
      18: [/PUBLIC-API 100x gate NOT MET/, /no kernel-only/, /synthetic/],
      19: [
        /1 ms p99 target NOT MET/,
        /NULL\/unmeasured/,
        /not archive I\/O/,
        /after create only/,
      ],
      23: [
        /QUALIFICATION BLOCKED/,
        /failed/,
        /BOUND 114\.561 ms/,
        /100 ms guard/,
        /not actual clock skew/,
        /UNEXERCISED/,
        /NO-GO/,
      ],
      24: [
        /Synthetic/,
        /Four intentional policy errors/,
        /not passing chargeback/,
      ],
    };
    for (const [key, patterns] of Object.entries(expectations))
      for (const pattern of patterns)
        expect(
          target(Number(key)).availability.targetQualification,
          `${key}/${pattern}`,
        ).toMatch(pattern);
  });

  it("keeps P23 latest failed-main and corrective verification follow-up pending", () => {
    const availability = target(23).availability;
    expect(availability.publication).toBe("follow-up-pending");
    expect(availability.publicationHold).toBe(true);
    expect(availability.verification).toBe("qualification-blocked");
    expect(availability.codeUrl).toBe(
      "https://github.com/vijay-0107/cloud-migration-playbook",
    );
    expect(availability.followUpUrl).toBe(
      "https://github.com/vijay-0107/cloud-migration-playbook/pull/2",
    );
    expect(availability.publicationNote).toContain(
      "latest recorded main CI FAILED",
    );
    expect(availability.publicationNote).toContain(
      "checks are not all passing",
    );
    expect(availability.publicationNote).toContain("no verification closure");
    expect(target(23).coverage.join(" ")).toContain("pre-merge");
  });

  it("does not seed or alter any learner/build record when all reference metadata exists", () => {
    const catalog = getCatalog();
    const state = createProgress("guest", "2026-09-30T00:00:00.000Z");
    for (const item of advancedTargets)
      expect(readinessCount(state, item.id)).toBe(0);
    expect(projectTotals(catalog, state, "advanced")).toEqual({
      total: 24,
      gates: 96,
      recorded: 0,
      completed: 0,
    });
    expect(projectTotals(catalog, state, "original")).toMatchObject({
      total: 21,
      gates: 84,
      recorded: 0,
    });
    expect(projectTotals(catalog, state, "career")).toMatchObject({
      total: 5,
      gates: 20,
      recorded: 0,
    });
    expect(state.projects).toEqual({});
    expect(state.lessons).toEqual({});
    expect(state.activity).toEqual({});
    expect(careerPackets).toHaveLength(10);
    expect(
      careerPackets.every(
        (packet) =>
          packet.referenceStatus === "accepted-local-reference" &&
          !packet.availability,
      ),
    ).toBe(true);
  });

  it("publishes only dated safe scope and explicit opt-in URLs, not private proof or credentials", () => {
    const text = JSON.stringify(advancedTargets);
    expect(text).not.toMatch(
      /copilot-worktrees|\\\\Users\\\\|\.copilot|\/actions\/runs\/|\/job\/|37739068|37739210|36689377169|9343169a|Parent-reviewed|parent-verified/i,
    );
    expect(text).not.toMatch(/(?<![a-f0-9])[a-f0-9]{40}(?![a-f0-9])/);
    for (const item of advancedTargets) {
      const url = new URL(item.availability.codeUrl);
      expect(url.origin).toBe("https://github.com");
      expect(url.username).toBe("");
      expect(url.password).toBe("");
      expect(url.search).toBe("");
      expect(url.hash).toBe("");
      expect(url.pathname).toMatch(
        new RegExp(`^/vijay-0107/${item.repository}(?:/pull/[1-9][0-9]*)?$`),
      );
    }
  });
});
