import type { Project, Source } from "../domain/types";
import { defineProject } from "./projects";

/**
 * Projects named on the eight role-targeted resumes (Overleaf, 2026-10-17).
 * Each one starts incomplete. The four gates are the build guide; the numbers in
 * the acceptance checks are the targets printed on the resume and must be
 * replaced on the resume by the values actually measured in gate 4.
 */

const resumeHistory =
  "Listed on a 2026 role-targeted resume as a planned build. Nothing is built yet: the repository, every gate and every number start incomplete. Before the resume is sent, the linked GitHub repository must exist and each resume number must be replaced with the value measured in gate 4.";

const cloudCost =
  "Cloud resources cost money. Develop locally first (kind, LocalStack, Docker Compose), set a billing alarm before creating any paid resource, and run `terraform destroy` (or delete the stack) after every measurement session.";

const ownAccountsOnly =
  "Scan, attack-simulate or remediate only accounts, clusters and machines you own or are explicitly authorized to test.";

const noRealMoney =
  "Simulation and research only: no live broker connection, no real orders and no claim of profitable trading. Backtest returns are not investment advice.";

const s = {
  raft: {
    title: "In Search of an Understandable Consensus Algorithm (Raft paper)",
    url: "https://raft.github.io/raft.pdf",
    notes:
      "Sections 5.1-5.4 and 7 (log compaction) are the implementation spec.",
  },
  mit6824: {
    title: "MIT 6.5840 Distributed Systems labs",
    url: "https://pdos.csail.mit.edu/6.824/",
    notes: "Lab 3 (Raft) and Lab 4 (fault-tolerant KV) mirror this project.",
  },
  porcupine: {
    title: "Porcupine linearizability checker",
    url: "https://github.com/anishathalye/porcupine",
  },
  grpcGo: {
    title: "gRPC Go quick start",
    url: "https://grpc.io/docs/languages/go/quickstart/",
  },
  rocksdb: {
    title: "RocksDB overview (LSM-tree design)",
    url: "https://github.com/facebook/rocksdb/wiki/RocksDB-Overview",
  },
  crdt: {
    title: "crdt.tech papers and resources",
    url: "https://crdt.tech/",
  },
  yjs: {
    title: "Yjs documentation (reference CRDT implementation)",
    url: "https://docs.yjs.dev/",
    notes: "Read to compare designs; the project implements its own CRDT.",
  },
  websockets: {
    title: "MDN WebSockets API",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API",
  },
  redisPubSub: {
    title: "Redis Pub/Sub",
    url: "https://redis.io/docs/latest/develop/interact/pubsub/",
  },
  playwright: {
    title: "Playwright getting started",
    url: "https://playwright.dev/docs/intro",
  },
  githubApps: {
    title: "About creating GitHub Apps",
    url: "https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps",
  },
  treeSitter: {
    title: "tree-sitter documentation",
    url: "https://tree-sitter.github.io/tree-sitter/",
  },
  movielens: {
    title: "MovieLens 25M dataset",
    url: "https://grouplens.org/datasets/movielens/25m/",
    notes:
      "Research-use license; read README.txt before redistributing anything.",
  },
  faiss: {
    title: "FAISS wiki",
    url: "https://github.com/facebookresearch/faiss/wiki",
  },
  lightgbm: {
    title: "LightGBM documentation (lambdarank objective)",
    url: "https://lightgbm.readthedocs.io/en/latest/",
  },
  fastapi: {
    title: "FastAPI documentation",
    url: "https://fastapi.tiangolo.com/",
  },
  ieeeCis: {
    title: "IEEE-CIS Fraud Detection dataset (Kaggle)",
    url: "https://www.kaggle.com/c/ieee-fraud-detection",
    notes:
      "Free account and competition rules acceptance required; do not republish the raw data.",
  },
  feast: {
    title: "Feast feature store documentation",
    url: "https://docs.feast.dev/",
  },
  mlflow: {
    title: "MLflow documentation",
    url: "https://mlflow.org/docs/latest/index.html",
  },
  evidently: {
    title: "Evidently documentation (data and prediction drift)",
    url: "https://docs.evidentlyai.com/",
  },
  airflow: {
    title: "Apache Airflow documentation",
    url: "https://airflow.apache.org/docs/apache-airflow/stable/index.html",
  },
  transformers: {
    title: "Hugging Face Transformers documentation",
    url: "https://huggingface.co/docs/transformers/index",
  },
  peft: {
    title: "Hugging Face PEFT (LoRA)",
    url: "https://huggingface.co/docs/peft/index",
  },
  onnxQuant: {
    title: "ONNX Runtime quantization",
    url: "https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html",
  },
  langgraph: {
    title: "LangGraph documentation",
    url: "https://langchain-ai.github.io/langgraph/",
  },
  pgvector: { title: "pgvector", url: "https://github.com/pgvector/pgvector" },
  ragas: {
    title: "RAGAS evaluation documentation",
    url: "https://docs.ragas.io/",
  },
  edgar: {
    title: "SEC EDGAR full-text search and filings",
    url: "https://www.sec.gov/search-filings",
    notes:
      "Public filings; respect SEC fair-access rate limits and send a User-Agent.",
  },
  mcp: {
    title: "Model Context Protocol specification and SDKs",
    url: "https://modelcontextprotocol.io/",
  },
  sqlglot: {
    title: "sqlglot SQL parser",
    url: "https://github.com/tobymao/sqlglot",
  },
  spider: {
    title: "Spider text-to-SQL benchmark",
    url: "https://yale-lily.github.io/spider",
  },
  vllm: { title: "vLLM documentation", url: "https://docs.vllm.ai/" },
  otel: {
    title: "OpenTelemetry documentation",
    url: "https://opentelemetry.io/docs/",
  },
  owaspLlm: {
    title: "OWASP Top 10 for LLM Applications",
    url: "https://genai.owasp.org/llm-top-10/",
  },
  kafka: {
    title: "Apache Kafka documentation",
    url: "https://kafka.apache.org/documentation/",
  },
  sparkStreaming: {
    title: "Spark Structured Streaming programming guide",
    url: "https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html",
  },
  iceberg: {
    title: "Apache Iceberg documentation",
    url: "https://iceberg.apache.org/docs/latest/",
  },
  trino: {
    title: "Trino documentation",
    url: "https://trino.io/docs/current/",
  },
  debezium: {
    title: "Debezium PostgreSQL connector",
    url: "https://debezium.io/documentation/reference/stable/connectors/postgresql.html",
  },
  delta: {
    title: "Delta Lake documentation",
    url: "https://docs.delta.io/latest/index.html",
  },
  gx: {
    title: "Great Expectations documentation",
    url: "https://docs.greatexpectations.io/docs/",
  },
  dbt: {
    title: "dbt documentation",
    url: "https://docs.getdbt.com/docs/introduction",
  },
  tlc: {
    title: "NYC TLC trip record data",
    url: "https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page",
  },
  dagster: { title: "Dagster documentation", url: "https://docs.dagster.io/" },
  openlineage: {
    title: "OpenLineage documentation",
    url: "https://openlineage.io/docs/",
  },
  duckdb: { title: "DuckDB documentation", url: "https://duckdb.org/docs/" },
  matching: {
    title: "Coinbase exchange matching-engine concepts",
    url: "https://docs.cdp.coinbase.com/exchange/concepts/matching-engine",
  },
  spsc: {
    title: "1024cores: lock-free queue designs",
    url: "https://www.1024cores.net/home/lock-free-algorithms/queues",
  },
  gbench: {
    title: "Google Benchmark",
    url: "https://github.com/google/benchmark",
  },
  perf: { title: "Linux perf wiki", url: "https://perfwiki.github.io/main/" },
  nseReports: {
    title: "NSE India reports (daily bhavcopy)",
    url: "https://www.nseindia.com/all-reports",
    notes: "Check NSE terms of use before storing or sharing downloaded data.",
  },
  numba: {
    title: "Numba documentation",
    url: "https://numba.readthedocs.io/en/stable/",
  },
  coint: {
    title: "statsmodels Engle-Granger cointegration test",
    url: "https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.coint.html",
  },
  quantlib: {
    title: "QuantLib documentation",
    url: "https://www.quantlib.org/docs.shtml",
  },
  pybind11: {
    title: "pybind11 documentation",
    url: "https://pybind11.readthedocs.io/en/stable/",
  },
  svi: {
    title: "Gatheral and Jacquier, Arbitrage-free SVI volatility surfaces",
    url: "https://arxiv.org/abs/1204.0646",
  },
  springBoot: {
    title: "Spring Boot reference documentation",
    url: "https://docs.spring.io/spring-boot/index.html",
  },
  outbox: {
    title: "Transactional outbox pattern",
    url: "https://microservices.io/patterns/data/transactional-outbox.html",
  },
  idempotency: {
    title: "Stripe idempotent requests (design reference)",
    url: "https://docs.stripe.com/api/idempotent_requests",
  },
  k6: {
    title: "Grafana k6 documentation",
    url: "https://grafana.com/docs/k6/latest/",
  },
  pgLocking: {
    title: "PostgreSQL explicit and advisory locking",
    url: "https://www.postgresql.org/docs/current/explicit-locking.html",
  },
  pgSkipLocked: {
    title: "PostgreSQL SELECT ... FOR UPDATE SKIP LOCKED",
    url: "https://www.postgresql.org/docs/current/sql-select.html",
  },
  prometheus: {
    title: "Prometheus documentation",
    url: "https://prometheus.io/docs/introduction/overview/",
  },
  eks: {
    title: "Amazon EKS user guide",
    url: "https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html",
  },
  terraform: {
    title: "Terraform documentation",
    url: "https://developer.hashicorp.com/terraform/docs",
  },
  argocd: {
    title: "Argo CD documentation",
    url: "https://argo-cd.readthedocs.io/en/stable/",
  },
  karpenter: {
    title: "Karpenter documentation",
    url: "https://karpenter.sh/docs/",
  },
  helm: { title: "Helm documentation", url: "https://helm.sh/docs/" },
  kserve: {
    title: "KServe documentation",
    url: "https://kserve.github.io/website/",
  },
  keda: { title: "KEDA documentation", url: "https://keda.sh/docs/" },
  gpuOperator: {
    title: "NVIDIA GPU Operator",
    url: "https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/index.html",
  },
  locust: {
    title: "Locust documentation",
    url: "https://docs.locust.io/en/stable/",
  },
  globalTables: {
    title: "DynamoDB global tables",
    url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html",
  },
  route53: {
    title: "Route 53 DNS failover",
    url: "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html",
  },
  fis: {
    title: "AWS Fault Injection Service",
    url: "https://docs.aws.amazon.com/fis/latest/userguide/what-is.html",
  },
  cis: {
    title: "CIS Benchmarks",
    url: "https://www.cisecurity.org/cis-benchmarks",
  },
  boto3: {
    title: "boto3 documentation",
    url: "https://boto3.amazonaws.com/v1/documentation/api/latest/index.html",
  },
  azureSdk: {
    title: "Azure SDK for Python overview",
    url: "https://learn.microsoft.com/en-us/azure/developer/python/sdk/azure-sdk-overview",
  },
  securityHub: {
    title: "AWS Security Hub user guide",
    url: "https://docs.aws.amazon.com/securityhub/latest/userguide/what-is-securityhub.html",
  },
  semgrep: { title: "Semgrep documentation", url: "https://semgrep.dev/docs/" },
  trivy: { title: "Trivy documentation", url: "https://trivy.dev/" },
  syft: {
    title: "Syft SBOM generator",
    url: "https://github.com/anchore/syft",
  },
  sigstore: {
    title: "Sigstore and Cosign documentation",
    url: "https://docs.sigstore.dev/",
  },
  gatekeeper: {
    title: "OPA Gatekeeper documentation",
    url: "https://open-policy-agent.github.io/gatekeeper/website/docs/",
  },
  slsa: { title: "SLSA supply-chain levels", url: "https://slsa.dev/" },
  wazuh: {
    title: "Wazuh documentation",
    url: "https://documentation.wazuh.com/current/index.html",
  },
  sigma: {
    title: "Sigma rules documentation",
    url: "https://sigmahq.io/docs/",
  },
  atomic: {
    title: "Atomic Red Team",
    url: "https://github.com/redcanaryco/atomic-red-team",
  },
  attack: { title: "MITRE ATT&CK", url: "https://attack.mitre.org/" },
} satisfies Record<string, Source>;

