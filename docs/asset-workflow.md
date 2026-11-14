# Daily Silver asset workflow

Daily Silver is a plain JavaScript Canvas game. The battle backdrop and effects are drawn in `src/scene.js`; the UI is in `src/app.js` and `src/style.css`. The curated character art is 270 locally cached Crystal front/back PNGs. Do not replace those sprites with generated stand-ins. `src/sprites.js` removes only the exterior white background at display time.

## Tool decision, 30 October 2026

| Tool | Decision | Reason and integration risk | Install method if needed | License |
| --- | --- | --- | --- | --- |
| Existing Canvas, CSS and Node scripts | Useful now | Directly produces the game's weather, effect, UI and export assets; no runtime bridge | Already in project; no install | Project code |
| [Effekseer](https://github.com/effekseer/Effekseer) | Maybe later | Its recorder can produce a transparent sprite sheet, but authoring and export require its GUI; a sheet would need frame timing, alpha and size review before integration | Official portable release, kept outside the shipped game | MIT |
| [Material Maker](https://github.com/RodZill4/material-maker) | Maybe later | Could generate a texture for a future scene; current pixel art has no texture gap that merits an editor or extra raster asset | Official portable release only if a specific texture is approved | MIT |
| [Jolt Physics](https://github.com/jrouwe/JoltPhysics) | Not appropriate | Native 3D rigid-body physics; no such gameplay | None | MIT |
| [Terrain3D](https://github.com/TokisanGames/Terrain3D) | Not appropriate | Godot 3D terrain would require an engine change | None | MIT |
| [Voxel Tools](https://github.com/Zylann/godot_voxel) | Not appropriate | Godot voxel terrain would require an engine change | None | MIT |
| [Recast Navigation](https://github.com/recastnavigation/recastnavigation) | Not appropriate | No 3D agents or navmesh | None | zlib |
| [ozz-animation](https://github.com/guillaumeblanc/ozz-animation) | Not appropriate | Native skeletal animation does not apply to 2D PNG characters | None | MIT |
| [The Forge](https://github.com/ConfettiFX/The-Forge) | Not appropriate | Native rendering framework would replace the browser Canvas stack | None | Apache 2.0 for its public code; console use has separate terms |
| [meshoptimizer](https://github.com/zeux/meshoptimizer) | Not appropriate | No triangle mesh assets | None | MIT |
| [FastNoise2](https://github.com/Auburn/FastNoise2) | Not appropriate | C++ SIMD noise is excessive for this small Canvas snow scene | None | MIT |

Tiled and LDtk are not needed: the game has one scripted battle scene and no tile map. No tools, global packages or system configuration were installed for this update.

## Rebuild and verify

1. Edit the four weather palettes in `snowScene` in `src/scene.js`. They map to 0–1, 2–3, 4–5 and 6 defeated opponents. Keep the 768 × 398 Canvas and the existing sprite origin and scale.
2. Add a named attack effect in `moveEffect` in the same file. `flight`, `impact`, `outcome` and `finisher` come from the battle event. An attack that misses must never render its impact. Keep shapes crisp with `imageSmoothingEnabled = false`.
3. Keep result fields optional. Completed runs now have `moment` and summary records have `recordVersion: 2`; old records and the `daily-silver-v1` local storage namespace stay valid.
4. Run `npm test`, `npm run smoke`, `npm run art:audit`, and `npm run build`. The audit checks 135 species / 270 images and writes `reports/sprite-gallery.html`. Review the game at 1440, 390 and 320 CSS pixels, with and without reduced motion.

The active command card uses the existing local sprite source. Its type accent and HP are rebuilt from battle state, so no new PNG needs exporting. The knockout camera focus is code-native in `src/scene.js` and skips zoom when reduced motion is requested. The music and effect buses, ducking and limiter live in `src/sound.js`; the music mix and contrast settings are optional saved preferences accepted by the backup validator.

Rival entrance copy, real signature move references, and visual motifs live in `src/entrances.js`. The overlay in `src/app.js` and `src/style.css` reuses each front sprite; no new licensed art is needed. Type previews and party counter badges use `src/matchups.js` and the game's own type chart. They recalculate as the opponent, HP, or move PP changes. `src/replay.js` reads the optional knockout list stored with new runs, which survives the 140-line combat log cap. Old runs fall back to their retained log. When changing these features, verify the full and reduced-motion entrance, counter markers at 320-pixel width, and the completed recap on both desktop and phone.

The integrated Shadow Ball effect is code-native and rebuilds with the game. No Effekseer sheet or `.efkproj` was created or installed. If an authored particle effect is worth adding later, use the [official recorder](https://effekseer.github.io/Help_Tool/en/ToolReference/record.html) in a portable Effekseer release: choose **Export as a single image**, set an explicit frame size and X count, and enable **Original image** transparency. Inspect the exported PNG's alpha, first and last frame, size and pacing before adding a Canvas player. The official command line documentation covers project conversion, not a headless recorder export; this part remains a manual GUI step.

The original scene and effect code require no third-party tool attribution. The bundled Crystal sprites are third-party Pokémon artwork; their existing copyright limits remain as described in the main README. If a future Effekseer runtime or other library is shipped, include its license notice. A rendered sheet alone still needs an asset provenance review.
