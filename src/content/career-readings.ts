import type { CareerReading } from "../domain/types";

const reading = (
  title: string,
  url: string,
  locator: string,
): CareerReading => ({
  title,
  url,
  locator,
  verifiedOn: "2026-09-29",
});

export const careerReadings = {
  typing: reading(
    "Python type hints",
    "https://docs.python.org/3/library/typing.html",
    "Opening note and type aliases: annotations describe contracts but Python does not enforce them at runtime. Use syntax supported by your chosen Python version.",
  ),
  numpy: reading(
    "NumPy broadcasting",
    "https://numpy.org/doc/stable/user/basics.broadcasting.html",
    "General broadcasting rules and examples: compare trailing dimensions, distinguish shape compatibility from meaningful feature alignment, and account for memory.",
  ),
  metrics: reading(
    "OpenTelemetry metrics",
    "https://opentelemetry.io/docs/concepts/signals/metrics/",
    "Metric instruments and aggregation: choose units, counters, gauges and histograms deliberately; local export is sufficient and no hosted backend is required.",
  ),
  release: reading(
    "Google SRE: Canarying Releases",
    "https://sre.google/workbook/canarying-releases/",
    "Release Engineering Principles and Balancing Release Velocity and Reliability. A rollout health comparison is not automatically a randomized causal product experiment.",
  ),
  signatures: reading(
    "PyCA Ed25519 signing and verification",
    "https://cryptography.io/en/latest/hazmat/primitives/asymmetric/ed25519/",
    "Signing and Verification and public-key verify: use disposable keys through the maintained library, handle InvalidSignature explicitly, and never implement the primitive yourself.",
  ),
  trust: reading(
    "Sigstore verification concepts",
    "https://docs.sigstore.dev/cosign/verifying/verify/",
    "Keyless verification, claim checking and Local verifications: trusted signer identity and the artifact binding matter beyond a mathematically valid signature. This reading does not imply a project implements Sigstore.",
  ),
  needs: reading(
    "GOV.UK: learning user needs",
    "https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs",
    "Researching, writing and validating user needs: distinguish evidence from non-user assumptions and connect needs to acceptance criteria.",
  ),
  discovery: reading(
    "GOV.UK: discovery",
    "https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works",
    "Define the problem and understand constraints before committing to a solution. The public-service context is an example, not a requirement to launch a public service.",
  ),
  consent: reading(
    "GOV.UK: informed research consent",
    "https://www.gov.uk/service-manual/user-research/getting-users-consent-for-research",
    "What informed consent is, managing research data and withdrawal. A synthetic scenario or self-walkthrough is not a participant interview.",
  ),
  stories: reading(
    "GOV.UK: user stories",
    "https://www.gov.uk/service-manual/agile-delivery/writing-user-stories",
    "Actor, narrative, goal, acceptance criteria and evidence links. Connect the user need to a testable outcome rather than a preferred implementation.",
  ),
  roadmap: reading(
    "GOV.UK: developing a roadmap",
    "https://www.gov.uk/service-manual/agile-delivery/developing-a-roadmap",
    "Roadmap principles: vision, outcomes, iteration, dependencies and the difference between a roadmap and a delivery backlog.",
  ),
  outcomes: reading(
    "GOV.UK: meaningful service metrics",
    "https://www.gov.uk/service-manual/measuring-success/how-to-set-performance-metrics-for-your-service",
    "Purpose, benefits, hypotheses, metric definitions and data sources. UK government mandatory reporting rules do not apply to these fictional learning cases.",
  ),
  usability: reading(
    "GOV.UK: moderated usability testing",
    "https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing",
    "Design the tasks and run a session: neutral goals, consistent instructions and observation. A self-evaluation cannot establish actual customer usability.",
  ),
  technology: reading(
    "GOV.UK: choosing technology",
    "https://www.gov.uk/service-manual/technology/choosing-technology-an-introduction",
    "Reversibility, total cost of ownership, control of data and decisions based on prototypes and context rather than technology prestige.",
  ),
  experiments: reading(
    "Microsoft Research: sample ratio mismatch",
    "https://www.microsoft.com/en-us/research/articles/diagnosing-sample-ratio-mismatch-in-a-b-testing/",
    "SRM impact, assignment/execution/logging/analysis causes, and diagnosis before effect analysis. A mismatch warning is not repaired by ignoring missing users.",
  ),
  economics: reading(
    "OpenStax: break-even units and revenue",
    "https://openstax.org/books/principles-managerial-accounting/pages/3-2-calculate-a-break-even-point-in-units-and-dollars",
    "CVP assumptions and Basics of the Break-Even Point: contribution margin, fixed costs, relevant range and the distinction between units and revenue.",
  ),
} satisfies Record<string, CareerReading>;
