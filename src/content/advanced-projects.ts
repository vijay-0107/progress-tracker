import type { CareerProjectPacket, Project } from "../domain/types";
import { LEARNING_STAGES } from "../domain/types";
import { advancedTargetReadings } from "./advanced-readings";
import {
  advancedGroups,
  advancedPaths,
  advancedTargets,
  advancedProjectLanguageLessons,
} from "./advanced-careers";

const mechanics: [string, string, string][] = [
  [
    "Raft commitment and durable disk publication are separate boundaries; a live membership change must preserve the old/new quorum safety argument.",
    "Does a stale leader's local append establish a committed KV write?",
    "No. The applicable consensus/quorum rules and durable state-machine contract determine commitment.",
  ],
  [
    "An L7 route snapshot must outlive its in-flight requests. Rate limiting controls admission; a circuit breaker reacts to failures and recovery probes.",
    "Can a token bucket substitute for an upstream circuit breaker?",
    "No. The two mechanisms have different observations, state transitions and acceptance tests.",
  ],
  [
    "An ordered workflow command/history cursor matches command identity, kind and supported version, supplies stored activity results and resumes a persisted timer deadline. This is not an outbox rename. Unrecorded time/input or incompatible command order must fail; an effect/completion crash still requires provider idempotency and fenced result commitment.",
    "Does replaying a workflow function permit repeating an already completed external side effect?",
    "No. Completed results must be recovered from history; uncertain deliveries need explicit idempotency/fencing and reconciliation.",
  ],
  [
    "A shadow discrepancy decision needs comparable result semantics and a real observation population/window. A fake clock tests the gate, not an actual soak.",
    "Can a simulated 24-hour threshold test establish an observed 24-hour migration soak?",
    "No. The real runtime window and its retained eligible observations are separate evidence.",
  ],
  [
    "Paged KV ownership and iteration-level batching must preserve each request's causal attention state. CPU parity is a reference, not proof of a CUDA kernel or GPU throughput.",
    "Does a CPU scheduler test satisfy the custom FP16/INT4 CUDA execution requirement?",
    "No. Compilation, CPU reference math and actual supported GPU execution are different gates.",
  ],
  [
    "EDF chooses among deadlines but cannot create capacity. Quantized fallback changes the quality/capability contract and missing NVML telemetry is not an idle GPU.",
    "May an unavailable GPU metric be replaced with zero utilization for routing?",
    "No. Unknown or stale telemetry must remain unavailable/unknown under the admission policy.",
  ],
  [
    "Online freshness, event time, availability time and prediction cutoff are different boundaries. The canonical quant-l10 slow knowledge-time oracle and grouped backward as-of join determine historical feature eligibility; Kafka offsets or correct watermarks do not supply that join.",
    "Does an event's original timestamp make a later correction available to an earlier training cutoff?",
    "No. The knowledge/availability boundary must exclude information not available at the cutoff.",
  ],
  [
    "Firecracker needs real KVM isolation/reset and a domain-aware per-job DNS-pinned application proxy: canonical authority, approved resolved peer and TLS SAN must agree. Prove an actual owned allowed-domain response as well as denied/direct-IP/unapproved-resolution cases. An IP allowlist or blanket denial is not the domain whitelist; cold, restore and warm timings remain separate.",
    "Does a plain IP allowlist or blanket network denial satisfy the required outbound domain whitelist?",
    "No. Bind domain/authority, approved pinned resolution, actual connection and TLS identity through the owned proxy and demonstrate the allowed positive path as well as denials.",
  ],
  [
    "XDP is ingress: the owned outbound workload path is workload-veth TX -> peer-veth RX/XDP. Record the receiving namespace/ifindex and actual allowed/denied outbound flows. tc/cgroup egress is a different hook, and ordinary XDP current PID is not the originating-process identity; syscall/socket/cgroup observations supply that separate context.",
    "Where must the XDP program attach in the workload-veth TX -> peer-veth RX/XDP construction?",
    "At the receiving peer ingress, with namespace/ifindex/direction evidence. A different egress hook or an unrelated ingress test cannot stand in for that outbound workload property.",
  ],
  [
    "Workload identity must bind authenticated attestation to the intended trust domain and short-lived certificate. A TPM simulator does not prove physical attestation.",
    "Does a caller-supplied Pod label alone authorize a workload certificate?",
    "No. The claimed identity must be established through the trusted attestation path.",
  ],
  [
    "Graph edges must represent effective authority, including deny/boundary/trust/context rules. A syntactic allow path with unsupported conditions remains uncertain.",
    "Is every path in an IAM graph necessarily an executable privilege chain?",
    "No. The underlying permission/trust/context model must justify each edge; unsupported semantics remain unknown.",
  ],
  [
    "A static call graph approximates possible paths under a supported language model. Reflection and unresolved dispatch cannot be silently classified as safe.",
    "Does static reachability prove that an affected function actually executed?",
    "No. Potential reachability and observed runtime execution are distinct; missing analysis can mean unknown.",
  ],
  [
    "Iceberg metadata, object storage and ClickHouse query execution have distinct commit/visibility boundaries. Maintenance must protect every retained live reference.",
    "Is an old data file automatically safe to remove during lakehouse cleanup?",
    "No. Retained snapshots, branches, readers or concurrent writes may still reference it.",
  ],
  [
    "Federation pushdown must preserve SQL meaning and prove what data transfer it avoided. Flight buffer reuse does not remove all serialization, network or engine copies.",
    "Can reduced TCP payload be described as reduced disk I/O without measuring disk I/O?",
    "No. They are different boundaries; report the actual transport measurement and its workload.",
  ],
  [
    "Schema rejection, approximate profiling and durable DLQ delivery must reconcile every event across restart. A drift alert is not automatic proof of consumer harm.",
    "May an invalid event disappear after the consumer acknowledges its source offset?",
    "No. The declared durable rejection/DLQ outcome must be preserved and inspectable.",
  ],
  [
    "Column lineage requires scope/schema/alias/expression resolution, not just physical row provenance. An unresolved star or dynamic query must preserve unknown impact.",
    "Does unresolved SQL mean the changed column has no downstream consumers?",
    "No. Incomplete analysis is unknown, not a safe empty dependency set.",
  ],
  [
    "Fixed-capacity matching must reject before partial mutation and preserve independent price/FIFO outcomes. Allocation and latency claims apply only to the instrumented operation boundary.",
    "Does p99 below one microsecond prove a worst-case or cross-machine latency guarantee?",
    "No. The sample, operation, hardware and estimator define the claim; maxima and other-machine misses remain relevant.",
  ],
  [
    "Vectorized screening and event-driven execution must share an information/accounting contract. A native speed comparison is valid only for equivalent actual work.",
    "Does a deterministic backtest establish that its fill assumptions match a real market?",
    "No. Reproducibility and execution-model validity are different properties, and no profitability follows.",
  ],
  [
    "Classic FIX is text while Nasdaq TotalView-ITCH 5.0 uses its own binary payload tables; SoupBinTCP 3.00 is a distinct chosen transport envelope. OUCH 5.0 October 2025 order messages have different direction/layout. Preserved event timestamps and real-time pacing have different error definitions.",
    "Does zero event timestamp skew mean the operating system introduced zero replay jitter?",
    "No. Logical event preservation and wall-clock scheduling are distinct measurements.",
  ],
  [
    "Speculative attempts need one fenced result per stable trial, with data/fold/code provenance. mmap page sharing is host-local and does not establish multi-host scale.",
    "May two successful speculative workers both publish the authoritative result for one trial?",
    "No. A durable fenced commit must select the accepted result while retaining attempt history.",
  ],
  [
    "A modernization PRD must connect client needs, compatibility/deprecation and protocol trade-offs to actual gateway behavior, without fictional demand becoming a fact.",
    "Does a working gateway prototype prove enterprise adoption of the proposed platform?",
    "No. It establishes bounded technical behavior; personas, costs and adoption assumptions remain separate.",
  ],
  [
    "Token/cache economics, valid randomized analysis and developer quality outcomes require different evidence. A synthetic scenario can reject a bad plan but cannot establish causal ROI.",
    "Can projected engineering-hour savings be reported as observed productivity gains?",
    "No. Projections and a valid real outcome study are different evidence categories.",
  ],
  [
    "Migration rings must respect dependencies and data compatibility. RTO/RPO observations from a local rehearsal do not prove actual multi-cloud zero downtime.",
    "Does reverting a service binary necessarily restore the old database state?",
    "No. Application rollback, schema compatibility and data recovery need separately tested contracts.",
  ],
  [
    "Cost attribution must conserve the total, retain unallocated amounts and define valid denominators. A strict greater-than threshold excludes equality.",
    "Does exactly 15 percent above baseline trigger a greater-than-15-percent spend policy?",
    "No. Equality does not satisfy a strict greater-than rule; missing or zero baselines need separate handling.",
  ],
];

