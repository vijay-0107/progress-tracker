import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ActivityEvent,
  Lesson,
  ProgressState,
  Question,
} from "../src/domain/types";
import {
  addDays,
  archiveLegacy,
  assessLesson,
  completeLesson,
  createProgress,
  dayKey,
  emptyLesson,
  exportProgress,
  getActivityDays,
  getStreak,
  gradeQuestion,
  importLegacyExport,
  mergeImport,
  parseImport,
  recordActivity,
  reviewLesson,
  sanitizeLegacyPayload,
  updateLesson,
  validateProgressState,
} from "../src/domain/progress";
import { MAX_JSON_LENGTH } from "../src/domain/validation";

const START = "2026-03-01T10:00:00.000Z";
const NOW = "2026-06-30T12:00:00.000Z";
const EVIDENCE =
  "Implemented matrix multiplication and verified zero, identity, and rectangular inputs.";

const questions: Question[] = [
  {
    id: "single",
    kind: "single-choice",
    prompt: "Choose B.",
    choices: ["A", "B"],
    answer: "B",
    explanation: "B satisfies the stated invariant.",
  },
  {
    id: "multiple",
    kind: "multiple-choice",
    prompt: "Select the primary colors.",
    choices: ["red", "blue", "green"],
    answer: ["red", "blue"],
    explanation: "Red and blue are the requested colors.",
  },
  {
    id: "numeric",
    kind: "numeric",
    prompt: "Compute 0.1 + 0.2.",
    answer: 0.3,
    explanation: "The exact decimal sum is 0.3.",
  },
  {
    id: "manual",
    kind: "short-answer",
    prompt: "Explain the invariant.",
    answer: "Compare manually.",
    explanation: "Explain why the condition is preserved.",
  },
];
const lesson: Lesson = {
  id: "matrices",
  title: "Matrix multiplication",
  objectives: ["Implement multiplication"],
  topics: [],
  estimatedMinutes: 45,
  canonicalConceptTags: ["matrices"],
  video: { resourceId: "video", locator: "Introduction" },
  reading: { resourceId: "reading", locator: "Chapter 1" },
  supplementaryResourceIds: [],
  assignment: {
    id: "matrix-assignment",
    title: "Build matrix multiplication",
    kind: "coding",
    instructions: ["Implement the algorithm."],
    deliverables: ["Code and tests"],
    acceptanceCriteria: [
      "Handles rectangular inputs",
      "Includes edge-case tests",
    ],
    externalUrl: null,
    questions,
  },
  reviewPrompts: ["Explain the loop invariant."],
};
const correctAnswers = {
  single: "B",
  multiple: '["red","blue"]',
  numeric: "0.3",
  manual: "My manual explanation.",
};

function fresh(): ProgressState {
  return createProgress("guest", START);
}

function ready(state = fresh(), at = START): ProgressState {
  return updateLesson(
    state,
    lesson.id,
    {
      evidence: EVIDENCE,
      rubricChecked: [...lesson.assignment.acceptanceCriteria],
    },
    at,
  );
}

function event(
  id: string,
  at: string,
  patch: Partial<ActivityEvent> = {},
): ActivityEvent {
  return {
    id,
    at,
    updatedAt: at,
    timezone: "Asia/Kolkata",
    kind: "study",
    entityId: lesson.id,
    minutes: 25,
    detail: "",
    ...patch,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});
afterEach(() => vi.useRealTimers());

