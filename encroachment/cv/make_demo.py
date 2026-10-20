#!/usr/bin/env python3
"""
Generates a SYNTHETIC aerial image pair (2022 vs 2026) for testing the pipeline
when real imagery is not available. Imagery is fake; pipeline results on it are real.
Replace with real Tilak Bridge / railway-section imagery for actual use.

Usage: make_demo.py <out_dir>
"""
import json
import os
import sys

import cv2
import numpy as np

W, H = 1100, 800
BOUNDS = {"west": 77.2360, "east": 77.2412, "north": 28.6300, "south": 28.6258}  # illustrative, Tilak Bridge area
TRACK_PX = [(0, 440), (250, 420), (520, 385), (800, 350), (1100, 335)]


def noise_layer(rng, h, w, scales=(8, 24, 80)):
    out = np.zeros((h, w), np.float32)
    for i, s in enumerate(scales):
        small = rng.normal(0, 1, (h // s + 2, w // s + 2)).astype(np.float32)
        out += cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC) / (i + 1)
    return out


def building(img, x, y, w, h, roof, ang=0.0):
    rect = ((x + w / 2, y + h / 2), (w, h), ang)
    box = cv2.boxPoints(rect).astype(np.int32)
    shadow = box + np.array([7, 6])
    cv2.fillPoly(img, [shadow], (55, 58, 60))
    cv2.fillPoly(img, [box], roof)
    cv2.polylines(img, [box], True, tuple(int(c * 0.55) for c in roof), 2, cv2.LINE_AA)
    mid1 = ((box[0] + box[1]) / 2).astype(int)
    mid2 = ((box[2] + box[3]) / 2).astype(int)
    cv2.line(img, tuple(mid1), tuple(mid2), tuple(int(c * 0.75) for c in roof), 1, cv2.LINE_AA)


def scene(changed):
    rng = np.random.default_rng(7)
    base = np.zeros((H, W, 3), np.float32)
    n = noise_layer(rng, H, W)
    base[..., 0] = 95 + 7 * n      # B
    base[..., 1] = 120 + 8 * n     # G
    base[..., 2] = 135 + 8 * n     # R  (dusty brown-grey ground)
    img = np.clip(base, 0, 255).astype(np.uint8)

    # vegetation patches (trees / scrub)
    vr = np.random.default_rng(3)
    for _ in range(38):
        cx, cy, r = int(vr.integers(0, W)), int(vr.integers(0, H)), int(vr.integers(14, 42))
        if abs(cy - np.interp(cx, [p[0] for p in TRACK_PX], [p[1] for p in TRACK_PX])) < 28:
            continue
        col = (int(vr.integers(40, 70)), int(vr.integers(110, 150)), int(vr.integers(50, 80)))
        cv2.circle(img, (cx, cy), r, col, -1, cv2.LINE_AA)
        cv2.circle(img, (cx - 3, cy - 3), r // 2, tuple(int(c * 1.15) for c in col), -1, cv2.LINE_AA)

    # road
    cv2.polylines(img, [np.array([(0, 640), (400, 610), (800, 640), (1100, 600)], np.int32)], False,
                  (110, 112, 115), 22, cv2.LINE_AA)
    cv2.polylines(img, [np.array([(0, 640), (400, 610), (800, 640), (1100, 600)], np.int32)], False,
                  (160, 160, 160), 1, cv2.LINE_AA)

    # railway: ballast, rails, sleepers
    tp = np.array(TRACK_PX, np.int32)
    cv2.polylines(img, [tp], False, (120, 125, 130), 16, cv2.LINE_AA)
    xs = np.arange(0, W, 9)
    ys = np.interp(xs, tp[:, 0], tp[:, 1])
    for x, y in zip(xs, ys):
        cv2.line(img, (int(x), int(y) - 8), (int(x), int(y) + 8), (70, 78, 90), 2)
    for off in (-4, 4):
        cv2.polylines(img, [(tp + np.array([0, off])).astype(np.int32)], False, (190, 195, 200), 1, cv2.LINE_AA)

    roofs = [(70, 80, 160), (150, 150, 155), (90, 110, 185), (170, 170, 175), (80, 95, 130), (130, 140, 200)]
    existing = [  # x, y, w, h
        (80, 150, 60, 36), (230, 90, 48, 30), (420, 180, 70, 40), (640, 120, 52, 34), (860, 200, 66, 38),
        (960, 90, 44, 30), (150, 520, 58, 34), (330, 690, 64, 36), (560, 540, 50, 32), (760, 700, 60, 34),
        (920, 520, 68, 40), (60, 330, 46, 30),
        (470, 300, 54, 30),     # legacy building ~25 m from track (exists in both)
    ]
    for i, (x, y, w, h) in enumerate(existing):
        building(img, x, y, w, h, roofs[i % len(roofs)])

    if changed:
        building(img, 330, 395, 62, 32, (95, 105, 175))               # A: new, almost on track  -> critical
        building(img, 700, 395, 58, 34, (150, 150, 158))              # B: new, ~15-20 m below track -> high
        building(img, 190, 300, 56, 36, (85, 110, 190), 3)            # C: new, ~45 m above -> medium
        building(img, 880, 610, 70, 40, (175, 175, 180))              # D: new, far -> low
        building(img, 524, 300, 46, 30, (90, 100, 140))               # E: expansion annex next to legacy building
        # vegetation encroaching on the track side
        for cx, cy, r in [(600, 372, 16), (630, 366, 14), (655, 362, 13), (585, 377, 12)]:
            cv2.circle(img, (cx, cy), r, (45, 135, 60), -1, cv2.LINE_AA)
    return img


def make_pair(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    before = scene(False)
    after = scene(True)

    # different sensor / date: shift + rotate + scale, exposure, slight haze, noise
    M = cv2.getRotationMatrix2D((W / 2, H / 2), 1.1, 1.012)
    M[:, 2] += (9, -6)
    after = cv2.warpAffine(after, M, (W, H), borderMode=cv2.BORDER_REFLECT)
    a = after.astype(np.float32)
    a = 255 * (a / 255) ** 1.12 * 0.93 + 10                         # exposure / season tone
    a = cv2.GaussianBlur(a, (0, 0), 0.7)
    a += np.random.default_rng(11).normal(0, 2.0, a.shape)
    after = np.clip(a, 0, 255).astype(np.uint8)
    b = cv2.GaussianBlur(before, (0, 0), 0.4)

    cv2.imwrite(os.path.join(out_dir, "demo_before_2022.png"), b)
    cv2.imwrite(os.path.join(out_dir, "demo_after_2026.png"), after)

    def px_to_ll(x, y):
        return [BOUNDS["west"] + x / W * (BOUNDS["east"] - BOUNDS["west"]),
                BOUNDS["north"] - y / H * (BOUNDS["north"] - BOUNDS["south"])]

    meta = {
        "note": "SYNTHETIC demo imagery. Coordinates illustrative (Tilak Bridge area).",
        "before": {"file": "demo_before_2022.png", "date": "2022-03-15", "source": "Synthetic demo (stand-in for Google Earth historical)",
                   "bounds": BOUNDS},
        "after": {"file": "demo_after_2026.png", "date": "2026-02-10", "source": "Synthetic demo (stand-in for Google Earth recent)",
                  "bounds": BOUNDS},
        "corridor": {"track": [px_to_ll(x, y) for x, y in TRACK_PX], "buffer_m": 30},
        "hardcoded_boundary_example": [px_to_ll(x, y) for x, y in
                                       [(0, 400), (300, 380), (520, 345), (800, 310), (1100, 295),
                                        (1100, 375), (800, 390), (520, 425), (250, 460), (0, 480)]],
    }
    with open(os.path.join(out_dir, "demo_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print("wrote demo pair to", out_dir)


if __name__ == "__main__":
    make_pair(sys.argv[1] if len(sys.argv) > 1 else "demo")
