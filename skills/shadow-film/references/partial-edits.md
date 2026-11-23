# 按镜头修改与组装长片

保留每一镜的可编辑工程，使用镜头自己的时间编排 JS、Canvas 动作和声音。需要严格限制改动区间时，在目标动作两端保留原姿势关键帧。一个可独立返修的镜头对应总表的一项。相邻镜头之间的转场需要动画时，也可以把转场设为单独的一项。

例如在 Episode 的 production 目录创建 `film.json`：

```json
{
  "title": "黑风山",
  "size": "1920x1080",
  "fps": 24,
  "shots": [
    {"id":"s01","source":"s01/story.json"},
    {"id":"s02","source":"s02/黑熊精出洞-动作工程.html"},
    {"id":"s03","source":"s03/story.json","stage":"s03/stage.js"}
  ]
}
```

`source` 和可选的 `stage` 路径相对总表。支持本工坊的 story.json 和本工坊导出的自包含黑熊精动作编辑器 HTML v1。素材相对各自的 story.json。若使用镜头专属 JavaScript，将文件填在该镜头的 stage。已保存的 HTML 编辑工程包含其自身的动作、图片与音轨，可以直接填写。

从 skill 目录运行：

```sh
python3 scripts/assemble.py /path/to/production/film.json --out /path/to/deliverables/cut-01
```

返修一镜后，更新该镜的工程，或让总表指向新保存的工程副本。再次运行同一命令，输出填写一个新的目录，如 cut-02。默认缓存位于总表旁的 `.shadow-cache/`，也可以用 `--cache` 指定当前 Episode 的 work 目录并在各版本复用。

导出的 `film.mp4` 是整条片；`build.json` 按顺序列出每镜的起始帧、帧数、源工程、缓存键、画面及原声摘要，以及本次是重画还是复用。合成器核对缓存内容，逐镜头复制 H.264 视频流，拼接各镜的原始 PCM 声音并统一编码一次 AAC。目标镜头变长或变短，后续镜头的绝对时间随之平移。共享舞台代码、共用素材或输出规格变化，会影响使用它们的镜头。单镜 HTML 内的“导出 MP4”用于导出该镜自身，长片组装使用总表。
