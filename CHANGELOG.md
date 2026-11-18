# Changelog

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
