import type { AppContext, MenuOption } from "../types/index.ts";
import { noColor } from "../utils/colors.ts";
import type { Paint } from "../utils/colors.ts";
import { BOX_WIDTH } from "../utils/constants.ts";

const SEPARATOR = "═".repeat(BOX_WIDTH);

export function renderMenu(options: MenuOption[], paint: Paint = noColor): string {
  return [
    paint("cyan", SEPARATOR),
    paint("cyan", "         WEATHER CLI"),
    paint("cyan", SEPARATOR),
    ...options.map((option) => `  ${option.key}. ${paint("cyan", option.label)}`),
    paint("cyan", SEPARATOR),
  ].join("\n");
}

export type MenuChoice =
  | { readonly kind: "selected"; readonly option: MenuOption }
  | { readonly kind: "invalid" }
  /** stdin closed, so there is nothing left to prompt for. */
  | { readonly kind: "closed" };

/** Draws the menu and resolves the answer to one of its options. */
export async function chooseOption(context: AppContext, options: MenuOption[]): Promise<MenuChoice> {
  context.output.line(renderMenu(options, context.paint));

  const answer = await context.prompt("  Select an option: ");
  if (answer === null) return { kind: "closed" };

  const option = options.find((candidate) => candidate.key === answer.trim());
  if (option === undefined) {
    context.output.error(`Enter a number between 1 and ${options.length}.`);
    return { kind: "invalid" };
  }

  return { kind: "selected", option };
}
