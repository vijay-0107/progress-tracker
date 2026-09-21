# Progress: a personal learning workspace

A responsive, local-first learning platform for **Common Foundation, Data, SDE,
Quant, AI, GATE (CS/IT and DA), and CAT (VARC, DILR and QA)**. It combines curated
lesson roadmaps, official resources, practical assignments, original self-checks,
project evidence, private notes and deliberate review.

**Extra Topics** adds optional curricula in Trading, Algorithmic Trading,
Finance, Computer Security Systems and Ethical Hacking without replacing any of
those paths.

The Common Foundation is the shared starting point, **not** a concatenation of
four advanced career tracks. Lesson IDs are canonical: a foundation completion
satisfies the same prerequisite everywhere without being counted four times.

## Extra Topics: optional, with their own progress

Curriculum **2026.09.21.1** is an append-only addition. The original seven paths
still contain **66 modules and 231 unique lessons**, and the Project studio still
contains the same **21 projects**. Extra Topics adds **48 modules / 124 lessons**
and five integrated capstones inside the topic roadmaps:

| Optional topic | Modules | Lessons by stage: Beginner / Intermediate / Advanced / Professional Practice | Capstone evidence |
| --- | --- | --- | --- |
| Trading | 8 | 5 / 5 / 5 / 5 | Frozen paper replay, risk/stress workbook, complete journal, halt drill and independent review |
| Algorithmic Trading | 8 | 6 / 6 / 6 / 6 | Point-in-time data, causal/cost-aware simulator, OOS audit, disconnected paper adapter and recovery tests |
| Finance | 10 | 7 / 7 / 5 / 5 | Synthetic household resilience plan and audited three-statement/valuation dossier |
| Computer Security Systems | 12 | 8 / 8 / 8 / 8 | Authorized isolated service, mechanism-to-test matrix, scoped ASVS evidence and measured restoration |
| Ethical Hacking | 10 | 6 / 6 / 6 / 6 | Authorized local-lab assessment, minimal harmless proofs, root-cause fixes, independent retests and redacted handover |

Find **Extra Topics** in the dashboard or navigation. Each roadmap has four
stage outcomes, evidence requirements, stage filters and independent stage/topic
progress. A topic is optional as a whole; its lessons still count normally
*within that topic*. Extra completions never inflate or reduce core totals.
Bookmarks, notes, self-checks, reviews, evidence and study activity use the existing
owner-scoped records. Shared Common Foundation/Quant/SDE/AI prerequisites link to
their canonical lessons rather than copying IDs or awarding duplicate credit.

The saved primary focus and goal categories deliberately remain the original
seven core paths, matching the unchanged Firestore rules. Extras open independently
and do not overwrite a selected core path. No progress migration, seeding, reset,
Auth/storage clearing or Firebase configuration change is needed. Schema-2
exports include new lesson records; import continues to preserve the destination's
existing preferences and conflicting records rather than silently overwrite them.

Every lesson includes original practical work, acceptance criteria and explained
self-checks. Some lessons are explicitly reading-led rather than given a
fabricated video. Resources include SEBI and RBI education, verified Varsity chapter
indexes, MIT OCW, NYU Stern, pandas/scikit-learn, OWASP, NIST revision-4 identity
guidance and revision-3 incident response, Harvard CS50 and Stanford cryptography.
Locators, availability, source dates and historical/jurisdiction limitations are
shown with the readings. Ethical Hacking adds public PortSwigger Academy readings,
versioned OWASP WSTG 4.2, official local WebGoat/Juice Shop setup and historical
NIST 800-115 process guidance. PortSwigger hosted labs and CMU CyLab Security
Academy (the current migrated picoCTF platform) are optional, free-account
practice, not a requirement or permission to test unrelated services.
Core learning requires no paid service or certificate;
the six existing licensed PDFs and checksums are unchanged and remain opt-in.
`public/curriculum-provenance.json` preserves the original seven file checksums
and records the new topic files separately. `content:import` retains its
seven-core-handoff default; `--track <id>` also supports an extra topic and keeps
unselected provenance entries rather than replacing the whole inventory.

