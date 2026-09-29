import { makePaint, noColor } from "./colors.ts";
import type { Paint } from "./colors.ts";
import { defaultConfig, findDefaultCity, saveConfig } from "./config.ts";
import { getCurrentWeather, searchCity, WeatherApiError } from "./openmeteo.ts";
import type { Fetcher } from "./openmeteo.ts";
import { cityLabel, formatUnit, parseChoice, renderCityChoices, renderMenu, renderWeather } from "./ui.ts";
import type { Prompter } from "./ui.ts";
import type { City, Config } from "./types.ts";

export class App {
  constructor(
    private config: Config,
    private readonly prompter: Prompter,
    private readonly fetcher: Fetcher,
    private readonly output: NodeJS.WritableStream,
    private readonly paint: Paint = noColor,
  ) {}

  private write(line: string): void {
    this.output.write(`${line}\n`);
  }

  private prompt(label: string): Promise<string | null> {
    return this.prompter.ask(this.paint("dim", label));
  }

  private async persist(): Promise<void> {
    try {
      await saveConfig(this.config);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.write(`  ${this.paint("red", `! Could not save settings: ${detail}`)}`);
    }
  }

  async run(): Promise<void> {
    for (;;) {
      this.write(renderMenu(this.config, this.paint));
      const answer = await this.prompt("  Select an option: ");
      if (answer === null) {
        this.write(`\n  ${this.paint("green", "Bye!")}`);
        return;
      }

      const choice = answer.trim();
      if (choice === "7") {
        this.write(`  ${this.paint("green", "Bye!")}`);
        return;
      }
      if (!/^[1-6]$/.test(choice)) {
        this.write(`  ${this.paint("red", "! Enter a number between 1 and 7.")}\n`);
        continue;
      }

      try {
        await this.dispatch(choice);
      } catch (error) {
        if (error instanceof WeatherApiError) {
          this.write(`  ${this.paint("red", `! ${error.message}`)}\n`);
        } else {
          throw error;
        }
      }
    }
  }

  private async dispatch(choice: string): Promise<void> {
    switch (choice) {
      case "1":
        return this.showDefaultCity();
      case "2":
        return this.showAllCities();
      case "3":
        return this.searchAndAdd();
      case "4":
        return this.deleteCity();
      case "5":
        return this.setDefaultCity();
      case "6":
        return this.openSettings();
      default:
        return;
    }
  }

  private async showDefaultCity(): Promise<void> {
    const city = findDefaultCity(this.config);
    if (city === null) {
      this.write(`  ${this.paint("red", "! No default city set. Use option 3 to add a city first.")}\n`);
      return;
    }
    const weather = await getCurrentWeather(city, this.config.unit, this.fetcher);
    this.write(`\n${renderWeather(city, weather, this.paint)}\n`);
  }

  private async showAllCities(): Promise<void> {
    if (this.config.cities.length === 0) {
      this.write(`  ${this.paint("red", "! No cities saved yet. Use option 3 to add one.")}\n`);
      return;
    }

    const results = await Promise.allSettled(
      this.config.cities.map((city) => getCurrentWeather(city, this.config.unit, this.fetcher)),
    );

    results.forEach((result, index) => {
      const city = this.config.cities[index];
      if (city === undefined) return;
      if (result.status === "fulfilled") {
        this.write(`\n${renderWeather(city, result.value, this.paint)}`);
      } else {
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        const rule = this.paint("gray", "─".repeat(40));
        this.write(`\n${rule}\n  ${this.paint("red", `! ${cityLabel(city)}: ${reason}`)}\n${rule}`);
      }
    });
    this.write("");
  }

