import type { CareerReading } from "../domain/types";

export const ITCH_SPEC =
  "https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/NQTVITCHspecification.pdf";
export const OUCH_SPEC =
  "https://www.nasdaqtrader.com/content/technicalsupport/specifications/TradingProducts/OUCH5.0.pdf";
export const SOUP_SPEC =
  "https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/soupbintcp.pdf";

const reading = (
  title: string,
  url: string,
  locator: string,
): CareerReading => ({
  title,
  url,
  locator,
  verifiedOn: "2026-09-30",
});
const itch = reading(
  "Nasdaq TotalView-ITCH 5.0 specification",
  ITCH_SPEC,
  "ITCH 5.0, Architecture (PDF p.3), Data Types/Message Formats (p.4), 1.3.1/1.3.2 Add Order (p.13), 1.4.1/1.4.2 Executed (p.14), and 1.4.3/1.4.4/1.4.5 Cancel/Delete/Replace (pp.15-16). Pin supported message types, byte widths/order and timestamp units; the transport envelope is separate.",
);
const ouch = reading(
  "Nasdaq OUCH 5.0 Order Entry Specification (October 2025)",
  OUCH_SPEC,
  "OUCH 5.0, updated October 2025: 1.1 Architecture and 1.2 Data Types (p.3), 2 Inbound Messages, 2.1 Type O Enter Order (pp.4-5), 2.2 Type U Replace (pp.6-7), 2.3 Type X Cancel (pp.7-8), and 3 Outbound Messages (p.11 onward). Declare a supported subset rather than inventing field layouts.",
);
const soup = reading(
  "Nasdaq SoupBinTCP Version 3.00",
  SOUP_SPEC,
  "SoupBinTCP 3.00: 1.1 Logical Packets (p.2), 1.2 Protocol Flow (p.3), 1.5 Data Types (p.4), 2.2.3 Sequenced Data (p.5), and 2.3.2 Unsequenced Data (p.7). The two-byte length counts bytes after the length field; packet type and higher-level ITCH/OUCH payload are distinct layers.",
);
const determinism = reading(
  "Temporal Workflow Definition: deterministic replay",
  "https://docs.temporal.io/workflow-definition",
  "Deterministic constraints; Code changes can cause non-deterministic behavior; Intrinsic non-deterministic logic; Workflow versioning. Study ordered Command/Event-History matching, Activities outside replay and explicit incompatibility errors. These are concept references for an original Go runtime, not a claim that it is Temporal.",
);
const history = reading(
  "Temporal Events and Event History",
  "https://docs.temporal.io/workflow-execution/event",
  "Activity Events; Event History; Event Loop; Time Constraints; Side Effect. Follow ActivityTaskScheduled/Completed and stored results through recovery; distinguish replayed orchestration from retried Activity delivery and external effect commitment.",
);
const timers = reading(
  "Temporal Go SDK: durable timers and versioning",
  "https://docs.temporal.io/develop/go/workflows/timers",
  "Timers - Go SDK: workflow.NewTimer and workflow.Sleep, persisted timers through Worker/Service downtime and resumption after recovery. Pair with workflow-definition versioning and the Go versioning/patching reference; do not substitute a process sleep or reset the deadline on restart.",
);
const versioning = reading(
  "Temporal Go SDK: workflow versioning",
  "https://docs.temporal.io/develop/go/workflows/versioning",
  "Versioning - Go SDK: Patching and workflow.GetVersion, preserving existing execution branches and deprecated-version handling. The original teaching runtime may enforce a stricter explicit code/history version contract; it does not claim SDK compatibility.",
);
const pit = reading(
  "pandas.merge_asof: grouped backward eligibility joins",
  "https://pandas.pydata.org/docs/reference/api/pandas.merge_asof.html",
  "pandas.merge_asof API: sorted on/left_on/right_on keys, by/left_by/right_by, direction='backward', tolerance and allow_exact_matches. Join on the declared knowledge/availability boundary, not merely event time, and compare to the canonical quant-l10 slow oracle before optimizing.",
);
const cdc = reading(
  "Debezium 3.3 PostgreSQL connector",
  "https://debezium.io/documentation/reference/3.3/connectors/postgresql.html",
  "Debezium 3.3 PostgreSQL connector: How the connector works, snapshots/incremental snapshots, streaming changes, source metadata/LSN and delete/tombstone events. Source positions and watermarks are not a point-in-time training-row eligibility proof.",
);
const domainPolicy = reading(
  "OWASP SSRF Prevention: domain allowlists and DNS pinning",
  "https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html",
  "Case 1 allowlisting: Application layer, Domain name validation, DNS pinning and network-layer restrictions. Apply the defensive domain/resolution/connection principles to an owned per-job application proxy; validate canonical authority and TLS SAN, reject direct-IP and unapproved-resolution paths, and recheck redirects.",
);
const xdp = reading(
  "Cilium BPF reference: XDP versus tc hooks",
  "https://docs.cilium.io/en/stable/reference-guides/bpf/progtypes/",
  "Program Types: XDP and tc. XDP executes when the driver receives a packet. For an outbound workload policy, diagram workload-veth TX -> peer-veth RX/XDP, record the receiving namespace/ifindex and test actual outbound flows. tc/cgroup egress is a different hook, not XDP under another name.",
);
const xdpParsing = reading(
  "XDP tutorial: packet01 parsing",
  "https://github.com/xdp-project/xdp-tutorial/blob/main/packet01-parsing/README.org",
  "Packet01: The data and data_end pointers, parsing packet headers and verdicts. Read xdp_md ingress_ifindex/rx_queue_index and the XDP_TX receive/retransmit boundary. Ordinary XDP current-task context is not reliable attribution of the packet's originating process.",
);

