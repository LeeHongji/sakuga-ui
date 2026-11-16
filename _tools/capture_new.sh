#!/bin/sh
# Record the icon set, the loaders and the palettes for review. usage: capture_new.sh OUTDIR   (docs server on 8823)
set -e
cd "$(dirname "$0")/.."
OUT=${1:-_review/new}
mkdir -p "$OUT"
python3 _tools/icons_sheet.py "$OUT/icons_sheet.png"
python3 _tools/icons_sheet.py "$OUT/icons_sheet_dark.png" dark
PRE='document.getElementById("mount").style.cssText="position:fixed;inset:0;display:flex;flex-wrap:wrap;align-content:center;align-items:center;justify-content:center;gap:28px 24px"'
PLAY='js:document.querySelectorAll("sk-icon").forEach(i=>i.play())'
mk() { for n in $1; do printf '<sk-icon name="%s" size="88"></sk-icon>' "$n"; done; }
python3 _tools/capture.py "$OUT/icons_a.mp4" "$(mk 'bell heart star check x plus search gear')" "$PLAY" 1500 --size 540 --dsf 2 --pre "$PRE"
python3 _tools/capture.py "$OUT/icons_b.mp4" "$(mk 'trash download send mail home user lock eye')" "$PLAY" 1500 --size 540 --dsf 2 --pre "$PRE"
python3 _tools/capture.py "$OUT/icons_c.mp4" "$(mk 'bolt bookmark chat pencil play arrow copy flame')" "$PLAY" 1500 --size 540 --dsf 2 --pre "$PRE"
python3 _tools/capture.py "$OUT/icon_in_button_hover.mp4" '<sk-button><sk-icon name="download"></sk-icon>Download</sk-button>' 'click:sk-button' 1500 --size 360 --dsf 3
for v in ball flip wave pencil; do
  python3 _tools/capture.py "$OUT/loader_$v.mp4" "<sk-loader variant=\"$v\" style=\"font-size:26px\" tips=\"Roughing in|Cleaning up\"></sk-loader>" 'js:void 0' 2600 --size 400 --dsf 2.7 --lead 0
  python3 _tools/capture.py "$OUT/loader_${v}_poke.mp4" "<sk-loader variant=\"$v\" style=\"font-size:26px\"></sk-loader>" 'seq:sk-loader:260' 1600 --size 400 --dsf 2.7
done
python3 _tools/palshots.py "$OUT/pal" cover forms feedback
ls "$OUT" "$OUT/pal" | wc -l
