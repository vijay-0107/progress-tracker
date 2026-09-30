import type { CareerProjectPacket, Project } from "../domain/types";
import { LEARNING_STAGES } from "../domain/types";
import {
  advancedGroups,
  advancedPaths,
  advancedTargets,
  advancedProjectLanguageLessons,
} from "./advanced-careers";

const mechanics: [string, string, string, string][] = [
  [
    "Raft commitment and durable disk publication are separate boundaries; a live membership change must preserve the old/new quorum safety argument.",
    "Does a stale leader's local append establish a committed KV write?",
    "No. The applicable consensus/quorum rules and durable state-machine contract determine commitment.",
    "https://raft.github.io/",
  ],
  [
    "An L7 route snapshot must outlive its in-flight requests. Rate limiting controls admission; a circuit breaker reacts to failures and recovery probes.",
    "Can a token bucket substitute for an upstream circuit breaker?",
    "No. The two mechanisms have different observations, state transitions and acceptance tests.",
    "https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/arch_overview",
  ],
  [
    "Workflow replay must consume durable history/results rather than repeat every completed activity. An effect/acknowledgement crash still requires stable effect identity and reconciliation.",
    "Does replaying a workflow function permit repeating an already completed external side effect?",
    "No. Completed results must be recovered from history; uncertain deliveries need explicit idempotency/fencing and reconciliation.",
    "https://www.postgresql.org/docs/current/explicit-locking.html",
  ],
  [
    "A shadow discrepancy decision needs comparable result semantics and a real observation population/window. A fake clock tests the gate, not an actual soak.",
    "Can a simulated 24-hour threshold test establish an observed 24-hour migration soak?",
    "No. The real runtime window and its retained eligible observations are separate evidence.",
    "https://docs.rs/sqlparser/latest/sqlparser/",
  ],
  [
    "Paged KV ownership and iteration-level batching must preserve each request's causal attention state. CPU parity is a reference, not proof of a CUDA kernel or GPU throughput.",
    "Does a CPU scheduler test satisfy the custom FP16/INT4 CUDA execution requirement?",
    "No. Compilation, CPU reference math and actual supported GPU execution are different gates.",
    "https://docs.vllm.ai/",
  ],
  [
    "EDF chooses among deadlines but cannot create capacity. Quantized fallback changes the quality/capability contract and missing NVML telemetry is not an idle GPU.",
    "May an unavailable GPU metric be replaced with zero utilization for routing?",
    "No. Unknown or stale telemetry must remain unavailable/unknown under the admission policy.",
    "https://docs.nvidia.com/deploy/nvml-api/",
  ],
  [
    "Online feature freshness and offline point-in-time eligibility are different clocks. CDC progress, feature identity and durable sink boundaries must survive duplicate delivery.",
    "Does an event's original timestamp make a later correction available to an earlier training cutoff?",
    "No. The knowledge/availability boundary must exclude information not available at the cutoff.",
    "https://debezium.io/documentation/reference/3.3/connectors/postgresql.html",
  ],
  [
    "Firecracker needs a real KVM isolation boundary and resettable owned state. Boot, restore and warm-pool admission are different measurements.",
    "Should unavailable KVM cause the execution API to run the script on the host?",
    "No. Missing isolation is an explicit unavailable/fail-closed result, never an unsandboxed success.",
    "https://github.com/firecracker-microvm/firecracker/tree/main/docs",
  ],
  [
    "Compilation, verifier acceptance, hook attachment and actual enforcement establish different properties. Bounded event loss and CPU overhead must be observed with the real enabled program.",
    "Does replaying JSON events prove that an XDP policy blocked an actual owned packet?",
    "No. Rule fixtures do not substitute for authorized kernel attachment and observed enforcement.",
    "https://www.kernel.org/doc/html/latest/bpf/libbpf/index.html",
  ],
  [
    "Workload identity must bind authenticated attestation to the intended trust domain and short-lived certificate. A TPM simulator does not prove physical attestation.",
    "Does a caller-supplied Pod label alone authorize a workload certificate?",
    "No. The claimed identity must be established through the trusted attestation path.",
    "https://spiffe.io/docs/latest/",
  ],
  [
    "Graph edges must represent effective authority, including deny/boundary/trust/context rules. A syntactic allow path with unsupported conditions remains uncertain.",
    "Is every path in an IAM graph necessarily an executable privilege chain?",
    "No. The underlying permission/trust/context model must justify each edge; unsupported semantics remain unknown.",
    "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html",
  ],
  [
    "A static call graph approximates possible paths under a supported language model. Reflection and unresolved dispatch cannot be silently classified as safe.",
    "Does static reachability prove that an affected function actually executed?",
    "No. Potential reachability and observed runtime execution are distinct; missing analysis can mean unknown.",
    "https://docs.python.org/3/library/ast.html",
  ],
  [
    "Iceberg metadata, object storage and ClickHouse query execution have distinct commit/visibility boundaries. Maintenance must protect every retained live reference.",
    "Is an old data file automatically safe to remove during lakehouse cleanup?",
    "No. Retained snapshots, branches, readers or concurrent writes may still reference it.",
    "https://iceberg.apache.org/docs/latest/maintenance/",
  ],
  [
    "Federation pushdown must preserve SQL meaning and prove what data transfer it avoided. Flight buffer reuse does not remove all serialization, network or engine copies.",
    "Can reduced TCP payload be described as reduced disk I/O without measuring disk I/O?",
    "No. They are different boundaries; report the actual transport measurement and its workload.",
    "https://arrow.apache.org/docs/format/Flight.html",
  ],
  [
    "Schema rejection, approximate profiling and durable DLQ delivery must reconcile every event across restart. A drift alert is not automatic proof of consumer harm.",
    "May an invalid event disappear after the consumer acknowledges its source offset?",
    "No. The declared durable rejection/DLQ outcome must be preserved and inspectable.",
    "https://json-schema.org/learn/getting-started-step-by-step",
  ],
  [
    "Column lineage requires scope/schema/alias/expression resolution, not just physical row provenance. An unresolved star or dynamic query must preserve unknown impact.",
    "Does unresolved SQL mean the changed column has no downstream consumers?",
    "No. Incomplete analysis is unknown, not a safe empty dependency set.",
    "https://sqlglot.com/sqlglot/lineage.html",
  ],
  [
    "Fixed-capacity matching must reject before partial mutation and preserve independent price/FIFO outcomes. Allocation and latency claims apply only to the instrumented operation boundary.",
    "Does p99 below one microsecond prove a worst-case or cross-machine latency guarantee?",
    "No. The sample, operation, hardware and estimator define the claim; maxima and other-machine misses remain relevant.",
    "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines",
  ],
  [
    "Vectorized screening and event-driven execution must share an information/accounting contract. A native speed comparison is valid only for equivalent actual work.",
    "Does a deterministic backtest establish that its fill assumptions match a real market?",
    "No. Reproducibility and execution-model validity are different properties, and no profitability follows.",
    "https://www.quantconnect.com/docs/v2/writing-algorithms/reality-modeling",
  ],
  [
    "Classic FIX is text while ITCH uses its specified binary format. Preserved event timestamps and real-time replay pacing have different error definitions.",
    "Does zero event timestamp skew mean the operating system introduced zero replay jitter?",
    "No. Logical event preservation and wall-clock scheduling are distinct measurements.",
    "https://www.fixtrading.org/standards/",
  ],
  [
    "Speculative attempts need one fenced result per stable trial, with data/fold/code provenance. mmap page sharing is host-local and does not establish multi-host scale.",
    "May two successful speculative workers both publish the authoritative result for one trial?",
    "No. A durable fenced commit must select the accepted result while retaining attempt history.",
    "https://docs.python.org/3/library/mmap.html",
  ],
  [
    "A modernization PRD must connect client needs, compatibility/deprecation and protocol trade-offs to actual gateway behavior, without fictional demand becoming a fact.",
    "Does a working gateway prototype prove enterprise adoption of the proposed platform?",
    "No. It establishes bounded technical behavior; personas, costs and adoption assumptions remain separate.",
    "https://spec.openapis.org/oas/v3.1.1.html",
  ],
  [
    "Token/cache economics, valid randomized analysis and developer quality outcomes require different evidence. A synthetic scenario can reject a bad plan but cannot establish causal ROI.",
    "Can projected engineering-hour savings be reported as observed productivity gains?",
    "No. Projections and a valid real outcome study are different evidence categories.",
    "https://www.microsoft.com/en-us/research/articles/diagnosing-sample-ratio-mismatch-in-a-b-testing/",
  ],
  [
    "Migration rings must respect dependencies and data compatibility. RTO/RPO observations from a local rehearsal do not prove actual multi-cloud zero downtime.",
    "Does reverting a service binary necessarily restore the old database state?",
    "No. Application rollback, schema compatibility and data recovery need separately tested contracts.",
    "https://sre.google/workbook/canarying-releases/",
  ],
  [
    "Cost attribution must conserve the total, retain unallocated amounts and define valid denominators. A strict greater-than threshold excludes equality.",
    "Does exactly 15 percent above baseline trigger a greater-than-15-percent spend policy?",
    "No. Equality does not satisfy a strict greater-than rule; missing or zero baselines need separate handling.",
    "https://www.finops.org/framework/",
  ],
];

