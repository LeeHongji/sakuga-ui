#!/bin/zsh
# Record the six components that also appear in the reference video, for side-by-side review.
# usage: _tools/capture_all.sh [outdir]      (docs server must be running on 8823)
# Each clip has 12 untouched frames before the input (frame 12).
cd "$(dirname "$0")/.."
out=${1:-_review/captures}
mkdir -p $out
c() { python3 _tools/capture.py "$@" || echo "FAILED: $1"; }
PROG='js:(()=>{const p=document.querySelector("sk-progress"),t0=performance.now();const f=()=>{const s=(performance.now()-t0)/1000;const v=s<0.5?70+2*s/0.5:72+28*Math.pow(Math.min(1,(s-0.5)/1.4),2);p.value=Math.min(100,v);if(v<100)requestAnimationFrame(f)};f()})()'
c $out/toggle_on.mp4    '<sk-switch size="lg"></sk-switch>' 'click:sk-switch' 2200 --size 320 --dsf 3.375
c $out/toggle_off.mp4   '<sk-switch size="lg" checked></sk-switch>' 'click:sk-switch' 1500 --size 320 --dsf 3.375
c $out/toggle_md_on.mp4 '<sk-switch></sk-switch>' 'click:sk-switch' 1800 --size 200 --dsf 5.4
c $out/toggle_flip.mp4  '<sk-switch size="lg"></sk-switch>' 'seq:sk-switch:300' 2200 --size 320 --dsf 3.375
c $out/button.mp4       '<sk-button fx="boom">Confirm</sk-button>' 'click:sk-button' 2800 --size 360 --dsf 3
c $out/button_success.mp4 '<sk-button fx="boom">Confirm</sk-button>' 'click:sk-button' 3000 --size 360 --dsf 3 --pre 'document.querySelector("sk-button").addEventListener("click",e=>{const b=e.currentTarget;setTimeout(()=>b.done(0),850)})'
c $out/button_press.mp4 '<sk-button fx="boom">Confirm</sk-button>' 'press:sk-button:200' 1600 --size 360 --dsf 3
c $out/checkbox_on.mp4  '<sk-checkbox>Remember me</sk-checkbox>' 'click:sk-checkbox >> button' 1900 --size 360 --dsf 3
c $out/checkbox_press.mp4 '<sk-checkbox>Remember me</sk-checkbox>' 'press:sk-checkbox >> button:150' 1900 --size 360 --dsf 3
c $out/checkbox_off.mp4 '<sk-checkbox checked>Remember me</sk-checkbox>' 'click:sk-checkbox >> button' 1400 --size 360 --dsf 3
c $out/slider.mp4       '<sk-slider value="30" style="width:210px"></sk-slider>' 'drag:sk-slider >> .s:0.3:0.89:520:400' 2600 --size 400 --dsf 2.7
c $out/slider_back.mp4  '<sk-slider value="89" style="width:210px"></sk-slider>' 'drag:sk-slider >> .s:0.89:0.15:700:300' 2400 --size 400 --dsf 2.7
c $out/progress.mp4     '<sk-progress value="70" ground style="width:300px"></sk-progress>' "$PROG" 4200 --size 450 --dsf 2.4
c $out/toast.mp4        '<span></span>' 'js:(()=>{const t=document.createElement("sk-toast");t.setAttribute("from","left");t.setAttribute("duration","0");t.textContent="Saved successfully!";const m=document.getElementById("mount");m.innerHTML="";m.appendChild(t)})()' 2600 --size 480 --dsf 2.25
c $out/toast_default.mp4 '<span></span>' 'js:S.toast("Saved successfully!")' 2600 --size 540
ls -la $out
