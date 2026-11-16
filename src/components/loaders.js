/* sk-loader: waiting, drawn as small animation exercises. Everything loops in CSS (no script while idle), and each
   one answers when poked, so there is something to do while you wait.
     ball    the first exercise every animator draws: a bouncing ball with squash and stretch. Click to kick it.
     flip    a pegged stack of animation paper flipping through a drawing on twos.
     wave    the label itself, each glyph hopping in turn.
     pencil  a pencil roughing in a line, then starting again. */
import { SkElement, define, css, FX, SND, moves, play, rectOf, level } from '../core/index.js';

const STAR = 'M12 2.6l2.8 6 6.6.8-4.9 4.5 1.3 6.5-5.8-3.3-5.8 3.3 1.3-6.5-4.9-4.5 6.6-.8z';
const TPL = {
  ball: `<div class="st ball"><i class="gnd"></i><i class="sh"></i><i class="pf a"></i><i class="pf b"></i><span class="hop"><i class="bl"></i></span><b class="combo" hidden></b></div>`,
  flip: `<div class="st flip"><i class="pg p3"></i><i class="pg p2"></i><span class="pg p1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR}"/></svg></span><span class="pg top"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR}"/></svg></span><i class="peg"></i></div>`,
  wave: `<div class="st wave" aria-hidden="true"></div>`,
  pencil: `<div class="st pencil"><svg viewBox="0 0 96 40" aria-hidden="true"><path class="ln" pathLength="100" d="M6 30C14 6 22 6 28 22S42 36 50 16s16-8 20 4 10 10 20-8"/></svg><span class="pen"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="pb" d="M5.3 15.5L16.1 4.7a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.5 18.7z"/><path class="pt" d="M5.3 15.5l3.2 3.2-4.7 1.5z"/></svg></span></div>`,
};

