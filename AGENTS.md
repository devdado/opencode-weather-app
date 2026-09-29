# AGENTS.md

## Project

`02-weather` — a Bun + TypeScript console app that asks for a city and prints its weather.
Two-step OpenMeteo flow (geocoding → forecast). End goal is a standalone compiled binary.
`README.md` is the requirements spec (menu layout, feature list); treat it as authoritative over assumptions.

Currently a working CLI. `index.ts` is the entrypoint (referenced by `package.json`
`module`) and does nothing but wire things up — logic lives in `src/`:

| File | Role |
| --- | --- |
| `src/app.ts` | Menu loop and the option 1–7 handlers |
| `src/openmeteo.ts` | API layer; `fetch` is injectable so tests never hit the network |
| `src/config.ts` | `~/.weather-cli/config.json` load/save, with corrupt-file recovery |
| `src/ui.ts` | Menu/weather rendering plus the `Prompter` (see below) |
| `src/weather-codes.ts` | WMO code → label + emoji map |
| `src/types.ts` | `City`, `Config`, `Weather`, `TemperatureUnit` |

No lint/format config. Keep `index.ts` runnable.

## Commands

There is **no `scripts` block in `package.json`** — `npm run dev` / `bun run test` do not exist. Use:

| Task | Command |
| --- | --- |
| Run | `npm start` (= `bun run index.ts`) |
| Watch | `npm run dev` (= `bun run index.ts --watch`) |
| Build binary | `npm run build` → `dist/weather` |
| Typecheck | `bunx tsc --noEmit` |
| Test | `bun test` (Bun's built-in runner; needs no install) |
| Single test | `bun test path/to/file.test.ts` / `bun test -t "name"` |

Notes:

- `tsc` is a **peerDependency only** and is not on `PATH`. `tsc --noEmit` fails; use `bunx tsc`.
- Bun's test discovery glob is `**{.test,.spec,_test_,_spec_}.{js,ts,jsx,tsx}` — use `foo.test.ts`.
- Don't add a linter/formatter unprompted — none is configured. `bunx biome`/`prettier` on request only.
- The CLI reads stdin, so it smoke-tests without a TTY:
  `printf '3\nOttawa\n1\n1\n7\n' | bun run index.ts`.
  Prefix with `HOME=/tmp/scratch` to keep the run out of the real `~/.weather-cli/config.json`.

## Building the binary (Bun 1.4.2)

`npm run build` is `bunx tsc --noEmit && bun build --compile index.ts --outfile dist/weather`.
Three things that are not obvious, all measured rather than assumed:

- **The `tsc` step is load-bearing.** `bun build --compile` does not typecheck — it happily
  compiled `const n: number = "definitely a string"` into a working binary. Don't drop the
  `&& bunx tsc --noEmit` half; nothing else will catch a type error before it ships.
- **`--bytecode` does not work on this entrypoint.** It fails with `Expected "=>" but found ";"`
  on `index.ts` because of top-level `await main()`. Rewriting to avoid TLA is not worth it:
  measured startup was 5–7 ms either way, so bytecode bought nothing. Don't reach for it.
- **`--minify` does not shrink the output** (78 MB with or without). The size is the embedded
  Bun runtime, not our ~500 lines. Don't bother, and don't treat 78 MB as a regression.

`dist/` is already in `.gitignore`, so the artifact never shows up in `git status`.

## tsconfig gotchas

`tsconfig.json` sets flags that will fail the typecheck if ignored:

- `verbatimModuleSyntax: true` — type-only imports **must** use `import type { X } from "..."`.
- `noUncheckedIndexedAccess: true` — `arr[0]` is `T | undefined`; guard before use.
- `noEmit: true` — never produce JS via `tsc`. Build with `bun build --compile`.
- `allowImportingTsExtensions` + `moduleResolution: "bundler"` — relative imports may include `.ts`.
- ESM only (`"type": "module"`). No `require`, no `__dirname`.

## Interactive input (Bun 1.4.2)

Two Bun bugs shape `src/ui.ts`. Both were reproduced, not assumed — don't "simplify"
the `Prompter` back into something that looks more conventional:

- `node:readline/promises` **throws** `TypeError: Attempted to assign to readonly property`
  when constructed with `Bun.stdin`. Only the callback `node:readline` works, and only
  with `process.stdin`.
- The callback `rl.question()` **silently drops lines when stdin is piped** rather than a
  TTY — the second prompt in a loop just hangs. The fix is to pull from
  `rl[Symbol.asyncIterator]()` one line at a time, which works for both TTY and pipes and
  still lets the prompt be written *before* the read is awaited.
- `src/ui.test.ts` guards this with a piped `Readable`; if you swap the prompt mechanism,
  that test is the one that will tell you.

## OpenMeteo

No API key, no `.env` — do not add auth or env plumbing. Endpoints are reachable from this machine.

1. Geocoding: `https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=<n>&language=en&format=json`
2. Forecast: `https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>&current=temperature_2m,weather_code,is_day&temperature_unit=<celsius|fahrenheit>`

- **An unknown city returns HTTP 200 with the `results` key entirely absent**
  (`{"generationtime_ms":0.92}`) — not `[]`. `json.results[0]` therefore throws, so the
  guard must be an `Array.isArray` presence check.
- The API returns only *numeric* WMO weather codes; the label/emoji table is ours, and the
  official code list is in `src/weather-codes.ts`.
- Unit conversion is server-side via `temperature_unit`. Don't convert on the client, and
  read the unit label back from `current_units.temperature_2m` rather than hardcoding.
- API errors come back as `{"error": true, "reason": "..."}` with a non-2xx status.
- Geocoding is `language=en` (the README used `language=es` originally); keep it in sync
  with the README.