Trading and algorithmic practice is **synthetic/historical/paper-only**, with no
broker connection, real-money activity, buy/sell recommendation or profit guarantee.
Finance uses fictional cases, not personalized product or tax advice. Security
practice is **defensive, owned/authorized and isolated**, using synthetic data and
benign tests, never real-target intrusion, credential harvesting, harmful payloads
or evasion. Ethical Hacking assesses intentionally vulnerable **authorized local
fixtures**, using bounded harmless proof, remediation and retesting; it never
assigns unauthorized scanning, real credential collection or real-target attacks.
**Professional Practice is a learning level**, not certification,
qualification or externally verified professional competence.

## Run locally

Use Node.js 22 LTS and npm. The application does not require Firebase credentials
to learn, save notes, complete assignments or export progress.

```powershell
npm ci
npm run dev
```

Open <http://127.0.0.1:5177/>. This is an explicit **guest / browser-only**
workspace, not a simulated signed-in account. A local display name does not
authenticate anyone.

```powershell
npm run typecheck
npm run format:check
npm run test:unit
npm run build
npm run preview
```

The preview server uses <http://127.0.0.1:4177/>. Hash routes work on GitHub Pages
without rewrite rules. A production build at the repository path uses:

```powershell
$env:VITE_BASE_PATH = '/progress-tracker/'
npm run build
```

The build footer identifies its curriculum version and, in CI, Git commit.

## What the workspace records

- **Roadmaps:** expandable modules, nested concepts, prerequisites, stage and
  paper/section filters, search and next eligible lessons.
- **Lessons:** observable objectives, estimated study time, a verified lecture
  where relevant and available, a specific book or official reading, supplemental documentation, and an original
  assignment with deliverables and acceptance criteria. Watch/read/build/reflect
  are different activities; merely loading a page grants no credit.
- **Evidence:** a meaningful plain-text evidence record and the learner's rubric
  checks are required for manual assignment completion. The label remains
  *self-reported*, not server-verified mastery, employment readiness or exam rank.
- **Practice:** original questions are checked locally where an objective answer
  exists. Short written answers require manual comparison. Wrong answers enter
  an error notebook. External problems remain official links, with no copied
  statements, solutions or pretend auto-judging.
- **Review:** assignment completion creates a recall schedule. Again/hard/good
  self-ratings adjust it; the underlying content stays accessible.
- **Reader:** approved, redistributable PDFs are hosted with licenses,
  attribution and checksums. Other books use official read-online/PDF/library or
  publisher links. Native PDF support varies on mobile; every reader has an
  open-in-new-tab fallback. Reading positions, bookmarks and notes persist.
- **Projects:** all eight A college reconstructions, twelve B advanced future
  builds, and one shared **Microsoft Fabric Reporting Workflows** synthetic
  recreation. Each follows design/fixtures, vertical slice, correctness/failure
  tests, then documentation/demo/real measurements. Nothing starts completed.

The A historical college completions are user-reported; the lost source files
are not represented as recovered or verified. B builds remain future work.
Professional exercises must use synthetic or lawfully reusable public data.
Never publish employer/client information, private reports or source code.
Face projects are local, opt-in, consent-based verification or capture quality,
not surveillance or identification of unknown people. Quant work makes no
profitability claims.

### Licensed PDF inventory

Six unmodified, inspected PDFs total **90.54 MB**. Individual files remain below
50 MB and the inventory is capped at 100 MB. They are not preloaded or precached:
the reader displays the size and requires an explicit click for each lesson/book.
Official online editions remain available, especially for a lighter phone read.

| Book | License | PDF size |
| --- | --- | --- |
| Open Data Structures, pseudocode edition | CC BY 2.5 Canada | 1.46 MB |
| Algorithms, Jeff Erickson | CC BY 4.0 | 25.06 MB |
| Dive into Deep Learning | CC BY-SA 4.0 | 44.69 MB |
| Database Design, 2nd edition | CC BY 4.0; credited cover CC BY-SA 2.0 | 2.96 MB |
| PostgreSQL 18 manual, pinned PDF 18.6 | PostgreSQL License | 15.86 MB |
| OWASP ASVS 5.0.0 | CC BY-SA 4.0 | 0.52 MB |

