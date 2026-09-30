import { ArrowRight } from "lucide-react";
import { advancedLessons, advancedPaths } from "../content/advanced-careers";
import { lessonCompletion } from "../content/catalog";
import { readinessCount } from "../domain/careers";
import { ProgressBar, type LearningProps } from "./shared";

export function TechnologyLinks({ names }: { names: string[] }) {
  return (
    <div className="technology-links" aria-label="Languages and technologies">
      {names.map((name) => (
        <a key={name} href={`#/search?q=${encodeURIComponent(name)}`}>
          {name}
        </a>
      ))}
    </div>
  );
}

export function CareerPathCards({
  catalog,
  state,
}: Pick<LearningProps, "catalog" | "state">) {
  return (
    <section className="section-block" aria-labelledby="six-career-paths">
      <div className="section-title">
        <div>
          <p className="eyebrow">SIX CAREER PATHS. FOUR STAGES EACH.</p>
          <h2 id="six-career-paths">Six Career Paths</h2>
        </div>
        <a className="arrow-link" href="#/careers">
          All requirements <ArrowRight size={16} />
        </a>
      </div>
      <p className="muted">
        114 required skill groups and 24 distinct advanced targets. Start with{" "}
        <a className="text-link" href="#/path/foundation">
          Common Foundation
        </a>
        , then{" "}
        <a className="text-link" href="#/path/systems-languages">
          Shared Systems &amp; Languages
        </a>
        . Original courses and exams remain available below.
      </p>
      <div className="career-grid">
        {advancedPaths.map((path) => {
          const learning = lessonCompletion(
            advancedLessons(catalog, path),
            state,
          );
          const ready = path.projectIds.reduce(
            (sum, id) => sum + readinessCount(state, id),
            0,
          );
          return (
            <article
              className="panel career-card"
              key={path.id}
              data-career-path={path.id}
            >
              <span className="subtle-pill">
                Path {path.number} · 19 required groups
              </span>
              <h3>
                <a href={`#/career/${path.id}`}>{path.title}</a>
              </h3>
              <TechnologyLinks names={path.technologies} />
              <ProgressBar
                value={learning.percent}
                label={`${path.title} mapped learning`}
              />
              <p className="small-text">
                {learning.completed}/{learning.total} unique mapped lessons
                recorded
              </p>
              <p className="small-text">
                4 advanced targets · {ready}/16 independent readiness records
              </p>
              <a
                className="button secondary small"
                href={`#/career/${path.id}`}
              >
                Open path {path.number} <ArrowRight size={16} />
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
