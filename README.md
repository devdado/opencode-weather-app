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
https://geocoding-api.open-meteo.com/v1/search?name=Ottawa&count=1&language=es&format=json
https://api.open-meteo.com/v1/forecast?latitude=45.41117&longitude=-75.69812&current=temperature_2m
```

## Init Project

```bash
bun init
```

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
  8. Settings (°C)
  9. Exit
════════════════════════════════════════
  Select an option: 5
```
