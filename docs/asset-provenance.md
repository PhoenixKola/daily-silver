# Asset provenance

All new art was generated on 2026-11-15 with OpenAI image generation through the project-local Codex bridge (`tools/codex-imagegen/`, Codex CLI 0.167.0-alpha.3.2, invoking model `gpt-6.1-sol`, ChatGPT sign-in, no API key). The internal image model is not reported by Codex and is not claimed here. Raw generations were processed with `tools/art-lab.mjs` (integer median downscale to the 768px game lattice, magenta/black keying, crop, parallax padding, shape slicing).

| Asset | Source | Use |
| --- | --- | --- |
| `assets/art/summit/sky.png`, `sky-last-light.png` | Generated, processed | Parallax sky layers (night and Last Light stage). |
| `assets/art/summit/ridges.png`, `ground.png`, `foreground.png` | Generated on a magenta key, processed to alpha | Ridges, battlefield ground plane, foreground rocks. |
| `assets/art/summit/aurora.png`, `fog.png` | Generated on black, converted to alpha | Aurora ribbons (column-wave animated) and drifting mist. |
| `assets/art/summit/dawn.png`, `aftermath.png` | Generated from the chosen direction | Victory dawn and defeat storm-aftermath scenes, result card backdrops. |
| `assets/art/summit/challenger.png`, `rival-front.png` | Generated original silhouettes on a magenta key | Opening cinematic and home screen. They are original designs, not franchise artwork. |
| `assets/art/fx/{fire,water,electric,psychic,drain,snow,impact,ice-barrier,vines,status,light}.png` | Generated on black, sliced into uniform 240px cells | Shape library drawn by `src/pres/fx.js` and `src/pres/conditions.js` (scaled, rotated and faded in code; not timed animation sheets). |
| `assets/art/daily-silver-mark-{96,192,512}.png` | Generated 2026-11-04 | Insignia and app icons. |
| `art-src/env-direction-A-chosen.png` | Generated exploration, chosen direction | Reference image for the layer kit. |
| `assets/sprites/crystal/{front,back}/*.png` | Pre-existing Crystal era sprites | Third-party franchise artwork, unchanged, never replaced by generated art. Unofficial, noncommercial. |
| Music and effects | `src/sound.js` | Synthesised in the browser with Web Audio; no recordings or samples. |

Prompts, the generation log and the style bible are kept locally in `art-src/` but are git-ignored by request. The three exploration directions that were not chosen (`dir-B`, `dir-C`) live only in the ignored `.scratch/` folder.

Removed in this release: `summit-night.png` and `summit-rival.png` (replaced by the kit above).
