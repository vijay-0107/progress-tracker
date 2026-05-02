# Study Progress Tracker

A static Career + CAT progress tracker with optional Firebase Auth + Firestore sync.

## What Works Immediately

Open the folder with any static server and the app runs in local profile mode. Progress is saved in browser `localStorage`.

```powershell
python -m http.server 5177
```

Then open:

```text
http://127.0.0.1:5177/
```

## Enable Real Anywhere Sync

The app is already wired for Firebase Auth and Firestore. Keep the committed `firebase-config.js` blank. The GitHub Pages workflow generates the deployed config from repository secrets so Firebase identifiers are not stored in source control.

Detailed setup checklist: [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md)

1. Go to <https://console.firebase.google.com/> and create a project.
2. Open `Build` > `Authentication` > `Sign-in method`.
3. Enable `Email/Password`.
4. Open `Build` > `Firestore Database`.
5. Create a Firestore database.
6. Open `Project settings` > `General` > `Your apps`.
7. Add a Web app and copy the Firebase config.
8. Add the values as GitHub repository secrets: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, and `FIREBASE_MEASUREMENT_ID`.
9. In Firebase Authentication `Settings` > `Authorized domains`, add `vijay-0107.github.io`.
10. Restrict the Firebase Web API key in Google Cloud Console to HTTP referrers for `https://vijay-0107.github.io/*` and local development URLs you use.
11. Publish the Firestore rules from `firebase.rules`.

Firestore rules:

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /studyProgressProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

After this, the sign-in page changes to cloud mode. Sign in with email/password from any device and the same completions, notes, review flags, and preferences will sync.

## Host With GitHub Pages

1. Create a GitHub repository.
2. Push these files to the repo root.
3. In GitHub, open `Settings` > `Pages`.
4. Choose `Deploy from a branch`.
5. Select branch `main` and folder `/root`.
6. Your app link will look like:

```text
https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO-NAME/
```

Because this app uses hash routes like `#/plan`, GitHub Pages works without extra route rewrites.

## Files To Publish

Publish everything in this folder:

- `index.html`
- `app.js`
- `styles.css`
- `schedule-data.json`
- `cloud-sync.js`
- `firebase.rules`

`firebase-config.js` is a blank source-control template. The deployed GitHub Pages artifact receives Firebase values from GitHub Actions secrets. Browser Firebase apps still receive web-app identifiers at runtime, so security also requires Firebase Auth, Firestore rules, authorized domains, and HTTP referrer restrictions on the Firebase API key.
