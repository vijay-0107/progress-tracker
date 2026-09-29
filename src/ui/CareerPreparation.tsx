import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { careerProfiles } from "../content/careers";
import { careerPackets } from "../content/career-exercises";
import { lessonCompletion, requiredLessons } from "../content/catalog";
import {
  careerLessons,
  competencyEvidence,
  findCareer,
  findCareerPacket,
  lessonTitle,
  preparationStageLabels,
  readinessCount,
  readinessLabels,
  readinessRecorded,
  readinessRecordId,
  saveReadiness,
} from "../domain/careers";
import type {
  CareerProjectPacket,
  ReadinessGate,
  Stage,
} from "../domain/types";
import { LEARNING_STAGES, READINESS_GATES } from "../domain/types";
import {
  EmptyState,
  External,
  PageHeading,
  PathLink,
  ProgressBar,
  type LearningProps,
} from "./shared";

export function CareerHub({ catalog, state }: LearningProps) {
  const pm = catalog.tracks.find(
    (track) => track.trackId === "technical-product-management",
  )!;
  const pmProgress = lessonCompletion(requiredLessons(pm), state);
  return (
    <>
      <PageHeading
        eyebrow="ONE FOUNDATION. SIX PREPARATION MAPS."
        title="Career Preparation"
        description="Follow an evidence-based path from Beginner to Professional Practice without duplicating lessons or resetting your progress."
      />
      <div className="notice info">
        <strong>
          Learning, implementations and independent readiness are different.
        </strong>
        <p>
          Profiles reuse canonical lessons and shared projects. Recorded
          learning and readiness are self-reported, not certification,
          guaranteed employment or independently verified professional mastery.
        </p>
        <p>
          Choosing a profile does not change your saved core focus or goals.{" "}
          <a href="#/path/foundation">Common Foundation</a> remains the shared
          starting point.
        </p>
      </div>
      <div className="career-grid">
        {careerProfiles.map((profile) => {
          const progress = lessonCompletion(
            careerLessons(catalog, profile),
            state,
          );
          const ready = profile.projectIds.reduce(
            (sum, id) => sum + readinessCount(state, id),
            0,
          );
          return (
            <article className="panel career-card" key={profile.id}>
              <span className="subtle-pill">Four preparation stages</span>
              <h2>
                <a href={`#/career/${profile.id}`}>{profile.title}</a>
              </h2>
              <p>{profile.summary}</p>
              <ProgressBar
                value={progress.percent}
                label={`${profile.title} mapped lesson evidence`}
              />
              <p className="small-text">
                {progress.completed}/{progress.total} unique mapped lessons
                recorded
              </p>
              <p className="small-text">
                {ready}/12 independent readiness gates recorded across three
                shared projects
              </p>
              <a className="arrow-link" href={`#/career/${profile.id}`}>
                Explore preparation <ArrowRight size={16} />
              </a>
            </article>
          );
        })}
      </div>
      <section
        className="panel lesson-section section-block"
        aria-labelledby="pm-curriculum"
      >
        <h2 id="pm-curriculum">
          New optional curriculum: Technical Product Management
        </h2>
        <p>
          16 original reading-led lessons in discovery, PRDs, instrumentation,
          experiment validity, unit economics and responsible launch decisions.
          The original 355 lessons and five Extra Topics are unchanged.
        </p>
        <p>
          {pmProgress.completed}/16 PM lessons recorded, separately from core
          and original Extra Topics totals.
        </p>
        <a
          className="button primary"
          href="#/path/technical-product-management"
        >
          Open PM curriculum <ArrowRight size={16} />
        </a>
      </section>
    </>
  );
}

