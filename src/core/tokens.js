/* Design tokens. Injected once, at the top of <head>, so any stylesheet of yours can override them. */
import { SPRING_VARS } from './spring.js';
import { PALETTE_CSS } from './palettes.js';
import { config } from './config.js';

export const TOKENS = `
:root{${SPRING_VARS}}
:root{
  --sk-paper:#fdfcff; --sk-ink:#1b1642; --sk-surface:#ffffff;
  --sk-violet:#5a46d8; --sk-lav:#b7abf7; --sk-peri:#8c86ee; --sk-deep:#6a60e2; --sk-pink:#f0449e;
  --sk-off:#b9bdd4; --sk-muted:#685b90; --sk-on-hot:#1b1642;
  --sk-fxw:#ffffff; --sk-fxs:#b7abf7; --sk-fxo:#5a46d8;
  /* Two lettering voices, as in a manga page. head: buttons, titles, labels, numbers, the shouted lines.
     text: sentences, fields, descriptions, the dialogue. Latin and digits come from the comic face, CJK from the next one. */
  --sk-font-head:"Knewave","ZCOOL KuaiLe",Impact,"PingFang SC",sans-serif;
  --sk-font:"Comic Neue","ZCOOL KuaiLe","Chalkboard SE","Comic Sans MS","PingFang SC",sans-serif;
  --sk-bw:3px; --sk-r:14px; --sk-sh:5px;
}
:root:lang(ja){--sk-font-head:"Knewave","Reggae One","Hiragino Sans","Yu Gothic",sans-serif;--sk-font:"Comic Neue","Shippori Antique B1","Hiragino Maru Gothic ProN","Yu Gothic",sans-serif}
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
.sk-table th{font:400 1.1em/1.2 var(--sk-font-head);letter-spacing:.03em;text-align:left;background:var(--sk-ink);color:var(--sk-surface)}
.sk-table th,.sk-table td{padding:10px 14px}
.sk-table tr+tr td{border-top:2px dashed color-mix(in srgb,var(--sk-muted) 45%,transparent)}
.sk-table tbody tr:hover td{background:color-mix(in srgb,var(--sk-lav) 28%,transparent)}
`;
// The lettering faces. With fonts:'google' (the default) the stylesheet is linked once, after the first component
// connects, so a configure({ fonts: 'system' }) right after import still keeps the page off the network.
export const UI_FONTS = 'https://fonts.googleapis.com/css2?family=Knewave&family=Comic+Neue:ital,wght@0,400;0,700;1,400;1,700&family=ZCOOL+KuaiLe&family=Reggae+One&family=Shippori+Antique+B1&display=swap';
let linked = false;
export function linkFonts() {
  if (linked || typeof document === 'undefined') return;
  linked = true;
  setTimeout(() => {
    if (config.fonts !== 'google' || document.querySelector('link[data-sk-ui-fonts]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = UI_FONTS; l.dataset.skUiFonts = '';
    document.head.appendChild(l);
  }, 0);
}
if (typeof document !== 'undefined' && !document.getElementById('sk-tokens')) {
  const st = document.createElement('style');
  st.id = 'sk-tokens'; st.textContent = TOKENS;
  document.head.prepend(st);
}
