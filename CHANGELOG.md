# Changelog

## Unreleased

- Design rules written down: `DESIGN.md` and a new chapter on the docs site, EP.0 "Ten rules", each rule with a live specimen.
- `data-sk-fx="lite" | "off"` on any container turns the effects down for the components inside it.
- Docs regrouped into twelve categories (actions, forms, feedback, overlays, navigation, layout, data display, manuscript, chat, staging, lettering, icons). No tag or import path changed.
- Each docs panel has a model sheet: variants and states side by side, the moves, primitives, sound words and sounds the component uses, keyboard and accessibility facts, and related components. The acts and the keyboard facts are read off the component's own source.
- `npm run laws` checks what can be checked of the rules (no blur or filters, hard shadows, every tag documented in three languages, typed and listed in both READMEs). It runs in CI.
- The manga shelf: fourteen effect primitives, each a named drawing technique. `FX.focus` (集中線, 明かり線, 白抜き), `FX.uni` (ウニフラッシュ), `FX.bolt` (イナズマ, ひらめき), `FX.tare` (タレ線), `FX.odoro` (オドロ線), `FX.wobble` (震え線, しびれ線), `FX.ghost` (残像), `FX.trail` (残像線), `FX.bure` (ブレ線), `FX.crack` (ヒビ), `FX.shock` (衝撃波), `FX.crown` (タタキダシ), `FX.spatter` (ホワイト飛ばし), `FX.drift` (トビモノ).
- Eleven moves built on them, each with its sound word: `notice`, `gloom`, `vanish`, `zap`, `bloom`, `shiver`, `afterimage`, `crackAt`, `stomp`, `focusOn`, `dread`.
- `tone(kind, options)` and `tonePattern()`: screentone as repeating tiles in nine kinds (dots, gradient, ruled lines, hatching, rope hatching, sand, stipple, sparkle, bubble).
- `FX.within(el, fn)` clips the effects spawned by `fn` to the inside of `el`, so they stay in a panel.
- The docs site's Vocabulary chapter has a technique stage: five scenes in two groups (look here, joy), each a small story from a real interface played by the library's own components: a countdown ending on Start, a delete confirmation on black, a payment going through, an anniversary greeting, a new record.
- Components are lettered in comic faces instead of Helvetica: `--sk-font-head` (Knewave, a slanted brush face with real lower case) for buttons, titles, labels and numbers, and `--sk-font` (Comic Neue bold) for sentences and fields, with Chinese and Japanese faces behind them. The faces load from Google Fonts unless `fonts: 'system'`. `npm run laws` rejects any other face in a component.
- Moving parts are elastic bodies: position and shape are two springs. They stretch with their speed, squash when the speed goes or when they hit the end of a track, and wobble out; the front edge leads and the shape changes size rather than scale, so outlines keep their width. Used by the `sk-slider` knob, the markers of `sk-segmented` and `sk-tabs`, the `sk-theme-switch` orb and the radio ball (which now gathers, flies and lands in three beats; `moves.hop` takes a `hit` callback for touchdown).
- Lettering keeps its lower case: copy is written in normal case instead of capitals, and `npm run laws` fails on a capitals-only face or `text-transform: uppercase`. `sk-loader`'s wave text defaults to `Loading` instead of `LOADING`.
- Drawn things never fade: sound words, the editor's seal and the hopping ball appear at full ink from their first frame, growing in and overshooting, and leave by shrinking or thinning to a line. `sk-flash`'s black, on a confirm, collapses into a thin band along the cut instead of fading, and its question pops in at full ink. On the docs stage, the countdown's numbers slam down at full ink and its Go! flattens into a line instead of fading.
- `sk-button` squashes flat and wide while it is held, the body alone carrying it, and springs up tall on release. The squash changes the size of the box, so the outline keeps one width, the button keeps its place in the layout, and a press near its top edge still clicks.
- `sk-tooltip` is a white, inked speech balloon that pops out of what it points at with a little tilt and shrinks back into its tail, instead of a dark box that faded in.
- `sk-progress` rides up to a new value instead of jumping, so the dust cloud runs even across a sudden jump. `aria-valuenow` changes at once; `sk-complete` now fires when the drawn bar reaches 100.
- The surprise marks (`FX.ticks`, 驚き線) and vibration marks (`FX.arcs`, 振動線) are redrawn as tapered ink strokes. Surprise marks snap in, hold a beat, then shoot outward and are eaten from behind; they are ink, and pink only on an impact or a celebration. The vibration mark (`FX.arcs`) is now ブレ, a head-shake drawn in the direction of the shake: given `el`, ghosts of the element's own outline either side of it (a ruled violet line behind it, swapping sides on twos and closing in as the shake dies) and three short level motion strokes off each end; an element without a border, a `box` or a point gets the strokes only. It no longer draws arcs or rings around anything.
- Each mark now means one thing. Surprise marks are for notice, shouting, alerts, celebrations and real wall hits; the shake mark for refusals that shake their head: a rejected input, a wrong OTP, `sk-button` `fail()`, the stepper at its limit, a dialog that will not close, an empty balloon send. They are gone from everyday taps, key presses, OTP cells, rating stars, the calendar, radio, tabs, steps, the accordion, menus, the counter, select and input focus; `moves.tap` no longer draws anything. Tabs now skid to a stop in a little dust, and typing kicks up dust at the caret.
- `sk-slider`'s knob hangs on a spring while dragged: it trails a fast finger (about 30 px at 800 px/s), stretched into a teardrop, swings a little past when the finger stops, and a flick carries it past the release point and back. The value is still where the finger put it.
- A scene shelf of nine more manga techniques for the everyday moments of an app, each with a move that brings its word and sound: 後光 glory rays (`FX.rays`, `moves.reveal`) for an unlock or a reveal, 紙吹雪 confetti (`FX.confetti`, `moves.celebrate`) for a celebration, メラメラ flames (`FX.flame`, `moves.blaze`) for a streak, burning as a stream of rising cells under pink screentone with a white heart, stepped on twos, dying down into the base, 湯気 steam (`FX.steam`, `moves.fresh`) for something fresh, 氷結 frost (`FX.frost`, `moves.freeze`) for frozen or locked, 流線 speed rush (`FX.rush`, `moves.dash`) for sending, 風 gust (`FX.gust`, `moves.blowAway`) for clearing, スポットライト spotlight (`FX.spotlight`, `moves.spotlight`) for an onboarding step, 音符 notes (`FX.notes`, `moves.sing`) for something playing. Flames, frost and the spotlight can be held while a state lasts. The Vocabulary chapter has a tile for each.
- `sk-slider` reports the value where the hand put it at once, and its label never shows the knob's overshoot.
- `_tools/stage_shots.py` captures frame-exact stills of every scene on a virtual clock, for reviewing them by eye.
- Fixed: effects were drawn stretched and out of place when the page was pinch-zoomed, because the canvases were sized from the visual viewport.
- Three API notes that were empty in the docs are filled in (`sk-yonkoma` methods, `sk-flash` and `sk-hatch` events).

