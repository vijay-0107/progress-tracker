import { firebaseConfig } from "./firebase-config.js";

const FIREBASE_VERSION = "10.12.5";
const COLLECTION_NAME = "studyProgressProfiles";
const CATALOG_COLLECTION_NAME = "studyProgressCatalog";
const CATALOG_ID = "current";
const REQUIRED_CONFIG_FIELDS = ["apiKey", "authDomain", "projectId", "appId"];
const DEFAULT_WEEKDAY_TARGET = 1;
const DEFAULT_WEEKEND_TARGET = 4;

let firebaseModules = null;
let app = null;
let auth = null;
let db = null;
let progressUnsubscribe = null;

const cloudState = {
  configured: getMissingConfigFields().length === 0,
  missingConfigFields: getMissingConfigFields(),
  ready: false,
  user: null,
  error: "",
};

export function getCloudState() {
  return { ...cloudState };
}

export async function initCloudSync(onAuthChange) {
  if (!cloudState.configured) {
    cloudState.ready = true;
    return getCloudState();
  }

  try {
    firebaseModules = await loadFirebaseModules();
    app = firebaseModules.initializeApp(firebaseConfig);
    auth = firebaseModules.getAuth(app);
    db = firebaseModules.getFirestore(app);
    firebaseModules.onAuthStateChanged(auth, async (user) => {
      cloudState.user = user;
      await onAuthChange(user);
    });
    cloudState.ready = true;
  } catch (error) {
    cloudState.error = error.message || "Firebase could not be initialized.";
    cloudState.ready = true;
  }

  return getCloudState();
}

export async function signInOrCreateCloudAccount(email, password) {
  assertCloudReady();
  try {
    return (await firebaseModules.signInWithEmailAndPassword(auth, email, password)).user;
  } catch (error) {
    if (error.code !== "auth/user-not-found" && error.code !== "auth/invalid-credential") {
      throw error;
    }
    return (await firebaseModules.createUserWithEmailAndPassword(auth, email, password)).user;
  }
}

export async function signOutCloudAccount() {
  if (!auth) {
    return;
  }
  stopCloudWatch();
  await firebaseModules.signOut(auth);
}

export async function loadCloudProfile(firebaseUser) {
  assertCloudReady();
  const reference = getProfileReference(firebaseUser.uid);
  const snapshot = await firebaseModules.getDoc(reference);
  if (!snapshot.exists()) {
    const initial = createInitialCloudProfile(firebaseUser);
    await firebaseModules.setDoc(reference, withServerTimestamp(initial), { merge: true });
    return initial;
  }
  return normalizeCloudProfile(firebaseUser, snapshot.data());
}

export async function loadCloudScheduleData() {
  assertCloudReady();
  const catalogReference = firebaseModules.doc(db, CATALOG_COLLECTION_NAME, CATALOG_ID);
  const [catalogSnapshot, topics, subtopics, sessions] = await Promise.all([
    firebaseModules.getDoc(catalogReference),
    getCatalogCollection("topics"),
    getCatalogCollection("subtopics"),
    getCatalogCollection("sessions"),
  ]);

  if (!catalogSnapshot.exists() || !topics.length || !sessions.length) {
    throw new Error("Firestore catalog is not uploaded yet.");
  }

  return buildScheduleData(catalogSnapshot.data(), topics, subtopics, sessions);
}

export function watchCloudProfile(firebaseUser, onChange) {
  assertCloudReady();
  stopCloudWatch();
  progressUnsubscribe = firebaseModules.onSnapshot(getProfileReference(firebaseUser.uid), (snapshot) => {
    if (snapshot.exists()) {
      onChange(normalizeCloudProfile(firebaseUser, snapshot.data()));
    }
  });
}

export async function saveCloudProfile(profileData) {
  assertCloudReady();
  if (!profileData?.profile?.cloudUid) {
    return;
  }
  await firebaseModules.setDoc(
    getProfileReference(profileData.profile.cloudUid),
    withServerTimestamp(profileData),
    { merge: true },
  );
}

export function stopCloudWatch() {
  if (typeof progressUnsubscribe === "function") {
    progressUnsubscribe();
  }
  progressUnsubscribe = null;
}

function getProfileReference(uid) {
  return firebaseModules.doc(db, COLLECTION_NAME, uid);
}

