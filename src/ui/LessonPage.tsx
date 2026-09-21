import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  Clock3,
  ExternalLink,
  FileText,
  Play,
  Save,
} from "lucide-react";
import {
  assetUrl,
  eligibleLessons,
  findLesson,
  findResource,
  isExtraTopic,
  resourceEmbed,
  stageLabel,
  unmetRequirements,
  unmetLessonRequirements,
} from "../content/catalog";
import {
  assessLesson,
  completeLesson,
  emptyLesson,
  exportProgress,
  recordActivity,
  updateLesson,
  type LessonPatch,
} from "../domain/progress";
import { sameValue } from "../domain/validation";
import type { ProgressState } from "../domain/types";
import { downloadJson } from "../state/useWorkspace";
import { saveWrittenSelfCheck } from "../state/assessment";
import { pageFromBookmark } from "../domain/reader";
import type { LearningProps } from "./shared";
import {
  EmptyState,
  External,
  minutesLabel,
  readableDate,
  PathLink,
  TrackBadge,
} from "./shared";
import { QuestionField } from "./QuestionField";

export function LessonPage({
  catalog,
  state,
  mutate,
  notify,
  id,
  paper = "all",
}: LearningProps & { id: string; paper?: string }) {
  const found = findLesson(catalog, id);
  const saved = found
    ? state.lessons[found.lesson.id] || emptyLesson(found.lesson.id)
    : emptyLesson("unavailable-lesson");
  const [tab, setTab] = useState("learn");
  const [note, setNote] = useState(saved.note);
  const [evidence, setEvidence] = useState(saved.evidence);
  const [checks, setChecks] = useState<string[]>(saved.rubricChecked);
  const [readingPosition, setReadingPosition] = useState(saved.readingPosition);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  const [loadedReader, setLoadedReader] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(25);
  const [studyDetail, setStudyDetail] = useState("");
  const [readerPage, setReaderPage] = useState(
    () => pageFromBookmark(saved.readingPosition) || 1,
  );
  const tabs = useRef<HTMLDivElement>(null);
  const draftBase = useRef({
    note: saved.note,
    evidence: saved.evidence,
    rubricChecked: saved.rubricChecked,
    readingPosition: saved.readingPosition,
  });
  useEffect(() => {
    if (note === draftBase.current.note || note === saved.note) {
      draftBase.current.note = saved.note;
      if (note !== saved.note) setNote(saved.note);
    }
    if (
      evidence === draftBase.current.evidence ||
      evidence === saved.evidence
    ) {
      draftBase.current.evidence = saved.evidence;
      if (evidence !== saved.evidence) setEvidence(saved.evidence);
    }
    if (
      sameValue(checks, draftBase.current.rubricChecked) ||
      sameValue(checks, saved.rubricChecked)
    ) {
      draftBase.current.rubricChecked = saved.rubricChecked;
      if (!sameValue(checks, saved.rubricChecked))
        setChecks(saved.rubricChecked);
    }
    if (
      readingPosition === draftBase.current.readingPosition ||
      readingPosition === saved.readingPosition
    ) {
      draftBase.current.readingPosition = saved.readingPosition;
      if (readingPosition !== saved.readingPosition)
        setReadingPosition(saved.readingPosition);
    }
  }, [
    saved.note,
    saved.evidence,
    saved.rubricChecked,
    saved.readingPosition,
    note,
    evidence,
    checks,
    readingPosition,
  ]);
  const applyDraft = (current: ProgressState, patch: LessonPatch) => {
    const latest = current.lessons[id] || emptyLesson(id);
    const changed = (
      ["note", "evidence", "rubricChecked", "readingPosition"] as const
    ).filter(
      (key) =>
        Object.hasOwn(patch, key) &&
        !sameValue(latest[key], draftBase.current[key]) &&
        !sameValue(patch[key], latest[key]),
    );
    if (changed.length) {
      if (
        !window.confirm(
          `The saved ${changed.join(", ")} changed while you were editing. OK replaces the newer saved value with your draft after downloading a backup. Cancel keeps the saved value and leaves your draft in this editor.`,
        )
      ) {
        throw new Error(
          "Saving paused to protect a newer saved version. Your draft remains in the editor; compare or copy it before replacing the saved version.",
        );
      }
      downloadJson(
        `progress-before-draft-replacement-${Date.now()}.json`,
        exportProgress(current),
      );
    }
    return updateLesson(current, id, patch);
  };
  const selectTab = (next: string) => {
    setTab(next);
    window.requestAnimationFrame(() =>
      tabs.current?.scrollIntoView({ block: "start" }),
    );
  };
  if (!found)
    return (
      <EmptyState title="This lesson is not in the current catalog">
        Use your learning paths to find the current lesson. Imported legacy
        records stay available in your archive.
      </EmptyState>
    );
  const { lesson, module, track } = found;
  const video = lesson.video
    ? findResource(catalog, lesson.video.resourceId)
    : null;
  const book = findResource(catalog, lesson.reading.resourceId);
  const readerKey = `${lesson.id}:${book.id}:${book.hostedPath || book.url}`;
  const loadReader = loadedReader === readerKey;
  const embed = video ? resourceEmbed(video) : null;
  const blocked = unmetRequirements(catalog, module, state, paper);
  const priorLessons = unmetLessonRequirements(catalog, lesson, state);
  const questions = lesson.assignment.questions;
  const siblings = eligibleLessons(module, paper);
  const siblingIndex = siblings.findIndex((item) => item.id === lesson.id);
  const sibling = siblingIndex >= 0 ? siblings[siblingIndex + 1] : undefined;
  const saveAssignment = () =>
    mutate((current) =>
      applyDraft(current, { evidence, rubricChecked: checks }),
    );
  return (
    <>
      <div className="breadcrumb">
        <a
          href={`#/path/${track.trackId}${paper !== "all" ? `?paper=${encodeURIComponent(paper)}` : ""}`}
        >
          <ArrowLeft size={14} />
          {track.title}
        </a>
        <span>/</span>
        <span>{module.title}</span>
      </div>
      <header className="lesson-heading">
        <div>
          <div className="inline-meta">
            <TrackBadge id={track.trackId} />
            <span className="stage-badge">
              {stageLabel(module.stage, track.trackId)}
            </span>
            {isExtraTopic(track.trackId) && (
              <span className="subtle-pill">Optional topic</span>
            )}
            <span>
              <Clock3 size={14} />
              {minutesLabel(lesson.estimatedMinutes)} estimated
            </span>
          </div>
          <h1>{lesson.title}</h1>
        </div>
        <button
          className={`button ${saved.bookmarked ? "secondary active" : "secondary"}`}
          onClick={() => {
            if (
              mutate((current) =>
                updateLesson(current, id, { bookmarked: !saved.bookmarked }),
              )
            )
              notify(
                saved.bookmarked ? "Bookmark removed." : "Lesson bookmarked.",
              );
          }}
          aria-pressed={saved.bookmarked}
        >
          <Bookmark
            size={17}
            fill={saved.bookmarked ? "currentColor" : "none"}
          />
          {saved.bookmarked ? "Bookmarked" : "Bookmark"}
        </button>
      </header>
      {isExtraTopic(track.trackId) && (
        <p className="notice info">{track.limitations[0]}</p>
      )}
      {blocked.length > 0 && (
        <details className="notice info">
          <summary>
            {blocked.length} recommended prerequisite module
            {blocked.length > 1 ? "s" : ""} remaining
          </summary>
          <p>{blocked.map((item) => item.title).join(" · ")}</p>
          <p>
            You can preview this lesson now. Shared foundation credits are
            reused across the career paths.
          </p>
        </details>
      )}
      {Boolean(lesson.prerequisites?.length) && (
        <div className="notice info">
          <div>
            <strong>
              Prior lesson concepts · {priorLessons.length} remaining
            </strong>
            <ul>
              {lesson.prerequisites?.map((prerequisiteId) => (
                <li key={prerequisiteId}>
                  <PathLink id={prerequisiteId}>
                    {findLesson(catalog, prerequisiteId)!.lesson.title}
                  </PathLink>
                  {state.lessons[prerequisiteId]?.manualCompletedAt &&
                    " (complete)"}
                </li>
              ))}
            </ul>
            <p>
              These links reuse the original lesson and its saved progress, not
              a second copy.
            </p>
          </div>
        </div>
      )}
      {saved.manualCompletedAt && (
        <div className="notice success">
          <Check size={18} />
          <span>
            Self-reported assignment completion recorded{" "}
            {readableDate(saved.manualCompletedAt)}. This is your evidence
            record, not externally verified mastery.
          </span>
        </div>
      )}
      <div
        className="lesson-tabs"
        ref={tabs}
        role="tablist"
        aria-label="Lesson sections"
        onKeyDown={(event) => {
          const choices = ["learn", "assignment", "check", "notes"];
          if (
            event.key === "ArrowRight" ||
            event.key === "ArrowLeft" ||
            event.key === "Home" ||
            event.key === "End"
          ) {
            event.preventDefault();
            const index = choices.indexOf(tab);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? 3
                  : (index + (event.key === "ArrowRight" ? 1 : -1) + 4) % 4;
            selectTab(choices[next]);
            document.getElementById(`tab-${choices[next]}`)?.focus();
          }
        }}
      >
        {[
          ["learn", "Learn & explore", BookOpen],
          ["assignment", "Assignment", FileText],
          ["check", "Self-check", Check],
          ["notes", "Your notes", Bookmark],
        ].map(([value, label, Icon]) => {
          const IconComponent = Icon as typeof BookOpen;
          return (
            <button
              key={String(value)}
              id={`tab-${value}`}
              type="button"
              role="tab"
              aria-selected={tab === value}
              aria-controls={`panel-${value}`}
              tabIndex={tab === value ? 0 : -1}
              onClick={() => selectTab(String(value))}
            >
              <IconComponent size={17} />
              {String(label)}
            </button>
          );
        })}
      </div>
      <div className="lesson-layout">
        <div className="lesson-main">
          {tab === "learn" && (
            <section
              id="panel-learn"
              role="tabpanel"
              aria-labelledby="tab-learn"
            >
              <section className="panel lesson-section">
                <p className="eyebrow">BY THE END OF THIS LESSON</p>
                <h2>What you will be able to do</h2>
                <ul className="objective-list">
                  {lesson.objectives.map((objective) => (
                    <li key={objective}>
                      <Check size={16} />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </section>
              {video && lesson.video ? (
                <section className="panel lesson-section">
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">01 / WATCH & THINK</p>
                      <h2>{video.title}</h2>
                    </div>
                    <Play size={22} />
                  </div>
                  <p>{lesson.video.locator}</p>
                  {embed ? (
                    <div className="video-frame">
                      {loadVideo ? (
                        <iframe
                          title={`Lecture: ${video.title}`}
                          src={embed}
                          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      ) : (
                        <div className="video-consent">
                          <button
                            className="video-play"
                            onClick={() => setLoadVideo(true)}
                            aria-label="Load external lecture video"
                          >
                            <Play size={29} fill="currentColor" />
                          </button>
                          <strong>
                            A lecture, then your own understanding.
                          </strong>
                          <p>
                            Load the YouTube privacy-enhanced player. The
                            provider receives a connection when you choose to
                            play.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="video-link-card">
                      <Play size={32} />
                      <div>
                        <strong>Watch on the official course page</strong>
                        <p>
                          This lecture collection does not have a verified
                          embeddable player. Use the precise lecture locator
                          above.
                        </p>
                      </div>
                      <External href={video.url}>Open lecture</External>
                    </div>
                  )}
                  <div className="resource-caption">
                    <span>
                      {video.provider} · {video.access} · checked{" "}
                      {video.verifiedOn}
                    </span>
                    <External href={video.url}>
                      Official source / playback fallback
                    </External>
                  </div>
                  <p className="quiet-note">{video.notes}</p>
                </section>
              ) : (
                <p className="notice info">
                  Reading-led lesson: no verified, topic-specific free video is
                  required. Use the official reading and practical work below.
                </p>
              )}
              <section className="panel lesson-section">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">
                      {video ? "02" : "01"} / READ WITH PURPOSE
                    </p>
                    <h2>{book.title}</h2>
                  </div>
                  <BookOpen size={22} />
                </div>
                <p className="reading-locator">{lesson.reading.locator}</p>
                <p className="muted">
                  {book.provider} · {book.license}
                </p>
                {book.hostedPath ? (
                  <>
                    <div className="reader-toolbar">
                      <span className="subtle-pill">
                        Licensed hosted PDF
                        {book.hostedBytes
                          ? ` · ${(book.hostedBytes / 1_000_000).toFixed(1)} MB`
                          : ""}
                      </span>
                      <label>
                        Page{" "}
                        <input
                          type="number"
                          min={1}
                          max={5000}
                          value={readerPage}
                          onChange={(event) => {
                            const page = Math.max(
                              1,
                              Number(event.target.value) || 1,
                            );
                            setReaderPage(page);
                            setReadingPosition(`Page ${page}`);
                          }}
                        />
                      </label>
                      <a
                        href={assetUrl(book.hostedPath)}
                        className="external-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open PDF <ExternalLink size={14} />
                      </a>
                    </div>
                    {loadReader ? (
                      <object
                        className="pdf-reader"
                        data={`${assetUrl(book.hostedPath)}#page=${readerPage}`}
                        type="application/pdf"
                        aria-label={`${book.title} integrated PDF reader`}
                      >
                        <p>
                          Your browser does not support inline PDF viewing.{" "}
                          <a
                            href={assetUrl(book.hostedPath)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Read the licensed PDF in a new tab
                          </a>
                          .
                        </p>
                      </object>
                    ) : (
                      <div className="reading-link-card">
                        <BookOpen size={28} />
                        <div>
                          <strong>Read here, when you are ready</strong>
                          <p>
                            The PDF is never downloaded just by opening this
                            lesson. Choose the in-app reader, or the official
                            online edition for a lighter mobile read.
                          </p>
                          <div className="button-row">
                            <button
                              className="button secondary small"
                              onClick={() => {
                                setReaderPage(
                                  pageFromBookmark(readingPosition) || 1,
                                );
                                setLoadedReader(readerKey);
                              }}
                            >
                              Open PDF reader
                            </button>
                            <External href={book.url}>
                              Official online edition
                            </External>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="reading-link-card">
                    <BookOpen size={28} />
                    <div>
                      <strong>Official reading, linked with care</strong>
                      <p>
                        {book.redistribution === "permitted"
                          ? "The official edition is linked here; no local copy is bundled for this resource."
                          : "Not bundled here: rehosting has not been cleared for this edition and use. Read at the author or publisher's site under its stated terms."}
                      </p>
                      <External href={book.url}>Open official reader</External>
                      {book.downloadUrl && (
                        <External href={book.downloadUrl}>
                          Official PDF
                        </External>
                      )}
                    </div>
                  </div>
                )}
                <div className="inline-form">
                  <label>
                    Reading position
                    <input
                      maxLength={300}
                      value={readingPosition}
                      onChange={(event) =>
                        setReadingPosition(event.target.value)
                      }
                      placeholder="Chapter, section or page to resume"
                    />
                  </label>
                  <button
                    className="button secondary"
                    onClick={() => {
                      if (
                        mutate((current) =>
                          applyDraft(current, { readingPosition }),
                        )
                      )
                        notify("Reading position saved.");
                    }}
                  >
                    <Save size={16} />
                    Save position
                  </button>
                </div>
                <p className="quiet-note">
                  A plain page number resumes the in-app PDF. Chapter and
                  section bookmarks are retained as text, without guessing a
                  page.
                </p>
                <p className="quiet-note">
                  Research note ({book.verifiedOn}): {book.notes}
                  {book.hostedPath &&
                    " This release additionally inspected and bundled the unmodified PDF, retaining attribution and a pinned checksum."}
                </p>
                {book.licenseUrl && (
                  <External href={book.licenseUrl}>
                    License / permission evidence
                  </External>
                )}
              </section>
              <section className="panel lesson-section">
                <p className="eyebrow">
                  {video ? "03" : "02"} / CONNECT THE CONCEPTS
                </p>
                <h2>Look a little closer</h2>
                <div className="concept-list">
                  {lesson.topics.map((topic, index) => (
                    <details key={topic.title}>
                      <summary>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        {topic.title}
                      </summary>
                      <ul>
                        {topic.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
                {lesson.supplementaryResourceIds.length > 0 && (
                  <div className="supplementary">
                    <h3>Current documentation & extra practice</h3>
                    {lesson.supplementaryResourceIds.map((resourceId) => {
                      const resource = findResource(catalog, resourceId);
                      return (
                        <External href={resource.url} key={resourceId}>
                          {resource.title}
                        </External>
                      );
                    })}
                  </div>
                )}
              </section>
              <button
                className="button primary"
                onClick={() => selectTab("assignment")}
              >
                Put it into practice <ArrowRight size={16} />
              </button>
            </section>
          )}
          {tab === "assignment" && (
            <section
              id="panel-assignment"
              role="tabpanel"
              aria-labelledby="tab-assignment"
              className="panel lesson-section"
            >
              <p className="eyebrow">MAKE SOMETHING YOU CAN EXPLAIN</p>
              <h2>{lesson.assignment.title}</h2>
              <span className="stage-badge">{lesson.assignment.kind}</span>
              <ol className="instruction-list">
                {lesson.assignment.instructions.map((instruction) => (
                  <li key={instruction}>{instruction}</li>
                ))}
              </ol>
              <h3>Your deliverables</h3>
              <ul>
                {lesson.assignment.deliverables.map((deliverable) => (
                  <li key={deliverable}>{deliverable}</li>
                ))}
              </ul>
              {lesson.assignment.externalUrl && (
                <External href={lesson.assignment.externalUrl}>
                  Official external exercise
                </External>
              )}
              <hr />
              <h3>Check your work against the rubric</h3>
              <p className="muted">
                These are your checks, not an automated judge. Keep test results
                and examples with your evidence.
              </p>
              <div className="rubric-list">
                {lesson.assignment.acceptanceCriteria.map((criterion) => (
                  <label key={criterion}>
                    <input
                      type="checkbox"
                      checked={checks.includes(criterion)}
                      onChange={(event) =>
                        setChecks(
                          event.target.checked
                            ? [...checks, criterion]
                            : checks.filter((item) => item !== criterion),
                        )
                      }
                    />
                    <span>{criterion}</span>
                  </label>
                ))}
              </div>
              <label className="field-label">
                Assignment evidence
                <textarea
                  value={evidence}
                  onChange={(event) => setEvidence(event.target.value)}
                  rows={6}
                  maxLength={12000}
                  placeholder="Describe what you built or solved, how you checked it, and what remains uncertain. Add a public repository link only if it contains no confidential data."
                />
              </label>
              <p className="quiet-note">
                No employer/client data, secrets or biometric images. Evidence
                is stored as private plain text; external work is not
                auto-judged.
              </p>
              <div className="button-row">
                <button
                  className="button secondary"
                  onClick={() => {
                    if (saveAssignment()) notify("Assignment draft saved.");
                  }}
                >
                  <Save size={16} />
                  Save assignment draft
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    if (
                      mutate((current) =>
                        completeLesson(
                          applyDraft(current, {
                            evidence,
                            rubricChecked: checks,
                          }),
                          lesson,
                        ),
                      )
                    )
                      notify(
                        "Assignment completion recorded. Your next review has been scheduled.",
                      );
                  }}
                  disabled={Boolean(saved.manualCompletedAt)}
                >
                  <Check size={17} />
                  {saved.manualCompletedAt
                    ? "Completion recorded"
                    : "Record manual completion"}
                </button>
              </div>
              {saved.manualCompletedAt && (
                <button
                  className="text-button"
                  onClick={() => {
                    if (
                      mutate((current) =>
                        updateLesson(current, id, { manualCompletedAt: null }),
                      )
                    )
                      notify(
                        "Marked incomplete. Your prior activity remains an honest historical record.",
                      );
                  }}
                >
                  Reopen this lesson
                </button>
              )}
            </section>
          )}
          {tab === "check" && (
            <section
              id="panel-check"
              role="tabpanel"
              aria-labelledby="tab-check"
              className="panel lesson-section"
            >
              <p className="eyebrow">RETRIEVE, DON'T JUST RECOGNIZE</p>
              <h2>A check on your understanding</h2>
              <p>
                Original practice questions. Objective answers are checked
                locally; written responses need your own comparison. This is not
                a proctored exam or a mastery certificate.
              </p>
              {questions.length > 0 ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const answeredObjective = questions.some(
                      (question) =>
                        question.kind !== "short-answer" &&
                        answers[question.id]?.trim(),
                    );
                    const answeredWritten = questions.some(
                      (question) =>
                        question.kind === "short-answer" &&
                        answers[question.id]?.trim(),
                    );
                    if (!answeredObjective && !answeredWritten) {
                      notify(
                        "Attempt a question before revealing its explanation. Empty answers are not learning activity.",
                      );
                      return;
                    }
                    let savedNote = note;
                    if (
                      mutate((current) => {
                        let next = answeredWritten
                          ? saveWrittenSelfCheck(
                              applyDraft(current, { note }),
                              lesson,
                              answers,
                            )
                          : current;
                        if (answeredObjective)
                          next = assessLesson(next, lesson, answers);
                        savedNote = next.lessons[id]?.note || note;
                        return next;
                      })
                    ) {
                      setNote(savedNote);
                      setShowAnswers(true);
                      notify(
                        answeredObjective
                          ? "Self-check recorded. Incorrect answers were added to your error notebook; written reflections were saved without grading."
                          : "Written reflection saved in your lesson notes. Compare it yourself; no automatic score, completion or activity was awarded.",
                      );
                    }
                  }}
                >
                  {questions.map((question) => (
                    <div className="question-card" key={question.id}>
                      <QuestionField
                        question={question}
                        value={answers[question.id] || ""}
                        onChange={(value) =>
                          setAnswers({ ...answers, [question.id]: value })
                        }
                      />
                      {showAnswers && (
                        <div className="answer-explanation">
                          <strong>
                            {question.kind === "short-answer"
                              ? "Compare your explanation"
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
                  <p className="quiet-note">
                    Written responses are saved into your lesson notes for
                    manual comparison, never counted as automatically correct.
                  </p>
                  <div className="button-row">
                    <button
                      className="button primary"
                      type="submit"
                      disabled={showAnswers}
                    >
                      {questions.every(
                        (question) => question.kind === "short-answer",
                      )
                        ? "Save reflection & compare"
                        : "Check answers"}{" "}
                      <ArrowRight size={16} />
                    </button>
                    {showAnswers && (
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => {
                          setAnswers({});
                          setShowAnswers(false);
                        }}
                      >
                        Try again without answer hints
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="notice info">
                  This lesson uses an original practical assignment and written
                  review prompts rather than an automatically checked quiz.
                </div>
              )}
              {saved.assessment && (
                <div className="score-summary">
                  <strong>
                    {saved.assessment.correct}/{saved.assessment.total}
                  </strong>
                  <span>
                    latest objectively checked answers ·{" "}
                    {readableDate(saved.assessment.attemptedAt)}
                    <small>
                      Manual reflection responses are not included in the score.
                    </small>
                  </span>
                </div>
              )}
              <hr />
              <h3>Without looking back, explain...</h3>
              <ul>
                {lesson.reviewPrompts.map((prompt) => (
                  <li key={prompt}>{prompt}</li>
                ))}
              </ul>
              <a className="arrow-link" href="#/review">
                Open your error notebook & review queue <ArrowRight size={16} />
              </a>
            </section>
          )}
          {tab === "notes" && (
            <section
              id="panel-notes"
              role="tabpanel"
              aria-labelledby="tab-notes"
              className="panel lesson-section"
            >
              <p className="eyebrow">MAKE THE LEARNING YOURS</p>
              <h2>Notes worth returning to</h2>
              <p>
                Capture your reasoning, a confusing edge case, or a connection
                to your project. Plain text only; no scripts or embedded
                content.
              </p>
              <label className="field-label">
                Lesson notes
                <textarea
                  rows={16}
                  maxLength={16000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="In my own words...\n\nA mistake I made...\n\nNext time I will..."
                />
              </label>
              <button
                className="button primary"
                onClick={() => {
                  if (mutate((current) => applyDraft(current, { note })))
                    notify("Notes saved to this workspace.");
                }}
              >
                <Save size={16} />
                Save notes
              </button>
              <p className="quiet-note">
                Saving notes and bookmarks does not inflate your study streak.
              </p>
            </section>
          )}
        </div>
        <aside className="lesson-sidebar">
          <section className="panel lesson-section">
            <p className="eyebrow">YOUR STUDY SESSION</p>
            <h3>A little focused time</h3>
            <p className="muted">
              Record time you actually spent. Estimates are a guide, not a timer
              or a requirement.
            </p>
            <label className="field-label">
              Minutes studied
              <input
                type="number"
                min={5}
                max={240}
                step={5}
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
              />
            </label>
            <label className="field-label">
              What did you work on?
              <textarea
                rows={3}
                maxLength={500}
                value={studyDetail}
                onChange={(event) => setStudyDetail(event.target.value)}
                placeholder="For example: read the chapter and traced two edge cases."
              />
            </label>
            <button
              className="button primary full-width"
              onClick={() => {
                if (studyDetail.trim().length < 20) {
                  notify(
                    "Describe the work you actually did in at least 20 characters before logging study time.",
                  );
                  return;
                }
                const now = new Date().toISOString();
                if (
                  mutate((current) =>
                    recordActivity(current, {
                      id: crypto.randomUUID(),
                      updatedAt: now,
                      at: now,
                      timezone: current.settings.timezone,
                      kind: "study",
                      entityId: id,
                      minutes,
                      detail: studyDetail,
                    }),
                  )
                ) {
                  setStudyDetail("");
                  notify("Focused study recorded.");
                }
              }}
            >
              <Clock3 size={16} />
              Log study time
            </button>
            <small className="muted">
              Self-reported · {state.settings.timezone}
            </small>
          </section>
          <section className="lesson-checklist">
            <h3>Your lesson, step by step</h3>
            {[
              ...(video ? ["Watch the relevant lecture"] : []),
              "Read and connect the ideas",
              "Build and check your evidence",
              "Retrieve, reflect and review",
            ].map((step, index) => (
              <p key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {step}
              </p>
            ))}
            <a className="arrow-link" href={`#/path/${track.trackId}`}>
              Study guide & source notes <ArrowRight size={15} />
            </a>
          </section>
          {sibling && (
            <a
              className="next-lesson-card"
              href={`#/lesson/${sibling.id}${paper !== "all" ? `?paper=${encodeURIComponent(paper)}` : ""}`}
            >
              <span className="eyebrow">NEXT IN THIS MODULE</span>
              <strong>{sibling.title}</strong>
              <ArrowRight size={19} />
            </a>
          )}
        </aside>
      </div>
    </>
  );
}