export function CareerProfilePage(props: LearningProps & { id: string }) {
  const { catalog, state, id } = props;
  const profile = findCareer(id);
  const [stage, setStage] = useState<Stage | "all">("all");
  const [missingOnly, setMissingOnly] = useState(false);
  const [query, setQuery] = useState("");
  if (!profile)
    return (
      <EmptyState
        title="Career profile not found"
        action={<a href="#/careers">Open Career Preparation</a>}
      >
        Your existing learning records have not changed.
      </EmptyState>
    );
  const progress = lessonCompletion(careerLessons(catalog, profile), state);
  const queryText = query.trim().toLowerCase();
  const stages = profile.stages.filter(
    (item) => stage === "all" || item.stage === stage,
  );
  let visibleSkills = 0;
  return (
    <>
      <div className="breadcrumb">
        <a href="#/careers">
          <ArrowLeft size={14} />
          Career Preparation
        </a>
      </div>
      <PageHeading
        eyebrow="PREPARATION, NOT A CREDENTIAL"
        title={profile.title}
        description={profile.summary}
      />
      <div className="notice info">
        <p>
          <strong>
            {progress.completed}/{progress.total} unique mapped lessons
            recorded.
          </strong>{" "}
          One canonical lesson can support several competencies without earning
          duplicate credit. Core progress, the original Extra Topics and project
          totals remain separate.
        </p>
        <p>
          A missing record means evidence is not yet recorded here, not that you
          lack the skill. Conceptual coverage is labelled; reference
          implementations never grant learner readiness.
        </p>
        <a href="#/path/foundation">Review the shared Common Foundation</a>
      </div>
      <section aria-label="Career preparation stages" className="stage-cards">
        {profile.stages.map((item) => {
          const value = lessonCompletion(
            careerLessons(catalog, profile, item.stage),
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
                value={value.percent}
                label={`${preparationStageLabels[item.stage]} mapped lessons`}
              />
              <p>
                {value.completed}/{value.total} mapped lesson records
              </p>
              <button
                className="button secondary small"
                aria-pressed={stage === item.stage}
                aria-controls="career-skills"
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
          Preparation stage
          <select
            aria-label="Preparation stage"
            value={stage}
            onChange={(event) => {
              const next = event.target.value;
              if (
                next === "all" ||
                LEARNING_STAGES.some((item) => item === next)
              )
                setStage(next as Stage | "all");
            }}
          >
            <option value="all">All stages</option>
            {LEARNING_STAGES.map((item) => (
              <option key={item} value={item}>
                {preparationStageLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Find a competency
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="For example: idempotency or ethics"
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(event) => setMissingOnly(event.target.checked)}
          />
          Evidence gaps only
        </label>
      </div>
      <section id="career-skills" aria-label="Competency evidence map">
        {stages.map((item) => {
          const skills = item.competencies.filter(
            (skill) =>
              (!missingOnly || competencyEvidence(state, skill).gap) &&
              `${skill.label} ${skill.coverageNote}`
                .toLowerCase()
                .includes(queryText),
          );
          visibleSkills += skills.length;
          if (!skills.length) return null;
          return (
            <section className="section-block" key={item.stage}>
              <h2>{preparationStageLabels[item.stage]} competencies</h2>
              <div className="career-grid">
                {skills.map((skill) => {
                  const evidence = competencyEvidence(state, skill);
                  return (
                    <article className="panel career-card" key={skill.id}>
                      <span className="stage-badge">
                        {skill.depth === "conceptual"
                          ? "Conceptual coverage - further practice needed"
                          : skill.depth === "applied-extension"
                            ? "Canonical learning + project exercise"
                            : "Canonical learning"}
                      </span>
                      <h3>{skill.label}</h3>
                      <p>{skill.coverageNote}</p>
                      <p className="small-text">
                        {evidence.lessonsRecorded
                          ? "Mapped lesson evidence recorded (self-reported)."
                          : "Mapped lesson evidence not yet recorded."}
                        {skill.exerciseIds.length > 0 &&
                          (evidence.practiceRecorded
                            ? " Linked practice recorded (self-reported)."
                            : " Linked practice not yet recorded.")}
                      </p>
                      <ul className="compact-list">
                        {skill.lessonIds.map((lessonId) => (
                          <li key={lessonId}>
                            <PathLink id={lessonId}>
                              {lessonTitle(catalog, lessonId)}
                            </PathLink>
                          </li>
                        ))}
                      </ul>
                      {skill.exerciseIds.map((exerciseId) => {
                        const packet = careerPackets.find((entry) =>
                          entry.exercises.some(
                            (exercise) => exercise.id === exerciseId,
                          ),
                        )!;
                        const exercise = packet.exercises.find(
                          (entry) => entry.id === exerciseId,
                        )!;
                        return (
                          <a
                            className="arrow-link"
                            key={exerciseId}
                            href={`#/project/${packet.projectId}?stage=${exercise.stage}`}
                          >
                            {exercise.title}
                            <ArrowRight size={14} />
                          </a>
                        );
                      })}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
        {!visibleSkills && (
          <EmptyState title="No competencies in this filter">
            Try another stage or search term. Filtering does not change your
            records.
          </EmptyState>
        )}
      </section>
      <section className="section-block" aria-label="Three career projects">
        <h2>Three projects. Shared identities, separate evidence.</h2>
        <div className="career-grid">
          {profile.projectIds.map((projectId) => {
            const packet = findCareerPacket(projectId)!;
            const project = catalog.projects.find(
              (item) => item.id === projectId,
            )!;
            const build = project.milestones.filter((item) =>
              state.projects[projectId]?.milestones.includes(item.id),
            ).length;
            return (
              <article className="panel career-card" key={projectId}>
                <h3>
                  <a href={`#/project/${projectId}`}>{packet.title}</a>
                </h3>
                <p>Learning target: {project.title}</p>
                <p>
                  {build}/4 build gates · {readinessCount(state, projectId)}/4
                  independent readiness gates
                </p>
                <p>
                  {packet.referenceStatus === "accepted-local-reference"
                    ? "Reviewed local reference; inspect its scope and exclusions."
                    : "Reference review pending; implementation claims are not yet available."}
                </p>
                <p>{packet.limitations[0]}</p>
                <a
                  className="button secondary small"
                  href={`#/project/${projectId}`}
                >
                  Project exercises <ArrowRight size={14} />
                </a>
              </article>
            );
          })}
        </div>
      </section>
      <section className="panel lesson-section section-block">
        <h2>Later specialization, not required readiness</h2>
        <ul>
          {profile.laterSpecializations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>
          These require additional depth or real-world evidence. The profile and
          local prototypes do not establish that experience.
        </p>
      </section>
    </>
  );
}

export function CareerReadiness(
  props: LearningProps & { projectId: string; selectedStage?: Stage | "all" },
) {
  const packet = findCareerPacket(props.projectId);
  const [stage, setStage] = useState<Stage | "all">(
    props.selectedStage || "all",
  );
  useEffect(() => {
    setStage(props.selectedStage || "all");
  }, [props.selectedStage]);
  if (!packet) return null;
  return (
    <section
      className="section-block career-practice"
      id={`career-exercises-${packet.projectId}`}
      tabIndex={-1}
      aria-label="Career exercises and independent readiness"
    >
      <h2>Career exercises and independent readiness</h2>
      <section className="panel lesson-section">
        <h3>Reference implementation: {packet.title}</h3>
        <span className="subtle-pill">
          {packet.referenceStatus === "accepted-local-reference"
            ? "Reviewed local reference"
            : "Reference review pending"}
        </span>
        {packet.coverage.length > 0 && (
          <>
            <h4>Covered capabilities</h4>
            <ul>
              {packet.coverage.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}
        <h4>Limits and remaining work</h4>
        <ul>
          {packet.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <External href={`https://github.com/vijay-0107/${packet.repository}`}>
          Private GitHub repository: {packet.repository}
        </External>
        <p className="quiet-note">
          Requires an authorized GitHub account. Tracker sign-in does not grant
          repository access. Nothing is fetched until you choose to open the
          link.
        </p>
      </section>
      <div className="notice info">
        <strong>
          {readinessCount(props.state, packet.projectId)}/4 independent
          readiness gates recorded
        </strong>
        <p>
          Explain, modify, debug, then test and defend your own work. These
          records never complete a lesson or build gate. Reviewed reference code
          and its tests do not establish your mastery.
        </p>
        <p>
          Exercises are original learning targets. If the reference lacks a
          feature, build and label a learner extension; do not claim it already
          exists. Practice self-checks use manual comparison, not automatic
          judging.
        </p>
      </div>
      <label className="field-label">
        Project exercise stage
        <select
          aria-label="Project exercise stage"
          value={stage}
          onChange={(event) => setStage(event.target.value as Stage | "all")}
        >
          <option value="all">All project stages</option>
          {LEARNING_STAGES.map((value) => (
            <option key={value} value={value}>
              {preparationStageLabels[value]}
            </option>
          ))}
        </select>
      </label>
      {packet.exercises.map((exercise, index) => (
        <article
          className="panel lesson-section section-block"
          hidden={stage !== "all" && stage !== exercise.stage}
          key={exercise.id}
          data-exercise-id={exercise.id}
        >
          <span className="stage-badge">
            {preparationStageLabels[exercise.stage]}
          </span>
          <h3>{exercise.title}</h3>
          <p>{exercise.objective}</p>
          <ul>
            {exercise.concepts.map((concept) => (
              <li key={concept}>{concept}</li>
            ))}
          </ul>
          <h4>Canonical preparation</h4>
          <ul className="compact-list">
            {exercise.lessonIds.map((id) => (
              <li key={id}>
                <PathLink id={id}>{lessonTitle(props.catalog, id)}</PathLink>
              </li>
            ))}
          </ul>
          <External href={exercise.reading.url}>
            {exercise.reading.title}
          </External>
          <p className="small-text">
            {exercise.reading.locator} Checked {exercise.reading.verifiedOn}.
            Free official reading; link only.
          </p>
          <h4>Your bounded assignment</h4>
          <ol>
            {exercise.instructions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <h4>Deliverables</h4>
          <ul>
            {exercise.deliverables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <details className="career-self-check">
            <summary>Practice self-check (manual comparison)</summary>
            <p>{exercise.selfCheck.prompt}</p>
            <p>
              <strong>Compare:</strong> {exercise.selfCheck.answer}
            </p>
            <p>{exercise.selfCheck.explanation}</p>
          </details>
          <ReadinessEditor
            key={`${props.state.ownerId}:${packet.projectId}:${READINESS_GATES[index]}`}
            {...props}
            packet={packet}
            gate={READINESS_GATES[index]}
            index={index}
          />
        </article>
      ))}
    </section>
  );
}

function ReadinessEditor(
  props: LearningProps & {
    packet: CareerProjectPacket;
    gate: ReadinessGate;
    index: number;
  },
) {
  const { state, mutate, notify, packet, gate, index } = props;
  const id = readinessRecordId(packet.projectId, gate);
  const saved = state.projects[id];
  const [evidence, setEvidence] = useState(saved?.evidence || "");
  const [baseVersion, setBaseVersion] = useState(saved?.updatedAt || null);
  const [dirty, setDirty] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const criteria = packet.exercises[index].acceptanceCriteria;
  const done = readinessRecorded(state, packet.projectId, gate);
  const blocked = READINESS_GATES.slice(0, index).some(
    (prior) => !readinessRecorded(state, packet.projectId, prior),
  );
  const stale = baseVersion !== (saved?.updatedAt || null);
  useEffect(() => {
    if (!dirty) {
      setEvidence(saved?.evidence || "");
      setBaseVersion(saved?.updatedAt || null);
    }
  }, [saved?.evidence, saved?.updatedAt, dirty]);
  function save(record: boolean) {
    let version = baseVersion;
    if (
      mutate((current) => {
        const next = saveReadiness(
          current,
          state.ownerId,
          packet.projectId,
          gate,
          evidence,
          record,
          criteria.every((item) => checked.includes(item)),
          undefined,
          baseVersion,
        );
        version = next.projects[id]?.updatedAt || null;
        return next;
      })
    ) {
      setDirty(false);
      setBaseVersion(version);
      notify(
        record
          ? `${readinessLabels[gate]} readiness recorded as self-reported independent practice. Build and lesson completion are unchanged.`
          : `${readinessLabels[gate]} evidence draft saved without completion credit.`,
      );
    }
  }
  return (
    <div className="readiness-editor" data-readiness-gate={gate}>
      <h4>{readinessLabels[gate]} readiness</h4>
      <p className="readiness-status">
        {done
          ? "Independent practice recorded (self-reported)."
          : "Not yet independently demonstrated."}
      </p>
      <div className="rubric-list">
        {criteria.map((criterion) => (
          <label className="check-label" key={criterion}>
            <input
              type="checkbox"
              checked={done || checked.includes(criterion)}
              disabled={done}
              onChange={(event) =>
                setChecked(
                  event.target.checked
                    ? [...checked, criterion]
                    : checked.filter((item) => item !== criterion),
                )
              }
            />
            {criterion}
          </label>
        ))}
      </div>
      <label className="field-label">
        Evidence for {readinessLabels[gate]}
        <textarea
          aria-label={`Evidence for ${readinessLabels[gate]}`}
          rows={5}
          maxLength={12000}
          value={evidence}
          onChange={(event) => {
            setEvidence(event.target.value);
            setDirty(true);
          }}
          placeholder={`Describe your own ${readinessLabels[gate].toLowerCase()} work, artifact, expected and observed result, and limitation. Keep private evidence here.`}
        />
      </label>
      <p className="quiet-note">
        Each gate keeps its own meaningful evidence (at least 30 characters). Do
        not paste an agent receipt or reuse another gate's explanation as proof
        of your own work.
      </p>
      {dirty && stale && (
        <div className="notice warning" role="alert">
          <p>
            Saved evidence changed while you were editing. Keep a copy of your
            draft before loading the latest saved version.
          </p>
          <button
            className="button secondary small"
            onClick={() => {
              if (
                window.confirm(
                  "Replace this unsaved readiness draft with the latest saved evidence? Copy your draft first if needed.",
                )
              ) {
                setEvidence(saved?.evidence || "");
                setBaseVersion(saved?.updatedAt || null);
                setDirty(false);
              }
            }}
          >
            Load latest saved evidence
          </button>
        </div>
      )}
      <div className="button-row">
        <button
          className="button secondary small"
          disabled={dirty && stale}
          onClick={() => save(false)}
        >
          <Save size={15} />
          Save {readinessLabels[gate]} evidence
        </button>
        <button
          className="button primary small"
          disabled={done || blocked || (dirty && stale)}
          onClick={() => save(true)}
        >
          <Check size={15} />
          {done
            ? `${readinessLabels[gate]} recorded`
            : `Record ${readinessLabels[gate]} readiness`}
        </button>
      </div>
      {blocked && (
        <p className="quiet-note">
          Record earlier independent readiness gates first. Lesson and original
          build records do not bypass this requirement.
        </p>
      )}
    </div>
  );
}
