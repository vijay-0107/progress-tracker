import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { projects } from "../src/content/projects";
import { buildCatalog } from "../src/content/catalog";
import { TRACK_IDS } from "../src/domain/types";

// Frozen at the released ad20bc33 catalog, not regenerated from the new inventory.
const trackHashes: Record<string, string> = {
  foundation:
    "d61a903c0c14ab854ad62d17ec06fffb490ab5393b83df6f849780f9abffc594",
  data: "3abafd5b421927daac273ac9e876dae0870a83e58c826b496b3a7ddacca7242c",
  sde: "473cbd8faf1cd96c0d1bba9ed7f8b0ef18a58e1129b403753b90ce72dc9ab039",
  quant: "71ed9e3845c3942dae6f10357fcbf9317a05f0e3b654e39a84fc0fa26b57712c",
  ai: "781f3231967ca41eff177f45406c205666e529eaba52cebaffab31a35c9517a5",
  gate: "3211cbffe42dfc96ade84662e37817fa99b5a3a371b318a2d758c7a95c9ea854",
  cat: "761fa1010f5026b16fee54b5175091a5f8206afa71d778ebd2707e9d3f5f4643",
  trading: "4e61d862798a9735f6bb0b31b2ce93301673bd374e7ddcc49c833fe491a23ca0",
  "algorithmic-trading":
    "d08138a1bf00997e90f296e3884312e871e768a79d5e7a37a1fe340e1a8d44fb",
  finance: "4f42966e5661d274569d58cb7fed04d02eeb409a2ae189eb687efa35c7d0aff9",
  "computer-security-systems":
    "4c0337240f758936e3f7dd5720be0504c2e81c0f5ef0de1f891057a5d2344816",
  "ethical-hacking":
    "af227927253cc81412057f35deaf26acc1c779cba78f0cbd7f1d8fe2361384a8",
  "technical-product-management":
    "20d0f5652239f874fa551a99c39a476e7bba753a5c4b51303eb429791380a30b",
};
const projectHashes: Record<string, string> = {
  "data-shopping-mall-operations":
    "1ba59d1c82d45f9ad4bb6dccf28112cc78e749f1dbc7459a0e3463f0e24cbac2",
  "data-mall-sales-inventory":
    "ed848b1363f8c13decd394054967a039e77a2239fc4ba3f5f9aabb4116f40001",
  "sde-transaction-safe-commerce":
    "16053930b8e979e6f8d2c933c661246871068757f1a974523cb498bb2b91e558",
  "sde-returns-exchange":
    "76fea53104d9ea2464fb56a2944243ba73b061601d87184f1545490d98dab5d3",
  "quant-paper-exchange":
    "9e486831800384fffdea5530f75b035d647d28bd21de98d458cd5d89f8950a6c",
  "quant-point-in-time-workbench":
    "7c2d2557e1089ee01178f81aa3219c2a81c61b2a5f5a169c6837ab6a9d95cdf6",
  "ai-consent-local-verification":
    "60ec2974f01a8b9bdee3b02f6825d97218f1b4d7c3192e598f0a676d7ec32b38",
  "ai-face-capture-quality":
    "f9d9a64038bf978109b6b9445a23526f31b0d16790912f7f56f0bfb43afb6bba",
  "data-multi-tenant-cdc":
    "18b914f38181c4cef03b0b97f814b411ddf34f9113b1514bc244af5b0a45f103",
  "data-event-time-reconciliation":
    "1f7245e6cac17f08d56ea41838b08fa087b95d40406cb78f30965c440a435410",
  "data-contract-recovery":
    "7f868cba5529ada3b9154ac1b321f479a80fc4432d9ce687cc71c2394d0da4a7",
  "sde-order-orchestrator":
    "b89bf218bb737576a494cc4d390fcfb21b926f9282e7ddfc6fe72386de6fc251",
  "sde-tenant-marketplace":
    "6fbbc1388c39faa3660ec02593adb14f757d25c87cdc4813f20ebe7366846a60",
  "sde-product-search":
    "51f836a9f72f6294904b44eccb1981c19811c0c1d44c920bec9253ebb882eb09",
  "quant-multi-instrument-ledger":
    "1f10e4e2d225c357654db711212a9df2052379d0629c581de125456024ee8540",
  "quant-versioned-research-data":
    "7b6ff468014fcd2797feea32d721a8cfc03f8aaa7d0d30cc899e5b3494b9a78c",
  "quant-portfolio-reconciliation":
    "b3aff09e88865f133276ee560c970eeed9f3987d624f75a3f25d7dd99b31d8ee",
  "ai-permission-aware-assistant":
    "67a1d8ce058d6c40a348a58d64ce23d42ce3be382eca52e5c49882927fb53229",
  "ai-governed-analytics":
    "d63f0c1fcf83fe710e13a5c7f5de4cd2e64c2f795c2efbcf7b75b2ee5ace71a8",
  "ai-evaluation-serving":
    "fd62936d290b7cdeb312f59e2254ca7cd3f356950788ba1c96add163c53b1b86",
  "shared-fabric-reporting":
    "950d99fb3d95c1e3d95cc5e45c839a8f592bb09eb6865a6fe5739825e9ccc395",
};
const prerequisites: Record<string, string[]> = {
  "data-shopping-mall-operations": ["data-m01", "data-m05", "data-m07"],
  "data-mall-sales-inventory": ["data-m02", "data-m03", "data-m04", "data-m05"],
  "sde-transaction-safe-commerce": [
    "sde-m02-transactional-apis",
    "sde-m05-verification",
    "sde-m06-delivery",
    "sde-m07-operations",
  ],
  "sde-returns-exchange": [
    "sde-m03-architecture-failure",
    "sde-m04-security",
    "sde-m05-verification",
    "sde-m07-operations",
  ],
  "quant-paper-exchange": ["quant-m04-market-mechanics"],
  "quant-point-in-time-workbench": ["quant-m03-point-in-time-data"],
  "ai-consent-local-verification": [
    "ai-m02-classical-ml",
    "ai-m03-deep-learning-cv",
  ],
  "ai-face-capture-quality": ["ai-m02-classical-ml", "ai-m03-deep-learning-cv"],
  "data-multi-tenant-cdc": ["data-m06", "data-m07", "data-m08"],
  "data-event-time-reconciliation": ["data-m04", "data-m06", "data-m08"],
  "data-contract-recovery": ["data-m05", "data-m06", "data-m08"],
  "sde-order-orchestrator": [
    "sde-m03-architecture-failure",
    "sde-m05-verification",
    "sde-m06-delivery",
    "sde-m07-operations",
  ],
  "sde-tenant-marketplace": [
    "sde-m02-transactional-apis",
    "sde-m04-security",
    "sde-m05-verification",
    "sde-m07-operations",
  ],
  "sde-product-search": [
    "sde-m04-security",
    "sde-m05-verification",
    "sde-m07-operations",
    "sde-m08-specialization-portfolio",
  ],
  "quant-multi-instrument-ledger": [
    "quant-m04-market-mechanics",
    "quant-m06-portfolio-risk",
    "quant-m08-professional-controls",
  ],
  "quant-versioned-research-data": [
    "quant-m03-point-in-time-data",
    "quant-m05-honest-backtesting",
    "quant-m08-professional-controls",
  ],
  "quant-portfolio-reconciliation": [
    "quant-m06-portfolio-risk",
    "quant-m08-professional-controls",
  ],
  "ai-permission-aware-assistant": [
    "ai-m05-rag-adaptation",
    "ai-m06-bounded-agents",
    "ai-m08-reliability",
  ],
  "ai-governed-analytics": [
    "ai-m06-bounded-agents",
    "ai-m07-mlops-serving",
    "ai-m08-reliability",
  ],
  "ai-evaluation-serving": ["ai-m07-mlops-serving", "ai-m08-reliability"],
  "shared-fabric-reporting": ["data-m04", "data-m05", "data-m07", "data-m08"],
};

