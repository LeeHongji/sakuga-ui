<div align="center">

<a href="docs/media/promo.mp4"><img src="docs/media/poster.jpg" alt="Sakuga UI promo cover: click to watch the 52-second film" width="100%"></a>

<p><b>Every press is a key frame.</b><br>
Web components with anime key-animation energy: cel-style effects, katakana lettering and synthesised sound, sharing one small core.</p>

<p>
<a href="https://github.com/LeeHongji/sakuga-ui/blob/main/LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-1b1642?style=flat-square"></a>
<a href="https://www.npmjs.com/package/sakuga-ui"><img alt="npm" src="https://img.shields.io/npm/v/sakuga-ui?style=flat-square&color=ec4899"></a>
<img alt="63 tags" src="https://img.shields.io/badge/tags-63-7c6cf0?style=flat-square">
<img alt="zero dependencies" src="https://img.shields.io/badge/dependencies-0-1b1642?style=flat-square">
<img alt="86 kB gzip" src="https://img.shields.io/badge/gzip-86%20kB-ec4899?style=flat-square">
<img alt="Web Components" src="https://img.shields.io/badge/web%20components-native-7c6cf0?style=flat-square">
</p>

<p>
<a href="https://leehongji.github.io/sakuga-ui/"><b>Docs</b></a> ·
<a href="docs/media/promo.mp4"><b>Promo film (with sound)</b></a> ·
<a href="#quick-start"><b>Quick start</b></a> ·
<a href="README.md"><b>中文</b></a>
</p>

</div>

---

## Episode 0 · A first look

<table>
<tr>
<td width="50%"><img src="docs/media/press.gif" alt="Button, like and hold-to-confirm"><br><b>Presses are key frames.</b> Buttons squash and spring back, likes burst, and the hold button only slashes open with ザンッ! once it is fully charged.</td>
<td width="50%"><img src="docs/media/lettering.gif" alt="Sound-effect words landing"><br><b>Lettering built in.</b> One call, <code>sfx('ドン!')</code>, ten voices, each word with its own face, outline, entrance and sound.</td>
</tr>
<tr>
<td><img src="docs/media/icons.gif" alt="Icons winding up next to their spring curve"><br><b>Icons wind up first.</b> 24 hand-drawn icons dip into an anticipation pose for 70 ms, then spring back on the library's own curve.</td>
<td><img src="docs/media/loaders.gif" alt="Four pokeable loaders"><br><b>Waiting can be fun.</b> Four loaders that answer when poked; quick pokes count up a combo.</td>
</tr>
<tr>
<td><img src="docs/media/palettes.gif" alt="Five palettes switching"><br><b>Five palettes, one line.</b> <code>setPalette('soda')</code>; each palette has light and dark, every text role at 4.5:1 or better.</td>
<td><img src="docs/media/overlays.gif" alt="A dialog landing and toasts popping in"><br><b>Pop-ups that land.</b> Dialogs, toasts and effects live in the browser's top layer, safe from <code>overflow</code> and <code>z-index</code>.</td>
</tr>
</table>

The clips come from the promo film. Every component in it is this library, every click is a real pointer event, and every sound was synthesised by the component that made it.

## Highlights

- **63 `sk-*` tags** in twelve groups: the general ones (actions, forms, feedback, overlays, navigation, layout, data display) and the ones that put a manga technique to work as interface (manuscript, chat, staging, lettering); plus 24 animated icons and 4 playful loaders
- **Zero dependencies**: plain custom elements, so React, Vue, Svelte or plain HTML just write the tag
- **One core**: shared effect primitives, one lettering system, one set of 45 WebAudio sound recipes (no audio files)
- **Real springs**: solved once and baked into CSS `linear()` easings that run on the compositor
- **Top layer**: dialogs, effects and lettering go through the Popover API
- **Restraint**: effects have full / lite / off, sound can be turned off, and reduced-motion turns effects off
- **Size**: everything is 86 kB gzip; the core alone is 33 kB gzip

