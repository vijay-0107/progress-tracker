import type { Project, ProjectMilestone, Source } from "../domain/types";

type GateEvidence = Pick<
  ProjectMilestone,
  "deliverables" | "acceptanceCriteria"
>;
type FourGates = [GateEvidence, GateEvidence, GateEvidence, GateEvidence];
type ProjectBrief = Omit<Project, "milestones" | "prerequisites"> & {
  gates: FourGates;
};

const gateDefinitions = [
  { key: "design-fixtures", title: "Design and fixtures" },
  { key: "vertical-slice", title: "Working vertical slice" },
  { key: "correctness-failure-tests", title: "Correctness and failure tests" },
  {
    key: "documentation-demo-measurements",
    title: "Documented demo and measurements",
  },
] as const;

const sources = {
  fabric: {
    title: "Microsoft Fabric medallion lakehouse architecture",
    url: "https://learn.microsoft.com/en-us/fabric/onelake/onelake-medallion-lakehouse-architecture",
    notes:
      "Architecture reference, not a requirement to purchase cloud capacity.",
  },
  fabricTrial: {
    title: "Fabric trial conditions",
    url: "https://learn.microsoft.com/en-us/fabric/fundamentals/fabric-trial",
    notes:
      "A trial is time-limited, not permanent free hosting; continued use can cost money.",
  },
  postgres: {
    title: "PostgreSQL explicit locking",
    url: "https://www.postgresql.org/docs/current/explicit-locking.html",
    notes: "Transaction-scoped row locks and concurrency behavior.",
  },
  amazon: {
    title: "Amazon SDE roles for students and graduates",
    url: "https://www.amazon.jobs/content/en/career-programs/university/sde",
    notes:
      "Competency context only; not a project endorsement, job guarantee or eligibility claim.",
  },
  django: {
    title: "Django database transactions",
    url: "https://docs.djangoproject.com/en/5.2/topics/db/transactions/",
    notes: "Atomic blocks, rollback and post-commit callbacks.",
  },
  janeStreet: {
    title: "Jane Street graduate Software Engineer role",
    url: "https://www.janestreet.com/join-jane-street/position/8647260002/",
    notes:
      "Systems and research-data competency context, not a universal quant-role specification.",
  },
  matching: {
    title: "Coinbase exchange matching-engine concepts",
    url: "https://docs.cdp.coinbase.com/exchange/concepts/matching-engine",
    notes:
      "Limited price-time and order-lifecycle reference; no exchange compatibility is claimed.",
  },
  asof: {
    title: "pandas merge_asof",
    url: "https://pandas.pydata.org/docs/reference/api/pandas.merge_asof.html",
    notes: "Sorted keys, backward matching, grouping and tolerance.",
  },
  retrieval: {
    title: "Sentence Transformers retrieve and rerank",
    url: "https://sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html",
    notes:
      "Retrieval and reranking reference; component and dataset licenses still need review.",
  },
  opencv: {
    title: "OpenCV DNN face detection and recognition",
    url: "https://docs.opencv.org/4.13.0/d0/dd4/tutorial_dnn_face.html",
    notes:
      "Detection, alignment, embeddings and pairwise matching; review model/data permissions separately.",
  },
  biometrics: {
    title: "NIST SP 800-63B-4: biometrics",
    url: "https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#biometric_use",
    notes:
      "Biometric sensitivity and error trade-offs; these prototypes are not NIST-certified.",
  },
  mediapipe: {
    title: "MediaPipe Face Landmarker for Python",
    url: "https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/python",
    notes:
      "Landmarks and capture modes, not independently validated liveness assurance.",
  },
  evaluation: {
    title: "OpenAI evaluation best practices",
    url: "https://developers.openai.com/api/docs/guides/evaluation-best-practices",
    notes:
      "Evaluation methodology can be applied locally without paid model APIs or a hosted product.",
  },
} satisfies Record<string, Source>;

const plannedHistory =
  "Planned future build. Implementation and all four evidence gates are incomplete. No completion date, available repository, live demo or measured outcome is claimed.";

const reconstructionHistory =
  "A reconstruction brief based on earlier student work, not recovered implementation files. Historical results are not independently verified here. This is a new reconstruction and evidence-recreation plan; current reconstruction is incomplete, and prior work does not complete any milestone.";

const fabricBoundary =
  "Fabric is optional. Its trial is time-limited and continued cloud capacity can incur charges; every required gate must also run locally without a Fabric subscription.";

const quantBoundary =
  "Use fictional markets only, without a live broker or execution feed. Simulated fills, valuations and benchmarks are not profits, alpha, investment advice or evidence of professional trading experience.";

const faceBoundaries = [
  "Only explicit opt-in consent from adults, lawfully permitted self-capture and local processing are allowed; consent can be withdrawn.",
  "No unknown-person identification, gallery search, surveillance, demographic classification or emotion inference.",
  "Images, embeddings and templates are sensitive and private. Keep them out of public repositories, demo exports and telemetry; document local access, retention and deletion/withdrawal controls.",
  "Review pretrained component and dataset permissions separately. Do not claim backbone training, liveness assurance, production authentication or NIST certification.",
];

function defineProject(brief: ProjectBrief): Project {
  const { gates, ...metadata } = brief;
  return {
    ...metadata,
    prerequisites: [],
    safety: [
      ...metadata.safety,
      "Never publish employer/client data, code, screenshots, identities or confidential architecture, personal data or secrets.",
      "The required evidence path runs locally without paid APIs; optional services are not prerequisites or substitutes for local tests.",
    ],
    milestones: gates.map((evidence, index) => ({
      id: `${brief.id}-${gateDefinitions[index].key}`,
      title: gateDefinitions[index].title,
      deliverables: [
        ...evidence.deliverables,
        ...(index === 3
          ? [
              "Versioned source and dependency versions, with a README covering scope, architecture, clean setup, startup/test commands, limitations and design alternatives.",
              "Fixture provenance/licensing manifest, sanitized normal-and-failing-case demo, and a measurement report naming workload, hardware, commands and actual results.",
            ]
          : []),
      ],
      acceptanceCriteria: [
        index === 0
          ? "Gate: begin with a new, incomplete evidence record; historical claims and planned results do not pass this gate."
          : `Gate: satisfy every acceptance check in "${gateDefinitions[index - 1].title}" with evidence before starting this milestone.`,
        ...evidence.acceptanceCriteria,
        ...(index === 3
          ? [
              "A clean local checkout reproduces the documented test and demo commands; all reported measurements come from recorded runs, with limitations and no invented results.",
            ]
          : []),
      ],
    })),
  };
}

