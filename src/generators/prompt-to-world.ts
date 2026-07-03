/**
 * Prompt-to-World generator module.
 *
 * Converts a natural-language world description into generation-settings
 * overrides compatible with the existing procedural generation pipeline.
 * No external API dependencies — the parser is fully deterministic and
 * offline-capable.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorldPromptSpec {
  geography: GeographySpec;
  climate: ClimateSpec;
  politics: PoliticsSpec;
  settlements: SettlementsSpec;
}

interface GeographySpec {
  /** Heightmap template key, e.g. "pangea", "archipelago". Undefined = random. */
  template: string | undefined;
}

interface ClimateSpec {
  /** Equator temperature °C (clamped 0–40). */
  equatorTemp: number | undefined;
  /** North pole temperature °C (clamped -50–5). */
  northPoleTemp: number | undefined;
  /** South pole temperature °C (clamped -50–5). */
  southPoleTemp: number | undefined;
  /** Annual precipitation multiplier % (clamped 5–500). */
  precipitation: number | undefined;
}

interface PoliticsSpec {
  /** Desired number of states (clamped 2–50). */
  statesCount: number | undefined;
  /** State size variety (clamped 0–10). */
  sizeVariety: number | undefined;
  /** Growth rate (clamped 0.1–2.0). */
  growthRate: number | undefined;
  /** Provinces per state ratio (clamped 20–100). */
  provincesRatio: number | undefined;
}

interface SettlementsSpec {
  /** Max manors to generate (0–1000; 1000 = auto). */
  manors: number | undefined;
  /** Number of cultures (clamped 5–30). */
  cultures: number | undefined;
  /** Culture set key, e.g. "world", "european", "oriental". */
  culturesSet: string | undefined;
  /** Number of religions (clamped 2–10). */
  religions: number | undefined;
}

/** Flat record of UI-input values to override before map generation. */
export interface GenerationOverrides {
  template?: string;
  statesNumber?: number;
  sizeVariety?: number;
  growthRate?: number;
  provincesRatio?: number;
  manors?: number;
  cultures?: number;
  culturesSet?: string;
  religionsNumber?: number;
  temperatureEquator?: number;
  temperatureNorthPole?: number;
  temperatureSouthPole?: number;
  prec?: number;
}

