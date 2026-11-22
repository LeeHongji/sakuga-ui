// Type declarations for sakuga-ui. The library is plain JavaScript; these cover the public API.

/* ---------- configuration ---------- */
export interface SakugaConfig {
  /** How much effect each interaction spawns. */
  fx: 'full' | 'lite' | 'off';
  /** Effect frame rate: 60 follows the display, 30 is even twos, 12 is choppy on purpose. */
  fps: 60 | 30 | 24 | 12;
  sound: boolean;
  /** 0..1 */
  volume: number;
  /** Katakana sound-effect lettering. */
  lettering: boolean;
  /** 'google' loads the display faces from Google Fonts, 'system' uses local fallbacks only. */
  fonts: 'google' | 'system';
  maxParticles: number;
  maxWords: number;
  /** Lower particle counts automatically when frames get slow. */
  adaptive: boolean;
}
export const config: SakugaConfig;
export function configure(patch: Partial<SakugaConfig>): SakugaConfig;
export function onConfig(listener: (config: SakugaConfig) => void): () => boolean;
/** 0..1 multiplier for effect amount (0 when effects are off or reduced motion is on). */
export function level(): number;
export const reduced: boolean;

/* ---------- theme and palettes ---------- */
export type PaletteName = 'sakuga' | 'shonen' | 'soda' | 'sunset' | 'mono';
export function setTheme(theme: 'light' | 'dark', origin?: { x: number; y: number }): void;
export function getTheme(): 'light' | 'dark';
export function setPalette(name: PaletteName | (string & {})): void;
export function getPalette(): PaletteName | (string & {});
export const PALETTES: Record<string, { light: string[]; dark: string[] }>;
export const TOKENS: string;

/* ---------- springs and motion ---------- */
export interface Spring { easing: string; duration: number }
export const SPRINGS: { spring: Spring; bounce: Spring; soft: Spring; snap: Spring };
export type SpringName = keyof typeof SPRINGS;
export function spring(el: Element, keyframes: Keyframe[] | PropertyIndexedKeyframes, name?: SpringName, opts?: KeyframeAnimationOptions): Animation;
export function play(el: Element, keyframes: Keyframe[] | PropertyIndexedKeyframes, opts?: KeyframeAnimationOptions): Animation;
export function anim(el: Element, name: string, opts?: KeyframeAnimationOptions): Animation;
export function shake(el: Element, amp?: number, dur?: number): Animation;
export function zipIn(el: Element, dx?: number, sx?: number): Animation;
export function zipOut(el: Element, dx?: number): Animation;

/* ---------- lettering ---------- */
export type Voice = 'impact' | 'cut' | 'click' | 'swish' | 'pop' | 'shine' | 'soft' | 'hush' | 'rumble' | 'spin';
export interface SfxOptions {
  voice?: Voice; x?: number; y?: number; size?: number; color?: string; rot?: number;
  /** ms the word stays */ hold?: number; /** seconds before it appears */ delay?: number;
  silent?: boolean; sp?: number; enter?: string; enterMs?: number; stagger?: number; exitMs?: number;
}
export interface SfxHandle { el: Element | null; gone: boolean; cancel(ms?: number): void }
/** Say a sound-effect word at page position (x, y): lettering plus its sound. */
export function sfx(text: string, o?: SfxOptions): SfxHandle;
export function compose(text: string, o?: SfxOptions): { html: string; w: number; h: number; V: unknown };
export const VOICES: Record<Voice, Record<string, unknown>>;
export function loadFaces(): Promise<unknown>;
export const DOTS: string;

/* ---------- toast ---------- */
export interface ToastOptions {
  variant?: 'info' | 'success' | 'warn' | 'danger';
  duration?: number;
  placement?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}
export function toast(message: string, o?: ToastOptions): SkToast;

/* ---------- top layer ---------- */
export function lift(el: Element): boolean;
export function lower(el: Element): void;
export function anchor(pop: HTMLElement, ref: Element, o?: { side?: 'bottom' | 'top'; align?: 'start' | 'end' | 'center' | 'stretch'; gap?: number; max?: number }): () => void;
export function crownLayer<T extends Element>(el: T, rank: number): T;
export const BARE: string;

