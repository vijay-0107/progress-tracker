import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  FolderGit2,
  Leaf,
  Target,
} from "lucide-react";
import {
  allLessons,
  coreLessons,
  isExtraTopic,
  lessonCompletion,
  moduleComplete,
  recommendedLessons,
  requiredLessons,
  trackMeta,
} from "../content/catalog";
import { addDays, dayKey, getStreak } from "../domain/progress";
import type { ProgressState, Track } from "../domain/types";
import type { LearningProps } from "./shared";
import {
  ArrowLink,
  EmptyState,
  minutesLabel,
  PathLink,
  ProgressBar,
  TrackBadge,
} from "./shared";

export function Dashboard({ catalog, state }: LearningProps) {
  const lessons = coreLessons(catalog);
  const extraTracks = catalog.tracks.filter((track) =>
    isExtraTopic(track.trackId),
  );
  const extraProgress = lessonCompletion(
    allLessons({ ...catalog, tracks: extraTracks }),
    state,
  );
  const completed = lessons.filter(
    (lesson) => state.lessons[lesson.id]?.manualCompletedAt,
  ).length;
  const streak = getStreak(state);
  const next = recommendedLessons(catalog, state, 3).filter(
    (item) => item !== undefined,
  );
  const now = new Date();
  const today = dayKey(now, state.settings.timezone);
  const events = Object.values(state.activity);
  const todayMinutes = events
    .filter((event) => dayKey(event.at, event.timezone) === today)
    .reduce((sum, event) => sum + event.minutes, 0);
  const days = Array.from({ length: 84 }, (_, index) =>
    addDays(today, index - 83),
  );
  const dayActivity = new Map<string, number>();
  events.forEach((event) => {
    const date = dayKey(event.at, event.timezone);
    dayActivity.set(date, (dayActivity.get(date) || 0) + 1);
  });
  const reviews = Object.values(state.lessons).filter(
    (lesson) => lesson.review && lesson.review.dueAt <= now.toISOString(),
  );
  const goals = Object.values(state.goals).filter(
    (goal) => !goal.deletedAt && !goal.completedAt,
  );
  const projectGates = catalog.projects.reduce(
    (sum, project) =>
      sum +
      project.milestones.filter((milestone) =>
        state.projects[project.id]?.milestones.includes(milestone.id),
      ).length,
    0,
  );
  const finishedProjects = catalog.projects.filter((project) =>
    project.milestones.every((milestone) =>
      state.projects[project.id]?.milestones.includes(milestone.id),
    ),
  ).length;
  const activeProjects = catalog.projects.filter(
    (project) =>
      state.projects[project.id]?.evidence ||
      state.projects[project.id]?.milestones.length,
  );
  const name = state.settings.displayName.trim().split(" ")[0];
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: state.settings.timezone,
  }).format(now);
  return (
    <>
      <div className="dashboard-intro">
        <div>
          <p className="eyebrow">{dateLabel}</p>
          <h1>
            Your next chapter
            <br />
            starts with today<span className="accent-dot">.</span>
          </h1>
          <p className="lead">
            {name && name !== "Learner" ? `Welcome back, ${name}. ` : ""}One
            concept understood. One thing built. Progress that is yours.
          </p>
        </div>
        <div className="focus-illustration" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="illustration-book">
            <BookOpen size={62} strokeWidth={1.1} />
            <Leaf className="illustration-leaf" size={40} />
          </div>
          <span className="floating-label">
            <span /> MAKE ROOM TO GROW
          </span>
        </div>
      </div>
      <section className="stats-grid" aria-label="Your learning summary">
        <Stat
          icon={<BookOpen size={20} />}
          value={`${completed}`}
          label="Lessons completed"
          detail={`of ${lessons.length} core lessons · extras separate`}
        />
        <Stat
          icon={<Clock3 size={20} />}
          value={minutesLabel(todayMinutes)}
          label="Studied today"
          detail={`${state.settings.dailyMinutes} min daily goal`}
        />
        <Stat
          icon={<Flame size={20} />}
          value={`${streak} ${streak === 1 ? "day" : "days"}`}
          label="Learning streak"
          detail="From recorded learning, not visits"
        />
        <Stat
          icon={<CheckCircle2 size={20} />}
          value={`${reviews.length}`}
          label="Reviews ready"
          detail="Make what you learn stick"
        />
      </section>

      <div className="dashboard-columns">
        <section className="panel continue-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">A SMALL STEP FOR TODAY</p>
              <h2>
                {completed ? "Keep your momentum" : "Build a strong beginning"}
              </h2>
            </div>
            <span className="subtle-pill">Recommended</span>
          </div>
          {next.length ? (
            <div className="recommended-list">
              {next.map((item, index) => (
                <div
                  className={`recommendation ${index === 0 ? "featured" : ""}`}
                  key={item.lesson.id}
                >
                  <div className="lesson-number">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="recommendation-copy">
                    <div className="inline-meta">
                      <TrackBadge id={item.track.trackId} />
                      <span>
                        {minutesLabel(item.lesson.estimatedMinutes)} estimated
                      </span>
                    </div>
                    <h3>
                      <PathLink id={item.lesson.id}>
                        {item.lesson.title}
                      </PathLink>
                    </h3>
                    <p>{item.lesson.objectives[0]}</p>
                  </div>
                  <PathLink
                    id={item.lesson.id}
                    className={
                      index === 0 ? "button primary small" : "round-button"
                    }
                  >
                    {index === 0 ? (
                      <>
                        Start learning <ArrowRight size={16} />
                      </>
                    ) : (
                      <>
                        <ArrowRight size={17} />
                        <span className="sr-only">
                          Open {item.lesson.title}
                        </span>
                      </>
                    )}
                  </PathLink>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Your path is up to date">
              Revisit a self-check or explore another career path. Completion is
              a learning record, not a claim of mastery.
            </EmptyState>
          )}
        </section>
        <aside className="panel daily-focus">
          <div className="section-title">
            <h2>Today, intentionally</h2>
            <Target size={20} />
          </div>
          <div className="daily-progress">
            <strong>
              {todayMinutes}
              <span> / {state.settings.dailyMinutes} min</span>
            </strong>
            <ProgressBar
              value={(todayMinutes / state.settings.dailyMinutes) * 100}
              label="Daily study target"
            />
          </div>
          <p className="muted">
            Log focused study inside a lesson. Reading, assignments and practice
            all count when you record the work.
          </p>
          <div className="focus-actions">
            <a href="#/review">
              <span className="focus-icon">
                <CheckCircle2 size={17} />
              </span>
              <span>
                <strong>
                  {reviews.length
                    ? `${reviews.length} review${reviews.length > 1 ? "s" : ""} waiting`
                    : "Build your review habit"}
                </strong>
                <small>Active recall, not another rewatch</small>
              </span>
              <ArrowRight size={16} />
            </a>
            <a href="#/planner">
              <span className="focus-icon">
                <CalendarDays size={17} />
              </span>
              <span>
                <strong>
                  {goals.length
                    ? `${goals.length} personal goal${goals.length > 1 ? "s" : ""}`
                    : "Set a small, clear goal"}
                </strong>
                <small>A realistic plan beats a perfect plan</small>
              </span>
              <ArrowRight size={16} />
            </a>
          </div>
          <p className="quiet-note">
            Your workspace starts at zero.
            <br />
            Every bit of progress comes from you.
          </p>
        </aside>
      </div>

      <section className="section-block">
        <div className="section-title">
          <div>
            <p className="eyebrow">ONE FOUNDATION. MANY DIRECTIONS.</p>
            <h2>Your learning paths</h2>
          </div>
          <span className="muted small-text">
            Choose depth, not everything at once
          </span>
        </div>
        <PathCards
          tracks={catalog.tracks.filter(
            (track) => !isExtraTopic(track.trackId),
          )}
          state={state}
        />
      </section>
      <section className="section-block" aria-labelledby="extra-topics-heading">
        <div className="section-title">
          <div>
            <p className="eyebrow">OPTIONAL. YOUR CHOICE OF DEPTH.</p>
            <h2 id="extra-topics-heading">Extra Topics</h2>
          </div>
          <span className="subtle-pill">
            {extraProgress.completed} / {extraProgress.total} extra lessons
            complete
          </span>
        </div>
        <p className="muted">
          Beginner, Intermediate, Advanced and Professional Practice in each
          topic. These tracks do not reduce core progress or change your saved
          primary path. Professional Practice describes learning, not
          certification, qualification or trading profitability.
        </p>
        <PathCards tracks={extraTracks} state={state} />
      </section>
      <section className="panel portfolio-progress">
        <span className="portfolio-icon">
          <FolderGit2 size={27} strokeWidth={1.5} />
        </span>
        <div>
          <p className="eyebrow">LEARNING, MADE TANGIBLE</p>
          <h2>Your portfolio, one evidence gate at a time.</h2>
          <p>
            {finishedProjects} of {catalog.projects.length} projects complete ·{" "}
            {projectGates} of{" "}
            {catalog.projects.reduce(
              (sum, project) => sum + project.milestones.length,
              0,
            )}{" "}
            evidence gates recorded.
            {activeProjects.length
              ? ` ${activeProjects.length} project${activeProjects.length === 1 ? "" : "s"} in your workspace.`
              : " Start with the prerequisites, then a small working slice."}
          </p>
        </div>
        <ArrowLink href="#/projects">Open project studio</ArrowLink>
      </section>
      <section className="panel activity-panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">SHOWING UP ADDS UP</p>
            <h2>A record of your effort</h2>
          </div>
          <ArrowLink href="#/planner">Calendar & goals</ArrowLink>
        </div>
        <div className="heatmap-wrapper">
          <div
            className="heatmap"
            aria-label="Recorded study activity over the past twelve weeks"
          >
            {days.map((date) => (
              <div
                className={`heatmap-cell level-${Math.min(dayActivity.get(date) || 0, 4)}`}
                key={date}
                tabIndex={0}
                role="img"
                aria-label={`${date}: ${dayActivity.get(date) || 0} learning activities`}
                title={`${date}: ${dayActivity.get(date) || 0} learning activities`}
              />
            ))}
          </div>
          <div className="heatmap-key">
            <span>Last 12 weeks</span>
            <span>
              Less <i className="level-0" />
              <i className="level-1" />
              <i className="level-2" />
              <i className="level-3" />
              <i className="level-4" /> More
            </span>
          </div>
        </div>
        <p className="quiet-note">
          Dates follow the timezone saved with each activity. A missed full day
          breaks a streak; today stays open until midnight.
        </p>
      </section>
    </>
  );
}

function PathCards({
  tracks,
  state,
}: {
  tracks: Track[];
  state: ProgressState;
}) {
  return (
    <div className="path-cards">
      {tracks.map((track) => {
        const meta = trackMeta[track.trackId];
        const modules = track.modules.filter((module) => !module.optional);
        const progress = lessonCompletion(requiredLessons(track), state);
        const modulesDone = modules.filter((module) =>
          moduleComplete(module, state),
        ).length;
        return (
          <a
            href={`#/path/${track.trackId}`}
            className={`path-card ${track.trackId === "foundation" ? "foundation-card" : ""}`}
            key={track.trackId}
            style={{ "--track-color": meta.color } as React.CSSProperties}
          >
            <div className="path-card-top">
              <span className="path-monogram">{meta.code}</span>
              {track.trackId === "foundation" ? (
                <span className="subtle-pill">Start here</span>
              ) : isExtraTopic(track.trackId) ? (
                <span className="subtle-pill">Optional topic</span>
              ) : (
                <ArrowRight size={19} />
              )}
            </div>
            <h3>{meta.label}</h3>
            <p>{meta.description}</p>
            <div className="path-card-bottom">
              <ProgressBar
                value={progress.percent}
                label={`${meta.label} progress`}
              />
              <div className="path-card-metrics">
                <span>
                  {modulesDone}/{modules.length}{" "}
                  {modules.length !== track.modules.length
                    ? "core modules"
                    : "modules"}
                </span>
                <strong>{progress.percent}%</strong>
              </div>
              {isExtraTopic(track.trackId) && (
                <small>
                  {progress.completed}/{progress.total} topic lessons
                </small>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  detail,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  detail: string;
}) {
  return (
    <article className="stat-card">
      <span className="stat-icon">{icon}</span>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
