import { expect, it } from "vitest";
import { pageFromBookmark } from "../src/domain/reader";

it("restores explicit numeric pages without guessing from chapter bookmarks", () => {
  expect(pageFromBookmark("27")).toBe(27);
  expect(pageFromBookmark(" Page 27 ")).toBe(27);
  expect(pageFromBookmark("0027")).toBe(27);
  for (const value of [
    "",
    "0",
    "-1",
    "27.5",
    "Chapter 27",
    "Section 3, page 27",
    "9999",
    "NaN",
  ]) {
    expect(pageFromBookmark(value)).toBeNull();
  }
});
