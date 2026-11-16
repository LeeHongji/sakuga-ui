/* Design tokens. Injected once, at the top of <head>, so any stylesheet of yours can override them. */
import { SPRING_VARS } from './spring.js';
import { PALETTE_CSS } from './palettes.js';

export const TOKENS = `
:root{${SPRING_VARS}}
:root{
  --sk-paper:#fdfcff; --sk-ink:#1b1642; --sk-surface:#ffffff;
  --sk-violet:#5a46d8; --sk-lav:#b7abf7; --sk-peri:#8c86ee; --sk-deep:#6a60e2; --sk-pink:#f0449e;
  --sk-off:#b9bdd4; --sk-muted:#685b90; --sk-on-hot:#1b1642;
  --sk-fxw:#ffffff; --sk-fxs:#b7abf7; --sk-fxo:#5a46d8;
  --sk-font:"Helvetica Neue",Helvetica,Arial,"PingFang SC","Hiragino Sans GB",sans-serif;
  --sk-bw:3px; --sk-r:14px; --sk-sh:5px;
}
:root[data-sk-theme="dark"],[data-sk-theme="dark"]{
  --sk-paper:#14112a; --sk-ink:#eee9ff; --sk-surface:#241f49;
  --sk-violet:#a698ff; --sk-lav:#4b3fa8; --sk-peri:#6058d0; --sk-deep:#5a50d6; --sk-pink:#ff5fb0;
  --sk-off:#3b3668; --sk-muted:#9b90cc; --sk-on-hot:#14112a;
  --sk-fxw:#f6f3ff; --sk-fxs:#9e92f0; --sk-fxo:#3a2f9c;
  color-scheme:dark;
}
${PALETTE_CSS}
::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}
.sk-table{border-collapse:separate;border-spacing:0;border:var(--sk-bw) solid var(--sk-ink);border-radius:var(--sk-r);box-shadow:var(--sk-sh) var(--sk-sh) 0 var(--sk-lav);background:var(--sk-surface);color:var(--sk-ink);font-family:var(--sk-font);overflow:hidden}
.sk-table th{font-style:italic;font-weight:800;text-align:left;background:var(--sk-ink);color:var(--sk-surface)}
.sk-table th,.sk-table td{padding:10px 14px}
.sk-table tr+tr td{border-top:2px dashed color-mix(in srgb,var(--sk-muted) 45%,transparent)}
.sk-table tbody tr:hover td{background:color-mix(in srgb,var(--sk-lav) 28%,transparent)}
`;
if (typeof document !== 'undefined' && !document.getElementById('sk-tokens')) {
  const st = document.createElement('style');
  st.id = 'sk-tokens'; st.textContent = TOKENS;
  document.head.prepend(st);
}
