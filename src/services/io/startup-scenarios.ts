const STARTUP_SCENARIOS = {
  monocerotia: "scenarios/Monocerotia.map"
} as const;

type StartupScenarioId = keyof typeof STARTUP_SCENARIOS;

const DEFAULT_STARTUP_SCENARIO: StartupScenarioId = "monocerotia";
const DISABLED_SCENARIO_VALUES = new Set(["none", "off", "false"]);

export function resolveStartupScenarioUrl(locationHref: string): string | null {
  const url = new URL(locationHref);
  const requestedScenario = (url.searchParams.get("scenario") || DEFAULT_STARTUP_SCENARIO).trim().toLowerCase();

  if (!requestedScenario || DISABLED_SCENARIO_VALUES.has(requestedScenario)) return null;
  if (!(requestedScenario in STARTUP_SCENARIOS)) return null;

  const baseUrl = new URL(".", url);
  return new URL(STARTUP_SCENARIOS[requestedScenario as StartupScenarioId], baseUrl).toString();
}
