# Record the main interaction of the components that have no counterpart in the reference video, for a
# library-wide interaction review. usage: capture_lib.py [outdir]      (docs server on 8823)
import sys, subprocess, pathlib
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '_review/lib')
out.mkdir(parents=True, exist_ok=True)
SEG = '<sk-segmented value="day"><button value="day">Day</button><button value="week">Week</button><button value="month">Month</button></sk-segmented>'
RADIO = '<sk-radio-group value="s"><sk-radio value="s">Small</sk-radio><sk-radio value="m">Medium</sk-radio><sk-radio value="l">Large</sk-radio></sk-radio-group>'
SELECT = '<sk-select value="b"><option value="a">Apple</option><option value="b">Banana</option><option value="c">Cherry</option></sk-select>'
DIALOG = '<sk-dialog title="Delete this project?" word="バーン!"><p>This cannot be undone.</p><sk-button slot="footer" variant="ghost">Cancel</sk-button><sk-button slot="footer" variant="pink">Delete</sk-button></sk-dialog>'
DRAWER = '<sk-drawer title="Settings"><sk-switch checked>Notifications</sk-switch></sk-drawer>'
MENU = '<sk-menu><sk-button slot="trigger" size="sm">Actions ▾</sk-button><sk-menu-item value="edit">Edit</sk-menu-item><sk-menu-item value="dup">Duplicate</sk-menu-item><sk-menu-item value="del" danger>Delete</sk-menu-item></sk-menu>'
TABS = '<sk-tabs value="a" style="width:300px"><sk-tab value="a" label="Overview">Every interaction is a key frame.</sk-tab><sk-tab value="b" label="Specs">Zero dependencies.</sk-tab><sk-tab value="c" label="Notes">Drawn on twos.</sk-tab></sk-tabs>'
ACC = '<sk-accordion single style="width:300px"><sk-accordion-item label="What is sakuga?" open>The shots a key animator draws by hand.</sk-accordion-item><sk-accordion-item label="Why web components?">They work in every framework.</sk-accordion-item></sk-accordion>'
STEPS = '<sk-steps current="1" style="width:300px"><sk-step label="Cart"></sk-step><sk-step label="Pay"></sk-step><sk-step label="Done"></sk-step></sk-steps>'
CLIPS = [
    # name, markup, action, ms, size, dsf
    ('like', '<sk-like count="128"></sk-like>', 'click:sk-like', 1600, 300, 3.6),
    ('segmented', SEG, 'click:sk-segmented button[value=month]', 1200, 360, 3),
    ('copy', '<sk-copy value="npm i sakuga-ui"></sk-copy>', 'click:sk-copy', 1700, 300, 3.6),
    ('hold_button', '<sk-hold-button>Hold to delete</sk-hold-button>', 'press:sk-hold-button:1250', 2700, 400, 2.7),
    ('hold_button_early', '<sk-hold-button>Hold to delete</sk-hold-button>', 'press:sk-hold-button:450', 1500, 400, 2.7),
    ('radio', RADIO, 'click:sk-radio[value=l]', 1400, 300, 3.6),
    ('theme_switch', '<sk-theme-switch size="lg"></sk-theme-switch>', 'click:sk-theme-switch', 1900, 360, 3),
    ('input_focus', '<sk-input label="Email" placeholder="you@example.com" style="width:220px"></sk-input>', 'click:sk-input', 900, 360, 3),
    ('input_reject', '<sk-input label="Password" type="password" value="1234" style="width:220px"></sk-input>', 'js:document.querySelector("sk-input").reject("Too short")', 1400, 360, 3),
    ('select', SELECT, 'js:(()=>{const s=document.querySelector("sk-select");s.show();setTimeout(()=>s.choose("c"),650)})()', 1900, 360, 3),
    ('stepper', '<sk-stepper value="3" min="0" max="9"></sk-stepper>', 'click:sk-stepper >> button >> nth=1', 1000, 300, 3.6),
    ('rating', '<sk-rating value="2"></sk-rating>', 'click:sk-rating >> button >> nth=3', 1500, 320, 3.375),
    ('otp_reject', '<sk-otp length="4"></sk-otp>', 'js:document.querySelector("sk-otp").reject()', 1300, 360, 3),
    ('alert_close', '<sk-alert variant="danger" title="Connection lost" closable style="width:300px">Could not reach the server.</sk-alert>', 'click:sk-alert >> .x', 1200, 420, 2.57),
    ('tag_remove', '<sk-tag variant="peri" removable>removable</sk-tag>', 'click:sk-tag >> button', 1200, 300, 3.6),
    ('dialog_open', DIALOG, 'js:document.querySelector("sk-dialog").show()', 1700, 540, 2),
    ('drawer_open', DRAWER, 'js:document.querySelector("sk-drawer").show()', 1500, 540, 2),
    ('menu', MENU, 'js:(()=>{const m=document.querySelector("sk-menu");m.open=true;setTimeout(()=>m.querySelectorAll("sk-menu-item")[1].click(),700)})()', 1900, 360, 3),
    ('tooltip', '<sk-tooltip content="Copy the share link"><sk-button size="sm">Hover me</sk-button></sk-tooltip>', 'js:document.querySelector("sk-tooltip").dispatchEvent(new PointerEvent("pointerenter"))', 900, 320, 3.375),
    ('tabs', TABS, 'js:document.querySelector("sk-tabs").pick(2, true)', 1300, 420, 2.57),
    ('accordion', ACC, 'click:sk-accordion-item >> nth=1 >> .head', 1300, 420, 2.57),
    ('pagination', '<sk-pagination page="2" total="9"></sk-pagination>', 'js:(()=>{const p=document.querySelector("sk-pagination");p.go(p.page+2)})()', 1300, 440, 2.45),
    ('steps', STEPS, 'js:document.querySelector("sk-steps").setAttribute("current","2")', 1500, 420, 2.57),
    ('ring', '<sk-ring value="80"></sk-ring>', 'js:document.querySelector("sk-ring").value=100', 1600, 300, 3.6),
    ('badge', '<sk-badge value="3"><sk-button icon aria-label="Notifications">🔔</sk-button></sk-badge>', 'js:document.querySelector("sk-badge").setAttribute("value","4")', 1200, 300, 3.6),
    ('counter', '<sk-counter value="1280" style="font-size:40px"></sk-counter>', 'js:document.querySelector("sk-counter").value=4096', 1500, 360, 3),
    ('bubble', '<sk-bubble variant="shout">IT SHIPPED?!</sk-bubble>', 'js:document.querySelector("sk-bubble").pop()', 1200, 360, 3),
    ('calendar', '<sk-calendar value="2026-11-15"></sk-calendar>', 'click:sk-calendar >> .d >> nth=20', 1300, 440, 2.45),
    ('kbd', 'Press <sk-kbd>K</sk-kbd>', 'js:(()=>{const k=document.querySelector("sk-kbd");k.press(true);setTimeout(()=>k.press(false),160)})()', 900, 300, 3.6),
    ('button_tap', '<sk-button variant="primary">Primary</sk-button>', 'press:sk-button:140', 900, 320, 3.375),
]
only = sys.argv[2:] if len(sys.argv) > 2 else None
for name, markup, action, ms, size, dsf in CLIPS:
    if only and name not in only: continue
    r = subprocess.run([sys.executable, '_tools/capture.py', str(out / (name + '.mp4')), markup, action, str(ms), '--size', str(size), '--dsf', str(dsf)], capture_output=True, text=True)
    print((r.stdout.strip() or r.stderr.strip()[-300:])[:170])
