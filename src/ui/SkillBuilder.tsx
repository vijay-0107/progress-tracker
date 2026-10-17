import { ArrowRight, ChevronDown } from "lucide-react";
import {
  lessonCompletion,
  requiredLessons,
  skillBuildersFor,
  stageLabel,
  trackMeta,
  unmetRequirements,
} from "../content/catalog";
import {
  LEARNING_STAGES,
  type Catalog,
  type ProgressState,
  type Track,
  type TrackId,
} from "../domain/types";
import { minutesLabel, PathLink, ProgressBar, StatusIcon } from "./shared";

/** Every skill builder that belongs inside a section, rendered in place. */
export function SkillBuilders({
  catalog,
  state,
  sectionId,
}: {
  catalog: Catalog;
  state: ProgressState;
  sectionId: TrackId;
}) {
  const builders = skillBuildersFor(catalog, sectionId);
  if (!builders.length) return null;
  return (
    <>
      {builders.map((track) => (
        <SkillBuilder
          key={track.trackId}
          catalog={catalog}
          state={state}
          track={track}
        />
      ))}
    </>
  );
}

export function SkillBuilder({
  catalog,
  state,
  track,
}: {
  catalog: Catalog;
  state: ProgressState;
  track: Track;
}) {
  const meta = trackMeta[track.trackId];
  const lessons = requiredLessons(track);
  const progress = lessonCompletion(lessons, state);
  const hours = Math.round(
    lessons.reduce((total, lesson) => total + lesson.estimatedMinutes, 0) / 60,
  );
  const stages = LEARNING_STAGES.filter((stage) =>
    track.modules.some((module) => module.stage === stage),
  );
  const headingId = `skill-builder-${track.trackId}`;
  return (
    <section
      className="panel skill-builder section-block"
      aria-labelledby={headingId}
      style={{ "--track-color": meta.color } as React.CSSProperties}
    >
      <div className="skill-builder-head">
        <div>
          <p className="eyebrow">
            SKILL BUILDER · START AS A COMPLETE BEGINNER
          </p>
          <h2 id={headingId}>{meta.label}</h2>
          <p className="muted">{meta.description}</p>
        </div>
        <a className="button secondary small" href={`#/path/${track.trackId}`}>
          Open with filters <ArrowRight size={15} />
        </a>
      </div>
      <div className="skill-builder-stats">
        <span>
          <strong>{progress.completed}</strong> / {progress.total} lessons
        </span>
        <span>
          <strong>{track.modules.length}</strong> modules
        </span>
        <span>
          <strong>{hours}h</strong> estimated
        </span>
      </div>
      <ProgressBar
        value={progress.percent}
        label={`${meta.label} completion`}
      />
      <div className="skill-stage-row">
        {stages.map((stage) => {
          const stageProgress = lessonCompletion(
            requiredLessons(track, "all", stage),
            state,
          );
          const outcome = track.stageOutcomes?.find(
            (item) => item.stage === stage,
          );
          return (
            <div className="skill-stage" key={stage}>
              <strong>{stageLabel(stage, track.trackId)}</strong>
              <span className="small-text muted">
                {stageProgress.completed}/{stageProgress.total} lessons
              </span>
              {outcome && <p className="small-text">{outcome.outcome}</p>}
            </div>
          );
        })}
      </div>
      <div className="roadmap-list">
        {track.modules.map((module, index) => {
          const done = module.lessons.filter(
            (lesson) => state.lessons[lesson.id]?.manualCompletedAt,
          ).length;
          const blocked = unmetRequirements(catalog, module, state);
          return (
            <details className="module-card" key={module.id}>
              <summary>
                <span
                  className={`module-number ${done === module.lessons.length ? "done" : ""}`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="module-summary">
                  <span className="inline-meta">
                    <span className="stage-badge">
                      {stageLabel(module.stage, track.trackId)}
                    </span>
                    {blocked.length > 0 && (
                      <span className="muted">
                        {blocked.length} recommended module
                        {blocked.length === 1 ? "" : "s"} first
                      </span>
                    )}
                  </span>
                  <h3>{module.title}</h3>
                  <span className="muted">{module.description}</span>
                </span>
                <span className="module-count">
                  {done}/{module.lessons.length}
                  <small>lessons</small>
                </span>
                <ChevronDown className="disclosure-chevron" size={20} />
              </summary>
              <div className="module-body">
                {blocked.length > 0 && (
                  <div className="prerequisite-list">
                    <strong>Recommended first</strong>
                    <span>{blocked.map((item) => item.title).join(" · ")}</span>
                  </div>
                )}
                {module.lessons.map((lesson) => (
                  <div className="roadmap-lesson" key={lesson.id}>
                    <StatusIcon
                      complete={Boolean(
                        state.lessons[lesson.id]?.manualCompletedAt,
                      )}
                    />
                    <div>
                      <PathLink id={lesson.id}>
                        <h4>{lesson.title}</h4>
                      </PathLink>
                      <div className="inline-meta">
                        <span>
                          {minutesLabel(lesson.estimatedMinutes)} estimated
                        </span>
                        <span>{lesson.objectives.length} objectives</span>
                        <span>
                          {lesson.video ? "Watch · " : ""}Read · Build · Check
                        </span>
                      </div>
                    </div>
                    <PathLink className="round-button" id={lesson.id}>
                      <ArrowRight size={18} />
                      <span className="sr-only">Open {lesson.title}</span>
                    </PathLink>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
