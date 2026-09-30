import { buildMenuOptions } from "./actions/index.ts";
import { WeatherApiError } from "./api/http.ts";
import type { Fetcher } from "./api/http.ts";
import { chooseOption } from "./presentation/menu.ts";
import type { Prompter } from "./presentation/input.ts";
import type { Output } from "./presentation/output.ts";
import type { SettingsStorage } from "./storage/settingsStorage.ts";
import type { AppContext, Config } from "./types/index.ts";
import { noColor } from "./utils/colors.ts";
import type { Paint } from "./utils/colors.ts";
import { EXIT_OPTION_KEY } from "./utils/constants.ts";

export interface ContextParts {
  config: Config;
  input: Prompter;
  output: Output;
  fetcher?: Fetcher;
  storage: SettingsStorage;
  paint?: Paint;
}

export function createContext(parts: ContextParts): AppContext {
  const { config, input, output, storage } = parts;
  const fetcher = parts.fetcher ?? fetch;
  const paint = parts.paint ?? noColor;

  return {
    config,
    output,
    fetcher,
    paint,
    prompt: (label) => input.ask(paint("dim", label)),
    persist: async () => {
      try {
        await storage.save(config);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        output.inlineError(`Could not save settings: ${detail}`);
      }
    },
  };
}

export async function runApp(context: AppContext): Promise<void> {
  for (;;) {
    const choice = await chooseOption(context, buildMenuOptions(context.config));

    if (choice.kind === "closed") {
      context.output.farewell(true);
      return;
    }
    if (choice.kind === "invalid") continue;

    const option = choice.option;
    if (option.key === EXIT_OPTION_KEY) {
      context.output.farewell(false);
      return;
    }

    try {
      await option.run(context);
    } catch (error) {
      if (error instanceof WeatherApiError) {
        context.output.error(error.message);
        continue;
      }
      throw error;
    }
  }
}
