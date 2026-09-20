import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, RotateCcw } from "lucide-react";
import { assessLesson } from "../domain/progress";
import { eligibleLessons } from "../content/catalog";
import type { Lesson, TrackId } from "../domain/types";
import type { LearningProps } from "./shared";
import { EmptyState, PageHeading, PathLink } from "./shared";
import { QuestionField } from "./QuestionField";

interface Attempt {
  lessonIds: string[];
  answers: Record<string, string>;
  endAt: number;
  duration: number;
  startedAt: number;
  phase: "running" | "complete";
  section: string;
}

function readAttempt(key: string): { attempt: Attempt | null; error: string } {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return { attempt: null, error: "" };
    const data: unknown = JSON.parse(raw);
    if (
      !data ||
      typeof data !== "object" ||
      !("phase" in data) ||
      !["running", "complete"].includes(String(data.phase)) ||
      !("endAt" in data) ||
      !Number.isFinite(data.endAt) ||
      !("lessonIds" in data) ||
      !Array.isArray(data.lessonIds) ||
      !data.lessonIds.every((id) => typeof id === "string") ||
      !("answers" in data) ||
      !data.answers ||
      typeof data.answers !== "object" ||
      !Object.values(data.answers).every((answer) => typeof answer === "string")
    )
      throw new Error("Stored attempt is invalid");
    return { attempt: data as Attempt, error: "" };
  } catch (error) {
    return {
      attempt: null,
      error: `The saved timer could not be restored: ${error instanceof Error ? error.message : "browser storage unavailable"}. Your learning progress has not been reset.`,
    };
  }
}

