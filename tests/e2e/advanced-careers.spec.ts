import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { careerPackets } from "../../src/content/career-exercises";
import { createProgress, recordActivity } from "../../src/domain/progress";
import { progressStorageKey } from "../../src/domain/storage";
import { validateProgressState } from "../../src/domain/validation";
import { READINESS_GATES } from "../../src/domain/types";

const key = progressStorageKey("guest");
const advancedPaths = [
  { id: "backend", title: "Backend & Platform Software Engineering" },
  { id: "ai-systems", title: "AI Infrastructure & ML Systems Engineering" },
  { id: "security", title: "Product & Cloud Security Engineering" },
  { id: "data-platform", title: "Data Platform & Analytics Engineering" },
  {
    id: "quant-developer",
    title: "Quantitative Development & Research Infrastructure",
  },
  { id: "technical-pm", title: "Technical Product Management (TPM)" },
];
const readinessRecordId = (projectId: string, gate: string) =>
  `career-readiness-${projectId}-${gate}`;
async function state(page: Page) {
  const raw = await page.evaluate((key) => localStorage.getItem(key), key);
  return raw === null
    ? createProgress("guest", "2026-09-20T10:00:00.000Z")
    : validateProgressState(JSON.parse(raw));
}

test("held draft references show actual opt-in code PRs and partial CPU scope without learner credit", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (/api\.github\.com|github\.com\/vijay-0107\//.test(request.url()))
      requests.push(request.url());
  });
  const drafts = [
    [3, "durable-workflow-runtime"],
    [5, "paged-llm-inference"],
    [6, "heterogeneous-inference-router"],
    [10, "workload-identity-broker"],
  ] as const;
  for (const [number, repo] of drafts) {
    const id = `advanced-target-${String(number).padStart(2, "0")}`;
    await page.goto(`./#/project/${id}`);
    const availability = page.getByRole("region", {
      name: "Dated reference availability",
      exact: true,
    });
    await expect(availability).toHaveAttribute(
      "data-publication-state",
      "unmerged-draft",
    );
    await expect(availability).toContainText("PUBLICATION HELD");
    await expect(availability).toContainText("Evidence snapshot 2026-09-30");
    const exerciseRegion = page.getByRole("region", {
      name: "Career exercises and independent readiness",
    });
    await expect(
      exerciseRegion.locator(
        `a[href="https://github.com/vijay-0107/${repo}/pull/1"]`,
      ),
    ).toBeVisible();
    await expect(
      exerciseRegion.locator(`a[href="https://github.com/vijay-0107/${repo}"]`),
    ).toHaveCount(0);
    await expect(exerciseRegion).toContainText(
      "0/4 independent readiness gates recorded",
    );
    if (number === 5 || number === 6) {
      await expect(availability).toHaveAttribute(
        "data-reference-scope",
        "partial-cpu",
      );
      await expect(availability).toContainText(
        "PARTIAL CPU/reference artifacts only",
      );
    }
    if (number === 6) {
      await expect(availability).toContainText("NOT an LLM");
      await expect(availability).toContainText("TTFT/ITL null");
      await expect(availability).toContainText("hardwareUnavailable=true");
    }
  }
  expect(requests).toEqual([]);
  expect((await state(page)).projects).toEqual({});
  expect((await state(page)).lessons).toEqual({});
  expect((await state(page)).activity).toEqual({});
});

