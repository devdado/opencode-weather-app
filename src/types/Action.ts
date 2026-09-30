import type { AppContext } from "./AppContext.ts";

/** One user-selectable menu entry; see `buildMenuOptions` in `actions/index.ts`. */
export type Action = (context: AppContext) => Promise<void>;
