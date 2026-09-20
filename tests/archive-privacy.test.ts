import { expect, it } from "vitest";
import {
  archiveLegacy,
  createProgress,
  exportProgress,
  parseImport,
} from "../src/domain/progress";

it("archives only learning fields and never auth internals, unrelated storage or opaque timestamps", () => {
  const state = archiveLegacy(createProgress("uid:alice"), {
    id: "cloud-v1:alice",
    name: "Original history",
    source: "cloud-v1",
    ownerUid: "alice",
    payload: {
      profile: {
        id: "cloud-alice",
        cloudUid: "alice",
        name: "Alice",
        pinHash: "secret-pin",
        password: "private",
        stsTokenManager: { refreshToken: "private-refresh" },
      },
      completions: {
        "old-day": {
          completedAt: "2020-01-01T00:00:00.000Z",
          oauth: "not learning",
        },
      },
      notes: { "old-day": "A useful learning note" },
      review: {
        "old-day": {
          confidence: 4,
          dueAt: "2020-02-01",
          interval: 7,
          tokenManager: { token: "private" },
        },
      },
      updatedAt: new Date(),
      access_token: "private-access",
      unrelatedLocalStorage: { oauth: "private" },
    },
  });
  const text = exportProgress(state);
  expect(text).not.toMatch(
    /secret-pin|private-refresh|private-access|stsTokenManager|tokenManager|unrelatedLocalStorage|access_token|not learning/,
  );
  expect(state.legacy["cloud-v1:alice"].payload.notes).toEqual({
    "old-day": "A useful learning note",
  });
  expect(state.legacy["cloud-v1:alice"].payload.review).toEqual({
    "old-day": { confidence: 4, dueAt: "2020-02-01", interval: 7 },
  });
  expect(parseImport(text, "uid:alice").ownerId).toBe("uid:alice");
  expect(() => parseImport(text, "uid:bob")).toThrow();
});
