import { describe, expect, it } from "vitest";
import { parsePrompt, specToOverrides } from "./prompt-to-world";

// ---------------------------------------------------------------------------
// parsePrompt — geography
// ---------------------------------------------------------------------------

describe("parsePrompt — geography", () => {
  it("detects pangea / supercontinent", () => {
    expect(parsePrompt("A world with a single supercontinent").geography.template).toBe("pangea");
    expect(parsePrompt("A pangea world").geography.template).toBe("pangea");
  });

  it("detects archipelago / island chain", () => {
    expect(parsePrompt("A world of scattered islands and island chains").geography.template).toBe("archipelago");
    expect(parsePrompt("An archipelago with many small islands").geography.template).toBe("archipelago");
  });

  it("detects mediterranean / inland sea", () => {
    expect(parsePrompt("Dominated by an inland sea surrounded by dry lands").geography.template).toBe("mediterranean");
  });

  it("detects peninsula", () => {
    expect(parsePrompt("A long peninsula jutting into the ocean").geography.template).toBe("peninsula");
  });

  it("detects continents", () => {
    expect(parsePrompt("Multiple continents separated by vast oceans").geography.template).toBe("continents");
  });

  it("falls back to oldWorld for mountain-heavy worlds without other geo terms", () => {
    expect(parsePrompt("A world with mountains everywhere and rugged terrain").geography.template).toBe("oldWorld");
  });

  it("returns undefined template when no geography keywords match", () => {
    expect(parsePrompt("A generic fantasy world").geography.template).toBeUndefined();
  });

  it("first matching geo rule wins (archipelago beats island)", () => {
    expect(parsePrompt("An archipelago world with a single large island too").geography.template).toBe("archipelago");
  });
});

// ---------------------------------------------------------------------------
// parsePrompt — climate
// ---------------------------------------------------------------------------

