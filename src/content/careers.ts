import type {
  CareerCompetency,
  CareerProfile,
  CareerProfileId,
  Stage,
} from "../domain/types";
import { exerciseId } from "./career-exercises";

const f = {
  python: [
    "foundation-lesson-03-values-control",
    "foundation-lesson-04-functions-contracts",
    "foundation-lesson-05-collections",
    "foundation-lesson-06-modules-environments",
  ],
  sql: [
    "foundation-lesson-07-relational-model",
    "foundation-lesson-08-sql-querying",
  ],
  algorithms: [
    "foundation-lesson-10-decomposition-complexity",
    "foundation-lesson-11-data-structures",
  ],
  engineering: [
    "foundation-lesson-12-git",
    "foundation-lesson-13-testing-debugging",
    "foundation-lesson-14-reproducibility",
  ],
  system: [
    "foundation-lesson-01-files-processes",
    "foundation-lesson-02-shell-pipelines",
    "foundation-lesson-18-http-apis",
  ],
  numbers: [
    "foundation-lesson-15-numeracy-floating-point",
    "foundation-lesson-16-descriptive-statistics",
    "foundation-lesson-17-probability-sampling",
  ],
  communication: [
    "foundation-lesson-20-ai-verification",
    "foundation-lesson-21-requirements-explanation",
  ],
};
const ex = exerciseId;
function c(
  id: string,
  label: string,
  lessonIds: string[],
  exerciseIds: string[] = [],
  coverageNote = "The linked canonical assignments teach this competency. A recorded lesson is self-reported learning evidence, not independently verified professional competence.",
  depth: CareerCompetency["depth"] = exerciseIds.length
    ? "applied-extension"
    : "canonical",
): CareerCompetency {
  return { id, label, lessonIds, exerciseIds, coverageNote, depth };
}
const s = (
  stage: Stage,
  outcome: string,
  evidence: string,
  competencies: CareerCompetency[],
) => ({ stage, outcome, evidence, competencies });
function p(
  id: CareerProfileId,
  title: string,
  summary: string,
  projectIds: CareerProfile["projectIds"],
  stages: CareerProfile["stages"],
  laterSpecializations: string[],
): CareerProfile {
  return {
    id,
    title,
    summary,
    projectIds,
    laterSpecializations,
    stages: stages.map((stage) => ({
      ...stage,
      competencies: stage.competencies.map((skill) => ({
        ...skill,
        id: `career-${id}-${stage.stage}-${skill.id}`,
      })),
    })),
  };
}

