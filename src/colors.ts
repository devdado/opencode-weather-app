export type StyleName = "bold" | "dim" | "red" | "green" | "yellow" | "cyan" | "white" | "gray";

/** Wraps text in an SGR pair, or returns it untouched when colouring is off. */
export type Paint = (style: StyleName, text: string) => string;

const SGR: Record<StyleName, readonly [number, number]> = {
  bold: [1, 22],
  dim: [2, 22],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  cyan: [36, 39],
  white: [37, 39],
  gray: [90, 39],
};

export const noColor: Paint = (_style, text) => text;

export function ansiPaint(style: StyleName, text: string): string {
  const [open, close] = SGR[style];
  return `\u001b[${open}m${text}\u001b[${close}m`;
}

function isOff(value: string | undefined): boolean {
  return value === "0" || value === "false";
}

function isOn(value: string | undefined): boolean {
  return value !== undefined && value.length > 0;
}

export function colorEnabled(
  stream: { isTTY?: boolean } = process.stdout,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const force = env["FORCE_COLOR"];
  if (isOff(force)) return false;
  if (isOn(env["NO_COLOR"])) return false;
  if (isOn(force)) return true;
  return stream.isTTY === true;
}

export function makePaint(stream: { isTTY?: boolean } = process.stdout, env: NodeJS.ProcessEnv = process.env): Paint {
  return colorEnabled(stream, env) ? ansiPaint : noColor;
}
