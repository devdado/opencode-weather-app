import { describe, expect, test } from "bun:test";
import { Readable, Writable } from "node:stream";
import { isBlank, parseChoice, parseUnit, parseYes, Prompter } from "./input.ts";

function collector(): { stream: Writable; text: () => string } {
  let buffer = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      buffer += String(chunk);
      callback();
    },
  });
  return { stream, text: () => buffer };
}

function readable(lines: string[]): NodeJS.ReadableStream {
  return Readable.from(lines) as unknown as NodeJS.ReadableStream;
}

describe("Prompter", () => {
  test("reads piped input line by line without dropping any", async () => {
    // The callback form of rl.question() loses lines when stdin is not a TTY,
    // so this guards the async-iterator behaviour the app depends on.
    const output = collector();
    const prompter = new Prompter(readable(["5\n", "3\n", "7\n"]), output.stream);

    expect(await prompter.ask("a: ")).toBe("5");
    expect(await prompter.ask("b: ")).toBe("3");
    expect(await prompter.ask("c: ")).toBe("7");

    prompter.close();
    expect(output.text()).toBe("a: b: c: ");
  });

  test("returns null at end of input so the app can exit", async () => {
    const output = collector();
    const prompter = new Prompter(readable([]), output.stream);

    expect(await prompter.ask("a: ")).toBeNull();
  });

  test("returns null once closed", async () => {
    const output = collector();
    const prompter = new Prompter(readable(["1\n"]), output.stream);
    prompter.close();
    expect(await prompter.ask("a: ")).toBeNull();
  });
});

describe("isBlank", () => {
  test("treats whitespace as nothing typed", () => {
    expect(isBlank("")).toBe(true);
    expect(isBlank("   ")).toBe(true);
    expect(isBlank("\t")).toBe(true);
    expect(isBlank("Ottawa")).toBe(false);
  });
});

describe("parseChoice", () => {
  test("converts a one-based selection to an index", () => {
    expect(parseChoice("1", 3)).toBe(0);
    expect(parseChoice(" 3 ", 3)).toBe(2);
  });

  test("rejects out-of-range and non-numeric input", () => {
    expect(parseChoice("0", 3)).toBeNull();
    expect(parseChoice("4", 3)).toBeNull();
    expect(parseChoice("abc", 3)).toBeNull();
    expect(parseChoice("", 3)).toBeNull();
  });

  test("rejects everything when there is nothing to choose", () => {
    expect(parseChoice("1", 0)).toBeNull();
  });
});

describe("parseYes", () => {
  test("accepts the ways people say yes", () => {
    expect(parseYes("y")).toBe(true);
    expect(parseYes("Y")).toBe(true);
    expect(parseYes("yes")).toBe(true);
    expect(parseYes(" YES ")).toBe(true);
  });

  test("treats anything else, including empty input, as no", () => {
    expect(parseYes("")).toBe(false);
    expect(parseYes("n")).toBe(false);
    expect(parseYes("no")).toBe(false);
    expect(parseYes("yep")).toBe(false);
  });
});

describe("parseUnit", () => {
  test("maps the shortcuts to units", () => {
    expect(parseUnit("c")).toBe("celsius");
    expect(parseUnit("F")).toBe("fahrenheit");
    expect(parseUnit(" f ")).toBe("fahrenheit");
  });

  test("rejects anything else so the action can explain", () => {
    expect(parseUnit("")).toBeNull();
    expect(parseUnit("kelvin")).toBeNull();
    expect(parseUnit("1")).toBeNull();
  });
});
