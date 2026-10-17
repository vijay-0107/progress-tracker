/**
 * Notes for projects listed on the role-targeted resumes kept in Overleaf:
 * the repository to create, the stack, and the resume bullets each project must
 * back up. Resume numbers are targets until gate 4 of the project measures them.
 */

export type ProjectResumeNotes = {
  projectId: string;
  repository: string;
  stack: string[];
  estimatedWeeks: number;
  resumeBullets: string[];
};

export const resumeRoleProjects: Record<string, string[]> = {
  "Software Development Engineer": [
    "resume-raft-kv",
    "resume-collab-editor",
    "resume-pr-review-bot",
  ],
  "Machine Learning Engineer": [
    "resume-two-tower-recsys",
    "resume-fraud-mlops",
    "resume-ticket-lora",
  ],
  "AI Engineer (Generative AI)": [
    "resume-filings-rag",
    "resume-sql-agent",
    "resume-llm-gateway",
  ],
  "Data Engineer": [
    "resume-clickstream-lakehouse",
    "resume-cdc-scd2",
    "resume-nyc-taxi-dbt",
  ],
  "Quantitative Developer": [
    "resume-lob-engine",
    "resume-nse-backtester",
    "resume-vol-surface",
  ],
  "Backend Engineer": [
    "resume-payments-ledger",
    "resume-go-scheduler",
    "sde-transaction-safe-commerce",
  ],
  "Cloud and AI Infrastructure Engineer": [
    "resume-eks-gitops-platform",
    "resume-llm-serving-k8s",
    "resume-multi-region-dr",
  ],
  "Cloud Security Engineer": [
    "resume-cspm-scanner",
    "resume-secure-supply-chain",
    "resume-detection-lab",
  ],
};

