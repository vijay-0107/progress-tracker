# Firebase Setup For Real Anywhere Sync

The app contains Firebase Auth, Firestore profile sync, and Firestore catalog loading. The committed `firebase-config.js` stays blank; GitHub Pages generates the deployed config from repository secrets.

## 1. Create The Firebase Project

1. Open <https://console.firebase.google.com/>.
2. Click **Add project**.
3. Name it something like `progress-tracker`.
4. Google Analytics is optional for this app.
5. Finish project creation.

## 2. Enable Email/Password Login

1. In Firebase, open **Build** > **Authentication**.
2. Click **Get started** if prompted.
3. Open **Sign-in method**.
4. Enable **Email/Password**.
5. Open **Settings** > **Authorized domains**.
6. Add this domain:

```text
vijay-0107.github.io
```

## 3. Create Firestore

1. Open **Build** > **Firestore Database**.
2. Click **Create database**.
3. Start in production mode.
4. Choose the nearest region.

## 4. Add Firestore Rules

Open Firestore **Rules** and paste the same rules from `firebase.rules`:

```text
rules_version = '2';

service cloud.firestore {
	match /databases/{database}/documents {
		match /studyProgressCatalog/{catalogId} {
			allow read: if true;
			allow write: if false;

			match /{document=**} {
				allow read: if true;
				allow write: if false;
			}
		}

		match /studyProgressProfiles/{userId} {
			allow read, write: if request.auth != null && request.auth.uid == userId;
		}
	}
}
```

Publish the rules.

## 5. Store The Web App Config As GitHub Secrets

1. Open **Project settings** > **General**.
2. Under **Your apps**, add a Web app.
3. Name it `progress-tracker-web`.
4. Copy the `firebaseConfig` object.
5. In GitHub, open the repository **Settings** > **Secrets and variables** > **Actions**.
6. Add these repository secrets:

```text
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
FIREBASE_MEASUREMENT_ID
```

The required fields are:

```js
export const firebaseConfig = {
	apiKey: "...",
	authDomain: "...",
	projectId: "...",
	storageBucket: "...",
	messagingSenderId: "...",
	appId: "...",
};
```

Firebase web config values are public identifiers. Data security comes from Firebase Auth and Firestore rules.

Do not paste these values into the committed `firebase-config.js`. Keep that file blank in Git and place the values in GitHub repository secrets instead.

## 6. Upload The Course Catalog To Firestore

The schedule file is too large for a single Firestore document, so upload it as a normalized catalog:

- `studyProgressCatalog/current`
- `studyProgressCatalog/current/topics/{topicId}`
- `studyProgressCatalog/current/subtopics/{subtopicId}`
- `studyProgressCatalog/current/sessions/{sessionId}`

Create a Firebase service account key from **Project settings** > **Service accounts**. Store the downloaded JSON file outside this repository.

Then run:

```powershell
python -m pip install firebase-admin
python upload_schedule_to_firestore.py --service-account C:\path\to\service-account.json --project-id progress-tracker-6ff13
```

For a no-write check first:

```powershell
python upload_schedule_to_firestore.py --dry-run
```

The admin SDK uses your local service account and bypasses Firestore client rules. The `.gitignore` blocks common service-account and `.env` file names, but still keep credentials outside the project folder.

## 7. Restrict The Firebase Web API Key

Firebase Web API keys are delivered to the browser at runtime, so they cannot be treated like backend secrets. Restrict the key instead:

1. Open <https://console.cloud.google.com/apis/credentials>.
2. Select the browser key used by the Firebase Web app.
3. Under **Application restrictions**, choose **Websites**.
4. Add allowed referrers:

```text
https://vijay-0107.github.io/*
http://localhost:*
http://127.0.0.1:*
```

5. Under **API restrictions**, restrict it to Firebase/Auth/Firestore APIs used by the app.
6. Save the key restriction.

## 8. Configure GitHub Pages Deployment

In GitHub, open **Settings** > **Pages** and set **Build and deployment** > **Source** to **GitHub Actions**. The workflow in `.github/workflows/pages.yml` builds `firebase-config.js` from repository secrets during deployment.

## 9. Verify

After repository secrets are added, Firestore rules are published, the catalog is uploaded, and GitHub Actions redeploys, open:

```text
https://vijay-0107.github.io/progress-tracker/
```

The sign-in screen should change from **Local storage mode** to **Firestore ready**. Sign in with an email and a password of at least 6 characters. The same account will sync catalog data, progress, notes, review flags, and profile preferences across devices.