test("failed follow-up and unmet benchmark status remain prominent on reviewed references", async ({
  page,
}) => {
  await page.goto("./#/project/advanced-target-23");
  const availability = page.getByRole("region", {
    name: "Dated reference availability",
    exact: true,
  });
  await expect(availability).toHaveAttribute(
    "data-publication-state",
    "follow-up-pending",
  );
  await expect(availability).toContainText("PUBLICATION HELD");
  await expect(availability).toContainText("latest recorded main CI FAILED");
  await expect(availability).toContainText("checks are not all passing");
  await expect(availability).toContainText("NO-GO");
  await expect(
    page.locator(
      'a[href="https://github.com/vijay-0107/cloud-migration-playbook/pull/2"]',
    ),
  ).toBeVisible();
  for (const [number, text] of [
    [2, "200000 connections NOT ATTEMPTED"],
    [7, "15.795 ms MISSES"],
    [8, "422.77 ms FAILS"],
    [9, "174.61%"],
    [18, "100x gate NOT MET"],
    [19, "1 ms p99 target NOT MET"],
  ] as const) {
    await page.goto(
      `./#/project/advanced-target-${String(number).padStart(2, "0")}`,
    );
    await expect(
      page.getByRole("region", {
        name: "Dated reference availability",
        exact: true,
      }),
    ).toContainText(text);
  }
  expect((await state(page)).projects).toEqual({});
});

test("saved settings distinguish seven original core choices from six Career Paths", async ({
  page,
}) => {
  await page.goto("./#/settings");
  const focus = page.getByRole("combobox", {
    name: "Saved core-course focus",
    exact: true,
  });
  await expect(focus).toBeVisible();
  await expect(focus.locator("option")).toHaveCount(7);
  expect(
    await focus
      .locator("option")
      .evaluateAll((items) => items.map((item) => item.getAttribute("value"))),
  ).toEqual(["foundation", "data", "sde", "quant", "ai", "gate", "cat"]);
  await expect(
    page.getByText(/All six Career Paths have separate first-class navigation/),
  ).toBeVisible();
  await expect(page.getByText(/four career\s*paths/i)).toHaveCount(0);
  await expect(focus).toHaveValue("foundation");
});

