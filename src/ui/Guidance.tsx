import { External } from "./shared";

function label(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function Guidance({
  value,
  depth = 0,
}: {
  value: unknown;
  depth?: number;
}) {
  if (value === null)
    return <span className="muted">Not specified / not verified</span>;
  if (typeof value === "string")
    return /^https:\/\//.test(value) ? (
      <External href={value}>{value}</External>
    ) : (
      <p>{value}</p>
    );
  if (typeof value === "number" || typeof value === "boolean")
    return <p>{String(value)}</p>;
  if (depth > 8 || !value || typeof value !== "object") return null;
  if (Array.isArray(value))
    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}>
            <Guidance value={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  return (
    <div className="guidance">
      {Object.entries(value).map(([key, item]) =>
        item && typeof item === "object" ? (
          <details key={key}>
            <summary>{label(key)}</summary>
            <Guidance value={item} depth={depth + 1} />
          </details>
        ) : (
          <div key={key}>
            <h4>{label(key)}</h4>
            <Guidance value={item} depth={depth + 1} />
          </div>
        ),
      )}
    </div>
  );
}