describe("empty state and manual completion", () => {
  it("creates an unseeded, separate state with the default Indian timezone", () => {
    const first = createProgress("uid:owner", START);
    expect(first.ownerId).toBe("uid:owner");
    expect(first.settings.timezone).toBe("Asia/Kolkata");
    for (const collection of [
      "lessons",
      "projects",
      "goals",
      "activity",
      "errors",
      "legacy",
    ] as const) {
      expect(first[collection]).toEqual({});
    }
    expect(getStreak(first)).toBe(0);
    expect(createProgress("guest", START).lessons).not.toBe(first.lessons);
    expect(emptyLesson("intro", START)).toMatchObject({
      manualCompletedAt: null,
      review: null,
      assessment: null,
      evidence: "",
      note: "",
      bookmarked: false,
      readingPosition: "",
      rubricChecked: [],
    });
  });

  it("edits notes, bookmarks, reading position and evidence immutably without activity", () => {
    const state = fresh();
    const snapshot = JSON.stringify(state);
    const next = updateLesson(
      state,
      lesson.id,
      { note: "Read a chapter", bookmarked: true, readingPosition: "page 15" },
      START,
    );
    expect(JSON.stringify(state)).toBe(snapshot);
    expect(next.lessons[lesson.id].manualCompletedAt).toBeNull();
    expect(next.activity).toEqual({});
    expect(updateLesson(next, lesson.id, { bookmarked: true })).toBe(next);
    expect(updateLesson(state, lesson.id, {})).toBe(state);
  });

  it("does not let generic patches set completion, assessment, review or another ID", () => {
    for (const patch of [
      { manualCompletedAt: START },
      { id: "other" },
      { assessment: null },
      { review: null },
      { updatedAt: START },
    ]) {
      expect(() => updateLesson(fresh(), lesson.id, patch as never)).toThrow();
    }
    expect(() => updateLesson(fresh(), "__proto__", { note: "x" })).toThrow();
    expect(() =>
      updateLesson(fresh(), lesson.id, { note: "x".repeat(100_001) }),
    ).toThrow();
    expect(() =>
      updateLesson(fresh(), lesson.id, { bookmarked: "yes" } as never),
    ).toThrow();
  });

  it("requires meaningful evidence and every literal rubric criterion", () => {
    expect(() => completeLesson(fresh(), lesson, START)).toThrow(/evidence/i);
    for (const evidence of [
      " ",
      "done",
      "done done done done done done",
      "!!!!!!!!!!!!!!!!!!!!!!!!",
    ]) {
      expect(() =>
        completeLesson(
          updateLesson(
            fresh(),
            lesson.id,
            {
              evidence,
              rubricChecked: lesson.assignment.acceptanceCriteria,
            },
            START,
          ),
          lesson,
          START,
        ),
      ).toThrow(/evidence/i);
    }
    const partial = updateLesson(
      fresh(),
      lesson.id,
      {
        evidence: EVIDENCE,
        rubricChecked: [lesson.assignment.acceptanceCriteria[0]],
      },
      START,
    );
    expect(() => completeLesson(partial, lesson, START)).toThrow(
      /every.*criterion/i,
    );
    expect(() =>
      updateLesson(fresh(), lesson.id, { rubricChecked: ["same", "same"] }),
    ).toThrow();
  });

  it("completes manually and creates exactly one initial review and assignment event", () => {
    const state = ready();
    const snapshot = JSON.stringify(state);
    const completed = completeLesson(state, lesson, START);
    expect(JSON.stringify(state)).toBe(snapshot);
    expect(completed.lessons[lesson.id].manualCompletedAt).toBe(START);
    expect(completed.lessons[lesson.id].review).toEqual({
      dueAt: "2026-03-02T10:00:00.000Z",
      intervalDays: 1,
      streak: 0,
      lastReviewedAt: null,
    });
    expect(Object.keys(completed.activity)).toEqual(["assignment:matrices"]);
    expect(completeLesson(completed, lesson, "2026-03-02T10:00:00.000Z")).toBe(
      completed,
    );
  });

  it("never makes another activity day from uncomplete/recomplete", () => {
    const completed = completeLesson(ready(), lesson, START);
    const undone = updateLesson(
      completed,
      lesson.id,
      { manualCompletedAt: null },
      "2026-03-03T10:00:00.000Z",
    );
    expect(undone.lessons[lesson.id].review).toBeNull();
    const repeated = completeLesson(undone, lesson, "2026-03-04T10:00:00.000Z");
    expect(repeated.activity).toEqual(completed.activity);
    expect(getActivityDays(repeated)).toEqual({ "2026-03-01": 1 });
    expect(getStreak(repeated, "2026-03-04T10:00:00.000Z")).toBe(0);
    expect(repeated.lessons[lesson.id].manualCompletedAt).toBe(
      "2026-03-04T10:00:00.000Z",
    );
  });

  it("rejects backward lesson edits and removing evidence from a completed lesson", () => {
    const completed = completeLesson(ready(), lesson, START);
    expect(() =>
      updateLesson(
        completed,
        lesson.id,
        { note: "older" },
        "2026-02-28T10:00:00.000Z",
      ),
    ).toThrow(/precede/i);
    expect(() => updateLesson(completed, lesson.id, { evidence: "" })).toThrow(
      /evidence/i,
    );
  });
});