function targetLessons(projectId: string, groupIds: string[]) {
  return [
    ...new Set([
      ...advancedProjectLanguageLessons(projectId),
      ...advancedGroups
        .filter((group) => groupIds.includes(group.id))
        .flatMap((group) => group.lessonIds),
    ]),
  ];
}

export const advancedProjects: Project[] = advancedTargets.map((target) => {
  const path = advancedPaths.find((path) => path.number === target.domain)!;
  return {
    id: target.id,
    title: target.title,
    tracks: [path.courseId],
    variant: "advanced-target",
    summary: `Advanced target ${target.number} of 24. ${target.required}`,
    scope: target.required,
    prerequisites: [],
    prerequisiteTags: path.technologies,
    prerequisiteLessons: targetLessons(target.id, target.skillGroups),
    historicalNote:
      "A new advanced learning scope with fresh evidence identities. Earlier projects and reviewed reference results do not complete this learner build.",
    safety: [
      "Use original synthetic data and only explicitly owned, authorized environments. Quant practice is paper-only; security work is defensive and isolated.",
      "No paid provisioning, host-policy bypass, credential collection or real trading is required or authorized. Keep private evidence and source out of public artifacts.",
      ...target.executionGates.map((gate) => `Execution prerequisite: ${gate}`),
      ...target.unverifiedTargets,
    ],
    milestones: ["design", "vertical", "correctness", "release"].map(
      (gate, index) => ({
        id: `${target.id}-${gate}`,
        title: [
          "Design and independent fixtures",
          "Working named-runtime slice",
          "Correctness and failure recovery",
          "Reproducible release and scoped defense",
        ][index],
        deliverables: [
          target.stages[index],
          "Retain original inputs, expected/observed results, exact environment and unresolved limitations.",
        ],
        acceptanceCriteria: [
          target.stages[index],
          index === 0
            ? "The fixture oracle and supported scope are explicit before implementation; repository availability grants no completion."
            : "The stated implementation/failure behavior is actually exercised in the named supported runtime; unavailable work remains incomplete.",
          "All results and performance statements are traceable to the declared boundary; no reference receipt substitutes for the learner's own work.",
          index === 3
            ? "All required target mechanisms and numeric/soak criteria have actual scoped evidence. An unmet required mechanism, runtime or benchmark criterion cannot count as a completed target."
            : "I have independently checked each criterion for this gate; a saved draft or reference implementation does not acknowledge it for me.",
        ],
      }),
    ),
    sources: [
      {
        title: `Official mechanics for advanced target ${target.number}`,
        url: mechanics[target.number - 1][3],
        notes:
          "Read the protocol/runtime sections relevant to the supported scope; no private repository source is fetched.",
      },
    ],
  };
});