export const projects: Project[] = [
  defineProject({
    id: "data-shopping-mall-operations",
    title: "Shopping-Mall Operations Database",
    tracks: ["data"],
    variant: "A-rebuild",
    summary:
      "Reconstruct a relational operations prototype with lease exclusivity, correct payment allocation and recovery evidence.",
    scope:
      "One fictional mall, 20 units, three months and one currency. Use PostgreSQL, Python and local tests for tenants, leases, fixed-rent invoices, receipt allocation, occupancy/arrears views, roles, auditing and backup/restore.",
    prerequisiteTags: [
      "python-basics",
      "sql-joins",
      "relational-modelling",
      "postgresql-transactions",
      "database-constraints",
      "automated-testing",
    ],
    historicalNote: reconstructionHistory,
    safety: [
      "Generate fictional tenant and receipt records; do not import real tenant identities, financial records or payment credentials.",
      "Exclude tax compliance, real payment processing and a complete ERP. Accounting, security and operational review would be required before real deployment.",
    ],
    sources: [sources.fabric, sources.postgres],
    gates: [
      {
        deliverables: [
          "ER diagram and versioned migrations for units, tenants, leases, invoices, receipts and allocations.",
          "Seeded 20-unit generator and hand-written occupancy, invoice-balance and arrears oracle.",
        ],
        acceptanceCriteria: [
          "Exactly 20 fictional units and three months of single-currency fixtures load into a fresh database.",
          "Define lease interval boundaries, rounding and allocation rules; include adjacent leases, overlapping leases and duplicate receipts.",
          "Every invoice oracle specifies charges, applied receipts and outstanding balance without relying on the implementation under test.",
        ],
      },
      {
        deliverables: [
          "Transactional lease and receipt commands with occupancy/arrears views.",
          "Separate read/write roles and an audit trail for operational mutations.",
        ],
        acceptanceCriteria: [
          "Create a lease, invoice it and allocate a partial payment; every resulting balance matches the oracle.",
          "Two concurrent overlapping lease requests for one unit produce exactly one accepted allocation.",
          "Reusing a receipt ID cannot double-credit a payment, and the duplicate decision is traceable.",
        ],
      },
      {
        deliverables: [
          "Concurrency, constraint, authorization and rollback tests.",
          "Backup/restore script with row-count and financial-control comparison.",
        ],
        acceptanceCriteria: [
          "Read-only users are denied inserts, updates and deletes on every operational table.",
          "An injected failure between receipt creation and allocation leaves no partial credit or audit inconsistency.",
          "A restored backup reproduces expected records, occupancy and invoice balances exactly.",
        ],
      },
      {
        deliverables: [
          "Sanitized lease-conflict and payment-allocation demo plus recovery runbook.",
          "Query-plan and restore-duration report comparing the same fixture workload before and after indexing.",
        ],
        acceptanceCriteria: [
          "The demo shows a valid allocation and a deliberately rejected overlapping lease or repeated receipt.",
          "Record query plans, fixture cardinalities, elapsed query/restore times and index trade-offs without claiming production scale.",
          "The README explains lease-boundary choices, backup limitations and the independent accounting checks.",
        ],
      },
    ],
  }),
  defineProject({
    id: "data-mall-sales-inventory",
    title: "Mall Sales and Inventory Lakehouse",
    tracks: ["data"],
    variant: "A-rebuild",
    summary:
      "Reconstruct replayable sales and stock ingestion with auditable quarantine and reconciled dimensional outputs.",
    scope:
      "Approximately 20 fictional shops, 500 products and at most 100,000 synthetic sales, returns and stock-count events. Use independent generated immutable files, manifests, local PySpark/Delta Lake, SQL and pytest; support corrected-file replay and bounded backfills.",
    prerequisiteTags: [
      "python-basics",
      "sql-aggregation",
      "pyspark-dataframes",
      "dimensional-modelling",
      "data-contracts",
      "delta-merge",
      "automated-testing",
    ],
    historicalNote: reconstructionHistory,
    safety: [
      "The generator must run independently of Shopping-Mall Operations Database; no recovered database or live shop integration is assumed.",
      "Exclude live POS integration, customer profiling and camera-based footfall collection. Publish only synthetic or legally usable public fixtures.",
      fabricBoundary,
    ],
    sources: [sources.fabric, sources.fabricTrial],
    gates: [
      {
        deliverables: [
          "Star-schema/lineage diagram and immutable file-manifest contract.",
          "Seeded sales, returns and stock-count generator with hand-calculated control totals.",
        ],
        acceptanceCriteria: [
          "A clean generator run produces approximately 20 shops, 500 products and no more than 100,000 events without another project.",
          "Define event IDs, batch versions, schema rules and correction precedence; include duplicate, late and malformed records.",
          "Fixture oracles specify sales net of returns and inventory movements for every small golden batch.",
        ],
      },
      {
        deliverables: [
          "Manifest-driven raw-to-quarantine-to-curated pipeline.",
          "Store/product/date dimensions, sales/inventory facts and a bounded-backfill command.",
        ],
        acceptanceCriteria: [
          "Loading a duplicate file leaves curated row counts and control totals unchanged.",
          "Rejected records retain source file, source row, batch version and rejection reason.",
          "Dimension keys resolve for every accepted fact or use an explicitly tested unknown-member policy.",
        ],
      },
      {
        deliverables: [
          "Schema, deduplication, reconciliation and failure-retry test suite.",
          "Corrected-batch replay and interrupted-write recovery fixtures.",
        ],
        acceptanceCriteria: [
          "Corrected batches and a clean rebuild produce identical canonical fact rows and totals.",
          "Inventory movements and financial control totals match the hand-written oracle, including returns.",
          "An interrupted batch can be retried without duplicate facts or silently losing quarantined rows.",
        ],
      },
      {
        deliverables: [
          "Late-file recovery demo and lineage/quarantine walkthrough.",
          "Measured full-versus-incremental processing report for the same manifest and output checksums.",
        ],
        acceptanceCriteria: [
          "The demo includes a malformed row, its recorded rejection and a corrected-file replay.",
          "Report input/output sizes, full/incremental durations and checksum equality; distinguish cold and warm runs.",
          "Document local commands, backfill boundaries and optional Fabric trial/capacity costs rather than assuming free cloud hosting.",
        ],
      },
    ],
  }),
  defineProject({
    id: "sde-transaction-safe-commerce",
    title: "Transaction-Safe E-Commerce Website",
    tracks: ["sde"],
    variant: "A-rebuild",
    summary:
      "Reconstruct a complete small storefront whose authorization, checkout totals and stock reservations survive races and retries.",
    scope:
      "One store, approximately 100 products, one currency and fixed shipping rules. Use Django server-rendered templates, framework authentication, PostgreSQL and local tests for browsing/search, cart, server-priced checkout, transactional stock reservation, order history and a local payment simulator.",
    prerequisiteTags: [
      "python-basics",
      "http-html-css",
      "django-basics",
      "sql-modelling",
      "authorization",
      "postgresql-transactions",
      "automated-testing",
    ],
    historicalNote: reconstructionHistory,
    safety: [
      "Use fictional products/accounts and a local payment simulator only; never collect real card data.",
      "Exclude tax engines, recommendation systems and microservices. Framework authentication does not replace authorization tests.",
    ],
    sources: [sources.postgres, sources.amazon, sources.django],
    gates: [
      {
        deliverables: [
          "ER and order/payment-state diagrams with stock-reservation and shipping rules.",
          "Product/customer/staff fixtures and a deterministic payment callback simulator.",
        ],
        acceptanceCriteria: [
          "Seed approximately 100 products, two customers and a staff account with no real credentials.",
          "Specify every allowed checkout/payment transition and the server-owned pricing/rounding rule.",
          "Include last-unit stock, out-of-stock, tampered-price and duplicate-callback cases with expected totals.",
        ],
      },
      {
        deliverables: [
          "Browse/search/cart pages, authentication and customer-owned order history.",
          "Atomic server-priced checkout and simulated payment callbacks.",
        ],
        acceptanceCriteria: [
          "A customer completes browse-to-order-to-simulated-payment using persisted server-calculated totals.",
          "Client-submitted prices and shipping charges cannot alter the server-calculated total.",
          "Every order-history and detail request is scoped to the authenticated customer unless an authorized staff role is used.",
        ],
      },
      {
        deliverables: [
          "Real database concurrency, ownership and callback-idempotency tests.",
          "Failure injection at reservation, order creation and callback processing boundaries.",
        ],
        acceptanceCriteria: [
          "Racing purchases of the final unit create at most one successful reservation and never negative stock.",
          "Duplicate payment callbacks cause exactly one payment-state transition.",
          "Cross-customer order access is denied and failed checkout changes roll back consistently without orphan reservations.",
        ],
      },
      {
        deliverables: [
          "Customer/staff workflow demo with attempted price tampering and a failed checkout.",
          "Reproducible checkout-concurrency and latency report with request/response examples.",
        ],
        acceptanceCriteria: [
          "Run and document a concurrent last-unit scenario, recording successful/failed requests and final inventory.",
          "Measure request latency against a named local workload without asserting production throughput.",
          "Explain transaction boundaries, simulator limitations, authentication configuration and authorization decisions.",
        ],
      },
    ],
  }),
  defineProject({
    id: "sde-returns-exchange",
    title: "Returns and Exchange Portal",
    tracks: ["sde"],
    variant: "A-rebuild",
    summary:
      "Reconstruct an independent post-purchase workflow with bounded returns, auditable transitions and retry-safe simulated credits.",
    scope:
      "A separate Django/PostgreSQL application with its own database and 500 synthetic fulfilled orders. Support customer-owned views, policy-based partial returns, staff approval/receipt/resolution, audit history, transactional exchange allocation and idempotent simulated credits.",
    prerequisiteTags: [
      "python-basics",
      "django-basics",
      "sql-modelling",
      "state-machines",
      "authorization",
      "postgresql-transactions",
      "idempotency",
    ],
    historicalNote: reconstructionHistory,
    safety: [
      "Run independently of the storefront using imported synthetic fixtures, not a live store or customer database.",
      "No real refunds, courier APIs, fraud prediction or legal-policy compliance claims; credits are local simulations.",
    ],
    sources: [sources.postgres, sources.amazon, sources.django],
    gates: [
      {
        deliverables: [
          "Workflow/ER diagrams with a transition and permission matrix.",
          "Independent 500-order importer and policy/quantity/expiry golden fixtures.",
        ],
        acceptanceCriteria: [
          "Exactly 500 fulfilled synthetic orders load without starting the storefront project.",
          "Specify policy cutoffs, cumulative partial-return quantities and allowed customer/staff actions for every state.",
          "Include expired, partially returned, already credited and exchange-stock-shortfall fixtures with explicit outcomes.",
        ],
      },
      {
        deliverables: [
          "Customer return requests and staff approval, receipt and resolution screens.",
          "Transactional replacement-stock allocation, audit history and simulated-credit ledger.",
        ],
        acceptanceCriteria: [
          "A partial return moves through the allowed states and records actor, reason and transition time.",
          "Return quantities cannot exceed eligible fulfilled quantities after prior returns are counted.",
          "One completed request produces one simulated credit keyed to a stable operation ID.",
        ],
      },
      {
        deliverables: [
          "Ownership, state-transition and duplicate-processing tests.",
          "Concurrent return/exchange and transaction-failure tests.",
        ],
        acceptanceCriteria: [
          "Cross-customer record access is denied for both direct URLs and mutation endpoints.",
          "Illegal state transitions fail explicitly and duplicate processing never issues duplicate simulated credits.",
          "Failed exchanges do not consume replacement stock; concurrent partial requests cannot exceed the fulfilled quantity.",
        ],
      },
      {
        deliverables: [
          "Independent startup/demo with a partial return and deliberately failed exchange.",
          "Failure-injection report and policy/state-machine design discussion.",
        ],
        acceptanceCriteria: [
          "The demo works with only this application's database and fixtures.",
          "Report tested failure points, final request/credit/stock invariants and recovery duration from actual runs.",
          "Document prototype policy choices and explicitly separate simulated credits from real refunds.",
        ],
      },
    ],
  }),
  defineProject({
    id: "quant-paper-exchange",
    title: "Paper Exchange and Deterministic Replay",
    tracks: ["quant"],
    variant: "A-rebuild",
    summary:
      "Reconstruct a small matching engine to demonstrate state invariants and deterministic replay, not an investment strategy.",
    scope:
      "One fictional instrument and fewer than 100,000 generated commands initially. Implement integer-price/quantity limit orders, price priority, FIFO within price levels, partial fills, cancellation, append-only command logs, a local blotter and a benchmark command using Python and pytest.",
    prerequisiteTags: [
      "python-basics",
      "data-structures",
      "order-book-basics",
      "state-machines",
      "property-based-testing",
      "profiling",
    ],
    historicalNote: reconstructionHistory,
    safety: [
      quantBoundary,
      "No live market feed, C++ latency claim or exchange compatibility claim. A-level evidence can use a straightforward Python engine.",
    ],
    sources: [sources.janeStreet, sources.matching],
    gates: [
      {
        deliverables: [
          "Matching specification and queue/index/state diagrams.",
          "Seeded command generator, hand-written fills and a deliberately simple reference engine.",
        ],
        acceptanceCriteria: [
          "Generate fewer than 100,000 commands for exactly one fictional instrument with integer prices/quantities.",
          "Define price priority, FIFO tie-breaking, cancellation behavior, invalid inputs and the chosen execution-price rule.",
          "Golden cases include partial fills, multiple price levels, equal-price arrival order and unknown cancellations.",
        ],
      },
      {
        deliverables: [
          "Limit-order matcher, cancellation path and append-only sequenced log.",
          "Local order-entry/trade-blotter view and replay CLI.",
        ],
        acceptanceCriteria: [
          "Golden scenarios produce exactly the specified fills in price/FIFO order.",
          "For every order, filled plus remaining plus cancelled quantity equals accepted original quantity.",
          "Replaying the same command log produces identical fills and final book state.",
        ],
      },
      {
        deliverables: [
          "Randomized reference-comparison and invariant tests.",
          "Malformed/duplicate-command and truncated-log recovery fixtures.",
        ],
        acceptanceCriteria: [
          "Randomized seeded command sequences agree with the reference engine on every fill and final book entry.",
          "Quantities remain non-negative and a completed match leaves no executable crossed orders under the specified rules.",
          "A corrupt or truncated log is rejected or recovered only to a documented valid prefix, never silently interpreted as valid input.",
        ],
      },
      {
        deliverables: [
          "Deterministic replay demo including rejected input.",
          "Hardware-labelled throughput/latency report and data-structure trade-off notes.",
        ],
        acceptanceCriteria: [
          "Record workload seed, command mix/count, hardware, commands and latency distribution from actual benchmark runs.",
          "The demo compares original and replayed fill/book digests and shows equality.",
          "Describe software behavior only; no simulated fill is presented as a profit or professional trading result.",
        ],
      },
    ],
  }),
  defineProject({
    id: "quant-point-in-time-workbench",
    title: "Point-in-Time Market-Data Workbench",
    tracks: ["quant"],
    variant: "A-rebuild",
    summary:
      "Reconstruct time-aware research snapshots that cannot consume late information before it was available.",
    scope:
      "Three fictional instruments and 20 sessions. Generate quotes/disclosures with separate event and availability times; normalize UTC, define revision/tie/staleness policies, use pandas/DuckDB backward joins and export versioned snapshots with quote age, spread and source IDs.",
    prerequisiteTags: [
      "python-basics",
      "pandas",
      "sql-joins",
      "timezones",
      "asof-joins",
      "temporal-data",
      "automated-testing",
    ],
    historicalNote: reconstructionHistory,
    safety: [
      quantBoundary,
      "Use generated delays and corrections, not a paid historical-data service. Exclude forecasting, strategy optimization and claims of investment advantage.",
    ],
    sources: [sources.janeStreet, sources.asof],
    gates: [
      {
        deliverables: [
          "Temporal schema and data dictionary distinguishing event time from availability time.",
          "Three-instrument, 20-session generator and hand-written snapshot oracle.",
        ],
        acceptanceCriteria: [
          "Every generated observation has a source ID, event time and availability time normalized to UTC.",
          "Specify backward-match, equal-time tie, revision and staleness policies before implementation.",
          "Include delayed disclosures, timezone offsets, stale quotes and revisions whose availability falls after a snapshot cutoff.",
        ],
      },
      {
        deliverables: [
          "Reference snapshot builder and pandas/DuckDB as-of export command.",
          "Versioned exports with quote age, spread, source and snapshot cutoff.",
        ],
        acceptanceCriteria: [
          "Every joined observation was available at or before its snapshot cutoff; no future information is consumed.",
          "Stale, tied and timezone-shifted cases match the hand-written oracle exactly.",
          "Missing eligible data is explicitly marked unavailable rather than backfilled from a future quote.",
        ],
      },
      {
        deliverables: [
          "Temporal non-leakage and revision regression tests.",
          "Reference-versus-optimized join comparison and export reproducibility checks.",
        ],
        acceptanceCriteria: [
          "Adding later disclosures does not change earlier snapshots.",
          "Repeated runs over the same versioned input produce identical canonical exports.",
          "Optimized joins match the reference implementation for every generated cutoff, including empty and unsorted inputs after normalization.",
        ],
      },
      {
        deliverables: [
          "Late-revision demo comparing earlier and later cutoffs.",
          "Correctness/performance report for reference and optimized snapshot builders.",
        ],
        acceptanceCriteria: [
          "The demo shows a correction appearing only at eligible later cutoffs and explicitly rejects a future-data join.",
          "Record input cardinality, cutoff count, run duration, memory method and exact output comparison.",
          "Explain time conventions, missing-data policy and why temporal correctness is not proof of investment advantage.",
        ],
      },
    ],
  }),
  defineProject({
    id: "ai-consent-local-verification",
    title: "Consent-Based Local Face Verification",
    tracks: ["ai"],
    variant: "A-rebuild",
    summary:
      "Reconstruct opt-in, claimed-identity local verification with private templates, calibrated rejection and explicit evaluation limits.",
    scope:
      "The user selects one claimed identity. Use a suitably licensed pretrained component for local single-face detection/alignment and embeddings, consented enrollment, a frozen threshold, uncertain/reject output, protected templates, retention/deletion controls and a held-out evaluation command.",
    prerequisiteTags: [
      "python-basics",
      "opencv",
      "image-processing",
      "embedding-verification",
      "threshold-calibration",
      "evaluation-metrics",
      "consent-and-privacy",
    ],
    historicalNote: reconstructionHistory,
    safety: [
      ...faceBoundaries,
      "Self-only data cannot establish meaningful impostor performance. App-level deletion does not certify physical erasure from unmanaged backups; document this limit.",
    ],
    sources: [sources.opencv, sources.biometrics],
    gates: [
      {
        deliverables: [
          "Consent/retention policy template, model-permission inventory and pipeline/storage diagram.",
          "Private enrollment/development/held-out manifest plus non-biometric test doubles.",
        ],
        acceptanceCriteria: [
          "Every real capture is linked to explicit adult opt-in consent and a documented withdrawal path; no image or template enters a public fixture.",
          "Document the claimed-identity-only protocol and zero-face, multiple-face, missing-consent and unknown-claim rejection cases.",
          "Separate calibration from held-out evaluation and predeclare false-match/non-match calculations with their denominators.",
        ],
      },
      {
        deliverables: [
          "Local enrollment and selected-identity verification with protected template storage.",
          "Uncertain/reject outcomes, retention controls and an enrollment deletion command.",
        ],
        acceptanceCriteria: [
          "Reject zero/multiple-face inputs and unknown identity claims without searching an identity gallery.",
          "After a documented initial model download, inference completes with network access disabled.",
          "An active consent record is required for enrollment and verification; missing consent cannot be bypassed by an API call.",
        ],
      },
      {
        deliverables: [
          "Frozen-threshold held-out evaluator and consent/deletion regression tests.",
          "Corrupt-image, missing-template, offline-inference and access-control tests.",
        ],
        acceptanceCriteria: [
          "Freeze the threshold before held-out evaluation and record genuine/impostor pair counts and false-match/non-match results.",
          "Deletion removes project-managed images/templates and cached enrollment artifacts; subsequent app-level verification for that enrollment is denied.",
          "Withdrawal immediately disables verification; report unmeasurable impostor performance as a limitation rather than inferring it from self-only data.",
        ],
      },
      {
        deliverables: [
          "Model card, consented self-demo and sanitized failure/deletion walkthrough.",
          "Held-out error and local inference-timing report with sample-size limitations.",
        ],
        acceptanceCriteria: [
          "Report actual pair counts, uncertain/reject counts and error denominators without publishing biometric samples or identities.",
          "Show a deliberately invalid input and deletion/withdrawal behavior without exposing templates.",
          "Document model provenance uncertainty, threshold trade-offs and why this is not production authentication or liveness assurance.",
        ],
      },
    ],
  }),
  defineProject({
    id: "ai-face-capture-quality",
    title: "Face-Capture Quality Model",
    tracks: ["ai"],
    variant: "A-rebuild",
    summary:
      "Reconstruct a local usable-capture-versus-retake model with leakage-safe splits and consent withdrawal, not identity prediction.",
    scope:
      "Use consented adult captures across separate sessions and controlled degradations. Define a quality rubric, extract blur/illumination/face-size/pose features, compare a small scikit-learn classifier with fixed rules, give recapture guidance and support evaluation/export and clean retraining after withdrawal.",
    prerequisiteTags: [
      "python-basics",
      "opencv",
      "image-features",
      "scikit-learn-pipelines",
      "grouped-validation",
      "classification-metrics",
      "consent-and-privacy",
    ],
    historicalNote: reconstructionHistory,
    safety: [
      ...faceBoundaries,
      "The target is capture usability, not identity or personal attributes. Any downstream verification evaluation is consented, claimed-identity-only and reported for rejected as well as accepted captures.",
    ],
    sources: [sources.opencv, sources.biometrics, sources.mediapipe],
    gates: [
      {
        deliverables: [
          "Quality-label rubric, feature/data-flow diagram and consent/withdrawal policy.",
          "Private session/source-capture manifest, grouped split plan and fixed-rule baseline specification.",
        ],
        acceptanceCriteria: [
          "Every capture has consent, session and source-capture IDs; controlled degradations retain their parent capture ID.",
          "No source capture, its augmentations or neighbouring frames cross development/test boundaries.",
          "Lock the usable/retake rubric, baseline rules and evaluation split before tuning the classifier.",
        ],
      },
      {
        deliverables: [
          "Local feature extraction and a small train/evaluate/export pipeline.",
          "Recapture-guidance UI/CLI and a fixed-rule baseline using the same inputs.",
        ],
        acceptanceCriteria: [
          "Each usable/retake decision includes rubric-linked guidance without an identity, demographic or emotion label.",
          "Training preprocessing is fitted only on development data and exported with the classifier.",
          "Zero-face, multiple-face, corrupt or unsupported inputs return an explicit retake/error outcome rather than a fabricated score.",
        ],
      },
      {
        deliverables: [
          "Split-leakage, missing-feature and offline-inference tests.",
          "Withdrawal cleanup and clean-retraining tests covering captures, derived features, caches and exported artifacts.",
        ],
        acceptanceCriteria: [
          "Compare classifier and baseline errors on the same locked data without retuning on its labels.",
          "Report rejection coverage and downstream verification errors for all eligible captures without cherry-picking only accepted images.",
          "Withdrawal removes project-managed files and derived artifacts, invalidates affected model exports and excludes the subject from clean retraining.",
        ],
      },
      {
        deliverables: [
          "Model card and opt-in local demo of a usable capture and a retake/withdrawal case.",
          "Baseline-versus-classifier report with coverage, errors, session counts and inference timing.",
        ],
        acceptanceCriteria: [
          "Publish only aggregate results and synthetic diagrams; private captures, identities and templates remain local.",
          "Report sample counts, confusion matrices and coverage trade-offs; record unavailable downstream evidence rather than inventing it.",
          "Document split grouping, limited sample generalization and the fact that quality scoring proves neither liveness nor identity.",
        ],
      },
    ],
  }),
  defineProject({
    id: "data-multi-tenant-cdc",
    title: "Multi-Tenant Mall CDC Lakehouse",
    tracks: ["data"],
    variant: "B-build",
    summary:
      "Build a bounded tenant-isolated change pipeline with schema evolution, historical dimensions and reproducible rebuilds.",
    scope:
      "A proposed local MVP of three fictional tenants, four source entities and at most 100,000 generated change events. Use immutable change envelopes, per-tenant keys, schema versions, type-2 dimensions and replay manifests; no live source database or managed CDC service is required.",
    prerequisiteTags: [
      "pyspark-dataframes",
      "dimensional-modelling",
      "change-data-capture",
      "schema-evolution",
      "delta-merge",
      "tenant-isolation",
      "property-based-testing",
    ],
    historicalNote: plannedHistory,
    safety: [
      "Tenant IDs and payloads are fictional; tenant separation must be tested at ingestion, transformation and query boundaries.",
      fabricBoundary,
    ],
    sources: [sources.fabric, sources.fabricTrial, sources.postgres],
    gates: [
      {
        deliverables: [
          "Tenant-keyed change-envelope contract and historical-dimension/lineage diagram.",
          "Three-tenant fixture generator with insert/update/delete, duplicate, late and schema-change cases.",
        ],
        acceptanceCriteria: [
          "Every event names a tenant, entity key, operation, source sequence and schema version.",
          "Declare ordering, tombstone and history-interval rules plus an additive-change policy before loading data.",
          "Fixtures reuse entity keys across all three tenants and include at least one incompatible schema change.",
        ],
      },
      {
        deliverables: [
          "Tenant-scoped ingestion, merge and historical-dimension builders.",
          "Schema registry/compatibility checks and replay-manifest CLI.",
        ],
        acceptanceCriteria: [
          "The same entity key in different tenants yields separate current rows and histories.",
          "Duplicate delivery does not change curated rows or create extra historical versions.",
          "An additive nullable field is handled by the declared policy; incompatible payloads are quarantined with version and reason.",
        ],
      },
      {
        deliverables: [
          "Tenant-isolation, late-delivery and history-invariant test suite.",
          "Crash/retry, tombstone replay and clean-rebuild comparison tests.",
        ],
        acceptanceCriteria: [
          "No tenant can read or overwrite another tenant's outputs under the tested access paths.",
          "Late and duplicate events produce the reference history with no overlapping active intervals.",
          "A full rebuild and resumed incremental run produce identical canonical tables and audit counts.",
        ],
      },
      {
        deliverables: [
          "Schema-evolution and cross-tenant-denial demo.",
          "Replay/rebuild report with tenant-level reconciliation and processing timings.",
        ],
        acceptanceCriteria: [
          "Demonstrate an allowed additive change and a rejected breaking change while retaining source traceability.",
          "Measure rebuild versus incremental duration on the same seeded event set and verify output equality.",
          "Document history semantics, isolation limitations and a fully local alternative to optional Fabric capacity.",
        ],
      },
    ],
  }),
  defineProject({
    id: "data-event-time-reconciliation",
    title: "Event-Time Inventory Reconciliation Platform",
    tracks: ["data"],
    variant: "B-build",
    summary:
      "Build auditable inventory reconciliation that distinguishes when an event happened from when it became knowable.",
    scope:
      "A proposed local MVP of three stores, 100 SKUs and 20 sessions with bounded synthetic sales, returns, adjustments and stock counts. Track event/availability time, correction references and report versions; compare incremental results with a simple reference calculation.",
    prerequisiteTags: [
      "python-basics",
      "sql-window-functions",
      "event-time-processing",
      "temporal-data",
      "asof-joins",
      "inventory-reconciliation",
      "automated-testing",
    ],
    historicalNote: plannedHistory,
    safety: [
      "Use fictional stock movements only; do not connect to operational inventory or automatically adjust a real ledger.",
      "Watermarks are processing policies, not permission to discard corrections silently; preserve rejected/late-event evidence.",
      fabricBoundary,
    ],
    sources: [sources.fabric, sources.fabricTrial, sources.asof],
    gates: [
      {
        deliverables: [
          "Temporal movement/correction schema and stock-balance reference equations in plain language.",
          "Seeded delayed, duplicate, reversed and corrected movement fixtures with report-cutoff oracles.",
        ],
        acceptanceCriteria: [
          "Every movement records event time, availability time, stable ID and correction lineage where applicable.",
          "Define opening stock, sale/return/adjustment signs, cutoff inclusivity and versioned correction rules.",
          "Hand-written golden reports cover all three stores and include a correction unavailable at an earlier cutoff.",
        ],
      },
      {
        deliverables: [
          "Availability-aware reconciliation engine and versioned stock/variance outputs.",
          "Late-event queue and correction audit view showing original and superseding event IDs.",
        ],
        acceptanceCriteria: [
          "At each cutoff, reported balances use only events available by that cutoff.",
          "Duplicate movement IDs never double-count stock, and every correction traces to the event it supersedes.",
          "Late events update an explicit later report version rather than silently rewriting a published earlier view.",
        ],
      },
      {
        deliverables: [
          "Reference-calculation, cutoff-boundary and shuffled-delivery tests.",
          "Crash/retry and unavailable-correction failure tests.",
        ],
        acceptanceCriteria: [
          "Incremental balances and variances match the reference calculation for every store/SKU/cutoff fixture.",
          "Reordering delivery and replaying duplicates yield identical eligible balances under the declared sequence rules.",
          "Earlier as-known reports remain unchanged after later corrections; missing source movements produce an auditable failure.",
        ],
      },
      {
        deliverables: [
          "Delayed-return and correction demo with before/after report versions.",
          "Reconciliation and correction-propagation timing report.",
        ],
        acceptanceCriteria: [
          "Show a stock mismatch, the traced correction and the exact reference-matched resolution.",
          "Report event count, delay distribution, mismatch counts and correction latency from controlled runs.",
          "Explain event versus availability time, watermark limits and why this prototype cannot autonomously amend a real stock ledger.",
        ],
      },
    ],
  }),
  defineProject({
    id: "data-contract-recovery",
    title: "Data Contract and Recovery Test Platform",
    tracks: ["data"],
    variant: "B-build",
    summary:
      "Build a metadata-driven local harness that validates contracts and proves recovery across independent synthetic datasets.",
    scope:
      "A proposed MVP of three independent synthetic datasets, two schema versions each and small ingest/clean/aggregate dependency graphs. Define contracts, lineage, failure injection, bounded retries and reproducible rebuilds using Python/SQL or local Spark; avoid a general-purpose cloud orchestrator.",
    prerequisiteTags: [
      "python-packaging",
      "data-contracts",
      "dependency-graphs",
      "schema-evolution",
      "idempotency",
      "failure-injection",
      "automated-testing",
    ],
    historicalNote: plannedHistory,
    safety: [
      "Only independent generated datasets or licensed public fixtures are allowed; recovery exercises must never target a shared or production database.",
      fabricBoundary,
    ],
    sources: [sources.fabric, sources.fabricTrial],
    gates: [
      {
        deliverables: [
          "Versioned contract format for types, keys, nullability and business checks.",
          "Dataset/dependency DAGs and an enumerated failure/recovery matrix.",
        ],
        acceptanceCriteria: [
          "Generate all three datasets independently with valid and deliberately invalid rows under both schema versions.",
          "Specify compatible/incompatible contract changes, run IDs, checkpoint boundaries and retry limits.",
          "Dependency cycles and unknown dataset references are rejected before any task executes.",
        ],
      },
      {
        deliverables: [
          "Contract validator, dependency-aware runner and lineage/run ledger.",
          "Injectable read, transform and write failures with resumable task checkpoints.",
        ],
        acceptanceCriteria: [
          "A contract failure records dataset, field/row and reason and blocks dependent outputs.",
          "Successful independent branches can finish while the failed branch remains explicitly failed.",
          "Retrying one run ID cannot duplicate published aggregates or overwrite a different input version.",
        ],
      },
      {
        deliverables: [
          "Failure-matrix automation for missing files, schema drift, partial writes and interrupted checkpoints.",
          "Clean-rebuild and resume equivalence tests.",
        ],
        acceptanceCriteria: [
          "Every declared failure point has a test showing either bounded recovery or an explicit terminal failure.",
          "Recovered output digests match clean rebuilds for each dataset/version combination.",
          "Downstream artifacts never appear successful when their required upstream version failed validation.",
        ],
      },
      {
        deliverables: [
          "Contract-break/recovery demo and operator runbook.",
          "Recovery-matrix report with task counts, recovery duration and output digest comparisons.",
        ],
        acceptanceCriteria: [
          "Demonstrate one rejected contract change and one interrupted run that resumes to the clean expected output.",
          "Report actual passed/failed recovery cases and timings rather than a claimed reliability percentage without a workload.",
          "Document contract ownership, failure scope and local execution before describing optional Fabric integration.",
        ],
      },
    ],
  }),
  defineProject({
    id: "sde-order-orchestrator",
    title: "Failure-Tolerant Commerce Order Orchestrator",
    tracks: ["sde"],
    variant: "B-build",
    summary:
      "Build durable order work records with idempotent side effects and explicit compensation under crashes and retries.",
    scope:
      "A proposed local modular service with PostgreSQL, inventory/order workers and a payment simulator; bound fixtures to 100 products and 1,000 orders in one currency. Use durable work/outbox records, stable operation keys, retry budgets and compensating release/credit actions instead of paid message or payment services.",
    prerequisiteTags: [
      "http-apis",
      "postgresql-transactions",
      "state-machines",
      "idempotency",
      "transactional-outbox",
      "retry-backoff",
      "failure-injection",
    ],
    historicalNote: plannedHistory,
    safety: [
      "Only simulated payments and fictional inventory are allowed; never accept real cards or funds.",
      "Do not claim exactly-once transport or production resilience; demonstrate idempotent effects under the explicitly tested delivery model.",
    ],
    sources: [sources.postgres, sources.django],
    gates: [
      {
        deliverables: [
          "Order/work-item state diagrams and reserve/pay/confirm/compensate sequence diagram.",
          "Failure matrix, operation-key rules and deterministic inventory/payment stubs.",
        ],
        acceptanceCriteria: [
          "Define every durable state, legal transition and compensation with a finite retry budget.",
          "Fixtures include duplicate delivery, payment timeout, inventory rejection and a crash after effect but before acknowledgement.",
          "Specify stock/payment invariants for success, cancellation and compensation without relying on an external service.",
        ],
      },
      {
        deliverables: [
          "Atomic order/outbox creation and restartable worker loop.",
          "Idempotent reserve, simulated payment and compensation handlers with attempt history.",
        ],
        acceptanceCriteria: [
          "One normal order reaches confirmed state with exactly one reservation and one simulated charge.",
          "Repeated operation keys return the original outcome instead of applying side effects again.",
          "A restart resumes durable pending work rather than losing orders held only in memory.",
        ],
      },
      {
        deliverables: [
          "Crash-point, duplicate-delivery and retry-exhaustion tests.",
          "Reconciliation checks for stock, orders, payment events and compensations.",
        ],
        acceptanceCriteria: [
          "Crashing before/after each durable transition and replaying work yields at most one charge and one final stock effect.",
          "A failed order releases reserved stock and produces at most one compensating simulated credit when required.",
          "Retry exhaustion reaches an explicit recoverable/manual-review state without an infinite loop or false success.",
        ],
      },
      {
        deliverables: [
          "Crash/restart and compensation demo with correlated work IDs.",
          "Measured retry/recovery report and state-machine operations runbook.",
        ],
        acceptanceCriteria: [
          "The demo shows both a confirmed order and a deliberately failed order reconciled after restart.",
          "Record attempts, compensation counts, terminal states and observed recovery duration for each failure fixture.",
          "Explain transactional boundaries and why idempotent effects do not imply exactly-once message delivery.",
        ],
      },
    ],
  }),
  defineProject({
    id: "sde-tenant-marketplace",
    title: "Tenant-Isolated Multi-Seller Marketplace",
    tracks: ["sde"],
    variant: "B-build",
    summary:
      "Build enforceable seller, customer and staff boundaries around a small catalogue and transactional fulfillment workflow.",
    scope:
      "A proposed local Django/PostgreSQL MVP with three sellers, 30 customers and 100 synthetic products. Use seller-scoped orders, catalogue moderation, framework authentication, simulated checkout and fulfillment transitions; start with one seller per checkout rather than cross-seller settlement.",
    prerequisiteTags: [
      "django-basics",
      "authorization",
      "tenant-isolation",
      "sql-modelling",
      "postgresql-transactions",
      "state-machines",
      "concurrency-testing",
    ],
    historicalNote: plannedHistory,
    safety: [
      "Use fictional accounts, catalogue entries and fulfillment events only; no real sellers, addresses or transactions.",
      "Exclude real payouts, tax/legal compliance and courier integrations. Tenant isolation must be enforced on the server, not only hidden in the UI.",
    ],
    sources: [sources.postgres, sources.amazon, sources.django],
    gates: [
      {
        deliverables: [
          "Tenant-aware ER diagram and seller/customer/staff permission matrix.",
          "Three-seller fixture set with colliding local IDs, moderation states and stock edge cases.",
        ],
        acceptanceCriteria: [
          "Define ownership and permitted actions for every catalogue, order and fulfillment endpoint.",
          "Seed exactly three sellers and 30 fictional customers with approximately 100 products.",
          "Specify single-seller checkout, role assignment, price ownership and allowed fulfillment transitions.",
        ],
      },
      {
        deliverables: [
          "Seller catalogue controls, staff moderation and customer browsing/checkout.",
          "Owner-scoped order views and transactional fulfillment state changes.",
        ],
        acceptanceCriteria: [
          "Seller A cannot read or mutate seller B's private catalogue, orders or fulfillment records.",
          "A customer can see only their own orders and cannot submit a privileged seller/staff role.",
          "Only approved listings can be purchased and all prices/stock checks come from the server.",
        ],
      },
      {
        deliverables: [
          "Permission-matrix tests for list/detail/export/mutation routes.",
          "Concurrent purchase, role-escalation and rollback tests.",
        ],
        acceptanceCriteria: [
          "Cross-tenant IDs in URLs, bodies and filters are denied without leaking private records.",
          "Racing purchases never oversell stock, and failed orders leave inventory unchanged.",
          "Illegal fulfillment transitions and unauthorized moderation actions fail without a partial state update.",
        ],
      },
      {
        deliverables: [
          "Three-role demo with a cross-seller denial and stock race.",
          "Permission-coverage/concurrency report and tenancy trade-off notes.",
        ],
        acceptanceCriteria: [
          "Exercise every permission-matrix action with an allowed and denied case and record the actual results.",
          "Report concurrent checkout outcomes, final stock and observed response latency for a named local workload.",
          "Document server-side tenant scoping and the deliberate exclusions of settlement, real shipping and compliance.",
        ],
      },
    ],
  }),
  defineProject({
    id: "sde-product-search",
    title: "Product Search and Relevance Evaluation Service",
    tracks: ["sde"],
    variant: "B-build",
    summary:
      "Build lexical, dense and reranked product retrieval with filter-correct caching and measured relevance/latency trade-offs.",
    scope:
      "A proposed MVP of 1,000 synthetic products and at least 40 manually labelled queries split into development and held-out sets. Use a lexical baseline, licensed local embedding/reranking components, category/price/availability filters and version-keyed caches; no conversion or sales-lift claims.",
    prerequisiteTags: [
      "python-basics",
      "http-apis",
      "information-retrieval",
      "embeddings",
      "ranking-metrics",
      "cache-invalidation",
      "profiling",
    ],
    historicalNote: plannedHistory,
    safety: [
      "Use synthetic product text and documented component licenses; do not scrape restricted catalogues or send private queries to paid APIs.",
      "Relevance labels are test judgments, not observed customer behavior; never invent conversion gains.",
    ],
    sources: [sources.retrieval],
    gates: [
      {
        deliverables: [
          "Index/filter/cache architecture and relevance-labelling rubric.",
          "Seeded catalogue and at least 40 labelled queries with a locked held-out split.",
        ],
        acceptanceCriteria: [
          "Every query has relevance judgments and declared applicable category/price/availability filters.",
          "Lock held-out queries before tuning retrieval weights or reranking depth.",
          "Define recall@k, NDCG@k and latency measurement commands, including empty-result and typo cases.",
        ],
      },
      {
        deliverables: [
          "Lexical, dense and reranked search paths over the same versioned catalogue.",
          "Filter-aware API and cache keyed by query, filters, index version and model version.",
        ],
        acceptanceCriteria: [
          "Every returned product satisfies the requested filters across all three retrieval paths.",
          "Repeated identical requests use the documented cache without mixing different filters or index versions.",
          "All retrieval modes run locally after licensed components are obtained; no paid API is required.",
        ],
      },
      {
        deliverables: [
          "Filter-equivalence, index-update and stale-cache regression tests.",
          "Timeout, missing-model, empty-query and corrupted-index failure tests.",
        ],
        acceptanceCriteria: [
          "A price/availability update invalidates old result caches so excluded items cannot reappear.",
          "Reranker failure returns a clearly labelled bounded fallback or explicit error, never an unfiltered result.",
          "The same held-out judgments evaluate every method; test labels are never used for tuning.",
        ],
      },
      {
        deliverables: [
          "Search/filter/cache demo with a deliberately unavailable reranker.",
          "Held-out relevance-versus-latency report for lexical, dense and reranked configurations.",
        ],
        acceptanceCriteria: [
          "Report actual recall@k, NDCG@k, query count, model/index versions and cold/warm latency for every method.",
          "Include empty-result and failure cases, not only queries improved by the advanced methods.",
          "Explain relevance/latency trade-offs without asserting conversion gains or guaranteeing a better score.",
        ],
      },
    ],
  }),
  defineProject({
    id: "quant-multi-instrument-ledger",
    title: "Multi-Instrument Paper Exchange and Ledger",
    tracks: ["quant"],
    variant: "B-build",
    summary:
      "Build deterministic fictional-market execution with reconciled cash/positions and snapshot-safe replay.",
    scope:
      "A proposed local MVP with three fictional instruments, four accounts, one currency and at most 50,000 generated commands. Extend explicit sequencing and price/FIFO matching with integer-unit cash/position ledgers, reservations, snapshots and replay; omit leverage and derivatives.",
    prerequisiteTags: [
      "order-book-basics",
      "data-structures",
      "deterministic-replay",
      "ledger-accounting",
      "fixed-point-arithmetic",
      "property-based-testing",
      "profiling",
    ],
    historicalNote: plannedHistory,
    safety: [
      quantBoundary,
      "No real accounts, live order routing, margin, derivatives or exchange certification. Use explicitly declared settlement and fee rules for the simulator.",
    ],
    sources: [sources.janeStreet, sources.matching],
    gates: [
      {
        deliverables: [
          "Global sequence, matching and cash/position posting specification.",
          "Three-instrument fixtures, starting-account balances and an independent ledger oracle.",
        ],
        acceptanceCriteria: [
          "Define integer price/quantity/cash units, rounding, zero or fixed fees, and reservation-release rules.",
          "Every expected fill has a stable trade ID and balanced buyer/seller cash/position postings.",
          "Include cross-instrument interleaving, insufficient funds/position and snapshot-boundary scenarios.",
        ],
      },
      {
        deliverables: [
          "Sequenced multi-instrument matching engine with idempotent trade postings.",
          "Cash/position views, snapshot serialization and replay commands.",
        ],
        acceptanceCriteria: [
          "Golden interleaved commands preserve per-instrument price/FIFO order under one deterministic sequence.",
          "Every fill posts exactly once and final cash/positions match the independent ledger oracle.",
          "Orders exceeding available cash/position are rejected without changing balances or leaking reservations.",
        ],
      },
      {
        deliverables: [
          "Accounting conservation, snapshot/replay and duplicate-posting tests.",
          "Crash, corrupt-snapshot and partial-posting recovery tests.",
        ],
        acceptanceCriteria: [
          "Replay from a valid snapshot and full replay produce identical fills, books, cash and positions.",
          "Cash/position conservation holds under the declared fee policy and no reserved balance becomes negative.",
          "Duplicate trade IDs cannot double-post; partial ledger writes roll back and corrupt snapshots fail explicitly.",
        ],
      },
      {
        deliverables: [
          "Snapshot/restart demo with a rejected unfunded order.",
          "Reconciliation, throughput and replay-duration report by instrument/workload.",
        ],
        acceptanceCriteria: [
          "Record exact reconciliation differences, including zero differences when observed, rather than claiming reconciliation without checks.",
          "Measure matching and replay with hardware, command mix, seed and snapshot size recorded.",
          "Explain accounting scope and exclude profit, alpha or real-trading-performance claims.",
        ],
      },
    ],
  }),
  defineProject({
    id: "quant-versioned-research-data",
    title: "Versioned Point-in-Time Research Data Platform",
    tracks: ["quant"],
    variant: "B-build",
    summary:
      "Build lineage-preserving, availability-aware research snapshots with optimized joins checked against a simple oracle.",
    scope:
      "A proposed local MVP of five fictional instruments, 30 sessions and no more than 100,000 observations/revisions. Preserve immutable source versions, availability-time history, snapshot manifests and UTC/tie/staleness rules; compare pandas/DuckDB joins with reference Python code.",
    prerequisiteTags: [
      "pandas",
      "sql-window-functions",
      "temporal-data",
      "asof-joins",
      "data-lineage",
      "versioned-datasets",
      "profiling",
    ],
    historicalNote: plannedHistory,
    safety: [
      quantBoundary,
      "Use synthetic time series or documented public fixtures only, without paid data vendors. Snapshot correctness is not investment research alpha.",
    ],
    sources: [sources.janeStreet, sources.asof],
    gates: [
      {
        deliverables: [
          "Bitemporal/versioned data model and snapshot/lineage manifest format.",
          "Five-instrument delayed/revised fixture generator and slow reference snapshot builder.",
        ],
        acceptanceCriteria: [
          "Every source revision has event time, availability time, stable source ID and immutable version identity.",
          "Define deterministic equal-time ties, timezone normalization and staleness/null policies before optimizing.",
          "Golden snapshots cover revision-before/after-cutoff, absent observations and cross-instrument timestamp collisions.",
        ],
      },
      {
        deliverables: [
          "Versioned ingestion and reproducible snapshot export CLI.",
          "Availability-filtered optimized joins with row-level source lineage.",
        ],
        acceptanceCriteria: [
          "Every exported value traces to a specific source version available by the requested cutoff.",
          "Rebuilding the same manifest produces identical canonical output and lineage digests.",
          "Later revisions appear only at eligible cutoffs and cannot mutate an already pinned snapshot.",
        ],
      },
      {
        deliverables: [
          "Reference-versus-optimized temporal test suite.",
          "Missing-version, duplicate-revision and corrupted-manifest failure tests.",
        ],
        acceptanceCriteria: [
          "Optimized joins equal reference results for every generated instrument/cutoff combination.",
          "Adding future-available observations never changes earlier as-known snapshots.",
          "A missing or altered source version fails validation rather than silently substituting current data.",
        ],
      },
      {
        deliverables: [
          "Pinned-snapshot/revision demo and lineage inspection commands.",
          "Reference/optimized runtime and memory report with output equivalence results.",
        ],
        acceptanceCriteria: [
          "Show both a reproducible pinned snapshot and a later snapshot that legitimately includes a new revision.",
          "Measure input/version/cutoff counts, runtime and the declared memory metric on the same fixture set.",
          "Document temporal policies, storage trade-offs and why no return or investment-advantage conclusion follows.",
        ],
      },
    ],
  }),
  defineProject({
    id: "quant-portfolio-reconciliation",
    title: "Paper-Portfolio Exposure and Reconciliation Service",
    tracks: ["quant"],
    variant: "B-build",
    summary:
      "Build reference-tested fictional portfolio valuation, cash/position reconciliation and transparent deterministic stress scenarios.",
    scope:
      "A proposed local MVP of two paper portfolios, five fictional cash-equity instruments, one currency and 20 sessions. Import synthetic trades, prices and statement snapshots, value with fixed-point arithmetic, flag stale/missing marks and apply explicitly documented price shocks; exclude derivatives and strategy optimization.",
    prerequisiteTags: [
      "python-basics",
      "sql-aggregation",
      "fixed-point-arithmetic",
      "portfolio-accounting",
      "reconciliation",
      "scenario-analysis",
      "automated-testing",
    ],
    historicalNote: plannedHistory,
    safety: [
      quantBoundary,
      "Stress scenarios are transparent hypothetical shocks, not forecasts, risk certification or a recommendation to trade. No live brokerage account or paid market data is required.",
    ],
    sources: [sources.janeStreet],
    gates: [
      {
        deliverables: [
          "Trade/cash/position/price data dictionary and valuation/reconciliation rules.",
          "Two-portfolio golden ledger with stale/missing prices, duplicate trades and statement mismatches.",
        ],
        acceptanceCriteria: [
          "Specify price units, cash rounding, valuation cutoff and position sign conventions.",
          "Hand-calculate cash, quantities, marked values and reconciliation differences for every small golden case.",
          "Predeclare simple upward/downward price-shock scenarios and how missing or stale marks block or qualify results.",
        ],
      },
      {
        deliverables: [
          "Idempotent trade/statement import, valuation and reconciliation APIs/CLI.",
          "Exposure breakdown and deterministic stress-scenario outputs with source references.",
        ],
        acceptanceCriteria: [
          "Valuations and cash/position differences exactly match the fixed-point reference calculation.",
          "A missing mark is flagged unavailable, never silently valued at zero.",
          "Repeated trade IDs do not change cash or holdings, and every mismatch links to its input evidence.",
        ],
      },
      {
        deliverables: [
          "Reference, reversal, cutoff and scenario-calculation tests.",
          "Malformed input, stale price and partial-import rollback tests.",
        ],
        acceptanceCriteria: [
          "Cancelling/reversing a trade produces the declared cash/position result exactly once.",
          "The documented price shocks match hand-computed scenario values and leave baseline inputs unchanged.",
          "A failed batch cannot partly update holdings, and unavailable prices remain explicit in every derived report.",
        ],
      },
      {
        deliverables: [
          "Statement-mismatch investigation and stale-price failure demo.",
          "Valuation/reconciliation runtime report plus a scenario assumptions table.",
        ],
        acceptanceCriteria: [
          "Demonstrate a traced cash/position mismatch and its fixture-based resolution without hiding unresolved differences.",
          "Report actual record counts, mismatch counts, flagged marks and processing duration.",
          "Label every stress result hypothetical and make no profit, return, alpha or investment-advice claims.",
        ],
      },
    ],
  }),
  defineProject({
    id: "ai-permission-aware-assistant",
    title: "Permission-Aware Mall Knowledge Assistant",
    tracks: ["ai"],
    variant: "B-build",
    summary:
      "Build a local policy assistant whose retrieval, citations, caches and abstention respect explicit access rules.",
    scope:
      "A proposed MVP of 60 synthetic operating-policy documents across three fictional roles/tenants and at least 40 labelled questions. Use access-filtered lexical/dense retrieval, local reranking, grounded citations and a local answer adapter; keep a deterministic stub for tests and separate real-model evaluation.",
    prerequisiteTags: [
      "python-basics",
      "information-retrieval",
      "embeddings",
      "authorization",
      "tenant-isolation",
      "rag-evaluation",
      "prompt-injection-testing",
    ],
    historicalNote: plannedHistory,
    safety: [
      "Use invented mall policies, identities and questions only; no internal employer/client documents or private prompts.",
      "Retrieved instructions are untrusted content, never tool permissions. This assistant cannot change policy or execute operational actions.",
      "Use licensed local components or a deterministic offline test adapter; paid model APIs are optional and not required.",
    ],
    sources: [sources.retrieval, sources.evaluation],
    gates: [
      {
        deliverables: [
          "Document/chunk permission schema, retrieval/answer flow and citation contract.",
          "Synthetic policy corpus, access matrix and development/held-out/adversarial question sets.",
        ],
        acceptanceCriteria: [
          "Every document/chunk has a version, source identifier and explicit authorized roles/tenants.",
          "At least 40 questions include supported, unsupported, cross-tenant and malicious-source-instruction cases.",
          "Lock held-out questions and define citation support, retrieval recall, abstention and leakage checks before tuning.",
        ],
      },
      {
        deliverables: [
          "Authorization-filtered retrieval/reranking and a cited-answer-or-abstain pipeline.",
          "Role/tenant/document-version-scoped cache with a local answer adapter.",
        ],
        acceptanceCriteria: [
          "Authorization filtering occurs before retrieval context reaches the reranker or answer model.",
          "Every emitted citation resolves to an authorized retrieved passage in the pinned corpus version.",
          "Questions without authorized supporting evidence yield explicit abstention rather than an invented answer.",
        ],
      },
      {
        deliverables: [
          "Cross-tenant retrieval/cache and adversarial instruction tests.",
          "Held-out citation/support evaluator and missing-index/provider-failure tests.",
        ],
        acceptanceCriteria: [
          "Unauthorized passages never enter returned results, model context, citations or another tenant's cached answers.",
          "Malicious retrieved instructions cannot override access rules, expose hidden documents or trigger an operational action.",
          "Revoking document access invalidates eligible cached responses; unsupported or failed retrieval cannot be labelled a supported answer.",
        ],
      },
      {
        deliverables: [
          "Cited-answer, denied-access and abstention demo.",
          "Held-out/adversarial evaluation report with separate stub and actual local-model results.",
        ],
        acceptanceCriteria: [
          "Report question counts, retrieval/citation support, abstention errors, leakage failures and latency from recorded runs.",
          "Do not present deterministic stub outputs as measured language-model quality.",
          "Document model/corpus versions, access assumptions and failure cases without publishing confidential prompts or documents.",
        ],
      },
    ],
  }),
  defineProject({
    id: "ai-governed-analytics",
    title: "Governed Analytics Agent and Text-to-SQL Service",
    tracks: ["ai"],
    variant: "B-build",
    summary:
      "Build schema-grounded, read-only local analytics with independent tenant enforcement and result-based correctness evaluation.",
    scope:
      "A proposed PostgreSQL MVP with four synthetic reporting tables, three tenants and at least 30 labelled analytics questions. Use a local query-generation adapter, parsed SELECT allowlists, read-only database permissions, server-bound tenant context, a two-second execution timeout and a 200-row result cap.",
    prerequisiteTags: [
      "sql-joins",
      "sql-aggregation",
      "query-plans",
      "authorization",
      "tenant-isolation",
      "sql-parsing",
      "llm-evaluation",
    ],
    historicalNote: plannedHistory,
    safety: [
      "Use synthetic schema, data and questions; no employer/client reporting database or secrets in model prompts.",
      "No writes, DDL, stacked statements, dangerous functions, file/network access or privileged database role. Model output is untrusted and never a source of authorization.",
      "A local generator/test adapter is sufficient; paid model APIs are optional and cannot be required for tests.",
    ],
    sources: [sources.postgres, sources.evaluation],
    gates: [
      {
        deliverables: [
          "Schema-grounding contract, tenant threat model and query allowlist specification.",
          "Three-tenant database fixtures and at least 30 questions with reference SQL/results.",
        ],
        acceptanceCriteria: [
          "Label answerable, ambiguous, forbidden and cross-tenant questions with expected outcomes.",
          "Specify permitted tables/columns/functions, server-owned tenant identity, two-second timeout and 200-row cap.",
          "Define result equivalence rules for ordering, nulls and numeric values without requiring identical SQL text.",
        ],
      },
      {
        deliverables: [
          "Schema-grounded query generator, parsed validation and read-only execution service.",
          "Independent database tenant policy and bounded result/explanation response.",
        ],
        acceptanceCriteria: [
          "Only validated single SELECT queries over allowed reporting objects execute under a non-privileged read-only role.",
          "Server-bound tenant controls apply even if generated SQL omits or manipulates a tenant filter.",
          "Each execution enforces the two-second timeout and 200-row cap, returning an explicit bounded/timeout outcome.",
        ],
      },
      {
        deliverables: [
          "Labelled result-correctness tests and direct database-role enforcement tests.",
          "Injection, stacked-query, prohibited-function, tenant-escape and oversized-query tests.",
        ],
        acceptanceCriteria: [
          "Allowed questions produce results equivalent to their reference SQL on the same tenant fixture.",
          "Writes, DDL, stacked statements and file/network/system-catalog escape attempts are denied before execution or by independent database controls.",
          "Ambiguous/unsupported requests abstain; timeout and row-cap failures cannot be reported as complete unrestricted results.",
        ],
      },
      {
        deliverables: [
          "Valid analytics, cross-tenant denial and bounded-query failure demo.",
          "Versioned question/result evaluation report and query-plan/latency examples.",
        ],
        acceptanceCriteria: [
          "Report answerable-case result accuracy, abstention mistakes, denied attacks, timeouts and observed latency with actual denominators.",
          "Separate local stub tests from any actual model evaluation and record prompt/schema/model versions.",
          "Explain layered tenant/read-only enforcement and explicitly exclude autonomous database mutations.",
        ],
      },
    ],
  }),
  defineProject({
    id: "ai-evaluation-serving",
    title: "LLM Evaluation and Reliable Serving Platform",
    tracks: ["ai"],
    variant: "B-build",
    summary:
      "Build a reproducible offline evaluation harness and bounded local serving path that exposes regressions and provider failures.",
    scope:
      "A proposed local MVP with two prompt versions, two retrieval versions, at least 40 labelled cases, one optional local model and deterministic fault-injection adapters. Version evaluation manifests, enforce a three-attempt retry ceiling and total request deadline, scope caches and keep privacy-aware traces.",
    prerequisiteTags: [
      "python-packaging",
      "http-apis",
      "evaluation-datasets",
      "regression-testing",
      "retry-backoff",
      "cache-invalidation",
      "observability",
    ],
    historicalNote: plannedHistory,
    safety: [
      "Use synthetic prompts and answers with redacted/minimal traces; do not log secrets, private user text or biometric data.",
      "Paid APIs are optional. Offline test adapters must be clearly distinguished from real-model quality measurements.",
      "Do not promise availability percentages, model superiority or cost reductions without recorded, scoped experiments.",
    ],
    sources: [sources.retrieval, sources.evaluation],
    gates: [
      {
        deliverables: [
          "Versioned prompt/retrieval/evaluation manifests and rubric with human calibration notes.",
          "At least 40 labelled cases plus timeout, rate-limit, malformed-response and unavailable-provider fixtures.",
        ],
        acceptanceCriteria: [
          "Each evaluation run identifies dataset, prompt, retrieval, model/adapter and scoring versions.",
          "Freeze regression criteria and held-out cases before choosing a preferred configuration.",
          "Declare retryable errors, at most three attempts, a total request deadline and trace-retention/redaction rules.",
        ],
      },
      {
        deliverables: [
          "Offline evaluation runner with per-case judgments and configuration comparison.",
          "Local serving adapter with bounded retries, cache versioning and redacted correlation traces.",
        ],
        acceptanceCriteria: [
          "The same pinned manifest reproduces inputs, configuration and deterministic test-adapter outcomes.",
          "Cache keys distinguish tenant/access context, model, prompt and retrieval versions.",
          "Only declared transient failures are retried, with every request subject to both attempt and deadline budgets.",
        ],
      },
      {
        deliverables: [
          "Regression-gate and provider-failure tests using controllable clocks/stubs.",
          "Cache-isolation, stale-version, redaction and bounded-queue tests.",
        ],
        acceptanceCriteria: [
          "Timeout/rate-limit storms never exceed three attempts or the configured total deadline.",
          "Terminal errors, malformed outputs and exhausted budgets return explicit failures rather than successful cached placeholders.",
          "Traces contain no seeded secrets/private prompt text, and version/access changes cannot reuse stale unauthorized outputs.",
        ],
      },
      {
        deliverables: [
          "Regression-detection and unavailable-provider demo.",
          "Configuration comparison report with quality, error, retry, cache-hit and latency measurements.",
        ],
        acceptanceCriteria: [
          "Show a deliberately regressed configuration failing its predeclared gate and a provider failure exhausting the bounded policy.",
          "Report actual case counts, rubric judgments, attempts and latency; label deterministic-adapter results separately from model inference.",
          "Document scoring uncertainty, privacy/retention decisions and why offline evidence does not establish a production SLA.",
        ],
      },
    ],
  }),
  defineProject({
    id: "shared-fabric-reporting",
    title: "Microsoft Fabric Reporting Workflows",
    tracks: ["data", "sde", "quant", "ai"],
    variant: "professional-synthetic-recreation",
    summary:
      "Create one shareable, synthetic recreation of table-specific notebook, staging-to-star-schema and reporting workflows.",
    scope:
      "One shared project, not four copies: three independent synthetic source tables for stores, products and transactions, at most 10,000 fact rows and two reporting measures. Build table-specific local Python/PySpark notebooks, dimension/fact transformations, orchestration and SQL reference reporting outputs; Fabric/Power BI execution is optional and labelled only if actually run.",
    prerequisiteTags: [
      "python-basics",
      "sql-joins",
      "pyspark-dataframes",
      "dimensional-modelling",
      "pipeline-orchestration",
      "data-quality",
      "dax-measures",
    ],
    historicalNote:
      "One separate synthetic portfolio recreation, not the original workplace implementation or independently verified employment evidence. This recreation is incomplete and starts from synthetic or documented legally usable public fixtures; it does not recover or publish workplace artifacts.",
    safety: [
      "Recreate general skills only, from synthetic/public fixtures with documented provenance and licensing. Never copy employer/client notebooks, data, code, screenshots, identities or confidential architecture.",
      "Use invented table names, businesses, diagrams and report layouts; remove identifying paths, tenant IDs, credentials and source metadata from all exports.",
      "Do not claim this recreation is the original workplace implementation or count it as a separate project for each track.",
      fabricBoundary,
    ],
    sources: [sources.fabric, sources.fabricTrial, sources.postgres],
    gates: [
      {
        deliverables: [
          "Fictional source-to-staging-to-dimension/fact lineage diagram and independent fixture generator.",
          "Table contracts, two reporting-measure definitions and publication-safety checklist.",
        ],
        acceptanceCriteria: [
          "Generate stores, products and at most 10,000 synthetic transaction fact rows without accessing workplace files or systems.",
          "Define keys, grain, null/duplicate handling and golden totals for net sales and units sold.",
          "Inventory every planned artifact's provenance; no employer/client identifiers, source screenshots or confidential schema details are permitted.",
        ],
      },
      {
        deliverables: [
          "Table-specific transformation notebooks/scripts and dependency-ordered local pipeline.",
          "Store/product/date dimensions, transaction fact and SQL report outputs with documented optional DAX equivalents.",
        ],
        acceptanceCriteria: [
          "A clean local run processes staging through dimensions/facts to both reports without a paid API or Fabric capacity.",
          "Every accepted fact resolves dimension keys, and both measures equal the fixture golden totals.",
          "Repeated input runs leave curated records and reporting totals unchanged under the declared merge policy.",
        ],
      },
      {
        deliverables: [
          "Schema, referential-integrity, measure-reconciliation and retry/backfill tests.",
          "Publication scan/checklist and malformed-input/partial-pipeline failure fixtures.",
        ],
        acceptanceCriteria: [
          "Malformed rows are quarantined with a reason; an interrupted table task can resume without duplicate facts.",
          "A bounded corrected-file backfill matches a clean rebuild for dimensions, facts and both report measures.",
          "Inspect notebooks, logs, diagrams and exports for secrets and employer/client identities; only synthetic or licensed public content passes.",
        ],
      },
      {
        deliverables: [
          "Sanitized local notebook-to-report demo, including a failed table and successful retry.",
          "Measured full/incremental run report and an explicit local-versus-optional-Fabric execution matrix.",
        ],
        acceptanceCriteria: [
          "Record actual input/output counts, run durations and report totals using the same fictional fixture manifest.",
          "Label unexecuted Fabric/Power BI or DAX paths as unexecuted; no platform screenshots or measured results may be fabricated.",
          "Document optional trial expiry/capacity charges and link this one evidence package across all four tracks without duplicating its project count.",
        ],
      },
    ],
  }),
];
