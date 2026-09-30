import { createInterface } from "node:readline";
import type { Interface } from "node:readline";
import type { TemperatureUnit } from "../types/index.ts";

/**
 * `node:readline/promises` throws on Bun 1.4.2, and the callback `rl.question()`
 * silently drops lines when stdin is piped rather than a TTY. Pulling from the
 * readline async iterator one line at a time works for both, and still lets the
 * prompt be written before the read is awaited.
 */
export class Prompter {
  private readonly rl: Interface;
  private readonly output: NodeJS.WritableStream;
  private readonly lines: AsyncIterator<string>;
  private closed = false;

  constructor(input: NodeJS.ReadableStream = process.stdin, output: NodeJS.WritableStream = process.stdout) {
    this.rl = createInterface({ input, output });
    this.output = output;
    this.lines = this.rl[Symbol.asyncIterator]() as AsyncIterator<string>;
  }

  async ask(label: string): Promise<string | null> {
    if (this.closed) return null;
    this.output.write(label);
    const next = await this.lines.next();
    if (next.done === true) {
      this.close();
      return null;
    }
    return next.value;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.rl.close();
  }
}

export function isBlank(input: string): boolean {
  return input.trim().length === 0;
}

/** Converts a one-based menu/list selection to an index, or null if unusable. */
export function parseChoice(input: string, length: number): number | null {
  const value = Number.parseInt(input.trim(), 10);
  if (!Number.isInteger(value) || value < 1 || value > length) return null;
  return value - 1;
}

export function parseYes(input: string): boolean {
  return /^y(es)?$/i.test(input.trim());
}

export function parseUnit(input: string): TemperatureUnit | null {
  const choice = input.trim().toLowerCase();
  if (choice === "c") return "celsius";
  if (choice === "f") return "fahrenheit";
  return null;
}