`public/books/manifest.json` pins original URLs, licenses, exact bytes and SHA-256
checksums; `public/books/ATTRIBUTION.md` retains required credits and notices.
The Quant C++ ODS edition is **not** silently replaced with the pseudocode PDF.
Conditional NC/ND, GFDL, cover/branding and uncertain rights remain accurately
labelled official links unless that exact artifact has been cleared.

### Activity, streaks and timezone

The initial planning timezone is **Asia/Kolkata**, configurable in Settings.
Each substantive activity records its ISO instant and timezone at creation.
Changing the preference does not relabel historical activity days.

Study logs require 5–240 actual, self-reported minutes and a description.
Assignments, objective assessment attempts, recall reviews and project evidence
gates are substantive events. Visits, bookmarks, typing a note and checking a
personal goal do not inflate the streak. Stable event identities prevent repeated
completion from creating duplicate credit. Reopening a lesson does not erase
historical activity.

A streak counts consecutive calendar days, not elapsed 24-hour periods. If
today is still empty, yesterday's run stays active until today's local midnight.
A fully missed day breaks the run. There are no invented grace days, seeded
badges, automatic backlog rebasing or claims that a checkmark establishes mastery.
Midnight, missed-day, duplicate, DST and repeated-completion cases have targeted
tests.

Exam preparation is self-paced: no intention to sit a particular exam or exam
date is assumed. Source edition/check dates and limitations are displayed.
CAT topic groupings are inferred preparation coverage, not an officially
exhaustive syllabus. The practice timer is adjustable and is not a replica or
guarantee of the current official paper format.

## Real Firebase authentication and sync

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md). The existing project is
`progress-tracker-6ff13`; do not create a duplicate, change billing, or obtain an
Admin SDK private key just to publish this catalog.

The SDK supports Google sign-in, explicit email/password registration and
sign-in, password reset, verification email and sign-out. An invalid sign-in
never silently creates a new account. An Auth session is distinct from guest
work and from an old local profile.

Both tracked Firebase configuration templates are deliberately blank. The
current application reads `public/firebase-config.js`, generated only during
deployment. Local development can use the ignored local override:

```powershell
# Set FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID and
# FIREBASE_APP_ID in this process (public Web app configuration, not admin keys).
npm run config:local
```

Alternatively, `npm run config:local -- --from C:\path\to\public-web-config.json`
accepts an object or a `firebaseConfig` property. The generated
`public/firebase-config.local.js` is ignored by Git, restricted to loopback
development, and stripped from `dist`. It contains public client metadata,
not permission to bypass Firestore rules. Analytics is not initialized.

New account records are bounded documents under
`learners/{uid}/{lessons|projects|goals|activity|errors|settings}/{id}`. Notes are
saved intentionally, not uploaded on every keystroke. All data access requires
the matching authenticated UID. No Firebase Storage, paid APIs or billing
upgrade is required.

Local account caches and pending-write journals are UID-scoped. Account changes
cancel stale listeners and do not expose the previous owner's drafts. A
server-acknowledged write is different from a locally queued change. Connection,
rules and quota failures stay visible with Retry sync. Concurrent record edits
use optimistic transactions and explicit version comparisons; conflicting
notes/evidence are not silently overwritten. Settings displays both versions
before the learner chooses one, retaining a local conflict backup.

Guest work is **never** automatically attached by email/name. The learner must
choose **Explicitly import my guest work** while authenticated and confirm
ownership. Existing differing records and account preferences are preserved.

## Preserve, export, import and reset

`schemaVersion: 2` exports allowlist learning data, not all browser storage.
Passwords, old PIN hashes, Auth/OAuth tokens and unrelated storage are excluded.
Keep exported notes/evidence private. Imports validate IDs, timestamps, sizes,
ownership and data shapes; incompatible/corrupt files fail visibly rather than
quietly resetting a profile. Differing existing records are kept and reported.

The original `progress-tracker-*-v1` keys and
`studyProgressProfiles/{uid}` documents are **not deleted or automatically
reassigned**. Settings lets the learner explicitly select their own original
local profile or read their authenticated original cloud profile. These become
a sanitized, owner-scoped **legacy archive**; obsolete day IDs do not earn credit
in the new curriculum.

