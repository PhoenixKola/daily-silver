# Daily Silver 2.0 — Summit Edition

A fully local, static, **unofficial** Generation II-inspired daily Pokémon battle fan project. No database, hosted APIs, account system, or PHP is necessary **during gameplay**. This is a substantial upgrade to the existing JavaScript Daily Silver project, not an authentic Pokémon Crystal emulator or ROM patch.

## 4.0: Summit Redesign

The whole game was redesigned as one authored experience: new home, battle, dossier, archive, results and ending screens; a new pixel-art summit built from generated layers; and a continuous action choreography.

- **Battle presentation:** every action plays as anticipation, release, contact and resolution from one cancellable timeline. Individual choreography for Thunderbolt, Psychic, Body Slam, Giga Drain, Fire Blast and Surf, reusable families for the rest, visible status and field conditions, and recall, arrival and settle send-outs. Skip and cancel always settle to the real battle state.
- **Evolving summit:** Stillness, Rising Wind, Whiteout and Last Light, with parallax, aurora, mist, wind and snow.
- **Opening and endings:** a skippable four-second summit opening, a dawn victory and a storm-aftermath defeat.
- **Team dossier and tactics:** moves, PP, held-item effects, Gen II categories, recoil and recharge warnings, and damage estimates shown as ranges, kept separate from type advantage.
- **Practice lab:** retry the same seed, undo, compare moves from the same position and random state, practice a chosen opponent, and read plain explanations. Official daily play never has these tools.
- **Recorded replays:** newly played battles are recorded in a versioned, bounded format (play, pause, speed, knockout jumps, decisive exchange, file download). Older records keep their text recap.
- **Audio:** layered music following the encounter, stage wind, type-specific impacts, separate victory and defeat resolutions, and an effects level.
- **Accessibility:** reduced motion, visual intensity and speed are separate settings; keyboard and touch throughout; 44px targets; 320px layouts.

Saves stay in the daily-silver-v1 namespace and remain compatible. See docs/visual-direction.md, docs/asset-workflow.md and docs/asset-provenance.md. Checks: npm test, npm run smoke, npm run art:audit, npm run build, and npm run uat:visual, uat:playthrough, uat:victory or uat:offline.

## History: what was new in 2.0

### Current visual update

The homepage now reveals the actual daily team beside the live summit scene. Selecting any of the six sprite cards previews that ally in the scene without changing the saved run. The summit battle has an animated aurora, a six-member progress rail for both teams, type-colored move choices, larger combat text, and readable HP cards below the scene on narrow screens. The result card has a mountain backdrop and a clearer score and survivor summary. These changes use the existing Canvas renderer and CSS; no new runtime packages or native game tools are required. The Crystal sprites, battle rules, and `daily-silver-v1` save format are unchanged.

Fresh daily, practice, and archive battles open with a skippable Trainer Red reveal. The Hall of Fame displays past daily teams using the existing local Crystal sprites; older records without team details remain readable. Practice replays, backup export, and backup import remain in the archive. Resumed battles open directly at the current turn.

The battle now tracks six illustrated summit checkpoints as opponents fall, and its transcript groups events by turn. Completed runs have a **Review the Battle** recap with both teams and every saved field note. The downloadable 1200 × 630 result card draws the six locally installed team sprites, cleans white edge backgrounds, and marks fainted allies. Card export uses same-origin PNGs so it remains downloadable without a remote image service.

After choosing a new Pokémon, the battle automatically returns to that ally's move choices, including when a faint forces a replacement.

The battle command area now shows the active ally's real sprite, types and HP beside its moves. Knockouts and incoming replacements get a brief camera focus; reduced-motion mode skips the zoom. Options include a persistent high-contrast display mode and a separate music mix slider. Battle effects now have their own audio channel, briefly lower the soundtrack, and pass through a limiter to reduce masking and distortion. At 320-pixel width, move choices use one readable column.

Each of Red's six Pokémon now receives a short entrance card with its existing sprite, a distinct title, a visual motif, and a signature move from its actual loadout. Move buttons spell out type advantage, resistance, immunity, or utility before selection. The party screen and team rail mark living allies with an available super-effective attack against the current opponent; the marker names the strongest available counter and disappears when its PP runs out. The completed battle recap now keeps individual knockout highlights and the decisive turn above the turn transcript. Old saves remain readable, with partial highlights reconstructed from their retained log.

Run `npm run smoke` to check the battle DOM wiring. The build includes the new interface and refreshes the offline service-worker cache.

- **Combat:** Individually implemented signature attacks including Extreme Speed, Explosion, Crabhammer, Seismic Toss, Aeroblast, Sacred Fire, Spore, High Jump Kick, Counter, Mirror Coat, Substitute, and more. Independent Reflect and Light Screen, Gen II type-based physical/special attacks, stronger rival move choices, limited tactical switches, Quick Claw, Focus Band, and status/accuracy fixes.
- **Presentation:** Richer move-specific effects, varied snowfall/aurora as Red's team falls, sprite movement, hit effects, damage feedback, fainting effects, and the existing white-background cleanup. Keeps the existing sprite mapping and your locally installed artwork.
- **Audio:** Original multitrack synthesized chiptune soundtrack for menu/battle/low-HP/results; attack, hit, healing, faint and victory cues. Uses Web Audio: no downloaded songs or sound effects.
- **Daily experience:** Hall of Fame with win rate, 21 recent archive replays (always practice; daily attempts cannot be overwritten), PNG result card, JSON save-history export, streaks and results.
- **UX:** Animation speed selection (0.5×–3×), automatic reduced-motion setting, in-game options, volume, responsive improvements, full offline mode with installed sprites.
- **Optional complete roster:** `EXPAND-TO-251-WINDOWS.bat` or `node tools/expand-roster.mjs` adds the missing Pokémon using PokéAPI base stats, typing and Crystal-era available moves. Then download the extra sprites once with the included downloader. The tested default roster remains **135 species** until you run this optional step.