## 0.2.0 · 2026-11-18

- New group, Manga: ten components that each put one manga technique to work. `sk-koma` (panel-layout tabs), `sk-pages` (a pager turned by its corner), `sk-balloon-input` (a field whose balloon takes the tone of the text), `sk-speedbar` (progress with speed lines that follow the real speed, and a visible stall), `sk-flash` (a black-flash confirmation), `sk-tone` (a screentone slider), `sk-hatch` (a cross-hatching meter), `sk-yonkoma` (steps that go from blue-pencil rough to toned), `sk-breakout` (a card whose picture breaks its frame) and `sk-reactions` (reactions as sound words). 14 new tags, 63 in all.
- `toneOf(text)` is exported: the rule `sk-balloon-input` uses to read a tone from text.

## 0.1.0 · 2026-11-16

First public version.

- 49 `sk-*` tags in six groups (actions, forms, feedback, overlays, navigation, display), plus 24 animated icons and four pokeable loaders.
- One shared core: cel effects engine, katakana lettering in 10 voices, 45 WebAudio sound recipes, baked springs as CSS `linear()`.
- Five palettes (`sakuga`, `shonen`, `soda`, `sunset`, `mono`), each with light and dark; every text role at 4.5:1 or better.
- Docs site as a manga magazine, in Chinese, English and Japanese.
- TypeScript declarations in `types/`.
