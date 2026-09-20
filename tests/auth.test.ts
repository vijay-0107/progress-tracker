import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import type { CloudClient } from "../src/services/firebase";

const sdk = vi.hoisted(() => ({
  auth: {
    currentUser: null as User | null,
    emulatorConfig: null as {
      host: string;
      port: number;
      protocol: string;
    } | null,
  },
  initializeApp: vi.fn(),
  getApps: vi.fn(),
  getAuth: vi.fn(),
  connectAuthEmulator: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
  getFirestore: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  providerParameters: vi.fn(),
  signInWithPopup: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  reload: vi.fn(),
  signOut: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocFromServer: vi.fn(),
  getDocsFromServer: vi.fn(),
  onSnapshot: vi.fn(),
  runTransaction: vi.fn(),
}));
vi.mock("firebase/app", () => ({
  initializeApp: sdk.initializeApp,
  getApps: sdk.getApps,
}));
vi.mock("firebase/auth", () => ({
  getAuth: sdk.getAuth,
  connectAuthEmulator: sdk.connectAuthEmulator,
  onAuthStateChanged: sdk.onAuthStateChanged,
  signInWithEmailAndPassword: sdk.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: sdk.createUserWithEmailAndPassword,
  GoogleAuthProvider: sdk.GoogleAuthProvider,
  signInWithPopup: sdk.signInWithPopup,
  sendEmailVerification: sdk.sendEmailVerification,
  sendPasswordResetEmail: sdk.sendPasswordResetEmail,
  reload: sdk.reload,
  signOut: sdk.signOut,
}));
vi.mock("firebase/firestore", () => ({
  connectFirestoreEmulator: sdk.connectFirestoreEmulator,
  getFirestore: sdk.getFirestore,
  collection: sdk.collection,
  doc: sdk.doc,
  getDocFromServer: sdk.getDocFromServer,
  getDocsFromServer: sdk.getDocsFromServer,
  onSnapshot: sdk.onSnapshot,
  runTransaction: sdk.runTransaction,
}));

const user = (uid = "alice", email = `${uid}@example.org`) =>
  ({ uid, email, displayName: null, emailVerified: false }) as User;
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
};
const realConfig = {
  firebaseConfig: {
    apiKey: "public-web-key",
    authDomain: "real-project.firebaseapp.com",
    projectId: "real-project",
    appId: "public-web-app-id",
  },
};
const production = {
  baseUrl: "/progress-tracker/",
  origin: "https://example.org",
  hostname: "example.org",
  useEmulators: false,
};
const local = {
  ...production,
  origin: "http://localhost:5177",
  hostname: "localhost",
};

let api: typeof import("../src/services/firebase");
let clients: CloudClient[];
let observers: {
  next: (user: User | null) => void;
  error: (error: Error) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
}[];
const emit = (value: User | null) => {
  sdk.auth.currentUser = value;
  for (const observer of observers) observer.next(value);
};
const initialize = async (onUser = vi.fn(), onError = vi.fn()) => {
  const client = await api.initializeCloud(onUser, onError);
  clients.push(client);
  return client;
};

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  clients = [];
  observers = [];
  sdk.auth.currentUser = null;
  sdk.auth.emulatorConfig = null;
  vi.stubEnv("BASE_URL", "/progress-tracker/");
  vi.stubEnv("VITE_USE_EMULATORS", "true");
  vi.stubGlobal("location", { origin: local.origin, hostname: local.hostname });
  sdk.getApps.mockReturnValue([]);
  sdk.initializeApp.mockImplementation((options, name) => ({ options, name }));
  sdk.getAuth.mockReturnValue(sdk.auth);
  sdk.getFirestore.mockReturnValue({});
  sdk.connectAuthEmulator.mockImplementation(() => {
    sdk.auth.emulatorConfig = {
      host: "127.0.0.1",
      port: 9099,
      protocol: "http",
    };
  });
  sdk.onAuthStateChanged.mockImplementation((_auth, next, error) => {
    const unsubscribe = vi.fn();
    observers.push({ next, error, unsubscribe });
    queueMicrotask(() => next(sdk.auth.currentUser));
    return unsubscribe;
  });
  sdk.signInWithEmailAndPassword.mockImplementation(async (_auth, email) => {
    const signedIn = user("alice", email);
    emit(signedIn);
    return { user: signedIn };
  });
  sdk.createUserWithEmailAndPassword.mockImplementation(
    sdk.signInWithEmailAndPassword.getMockImplementation()!,
  );
  sdk.GoogleAuthProvider.mockImplementation(function () {
    return { setCustomParameters: sdk.providerParameters };
  });
  sdk.signInWithPopup.mockImplementation(async () => {
    const signedIn = { ...user("google"), emailVerified: true } as User;
    emit(signedIn);
    return { user: signedIn };
  });
  sdk.sendEmailVerification.mockResolvedValue(undefined);
  sdk.sendPasswordResetEmail.mockResolvedValue(undefined);
  sdk.reload.mockResolvedValue(undefined);
  sdk.signOut.mockImplementation(async () => {
    emit(null);
  });
  api = await import("../src/services/firebase");
});