export function Practice({
  catalog,
  state,
  mutate,
  notify,
  trackId,
}: LearningProps & { trackId: TrackId }) {
  const key = `progress-practice-v2:${state.ownerId}:${trackId}`;
  const [restored] = useState(() => readAttempt(key));
  const [attempt, setAttempt] = useState<Attempt | null>(restored.attempt);
  const [error, setError] = useState(restored.error);
  const [section, setSection] = useState("all");
  const [duration, setDuration] = useState(
    trackId === "cat" ? 40 : trackId === "gate" ? 180 : 25,
  );
  const [now, setNow] = useState(Date.now());
  const track = catalog.tracks.find((item) => item.trackId === trackId)!;
  const candidates = useMemo(
    () =>
      track.modules
        .flatMap((module) => eligibleLessons(module, section))
        .filter((lesson) => lesson.assignment.questions.length > 0),
    [track, section],
  );
  const selected = attempt
    ? track.modules
        .flatMap((module) => module.lessons)
        .filter((lesson) => attempt.lessonIds.includes(lesson.id))
    : [];
  useEffect(() => {
    if (attempt?.phase !== "running") return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [attempt?.phase]);
  const persist = (next: Attempt | null) => {
    try {
      if (next) sessionStorage.setItem(key, JSON.stringify(next));
      else sessionStorage.removeItem(key);
      setAttempt(next);
      setError("");
    } catch (failure) {
      setError(
        `Timer could not be saved: ${failure instanceof Error ? failure.message : "storage unavailable"}. Keep this tab open; export your progress if storage remains unavailable.`,
      );
    }
  };
  const seconds = attempt
    ? Math.max(0, Math.ceil((attempt.endAt - now) / 1000))
    : 0;
  const disabled = attempt?.phase === "complete" || seconds <= 0;
  function finish() {
    if (!attempt) return;
    const attempted = selected.filter((lesson) =>
      lesson.assignment.questions.some(
        (question) =>
          question.kind !== "short-answer" &&
          attempt.answers[question.id]?.trim(),
      ),
    );
    if (!attempted.length) {
      persist({ ...attempt, phase: "complete" });
      notify(
        "Explanations opened for comparison. No objective answer was attempted, so no score, completion or learning activity was recorded.",
      );
      return;
    }
    if (
      mutate((current) =>
        attempted.reduce(
          (next, lesson) =>
            assessLesson(
              next,
              lesson,
              Object.fromEntries(
                lesson.assignment.questions
                  .filter(
                    (question) => attempt.answers[question.id] !== undefined,
                  )
                  .map((question) => [
                    question.id,
                    attempt.answers[question.id],
                  ]),
              ),
            ),
          current,
        ),
      )
    ) {
      persist({ ...attempt, phase: "complete" });
      notify(
        "Practice results recorded. Written responses require manual comparison.",
      );
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="PRACTICE WITH INTENTION"
        title={`${trackId.toUpperCase()} practice room`}
        description="An original practice bank with an adjustable section timer. Not a replica, prediction or complete official mock exam."
      />
      <div className="notice info">
        <strong>Source edition matters.</strong>
        <p>
          Curriculum sources checked {track.sourceCheckedOn}.{" "}
          {track.edition ||
            "See the path's source notes for the latest verified edition."}{" "}
          Timers below are personal practice settings, not a claim about your
          chosen exam's current rules.
        </p>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button
            className="button secondary small"
            onClick={() => {
              if (
                window.confirm(
                  "Discard this tab's practice timer? Saved lesson progress is unaffected.",
                )
              )
                persist(null);
            }}
          >
            Discard timer
          </button>
        </div>
      )}
      {!attempt ? (
        <section className="panel practice-setup">
          <h2>A quiet space to try.</h2>
          <p>
            Start with up to six complete lesson self-check sets. All questions
            are original; external exam/problem statements have not been copied.
            Wrong objective answers go to your error notebook.
          </p>
          <div className="form-grid">
            <label className="field-label">
              {trackId === "gate" ? "Paper focus" : "Section"}
              <select
                value={section}
                onChange={(event) => setSection(event.target.value)}
              >
                <option value="all">All sections</option>
                {(trackId === "gate"
                  ? ["CS", "DA"]
                  : trackId === "cat"
                    ? ["VARC", "DILR", "QA"]
                    : []
                ).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Practice minutes
              <input
                type="number"
                min={1}
                max={240}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              />
            </label>
          </div>
          <p className="muted">
            {candidates
              .slice(0, 6)
              .reduce(
                (count, lesson) => count + lesson.assignment.questions.length,
                0,
              )}{" "}
            questions available in this practice set.
          </p>
          <button
            className="button primary"
            disabled={!candidates.length || duration < 1 || duration > 240}
            onClick={() => {
              const start = Date.now();
              setNow(start);
              persist({
                lessonIds: candidates.slice(0, 6).map((lesson) => lesson.id),
                answers: {},
                endAt: start + duration * 60000,
                duration,
                startedAt: start,
                phase: "running",
                section,
              });
            }}
          >
            <Clock3 size={17} />
            Start focused practice
          </button>
          <p className="quiet-note">
            The timer continues while the tab is hidden and survives reload in
            this tab. Switching accounts opens a separate private attempt.
          </p>
        </section>
      ) : (
        <>
          <div className={`practice-timer ${seconds === 0 ? "expired" : ""}`}>
            <div>
              <Clock3 size={20} />
              <strong>
                {attempt.phase === "complete"
                  ? "Attempt complete"
                  : seconds
                    ? `${Math.floor(seconds / 60)
                        .toString()
                        .padStart(
                          2,
                          "0",
                        )}:${(seconds % 60).toString().padStart(2, "0")}`
                    : "Time is up"}
              </strong>
              <span>
                {attempt.section === "all" ? "Mixed practice" : attempt.section}{" "}
                · {attempt.duration} minute setting
              </span>
            </div>
            {attempt.phase === "running" ? (
              <button className="button primary small" onClick={finish}>
                Finish & check answers <ArrowRight size={15} />
              </button>
            ) : (
              <button
                className="button secondary small"
                onClick={() => persist(null)}
              >
                <RotateCcw size={15} />
                New attempt
              </button>
            )}
          </div>
          {seconds === 0 && attempt.phase !== "complete" && (
            <div className="notice info" role="status">
              Your section time has ended. Answers are locked. Finish the
              attempt to record results and see explanations.
            </div>
          )}
          {selected.length ? (
            selected.map((lesson: Lesson) => {
              const recorded = state.lessons[lesson.id]?.assessment;
              const currentAttemptScore =
                recorded &&
                Date.parse(recorded.attemptedAt) >= attempt.startedAt;
              return (
                <section className="panel lesson-section" key={lesson.id}>
                  <div className="section-title">
                    <h2>{lesson.title}</h2>
                    <PathLink className="text-button" id={lesson.id}>
                      Revisit lesson
                    </PathLink>
                  </div>
                  {lesson.assignment.questions.map((question) => (
                    <div className="question-card" key={question.id}>
                      <QuestionField
                        question={question}
                        disabled={disabled}
                        value={attempt.answers[question.id] || ""}
                        onChange={(value) =>
                          persist({
                            ...attempt,
                            answers: {
                              ...attempt.answers,
                              [question.id]: value,
                            },
                          })
                        }
                      />
                      {attempt.phase === "complete" && (
                        <div className="answer-explanation">
                          <strong>
                            {question.kind === "short-answer"
                              ? "Manual comparison"
                              : "Answer"}
                            :{" "}
                            {Array.isArray(question.answer)
                              ? question.answer.join(", ")
                              : String(question.answer)}
                          </strong>
                          <p>{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {attempt.phase === "complete" && currentAttemptScore && (
                    <p className="notice success">
                      {recorded.correct}/{recorded.total} objectively checked
                      answers. No manual assignment completion was granted.
                    </p>
                  )}
                </section>
              );
            })
          ) : (
            <EmptyState title="This practice set changed">
              The catalog no longer contains this timer's lessons. Your recorded
              learning is safe; discard the timer to choose a current set.
            </EmptyState>
          )}
        </>
      )}
    </>
  );
}