async function getCatalogCollection(collectionName) {
  const reference = firebaseModules.collection(db, CATALOG_COLLECTION_NAME, CATALOG_ID, collectionName);
  const snapshot = await firebaseModules.getDocs(firebaseModules.query(reference, firebaseModules.orderBy("order")));
  return snapshot.docs.map((documentSnapshot) => ({ ...documentSnapshot.data(), id: documentSnapshot.id }));
}

function buildScheduleData(catalog, topics, subtopics, sessions) {
  const sessionsBySubtopic = groupBy(sessions, "subtopicId");
  const subtopicsByTopic = groupBy(subtopics, "topicId");
  return {
    generatedAt: catalog.generatedAt || new Date().toISOString(),
    sources: catalog.sources || [],
    totalTopics: catalog.totalTopics || topics.length,
    totalSessions: catalog.totalSessions || sessions.length,
    topics: topics.map((topic) => ({
      ...stripCatalogFields(topic),
      subtopics: (subtopicsByTopic[topic.id] || []).map((subtopic) => ({
        ...stripCatalogFields(subtopic),
        sessions: (sessionsBySubtopic[subtopic.id] || []).map(stripCatalogFields),
      })),
    })),
  };
}

function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const groupKey = item[key];
    if (!groupKey) {
      return groups;
    }
    groups[groupKey] = groups[groupKey] || [];
    groups[groupKey].push(item);
    return groups;
  }, {});
}

function stripCatalogFields(item) {
  const { order, topicId, subtopicId, ...data } = item;
  return data;
}

function getMissingConfigFields() {
  return REQUIRED_CONFIG_FIELDS.filter((field) => !String(firebaseConfig[field] || "").trim());
}

async function loadFirebaseModules() {
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
  ]);

  return {
    initializeApp: appModule.initializeApp,
    getAuth: authModule.getAuth,
    onAuthStateChanged: authModule.onAuthStateChanged,
    signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
    createUserWithEmailAndPassword: authModule.createUserWithEmailAndPassword,
    signOut: authModule.signOut,
    getFirestore: firestoreModule.getFirestore,
    collection: firestoreModule.collection,
    doc: firestoreModule.doc,
    getDoc: firestoreModule.getDoc,
    getDocs: firestoreModule.getDocs,
    orderBy: firestoreModule.orderBy,
    query: firestoreModule.query,
    setDoc: firestoreModule.setDoc,
    onSnapshot: firestoreModule.onSnapshot,
    serverTimestamp: firestoreModule.serverTimestamp,
  };
}

function createInitialCloudProfile(firebaseUser) {
  return normalizeCloudProfile(firebaseUser, {
    profile: {
      name: formatEmailName(firebaseUser.email),
      email: firebaseUser.email,
      dailyTarget: DEFAULT_WEEKDAY_TARGET,
      weekdayTarget: DEFAULT_WEEKDAY_TARGET,
      weekendTarget: DEFAULT_WEEKEND_TARGET,
      planStartDate: getLocalDateIso(new Date()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    completions: {},
    notes: {},
    review: {},
  });
}

function normalizeCloudProfile(firebaseUser, data = {}) {
  const profile = data.profile || {};
  return {
    profile: {
      id: `cloud-${firebaseUser.uid}`,
      cloudUid: firebaseUser.uid,
      name: profile.name || formatEmailName(firebaseUser.email),
      email: profile.email || firebaseUser.email,
      dailyTarget: profile.weekdayTarget || profile.dailyTarget || DEFAULT_WEEKDAY_TARGET,
      weekdayTarget: profile.weekdayTarget || DEFAULT_WEEKDAY_TARGET,
      weekendTarget: profile.weekendTarget || DEFAULT_WEEKEND_TARGET,
      planStartDate: profile.planStartDate || getLocalDateIso(new Date()),
      lastPlanRebasedAt: profile.lastPlanRebasedAt || "",
      lastPlanRebaseReason: profile.lastPlanRebaseReason || "",
      lastStreakResetAt: profile.lastStreakResetAt || "",
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: profile.updatedAt || new Date().toISOString(),
    },
    completions: data.completions || {},
    notes: data.notes || {},
    review: data.review || {},
  };
}

function withServerTimestamp(profileData) {
  return {
    profile: profileData.profile,
    completions: profileData.completions || {},
    notes: profileData.notes || {},
    review: profileData.review || {},
    updatedAt: firebaseModules.serverTimestamp(),
  };
}

function assertCloudReady() {
  if (!cloudState.configured || !firebaseModules || !auth || !db) {
    throw new Error("Firebase is not configured yet.");
  }
}

function formatEmailName(email) {
  return String(email || "Study Profile")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getLocalDateIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