describe("substantive activity", () => {
  it("records an identical ID idempotently without mutating the state", () => {
    const state = fresh();
    const activity = event("study-1", START);
    const next = recordActivity(state, activity);
    expect(state.activity).toEqual({});
    expect(recordActivity(next, { ...activity })).toBe(next);
    expect(() => recordActivity(next, { ...activity, minutes: 30 })).toThrow(
      /different data/i,
    );
    activity.minutes = 200;
    expect(next.activity["study-1"].minutes).toBe(25);
  });

  it.each([0, 4, 4.99, 240.1, 241, -1, NaN, Infinity])(
    "rejects invalid study duration %s",
    (minutes) => {
      expect(() =>
        recordActivity(fresh(), event("study", START, { minutes })),
      ).toThrow();
    },
  );

  it.each([5, 240])("accepts the study duration boundary %s", (minutes) => {
    expect(
      Object.keys(
        recordActivity(fresh(), event("study", START, { minutes })).activity,
      ),
    ).toHaveLength(1);
  });

  it.each(["visit", "bookmark", "note"])(
    "cannot count %s actions as learning activity",
    (kind) => {
      expect(() =>
        recordActivity(fresh(), event("not-study", START, { kind } as never)),
      ).toThrow();
    },
  );

  it.each(["assignment", "assessment", "review", "project"] as const)(
    "requires substantive evidence for %s",
    (kind) => {
      expect(() =>
        recordActivity(
          fresh(),
          event("activity", START, { kind, minutes: 0, detail: "done" }),
        ),
      ).toThrow(/evidence/i);
      expect(
        recordActivity(
          fresh(),
          event("activity", START, { kind, minutes: 0, detail: EVIDENCE }),
        ).activity.activity.kind,
      ).toBe(kind);
    },
  );

  it("rejects future events, future updates, invalid timestamps and unknown timezones", () => {
    expect(() =>
      recordActivity(fresh(), event("future", "2026-07-01T00:00:00.000Z")),
    ).toThrow(/future/i);
    expect(() =>
      recordActivity(
        fresh(),
        event("future", START, { updatedAt: "2026-07-01T00:00:00.000Z" }),
      ),
    ).toThrow(/future/i);
    expect(() =>
      recordActivity(fresh(), event("bad", "2026-02-30T00:00:00.000Z")),
    ).toThrow();
    expect(() =>
      recordActivity(
        fresh(),
        event("bad", START, { updatedAt: "2026-02-01T00:00:00.000Z" }),
      ),
    ).toThrow();
    expect(() =>
      recordActivity(
        fresh(),
        event("bad", START, { timezone: "Nowhere/City" }),
      ),
    ).toThrow();
  });
});

