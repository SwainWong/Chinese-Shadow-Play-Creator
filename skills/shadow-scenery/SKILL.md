---
name: shadow-scenery
description: 制作可分层的皮影房屋、寺门、远近山丘与花草，验证透光、尺度、挂点和受风动作。
---

# 皮影舞台景片

先指定主角经过的位置和灯幕空处。建筑定地脚，门洞留透明；远近山分别定天际线；牡丹根固定，花枝从实皮分叉处摆。将演员与景片放在同一灯幕检视尺度、脸与棍梢净空。[景片规范](references/scenery.md)

[十秒同台工程](studio/index.html)可开关图层。[六张景片图版](studio/review/plates.jpg)对应 studio/art 中的独立 WebP。复制整个 studio，编辑 production/scene.js 的位置与时序，production/stage.js 的裁线与挂点。在副本运行 `python3 production/render.py temple` 修改寺门一镜，`python3 production/check.py` 复核两镜和输出影片。新戏改了表演条件时，为该戏重新设定检查范围。
