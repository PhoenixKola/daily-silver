# Asset provenance

| Asset | Source | Rights and use |
| --- | --- | --- |
| `assets/art/summit-night.png` | Generated for Daily Silver with OpenAI Image Generation, 2026-11-04 | Original scenery plate created for this project; no text, characters or remote imagery. |
| `assets/art/summit-rival.png` | Original winter challenger generated for Daily Silver with OpenAI Image Generation, 2026-11-04; isolated and resized for the pixel-art canvas | Original back-facing trainer in winter clothing; cropped onto transparency and sized to the distant figure in the home scene. |
| `assets/art/daily-silver-mark-{96,192,512}.png` | Generated for Daily Silver with OpenAI Image Generation, 2026-11-04; resized with nearest-neighbor sampling | Original transparent mountain insignia and summit star used in the brand, favicon and installed app icons. |
| `assets/favicon.svg` | Pre-existing in-repository SVG | Retained as a legacy file; the active favicon and installed app icons use the generated PNG insignia. |
| `src/scene.js` and `src/cockpit.css` | Original code in this repository | Procedural snow, combat effects, sprite staging and interface treatments. |
| `assets/sprites/crystal/{front,back}/*.png` | Pre-existing Crystal era Pokémon sprites | Third-party copyrighted franchise artwork. The game is unofficial and noncommercial; no ownership or commercial redistribution rights are claimed. |
| Synthesized soundtrack and action effects | Pre-existing `src/sound.js` | Generated in browser with Web Audio; no external recordings or network audio. |

The generated scenery is referenced by `src/scene.js`, `src/app.js`, and `src/cockpit.css`, and included in the static build. All gameplay assets load from the local release. The service worker pre-caches both sprite directions for the curated 135 species.