describe("calendar dates and streaks", () => {
  it("handles Indian midnight, offsets, leap years, and year boundaries", () => {
    expect(dayKey("2026-03-01T18:29:59.999Z", "Asia/Kolkata")).toBe(
      "2026-03-01",
    );
    expect(dayKey("2026-03-01T18:30:00.000Z", "Asia/Kolkata")).toBe(
      "2026-03-02",
    );
    expect(dayKey("2026-03-02T00:00:00+05:30", "Asia/Kolkata")).toBe(
      "2026-03-02",
    );
    expect(dayKey(new Date("2026-03-01T12:00:00Z"), "Pacific/Kiritimati")).toBe(
      "2026-03-02",
    );
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(() => addDays("2026-02-29", 1)).toThrow();
    expect(() => addDays("2026-03-01", 0.5)).toThrow();
    expect(() => dayKey("2026-03-01", "UTC")).toThrow();
    expect(() => dayKey(new Date(NaN), "UTC")).toThrow();
  });

  it("uses each event's saved timezone, not a changed preference", () => {
    const state = recordActivity(
      fresh(),
      event("late", "2026-03-01T19:00:00.000Z"),
    );
    const moved = {
      ...state,
      settings: { ...state.settings, timezone: "America/Los_Angeles" },
    };
    expect(getActivityDays(state)).toEqual({ "2026-03-02": 1 });
    expect(getActivityDays(moved)).toEqual(getActivityDays(state));
  });

  it("counts consecutive calendar dates across a 23-hour DST day", () => {
    let state = {
      ...fresh(),
      settings: { ...fresh().settings, timezone: "America/New_York" },
    };
    for (const [id, at] of [
      ["before", "2026-03-07T17:00:00.000Z"],
      ["during", "2026-03-08T16:00:00.000Z"],
      ["after", "2026-03-09T16:00:00.000Z"],
    ])
      state = recordActivity(
        state,
        event(id, at, { timezone: "America/New_York" }),
      );
    expect(getStreak(state, "2026-03-09T20:00:00.000Z")).toBe(3);
  });

  it("does not treat the repeated DST hour as two calendar days", () => {
    vi.setSystemTime(new Date("2026-11-02T12:00:00.000Z"));
    let state = recordActivity(
      fresh(),
      event("first", "2026-11-01T05:30:00.000Z", {
        timezone: "America/New_York",
      }),
    );
    state = recordActivity(
      state,
      event("second", "2026-11-01T06:30:00.000Z", {
        timezone: "America/New_York",
      }),
    );
    state = {
      ...state,
      settings: { ...state.settings, timezone: "America/New_York" },
    };
    expect(getActivityDays(state)).toEqual({ "2026-11-01": 2 });
    expect(getStreak(state)).toBe(1);
  });

  it("allows yesterday's streak until today's local midnight, then expires it", () => {
    let state = recordActivity(fresh(), event("one", START));
    state = recordActivity(state, event("two", "2026-03-02T10:00:00.000Z"));
    expect(getStreak(state, "2026-03-03T18:29:59.999Z")).toBe(2);
    expect(getStreak(state, "2026-03-03T18:30:00.000Z")).toBe(0);
  });

  it("breaks at any fully missed day rather than skipping holes", () => {
    let state = recordActivity(fresh(), event("one", START));
    state = recordActivity(state, event("three", "2026-03-03T10:00:00.000Z"));
    state = recordActivity(
      state,
      event("three-again", "2026-03-03T11:00:00.000Z"),
    );
    expect(getStreak(state, "2026-03-04T10:00:00.000Z")).toBe(1);
    expect(getActivityDays(state)["2026-03-03"]).toBe(2);
    expect(getStreak(state, "2026-03-02T10:00:00.000Z")).toBe(1);
    expect(getStreak(fresh())).toBe(0);
  });

  it("does not count malformed or future activities in a directly supplied state", () => {
    const state = fresh();
    state.activity.bad = event("bad", START, { minutes: 1 });
    state.activity.future = event("future", "2026-07-01T00:00:00.000Z");
    expect(getActivityDays(state)).toEqual({});
  });
});

