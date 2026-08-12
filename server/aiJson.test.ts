import { describe, it, expect } from "vitest";
import { parseLooseJson, coerceArray } from "./aiJson";

describe("parseLooseJson", () => {
  it("parses clean json", () => {
    expect(parseLooseJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("unwraps markdown fences", () => {
    expect(parseLooseJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(parseLooseJson('```\n[1,2]\n```')).toEqual([1, 2]);
  });

  it("extracts json embedded in prose", () => {
    expect(parseLooseJson('Here you go: {"a":3} hope that helps')).toEqual({ a: 3 });
  });

  it("extracts an array embedded in prose", () => {
    expect(parseLooseJson('Result: [{"x":1}] done')).toEqual([{ x: 1 }]);
  });

  it("handles braces inside strings", () => {
    expect(parseLooseJson('{"note":"use {this} carefully"}')).toEqual({ note: "use {this} carefully" });
  });

  it("throws on empty content", () => {
    expect(() => parseLooseJson(null)).toThrow(/empty content/i);
  });

  it("throws when no json is present", () => {
    expect(() => parseLooseJson("no json at all")).toThrow(/not JSON/i);
  });
});

describe("coerceArray", () => {
  it("returns a bare array unchanged", () => {
    expect(coerceArray([1, 2], "moments")).toEqual([1, 2]);
  });

  it("pulls the named key from a wrapper object", () => {
    expect(coerceArray({ moments: [{ a: 1 }] }, "moments")).toEqual([{ a: 1 }]);
  });

  it("falls back to the first array value found", () => {
    expect(coerceArray({ other: [5] }, "moments")).toEqual([5]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(coerceArray({ a: 1 }, "moments")).toEqual([]);
    expect(coerceArray(null, "moments")).toEqual([]);
  });
});
