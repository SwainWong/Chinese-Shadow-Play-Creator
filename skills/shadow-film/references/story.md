# 编排一出戏

```json
{
  "title": "山门问路",
  "voice": "Tingting",
  "rate": 174,
  "scenes": [
    {
      "line": "请问，过了山门，往哪里走？",
      "set": "temple",
      "light": "amber",
      "speaker": "monkey",
      "actors": [
        {"role": "monkey", "x": 0.38, "face": "right", "move": "bow"},
        {"role": "elder", "x": 0.67, "face": "left", "move": "listen", "prop": "fan"}
      ],
      "sounds": [{"kind": "wood", "at": 0.05}]
    }
  ]
}
```

| 字段 | 编排方式 |
|---|---|
| `title`, `scenes` | 片名与按顺序表演的场次。每场填 `actors`，空数组可用作空镜。念白场填 `line`，纯动作场填秒数 `duration`，仅动作场省略 `line`、`audio` 和 `speaker`。 |
| `line`, `voice`, `audio` | 每场整句口播；顶层音色和语速可调，场内 `voice` 可覆盖。已有配音则在该场填写相对分镜的录音路径 `audio`，可用 WAV、AIFF、M4A 等 FFmpeg 可解码格式。若只有一整段录音，可用一个场次或按听得见的句界切成文件。时长随录音，加少量起落余量。句内字幕按字数估时，精确逐词对齐需另行校时。 |
| `set`, `light` | `temple` 山门、`pass` 山口、`hall` 内堂、`plain` 素幕，或自备布景 ID。灯色为 `amber`、`dusk`、`jade`。 |
| `role`, `speaker` | 悟空 `monkey`、老僧 `elder`、唐僧 `pilgrim`、熊怪 `bear`，或自备角色 ID。场内 `speaker` 用一个在场角色 ID 绑定其头部与口播音量，旁白可省略。 |
| `x`, `to`, `ground`, `scale` | `x` 为横向脚点比例，左零右一，可略微越界；`to` 为本场终点。脚线默认 575（舞台 1280 × 720），比例默认 0.93。 |
| `face`, `move`, `prop` | 朝向 `left/right`。动作 `walk/speak/listen/bow/lift/offer` 分别为走步、说话、倾听、行礼、提举、伸手。手持物可取 `lantern`、`fan` 或图像 ID。折扇可用角色字段 `"unfold":true` 让扇骨在本场从合到开。 |
| `pass` | 可选 `{"from":"elder","to":"monkey","prop":"lantern","x":0.512,"y":320}`。交接者需面对面、臂长可及，手向同一个舞台坐标聚拢，中点换手。下一场需给接物者设置 `prop`。超过容差会得到场号及间隙，缩短间距或移动目标后另试。 |
| `camera` | 可选 `{"x":0.5,"y":0.44,"zoom":1.32,"endZoom":1.16}`。以比例坐标取景，推拉范围 1–2；字幕与画框在镜头之外绘制。 |
| `sounds` | 可选本地合成发声。每项提供 `kind` 和发生时点占本场的比例 `at`（含零、小于一）。`wood` 木击，`gong` 锣音，`pluck` 拨弦。按动作安排。 |

## 加入新的人物或场景

顶层 `images` 把 ID 映射到分镜旁的本地 PNG、WebP 或自包含 SVG。背景用 16:9 图像，手持图按 46 × 50 舞台单位绘制，握点约在其宽度中心、高度的八成处。布景与手持物的 ID 分别填入 `set` 和 `prop`。自备布景会铺满舞台，做透明景片时会透出灯幕。

基础对白渲染器使用六格图集。已定样的西游角色和需要独立腕、靴、持物手的身段戏，从[影箱入口](../../shadow-cast/SKILL.md)选择角色工程。基础图集用朝右的透明 1536 × 1024 图集，每格 512 × 512。上排依次为头颈、躯干、上臂，下排为连手前臂、大腿、小腿连脚。关节附近保留完整搭接的皮片。把图集加入 `images`，把人物轴点加入同名顶层 `rigs` 条目。格式照 [四套实际轴点](../assets/rigs.json)，坐标相对单个格子。前臂握点相对肘轴约为图格内的 (+20, +344)。左右朝向由绘制时镜像实现。复杂的新角色可先导出待机、抬臂或行礼的短排练确认接缝。

导出包含 `film.mp4`、`captions.srt`、`sound.wav`、`index.html`、`stage.js`、`timeline.js`、`story.json` 及使用到的图集和导入配音。音频是时间基准，浏览器播放和逐帧导出共用相同的绘制函数。顶层 `voice` 和 `rate` 用于 TTS，原录音保留在 assets 并随工程复制。

动作短试可省略台词，使用场次字段 `"duration":10`（秒）与 `sounds`。此模式按明确帧数生成，可用独立的项目舞台脚本接收分镜的表演参数。
