import type { ReferenceAvailability } from "../domain/types";

const reviewLabels: Record<ReferenceAvailability["reviewScope"], string> = {
  "scoped-software": "Scoped software evidence reviewed",
  "partial-cpu": "PARTIAL CPU/reference artifacts only",
  "experimental-owned-lab": "EXPERIMENTAL owned-lab mechanisms only",
};
const publicationLabels: Record<ReferenceAvailability["publication"], string> =
  {
    merged: "Merged scoped implementation",
    "awaiting-merge": "Awaiting authorized merge",
    "unmerged-draft": "OPEN DRAFT / UNMERGED",
    "follow-up-pending": "LATEST VERIFICATION FOLLOW-UP PENDING",
  };

export function ReferenceStatus({
  availability,
  compact = false,
}: {
  availability: ReferenceAvailability;
  compact?: boolean;
}) {
  return (
    <section
      className="reference-status"
      aria-label="Dated reference availability"
      data-reference-scope={availability.reviewScope}
      data-publication-state={availability.publication}
      data-publication-hold={String(availability.publicationHold)}
    >
      <p className="small-text">
        <strong>{reviewLabels[availability.reviewScope]}</strong>
      </p>
      <p className="small-text">
        {publicationLabels[availability.publication]} · Evidence snapshot{" "}
        {availability.snapshotOn}
      </p>
      {availability.publicationHold && (
        <p className="reference-hold">
          <strong>PUBLICATION HELD</strong> · Not a merged/all-checks-green
          completion claim.
        </p>
      )}
      {!compact && <p>{availability.publicationNote}</p>}
      <div className={compact ? "reference-qualification" : "notice warning"}>
        <strong>Target status / required proof</strong>
        <p>{availability.targetQualification}</p>
      </div>
      {!compact && (
        <p className="quiet-note">
          This is a dated, scoped source-evidence snapshot, not a live GitHub
          status feed or a completed-project/mastery badge. No private API
          request occurs here. Your build and independent readiness records stay
          separate.
        </p>
      )}
    </section>
  );
}
