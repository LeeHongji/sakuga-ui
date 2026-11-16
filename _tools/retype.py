# One-off: move site/site.css onto the three-voice type system (title / head / text per language).
import pathlib, re
p = pathlib.Path(__file__).parent.parent / 'site/site.css'
s = p.read_text()
lines = s.split('\n')

def setfont(prefix, font, extra=''):
    for i, l in enumerate(lines):
        if l.lstrip().startswith(prefix) and 'font:' in l:
            new, n = re.subn(r'font: [^;]+;( font-size: [^;]+;)?( line-height: [^;]+;)?( font-style: normal;)?', 'font: ' + font + ';' + (' ' + extra if extra else ''), l, count=1)
            assert n, prefix
            lines[i] = new
            return
    raise SystemExit('not found: ' + prefix)

H = lambda px, lh='1.2': '400 calc(%spx * var(--hk)) / %s var(--head); letter-spacing: var(--hls)' % (px, lh)
X = lambda px, lh='1.6': 'var(--tw) calc(%spx * var(--xk)) / %s var(--text)' % (px, lh)
G = lambda px, lh='1.2': '400 %spx / %s var(--tag)' % (px, lh)

setfont('#nav .grp {', H(15, '1'))
setfont('#nav a.it {', X(13, '1.3'))
setfont('.dock {', H(12.5, '1'))
setfont('.dock-h {', G(14, '1.3'))
setfont('.opener .ep {', G(22, '1.15'))
setfont('.opener h2 {', 'var(--ts) 400 calc(clamp(46px, 7vw, 86px) * var(--tk)) / 0.98 var(--title)')
setfont('.narr {', X(15, '1.7'))
setfont('.narr b {', H(21, '1.4'))
setfont('h3.sub {', H(18, '1'))
setfont('h3.sub small {', X(12, '1'))
setfont('.mast {', G(16))
setfont('.vcopy {', H(24, '1.15'))
setfont('.sticker {', H(18, '1'))
setfont('.kicker {', G(17, '1'))
setfont('.soon {', X(12, '1.4'))
setfont('.facts li {', H(13.5, '1.3'))
setfont('.facts li b {', '400 19px / 1 var(--disp); letter-spacing: 0.04em')
setfont('.strip-tag {', G(18))
setfont('.koma h3 {', H(21, '1.15'))
setfont('.koma h3 small {', X(12, '1'))
setfont('.koma summary {', H(13, '1'))
setfont('.tile {', H(14))
setfont('.knobs label {', H(14, '1'))
setfont('.measures b {', H(16, '1.3'))
setfont('.measured h4 {', H(16, '1.3'))
setfont('footer {', X(13, '1.5'))
setfont('.tbc b {', G(28, '1'))
setfont('.menu-btn {', H(15, '1'))

s = '\n'.join(lines)
# drop per-language font overrides that the tokens now cover
for rule in [r':lang\(en\) \.opener h2 \{[^}]*\}\n', r':lang\(ja\) \.opener h2 \{[^}]*\}\n', r':lang\(ja\) \.opener \.ep \{[^}]*\}\n', r':lang\(zh\) \.strip-tag, :lang\(ja\) \.strip-tag \{[^}]*\}\n', r':lang\(zh\) \.tbc b \{[^}]*\}\n']:
    s, n = re.subn(rule, '', s); assert n, rule
s = s.replace('.opener h2 { margin: 0;', '.opener h2 { margin: 0; letter-spacing: var(--tls);')
s = s.replace('letter-spacing: -0.03em; text-shadow: 5px 5px 0 var(--sk-pink); }', 'text-shadow: 0.06em 0.06em 0 var(--sk-pink); }')
s = s.replace('.facts li b { color: var(--sk-pink); font: 400 19px / 1 var(--disp); letter-spacing: 0.04em; letter-spacing: 0.04em;', '.facts li b { color: var(--sk-pink); font: 400 19px / 1 var(--disp); letter-spacing: 0.04em;')
a = s.index(':root {'); b = s.index('html {')
root = ''':root {
  --side: 244px; --g: 14px; --ln: 3px;
  --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --disp: "Bangers", "Arial Narrow", Impact, sans-serif;          /* numbers and Latin tags, in every language */
  /* Three voices per language, as in a manga: title (chapter lettering), head (panel titles, taglines, shouted lines)
     and text (dialogue and narration). --hk / --tk / --xk even out the optical size of the faces. */
  --title: var(--disp); --head: var(--disp); --tag: var(--disp);
  --text: "Comic Neue", "Chalkboard SE", "Comic Sans MS", sans-serif;
  --tw: 700; --ts: normal; --hk: 1.18; --tk: 1.14; --xk: 1.04; --hls: 0.04em; --tls: 0.02em;
  font-synthesis-weight: none;
}
:root:lang(zh) {
  --title: "ZCOOL QingKe HuangYou", "PingFang SC", "Microsoft YaHei", sans-serif;
  --head: "ZCOOL KuaiLe", "PingFang SC", "Microsoft YaHei", sans-serif;
  --tag: "Bangers", "ZCOOL KuaiLe", "PingFang SC", sans-serif;
  --text: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --tw: 500; --ts: italic; --hk: 1.04; --tk: 1.1; --xk: 1; --hls: 0.03em; --tls: 0.04em;
  --sk-font: "Helvetica Neue", Helvetica, Arial, "ZCOOL KuaiLe", "PingFang SC", "Hiragino Sans GB", sans-serif;
}
:root:lang(ja) {
  --title: "Dela Gothic One", "Hiragino Sans", "Yu Gothic", sans-serif;
  --head: "Reggae One", "Hiragino Sans", "Yu Gothic", sans-serif;
  --tag: "Bangers", "Reggae One", "Hiragino Sans", sans-serif;
  --text: "Shippori Antique B1", "Hiragino Sans", "Yu Gothic", sans-serif;
  --tw: 400; --ts: normal; --hk: 0.98; --tk: 0.84; --xk: 1; --hls: 0.01em; --tls: 0;
  --sk-font: "Helvetica Neue", Helvetica, Arial, "Reggae One", "Hiragino Sans", "Yu Gothic", sans-serif;
}
'''
s = s[:a] + root + s[b:]
s = s.replace('margin: 0; color: var(--sk-ink); font-family: var(--sk-font);', 'margin: 0; color: var(--sk-ink); font: var(--tw) 15px/1.6 var(--text);')
s = s.replace('ui-monospace, SFMono-Regular, Menlo, monospace', 'var(--mono)').replace('ui-monospace, Menlo, monospace', 'var(--mono)')
s = s.replace('--mono: var(--mono);', '--mono: ui-monospace, SFMono-Regular, Menlo, monospace;')
s = s.replace('#nav a.it.on { opacity: 1; font-weight: 800;', '#nav a.it.on { opacity: 1;')
# tables on the site speak in the same voices
s = s.replace('.api-table { width: 100%;', 'main .sk-table { font-family: var(--text); font-weight: var(--tw); }\nmain .sk-table th { font: 400 calc(1em * var(--hk)) / 1.3 var(--head); letter-spacing: var(--hls); }\n.api-table { width: 100%;')
p.write_text(s)
print('ok', len(s))
