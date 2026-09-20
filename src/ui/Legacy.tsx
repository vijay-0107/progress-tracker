import { useEffect, useState } from "react";
import { Archive, ChevronDown, Search } from "lucide-react";
import type { LearningProps } from "./shared";
import { EmptyState, External, PageHeading } from "./shared";

interface LegacySession {
  id: string;
  title: string;
  brief?: string;
  actionPlan?: string;
  practiceTarget?: string;
  successMetric?: string;
  date?: string;
  links?: { url: string; label: string; type?: string }[];
}
interface LegacyTopic {
  id: string;
  title: string;
  schedule: string;
  subtopics: { id: string; title: string; sessions: LegacySession[] }[];
}
interface LegacySchedule {
  topics: LegacyTopic[];
  totalTopics: number;
  totalSessions: number;
  generatedAt: string;
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function Legacy({ state }: LearningProps) {
  const [schedule, setSchedule] = useState<LegacySchedule | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [archiveId, setArchiveId] = useState(
    Object.keys(state.legacy)[0] || "",
  );
  useEffect(() => {
    let active = true;
    import("../../schedule-data.json")
      .then((module) => {
        if (active) setSchedule(module.default);
      })
      .catch((failure: unknown) => {
        if (active)
          setError(
            `The historical catalog could not be loaded: ${failure instanceof Error ? failure.message : "unknown error"}. Your original records have not been changed.`,
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const archives = Object.values(state.legacy);
  const archive = state.legacy[archiveId];
  const completions = object(archive?.payload.completions);
  const completedDayIds = Array.isArray(archive?.payload.completedDayIds)
    ? archive.payload.completedDayIds.filter(
        (id): id is string => typeof id === "string",
      )
    : [];
  const notes = object(archive?.payload.notes);
  const review = object(archive?.payload.review);
  const matches =
    schedule?.topics.filter((topic) =>
      `${topic.title} ${topic.subtopics.map((subtopic) => `${subtopic.title} ${subtopic.sessions.map((session) => session.title).join(" ")}`).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ) ?? [];
  return (
    <>
      <PageHeading
        eyebrow="YOUR HISTORY, PRESERVED"
        title="The original study archive."
        description="The previous tracker is part of your learning history. Its scheduled sessions stay separate from the new canonical curriculum."
      />
      <div className="notice info">
        <Archive size={20} />
        <div>
          <strong>
            35 original topics · 436 subtopics · 1,300 scheduled sessions.
          </strong>
          <p>
            These are historical planning blocks, not 1,300 independently
            curated courses. Original notes, review flags and completion claims
            are retained without converting them into new lesson credit or
            inventing streak activity. Older resource links may be searches and
            were not verified by the new curriculum research.
          </p>
        </div>
      </div>
      <section className="panel lesson-section">
        <h2>Your imported learning history</h2>
        {archives.length ? (
          <>
            <label className="field-label">
              Archive in this workspace
              <select
                value={archiveId}
                onChange={(event) => setArchiveId(event.target.value)}
              >
                <option value="">
                  Browse catalog without personal progress
                </option>
                {archives.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.source}
                  </option>
                ))}
              </select>
            </label>
            <p>
              {Object.keys(completions).filter((id) => Boolean(completions[id]))
                .length +
                completedDayIds.filter((id) => !completions[id]).length}{" "}
              legacy completions · {Object.keys(notes).length} notes ·{" "}
              {Object.keys(review).length} review flags. Stored only in the
              current owner-scoped archive. Export from Settings to retain a
              copy.
            </p>
          </>
        ) : (
          <>
            <p>
              No legacy data has been imported into this workspace. The original
              browser keys and Firestore profiles have not been deleted or
              reassigned.
            </p>
            <a className="button secondary" href="#/settings">
              Review legacy import options
            </a>
          </>
        )}
      </section>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {!schedule && !error && (
        <p role="status">
          Loading the original catalog only when you need it...
        </p>
      )}
      <div className="filter-bar">
        <label className="search-input">
          <Search size={17} />
          <span className="sr-only">Search original study archive</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find an original topic or session..."
          />
        </label>
      </div>
      <div className="roadmap-list">
        {matches.map((topic) => (
          <details className="module-card" key={topic.id}>
            <summary>
              <span className="module-summary">
                <span className="subtle-pill">{topic.schedule}</span>
                <h2>{topic.title}</h2>
              </span>
              <span className="muted small-text">
                {topic.subtopics.reduce(
                  (sum, subtopic) => sum + subtopic.sessions.length,
                  0,
                )}{" "}
                sessions
              </span>
              <ChevronDown size={18} />
            </summary>
            <div className="module-body">
              {topic.subtopics.map((subtopic) => (
                <details className="concept-preview" key={subtopic.id}>
                  <summary>{subtopic.title}</summary>
                  {subtopic.sessions.map((session) => (
                    <article className="legacy-record" key={session.id}>
                      <div className="inline-meta">
                        <span>Planned {session.date}</span>
                        {(Boolean(completions[session.id]) ||
                          completedDayIds.includes(session.id)) && (
                          <span className="stage-badge">
                            Historical completion record
                          </span>
                        )}
                      </div>
                      <h3>{session.title}</h3>
                      <p>{session.brief}</p>
                      <p>
                        <strong>Original practice:</strong>{" "}
                        {session.practiceTarget}
                      </p>
                      <p>
                        <strong>Original success check:</strong>{" "}
                        {session.successMetric}
                      </p>
                      {typeof notes[session.id] === "string" && (
                        <pre>{notes[session.id] as string}</pre>
                      )}
                      {review[session.id] != null && (
                        <details>
                          <summary>Historical review flags</summary>
                          <pre>
                            {JSON.stringify(review[session.id], null, 2)}
                          </pre>
                        </details>
                      )}
                      <div className="source-links">
                        {session.links?.map((link) => (
                          <External href={link.url} key={link.url}>
                            {link.label}
                          </External>
                        ))}
                      </div>
                    </article>
                  ))}
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
      {schedule && !matches.length && (
        <EmptyState title="No historical topic matches">
          Try another keyword or clear the archive search.
        </EmptyState>
      )}
    </>
  );
}