/* ---------- screentone ---------- */
export type ToneKind = 'dots' | 'grad' | 'lines' | 'hatch' | 'rope' | 'sand' | 'stipple' | 'sparkle' | 'bubble';
export interface ToneOptions { pct?: number; pitch?: number; angle?: 0 | 45 | 90 | 135; level?: 1 | 2 | 3 | 4; from?: number; to?: number; len?: number; weight?: number; seed?: number; n?: number; falloff?: number; color?: string }
export interface Tone { kind: string; w: number; h: number; repeat: string; size: string; body: string; url: string; css: string }
/** One repeating tile of screentone. `css` paints a layer element with it in --sk-ink; `url` is the tile as a CSS image. */
export function tone(kind: ToneKind, o?: ToneOptions): Tone;
/** The same tile as an SVG <pattern>, for fills inside inline SVG. */
export function tonePattern(id: string, kind: ToneKind, o?: ToneOptions): string;
export const TONES: ToneKind[];

/* ---------- effects, sound, combined moves (advanced) ---------- */
/** A box in page space, as rectOf() measures it. */
export interface FxBox { l: number; t: number; w: number; h: number }
/** A live effect. end() lets one held with life: Infinity leave; kill() removes it at once. */
export interface FxItem { life: number; end(fade?: number): void; kill(): void }
export namespace FX {
  const C: Record<string, string>;
  function add(item: object): FxItem;
  /** Run fn; every effect it spawns is clipped to the inside of el, the way a drawing stays inside its panel. */
  function within<T>(el: Element, fn: () => T): T;
  function puff(o: object): void; function shard(o: object): void; function burst(o: object): void;
  function ring(o: object): void; function ticks(o: object): void; function lines(o: object): void;
  function sparkle(o: object): void; function slash(o: object): void; function arcs(o: object): void;
  function drop(o: object): void; function sticker(o: object): void;
  /** The manga shelf. Each is a named drawing technique; options are documented above each function in src/core/fx-manga.js. */
  function focus(o: { x: number; y: number; r?: number; len?: number; n?: number; mode?: 'in' | 'out'; bundle?: boolean; white?: boolean | string; swirl?: number; rag?: number; w?: number; sx?: number; sy?: number; color?: string; behind?: Element; life?: number }): FxItem;
  function uni(o: { x: number; y: number; rx?: number; ry?: number; n?: number; hair?: number; both?: boolean; rot?: number; color?: string; fill?: string; behind?: Element; life?: number }): FxItem;
  function bolt(o: { x: number; y: number; x2?: number; y2?: number; angle?: number; len?: number; w?: number; segs?: number; zig?: number; branches?: number; edge?: number; life?: number }): FxItem;
  function tare(o: { x: number; y: number; w: number; len?: number; n?: number; kind?: 'line' | 'wavy' | 'drip'; lean?: number; lw?: number; color?: string; life?: number }): FxItem;
  function odoro(o: { x: number; y: number; rx?: number; ry?: number; len?: number; n?: number; w?: number; inward?: boolean; color?: string; behind?: Element; life?: number }): FxItem;
  function wobble(o: { x: number; y: number; w?: number; h?: number; pad?: number; n?: number; period?: number; amp?: number; len?: number; color?: string; life?: number }): FxItem;
  function ghost(o: { from: FxBox; to: FxBox; n?: number; radius?: number; lw?: number; hollow?: boolean; behind?: Element; life?: number }): FxItem;
  function trail(o: { pts: [number, number][]; w?: number; bulge?: number; life?: number }): FxItem;
  function bure(o: { x: number; y: number; w: number; h: number; angle: number; n?: number; len?: number; lw?: number; color?: string; life?: number }): FxItem;
  function crack(o: { x: number; y: number; r?: number; n?: number; w?: number; clip?: FxBox & { radius?: number }; color?: string; life?: number }): FxItem;
  function shock(o: { x: number; y: number; r?: number; r0?: number; w?: number; n?: number; sy?: number; behind?: Element; life?: number }): FxItem;
  function crown(o: { x: number; y: number; r?: number; h?: number; n?: number; life?: number }): FxItem;
  function spatter(o: { x: number; y: number; r?: number; n?: number; size?: number; angle?: number; spread?: number; ink?: boolean; color?: string; behind?: Element; life?: number }): FxItem;
  function drift(o: { x: number; y: number; w: number; h: number; kind?: 'petal' | 'leaf' | 'dust'; n?: number; wind?: number; life?: number }): FxItem | FxItem[];
  /** The scene shelf: techniques for the everyday moments of an app (see moves.reveal and the rest). */
  function rays(o: { x: number; y: number; r0?: number; r?: number; n?: number; spin?: number; rot?: number; color?: string; line?: string; behind?: Element; life?: number }): FxItem;
  function confetti(o: { x: number; y: number; n?: number; angle?: number; spread?: number; speed?: number; colors?: string[]; life?: number }): FxItem[];
  /** Burns as a stream of rising cells under screentone, stepped on twos; .end() lets the last cells rise away. */
  function flame(o: { x: number; y: number; w: number; h?: number; lean?: number; color?: string; behind?: Element; life?: number }): FxItem;
  function steam(o: { x: number; y: number; w?: number; h?: number; n?: number; lw?: number; color?: string; life?: number }): FxItem[];
  function frost(o: { box?: FxBox; el?: Element; life?: number }): FxItem;
  function rush(o: { x: number; y: number; w: number; h: number; angle?: number; n?: number; len?: number; color?: string; behind?: Element; life?: number }): FxItem;
  function gust(o: { x: number; y: number; len?: number; dir?: 1 | -1; n?: number; h?: number; leaves?: number; lw?: number; color?: string; behind?: Element; life?: number }): FxItem[];
  function spotlight(o: { x: number; y: number; r?: number; box?: FxBox; from?: [number, number]; pitch?: number; life?: number }): FxItem;
  function notes(o: { x: number; y: number; n?: number; size?: number; life?: number }): FxItem[];
  function stats(): { items: number; quality: number; fps: number; dropped: number };
  function redraw(): void;
}
export namespace SND {
  function play(name: string, params?: object, delay?: number): void;
  function word(text: string, o?: object): void;
  function loop(kind: 'drag' | 'charge' | 'spin'): { set(v: number): void; stop(): void };
  function test(name: string, params?: object): Promise<{ name: string; peak: number; rms: number; dur: number }>;
  const names: string[];
  const words: Record<string, unknown>;
  function state(): string;
}
export interface MangaMoveOptions { word?: string; voice?: string; size?: number }
export namespace moves {
  function say(word: string, o?: SfxOptions): SfxHandle;
  function tap(el: Element, sound?: string): void;
  function poof(x: number, y: number, r?: number, o?: object): void;
  function dust(x: number, y: number, r?: number, spread?: number): void;
  function twinkle(x: number, y: number, r?: number, o?: object): void;
  function shards(x: number, y: number, n?: number, speed?: number, o?: object): void;
  function boom(x: number, y: number, k?: number, el?: Element | null, br?: number): void;
  function rings(x: number, y: number): void;
  function impact(el: Element, o?: object): void;
  function streak(x: number, y: number, angle: number, len?: number, n?: number, o?: object): void;
  function cut(q: object, o?: object): void;
  function shower(x: number, y: number, shape?: string, n?: number, o?: object): void;
  function hop(a: Element, b: Element, o?: object): void;
  /** Moves built on the manga shelf. Each brings its sound word; pass { word: '' } to play a plain sound instead. */
  function notice(el: Element, o?: MangaMoveOptions): object;
  function gloom(el: Element, o?: MangaMoveOptions & { kind?: 'line' | 'wavy' | 'drip'; lean?: number; life?: number }): FxItem;
  function vanish(el: Element, o?: MangaMoveOptions): object;
  function zap(el: Element, o?: MangaMoveOptions & { scale?: number }): object;
  function bloom(el: Element, o?: MangaMoveOptions): object;
  function shiver(el: Element, o?: MangaMoveOptions & { period?: number; life?: number }): FxItem;
  function afterimage(el: Element, from: FxBox, o?: { n?: number; radius?: number; lines?: number; silent?: boolean }): object;
  function crackAt(el: Element, x?: number, y?: number, o?: MangaMoveOptions & { n?: number; radius?: number; life?: number }): FxItem;
  function stomp(x: number, y: number, o?: MangaMoveOptions & { scale?: number }): void;
  function focusOn(el: Element, o?: { len?: number; n?: number; bundle?: boolean; white?: boolean; life?: number; silent?: boolean }): FxItem;
  function dread(el: Element, o?: MangaMoveOptions & { len?: number; n?: number; life?: number }): FxItem;
  /** The scene moves. o.word replaces the word ('' for the sound alone); o.hold keeps blaze, freeze and spotlight on until .end(). */
  function reveal(el: Element, o?: MangaMoveOptions & { hold?: boolean; life?: number }): FxItem;
  function celebrate(el: Element, o?: MangaMoveOptions & { n?: number }): FxItem[];
  function blaze(el: Element, o?: MangaMoveOptions & { hold?: boolean; life?: number }): FxItem;
  function fresh(el: Element, o?: MangaMoveOptions): FxItem[];
  function freeze(el: Element, o?: MangaMoveOptions & { hold?: boolean; life?: number }): FxItem;
  function dash(el: Element, o?: MangaMoveOptions & { angle?: number; life?: number }): FxItem;
  /** With o.out the element is blown away too: the returned Animation finishes when it is gone. */
  function blowAway(el: Element, o?: MangaMoveOptions & { dir?: 1 | -1; out?: boolean }): FxItem[] | Animation | null;
  function spotlight(el: Element, o?: MangaMoveOptions & { hold?: boolean; life?: number; box?: FxBox; from?: [number, number] }): FxItem;
  function sing(el: Element, o?: MangaMoveOptions & { n?: number }): FxItem[];
}