const focusedPractice: Record<
  number,
  {
    preparation: string[];
    stages: [string, string, string, string];
  }
> = {
  3: {
    preparation: [
      "advanced-d1-advanced-04-workflow-replay",
      "quant-l15-command-log-replay",
    ],
    stages: [
      "Predict the original reserve-0/wait-1/receipt-2 history and replay cursor. Match ordered commands/version/input identity to schedule events, return reservation-R42 from its stored completion and preserve the timer deadline t0+60000.",
      "Modify the workflow with an explicitly versioned branch. Restart after reserve completion and before timer firing; prove no repeated reservation effect, no fresh full timer delay and no receipt before TimerFired.",
      "Reject reordered commands, altered input identity, unsupported versions and guarded unrecorded-clock/input requests. Crash after the receipt effect but before recording completion; retry with the same provider key and distinguish attempts from effects.",
      "Retain actual Go/PostgreSQL restart, durable-timer and provider-counter evidence. Compare uninterrupted/replayed results, justify version compatibility and at-least-once activity delivery, and leave days-long operation unverified without an observed run.",
    ],
  },
  7: {
    preparation: [
      "quant-l10-availability-time",
      "data-l25",
      "systems-foundation-arrays-frames",
      "systems-intermediate-sql-depth",
    ],
    stages: [
      "Reuse quant-l10's slow knowledge-time oracle for feature entities. Declare seconds since a fixed UTC epoch: A/event10/available11/revision1/value5; later A/event10/available15/revision2/value9; B/event10/available14/revision1/value7. At prediction cutoff12 expect A=5 and B=missing; at cutoff16 expect A=9 and B=7.",
      "Implement the feature transform and entity-grouped backward as-of eligibility join against that independent slow oracle. Declare inclusive available_at <= prediction_cutoff, event eligibility, revision precedence and staleness; preserve these fields through actual online/offline stores.",
      "Append the late revision and re-run the frozen cutoff12 export: it must stay A=5/B=missing. An intentionally event-time-only/latest-revision implementation leaks A=9/B=7 and must fail. Also test equality at availability cutoff, duplicate CDC and restart.",
      "Defend historical feature/label eligibility, unchanged earlier snapshots and actual broker/online/offline evidence separately. A correct watermark/window or current online value is not proof of a point-in-time training join or sub-5ms serving.",
    ],
  },
  8: {
    preparation: [
      "advanced-d2-advanced-05-sandbox-runtimes",
      "advanced-d3-advanced-05-linux-sandbox",
    ],
    stages: [
      "Draw guest -> vsock -> per-job application proxy -> owned TLS origin. Bind canonical allowed.test authority, approved pinned DNS result, actual peer and TLS SAN; explain why an IP-only allowlist or denying every request is insufficient.",
      "Change one owned domain/resource policy and run an actual allowed-domain positive request with expected body/hash/size in the approved KVM environment. Keep job identity and proxy state isolated and the base/reset contract explicit.",
      "Deny denied.test, direct-IP access, an unapproved/rebound DNS result and a redirect to another authority. Test missing KVM/proxy setup as fail-closed, never host execution or a fixture-bridge substitute.",
      "Retain actual KVM/reset and guest/vsock/proxy allowed-and-denied evidence; report cold boot, snapshot restore and warm admission separately. Missing environment or an unmet cold-start target stays incomplete, not a simulated or warm-timing pass.",
    ],
  },
  9: {
    preparation: [
      "systems-advanced-c-ebpf",
      "advanced-d3-advanced-01-runtime-events",
    ],
    stages: [
      "Draw workload-veth TX -> peer-veth RX/XDP -> owned destination, recording both namespaces/ifindexes and direction. Explain XDP receive context versus separate syscall/socket/cgroup process attribution.",
      "Modify a bounded XDP predicate attached to the receiving peer ingress and exercise actual allowed and denied outgoing workload traffic. Keep Tetragon/process rules and packet policy evidence distinct.",
      "Reproduce a wrong-ifindex/direction attachment or truncated-packet/event-loss fixture without real intrusion. Show why unrelated ingress denial or tc/cgroup egress cannot be called the requested XDP proof.",
      "Defend actual verifier/load/attachment/outbound-flow and structured gRPC event evidence. Measure overhead on the declared enabled-hook workload; preserve unavailable privileged execution and unsupported PID attribution as limitations.",
    ],
  },
};