export const resumeProjectNotes: ProjectResumeNotes[] = [
  {
    projectId: "resume-raft-kv",
    repository: "raft-kv",
    stack: ["Go", "gRPC", "LSM-tree", "Docker"],
    estimatedWeeks: 8,
    resumeBullets: [
      "Implemented Raft leader election, log replication and snapshotting over gRPC on an LSM-tree engine with write-ahead log, SSTable compaction and Bloom filters.",
      "Sustained 20K+ writes/sec on a 3-node cluster and passed 1,000 randomized crash/partition tests with zero linearizability violations (Porcupine).",
    ],
  },
  {
    projectId: "resume-collab-editor",
    repository: "collab-editor",
    stack: ["TypeScript", "React", "Node.js", "WebSockets", "Redis"],
    estimatedWeeks: 6,
    resumeBullets: [
      "Designed a CRDT text model with offline edits and conflict-free merges, syncing 50 concurrent editors per document over WebSockets and Redis pub/sub.",
      "Held p95 sync latency under 100 ms with presence cursors, version history and 90%+ Jest/Playwright coverage.",
    ],
  },
  {
    projectId: "resume-pr-review-bot",
    repository: "pr-review-bot",
    stack: [
      "Python",
      "FastAPI",
      "GitHub Apps",
      "tree-sitter",
      "LLM APIs",
      "PostgreSQL",
    ],
    estimatedWeeks: 4,
    resumeBullets: [
      "Shipped a GitHub App that parses diffs into syntax trees and generates line-level review comments with an LLM, filtered through static checks.",
      "Reached 70%+ comment acceptance on 200 labelled pull requests and halved token cost with review caching.",
    ],
  },
  {
    projectId: "resume-two-tower-recsys",
    repository: "two-tower-recsys",
    stack: ["PyTorch", "FAISS", "LightGBM", "FastAPI", "Docker"],
    estimatedWeeks: 5,
    resumeBullets: [
      "Trained a two-tower retrieval model on MovieLens-25M with FAISS approximate nearest-neighbour search and a LightGBM learning-to-rank re-ranker.",
      "Improved NDCG@10 by 25% over a popularity baseline and served top-10 results at <50 ms p95 via FastAPI.",
    ],
  },
  {
    projectId: "resume-fraud-mlops",
    repository: "fraud-mlops",
    stack: ["XGBoost", "Feast", "MLflow", "Airflow", "Evidently", "Kubernetes"],
    estimatedWeeks: 6,
    resumeBullets: [
      "Created point-in-time-correct features in Feast, tracked experiments in MLflow and scheduled retraining in Airflow on 590K IEEE-CIS transactions.",
      "Reached 0.92 ROC-AUC; retrained on Evidently drift alerts and promoted models only after shadow evaluation.",
    ],
  },
  {
    projectId: "resume-ticket-lora",
    repository: "ticket-lora",
    stack: ["Hugging Face Transformers", "PEFT", "PyTorch", "ONNX Runtime"],
    estimatedWeeks: 3,
    resumeBullets: [
      "Fine-tuned DistilBERT and a LoRA-adapted 1B-parameter LLM on a public support-ticket dataset, comparing macro-F1, latency and serving cost.",
      "Exported the best model to INT8 ONNX, cutting CPU latency 3x with under 1 point loss in macro-F1.",
    ],
  },
  {
    projectId: "resume-filings-rag",
    repository: "filings-rag",
    stack: ["LangGraph", "pgvector", "BM25", "Re-ranking", "FastAPI"],
    estimatedWeeks: 5,
    resumeBullets: [
      "Indexed 500+ annual reports with hybrid BM25 and vector search, re-ranking and page-level citations.",
      "Gated every change in CI on a 300-question RAGAS and LLM-as-judge suite, reaching 90%+ citation accuracy.",
    ],
  },
  {
    projectId: "resume-sql-agent",
    repository: "sql-agent",
    stack: ["LangGraph", "MCP", "sqlglot", "DuckDB", "PostgreSQL"],
    estimatedWeeks: 4,
    resumeBullets: [
      "Developed a tool-calling agent that plans, writes, validates and self-corrects SQL, exposed as an MCP server for Claude and IDE clients.",
      "Scored 80%+ execution accuracy on 500 Spider queries; blocked writes with read-only roles and AST checks.",
    ],
  },
  {
    projectId: "resume-llm-gateway",
    repository: "llm-gateway",
    stack: [
      "Python",
      "FastAPI",
      "vLLM",
      "Redis",
      "OpenTelemetry",
      "Prometheus",
    ],
    estimatedWeeks: 4,
    resumeBullets: [
      "Routed requests across hosted APIs and a self-hosted vLLM model by cost, latency and task type, with retries, fallbacks and per-team token budgets.",
      "Cut repeat-query cost 40% with semantic caching; traced calls with OpenTelemetry and screened prompt injection.",
    ],
  },
  {
    projectId: "resume-clickstream-lakehouse",
    repository: "clickstream-lakehouse",
    stack: ["Kafka", "Spark Streaming", "Iceberg", "Airflow", "Trino"],
    estimatedWeeks: 5,
    resumeBullets: [
      "Streamed 1M+ events/hour from Kafka into Iceberg bronze, silver and gold tables with watermarks for late data and exactly-once checkpoints.",
      "Kept end-to-end latency under 60 s; compacted small files and partitioned by hour to speed up Trino queries 5x.",
    ],
  },
  {
    projectId: "resume-cdc-scd2",
    repository: "cdc-scd2",
    stack: ["Debezium", "Kafka Connect", "Delta Lake", "Great Expectations"],
    estimatedWeeks: 4,
    resumeBullets: [
      "Captured inserts, updates and deletes with Debezium and merged them into Delta Lake SCD Type 2 dimensions with automatic schema evolution.",
      "Enforced 40+ data quality checks per run, quarantined bad records and reconciled 100% of source rows.",
    ],
  },
  {
    projectId: "resume-nyc-taxi-dbt",
    repository: "nyc-taxi-dbt",
    stack: ["dbt", "Snowflake", "DuckDB", "Dagster", "OpenLineage"],
    estimatedWeeks: 4,
    resumeBullets: [
      "Modelled 1B+ NYC taxi trips into a star schema with incremental dbt models and column-level lineage.",
      "Cut warehouse compute 50% with incremental builds and clustering; ran 100+ dbt tests in CI.",
    ],
  },
  {
    projectId: "resume-lob-engine",
    repository: "lob-engine",
    stack: ["C++20", "Lock-free Queues", "Google Benchmark", "perf"],
    estimatedWeeks: 6,
    resumeBullets: [
      "Implemented a price-time-priority limit order book for limit, market, IOC and cancel orders using intrusive lists and preallocated memory pools.",
      "Processed 5M+ orders/sec single-threaded at sub-microsecond median latency, fed by a lock-free SPSC ring buffer and profiled with perf.",
    ],
  },
  {
    projectId: "resume-nse-backtester",
    repository: "nse-backtester",
    stack: ["Python", "NumPy", "Numba", "Pandas", "Plotly"],
    estimatedWeeks: 5,
    resumeBullets: [
      "Backtested momentum and cointegration pairs strategies on 10 years of NSE daily data with transaction costs, slippage and walk-forward validation.",
      "Accelerated hot loops 50x with Numba and guarded results against look-ahead and survivorship bias.",
    ],
  },
  {
    projectId: "resume-vol-surface",
    repository: "vol-surface",
    stack: ["C++", "Python", "pybind11", "SciPy", "QuantLib"],
    estimatedWeeks: 6,
    resumeBullets: [
      "Developed Black-Scholes, binomial and Monte Carlo pricers with Greeks; calibrated Heston to NIFTY options.",
      "Fit an arbitrage-free SVI volatility surface and cut Monte Carlo error 4x with control variates.",
    ],
  },
  {
    projectId: "resume-payments-ledger",
    repository: "payments-ledger",
    stack: ["Java 21", "Spring Boot", "PostgreSQL", "Kafka", "Docker", "k6"],
    estimatedWeeks: 5,
    resumeBullets: [
      "Designed an append-only double-entry ledger with idempotency keys, optimistic locking and a transactional outbox publishing events to Kafka.",
      "Handled 2K+ transfers/sec in k6 load tests with zero balance drift across 10M randomized transfers and replays.",
    ],
  },
  {
    projectId: "resume-go-scheduler",
    repository: "go-scheduler",
    stack: ["Go", "PostgreSQL", "Redis", "gRPC", "Prometheus", "Grafana"],
    estimatedWeeks: 4,
    resumeBullets: [
      "Implemented cron and one-off scheduling with at-least-once execution, exponential backoff, dead-letter queues and leader election via PostgreSQL advisory locks.",
      "Dispatched 10K jobs/min across 8 workers using SKIP LOCKED queues and exported latency and failure metrics to Grafana.",
    ],
  },
  {
    projectId: "sde-transaction-safe-commerce",
    repository: "existing project (Dec 2023)",
    stack: ["Django", "PostgreSQL", "HTML/CSS", "pytest"],
    estimatedWeeks: 0,
    resumeBullets: [
      "Developed a single-store website with product catalogue, cart, authenticated orders and server-side priced checkout.",
      "Reserved stock inside database transactions and tested a local payment simulator against duplicate callbacks with pytest.",
    ],
  },
  {
    projectId: "resume-eks-gitops-platform",
    repository: "eks-gitops-platform",
    stack: [
      "AWS EKS",
      "Terraform",
      "Argo CD",
      "Helm",
      "Karpenter",
      "Prometheus",
    ],
    estimatedWeeks: 5,
    resumeBullets: [
      "Provisioned dev, staging and prod EKS clusters with modular Terraform and remote state, deploying services through Argo CD and Helm on every merge.",
      "Cut node cost 40% with Karpenter spot provisioning and defined SLO dashboards and alerts in Prometheus and Grafana.",
    ],
  },
  {
    projectId: "resume-llm-serving-k8s",
    repository: "llm-serving-k8s",
    stack: ["vLLM", "KServe", "NVIDIA GPU Operator", "KEDA", "Locust"],
    estimatedWeeks: 3,
    resumeBullets: [
      "Served an open-weight 8B model with vLLM on GPU nodes, autoscaling with KEDA on queue depth and scaling to zero when idle.",
      "Benchmarked throughput, p95 latency and cost per 1M tokens with Locust, and raised throughput 3x by tuning batching.",
    ],
  },
  {
    projectId: "resume-multi-region-dr",
    repository: "multi-region-dr",
    stack: ["AWS Lambda", "DynamoDB Global Tables", "Route 53"],
    estimatedWeeks: 3,
    resumeBullets: [
      "Deployed an active-passive API across two AWS regions with DynamoDB global tables and Route 53 health-check failover.",
      "Verified <5 min RTO and <1 s RPO through scripted chaos drills with AWS Fault Injection Service.",
    ],
  },
  {
    projectId: "resume-cspm-scanner",
    repository: "cspm-scanner",
    stack: ["Python", "boto3", "Azure SDK", "AWS Lambda", "Security Hub"],
    estimatedWeeks: 4,
    resumeBullets: [
      "Scanned AWS and Azure accounts against 60+ CIS Benchmark controls covering public storage, open security groups, IAM wildcards and missing encryption.",
      "Auto-remediated low-risk findings with event-driven Lambda functions and routed the rest to Security Hub with severity and fix steps.",
    ],
  },
  {
    projectId: "resume-secure-supply-chain",
    repository: "secure-supply-chain",
    stack: ["GitHub Actions", "Semgrep", "Trivy", "Cosign", "OPA Gatekeeper"],
    estimatedWeeks: 3,
    resumeBullets: [
      "Gated every build on SAST, dependency and container scans, generated SBOMs and signed images with Sigstore Cosign.",
      "Blocked unsigned or critical-CVE images at Kubernetes admission with OPA Gatekeeper, enforcing 100% signed deployments.",
    ],
  },
  {
    projectId: "resume-detection-lab",
    repository: "detection-lab",
    stack: ["Wazuh", "Elastic SIEM", "Sigma", "Atomic Red Team", "Python"],
    estimatedWeeks: 5,
    resumeBullets: [
      "Wrote 30+ Sigma detection rules mapped to MITRE ATT&CK and validated each against Atomic Red Team simulations.",
      "Added LLM-assisted alert triage that enriches alerts with threat intelligence, cutting false positives 40% in lab tests.",
    ],
  },
];

export function findResumeNotes(projectId: string) {
  return resumeProjectNotes.find((notes) => notes.projectId === projectId);
}

export function rolesForProject(projectId: string) {
  return Object.entries(resumeRoleProjects)
    .filter(([, ids]) => ids.includes(projectId))
    .map(([role]) => role);
}