/* ---------- writing your own components ---------- */
export class SkElement extends HTMLElement {
  static props: Record<string, unknown>;
  static styles: string;
  static template: string;
  /** shadow-root querySelector */
  $(sel: string): HTMLElement | null;
  $$(sel: string): HTMLElement[];
  emit(type: string, detail?: unknown): boolean;
  setup?(): void;
  sync?(name: string | null): void;
  connected?(): void;
  disconnected?(): void;
}
export function define(tag: string, cls: CustomElementConstructor): void;
export function css(strings: TemplateStringsArray, ...values: unknown[]): string;
export function html(strings: TemplateStringsArray, ...values: unknown[]): string;
export function rectOf(el: Element): { l: number; t: number; r: number; b: number; w: number; h: number; cx: number; cy: number };
export const clamp: (v: number, a: number, b: number) => number;
export const lerp: (a: number, b: number, t: number) => number;

/* ---------- icons ---------- */
export type IconName = 'bell' | 'heart' | 'star' | 'check' | 'x' | 'plus' | 'search' | 'gear' | 'trash' | 'download' | 'send' | 'mail'
  | 'home' | 'user' | 'lock' | 'eye' | 'bolt' | 'bookmark' | 'chat' | 'pencil' | 'play' | 'arrow' | 'copy' | 'flame';
