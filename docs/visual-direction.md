# Daily Silver visual direction

## North star

An isolated, moonlit pass on Mt. Silver. The stage carries the drama; the interface is calm, flat and legible around it. One authored experience from the home screen to the ending: clean pixel scenery at the same pixel scale as the Crystal sprites, crisp effects, restrained motion.

## Environment

Three directions were generated and composited with the real sprites at desktop and phone size: crisp pixel (A), stylised painted (B) and layered vector silhouette (C). **A was chosen**: B and C were attractive but read as a different medium behind hard-edged sprites. A is a kit of layers processed to a 768px lattice (about 3px art pixels, sprites are 3 to 4px): sky, ridges, ground, foreground rocks, aurora, fog, plus dawn and storm-aftermath scenes.

Four stages blend continuously (`src/pres/atmosphere.js`): Stillness, Rising Wind, Whiteout (mist, wash and wind streaks, kept light so combatants stay readable) and Last Light, which begins when Red's final ally steps up. Camera movement is integer-pixel parallax; there is no scaled or blurred camera transform.

## Interface system

- One type family (system sans), 4/8/12/16/24/32 spacing, 44px minimum controls, flat surfaces, a single gold accent, few borders.
- Home: one hero stage, one obvious action (begin, resume or view result), practice lab as secondary, today's six as the inspection entry. Archive, help, sound and settings are quiet icons.
- Battle: the stage with two HUD plates (name, level, HP, team pips, conditions), one outcome line, and a single command surface with four move cards (type, Physical/Special/Status, power, accuracy, PP, matchup or warning). Details live behind the info button, the party and dossier sheet, and the journal. On narrow phones the plates and outcome line move below the scene so nothing covers it.
- Type advantage and estimated damage are always presented separately, as ranges with their limits stated.

## Motion and effects

Each action is a continuous sequence (anticipation, release, contact, resolution) planned from explicit semantic beats (`src/pres/beats.js`, `plan.js`) and played by one cancellable director. Hit pause, directional recoil, grounded shadows and restrained camera emphasis scale with importance. Misses, immunity and protection never show an impact; healing never looks like damage. Reduced motion, visual intensity and playback speed are three separate settings.

## Audio

Original synthesis only. Layered music follows the encounter stage without restarting, wind ambience follows the weather, impacts differ by physical and elemental type, and victory and defeat have separate resolutions.