> **Status**: 0.2.0, published on [npm](https://www.npmjs.com/package/sakuga-ui). Fully verified in Chromium only.

## Quick start

```bash
npm i sakuga-ui
```

```js
import 'sakuga-ui';                          // registers every component
import 'sakuga-ui/components/forms.js';      // or one group only
import { configure, toast, setTheme, setPalette } from 'sakuga-ui';
```

Without a build step:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/sakuga-ui@0.2/dist/sakuga.js"></script>

<sk-button fx="boom">Confirm</sk-button>
<sk-switch checked>Wi-Fi</sk-switch>
```

`dist/sakuga.iife.js` is the global build (`window.Sakuga`) for a classic `<script>` tag. TypeScript declarations ship in `types/`.

```js
configure({ fx: 'lite', fps: 30, sound: true, volume: 0.5 });
toast('Saved!');
setTheme('dark');
setPalette('shonen');
```

## Components

| Group | Tags |
|---|---|
| Actions | `sk-button` `sk-hold-button` `sk-like` `sk-segmented` `sk-copy` |
| Forms | `sk-switch` `sk-theme-switch` `sk-checkbox` `sk-radio-group` `sk-radio` `sk-slider` `sk-input` `sk-textarea` `sk-select` `sk-stepper` `sk-rating` `sk-otp` `sk-calendar` |
| Feedback | `sk-toast` `sk-alert` `sk-progress` `sk-ring` `sk-spinner` `sk-loader` `sk-skeleton` |
| Overlays | `sk-dialog` `sk-drawer` `sk-tooltip` `sk-popover` `sk-menu` `sk-menu-item` |
| Navigation | `sk-tabs` `sk-tab` `sk-breadcrumb` `sk-pagination` `sk-steps` `sk-step` |
| Layout | `sk-accordion` `sk-accordion-item` `sk-card` `sk-divider` |
| Data display | `sk-avatar` `sk-badge` `sk-tag` `sk-counter` |
| Manuscript | `sk-koma` `sk-koma-panel` `sk-pages` `sk-page` `sk-yonkoma` `sk-koma-step` `sk-breakout` |
| Chat | `sk-bubble` `sk-balloon-input` `sk-reactions` `sk-reaction` |
| Staging | `sk-flash` `sk-speedbar` `sk-tone` `sk-hatch` |
| Lettering | `sk-word` `sk-kbd` |
| Icons | `sk-icon` |

Form controls take part in native `<form>` submission through `ElementInternals`. Attributes, events and methods for each component are on the [docs site](https://leehongji.github.io/sakuga-ui/).

## Configuration

```js
configure({
  fx: 'full',         // 'full' | 'lite' | 'off'
  fps: 60,            // 60 | 30 | 24 | 12: effect frame rate; 30 is even twos, 12 is choppy on purpose
  sound: true,
  volume: 0.5,
  lettering: true,
  fonts: 'google',    // the comic faces and sound-word faces come from Google Fonts; 'system' never requests web fonts
  maxParticles: 240,
  maxWords: 12,
  adaptive: true,     // fewer particles when frames get slow
});
```

A region can be turned down by itself: put `data-sk-fx="lite"` or `"off"` on a container and every component inside spawns effects under that ceiling (the nearest mark wins, and a region never goes above the global setting). The level is taken from the region of the component being acted on. The rules that decide whether a component belongs in the library are in [DESIGN.md](DESIGN.md) (Chinese).

## Themes and palettes

Everything reads `--sk-*` custom properties, injected first in `<head>`, so your stylesheet can override any of them. Put `data-sk-theme="dark"` on any ancestor for dark; `setTheme('dark', { x, y })` wipes from a point.

Component text is lettered in two comic voices: `--sk-font-head` for buttons, titles, labels and numbers (Knewave by default) and `--sk-font` for sentences, descriptions and fields (Comic Neue bold). Chinese falls through to ZCOOL KuaiLe; a `lang="ja"` page switches to Reggae One and Shippori Antique B1. Override the two properties to change faces.

| Palette | Look |
|---|---|
| `sakuga` | Default. Ink violet, periwinkle, hot pink |
| `shonen` | Red and yellow on warm paper, like a weekly boys' magazine |
| `soda` | Mint and coral |
| `sunset` | Dusk orange and indigo ink |
| `mono` | A black-and-white manga page with one red |

`setPalette('shonen')` recolours components, effects and lettering together; `<html data-sk-palette="soda">` works too. Run `npm run contrast` after changing colours.

## Manga technique effects

Besides the general primitives (smoke, starburst, speed lines), `FX` has a shelf of manga techniques. Each is a way of drawing that has a name:

| Primitive | Technique | What it says |
|---|---|---|
| `FX.focus` | 集中線 focus lines, 明かり線, 白抜き | the eye and the shock pulled to one point; `mode: 'out'` reads as light or joy |
| `FX.uni` | ウニフラッシュ sea-urchin flash | inner monologue, a hit |
| `FX.bolt` | イナズマ lightning, ひらめき | shock, revelation; `zig: 0` is an idea arriving |
| `FX.tare` | タレ線 gloom lines | the mood drops; `kind: 'wavy'` is the comic version, `'drip'` is cold sweat |
| `FX.odoro` | オドロ線 dread lines | a grudge, an ominous presence |
| `FX.wobble` | 震え線 / しびれ線 | trembling, numbness |
| `FX.ghost` / `FX.trail` / `FX.bure` | 残像 / 残像線 / ブレ線 | faster than the eye |
| `FX.crack` | ヒビ cracks | something gave way |
| `FX.shock` / `FX.crown` | 衝撃波 / タタキダシ | a blow, a hard landing |
| `FX.spatter` | ホワイト飛ばし spatter | stars, sparks; `ink: true` is tension |
| `FX.drift` | トビモノ drifting things | petals for glamour, dust for tension, one looping dead leaf for an awkward silence |

A second shelf covers the everyday moments of an app. Each has a move that brings its word and sound:

| move | primitive | technique | for |
|---|---|---|---|
| `moves.reveal` | `FX.rays` | 後光 glory rays | an unlock, an achievement, an upgrade, a result revealed |
| `moves.celebrate` | `FX.confetti` | 紙吹雪 confetti | an order placed, a task done, a milestone |
| `moves.blaze` | `FX.flame` | メラメラ flames | a streak, something hot, on a roll |
| `moves.fresh` | `FX.steam` | 湯気 steam | fresh, just updated, new in |
| `moves.freeze` | `FX.frost` | 氷結 frost | frozen, locked, paused, snoozed |
| `moves.dash` | `FX.rush` | 流線 speed rush | sent, submitted, on its way, a transition |
| `moves.blowAway` | `FX.gust` | 風 gust | cleared, dismissed, archived |
| `moves.spotlight` | `FX.spotlight` | スポットライト spotlight | an onboarding step, a featured item |
| `moves.sing` | `FX.notes` | 音符 notes | playing, sound on |

`blaze`, `freeze` and `spotlight` take `hold: true` to stay on (ice that stays while an account is frozen) until `.end()` on what they return.

Components normally call the moves that bring a sound word and a sound with them: `moves.notice`, `gloom`, `vanish`, `zap`, `bloom`, `shiver`, `afterimage`, `crackAt`, `stomp`, `focusOn`, `dread`, and the nine above.

```js
import { moves } from 'sakuga-ui';

moves.gloom(field);              // gloom lines and ずーん
moves.crackAt(card, x, y);       // cracks and ピキッ, kept inside the card
const lines = moves.focusOn(row, { life: Infinity });   // focus lines that hold
lines.end(0.2);                  // and leave when asked
```

Effects are drawn over the whole page by default. To keep them inside a panel, as a manga drawing stays inside its frame, call `FX.within(panel, () => moves.focusOn(el))`: everything spawned inside is clipped to `panel`.

Screentone comes from `tone()`: one repeating tile whose `css` paints a layer element and follows the theme colour.

```js
import { tone } from 'sakuga-ui';

layer.style.cssText += tone('dots', { pct: 30 }).css;      // 30% dot tone
layer.style.cssText += tone('hatch', { level: 3 }).css;    // three layers of hatching
```

Kinds: `dots`, `grad`, `lines`, `hatch`, `rope`, `sand`, `stipple`, `sparkle`, `bubble`. All of them are on the docs site under Vocabulary.

## Springs

| Preset | Variables | Feel |
|---|---|---|
| `spring` | `--sk-spring` / `--sk-spring-t` | one clear overshoot (default) |
| `bounce` | `--sk-bounce` / `--sk-bounce-t` | a few bounces, for presses and pops |
| `soft` | `--sk-soft` / `--sk-soft-t` | slight overshoot, for large surfaces |
| `snap` | `--sk-snap` / `--sk-snap-t` | quick and tight, for small indicators |

```js
import { spring } from 'sakuga-ui';
spring(el, [{ scale: 0.4 }, { scale: 1 }], 'bounce');
```

## Development

```bash
npm install        # esbuild only
npm run docs       # docs site on http://localhost:8823, loads src/ directly
npm run build      # bundles dist/ and writes dist/meta.json
npm test           # clicks every demo in 3 languages, 2 themes, 3 settings
npm run audit      # overlap, overflow and clipped-lettering audit at 5 widths
npm run laws       # the checkable part of the design rules: filters, shadows, docs and types
npm run contrast   # contrast of 9 text roles in 10 palette/theme combinations
npm run perf       # performance measurements
```

Everything except `build` and `laws` needs Python Playwright and the docs server on port 8823. Commit `dist/` after changing `src/`; CI checks that they match.

Browsers: Chrome / Edge 111+, Safari 16.4+, Firefox 113+, with fallbacks when the Popover API or `linear()` easing is missing. Verified in Chromium only.

## Credits

The visual language recreates and extends FinkTheArtist's "Sakuga UI set" demo video. Fonts from Google Fonts: Knewave, Comic Neue, ZCOOL QingKe HuangYou, ZCOOL KuaiLe, Chokokutai, Reggae One, Dela Gothic One, Mochiy Pop One, Potta One, Stick.

[MIT](LICENSE)
