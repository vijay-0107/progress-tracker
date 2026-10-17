import { findResumeNotes, rolesForProject } from "../content/resume-notes";

/** Repository, stack and resume bullets for a project listed on a role resume. */
export function ProjectResumeNotes({ projectId }: { projectId: string }) {
  const notes = findResumeNotes(projectId);
  const roles = rolesForProject(projectId);
  if (!notes || !roles.length) return null;
  return (
    <section className="panel lesson-section">
      <p className="eyebrow">ON YOUR RESUME</p>
      <h2>What this project must prove</h2>
      <p>
        Listed on: {roles.join(", ")}.
        {notes.estimatedWeeks > 0 &&
          ` Estimated build time: about ${notes.estimatedWeeks} weeks at 10-12 hours a week, after the prerequisite lessons.`}
      </p>
      {notes.estimatedWeeks > 0 && (
        <p>
          Repository to create:{" "}
          <code>github.com/vijay-0107/{notes.repository}</code>
        </p>
      )}
      <h3>Resume bullets (targets until gate 4 is measured)</h3>
      <ul>
        {notes.resumeBullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      <p className="quiet-note">Stack: {notes.stack.join(" · ")}</p>
    </section>
  );
}
