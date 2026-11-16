# 宣传片《第 1 话：一按，即原画》

成片在 [`../docs/media/promo.mp4`](../docs/media/promo.mp4)（1920×1080，60 fps，52.8 秒，有声）。

片子里的每个组件都是 `../src` 里的真组件，每次点击都是 Playwright 发出的真实鼠标事件。页面跑在虚拟时钟上，每帧前进 1/60 秒，计时器、`requestAnimationFrame`、Web Animations 和 CSS 动画都跟着它走。组件发出的声音也是录下来的：渲染时用一个 `OfflineAudioContext` 替换浏览器的 `AudioContext`，让它的时钟等于影片时钟，所以每个声音都落在组件发声的那个采样上。配乐是 `tools/score.py` 用代码合成的。

| 文件 | 内容 |
|---|---|
| `DIRECTION.md` | 方向、专属手法、画面规范、逐秒镜头表 |
| `plan.json` | 镜头时间、每个动作的时间、功能主张和出处、音效 cue |
| `film/` | 影片页面：`film.js` 是导演脚本，按影片时间排好每一次点击和镜头运动 |
| `tools/render.py` | 逐帧渲染画面，同时录下组件的声音 |
| `tools/score.py` | 配乐，150 BPM，A 大调，33 小节 |
| `tools/cues.py` / `gains.py` | 把组件声音切成每个动作一段，按实测起音点对齐，按配乐电平定增益 |
| `tools/media.sh` | README 用的封面、动图和网页版 MP4 |

## 重新生成

需要 Python 3（playwright、numpy、scipy、soundfile、Pillow）和带 libx264 的 ffmpeg。混音和交付检查用的是 guizang-product-video skill 的 `mix_audio.py` 与 `check_delivery.py`。

```bash
python3 tools/serve.py 8830 &                                   # 根目录是仓库，影片页面在 /promo/film/
python3 tools/render.py --stills 1.8,22.6                       # 先出几张静帧看看
python3 tools/render.py --out renders/picture.mp4 --sfx assets/sfx-product.wav   # 全片，约 6 分钟
sh tools/finish.sh                                              # 配乐、按实测起音切音效、混音（两遍）、合成、交付检查
sh tools/media.sh renders/final.mp4 ../docs/media
```

`renders/`、`assets/` 下的音频和 `evidence/stills/` 不进仓库，都可以用上面的命令重新生成。