function targetLessons(projectId: string, groupIds: string[]) {
  const target = advancedTargets.find((item) => item.id === projectId);
  if (!target)
    throw new Error(`Advanced target preparation is unavailable: ${projectId}`);
  return [
    ...new Set([
      ...advancedProjectLanguageLessons(projectId),
      ...(focusedPractice[target.number]?.preparation || []),
      ...advancedGroups
        .filter((group) => groupIds.includes(group.id))
        .flatMap((group) => group.lessonIds),
    ]),
  ];
}

export const advancedProjects: Project[] = advancedTargets.map((target) => {
  const path = advancedPaths.find((path) => path.number === target.domain)!;
  const readings = advancedTargetReadings(target.number);
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
          ...(focusedPractice[target.number]
            ? [focusedPractice[target.number].stages[index]]
            : []),
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
    sources: readings.map((reading) => ({
      title: reading.title,
      url: reading.url,
      notes: reading.locator,
    })),
  };
});

export const advancedPackets: CareerProjectPacket[] = advancedTargets.map(
  (target) => {
    const [concept, question, answer] = mechanics[target.number - 1];
    const readings = advancedTargetReadings(target.number);
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
        reading: readings[0],
        additionalReadings: readings.slice(1),
        concepts: [concept, target.unverifiedTargets.join(" ")],
        instructions: [
          target.stages[index],
          ...(focusedPractice[target.number]
            ? [focusedPractice[target.number].stages[index]]
            : []),
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
          ...(focusedPractice[target.number]
            ? [
                `My original evidence includes these concrete checks: ${focusedPractice[target.number].stages[index]}`,
              ]
            : []),
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
