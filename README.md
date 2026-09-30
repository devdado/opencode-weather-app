## Weather CLI APP

The goal of this project is to create a console application that prompts the user to enter a city. Ultimately, we will generate an executable binary.

### Options

- Enter city name.
- Save city as default.
- Register other cities to check weather in them.

## Stack

- Bun.js
- OpenMeteo

## HTTP Request Example

1. Step 1: Geocoding API.
2. Step 2: OpenMeteo API.

```
https://geocoding-api.open-meteo.com/v1/search?name=Ottawa&count=1&language=en&format=json
https://api.open-meteo.com/v1/forecast?latitude=45.41117&longitude=-75.69812&current=temperature_2m
```

## Init Project

```bash
bun init
```

## Commands

```bash
npm start          # run the app
npm run dev        # run with hot reload
npm run build      # typecheck, then compile to dist/weather
bun test           # run the test suite
```

`npm run build` produces a self-contained executable at `dist/weather`. Run it from
any terminal — it does not need Node, Bun, or a project checkout to be present:

```bash
./dist/weather
```

The binary is roughly 78 MB because it embeds the Bun runtime; that is expected and
not something to optimise away. The output is Linux-only.

### Menu Example

This is the look we want to achieve:

```bash
════════════════════════════════════════
         WEATHER CLI
════════════════════════════════════════
  1. City weather (default)
  2. All cities weather (1)
  3. Search and add city
  4. Delete city
  5. Set default city
  6. Settings (°C)
  7. Exit
═══════════════════════════════════════
  Select an option: 5
```

### Where Settings Are Stored

Saved cities, the default city, and the temperature unit live in
`~/.weather-cli/config.json`. The file is created on first change and survives
rebuilding or moving the binary. If it ever becomes unreadable, it is reset and
the previous contents are kept alongside it as `config.json.corrupt`.

### Colours

Output is coloured when stdout is a terminal: the menu box and option labels are
cyan, temperatures yellow, success messages green and errors red. When the output
is piped or redirected it is plain text, so logs and CI output stay readable:

```bash
bun run src/index.ts | tee weather.log          # no escape codes
```

Two environment variables override the detection, following the `NO_COLOR`
convention:

| Variable | Effect |
| --- | --- |
| `NO_COLOR=1` | Never colour the output, even on a terminal. |
| `FORCE_COLOR=1` | Always colour the output, even when piped. |

`FORCE_COLOR=0` disables colour, and `NO_COLOR` takes precedence over any
`FORCE_COLOR` value that would enable it.