### Not a perfect cartridge-accurate simulator

The game uses a custom browser battle engine. Some mechanics remain deliberately approximate, including exact DV/Stat Exp, exact damage randomization, Gen II move legality and multi-hit mechanics, full Gen II battle edge cases, and deterministic competitive balance. The 251-species expansion selects legal-era moves *from the subset that this engine implements*; it is not an exhaustive learnset or authenticity guarantee. Legendary opponent Red has been adapted for this mode. For exact mechanics, the original ROM or a thoroughly validated competitive battle simulator would be needed.

### Set up / launch on Windows

1. Extract the ZIP to a folder (or copy the 2.0 update over the **existing** `daily-silver` directory).
2. **Preserve** `assets/sprites/crystal/`, which contains the artwork you've already downloaded. The update ZIP doesn't overwrite this folder.
3. Double-click `PLAY-ON-WINDOWS.bat` (requires Node.js 18+). It verifies/fetches missing sprites **once**, then opens `http://localhost:4182`.
4. For the **optional** full 251-Pokémon roster, run `EXPAND-TO-251-WINDOWS.bat` while connected to the internet. This downloads species data, generates `src/extra-species.js`, and downloads the extra Crystal sprites. Then use the normal launcher. Internet is not needed for subsequent play.
5. To apply UI changes after updating, press Ctrl+Shift+R in the browser. Clear cache only if necessary; do **not clear site storage** or your existing saves can be lost.

On macOS/Linux: `sh PLAY-ON-MAC-LINUX.sh`; the equivalent optional expansion is `sh EXPAND-TO-251-MAC-LINUX.sh`.

You can test directly with `node tools/server.mjs`. No `npm install` is required.

### Existing saves and official attempts

The existing storage namespace remains `daily-silver-v1`, and the run version remains `1` to preserve the battle saves created by the earlier releases. Existing historical records are unchanged. Once a run is finished, that date's daily challenge stays locked on the same browser profile. These are local controls, not tamper-proof anti-cheat.

### Sprite and copyright information

The source package deliberately does **not** bundle Nintendo-owned Pokémon sprites. Install them with `node tools/download-sprites.mjs`. It uses PokéAPI's public sprite archive, with third-party Pokémon artwork subject to Nintendo/The Pokémon Company's rights. Access to those images is not permission to commercially redistribute them.

The original website design, terrain effects, particle code and synthesized audio code in this project are independent. This is an unofficial personal fan project.

### Tests and production export

The [asset workflow](docs/asset-workflow.md) records the tool choices, four weather stages, finishing effect, save-field compatibility and rebuild checks.

`npm run art:audit` checks all installed front/back Crystal PNGs and writes `reports/sprite-gallery.html` for local visual review. The production build runs this audit first. The gallery references the existing files without copying or editing third-party artwork. Open it locally to inspect sprite identity, white backgrounds, and scale before a release. The script uses Node only; no installation is needed.

```sh
npm test
node tools/download-sprites.mjs --verify
npm run build
```

`npm run build` deliberately stops if any required Crystal sprite is missing. This avoids silently deploying Pokémon as abstract placeholders. After successful verification/build on **your computer**, upload the contents of `dist/` to a static host. The browser runtime has no database or backend calls.

**Validation in this workspace (30 October 2026):** 42 automated tests, the UI smoke test, sprite audit (135/135 species, 270 PNGs), and the sprite-inclusive static build passed. Headless Chromium checks covered 1440, 768, 390, and 320 pixel widths with no horizontal overflow or page errors; selecting a move advanced the turn and transcript. The homepage preview changed the featured ally without changing the actual battle team or creating a daily save. The rival reveal displayed six local sprites, skipped correctly, and did not replay for resumed battles. The archive rendered win and loss cards on desktop and phone and retained 21 practice replays. The summit ascent correctly marked two cleared opponents and the current opponent in a saved test state; the recap grouped turns on desktop and phone. The whiteout stage and decisive moment were visually checked at 1440, 390 and 320 pixels; normal and reduced-motion transitions were exercised. Move matchup labels and party counter markers were checked at 1440, 390 and 320 pixels. The Pikachu entrance and six-knockout recap were checked in Chromium at those same widths. A real browser download produced a 1200 × 630 PNG with all six team sprites. The optional 251-Pokémon expansion was not run.

### Layout

- `src/data.js` / `src/engine.js` – species and move definitions, battle rules, scoring and saves
- `src/extra-species.js` – generated roster extension (empty until you run expansion)
- `src/app.js`, `src/ui/`, `src/ui.css` - controller, sheets and interface
- `src/pres/` - beats, planner, director, stage, atmosphere, effects, conditions, cinematics
- `src/lab.js`, `src/recorder.js`, `src/moveinfo.js` - practice lab, replay recording, move facts and estimates
- `src/entrances.js` / `src/matchups.js` / `src/replay.js` – rival cards, live type previews and counters, knockout recap data
- `src/sprites.js` – sprite mapping and white-background cleanup
- `src/sound.js` – original Web Audio soundtrack and SFX
- `tools/expand-roster.mjs` – optional Gen II roster installer
- `tools/download-sprites.mjs` – one-time front/back sprite downloader
- `tests/` – battle, sprite, animations and 2.0 regression coverage
