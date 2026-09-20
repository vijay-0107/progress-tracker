import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
  type User,
  type UserCredential,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  createSyncRepository,
  SyncIdentityError,
  type SessionIdentity,
  type SyncIdentityGuard,
  type SyncRepository,
} from "./sync";

export {
  MAX_TRANSACTION_RECORDS,
  SyncConflictError,
  SyncIdentityError,
  SyncValidationError,
} from "./sync";
export type {
  SyncChange,
  SyncConflict,
  SyncDelete,
  SyncRepository,
} from "./sync";

export interface CloudUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

export type CloudMode = "cloud" | "emulator" | "disabled";

export interface CloudClient extends SyncRepository {
  readonly configured: boolean;
  readonly mode: CloudMode;
  readonly unavailableReason: string | null;
  readonly error: Error | null;
  signIn(email: string, password: string): Promise<CloudUser>;
  register(email: string, password: string): Promise<CloudUser>;
  googleSignIn(): Promise<CloudUser>;
  resetPassword(email: string): Promise<void>;
  resendVerification(): Promise<void>;
  signOut(): Promise<void>;
  getUser(): CloudUser | null;
  dispose(): void;
}

export class CloudUnavailableError extends Error {
  readonly code = "cloud/unavailable";

  constructor(message: string) {
    super(message);
    this.name = "CloudUnavailableError";
  }
}

export class VerificationDeliveryError extends Error {
  readonly code = "auth/verification-delivery-failed";

  constructor(options: ErrorOptions) {
    super(
      "Your account was created, but the verification email could not be sent. Use Resend verification.",
      options,
    );
    this.name = "VerificationDeliveryError";
  }
}

export const EMULATOR_PROJECT_ID = "demo-progress-tracker";
export const EMULATOR_HOST = "127.0.0.1";
export const AUTH_EMULATOR_PORT = 9099;
export const FIRESTORE_EMULATOR_PORT = 8080;

interface ConfigurationEnvironment {
  baseUrl: string;
  origin: string;
  hostname: string;
  useEmulators: boolean;
}

type CloudConfiguration =
  | { mode: "disabled"; reason: string; options: null }
  | { mode: "cloud" | "emulator"; reason: null; options: FirebaseOptions };

type ConfigImporter = (url: string) => Promise<unknown>;
const importConfiguration: ConfigImporter = (url) =>
  import(/* @vite-ignore */ url);
const requiredFields = ["apiKey", "authDomain", "projectId", "appId"] as const;
const loopback = (hostname: string) =>
  ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);

function runtimeEnvironment(): ConfigurationEnvironment {
  const emulatorFlag = import.meta.env.VITE_USE_EMULATORS;
  if (emulatorFlag && emulatorFlag !== "true" && emulatorFlag !== "false") {
    throw new CloudUnavailableError(
      "VITE_USE_EMULATORS must be exactly true or false. No Firebase connection was made.",
    );
  }
  return {
    baseUrl: import.meta.env.BASE_URL || "/",
    origin: globalThis.location?.origin || "http://localhost",
    hostname: globalThis.location?.hostname || "",
    useEmulators: emulatorFlag === "true",
  };
}

function disabled(reason: string): CloudConfiguration {
  return { mode: "disabled", reason, options: null };
}

function parseConfiguration(module: unknown): CloudConfiguration {
  const value =
    module && typeof module === "object" && "firebaseConfig" in module
      ? module.firebaseConfig
      : null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return disabled(
      "Firebase configuration is unavailable: firebase-config.js must export firebaseConfig.",
    );
  }
  const candidate = value as Record<string, unknown>;
  const missing = requiredFields.filter(
    (key) =>
      typeof candidate[key] !== "string" || !String(candidate[key]).trim(),
  );
  if (missing.length) {
    return disabled(
      `Cloud sync is unavailable: Firebase web configuration is missing ${missing.join(", ")}. ` +
        "Continue locally, generate the deployment configuration, or explicitly enable local emulators.",
    );
  }
  const options = Object.fromEntries(
    requiredFields.map((key) => [key, String(candidate[key]).trim()]),
  ) as FirebaseOptions;
  if (/^demo-/i.test(options.projectId!)) {
    return disabled(
      "Demo projects require VITE_USE_EMULATORS=true on localhost. No cloud connection was made.",
    );
  }
  if (
    !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(options.projectId!) ||
    !/^[a-z0-9.-]+$/i.test(options.authDomain!) ||
    loopback(options.authDomain!) ||
    options.authDomain!.endsWith(".localhost") ||
    requiredFields.some((key) => String(options[key]).length > 512)
  ) {
    return disabled(
      "Firebase web configuration is invalid. Check the project ID and authorized auth domain.",
    );
  }
  return { mode: "cloud", reason: null, options };
}

