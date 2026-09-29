import type {
  CareerExercise,
  CareerProjectPacket,
  CareerReading,
  Stage,
} from "../domain/types";
import { careerReadings as r } from "./career-readings";

export const exerciseId = (repository: string, stage: Stage) =>
  `career-ex-${repository}-${stage}`;

function x(
  stage: Stage,
  title: string,
  lessonIds: string[],
  reading: CareerReading,
  concepts: [string, string],
  instructions: [string, string, string],
  deliverables: [string, string],
  acceptanceCriteria: [string, string, string],
  selfCheck: [string, string, string],
): Omit<CareerExercise, "id"> {
  return {
    stage,
    title,
    objective: instructions[0],
    lessonIds,
    reading,
    concepts,
    instructions,
    deliverables,
    acceptanceCriteria,
    selfCheck: {
      prompt: selfCheck[0],
      answer: selfCheck[1],
      explanation: selfCheck[2],
    },
  };
}

function packet(
  repository: string,
  projectId: string,
  title: string,
  referenceStatus: CareerProjectPacket["referenceStatus"],
  coverage: string[],
  limitations: string[],
  exercises: Omit<CareerExercise, "id">[],
): CareerProjectPacket {
  return {
    repository,
    projectId,
    title,
    referenceStatus,
    coverage,
    limitations,
    exercises: exercises.map((exercise) => ({
      ...exercise,
      id: exerciseId(repository, exercise.stage),
    })),
  };
}

