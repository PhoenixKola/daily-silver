# Daily Silver release signoff

## Shipped

- Reworked the main battle composition so the stage and four move commands share the desktop view. Phone layouts use a compact stage, actual numeric HP, a six marker ascent track, and readable move cards.
- Added a generated original Mt. Silver night environment to the canvas and the result card. Local Crystal sprites remain the only creature art.
- Replaced the rough procedural trainer in the home panorama with an original generated back-facing winter rival, isolated on transparency and scaled as a distant figure.
- Replaced the D-star-S mark with a generated transparent mountain insignia, a two-line Daily Silver wordmark, and matching favicon and installed app icons.
- Restyled move controls with a type colored crest, 1–4 keyboard badge, matchup, damage power/accuracy, PP count and PP meter. Their accessible labels expose the same tactical details.
- Reduced visual weight of the turn journal and exposed its full replay through a direct journal action. Added a field status disclosure control.
- Moved the decisive-turn summary above knockout highlights. Fixed knockout highlight navigation to land on the selected timeline turn with its heading visible; verified during a 19-turn mobile browser playthrough.
- Fixed opponent HP numbers to show actual HP instead of party count. Keyboard battle shortcuts now ignore editable fields. Hardened damaged archive handling and escaped restored creature names/status text.
- Versioned the service worker and pre-cached the full local game, original scenery, rival sprite and 270 curated front/back sprites. Existing storage namespace and run version remain unchanged.

## Verification

- `npm test`: 42 tests passed.
- `npm run smoke`: UI DOM wiring smoke passed, including actual enemy HP and a damaged archive fixture.
- `npm run art:audit`: 135/135 species have valid front/back artwork.
- `npm run build`: passed. See the final build output for the current file count and size.
- Chromium visual matrix: 1920×1080, 1440×900, 1366×768, 768×1024, 430×932, 390×844, 375×812, 360×800, 320×700, 844×390, 667×375. No horizontal overflow. First move bottom was 668 CSS px at 320×700 and 639 px at 390×844 after the command redesign.
- Full browser playthroughs: a loss in 27 actions and a victory in 36 actions. No uncaught page errors. Result recap and 1200×630 result-card export captured.
- Offline Chromium check: 292 resources cached; cold reload, background, rival art and active sprite loaded offline with no page errors.
- Balance sample: 200 seeds each. A first-usable-move strategy won 23/200, with no unfinished battles and longest 59 turns. A damage-estimating strategy won 64/200, with no unfinished battles and longest 74 turns. This is a coarse scripted sample, not a human fairness study.
- Chromium was the only browser available in this environment. WebKit, Firefox, iOS Safari, screen-reader, actual-device, install-prompt, and mid-range hardware performance testing were not run.

## Known gaps

- The field guide is still a text guide; a progressive hands-on first-run tutorial has not been added.
- Existing music and effect controls work, but per-channel mixing, vibration, UI scaling, and a dedicated reduced-motion preference beyond the system setting are not implemented.
- The whole experience has not received a line-by-line accessibility audit. The compact 320 px layout was visually checked; assistive technology and 200% zoom were not tested.
- Archive replay, backup import confirmation, malformed saves in real browsers, and all six matchup event sequences were not exercised end-to-end in the browser. Existing unit fixtures cover backup validation and prior save compatibility.
- No Firefox/WebKit browser matrix or sustained performance profile was available. The canvas loop remains active while the page is visible.

Launch locally with `npm start`, then open `http://localhost:4182/`. Build the static release with `npm run build`; upload the contents of `dist/` to any static host. The repository's Windows and Mac/Linux launch scripts remain available.

The bundled third-party Pokémon sprites remain subject to their owners' rights. The project is an unofficial fan game, not an official or commercially cleared release.