export const ICONS: Record<IconName, string>;
export const iconNames: IconName[];

/* ---------- elements ---------- */
export class SkButton extends SkElement { done(ms?: number): void; success(word?: string): void }
export class SkHoldButton extends SkElement {}
export class SkLike extends SkElement { pressed: boolean; count: number }
export class SkSegmented extends SkElement { value: string }
export class SkCopy extends SkElement { value: string }
export class SkSwitch extends SkElement { checked: boolean }
export class SkThemeSwitch extends SkElement {}
export class SkCheckbox extends SkElement { checked: boolean }
export class SkRadio extends SkElement { value: string }
export class SkRadioGroup extends SkElement { value: string }
export class SkSlider extends SkElement { value: number }
export class SkInput extends SkElement { value: string; reject(message?: string): void }
export class SkTextarea extends SkInput {}
export class SkSelect extends SkElement { value: string }
export class SkStepper extends SkElement { value: number }
export class SkRating extends SkElement { value: number }
export class SkOtp extends SkElement { value: string; reject(): void }
export class SkToast extends SkElement { dismiss(toward?: string): void }
export class SkAlert extends SkElement { show(): void; hide(): void }
export class SkProgress extends SkElement { value: number }
export class SkRing extends SkElement { value: number }
export class SkSpinner extends SkElement {}
export class SkLoader extends SkElement { poke(): void }
export class SkSkeleton extends SkElement {}
export class SkBadge extends SkElement { value: string }
export class SkTag extends SkElement {}
export class SkDialog extends SkElement { open: boolean; show(): void; hide(): void }
export class SkDrawer extends SkElement { open: boolean; show(): void; hide(): void }
export class SkTooltip extends SkElement {}
export class SkPopover extends SkElement { open: boolean }
export class SkMenu extends SkPopover {}
export class SkMenuItem extends SkElement {}
export class SkTab extends SkElement {}
export class SkTabs extends SkElement { value: string }
export class SkAccordionItem extends SkElement { open: boolean }
export class SkAccordion extends SkElement {}
export class SkBreadcrumb extends SkElement {}
export class SkPagination extends SkElement { page: number; go(page: number): void }
export class SkStep extends SkElement {}
export class SkSteps extends SkElement { current: number; next(): void; back(): void }
export class SkCard extends SkElement {}
export class SkAvatar extends SkElement {}
export class SkDivider extends SkElement {}
export class SkKbd extends SkElement {}
export class SkBubble extends SkElement {}
export class SkCounter extends SkElement { value: number }
export class SkCalendar extends SkElement { value: string; month: string }
export class SkWord extends SkElement { shout(): void }
export type BalloonTone = 'say' | 'shout' | 'ask' | 'hush' | 'think' | 'sing' | 'tremble';
/** Which tone a line of text is written in: the rule sk-balloon-input uses. */
export function toneOf(text: string): BalloonTone;
export class SkKomaPanel extends SkElement { value: string; label: string; count: string }
export class SkKoma extends SkElement { value: string; pick(index: number, user?: boolean): void }
export class SkPage extends SkElement {}
export class SkPages extends SkElement { page: number; next(): void; prev(): void; go(page: number): void }
export class SkBalloonInput extends SkElement { value: string; readonly tone: BalloonTone; tail: 'left' | 'right' | 'none'; send(): boolean; clear(): void }
export class SkSpeedbar extends SkElement { value: number; speed: number; fast: number; stall: number; seal: string }
export class SkFlash extends SkElement { open: boolean; heading: string; note: string; ask(from?: Element): Promise<boolean>; answer(yes: boolean): void }
export class SkTone extends SkElement { value: number; min: number; max: number; step: number; preview: boolean }
export class SkHatch extends SkElement { value: number; max: number; labels: string; seal: string }
export class SkKomaStep extends SkElement { mark: string; label: string; summary: string; readonly state: 'rough' | 'now' | 'done' }
export class SkYonkoma extends SkElement { current: number; next(): void; back(): void; go(step: number): void }
export class SkBreakout extends SkElement { label: string; word: string; href: string }
export class SkReaction extends SkElement { word: string; voice: string; label: string; count: number; pressed: boolean; toggle(): void }
export class SkReactions extends SkElement { for: string; readonly target: Element }
export class SkIcon extends SkElement { name: IconName; play(): void }

