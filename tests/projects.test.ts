import { describe, expect, it } from "vitest";
import { projects } from "../src/content/projects";
import type { Project } from "../src/domain/types";

const expectedA = [
  {
    id: "data-shopping-mall-operations",
    title: "Shopping-Mall Operations Database",
    track: "data",
  },
  {
    id: "data-mall-sales-inventory",
    title: "Mall Sales and Inventory Lakehouse",
    track: "data",
  },
  {
    id: "sde-transaction-safe-commerce",
    title: "Transaction-Safe E-Commerce Website",
    track: "sde",
  },
  {
    id: "sde-returns-exchange",
    title: "Returns and Exchange Portal",
    track: "sde",
  },
  {
    id: "quant-paper-exchange",
    title: "Paper Exchange and Deterministic Replay",
    track: "quant",
  },
  {
    id: "quant-point-in-time-workbench",
    title: "Point-in-Time Market-Data Workbench",
    track: "quant",
  },
  {
    id: "ai-consent-local-verification",
    title: "Consent-Based Local Face Verification",
    track: "ai",
  },
  {
    id: "ai-face-capture-quality",
    title: "Face-Capture Quality Model",
    track: "ai",
  },
] as const;

const expectedB = [
  {
    id: "data-multi-tenant-cdc",
    title: "Multi-Tenant Mall CDC Lakehouse",
    track: "data",
  },
  {
    id: "data-event-time-reconciliation",
    title: "Event-Time Inventory Reconciliation Platform",
    track: "data",
  },
  {
    id: "data-contract-recovery",
    title: "Data Contract and Recovery Test Platform",
    track: "data",
  },
  {
    id: "sde-order-orchestrator",
    title: "Failure-Tolerant Commerce Order Orchestrator",
    track: "sde",
  },
  {
    id: "sde-tenant-marketplace",
    title: "Tenant-Isolated Multi-Seller Marketplace",
    track: "sde",
  },
  {
    id: "sde-product-search",
    title: "Product Search and Relevance Evaluation Service",
    track: "sde",
  },
  {
    id: "quant-multi-instrument-ledger",
    title: "Multi-Instrument Paper Exchange and Ledger",
    track: "quant",
  },
  {
    id: "quant-versioned-research-data",
    title: "Versioned Point-in-Time Research Data Platform",
    track: "quant",
  },
  {
    id: "quant-portfolio-reconciliation",
    title: "Paper-Portfolio Exposure and Reconciliation Service",
    track: "quant",
  },
  {
    id: "ai-permission-aware-assistant",
    title: "Permission-Aware Mall Knowledge Assistant",
    track: "ai",
  },
  {
    id: "ai-governed-analytics",
    title: "Governed Analytics Agent and Text-to-SQL Service",
    track: "ai",
  },
  {
    id: "ai-evaluation-serving",
    title: "LLM Evaluation and Reliable Serving Platform",
    track: "ai",
  },
] as const;

const expectedShared = {
  id: "shared-fabric-reporting",
  title: "Microsoft Fabric Reporting Workflows",
  tracks: ["data", "sde", "quant", "ai"],
  variant: "professional-synthetic-recreation",
};

const expectedGates = [
  { key: "design-fixtures", title: "Design and fixtures" },
  { key: "vertical-slice", title: "Working vertical slice" },
  { key: "correctness-failure-tests", title: "Correctness and failure tests" },
  {
    key: "documentation-demo-measurements",
    title: "Documented demo and measurements",
  },
];

const allowedSources = new Set([
  "https://learn.microsoft.com/en-us/fabric/onelake/onelake-medallion-lakehouse-architecture",
  "https://learn.microsoft.com/en-us/fabric/fundamentals/fabric-trial",
  "https://www.postgresql.org/docs/current/explicit-locking.html",
  "https://www.amazon.jobs/content/en/career-programs/university/sde",
  "https://docs.djangoproject.com/en/5.2/topics/db/transactions/",
  "https://www.janestreet.com/join-jane-street/position/8647260002/",
  "https://docs.cdp.coinbase.com/exchange/concepts/matching-engine",
  "https://pandas.pydata.org/docs/reference/api/pandas.merge_asof.html",
  "https://sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html",
  "https://docs.opencv.org/4.13.0/d0/dd4/tutorial_dnn_face.html",
  "https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#biometric_use",
  "https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/python",
  "https://developers.openai.com/api/docs/guides/evaluation-best-practices",
]);

