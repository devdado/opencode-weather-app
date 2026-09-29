import { createApp } from "./src/app.ts";
import { loadConfig } from "./src/config.ts";
import { Prompter } from "./src/ui.ts";

async function main(): Promise<void> {
  const { config, warning } = await loadConfig();
  if (warning !== null) {
    console.log(`  ! ${warning}`);
  }

  const prompter = new Prompter();
  process.on("SIGINT", () => {
    prompter.close();
    console.log("\n  Bye!");
    process.exit(0);
  });

  try {
    await createApp(config, prompter).run();
  } finally {
    prompter.close();
  }
}

await main();