export async function resolveCloudConfiguration(
  environment: ConfigurationEnvironment = runtimeEnvironment(),
  importer: ConfigImporter = importConfiguration,
): Promise<CloudConfiguration> {
  if (environment.useEmulators) {
    if (!loopback(environment.hostname)) {
      return disabled(
        "Emulator mode is restricted to localhost. No Firebase connection was made.",
      );
    }
    // Ignore even a valid production config in emulator mode; never fall back to a real project.
    return {
      mode: "emulator",
      reason: null,
      options: {
        apiKey: "demo-only-api-key",
        authDomain: `${EMULATOR_PROJECT_ID}.firebaseapp.com`,
        projectId: EMULATOR_PROJECT_ID,
        appId: "1:1234567890:web:emulator-only",
      },
    };
  }

  const base = new URL(
    environment.baseUrl.endsWith("/")
      ? environment.baseUrl
      : `${environment.baseUrl}/`,
    environment.origin,
  );
  if (base.origin !== new URL(environment.origin).origin) {
    return disabled(
      "Firebase configuration must be served from this application's origin.",
    );
  }
  if (loopback(environment.hostname)) {
    try {
      const localModule = await importer(
        new URL("firebase-config.local.js", base).href,
      );
      if (
        localModule &&
        typeof localModule === "object" &&
        "firebaseConfig" in localModule &&
        localModule.firebaseConfig &&
        typeof localModule.firebaseConfig === "object" &&
        Object.values(localModule.firebaseConfig).some(
          (value) => typeof value === "string" && value.trim(),
        )
      ) {
        return parseConfiguration(localModule);
      }
    } catch {
      // The optional, ignored local configuration is not part of a deployed build.
    }
  }
  const url = new URL("firebase-config.js", base).href;
  try {
    return parseConfiguration(await importer(url));
  } catch {
    return disabled(
      `Cloud sync is unavailable because ${url} could not be loaded. Progress can still be stored locally.`,
    );
  }
}

interface FirebaseResources {
  auth: Auth;
  db: Firestore;
}

const resources = new Map<string, FirebaseResources>();

function firebaseResources(
  configuration: Exclude<CloudConfiguration, { mode: "disabled" }>,
): FirebaseResources {
  const { mode, options } = configuration;
  const name = `progress-tracker-${mode}-${options.projectId}`;
  const existing = resources.get(name);
  if (existing) return existing;
  const app =
    getApps().find((item) => item.name === name) ||
    initializeApp(options, name);
  if (app.options.projectId !== options.projectId) {
    throw new CloudUnavailableError(
      "The existing Firebase app belongs to a different project.",
    );
  }
  if (mode === "emulator" && app.options.projectId !== EMULATOR_PROJECT_ID) {
    throw new CloudUnavailableError("Unsafe emulator project.");
  }
  const auth = getAuth(app);
  if (mode === "emulator") {
    if (
      auth.emulatorConfig &&
      (auth.emulatorConfig.host !== EMULATOR_HOST ||
        auth.emulatorConfig.port !== AUTH_EMULATOR_PORT)
    ) {
      throw new CloudUnavailableError(
        "The Auth emulator is not connected to the configured loopback endpoint.",
      );
    }
    if (!auth.emulatorConfig) {
      connectAuthEmulator(
        auth,
        `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`,
        { disableWarnings: true },
      );
    }
  } else if (
    auth.emulatorConfig ||
    /^demo-/i.test(app.options.projectId || "")
  ) {
    throw new CloudUnavailableError(
      "Refusing to use emulator credentials with a cloud client.",
    );
  }
  const db = getFirestore(app);
  if (mode === "emulator")
    connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  const resource = { auth, db };
  resources.set(name, resource);
  return resource;
}

function publicUser(user: User): CloudUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
  };
}

const asError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

function disabledClient(reason: string): CloudClient {
  const error = new CloudUnavailableError(reason);
  const unavailable = async (): Promise<never> => {
    throw error;
  };
  return {
    configured: false,
    mode: "disabled",
    unavailableReason: reason,
    error,
    signIn: unavailable,
    register: unavailable,
    googleSignIn: unavailable,
    resetPassword: unavailable,
    resendVerification: unavailable,
    signOut: unavailable,
    getUser: () => null,
    loadRecords: unavailable,
    commitRecords: unavailable,
    deleteRecords: unavailable,
    loadLegacyProfile: unavailable,
    watchRecords() {
      throw error;
    },
    dispose() {},
  };
}

