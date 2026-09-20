export function pageFromBookmark(position: string): number | null {
  const match = /^(?:page\s+)?(\d{1,4})$/i.exec(position.trim());
  if (!match) return null;
  const page = Number(match[1]);
  return page >= 1 && page <= 5000 ? page : null;
}
