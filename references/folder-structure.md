## Desired Structure

```bash
src/
├── actions/                # Main actions the user can perform
│   ├── getWeather.ts       # Get weather from a city
│   ├── addCity.ts          # Add new city to the list
│   ├── removeCity.ts       # Delete a city
│   ├── setDefaultCity.ts   # Set default city
│   ├── listCities.ts       # List all saved cities
│   └── ...                 # Another future actions
├── presentation/           # All related with console/CLI interaction
│   ├── menu.ts             # Render menu and choosing option
│   ├── output.ts           # Functions to show messages to the user
│   ├── input.ts            # Functions to validate user input
│   └── ...                 # Another presentation components
├── storage/                # Layer to read, write and manage local data
│   ├── citiesStorage.ts    # Persistence of saved cities
│   ├── settingsStorage.ts  # Persistence of settings and preferences
│   └── ...                 # Another storing options
├── types/                  # Global Typescript types
│   ├── City.ts             # City type
│   ├── Weather.ts          # Weather Response type
│   ├── MenuOption.ts       # Menu Option type
│   └── ...                 # Other global types
├── api/                    # External API integrations (OpenMeteo, geocoding)
│   ├── geocoding.ts        # Logic to get city coordinates
│   ├── weather.ts          # Logic to get weather of a city and forecast
│   └── ...                 # Other APIs
├── utils/                  # Utilities and reusable helpers
│   ├── format.ts           # Data formatters (dates, temperatures, etc)
│   ├── constants.ts        # Global constants
│   ├── colors.ts           # Color definitions
│   └── ...                 # Other utilities
├── index.ts                # Entry point
```