export async function initializeCloud(
  onUser: (user: CloudUser | null) => void,
  onError?: (error: Error) => void,
): Promise<CloudClient> {
  const configuration = await resolveCloudConfiguration();
  if (configuration.mode === "disabled") {
    const client = disabledClient(configuration.reason);
    onUser(null);
    return client;
  }

  const { auth, db } = firebaseResources(configuration);
  let generation = 0;
  let activeUid: string | null = null;
  let disposed = false;
  let transitioning = false;
  let lastError: Error | null = null;
  let unsubscribeAuth = () => {};
  const guard: SyncIdentityGuard = {
    capture(uid) {
      const identity = { uid, generation };
      this.assertCurrent(identity);
      return identity;
    },
    assertCurrent(identity) {
      if (
        disposed ||
        transitioning ||
        lastError ||
        generation !== identity.generation ||
        activeUid !== identity.uid ||
        auth.currentUser?.uid !== identity.uid
      ) {
        throw new SyncIdentityError();
      }
    },
  };
  const repository = createSyncRepository(db, guard);

  const assertActive = () => {
    if (disposed) throw new SyncIdentityError();
    if (lastError) throw lastError;
  };
  const publishUser = (user: User | null) => {
    if (disposed) return;
    if (activeUid !== (user?.uid ?? null)) {
      generation++;
      repository.stopWatching();
    }
    activeUid = user?.uid ?? null;
    if (!transitioning) onUser(user ? publicUser(user) : null);
  };
  const transition = async <T>(action: () => Promise<T>): Promise<T> => {
    assertActive();
    if (transitioning) {
      throw new Error(
        "Another account operation is in progress. Wait for it to finish before changing accounts.",
      );
    }
    transitioning = true;
    generation++;
    repository.stopWatching();
    try {
      const result = await action();
      assertActive();
      return result;
    } finally {
      transitioning = false;
      if (!disposed && !lastError) publishUser(auth.currentUser);
    }
  };
  const assertCredential = (credential: UserCredential) => {
    assertActive();
    if (auth.currentUser?.uid !== credential.user.uid)
      throw new SyncIdentityError();
    publishUser(credential.user);
  };
  const captureCurrentUser = (): { user: User; identity: SessionIdentity } => {
    assertActive();
    const user = auth.currentUser;
    if (!user) throw new SyncIdentityError();
    return { user, identity: guard.capture(user.uid) };
  };

  const client: CloudClient = {
    configured: true,
    mode: configuration.mode,
    unavailableReason: null,
    get error() {
      return lastError;
    },
    loadRecords: repository.loadRecords,
    watchRecords: repository.watchRecords,
    commitRecords: repository.commitRecords,
    deleteRecords: repository.deleteRecords,
    loadLegacyProfile: repository.loadLegacyProfile,
    signIn: (email, password) =>
      transition(async () => {
        const credential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        assertCredential(credential);
        return publicUser(credential.user);
      }),
    register: (email, password) =>
      transition(async () => {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        assertCredential(credential);
        const identityGeneration = generation;
        try {
          await sendEmailVerification(credential.user);
        } catch (error) {
          assertCredential(credential);
          if (identityGeneration !== generation) throw new SyncIdentityError();
          throw new VerificationDeliveryError({ cause: error });
        }
        assertCredential(credential);
        if (identityGeneration !== generation) throw new SyncIdentityError();
        return publicUser(credential.user);
      }),
    googleSignIn: () =>
      transition(async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const credential = await signInWithPopup(auth, provider);
        assertCredential(credential);
        return publicUser(credential.user);
      }),
    async resetPassword(email) {
      assertActive();
      if (transitioning) throw new SyncIdentityError();
      const identityGeneration = generation;
      const uid = auth.currentUser?.uid ?? null;
      try {
        await sendPasswordResetEmail(auth, email.trim());
      } finally {
        assertActive();
        if (
          generation !== identityGeneration ||
          (auth.currentUser?.uid ?? null) !== uid
        ) {
          throw new SyncIdentityError();
        }
      }
    },
    async resendVerification() {
      const { user, identity } = captureCurrentUser();
      try {
        await reload(user);
        guard.assertCurrent(identity);
        if (!user.emailVerified) {
          await sendEmailVerification(user);
          guard.assertCurrent(identity);
        }
        publishUser(user);
      } catch (error) {
        guard.assertCurrent(identity);
        throw error;
      }
    },
    signOut: () => transition(() => firebaseSignOut(auth)),
    getUser() {
      if (
        disposed ||
        transitioning ||
        lastError ||
        !auth.currentUser ||
        activeUid !== auth.currentUser.uid
      ) {
        return null;
      }
      return publicUser(auth.currentUser);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation++;
      unsubscribeAuth();
      repository.dispose();
    },
  };

  let initialSettled = false;
  let resolveInitial: () => void;
  let rejectInitial: (error: Error) => void;
  const initialState = new Promise<void>((resolve, reject) => {
    resolveInitial = resolve;
    rejectInitial = reject;
  });
  const fail = (error: unknown) => {
    if (disposed) return;
    lastError = asError(error);
    generation++;
    activeUid = null;
    repository.stopWatching();
    if (!initialSettled) {
      initialSettled = true;
      clearTimeout(timeout);
      rejectInitial(lastError);
    }
    try {
      onUser(null);
    } finally {
      onError?.(lastError);
    }
  };
  const timeout = setTimeout(
    () =>
      fail(
        new Error(
          "Firebase did not provide an initial auth state. Check your connection and configuration.",
        ),
      ),
    15000,
  );
  try {
    unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (disposed || lastError) return;
        if ((user?.uid ?? null) !== (auth.currentUser?.uid ?? null)) {
          generation++;
          repository.stopWatching();
          return;
        }
        try {
          publishUser(user);
          if (!initialSettled) {
            initialSettled = true;
            clearTimeout(timeout);
            resolveInitial();
          }
        } catch (error) {
          fail(error);
        }
      },
      fail,
    );
    await initialState;
    return client;
  } catch (error) {
    clearTimeout(timeout);
    client.dispose();
    throw error;
  }
}
