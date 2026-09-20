import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Layers3,
  Search,
} from "lucide-react";
import {
  CAREER_TRACKS,
  eligibleLessons,
  moduleComplete,
  trackMeta,
  unmetRequirements,
  unmetLessonRequirements,
} from "../content/catalog";
import type { Stage, TrackId } from "../domain/types";
import type { LearningProps } from "./shared";
import {
  EmptyState,
  External,
  minutesLabel,
  PageHeading,
  PathLink,
  ProgressBar,
  StatusIcon,
} from "./shared";
import { Guidance } from "./Guidance";

export function Roadmap({
  catalog,
  state,
  trackId,
  selectedPaper = "all",
}: LearningProps & { trackId: TrackId; selectedPaper?: string }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage | "all">("all");
  const [paper, setPaper] = useState(selectedPaper);
  const [incomplete, setIncomplete] = useState(false);
  const track = catalog.tracks.find((item) => item.trackId === trackId)!;
  const foundation = catalog.tracks.find(
    (item) => item.trackId === "foundation",
  )!;
  const meta = trackMeta[trackId];
  const eligibleModules = track.modules.filter(
    (module) => eligibleLessons(module, paper).length > 0,
  );
  const lessons = track.modules.flatMap((module) =>
    eligibleLessons(module, paper),
  );
  const coreLessons = track.modules
    .filter((module) => !module.optional)
    .flatMap((module) =>
      eligibleLessons(module, paper).filter((lesson) => !lesson.optional),
    );
  const optionalCount = lessons.length - coreLessons.length;
  const completed = coreLessons.filter(
    (lesson) => state.lessons[lesson.id]?.manualCompletedAt,
  ).length;
  const matches = track.modules.filter(
    (module) =>
      (stage === "all" || module.stage === stage) &&
      (paper === "all" ||
        module.paperTags.some((tag) =>
          tag.toLowerCase().includes(paper.toLowerCase()),
        ) ||
        !module.paperTags.length) &&
      eligibleLessons(module, paper).length > 0 &&
      (!incomplete || !moduleComplete(module, state, paper)) &&
      `${module.title} ${module.description} ${module.lessons.map((lesson) => `${lesson.title} ${lesson.topics.map((topic) => `${topic.title} ${topic.details.join(" ")}`).join(" ")}`).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow={
          trackId === "foundation"
            ? "YOUR SHARED STARTING POINT"
            : `LEARNING PATH ${meta.code}`
        }
        title={meta.label}
        description={meta.description}
        actions={
          (trackId === "gate" || trackId === "cat") && (
            <a className="button primary" href={`#/practice/${trackId}`}>
              Timed practice <ArrowRight size={16} />
            </a>
          )
        }
      />
      <div className="path-overview panel">
        <div>
          <strong>
            {completed}
            <span> / {coreLessons.length}</span>
          </strong>
          <span>
            {optionalCount
              ? `core lessons · ${optionalCount} optional lessons separate`
              : "lessons complete"}
          </span>
        </div>
        <div>
          <Layers3 size={22} />
          <strong>{eligibleModules.length}</strong>
          <span>structured modules</span>
        </div>
        <div>
          <BookOpen size={22} />
          <strong>
            {Math.round(
              lessons.reduce(
                (total, lesson) => total + lesson.estimatedMinutes,
                0,
              ) / 60,
            )}
            h
          </strong>
          <span>
            {optionalCount
              ? "estimated, including optional lanes"
              : "estimated study, not a deadline"}
          </span>
        </div>
        <div className="overview-progress">
          <span>
            {Math.round((completed / coreLessons.length) * 100)}% of{" "}
            {optionalCount ? "the core path" : "this path"}
          </span>
          <ProgressBar
            value={(completed / coreLessons.length) * 100}
            label="Path completion"
          />
        </div>
      </div>
      {CAREER_TRACKS.includes(trackId) && (
        <div className="foundation-notice">
          <span className="path-monogram">01</span>
          <div>
            <strong>Common Foundation comes first</strong>
            <p>
              {
                foundation.modules.filter((module) =>
                  moduleComplete(module, state),
                ).length
              }{" "}
              of {foundation.modules.length} shared modules complete. One shared
              set of lessons supports every career path, never four separate
              copies.
            </p>
          </div>
          <a className="button secondary small" href="#/path/foundation">
            View foundation <ArrowRight size={15} />
          </a>
        </div>
      )}
      {(trackId === "gate" || trackId === "cat") && (
        <div className="notice info">
          <strong>
            {track.edition ||
              (trackId === "gate"
                ? "CS/IT and DA: verify your paper edition"
                : "Preparation coverage, not an exhaustive official syllabus")}
          </strong>
          <p>
            Sources checked {track.sourceCheckedOn}.{" "}
            {trackId === "cat"
              ? "VARC, DILR and QA topic groupings are preparation inferences. Official notifications and mock instructions govern the exam format."
              : "Select the paper you intend to take. Shared mathematics is reused; paper-specific topics stay clearly labelled."}
          </p>
        </div>
      )}
      <div className="filter-bar">
        <label className="search-input">
          <Search size={18} />
          <span className="sr-only">Search this path</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a concept, topic or lesson..."
          />
        </label>
        <label>
          <span className="sr-only">Learning stage</span>
          <select
            value={stage}
            onChange={(event) => setStage(event.target.value as Stage | "all")}
          >
            <option value="all">All stages</option>
            <option value="foundation">Foundations</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="professional">Professional</option>
          </select>
        </label>
        {(trackId === "gate" || trackId === "cat") && (
          <label>
            <span className="sr-only">
              {trackId === "gate" ? "GATE paper" : "CAT section"}
            </span>
            <select
              value={paper}
              onChange={(event) => {
                setPaper(event.target.value);
                window.history.replaceState(
                  null,
                  "",
                  `#/path/${trackId}${event.target.value === "all" ? "" : `?paper=${event.target.value}`}`,
                );
              }}
            >
              <option value="all">
                {trackId === "gate" ? "Both papers" : "All sections"}
              </option>
              {(trackId === "gate" ? ["CS", "DA"] : ["VARC", "DILR", "QA"]).map(
                (name) => (
                  <option key={name}>{name}</option>
                ),
              )}
            </select>
          </label>
        )}
        <label className="check-label">
          <input
            type="checkbox"
            checked={incomplete}
            onChange={(event) => setIncomplete(event.target.checked)}
          />
          Incomplete only
        </label>
      </div>
      <div className="roadmap-list">
        {matches.map((module) => {
          const blocked = unmetRequirements(catalog, module, state, paper);
          const units = eligibleLessons(module, paper);
          const coreUnits = units.filter((lesson) => !lesson.optional);
          const done = coreUnits.filter(
            (lesson) => state.lessons[lesson.id]?.manualCompletedAt,
          ).length;
          const number = track.modules.indexOf(module) + 1;
          return (
            <details
              className="module-card"
              key={module.id}
              open={query ? true : undefined}
            >
              <summary>
                <span
                  className={`module-number ${done === coreUnits.length ? "done" : ""}`}
                >
                  {String(number).padStart(2, "0")}
                </span>
                <span className="module-summary">
                  <span className="inline-meta">
                    <span className="stage-badge">{module.stage}</span>
                    {module.optional && (
                      <span className="subtle-pill">
                        Optional specialist lane
                      </span>
                    )}
                    {units.length !== coreUnits.length && (
                      <span className="subtle-pill">
                        {units.length - coreUnits.length} optional /
                        project-specific lessons
                      </span>
                    )}
                    {module.paperTags.map((tag) => (
                      <span className="subtle-pill" key={tag}>
                        {tag}
                      </span>
                    ))}
                    {blocked.length > 0 && (
                      <span className="muted">
                        {blocked.length} prerequisite module
                        {blocked.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </span>
                  <h2>{module.title}</h2>
                  <span className="muted">{module.description}</span>
                </span>
                <span className="module-count">
                  {done}/{coreUnits.length}
                  <small>
                    {units.length === coreUnits.length
                      ? "lessons"
                      : "core lessons"}
                  </small>
                </span>
                <ChevronDown className="disclosure-chevron" size={20} />
              </summary>
              <div className="module-body">
                {blocked.length > 0 && (
                  <div className="prerequisite-list">
                    <strong>Recommended first</strong>
                    <span>{blocked.map((item) => item.title).join(" · ")}</span>
                    <small>
                      You can preview any lesson. Prerequisites guide the
                      recommended order; completion is recorded only with your
                      evidence.
                    </small>
                  </div>
                )}
                {units.map((lesson) => (
                  <div className="roadmap-lesson" key={lesson.id}>
                    <StatusIcon
                      complete={Boolean(
                        state.lessons[lesson.id]?.manualCompletedAt,
                      )}
                    />
                    <div>
                      <PathLink id={lesson.id} paper={paper}>
                        <h3>{lesson.title}</h3>
                      </PathLink>
                      <div className="inline-meta">
                        <span>
                          {minutesLabel(lesson.estimatedMinutes)} estimated
                        </span>
                        {lesson.optional && (
                          <span className="subtle-pill">
                            Optional / project-specific
                          </span>
                        )}
                        <span>{lesson.topics.length} concept groups</span>
                        <span>Watch · Read · Build · Reflect</span>
                      </div>
                      {unmetLessonRequirements(catalog, lesson, state).length >
                        0 && (
                        <p className="quiet-note">
                          First:{" "}
                          {unmetLessonRequirements(catalog, lesson, state)
                            .map((item) => item.title)
                            .join(" · ")}
                        </p>
                      )}
                      <details className="concept-preview">
                        <summary>Explore concepts</summary>
                        <ul>
                          {lesson.topics.map((topic) => (
                            <li key={topic.title}>
                              <strong>{topic.title}</strong>
                              <ul>
                                {topic.details.map((detail) => (
                                  <li key={detail}>{detail}</li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                    <PathLink
                      className="round-button"
                      id={lesson.id}
                      paper={paper}
                    >
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
      {!matches.length && (
        <EmptyState title="No lessons match these filters">
          Try another concept or include all stages.
        </EmptyState>
      )}
      {track.guidance && Object.keys(track.guidance).length > 0 && (
        <details className="panel provenance">
          <summary>
            Study guide & detailed edition evidence <ChevronDown size={18} />
          </summary>
          <p>
            These are the researched curriculum's planning and assessment notes,
            not automatic completion rules or a commitment to a dated exam plan.
            Set your own goals in the calendar. Suggested self-review thresholds
            do not establish independently verified mastery.
          </p>
          <Guidance value={track.guidance} />
        </details>
      )}
      <details className="panel provenance">
        <summary>
          Sources, edition notes & limitations <ChevronDown size={18} />
        </summary>
        <p>
          Catalog version {catalog.version}. Research checked{" "}
          {track.sourceCheckedOn}. Resources may change; official sources remain
          authoritative.
        </p>
        <ul>
          {track.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
        <div className="source-links">
          {track.sources.map((source) => (
            <External key={source.url + source.title} href={source.url}>
              {source.title}
            </External>
          ))}
        </div>
      </details>
    </>
  );
}
