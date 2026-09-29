import { defineProject } from "./projects";
import type { Project } from "../domain/types";
import { careerPackets } from "./career-exercises";

const definitions: {
  id: string;
  tracks: Project["tracks"];
  prerequisites: string[];
  tags: string[];
  scope: string;
}[] = [
  {
    id: "sde-tenant-policy-service",
    tracks: ["sde", "computer-security-systems"],
    prerequisites: ["security-m02-identity", "security-m07-web-assurance"],
    tags: [
      "authorization",
      "tenant-isolation",
      "policy-versioning",
      "credential-revocation",
      "audit-integrity",
    ],
    scope:
      "Build an owned, single-host policy-decision service for synthetic tenants, server-owned identities and typed attributes. Version policies immutably, guard activation/rollback by revision and commit decision audits before allowing. Treat downstream resource enforcement as a separate consumer responsibility, not as a feature obtained merely by calling this service.",
  },
  {
    id: "ai-model-serving-gateway",
    tracks: ["sde", "ai", "computer-security-systems"],
    prerequisites: ["ai-m02-classical-ml", "ai-m07-mlops-serving"],
    tags: [
      "model-serving",
      "artifact-validation",
      "numpy",
      "admission-control",
      "held-out-evaluation",
    ],
    scope:
      "Build a loopback-oriented classical-model service with real local CPU predictions, strict versioned input/artifact contracts, bounded workers, tenant quotas and visible failures. Keep training, validation-only promotion and test reporting separate. Compare batch and online fixtures, exercise timeout draining and reject corrupt or incompatible releases without claiming LLM, GPU or distributed execution.",
  },
  {
    id: "ai-retrieval-evaluation-lab",
    tracks: ["ai", "technical-product-management"],
    prerequisites: ["ai-m05-rag-adaptation"],
    tags: [
      "information-retrieval",
      "ranking-metrics",
      "authorization",
      "held-out-evaluation",
      "abstention",
    ],
    scope:
      "Build a bounded retrieval evaluation lab over original synthetic documents and queries. Compare a simple sparse baseline with an explicitly described alternative, enforce permissions before exposing text, preserve a held-out query set and report per-query ranking, abstention and latency evidence. Generated answers, neural embeddings and customer conversion are not implied by this learning brief.",
  },
  {
    id: "ai-model-observability-lab",
    tracks: ["ai"],
    prerequisites: ["ai-m02-classical-ml", "ai-m07-mlops-serving"],
    tags: [
      "model-monitoring",
      "delayed-labels",
      "data-contracts",
      "drift-detection",
      "reproducibility",
    ],
    scope:
      "Build a local synthetic-data workbench that trains or reproduces a real baseline and records model, feature and label versions. Distinguish infrastructure failure, harmless distribution shift and label-confirmed quality loss. Audit label maturity and denominators before proposing an incident action, and label any unimplemented retraining or rollback control as future learner work.",
  },
  {
    id: "security-supply-chain-verifier",
    tracks: ["computer-security-systems"],
    prerequisites: [
      "security-m03-cryptographic-trust",
      "security-m08-cloud-supply-chain",
    ],
    tags: [
      "artifact-signing",
      "trust-policy",
      "provenance",
      "revocation",
      "release-verification",
    ],
    scope:
      "Build a local verifier for benign learner-owned release artifacts using a maintained signature library and disposable keys. Bind artifact identity, signer trust and release/version policy; test wrong keys, changed bytes, revoked authority and replay. Never execute untrusted artifacts, expose genuine signing keys or infer a SLSA level, cloud integration or complete supply-chain assurance from a local demonstration.",
  },
];

export const careerProjects: Project[] = definitions.map((definition) => {
  const packet = careerPackets.find((item) => item.projectId === definition.id);
  if (!packet) throw new Error(`Missing learning packet for ${definition.id}`);
  const gateEvidence = packet.exercises.map((exercise) => ({
    deliverables: exercise.deliverables,
    acceptanceCriteria: exercise.acceptanceCriteria,
  }));
  if (gateEvidence.length !== 4)
    throw new Error(`${definition.id} needs four build gates`);
  return defineProject({
    id: definition.id,
    title: packet.title,
    tracks: definition.tracks,
    variant: "career-practice",
    summary: packet.exercises[0].concepts.join(" "),
    scope: definition.scope,
    prerequisites: definition.prerequisites,
    prerequisiteTags: definition.tags,
    historicalNote:
      "A contemporary educational build brief, not historical college work or employment evidence. Your build and independent-readiness gates start incomplete. A separate AI-assisted reference does not demonstrate your own mastery.",
    safety: [
      "Use only owned, authorized local environments, synthetic records and lawfully reusable components with recorded licenses.",
      "The exercises specify learning targets, not an assertion that every feature exists in a reference implementation; disclose missing controls and tested boundaries.",
      ...packet.limitations,
    ],
    sources: [
      ...new Map(
        packet.exercises.map((exercise) => [
          exercise.reading.url,
          {
            title: exercise.reading.title,
            url: exercise.reading.url,
            notes: exercise.reading.locator,
          },
        ]),
      ).values(),
    ],
    gates: [gateEvidence[0], gateEvidence[1], gateEvidence[2], gateEvidence[3]],
  });
});
