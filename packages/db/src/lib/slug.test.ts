import { describe, expect, it } from "vitest";

import { isValidSlug, SLUG_MAX, slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and replaces non-alphanumerics with hyphens", () => {
    expect(slugify("Karachi Therapy Collective")).toBe("karachi-therapy-collective");
  });

  it("collapses adjacent non-alphanumerics", () => {
    expect(slugify("Dr. Smith's --- Practice")).toBe("dr-smith-s-practice");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify(" --calm-- ")).toBe("calm");
  });

  it("returns empty string when there are no alphanumerics", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("   ")).toBe("");
  });

  it("strips diacritics", () => {
    expect(slugify("São Paulo Therapy")).toBe("sao-paulo-therapy");
  });

  it("caps length at SLUG_MAX", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(SLUG_MAX);
  });
});

describe("isValidSlug", () => {
  it("accepts kebab-case lowercase alphanumerics", () => {
    expect(isValidSlug("calm-therapy")).toBe(true);
    expect(isValidSlug("a1")).toBe(true);
  });

  it("rejects too-short, too-long, uppercase, spaces, leading/trailing/double hyphens", () => {
    expect(isValidSlug("a")).toBe(false);
    expect(isValidSlug("a".repeat(SLUG_MAX + 1))).toBe(false);
    expect(isValidSlug("Calm")).toBe(false);
    expect(isValidSlug("a b")).toBe(false);
    expect(isValidSlug("-leading")).toBe(false);
    expect(isValidSlug("trailing-")).toBe(false);
    expect(isValidSlug("dou--ble")).toBe(false);
  });
});