The clean new catalog and fresh progress are the default. The original
catalog—35 topics, 436 subtopics and 1,300 scheduled sessions—is optionally
available through **Settings > Advanced: recover original learning records**,
not primary learning navigation. Original dates, notes, review flags and
completion claims remain readable. Its old search-based resource links are
clearly distinguished from the researched catalog. Legacy archives stay in the
current owner's browser/export; original Firestore documents remain accessible
to their UID on other devices, rather than being copied to a giant new document.

Reset requires the word `RESET` and a second confirmation. It makes a local
backup, keeps learning preferences, and affects only the current new workspace. Cloud reset requires the
matching account and a connection, removes only that UID's new records, and
does not delete its Auth identity or original legacy profile. A storage/quota
failure is not represented as successful saving or successful reset.

## Reproducible Firebase and browser checks

Java 21+ is needed for the Firestore emulator.

```powershell
npm run test:rules
npm run emulators
```

In a second terminal:

```powershell
$env:VITE_USE_EMULATORS = 'true'
npm run dev
```

This exclusively uses `demo-progress-tracker`, Auth `127.0.0.1:9099` and
Firestore `127.0.0.1:8080`. Emulator mode ignores production configuration and
cannot fall back to a live project. Emulator credentials are test-only.

```powershell
npx playwright install chromium
npm run test:e2e
```

Browser tests launch a separate Chromium process and fresh profiles; they do not
use any interactive Firebase/GitHub browser session. They serve the app under
`/progress-tracker/` from an isolated production-build snapshot, not a live HMR
server, to exercise Pages-compatible routes, resource paths and PDFs.
To include real Auth-emulator/Firestore browser flows:

```powershell
$env:E2E_EMULATORS = 'true'
npx firebase emulators:exec --project demo-progress-tracker --only auth,firestore "npm run test:e2e"
```

Do not run this wrapper if another emulator already owns ports 8080/9099; with
emulators already running, set the flag and use `npm run test:e2e` directly.

On the local Windows/Node 26/Java 26 combination, the Firebase CLI can leave its
Java emulator alive after reporting shutdown. Check the specific listening PID,
project arguments and creation time before stopping only that test-owned process;
never kill Java/Node by process name. CI uses the supported Node 22 / Java 21 pair.

For repeatable local production-preview observations and clean screenshots:

```powershell
node scripts\measure-preview.mjs http://127.0.0.1:4177/
```

This records actual paint/readiness/layout observations and automatic media
requests in fresh browser contexts. It does not claim global network performance
or a guaranteed frame rate.

## Deployment

The Extra Topics addition needs **no Firebase rules or service-setting changes**:
new lessons use the existing per-owner record contract and core settings/goal
IDs remain unchanged.

`.github/workflows/ci.yml` validates feature branches and pull requests.
`.github/workflows/pages.yml` publishes **only `dist`** on `main` after the
catalog/domain checks and a typed build. It generates runtime config using the
existing `FIREBASE_*` repository secrets; there is no need to overwrite matching
secrets. The URL is:

<https://vijay-0107.github.io/progress-tracker/>

Publish the verified `firebase.rules` in the existing project before enabling
new live writes. The new rules retain legacy UID ownership and read-only public
catalog access. Never deploy incomplete curriculum, test fixture data or
unverified rules. No force push or destructive migration is part of release.

## Repository layout

| Location | Responsibility |
| --- | --- |
| `src/content/tracks/` | Seven preserved core paths and five append-only optional topic curricula |
| `src/content/schema.ts`, `catalog.ts` | Runtime content validation, reference/cycle checks, canonical routing |
| `src/content/projects.ts` | Exact 21 original portfolio build briefs |
| `src/domain/` | Pure progress, assessment, review, timezone, import/migration and storage logic |
| `src/services/` | Firebase Auth, account guards and transactional per-record sync |
| `src/state/` | Owner-scoped local state, outbox and explicit conflict resolution |
| `src/ui/` | Accessible responsive learning, project, review, planner and settings views |
| `public/books/` | Only affirmative-license PDF assets and their attribution/manifest |
| `tests/` | Content, core state, migrations, isolation, rules and independent browser tests |
| Root legacy JS/CSS/JSON/Python | Preserved original tracker sources/catalog, not the new entry point |

The old Python generator references original source modules outside this
repository. It is not required to build the new app and must not be run against
the curated catalog. The old Firestore uploader is retained for historical
compatibility, not as the publication path for new courses.
