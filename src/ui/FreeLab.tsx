import { ArrowRight, ShieldCheck } from "lucide-react";
import {
  freeLabCheckedOn,
  freeLabGroups,
  realCloudOptions,
} from "../content/free-practice";
import type { Catalog, ProgressState } from "../domain/types";
import { External, PageHeading } from "./shared";

/** Lessons that carry a ₹0 practice path, grouped by section. */
function freePathLessons(catalog: Catalog) {
  return catalog.tracks
    .filter((track) =>
      ["cloud-devops", "security-skills", "foundation-essentials"].includes(
        track.trackId,
      ),
    )
    .map((track) => ({
      track,
      lessons: track.modules.flatMap((module) =>
        module.lessons.filter((lesson) => lesson.practiceEnvironment),
      ),
    }));
}

export function FreeLab({
  catalog,
  state,
}: {
  catalog: Catalog;
  state: ProgressState;
}) {
  return (
    <>
      <PageHeading
        eyebrow="CLOUD & DEVOPS / PRACTISE WITHOUT A BILL"
        title="₹0 Practice Lab"
        description="Free tools that replace paid cloud for every Cloud & DevOps and Cloud Security lab, and the only real-cloud plans that cannot charge you."
      />
      <div className="notice info">
        <strong>Default rule: do every lab on the ₹0 path first.</strong>
        <p>
          Each lab lesson has a “Practise for ₹0” box saying exactly which free
          tool to use. Real AWS or Azure steps are always optional. Free offers
          change, so check the linked official page before signing up. Facts
          checked {freeLabCheckedOn}.
        </p>
      </div>
      {freeLabGroups.map((group) => (
        <section
          className="panel lesson-section section-block"
          key={group.title}
          aria-label={group.title}
        >
          <h2>{group.title}</h2>
          <p className="muted">{group.summary}</p>
          <div className="free-lab-grid">
            {group.tools.map((tool) => (
              <article className="free-lab-tool" key={tool.name}>
                <h3>{tool.name}</h3>
                <p className="small-text">
                  <strong>Replaces:</strong> {tool.replaces}
                </p>
                <p className="small-text">
                  <strong>Cost:</strong> {tool.cost}
                </p>
                <pre className="free-lab-code">
                  <code>{tool.setup.join("\n")}</code>
                </pre>
                <p className="small-text muted">{tool.limits}</p>
                <External href={tool.url}>Official page</External>
              </article>
            ))}
          </div>
        </section>
      ))}
      <section
        className="panel lesson-section section-block"
        aria-label="Optional real cloud without charges"
      >
        <h2>
          <ShieldCheck size={20} /> Optional real cloud, without the risk
        </h2>
        <p className="muted">
          Use these only for the final step of a lab, after the ₹0 path works.
        </p>
        <div className="free-lab-grid">
          {realCloudOptions.map((option) => (
            <article className="free-lab-tool" key={option.name}>
              <h3>{option.name}</h3>
              <ul className="compact-list">
                {option.facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
              <strong className="small-text">Safety rules</strong>
              <ol className="compact-list">
                {option.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ol>
              <External href={option.url}>Official page</External>
            </article>
          ))}
        </div>
      </section>
      <section
        className="panel lesson-section section-block"
        aria-label="Lessons with a ₹0 path"
      >
        <h2>Lessons with a ₹0 path</h2>
        {freePathLessons(catalog).map(({ track, lessons }) => (
          <div key={track.trackId}>
            <h3>{track.title}</h3>
            <ul className="compact-list">
              {lessons.map((lesson) => (
                <li key={lesson.id}>
                  <a href={`#/lesson/${lesson.id}`}>
                    {state.lessons[lesson.id]?.manualCompletedAt ? "✓ " : ""}
                    {lesson.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <a className="button secondary" href="#/path/cloud-devops">
          Back to Cloud &amp; DevOps <ArrowRight size={15} />
        </a>
      </section>
    </>
  );
}
