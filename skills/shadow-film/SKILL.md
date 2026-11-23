---
name: shadow-film
description: 把皮影分镜、口播与音轨渲染成可编辑 HTML 和 MP4，按镜头缓存、返修并组装长片。
---

# 口播渲染与局部合片

按[分镜格式](references/story.md)写 story.json。已有录音按真实句界对齐，系统 TTS 标作念白试音。纯表演使用 duration。明确动作、发言者和搭档的反应。内置六格偶适合普通对白草排，独立腕、执物和靴形使用专用影箱。

从本 skill 目录运行 `python3 scripts/render.py examples/lantern.json --out /path/to/new-shot --size 640x360 --fps 12`。改为自己的 story.json 和新输出目录即可另开一镜。自定义舞台用 `--stage-js`。交付时核对字幕、音轨、帧数、离线预演与源文件。[素材记录](references/art.md)

长戏将每镜登记到 film.json，按[按镜头修改与合成](references/partial-edits.md)运行 `python3 scripts/assemble.py film.json --out /path/to/new-cut`。看 build.json 确认只重算被修改的镜头并复用其余镜头。