  private async searchAndAdd(): Promise<void> {
    const query = await this.prompt("  City name: ");
    if (query === null) return;
    if (query.trim().length === 0) {
      this.write(`  ${this.paint("red", "! City name cannot be empty.")}\n`);
      return;
    }

    this.write(this.paint("dim", "  Searching..."));
    const results = await searchCity(query, 10, this.fetcher);
    this.write("");
    if (results.length === 0) {
      this.write(`  ${this.paint("red", `! No city found matching "${query.trim()}".`)}\n`);
      return;
    }

    this.write(renderCityChoices(results, this.config.defaultCityId, this.paint));
    const answer = await this.prompt("\n  Select a city to add: ");
    if (answer === null) return;

    const index = parseChoice(answer, results.length);
    if (index === null) {
      this.write(`  ${this.paint("red", "! Invalid selection.")}\n`);
      return;
    }

    const city = results[index];
    if (city === undefined) return;

    if (this.config.cities.some((existing) => existing.id === city.id)) {
      this.write(`  ${this.paint("red", `! ${cityLabel(city)} is already saved.`)}\n`);
      return;
    }

    this.config.cities.push(city);
    if (this.config.defaultCityId === null) {
      this.config.defaultCityId = city.id;
      this.write(`  ${this.paint("green", `Added ${cityLabel(city)} and set it as default.`)}`);
    } else {
      this.write(`  ${this.paint("green", `Added ${cityLabel(city)}.`)}`);
    }
    await this.persist();
    this.write("");
  }

  private async deleteCity(): Promise<void> {
    if (this.config.cities.length === 0) {
      this.write(`  ${this.paint("red", "! No cities saved yet.")}\n`);
      return;
    }

    this.write(renderCityChoices(this.config.cities, this.config.defaultCityId, this.paint));
    const answer = await this.prompt("\n  Select a city to delete: ");
    if (answer === null) return;

    const index = parseChoice(answer, this.config.cities.length);
    if (index === null) {
      this.write(`  ${this.paint("red", "! Invalid selection.")}\n`);
      return;
    }

    const city = this.config.cities[index];
    if (city === undefined) return;

    const confirm = await this.prompt(`  Delete ${cityLabel(city)}? [y/N] `);
    if (confirm === null) return;
    if (!/^y(es)?$/i.test(confirm.trim())) {
      this.write(`  ${this.paint("dim", "Cancelled.")}\n`);
      return;
    }

    this.config.cities.splice(index, 1);
    if (this.config.defaultCityId === city.id) {
      this.config.defaultCityId = null;
      this.write(`  ${this.paint("green", `Deleted ${cityLabel(city)}. No default city is set now.`)}`);
    } else {
      this.write(`  ${this.paint("green", `Deleted ${cityLabel(city)}.`)}`);
    }
    await this.persist();
    this.write("");
  }

  private async setDefaultCity(): Promise<void> {
    if (this.config.cities.length === 0) {
      this.write(`  ${this.paint("red", "! No cities saved yet. Use option 3 to add one.")}\n`);
      return;
    }

    this.write(renderCityChoices(this.config.cities, this.config.defaultCityId, this.paint));
    const answer = await this.prompt("\n  Select the new default: ");
    if (answer === null) return;

    const index = parseChoice(answer, this.config.cities.length);
    if (index === null) {
      this.write(`  ${this.paint("red", "! Invalid selection.")}\n`);
      return;
    }

    const city = this.config.cities[index];
    if (city === undefined) return;

    this.config.defaultCityId = city.id;
    this.write(`  ${this.paint("green", `Default city is now ${cityLabel(city)}.`)}`);
    await this.persist();
    this.write("");
  }

  private async openSettings(): Promise<void> {
    this.write(`  Temperature unit: ${this.paint("yellow", formatUnit(this.config.unit))}`);
    const answer = await this.prompt("  Change to (c)elsius or (f)ahrenheit? [enter keeps current] ");
    if (answer === null) return;

    const choice = answer.trim().toLowerCase();
    if (choice.length === 0) {
      this.write(`  ${this.paint("dim", "Unchanged.")}\n`);
      return;
    }

    if (choice !== "c" && choice !== "f") {
      this.write(`  ${this.paint("red", "! Enter c, f, or press enter.")}\n`);
      return;
    }

    this.config.unit = choice === "c" ? "celsius" : "fahrenheit";
    this.write(`  ${this.paint("green", `Temperature unit set to ${formatUnit(this.config.unit)}.`)}`);
    await this.persist();
    this.write("");
  }
}

export function createApp(
  config: Config,
  prompter: Prompter,
  fetcher: Fetcher = fetch,
  paint: Paint = makePaint(process.stdout),
): App {
  return new App(config, prompter, fetcher, process.stdout, paint);
}

export { defaultConfig };
