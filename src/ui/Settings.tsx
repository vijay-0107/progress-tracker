import { useState } from "react";
import {
  Archive,
  ArrowRight,
  Cloud,
  Download,
  LockKeyhole,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { exportProgress } from "../domain/progress";
import { trackMeta } from "../content/catalog";
import { CORE_TRACK_IDS, type Theme, type CoreTrackId } from "../domain/types";
import { downloadJson, type Workspace } from "../state/useWorkspace";
import { PageHeading } from "./shared";

export function Settings({ workspace }: { workspace: Workspace }) {
  const {
    state,
    user,
    client,
    mutate,
    notify,
    busy,
    runCloud,
    syncStatus,
    pendingCount,
  } = workspace;
  const [displayName, setDisplayName] = useState(state.settings.displayName);
  const [timezone, setTimezone] = useState(state.settings.timezone);
  const [theme, setTheme] = useState<Theme>(state.settings.theme);
  const [dailyMinutes, setDailyMinutes] = useState(state.settings.dailyMinutes);
  const [primaryTrack, setPrimaryTrack] = useState<CoreTrackId>(
    state.settings.primaryTrack,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("signin");
  const [importAllowed, setImportAllowed] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const [legacyId, setLegacyId] = useState("");
  const initials =
    state.settings.displayName
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "ME";
  return (
    <>
      <PageHeading
        eyebrow="A WORKSPACE THAT IS YOURS"
        title="Account & preferences."
        description="Choose how you learn, where your data lives, and when it moves between devices."
      />
      <div className="settings-grid">
        <div>
          <section className="panel">
            <div className="section-title">
              <h2>Your account</h2>
              <Cloud size={21} />
            </div>
            <div className="account-status">
              <span className="avatar">{initials}</span>
              <div>
                <strong>
                  {user
                    ? user.displayName || user.email || "Firebase account"
                    : state.settings.displayName || "Your guest workspace"}
                </strong>
                <small>
                  {user
                    ? `${client?.mode === "emulator" ? "Local Auth emulator" : "Firebase authenticated"} · ${user.emailVerified ? "Email verified" : "Email not yet verified"}`
                    : "Guest / browser-only · not cloud authentication"}
                </small>
              </div>
            </div>
            {user ? (
              <>
                <div className="storage-detail">
                  <strong>Sync status: {syncStatus}</strong>
                  <p>
                    {pendingCount
                      ? `${pendingCount} changed record(s) remain queued for this account.`
                      : syncStatus === "synced"
                        ? "Server-acknowledged records are up to date."
                        : "Check the status above; cloud persistence is not assumed."}
                  </p>
                  <small>
                    Only your authenticated UID can read or write your new cloud
                    records. Signing out never moves private work into guest
                    mode.
                  </small>
                </div>
                <div className="button-row">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => {
                      void workspace.retrySync();
                    }}
                  >
                    <RefreshCw size={16} />
                    Retry sync
                  </button>
                  {!user.emailVerified && (
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => {
                        void runCloud(
                          (cloud) => cloud.resendVerification(),
                          "Verification email sent. Check your inbox and spam folder.",
                        );
                      }}
                    >
                      <Mail size={16} />
                      Resend verification
                    </button>
                  )}
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => {
                      if (
                        pendingCount &&
                        !window.confirm(
                          "Some edits are not synced. They will stay only in this account's browser cache until you sign in again and retry. Sign out now?",
                        )
                      )
                        return;
                      void runCloud(
                        (cloud) => cloud.signOut(),
                        "Signed out. Guest progress and account progress remain separate.",
                      );
                    }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
                <hr />
                <h3>Bring your guest learning with you</h3>
                <p>
                  Guest progress is never silently attached to a signed-in
                  account. Import only if the guest workspace is yours. Existing
                  cloud conflicts keep their current values; import does not
                  replace your account preferences.
                </p>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Import this browser's guest learning into ${user.email || "this Firebase account"}? Only continue if this is your own learning data. Existing records will not be overwritten.`,
                      )
                    )
                      workspace.importGuest();
                  }}
                >
                  <Upload size={16} />
                  Explicitly import my guest work
                </button>
              </>
            ) : (
              <>
                {client?.configured ? (
                  <>
                    <div className="notice info">
                      {client.mode === "emulator"
                        ? "Local emulator mode. Test credentials do not authenticate with the production project."
                        : "Use a real Firebase account to sync across devices. Guest work stays separate until you explicitly import it."}
                    </div>
                    <button
                      className="button secondary full-width"
                      disabled={busy}
                      onClick={() => {
                        void runCloud(
                          (cloud) => cloud.googleSignIn(),
                          "Google authentication completed.",
                        );
                      }}
                    >
                      <ShieldCheck size={17} />
                      Continue with Google
                    </button>
                    <div className="auth-divider">or use email</div>
                    <div className="segmented-tabs auth-mode-tabs">
                      <button
                        aria-pressed={authMode === "signin"}
                        className={authMode === "signin" ? "active" : ""}
                        onClick={() => setAuthMode("signin")}
                      >
                        Sign in
                      </button>
                      <button
                        aria-pressed={authMode === "register"}
                        className={authMode === "register" ? "active" : ""}
                        onClick={() => setAuthMode("register")}
                      >
                        Create account
                      </button>
                    </div>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void runCloud(
                          (cloud) =>
                            authMode === "register"
                              ? cloud.register(email, password)
                              : cloud.signIn(email, password),
                          authMode === "register"
                            ? "Account created. Check your email for verification."
                            : "Signed in to your private learning workspace.",
                        ).then((ok) => {
                          if (ok) setPassword("");
                        });
                      }}
                    >
                      <label className="field-label">
                        Email address
                        <input
                          required
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          autoComplete="email"
                          maxLength={254}
                        />
                      </label>
                      <label className="field-label">
                        Password
                        <input
                          required
                          type="password"
                          minLength={authMode === "register" ? 8 : 1}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          autoComplete={
                            authMode === "register"
                              ? "new-password"
                              : "current-password"
                          }
                          maxLength={128}
                        />
                      </label>
                      {authMode === "register" && (
                        <p className="quiet-note">
                          Use at least 8 characters and a unique password.
                          Account creation is explicit; a failed sign-in never
                          creates a new account.
                        </p>
                      )}
                      <button
                        className="button primary full-width"
                        disabled={busy}
                        type="submit"
                      >
                        <LockKeyhole size={16} />
                        {busy
                          ? "Please wait..."
                          : authMode === "register"
                            ? "Create Firebase account"
                            : "Sign in with email"}
                      </button>
                    </form>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => {
                        if (!email.trim()) {
                          workspace.setError(
                            "Enter your email address before requesting a reset.",
                          );
                          return;
                        }
                        void runCloud(
                          (cloud) => cloud.resetPassword(email),
                          "Password-reset request sent. If an account is eligible, check its inbox and spam folder.",
                        );
                      }}
                    >
                      Reset password
                    </button>
                  </>
                ) : (
                  <div className="notice info">
                    <strong>Guest mode is fully functional.</strong>
                    <p>
                      {client?.unavailableReason ||
                        "Checking whether Firebase is configured..."}{" "}
                      No local name or profile PIN is represented as cloud
                      authentication. Notes and learning records stay on this
                      browser.
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
          <section className="panel">
            <div className="section-title">
              <h2>Make it your own</h2>
              <Save size={20} />
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const now = new Date().toISOString();
                if (
                  mutate((current) => ({
                    ...current,
                    updatedAt: now,
                    settings: {
                      id: "settings",
                      displayName: displayName.trim(),
                      timezone: timezone.trim(),
                      theme,
                      dailyMinutes,
                      primaryTrack,
                      updatedAt: now,
                    },
                  }))
                )
                  notify(
                    "Learning preferences saved. Existing activity dates keep their recorded timezone.",
                  );
              }}
            >
              <label className="field-label">
                Preferred name
                <input
                  required
                  maxLength={100}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="nickname"
                />
              </label>
              <label className="field-label">
                Planning timezone
                <input
                  required
                  list="timezones"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  placeholder="Asia/Kolkata"
                />
                <datalist id="timezones">
                  {[
                    "Asia/Kolkata",
                    "UTC",
                    "Asia/Singapore",
                    "Asia/Dubai",
                    "Europe/London",
                    "Europe/Berlin",
                    "America/New_York",
                    "America/Los_Angeles",
                    "Australia/Sydney",
                  ].map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </label>
              <div className="form-grid">
                <label className="field-label">
                  Daily study target (minutes)
                  <input
                    type="number"
                    required
                    min={5}
                    max={480}
                    step={5}
                    value={dailyMinutes}
                    onChange={(event) =>
                      setDailyMinutes(Number(event.target.value))
                    }
                  />
                </label>
                <label className="field-label">
                  Appearance
                  <select
                    value={theme}
                    onChange={(event) => setTheme(event.target.value as Theme)}
                  >
                    <option value="system">Follow device</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>
              </div>
              <label className="field-label">
                Primary learning focus
                <select
                  value={primaryTrack}
                  onChange={(event) =>
                    setPrimaryTrack(event.target.value as CoreTrackId)
                  }
                >
                  {CORE_TRACK_IDS.map((id) => (
                    <option key={id} value={id}>
                      {trackMeta[id].label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="quiet-note">
                The Common Foundation still comes first for the four career
                paths. Extra Topics are optional, opened independently from the
                navigation, and never replace this saved core focus. No exam
                date or career outcome is assumed.
              </p>
              <button className="button primary" type="submit">
                <Save size={16} />
                Save preferences
              </button>
            </form>
          </section>
        </div>
        <div>
          <section className="panel">
            <div className="section-title">
              <h2>Your data, in your hands</h2>
              <Download size={20} />
            </div>
            <p>
              Versioned exports contain your learning records, plain-text notes,
              goals and sanitized legacy archives. They never include passwords,
              PIN hashes or Auth tokens. Treat exports as private files.
            </p>
            <button
              className="button secondary"
              onClick={() => {
                try {
                  downloadJson(
                    `progress-learning-v2-${new Date().toISOString().slice(0, 10)}.json`,
                    exportProgress(state),
                  );
                  notify("Private learning export downloaded.");
                } catch (failure) {
                  workspace.setError(
                    failure instanceof Error
                      ? failure.message
                      : "Export could not be created.",
                  );
                }
              }}
            >
              <Download size={16} />
              Export my learning data
            </button>
            <hr />
            <h3>Import carefully</h3>
            <p>
              Import a v2 export or an original tracker export. New records are
              added; different existing records are kept and reported. Original
              scheduled sessions stay in the legacy archive, not counted as new
              lessons.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={importAllowed}
                onChange={(event) => setImportAllowed(event.target.checked)}
              />
              I own this learning data and approve importing it into this
              workspace.
            </label>
            <label className="field-label section-block">
              Choose a progress JSON export
              <input
                type="file"
                accept=".json,application/json"
                disabled={!importAllowed}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  const input = event.target;
                  if (!file) return;
                  if (file.size > 5_000_000) {
                    workspace.setError(
                      "Import exceeds the 5 MB safety limit. Nothing was imported.",
                    );
                    input.value = "";
                    return;
                  }
                  if (
                    !window.confirm(
                      `Import "${file.name}" into ${user?.email || "this guest workspace"}? Existing conflicting records will be kept; account identity will never be changed.`,
                    )
                  ) {
                    input.value = "";
                    return;
                  }
                  const expectedOwner = state.ownerId;
                  void file
                    .text()
                    .then((text) => {
                      workspace.importText(text, importAllowed, expectedOwner);
                      input.value = "";
                    })
                    .catch((failure: unknown) =>
                      workspace.setError(
                        `Import could not be read: ${failure instanceof Error ? failure.message : "unknown file error"}`,
                      ),
                    );
                }}
              />
            </label>
            <p className="quiet-note">
              An export from a different cloud account containing its
              cloud-owned legacy archive cannot be reassigned to another UID.
              Shared browser guest imports require deliberate consent.
            </p>
          </section>
          {workspace.conflicts.length > 0 && (
            <section className="panel">
              <h2>Review sync conflicts</h2>
              <p>
                Both devices edited the same record. Compare versions, then
                choose. A local conflict backup is retained before applying your
                decision.
              </p>
              {workspace.conflicts.map((conflict) => (
                <div className="conflict-card" key={conflict.key}>
                  <h3>{conflict.key}</h3>
                  <details>
                    <summary>Compare local and cloud versions</summary>
                    <h4>This browser</h4>
                    <pre>{JSON.stringify(conflict.local.data, null, 2)}</pre>
                    <h4>Cloud</h4>
                    <pre>
                      {conflict.remote
                        ? JSON.stringify(conflict.remote.data, null, 2)
                        : "This record was removed remotely."}
                    </pre>
                  </details>
                  <div className="button-row">
                    <button
                      className="button secondary small"
                      onClick={() =>
                        workspace.resolveConflict(conflict.key, "local")
                      }
                    >
                      Keep my local version
                    </button>
                    <button
                      className="button secondary small"
                      onClick={() =>
                        workspace.resolveConflict(conflict.key, "remote")
                      }
                    >
                      Use the cloud version
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}
          <details className="panel recovery-details">
            <summary>
              <Archive size={18} />
              Advanced: recover original learning records
            </summary>
            <div>
              <p>
                The new curriculum starts fresh. Optional recovery preserves
                existing browser profiles and Firestore records without granting
                old lesson credit. Select only your own local profile; cached
                cloud profiles are hidden unless their UID matches the signed-in
                account.
              </p>
              {workspace.legacyError && (
                <div className="notice error">{workspace.legacyError}</div>
              )}
              {workspace.legacyProfiles.length > 0 ? (
                <>
                  <label className="field-label">
                    Original local profile
                    <select
                      value={legacyId}
                      onChange={(event) => setLegacyId(event.target.value)}
                    >
                      <option value="">Choose explicitly...</option>
                      {workspace.legacyProfiles.map((profile) => (
                        <option value={profile.id} key={profile.id}>
                          {profile.name} ({profile.source})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="button secondary"
                    disabled={!legacyId}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Archive this selected profile's learning records in the current workspace? Original browser keys stay untouched. Only import data that belongs to you.",
                        )
                      )
                        workspace.importLocalLegacy(legacyId);
                    }}
                  >
                    Archive selected local history
                  </button>
                </>
              ) : (
                <p className="muted">
                  No eligible original local profile was found on this browser.
                </p>
              )}
              {user && (
                <button
                  className="button secondary section-block"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Read and archive the original studyProgressProfiles record owned by ${user.email || user.uid}? The existing Firestore document will not be changed.`,
                      )
                    )
                      void workspace.importCloudLegacy();
                  }}
                >
                  Archive my original cloud profile
                </button>
              )}
              <p className="quiet-note">
                Legacy archives are kept in this owner's browser cache and
                private export, not copied into new giant Firestore documents.
                Original cloud history remains available to its UID on other
                devices.
              </p>
              <a className="arrow-link section-block" href="#/legacy">
                Browse the preserved archive <ArrowRight size={16} />
              </a>
            </div>
          </details>
          <section className="panel settings-danger">
            <h2>Reset current learning progress</h2>
            <p>
              This clears the current workspace's new lesson records, notes,
              activities, goals and project evidence. A browser backup is made
              first. For an authenticated account it also removes that UID's new
              Firestore records, but never the original legacy profile or any
              other user's data.
            </p>
            <label className="field-label">
              Type RESET to confirm
              <input
                autoComplete="off"
                value={resetPhrase}
                onChange={(event) => setResetPhrase(event.target.value)}
                placeholder="RESET"
              />
            </label>
            <button
              className="button danger"
              disabled={resetPhrase !== "RESET" || busy || !workspace.ready}
              onClick={() => {
                if (
                  window.confirm(
                    `Reset current progress for ${user?.email || "this guest workspace"}? Export first if you want an additional backup. This does not delete your Firebase account.`,
                  )
                )
                  void workspace
                    .resetWorkspace()
                    .then(() => setResetPhrase(""));
              }}
            >
              Reset this workspace
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