export class SkLoader extends SkElement {
  static props = { variant: [String, 'ball'], text: [String, 'LOADING'], tips: String, label: [String, 'Loading'] };
  static styles = css`
:host{display:inline-flex;flex-direction:column;align-items:center;gap:.5em;vertical-align:middle;font:italic 800 15px/1.2 var(--sk-font);color:var(--sk-ink);cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}
.st{position:relative;font-size:1em}
.lbl{min-height:1.2em;text-align:center}.lbl:empty{display:none}
/* ---- ball ---- */
.ball{width:5.2em;height:4em}
.gnd{position:absolute;left:0;right:0;bottom:.3em;height:2.5px;border-radius:2px;background:repeating-linear-gradient(90deg,var(--sk-ink) 0 .9em,transparent .9em 1.3em);animation:sk-l-gnd .62s linear infinite}
.sh{position:absolute;left:50%;bottom:.14em;width:1.5em;height:.34em;margin-left:-.75em;border-radius:50%;background:var(--sk-lav);animation:sk-l-sh .62s infinite}
.hop{position:absolute;left:50%;bottom:calc(.3em + 1.5px);margin-left:-.7em;animation:sk-l-y .62s infinite}
.bl{display:block;width:1.4em;height:1.4em;border-radius:50%;border:var(--sk-bw) solid var(--sk-ink);background:radial-gradient(circle at 32% 30%,var(--sk-fxw) 0 12%,transparent 13%),var(--sk-pink);transform-origin:50% 100%;animation:sk-l-sq .62s infinite}
.pf{position:absolute;bottom:.3em;left:50%;width:.5em;height:.5em;border-radius:50%;border:2px solid var(--sk-violet);background:var(--sk-fxw);opacity:0;animation:sk-l-pf .62s infinite}
.pf.b{--dx:-1.7em}.pf.a{--dx:1.2em}
.combo{position:absolute;right:-.2em;top:0;padding:.1em .4em;border:2.5px solid var(--sk-ink);border-radius:999px;background:var(--sk-surface);font:italic 900 .8em/1 var(--sk-font);rotate:8deg}
.combo[hidden]{display:none}
@keyframes sk-l-y{0%,100%{translate:0 0}6%{translate:0 0;animation-timing-function:cubic-bezier(.2,.7,.4,1)}50%{translate:0 -2.3em;animation-timing-function:cubic-bezier(.6,0,.8,.3)}}
@keyframes sk-l-sq{0%,6%,100%{scale:1.28 .7}15%{scale:.86 1.16}32%,70%{scale:1 1}90%{scale:.86 1.18}}
@keyframes sk-l-sh{0%,100%{scale:1.25 1;opacity:.95}50%{scale:.5 .7;opacity:.4}}
@keyframes sk-l-pf{0%{translate:0 0;scale:.4;opacity:0}4%{opacity:1}30%{translate:var(--dx) -.5em;scale:1;opacity:.9}45%,100%{translate:var(--dx) -.7em;scale:.2;opacity:0}}
@keyframes sk-l-gnd{to{background-position:-1.3em 0}}
/* ---- flip ---- */
.flip{width:4em;height:3.4em;perspective:16em}
.pg{position:absolute;left:.3em;right:.3em;top:.5em;bottom:.2em;border:var(--sk-bw) solid var(--sk-ink);border-radius:.3em;background:var(--sk-surface);display:grid;place-items:center}
.p3{translate:.36em .36em;background:var(--sk-lav)}.p2{translate:.18em .18em}
.p1 svg,.top svg{width:1.8em;height:1.8em;overflow:visible;animation:sk-l-turn 2.56s steps(1) infinite}
.top svg{animation-delay:-2.24s}
.p1 path,.top path{fill:var(--sk-peri);stroke:var(--sk-ink);stroke-width:2.3;stroke-linejoin:round}
.top{transform-origin:50% 0;animation:sk-l-flip .32s infinite;background:var(--sk-surface)}
.peg{position:absolute;left:50%;top:.72em;width:1.6em;height:.3em;margin-left:-.8em;background:radial-gradient(circle,var(--sk-ink) 0 .13em,transparent .15em) 0 0/.8em .3em;border:0}
@keyframes sk-l-flip{0%{transform:rotateX(0);opacity:1}14%{transform:rotateX(-50deg);opacity:.9}28%{transform:rotateX(-86deg) translateY(-.2em);opacity:.3}29%,100%{transform:rotateX(-86deg);opacity:0}}
@keyframes sk-l-turn{0%{rotate:0deg;scale:1}12.5%{rotate:18deg;scale:.9 1.1}25%{rotate:36deg;scale:1.1 .9}37.5%{rotate:54deg;scale:1}50%{rotate:72deg;scale:.9 1.1}62.5%{rotate:90deg;scale:1.1 .9}75%{rotate:108deg;scale:1}87.5%{rotate:126deg;scale:.92 1.08}}
/* ---- wave ---- */
.wave{display:flex;font:italic 900 1.5em/1.3 var(--sk-font);letter-spacing:.02em;padding-top:.4em}
.wave i{display:inline-block;font-style:inherit;text-shadow:.07em .07em 0 var(--sk-lav);transform-origin:50% 100%;animation:sk-l-hop 1.15s calc(var(--i)*.075s) infinite}
.wave i:nth-child(3n+1){color:var(--sk-pink)}
@keyframes sk-l-hop{0%,46%,100%{translate:0 0;scale:1}12%{translate:0 -.5em;scale:.9 1.14;animation-timing-function:cubic-bezier(.6,0,.8,.3)}26%{translate:0 0;scale:1.22 .76}36%{translate:0 0;scale:.96 1.05}}
/* ---- pencil ---- */
.pencil{width:96px;height:40px;font-size:15px}
.pencil>svg{width:100%;height:100%;overflow:visible}
.ln{fill:none;stroke:var(--sk-ink);stroke-width:3;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:100;animation:sk-l-draw 1.8s infinite}
.pen{position:absolute;left:0;top:0;width:1.9em;height:1.9em;offset-anchor:16% 84%;offset-path:path("M6 30C14 6 22 6 28 22S42 36 50 16s16-8 20 4 10 10 20-8");offset-rotate:0deg;animation:sk-l-pen 1.8s infinite}
.pen svg{width:100%;height:100%;overflow:visible;transform-origin:16% 84%;animation:sk-l-wob .22s steps(2) infinite}
.pb{fill:var(--sk-peri);stroke:var(--sk-ink);stroke-width:2.3;stroke-linejoin:round}.pt{fill:var(--sk-ink);stroke:var(--sk-ink);stroke-width:2.3;stroke-linejoin:round}
@keyframes sk-l-draw{0%{stroke-dashoffset:100;opacity:1}62%{stroke-dashoffset:0;opacity:1}86%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}
@keyframes sk-l-pen{0%{offset-distance:0%;translate:0 0;opacity:1}62%{offset-distance:100%;translate:0 0;opacity:1}80%{offset-distance:100%;translate:.3em -.5em;opacity:1}86%,100%{offset-distance:100%;translate:.3em -.5em;opacity:0}}
@keyframes sk-l-wob{0%{rotate:-4deg}100%{rotate:5deg}}
@media (prefers-reduced-motion:reduce){.gnd,.sh,.hop,.bl,.pf,.p1 svg,.wave i,.ln,.pen,.pen svg{animation-duration:2.4s}.pf{animation:none}.top{animation:none;opacity:0}}`;
  static template = `<span class="box-slot"></span><span class="lbl" part="label"><slot></slot></span>`;
  setup() {
    this.setAttribute('role', 'status');
    this.addEventListener('click', () => this.poke());
    this.hits = 0;
  }
  sync(name) {
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', this.label);
    if (name === null || name === 'variant' || name === 'text') {
      const v = TPL[this.variant] ? this.variant : 'ball';
      this.$('.box-slot').innerHTML = TPL[v];
      if (v === 'wave') this.$('.wave').innerHTML = [...this.text].map((c, i) => `<i style="--i:${i}">${c === ' ' ? '&nbsp;' : c.replace(/</g, '&lt;')}</i>`).join('');
    }
    if (name === null || name === 'tips') this.cycle();
  }
  disconnected() { clearInterval(this._tip); clearTimeout(this._cool); }
  /* tips="a|b|c": the label under the drawing changes every few seconds */
  cycle() {
    clearInterval(this._tip);
    const tips = (this.tips || '').split('|').map(s => s.trim()).filter(Boolean), lbl = this.$('.lbl');
    if (!tips.length) return;
    let i = 0; const show = () => { lbl.textContent = tips[i++ % tips.length]; play(lbl, [{ translate: '0 .5em', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1.3)' }); };
    show(); this._tip = setInterval(show, 2600);
  }
  /* something to do while waiting: each variant reacts, and quick pokes count up a combo */
  poke() {
    if (level() === 0) return;
    const st = this.$('.st'), q = rectOf(st), v = st.classList[1];
    this.hits++; clearTimeout(this._cool); this._cool = setTimeout(() => { this.hits = 0; const c = this.$('.combo'); if (c) c.hidden = true; }, 1400);
    if (v === 'ball') {
      // one kick at a time: a second trajectory added over a running one makes the ball jump sideways.
      // A click while it is still in the air lands on the ball itself instead
      if (!this._kick || this._kick.playState !== 'running') {
        this._kick = play(this.$('.hop'), [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-3.2em) rotate(200deg)', offset: 0.45, easing: 'cubic-bezier(.6,0,.8,.3)' }, { transform: 'translateY(0) rotate(360deg)' }], { duration: 560, easing: 'cubic-bezier(.2,.7,.4,1)', composite: 'add' });
        moves.dust(q.cx, q.b - 4, 5, 16);
      } else {
        const b = rectOf(this.$('.bl'));
        for (let i = 0; i < 4; i++) FX.ticks({ x: b.cx, y: b.cy, angle: Math.PI / 4 + i * Math.PI / 2, len: 8, n: 1, life: 0.28 });
      }
      const c = this.$('.combo'); c.hidden = this.hits < 2; c.textContent = '×' + this.hits;
      if (this.hits >= 2) play(c, [{ scale: '.4' }, { scale: '1.25', offset: 0.55 }, { scale: '1' }], { duration: 220 });
      moves.say(this.hits % 5 === 0 ? 'ポーン!' : 'ポン', { voice: 'pop', x: q.cx - q.w * 0.42, y: q.t + 4, size: this.hits % 5 === 0 ? 26 : 18, hold: 200 });
    } else if (v === 'flip') {
      play(st, [{ rotate: '0deg', scale: '1' }, { rotate: '-9deg', scale: '1.12', offset: 0.3 }, { rotate: '5deg', scale: '.96', offset: 0.65 }, { rotate: '0deg', scale: '1' }], { duration: 380 });
      moves.say('ペラッ', { voice: 'swish', x: q.cx + q.w * 0.5, y: q.t, size: 18, hold: 200 });
      for (let i = 0; i < 2; i++) FX.ticks({ x: q.cx, y: q.t + 2, angle: -Math.PI / 2 + (i ? 0.7 : -0.7), len: 7, n: 2, life: 0.3 });
    } else if (v === 'wave') {
      this.$$('.wave i').forEach((el, i) => play(el, [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-.9em) rotate(-14deg)', offset: 0.4 }, { transform: 'translateY(0) rotate(0)' }], { duration: 420, delay: i * 30, easing: 'cubic-bezier(.3,.8,.4,1)', composite: 'add' }));
      SND.play('boing');
    } else {
      play(st, [{ translate: '0 0' }, { translate: '-3px 2px' }, { translate: '3px -2px' }, { translate: '-2px -1px' }, { translate: '0 0' }], { duration: 240 });
      moves.say('カリカリ', { voice: 'swish', x: q.cx, y: q.t - 8, size: 16, hold: 220 });
    }
    this.emit('sk-poke', { hits: this.hits });
  }
}
define('sk-loader', SkLoader);
