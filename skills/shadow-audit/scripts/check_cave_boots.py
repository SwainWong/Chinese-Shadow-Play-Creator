"""Read both boots on every frame of 黑风山四折 / 洞前斗法; write JSON to stdout."""

import argparse
import json
import math
import sys
from pathlib import Path


# The scene uses the puppet's pre-rotation pose to draw its final, rigidly tilted image.
# Reading that pose preserves signed angles and avoids treating camera tilt as ankle bend.
READ_SCENE = """() => {
    const shot = playbook[2];
    if (frameRate !== 24 || shot?.title !== '洞前斗法' || shot.seconds !== 26) {
        throw Error('Expected the 26-second, 24 fps third scene 洞前斗法.');
    }
    const original = window.drawMonkey;
    let poses = [];
    window.drawMonkey = (ctx, x, direction, ...args) => {
        if (ctx !== null || direction !== 1) throw Error('Unsupported puppet view.');
        const pose = original(ctx, x, direction, ...args);
        poses.push(pose);
        return pose;
    };
    const rows = [];
    const sides = ['front', 'rear'];
    const point = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
    try {
        for (let frame = 0; frame < shot.seconds * frameRate; frame++) {
            poses = [];
            const scene = scenes[3](null, frame / frameRate);
            if (poses.length !== 1) throw Error('Expected one Wukong pose at frame ' + frame);
            const pose = poses[0];
            const angles = {};
            for (const side of sides) {
                const sole = pose[side + 'Sole'], knee = pose[side + 'Knee'], ankle = pose[side + 'Ankle'];
                if (sole?.length !== 7 || !sole.every(point) || !point(knee) || !point(ankle)) {
                    throw Error('Unrecognized boot landmarks at frame ' + frame);
                }
                const sx = knee[0] - ankle[0], sy = knee[1] - ankle[1];
                const fx = sole[3][0] - sole[1][0], fy = sole[3][1] - sole[1][1];
                if (Math.min(Math.hypot(sx, sy), Math.hypot(fx, fy)) < 1 ||
                    (frame === 0 && (fx <= 0 || Math.abs(fy) > fx * .1))) {
                    throw Error('Invalid shin or forward sole reference at frame ' + frame);
                }
                angles[side] = Math.atan2(sx * fy - sy * fx, sx * fx + sy * fy) * 180 / Math.PI;
            }
            const bottoms = sides.map(side => scene.flight[side + 'Bottom']);
            const cloud = scene.cloud.visibility;
            if (!bottoms.every(point) || !Number.isFinite(cloud) || cloud < 0 || cloud > 1) {
                throw Error('Unrecognized flight landmarks at frame ' + frame);
            }
            const lowest = Math.max(...bottoms.map(p => p[1]));
            if (frame === 0 && Math.abs(lowest - 580) > .6) throw Error('Stage ground has changed.');
            rows.push({angles, airborne: lowest < 579.4, cloud: cloud > 0});
        }
    } finally {
        window.drawMonkey = original;
    }
    return rows;
}"""


def cloud_flight(rows):
    """Locate the airborne run around the visible cloud using both final sole positions."""
    visible = [i for i, row in enumerate(rows) if row["cloud"]]
    if not visible:
        raise ValueError("No visible cloud in 洞前斗法.")
    first, last = visible[0], visible[-1]
    if any(not row["airborne"] or not row["cloud"] for row in rows[first:last + 1]):
        raise ValueError("Expected one continuous airborne cloud cue.")
    while first > 0 and rows[first - 1]["airborne"]:
        first -= 1
    while last + 1 < len(rows) and rows[last + 1]["airborne"]:
        last += 1
    if first == 0 or last == len(rows) - 1:
        raise ValueError("Could not find takeoff and landing around the cloud.")
    return first, last


def summarize(rows, start, end):
    wrong = {"front": [], "rear": []}
    minimum = {"degrees": math.inf}
    for frame in range(start, end + 1):
        for side, degrees in rows[frame]["angles"].items():
            if degrees <= 0:
                wrong[side].append(frame)
            if degrees < minimum["degrees"]:
                minimum = {"side": side, "frame": frame, "degrees": degrees}
    return {
        "first_frame": start, "last_frame": end, "frames": end - start + 1,
        "single_boot_samples": 2 * (end - start + 1),
        "inverted": sum(map(len, wrong.values())),
        "inverted_frames_by_side": wrong, "minimum": minimum,
    }


def check(project):
    from playwright.sync_api import sync_playwright

    root = project.expanduser().resolve(strict=True)
    for name in ("index.html", "monkey.js", "scene3.js"):
        if not (root / name).is_file():
            raise ValueError(f"Missing {name} in {root}")
    with sync_playwright() as api:
        browser = api.chromium.launch(channel="chrome", args=["--allow-file-access-from-files"])
        page = browser.new_page()
        page.goto((root / "index.html").as_uri())
        page.locator('nav button[value="3"]').wait_for(timeout=15000)
        rows = page.evaluate(READ_SCENE)
    start, end = cloud_flight(rows)
    full = summarize(rows, 0, len(rows) - 1)
    return {
        "project": str(root), "scene": "三 · 洞前斗法", "fps": 24,
        "frame_origin": "zero-based scene-local stage frames, both endpoints inclusive",
        "method": "Signed angle in degrees from ankle-to-knee to sole point 1→3 on the right-facing Wukong rig. Inverted if <= 0.",
        "whole_scene": full, "cloud_flight": summarize(rows, start, end),
        "last_support_frame": start - 1, "first_landing_frame": end + 1,
        "status": "inverted" if full["inverted"] else "pass",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path, help="Four-scene project containing index.html, monkey.js and scene3.js.")
    args = parser.parse_args()
    try:
        report = check(args.project)
    except Exception as error:
        print(json.dumps({"status": "error", "reason": str(error)}, ensure_ascii=False))
        return 2
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 1 if report["status"] == "inverted" else 0


if __name__ == "__main__":
    sys.exit(main())