afterEach(() => {
  for (const client of clients) client.dispose();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("runtime Firebase configuration", () => {
  it("loads the generated public config with the Vite base URL and never imports local overrides in production", async () => {
    const importer = vi.fn().mockResolvedValue(realConfig);
    expect(
      await api.resolveCloudConfiguration(production, importer),
    ).toMatchObject({ mode: "cloud", options: realConfig.firebaseConfig });
    expect(importer).toHaveBeenCalledExactlyOnceWith(
      "https://example.org/progress-tracker/firebase-config.js",
    );
  });

  it("accepts local-only overrides and falls back to the generated config when none exists", async () => {
    const importer = vi
      .fn()
      .mockRejectedValueOnce(new Error("404"))
      .mockResolvedValueOnce(realConfig);
    expect(await api.resolveCloudConfiguration(local, importer)).toMatchObject({
      mode: "cloud",
    });
    expect(importer.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:5177/progress-tracker/firebase-config.local.js",
      "http://localhost:5177/progress-tracker/firebase-config.js",
    ]);
    const override = vi.fn().mockResolvedValue(realConfig);
    expect(await api.resolveCloudConfiguration(local, override)).toMatchObject({
      mode: "cloud",
    });
    expect(override).toHaveBeenCalledTimes(1);
  });

  it("explains missing or unavailable config without inventing authentication", async () => {
    const result = await api.resolveCloudConfiguration(
      production,
      async () => ({
        firebaseConfig: {
          apiKey: "",
          authDomain: "",
          projectId: "",
          appId: "",
        },
      }),
    );
    expect(result).toMatchObject({ mode: "disabled", options: null });
    expect(result.reason).toContain(
      "missing apiKey, authDomain, projectId, appId",
    );
    const unavailable = await api.resolveCloudConfiguration(
      production,
      async () => {
        throw new Error("404");
      },
    );
    expect(unavailable).toMatchObject({ mode: "disabled", options: null });
    expect(unavailable.reason).toContain("could not be loaded");
  });

  it("hard-codes a demo project and loopback endpoints without reading any production configuration in emulator mode", async () => {
    const importer = vi.fn().mockResolvedValue(realConfig);
    const result = await api.resolveCloudConfiguration(
      { ...local, useEmulators: true },
      importer,
    );
    expect(result).toMatchObject({
      mode: "emulator",
      options: {
        projectId: "demo-progress-tracker",
        apiKey: "demo-only-api-key",
      },
    });
    expect(importer).not.toHaveBeenCalled();
    const client = await initialize();
    expect(client.mode).toBe("emulator");
    expect(sdk.connectAuthEmulator).toHaveBeenCalledWith(
      sdk.auth,
      "http://127.0.0.1:9099",
      { disableWarnings: true },
    );
    expect(sdk.connectFirestoreEmulator).toHaveBeenCalledWith(
      {},
      "127.0.0.1",
      8080,
    );
    expect(sdk.connectAuthEmulator.mock.invocationCallOrder[0]).toBeLessThan(
      sdk.onAuthStateChanged.mock.invocationCallOrder[0],
    );
    expect(
      sdk.connectFirestoreEmulator.mock.invocationCallOrder[0],
    ).toBeLessThan(sdk.onAuthStateChanged.mock.invocationCallOrder[0]);
    expect(sdk.initializeApp.mock.calls[0][0].projectId).toBe(
      "demo-progress-tracker",
    );
  });

  it("refuses demo projects without explicit emulator mode, remote emulator mode, and cross-origin config", async () => {
    const demo = {
      firebaseConfig: {
        ...realConfig.firebaseConfig,
        projectId: "demo-progress-tracker",
      },
    };
    expect(
      await api.resolveCloudConfiguration(production, async () => demo),
    ).toMatchObject({ mode: "disabled" });
    expect(
      await api.resolveCloudConfiguration(
        { ...production, useEmulators: true },
        vi.fn(),
      ),
    ).toMatchObject({ mode: "disabled" });
    const importer = vi.fn();
    expect(
      await api.resolveCloudConfiguration(
        { ...production, baseUrl: "https://other.example/" },
        importer,
      ),
    ).toMatchObject({ mode: "disabled" });
    expect(importer).not.toHaveBeenCalled();
  });

  it("rejects ambiguous emulator flags and existing apps configured for a real project before Auth starts", async () => {
    vi.stubEnv("VITE_USE_EMULATORS", "TRUE");
    await expect(api.initializeCloud(vi.fn())).rejects.toThrow(
      "exactly true or false",
    );
    expect(sdk.getAuth).not.toHaveBeenCalled();
    vi.stubEnv("VITE_USE_EMULATORS", "true");
    sdk.getApps.mockReturnValue([
      {
        name: "progress-tracker-emulator-demo-progress-tracker",
        options: { projectId: "real-project" },
      },
    ]);
    await expect(api.initializeCloud(vi.fn())).rejects.toThrow(
      "different project",
    );
    expect(sdk.getAuth).not.toHaveBeenCalled();
    expect(sdk.getFirestore).not.toHaveBeenCalled();
  });
});

describe("explicit authentication lifecycle", () => {
  it("delivers the initial signed-out state before initializeCloud resolves", async () => {
    const onUser = vi.fn();
    const client = await initialize(onUser);
    expect(onUser).toHaveBeenCalledExactlyOnceWith(null);
    expect(client.configured).toBe(true);
    expect(client.getUser()).toBeNull();
    expect(client.error).toBeNull();
  });

  it("returns a disabled client with a reason and rejects cloud actions when initialization is unsafe", async () => {
    vi.stubGlobal("location", {
      origin: production.origin,
      hostname: production.hostname,
    });
    const onUser = vi.fn();
    const client = await initialize(onUser);
    expect(client).toMatchObject({ configured: false, mode: "disabled" });
    expect(client.unavailableReason).toContain("restricted to localhost");
    expect(onUser).toHaveBeenCalledExactlyOnceWith(null);
    await expect(
      client.signIn("alice@example.org", "password"),
    ).rejects.toBeInstanceOf(api.CloudUnavailableError);
    await expect(client.loadRecords("alice")).rejects.toBeInstanceOf(
      api.CloudUnavailableError,
    );
    expect(sdk.initializeApp).not.toHaveBeenCalled();
    expect(sdk.signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("does not silently create accounts after a failed sign-in", async () => {
    const client = await initialize();
    const invalid = Object.assign(new Error("Invalid credentials"), {
      code: "auth/invalid-credential",
    });
    sdk.signInWithEmailAndPassword.mockRejectedValue(invalid);
    await expect(client.signIn(" alice@example.org ", "wrong")).rejects.toBe(
      invalid,
    );
    expect(sdk.signInWithEmailAndPassword).toHaveBeenCalledWith(
      sdk.auth,
      "alice@example.org",
      "wrong",
    );
    expect(sdk.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(sdk.sendEmailVerification).not.toHaveBeenCalled();
  });

  it("explicitly creates an account and sends verification without exposing tokens or raw Firebase users", async () => {
    const onUser = vi.fn();
    const client = await initialize(onUser);
    const registered = await client.register(
      " alice@example.org ",
      "long-password",
    );
    expect(sdk.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      sdk.auth,
      "alice@example.org",
      "long-password",
    );
    expect(sdk.sendEmailVerification).toHaveBeenCalledWith(
      sdk.auth.currentUser,
    );
    expect(registered).toEqual({
      uid: "alice",
      email: "alice@example.org",
      displayName: null,
      emailVerified: false,
    });
    expect(Object.keys(registered)).toEqual([
      "uid",
      "email",
      "displayName",
      "emailVerified",
    ]);
    expect(client.getUser()).toEqual(registered);
    expect(onUser).toHaveBeenLastCalledWith(registered);
  });

  it("explains verification delivery failures while preserving the newly created account", async () => {
    const client = await initialize();
    sdk.sendEmailVerification.mockRejectedValue(
      new Error("network unavailable"),
    );
    await expect(
      client.register("alice@example.org", "long-password"),
    ).rejects.toBeInstanceOf(api.VerificationDeliveryError);
    expect(client.getUser()?.uid).toBe("alice");
  });

  it("supports Google sign-in, independent password reset, verification refresh, and sign-out", async () => {
    const onUser = vi.fn();
    const client = await initialize(onUser);
    await client.resetPassword(" alice@example.org ");
    expect(sdk.sendPasswordResetEmail).toHaveBeenCalledWith(
      sdk.auth,
      "alice@example.org",
    );
    expect(sdk.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(await client.googleSignIn()).toMatchObject({
      uid: "google",
      emailVerified: true,
    });
    expect(sdk.providerParameters).toHaveBeenCalledWith({
      prompt: "select_account",
    });
    await client.signIn("alice@example.org", "password");
    await client.resendVerification();
    expect(sdk.reload).toHaveBeenCalledWith(sdk.auth.currentUser);
    expect(sdk.sendEmailVerification).toHaveBeenCalledTimes(1);
    sdk.reload.mockImplementation(async (current) => {
      current.emailVerified = true;
    });
    await client.resendVerification();
    expect(sdk.sendEmailVerification).toHaveBeenCalledTimes(1);
    expect(client.getUser()?.emailVerified).toBe(true);
    await client.signOut();
    expect(client.getUser()).toBeNull();
    expect(onUser).toHaveBeenLastCalledWith(null);
  });

  it("blocks repository access for other users and immediately after account changes", async () => {
    const client = await initialize();
    await client.signIn("alice@example.org", "password");
    await expect(client.loadRecords("bob")).rejects.toBeInstanceOf(
      api.SyncIdentityError,
    );
    emit(user("bob"));
    await expect(client.loadRecords("alice")).rejects.toBeInstanceOf(
      api.SyncIdentityError,
    );
    await client.signOut();
    await expect(client.commitRecords("bob", [])).rejects.toBeInstanceOf(
      api.SyncIdentityError,
    );
    expect(sdk.getDocsFromServer).not.toHaveBeenCalled();
    expect(sdk.runTransaction).not.toHaveBeenCalled();
  });

  it("does not publish a queued auth callback for an account that is no longer current", async () => {
    const onUser = vi.fn();
    const client = await initialize(onUser);
    await client.signIn("alice@example.org", "password");
    const previous = sdk.auth.currentUser;
    emit(user("bob"));
    const count = onUser.mock.calls.length;
    observers[0].next(previous);
    expect(onUser).toHaveBeenCalledTimes(count);
    expect(client.getUser()?.uid).toBe("bob");
  });

  it("suppresses a late verification result when another account has become current", async () => {
    const client = await initialize();
    const pending = deferred<void>();
    sdk.sendEmailVerification.mockReturnValue(pending.promise);
    const result = client.register("alice@example.org", "long-password");
    await vi.waitFor(() =>
      expect(sdk.sendEmailVerification).toHaveBeenCalled(),
    );
    emit(user("bob"));
    pending.resolve();
    await expect(result).rejects.toBeInstanceOf(api.SyncIdentityError);
    expect(client.getUser()?.uid).toBe("bob");
  });

  it("rejects overlapping account transitions instead of racing one account's login against another", async () => {
    const client = await initialize();
    const pending = deferred<{ user: User }>();
    sdk.signInWithEmailAndPassword.mockReturnValue(pending.promise);
    const result = client.signIn("alice@example.org", "password");
    await expect(client.googleSignIn()).rejects.toThrow(
      "Another account operation",
    );
    await expect(client.signOut()).rejects.toThrow("Another account operation");
    const signedIn = user();
    emit(signedIn);
    pending.resolve({ user: signedIn });
    await expect(result).resolves.toMatchObject({ uid: "alice" });
    expect(sdk.signInWithPopup).not.toHaveBeenCalled();
  });

  it("reports initial and subsequent auth-state errors explicitly", async () => {
    const onUser = vi.fn();
    const onError = vi.fn();
    const client = await initialize(onUser, onError);
    const failure = new Error("Auth state unavailable");
    observers[0].error(failure);
    expect(client.error).toBe(failure);
    expect(onError).toHaveBeenCalledWith(failure);
    expect(onUser).toHaveBeenLastCalledWith(null);
    await expect(client.signIn("alice@example.org", "password")).rejects.toBe(
      failure,
    );

    sdk.onAuthStateChanged.mockImplementation((_auth, _next, error) => {
      queueMicrotask(() => error(failure));
      return vi.fn();
    });
    await expect(api.initializeCloud(vi.fn(), vi.fn())).rejects.toBe(failure);
  });

  it("bounds the initial auth wait and detaches its listener when initialization times out", async () => {
    vi.useFakeTimers();
    const unsubscribe = vi.fn();
    sdk.onAuthStateChanged
      .mockReturnValue(unsubscribe)
      .mockImplementation(() => unsubscribe);
    const result = api.initializeCloud(vi.fn(), vi.fn());
    const assertion = expect(result).rejects.toThrow("initial auth state");
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("stops callbacks after disposal without signing out another component's SDK session", async () => {
    const onUser = vi.fn();
    const client = await initialize(onUser);
    client.dispose();
    client.dispose();
    emit(user());
    expect(onUser).toHaveBeenCalledTimes(1);
    expect(observers[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(sdk.signOut).not.toHaveBeenCalled();
    expect(client.getUser()).toBeNull();
    await expect(
      client.signIn("alice@example.org", "password"),
    ).rejects.toBeInstanceOf(api.SyncIdentityError);
  });
});
