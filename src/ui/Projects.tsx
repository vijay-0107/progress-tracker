import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FolderGit2,
  LockKeyhole,
  Save,
} from "lucide-react";
import {
  findLesson,
  findModule,
  moduleComplete,
  trackMeta,
} from "../content/catalog";
import { recordActivity } from "../domain/progress";
import type { Project, ProjectProgress, TrackId } from "../domain/types";
import type { LearningProps } from "./shared";
import {
  EmptyState,
  External,
  PageHeading,
  ProgressBar,
  TrackBadge,
} from "./shared";

function projectBlocked(project: Project, props: LearningProps) {
  const foundation = props.catalog.tracks.find(
    (track) => track.trackId === "foundation",
  )!.modules;
  return [
    ...new Map(
      [
        ...foundation,
        ...project.prerequisites
          .map((id) => findModule(props.catalog, id))
          .filter((module) => module !== undefined),
      ].map((module) => [module.id, module]),
    ).values(),
  ].filter((module) => !moduleComplete(module, props.state));
}

function projectLessonRequirements(project: Project, props: LearningProps) {
  return (project.prerequisiteLessons || [])
    .map((id) => findLesson(props.catalog, id)?.lesson)
    .filter(
      (lesson) => lesson && !props.state.lessons[lesson.id]?.manualCompletedAt,
    );
}

