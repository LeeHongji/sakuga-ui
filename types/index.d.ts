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

/* ---------- effects, sound, combined moves (advanced) ---------- */
export namespace FX {
  const C: Record<string, string>;
  function add(item: object): void;
  function puff(o: object): void; function shard(o: object): void; function burst(o: object): void;
  function ring(o: object): void; function ticks(o: object): void; function lines(o: object): void;
  function sparkle(o: object): void; function slash(o: object): void; function arcs(o: object): void;
  function drop(o: object): void; function sticker(o: object): void;
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
  }
}
