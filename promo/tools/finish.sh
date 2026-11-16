#!/bin/sh
# After render.py: cut cues at the measured onsets, mix (twice: gains need the ducked music), mux, check.
#   usage: tools/finish.sh      (SKILL points at the guizang-product-video-skill scripts folder)
set -e
PY=${PY:-python3}; SKILL=${SKILL:-$HOME/.claude/skills/guizang-product-video-skill/scripts}
FF=${FF:-ffmpeg}
$PY tools/score.py assets/music.wav
$PY tools/cues.py assets/sfx-product.wav --snap > evidence/cues.txt
$PY "$SKILL/mix_audio.py" plan.json && $PY tools/gains.py > /dev/null && $PY "$SKILL/mix_audio.py" plan.json
$FF -loglevel error -y -i renders/picture.mp4 -i assets/master.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart renders/final.mp4
$PY "$SKILL/check_delivery.py" plan.json --video renders/final.mp4 --mix-report evidence/audio-mix.json > evidence/delivery.json || true
$PY -c "import json; r=json.load(open('evidence/delivery.json')); print('delivery ok:', r['ok'], r['errors'])"
