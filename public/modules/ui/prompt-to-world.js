"use strict";

/**
 * Prompt-to-World UI module.
 *
 * Opens a dialog where the user can describe a fantasy world in natural language.
 * Parses the description via PromptToWorld (src/generators/prompt-to-world.ts),
 * applies the derived generation-settings overrides, and triggers a full map
 * regeneration — all without bypassing the existing generator pipeline.
 *
 * Limitations (shown inline in the dialog):
 *  - Parser is keyword-based; complex or contradictory descriptions may not
 *    produce the expected result.
 *  - Only a subset of generation settings are overridden; everything else is
 *    randomized as normal.
 *  - The prompt is stored in options.promptMetadata and saved with the .map file.
 */

function openPromptToWorldDialog() {
  updateDialogState();

  $("#promptToWorldDialog").dialog({
    title: "Generate World from Description",
    position: {my: "center", at: "center", of: "svg"},
    resizable: false,
    width: "min(42em, 96vw)",
    buttons: {
      Generate: function () {
        runPromptGeneration(this);
      },
      Close: function () {
        $(this).dialog("close");
      }
    }
  });

  if (modules.promptToWorld) return;
  modules.promptToWorld = true;

  ensureEl("promptToWorldInput").addEventListener("keydown", function (e) {
    // Ctrl/Cmd + Enter triggers generation
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      const dialog = document.getElementById("promptToWorldDialog");
      if (dialog) runPromptGeneration(dialog);
    }
  });

  function updateDialogState() {
    ensureEl("promptToWorldInput").value = "";
    ensureEl("promptToWorldPreview").innerHTML = "";
    ensureEl("promptToWorldStatus").textContent = "";
  }

  async function runPromptGeneration(dialogEl) {
    const text = ensureEl("promptToWorldInput").value.trim();
    if (!text) {
      tip("Please describe your world first", true, "error", 4000);
      return;
    }

    if (!window.PromptToWorld) {
      tip("PromptToWorld module is not loaded", true, "error", 4000);
      return;
    }

    try {
      ensureEl("promptToWorldStatus").textContent = "Parsing description…";

      const spec = PromptToWorld.parse(text);
      const overrides = PromptToWorld.getOverrides(spec);

      // Show a human-readable summary of what was detected
      showOverrideSummary(overrides);

      ensureEl("promptToWorldStatus").textContent = "Applying settings and generating map…";

      // Apply overrides to the UI inputs (locks the changed settings)
      PromptToWorld.applyOverrides(overrides);

      // Close dialog before regeneration so the map is fully visible
      $(dialogEl).dialog("close");

      // Trigger map regeneration; seed is re-rolled automatically
      await regenerateMap("prompt-to-world");

      // Store metadata (seed is set during regeneration, read it after)
      PromptToWorld.storeMetadata(text, spec, overrides);

      tip("World generated from your description!", true, "success", 5000);
    } catch (err) {
      const msg = err?.message || String(err) || "Generation failed";
      ensureEl("promptToWorldStatus").textContent = "Error: " + msg;
      ERROR && console.error("Prompt-to-World error:", err);
    }
  }

  function showOverrideSummary(overrides) {
    const items = [];
    if (overrides.template) items.push("Geography: " + overrides.template);
    if (overrides.statesNumber !== undefined) items.push("States: " + overrides.statesNumber);
    if (overrides.temperatureEquator !== undefined) items.push("Equator temp: " + overrides.temperatureEquator + "°C");
    if (overrides.prec !== undefined) items.push("Precipitation: " + overrides.prec + "%");
    if (overrides.culturesSet) items.push("Culture set: " + overrides.culturesSet);
    if (overrides.cultures !== undefined) items.push("Cultures: " + overrides.cultures);
    if (overrides.manors !== undefined) items.push("Manors: " + (overrides.manors === 1000 ? "auto" : overrides.manors));
    if (overrides.religionsNumber !== undefined) items.push("Religions: " + overrides.religionsNumber);

    const preview = ensureEl("promptToWorldPreview");
    if (items.length) {
      preview.innerHTML =
        "<b>Detected settings:</b><br>" +
        items.map(i => "• " + i).join("<br>");
    } else {
      preview.innerHTML = "<i>No specific settings detected — generating with random options.</i>";
    }
  }
}