export const advancedPackets: CareerProjectPacket[] = advancedTargets.map(
  (target) => {
    const [concept, question, answer, url] = mechanics[target.number - 1];
    const number = String(target.number).padStart(2, "0");
    return {
      repository: target.repository,
      projectId: target.id,
      title: target.title,
      referenceStatus: target.referenceStatus,
      referenceLabel: target.referenceLabel,
      coverage: target.coverage,
      limitations: [
        ...target.limitations,
        `Earlier overlap: ${target.overlap}`,
      ],
      exercises: LEARNING_STAGES.map((stage, index) => ({
        id: `advanced-ex-${number}-${stage}`,
        stage,
        title: `${["Explain", "Modify", "Debug", "Test and defend"][index]} target ${target.number}: ${target.title}`,
        objective: target.stages[index],
        lessonIds: targetLessons(target.id, target.skillGroups),
        reading: {
          title: `Official protocol/runtime reading for target ${target.number}`,
          url,
          locator: `${concept} Locate the documented mechanism, failure assumptions and supported version before applying it to the original fixture.`,
          verifiedOn: "2026-09-30",
        },
        concepts: [concept, target.unverifiedTargets.join(" ")],
        instructions: [
          target.stages[index],
          index === 0
            ? `Before running code, predict a small original fixture for this exact contract: ${target.required}`
            : `Exercise the target's actual mechanism rather than an earlier simplified substitute. Relevant boundary: ${concept}`,
          index === 1
            ? "Retain the old and modified behavior, explain why the change is bounded, and compare positive and rejected/failure cases against independent expectations."
            : index === 2
              ? "Retain a minimal failing input/schedule, the violated invariant, the root-cause correction and a regression that fails before the correction and succeeds afterward."
              : index === 3
                ? `Reproduce the declared release/measurement and defend its exclusions. Execution prerequisites: ${target.executionGates.join("; ")}.`
                : "Explain one rejected alternative and identify the observation that would disprove your predicted outcome; do not copy the reference implementation's explanation as your own.",
          "Record your own evidence for this gate only. Reading, simulation, compilation, actual integration and target-hardware/benchmark results must remain separately labelled; unexecuted work stays incomplete.",
        ],
        deliverables: [
          target.stages[index],
          `${["An independent expected-result trace", "A bounded change and before/after regression", "A minimal failure and verified correction", "A reproducible release/measurement and limitation dossier"][index]} for target ${target.number}.`,
        ],
        acceptanceCriteria: [
          `My evidence demonstrates this specific work: ${target.stages[index]}`,
          index === 0
            ? `I can explain the mechanism independently: ${concept}`
            : `I retained actual expected/observed results at this boundary: ${concept}`,
          index === 3
            ? "Required named-runtime/hardware tests are genuinely executed, and performance/soak claims use actual retained observations. Missing required execution does not satisfy this gate."
            : "My evidence is distinct from the other gates and from reference receipts; simulations, missing prerequisites and limitations are explicit.",
        ],
        selfCheck: { prompt: question, answer, explanation: concept },
      })),
    };
  },
);
