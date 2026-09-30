import { describe, expect, test } from "bun:test";
import { ansiPaint, colorEnabled, makePaint, noColor } from "./colors.ts";
import type { StyleName } from "./colors.ts";

const ESC = "\u001b";

function codes(text: string): string {
  return JSON.stringify(text).replaceAll("\\u001b", "ESC");
}

describe("ansiPaint", () => {
  const expected: Record<StyleName, [number, number]> = {
    bold: [1, 22],
    dim: [2, 22],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    cyan: [36, 39],
    white: [37, 39],
    gray: [90, 39],
  };

  test("wraps text in the matching SGR pair", () => {
    for (const [style, [open, close]] of Object.entries(expected)) {
      expect(codes(ansiPaint(style as StyleName, "X"))).toBe(`"ESC[${open}mXESC[${close}m"`);
    }
  });

  test("only inserts codes, so stripping them returns the original", () => {
    for (const style of Object.keys(expected) as StyleName[]) {
      const painted = ansiPaint(style, "  1. Ottawa, Ontario, Canada");
      expect(painted.replaceAll(/\u001b\[\d+m/g, "")).toBe("  1. Ottawa, Ontario, Canada");
    }
  });
});

describe("noColor", () => {
  test("returns the text unchanged for every style", () => {
    for (const style of ["bold", "dim", "red", "green", "yellow", "cyan", "white", "gray"] as StyleName[]) {
      expect(noColor(style, "hello")).toBe("hello");
    }
  });
});

describe("colorEnabled", () => {
  const tty = { isTTY: true };
  const pipe = {};

  test("follows the stream when neither env var is set", () => {
    expect(colorEnabled(tty, {})).toBe(true);
    expect(colorEnabled(pipe, {})).toBe(false);
  });

  test("NO_COLOR wins over a TTY", () => {
    expect(colorEnabled(tty, { NO_COLOR: "1" })).toBe(false);
    expect(colorEnabled(tty, { NO_COLOR: "anything" })).toBe(false);
  });

  test("an empty NO_COLOR is not set", () => {
    expect(colorEnabled(tty, { NO_COLOR: "" })).toBe(true);
  });

  test("FORCE_COLOR turns colour on for a pipe", () => {
    expect(colorEnabled(pipe, { FORCE_COLOR: "1" })).toBe(true);
    expect(colorEnabled(pipe, { FORCE_COLOR: "3" })).toBe(true);
  });

  test("FORCE_COLOR=0 turns colour off for a TTY", () => {
    expect(colorEnabled(tty, { FORCE_COLOR: "0" })).toBe(false);
    expect(colorEnabled(tty, { FORCE_COLOR: "false" })).toBe(false);
  });

  test("NO_COLOR beats FORCE_COLOR", () => {
    expect(colorEnabled(tty, { FORCE_COLOR: "1", NO_COLOR: "1" })).toBe(false);
  });
});

describe("makePaint", () => {
  test("paints a TTY and leaves a pipe plain", () => {
    expect(makePaint({ isTTY: true }, {})).toBe(ansiPaint);
    expect(makePaint({}, {})).toBe(noColor);
  });

  test("honours the env overrides", () => {
    expect(makePaint({}, { FORCE_COLOR: "1" })).toBe(ansiPaint);
    expect(makePaint({ isTTY: true }, { NO_COLOR: "1" })).toBe(noColor);
  });
});
