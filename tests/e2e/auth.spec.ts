import { expect, test, type Page } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import fs from "node:fs";
import path from "node:path";
import type { Track } from "../../src/domain/types";

test.skip(
  process.env.E2E_EMULATORS !== "true",
  "Real account-creation tests only run against explicit local emulators.",
);

const foundation = JSON.parse(
  fs.readFileSync(
    path.resolve("src", "content", "tracks", "foundation.json"),
    "utf8",
  ),
) as Track;
const lesson = foundation.modules[0].lessons[0];
const password = "emulator-only-Example-2468";
const appBase = `http://127.0.0.1:${Number(process.env.E2E_PORT || "5199")}/progress-tracker/`;

async function authenticate(page: Page, email: string, register = false) {
  await page.goto(`${appBase}#/settings`);
  await expect(
    page.getByText("Local emulator mode.", { exact: false }),
  ).toBeVisible();
  if (register)
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", {
      name: register ? "Create Firebase account" : "Sign in with email",
    })
    .click();
  await expect(
    page.getByText("Sync status: synced", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
}

async function openNotes(page: Page) {
  await page.goto(`${appBase}#/lesson/${lesson.id}`);
  await page.getByRole("tab", { name: "Your notes" }).click();
}

async function saveNote(page: Page, note: string) {
  await openNotes(page);
  await page.getByLabel("Lesson notes").fill(note);
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect(
    page.getByRole("link", { name: "Emulator synced", exact: true }),
  ).toBeVisible({ timeout: 20000 });
}

test("readiness keeps per-gate evidence private during live owner switches and protects stale drafts", async ({
  page,
  context,
  browser,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const alice = `readiness-alice-${suffix}@example.test`;
  const bob = `readiness-bob-${suffix}@example.test`;
  const openReadiness = async (target: Page) => {
    await target.goto(`${appBase}#/project/sde-order-orchestrator`);
    await expect(
      target.getByRole("region", {
        name: "Career exercises and independent readiness",
      }),
    ).toBeVisible();
  };
  const synced = async (target: Page) => {
    await expect(
      target.getByRole("link", { name: "Emulator synced", exact: true }),
    ).toBeVisible({ timeout: 20000 });
  };
  await authenticate(page, alice, true);
  await openReadiness(page);
  const explain = page.locator('[data-readiness-gate="explain"]');
  const aliceEvidence =
    "Alice independently explained the synthetic order/provider boundary and retained her own hand-calculated rollback fixture.";
  await explain
    .getByLabel("Evidence for Explain", { exact: true })
    .fill(aliceEvidence);
  for (const checkbox of await explain.getByRole("checkbox").all())
    await checkbox.check();
  await explain
    .getByRole("button", { name: "Record Explain readiness", exact: true })
    .click();
  await expect(
    explain.getByText("Independent practice recorded (self-reported).", {
      exact: true,
    }),
  ).toBeVisible();
  await synced(page);
  await page
    .getByLabel("Evidence for Modify", { exact: true })
    .fill(
      "Alice unsaved modification draft must not follow an account switch.",
    );

  const accountTab = await context.newPage();
  const remoteContext = await browser.newContext();
  try {
    await accountTab.goto(`${appBase}#/settings`);
    await expect(
      accountTab.getByRole("button", { name: "Sign out", exact: true }),
    ).toBeVisible();
    await accountTab
      .getByRole("button", { name: "Sign out", exact: true })
      .click();
    await authenticate(accountTab, bob, true);
    await expect(
      page.getByLabel("Evidence for Explain", { exact: true }),
    ).toHaveValue("");
    await expect(
      page.getByLabel("Evidence for Modify", { exact: true }),
    ).toHaveValue("");
    await expect(
      page
        .locator('[data-readiness-gate="explain"]')
        .getByText("Not yet independently demonstrated.", { exact: true }),
    ).toBeVisible();
    const bobEvidence =
      "Bob private draft explains a different synthetic fixture and must stay in Bob's own account.";
    await page
      .getByLabel("Evidence for Explain", { exact: true })
      .fill(bobEvidence);
    await page
      .getByRole("button", { name: "Save Explain evidence", exact: true })
      .click();
    await synced(page);
    await accountTab
      .getByRole("button", { name: "Sign out", exact: true })
      .click();
    await authenticate(accountTab, alice);
    await expect(
      page.getByLabel("Evidence for Explain", { exact: true }),
    ).toHaveValue(aliceEvidence);
    await expect(
      page.getByLabel("Evidence for Modify", { exact: true }),
    ).toHaveValue("");

    const draft =
      "Alice unsaved local revision must survive a newer cloud edit until she explicitly reconciles the evidence.";
    await page.getByLabel("Evidence for Explain", { exact: true }).fill(draft);
    const remote = await remoteContext.newPage();
    await authenticate(remote, alice);
    await openReadiness(remote);
    await expect(
      remote.getByLabel("Evidence for Explain", { exact: true }),
    ).toHaveValue(aliceEvidence);
    await remote
      .getByLabel("Evidence for Explain", { exact: true })
      .fill(
        "Alice newer cloud evidence from another disposable browser, with a revised independent fixture explanation.",
      );
    await remote
      .getByRole("button", { name: "Save Explain evidence", exact: true })
      .click();
    await synced(remote);
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Saved evidence changed while you were editing" }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByLabel("Evidence for Explain", { exact: true }),
    ).toHaveValue(draft);
    await expect(
      page.getByRole("button", { name: "Save Explain evidence", exact: true }),
    ).toBeDisabled();
  } finally {
    await accountTab.close();
    await remoteContext.close();
  }
});

test("Auth emulator isolates guest, Alice and Bob; fresh context reloads real Firestore records", async ({
  page,
  browser,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const alice = `alice-${suffix}@example.test`;
  const bob = `bob-${suffix}@example.test`;
  await page.goto(`./#/lesson/${lesson.id}`);
  await page.getByRole("tab", { name: "Your notes" }).click();
  await page
    .getByLabel("Lesson notes")
    .fill(
      "This guest draft must never be silently copied to an authenticated account.",
    );
  await page.getByRole("button", { name: "Save notes" }).click();
  await page.goto("./#/settings");
  await expect(
    page.getByText("Local emulator mode.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Email address").fill(alice);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create Firebase account" }).click();
  await expect(
    page.getByText("Sync status: synced", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page.goto(`./#/lesson/${lesson.id}`);
  await page.getByRole("tab", { name: "Your notes" }).click();
  await expect(page.getByLabel("Lesson notes")).toHaveValue("");
  await page
    .getByLabel("Lesson notes")
    .fill(
      "Alice private learning evidence, synchronized only with Alice's UID.",
    );
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect(
    page.getByRole("link", { name: /^(Cloud|Emulator) synced$/ }),
  ).toBeVisible({ timeout: 20000 });
  await page.goto("./#/settings");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByText("Guest / browser-only · not cloud authentication", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Email address").fill(bob);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create Firebase account" }).click();
  await expect(
    page.getByText("Sync status: synced", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page.goto(`./#/lesson/${lesson.id}`);
  await page.getByRole("tab", { name: "Your notes" }).click();
  await expect(page.getByLabel("Lesson notes")).toHaveValue("");

  const context = await browser.newContext();
  try {
    const fresh = await context.newPage();
    await fresh.goto(`${appBase}#/settings`);
    await fresh.getByLabel("Email address").fill(alice);
    await fresh.getByLabel("Password", { exact: true }).fill(password);
    await fresh.getByRole("button", { name: "Sign in with email" }).click();
    await expect(
      fresh.getByText("Sync status: synced", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await fresh.goto(`${appBase}#/lesson/${lesson.id}`);
    await fresh.getByRole("tab", { name: "Your notes" }).click();
    await expect(fresh.getByLabel("Lesson notes")).toHaveValue(
      "Alice private learning evidence, synchronized only with Alice's UID.",
    );
  } finally {
    await context.close();
  }
});

test("offline changes survive reload and conflicts require an explicit version choice", async ({
  page,
  browser,
}) => {
  const email = `conflict-${Date.now()}@example.test`;
  await authenticate(page, email, true);
  await saveNote(
    page,
    "The first server-confirmed version of this private note.",
  );
  const secondContext = await browser.newContext();
  try {
    const second = await secondContext.newPage();
    await authenticate(second, email);
    await openNotes(second);
    await expect(second.getByLabel("Lesson notes")).toHaveValue(
      "The first server-confirmed version of this private note.",
    );
    await secondContext.setOffline(true);
    await second
      .getByLabel("Lesson notes")
      .fill(
        "A deliberately offline edit that must not silently replace another device.",
      );
    await second.getByRole("button", { name: "Save notes" }).click();
    await saveNote(page, "A newer online version made on the other device.");
    await secondContext.setOffline(false);
    await second.goto(`${appBase}#/settings`);
    await second
      .getByRole("button", { name: "Retry sync", exact: true })
      .last()
      .click();
    await expect(
      second.getByRole("heading", { name: "Review sync conflicts" }),
    ).toBeVisible({ timeout: 20000 });
    await second.reload();
    await expect(
      second.getByRole("heading", { name: "Review sync conflicts" }),
    ).toBeVisible({ timeout: 20000 });
    await second
      .getByRole("button", { name: "Use the cloud version", exact: true })
      .click();
    await expect(
      second.getByText("Sync status: synced", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await openNotes(second);
    await expect(second.getByLabel("Lesson notes")).toHaveValue(
      "A newer online version made on the other device.",
    );
  } finally {
    await secondContext.close();
  }
});

test("confirmed cloud reset clears only current new records and preserves the original profile", async ({
  page,
  browser,
}) => {
  const suffix = Date.now();
  const email = `reset-${suffix}@example.test`;
  const otherEmail = `reset-neighbor-${suffix}@example.test`;
  await authenticate(page, email, true);
  await saveNote(
    page,
    "New learning data that the current owner will explicitly reset.",
  );
  await page.goto("./#/settings");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export my learning data" }).click();
  const exportFile = await (await downloading).path();
  const exported = JSON.parse(fs.readFileSync(exportFile!, "utf8"));
  const uid = exported.ownerId.slice(4);
  const environment = await initializeTestEnvironment({
    projectId: "demo-progress-tracker",
    firestore: { host: "127.0.0.1", port: 8080 },
  });
  const legacy = {
    profile: { cloudUid: uid, name: "Original learning archive" },
    notes: { old: "Preserve this original note" },
    completions: { old: true },
  };
  await environment.withSecurityRulesDisabled((context) =>
    context.firestore().doc(`studyProgressProfiles/${uid}`).set(legacy),
  );
  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await authenticate(other, otherEmail, true);
    await saveNote(other, "A different account's note must survive the reset.");
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByLabel("Type RESET to confirm").fill("RESET");
    await page
      .getByRole("button", { name: "Reset this workspace", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Current progress reset" }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByText("Sync status: synced", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await openNotes(page);
    await expect(page.getByLabel("Lesson notes")).toHaveValue("");
    expect(
      (
        await environment
          .authenticatedContext(uid)
          .firestore()
          .doc(`studyProgressProfiles/${uid}`)
          .get()
      ).data(),
    ).toEqual(legacy);
    await other.reload();
    await other.getByRole("tab", { name: "Your notes" }).click();
    await expect(other.getByLabel("Lesson notes")).toHaveValue(
      "A different account's note must survive the reset.",
    );
    const freshContext = await browser.newContext();
    try {
      const fresh = await freshContext.newPage();
      await authenticate(fresh, email);
      await openNotes(fresh);
      await expect(fresh.getByLabel("Lesson notes")).toHaveValue("");
    } finally {
      await freshContext.close();
    }
  } finally {
    await otherContext.close();
    await environment.cleanup();
  }
});
