import type { Action } from "./Action.ts";

export interface MenuOption {
  readonly key: string;
  readonly label: string;
  readonly run: Action;
}