const domainChecks: Record<string, RegExp[]> = {
  "data-shopping-mall-operations": [
    /concurrent overlapping lease/i,
    /duplicate receipts/i,
    /restored backup/i,
    /read-only users are denied/i,
  ],
  "data-mall-sales-inventory": [
    /duplicate file/i,
    /corrected batches/i,
    /financial control totals/i,
    /rejection reason/i,
  ],
  "sde-transaction-safe-commerce": [
    /racing purchases/i,
    /client-submitted prices/i,
    /duplicate payment callbacks/i,
    /cross-customer order access/i,
  ],
  "sde-returns-exchange": [
    /500 fulfilled synthetic orders/i,
    /eligible fulfilled quantities/i,
    /duplicate simulated credits/i,
    /failed exchanges/i,
  ],
  "quant-paper-exchange": [
    /price\/FIFO/i,
    /conserved|equals accepted original quantity/i,
    /identical fills/i,
    /reference engine/i,
  ],
  "quant-point-in-time-workbench": [
    /availability time/i,
    /later disclosures/i,
    /hand-written oracle/i,
    /optimized joins/i,
  ],
  "ai-consent-local-verification": [
    /claimed-identity-only/i,
    /freeze the threshold/i,
    /genuine\/impostor pair counts/i,
    /withdrawal immediately disables verification/i,
  ],
  "ai-face-capture-quality": [
    /source capture/i,
    /same locked data/i,
    /rejection coverage/i,
    /clean retraining/i,
  ],
  "data-multi-tenant-cdc": [
    /schema version/i,
    /different tenants/i,
    /historical versions/i,
    /no overlapping active intervals/i,
  ],
  "data-event-time-reconciliation": [
    /availability time/i,
    /correction lineage/i,
    /reference calculation/i,
    /earlier as-known reports remain unchanged/i,
  ],
  "data-contract-recovery": [
    /dependency cycles/i,
    /contract failure/i,
    /every declared failure point/i,
    /output digests match clean rebuilds/i,
  ],
  "sde-order-orchestrator": [
    /compensation/i,
    /stable operation keys/i,
    /crash.*acknowledgement/i,
    /retry exhaustion/i,
  ],
  "sde-tenant-marketplace": [
    /permission matrix/i,
    /seller A cannot read or mutate seller B/i,
    /never oversell/i,
    /role-escalation/i,
  ],
  "sde-product-search": [
    /lexical, dense and reranked/i,
    /every returned product satisfies/i,
    /invalidates old result caches/i,
    /NDCG@k/i,
  ],
  "quant-multi-instrument-ledger": [
    /cash\/position/i,
    /trade ID/i,
    /snapshot and full replay/i,
    /cash\/position conservation/i,
  ],
  "quant-versioned-research-data": [
    /immutable version identity/i,
    /availability-filtered/i,
    /pinned snapshot/i,
    /optimized joins equal reference results/i,
  ],
  "quant-portfolio-reconciliation": [
    /fixed-point reference calculation/i,
    /missing mark/i,
    /cash\/position mismatch/i,
    /documented price shocks/i,
  ],
  "ai-permission-aware-assistant": [
    /authorization filtering occurs before/i,
    /every emitted citation/i,
    /explicit abstention/i,
    /malicious retrieved instructions/i,
  ],
  "ai-governed-analytics": [
    /single SELECT/i,
    /server-bound tenant controls/i,
    /two-second timeout/i,
    /200-row cap/i,
    /reference SQL/i,
  ],
  "ai-evaluation-serving": [
    /scoring versions/i,
    /three attempts/i,
    /total deadline/i,
    /traces contain no seeded secrets/i,
    /predeclared gate/i,
  ],
  "shared-fabric-reporting": [
    /table-specific/i,
    /dimensions\/facts/i,
    /net sales and units sold/i,
    /corrected-file backfill/i,
  ],
};