const byTarget: CareerReading[][] = [
  [
    reading(
      "In Search of an Understandable Consensus Algorithm",
      "https://raft.github.io/raft.pdf",
      "Raft paper: section 5 Replicated State Machine Implementation (election, replication and safety), section 6 Cluster Membership Changes, section 7 Log Compaction and section 8 Client Interaction. Compare histories against an independent bounded linearizable oracle.",
    ),
    reading(
      "RocksDB storage overview",
      "https://github.com/facebook/rocksdb/wiki/RocksDB-Overview",
      "RocksDB Overview: memtables, log files, SST files and compaction. This explains LSM/WAL/Bloom mechanisms; it does not replace the requested original storage/consensus implementation.",
    ),
  ],
  [
    reading(
      "Envoy xDS protocol",
      "https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol",
      "xDS protocol: resource versions, discovery requests/responses, ACK/NACK and sequencing/consistency considerations. Pair with HTTP routing/clusters for in-flight configuration lifetime; an original Tonic control protocol is not automatically full Envoy xDS conformance.",
    ),
    reading(
      "Envoy architecture: traffic and failure controls",
      "https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/arch_overview",
      "Architecture Overview: HTTP connection management/routing, upstream clusters, load balancing, health checking, rate limiting and circuit breaking. Keep the token/refill policy separate from closed/open/half-open failure state.",
    ),
  ],
  [
    determinism,
    history,
    timers,
    versioning,
    reading(
      "PostgreSQL explicit locking",
      "https://www.postgresql.org/docs/current/explicit-locking.html",
      "Explicit Locking: Row-Level Locks, Deadlocks and Advisory Locks. These support queue ownership/fencing; they do not supply deterministic command/history replay or durable workflow timers.",
    ),
  ],
  [
    reading(
      "sqlparser Rust API",
      "https://docs.rs/sqlparser/latest/sqlparser/",
      "sqlparser crate documentation: Parser, dialect modules and ast::Statement/Expr. State the supported AST subset and reject unsupported semantics before dual-writing; parsing alone is not query equivalence.",
    ),
    reading(
      "Canarying Releases",
      "https://sre.google/workbook/canarying-releases/",
      "Release Engineering Principles and Balancing Release Velocity and Reliability: observation populations, evaluation signals and rollback decisions. A simulated 24-hour decision test is not an observed 24-hour soak.",
    ),
  ],
  [
    reading(
      "vLLM Paged Attention design",
      "https://docs.vllm.ai/en/latest/design/paged_attention/",
      "Paged Attention design: Inputs, query/key/value cache layout, block indexing and attention computation. Tie block ownership/reclamation to numerical parity and distinguish KV paging from FlashAttention's IO schedule.",
    ),
    reading(
      "FlashAttention maintainer documentation",
      "https://github.com/Dao-AILab/flash-attention",
      "README: supported devices/dtypes, usage and correctness/benchmark guidance for FlashAttention. Pin the actual version and workload; a CPU oracle does not establish GPU kernel execution or a throughput target.",
    ),
  ],
  [
    reading(
      "NVIDIA NVML API",
      "https://docs.nvidia.com/deploy/nvml-api/",
      "NVML API: nvmlInit_v2, device handle lookup, nvmlDeviceGetMemoryInfo, nvmlDeviceGetTemperature, nvmlDeviceGetUtilizationRates and return/error codes. Preserve missing/stale/unsupported telemetry rather than inventing zero utilization.",
    ),
    reading(
      "vLLM quantization support",
      "https://docs.vllm.ai/en/latest/features/quantization/",
      "Quantization feature documentation: supported methods, device/kernel compatibility and model restrictions. Quantized fallback has an explicit quality/capability contract separate from deadline scheduling.",
    ),
  ],
  [
    pit,
    cdc,
    reading(
      "Apache Arrow Python data interfaces",
      "https://arrow.apache.org/docs/python/",
      "Python documentation: Tables/record batches, Parquet read/write and Dataset scanning. Preserve entity/event/availability/cutoff fields and schema/time units through the actual online/offline feature path.",
    ),
  ],
  [
    reading(
      "Firecracker microVM snapshotting",
      "https://github.com/firecracker-microvm/firecracker/blob/main/docs/snapshotting/snapshot-support.md",
      "About microVM snapshotting; Snapshotting in Firecracker; Vsock device reset and snapshot compatibility/limitations. Network/vsock connections may not survive restore; compare cold boot, restore and warm admission separately.",
    ),
    domainPolicy,
    reading(
      "gVisor architecture",
      "https://gvisor.dev/docs/architecture_guide/intro/",
      "Architecture Guide: the Sentry, application system-call interface and platform boundaries. gVisor is a distinct userspace-kernel sandbox, not proof of Firecracker/KVM isolation.",
    ),
  ],
  [
    xdp,
    xdpParsing,
    reading(
      "libbpf overview",
      "https://www.kernel.org/doc/html/latest/bpf/libbpf/libbpf_overview.html",
      "libbpf Overview: BPF object lifecycle, skeleton, loading/verification, attachment and maps. Separate compile, verifier/load, observed syscall events and actual policy enforcement evidence.",
    ),
  ],
  [
    reading(
      "SPIFFE concepts",
      "https://spiffe.io/docs/latest/spiffe-about/spiffe-concepts/",
      "SPIFFE concepts: SPIFFE ID, trust domain, SVID/X.509-SVID and Workload API. Relate authenticated node/workload attestation to issuance, identity binding and rotation; a caller-supplied label is not attestation.",
    ),
    reading(
      "NIST IR 8320 hardware roots",
      "https://csrc.nist.gov/pubs/ir/8320/final",
      "Hardware-Enabled Security: roots of trust and hardware-protected identity/measurement concepts, including TPM/HSM boundaries. Simulator results are separate from physical attestation.",
    ),
  ],
  [
    reading(
      "AWS IAM policy evaluation logic",
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html",
      "Evaluating identity-based/resource-based policies, permissions boundaries and Organizations SCPs, with explicit-deny/context caveats. An effective-authority edge needs these semantics before graph traversal.",
    ),
    reading(
      "NetworkX shortest paths",
      "https://networkx.org/documentation/stable/reference/algorithms/shortest_paths.html",
      "Shortest Paths: unweighted/BFS versus nonnegative weighted/Dijkstra interfaces. Graph reachability does not validate IAM conditions; unmodelled residual paths remain unknown and can veto remediation.",
    ),
  ],
  [
    reading(
      "Python AST API",
      "https://docs.python.org/3/library/ast.html",
      "Abstract Grammar, ast.parse, Call/FunctionDef nodes and NodeVisitor. Syntax and supported static reachability are not observed execution; dynamic imports/dispatch must retain uncertainty.",
    ),
    reading(
      "Go type information",
      "https://pkg.go.dev/go/types",
      "go/types: Config.Check, Info.Uses, Info.Defs and Selections, paired with go/parser.ParseFile and go/ast.CallExpr. Preserve unresolved/dynamic calls rather than calling them safe.",
    ),
    reading(
      "Java 21 compiler Tree API",
      "https://docs.oracle.com/en/java/javase/21/docs/api/jdk.compiler/com/sun/source/tree/package-summary.html",
      "JDK 21 com.sun.source.tree: CompilationUnitTree, MethodInvocationTree, MemberSelectTree and TreeVisitor. Resolve symbols under a declared language model and retain reflection/dispatch unknowns.",
    ),
  ],
  [
    reading(
      "Apache Iceberg maintenance",
      "https://iceberg.apache.org/docs/latest/maintenance/",
      "Maintenance: Expire Snapshots, Remove Old Metadata Files, Delete Orphan Files, Compact Data Files and Rewrite Manifests. Preserve active references/readers; file age alone is not an orphan proof.",
    ),
    reading(
      "Iceberg REST Catalog specification",
      "https://iceberg.apache.org/rest-catalog-spec/",
      "REST Catalog specification: table load/update/commit requirements and metadata locations. Distinguish object upload, catalog publication and query visibility across actual Kafka/MinIO/ClickHouse integration.",
    ),
  ],
  [
    reading(
      "Apache Arrow Flight protocol",
      "https://arrow.apache.org/docs/format/Flight.html",
      "Flight protocol: FlightDescriptor, GetFlightInfo, FlightEndpoint/Ticket, DoGet/DoPut, ordered endpoints and record-batch streams. Measure actual worker transport; buffer reuse does not eliminate every source/serialization/engine copy.",
    ),
    reading(
      "DuckDB EXPLAIN and profiling",
      "https://duckdb.org/docs/stable/guides/meta/explain.html",
      "EXPLAIN: logical/physical plan inspection and profiling links. Prove supported predicate/projection rewrites against the independent all-data oracle, including NULL, types and row multiplicity.",
    ),
  ],
  [
    reading(
      "JSON Schema step-by-step",
      "https://json-schema.org/learn/getting-started-step-by-step",
      "Getting Started: type, properties, required, arrays and schema composition. Test actual versioned contracts; structural validation is not proof of freshness or statistical stability.",
    ),
    reading(
      "Protocol Buffers proto3 guide",
      "https://protobuf.dev/programming-guides/proto3/",
      "Defining message types, field numbers, reserving deleted fields and updating a message type. Keep schema compatibility, business identity and Kafka acknowledgement/DLQ durability separate.",
    ),
    reading(
      "t-digest maintainer reference",
      "https://github.com/tdunning/t-digest",
      "README: quantile sketches, accuracy, merging and implementation constraints. Compare declared quantile errors with an exact sorted reference and bind checkpoint state to consumed input progress.",
    ),
  ],
  [
    reading(
      "SQLGlot column lineage API",
      "https://sqlglot.com/sqlglot/lineage.html",
      "lineage(column, sql, schema, sources, dialect, scope) and Node/walk interfaces. Resolve aliases/CTEs/windows/star expansion against actual schema; missing resolution is unknown, not an empty safe graph.",
    ),
    reading(
      "dbt manifest artifact",
      "https://docs.getdbt.com/reference/artifacts/manifest-json",
      "Manifest JSON: artifact schema/version, nodes/sources, columns and depends_on metadata. Pin the actual manifest version; physical row lineage is not SQL-derived column lineage.",
    ),
  ],
  [
    reading(
      "C++ Core Guidelines",
      "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines",
      "R.1 resource ownership/RAII, CP.2 avoiding data races and Per performance rules. Tie fixed-capacity preflight/allocation boundaries to the preserved independent price/FIFO oracle.",
    ),
    reading(
      "C++ atomic memory ordering",
      "https://en.cppreference.com/w/cpp/atomic/memory_order",
      "Release-Acquire ordering, synchronizes-with and happens-before, contrasted with relaxed ordering. State the one-producer/one-consumer ownership proof and actual native stress/sanitizer scope.",
    ),
  ],
  [
    reading(
      "pybind11 NumPy and buffers",
      "https://pybind11.readthedocs.io/en/stable/advanced/pycpp/numpy.html",
      "Buffer protocol, NumPy arrays, dtype/shape/strides and ownership/lifetime examples. Include conversion costs and actual native execution in any equal-workload performance comparison.",
    ),
    reading(
      "Execution reality models",
      "https://www.quantconnect.com/docs/v2/writing-algorithms/reality-modeling",
      "Reality Modeling: fill, fee, slippage and capacity model categories. Use original chronological fixtures and explicit assumptions, not live trading or profitability claims.",
    ),
  ],
  [
    itch,
    soup,
    ouch,
    reading(
      "FIXimate FIX 4.4 field dictionary",
      "https://fiximate.fixtrading.org/legacy/en/FIX.4.4/fields_sorted_by_tagnum.html",
      "FIX 4.4 field dictionary (official FIXimate route redirects to its maintained 4.4 browser): StandardHeader BeginString(8), BodyLength(9), MsgType(35), and StandardTrailer CheckSum(10). Read each field definition and its SOH-delimited tag-value boundary; this is classic text FIX, not the ITCH binary layout.",
    ),
  ],
  [
    reading(
      "Python mmap reference",
      "https://docs.python.org/3/library/mmap.html",
      "mmap constructor/access modes, ACCESS_READ, close and platform-specific mapping constraints. A mapping per process is not a globally shared Python object or evidence of multi-host memory sharing.",
    ),
    reading(
      "TimeSeriesSplit reference",
      "https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html",
      "TimeSeriesSplit: expanding splits, test_size, max_train_size and gap, including equal-spacing limitations. Add explicit label-horizon/availability purging and preserve the complete trial ledger.",
    ),
  ],
  [
    reading(
      "OpenAPI 3.1.1 specification",
      "https://spec.openapis.org/oas/v3.1.1.html",
      "OpenAPI 3.1.1: Paths, Path Item, Operation, Responses and Schema Objects. Trace compatibility/error/validation requirements to the actual REST gateway; protocol comparisons do not imply deployed gRPC/GraphQL.",
    ),
    reading(
      "gRPC core concepts",
      "https://grpc.io/docs/what-is-grpc/core-concepts/",
      "Service definition, unary/streaming RPC lifecycle, deadlines, cancellation and status. Use these named properties in the REST/gRPC trade-off memo rather than asserting implementation from a comparison.",
    ),
  ],
  [
    reading(
      "Diagnosing sample-ratio mismatch",
      "https://www.microsoft.com/en-us/research/articles/diagnosing-sample-ratio-mismatch-in-a-b-testing/",
      "SRM impact and causes in assignment, execution, log processing and analysis; diagnose validity before interpreting treatment effects. Synthetic cohorts and projected capacity value are not observed causal ROI.",
    ),
    reading(
      "NIST two-sample t-test",
      "https://www.itl.nist.gov/div898/handbook/eda/section3/eda353.htm",
      "Two-sample t-Test: definition, test statistic and degrees-of-freedom cases, distinguishing equal/unequal variance assumptions from the pooled worked example. Pair independent-team analysis and predeclared multiplicity/stopping rules with the actual fixture.",
    ),
    reading(
      "OpenStax contribution and break-even",
      "https://openstax.org/books/principles-managerial-accounting/pages/3-2-calculate-a-break-even-point-in-units-and-dollars",
      "Section 3.2: CVP assumptions and Basics of the Break-Even Point. Keep fixed/variable costs, contribution, units and zero/negative-contribution behavior explicit; hypothetical prices are not bills.",
    ),
  ],
  [
    reading(
      "Canarying Releases",
      "https://sre.google/workbook/canarying-releases/",
      "Release Engineering Principles and Balancing Release Velocity and Reliability: define candidate/baseline populations, evaluation signals and rollback decisions. Local rehearsal does not establish an actual multi-cloud zero-downtime migration.",
    ),
    reading(
      "Strangler Fig migration pattern",
      "https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig",
      "Context/problem, solution and issues/considerations: facade/coexistence and incremental replacement. Tie rings 0-3 to dependency/compatibility constraints and separately measured RTO/RPO.",
    ),
  ],
  [
    reading(
      "FinOps Framework: Allocation",
      "https://www.finops.org/framework/capabilities/allocation/",
      "Allocation: Maintain an allocation strategy, Maintain a tagging and hierarchy strategy, Maintain a shared cost strategy and Validate allocation compliance. Pair unit-economics/anomaly governance with the project's declared strict greater-than-15-percent rule; that threshold is not a universal FinOps standard.",
    ),
    reading(
      "Kubernetes labels and selectors",
      "https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/",
      "Labels and Selectors: syntax, equality/set-based requirements and namespace/resource metadata. Distinguish manifest validation/expiring waivers from actual cluster admission or cloud enforcement.",
    ),
  ],
];

export function advancedTargetReadings(number: number): CareerReading[] {
  const readings = byTarget[number - 1];
  if (!readings?.length)
    throw new Error(
      `No precise official readings registered for advanced target ${number}`,
    );
  return readings;
}