describe("assessment and error notebook", () => {
  it("grades choices and numeric answers without claiming to grade short answers", () => {
    expect(gradeQuestion(questions[0], " B ")).toBe(true);
    expect(gradeQuestion(questions[0], "b")).toBe(false);
    expect(gradeQuestion(questions[1], '["blue","red"]')).toBe(true);
    expect(gradeQuestion(questions[1], "blue, red")).toBe(true);
    expect(gradeQuestion(questions[1], '["red","red"]')).toBe(false);
    expect(gradeQuestion(questions[1], "[]")).toBe(false);
    expect(gradeQuestion(questions[1], "[invalid")).toBe(false);
    expect(gradeQuestion(questions[2], "3e-1")).toBe(true);
    expect(gradeQuestion(questions[2], "0.30000000000000004")).toBe(true);
    for (const answer of ["", " ", "NaN", "Infinity", "0x0", "0.31"]) {
      expect(gradeQuestion(questions[2], answer)).toBe(false);
    }
    expect(gradeQuestion(questions[3], "Compare manually.")).toBeNull();
    expect(gradeQuestion(questions[3], "")).toBeNull();
  });

  it("stores only checkable answers and does not auto-complete even with a perfect score", () => {
    const before = ready();
    const next = assessLesson(before, lesson, correctAnswers, START);
    expect(before.lessons[lesson.id].assessment).toBeNull();
    expect(next.lessons[lesson.id].assessment).toMatchObject({
      correct: 3,
      total: 3,
      answers: { single: "B", multiple: '["red","blue"]', numeric: "0.3" },
    });
    expect(next.lessons[lesson.id].assessment?.answers).not.toHaveProperty(
      "manual",
    );
    expect(next.lessons[lesson.id].manualCompletedAt).toBeNull();
    expect(next.lessons[lesson.id].review).toBeNull();
    expect(next.errors).toEqual({});
    expect(Object.values(next.activity).map((entry) => entry.kind)).toEqual([
      "assessment",
    ]);
  });

  it("creates explained errors, preserves reflections, resolves corrections, and reopens mistakes", () => {
    const first = assessLesson(
      fresh(),
      lesson,
      { ...correctAnswers, single: "A" },
      START,
    );
    const id = "error:matrices:single";
    expect(first.errors[id]).toMatchObject({
      questionId: "single",
      prompt: questions[0].prompt,
      explanation: questions[0].explanation,
      answer: "A",
      reflection: "",
      resolvedAt: null,
    });
    const reflected = {
      ...first,
      errors: {
        ...first.errors,
        [id]: { ...first.errors[id], reflection: "I forgot the invariant." },
      },
    };
    const correctedAt = "2026-03-02T10:00:00.000Z";
    const corrected = assessLesson(
      reflected,
      lesson,
      correctAnswers,
      correctedAt,
    );
    expect(corrected.errors[id]).toMatchObject({
      reflection: "I forgot the invariant.",
      answer: "A",
      resolvedAt: correctedAt,
    });
    expect(reflected.errors[id].resolvedAt).toBeNull();
    const repeated = assessLesson(
      corrected,
      lesson,
      { ...correctAnswers, single: "C" },
      "2026-03-03T10:00:00.000Z",
    );
    expect(repeated.errors[id]).toMatchObject({
      answer: "C",
      reflection: "I forgot the invariant.",
      resolvedAt: null,
    });
    expect(Object.keys(repeated.errors)).toHaveLength(1);
  });

  it("counts unanswered checkable questions as incorrect, but requires an actual attempted answer", () => {
    const state = assessLesson(fresh(), lesson, { single: "B" }, START);
    expect(state.lessons[lesson.id].assessment).toMatchObject({
      correct: 1,
      total: 3,
    });
    expect(Object.keys(state.errors)).toHaveLength(2);
    expect(() => assessLesson(fresh(), lesson, {}, START)).toThrow(
      /checkable/i,
    );
    expect(() =>
      assessLesson(
        fresh(),
        lesson,
        { manual: "Manual explanation only." },
        START,
      ),
    ).toThrow(/manual comparison/i);
    expect(() =>
      assessLesson(
        fresh(),
        {
          ...lesson,
          assignment: { ...lesson.assignment, questions: [questions[3]] },
        },
        { manual: "answer" },
        START,
      ),
    ).toThrow();
    expect(() =>
      assessLesson(fresh(), lesson, { unknown: "B" }, START),
    ).toThrow(/unknown/i);
  });

  it("deduplicates exact assessment submissions and refuses conflicting retries", () => {
    const state = assessLesson(fresh(), lesson, correctAnswers, START);
    expect(assessLesson(state, lesson, { ...correctAnswers }, START)).toBe(
      state,
    );
    expect(() =>
      assessLesson(state, lesson, { ...correctAnswers, single: "A" }, START),
    ).toThrow(/different.*answers/i);
    expect(Object.keys(state.activity)).toHaveLength(1);
  });
});

