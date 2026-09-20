# Firebase setup and safe release

The learning platform works without credentials in explicit guest mode. Real
cross-device sync uses Firebase Auth and UID-owned Firestore records, not local
names/PINs. The course catalog and approved books are static assets on GitHub
Pages; **no service-account download, Storage bucket or paid plan is required**.

## Existing project

Use the existing `progress-tracker-6ff13` project, Web app and `(default)`
Firestore database in `asia-south1`. It is on Spark. Preserve
`studyProgressCatalog` and `studyProgressProfiles`; do not create a replacement
database or upgrade billing.

The user-authorized setup inspection confirmed:

- Google and Email/Password providers enabled.
- `localhost`, `127.0.0.1`, `vijay-0107.github.io`, and the project's Firebase
  hosting/auth domains authorized.
- The existing Pages public runtime configuration matches the Firebase Web app.
- All seven existing `FIREBASE_*` GitHub Actions secrets are present.

`127.0.0.1` was explicitly added. Do **not** assume new Firebase projects
authorize localhost or the loopback IP automatically.

For another installation, enable both providers, configure a Google support
email, and explicitly add the three application hostnames above (replace Pages
with your actual hostname). Password-reset and verification emails use Firebase
Auth's project templates; verify authorized callback domains before production.

## Runtime configuration

Keep `public/firebase-config.js` blank in source control. The root
`firebase-config.js` is the untouched legacy template. Firebase client
configuration is public runtime metadata; never substitute Admin SDK JSON,
private keys, OAuth tokens or learner data.

For ignored local configuration:

```powershell
$env:FIREBASE_API_KEY = '<public Web API key>'
$env:FIREBASE_AUTH_DOMAIN = 'progress-tracker-6ff13.firebaseapp.com'
$env:FIREBASE_PROJECT_ID = 'progress-tracker-6ff13'
$env:FIREBASE_APP_ID = '<public Web app id>'
npm run config:local
npm run dev
```

Or use a local public configuration JSON with
`npm run config:local -- --from C:\path\to\web-config.json`.

The CLI generates `public/firebase-config.local.js`, ignored by Git, used only
on loopback, and omitted from production output. Missing config displays a clear
guest-only state. A network or permission failure after configuration is **not**
reported as successful sync.

The deployment uses these existing repository secrets:

```text
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_APP_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_MEASUREMENT_ID
```

Only the first four are required. Storage and Analytics SDKs are not initialized.
The extra identifiers may remain in the supplied Web config without enabling
those products.

## Firestore model and rules

New version-2 records:

```text
learners/{uid}/settings/settings
learners/{uid}/lessons/{canonicalLessonId}
learners/{uid}/projects/{projectId}
learners/{uid}/goals/{goalId}
learners/{uid}/activity/{eventId}
learners/{uid}/errors/{errorEntryId}
```

The app uses bounded, validated documents rather than an ever-growing profile
document. It saves intentional actions rather than every textarea keystroke.
New notes/evidence have explicit size limits. Per-record optimistic transactions
compare the acknowledged `updatedAt` version; concurrent changes require an
explicit decision, not silent last-writer-wins replacement.

`firebase.rules` is the source of truth. It denies unauthenticated and cross-UID
access, restricts document paths and fields, and keeps the public legacy catalog
read-only. Existing `studyProgressProfiles/{uid}` owner-only compatibility
remains for older cached clients. The new app reads original profiles only for
explicit same-UID archival and never rewrites them.

Before publication:

```powershell
npm run test:rules
```

Publish the **tested** file through the existing authenticated Firebase Console
Rules editor, or an already-authorized Firebase CLI. An admin key is not needed.
Do not publish partially edited rules. Verify the published text/checksum and
then test same-UID live sync without exposing private records. Expected
permission failures before rules rollout must remain visible in the UI.

## Emulator isolation

Install dependencies and Java 21+. Start the Auth and Firestore emulators:

```powershell
npm run emulators
```

In another terminal:

```powershell
$env:VITE_USE_EMULATORS = 'true'
npm run dev
```

Only the `demo-progress-tracker` project and explicit loopback endpoints are
used. Production config is ignored in this mode. Emulator mode is refused on
non-loopback hosts and never falls back to production if an emulator is down.
Keep emulator export files out of Git.

Rules tests include legitimate operations, malformed/bounded data, unauthenticated
denial, cross-user reads/writes/queries, public-catalog write denial and original
profile ownership. Auth/sync tests cover failed initialization, explicit
registration, password reset, verification, sign-out, identity races and conflicts.

Independent browser testing with both emulators:

```powershell
$env:E2E_EMULATORS = 'true'
npx firebase emulators:exec --project demo-progress-tracker --only auth,firestore "npm run test:e2e"
```

## Account transitions and preservation

Browser caches and pending-write journals are scoped to the authenticated UID.
An account switch invalidates in-flight results/listeners and remounts private
draft views. Signed-out guest records are never replaced by cloud records.
Matching an email or local display name is not authorization to merge data.

Guest import and old local profile import each require an explicit ownership
confirmation. Original cloud history requires the matching UID. Exports include
only validated learning data and sanitized archives, never PIN/password hashes,
Auth tokens or unrelated localStorage. Original legacy keys and Firestore
documents remain unchanged. See the README for reset, conflict and backup behavior.

## Free GitHub Pages release

The Pages workflow publishes a typed Vite build under `/progress-tracker/`.
The existing GitHub Pages source is GitHub Actions. Only `dist` is uploaded;
repository scripts, tests, local configuration and private browser state are not
published. The build/version footer distinguishes a new deployment from an older
cached release.

Keep the existing Web API key restrictions unless a verified local/Pages failure
requires a scoped change. Client metadata is public; actual data protection
comes from Firebase Auth, UID rules and application validation. Do not disable
rules, loosen cross-user permissions or enable billing to bypass a setup error.
