---
name: shadow-audit
description: 复核影偶反关节、针距、靴踝、颈腕搭接、遮挡、握位与接地，记录实际成片帧例。
---

# 皮影关节与成片审查

先看干净 MP4，再定位到具体角色、侧别、镜内帧和皮片。按[检查方法](references/review.md)分别记录数值和可见问题。重要动作返修依项目约定可由 3–5 位子 Agent 分看参考造型、关节与接触、实际成片。交付同镜位修订对照与尚难读的动作。

从本 skill 根目录运行 `node scripts/check-wukong.cjs` 扫描随包十五式；传入工程路径可查同型副本。旧版黑风山四折持有者可另运行 `python3 scripts/check_cave_boots.py /path/to/black-wind-four-04`。两种工程的坐标和检查对象不同。检查后在实际文件中看相邻帧、原速节奏、实际透明像素与声音。