export function Projects(props: LearningProps) {
  const { catalog, state } = props;
  const [track, setTrack] = useState<TrackId | "all">("all");
  const [variant, setVariant] = useState("all");
  const visible = catalog.projects.filter(
    (project) =>
      (track === "all" || project.tracks.includes(track)) &&
      (variant === "all" || project.variant === variant),
  );
  return (
    <>
      <PageHeading
        eyebrow="TURN KNOWLEDGE INTO EVIDENCE"
        title="Build something that holds up."
        description="A portfolio is not a list of tools. It is a collection of things you can run, test, explain and improve."
      />
      <div className="project-summary">
        <span>
          <strong>8</strong> college reconstructions
        </span>
        <span>
          <strong>12</strong> advanced future builds
        </span>
        <span>
          <strong>1</strong> shared synthetic work recreation
        </span>
      </div>
      <div className="notice info">
        <strong>Past work and current evidence are different.</strong>
        <p>
          A projects were user-reported as completed in college, but the files
          were lost. These are new reconstructions starting incomplete. B
          projects are future work. No results, dates or completion claims are
          fabricated.
        </p>
      </div>
      <div className="filter-bar">
        <label>
          Career path
          <select
            value={track}
            onChange={(event) =>
              setTrack(event.target.value as TrackId | "all")
            }
          >
            <option value="all">All career paths</option>
            {(["data", "sde", "quant", "ai"] as TrackId[]).map((id) => (
              <option value={id} key={id}>
                {trackMeta[id].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Project type
          <select
            value={variant}
            onChange={(event) => setVariant(event.target.value)}
          >
            <option value="all">All project types</option>
            <option value="A-rebuild">A · Reconstruction</option>
            <option value="B-build">B · Advanced build</option>
            <option value="professional-synthetic-recreation">
              Synthetic work recreation
            </option>
          </select>
        </label>
      </div>
      <div className="project-grid">
        {visible.map((project) => {
          const done = state.projects[project.id]?.milestones.length || 0;
          const blocked = [
            ...projectBlocked(project, props),
            ...projectLessonRequirements(project, props),
          ];
          return (
            <article className="panel project-card" key={project.id}>
              <div className="project-card-top">
                <span
                  className={`project-type ${project.variant === "B-build" ? "advanced" : ""}`}
                >
                  {project.variant === "A-rebuild"
                    ? "A / RECONSTRUCT"
                    : project.variant === "B-build"
                      ? "B / BUILD NEXT"
                      : "SHARED / SYNTHETIC"}
                </span>
                <FolderGit2 size={22} />
              </div>
              <div className="inline-meta">
                {project.tracks.map((id) => (
                  <TrackBadge id={id} key={id} />
                ))}
              </div>
              <h2>
                <a href={`#/project/${project.id}`}>{project.title}</a>
              </h2>
              <p>{project.summary}</p>
              <div className="project-card-footer">
                <ProgressBar
                  value={(done / project.milestones.length) * 100}
                  label={`${project.title} milestones`}
                />
                <div className="inline-meta">
                  <span>
                    {done}/{project.milestones.length} evidence gates
                  </span>
                  {blocked.length > 0 && (
                    <span>
                      <LockKeyhole size={13} />
                      Prerequisites first
                    </span>
                  )}
                </div>
                <a className="arrow-link" href={`#/project/${project.id}`}>
                  Explore the build <ArrowRight size={16} />
                </a>
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <EmptyState title="No projects in this filter">
          Try another career path or project type.
        </EmptyState>
      )}
    </>
  );
}

export function ProjectPage(props: LearningProps & { id: string }) {
  const { catalog, state, mutate, notify, id } = props;
  const project = catalog.projects.find((item) => item.id === id);
  const saved: ProjectProgress = state.projects[id] || {
    id,
    updatedAt: new Date().toISOString(),
    milestones: [],
    evidence: "",
  };
  const [evidence, setEvidence] = useState(saved.evidence);
  if (!project)
    return (
      <EmptyState title="Project not found">
        Open the project library for the current build briefs.
      </EmptyState>
    );
  const blocked = projectBlocked(project, props);
  const missingLessons = projectLessonRequirements(project, props);
  const change = (milestoneId?: string) => {
    if (milestoneId && evidence.trim().length < 30) {
      notify(
        "Add meaningful project evidence (at least 30 characters) before recording a gate.",
      );
      return;
    }
    const now = new Date().toISOString();
    if (
      mutate((current) => {
        const prior = current.projects[id] || saved;
        if (milestoneId && prior.milestones.includes(milestoneId))
          return current;
        const milestones =
          milestoneId && !prior.milestones.includes(milestoneId)
            ? [...prior.milestones, milestoneId]
            : prior.milestones;
        const next = {
          ...current,
          updatedAt: now,
          projects: {
            ...current.projects,
            [id]: { id, updatedAt: now, milestones, evidence },
          },
        };
        return milestoneId
          ? recordActivity(next, {
              id: `project-${milestoneId}`,
              at: now,
              updatedAt: now,
              timezone: current.settings.timezone,
              kind: "project",
              entityId: id,
              minutes: 0,
              detail: `Evidence gate completed: ${project.milestones.find((item) => item.id === milestoneId)?.title}`,
            })
          : next;
      })
    )
      notify(
        milestoneId
          ? "Project evidence gate recorded as self-reported."
          : "Project evidence saved.",
      );
  };
  return (
    <>
      <div className="breadcrumb">
        <a href="#/projects">
          <ArrowLeft size={14} />
          Project library
        </a>
      </div>
      <PageHeading
        eyebrow={
          project.variant === "A-rebuild"
            ? "A / RECONSTRUCTION"
            : project.variant === "B-build"
              ? "B / FUTURE BUILD"
              : "ONE SHARED SYNTHETIC RECREATION"
        }
        title={project.title}
        description={project.summary}
      />
      <div className="project-detail-grid">
        <div>
          <section className="panel lesson-section">
            <h2>A bounded, honest scope</h2>
            <p>{project.scope}</p>
            <div className="notice info">{project.historicalNote}</div>
            <h3>Build within these boundaries</h3>
            <ul>
              {project.safety.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="section-block">
            <div className="section-title">
              <h2>Four gates. Real evidence.</h2>
              <span>
                {saved.milestones.length}/{project.milestones.length} complete
              </span>
            </div>
            {project.milestones.map((milestone, index) => {
              const done = saved.milestones.includes(milestone.id);
              const priorDone = project.milestones
                .slice(0, index)
                .every((item) => saved.milestones.includes(item.id));
              return (
                <details
                  className="panel milestone"
                  key={milestone.id}
                  open={index === saved.milestones.length}
                >
                  <summary>
                    <span className={`module-number ${done ? "done" : ""}`}>
                      {done ? <Check size={18} /> : index + 1}
                    </span>
                    <h3>{milestone.title}</h3>
                    <ChevronDown size={19} />
                  </summary>
                  <div className="milestone-body">
                    <h4>Deliverables</h4>
                    <ul>
                      {milestone.deliverables.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <h4>Acceptance checks</h4>
                    <ul>
                      {milestone.acceptanceCriteria.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <button
                      className="button primary"
                      disabled={
                        done ||
                        !priorDone ||
                        blocked.length > 0 ||
                        missingLessons.length > 0
                      }
                      onClick={() => change(milestone.id)}
                    >
                      <Check size={16} />
                      {done
                        ? "Gate recorded"
                        : "I have evidence for these checks"}
                    </button>
                    {!done &&
                      (blocked.length > 0 ||
                        missingLessons.length > 0 ||
                        !priorDone) && (
                        <p className="quiet-note">
                          {blocked.length > 0 || missingLessons.length > 0
                            ? "Complete the learning prerequisites before recording this project gate."
                            : "Finish the previous gate first; correctness comes before claims."}
                        </p>
                      )}
                  </div>
                </details>
              );
            })}
          </section>
          <section className="panel lesson-section">
            <h2>Your evidence package</h2>
            <p>
              Keep a reproducible repository, licensed fixtures, tests, a
              failure demo and measurements you actually ran. Link sanitized
              public artifacts or keep a private plain-text record.
            </p>
            <label className="field-label">
              Project evidence
              <textarea
                rows={8}
                maxLength={12000}
                value={evidence}
                onChange={(event) => setEvidence(event.target.value)}
                placeholder="Repository or local artifact locations, design decisions, test commands, actual results and limitations..."
              />
            </label>
            <button className="button secondary" onClick={() => change()}>
              <Save size={16} />
              Save project evidence
            </button>
          </section>
        </div>
        <aside>
          <section className="panel lesson-section">
            <p className="eyebrow">LEARN BEFORE YOU BUILD</p>
            <h3>
              {blocked.length || missingLessons.length
                ? `${blocked.length} prerequisite modules${missingLessons.length ? ` + ${missingLessons.length} focused lessons` : ""} remain`
                : "Your prerequisites are complete"}
            </h3>
            {blocked.length > 0 || missingLessons.length > 0 ? (
              <ul className="compact-list">
                {blocked.map((module) => (
                  <li key={module.id}>
                    <a href={`#/lesson/${module.lessons[0].id}`}>
                      {module.title}
                    </a>
                  </li>
                ))}
                {missingLessons.map(
                  (lesson) =>
                    lesson && (
                      <li key={lesson.id}>
                        <a href={`#/lesson/${lesson.id}`}>{lesson.title}</a>
                      </li>
                    ),
                )}
              </ul>
            ) : (
              <p>
                You can start the design and fixtures gate. Completion does not
                guarantee production readiness or employment.
              </p>
            )}
            <p className="quiet-note">
              Foundation progress is shared across all projects. The Fabric
              recreation is counted once, even though it supports four paths.
            </p>
          </section>
          <section className="panel lesson-section">
            <h3>Implementation references</h3>
            <div className="source-links">
              {project.sources.map((source) => (
                <External href={source.url} key={source.url}>
                  {source.title}
                </External>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