export const careerPackets: CareerProjectPacket[] = [
  packet(
    "commerce-workflow-engine",
    "sde-order-orchestrator",
    "Durable Commerce Workflow Engine",
    "accepted-local-reference",
    [
      "FastAPI and single-host SQLite WAL/FULL with atomic server-priced reservation/order/idempotency/outbox writes.",
      "Fenced leases, bounded retries/dead letters, a separate persistent simulated provider, full-refund compensation and conservative reconciliation.",
      "Tenant/customer/staff/provider demo-key boundaries, UI recovery and CLI.",
    ],
    [
      "SQLite is not the original learning brief's PostgreSQL implementation; PostgreSQL-specific work remains a separate requirement.",
      "Local synthetic payments only: no real payments, high availability, partial refunds or tax handling. Persistent at-least-once work is not distributed exactly-once delivery.",
      "Direct-service workload timings exclude HTTP, UI and provider-network traffic; they are not p95 end-to-end settlement results.",
      "PM personas, research, experiments and economics are hypothetical, not real users, interviews, adoption or customer outcomes.",
    ],
    [
      x(
        "foundation",
        "Trace server-owned price and durable intent",
        ["foundation-lesson-04-functions-contracts", "sde-l04-api-contracts"],
        r.typing,
        [
          "A type hint documents a value domain but does not reject a hostile runtime value.",
          "Stock reservation, order and outbox intent need one atomic boundary; a separate provider database is outside it.",
        ],
        [
          "Draw a six-step order trace with server-owned price, stock, operation key and provider boundary.",
          "Annotate a small parser contract and try a string price, negative quantity and missing key; distinguish annotation from runtime validation.",
          "Predict the order, stock and outbox state when the transaction fails before commit.",
        ],
        [
          "A typed contract and invalid-input fixture table.",
          "A transaction/provider boundary diagram with expected rollback states.",
        ],
        [
          "Client-supplied price cannot determine the accepted charge.",
          "Malformed quantity is visibly rejected rather than silently coerced.",
          "The rollback prediction leaves no partial stock reservation or orphan work intent.",
        ],
        [
          "Does annotating quantity as int reject a string at runtime?",
          "No; explicit runtime validation is still required.",
          "Python annotations describe a contract. They do not by themselves execute validation or establish the transaction's business invariants.",
        ],
      ),
      x(
        "intermediate",
        "Change compensation without duplicate credits",
        ["sde-l07-idempotent-effects", "sde-l09-return-workflows"],
        r.stories,
        [
          "A retry key represents one business operation, not each delivery attempt.",
          "Compensation is a new auditable action; it cannot erase an already committed provider effect.",
        ],
        [
          "Write a full-refund-only change request with allowed order states and a stable compensation key.",
          "Implement the change in an owned copy and replay the same refund request three times.",
          "Inject a decline and a cancellation; explain the difference between database rollback and compensating credit.",
        ],
        [
          "A scoped change with a before/after state-transition table.",
          "A repeated-request trace and regression tests for full refunds.",
        ],
        [
          "Three deliveries create at most one refund effect under the declared contract.",
          "A disallowed transition leaves financial and stock state unchanged.",
          "The write-up does not imply partial refunds or real payment integration.",
        ],
        [
          "Should an idempotency key change when a timed-out refund is retried?",
          "No, the same logical refund retains its key.",
          "Changing the key makes a retry indistinguishable from another operation and can defeat the provider-side duplicate-effect boundary.",
        ],
      ),
      x(
        "advanced",
        "Challenge a stale worker lease",
        ["sde-l10-durable-work", "sde-l16-failure-properties"],
        r.metrics,
        [
          "Lease expiry alone does not stop a paused worker from resuming.",
          "Fencing must reject old authority at the mutation boundary, including acknowledgements.",
        ],
        [
          "Pause worker A after it claims work, expire its lease in an isolated fixture, and let worker B reclaim it.",
          "Resume A and test that its stale token cannot acknowledge or duplicate the effect.",
          "Crash between the simulated provider effect and acknowledgement, then inspect recovery or the conservative reconciliation state.",
        ],
        [
          "A deterministic two-worker schedule and stale-token regression.",
          "A provider-effect/restart trace with reconciliation reasons.",
        ],
        [
          "The stale worker cannot overwrite the newer claim.",
          "The effect is not duplicated after the acknowledgement crash.",
          "Unknown outcomes become visible reconciliation work, not a fabricated success.",
        ],
        [
          "Does an expired lease guarantee its former worker has stopped?",
          "No; a stale worker may still resume.",
          "A scheduling promise cannot revoke running code. A checked fencing token and idempotent effect are needed to reject obsolete authority.",
        ],
      ),
      x(
        "professional",
        "Defend a local workflow release",
        ["sde-l22-observability", "sde-l29-evidence-review"],
        r.release,
        [
          "Service-call timing and end-to-end customer latency cover different boundaries.",
          "A hypothetical product case can justify an experiment, but cannot prove adoption or business benefit.",
        ],
        [
          "Reproduce a bounded workload and name every included and excluded component.",
          "Demonstrate one reconciliation incident and a stop/retry decision using persisted evidence.",
          "Defend the implemented scope and a hypothetical product trade-off, separating actual code from assumed user needs.",
        ],
        [
          "A workload-labelled measurement and incident report.",
          "A release/defer memo with a hypothetical-assumption ledger.",
        ],
        [
          "The report never labels direct-service timings as HTTP/UI or end-to-end settlement latency.",
          "Recovery evidence identifies the order/provider state and remaining uncertainty.",
          "No real-user, payment, high-availability or exactly-once-distribution claim is made.",
        ],
        [
          "Can a direct-service benchmark establish p95 customer settlement time?",
          "No; excluded transport and provider work prevent that inference.",
          "A measurement supports only its named workload and boundaries. A percentile for a different end-to-end journey requires actual samples of that journey.",
        ],
      ),
    ],
  ),
  packet(
    "tenant-policy-service",
    "sde-tenant-policy-service",
    "Tenant Authorization and Policy Service",
    "accepted-local-reference",
    [
      "FastAPI with single-writer SQLite WAL, server-owned identity/tenant/roles/attributes and opaque hashed expiring/revocable API keys.",
      "Typed role/attribute and owner-only rules, deny-by-default, explicit-deny precedence and immutable policy versions.",
      "Revision-guarded activation/rollback and transactional authentication/decision/audit commit before allow, with UI and CLI.",
    ],
    [
      "Issues authorization decisions and catalog metadata; it does not enforce access to external resources.",
      "Not AWS IAM, OAuth/OIDC, hosted IAM, cloud deployment or a distributed cache.",
      "The local operator and OS clock are trusted. Policy rollback does not revive expired or revoked keys.",
    ],
    [
      x(
        "foundation",
        "Separate identity, decision and enforcement",
        ["security-l05-permissions", "security-l02-threat-model"],
        r.typing,
        [
          "The server binds identity and tenant; a caller's claimed role is not authority.",
          "An allow decision has no protective effect unless the resource owner actually enforces it.",
        ],
        [
          "Build a subject/resource/action table for two synthetic tenants and an anonymous caller.",
          "Mark which attributes are server-owned and predict explicit-deny precedence.",
          "Draw the separate policy decision and consumer enforcement boundaries.",
        ],
        [
          "An ownership/deny table with at least one conflicting allow and deny.",
          "A boundary diagram distinguishing metadata from protected resources.",
        ],
        [
          "A forged caller role does not become server authority.",
          "An applicable explicit deny wins over an allow.",
          "The diagram does not claim this service protects an unrelated downstream API.",
        ],
        [
          "Does a correct allow/deny response secure an external resource automatically?",
          "No; that resource needs an enforcement boundary.",
          "Decision correctness and enforcement coverage are different properties. A consumer that ignores or misapplies a decision can still expose data.",
        ],
      ),
      x(
        "intermediate",
        "Add a typed immutable policy version",
        ["security-l18-tenant-boundaries", "sde-l15-layered-tests"],
        r.stories,
        [
          "An immutable policy version is a historical artifact, not a mutable live document.",
          "Attribute type mismatches need explicit semantics rather than truthy coercion.",
        ],
        [
          "Define a new owner-only rule and its accepted role/attribute types.",
          "Create a new policy version without modifying the earlier version.",
          "Test permitted ownership, cross-tenant denial, a wrong attribute type and a missing attribute.",
        ],
        [
          "A policy change with typed positive and negative fixtures.",
          "An immutable-version comparison and acceptance report.",
        ],
        [
          "The old version's content is unchanged.",
          "Wrong-type or missing attributes cannot accidentally grant access.",
          "Cross-tenant decisions are denied with bounded reason codes.",
        ],
        [
          "Should adding a rule overwrite the active version's stored content?",
          "No; create a new immutable version.",
          "Historical decisions need a stable policy identity. Mutating a version destroys the meaning of audits that reference that version.",
        ],
      ),
      x(
        "advanced",
        "Rollback policy without resurrecting keys",
        ["security-l21-secret-lifecycle", "security-l18-tenant-boundaries"],
        r.metrics,
        [
          "Key validity and policy version are independent dimensions of authority.",
          "A revision guard prevents a stale administrator from silently replacing a newer activation.",
        ],
        [
          "Activate a second policy version, revoke one dummy key and expire another.",
          "Attempt a stale-revision activation, then perform an authorized rollback to the first version.",
          "Verify revoked/expired keys remain unusable and a denied audit commit prevents an allow response.",
        ],
        [
          "A version/key-state matrix across activation and rollback.",
          "Revision-conflict and audit-failure regression evidence.",
        ],
        [
          "Rollback does not restore expired or revoked authority.",
          "A stale expected revision fails visibly without changing active policy.",
          "An allow response is not returned before the required audit transaction commits.",
        ],
        [
          "Can rolling policy back to v1 make a revoked key valid again?",
          "No; revocation must remain independently effective.",
          "Policy rollback changes decision rules, not credential history. Conflating them would revive authority the operator explicitly removed.",
        ],
      ),
      x(
        "professional",
        "Review the decision service's residual risk",
        ["security-l28-risk-register", "security-l30-assurance-review"],
        r.technology,
        [
          "A single-writer local service has different failure and trust assumptions from cloud IAM.",
          "Audit records should explain outcomes without disclosing key material or sensitive attributes.",
        ],
        [
          "Trace one allowed and one denied request through authentication, policy revision and audit commit.",
          "Write an exception decision naming downstream enforcement, local-clock and operator assumptions.",
          "Demonstrate a safe rollback and publish only sanitized reason-code examples.",
        ],
        [
          "A decision/audit trace with secret-free evidence.",
          "A residual-risk and consumer-integration review.",
        ],
        [
          "The report distinguishes decisions from external resource enforcement.",
          "No OAuth/OIDC, cloud IAM or distributed-cache capability is asserted.",
          "Clock/operator trust and remaining consumer controls are explicit.",
        ],
        [
          "Is this service a complete cloud IAM system because it evaluates policies?",
          "No; policy evaluation is only one part of that system.",
          "Federation, workload identity, resource enforcement and distributed operation require separate implementations and evidence.",
        ],
      ),
    ],
  ),
  packet(
    "model-serving-gateway",
    "ai-model-serving-gateway",
    "Reliable and Governed Model Serving Gateway",
    "accepted-local-reference",
    [
      "A scikit-learn-trained StandardScaler/LogisticRegression pipeline exported to strict JSON coefficients, served through real NumPy CPU inference and FastAPI.",
      "Disjoint synthetic train/validation/test data; validation-only release gates and report-only test results.",
      "Checksum/version registry, compare-and-swap promotion/rollback, two-worker admission, tenant quotas, durable idempotency and timeout draining; UI and CLI.",
    ],
    [
      "No LLM, GPU, distributed inference or production fraud capability. SHA integrity is not a publisher signature.",
      "Trusted OS operator; no OIDC, per-model ACLs or online key rotation.",
      "Synthetic canary routing is not a randomized product experiment. HTTP benchmarks apply only to their stated batch/concurrency workload.",
      "All six source-project learner gates remain unassessed; none supplies tracker completion.",
    ],
    [
      x(
        "foundation",
        "Validate shapes before CPU inference",
        [
          "foundation-lesson-15-numeracy-floating-point",
          "ai-l04-linear-models",
        ],
        r.numpy,
        [
          "Broadcast-compatible arrays can still align the wrong feature axis.",
          "A scaler and coefficient vector form one versioned input contract.",
        ],
        [
          "Hand-calculate scaled features and a small linear score with declared feature order.",
          "Compare a NumPy calculation with a scalar loop on the same finite inputs.",
          "Try a wrong shape, swapped features and non-finite value; specify explicit rejections.",
        ],
        [
          "A hand/scalar/vector prediction comparison.",
          "Shape, order and finite-value negative fixtures.",
        ],
        [
          "The vector calculation agrees with the scalar oracle within a declared tolerance.",
          "Feature order is explicit instead of inferred from array length alone.",
          "Invalid/non-finite input is rejected before expensive inference.",
        ],
        [
          "Does successful broadcasting prove features are semantically aligned?",
          "No; shape compatibility is not feature identity.",
          "NumPy applies dimensional rules, not domain meaning. A swapped feature order can produce a plausible but incorrect prediction without an array error.",
        ],
      ),
      x(
        "intermediate",
        "Reproduce a validation-gated model artifact",
        ["ai-l22-artifact-lineage", "ai-l23-local-serving"],
        r.typing,
        [
          "Strict JSON coefficients avoid arbitrary executable model deserialization, but still need shape and value validation.",
          "Validation selects a release; the final test split reports performance without steering promotion.",
        ],
        [
          "Recreate fixture predictions from a reviewed scaler/coefficient artifact in batch and online modes.",
          "Change one preprocessing contract in an owned copy and write a mismatch rejection test.",
          "Trace training, validation and test rows and verify only validation results drive the release decision.",
        ],
        [
          "A reproducible artifact/input fingerprint and prediction table.",
          "A split-use audit and incompatible-artifact regression.",
        ],
        [
          "Batch and online predictions agree on identical fixtures.",
          "An incompatible scaler/model pair is rejected.",
          "Test results are not used for candidate selection or promotion thresholds.",
        ],
        [
          "Can a candidate be repeatedly tuned until its final test score passes?",
          "No; that makes the test set part of selection.",
          "A held-out test ceases to be an independent report once its outcomes guide tuning. Selection belongs to the declared validation procedure.",
        ],
      ),
      x(
        "advanced",
        "Account for work after a request times out",
        ["sde-l11-bounded-failure", "ai-l27-failure-injection"],
        r.metrics,
        [
          "A response deadline may expire while CPU work is still draining.",
          "Releasing admission capacity too early can exceed the declared worker bound.",
        ],
        [
          "Submit bounded concurrent work and record admission, timeout, drain and completion events.",
          "Retry one logical request with the same durable idempotency key and test tenant quota rejection.",
          "Attempt a stale-revision promotion and a corrupt/wrong-version artifact rollback.",
        ],
        [
          "A worker-slot lifecycle trace and duplicate-request tests.",
          "Quota, revision and corrupt-artifact failure evidence.",
        ],
        [
          "Outstanding CPU work never exceeds the documented admission bound.",
          "A timed-out but running task remains accounted for until it drains.",
          "Quota/revision/artifact failures remain errors, not valid predictions or completed promotions.",
        ],
        [
          "May a timed-out response immediately free a slot while its worker keeps running?",
          "Not if doing so would admit work beyond the declared CPU bound.",
          "Timeout is a response policy, not proof that execution stopped. Capacity accounting must follow the actual work lifecycle.",
        ],
      ),
      x(
        "professional",
        "Defend model quality and rollout claims",
        ["ai-l24-performance", "ai-l28-release-review"],
        r.release,
        [
          "A checksum validates bytes relative to a trusted expected hash; it does not authenticate a publisher.",
          "Canary health observations do not automatically estimate a causal product effect.",
        ],
        [
          "Run a bounded HTTP workload with recorded batch size, concurrency, warmup and errors.",
          "Compare release and rollback decisions using validation evidence and test-only reporting.",
          "Write a model/service card distinguishing CPU capability, operator trust and untested deployment modes.",
        ],
        [
          "A workload-labelled quality/latency report.",
          "A release card with integrity and causal-inference limitations.",
        ],
        [
          "No GPU/LLM/distributed or production fraud claim appears.",
          "Checksum integrity is not described as signed publisher provenance.",
          "Synthetic routing is not presented as a randomized customer experiment.",
        ],
        [
          "Does matching a registry SHA establish who published the model?",
          "No; authenticity requires a trusted publisher binding.",
          "An attacker who can replace both bytes and the expected digest defeats an integrity-only check. A signature and trust policy address a different question.",
        ],
      ),
    ],
  ),
  packet(
    "retrieval-evaluation-lab",
    "ai-retrieval-evaluation-lab",
    "Permission-Aware Retrieval Evaluation Lab",
    "accepted-local-reference",
    [
      "FastAPI with CPU TF-IDF/BM25/TruncatedSVD-LSA; ACL-cohort fitting occurs before vocabulary, IDF, SVD and ranking.",
      "Versioned corpus/passages/checksums, current and historical ACL source checks, excerpts and threshold abstention, plus UI/source popup.",
      "A scoped 17-query staff-cohort evaluation and scripted feedback funnel; PM scenarios remain hypothetical.",
    ],
    [
      "LSA is not a Transformer and snippets are not generative answers. Known false acceptance: 2 of 8 global zero-relevance queries return authorized but irrelevant LSA evidence, including 1 of 5 in the scoped staff cohort.",
      "The synthetic 34-document/68-query corpus uses 16/16/36 splits with coauthor judgments, not independent assessors.",
      "Reported latency is an in-process TestClient measurement, not a network SLO. Scripted feedback is not customer adoption.",
      "Explicit corpus rollback can restore older ACLs; it does not independently preserve revocation. Local curator/OS trust applies; no production SSO is claimed.",
    ],
    [
      x(
        "foundation",
        "Hand-rank only permitted evidence",
        ["ai-l15-retrieval", "security-l05-permissions"],
        r.needs,
        [
          "Relevance and authorization are separate requirements.",
          "Sparse and latent-semantic representations are not automatically neural embeddings or generated answers.",
        ],
        [
          "Author six synthetic documents across two tenants and four queries with explicit allowed document IDs.",
          "Hand-rank permitted results and label one unanswerable query.",
          "Explain the representation and retrieval goal without claiming a delivered model or user study.",
        ],
        [
          "An original corpus/query permission table.",
          "Hand-ranked relevance judgments and an unanswerable case.",
        ],
        [
          "No forbidden document is treated as a correct result.",
          "Relevance judgments identify the permitted corpus version.",
          "Representation and synthetic-user assumptions are accurately labelled.",
        ],
        [
          "Is an unauthorized relevant document a successful retrieval?",
          "No; relevance cannot override access restrictions.",
          "The result must satisfy both relevance and authorization. Reporting it as correct hides a control failure inside a quality score.",
        ],
      ),
      x(
        "intermediate",
        "Measure an isolated retrieval change",
        ["ai-l15-retrieval", "sde-l27-lexical-search"],
        r.experiments,
        [
          "Development judgments may guide tuning; held-out judgments must not.",
          "A ranking metric must use the same candidate and permission policy across compared runs.",
        ],
        [
          "Split original queries into development and held-out groups before changing preprocessing.",
          "Implement or modify one lexical/latent-semantic preprocessing choice in a local learner copy.",
          "Calculate reciprocal rank for a tiny hand-labelled trace before scoring the held-out set.",
        ],
        [
          "A split manifest and one bounded retrieval change.",
          "Hand-checked metric cases and per-query comparison.",
        ],
        [
          "No held-out query is used to choose the change.",
          "The compared runs use identical authorized corpus versions.",
          "A missing relevant result contributes the explicitly defined zero score.",
        ],
        [
          "What reciprocal-rank contribution comes from the first relevant result at rank four?",
          "0.25.",
          "Reciprocal rank is the reciprocal of the first relevant position. Missing relevant results need the declared zero convention, not an omitted row.",
        ],
      ),
      x(
        "advanced",
        "Challenge revocation and abstention",
        ["ai-l16-permission-rag", "data-l25"],
        r.trust,
        [
          "Permission checks must precede exposure in results, caches and traces.",
          "An abstention is valid only when it honestly reflects insufficient permitted evidence.",
        ],
        [
          "Create allowed, forbidden, withdrawn and zero-relevance synthetic cases under a declared corpus/ACL version.",
          "Inspect ACL-cohort fitting before vocabulary/IDF/SVD/ranking and any implemented source or cache path.",
          "Compare active-version withdrawal with explicit corpus rollback, recording restored old ACLs and authorized-but-irrelevant false acceptance rather than hiding them.",
        ],
        [
          "An authorization/revocation matrix and regression suite.",
          "A citation/abstention audit with separate quality and control outcomes.",
        ],
        [
          "Cross-tenant text is excluded under the declared current/historical ACL contract; independent revocation across rollback is labelled missing unless separately built.",
          "Source excerpts resolve to permitted versions rather than being described as generated answers.",
          "Authorized-but-irrelevant results on zero-relevance cases count as false acceptance, not successful abstention.",
        ],
        [
          "Can a cache hit skip the current authorization decision?",
          "No; cached content must remain eligible under current scope.",
          "A formerly permitted result can become unauthorized after revocation. Cache identity and access checks must preserve that changing boundary.",
        ],
      ),
      x(
        "professional",
        "Separate retrieval evidence from product impact",
        ["ai-l26-eval-harness", "tpm-l10-experiment-validity"],
        r.outcomes,
        [
          "An offline ranking improvement is not measured adoption or customer benefit.",
          "Quality, denial correctness, abstention and latency should remain separate dimensions.",
        ],
        [
          "Produce a reproducible comparison from pinned query/corpus inputs.",
          "Defend an adverse query slice and the quality-versus-cost trade-off.",
          "Write a hypothetical product experiment and name the additional evidence needed for a causal launch claim.",
        ],
        [
          "A case-level quality/access/latency report.",
          "A hypothetical experiment brief with guarded claims.",
        ],
        [
          "Every aggregate is traceable to actual local case results.",
          "Authorization violations are not hidden inside an average quality score.",
          "No actual customer, conversion or neural-generation capability is invented.",
        ],
        [
          "Does improved offline reciprocal rank prove a conversion lift?",
          "No; they measure different outcomes.",
          "A ranking evaluation establishes behavior on a labelled corpus. A causal conversion claim needs an appropriate real-world experimental design and data.",
        ],
      ),
    ],
  ),
  packet(
    "model-observability-lab",
    "ai-model-observability-lab",
    "Model Monitoring and Evaluation Workbench",
    "accepted-local-reference",
    [
      "Python/scikit-learn logistic training with a train-only scaler, chronological splits and NumPy CPU inference.",
      "SQLite immutable predictions and consecutive delayed-truth revisions; both available_at and received_at are filtered before selecting the latest visible truth.",
      "Fixed-training-cut PSI with a 0.5 pseudocount, KS, classification/calibration and minimum-sample checks; drift and quality remain separate.",
      "Paired re-scoring, recomputed transactional promotion gates, cooldown alerts, explicit rollback, CLI and UI.",
    ],
    [
      "Single-tenant, unauthenticated loopback service with three synthetic features; not production authentication, LLM or GPU infrastructure.",
      "Promotion checks do not guarantee statistical validity, causality or future model quality.",
      "Inference-only timing excludes HTTP and storage; it is not a service SLA or end-to-end latency.",
      "Use the supported approved browser for local UI work; do not bypass a blocked Python browser driver or application controls. All six source-project learner gates remain unassessed.",
    ],
    [
      x(
        "foundation",
        "Trace feature and label availability",
        [
          "ai-l03-data-contracts",
          "foundation-lesson-16-descriptive-statistics",
        ],
        r.numpy,
        [
          "A label's declared availability and actual receipt time are separate visibility constraints.",
          "Filter both clocks before selecting the latest visible truth revision; selecting first can hide the previously knowable label.",
        ],
        [
          "Create twelve synthetic predictions with feature times and consecutive truth revisions carrying available_at and received_at.",
          "Mark visible revisions at two cutoffs, including a label declared available earlier but received only after the first cutoff.",
          "Check feature shape/dtype and compare a summary with a hand-calculated reference.",
        ],
        [
          "A feature/label availability table.",
          "A finite-value/shape fixture and summary oracle.",
        ],
        [
          "Neither future availability nor future receipt enters the earlier estimate; visibility filtering precedes latest-revision selection.",
          "Unlabelled observations are visible instead of silently treated as correct.",
          "Feature meaning, shape and units are documented.",
        ],
        [
          "Should a not-yet-arrived outcome label count as a correct prediction?",
          "No; its correctness is not yet observed.",
          "Treating missing labels as successes produces a misleading quality denominator and can conceal delayed failures.",
        ],
      ),
      x(
        "intermediate",
        "Reproduce a baseline before monitoring it",
        ["ai-l04-linear-models", "ai-l22-artifact-lineage"],
        r.typing,
        [
          "Monitoring cannot repair an invalid training/test split.",
          "A feature-contract change can alter predictions even when the model file is unchanged.",
        ],
        [
          "Train or reproduce a real local baseline using synthetic inputs and a pinned split.",
          "Change one feature transformation in an owned copy and write a compatibility test.",
          "Record model, transform, data and metric versions before comparing predictions.",
        ],
        [
          "A clean-environment baseline and version manifest.",
          "A tested transformation change with before/after fixture predictions.",
        ],
        [
          "Training cannot consume the held-out outcomes.",
          "The changed transform has an explicit compatibility decision.",
          "Reported metrics identify their exact data and model versions.",
        ],
        [
          "Is the model-file hash enough to reproduce predictions?",
          "No; preprocessing, features and runtime inputs also matter.",
          "The same coefficients can behave differently under a changed transform or feature order. Lineage must describe the whole prediction contract.",
        ],
      ),
      x(
        "advanced",
        "Distinguish drift from measured degradation",
        ["ai-l25-monitoring", "ai-l07-temporal-validation"],
        r.metrics,
        [
          "Covariate shift is a reason to investigate, not proof of utility loss.",
          "Label maturity and sample composition affect the validity of a performance comparison.",
        ],
        [
          "Replay three synthetic slices: harmless feature shift, schema breakage and label-confirmed degradation.",
          "Compute separate health, fixed-training-cut drift and mature-label outcome metrics; compare candidate and baseline on the same eligible paired rows.",
          "Challenge minimum samples, alert cooldown and promotion recomputation inside the decision transaction; retain an explicit blocked-promotion case.",
        ],
        [
          "A three-scenario monitoring fixture and metric table.",
          "An alert investigation with label-maturity and denominator checks.",
        ],
        [
          "Schema failure is surfaced rather than scored as a prediction.",
          "Harmless drift is not labelled confirmed quality loss.",
          "Paired quality and minimum-sample checks are recomputed for promotion; passing them is not a statistical or causal guarantee.",
        ],
        [
          "Does a changed feature histogram prove the model became less accurate?",
          "No; outcome evidence is needed.",
          "Input distributions may move without degrading the relevant decision. A quality claim needs valid labels and a comparable evaluation population.",
        ],
      ),
      x(
        "professional",
        "Write a restrained ML incident decision",
        ["ai-l28-release-review", "security-l27-tabletop"],
        r.release,
        [
          "Retraining can amplify a data incident if the input defect is unresolved.",
          "A rollback proposal and an implemented rollback are different evidence states.",
        ],
        [
          "Investigate a monitoring alert using retained synthetic inputs and versioned metrics.",
          "Choose investigate, rollback or defer and identify the actual implemented controls.",
          "Write a handover with ownership, retention and explicit not-run deployment conditions.",
        ],
        [
          "A reproducible incident diagnosis and decision log.",
          "An operational handover with implemented/proposed controls separated.",
        ],
        [
          "The action follows observed evidence rather than automatic drift-triggered retraining.",
          "Untested rollback or deployment behavior remains labelled proposed.",
          "No production monitoring scale or customer-quality improvement is fabricated.",
        ],
        [
          "Must every drift alert automatically retrain and promote a model?",
          "No; investigate the cause and gate any change.",
          "A schema defect or biased labels can make retraining harmful. Promotion needs valid evidence and an explicit owner decision.",
        ],
      ),
    ],
  ),
  packet(
    "replayable-data-platform",
    "data-contract-recovery",
    "Replayable Data Contract and Recovery Platform",
    "accepted-local-reference",
    [
      "Python/DuckDB typed Parquet with a SQLite control plane, immutable JSONL/manifests and versioned contracts.",
      "Quarantine/deduplication/identity-conflict rollback, highest-revision truth, merchant SCD2/as-of joins, facts/mart and physical source-row lineage.",
      "Atomic checkpoints, crash recovery, dry runs/backfills and source plus successful-run-history rebuild; bounded preview and metadata downloads.",
    ],
    [
      "Incremental input admission but full gold rematerialization, not partial CDC patching.",
      "No hard-delete handling, currency conversion, inventory depletion, Spark/Fabric/Databricks or cloud adapter.",
      "Single writer; source plus successful-run journal is required for replay, not Parquet alone.",
      "PM scenarios are hypothetical and actual workload timings are not customer outcomes or dollar savings.",
    ],
    [
      x(
        "foundation",
        "Trace admitted inputs to physical lineage",
        ["data-l05", "data-l18"],
        r.typing,
        [
          "A manifest identifies an input; physical lineage identifies which source row contributed.",
          "Highest-revision truth is not a promise of historical knowledge-time queries.",
        ],
        [
          "Follow a synthetic JSONL row through manifest, contract admission, quarantine or a typed output.",
          "Create a small lineage table with physical source row and logical identity/revision.",
          "Explain which revision wins and why a later accepted revision changes current truth.",
        ],
        [
          "An input-to-output lineage trace.",
          "A contract/revision table with one rejected row.",
        ],
        [
          "Rejected rows retain an actionable source and reason.",
          "Physical source location and logical business identity are not conflated.",
          "Revision semantics are explicit, with no unsupported historical-knowledge claim.",
        ],
        [
          "Does an output row's business key uniquely identify its physical input row?",
          "Not necessarily; revisions and duplicates can share that key.",
          "Lineage needs source and row provenance as well as logical identity, so corrections can be explained and replayed.",
        ],
      ),
      x(
        "intermediate",
        "Evolve a contract without hiding rebuild work",
        ["data-l17", "data-l08"],
        r.stories,
        [
          "Incremental admission can coexist with full output recomputation.",
          "Structural compatibility does not guarantee that a metric kept its meaning.",
        ],
        [
          "Add one compatible contract field or transform change in an owned fixture.",
          "Compare predeclared golden fact/mart totals before and after the change.",
          "Record admitted inputs separately from the full gold rematerialization work.",
        ],
        [
          "A contract-version change and consumer regression.",
          "A golden-output and admitted-versus-recomputed work report.",
        ],
        [
          "An incompatible change is rejected or explicitly migrated.",
          "Golden metrics preserve their declared grain and units.",
          "The report does not describe full rematerialization as a partial CDC patch.",
        ],
        [
          "If only new files are admitted, must only changed gold rows be recomputed?",
          "No; this implementation rematerializes gold.",
          "Admission policy describes accepted inputs. Execution strategy describes how outputs are rebuilt; one does not imply the other.",
        ],
      ),
      x(
        "advanced",
        "Recover from a rejected or interrupted run",
        ["data-l22", "data-l16"],
        r.metrics,
        [
          "A rejected identity conflict must not advance the successful checkpoint.",
          "A reproducible rebuild needs the accepted-run history as well as source bytes.",
        ],
        [
          "Inject an identity conflict and a malformed batch, recording checkpoint and output fingerprints.",
          "Repair the fixture, retry, and interrupt one owned run at a documented crash boundary.",
          "Rebuild from source and successful-run history and compare logical outputs with the recovered run.",
        ],
        [
          "Rejection/repair/crash traces with checkpoint snapshots.",
          "Rebuild fingerprints and independent reconciliation checks.",
        ],
        [
          "A rejected batch leaves the prior successful checkpoint and outputs intact.",
          "Repair/retry does not duplicate accepted logical events.",
          "Recovery equivalence is proved using source and run history, not just output Parquet files.",
        ],
        [
          "Can exported Parquet alone reproduce the exact accepted-run history?",
          "No; source and the successful-run journal are required.",
          "An output snapshot omits admission and execution decisions. Those inputs are part of the reproducibility contract, not optional metadata.",
        ],
      ),
      x(
        "professional",
        "Defend a single-writer recovery service",
        ["data-l27", "data-l28"],
        r.outcomes,
        [
          "A local recovery measurement is not proof of distributed availability.",
          "Synthetic time saved in a workload does not establish customer financial benefit.",
        ],
        [
          "Measure a bounded admission/rebuild workload with inputs, output sizes and hardware.",
          "Document single-writer ownership, source/journal retention and a restore drill.",
          "Write a hypothetical PM recovery case separating operational evidence from user and financial assumptions.",
        ],
        [
          "A measured recovery/runbook package.",
          "A hypothetical product memo with no customer or savings claims.",
        ],
        [
          "Required recovery artifacts and their retention are named.",
          "No cloud/Spark/Fabric/Databricks, hard-delete, FX or inventory-depletion capability is implied.",
          "Measured workload outcomes remain separate from business assumptions.",
        ],
        [
          "Does a faster local rebuild prove dollar savings for a customer?",
          "No; that needs an actual cost and usage model with evidence.",
          "A technical measurement lacks the customer's workload, pricing and operational context, so it cannot establish a financial outcome alone.",
        ],
      ),
    ],
  ),
  packet(
    "point-in-time-workbench",
    "quant-versioned-research-data",
    "Versioned Point-in-Time Research Data Platform",
    "accepted-local-reference",
    [
      "Python/DuckDB ASOF, typed Parquet and SQLite with aware RFC3339/UTC microsecond timestamps and Decimal strings.",
      "Availability-vintage selection before latest-known-period selection, historical membership and explicit equality/staleness rules.",
      "Immutable append/quarantine, input/result/raw-file hashes, snapshots/rebuild and ZIP import into a new store without changing the active store.",
    ],
    [
      "Synthetic three-instrument scope; corporate actions are metadata, not adjusted prices. No alpha, trading or pricing claim.",
      "Outputs obey the cutoff, but raw ZIP bundles contain full history including future events; do not treat the archive as a cutoff-filtered export.",
      "Exact bundle import requires the recorded workbench and DuckDB versions. Availability timestamps are declared inputs, not guarantees of real exchange visibility.",
      "SQL timings include file validation/read work while the oracle uses preparsed memory; do not infer a speedup or HFT capability from that unequal comparison.",
    ],
    [
      x(
        "foundation",
        "Explain the two clocks",
        ["quant-l10-availability-time", "algorithmic-l03-vintages"],
        r.typing,
        [
          "Event time describes the world; availability time describes what a decision could know.",
          "Revision and universe membership history can both introduce future information.",
        ],
        [
          "Author six synthetic observations with distinct event and availability times.",
          "Hand-select eligible revisions and instruments for two decision cutoffs.",
          "Record tie, exact-match and staleness rules before implementing a join.",
        ],
        [
          "A two-clock/revision/universe fixture.",
          "Hand-calculated eligible snapshots and boundary rules.",
        ],
        [
          "No selected observation was unavailable at the decision cutoff.",
          "Later membership changes do not rewrite the earlier eligible universe.",
          "Equal-time and stale-value handling are deterministic.",
        ],
        [
          "Can an early event date make a later-published revision eligible earlier?",
          "No; availability time controls what was knowable.",
          "Using event time alone leaks a correction or disclosure that had not yet arrived when the earlier decision was made.",
        ],
      ),
      x(
        "intermediate",
        "Compare an as-of join with an oracle",
        ["quant-l10-availability-time", "quant-l12-reproducible-snapshots"],
        r.numpy,
        [
          "Optimized joins need the same sorting, grouping and tie semantics as the reference.",
          "A fast answer for the wrong eligibility rule is not a correct optimization.",
        ],
        [
          "Implement a slow eligibility scan over an original bounded synthetic fixture.",
          "Modify one tie or staleness policy and compare it with an optimized SQL or dataframe join.",
          "Include equal timestamps, missing observations and two instrument groups.",
        ],
        [
          "An independent scan oracle and optimized join.",
          "A per-snapshot equivalence report for boundary cases.",
        ],
        [
          "Every optimized output matches the oracle under the same policy.",
          "Group boundaries prevent cross-instrument matches.",
          "Missing or stale observations retain explicit status rather than zero substitution.",
        ],
        [
          "May the optimized join use a different tie policy if it runs faster?",
          "No; a policy change is not a semantics-preserving optimization.",
          "Equivalence requires the same eligibility and tie rules. Otherwise the experiment compares different questions rather than two implementations.",
        ],
      ),
      x(
        "advanced",
        "Protect earlier snapshots from future revisions",
        ["quant-l12-reproducible-snapshots", "data-l25"],
        r.trust,
        [
          "Pinned snapshots bind input versions and policy, not just a filename.",
          "Future revision invariance is a concrete leakage test.",
        ],
        [
          "Freeze an earlier snapshot and record source/policy identities.",
          "Append a later revision and a later universe update, then repeat the earlier query.",
          "Inspect a raw-history ZIP and explain why future rows can be present while cutoff-filtered outputs remain correct; import only into a new store with the required recorded versions.",
        ],
        [
          "A pinned-snapshot manifest and future-append test.",
          "A corruption/revision audit with expected outputs.",
        ],
        [
          "Appending future information does not alter the pinned earlier result.",
          "Every result names the relevant input and policy versions.",
          "Raw history is not mislabelled cutoff-filtered, and import does not overwrite the active store or ignore version requirements.",
        ],
        [
          "Should a pinned historical snapshot silently incorporate a new correction?",
          "No; it must retain its declared knowledge boundary.",
          "A correction can belong in a new versioned view, but silently changing an earlier snapshot destroys reproducibility and may introduce look-ahead bias.",
        ],
      ),
      x(
        "professional",
        "Defend temporal correctness before speed",
        ["quant-l31-performance-evidence", "quant-l32-release-audit"],
        r.metrics,
        [
          "A performance report needs workload, hardware, semantics and correctness controls.",
          "Historical data correctness is not evidence of trading profitability.",
        ],
        [
          "Reproduce a bounded query workload and compare reference and optimized outputs.",
          "Explain which temporal and universe guarantees were actually implemented in the learner work.",
          "Write a handover naming data rights, source retention, corruption handling and untested scale.",
        ],
        [
          "A correctness-labelled performance report.",
          "A temporal-data handover and limitations memo.",
        ],
        [
          "No performance claim omits a mismatch or confuses file-validating SQL with a preparsed-memory oracle speedup.",
          "Availability/revision/universe guarantees use declared timestamps, not an untested claim about real exchange visibility.",
          "Corporate-action metadata is not price adjustment; no alpha, profit or production-scale claim is made.",
        ],
        [
          "Does a leakage-free data platform prove a profitable strategy?",
          "No; data correctness is a prerequisite, not a return guarantee.",
          "A platform can preserve historical information faithfully without establishing any predictive signal, execution advantage or investment result.",
        ],
      ),
    ],
  ),
  packet(
    "paper-exchange-engine",
    "quant-multi-instrument-ledger",
    "Deterministic Multi-Instrument Paper Exchange",
    "accepted-local-reference",
    [
      "Explicit Python and C++17 backends with multi-instrument price/FIFO matching, partial fills, cancellation and idempotent global IDs.",
      "Integer-overflow rollback, durable journal/replay-backed snapshots, local CLI/blotter and independent-reference checks.",
      "Windows Python execution and native Linux CI evidence.",
    ],
    [
      "Partial reference for the broader original exchange-and-ledger target: no account balances or cash/position portfolio ledger. A separate risk service does not complete those missing requirements.",
      "Use Python on Windows; native execution there is blocked by application controls. Do not bypass them or imply local native execution was verified.",
      "No real trades, profits, HFT, exchange certification or production performance guarantee.",
    ],
    [
      x(
        "foundation",
        "Trace integer price-time matching",
        [
          "quant-l05-numerical-representation",
          "quant-l13-order-book-semantics",
        ],
        r.typing,
        [
          "Integer ticks make the unit explicit, but bounds and overflow still matter.",
          "Price priority precedes FIFO priority at an equal price.",
        ],
        [
          "Write a five-command Python-backend trace for two fictional instruments.",
          "Predict a partial fill and cancellation using integer price/quantity units.",
          "Distinguish matched quantities from account cash and portfolio positions, which this reference does not maintain.",
        ],
        [
          "A hand-written order/fill trace with units.",
          "A boundary note separating matching from account accounting.",
        ],
        [
          "The expected order sequence respects price then FIFO.",
          "Remaining quantities and cancellation outcomes are explicit.",
          "No cash/account-ledger result is attributed to the reference.",
        ],
        [
          "Do matching fills alone constitute a cash/position ledger?",
          "No; accounting needs separate posting and reconciliation rules.",
          "A matching engine produces executions. Cash, reservations, settlement and account balances require additional state and invariants.",
        ],
      ),
      x(
        "intermediate",
        "Change one order rule against a reference",
        ["quant-l14-reference-matcher", "quant-l16-differential-testing"],
        r.stories,
        [
          "A simple independent matcher is valuable precisely because it does not share optimized logic.",
          "Global command identity and per-instrument order identity serve different purposes.",
        ],
        [
          "Specify one bounded order/cancel change before modifying a learner copy.",
          "Construct an independent expected trace and repeat one global command ID across instruments.",
          "Run positive, rejection and partial-fill regressions using the Python backend.",
        ],
        [
          "A bounded rule change and independent expected trace.",
          "Duplicate-ID and multi-instrument regression evidence.",
        ],
        [
          "A duplicate command cannot acquire a new effect by changing instruments.",
          "Rejections leave state unchanged.",
          "The expected results are not generated by the implementation under test.",
        ],
        [
          "Can copying the optimized matcher's logic produce an independent oracle?",
          "Not reliably; it can reproduce the same defect.",
          "Differential testing is strongest when the reference uses a simpler independently reasoned algorithm and hand-checked edge cases.",
        ],
      ),
      x(
        "advanced",
        "Replay an interrupted exchange safely",
        ["quant-l15-command-log-replay", "quant-l30-snapshots-recovery"],
        r.metrics,
        [
          "Snapshot-plus-tail must match full replay at a declared log boundary.",
          "Overflow rejection must roll back the whole affected command.",
        ],
        [
          "Create a snapshot at a chosen command sequence and retain the corresponding journal.",
          "Inject an overflow and an owned crash around a documented durability boundary.",
          "Compare restored-plus-tail fills/orders with a full Python replay; explicitly exclude unavailable cash/position fields.",
        ],
        [
          "A journal/snapshot failure fixture.",
          "Full-replay equivalence and overflow rollback evidence.",
        ],
        [
          "Replay matches the independent expected fills and active orders.",
          "A rejected overflow leaves no partial command mutation.",
          "The report does not claim the broader lesson's missing account-ledger coverage.",
        ],
        [
          "May a successful book replay be described as recovery of portfolio cash?",
          "No; that state is not implemented in this reference.",
          "Correctness evidence is scoped to actual state. A missing ledger cannot be inferred from a matching or journal test.",
        ],
      ),
      x(
        "professional",
        "Defend platform-specific execution evidence",
        ["quant-l31-performance-evidence", "quant-l32-release-audit"],
        r.release,
        [
          "A compiler succeeding is not proof that a locally blocked executable ran.",
          "Hardware/backend-labelled measurements cannot establish HFT production capability.",
        ],
        [
          "Reproduce the supported Python workflow on Windows or a supported owned environment.",
          "Separate native Linux CI evidence from your own locally observed execution.",
          "Defend the matching/replay result and explicitly list the remaining original cash/position-ledger work.",
        ],
        [
          "A backend/platform-labelled reproduction report.",
          "An honest partial-coverage handover and measured limitations.",
        ],
        [
          "No application-control bypass is attempted.",
          "Windows native execution is not claimed from compilation or Linux CI.",
          "Original ledger gates remain incomplete unless separately demonstrated by the learner.",
        ],
        [
          "Does native Linux CI establish Windows native execution under AppControl?",
          "No; they are different execution environments.",
          "An operating-system policy can block a compiled binary. Evidence from another platform does not authorize bypassing that policy or prove local execution.",
        ],
      ),
    ],
  ),
  packet(
    "portfolio-risk-service",
    "quant-portfolio-reconciliation",
    "Portfolio Exposure and Reconciliation Service",
    "accepted-local-reference",
    [
      "Python/Pydantic/FastAPI and SQLite immutable batches/corrections/quarantine/lineage.",
      "Decimal cash/positions, direct-FX valuation, linear stress and reason-coded reconciliation, with owner-boundary API checks, CLI and UI.",
    ],
    [
      "Synthetic equity/share units and T+0 trade fees only; no derivatives, splits/dividends, cost basis or realized P&L.",
      "Effective-date queries use latest accepted knowledge, not historical knowledge-time.",
      "Linear stress is not VaR or nonlinear cross-terms; a local learning service is not production SaaS.",
      "Windows instructions use python -m portfolio_risk.cli, not a blocked console-script executable.",
    ],
    [
      x(
        "foundation",
        "Keep valuation and currency units explicit",
        [
          "quant-l21-ledger-valuation",
          "foundation-lesson-15-numeracy-floating-point",
        ],
        r.numpy,
        [
          "Positions, prices and FX rates have different units; multiplying the wrong orientation can look plausible.",
          "Missing marks are unknown valuations, not zero-priced assets.",
        ],
        [
          "Hand-value a small synthetic equity position and cash balance using a stated direct FX convention.",
          "Track a T+0 trade fee separately from mark movement.",
          "Add a missing/stale mark and predict the status rather than substituting zero.",
        ],
        [
          "A Decimal valuation oracle with unit labels.",
          "Missing/stale-mark and fee fixtures.",
        ],
        [
          "Every multiplication has compatible quantity/price/currency units.",
          "Fees affect the declared cash flow without inventing cost basis or realized P&L.",
          "Missing/stale valuations remain visible.",
        ],
        [
          "Is a missing price a zero-valued position?",
          "No; valuation is unavailable under that policy.",
          "Zero is a real economic value. Substituting it for missing information hides uncertainty and can produce a misleading portfolio total.",
        ],
      ),
      x(
        "intermediate",
        "Change an ingestion rule without double posting",
        ["data-l16", "quant-l21-ledger-valuation"],
        r.stories,
        [
          "An immutable correction records why current accepted truth changed.",
          "Idempotent ingestion and economic reversal are not the same operation.",
        ],
        [
          "Specify a bounded validation or correction rule for synthetic trades.",
          "Apply the change against an independent cash/position oracle and replay a duplicate batch.",
          "Inspect quarantine and lineage for a rejected record and an accepted correction.",
        ],
        [
          "A change request with independent balance expectations.",
          "Duplicate/correction/quarantine lineage evidence.",
        ],
        [
          "Duplicate input does not double-post cash or shares.",
          "A correction retains its provenance rather than silently rewriting history.",
          "A rejected record does not mutate accepted balances.",
        ],
        [
          "Should a replayed identical trade be applied as a second economic event?",
          "No; duplicate delivery must not create another posting.",
          "Transport retries are not new trades. Stable identity and an explicit correction contract preserve accounting meaning.",
        ],
      ),
      x(
        "advanced",
        "Challenge the knowledge and stress boundaries",
        ["quant-l24-tail-risk-stress", "quant-l10-availability-time"],
        r.metrics,
        [
          "An effective date with latest accepted corrections is not a historical knowledge-time query.",
          "A deterministic linear shock is a scenario, not a probabilistic VaR estimate.",
        ],
        [
          "Create a later correction with an earlier effective date and explain the resulting query behavior.",
          "Reverse an FX convention deliberately and require a unit-aware regression to fail.",
          "Compare a linear equity shock with a hand calculation and document unavailable nonlinear/derivative behavior.",
        ],
        [
          "An effective-date/latest-knowledge counterexample.",
          "FX and linear-shock oracle tests.",
        ],
        [
          "Historical knowledge-time is not claimed for this service.",
          "The wrong FX orientation is caught by independent expected units/results.",
          "Stress output is not labelled VaR or a derivative cross-term model.",
        ],
        [
          "Does a 10% deterministic price shock measure 99% VaR?",
          "No; there is no probabilistic loss-quantile model in that scenario.",
          "A chosen shock describes one hypothetical state. VaR requires a defined loss distribution, horizon and quantile with separate assumptions and validation.",
        ],
      ),
      x(
        "professional",
        "Reconcile and communicate missing accounting",
        ["quant-l32-release-audit", "finance-l21-model-audit"],
        r.outcomes,
        [
          "A reason-coded mismatch is useful evidence, not a defect to suppress for a clean report.",
          "Unsupported corporate actions and realized P&L must remain explicit exclusions.",
        ],
        [
          "Reproduce a bounded CLI/API reconciliation using the documented module invocation on Windows.",
          "Investigate one cash/position mismatch and trace it to input/correction/mark evidence.",
          "Defend a report listing T+0, direct-FX, linear-stress and latest-knowledge limitations.",
        ],
        [
          "A reconciliation investigation with recorded inputs.",
          "A scope-labelled report and operational handover.",
        ],
        [
          "The command avoids bypassing blocked executables or application controls.",
          "The mismatch is explained or retained as unresolved, not silently discarded.",
          "No derivatives, corporate actions, realized P&L or production-SaaS guarantee is claimed.",
        ],
        [
          "Can an unresolved reconciliation difference be removed to make the report balance?",
          "No; preserve and explain it.",
          "Reconciliation is valuable because it exposes disagreement. Hiding it converts an auditable control into a misleading success signal.",
        ],
      ),
    ],
  ),
  packet(
    "supply-chain-verifier",
    "security-supply-chain-verifier",
    "Signed Software Release and Provenance Verifier",
    "accepted-local-reference",
    [
      "Python cryptography Ed25519 with a domain-separated canonical integer-JSON manifest and strict schema/path/inventory checks.",
      "Trust-root fingerprints, key validity windows, revocation/rotation, release floor and artifact SHA/size verification.",
      "A read-only loopback verification workbench and local CLI; signing private keys stay in the local CLI, never the browser.",
    ],
    [
      "The canonical profile permits bounded safe integers only, not floats or negative zero.",
      "A valid manifest signature can authenticate claims while an artifact digest fails; overall verification still fails. These are separate checks.",
      "Public test keys only in shared fixtures. No SLSA level, Sigstore, compliance, code-safety or transparency-log guarantee.",
    ],
    [
      x(
        "foundation",
        "Distinguish bytes, signatures and trust",
        ["security-l07-primitives", "security-l22-supply-chain"],
        r.signatures,
        [
          "A hash identifies bytes; a signature relates bytes to a signing key.",
          "Trust in a public key is an independent policy decision.",
        ],
        [
          "Hash two harmless local fixture files and explain what a digest comparison proves.",
          "Draw the signer/key/artifact/trust-root relationships.",
          "List the synthetic scope and generate only disposable learner-owned keys for later practice.",
        ],
        [
          "A byte-identity comparison and trust diagram.",
          "A disposable-key boundary and threat model.",
        ],
        [
          "Integrity and publisher authenticity are not conflated.",
          "No real signing credential is copied into evidence.",
          "Trust assumptions identify who may select accepted public keys.",
        ],
        [
          "Is any mathematically valid signature sufficient to trust a release?",
          "No; the signer and artifact must satisfy the trust policy.",
          "An attacker can sign their own artifact with their own key. Verification needs a trusted binding, not merely a valid signature equation.",
        ],
      ),
      x(
        "intermediate",
        "Verify a benign signed artifact",
        ["security-l07-primitives", "sde-l15-layered-tests"],
        r.signatures,
        [
          "Use a maintained signature implementation rather than designing a cryptographic primitive.",
          "Failed verification must not expose an unverified success path.",
        ],
        [
          "Create an original benign artifact and sign its exact bytes with a disposable local key.",
          "Verify using the intended public key, then try a wrong key and a changed byte.",
          "Implement or inspect a visible rejection path in an owned learner copy without executing untrusted artifacts.",
        ],
        [
          "A local sign/verify fixture and negative controls.",
          "A failure-path report without private key material.",
        ],
        [
          "Correct bytes/key pass; a changed artifact fails its digest check even if the signed manifest remains valid.",
          "No untrusted artifact is executed and private signing keys never enter the read-only browser workbench.",
          "Authenticated manifest claims cannot turn failed artifact verification into an overall success.",
        ],
        [
          "What should changed bytes under the original signature produce?",
          "An explicit verification failure.",
          "The signature binds the signed message. Continuing as if verification passed would discard the integrity and authenticity boundary.",
        ],
      ),
      x(
        "advanced",
        "Reject replay under a versioned trust policy",
        ["security-l21-secret-lifecycle", "security-l22-supply-chain"],
        r.trust,
        [
          "A valid old signature may violate a current version or revocation policy.",
          "Provenance claims require a trusted binding to the artifact and build context.",
        ],
        [
          "Define an explicit synthetic release sequence and accepted signer policy.",
          "Test an older signed release, a revoked key and a mismatched artifact/provenance binding.",
          "Implement missing policy controls only as labelled learner extensions, retaining the reference's actual limits.",
        ],
        [
          "A version/revocation/replay policy matrix.",
          "Adversarial-but-benign fixture outcomes and binding tests.",
        ],
        [
          "Cryptographic validity alone cannot override current policy denial.",
          "A provenance claim for different bytes is rejected.",
          "Unimplemented replay protection is not inferred from a repository name.",
        ],
        [
          "Can a valid signature on an old release bypass a minimum-version rule?",
          "No; signature validity and release policy are separate checks.",
          "A replayed artifact can remain correctly signed while being unacceptable under current trust, revocation or version requirements.",
        ],
      ),
      x(
        "professional",
        "Review a release verification gate",
        ["security-l30-assurance-review", "sde-l19-ci-gates"],
        r.release,
        [
          "A release gate must fail closed while keeping local CLI signing and the read-only workbench separate.",
          "Passing local signature/inventory checks does not establish a SLSA level, Sigstore integration or code safety.",
        ],
        [
          "Demonstrate accepted and rejected benign releases through an owned local or CI verification path.",
          "Document a key-loss/revocation response and who may update trust policy.",
          "Defend implemented versus proposed provenance controls and publish only sanitized outcomes.",
        ],
        [
          "A reproducible release-gate and failure demo.",
          "A trust-policy/recovery review with remaining limitations.",
        ],
        [
          "Rejected verification prevents the declared release action.",
          "Key ownership/recovery assumptions are explicit and secret-free.",
          "No certification, complete supply-chain security or vulnerability-free guarantee is implied.",
        ],
        [
          "Does one successful signature gate establish a SLSA certification?",
          "No; a level claim requires its complete stated requirements and evidence.",
          "Signature verification is a specific control. Broader provenance and build-system assurance require additional properties that cannot be inferred from that control alone.",
        ],
      ),
    ],
  ),
];