function projectText(project: Project): string {
  return [
    project.summary,
    project.scope,
    project.historicalNote,
    ...project.safety,
    ...project.milestones.flatMap((milestone) => [
      ...milestone.deliverables,
      ...milestone.acceptanceCriteria,
    ]),
  ].join("\n");
}

function getProject(id: string): Project {
  const project = projects.find((candidate) => candidate.id === id);
  if (!project) throw new Error(`Missing required project: ${id}`);
  return project;
}

describe("resume project catalog", () => {
  it("contains exactly the 21 required unique IDs and exact titles", () => {
    const expected = [
      ...expectedA.map(({ id, title, track }) => ({
        id,
        title,
        tracks: [track],
        variant: "A-rebuild",
      })),
      ...expectedB.map(({ id, title, track }) => ({
        id,
        title,
        tracks: [track],
        variant: "B-build",
      })),
      expectedShared,
    ];
    const identity = (project: Project) => ({
      id: project.id,
      title: project.title,
      tracks: project.tracks,
      variant: project.variant,
    });
    expect(projects).toHaveLength(21);
    expect(new Set(projects.map((project) => project.id)).size).toBe(21);
    expect(new Set(projects.map((project) => project.title)).size).toBe(21);
    expect(
      projects.map(identity).sort((a, b) => a.id.localeCompare(b.id)),
    ).toEqual(expected.sort((a, b) => a.id.localeCompare(b.id)));
  });

  it("has eight A reconstructions, twelve B plans and only one shared recreation", () => {
    expect(
      projects.filter((project) => project.variant === "A-rebuild"),
    ).toHaveLength(8);
    expect(
      projects.filter((project) => project.variant === "B-build"),
    ).toHaveLength(12);
    expect(
      projects.filter(
        (project) => project.variant === "professional-synthetic-recreation",
      ),
    ).toHaveLength(1);
    for (const track of ["data", "sde", "quant", "ai"] as const) {
      expect(
        projects.filter(
          (project) =>
            project.variant === "A-rebuild" && project.tracks.includes(track),
        ),
      ).toHaveLength(2);
      expect(
        projects.filter(
          (project) =>
            project.variant === "B-build" && project.tracks.includes(track),
        ),
      ).toHaveLength(3);
    }
    expect(projects.filter((project) => project.tracks.length > 1)).toEqual([
      getProject(expectedShared.id),
    ]);
    expect(getProject(expectedShared.id).tracks).toEqual([
      "data",
      "sde",
      "quant",
      "ai",
    ]);
  });

  it.each(expectedA)(
    "keeps $title's reconstruction incomplete without publishing private history",
    ({ id }) => {
      const note = getProject(id).historicalNote;
      expect(note).toMatch(/not independently verified/i);
      expect(note).toMatch(/not recovered implementation files/i);
      expect(note).toMatch(/new reconstruction/i);
      expect(note).toMatch(/current reconstruction is incomplete/i);
      expect(note).toMatch(/does not complete any milestone/i);
      expect(note).not.toMatch(/OneDrive|\b(?:19|20)\d{2}\b/);
    },
  );

  it.each(expectedB)(
    "keeps $title a future plan without a completion date or claimed result",
    ({ id }) => {
      const note = getProject(id).historicalNote;
      expect(note).toMatch(/^Planned future build/);
      expect(note).toMatch(/all four evidence gates are incomplete/i);
      expect(note).toMatch(/No completion date.*measured outcome is claimed/i);
      expect(note).not.toMatch(/\b(?:19|20)\d{2}\b/);
      expect(getProject(id).scope).toMatch(
        /proposed.*MVP|proposed local modular service/i,
      );
    },
  );

  it("separates professional experience from the synthetic shared build", () => {
    const project = getProject(expectedShared.id);
    expect(project.historicalNote).not.toMatch(/\b(?:19|20)\d{2}\b/);
    expect(project.historicalNote).toMatch(
      /not the original workplace implementation/i,
    );
    expect(project.historicalNote).toMatch(
      /independently verified employment evidence/i,
    );
    expect(project.historicalNote).toMatch(/recreation is incomplete/i);
    expect(projectText(project)).toMatch(/not four copies/i);
    expect(projectText(project)).toMatch(/synthetic or.*public fixtures/i);
    expect(project.safety.join(" ")).toMatch(
      /Never copy employer\/client notebooks, data, code, screenshots, identities or confidential architecture/,
    );
  });

  describe.each(projects)("$title", (project) => {
    it("has meaningful scope, prerequisites and safety boundaries without seeded progress", () => {
      expect(project.id).toMatch(/^[a-z]+(?:-[a-z0-9]+)+$/);
      expect(project.summary.trim().length).toBeGreaterThan(60);
      expect(project.scope.trim().length).toBeGreaterThan(150);
      expect(project.historicalNote).toMatch(/incomplete/i);
      expect(project.prerequisites).toEqual([]);
      expect(project.prerequisiteTags.length).toBeGreaterThanOrEqual(5);
      expect(new Set(project.prerequisiteTags).size).toBe(
        project.prerequisiteTags.length,
      );
      for (const tag of project.prerequisiteTags)
        expect(tag).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(project.safety.length).toBeGreaterThanOrEqual(3);
      for (const boundary of project.safety)
        expect(boundary.trim().length).toBeGreaterThan(35);
      expect(project.safety.join(" ")).toMatch(/locally without paid APIs/);
      expect(project.safety.join(" ")).toMatch(
        /Never publish employer\/client data, code, screenshots, identities/,
      );
      expect(Object.keys(project).sort()).toEqual(
        [
          "id",
          "title",
          "tracks",
          "variant",
          "summary",
          "scope",
          "prerequisites",
          "prerequisiteTags",
          "historicalNote",
          "safety",
          "milestones",
          "sources",
        ].sort(),
      );
    });

    it("has four ordered evidence gates, not pre-completed milestone records", () => {
      expect(project.milestones).toHaveLength(4);
      expect(project.milestones.map((milestone) => milestone.title)).toEqual(
        expectedGates.map((gate) => gate.title),
      );
      project.milestones.forEach((milestone, index) => {
        expect(milestone.id).toBe(`${project.id}-${expectedGates[index].key}`);
        expect(Object.keys(milestone).sort()).toEqual(
          ["id", "title", "deliverables", "acceptanceCriteria"].sort(),
        );
        expect(milestone.deliverables.length).toBeGreaterThanOrEqual(2);
        expect(milestone.acceptanceCriteria.length).toBeGreaterThanOrEqual(4);
        for (const deliverable of milestone.deliverables)
          expect(deliverable.trim().length).toBeGreaterThan(30);
        for (const check of milestone.acceptanceCriteria)
          expect(check.trim().length).toBeGreaterThan(30);
        expect(new Set(milestone.acceptanceCriteria).size).toBe(
          milestone.acceptanceCriteria.length,
        );
        if (index === 0) {
          expect(milestone.acceptanceCriteria[0]).toMatch(
            /new, incomplete evidence record.*historical claims and planned results do not pass/,
          );
        } else {
          expect(milestone.acceptanceCriteria[0]).toBe(
            `Gate: satisfy every acceptance check in "${expectedGates[index - 1].title}" with evidence before starting this milestone.`,
          );
        }
        const domainCriteria = milestone.acceptanceCriteria.filter(
          (check) =>
            !check.startsWith("Gate:") &&
            !check.startsWith("A clean local checkout"),
        );
        expect(domainCriteria.length).toBeGreaterThanOrEqual(3);
      });
    });

    it("retains project-specific engineering checks and measurable evidence", () => {
      expect(domainChecks[project.id]).toBeDefined();
      for (const requirement of domainChecks[project.id])
        expect(projectText(project)).toMatch(requirement);
      const finalGate = project.milestones[3];
      expect(finalGate.deliverables.join(" ")).toMatch(
        /README.*scope.*architecture.*clean setup.*test commands.*limitations.*design alternatives/,
      );
      expect(finalGate.deliverables.join(" ")).toMatch(
        /provenance\/licensing.*normal-and-failing-case demo.*workload, hardware, commands and actual results/,
      );
      expect(finalGate.acceptanceCriteria.join(" ")).toMatch(
        /recorded runs.*no invented results/,
      );
      expect(finalGate.acceptanceCriteria.join(" ")).toMatch(
        /report|record|measure/i,
      );
    });

    it("links only to the exact safe HTTPS references in the brief", () => {
      expect(project.sources.length).toBeGreaterThan(0);
      expect(new Set(project.sources.map((source) => source.url)).size).toBe(
        project.sources.length,
      );
      for (const source of project.sources) {
        expect(source.title.trim().length).toBeGreaterThan(5);
        expect(allowedSources.has(source.url)).toBe(true);
        const url = new URL(source.url);
        expect(url.protocol).toBe("https:");
        expect(url.username).toBe("");
        expect(url.password).toBe("");
        expect(url.search).toBe("");
        expect(source.notes?.trim().length).toBeGreaterThan(15);
      }
    });
  });

  it("uses globally unique milestone IDs and distinct project evidence plans", () => {
    const milestoneIds = projects.flatMap((project) =>
      project.milestones.map((milestone) => milestone.id),
    );
    expect(milestoneIds).toHaveLength(84);
    expect(new Set(milestoneIds).size).toBe(84);
    const domainPlans = projects.map((project) =>
      JSON.stringify(
        project.milestones.map((milestone) =>
          milestone.deliverables.slice(0, 2),
        ),
      ),
    );
    expect(new Set(domainPlans).size).toBe(21);
  });

  it("keeps both face projects opt-in, local, private and out of prohibited identification uses", () => {
    for (const id of [
      "ai-consent-local-verification",
      "ai-face-capture-quality",
    ]) {
      const project = getProject(id);
      const safety = project.safety.join(" ");
      expect(safety).toMatch(
        /explicit opt-in consent from adults.*local processing/,
      );
      expect(safety).toMatch(
        /No unknown-person identification, gallery search, surveillance, demographic classification or emotion inference/,
      );
      expect(safety).toMatch(
        /Images, embeddings and templates are sensitive and private/,
      );
      expect(safety).toMatch(/retention and deletion\/withdrawal controls/);
      expect(safety).toMatch(/component and dataset permissions separately/);
      expect(project.milestones[2].acceptanceCriteria.join(" ")).toMatch(
        /withdrawal/i,
      );
    }
    expect(projectText(getProject("ai-consent-local-verification"))).toMatch(
      /subsequent app-level verification for that enrollment is denied/,
    );
    expect(projectText(getProject("ai-face-capture-quality"))).toMatch(
      /excludes the subject from clean retraining/,
    );
  });

  it("keeps every quant project fictional and makes no profit or investment-advantage claim", () => {
    for (const project of projects.filter(
      (candidate) =>
        candidate.tracks.length === 1 && candidate.tracks[0] === "quant",
    )) {
      expect(project.safety.join(" ")).toMatch(
        /fictional markets only, without a live broker/,
      );
      expect(project.safety.join(" ")).toMatch(
        /not profits, alpha, investment advice or evidence of professional trading experience/,
      );
      expect(project.scope).toMatch(/fictional/i);
    }
  });

  it("retains independent local fixtures and explicit Fabric trial/cost boundaries", () => {
    expect(projectText(getProject("data-mall-sales-inventory"))).toMatch(
      /generator must run independently of Shopping-Mall Operations Database/,
    );
    expect(projectText(getProject("sde-returns-exchange"))).toMatch(
      /without starting the storefront project/,
    );
    const fabricPlans = [
      "data-mall-sales-inventory",
      "data-multi-tenant-cdc",
      "data-event-time-reconciliation",
      "data-contract-recovery",
      "shared-fabric-reporting",
    ];
    for (const id of fabricPlans) {
      const project = getProject(id);
      expect(project.safety.join(" ")).toMatch(
        /Fabric is optional.*trial is time-limited.*incur charges.*run locally without a Fabric subscription/,
      );
      expect(project.sources.map((source) => source.url)).toContain(
        "https://learn.microsoft.com/en-us/fabric/fundamentals/fabric-trial",
      );
    }
  });
});