export const resumeProjects: Project[] = [
  // ------------------------------------------------------------------ SDE
  defineProject({
    id: "resume-raft-kv",
    title: "Raft-Replicated Key-Value Store",
    tracks: ["sde", "backend-platform-advanced"],
    variant: "resume-target",
    summary:
      "A Go key-value store replicated with Raft over gRPC, persisted in your own LSM-tree engine and proven linearizable under crashes and partitions.",
    scope:
      "Three-node cluster on one machine (Docker Compose or separate processes). Implement Raft yourself (no hashicorp/raft or etcd/raft), a write-ahead log, memtable, SSTables with compaction and Bloom filters, and Get/Put/Delete over gRPC. Membership changes are out of scope.",
    prerequisites: [
      "sk-sde-m06-distributed-systems",
      "advanced-d1-advanced-01",
    ],
    prerequisiteTags: [
      "go",
      "grpc",
      "raft",
      "lsm-tree",
      "linearizability",
      "fault-injection",
    ],
    historicalNote: resumeHistory,
    safety: [
      "Implement consensus yourself; library Raft implementations may be read for comparison but not imported.",
    ],
    sources: [s.raft, s.mit6824, s.porcupine, s.grpcGo, s.rocksdb],
    gates: [
      {
        deliverables: [
          "Create the public repo github.com/vijay-0107/raft-kv with a Go module, Makefile, CI (go test -race) and a DESIGN.md.",
          "Read Raft paper sections 5.1-5.4 and 7; write the state machine (follower/candidate/leader), RPC messages and persistence rules in DESIGN.md.",
          "Define the protobuf API (Get/Put/Delete, RequestVote, AppendEntries, InstallSnapshot) and generate Go stubs.",
          "Design the LSM engine on paper: WAL record format, memtable size limit, SSTable layout, compaction trigger, Bloom filter false-positive target.",
        ],
        acceptanceCriteria: [
          "DESIGN.md states the election-timeout range, heartbeat interval and what is fsynced before replying to a client.",
          "A fake-network test harness exists that can drop, delay and reorder messages and kill/restart nodes deterministically from a seed.",
        ],
      },
      {
        deliverables: [
          "Leader election and heartbeats, then log replication with the consistency check and commit-index advancement.",
          "Apply committed entries to the KV state machine; clients retry against the leader with request IDs so retries are not applied twice.",
          "LSM engine: WAL append and replay, memtable flush to SSTable, read path memtable -> newest SSTables, Bloom filters per SSTable.",
          "Snapshotting: compact the Raft log and send InstallSnapshot to lagging followers.",
        ],
        acceptanceCriteria: [
          "A 3-node cluster elects one leader, accepts Put/Get from a CLI client and survives killing the leader (a new leader is elected and old data is readable).",
          "After restarting every node, all acknowledged writes are still present (WAL replay plus SSTables).",
        ],
      },
      {
        deliverables: [
          "Randomized chaos tests: partitions, leader kills, message loss and restarts while concurrent clients read and write.",
          "Record every client operation's call/return times and check the history with Porcupine.",
          "Unit tests for compaction (deleted keys stay deleted, newest version wins) and Bloom filters (no false negatives).",
        ],
        acceptanceCriteria: [
          "Resume target: 1,000 seeded randomized crash/partition runs with zero linearizability violations reported by Porcupine.",
          "go test -race passes; a minority partition never commits a write.",
        ],
      },
      {
        deliverables: [
          "Benchmark: write throughput on a 3-node cluster with N concurrent clients (record CPU, disk and Go version).",
          "README architecture diagram, failure-scenario walkthrough and a short demo GIF of leader failover.",
          "Update the resume bullet with the measured writes/sec and the exact number of chaos runs passed.",
        ],
        acceptanceCriteria: [
          "Resume target: sustained 20K+ writes/sec on a 3-node cluster, or the resume number is changed to the measured value.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-collab-editor",
    title: "Real-Time Collaborative Code Editor",
    tracks: ["sde"],
    variant: "resume-target",
    summary:
      "A browser code editor where many people edit one document at once, built on your own CRDT and synced over WebSockets with Redis pub/sub between servers.",
    scope:
      "TypeScript end to end: React front end with a code-editor component, Node.js WebSocket servers (two instances behind Redis pub/sub), persistence of snapshots and update logs, presence cursors and version history. Implement the CRDT yourself (RGA or a simplified YATA); Yjs is a reference only.",
    prerequisites: ["sk-sde-m08-crdts", "advanced-d1-foundation-03"],
    prerequisiteTags: [
      "typescript",
      "react",
      "websockets",
      "crdt",
      "redis",
      "playwright",
    ],
    historicalNote: resumeHistory,
    safety: [
      "Do not collect real users' code or identities; use generated test documents and fake usernames.",
    ],
    sources: [s.crdt, s.yjs, s.websockets, s.redisPubSub, s.playwright],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/collab-editor as a pnpm/npm workspace with packages crdt, server and web; set up Jest and Playwright.",
          "Read two CRDT papers from crdt.tech and write the chosen algorithm (character IDs, tombstones, insert/delete integration) in DESIGN.md.",
          "Define the wire protocol: op messages, awareness/presence messages, snapshot request, version vector.",
        ],
        acceptanceCriteria: [
          "DESIGN.md explains why concurrent inserts at the same position converge to the same order on every replica.",
          "A property-test plan exists: random op sequences delivered in random orders must converge.",
        ],
      },
      {
        deliverables: [
          "Implement the CRDT package (insert, delete, merge, encode/decode) with no network code.",
          "Node.js WebSocket server that relays ops, persists an update log and periodically writes snapshots.",
          "Run two server instances and fan out ops between them through Redis pub/sub.",
          "React editor that applies local ops optimistically, shows remote cursors and works offline, then syncs on reconnect.",
        ],
        acceptanceCriteria: [
          "Two browser tabs connected to different server instances see each other's edits.",
          "Edits made while offline merge without loss when the tab reconnects.",
        ],
      },
      {
        deliverables: [
          "Property-based convergence tests (fast-check) over thousands of random concurrent op histories.",
          "Playwright tests with multiple browser contexts typing concurrently, plus disconnect/reconnect scenarios.",
          "Version history: list snapshots and restore an earlier version as a new edit.",
        ],
        acceptanceCriteria: [
          "Resume target: 90%+ line coverage on the crdt and server packages.",
          "All replicas reach identical text in every randomized test.",
        ],
      },
      {
        deliverables: [
          "Load test with a script that opens 50 WebSocket clients on one document and measures op-to-remote-render latency.",
          "README with architecture diagram, CRDT explanation, demo video and the measured latency table.",
          "Update the resume bullet with the measured concurrent editors and p95 latency.",
        ],
        acceptanceCriteria: [
          "Resume targets: 50 concurrent editors on one document with p95 sync latency under 100 ms on the documented machine, or the resume numbers are changed to the measured values.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-pr-review-bot",
    title: "AI Pull-Request Review Bot",
    tracks: ["sde", "ai"],
    variant: "resume-target",
    summary:
      "A GitHub App that reads pull-request diffs, understands them through syntax trees and posts useful line-level review comments generated by an LLM and filtered by static checks.",
    scope:
      "Python FastAPI webhook service, GitHub App authentication, tree-sitter parsing for Python and TypeScript, an LLM call with a structured output schema, a filter that drops comments contradicted by linters or outside changed lines, PostgreSQL for review history, and a cache keyed by diff hash.",
    prerequisites: ["sk-ai-m07-agents-mcp", "ai-m06-bounded-agents"],
    prerequisiteTags: [
      "python",
      "fastapi",
      "github-apps",
      "tree-sitter",
      "llm-apis",
      "postgresql",
    ],
    historicalNote: resumeHistory,
    safety: [
      "Install the App only on your own repositories. Never send private code from repositories you do not own to an LLM provider.",
      "Keep the App private key and LLM API key in environment variables or a secret manager, never in the repository.",
    ],
    sources: [s.githubApps, s.treeSitter, s.fastapi],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/pr-review-bot; register a GitHub App with pull_request webhook and minimal permissions (pull requests read/write, contents read).",
          "Collect a labelled set of 200 pull requests from your own or permissively licensed public repos, each with a list of issues a reviewer should flag.",
          "Define the comment JSON schema (file, line, severity, category, message) and the acceptance labelling rubric.",
        ],
        acceptanceCriteria: [
          "The labelled set and rubric are versioned in the repo with their sources and licenses.",
        ],
      },
      {
        deliverables: [
          "FastAPI webhook endpoint with signature verification and an async job queue.",
          "Parse changed hunks with tree-sitter to find enclosing functions/classes and pass that context to the LLM.",
          "Post review comments through the GitHub REST API on the exact changed lines.",
          "Store reviews in PostgreSQL and cache results by diff hash so re-pushes of the same diff are free.",
        ],
        acceptanceCriteria: [
          "Opening a PR on a test repo produces line-level comments within one minute.",
          "Re-delivering the same webhook does not create duplicate comments (idempotent by delivery ID).",
        ],
      },
      {
        deliverables: [
          "Static-check filter: run ruff/eslint on the changed files and drop LLM comments that point at unchanged lines or contradict tool output.",
          "Tests for invalid webhook signatures, LLM timeouts, malformed model output and GitHub API rate limits.",
          "Offline evaluation script that replays the 200 labelled PRs and scores precision and acceptance.",
        ],
        acceptanceCriteria: [
          "Malformed LLM output never reaches GitHub; it is rejected by schema validation and logged.",
        ],
      },
      {
        deliverables: [
          "Report comment acceptance rate on the 200 labelled PRs and token cost with and without the cache.",
          "README with setup, permissions explained, architecture diagram and example screenshots.",
          "Update the resume bullet with measured acceptance and cost reduction.",
        ],
        acceptanceCriteria: [
          "Resume targets: 70%+ comment acceptance on 200 labelled PRs and about half the token cost with caching, or the resume numbers are changed to the measured values.",
        ],
      },
    ],
  }),

  // ------------------------------------------------------------------ ML ENGINEER
  defineProject({
    id: "resume-two-tower-recsys",
    title: "Two-Stage Movie Recommender",
    tracks: ["ai"],
    variant: "resume-target",
    summary:
      "A production-style recommender: a two-tower PyTorch model retrieves candidates with FAISS and a LightGBM ranker re-orders them, served by FastAPI.",
    scope:
      "MovieLens-25M, time-based train/validation/test split, popularity and matrix-factorization baselines, two-tower retrieval with in-batch negatives, FAISS index, LightGBM lambdarank re-ranker with user/item/context features, and a FastAPI /recommend endpoint in Docker.",
    prerequisites: ["sk-ai-m05-recsys", "ai-m02-classical-ml"],
    prerequisiteTags: [
      "pytorch",
      "faiss",
      "lightgbm",
      "ranking-metrics",
      "fastapi",
      "docker",
    ],
    historicalNote: resumeHistory,
    safety: [
      "Follow the MovieLens license: do not redistribute the dataset in the repository.",
    ],
    sources: [s.movielens, s.faiss, s.lightgbm, s.fastapi],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/two-tower-recsys with a download script (not the data), environment file and Makefile.",
          "Time-based split: train on earlier ratings, evaluate on each user's later interactions; document leakage rules.",
          "Implement Recall@K and NDCG@K and compute a popularity baseline and an ALS/matrix-factorization baseline.",
        ],
        acceptanceCriteria: [
          "Baseline NDCG@10 and Recall@50 on the test split are recorded in a results table.",
        ],
      },
      {
        deliverables: [
          "Two-tower model in PyTorch (user tower: history embedding; item tower: genres, tags, year) trained with in-batch negatives.",
          "Export item embeddings and build a FAISS IVF or HNSW index; retrieve top-200 candidates per user.",
          "Train a LightGBM lambdarank re-ranker on candidate features and output the final top-10.",
          "FastAPI /recommend endpoint that loads the index and ranker once at startup.",
        ],
        acceptanceCriteria: [
          "The endpoint returns 10 movies for any known user and a popularity fallback for unknown users.",
        ],
      },
      {
        deliverables: [
          "Tests for leakage (no test-period interactions in features), cold-start users and empty candidate sets.",
          "Ablation: retrieval only vs. retrieval + ranker; ANN recall vs. exact search.",
        ],
        acceptanceCriteria: [
          "Resume target: NDCG@10 at least 25% above the popularity baseline on the test split, or the resume number is changed to the measured lift.",
        ],
      },
      {
        deliverables: [
          "Latency benchmark of /recommend with batched embedding lookups (record CPU, batch size, index type).",
          "README with architecture diagram, metric table, ablation and how to reproduce.",
          "Update the resume bullet with the measured NDCG lift and p95 latency.",
        ],
        acceptanceCriteria: [
          "Resume target: p95 latency under 50 ms for top-10 results, or the resume number is changed to the measured value.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-fraud-mlops",
    title: "Fraud Detection MLOps Pipeline",
    tracks: ["ai", "data"],
    variant: "resume-target",
    summary:
      "An end-to-end MLOps pipeline for card-fraud detection with a feature store, experiment tracking, scheduled retraining, drift monitoring and gated model promotion on Kubernetes.",
    scope:
      "IEEE-CIS transactions (590K training rows), Feast offline/online features with point-in-time joins, XGBoost model tracked in MLflow, Airflow DAGs for training and batch scoring, Evidently drift reports, and a shadow deployment on a local kind cluster before promotion.",
    prerequisites: ["sk-ai-m08-mlops", "ai-m07-mlops-serving"],
    prerequisiteTags: [
      "xgboost",
      "feast",
      "mlflow",
      "airflow",
      "evidently",
      "kubernetes",
    ],
    historicalNote: resumeHistory,
    safety: [
      "Use the public competition dataset only; do not publish raw rows. Fraud scores are research outputs, not decisions about real people.",
    ],
    sources: [s.ieeeCis, s.feast, s.mlflow, s.airflow, s.evidently],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/fraud-mlops with docker-compose for Postgres, MLflow, Airflow and Redis (Feast online store).",
          "Time-ordered split by TransactionDT; define features (amount stats, card/email aggregates, velocity windows) as Feast feature views.",
          "Write a leakage checklist: every feature must be computable from data before the transaction time.",
        ],
        acceptanceCriteria: [
          "A point-in-time join test proves no feature uses information after the event timestamp.",
        ],
      },
      {
        deliverables: [
          "Training DAG: materialize features, train XGBoost, log params/metrics/artifacts to MLflow, register the model.",
          "Scoring service (FastAPI) reading online features from Feast and the 'Production' model from the MLflow registry.",
          "Deploy the scoring service to a local kind cluster with a Helm chart.",
        ],
        acceptanceCriteria: [
          "One command trains, registers and deploys a model; the service scores a transaction ID end to end.",
        ],
      },
      {
        deliverables: [
          "Evidently drift job comparing the latest window to training data; on threshold breach, trigger the retraining DAG.",
          "Shadow deployment: new model scores alongside production and is promoted only if it beats it on recent labelled data.",
          "Tests for missing features, schema changes and a model that fails the promotion gate.",
        ],
        acceptanceCriteria: [
          "Resume target: ROC-AUC of 0.92 or higher on the time-ordered holdout, or the resume number is changed to the measured value.",
          "A simulated drift (shifted amount distribution) triggers retraining and the run is visible in MLflow.",
        ],
      },
      {
        deliverables: [
          "Report: AUC, precision at a fixed alert budget, drift-to-retrain timeline, promotion decisions.",
          "README with architecture diagram, DAG screenshots and reproduction steps.",
          "Update the resume bullet with measured AUC and the exact training row count.",
        ],
        acceptanceCriteria: [
          "Every number on the resume bullet appears in the recorded report.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-ticket-lora",
    title: "Support-Ticket Classifier with LoRA",
    tracks: ["ai"],
    variant: "resume-target",
    summary:
      "Compares a fine-tuned DistilBERT with a LoRA-adapted ~1B-parameter LLM for classifying support tickets, then quantizes the winner to INT8 ONNX for fast CPU inference.",
    scope:
      "A public, permissively licensed support-ticket intent dataset; stratified splits; DistilBERT full fine-tune; LoRA on a ~1B open-weight model (free Colab/Kaggle GPU is enough); macro-F1, latency and cost comparison; ONNX export and dynamic INT8 quantization.",
    prerequisites: ["sk-ai-m04-nlp-transformers", "ai-m04-nlp-transformers"],
    prerequisiteTags: [
      "transformers",
      "peft-lora",
      "pytorch",
      "onnx-runtime",
      "evaluation",
    ],
    historicalNote: resumeHistory,
    safety: [
      "Check the dataset and model licenses before use and record them in the repo; accept any model license yourself.",
    ],
    sources: [s.transformers, s.peft, s.onnxQuant],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/ticket-lora; choose a public ticket/intent dataset and record its license.",
          "Stratified train/validation/test split with a fixed seed; label-distribution table.",
          "TF-IDF + logistic regression baseline with macro-F1 per class.",
        ],
        acceptanceCriteria: [
          "Baseline macro-F1 and confusion matrix are recorded.",
        ],
      },
      {
        deliverables: [
          "Fine-tune DistilBERT with the Trainer API; early stopping on validation macro-F1.",
          "LoRA fine-tune of a ~1B model as a sequence classifier with PEFT (record rank, alpha, target modules).",
          "Comparison table: macro-F1, training time, GPU memory, CPU inference latency.",
        ],
        acceptanceCriteria: [
          "Both models beat the TF-IDF baseline on the test split.",
        ],
      },
      {
        deliverables: [
          "Export the best model to ONNX and apply dynamic INT8 quantization with ONNX Runtime.",
          "Tests that FP32 and INT8 predictions agree on a fixed sample and that tokenization matches training.",
          "Per-class error analysis with example misclassifications.",
        ],
        acceptanceCriteria: [
          "Resume target: INT8 model is about 3x faster on CPU with under 1 point macro-F1 loss, or the resume numbers are changed to the measured values.",
        ],
      },
      {
        deliverables: [
          "Latency benchmark script (batch 1 and batch 16, documented CPU).",
          "README with results table, error analysis and model card.",
          "Update the resume bullet with the measured speed-up and F1 change.",
        ],
        acceptanceCriteria: [
          "The model card lists data source, license, intended use and limitations.",
        ],
      },
    ],
  }),

  // ------------------------------------------------------------------ AI ENGINEER
  defineProject({
    id: "resume-filings-rag",
    title: "Agentic RAG over Annual Reports",
    tracks: ["ai"],
    variant: "resume-target",
    summary:
      "Answers questions about company annual reports with page-level citations, using hybrid BM25 + vector search, re-ranking and a LangGraph agent, and gates every change on an evaluation suite in CI.",
    scope:
      "500+ public annual reports (SEC 10-K or NSE annual reports), PDF parsing and chunking, PostgreSQL with pgvector plus full-text search, cross-encoder re-ranking, a LangGraph agent that rewrites queries and decides when to retrieve again, FastAPI API, and a 300-question evaluation set.",
    prerequisites: ["sk-ai-m06-llm-apps", "ai-m05-rag-adaptation"],
    prerequisiteTags: [
      "langgraph",
      "pgvector",
      "bm25",
      "reranking",
      "ragas",
      "fastapi",
    ],
    historicalNote: resumeHistory,
    safety: [
      "Use public filings only, respect the publisher's rate limits and send an identifying User-Agent when downloading.",
      "Answers are not investment advice; the UI must say so.",
    ],
    sources: [s.edgar, s.pgvector, s.langgraph, s.ragas],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/filings-rag; write a rate-limited downloader for 500+ annual reports.",
          "PDF/HTML parsing that keeps page numbers; chunking strategy (section-aware, ~500 tokens, overlap) documented.",
          "Write the 300-question evaluation set with gold answers and gold page citations (numeric, comparative and 'not in the document' questions).",
        ],
        acceptanceCriteria: [
          "Every evaluation question has a source document and page reference.",
        ],
      },
      {
        deliverables: [
          "Index chunks in PostgreSQL: pgvector embeddings plus tsvector full-text; hybrid score with reciprocal rank fusion.",
          "Cross-encoder re-ranker over the top 50.",
          "LangGraph agent: query rewrite -> retrieve -> grade relevance -> answer with citations, or retrieve again (bounded loop).",
          "FastAPI /ask endpoint returning the answer plus cited document/page snippets.",
        ],
        acceptanceCriteria: [
          "Answers always include citations, and the agent says 'not found' when evidence is missing.",
        ],
      },
      {
        deliverables: [
          "RAGAS (faithfulness, context recall) plus an LLM-as-judge citation check over all 300 questions.",
          "GitHub Actions job that runs the evaluation on a sampled subset and fails if scores drop below thresholds.",
          "Ablations: vector-only vs. hybrid vs. hybrid + re-ranker.",
        ],
        acceptanceCriteria: [
          "Resume target: 90%+ citation accuracy on the evaluation set, or the resume number is changed to the measured value.",
        ],
      },
      {
        deliverables: [
          "Report with ablation table, cost per query and latency.",
          "README with architecture diagram, demo and how to add new filings.",
          "Update the resume bullet with measured numbers (documents indexed, question count, citation accuracy).",
        ],
        acceptanceCriteria: [
          "CI badge shows the evaluation job passing on main.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-sql-agent",
    title: "Text-to-SQL Data Analyst Agent",
    tracks: ["ai", "data"],
    variant: "resume-target",
    summary:
      "A tool-calling agent that plans, writes, validates and self-corrects SQL over DuckDB/PostgreSQL, exposed as an MCP server so Claude and IDE clients can use it safely.",
    scope:
      "LangGraph agent with tools list_tables, describe_table, run_sql and explain; sqlglot parsing to enforce SELECT-only queries and table allowlists; read-only database role; row and time limits; MCP server wrapper; evaluation on 500 Spider dev queries.",
    prerequisites: ["sk-ai-m07-agents-mcp", "ai-m06-bounded-agents"],
    prerequisiteTags: [
      "langgraph",
      "mcp",
      "sqlglot",
      "duckdb",
      "postgresql",
      "evaluation",
    ],
    historicalNote: resumeHistory,
    safety: [
      "The agent must never run write statements: enforce this with a read-only database role, not only with prompts.",
    ],
    sources: [s.mcp, s.sqlglot, s.spider, s.langgraph, s.duckdb],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/sql-agent; load Spider databases into DuckDB/SQLite and pick a 500-query dev subset.",
          "Define tool schemas and the guardrail policy (allowed statements, tables, max rows, timeout).",
          "Execution-accuracy scorer: compare result sets of gold and predicted SQL.",
        ],
        acceptanceCriteria: [
          "The scorer is tested on known-equal and known-different query pairs.",
        ],
      },
      {
        deliverables: [
          "LangGraph agent: inspect schema -> draft SQL -> validate with sqlglot -> run -> on error, read the message and fix (max 3 attempts).",
          "Read-only connection role, statement timeout and row cap enforced by the database.",
          "MCP server exposing the agent's tools; connect it to Claude Desktop or an IDE client and record a demo.",
        ],
        acceptanceCriteria: [
          "DROP/UPDATE/INSERT attempts are rejected before execution and also fail at the database role.",
        ],
      },
      {
        deliverables: [
          "Prompt-injection tests (instructions hidden in table data and column comments) and a test suite of malicious SQL.",
          "Run the 500-query evaluation; break down errors by type (schema linking, joins, aggregation).",
        ],
        acceptanceCriteria: [
          "Resume target: 80%+ execution accuracy on the 500-query Spider subset, or the resume number is changed to the measured value.",
        ],
      },
      {
        deliverables: [
          "README with MCP setup instructions, guardrail design and error analysis.",
          "Update the resume bullet with measured accuracy and query count.",
        ],
        acceptanceCriteria: ["All guardrail tests pass in CI."],
      },
    ],
  }),
  defineProject({
    id: "resume-llm-gateway",
    title: "LLM Inference Gateway",
    tracks: ["ai", "ai-systems-advanced"],
    variant: "resume-target",
    summary:
      "An OpenAI-compatible gateway that routes requests between hosted LLM APIs and a self-hosted vLLM model by cost, latency and task, with semantic caching, budgets, tracing and prompt-injection screening.",
    scope:
      "FastAPI service implementing /v1/chat/completions, routing policy, retries and fallbacks, per-team token budgets in Redis, semantic cache (embedding similarity threshold), OpenTelemetry traces and Prometheus metrics, input screening against the OWASP LLM Top 10. vLLM runs a small open model locally or on a rented GPU.",
    prerequisites: [
      "sk-ai-m10-serving-optimisation",
      "advanced-d2-foundation-03",
    ],
    prerequisiteTags: [
      "fastapi",
      "vllm",
      "redis",
      "opentelemetry",
      "prometheus",
      "llm-security",
    ],
    historicalNote: resumeHistory,
    safety: [
      "Keep provider API keys out of the repo; set provider spending limits before load tests.",
    ],
    sources: [s.vllm, s.otel, s.prometheus, s.owaspLlm, s.fastapi],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/llm-gateway; define the OpenAI-compatible request/response schema and routing policy file.",
          "Build a replayable workload: 1,000 prompts with realistic repetition (paraphrases) and task labels.",
        ],
        acceptanceCriteria: [
          "The workload file and its repetition rate are documented.",
        ],
      },
      {
        deliverables: [
          "Gateway with provider adapters (one hosted API, one vLLM), retries with backoff and fallback order.",
          "Per-team API keys and token budgets enforced in Redis.",
          "Semantic cache: embed prompts, return cached answers above a similarity threshold, with TTL.",
          "OpenTelemetry tracing of every call and Prometheus metrics (latency, tokens, cost, cache hits).",
        ],
        acceptanceCriteria: [
          "Killing the vLLM server mid-run causes fallback with no failed client requests.",
        ],
      },
      {
        deliverables: [
          "Prompt-injection and data-leak screening on inputs/outputs with tests from the OWASP LLM Top 10.",
          "Tests: budget exhaustion returns 429, cache never serves another team's answer, timeouts are bounded.",
        ],
        acceptanceCriteria: [
          "Cache entries are scoped by team; a cross-team leak test fails if scoping is removed.",
        ],
      },
      {
        deliverables: [
          "Replay the workload with and without the cache; report cost, latency and hit rate.",
          "Grafana dashboard screenshot and README with architecture diagram.",
          "Update the resume bullet with the measured cost reduction.",
        ],
        acceptanceCriteria: [
          "Resume target: about 40% lower repeat-query cost with semantic caching, or the resume number is changed to the measured value.",
        ],
      },
    ],
  }),

  // ------------------------------------------------------------------ DATA ENGINEER
  defineProject({
    id: "resume-clickstream-lakehouse",
    title: "Real-Time Clickstream Lakehouse",
    tracks: ["data", "data-platform-advanced"],
    variant: "resume-target",
    summary:
      "Streams e-commerce click events from Kafka into Apache Iceberg bronze/silver/gold tables with Spark Structured Streaming, orchestrated by Airflow and queried with Trino.",
    scope:
      "Docker Compose stack: Kafka, a Python event generator, Spark Structured Streaming, Iceberg on MinIO (S3-compatible) with a REST or JDBC catalog, Airflow for compaction/maintenance jobs, Trino for queries. Includes late and duplicate events by design.",
    prerequisites: ["sk-data-m06-streaming", "advanced-d4-intermediate-03"],
    prerequisiteTags: [
      "kafka",
      "spark-structured-streaming",
      "iceberg",
      "airflow",
      "trino",
      "minio",
    ],
    historicalNote: resumeHistory,
    safety: ["Generate synthetic events only; no real user tracking data."],
    sources: [s.kafka, s.sparkStreaming, s.iceberg, s.trino, s.airflow],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/clickstream-lakehouse with docker-compose for every service.",
          "Event generator with a schema (event_id, user_id, session_id, event_type, ts) that emits late (up to 10 min) and duplicate events at configurable rates.",
          "Design bronze (raw), silver (deduplicated, typed) and gold (sessions, funnels, hourly KPIs) tables and their partitioning.",
        ],
        acceptanceCriteria: [
          "An expected-output oracle exists for a small fixed-seed event file.",
        ],
      },
      {
        deliverables: [
          "Spark job Kafka -> bronze Iceberg with checkpoints.",
          "Silver job with watermark and dropDuplicates on event_id; gold session/funnel aggregates.",
          "Trino catalog configured to query all three layers.",
        ],
        acceptanceCriteria: [
          "Gold tables match the oracle for the fixed-seed input.",
        ],
      },
      {
        deliverables: [
          "Kill and restart the streaming job mid-run; prove exactly-once results via checkpoints and idempotent writes.",
          "Late-event tests (inside and outside the watermark) and duplicate-event tests.",
          "Airflow DAG for Iceberg maintenance: rewrite_data_files (compaction), expire_snapshots.",
        ],
        acceptanceCriteria: [
          "No duplicate or missing rows in silver after a forced restart.",
        ],
      },
      {
        deliverables: [
          "Throughput and end-to-end latency measurement (event time -> visible in gold) at a stated events/hour rate.",
          "Trino query time before and after compaction and hourly partitioning.",
          "README with diagram, runbook and the measured numbers; update the resume bullet.",
        ],
        acceptanceCriteria: [
          "Resume targets: 1M+ events/hour with end-to-end latency under 60 s and about 5x faster Trino queries after compaction, or the resume numbers are changed to the measured values.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-cdc-scd2",
    title: "CDC Pipeline with SCD Type 2",
    tracks: ["data"],
    variant: "resume-target",
    summary:
      "Captures every insert, update and delete from PostgreSQL with Debezium and Kafka Connect and maintains history-preserving SCD Type 2 dimensions in Delta Lake, guarded by data-quality checks.",
    scope:
      "PostgreSQL source with logical replication, Debezium connector, Kafka, a PySpark MERGE job writing Delta Lake SCD2 tables (valid_from, valid_to, is_current), schema-evolution handling, Great Expectations suites, quarantine table and reconciliation report.",
    prerequisites: ["sk-data-m08-cdc", "data-m06"],
    prerequisiteTags: [
      "debezium",
      "kafka-connect",
      "delta-lake",
      "pyspark",
      "great-expectations",
      "scd2",
    ],
    historicalNote: resumeHistory,
    safety: ["Use generated customer/product data; no real personal data."],
    sources: [s.debezium, s.delta, s.gx, s.kafka],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/cdc-scd2 with docker-compose (Postgres with wal_level=logical, Kafka, Connect, Spark).",
          "Source schema (customers, products) and a mutation generator that inserts, updates, deletes and adds a column mid-run.",
          "Write the SCD2 rules (which columns create a new version, how deletes close a version).",
        ],
        acceptanceCriteria: [
          "A hand-computed SCD2 expected table exists for a short mutation script.",
        ],
      },
      {
        deliverables: [
          "Debezium connector config; topics per table with keys.",
          "PySpark job that orders change events per key and MERGEs into Delta SCD2 tables.",
          "Automatic handling of the added column (schema evolution) without dropping history.",
        ],
        acceptanceCriteria: [
          "The Delta table equals the hand-computed expected table for the short script.",
        ],
      },
      {
        deliverables: [
          "Great Expectations suites (40+ checks): keys unique per version, no overlapping validity windows, not-null rules, referential checks.",
          "Quarantine table for failing records with the reason; job continues for good records.",
          "Tests for out-of-order events, connector restart and replaying the same events twice.",
        ],
        acceptanceCriteria: [
          "Replaying all events produces an identical target (idempotent MERGE).",
        ],
      },
      {
        deliverables: [
          "Reconciliation report: source row count vs. current SCD2 rows per run.",
          "README with diagram and failure runbook; update the resume bullet.",
        ],
        acceptanceCriteria: [
          "Resume targets: 40+ data-quality checks per run and 100% source-row reconciliation, or the resume numbers are changed to the measured values.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-nyc-taxi-dbt",
    title: "Analytics Engineering on 1B+ Rows",
    tracks: ["data"],
    variant: "resume-target",
    summary:
      "Models over a billion NYC taxi trips into a tested star schema with incremental dbt models, Dagster orchestration and column-level lineage.",
    scope:
      "NYC TLC parquet files loaded to DuckDB (free) and optionally Snowflake (trial); dbt staging -> intermediate -> marts (fct_trips, dim_zone, dim_date, dim_vendor), incremental models, semantic metrics, 100+ tests, Dagster assets and OpenLineage events.",
    prerequisites: ["sk-data-m05-dbt", "data-m04"],
    prerequisiteTags: [
      "dbt",
      "duckdb",
      "snowflake",
      "dagster",
      "openlineage",
      "dimensional-modeling",
    ],
    historicalNote: resumeHistory,
    safety: [
      "Snowflake is optional; a trial expires and continued use costs money. Every required step must also run on DuckDB.",
    ],
    sources: [s.tlc, s.dbt, s.dagster, s.openlineage, s.duckdb],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/nyc-taxi-dbt; download script for yellow/green trip parquet files across years.",
          "Star-schema design (grain of fct_trips, conformed dimensions) and metric definitions (trips, revenue, average fare, tip rate).",
        ],
        acceptanceCriteria: [
          "Row counts per source file are recorded so the total is verifiably above 1B.",
        ],
      },
      {
        deliverables: [
          "dbt project with sources, staging, intermediate and mart models; incremental fct_trips by pickup month.",
          "Dagster assets wrapping dbt models with daily partitions.",
          "OpenLineage emitter producing dataset and column lineage.",
        ],
        acceptanceCriteria: [
          "A full build completes on DuckDB from a clean checkout.",
        ],
      },
      {
        deliverables: [
          "100+ dbt tests: unique/not_null/relationships, accepted ranges, custom tests for negative fares and impossible durations.",
          "CI job (GitHub Actions) that builds and tests on a sampled month.",
        ],
        acceptanceCriteria: [
          "Bad source rows are flagged by tests, not silently dropped.",
        ],
      },
      {
        deliverables: [
          "Compare full-refresh vs. incremental build time and scanned data; add clustering/partitioning and re-measure.",
          "README with lineage graph, dbt docs link and results; update the resume bullet.",
        ],
        acceptanceCriteria: [
          "Resume target: about 50% lower compute with incremental builds and clustering, or the resume number is changed to the measured value.",
        ],
      },
    ],
  }),

  // ------------------------------------------------------------------ QUANT DEVELOPER
  defineProject({
    id: "resume-lob-engine",
    title: "Low-Latency Order Matching Engine",
    tracks: ["quant", "quant-infrastructure-advanced"],
    variant: "resume-target",
    summary:
      "A C++20 limit order book and matching engine with price-time priority, preallocated memory and a lock-free market-data feed, benchmarked to millions of orders per second.",
    scope:
      "Single-instrument book supporting limit, market, IOC and cancel; intrusive linked lists per price level; object pools (no heap allocation on the hot path); SPSC ring buffer from feed thread to matching thread; deterministic replay from a recorded order file; Google Benchmark and perf profiling.",
    prerequisites: ["sk-quant-m07-low-latency", "advanced-d5-advanced-01"],
    prerequisiteTags: [
      "cpp20",
      "data-structures",
      "lock-free",
      "benchmarking",
      "perf",
    ],
    historicalNote: resumeHistory,
    safety: [noRealMoney],
    sources: [s.matching, s.spsc, s.gbench, s.perf],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/lob-engine with CMake, sanitizer builds (ASan/UBSan/TSan) and Catch2 or GoogleTest.",
          "Specify matching rules (price-time priority, partial fills, IOC remainder cancel, self-trade handling) with worked examples.",
          "Order-file generator with a fixed seed and a slow reference matcher (std::map based) as the oracle.",
        ],
        acceptanceCriteria: [
          "The reference matcher's trades for the sample file are checked by hand for 20 orders.",
        ],
      },
      {
        deliverables: [
          "Fast book: price levels in arrays or a flat map, intrusive FIFO lists, order-ID hash for O(1) cancel, memory pools.",
          "Lock-free SPSC ring buffer (acquire/release atomics, cache-line padding) feeding the matching thread.",
          "Trade and book-update output stream.",
        ],
        acceptanceCriteria: [
          "For 10M seeded orders, the fast engine's trades equal the reference matcher's trades exactly.",
        ],
      },
      {
        deliverables: [
          "Edge-case tests: crossing at multiple levels, cancel of partially filled orders, empty book market orders.",
          "TSan run of the SPSC queue under stress; fuzz test comparing engines on random order streams.",
        ],
        acceptanceCriteria: [
          "No sanitizer findings and no divergence in fuzzing.",
        ],
      },
      {
        deliverables: [
          "Google Benchmark for add/cancel/match; latency histogram (median, p99) measured with rdtsc or steady_clock.",
          "perf stat/record profile showing cache misses before and after optimization.",
          "README with design notes, results on the documented CPU, and the updated resume bullet.",
        ],
        acceptanceCriteria: [
          "Resume targets: 5M+ orders/sec single-threaded at sub-microsecond median latency, or the resume numbers are changed to the measured values.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-nse-backtester",
    title: "Event-Driven Backtesting Engine",
    tracks: ["quant"],
    variant: "resume-target",
    summary:
      "An event-driven backtester for NSE equities that tests momentum and cointegration pairs strategies honestly: costs, slippage, walk-forward validation and no look-ahead or survivorship bias.",
    scope:
      "10 years of NSE daily data; event loop (market data -> strategy -> orders -> simulated fills -> portfolio); Indian cost model (brokerage, STT, exchange fees, GST, stamp duty); walk-forward parameter selection; Numba-accelerated indicators; Plotly tear sheet.",
    prerequisites: ["sk-quant-m05-backtesting", "quant-m05-honest-backtesting"],
    prerequisiteTags: [
      "python",
      "pandas",
      "numba",
      "statistics",
      "cointegration",
      "backtesting",
    ],
    historicalNote: resumeHistory,
    safety: [noRealMoney],
    sources: [s.nseReports, s.numba, s.coint],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/nse-backtester; data loader that stores daily bars with corporate-action adjustments and listing/delisting dates.",
          "Point-in-time universe (only stocks listed on each date) to avoid survivorship bias.",
          "Cost model with documented Indian charges and a slippage assumption.",
        ],
        acceptanceCriteria: [
          "A test proves the universe on a past date excludes stocks listed later.",
        ],
      },
      {
        deliverables: [
          "Event loop with strategy, broker simulator and portfolio accounting.",
          "Strategies: cross-sectional momentum and Engle-Granger cointegration pairs with z-score entry/exit.",
          "Walk-forward: choose parameters on a training window, trade the next window, roll forward.",
        ],
        acceptanceCriteria: [
          "Portfolio cash + positions reconcile to the trade log every day.",
        ],
      },
      {
        deliverables: [
          "Look-ahead tests: shifting future data must not change past signals.",
          "Numba-accelerate indicator and signal loops; verify outputs equal the pure-Python version.",
          "Sensitivity analysis: costs doubled, slippage doubled, different start dates.",
        ],
        acceptanceCriteria: [
          "Resume target: about 50x speed-up of hot loops with Numba with identical results, or the resume number is changed to the measured value.",
        ],
      },
      {
        deliverables: [
          "Tear sheet: Sharpe, max drawdown, turnover, costs paid, out-of-sample vs. in-sample results.",
          "README stating limitations plainly; update the resume bullet with the measured years of data and speed-up.",
        ],
        acceptanceCriteria: [
          "Out-of-sample results are reported even if they are worse than in-sample.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-vol-surface",
    title: "Options Pricing and Volatility Surface",
    tracks: ["quant"],
    variant: "resume-target",
    summary:
      "A pricing library with Black-Scholes, binomial and Monte Carlo pricers and Greeks, Heston calibration to NIFTY options and an arbitrage-free SVI implied-volatility surface.",
    scope:
      "C++ core exposed to Python with pybind11; Black-Scholes closed form, CRR binomial (American), Monte Carlo with antithetic and control variates; implied-volatility solver; Heston calibration; SVI fit per expiry with butterfly/calendar arbitrage checks; QuantLib as a cross-check.",
    prerequisites: ["sk-quant-m06-derivatives", "quant-m02-numerical-research"],
    prerequisiteTags: [
      "cpp",
      "pybind11",
      "stochastic-calculus",
      "numerical-methods",
      "quantlib",
    ],
    historicalNote: resumeHistory,
    safety: [noRealMoney],
    sources: [s.quantlib, s.pybind11, s.svi, s.nseReports],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/vol-surface with a CMake C++ library, pybind11 module and pytest suite.",
          "Collect end-of-day NIFTY option chains for several expiries; document the data source and cleaning rules (stale quotes, zero bids).",
          "Write the math for each pricer and Greek in docs/ with references.",
        ],
        acceptanceCriteria: [
          "Put-call parity holds on cleaned quotes within a stated tolerance.",
        ],
      },
      {
        deliverables: [
          "Black-Scholes price and Greeks; CRR binomial for European and American options.",
          "Monte Carlo pricer with antithetic variates and a control variate.",
          "Implied-volatility solver (Brent/Newton with bounds).",
        ],
        acceptanceCriteria: [
          "All pricers agree with QuantLib within tolerance on a test grid.",
        ],
      },
      {
        deliverables: [
          "Heston calibration (characteristic-function pricing) to one expiry's quotes.",
          "SVI fit per expiry with no-butterfly and no-calendar arbitrage checks.",
          "Tests for deep ITM/OTM, near-expiry and zero-volatility edge cases.",
        ],
        acceptanceCriteria: [
          "The fitted surface passes the arbitrage checks on every expiry.",
        ],
      },
      {
        deliverables: [
          "Measure Monte Carlo standard error with and without variance reduction at equal path counts.",
          "3D surface plot and calibration error table in the README; update the resume bullet.",
        ],
        acceptanceCriteria: [
          "Resume target: about 4x lower Monte Carlo error with control variates, or the resume number is changed to the measured value.",
        ],
      },
    ],
  }),

  // ------------------------------------------------------------------ BACKEND
  defineProject({
    id: "resume-payments-ledger",
    title: "Double-Entry Payments Ledger",
    tracks: ["sde", "backend-platform-advanced"],
    variant: "resume-target",
    summary:
      "A Spring Boot payments ledger with double-entry accounting, idempotent APIs, optimistic locking and a transactional outbox that publishes events to Kafka, load tested with k6.",
    scope:
      "Java 21, Spring Boot, PostgreSQL, Kafka. Accounts, append-only journal entries (each transfer = balanced debit and credit), idempotency keys on POST /transfers, optimistic locking on balances, outbox table relayed to Kafka, reconciliation job, k6 load tests in Docker Compose.",
    prerequisites: [
      "sk-be-m07-reliable-transactions",
      "sde-m02-transactional-apis",
    ],
    prerequisiteTags: [
      "java",
      "spring-boot",
      "postgresql",
      "kafka",
      "idempotency",
      "k6",
    ],
    historicalNote: resumeHistory,
    safety: ["Simulated money only; never process real payment credentials."],
    sources: [s.springBoot, s.outbox, s.idempotency, s.k6, s.pgLocking],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/payments-ledger (Gradle or Maven, Testcontainers, docker-compose).",
          "Schema: accounts, journal_entries, postings, idempotency_keys, outbox; invariants written down (sum of postings per entry = 0, balances never negative unless allowed).",
          "OpenAPI spec for create account, transfer, get balance, list history.",
        ],
        acceptanceCriteria: [
          "Every invariant has a matching SQL check or test listed in DESIGN.md.",
        ],
      },
      {
        deliverables: [
          "Transfer endpoint: validate, insert balanced postings and update balances in one transaction with optimistic locking and retry.",
          "Idempotency: same key + same body returns the original result; same key + different body returns 409.",
          "Outbox relay publishing TransferCompleted events to Kafka at least once; consumers dedupe by event ID.",
        ],
        acceptanceCriteria: [
          "Integration tests with Testcontainers pass for transfer, retry and duplicate requests.",
        ],
      },
      {
        deliverables: [
          "Concurrency tests: thousands of parallel transfers between a few hot accounts.",
          "Crash tests: kill the app between commit and publish; the outbox still delivers the event.",
          "Reconciliation job that recomputes balances from postings and compares.",
        ],
        acceptanceCriteria: [
          "Resume target: zero balance drift across 10M randomized transfers and replays, or the resume number is changed to the count actually run.",
        ],
      },
      {
        deliverables: [
          "k6 load test with documented hardware; p95 latency and throughput report.",
          "README with sequence diagrams for transfer and outbox; update the resume bullet.",
        ],
        acceptanceCriteria: [
          "Resume target: 2K+ transfers/sec in k6, or the resume number is changed to the measured value.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-go-scheduler",
    title: "Distributed Job Scheduler",
    tracks: ["backend-platform-advanced"],
    variant: "resume-target",
    summary:
      "A Go job scheduler with cron and one-off jobs, at-least-once execution, retries with exponential backoff, dead-letter queues and leader election through PostgreSQL advisory locks.",
    scope:
      "Go services: API (gRPC + REST gateway), scheduler (single active leader via pg advisory lock), workers pulling jobs with SELECT ... FOR UPDATE SKIP LOCKED, visibility timeouts and heartbeats, retries and DLQ, Prometheus metrics and Grafana dashboard.",
    prerequisites: ["sk-be-m08-background-jobs", "advanced-d1-intermediate-02"],
    prerequisiteTags: [
      "go",
      "postgresql",
      "grpc",
      "redis",
      "prometheus",
      "concurrency",
    ],
    historicalNote: resumeHistory,
    safety: [
      "Jobs in demos run sandboxed commands you wrote; do not execute arbitrary user-supplied code.",
    ],
    sources: [s.pgSkipLocked, s.pgLocking, s.grpcGo, s.prometheus],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/go-scheduler; jobs table design (state machine: scheduled, running, succeeded, failed, dead).",
          "Write delivery semantics (at-least-once), idempotency guidance for handlers and the retry/backoff formula.",
        ],
        acceptanceCriteria: [
          "The state machine diagram lists every allowed transition.",
        ],
      },
      {
        deliverables: [
          "API to create/cancel/list jobs including cron expressions.",
          "Scheduler loop with leader election via pg_try_advisory_lock; enqueues due cron runs exactly once per tick.",
          "Workers claiming jobs with SKIP LOCKED, heartbeating, and releasing expired leases.",
        ],
        acceptanceCriteria: [
          "Two scheduler replicas never enqueue the same cron run twice.",
        ],
      },
      {
        deliverables: [
          "Fault tests: kill a worker mid-job (job is retried), kill the leader (another takes over), database restart.",
          "Retry with exponential backoff and jitter; move to dead-letter after max attempts.",
        ],
        acceptanceCriteria: [
          "No job is lost or permanently stuck in 'running' after any fault test.",
        ],
      },
      {
        deliverables: [
          "Load test dispatching jobs across 8 workers; Grafana dashboard for queue depth, latency and failures.",
          "README with diagrams and runbook; update the resume bullet.",
        ],
        acceptanceCriteria: [
          "Resume target: 10K jobs/min across 8 workers, or the resume number is changed to the measured value.",
        ],
      },
    ],
  }),

  // ------------------------------------------------------------------ CLOUD & AI INFRA
  defineProject({
    id: "resume-eks-gitops-platform",
    title: "GitOps Kubernetes Platform",
    tracks: ["backend-platform-advanced"],
    variant: "resume-target",
    summary:
      "Dev, staging and prod Amazon EKS clusters provisioned with modular Terraform, deployed through Argo CD and Helm, autoscaled with Karpenter spot nodes and monitored with Prometheus and Grafana.",
    scope:
      "Terraform modules (VPC, EKS, IAM roles for service accounts) with remote state; Argo CD app-of-apps; a sample microservice Helm chart; Karpenter NodePools using spot; kube-prometheus-stack with SLO dashboards and alerts. Start on kind locally, then EKS for measurement sessions only.",
    prerequisites: ["sk-cloud-m04-kubernetes", "advanced-d1-intermediate-03"],
    prerequisiteTags: [
      "aws",
      "eks",
      "terraform",
      "argo-cd",
      "helm",
      "karpenter",
      "prometheus",
    ],
    historicalNote: resumeHistory,
    safety: [cloudCost],
    sources: [s.eks, s.terraform, s.argocd, s.karpenter, s.helm, s.prometheus],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/eks-gitops-platform with terraform/, gitops/ and charts/ directories.",
          "Set an AWS billing alarm and budget; write the teardown procedure first.",
          "Run the full GitOps flow on a local kind cluster (Argo CD + Helm chart) before touching AWS.",
        ],
        acceptanceCriteria: [
          "A merge to main changes the running app on kind without manual kubectl.",
        ],
      },
      {
        deliverables: [
          "Terraform modules for VPC, EKS and IRSA with S3 + DynamoDB remote state; separate dev/staging/prod workspaces or folders.",
          "Argo CD app-of-apps deploying platform add-ons and the sample service per environment.",
          "Karpenter with spot and on-demand NodePools and consolidation enabled.",
        ],
        acceptanceCriteria: [
          "terraform plan is clean after apply; destroy removes everything.",
        ],
      },
      {
        deliverables: [
          "Policy checks in CI: terraform validate/tflint/tfsec and helm lint.",
          "Failure drills: delete a node, interrupt a spot instance, roll back a bad release in Argo CD.",
        ],
        acceptanceCriteria: [
          "A bad image tag is rolled back by reverting the Git commit.",
        ],
      },
      {
        deliverables: [
          "Cost comparison: same load on on-demand managed nodes vs. Karpenter spot (use AWS Cost Explorer or kubecost).",
          "SLO dashboard and alert screenshots; README with architecture diagram; update the resume bullet.",
        ],
        acceptanceCriteria: [
          "Resume target: about 40% lower node cost with Karpenter spot, or the resume number is changed to the measured value.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-llm-serving-k8s",
    title: "GPU LLM Serving on Kubernetes",
    tracks: ["ai-systems-advanced"],
    variant: "resume-target",
    summary:
      "Serves an open-weight ~8B model with vLLM on Kubernetes GPU nodes, autoscaling with KEDA on queue depth (including scale to zero) and benchmarking throughput, latency and cost per million tokens.",
    scope:
      "One GPU node is enough (rented hourly). NVIDIA GPU Operator, vLLM deployment (or KServe InferenceService), KEDA ScaledObject on request queue length, Prometheus metrics from vLLM, Locust load tests at several concurrency levels, batching parameter sweeps.",
    prerequisites: ["sk-cloud-m10-ai-infra", "advanced-d2-intermediate-03"],
    prerequisiteTags: [
      "kubernetes",
      "vllm",
      "kserve",
      "keda",
      "gpu",
      "load-testing",
    ],
    historicalNote: resumeHistory,
    safety: [
      cloudCost,
      "Accept the model's license yourself before downloading weights; record the license in the repo.",
    ],
    sources: [s.vllm, s.kserve, s.keda, s.gpuOperator, s.locust],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/llm-serving-k8s; pick the model and record its license and size.",
          "Choose a GPU provider and budget per session; write the start/stop procedure.",
          "Locust workload with realistic prompt and output length distributions.",
        ],
        acceptanceCriteria: [
          "The workload and cost assumptions are written down before any GPU is rented.",
        ],
      },
      {
        deliverables: [
          "Cluster with GPU Operator; vLLM deployment with health checks and model cache volume.",
          "KEDA ScaledObject using a Prometheus queue-depth metric; scale to zero when idle.",
          "OpenAI-compatible endpoint exposed through an ingress.",
        ],
        acceptanceCriteria: [
          "Requests succeed after a scale-from-zero event (cold start time recorded).",
        ],
      },
      {
        deliverables: [
          "Sweep max-num-seqs / batching parameters and concurrency; record tokens/sec and p95 latency.",
          "Failure tests: kill the pod during load, out-of-memory with too-large batches.",
        ],
        acceptanceCriteria: [
          "Every measurement row lists GPU type, model, parameters and concurrency.",
        ],
      },
      {
        deliverables: [
          "Cost per 1M output tokens from the measured throughput and hourly GPU price.",
          "README with charts and the tuning conclusions; update the resume bullet.",
        ],
        acceptanceCriteria: [
          "Resume target: about 3x throughput from batching tuning, or the resume number is changed to the measured value.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-multi-region-dr",
    title: "Multi-Region Serverless Disaster Recovery",
    tracks: ["backend-platform-advanced"],
    variant: "resume-target",
    summary:
      "An active-passive serverless API across two AWS regions using DynamoDB global tables and Route 53 health-check failover, with recovery time and data loss verified by chaos drills.",
    scope:
      "Terraform for API Gateway + Lambda + DynamoDB global table in two regions, Route 53 failover records with health checks, a synthetic client that writes and reads continuously, and AWS Fault Injection Service (or scripted disabling) to fail the primary region.",
    prerequisites: [
      "sk-cloud-m09-resilience-dr",
      "advanced-d1-professional-02",
    ],
    prerequisiteTags: [
      "aws-lambda",
      "dynamodb",
      "route53",
      "terraform",
      "chaos-engineering",
    ],
    historicalNote: resumeHistory,
    safety: [cloudCost],
    sources: [s.globalTables, s.route53, s.fis, s.terraform],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/multi-region-dr; define RTO/RPO targets and how each is measured.",
          "Synthetic client that writes sequence-numbered records every 100 ms and logs every success/failure with timestamps.",
        ],
        acceptanceCriteria: [
          "The measurement method for RTO and RPO is written before the first drill.",
        ],
      },
      {
        deliverables: [
          "Terraform for both regions (Lambda, API Gateway, DynamoDB global table) and Route 53 failover with health checks.",
          "Deployment pipeline that updates both regions.",
        ],
        acceptanceCriteria: [
          "Traffic goes to the primary region in normal operation.",
        ],
      },
      {
        deliverables: [
          "Chaos drills: fail the primary health check, throttle or disable the primary Lambda, and fail back.",
          "Check for missing sequence numbers after failover to compute data loss.",
        ],
        acceptanceCriteria: [
          "Resume targets: RTO under 5 minutes and RPO under 1 second across at least 3 drills, or the resume numbers are changed to the measured values.",
        ],
      },
      {
        deliverables: [
          "Drill report with timelines; runbook for failover and failback.",
          "README with architecture diagram; update the resume bullet.",
        ],
        acceptanceCriteria: [
          "All resources are destroyed after the final drill and the bill is recorded.",
        ],
      },
    ],
  }),

  // ------------------------------------------------------------------ CLOUD SECURITY
  defineProject({
    id: "resume-cspm-scanner",
    title: "Cloud Security Posture Scanner",
    tracks: ["cloud-security-advanced"],
    variant: "resume-target",
    summary:
      "Scans AWS and Azure accounts for misconfigurations against 60+ CIS Benchmark controls, auto-remediates low-risk findings with event-driven Lambda and sends the rest to Security Hub.",
    scope:
      "Python package with a pluggable check registry (boto3, Azure SDK), checks for public storage, open security groups, IAM wildcard policies, missing encryption, logging disabled and root/MFA issues; JSON/SARIF output; EventBridge-triggered Lambda remediation for safe fixes; findings imported to Security Hub in ASFF.",
    prerequisites: [
      "sk-sec-m10-posture-compliance",
      "advanced-d3-foundation-04",
    ],
    prerequisiteTags: [
      "python",
      "boto3",
      "azure-sdk",
      "iam",
      "cis-benchmarks",
      "aws-lambda",
    ],
    historicalNote: resumeHistory,
    safety: [ownAccountsOnly, cloudCost],
    sources: [s.cis, s.boto3, s.azureSdk, s.securityHub],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/cspm-scanner; map 60+ checks to CIS control IDs with severity and remediation text.",
          "Intentionally misconfigured test environment in your own sandbox account via Terraform (and a moto-based unit test setup).",
        ],
        acceptanceCriteria: [
          "Every check has a known-bad and known-good fixture.",
        ],
      },
      {
        deliverables: [
          "Scanner CLI producing JSON and SARIF; parallel scanning across regions.",
          "Azure checks for storage public access, NSG rules and Key Vault settings.",
        ],
        acceptanceCriteria: [
          "The scanner finds every planted misconfiguration in the sandbox.",
        ],
      },
      {
        deliverables: [
          "Event-driven remediation Lambda for low-risk findings (block public S3 access, enable default encryption) with dry-run mode.",
          "Security Hub import of remaining findings in ASFF format.",
          "Tests that remediation never touches resources tagged as exempt.",
        ],
        acceptanceCriteria: [
          "Remediations are logged and reversible, and dry-run makes no changes.",
        ],
      },
      {
        deliverables: [
          "Report: checks implemented, findings in the sandbox, time to scan.",
          "README with IAM permissions required (read-only for scanning) and an update to the resume bullet.",
        ],
        acceptanceCriteria: [
          "Resume target: 60+ CIS controls implemented, or the resume number is changed to the implemented count.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-secure-supply-chain",
    title: "DevSecOps Supply-Chain Pipeline",
    tracks: ["cloud-security-advanced", "computer-security-systems"],
    variant: "resume-target",
    summary:
      "A CI pipeline that blocks insecure code and images: SAST, dependency and container scanning, SBOM generation, Sigstore image signing and Kubernetes admission control with OPA Gatekeeper.",
    scope:
      "GitHub Actions for a sample service: Semgrep, Trivy (dependencies and image), Syft SBOM, Cosign keyless signing, provenance attestation; a kind cluster with Gatekeeper constraints that reject unsigned images and images with critical CVEs.",
    prerequisites: [
      "sk-sec-m06-supply-chain",
      "security-m08-cloud-supply-chain",
    ],
    prerequisiteTags: [
      "github-actions",
      "semgrep",
      "trivy",
      "sbom",
      "cosign",
      "opa-gatekeeper",
    ],
    historicalNote: resumeHistory,
    safety: [
      "Use your own sample service and registry; do not scan other people's repositories without permission.",
    ],
    sources: [s.semgrep, s.trivy, s.syft, s.sigstore, s.gatekeeper, s.slsa],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/secure-supply-chain with a small sample service and Dockerfile.",
          "Write the policy: which severities block a merge, which block deployment, and the exception process.",
        ],
        acceptanceCriteria: [
          "The policy names the tool and threshold for each gate.",
        ],
      },
      {
        deliverables: [
          "GitHub Actions jobs: Semgrep, Trivy fs and image scans, Syft SBOM upload, Cosign signing and attestation.",
          "kind cluster with Gatekeeper (or a signature-verification admission controller) and constraints.",
        ],
        acceptanceCriteria: [
          "A clean build is signed and admitted to the cluster.",
        ],
      },
      {
        deliverables: [
          "Negative tests: vulnerable dependency, hard-coded secret, unsigned image, image with a critical CVE.",
          "Each negative test is a separate branch or workflow run with the expected failure.",
        ],
        acceptanceCriteria: [
          "Resume target: 100% of deployments are signed; every negative test is blocked at the intended gate.",
        ],
      },
      {
        deliverables: [
          "README with pipeline diagram, policy table and links to the failing runs.",
          "Update the resume bullet with what was actually enforced.",
        ],
        acceptanceCriteria: [
          "The pipeline runs green on main from a clean fork.",
        ],
      },
    ],
  }),
  defineProject({
    id: "resume-detection-lab",
    title: "Detection Engineering Lab",
    tracks: ["computer-security-systems"],
    variant: "resume-target",
    summary:
      "A home SIEM lab where you write 30+ Sigma detection rules mapped to MITRE ATT&CK, prove each one with Atomic Red Team simulations, and add LLM-assisted alert triage.",
    scope:
      "Wazuh or Elastic SIEM on local VMs/containers with a Windows and a Linux endpoint, Sysmon/auditd telemetry, Sigma rules converted to the SIEM's query language, Atomic Red Team tests per technique, and a Python triage service that enriches alerts and suggests a verdict.",
    prerequisites: [
      "sk-sec-m08-detection",
      "security-m09-detection-engineering",
    ],
    prerequisiteTags: [
      "siem",
      "sigma",
      "mitre-attack",
      "atomic-red-team",
      "python",
      "llm-apis",
    ],
    historicalNote: resumeHistory,
    safety: [
      ownAccountsOnly,
      "Run attack simulations only inside the isolated lab network, never on work or shared machines.",
    ],
    sources: [s.wazuh, s.sigma, s.atomic, s.attack],
    gates: [
      {
        deliverables: [
          "Create github.com/vijay-0107/detection-lab with lab setup (VMs or containers) as code.",
          "Pick 30+ ATT&CK techniques; for each, the Atomic test and expected telemetry.",
        ],
        acceptanceCriteria: [
          "The technique list maps each rule to an ATT&CK ID and a data source.",
        ],
      },
      {
        deliverables: [
          "SIEM with Sysmon (Windows) and auditd (Linux) logs flowing in.",
          "Sigma rules converted with pySigma/sigma-cli and deployed to the SIEM.",
        ],
        acceptanceCriteria: [
          "At least one rule fires end to end from an Atomic test.",
        ],
      },
      {
        deliverables: [
          "Run every Atomic test and record whether its rule fired; tune rules to reduce noise from normal activity.",
          "Detection-as-code CI: lint and convert Sigma rules on every commit.",
        ],
        acceptanceCriteria: [
          "Resume target: 30+ rules each validated by an Atomic Red Team test, or the resume number is changed to the validated count.",
        ],
      },
      {
        deliverables: [
          "LLM triage service: enrich alerts (host context, threat intel lookups) and propose benign/malicious with reasoning; measure false-positive reduction on a labelled alert set.",
          "README with coverage matrix (ATT&CK navigator layer) and update the resume bullet.",
        ],
        acceptanceCriteria: [
          "Resume target: about 40% fewer false positives in lab tests with triage, or the resume number is changed to the measured value.",
        ],
      },
    ],
  }),
];
