import { createContext, runApp } from "./app.ts";
import { Prompter } from "./presentation/input.ts";
import { createOutput } from "./presentation/output.ts";
import { createSettingsStorage } from "./storage/settingsStorage.ts";
import { makePaint } from "./utils/colors.ts";

async function main(): Promise<void> {
  const paint = makePaint(process.stdout);
  const output = createOutput(process.stdout, paint);
  const storage = createSettingsStorage();

  const { config, warning } = await storage.load();
  if (warning !== null) {
    output.inlineError(warning);
  }

  const input = new Prompter();
  process.on("SIGINT", () => {
    input.close();
    output.farewell(true);
    process.exit(0);
  });

  try {
    await runApp(createContext({ config, input, output, storage, paint }));
  } finally {
    input.close();
  }
}

await main();
