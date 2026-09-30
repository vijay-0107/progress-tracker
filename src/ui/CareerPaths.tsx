import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  advancedGroupRecorded,
  advancedLessons,
  advancedTargets,
  advancedProjectLanguageLessons,
  comparisonTechnologies,
  findAdvancedPath,
} from "../content/advanced-careers";
import { lessonCompletion } from "../content/catalog";
import {
  lessonTitle,
  preparationStageLabels,
  readinessCount,
} from "../domain/careers";
import { LEARNING_STAGES, type Stage } from "../domain/types";
import {
  EmptyState,
  PageHeading,
  PathLink,
  ProgressBar,
  type LearningProps,
} from "./shared";
import { CareerPathCards, TechnologyLinks } from "./CareerPathCards";

export function CareerPaths(props: LearningProps) {
  return (
    <>
      <PageHeading
        eyebrow="REQUIRED DEPTH. CANONICAL LEARNING."
        title="Career Paths"
        description="Six visible routes from foundations to professional practice, with every requested skill and four advanced targets per domain."
      />
      <div className="notice info">
        <strong>
          Learning, reference implementation and independent readiness are
          different.
        </strong>
        <p>
          A reviewed reference or passing benchmark never completes your lessons
          or readiness. Hardware-dependent work has explicit prerequisites, not
          a pretend CPU substitute. Choosing a path changes neither your saved
          core focus nor your goals.
        </p>
      </div>
      <CareerPathCards {...props} />
      <section
        className="panel lesson-section section-block"
        aria-label="Version and technology context"
      >
        <h2>Version and technology context</h2>
        {comparisonTechnologies.map((context) => (
          <div key={context.id}>
            <h3>{context.label}</h3>
            <p>{context.sourceContext}</p>
            <p>{context.scopeNote}</p>
            <ul>
              {context.lessonIds.map((id) => (
                <li key={id}>
                  <PathLink id={id}>{lessonTitle(props.catalog, id)}</PathLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <section className="panel lesson-section section-block">
        <h2>Your earlier learning is preserved</h2>
        <p>
          The original 371 lessons, 26 projects, 104 build gates and 40
          independent readiness records retain their identities and evidence.
          The earlier preparation maps remain available with their original,
          narrower scope.
        </p>
        <a className="button secondary" href="#/preparation">
          Earlier preparation maps
        </a>
      </section>
    </>
  );
}

export function CareerPathPage(
  props: LearningProps & { id: string; selectedStage?: Stage | "all" },
) {
  const { catalog, state } = props;
  const path = findAdvancedPath(props.id);
  const [stage, setStage] = useState<Stage | "all">(
    props.selectedStage || "all",
  );
  const [query, setQuery] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  useEffect(
    () => setStage(props.selectedStage || "all"),
    [props.selectedStage],
  );
  if (!path)
    return (
      <EmptyState
        title="Career path not found"
        action={<a href="#/careers">Open Career Paths</a>}
      >
        Your learning records have not changed.
      </EmptyState>
    );
  const learning = lessonCompletion(advancedLessons(catalog, path), state);
  const queryText = query.trim().toLowerCase();
  const visible = path.stages
    .filter((item) => stage === "all" || item.stage === stage)
    .map((item) => ({
      ...item,
      groups: item.groups.filter(
        (group) =>
          (!missingOnly || !advancedGroupRecorded(state, group.lessonIds)) &&
          `${group.label} ${group.requestedDescription} ${group.capabilities.map((capability) => capability.label).join(" ")}`
            .toLowerCase()
            .includes(queryText),
      ),
    }));
  return (
    <>
      <div className="breadcrumb">
        <a href="#/careers">
          <ArrowLeft size={14} />
          Career Paths
        </a>
      </div>
      <PageHeading
        eyebrow={`CAREER PATH ${path.number} / FOUR REQUIRED STAGES`}
        title={path.title}
        description={path.summary}
      />
      <TechnologyLinks names={path.technologies} />
      <div className="button-row section-block">
        <a className="button primary" href={`#/path/${path.courseId}`}>
          Domain lessons <ArrowRight size={16} />
        </a>
        <a className="button secondary" href="#/path/systems-languages">
          Shared Systems &amp; Languages
        </a>
        <a
          className="button secondary"
          href={`#/career/${path.id}?view=earlier`}
        >
          Earlier preparation
        </a>
      </div>
      <div className="notice info">
        <p>
          <strong>
            {learning.completed}/{learning.total} unique mapped lessons
            recorded.
          </strong>{" "}
          Canonical lessons are shared across requirements without duplicate
          credit. Learning and independent readiness are self-reported, not
          certification or guaranteed employment.
        </p>
        <p>
          Required language/tool depth is not an optional later specialization.
          You can study and save drafts before a compatible runtime is
          available; an unexecuted hardware or integration requirement remains
          incomplete. Numerical scope requirements are targets, not measured
          results unless a reviewed reference explicitly states its actual
          workload and limitations.
        </p>
      </div>
      <section
        className="panel lesson-section section-block"
        aria-label="Required project languages"
      >
        <h2>Language preparation for these four projects</h2>
        <p>
          These are required named-runtime prerequisites, shared once across
          projects. Their availability or an earlier simpler implementation does
          not complete an advanced gate. Stage progress follows the exact skill
          groups below; advanced project prerequisites are not counted as
          beginner lessons merely because they are listed here.
        </p>
        <ul className="compact-list">
          {[
            ...new Set(path.projectIds.flatMap(advancedProjectLanguageLessons)),
          ].map((id) => (
            <li key={id}>
              <PathLink id={id}>{lessonTitle(catalog, id)}</PathLink>
            </li>
          ))}
        </ul>
      </section>
      <section className="stage-cards" aria-label="Required career stages">
        {path.stages.map((item) => {
          const progress = lessonCompletion(
            advancedLessons(catalog, path, item.stage),
            state,
          );
          return (
            <article className="panel stage-card" key={item.stage}>
              <h2>{preparationStageLabels[item.stage]}</h2>
              <p>{item.outcome}</p>
              <p>
                <strong>Evidence:</strong> {item.evidence}
              </p>
              <ProgressBar
                value={progress.percent}
                label={`${preparationStageLabels[item.stage]} required learning`}
              />
              <p>
                {progress.completed}/{progress.total} mapped lessons ·{" "}
                {item.groups.length} required groups
              </p>
              <button
                className="button secondary small"
                aria-pressed={stage === item.stage}
                onClick={() => {
                  setStage(item.stage);
                  setQuery("");
                  setMissingOnly(false);
                }}
              >
                Show {preparationStageLabels[item.stage]}
              </button>
            </article>
          );
        })}
      </section>
      <div className="filter-bar career-filters">
        <label>
          Required stage
          <select
            value={stage}
            aria-label="Required stage"
            onChange={(event) => {
              const value = event.target.value;
              if (
                value === "all" ||
                LEARNING_STAGES.some((item) => item === value)
              )
                setStage(value as Stage | "all");
            }}
          >
            <option value="all">All required stages</option>
            {LEARNING_STAGES.map((value) => (
              <option key={value} value={value}>
                {preparationStageLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Find a required skill
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rust, ownership, SQL, FinOps..."
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(event) => setMissingOnly(event.target.checked)}
          />
          Missing lesson evidence only
        </label>
      </div>
      <section aria-label="Exact required skill groups">
        {visible.map(
          (item) =>
            item.groups.length > 0 && (
              <section className="section-block" key={item.stage}>
                <h2>{preparationStageLabels[item.stage]} requirements</h2>
                <div className="career-grid">
                  {item.groups.map((group) => (
                    <article
                      className="panel career-card required-skill"
                      key={group.id}
                      data-skill-group={group.id}
                    >
                      <span className="stage-badge">Required learning</span>
                      <h3>{group.label}</h3>
                      <p>{group.requestedDescription}</p>
                      <p className="small-text">
                        {advancedGroupRecorded(state, group.lessonIds)
                          ? "All mapped lesson records present (self-reported)."
                          : "Mapped lesson evidence is not yet complete."}
                      </p>
                      <ul className="compact-list">
                        {group.lessonIds.map((id) => (
                          <li key={id}>
                            <PathLink id={id}>
                              {lessonTitle(catalog, id)}
                            </PathLink>
                          </li>
                        ))}
                      </ul>
                      <details>
                        <summary>
                          Named capabilities and teaching map (
                          {group.capabilities.length})
                        </summary>
                        <ul className="capability-map">
                          {group.capabilities.map((capability) => (
                            <li key={capability.id}>
                              <strong>{capability.label}</strong>
                              <ul>
                                {capability.lessonIds.map((id) => (
                                  <li key={id}>
                                    <PathLink id={id}>
                                      {lessonTitle(catalog, id)}
                                    </PathLink>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </details>
                      <details>
                        <summary>
                          Genuine overlap with the earlier curriculum
                        </summary>
                        <p>
                          Earlier audit: {group.priorCoverage}. This describes
                          the older curriculum, not a learner's ability or the
                          new reference status.
                        </p>
                        <p>{group.overlapNote}</p>
                      </details>
                    </article>
                  ))}
                </div>
              </section>
            ),
        )}
        {!visible.some((item) => item.groups.length) && (
          <EmptyState title="No required groups in this filter">
            Try another stage or skill. Filters do not change your records.
          </EmptyState>
        )}
      </section>
      <section className="section-block" aria-label="Four advanced targets">
        <div className="section-title">
          <h2>Four distinct advanced targets</h2>
          <a className="arrow-link" href={`#/projects?career=${path.id}`}>
            Open target studio <ArrowRight size={16} />
          </a>
        </div>
        <div className="career-grid">
          {path.projectIds.map((id) => {
            const target = advancedTargets.find((item) => item.id === id)!;
            const project = catalog.projects.find((item) => item.id === id)!;
            const built = project.milestones.filter((gate) =>
              state.projects[id]?.milestones.includes(gate.id),
            ).length;
            return (
              <article
                className="panel career-card advanced-target-card"
                key={id}
                data-target-number={target.number}
              >
                <span className="stage-badge">
                  Advanced target {target.number} / 24
                </span>
                <h3>
                  <a href={`#/project/${id}`}>{target.title}</a>
                </h3>
                <p>
                  {built}/4 new build gates · {readinessCount(state, id)}/4
                  independent readiness records
                </p>
                <p>
                  <strong>{target.referenceLabel}</strong>
                </p>
                <p>{target.limitations[0]}</p>
                <a className="button secondary small" href={`#/project/${id}`}>
                  Requirements and practice <ArrowRight size={14} />
                </a>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
