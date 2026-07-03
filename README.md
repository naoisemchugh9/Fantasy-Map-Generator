# Fantasy Map Generator

Azgaar's _Fantasy Map Generator_ is a free web application that helps fantasy writers, game masters, and cartographers create and edit fantasy maps.

Link: [azgaar.github.io/Fantasy-Map-Generator](https://azgaar.github.io/Fantasy-Map-Generator).

Refer to the [project wiki](https://github.com/Azgaar/Fantasy-Map-Generator/wiki) for guidance. The current progress is tracked in [Trello](https://trello.com/b/7x832DG4/fantasy-map-generator). Some details are covered in my old blog [_Fantasy Maps for fun and glory_](https://azgaar.wordpress.com).

[![preview](https://github.com/Azgaar/Fantasy-Map-Generator/assets/26469650/9502eae9-92e0-4d0d-9f17-a2ba4a565c01)](https://github.com/Azgaar/Fantasy-Map-Generator/assets/26469650/11a42446-4bd5-4526-9cb1-3ef97c868992)

[![preview](https://github.com/Azgaar/Fantasy-Map-Generator/assets/26469650/e751a9e5-7986-4638-b8a9-362395ef7583)](https://github.com/Azgaar/Fantasy-Map-Generator/assets/26469650/e751a9e5-7986-4638-b8a9-362395ef7583)

[![preview](https://github.com/Azgaar/Fantasy-Map-Generator/assets/26469650/b0d0efde-a0d1-4e80-8818-ea3dd83c2323)](https://github.com/Azgaar/Fantasy-Map-Generator/assets/26469650/b0d0efde-a0d1-4e80-8818-ea3dd83c2323)

Join our [Discord server](https://discordapp.com/invite/X7E84HU) and [Reddit community](https://www.reddit.com/r/FantasyMapGenerator) to share your creations, discuss the Generator, suggest ideas and get the most recent updates.

Contact me via [email](mailto:azgaar.fmg@yandex.com) if you have non-public suggestions. For bug reports please use [GitHub issues](https://github.com/Azgaar/Fantasy-Map-Generator/issues) or _#fmg-bugs_ channel on Discord. If you are facing performance issues, please read [the tips](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Tips#performance-tips).

You can support the project on [Patreon](https://www.patreon.com/azgaar).

_Inspiration:_

- Martin O'Leary's [_Generating fantasy maps_](https://mewo2.com/notes/terrain)

- Amit Patel's [_Polygonal Map Generation for Games_](http://www-cs-students.stanford.edu/~amitp/game-programming/polygon-map-generation)

- Scott Turner's [_Here Dragons Abound_](https://heredragonsabound.blogspot.com)

## Prompt-to-World Generation

The **World from Description** feature lets you describe a fantasy world in plain language and generate a map based on that description — no external API keys required.

### How to use

1. Open the **Tools** tab in the side menu.
2. Click **World from Description** (under the _Generate_ section).
3. Type a free-form description of your world, then click **Generate** (or press `Ctrl+Enter`).
4. The generator parses your description, applies the detected settings, and runs the normal map generation pipeline.

### What you can describe

| Category | Examples |
|---|---|
| **Geography** | _supercontinent, pangea, archipelago, island chain, mediterranean, peninsula, continents_ |
| **Climate** | _cold arctic, tropical, temperate, arid desert, wet rainy, monsoon_ |
| **Political structure** | _few large kingdoms, empire, many city-states, fragmented, tribal_ |
| **Settlements** | _coastal trade cities, sparse wilderness, dense and bustling, maritime_ |
| **Culture flavor** | _european, oriental, far east, high fantasy (elves, dwarves), dark fantasy_ |
| **Religion** | _polytheistic / many gods, monotheistic / one religion_ |

**Example prompts:**
- `"A cold arctic supercontinent with few large kingdoms and sparse settlements"`
- `"A tropical archipelago world with many city-states and coastal trade cities"`
- `"A high fantasy world with elves and dwarves, temperate, and a few vast empires"`

### How it works

The parser converts keywords into generation-settings overrides (heightmap template, state count, temperatures, precipitation, culture set, etc.) and locks them before calling the standard `regenerateMap()` pipeline. All existing editors, renderers, and save/load functionality work normally on the result.

The original prompt, parsed spec, and derived overrides are saved in `options.promptMetadata` and persisted in `.map` files for reproducibility.

### Limitations

- The parser is **keyword-based** — complex or contradictory descriptions may not produce the expected result. Simpler, direct descriptions work best.
- Only a subset of generation settings are influenced; everything else is still randomized.
- The same prompt with the same seed will produce the same map, but different seeds always differ.
- For AI-assisted text generation (names, lore, etc.), use the separate **AI Text Generator** in the editors.

---

## Bundled startup scenario: Monocerotia

This repository now bundles a premade startup scenario at `public/scenarios/Monocerotia.map`.

- By default, the app tries to load `Monocerotia.map` on startup.
- If the bundled scenario cannot be fetched or parsed, startup safely falls back to the normal behavior (`lastSaved` if configured, otherwise random generation).
- `?scenario=monocerotia` explicitly enables the bundled startup scenario.
- `?scenario=none` disables the bundled scenario and restores the normal startup path.

### Replacing or updating the scenario

1. Author or export the replacement `.map` file from the app.
2. Save it as `Monocerotia.map`.
3. Replace `public/scenarios/Monocerotia.map` with the new file.
4. Reload the app. The new bundled scenario will auto-load on startup unless `?scenario=none` is set.

The bundled asset included here is intended to be easy to replace as the Monocerotia world is refined.



Pull requests are highly welcomed. The codebase is messy and I will appreciate if you start with minor changes. Check out the [data model](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Data-model) before contributing.

The codebase is gradually transitioning from **vanilla JavaScript to TypeScript** while maintaining compatibility with the existing generation pipeline and old `.map` user files.

The expected **future** architecture is based on a separation between **world data**, **procedural generation**, **interactive editing**, and **rendering**. The application is conceptually divided into four main layers: world data and styles (state), generators (model), editors (controllers), renderers (view).

Flow:
settings → generators → world data → renderer
UI → editors → world data → renderer.

The data layer must contain no logic and no rendering code. Generators implement the procedural world simulation. Editors implement interactive editing tools used by the user. They perform controlled mutations of the world state. Editors can be viewed as interactive generators. The renderer converts the world state into SVG or WebGl graphics. Renderer must be pure visualization step and not modify world data.
