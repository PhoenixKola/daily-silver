# Daily Silver visual direction

## North star

An isolated moonlit pass on Mt. Silver, rendered as a restrained pixel painting. The battle stage carries the drama; interface panels act like dark ink and frosted glass around it. The existing Crystal creature sprites stay crisp and recognisable.

## System

- Depth: midnight `#101827`, slate `#1c3043`, ridge `#38586b`.
- Text and snow: ice white `#edf4ed`, muted frost `#b7ccd1`.
- Decisions and reward: antique gold `#efcf98`. Risk and Red: muted ember `#d58379`.
- Essential type and health information always has text alongside color.
- One display face for major moments (Impact), a readable system sans for controls, and monospace only for short game data. Core labels target 12–16 CSS px.
- Spacing follows 4, 8, 12, 16, 24, 32 CSS px. Controls target at least 44 CSS px.
- Creature sprites and scene pixels render with nearest-neighbor sampling. Avoid fractional sprite scales and blur.
- Motion: snow drifts slowly; attacks travel rapidly; impact pauses briefly; KO settles rather than flashes. Reduced motion removes camera shakes, pulsing and delays.
- Audio: original synthesis, restrained low ambience, clearly audible action cues, full mute.

## Asset plan

`assets/art/summit-night.png` is an original generated, text-free environmental plate. `assets/art/summit-rival.png` is a generated back-facing winter challenger isolated onto transparency and drawn at a distant scale in the home scene. `assets/art/daily-silver-mark-96.png` and its larger variants are the generated transparent mountain insignia and summit star. The title remains editable text beside the insignia. Canvas draws contact shadows, snow, creature sprites and combat effects in front. Move symbols are compact code-native SVG. No generated character portraits replace the local Crystal sprites.
