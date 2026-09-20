import {
  ArrowUpRight,
  Check,
  Circle,
  ExternalLink,
  LockKeyhole,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Catalog, ProgressState, TrackId } from "../domain/types";
import { trackMeta } from "../content/catalog";

export interface LearningProps {
  catalog: Catalog;
  state: ProgressState;
  mutate: (recipe: (current: ProgressState) => ProgressState) => boolean;
  notify: (message: string) => void;
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="lead">{description}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </header>
  );
}

export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const percent = Math.max(0, Math.min(100, value));
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

export function External({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  let safe = false;
  let historicalHttp = false;
  try {
    const url = new URL(href);
    safe =
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password;
    historicalHttp = url.protocol === "http:";
  } catch {
    /* Invalid user URLs are rendered as text. */
  }
  return safe ? (
    <a
      className={`external-link ${className}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ExternalLink size={14} aria-hidden="true" />
      {historicalHttp && (
        <span className="http-warning">HTTP: external, no credentials</span>
      )}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <span>{children}</span>
  );
}

export function TrackBadge({ id }: { id: TrackId }) {
  return (
    <span
      className="track-badge"
      style={{ "--track-color": trackMeta[id].color } as React.CSSProperties}
    >
      {trackMeta[id].short}
    </span>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-mark">
        <Circle size={26} aria-hidden="true" />
      </div>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function StatusIcon({
  complete,
  locked,
}: {
  complete?: boolean;
  locked?: boolean;
}) {
  return (
    <span
      className={`status-icon ${complete ? "complete" : ""} ${locked ? "locked" : ""}`}
    >
      {complete ? (
        <Check size={15} aria-label="Complete" />
      ) : locked ? (
        <LockKeyhole size={14} aria-label="Prerequisites remaining" />
      ) : (
        <Circle size={14} aria-label="Not complete" />
      )}
    </span>
  );
}

export function PathLink({
  id,
  children,
  className = "",
  paper = "all",
}: {
  id: string;
  children: ReactNode;
  className?: string;
  paper?: string;
}) {
  return (
    <a
      className={className}
      href={`#/lesson/${encodeURIComponent(id)}${paper !== "all" ? `?paper=${encodeURIComponent(paper)}` : ""}`}
    >
      {children}
    </a>
  );
}

export function ArrowLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a className="arrow-link" href={href}>
      {children}
      <ArrowUpRight size={17} aria-hidden="true" />
    </a>
  );
}

export function readableDate(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

export function minutesLabel(minutes: number): string {
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
}
