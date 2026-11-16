# Writes site/type-lab.html: candidate display and text faces for the three languages, set in real site copy.
import pathlib
FAM = ["ZCOOL+QingKe+HuangYou", "ZCOOL+KuaiLe", "Noto+Sans+SC:wght@500;700;900", "Ma+Shan+Zheng", "WDXL+Lubrifont+SC", "ZCOOL+XiaoWei",
       "LXGW+WenKai+TC:wght@400;700", "Dela+Gothic+One", "Reggae+One", "RocknRoll+One", "Rampart+One", "Yusei+Magic", "Kaisei+Tokumin:wght@800",
       "Shippori+Antique+B1", "Shippori+Antique", "Zen+Antique+Soft", "Zen+Antique", "Kaisei+Opti:wght@500;700", "Zen+Maru+Gothic:wght@500;700;900",
       "Klee+One:wght@600", "Bangers", "Luckiest+Guy", "Bowlby+One", "Comic+Neue:ital,wght@0,700;1,700", "Balsamiq+Sans:ital,wght@0,400;0,700;1,700",
       "Shantell+Sans:ital,wght@0,500;0,800;1,800", "Playpen+Sans:wght@500;800", "Patrick+Hand+SC", "Kalam:wght@700", "Chiron+GoRound+TC:wght@500;800",
       "Noto+Serif+SC:wght@900", "M+PLUS+Rounded+1c:wght@500;800;900", "Mochiy+Pop+One", "Potta+One", "Darumadrop+One"]
S = {
    'zh': dict(title='表单', title2='作画语汇', lede='按下去的每一下，都是一格原画。', h3='进度条 Progress',
               body='数值变化时头部有一团烟在跑，到 100「ドン!」。拖过头会被橡皮筋拉回来，松手回弹。带赛璐璐特效、片假名拟声词和合成音效的组件库。', tag='第3话 · 控制台 · 新连载!',
               disp=[('ZCOOL QingKe HuangYou', 400), ('ZCOOL KuaiLe', 400), ('Noto Sans SC', 900), ('WDXL Lubrifont SC', 400), ('Ma Shan Zheng', 400), ('Noto Serif SC', 900), ('Chiron GoRound TC', 800)],
               text=[('Noto Sans SC', 500), ('Noto Sans SC', 700), ('LXGW WenKai TC', 700), ('ZCOOL XiaoWei', 400), ('ZCOOL KuaiLe', 400), ('Chiron GoRound TC', 500), ('PingFang SC', 600)]),
    'ja': dict(title='フォーム', title2='作画の語彙', lede='押すたび、原画。', h3='プログレス Progress',
               body='値が動く間、先頭を砂煙が走る。100 で「ドン!」。引っぱりすぎるとゴムのように戻る。セル画風エフェクト、カタカナ擬音、合成サウンド付きのコンポーネント集。', tag='第3話 · 操作盤 · 新連載!',
               disp=[('Dela Gothic One', 400), ('Reggae One', 400), ('RocknRoll One', 400), ('Rampart One', 400), ('Yusei Magic', 400), ('Kaisei Tokumin', 800), ('Potta One', 400), ('Mochiy Pop One', 400), ('Darumadrop One', 400)],
               text=[('Shippori Antique B1', 400), ('Shippori Antique', 400), ('Zen Antique Soft', 400), ('Zen Antique', 400), ('Kaisei Opti', 700), ('Zen Maru Gothic', 700), ('Klee One', 600), ('M PLUS Rounded 1c', 800), ('Hiragino Sans', 600)]),
    'en': dict(title='FORMS', title2='Vocabulary', lede='Every press is a key frame.', h3='Progress',
               body='A dust cloud runs at the head while the value moves; DON! at 100. Pull too far and it snaps back like rubber. A component library with cel-style effects, katakana sound words and synthesised audio.', tag='EP.3 · CONSOLE · NEW!',
               disp=[('Bangers', 400), ('Luckiest Guy', 400), ('Bowlby One', 400), ('Shantell Sans', 800), ('Playpen Sans', 800)],
               text=[('Comic Neue', 700), ('Balsamiq Sans', 400), ('Balsamiq Sans', 700), ('Shantell Sans', 500), ('Playpen Sans', 500), ('Patrick Hand SC', 400), ('Kalam', 700), ('Helvetica Neue', 600)]),
}
CSS = """body{margin:20px;background:#fdfcff;color:#1b1642;font-family:sans-serif}
section{margin-bottom:30px}h2{font:700 13px monospace;margin:0 0 8px}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.c{border:3px solid #1b1642;background:#fff;min-width:0}.c small{display:block;padding:3px 8px;background:#f0449e;color:#fff;font:700 11px monospace}
.op{background:#1b1642;color:#fff;padding:10px 14px}.op b{display:block;font-size:58px;line-height:1.05;font-weight:inherit;text-shadow:4px 4px 0 #f0449e;white-space:nowrap;overflow:hidden}
.op i{font-style:normal;font-size:30px;display:block;white-space:nowrap;overflow:hidden}
.ld{padding:8px 14px;font-size:21px;line-height:1.4}.h3{padding:0 14px 8px;font-size:20px}.tg{padding:0 14px 10px;font-size:14px;color:#f0449e}
.bd{padding:10px 14px}.bd p{margin:0 0 6px;font-size:15px;line-height:1.7}.bd p+p{font-size:13px;line-height:1.55}"""
h = ['<!doctype html><meta charset="utf-8"><title>type lab</title>']
for i in range(0, len(FAM), 8):
    h.append('<link href="https://fonts.googleapis.com/css2?family=' + '&family='.join(FAM[i:i + 8]) + '&display=swap" rel="stylesheet">')
h.append('<style>' + CSS + '</style>')
for lg, d in S.items():
    h.append('<section lang="%s"><h2>%s · display</h2><div class="g">' % (lg, lg))
    for f, w in d['disp']:
        st = "font-family:'%s';font-weight:%d" % (f, w)
        h.append('<div class="c"><small>%s %d</small><div class="op" style="%s"><b>%s</b><i>%s</i></div><div class="ld" style="%s">%s</div><div class="h3" style="%s">%s</div><div class="tg" style="%s">%s</div></div>' % (f, w, st, d['title'], d['title2'], st, d['lede'], st, d['h3'], st, d['tag']))
    h.append('</div><h2 style="margin-top:14px">%s · text</h2><div class="g">' % lg)
    for f, w in d['text']:
        st = "font-family:'%s';font-weight:%d" % (f, w)
        h.append('<div class="c"><small>%s %d</small><div class="bd" style="%s"><p>%s</p><p>%s</p></div></div>' % (f, w, st, d['body'], d['body']))
    h.append('</div></section>')
pathlib.Path(__file__).parent.parent.joinpath('site/type-lab.html').write_text('\n'.join(h))
print('written')
