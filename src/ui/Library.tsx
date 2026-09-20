import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  FileCheck2,
  Search,
} from "lucide-react";
import {
  allLessons,
  assetUrl,
  findLesson,
  trackMeta,
} from "../content/catalog";
import type { TrackId } from "../domain/types";
import type { LearningProps } from "./shared";
import {
  EmptyState,
  External,
  PageHeading,
  PathLink,
  TrackBadge,
} from "./shared";

export function Library({ catalog }: LearningProps) {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<TrackId | "all">("all");
  const [kind, setKind] = useState("book");
  const resources = catalog.tracks
    .flatMap((item) =>
      item.resources.map((resource) => ({
        ...resource,
        trackId: item.trackId,
      })),
    )
    .filter(
      (resource) =>
        (track === "all" || resource.trackId === track) &&
        (kind === "all" || resource.kind === kind) &&
        `${resource.title} ${resource.provider} ${resource.notes}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
  const hosted = new Set(
    catalog.tracks
      .flatMap((item) => item.resources)
      .filter((resource) => resource.hostedPath)
      .map((resource) => resource.hostedPath),
  ).size;
  return (
    <>
      <PageHeading
        eyebrow="GOOD SOURCES. LESS SEARCHING."
        title="Your learning bookshelf."
        description="Official books, lectures and documentation, connected to the lessons where they matter."
      />
      <div className="notice info">
        <FileCheck2 size={20} />
        <div>
          <strong>Free to read is not always free to rehost.</strong>
          <p>
            {hosted} licensed PDF{hosted === 1 ? "" : "s"} bundled with
            provenance and checksums. Other books link to authorized sources.
            Paid editions are optional and clearly labelled; we do not copy
            protected chapters, solutions or exams.
          </p>
        </div>
      </div>
      <div className="filter-bar">
        <label className="search-input">
          <Search size={18} />
          <span className="sr-only">Search resources</span>
          <input
            placeholder="Search titles, authors or topics..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Resource type</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="book">Books & readings</option>
            <option value="video">Lectures & videos</option>
            <option value="documentation">Documentation</option>
            <option value="practice">Practice</option>
            <option value="all">All resources</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Resource learning path</span>
          <select
            value={track}
            onChange={(event) =>
              setTrack(event.target.value as TrackId | "all")
            }
          >
            <option value="all">Every path</option>
            {Object.entries(trackMeta).map(([id, meta]) => (
              <option value={id} key={id}>
                {meta.short}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="resource-grid">
        {resources.map((resource) => {
          const lessons = allLessons(catalog).filter(
            (lesson) =>
              lesson.reading.resourceId === resource.id ||
              lesson.video.resourceId === resource.id ||
              lesson.supplementaryResourceIds.includes(resource.id),
          );
          return (
            <article className="panel resource-card" key={resource.id}>
              <div className="resource-card-icon">
                <BookOpen size={29} strokeWidth={1.4} />
              </div>
              <div className="inline-meta">
                <TrackBadge id={resource.trackId} />
                <span className="subtle-pill">
                  {resource.hostedPath ? "Hosted PDF" : "Official link"}
                </span>
              </div>
              <h2>{resource.title}</h2>
              <p className="muted">{resource.provider}</p>
              <p className="resource-license">{resource.license}</p>
              <div className="inline-meta">
                <span>{resource.access}</span>
                <span>Checked {resource.verifiedOn}</span>
              </div>
              <p className="small-text">{resource.notes}</p>
              <div className="button-row">
                {resource.hostedPath ? (
                  <a
                    className="button secondary small"
                    href={assetUrl(resource.hostedPath)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read licensed PDF <ExternalLink size={14} />
                  </a>
                ) : (
                  <External href={resource.url}>
                    Open official resource
                  </External>
                )}
              </div>
              <details className="resource-details">
                <summary>Provenance & related lessons</summary>
                <External href={resource.url}>Original source</External>
                {resource.licenseUrl && (
                  <External href={resource.licenseUrl}>
                    Permission / license
                  </External>
                )}
                {resource.sha256 && (
                  <p className="checksum">SHA-256: {resource.sha256}</p>
                )}
                <p>
                  Redistribution:{" "}
                  {resource.redistribution === "permitted"
                    ? "License permits redistribution under its stated conditions."
                    : "Link-only; no permission to bundle this content has been established."}
                </p>
                <ul>
                  {lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <PathLink id={lesson.id}>{lesson.title}</PathLink>
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          );
        })}
      </div>
      {!resources.length && (
        <EmptyState title="Nothing on this shelf yet">
          Try another resource type, path or search phrase.
        </EmptyState>
      )}
    </>
  );
}

export function SearchPage({
  catalog,
  state,
  query,
}: LearningProps & { query: string }) {
  const normalized = query.trim().toLowerCase();
  const lessons = normalized
    ? allLessons(catalog).filter((lesson) =>
        `${lesson.title} ${lesson.objectives.join(" ")} ${lesson.topics.map((topic) => `${topic.title} ${topic.details.join(" ")}`).join(" ")}`
          .toLowerCase()
          .includes(normalized),
      )
    : [];
  const projects = normalized
    ? catalog.projects.filter((project) =>
        `${project.title} ${project.summary} ${project.scope}`
          .toLowerCase()
          .includes(normalized),
      )
    : [];
  return (
    <>
      <PageHeading
        eyebrow="FIND YOUR NEXT CONNECTION"
        title={
          normalized
            ? `Results for "${query}"`
            : "What would you like to learn?"
        }
        description={`${lessons.length} lessons and ${projects.length} projects. Your progress is shared wherever you find a lesson.`}
      />
      {lessons.map((lesson) => {
        const found = findLesson(catalog, lesson.id)!;
        return (
          <PathLink
            className="panel search-result"
            id={lesson.id}
            key={lesson.id}
          >
            <TrackBadge id={found.track.trackId} />
            <h2>{lesson.title}</h2>
            <p>{lesson.objectives[0]}</p>
            <div className="inline-meta">
              <span>{found.module.title}</span>
              {state.lessons[lesson.id]?.manualCompletedAt && (
                <span>Assignment recorded</span>
              )}
              <ArrowRight size={17} />
            </div>
          </PathLink>
        );
      })}
      {projects.length > 0 && <h2 className="section-block">Related builds</h2>}
      {projects.map((project) => (
        <a
          className="panel search-result"
          key={project.id}
          href={`#/project/${project.id}`}
        >
          <span className="stage-badge">{project.variant}</span>
          <h2>{project.title}</h2>
          <p>{project.summary}</p>
          <span className="arrow-link">
            Explore project <ArrowRight size={17} />
          </span>
        </a>
      ))}
      {normalized && !lessons.length && !projects.length && (
        <EmptyState title="No match, but plenty to explore">
          Try a broader concept like SQL, probability, testing or reading.
        </EmptyState>
      )}
    </>
  );
}