declare global {
  interface HTMLElementTagNameMap {
    'sk-button': SkButton; 'sk-hold-button': SkHoldButton; 'sk-like': SkLike; 'sk-segmented': SkSegmented; 'sk-copy': SkCopy;
    'sk-switch': SkSwitch; 'sk-theme-switch': SkThemeSwitch; 'sk-checkbox': SkCheckbox; 'sk-radio': SkRadio; 'sk-radio-group': SkRadioGroup;
    'sk-slider': SkSlider; 'sk-input': SkInput; 'sk-textarea': SkTextarea; 'sk-select': SkSelect; 'sk-stepper': SkStepper;
    'sk-rating': SkRating; 'sk-otp': SkOtp; 'sk-toast': SkToast; 'sk-alert': SkAlert; 'sk-progress': SkProgress; 'sk-ring': SkRing;
    'sk-spinner': SkSpinner; 'sk-loader': SkLoader; 'sk-skeleton': SkSkeleton; 'sk-badge': SkBadge; 'sk-tag': SkTag;
    'sk-dialog': SkDialog; 'sk-drawer': SkDrawer; 'sk-tooltip': SkTooltip; 'sk-popover': SkPopover; 'sk-menu': SkMenu; 'sk-menu-item': SkMenuItem;
    'sk-tab': SkTab; 'sk-tabs': SkTabs; 'sk-accordion-item': SkAccordionItem; 'sk-accordion': SkAccordion; 'sk-breadcrumb': SkBreadcrumb;
    'sk-pagination': SkPagination; 'sk-step': SkStep; 'sk-steps': SkSteps; 'sk-card': SkCard; 'sk-avatar': SkAvatar; 'sk-divider': SkDivider;
    'sk-kbd': SkKbd; 'sk-bubble': SkBubble; 'sk-counter': SkCounter; 'sk-calendar': SkCalendar; 'sk-word': SkWord; 'sk-icon': SkIcon;
    'sk-koma': SkKoma; 'sk-koma-panel': SkKomaPanel; 'sk-pages': SkPages; 'sk-page': SkPage; 'sk-balloon-input': SkBalloonInput; 'sk-speedbar': SkSpeedbar;
    'sk-flash': SkFlash; 'sk-tone': SkTone; 'sk-hatch': SkHatch; 'sk-yonkoma': SkYonkoma; 'sk-koma-step': SkKomaStep; 'sk-breakout': SkBreakout;
    'sk-reactions': SkReactions; 'sk-reaction': SkReaction;
  }
}