describe("spaced reviews", () => {
  it("requires a completed lesson", () => {
    expect(() => reviewLesson(fresh(), lesson.id, "good", START)).toThrow(
      /complete/i,
    );
    expect(() => reviewLesson(ready(), lesson.id, "good", START)).toThrow(
      /complete/i,
    );
  });

  it("schedules good, hard and again reviews and records recall activity", () => {
    const first = completeLesson(ready(), lesson, START);
    const good = reviewLesson(
      first,
      lesson.id,
      "good",
      "2026-03-02T10:00:00.000Z",
    );
    expect(good.lessons[lesson.id].review).toMatchObject({
      intervalDays: 3,
      streak: 1,
      dueAt: "2026-03-05T10:00:00.000Z",
    });
    const hard = reviewLesson(
      good,
      lesson.id,
      "hard",
      "2026-03-05T10:00:00.000Z",
    );
    expect(hard.lessons[lesson.id].review).toMatchObject({
      intervalDays: 5,
      streak: 2,
      dueAt: "2026-03-10T10:00:00.000Z",
    });
    const again = reviewLesson(
      hard,
      lesson.id,
      "again",
      "2026-03-10T10:00:00.000Z",
    );
    expect(again.lessons[lesson.id].review).toMatchObject({
      intervalDays: 1,
      streak: 0,
      dueAt: "2026-03-11T10:00:00.000Z",
    });
    expect(
      Object.values(again.activity).filter((entry) => entry.kind === "review"),
    ).toHaveLength(3);
    expect(first.lessons[lesson.id].review?.lastReviewedAt).toBeNull();
  });

  it("deduplicates identical review retries without advancing the schedule again", () => {
    const completed = completeLesson(ready(), lesson, START);
    const at = "2026-03-02T10:00:00.000Z";
    const reviewed = reviewLesson(completed, lesson.id, "good", at);
    expect(reviewLesson(reviewed, lesson.id, "good", at)).toBe(reviewed);
    expect(() => reviewLesson(reviewed, lesson.id, "hard", at)).toThrow(
      /different data/i,
    );
    expect(Object.keys(reviewed.activity)).toHaveLength(2);
    expect(() => reviewLesson(reviewed, lesson.id, "again", START)).toThrow(
      /precede/i,
    );
  });

  it("uses calendar days when a review crosses DST, including a nonexistent wall time", () => {
    const base = {
      ...fresh(),
      settings: { ...fresh().settings, timezone: "America/New_York" },
    };
    const springAt = "2026-03-07T17:00:00.000Z";
    const spring = completeLesson(ready(base, springAt), lesson, springAt);
    expect(spring.lessons[lesson.id].review?.dueAt).toBe(
      "2026-03-08T16:00:00.000Z",
    );
    const gapAt = "2026-03-07T07:30:00.000Z";
    const gap = completeLesson(ready(base, gapAt), lesson, gapAt);
    expect(gap.lessons[lesson.id].review?.dueAt).toBe(
      "2026-03-08T07:30:00.000Z",
    );
    const autumnAt = "2026-10-31T16:00:00.000Z";
    const autumn = completeLesson(ready(base, autumnAt), lesson, autumnAt);
    expect(autumn.lessons[lesson.id].review?.dueAt).toBe(
      "2026-11-01T17:00:00.000Z",
    );
  });
});

