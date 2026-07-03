import { describe, expect, it } from "vitest";
import { resolveStartupScenarioUrl } from "./startup-scenarios";

describe("resolveStartupScenarioUrl", () => {
  it("defaults to the bundled Monocerotia scenario", () => {
    expect(resolveStartupScenarioUrl("http://localhost:5173/Fantasy-Map-Generator/")).toBe(
      "http://localhost:5173/Fantasy-Map-Generator/scenarios/Monocerotia.map"
    );
  });

  it("supports explicitly enabling Monocerotia via query param", () => {
    expect(resolveStartupScenarioUrl("http://localhost:5173/Fantasy-Map-Generator/?scenario=monocerotia")).toBe(
      "http://localhost:5173/Fantasy-Map-Generator/scenarios/Monocerotia.map"
    );
  });

  it("disables scenario startup when scenario=none", () => {
    expect(resolveStartupScenarioUrl("http://localhost:5173/Fantasy-Map-Generator/?scenario=none")).toBeNull();
  });

  it("ignores unknown scenarios and falls back to normal startup", () => {
    expect(resolveStartupScenarioUrl("http://localhost:5173/Fantasy-Map-Generator/?scenario=unknown")).toBeNull();
  });
});