test("project preparation exposes exact replay, PIT, domain and packet-framing readings", async ({
  page,
}) => {
  const media: string[] = [];
  page.on("request", (request) => {
    if (
      /\.pdf(?:[?#]|$)|youtube(?:-nocookie)?\.com\/embed|api\.github\.com|github\.com\/vijay-0107\//.test(
        request.url(),
      )
    )
      media.push(request.url());
  });
  await page.goto("./#/project/advanced-target-03?stage=foundation");
  const replay = page.locator('[data-exercise-id="advanced-ex-03-foundation"]');
  await expect(
    replay.locator(
      'a[href="#/lesson/advanced-d1-advanced-04-workflow-replay"]',
    ),
  ).toBeVisible();
  await expect(replay).toContainText("Deterministic constraints");
  await expect(replay).toContainText("reserve-0/wait-1/receipt-2");
  await replay
    .getByText("Additional exact reading sections", { exact: true })
    .click();
  await expect(
    replay.getByRole("link", {
      name: "Temporal Go SDK: durable timers and versioning (opens in a new tab)",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("./#/project/advanced-target-07?stage=foundation");
  const pit = page.locator('[data-exercise-id="advanced-ex-07-foundation"]');
  await expect(
    pit.locator('a[href="#/lesson/quant-l10-availability-time"]'),
  ).toBeVisible();
  await expect(pit).toContainText(
    "At prediction cutoff12 expect A=5 and B=missing",
  );
  await page.goto("./#/project/advanced-target-08?stage=foundation");
  await expect(
    page.locator('[data-exercise-id="advanced-ex-08-foundation"]'),
  ).toContainText("canonical allowed.test authority");
  await page.goto("./#/project/advanced-target-09?stage=foundation");
  await expect(
    page.locator('[data-exercise-id="advanced-ex-09-foundation"]'),
  ).toContainText("peer-veth RX/XDP");
  await page.goto("./#/project/advanced-target-19?stage=foundation");
  const feed = page.locator('[data-exercise-id="advanced-ex-19-foundation"]');
  await expect(
    feed.getByRole("link", {
      name: "Nasdaq TotalView-ITCH 5.0 specification (opens in a new tab)",
      exact: true,
    }),
  ).toBeVisible();
  await expect(feed).toContainText("1.3.1/1.3.2 Add Order");
  await feed
    .getByText("Additional exact reading sections", { exact: true })
    .click();
  await expect(
    feed.getByRole("link", {
      name: "Nasdaq SoupBinTCP Version 3.00 (opens in a new tab)",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    feed.getByRole("link", {
      name: "Nasdaq OUCH 5.0 Order Entry Specification (October 2025) (opens in a new tab)",
      exact: true,
    }),
  ).toBeVisible();
  expect(media).toEqual([]);
  expect((await state(page)).projects).toEqual({});
});

test("dashboard and navigation expose six direct paths without hidden hub or progress writes", async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (
      /\.pdf(?:[?#]|$)|youtube(?:-nocookie)?\.com\/embed|api\.github\.com|github\.com\/vijay-0107\//.test(
        request.url(),
      )
    )
      requests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  const before = await state(page);
  const cards = page.getByRole("region", {
    name: "Six Career Paths",
    exact: true,
  });
  await expect(cards.locator("[data-career-path]")).toHaveCount(6);
  for (const path of advancedPaths) {
    await expect(
      cards.getByRole("link", { name: path.title, exact: true }),
    ).toHaveAttribute("href", `#/career/${path.id}`);
    await expect(
      cards.locator(`[data-career-path="${path.id}"]`),
    ).toContainText("4 advanced targets");
  }
  const mobile = await page
    .getByRole("button", { name: "Open navigation" })
    .isVisible();
  if (mobile)
    await page.getByRole("button", { name: "Open navigation" }).click();
  const navigation = mobile
    ? page
        .getByRole("dialog", { name: "Learning navigation" })
        .getByRole("navigation", { name: "Primary navigation" })
    : page
        .locator(".app-layout > .sidebar")
        .getByRole("navigation", { name: "Primary navigation" });
  for (const path of advancedPaths)
    await expect(
      navigation.getByRole("link", { name: path.title, exact: true }),
    ).toHaveAttribute("href", `#/career/${path.id}`);
  await navigation
    .getByRole("link", { name: advancedPaths[0].title, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: advancedPaths[0].title, exact: true }),
  ).toBeVisible();
  if (mobile) await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await state(page)).toEqual(before);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test("each exact path exposes 5/5/5/4 requirements and four numbered advanced targets", async ({
  page,
}) => {
  const labels = [
    "Beginner",
    "Intermediate",
    "Advanced",
    "Professional Practice",
  ];
  await page.goto("./#/careers");
  const before = await state(page);
  for (const path of advancedPaths) {
    await page.goto(`./#/career/${path.id}`);
    await expect(page).toHaveTitle(`Progress | ${path.title}`);
    await expect(
      page
        .getByRole("region", { name: "Four advanced targets" })
        .locator("[data-target-number]"),
    ).toHaveCount(4);
    await expect(
      page
        .getByRole("region", { name: "Required project languages" })
        .getByRole("link")
        .first(),
    ).toBeVisible();
    for (const [index, label] of labels.entries()) {
      await page
        .getByRole("region", { name: "Required career stages" })
        .getByRole("button", { name: `Show ${label}`, exact: true })
        .click();
      await expect(
        page
          .getByRole("region", { name: "Exact required skill groups" })
          .locator("[data-skill-group]"),
      ).toHaveCount(index === 3 ? 4 : 5);
    }
    await page.getByLabel("Missing lesson evidence only").check();
    expect((await state(page)).settings).toEqual(before.settings);
  }
  expect(await state(page)).toEqual(before);
  await page.goto("./#/career/not-a-path");
  await expect(
    page.getByRole("heading", { name: "Career path not found" }),
  ).toBeVisible();
  await page.goto("./#/projects?career=security");
  await expect(page.locator(".project-card")).toHaveCount(4);
  await expect(page.locator(".project-card").first()).toContainText(
    "ADVANCED / NEW TARGET",
  );
});

test("language searches open substantive lessons and keep the two Tritons distinct", async ({
  page,
}) => {
  const mediaRequests: string[] = [];
  page.on("request", (request) => {
    if (
      /\.pdf(?:[?#]|$)|youtube(?:-nocookie)?\.com\/embed|api\.github\.com|github\.com\/vijay-0107\//.test(
        request.url(),
      )
    )
      mediaRequests.push(request.url());
  });
  const examples = [
    ["Rust", "systems-foundation-rust"],
    ["Go", "systems-foundation-go"],
    ["C++", "systems-foundation-cpp-memory"],
    ["C++23", "systems-foundation-cpp-values"],
    ["C", "systems-foundation-c-posix"],
    ["Python", "systems-foundation-python-depth"],
    ["SQL", "systems-intermediate-sql-depth"],
    ["Bash", "systems-foundation-c-posix"],
    ["Java", "systems-foundation-java"],
    ["CUDA", "systems-advanced-cuda"],
    ["Triton DSL", "systems-advanced-triton"],
    ["Triton Inference Server", "advanced-d2-foundation-03-serving-runtimes"],
  ];
  for (const [query, id] of examples) {
    await page.goto(`./#/search?q=${encodeURIComponent(query)}`);
    await expect(
      page.locator(`.search-result[href="#/lesson/${id}"]`),
    ).toBeVisible();
  }
  await page.goto("./#/lesson/systems-advanced-triton");
  await expect(
    page.getByRole("region", { name: "Practice environment and evidence" }),
  ).toContainText("NVIDIA");
  await expect(
    page.getByRole("region", { name: "Practice environment and evidence" }),
  ).toContainText("unchecked");
  const frames = page.locator("iframe");
  if (process.env.E2E_EMULATORS === "true") {
    for (const frame of await frames.all())
      await expect(frame).toHaveAttribute(
        "src",
        /^http:\/\/127\.0\.0\.1:9099\/emulator\/auth\/iframe(?:\?|$)/,
      );
  } else await expect(frames).toHaveCount(0);
  expect(mediaRequests).toEqual([]);
  expect((await state(page)).projects).toEqual({});
  expect((await state(page)).activity).toEqual({});
});

test("old readiness never carries into P17 and new gate evidence survives reload and export", async ({
  page,
}) => {
  let old = createProgress("guest", "2026-09-20T10:00:00.000Z");
  old.settings.primaryTrack = "quant";
  for (const packet of careerPackets)
    for (const gate of READINESS_GATES) {
      const id = readinessRecordId(packet.projectId, gate);
      const at = "2026-09-29T10:00:00.000Z";
      old = recordActivity(
        {
          ...old,
          updatedAt: at,
          projects: {
            ...old.projects,
            [id]: {
              id,
              updatedAt: at,
              milestones: [`${id}-recorded`],
              evidence: `Earlier ${gate} evidence for ${packet.projectId}: original bounded fixture, independent predicted result and observed regression retained.`,
            },
          },
        },
        {
          id: `project:readiness:${id}`,
          at,
          updatedAt: at,
          timezone: old.settings.timezone,
          kind: "project",
          entityId: id,
          minutes: 0,
          detail: "Earlier self-reported independent practice fixture.",
        },
        at,
      );
    }
  await page.goto("./");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key,
    value: JSON.stringify(old),
  });
  await page.goto("./#/project/advanced-target-17");
  await page.reload();
  const region = page.getByRole("region", {
    name: "Career exercises and independent readiness",
  });
  await expect(region).toContainText(
    "0/4 independent readiness gates recorded",
  );
  const editor = page.locator('[data-readiness-gate="explain"]');
  await editor
    .getByLabel("Evidence for Explain", { exact: true })
    .fill(
      "My new advanced explanation identifies the typed execution allocation boundary and separately predicts FIFO/capacity rejection on an original fixture.",
    );
  await editor
    .getByRole("button", { name: "Save Explain evidence", exact: true })
    .click();
  expect(Object.keys((await state(page)).activity)).toHaveLength(40);
  await page.reload();
  await expect(
    editor.getByLabel("Evidence for Explain", { exact: true }),
  ).toHaveValue(/My new advanced explanation/);
  await expect(editor.getByRole("checkbox")).toHaveCount(3);
  for (const checkbox of await editor.getByRole("checkbox").all())
    await checkbox.check();
  await editor
    .getByRole("button", { name: "Record Explain readiness", exact: true })
    .click();
  await expect(editor).toContainText(
    "Independent practice recorded (self-reported).",
  );
  const saved = await state(page);
  expect(saved.projects["advanced-target-17"]).toBeUndefined();
  expect(saved.lessons).toEqual({});
  expect(saved.settings).toEqual(old.settings);
  for (const [id, record] of Object.entries(old.projects))
    expect(saved.projects[id]).toEqual(record);
  expect(
    saved.projects[readinessRecordId("advanced-target-17", "explain")],
  ).toBeDefined();
  await page.reload();
  await expect(
    editor.getByLabel("Evidence for Explain", { exact: true }),
  ).toHaveValue(/My new advanced explanation/);
  await page.goto("./#/dashboard");
  await expect(page.locator(".portfolio-progress")).toContainText(
    "0 of 24 advanced targets complete",
  );
  await expect(page.locator(".portfolio-progress")).toContainText(
    "0 of 96 new build gates",
  );
  await page.goto("./#/settings");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export my learning data" }).click();
  const filename = await (await downloading).path();
  expect(
    validateProgressState(JSON.parse(fs.readFileSync(filename!, "utf8"))),
  ).toEqual(saved);
});

for (const width of [320, 390]) {
  test(`${width}px advanced paths, native lessons and evidence remain readable and usable`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("./");
    await expect(
      page
        .getByRole("region", { name: "Six Career Paths", exact: true })
        .locator("[data-career-path]"),
    ).toHaveCount(6);
    await page.getByRole("button", { name: "Open navigation" }).click();
    const drawer = page.getByRole("dialog", { name: "Learning navigation" });
    for (const path of advancedPaths) {
      const link = drawer.getByRole("link", { name: path.title, exact: true });
      await link.scrollIntoViewIfNeeded();
      const box = await link.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    await drawer
      .getByRole("link", { name: advancedPaths[1].title, exact: true })
      .click();
    await expect(drawer).not.toBeVisible();
    await page
      .getByLabel("Required stage", { exact: true })
      .selectOption("advanced");
    await page
      .getByLabel("Find a required skill", { exact: true })
      .fill("Triton");
    await expect(page.locator("[data-skill-group]")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto("./#/lesson/systems-advanced-cuda");
    await expect(
      page.getByRole("heading", {
        name: "Write and verify CUDA kernels before claiming acceleration",
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("tab", { name: "Assignment", exact: true }).click();
    await expect(
      page
        .getByText(
          "All required positive and negative/failure cases were actually exercised",
          { exact: false },
        )
        .first(),
    ).toBeVisible();
    await page.goto("./#/project/advanced-target-14?stage=foundation");
    const editor = page.locator('[data-readiness-gate="explain"]');
    await editor
      .getByLabel("Evidence for Explain", { exact: true })
      .fill(
        "My independent Flight explanation separates buffer reuse from serialization and names the actual same-host multi-process measurement boundary.",
      );
    await editor
      .getByRole("button", { name: "Save Explain evidence", exact: true })
      .click();
    await page.reload();
    await expect(
      editor.getByLabel("Evidence for Explain", { exact: true }),
    ).toHaveValue(/My independent Flight explanation/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`advanced-path-${width}.png`),
      fullPage: true,
    });
  });
}