describe("versioned exports, validation and explicit imports", () => {
  it("round-trips a complete schema-v2 state without aliases or remapping owners", () => {
    const state = completeLesson(
      ready(createProgress("uid:alice", START)),
      lesson,
      START,
    );
    const text = exportProgress(state);
    expect(JSON.parse(text).schemaVersion).toBe(2);
    const imported = parseImport(text, "uid:alice");
    expect(imported).toEqual(state);
    expect(imported.lessons).not.toBe(state.lessons);
    expect(() => parseImport(text, "uid:bob")).toThrow(/owner/i);
    expect(() => parseImport(text, "guest")).toThrow(/owner/i);
  });

  it.each(["__proto__", "constructor", "prototype"])(
    "rejects unsafe %s keys at any depth",
    (key) => {
      const state = JSON.parse(exportProgress(fresh())) as Record<
        string,
        unknown
      >;
      Object.defineProperty(state, key, { value: {}, enumerable: true });
      expect(() => parseImport(JSON.stringify(state), "guest")).toThrow(
        /unsafe/i,
      );
      const nested = fresh();
      nested.legacy.old = {
        id: "old",
        name: "Old",
        source: "local-v1",
        importedAt: START,
        payload: JSON.parse(
          `{"nested":{"${key}":{"polluted":true}}}`,
        ) as Record<string, unknown>,
      };
      expect(() => parseImport(JSON.stringify(nested), "guest")).toThrow(
        /unsafe/i,
      );
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    },
  );

  it("rejects malformed JSON, unsupported schemas, unexpected keys, wrong types and excessive data", () => {
    for (const text of [
      "not json",
      "null",
      "[]",
      JSON.stringify({ ...fresh(), schemaVersion: 1 }),
      JSON.stringify({ ...fresh(), extra: true }),
    ]) {
      expect(() => parseImport(text, "guest")).toThrow();
    }
    expect(() => parseImport(" ".repeat(MAX_JSON_LENGTH + 1), "guest")).toThrow(
      /size/i,
    );
    const wrong = fresh();
    wrong.settings.dailyMinutes = "60" as never;
    expect(() => parseImport(JSON.stringify(wrong), "guest")).toThrow(
      /dailyMinutes/i,
    );
    const note = ready();
    note.lessons[lesson.id].note = "x".repeat(100_001);
    expect(() => exportProgress(note)).toThrow(/long/i);
    const invalidDate = fresh();
    invalidDate.updatedAt = "2026-02-30T10:00:00.000Z";
    expect(() => parseImport(JSON.stringify(invalidDate), "guest")).toThrow();
  });

  it("rejects mismatched map IDs, invalid score totals, future activities, cycles, accessors and prototypes", () => {
    const state = ready();
    state.lessons[lesson.id].id = "other";
    expect(() => validateProgressState(state)).toThrow(/match/i);
    const assessed = assessLesson(fresh(), lesson, correctAnswers, START);
    assessed.lessons[lesson.id].assessment!.correct = 4;
    expect(() => validateProgressState(assessed)).toThrow(/score/i);
    const future = fresh();
    future.activity.future = event("future", "2026-07-01T00:00:00.000Z");
    expect(() => parseImport(JSON.stringify(future), "guest")).toThrow(
      /future/i,
    );
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => validateProgressState(circular)).toThrow(/circular/i);
    const getter = Object.defineProperty({}, "value", {
      enumerable: true,
      get: () => {
        throw new Error("must not execute");
      },
    });
    expect(() => validateProgressState(getter)).toThrow(/accessors/i);
    expect(() =>
      validateProgressState(Object.create({ inherited: true }) as unknown),
    ).toThrow(/prototype/i);
  });

  it("bounds cumulative object size before serialization and rejects altered array prototypes", () => {
    const oversized = Object.fromEntries(
      Array.from({ length: 51 }, (_, index) => [
        String(index),
        "x".repeat(100_000),
      ]),
    );
    expect(() => validateProgressState(oversized)).toThrow(/size/i);
    expect(() => sanitizeLegacyPayload(oversized)).toThrow(/size/i);
    const array: unknown[] = [];
    Object.setPrototypeOf(array, { unsafe: true });
    expect(() => validateProgressState({ array })).toThrow(/prototype/i);
    expect(() => sanitizeLegacyPayload({ array })).toThrow(/prototype/i);
  });

  it("merges nonconflicting data, keeps destination settings, and reports every conflict without overwriting", () => {
    const destination = updateLesson(
      fresh(),
      "shared",
      { note: "Keep destination note" },
      START,
    );
    let incoming = updateLesson(
      createProgress("local:other", START),
      "shared",
      { note: "Conflicting import" },
      START,
    );
    incoming = updateLesson(
      incoming,
      "new",
      { note: "New imported note" },
      START,
    );
    incoming.settings.displayName = "Incoming profile";
    incoming.settings.timezone = "America/New_York";
    expect(() => mergeImport(destination, exportProgress(incoming))).toThrow(
      /owner/i,
    );
    const merged = mergeImport(destination, exportProgress(incoming), {
      allowCrossOwner: true,
    });
    expect(merged.state.ownerId).toBe("guest");
    expect(merged.state.settings).toEqual(destination.settings);
    expect(merged.state.lessons.shared.note).toBe("Keep destination note");
    expect(merged.state.lessons.new.note).toBe("New imported note");
    expect(
      merged.conflicts.map((conflict) => [conflict.collection, conflict.id]),
    ).toEqual([
      ["settings", "settings"],
      ["lessons", "shared"],
    ]);
    expect(destination.lessons.new).toBeUndefined();
    expect(merged.conflicts[1].incoming).toMatchObject({
      note: "Conflicting import",
    });
  });

  it("treats identical import records as idempotent rather than conflicts", () => {
    const state = recordActivity(ready(), event("study", START));
    const result = mergeImport(state, exportProgress(state));
    expect(result.conflicts).toEqual([]);
    expect(result.state).toEqual(state);
  });
});

