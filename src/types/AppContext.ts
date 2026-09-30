import type { Fetcher } from "../api/http.ts";
import type { Output } from "../presentation/output.ts";
import type { Paint } from "../utils/colors.ts";
import type { Config } from "./Config.ts";

/**
 * Everything an action needs, assembled once by the entry point. Actions read
 * `config`, write through `output`/`prompt`, and never reach for a global.
 */
export interface AppContext {
  readonly config: Config;
  readonly output: Output;
  readonly fetcher: Fetcher;
  readonly paint: Paint;
  /** Asks a question, printing the label dimmed. Null once stdin is closed. */
  prompt(label: string): Promise<string | null>;
  /** Writes the current config, reporting a failure instead of throwing. */
  persist(): Promise<void>;
}