describe("parsePrompt — climate", () => {
  it("sets cold temperatures for arctic world", () => {
    const spec = parsePrompt("A cold arctic frozen world");
    expect(spec.climate.equatorTemp).toBe(10);
    expect(spec.climate.northPoleTemp).toBe(-40);
  });

  it("sets hot temperatures for tropical world", () => {
    const spec = parsePrompt("A tropical hot jungle world");
    expect(spec.climate.equatorTemp).toBe(34);
    expect(spec.climate.northPoleTemp).toBe(-10);
  });

  it("sets temperate temperatures for mild world", () => {
    const spec = parsePrompt("A temperate world with four seasons");
    expect(spec.climate.equatorTemp).toBe(25);
  });

  it("sets low precipitation for arid/desert world", () => {
    const spec = parsePrompt("An arid desert world");
    expect(spec.climate.precipitation).toBe(15);
  });

  it("sets high precipitation for wet/rainy world", () => {
    const spec = parsePrompt("A lush rainy monsoon world");
    expect(spec.climate.precipitation).toBe(250);
  });

  it("leaves climate undefined when no climate keywords", () => {
    const spec = parsePrompt("A world with lots of states");
    expect(spec.climate.equatorTemp).toBeUndefined();
    expect(spec.climate.precipitation).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// parsePrompt — politics
// ---------------------------------------------------------------------------

describe("parsePrompt — politics", () => {
  it("returns few large states for 'few large kingdoms'", () => {
    const spec = parsePrompt("A world with few large kingdoms ruled by emperors");
    expect(spec.politics.statesCount).toBe(6);
    expect(spec.politics.growthRate).toBe(1.8);
  });

  it("returns many small states for city-states", () => {
    const spec = parsePrompt("A fragmented world of city-states");
    expect(spec.politics.statesCount).toBe(25);
    expect(spec.politics.sizeVariety).toBe(7);
  });

  it("returns empire variant for single empire", () => {
    const spec = parsePrompt("One vast empire controls the world");
    expect(spec.politics.statesCount).toBe(6);
  });

  it("leaves politics undefined when no political keywords", () => {
    const spec = parsePrompt("A world with forests");
    expect(spec.politics.statesCount).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// parsePrompt — settlements
// ---------------------------------------------------------------------------

describe("parsePrompt — settlements", () => {
  it("sets coastal culture set for maritime worlds", () => {
    const spec = parsePrompt("A seafaring maritime world with coastal trade cities");
    expect(spec.settlements.culturesSet).toBe("world");
    expect(spec.settlements.cultures).toBe(15);
  });

  it("sets sparse manors for wilderness worlds", () => {
    const spec = parsePrompt("A sparse wilderness frontier");
    expect(spec.settlements.manors).toBe(200);
  });

  it("sets dense manors for populous worlds", () => {
    const spec = parsePrompt("A dense and bustling world with many cities");
    expect(spec.settlements.manors).toBe(1000);
  });

  it("detects oriental culture set", () => {
    const spec = parsePrompt("An oriental far east inspired world");
    expect(spec.settlements.culturesSet).toBe("oriental");
  });

  it("detects high fantasy culture set", () => {
    const spec = parsePrompt("A high fantasy world with elves and dwarves");
    expect(spec.settlements.culturesSet).toBe("highFantasy");
  });

  it("detects many religions", () => {
    const spec = parsePrompt("A polytheistic world with many gods");
    expect(spec.settlements.religions).toBe(9);
  });

  it("detects monotheistic religion", () => {
    const spec = parsePrompt("A monotheistic world with one religion");
    expect(spec.settlements.religions).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// parsePrompt — case insensitivity
// ---------------------------------------------------------------------------

describe("parsePrompt — case insensitivity", () => {
  it("parses all-caps input", () => {
    expect(parsePrompt("ARCHIPELAGO WORLD WITH SCATTERED ISLANDS").geography.template).toBe("archipelago");
  });

  it("parses mixed-case input", () => {
    expect(parsePrompt("A Cold Arctic World With Mountains").geography.template).toBe("oldWorld");
  });
});

// ---------------------------------------------------------------------------
// specToOverrides
// ---------------------------------------------------------------------------

describe("specToOverrides", () => {
  it("omits undefined fields from overrides", () => {
    const spec = parsePrompt("A generic world");
    const overrides = specToOverrides(spec);
    // Nothing should be set for a truly empty spec
    expect(Object.keys(overrides).length).toBe(0);
  });

  it("maps statesCount to statesNumber", () => {
    const spec = parsePrompt("A world with few large kingdoms");
    const overrides = specToOverrides(spec);
    expect(overrides.statesNumber).toBe(6);
  });

  it("maps equatorTemp to temperatureEquator", () => {
    const spec = parsePrompt("A tropical world");
    const overrides = specToOverrides(spec);
    expect(overrides.temperatureEquator).toBe(34);
  });

  it("maps precipitation", () => {
    const spec = parsePrompt("An arid desert world");
    const overrides = specToOverrides(spec);
    expect(overrides.prec).toBe(15);
  });

  it("maps template", () => {
    const spec = parsePrompt("A pangea world");
    const overrides = specToOverrides(spec);
    expect(overrides.template).toBe("pangea");
  });

  it("maps culturesSet", () => {
    const spec = parsePrompt("A high fantasy world with elves");
    const overrides = specToOverrides(spec);
    expect(overrides.culturesSet).toBe("highFantasy");
  });

  it("returns multiple overrides for a complex description", () => {
    const spec = parsePrompt("A cold arctic archipelago with few large kingdoms and sparse settlements");
    const overrides = specToOverrides(spec);
    expect(overrides.template).toBe("archipelago");
    expect(overrides.temperatureEquator).toBe(10);
    expect(overrides.statesNumber).toBe(6);
    expect(overrides.manors).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("parsePrompt — edge cases", () => {
  it("handles empty string without throwing", () => {
    expect(() => parsePrompt("")).not.toThrow();
    const spec = parsePrompt("");
    expect(spec.geography.template).toBeUndefined();
  });

  it("handles very long input without throwing", () => {
    const long = `${"a ".repeat(5000)}archipelago`;
    expect(() => parsePrompt(long)).not.toThrow();
    expect(parsePrompt(long).geography.template).toBe("archipelago");
  });

  it("returns deterministic results for same input", () => {
    const text = "A cold arctic world with mountains and few large kingdoms";
    expect(parsePrompt(text)).toEqual(parsePrompt(text));
  });
});