/** Persisted alongside seed for reproducibility. */
export interface PromptMetadata {
  prompt: string;
  spec: WorldPromptSpec;
  overrides: GenerationOverrides;
  seed: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Keyword tables
// ---------------------------------------------------------------------------

/** Maps geography keywords to heightmap template keys. Priority: first match wins. */
const GEO_RULES: Array<{ keywords: string[]; template: string }> = [
  { keywords: ["pangea", "supercontinent", "single continent", "one continent"], template: "pangea" },
  {
    keywords: ["archipelago", "island chain", "island chains", "many islands", "scattered islands"],
    template: "archipelago"
  },
  { keywords: ["atoll"], template: "atoll" },
  { keywords: ["volcano", "volcanic"], template: "volcano" },
  { keywords: ["isthmus", "narrow land"], template: "isthmus" },
  { keywords: ["mediterranean", "inland sea", "inland seas", "enclosed sea"], template: "mediterranean" },
  { keywords: ["peninsula"], template: "peninsula" },
  { keywords: ["old world", "eurasia-like", "large landmass"], template: "oldWorld" },
  { keywords: ["fractious", "shattered", "broken land", "cracked"], template: "fractious" },
  { keywords: ["continents", "two continents", "multiple continents"], template: "continents" },
  { keywords: ["high island", "large island", "mountainous island"], template: "highIsland" },
  { keywords: ["low island", "flat island", "small island", "island"], template: "lowIsland" }
];

const COLD_KEYWORDS = ["cold", "arctic", "polar", "frozen", "icy", "tundra", "subarctic", "frigid", "ice age"];
const HOT_KEYWORDS = ["tropical", "hot", "scorching", "equatorial", "sweltering", "humid tropics", "jungle"];
const TEMPERATE_KEYWORDS = ["temperate", "mild", "moderate climate", "four seasons"];
const ARID_KEYWORDS = ["arid", "desert", "dry", "drought", "parched", "barren", "wasteland"];
const WET_KEYWORDS = ["wet", "rainy", "humid", "rainforest", "monsoon", "lush", "verdant", "swamp", "bog"];

const FEW_LARGE_KEYWORDS = [
  "few large kingdoms",
  "few large states",
  "one empire",
  "single empire",
  "vast empire",
  "empire",
  "one kingdom",
  "great kingdoms",
  "few nations",
  "large kingdoms"
];
const MANY_SMALL_KEYWORDS = [
  "many small states",
  "many kingdoms",
  "city-states",
  "city states",
  "fragmented",
  "petty kingdoms",
  "tribal",
  "dozens of states",
  "many small kingdoms",
  "small states"
];

const COASTAL_KEYWORDS = ["coastal trade", "maritime", "seafaring", "naval power", "ocean traders", "sea trade"];
const SPARSE_KEYWORDS = ["sparse", "underpopulated", "wilderness", "frontier", "empty lands", "few settlements"];
const DENSE_KEYWORDS = ["dense", "populous", "highly populated", "many cities", "thriving", "bustling"];
const MOUNTAIN_KEYWORDS = ["mountain", "mountains", "highland", "highlands", "mountainous", "rugged terrain"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function matches(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.includes(kw));
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse a free-form world description into a structured {@link WorldPromptSpec}.
 * Fully deterministic; produces the same output for the same input.
 */
export function parsePrompt(rawText: string): WorldPromptSpec {
  const text = rawText.toLowerCase().trim();

  // --- Geography ---
  let template: string | undefined;
  // Special-case: mountain-heavy hints bias toward "oldWorld" template unless
  // another geography term takes precedence.
  const hasMountains = matches(text, MOUNTAIN_KEYWORDS);

  for (const rule of GEO_RULES) {
    if (matches(text, rule.keywords)) {
      template = rule.template;
      break;
    }
  }
  if (!template && hasMountains) template = "oldWorld";

  // --- Climate ---
  let equatorTemp: number | undefined;
  let northPoleTemp: number | undefined;
  let southPoleTemp: number | undefined;
  let precipitation: number | undefined;

  if (matches(text, COLD_KEYWORDS)) {
    equatorTemp = clamp(10, 0, 40);
    northPoleTemp = clamp(-40, -50, 5);
    southPoleTemp = clamp(-35, -50, 5);
  } else if (matches(text, HOT_KEYWORDS)) {
    equatorTemp = clamp(34, 0, 40);
    northPoleTemp = clamp(-10, -50, 5);
    southPoleTemp = clamp(-10, -50, 5);
  } else if (matches(text, TEMPERATE_KEYWORDS)) {
    equatorTemp = clamp(25, 0, 40);
    northPoleTemp = clamp(-20, -50, 5);
    southPoleTemp = clamp(-15, -50, 5);
  }

  if (matches(text, ARID_KEYWORDS)) {
    precipitation = clamp(15, 5, 500);
  } else if (matches(text, WET_KEYWORDS)) {
    precipitation = clamp(250, 5, 500);
  }

  // --- Politics ---
  let statesCount: number | undefined;
  let sizeVariety: number | undefined;
  let growthRate: number | undefined;
  let provincesRatio: number | undefined;

  if (matches(text, FEW_LARGE_KEYWORDS)) {
    statesCount = clamp(6, 2, 50);
    sizeVariety = clamp(2, 0, 10);
    growthRate = clamp(1.8, 0.1, 2.0);
    provincesRatio = clamp(60, 20, 100);
  } else if (matches(text, MANY_SMALL_KEYWORDS)) {
    statesCount = clamp(25, 2, 50);
    sizeVariety = clamp(7, 0, 10);
    growthRate = clamp(1.0, 0.1, 2.0);
    provincesRatio = clamp(30, 20, 100);
  }

  // --- Settlements ---
  let manors: number | undefined;
  let cultures: number | undefined;
  let culturesSet: string | undefined;
  let religions: number | undefined;

  if (matches(text, COASTAL_KEYWORDS)) {
    culturesSet = "world";
    cultures = clamp(15, 5, 30);
  }
  if (matches(text, SPARSE_KEYWORDS)) {
    manors = clamp(200, 0, 1000);
  } else if (matches(text, DENSE_KEYWORDS)) {
    manors = clamp(1000, 0, 1000);
  }

  // Culture-set hints
  if (text.includes("oriental") || text.includes("east asia") || text.includes("far east")) {
    culturesSet = "oriental";
  } else if (text.includes("european") || text.includes("medieval europe") || text.includes("europe")) {
    culturesSet = "european";
  } else if (
    text.includes("high fantasy") ||
    text.includes("tolkien") ||
    text.includes("elves") ||
    text.includes("dwarves")
  ) {
    culturesSet = "highFantasy";
  } else if (text.includes("dark fantasy") || text.includes("grim") || text.includes("grimdark")) {
    culturesSet = "darkFantasy";
  }

  if (text.includes("many gods") || text.includes("polytheistic") || text.includes("many religions")) {
    religions = clamp(9, 2, 10);
  } else if (text.includes("one religion") || text.includes("single religion") || text.includes("monotheistic")) {
    religions = clamp(2, 2, 10);
  }

  return {
    geography: { template },
    climate: { equatorTemp, northPoleTemp, southPoleTemp, precipitation },
    politics: { statesCount, sizeVariety, growthRate, provincesRatio },
    settlements: { manors, cultures, culturesSet, religions }
  };
}

// ---------------------------------------------------------------------------
// Spec → Overrides mapping
// ---------------------------------------------------------------------------

/**
 * Convert a {@link WorldPromptSpec} to flat {@link GenerationOverrides}.
 * Only keys with defined values are emitted; the rest fall back to
 * the engine's own randomization.
 */
export function specToOverrides(spec: WorldPromptSpec): GenerationOverrides {
  const overrides: GenerationOverrides = {};

  const { geography, climate, politics, settlements } = spec;

  if (geography.template !== undefined) overrides.template = geography.template;

  if (climate.equatorTemp !== undefined) overrides.temperatureEquator = climate.equatorTemp;
  if (climate.northPoleTemp !== undefined) overrides.temperatureNorthPole = climate.northPoleTemp;
  if (climate.southPoleTemp !== undefined) overrides.temperatureSouthPole = climate.southPoleTemp;
  if (climate.precipitation !== undefined) overrides.prec = climate.precipitation;

  if (politics.statesCount !== undefined) overrides.statesNumber = politics.statesCount;
  if (politics.sizeVariety !== undefined) overrides.sizeVariety = politics.sizeVariety;
  if (politics.growthRate !== undefined) overrides.growthRate = politics.growthRate;
  if (politics.provincesRatio !== undefined) overrides.provincesRatio = politics.provincesRatio;

  if (settlements.manors !== undefined) overrides.manors = settlements.manors;
  if (settlements.cultures !== undefined) overrides.cultures = settlements.cultures;
  if (settlements.culturesSet !== undefined) overrides.culturesSet = settlements.culturesSet;
  if (settlements.religions !== undefined) overrides.religionsNumber = settlements.religions;

  return overrides;
}

// ---------------------------------------------------------------------------
// Module class exposed to the global scope
// ---------------------------------------------------------------------------

export class PromptToWorldModule {
  /**
   * Parse a world description and return the intermediate spec.
   * @param text — free-form natural-language description
   */
  parse(text: string): WorldPromptSpec {
    return parsePrompt(text);
  }

  /**
   * Convert a spec to a flat overrides object.
   */
  getOverrides(spec: WorldPromptSpec): GenerationOverrides {
    return specToOverrides(spec);
  }

  /**
   * Apply generation overrides to the UI DOM inputs so they take effect when
   * {@link regenerateMap} is subsequently called.
   *
   * Each overridden setting is also *locked* so the engine won't re-randomize it.
   * The caller is responsible for unlocking settings they want freed again.
   */
  applyOverrides(overrides: GenerationOverrides): void {
    const {
      template,
      statesNumber,
      sizeVariety,
      growthRate,
      provincesRatio,
      manors,
      cultures,
      culturesSet,
      religionsNumber,
      temperatureEquator,
      temperatureNorthPole,
      temperatureSouthPole,
      prec
    } = overrides;

    if (template !== undefined) {
      const templateInput = document.querySelector<HTMLSelectElement>("#templateInput");
      if (templateInput) {
        const name = (window as any).heightmapTemplates?.[template]?.name ?? template;
        (window as any).applyOption?.(templateInput, template, name);
        (window as any).lock?.("template");
      }
    }

    if (statesNumber !== undefined) {
      const el = document.querySelector<HTMLInputElement>("#statesNumber");
      if (el) {
        el.value = String(statesNumber);
        (window as any).lock?.("statesNumber");
      }
    }

    if (sizeVariety !== undefined) {
      const el = document.querySelector<HTMLInputElement>("#sizeVariety");
      if (el) {
        el.value = String(sizeVariety);
        (window as any).lock?.("sizeVariety");
      }
    }

    if (growthRate !== undefined) {
      const el = document.querySelector<HTMLInputElement>("#growthRate");
      if (el) {
        el.value = String(growthRate);
        (window as any).lock?.("growthRate");
      }
    }

    if (provincesRatio !== undefined) {
      const el = document.querySelector<HTMLInputElement>("#provincesRatio");
      if (el) {
        el.value = String(provincesRatio);
        (window as any).lock?.("provincesRatio");
      }
    }

    if (manors !== undefined) {
      const el = document.querySelector<HTMLInputElement>("#manorsInput");
      if (el) {
        el.value = String(manors);
        const output = document.querySelector<HTMLOutputElement>("#manorsOutput");
        if (output) output.value = manors === 1000 ? "auto" : String(manors);
        (window as any).lock?.("manors");
      }
    }

    if (cultures !== undefined) {
      const elIn = document.querySelector<HTMLInputElement>("#culturesInput");
      const elOut = document.querySelector<HTMLOutputElement>("#culturesOutput");
      if (elIn) {
        elIn.value = String(cultures);
        (window as any).lock?.("cultures");
      }
      if (elOut) elOut.value = String(cultures);
    }

    if (culturesSet !== undefined) {
      const el = document.querySelector<HTMLSelectElement>("#culturesSet");
      if (el) {
        el.value = culturesSet;
        (window as any).changeCultureSet?.();
        (window as any).lock?.("culturesSet");
      }
    }

    if (religionsNumber !== undefined) {
      const el = document.querySelector<HTMLInputElement>("#religionsNumber");
      if (el) {
        el.value = String(religionsNumber);
        (window as any).lock?.("religionsNumber");
      }
    }

    if (temperatureEquator !== undefined) {
      (window as any).options.temperatureEquator = temperatureEquator;
      (window as any).lock?.("temperatureEquator");
    }
    if (temperatureNorthPole !== undefined) {
      (window as any).options.temperatureNorthPole = temperatureNorthPole;
      (window as any).lock?.("temperatureNorthPole");
    }
    if (temperatureSouthPole !== undefined) {
      (window as any).options.temperatureSouthPole = temperatureSouthPole;
      (window as any).lock?.("temperatureSouthPole");
    }

    if (prec !== undefined) {
      const elIn = document.querySelector<HTMLInputElement>("#precInput");
      const elOut = document.querySelector<HTMLOutputElement>("#precOutput");
      if (elIn) elIn.value = String(prec);
      if (elOut) elOut.value = String(prec);
      (window as any).lock?.("prec");
    }
  }

  /**
   * Build and store metadata for reproducibility.
   * Writes into `options.promptMetadata` so it is persisted with the .map file.
   */
  storeMetadata(prompt: string, spec: WorldPromptSpec, overrides: GenerationOverrides): void {
    const metadata: PromptMetadata = {
      prompt,
      spec,
      overrides,
      seed: (window as any).seed ?? "",
      timestamp: Date.now()
    };
    if ((window as any).options) {
      (window as any).options.promptMetadata = metadata;
    }
  }
}

declare global {
  var PromptToWorld: PromptToWorldModule;
}

window.PromptToWorld = new PromptToWorldModule();