export const careerProfiles: CareerProfile[] = [
  p(
    "backend",
    "Backend and Platform Software Engineering",
    "Build correct services, explain failure boundaries and operate a bounded system. Reuse Common Foundation and SDE; extend only the project-specific gaps.",
    [
      "sde-order-orchestrator",
      "sde-tenant-policy-service",
      "ai-model-serving-gateway",
    ],
    [
      s(
        "foundation",
        "Trace a small program, request and relational model before choosing a framework or platform.",
        "Retain a typed/runtime contract, hand-checked query and a regression test; distinguish assistance from your own explanation.",
        [
          c(
            "python",
            "Python language semantics and typing",
            f.python,
            [ex("commerce-workflow-engine", "foundation")],
            "Foundation covers values, mutation and contracts; the commerce exercise adds explicit type hints versus runtime validation.",
          ),
          c("algorithms", "data structures and complexity", f.algorithms),
          c("git-tests", "Git and automated tests", f.engineering),
          c("linux-network", "Linux processes and networking", [
            ...f.system,
            "security-l12-network-dns",
          ]),
          c("http", "HTTP and API semantics", [
            "foundation-lesson-18-http-apis",
            "sde-l04-api-contracts",
          ]),
          c("sql", "SQL and relational modelling", f.sql),
        ],
      ),
      s(
        "intermediate",
        "Implement a scoped web service whose schema, ownership and concurrent changes remain correct.",
        "Demonstrate migrations, invalid input, cross-owner denial and a reproduced race against independent expected results.",
        [
          c(
            "framework",
            "FastAPI or Django",
            ["sde-l01-request-lifecycle", "sde-l03-forms-templates"],
            [],
            "The canonical route teaches Django. FastAPI references are an alternative application context, not a second mandatory framework.",
          ),
          c(
            "postgres",
            "PostgreSQL transactions, indexes and query plans",
            ["sde-l06-concurrent-checkout", "sde-l18-debug-query-performance"],
            [],
            "Requires the actual PostgreSQL lesson work. A SQLite reference does not demonstrate PostgreSQL locking or query plans.",
          ),
          c(
            "identity",
            "authentication and authorization",
            ["sde-l05-auth-ownership", "security-l06-sessions"],
            [ex("tenant-policy-service", "foundation")],
          ),
          c("migrations", "schema migrations", ["sde-l02-models-migrations"]),
          c("validation", "pagination and validation", [
            "sde-l04-api-contracts",
          ]),
          c(
            "concurrency",
            "concurrency and synchronization",
            ["sde-l06-concurrent-checkout", "sde-l16-failure-properties"],
            [ex("commerce-workflow-engine", "advanced")],
          ),
        ],
      ),
      s(
        "advanced",
        "Bound asynchronous effects, old authority and resource use under retry, overload and crash conditions.",
        "Change one service invariant, reproduce a failure schedule and explain why the negative regression now detects it.",
        [
          c(
            "outbox",
            "idempotency and transactional outbox",
            ["sde-l07-idempotent-effects", "sde-l10-durable-work"],
            [ex("commerce-workflow-engine", "intermediate")],
          ),
          c(
            "queues",
            "queues, leases, retries and backpressure",
            ["sde-l10-durable-work", "sde-l11-bounded-failure"],
            [
              ex("commerce-workflow-engine", "advanced"),
              ex("model-serving-gateway", "advanced"),
            ],
          ),
          c("consistency", "consistency and failure boundaries", [
            "sde-l08-domain-services",
            "sde-l09-return-workflows",
          ]),
          c(
            "caching",
            "caching and invalidation",
            ["sde-l11-bounded-failure"],
            [ex("tenant-policy-service", "advanced")],
            "Canonical cache work is required separately; the policy reference demonstrates revision/credential boundaries, not a distributed cache.",
          ),
          c("profiling", "load testing and profiling", [
            "sde-l18-debug-query-performance",
            "sde-l24-load-cost",
          ]),
          c(
            "service-security",
            "service-to-service security",
            ["security-l08-tls-pki", "security-l18-tenant-boundaries"],
            [ex("tenant-policy-service", "professional")],
            "TLS and consumer enforcement need their own exercises; policy decisions alone do not secure another service.",
          ),
        ],
      ),
      s(
        "professional",
        "Defend a reproducible release, diagnosis and measured capacity decision with clear ownership and limits.",
        "Explain, modify, debug, test and defend each of the three projects yourself; local evidence is not a production availability claim.",
        [
          c("slo", "service objectives and actionable telemetry", [
            "sde-l22-observability",
          ]),
          c(
            "incident",
            "incident diagnosis and recovery",
            ["sde-l23-incident-restore"],
            [ex("commerce-workflow-engine", "professional")],
          ),
          c(
            "capacity",
            "capacity and cost reasoning",
            ["sde-l24-load-cost"],
            [ex("model-serving-gateway", "professional")],
          ),
          c("delivery", "CI/CD and safe rollout", [
            "sde-l19-ci-gates",
            "sde-l20-container-runtime",
            "sde-l21-safe-release-iac",
          ]),
          c(
            "architecture",
            "architecture reviews and trade-offs",
            ["sde-l29-evidence-review"],
            [ex("tenant-policy-service", "professional")],
          ),
          c("communication", "cross-team technical communication", [
            ...f.communication,
            "sde-l29-evidence-review",
          ]),
        ],
      ),
    ],
    [
      "one role-relevant Java, Go or C++ stack",
      "distributed storage or streaming internals",
      "container orchestration after local service competence",
    ],
  ),
  p(
    "ai-systems",
    "AI Infrastructure and ML Systems Engineering",
    "Train and evaluate real baselines, protect data boundaries and operate versioned inference. CPU prototypes do not establish GPU or distributed expertise.",
    [
      "ai-model-serving-gateway",
      "ai-retrieval-evaluation-lab",
      "ai-model-observability-lab",
    ],
    [
      s(
        "foundation",
        "Explain data, array and availability contracts before training or serving a model.",
        "Use scalar or hand-calculated expectations, a declared split and explicit rejected-data cases rather than trusting plausible predictions.",
        [
          c(
            "python-numpy-sql",
            "Python, NumPy and SQL",
            [...f.python, ...f.sql],
            [ex("model-serving-gateway", "foundation")],
            "Foundation supplies Python/SQL; the NumPy exercise explicitly adds feature order, shape, broadcasting and finite-value checks.",
          ),
          c(
            "math",
            "linear algebra, probability and statistics",
            [
              ...f.numbers,
              "ai-l02-optimization",
              "quant-l06-covariance-least-squares",
            ],
            [],
            "A practical introductory route; deeper optimization and mathematical theory remain specialization, not automatic mastery.",
          ),
          c("splits", "data splits and leakage", [
            "ai-l03-data-contracts",
            "ai-l07-temporal-validation",
          ]),
          c("tests", "software testing", f.engineering),
          c("http-resources", "HTTP and process/resource basics", f.system),
        ],
      ),
      s(
        "intermediate",
        "Reproduce a trained baseline and compare batch, online and retrieval behavior with locked inputs.",
        "Record preprocessing/model versions and valid split use; investigate incompatible schemas instead of hiding failed predictions.",
        [
          c(
            "baselines",
            "scikit-learn pipelines and baselines",
            ["ai-l04-linear-models", "ai-l05-trees-ensembles"],
            [ex("model-observability-lab", "intermediate")],
          ),
          c(
            "pytorch",
            "PyTorch fundamentals",
            ["ai-l08-backprop"],
            [],
            "Requires the canonical neural-network exercise; scikit-learn/NumPy serving is not PyTorch execution evidence.",
          ),
          c(
            "serialization",
            "model serialization and reproducibility",
            ["ai-l22-artifact-lineage"],
            [ex("model-serving-gateway", "intermediate")],
          ),
          c(
            "retrieval",
            "retrieval metrics",
            ["ai-l15-retrieval"],
            [ex("retrieval-evaluation-lab", "intermediate")],
          ),
          c(
            "inference",
            "batch and online inference",
            ["ai-l23-local-serving"],
            [ex("model-serving-gateway", "intermediate")],
          ),
          c(
            "contracts",
            "feature and label contracts",
            ["ai-l03-data-contracts"],
            [ex("model-observability-lab", "foundation")],
          ),
        ],
      ),
      s(
        "advanced",
        "Operate bounded inference and evaluate authorization, artifact and delayed-quality failures separately.",
        "Keep validation-based release decisions independent of final test reporting, and prove negative paths with controlled fixtures.",
        [
          c(
            "registry",
            "model registry and artifact provenance",
            ["ai-l22-artifact-lineage"],
            [ex("model-serving-gateway", "professional")],
            "Registry lineage and SHA integrity are covered; publisher signatures require separate signing/trust work.",
          ),
          c(
            "evaluation-gates",
            "deployment evaluation gates",
            ["ai-l26-eval-harness"],
            [ex("model-serving-gateway", "intermediate")],
          ),
          c(
            "batching",
            "batching, concurrency and caching",
            ["ai-l23-local-serving", "ai-l24-performance"],
            [ex("model-serving-gateway", "advanced")],
          ),
          c(
            "drift",
            "drift versus measured performance",
            ["ai-l25-monitoring"],
            [ex("model-observability-lab", "advanced")],
          ),
          c(
            "permission-retrieval",
            "permission-aware retrieval and safe abstention",
            ["ai-l16-permission-rag"],
            [ex("retrieval-evaluation-lab", "advanced")],
          ),
          c(
            "failure",
            "failure, timeout and quota handling",
            ["sde-l11-bounded-failure", "ai-l27-failure-injection"],
            [ex("model-serving-gateway", "advanced")],
          ),
        ],
      ),
      s(
        "professional",
        "Defend quality, latency, privacy and operational decisions using evidence from actual local runs.",
        "Produce reproducible lineage, an incident decision and a truthful model/service card; leave unsupported scale and deployment modes unclaimed.",
        [
          c(
            "lineage",
            "versioned data/model/evaluation lineage",
            ["ai-l22-artifact-lineage"],
            [ex("model-observability-lab", "intermediate")],
          ),
          c(
            "tradeoffs",
            "latency, cost and quality trade-offs",
            ["ai-l24-performance", "ai-l26-eval-harness"],
            [ex("model-serving-gateway", "professional")],
          ),
          c(
            "rollback",
            "rollback and model monitoring",
            ["ai-l25-monitoring"],
            [ex("model-observability-lab", "professional")],
          ),
          c(
            "privacy",
            "privacy and tenant boundaries",
            ["ai-l16-permission-rag", "ai-l21-agent-security"],
            [ex("retrieval-evaluation-lab", "advanced")],
          ),
          c("adversarial", "adversarial evaluation", [
            "ai-l26-eval-harness",
            "ai-l27-failure-injection",
          ]),
          c(
            "incident-docs",
            "ML incident response and technical documentation",
            ["ai-l28-release-review"],
            [ex("model-observability-lab", "professional")],
          ),
        ],
      ),
    ],
    [
      "GPU profiling and memory",
      "distributed training",
      "inference engines and quantization",
      "compiler/kernels specialization",
    ],
  ),
  p(
    "security",
    "Product and Cloud Security Engineering",
    "Explain mechanisms and verify defensive controls in owned local labs. Separate local decision services from real cloud identity and resource enforcement.",
    [
      "sde-tenant-policy-service",
      "ai-model-serving-gateway",
      "security-supply-chain-verifier",
    ],
    [
      s(
        "foundation",
        "Define an authorized lab, identity/resource boundaries and the security property each control protects.",
        "Use synthetic identities and disposable keys; explain a deny case, a trust assumption and a restoration boundary before testing.",
        [
          c("systems", "HTTP, DNS, TCP and OS permissions", [
            ...f.system,
            "security-l09-process-isolation",
            "security-l12-network-dns",
          ]),
          c("coding", "Python and secure coding", [
            ...f.python,
            "security-l15-input-output",
          ]),
          c("architecture", "SQL and application architecture", [
            ...f.sql,
            "sde-l08-domain-services",
          ]),
          c("threat-model", "threat modelling", [
            "security-l01-lab-charter",
            "security-l02-threat-model",
          ]),
          c(
            "identity",
            "authentication versus authorization",
            ["security-l04-authenticators", "security-l05-permissions"],
            [ex("tenant-policy-service", "foundation")],
          ),
          c(
            "crypto",
            "cryptography and key lifecycle",
            ["security-l07-primitives", "security-l08-tls-pki"],
            [ex("supply-chain-verifier", "foundation")],
          ),
        ],
      ),
      s(
        "intermediate",
        "Translate security mechanisms into explicit allowed and denied cases at the actual enforcement boundary.",
        "Verify input/session/object/TLS behavior using isolated fixtures; do not infer cloud federation from an API-key prototype.",
        [
          c("owasp", "OWASP application and API mechanisms", [
            "security-l15-input-output",
            "security-l17-browser-controls",
            "ethical-hacking-l13-api-contracts",
          ]),
          c(
            "tenant",
            "tenant and object authorization",
            ["security-l18-tenant-boundaries"],
            [ex("tenant-policy-service", "intermediate")],
          ),
          c(
            "sessions",
            "sessions and token validation",
            ["security-l06-sessions"],
            [],
            "The lesson covers session/token mechanisms. Reference API keys are not OAuth/OIDC or federated sessions.",
          ),
          c(
            "iam",
            "least privilege and IAM evaluation",
            ["security-l20-cloud-iam"],
            [ex("tenant-policy-service", "professional")],
            "Provider-policy reasoning is conceptual here; a local decision service is not an AWS evaluator or cloud deployment.",
            "conceptual",
          ),
          c(
            "tls",
            "TLS and certificate validation",
            ["security-l08-tls-pki"],
            [],
            "Complete the specific TLS exercise; loopback HTTP prototypes do not establish deployed TLS/PKI.",
          ),
          c("logging", "defensive logging", ["security-l23-security-logs"]),
        ],
      ),
      s(
        "advanced",
        "Challenge policy revisions, revoked authority, untrusted inputs and artifact trust without harming external systems.",
        "Retain a small negative-control matrix and independently explain why each denied action fails at the correct boundary.",
        [
          c(
            "policy",
            "policy versioning and negative authorization tests",
            ["security-l18-tenant-boundaries"],
            [ex("tenant-policy-service", "advanced")],
          ),
          c("egress", "SSRF/egress and untrusted input boundaries", [
            "ethical-hacking-l14-server-requests",
            "ai-l21-agent-security",
          ]),
          c(
            "secrets",
            "secret rotation and revocation",
            ["security-l21-secret-lifecycle"],
            [ex("tenant-policy-service", "advanced")],
            "Key revocation is referenced; gateway online rotation is not implemented. Complete rotation in the owned lesson fixture.",
          ),
          c(
            "signing",
            "artifact signing and provenance",
            ["security-l22-supply-chain"],
            [
              ex("supply-chain-verifier", "intermediate"),
              ex("supply-chain-verifier", "advanced"),
            ],
            "The canonical lesson introduces trust concepts; real signature/replay work is a separate exercise, not inferred from SHA hashes.",
          ),
          c(
            "cloud-container",
            "cloud/container configuration review",
            ["security-l20-cloud-iam", "ethical-hacking-l16-container-review"],
            [],
            "Review supplied synthetic configurations; no cloud account changes or production compliance claim.",
            "conceptual",
          ),
          c(
            "dependencies",
            "dependency and release risk",
            ["sde-l14-supply-chain-secrets"],
            [ex("supply-chain-verifier", "professional")],
          ),
        ],
      ),
      s(
        "professional",
        "Produce accountable design, regression and incident evidence with clear residual risk and authorized scope.",
        "Defend the tenant, gateway and verifier controls yourself; security assurance is scoped evidence, never a vulnerability-free certification.",
        [
          c(
            "design-review",
            "product security design review",
            ["security-l29-zero-trust", "security-l30-assurance-review"],
            [ex("tenant-policy-service", "professional")],
          ),
          c(
            "regression",
            "security regression gates",
            ["security-l19-asvs-evidence", "ethical-hacking-l21-retesting"],
            [ex("supply-chain-verifier", "professional")],
          ),
          c("incident", "incident response and recovery", [
            "security-l25-triage",
            "security-l26-restoration",
            "security-l27-tabletop",
          ]),
          c("risk", "risk prioritization and exception ownership", [
            "security-l28-risk-register",
          ]),
          c("reporting", "responsible vulnerability reporting", [
            "ethical-hacking-l22-reporting",
            "ethical-hacking-l24-disclosure-handover",
          ]),
          c(
            "control-evidence",
            "measurable security control evidence",
            ["security-l30-assurance-review"],
            [
              ex("model-serving-gateway", "professional"),
              ex("supply-chain-verifier", "professional"),
            ],
          ),
        ],
      ),
    ],
    [
      "Kubernetes/cloud workload identity",
      "advanced detection engineering",
      "binary security or cryptography only with additional depth",
    ],
  ),
  p(
    "data-platform",
    "Data Platform and Analytics Engineering",
    "Build explainable ingestion, temporal datasets and reconciliation. Reuse existing Data lessons and distinguish local engines from cloud-specific practice.",
    [
      "data-contract-recovery",
      "quant-versioned-research-data",
      "quant-portfolio-reconciliation",
    ],
    [
      s(
        "foundation",
        "Give rows, units, nulls and timestamps a precise meaning before transforming or aggregating them.",
        "Retain a hand-checked SQL/valuation example and physical input provenance with reproducible test commands.",
        [
          c(
            "sql",
            "SQL joins, windows and aggregation",
            [...f.sql, "data-l04", "data-l13"],
            [ex("point-in-time-workbench", "intermediate")],
          ),
          c("python-tests", "Python and testing", [
            ...f.python,
            ...f.engineering,
          ]),
          c("grain", "data modelling and grain", [
            "foundation-lesson-07-relational-model",
            "data-l01",
            "data-l02",
            "data-l12",
          ]),
          c("types-time", "files, types, nulls and time zones", [
            "data-l05",
            "data-l06",
          ]),
          c("reproducibility", "Git and reproducibility", f.engineering),
        ],
      ),
      s(
        "intermediate",
        "Build typed, replayable transformations and semantic models whose outputs reconcile with explicit expectations.",
        "Measure actual storage/query work and preserve dimensional history; do not rename a local DuckDB run as Spark or Fabric.",
        [
          c(
            "parquet",
            "Parquet and columnar query execution",
            ["data-l06"],
            [ex("replayable-data-platform", "foundation")],
          ),
          c("dimensional", "dimensional models and SCD", [
            "data-l12",
            "data-l13",
          ]),
          c(
            "incremental",
            "incremental ingestion",
            ["data-l08"],
            [ex("replayable-data-platform", "intermediate")],
            "The reference admits inputs incrementally but rematerializes gold in full; partial output updates need separate evidence.",
          ),
          c(
            "spark",
            "Spark execution and shuffles",
            ["data-l09", "data-l10", "data-l11"],
            [],
            "Requires actual local Spark lesson work. The DuckDB reference does not demonstrate Spark execution.",
          ),
          c(
            "orchestration",
            "Fabric/Databricks orchestration",
            ["data-l11", "data-l29"],
            [],
            "Canonical platform concepts and a labelled local alternative are available. Cloud-specific execution remains unverified unless separately performed.",
            "conceptual",
          ),
          c("metrics", "semantic metric definitions", ["data-l14", "data-l15"]),
        ],
      ),
      s(
        "advanced",
        "Make late/corrected inputs, access scope and contract evolution explicit without losing provenance.",
        "Prove duplicate/rejection/correction behavior, point-in-time eligibility and reference-equivalent output on controlled cases.",
        [
          c(
            "cdc-time",
            "CDC, event and availability time",
            [
              "data-l19",
              "data-l20",
              "data-l21",
              "data-l25",
              "quant-l10-availability-time",
            ],
            [ex("point-in-time-workbench", "foundation")],
          ),
          c(
            "replay",
            "idempotent ingestion and replay",
            ["data-l08", "data-l20"],
            [ex("replayable-data-platform", "advanced")],
          ),
          c(
            "contracts",
            "schema evolution and data contracts",
            ["data-l17"],
            [ex("replayable-data-platform", "intermediate")],
          ),
          c(
            "lineage",
            "quality/quarantine/lineage",
            ["data-l16", "data-l18"],
            [ex("replayable-data-platform", "foundation")],
          ),
          c("performance", "partitioning and query plans", [
            "data-l04",
            "data-l06",
            "data-l10",
          ]),
          c("governance", "tenant governance", ["data-l23"]),
        ],
      ),
      s(
        "professional",
        "Operate a scoped data product with measurable recovery, access/retention and stakeholder decisions.",
        "Explain source/journal recovery dependencies and reconcile a disagreement; local measurements do not imply customer dollar savings.",
        [
          c("slo", "data service objectives", ["data-l27"]),
          c(
            "backfill",
            "backfills and recovery equivalence",
            ["data-l22"],
            [ex("replayable-data-platform", "advanced")],
          ),
          c("delivery", "CI/CD and environment promotion", ["data-l26"]),
          c("retention", "access controls and retention", [
            "data-l23",
            "data-l24",
          ]),
          c(
            "cost",
            "cost/performance measurements",
            ["data-l28"],
            [ex("replayable-data-platform", "professional")],
          ),
          c(
            "incident",
            "data incident analysis and stakeholder communication",
            ["data-l27", "data-l29"],
            [ex("portfolio-risk-service", "professional")],
          ),
        ],
      ),
    ],
    [
      "stream-processing internals",
      "distributed lakehouse table formats",
      "cloud-specific governance and infrastructure as code",
    ],
  ),
  p(
    "quant-developer",
    "Quantitative Development and Research Infrastructure",
    "Engineer deterministic, temporally correct research and paper systems. Correctness, accounting and measured execution matter more than unsupported profit claims.",
    [
      "quant-multi-instrument-ledger",
      "quant-versioned-research-data",
      "quant-portfolio-reconciliation",
    ],
    [
      s(
        "foundation",
        "Explain numeric and financial units, uncertainty and time before implementing trading-related logic.",
        "Use synthetic instruments, hand calculations and simple data structures; no live account, broker or real-money activity is required.",
        [
          c("python-sql", "Python and SQL", [...f.python, ...f.sql]),
          c("math", "probability, statistics and numerical reasoning", [
            ...f.numbers,
            "quant-l02-conditioning",
            "quant-l03-dependence-simulation",
            "quant-l04-inference-uncertainty",
          ]),
          c("algorithms", "data structures and algorithms", f.algorithms),
          c("linux-time", "Linux and timekeeping", [
            ...f.system,
            "quant-l10-availability-time",
          ]),
          c("instruments", "financial instruments and cash-flow meaning", [
            "quant-l01-instruments-cashflows",
          ]),
        ],
      ),
      s(
        "intermediate",
        "Implement matching, time-aware data and accounting with independent reference expectations.",
        "Prove price/FIFO, duplicate handling and knowable-information boundaries; matching fills do not automatically establish account balances.",
        [
          c("microstructure", "market microstructure and order states", [
            "quant-l13-order-book-semantics",
          ]),
          c(
            "events",
            "deterministic event processing",
            ["quant-l14-reference-matcher", "quant-l15-command-log-replay"],
            [ex("paper-exchange-engine", "intermediate")],
          ),
          c(
            "units",
            "integer/decimal prices and quantities",
            ["quant-l05-numerical-representation"],
            [ex("paper-exchange-engine", "foundation")],
          ),
          c(
            "temporal",
            "point-in-time data and survivorship",
            [
              "quant-l09-returns-corporate-actions",
              "quant-l10-availability-time",
              "algorithmic-l03-vintages",
            ],
            [ex("point-in-time-workbench", "foundation")],
          ),
          c(
            "accounting",
            "portfolio cash/position accounting",
            ["quant-l21-ledger-valuation"],
            [ex("portfolio-risk-service", "foundation")],
            "The risk service provides scoped equity/T+0 accounting. The paper exchange has no account ledger; cost basis and realized P&L are not claimed.",
          ),
          c(
            "reference-tests",
            "reference and property tests",
            ["quant-l16-differential-testing"],
            [ex("paper-exchange-engine", "intermediate")],
          ),
        ],
      ),
      s(
        "advanced",
        "Challenge performance, crash consistency, research selection and risk assumptions without using future information.",
        "Separate implemented state from missing ledger fields and supported local execution from specialization or operating-system restrictions.",
        [
          c(
            "cpp",
            "C++ memory and performance where implemented",
            ["quant-l25-cpp-engine-lane"],
            [ex("paper-exchange-engine", "professional")],
            "Optional canonical C++ lane and native Linux evidence; use Python on Windows where native execution is blocked.",
          ),
          c("profiling", "profiling and latency measurement", [
            "quant-l31-performance-evidence",
          ]),
          c(
            "snapshots",
            "snapshot/replay and crash consistency",
            ["quant-l30-snapshots-recovery"],
            [ex("paper-exchange-engine", "advanced")],
            "The original lesson includes accounting state. The supplied matching reference only covers its implemented orders/fills/deduplication state.",
          ),
          c("costs", "transaction-cost and liquidity assumptions", [
            "quant-l19-execution-costs",
          ]),
          c("validation", "chronological out-of-sample evaluation", [
            "quant-l11-time-series-validation",
            "algorithmic-l10-walk-forward",
          ]),
          c(
            "risk",
            "risk limits and stress scenarios",
            [
              "quant-l23-constraints-exposures",
              "quant-l24-tail-risk-stress",
              "quant-l29-system-controls",
            ],
            [ex("portfolio-risk-service", "advanced")],
          ),
        ],
      ),
      s(
        "professional",
        "Defend complete research records, reconciliation and backend-labelled measurements under an explicit control policy.",
        "Explain the three independent projects and their missing capabilities; an audited educational system is not an exchange or profitability certification.",
        [
          c("research", "reproducible research and complete trial records", [
            "quant-l17-research-protocol",
            "quant-l20-overfitting-audit",
            "algorithmic-l11-trials",
          ]),
          c(
            "monitoring",
            "production monitoring and kill switches",
            ["quant-l29-system-controls", "algorithmic-l20-monitors-halts"],
            [],
            "Learn controls with disconnected paper fixtures; real production operation and kill-switch integration are not asserted.",
            "conceptual",
          ),
          c(
            "reconciliation",
            "reconciliation and incident runbooks",
            ["quant-l21-ledger-valuation", "quant-l30-snapshots-recovery"],
            [ex("portfolio-risk-service", "professional")],
          ),
          c(
            "governance",
            "data and model governance",
            ["quant-l12-reproducible-snapshots", "quant-l32-release-audit"],
            [ex("point-in-time-workbench", "professional")],
          ),
          c(
            "protocol",
            "exchange/protocol specialization",
            ["quant-l13-order-book-semantics", "quant-l29-system-controls"],
            [ex("paper-exchange-engine", "professional")],
            "Local matching semantics and protocol reading are a starting point, not exchange interoperability or certification.",
            "conceptual",
          ),
          c(
            "claims",
            "explainable performance and correctness claims",
            ["quant-l31-performance-evidence", "quant-l32-release-audit"],
            [ex("paper-exchange-engine", "professional")],
          ),
        ],
      ),
    ],
    [
      "quantitative research with deeper mathematics",
      "stochastic processes and derivatives pricing",
      "FPGA/kernel/network optimization",
    ],
  ),
  p(
    "technical-pm",
    "Technical Product Management",
    "Frame product problems, connect evidence to implementation and defend decisions. Use explicitly hypothetical cases rather than invented interviews or adoption.",
    [
      "sde-order-orchestrator",
      "ai-retrieval-evaluation-lab",
      "data-contract-recovery",
    ],
    [
      s(
        "foundation",
        "Separate user needs, assumptions, technical constraints and financial meaning before proposing a solution.",
        "Produce an ethical discovery plan, original synthetic segments, a system map and metrics with explicit denominators.",
        [
          c("problem", "problem framing and user needs", [
            "foundation-lesson-21-requirements-explanation",
            "tpm-l01-problem-evidence",
          ]),
          c(
            "architecture",
            "technical architecture literacy",
            ["foundation-lesson-18-http-apis", "tpm-l03-product-system-map"],
            [ex("commerce-workflow-engine", "foundation")],
          ),
          c("metrics", "SQL and product metrics", [
            ...f.sql,
            "tpm-l04-outcome-metrics",
          ]),
          c("writing", "written communication", f.communication),
          c("finance", "basic financial reasoning", [
            "finance-l08-accounting",
            "finance-l10-ratios",
          ]),
          c("ethics", "research ethics", [
            "foundation-lesson-19-privacy-secrets",
            "tpm-l01-problem-evidence",
          ]),
        ],
      ),
      s(
        "intermediate",
        "Turn a hypothetical need into a testable scope, dependency-aware roadmap and reproducible measurement plan.",
        "Write a PRD, neutral usability tasks and an event/funnel analysis without representing self-evaluation as customer research.",
        [
          c("prd", "PRDs and acceptance criteria", ["tpm-l05-prd-acceptance"]),
          c("segments", "segmentation and jobs-to-be-done", [
            "tpm-l02-segments-jobs",
          ]),
          c("priority", "prioritization and roadmaps", [
            "tpm-l06-prioritization-roadmap",
          ]),
          c("instrumentation", "instrumentation and funnels", [
            "tpm-l07-instrumentation-funnels",
          ]),
          c("usability", "usability research methods", [
            "tpm-l08-usability-experiments",
          ]),
          c("hypothesis", "hypothesis and experiment design", [
            "tpm-l08-usability-experiments",
            "quant-l08-hypothesis-families",
          ]),
        ],
      ),
      s(
        "advanced",
        "Defend API, experiment, economics and risk decisions using valid evidence and explicit uncertainty.",
        "Check experiment eligibility and sample ratios, calculate units correctly, and name accountable owners for trade-offs and release constraints.",
        [
          c("platform", "platform/API product decisions", [
            "sde-l26-platform",
            "tpm-l09-platform-api-products",
          ]),
          c("economics", "unit economics and cost-quality trade-offs", [
            "finance-l10-ratios",
            "tpm-l11-unit-economics",
          ]),
          c(
            "validity",
            "experiment validity and guardrails",
            ["tpm-l10-experiment-validity"],
            [ex("retrieval-evaluation-lab", "professional")],
          ),
          c("risk", "risk/compliance requirements", [
            "security-l28-risk-register",
            "tpm-l12-risk-sequencing",
          ]),
          c("buy-build", "build-versus-buy and sequencing", [
            "tpm-l09-platform-api-products",
            "tpm-l12-risk-sequencing",
          ]),
          c("delivery", "cross-functional delivery", [
            "tpm-l12-risk-sequencing",
            "tpm-l14-stakeholder-decisions",
          ]),
        ],
      ),
      s(
        "professional",
        "Defend a launch/defer decision and revise strategy from reproducible evidence rather than retrospective success stories.",
        "Integrate the three case studies, distinguish actual code from hypothetical product assumptions and preserve negative or inconclusive results.",
        [
          c("strategy", "outcome accountability and strategy", [
            "tpm-l14-stakeholder-decisions",
            "tpm-l16-case-study-defense",
          ]),
          c("launch", "launch/rollback criteria", [
            "sde-l21-safe-release-iac",
            "tpm-l13-launch-rollback",
          ]),
          c("stakeholders", "stakeholder negotiation", [
            "tpm-l14-stakeholder-decisions",
          ]),
          c(
            "judgement",
            "commercial and operational judgement",
            [
              "finance-l22-memo",
              "tpm-l11-unit-economics",
              "tpm-l14-stakeholder-decisions",
            ],
            [ex("commerce-workflow-engine", "professional")],
          ),
          c(
            "measurement",
            "post-launch measurement",
            ["tpm-l15-postlaunch-roadmap"],
            [ex("replayable-data-platform", "professional")],
          ),
          c("revision", "evidence-based roadmap revision", [
            "tpm-l15-postlaunch-roadmap",
            "tpm-l16-case-study-defense",
          ]),
        ],
      ),
    ],
    [
      "real customer discovery and market validation",
      "pricing and packaging in a real business",
      "organizational leadership",
    ],
  ),
];