describe("released catalog remains append-only", () => {
  it("preserves every byte of all thirteen released tracks", () => {
    for (const [id, hash] of Object.entries(trackHashes)) {
      const bytes = fs.readFileSync(
        path.resolve("src", "content", "tracks", `${id}.json`),
      );
      expect(createHash("sha256").update(bytes).digest("hex"), id).toBe(hash);
    }
  });
  it("preserves all 21 original project definitions and 84 gate identities", () => {
    expect(projects).toHaveLength(21);
    for (const project of projects)
      expect(
        createHash("sha256").update(JSON.stringify(project)).digest("hex"),
        project.id,
      ).toBe(projectHashes[project.id]);
    expect(projects.flatMap((project) => project.milestones)).toHaveLength(84);
  });
  it("preserves resolved prerequisites even when career associations are added", () => {
    const catalog = buildCatalog(
      TRACK_IDS.map((id) =>
        JSON.parse(
          fs.readFileSync(
            path.resolve("src", "content", "tracks", `${id}.json`),
            "utf8",
          ),
        ),
      ),
    );
    for (const [id, required] of Object.entries(prerequisites)) {
      const project = catalog.projects.find((item) => item.id === id)!;
      expect([...project.prerequisites].sort(), id).toEqual(
        [...required].sort(),
      );
      expect(project.prerequisiteLessons).toEqual(
        id === "sde-product-search"
          ? ["sde-l27-lexical-search", "sde-l28-rerank-evaluation"]
          : undefined,
      );
    }
  });
});
