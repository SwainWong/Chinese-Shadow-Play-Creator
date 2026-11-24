# Swain-Chinese-Shadow-Play-Creator

把口播、故事或动作参考做成可逐镜返修的中国彩皮影戏。角色、景片、动作和声音各自保存在可编辑文件中。插件附带七角八偶试摆台、悟空十五式和《山门一阵风》双景工程。

![民居、寺院、山丘与花草景片](skills/shadow-scenery/studio/review/plates.jpg)

## 在 Codex 安装

在此仓库根目录使用支持 `codex plugin` 的 Codex 安装检出的版本。

```sh
codex plugin marketplace add "$PWD"
codex plugin add swain-chinese-shadow-play-creator@swain-shadow-play
codex plugin list --marketplace swain-shadow-play --json
```

新对话中可直接说：**“用 $swain-chinese-shadow-play-creator，把这个故事做成十秒的有声皮影试演，保留能改动作的工程。”** 插件展示名为 **Swain-Chinese-Shadow-Play-Creator**，命令使用小写标识符。

## 七个 skill

| 调用 | 负责的内容 |
|---|---|
| [`$swain-chinese-shadow-play-creator`](skills/swain-chinese-shadow-play-creator/SKILL.md) | 总导演入口、输入与分镜、选择影箱、审片与交付 |
| [`$shadow-cast`](skills/shadow-cast/SKILL.md) | 角色定样、戏服、七角八偶、切片、身高与针眼 |
| [`$shadow-scenery`](skills/shadow-scenery/SKILL.md) | 房屋、寺庙、山丘、花草的透光、层序和风动 |
| [`$shadow-performance`](skills/shadow-performance/SKILL.md) | 悟空十五式、落足、腾云、换握、道具与关键帧 |
| [`$shadow-audit`](skills/shadow-audit/SKILL.md) | 定长、关节弯向、握点、遮挡、接地与成片检查 |
| [`$shadow-film`](skills/shadow-film/SKILL.md) | 口播字幕、带声 MP4、离线 HTML、单镜重渲与合片 |
| [`$shadow-mandarin-narration`](skills/shadow-mandarin-narration/SKILL.md) | 中文说书意群、句内轻停、句间留白、录音与字幕同步 |

## 从源码试一镜

在仓库根目录执行。Python 3.9+、带 libx264 的 FFmpeg 和 ffprobe 用于导出，Node.js 18+ 用于关节扫描。基础渲染可用 Playwright Chromium；专用角色与景片导出脚本使用本机 Google Chrome。预制的 HTML 可直接在浏览器打开。

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 -m playwright install chromium
python3 skills/shadow-film/scripts/render.py skills/shadow-film/examples/lantern.json --out build/lantern --size 640x360 --fps 12
node skills/shadow-audit/scripts/check-wukong.cjs
```

打开 `build/lantern/index.html` 或播放 `build/lantern/film.mp4`。这个三秒示例用程序声点试灯，不需要配音服务。正式对白可以提供自己的逐场录音；macOS 也可用系统朗读。专用影箱请先将对应的 `studio/` 整个复制到新作品目录，再修改其皮片或动作。更新插件后仍可使用已复制的工程。

## 素材与版本

随包发布项目制作的皮片、景片、舞台代码和示例合成音轨。工艺参照见[景片资料](skills/shadow-scenery/references/scenery.md)及[基础图集记录](skills/shadow-film/references/art.md)。历史演出的内部研究录像、第三方书籍与整套频道档案由原项目单独保管。黑风山四折已有工程可使用专用复核脚本。每项检查的适用角色和舞台写在对应 skill 内。
