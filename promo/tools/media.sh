#!/bin/sh
# README media from the finished film: poster, six looping GIFs and a web-sized MP4.
#   usage: tools/media.sh renders/final.mp4 OUTDIR
set -e
FF=/opt/homebrew/bin/ffmpeg
IN=$1; OUT=$2; mkdir -p "$OUT"
$FF -loglevel error -y -ss 0 -i "$IN" -frames:v 1 -vf scale=1600:-1 -q:v 3 "$OUT/poster.jpg"
gif() {   # name start duration
  $FF -loglevel error -y -ss "$2" -t "$3" -i "$IN" -vf "fps=20,scale=560:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" -loop 0 "$OUT/$1.gif"
}
gif press 4.5 4.6
gif lettering 14.45 4.5
gif icons 19.5 3.9
gif loaders 25.6 4.2
gif palettes 30.9 5.8
gif overlays 37.2 4.0
$FF -loglevel error -y -i "$IN" -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$OUT/promo.mp4"
ls -la "$OUT"