describe("sanitized legacy archives", () => {
  it("preserves old values without guessing completion or activity in the new curriculum", () => {
    const payload = JSON.parse(
      '{"completions":{"old-day":true,"dated":{"completedAt":"2020-01-01T00:00:00Z"}},"notes":{"old-day":"My old notes"},"profile":{"pinHash":"secret","password":"secret","name":"Reader"},"__proto__":{"polluted":true}}',
    ) as Record<string, unknown>;
    const state = archiveLegacy(
      fresh(),
      { id: "legacy:one", name: "Old reader", source: "local-v1", payload },
      START,
    );
    expect(state.legacy["legacy:one"].payload).toEqual({
      completions: {
        "old-day": true,
        dated: { completedAt: "2020-01-01T00:00:00Z" },
      },
      notes: { "old-day": "My old notes" },
      profile: { name: "Reader" },
    });
    expect(state.lessons).toEqual({});
    expect(state.activity).toEqual({});
    expect(getStreak(state)).toBe(0);
    expect((payload.profile as Record<string, unknown>).pinHash).toBe("secret");
  });

  it("archives recognized old exports without inventing dates for completed day IDs", () => {
    const old = JSON.stringify({
      profile: { id: "old-user", name: "Old user", cloudUid: null },
      exportedAt: "2020-01-01T00:00:00Z",
      sourceGeneratedAt: "2020-01-01",
      completedDayIds: ["obsolete-day"],
      notes: { "obsolete-day": "Notes" },
      review: { "obsolete-day": { dueAt: "2020-02-01" } },
    });
    const archived = importLegacyExport(fresh(), old, START);
    expect(archived.legacy["export-v1:old-user"].source).toBe("export-v1");
    expect(
      archived.legacy["export-v1:old-user"].payload.completedDayIds,
    ).toEqual(["obsolete-day"]);
    expect(archived.lessons).toEqual({});
    expect(archived.activity).toEqual({});
    expect(() => parseImport(old, "guest")).toThrow();
    expect(() => importLegacyExport(fresh(), '{"completedDayIds":[]}')).toThrow(
      /recognized/i,
    );
  });

  it("deduplicates the same archive but never overwrites a different snapshot", () => {
    const input = {
      id: "old",
      name: "Old",
      source: "local-v1" as const,
      payload: { notes: { one: "note" } },
    };
    const first = archiveLegacy(fresh(), input, START);
    expect(archiveLegacy(first, input, NOW)).toBe(first);
    expect(() =>
      archiveLegacy(
        first,
        { ...input, payload: { notes: { one: "changed" } } },
        NOW,
      ),
    ).toThrow(/overwritten/i);
  });

  it("requires the same authenticated UID for cloud archives, including cached/cloud exports", () => {
    const input = {
      id: "cloud",
      name: "Cloud",
      source: "cloud-v1" as const,
      ownerUid: "alice",
      payload: { completions: { old: true } },
    };
    expect(() => archiveLegacy(fresh(), input, START)).toThrow(/own.*UID/i);
    expect(() =>
      archiveLegacy(createProgress("uid:bob", START), input, START),
    ).toThrow(/own.*UID/i);
    expect(() =>
      archiveLegacy(
        createProgress("uid:alice", START),
        { ...input, ownerUid: undefined },
        START,
      ),
    ).toThrow(/UID/i);
    const own = archiveLegacy(createProgress("uid:alice", START), input, START);
    expect(parseImport(exportProgress(own), "uid:alice")).toEqual(own);
    expect(() =>
      mergeImport(fresh(), exportProgress(own), { allowCrossOwner: true }),
    ).toThrow(/own.*owner/i);
    expect(() =>
      archiveLegacy(
        fresh(),
        {
          ...input,
          source: "export-v1",
          ownerUid: undefined,
          payload: { profile: { cloudUid: "alice" } },
        },
        START,
      ),
    ).toThrow(/own.*UID/i);
  });

  it("bounds legacy nesting and rejects objects with executable accessors", () => {
    let nested: unknown = "leaf";
    for (let i = 0; i < 30; i += 1) nested = { next: nested };
    expect(() => sanitizeLegacyPayload(nested)).toThrow(/nested/i);
    const payload = Object.defineProperty({}, "data", {
      enumerable: true,
      get: () => {
        throw new Error("must not run");
      },
    });
    expect(() => sanitizeLegacyPayload(payload)).toThrow(/accessors/i);
    const array: unknown[] = ["data"];
    Object.defineProperty(array, "0", {
      enumerable: true,
      get: () => {
        throw new Error("must not run");
      },
    });
    expect(() => sanitizeLegacyPayload({ array })).toThrow(/accessors/i);
  });
});
