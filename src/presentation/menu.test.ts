import { describe, expect, test } from "bun:test";
import { Writable } from "node:stream";
import { chooseOption, renderMenu } from "./menu.ts";
import { createOutput } from "./output.ts";
import { ansiPaint, noColor } from "../utils/colors.ts";
import type { Paint } from "../utils/colors.ts";
import { defaultConfig } from "../storage/settingsStorage.ts";
import type { AppContext, MenuOption } from "../types/index.ts";

const CLEARING: [number, number] = [22, 39];

function options(...labels: string[]): MenuOption[] {
  return labels.map((label, index) => ({ key: String(index + 1), label, run: async () => {} }));
}

function context(
  answer: string | null,
  paint: Paint = noColor,
): { context: AppContext; text: () => string; asked: string[] } {
  let buffer = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      buffer += String(chunk);
      callback();
    },
  });
  const asked: string[] = [];
  return {
    context: {
      config: defaultConfig(),
      output: createOutput(stream, paint),
      fetcher: fetch,
      paint,
      prompt: async (label) => {
        asked.push(label);
        return answer;
      },
      persist: async () => {},
    },
    text: () => buffer,
    asked,
  };
}

function stripAnsi(text: string): string {
  return text.replaceAll(/\u001b\[\d+m/g, "");
}

function maxNesting(text: string): number {
  let depth = 0;
  let deepest = 0;
  for (const match of text.matchAll(/\u001b\[(\d+)m/g)) {
    const code = Number(match[1]);
    if (CLEARING.includes(code)) {
      depth = Math.max(0, depth - 1);
    } else {
      depth += 1;
      deepest = Math.max(deepest, depth);
    }
  }
  return deepest;
}

describe("renderMenu", () => {
  test("frames the options in a box", () => {
    const lines = renderMenu(options("One", "Two")).split("\n");
    expect(lines[0]).toBe("═".repeat(40));
    expect(lines[1]).toBe("         WEATHER CLI");
    expect(lines[2]).toBe("═".repeat(40));
    expect(lines[3]).toBe("  1. One");
    expect(lines[4]).toBe("  2. Two");
    expect(lines[5]).toBe("═".repeat(40));
  });

  test("takes the numbering from the option keys", () => {
    const rows = renderMenu([
      { key: "1", label: "First", run: async () => {} },
      { key: "9", label: "Ninth", run: async () => {} },
    ]);
    expect(rows).toContain("  9. Ninth");
  });

  test("is plain by default so piped output stays plain", () => {
    expect(renderMenu(options("One"))).not.toContain("\u001b");
  });

  test("only inserts escape codes into the rendered text", () => {
    const plain = renderMenu(options("One", "Two"));
    const painted = renderMenu(options("One", "Two"), ansiPaint);
    expect(stripAnsi(painted)).toBe(plain);
    expect(maxNesting(painted)).toBe(1);
  });

  test("colours the box and the labels cyan, but not the numbers", () => {
    const lines = renderMenu(options("One"), ansiPaint).split("\n");
    expect(lines[0]).toBe(`\u001b[36m${"═".repeat(40)}\u001b[39m`);
    expect(lines[1]).toBe("\u001b[36m         WEATHER CLI\u001b[39m");
    expect(lines[3]).toBe("  1. \u001b[36mOne\u001b[39m");
  });
});

describe("chooseOption", () => {
  test("draws the menu and returns the option that was picked", async () => {
    const { context: app, text, asked } = context("2");
    const choice = await chooseOption(app, options("One", "Two"));

    expect(choice.kind).toBe("selected");
    expect(choice.kind === "selected" && choice.option.label).toBe("Two");
    expect(asked).toEqual(["  Select an option: "]);
    expect(text()).toContain("  1. One");
  });

  test("tolerates surrounding whitespace in the answer", async () => {
    const { context: app } = context(" 2 ");
    expect((await chooseOption(app, options("One", "Two"))).kind).toBe("selected");
  });

  test("reports an unusable answer without looping", async () => {
    const { context: app, text } = context("nope");
    const choice = await chooseOption(app, options("One", "Two"));

    expect(choice.kind).toBe("invalid");
    expect(text()).toContain("  ! Enter a number between 1 and 2.\n");
  });

  test("reports closed input so the loop can exit", async () => {
    const { context: app } = context(null);
    expect((await chooseOption(app, options("One"))).kind).toBe("closed");
  });
});
