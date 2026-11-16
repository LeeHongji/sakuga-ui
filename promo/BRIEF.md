# 视频 brief

- 产品：Sakuga UI，原生 Web Components 组件库（本仓库），作画风动效 + 片假名拟声词 + 合成音效。
- 用户要求（2026-11-16）："利用现在的动效库……充分发挥你的动效视频制作能力，发挥想象，突出这个项目的特点，给这个 ui 动效库制作一个 ui 动效宣传视频"。
- 范围：全量产品，当前 v0.1.0；平台面只有 Web（浏览器里的组件）。`plan.scope = {"versions":"v0.1.0","platforms":["web"]}`。
- 风格：repo。用户要求"突出这个项目的特点"，文档站本身就是一本漫画杂志，直接沿用。
- 画幅 / 时长 / 语言：横版 1920×1080，60 fps，52.8 秒；中文为主、英文标题并列，组件里的片假名拟声词保持原样。
- 链接 / CTA：片尾给 GitHub 仓库 github.com/LeeHongji/sakuga-ui（用户要求建公开仓库）。npm 尚未发布，片中安装命令用 `npm i github:LeeHongji/sakuga-ui`，不写 `npm i sakuga-ui`。
- 声音：配乐为代码原创（tools/score.py）。音效全部来自组件库自己的合成音色：渲染时用离线 AudioContext 替换浏览器的 AudioContext，组件在哪一帧发声，声音就写进哪一个采样位置。
- 运行方式：不使用 skill 起步工程（React + GSAP 会冻结 CSS 动画，而这支片子的主角恰恰是组件自己的 CSS / WAAPI 动画）。改用 sakuga-ui 已有的虚拟时钟录制法：页面时间每帧前进 1/60 秒，真实鼠标事件由 Playwright 发出。
