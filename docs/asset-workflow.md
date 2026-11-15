# Asset workflow

Daily Silver is plain JavaScript and Canvas. Generated bitmap art is prepared offline and shipped as small PNGs; all animation and interaction are code.

## Generate

1. Verify the bridge: `node tools/codex-imagegen/imagegen.mjs --doctor --codex "<codex.exe>"`. It is a vendored, audited copy of `Adamdesgns/codex-imagegen` (revision f2727db, MIT) with one local addition, `--model`. It runs Codex read-only, ephemeral, with shell, browser, computer-use, apps, plugins and multi-agent disabled, and uses the existing ChatGPT sign-in (no API key). Each call spends Codex allowance.
2. Write prompts in `art-src/prompts/` (git-ignored) starting from `art-src/style-bible.txt`, then run `CODEX_BIN=<codex.exe> node tools/art-generate.mjs jobs.json --parallel 4`. Keep a loose reference image for palette and mood only.
3. Layers go on a flat magenta key, additive effects on pure black, full scenes opaque.

## Prepare

- `node tools/art-lab.mjs layer in.png out.png --key magenta|black --crop 40,398 --pad 8 [--trim]` median-downscales by an exact integer (hard edges, no blur), keys the background to alpha, crops to the 768 x 398 stage and pads for parallax.
- `node tools/art-lab.mjs sheet in.png assets/art/fx <name> --key black --cell 240 --min 1500` finds separate shapes and places them in equal cells. The result is a **shape library**, not a timed animation: `src/pres/assets.js` names the frames and `src/pres/fx.js` scales, rotates and fades them. Inspect every sheet; do not call a sliced still an animation.

## Ship

- Add new art to `MANIFEST` in `src/pres/assets.js`. Missing images fail soft (the renderer skips them).
- `npm run manifest` regenerates `core-manifest.json`; its content hash is the offline cache version, so every release replaces the old cache. `npm run build` does this automatically and copies everything into `dist/` (Vercel serves `dist`).
- Checks: `npm test`, `npm run smoke`, `npm run art:audit`, `npm run build`, and `npm run uat:visual|playthrough|victory|offline` (screenshots in `reports/uat/`).

## Where things live

- `src/pres/`: beats, families, plan, director, stage, atmosphere, fx, conditions, cinema, assets.
- `src/lab.js`, `src/recorder.js`, `src/moveinfo.js`: practice laboratory, versioned replay recording, move and item facts with damage estimates.
- `src/ui/`, `src/ui.css`, `src/app.js`: interface and controller. Save keys stay in the `daily-silver-v1` namespace; replays use `replay:<id>` and `replay-index`.
