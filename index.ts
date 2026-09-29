import { createApp } from "./src/app.ts";
import { makePaint } from "./src/colors.ts";
import { loadConfig } from "./src/config.ts";
import { Prompter } from "./src/ui.ts";

async function main(): Promise<void> {
  const paint = makePaint(process.stdout);
  const { config, warning } = await loadConfig();
  if (warning !== null) {
    console.log(`  ${paint("red", `! ${warning}`)}`);
  }

  const prompter = new Prompter();
  process.on("SIGINT", () => {
    prompter.close();
    console.log(`\n  ${paint("green", "Bye!")}`);
    process.exit(0);
  });

  try {
    await createApp(config, prompter, fetch, paint).run();
  } finally {
    prompter.close();
  }
}

await main();
