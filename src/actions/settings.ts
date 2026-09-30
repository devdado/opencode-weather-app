import { isBlank, parseUnit } from "../presentation/input.ts";
import type { AppContext } from "../types/index.ts";
import { formatUnit } from "../utils/format.ts";

export async function openSettings(context: AppContext): Promise<void> {
  context.output.status("Temperature unit:", formatUnit(context.config.unit));

  const answer = await context.prompt("  Change to (c)elsius or (f)ahrenheit? [enter keeps current] ");
  if (answer === null) return;

  if (isBlank(answer)) {
    context.output.note("Unchanged.");
    return;
  }

  const unit = parseUnit(answer);
  if (unit === null) {
    context.output.error("Enter c, f, or press enter.");
    return;
  }

  context.config.unit = unit;
  context.output.success(`Temperature unit set to ${formatUnit(unit)}.`);
  await context.persist();
  context.output.blank();
}
