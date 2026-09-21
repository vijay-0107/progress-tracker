import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { dayKey, addDays } from "../domain/progress";
import { trackMeta } from "../content/catalog";
import { CORE_TRACK_IDS, type CoreTrackId } from "../domain/types";
import type { LearningProps } from "./shared";
import { EmptyState, PageHeading, readableDate, TrackBadge } from "./shared";

export function Planner({ state, mutate, notify }: LearningProps) {
  const today = dayKey(new Date(), state.settings.timezone);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState(today);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState(addDays(today, 7));
  const [track, setTrack] = useState<CoreTrackId>(state.settings.primaryTrack);
  const first = `${month}-01`;
  const weekday = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, index) =>
    addDays(first, index - weekday),
  );
  const goals = Object.values(state.goals)
    .filter((goal) => !goal.deletedAt)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const events = Object.values(state.activity)
    .filter((event) => dayKey(event.at, event.timezone) === selectedDay)
    .sort((a, b) => b.at.localeCompare(a.at));
  const changeMonth = (delta: number) => {
    const date = new Date(`${first}T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + delta);
    setMonth(date.toISOString().slice(0, 7));
  };
  return (
    <>
      <PageHeading
        eyebrow="A PLAN THAT FITS YOUR LIFE"
        title="Make space for progress."
        description="Set an achievable goal. Keep the record honest. A missed day is a chance to begin again, not a debt to repay."
      />
      <div className="planner-grid">
        <section className="panel calendar-panel">
          <div className="section-title">
            <h2>
              {new Intl.DateTimeFormat("en", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${first}T12:00:00Z`))}
            </h2>
            <div className="button-row">
              <button
                className="round-button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
              >
                <ArrowLeft size={17} />
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setMonth(today.slice(0, 7));
                  setSelectedDay(today);
                }}
              >
                Today
              </button>
              <button
                className="round-button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
              >
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
          <div className="calendar-grid">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => (
              <span className="calendar-weekday" key={name}>
                {name}
              </span>
            ))}
            {days.map((date) => {
              const activity = Object.values(state.activity).filter(
                (event) => dayKey(event.at, event.timezone) === date,
              );
              const goalsDue = goals.filter(
                (goal) => goal.targetDate === date && !goal.completedAt,
              ).length;
              return (
                <button
                  className={`calendar-day ${date === today ? "today" : ""} ${date === selectedDay ? "selected" : ""} ${!date.startsWith(month) ? "outside" : ""}`}
                  key={date}
                  aria-label={`${date}, ${activity.length} learning activities, ${goalsDue} goals due`}
                  aria-pressed={date === selectedDay}
                  onClick={() => setSelectedDay(date)}
                >
                  <span>{Number(date.slice(8))}</span>
                  <span className="calendar-dots">
                    {activity.length > 0 && <i />}
                    {goalsDue > 0 && <i className="goal-dot" />}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="quiet-note">
            Green: recorded learning · Amber: goal due · Planning timezone:{" "}
            {state.settings.timezone}
          </p>
          <hr />
          <h3>{readableDate(selectedDay)}</h3>
          {events.length ? (
            <ul className="activity-log">
              {events.map((event) => (
                <li key={event.id}>
                  <span className="stage-badge">{event.kind}</span>
                  <div>
                    <strong>{event.detail}</strong>
                    <small>
                      {event.minutes ? `${event.minutes} minutes · ` : ""}
                      {event.timezone}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              No learning activity recorded for this day. Simply opening the app
              does not create progress.
            </p>
          )}
        </section>
        <div>
          <section className="panel lesson-section">
            <h2>Choose your next small win</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const now = new Date().toISOString();
                const id = crypto.randomUUID();
                if (!title.trim()) {
                  notify("Give your goal a concrete title.");
                  return;
                }
                if (
                  mutate((current) => ({
                    ...current,
                    updatedAt: now,
                    goals: {
                      ...current.goals,
                      [id]: {
                        id,
                        title: title.trim(),
                        targetDate,
                        trackId: track,
                        completedAt: null,
                        deletedAt: null,
                        updatedAt: now,
                      },
                    },
                  }))
                ) {
                  setTitle("");
                  notify("Personal goal added.");
                }
              }}
            >
              <label className="field-label">
                A concrete goal
                <input
                  required
                  maxLength={200}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Build and test the first SQL fixture"
                />
              </label>
              <div className="form-grid">
                <label className="field-label">
                  Target date
                  <input
                    required
                    type="date"
                    value={targetDate}
                    onChange={(event) => setTargetDate(event.target.value)}
                  />
                </label>
                <label className="field-label">
                  Core learning path
                  <select
                    value={track}
                    onChange={(event) =>
                      setTrack(event.target.value as CoreTrackId)
                    }
                  >
                    {CORE_TRACK_IDS.map((id) => (
                      <option key={id} value={id}>
                        {trackMeta[id].short}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="quiet-note">
                Goals retain their core-path category. For an Extra Topic, use
                its lesson assignments and stage evidence to track your work;
                optional-topic progress is recorded separately.
              </p>
              <button className="button primary">
                <Plus size={16} />
                Add personal goal
              </button>
            </form>
            <p className="quiet-note">
              A goal is your plan, not a seeded assignment or an activity
              credit.
            </p>
          </section>
          <section className="section-block">
            <div className="section-title">
              <h2>Your goals</h2>
              <span className="muted">
                {goals.filter((goal) => !goal.completedAt).length} active
              </span>
            </div>
            {goals.length ? (
              goals.map((goal) => (
                <article
                  className={`panel goal-card ${goal.completedAt ? "completed" : ""}`}
                  key={goal.id}
                >
                  <TrackBadge id={goal.trackId} />
                  <h3>{goal.title}</h3>
                  <p
                    className={
                      goal.targetDate < today && !goal.completedAt
                        ? "overdue"
                        : "muted"
                    }
                  >
                    {goal.completedAt
                      ? `Completed ${readableDate(goal.completedAt)}`
                      : `Target ${readableDate(goal.targetDate)}`}
                  </p>
                  <div className="button-row">
                    <button
                      className="button secondary small"
                      onClick={() => {
                        const now = new Date().toISOString();
                        mutate((current) => ({
                          ...current,
                          updatedAt: now,
                          goals: {
                            ...current.goals,
                            [goal.id]: {
                              ...goal,
                              completedAt: goal.completedAt ? null : now,
                              updatedAt: now,
                            },
                          },
                        }));
                      }}
                    >
                      <Check size={15} />
                      {goal.completedAt ? "Reopen goal" : "Mark goal done"}
                    </button>
                    <button
                      className="round-button"
                      aria-label={`Remove goal ${goal.title}`}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Remove goal "${goal.title}"? Your recorded learning will not be affected.`,
                          )
                        )
                          return;
                        const now = new Date().toISOString();
                        mutate((current) => ({
                          ...current,
                          updatedAt: now,
                          goals: {
                            ...current.goals,
                            [goal.id]: {
                              ...goal,
                              deletedAt: now,
                              updatedAt: now,
                            },
                          },
                        }));
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title="Start smaller than you think">
                A single clear goal is enough to give the week direction.
              </EmptyState>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
