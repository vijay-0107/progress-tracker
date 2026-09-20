import { useState } from "react";
import { ArrowRight, Bookmark, Check, RotateCcw, Save } from "lucide-react";
import { findLesson } from "../content/catalog";
import { reviewLesson } from "../domain/progress";
import type { LearningProps } from "./shared";
import {
  EmptyState,
  PageHeading,
  PathLink,
  readableDate,
  TrackBadge,
} from "./shared";

export function Review({ catalog, state, mutate, notify }: LearningProps) {
  const [tab, setTab] = useState("due");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const now = new Date().toISOString();
  const scheduled = Object.values(state.lessons)
    .filter((item) => item.review)
    .sort((a, b) => a.review!.dueAt.localeCompare(b.review!.dueAt));
  const due = scheduled.filter((item) => item.review!.dueAt <= now);
  const bookmarked = Object.values(state.lessons).filter(
    (item) => item.bookmarked,
  );
  const errors = Object.values(state.errors).filter((item) => !item.resolvedAt);
  return (
    <>
      <PageHeading
        eyebrow="LEARNING THAT LASTS"
        title="Come back a little stronger."
        description="Recall first. Check your reasoning. Turn mistakes into your next useful question."
      />
      <div className="segmented-tabs" aria-label="Review views">
        {[
          ["due", `Due reviews (${due.length})`],
          ["errors", `Error notebook (${errors.length})`],
          ["saved", `Bookmarks (${bookmarked.length})`],
          ["upcoming", "Upcoming reviews"],
        ].map(([id, title]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
          >
            {title}
          </button>
        ))}
      </div>
      {tab === "due" && (
        <>
          {due.length ? (
            due.map((saved) => {
              const found = findLesson(catalog, saved.id);
              if (!found) return null;
              return (
                <section className="panel review-card" key={saved.id}>
                  <div className="inline-meta">
                    <TrackBadge id={found.track.trackId} />
                    <span>Due {readableDate(saved.review!.dueAt)}</span>
                  </div>
                  <h2>{found.lesson.title}</h2>
                  <ol>
                    {found.lesson.reviewPrompts.map((prompt) => (
                      <li key={prompt}>{prompt}</li>
                    ))}
                  </ol>
                  {!revealed.has(saved.id) ? (
                    <button
                      className="button secondary"
                      onClick={() =>
                        setRevealed(new Set([...revealed, saved.id]))
                      }
                    >
                      I have attempted recall
                    </button>
                  ) : (
                    <>
                      <p className="notice info">
                        Compare with your notes and the lesson sources before
                        rating yourself. These ratings schedule practice; they
                        do not verify mastery.
                      </p>
                      <div className="button-row">
                        {(["again", "hard", "good"] as const).map((rating) => (
                          <button
                            className={`button ${rating === "good" ? "primary" : "secondary"}`}
                            key={rating}
                            onClick={() => {
                              if (
                                mutate((current) =>
                                  reviewLesson(current, saved.id, rating),
                                )
                              )
                                notify(
                                  "Review recorded and your next recall scheduled.",
                                );
                            }}
                          >
                            {rating === "again"
                              ? "Again · revisit soon"
                              : rating === "hard"
                                ? "Hard · smaller interval"
                                : "Good · space it out"}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <PathLink className="arrow-link" id={saved.id}>
                    Revisit lesson & notes <ArrowRight size={16} />
                  </PathLink>
                </section>
              );
            })
          ) : (
            <EmptyState
              title="A little breathing room."
              action={
                <a className="button primary" href="#/path/foundation">
                  Find your next lesson <ArrowRight size={16} />
                </a>
              }
            >
              No reviews are due. Completing an assignment starts a review
              schedule; your own recall ratings adjust the next interval.
            </EmptyState>
          )}
        </>
      )}
      {tab === "errors" && (
        <>
          {errors.length ? (
            errors.map((entry) => (
              <section className="panel review-card" key={entry.id}>
                <p className="eyebrow">A MISTAKE WORTH UNDERSTANDING</p>
                <h2>{entry.prompt}</h2>
                <p>
                  <strong>Your recorded answer:</strong>{" "}
                  {entry.answer || "(unanswered)"}
                </p>
                <p>
                  <strong>Explanation:</strong> {entry.explanation}
                </p>
                <label className="field-label">
                  What will you do differently?
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={reflections[entry.id] ?? entry.reflection}
                    onChange={(event) =>
                      setReflections({
                        ...reflections,
                        [entry.id]: event.target.value,
                      })
                    }
                    placeholder="Name the misconception, then the check that would have caught it."
                  />
                </label>
                <div className="button-row">
                  <button
                    className="button secondary"
                    onClick={() => {
                      const now = new Date().toISOString();
                      if (
                        mutate((current) => ({
                          ...current,
                          updatedAt: now,
                          errors: {
                            ...current.errors,
                            [entry.id]: {
                              ...entry,
                              reflection:
                                reflections[entry.id] ?? entry.reflection,
                              updatedAt: now,
                            },
                          },
                        }))
                      )
                        notify("Reflection saved.");
                    }}
                  >
                    <Save size={16} />
                    Save reflection
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => {
                      const reflection =
                        reflections[entry.id] ?? entry.reflection;
                      if (reflection.trim().length < 15) {
                        notify(
                          "Add a short explanation of the mistake before resolving it.",
                        );
                        return;
                      }
                      const now = new Date().toISOString();
                      if (
                        mutate((current) => ({
                          ...current,
                          updatedAt: now,
                          errors: {
                            ...current.errors,
                            [entry.id]: {
                              ...entry,
                              reflection,
                              resolvedAt: now,
                              updatedAt: now,
                            },
                          },
                        }))
                      )
                        notify(
                          "Error marked reviewed. Your reflection remains in your export.",
                        );
                    }}
                  >
                    <Check size={16} />
                    Mark reviewed
                  </button>
                  <PathLink className="arrow-link" id={entry.lessonId}>
                    Try the lesson again <RotateCcw size={16} />
                  </PathLink>
                </div>
              </section>
            ))
          ) : (
            <EmptyState title="No open mistakes yet">
              Incorrect self-check answers appear here with explanations. An
              empty notebook means no errors have been recorded, not that
              everything is mastered.
            </EmptyState>
          )}
        </>
      )}
      {tab === "saved" && (
        <>
          {bookmarked.length ? (
            <div className="saved-grid">
              {bookmarked.map((saved) => {
                const found = findLesson(catalog, saved.id);
                return (
                  found && (
                    <PathLink
                      className="panel saved-card"
                      key={saved.id}
                      id={saved.id}
                    >
                      <Bookmark size={20} />
                      <TrackBadge id={found.track.trackId} />
                      <h2>{found.lesson.title}</h2>
                      <p>
                        {saved.note ||
                          "Return when you have a little focused time."}
                      </p>
                      <span className="arrow-link">
                        Open lesson <ArrowRight size={16} />
                      </span>
                    </PathLink>
                  )
                );
              })}
            </div>
          ) : (
            <EmptyState title="Keep a few good things close">
              Bookmark a lesson from its detail page. Saved resources are
              private to this workspace.
            </EmptyState>
          )}
        </>
      )}
      {tab === "upcoming" && (
        <>
          {scheduled.length ? (
            scheduled.map((saved) => {
              const found = findLesson(catalog, saved.id);
              return (
                found && (
                  <div className="panel upcoming-review" key={saved.id}>
                    <div>
                      <TrackBadge id={found.track.trackId} />
                      <h3>
                        <PathLink id={saved.id}>{found.lesson.title}</PathLink>
                      </h3>
                    </div>
                    <div>
                      <strong>{readableDate(saved.review!.dueAt)}</strong>
                      <small>{saved.review!.intervalDays} day interval</small>
                    </div>
                  </div>
                )
              );
            })
          ) : (
            <EmptyState title="Your review rhythm starts here">
              Complete a lesson assignment to create your first scheduled
              recall.
            </EmptyState>
          )}
        </>
      )}
    </>
  );
}
