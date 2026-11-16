#!/bin/zsh
# Screenshot set for a site design review. usage: _tools/site_shots.sh OUTDIR
cd "$(dirname "$0")/.."
S=${1:-_review/site2}
mkdir -p $S
s() { python3 _tools/snapv.py "$@" > /dev/null 2>&1 || echo "FAILED $1"; }
for l in zh en ja; do
  for th in light dark; do s $S/${l}_forms_phone_$th.png 390 844 $l 'scroll:#forms' $th; done
  s $S/${l}_cover.png 1440 900 $l view
  s $S/${l}_vocab.png 1440 900 $l 'scroll:#vocab'
  s $S/${l}_forms.png 1440 900 $l 'scroll:#forms'
done
for x in start actions feedback theming; do
  s $S/zh_$x.png 1440 900 zh "scroll:#$x"
  s $S/zh_${x}_dark.png 1440 900 zh "scroll:#$x" dark
done
s $S/en_actions_1181.png 1181 900 en 'scroll:#actions'
s $S/en_actions_1179.png 1179 900 en 'scroll:#actions'
s $S/ja_forms_861.png 861 900 ja 'scroll:#forms'
s $S/ja_forms_859.png 859 900 ja 'scroll:#forms'
s $S/zh_theming_phone.png 390 844 zh 'scroll:#theming'
s $S/ja_start_phone.png 390 844 ja 'scroll:#start'
s $S/zh_cover_dark.png 1440 900 zh view dark
ls $S | wc -l
