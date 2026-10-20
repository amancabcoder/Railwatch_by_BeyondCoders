#!/usr/bin/env python3
"""
RailWatch change-detection pipeline.

Input : a JSON config (see README) describing two dated images + railway corridor.
Output: <out_dir>/result.json + annotated images + per-candidate evidence crops.

Steps
  1. validate both images cover the same area (feature matching + homography overlap)
  2. align "after" onto "before" (SIFT + RANSAC homography), match colours
  3. change detection (LAB difference, robust threshold, morphology)
  4. candidate building filter (area, shape, edges, vegetation, track strip)
  5. corridor analysis (verified boundary if given, else approximate buffer around track)
  6. vegetation growth inside the corridor (ExG index)
  7. save annotated results

Exit code 0 = ok, 2 = input/validation error (JSON error on stdout).
"""
import json
import math
import os
import sys

import cv2
import numpy as np

SEV_COLORS = {  # BGR
    "critical": (40, 40, 230),
    "high": (0, 140, 255),
    "medium": (0, 215, 255),
    "low": (170, 170, 170),
}
SEV_ORDER = ["critical", "high", "medium", "low"]

DEFAULT_PARAMS = {
    "min_area_m2": 60.0,        # ignore changes smaller than this
    "max_area_m2": 20000.0,     # ignore huge blobs (usually seasonal/lighting)
    "diff_floor": 22.0,         # minimum LAB distance counted as change
    "diff_k": 4.0,              # robust threshold = median + k * MAD
    "min_rectangularity": 0.45,
    "max_aspect": 9.0,
    "max_vegetation_fraction": 0.6,
    "track_half_width_m": 4.0,  # changes inside this strip are track/ballast, not buildings
    "min_inliers": 12,
    "min_overlap": 0.5,
    "veg_min_area_m2": 150.0,
    "fallback_mpp": 0.5,        # used only if no bounds / resolution given
}


class PipelineError(Exception):
    pass


# ----------------------------------------------------------------- helpers
def fail(msg, code="invalid_input", extra=None):
    out = {"ok": False, "error": {"code": code, "message": msg}}
    if extra:
        out["error"].update(extra)
    print(json.dumps(out))
    sys.exit(2)


def load_image(path, label):
    if not path or not os.path.isfile(path):
        raise PipelineError(f"{label} image not found: {path}")
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise PipelineError(f"{label} image could not be decoded: {path}")
    h, w = img.shape[:2]
    if min(h, w) < 200:
        raise PipelineError(f"{label} image too small ({w}x{h}); need at least 200 px per side")
    return img


def meters_per_pixel(bounds, w, h, fallback):
    if bounds:
        lat0 = (bounds["north"] + bounds["south"]) / 2.0
        wm = (bounds["east"] - bounds["west"]) * 111320.0 * math.cos(math.radians(lat0))
        hm = (bounds["north"] - bounds["south"]) * 110540.0
        if wm <= 0 or hm <= 0:
            raise PipelineError("bounds must satisfy east>west and north>south")
        return wm / w, hm / h
    return fallback, fallback


class GeoRef:
    """pixel <-> lon/lat for the reference (before) image, linear within bounds."""

    def __init__(self, bounds, w, h):
        self.b, self.w, self.h = bounds, w, h

    def ll_to_px(self, lon, lat):
        b = self.b
        x = (lon - b["west"]) / (b["east"] - b["west"]) * self.w
        y = (b["north"] - lat) / (b["north"] - b["south"]) * self.h
        return x, y

    def px_to_ll(self, x, y):
        b = self.b
        lon = b["west"] + x / self.w * (b["east"] - b["west"])
        lat = b["north"] - y / self.h * (b["north"] - b["south"])
        return lon, lat


def bounds_iou(a, b):
    w = max(0.0, min(a["east"], b["east"]) - max(a["west"], b["west"]))
    h = max(0.0, min(a["north"], b["north"]) - max(a["south"], b["south"]))
    inter = w * h
    ua = (a["east"] - a["west"]) * (a["north"] - a["south"])
    ub = (b["east"] - b["west"]) * (b["north"] - b["south"])
    return inter / (ua + ub - inter) if (ua + ub - inter) > 0 else 0.0


# --------------------------------------------------------------- alignment
def align(before, after, params):
    """Warp `after` into `before` coordinates. Returns warped, valid_mask, info."""
    def prep(img):
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        s = min(1.0, 1800.0 / max(g.shape))
        if s < 1.0:
            g = cv2.resize(g, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        g = cv2.createCLAHE(2.0, (8, 8)).apply(g)
        return g, s

    gb, sb = prep(before)
    ga, sa = prep(after)
    sift = cv2.SIFT_create(nfeatures=6000)
    kb, db = sift.detectAndCompute(gb, None)
    ka, da = sift.detectAndCompute(ga, None)
    if db is None or da is None or len(kb) < 20 or len(ka) < 20:
        raise PipelineError("not enough visual features to compare the two images "
                            "(are they blank or heavily blurred?)", )
    matcher = cv2.BFMatcher(cv2.NORM_L2)
    raw = matcher.knnMatch(da, db, k=2)
    good = [m for m, n in (p for p in raw if len(p) == 2) if m.distance < 0.75 * n.distance]
    info = {"method": "SIFT+RANSAC homography", "matches": len(good)}
    if len(good) < params["min_inliers"]:
        raise PipelineError(
            f"images do not appear to cover the same area: only {len(good)} matching features found",
            )
    src = np.float32([ka[m.queryIdx].pt for m in good]) / sa     # after px (full res)
    dst = np.float32([kb[m.trainIdx].pt for m in good]) / sb     # before px (full res)
    H, inl = cv2.findHomography(src, dst, cv2.RANSAC, 4.0)
    if H is None:
        raise PipelineError("could not estimate an alignment between the images")
    n_in = int(inl.sum())
    info["inliers"] = n_in
    info["inlier_ratio"] = round(n_in / len(good), 3)
    if n_in < params["min_inliers"]:
        raise PipelineError(f"images do not appear to cover the same area: only {n_in} consistent features")

    hb, wb = before.shape[:2]
    ha, wa = after.shape[:2]
    corners = np.float32([[0, 0], [wa, 0], [wa, ha], [0, ha]]).reshape(-1, 1, 2)
    wc = cv2.perspectiveTransform(corners, H).reshape(-1, 2)
    frame = np.float32([[0, 0], [wb, 0], [wb, hb], [0, hb]])
    area, _ = cv2.intersectConvexConvex(frame, wc.astype(np.float32))
    overlap = float(area) / float(wb * hb)
    info["overlap_fraction"] = round(overlap, 3)
    if overlap < params["min_overlap"]:
        raise PipelineError(f"images only overlap {overlap:.0%}; need at least {params['min_overlap']:.0%}",
                            )
    # sanity: reject wild warps
    det = np.linalg.det(H[:2, :2])
    if not (0.1 < abs(det) < 10):
        raise PipelineError("alignment looks implausible (scale mismatch); check the two images")
    pts = src[inl.ravel() == 1].reshape(-1, 1, 2)
    proj = cv2.perspectiveTransform(pts, H).reshape(-1, 2)
    info["rms_error_px"] = round(float(np.sqrt(np.mean(np.sum((proj - dst[inl.ravel() == 1]) ** 2, axis=1)))), 2)

    warped = cv2.warpPerspective(after, H, (wb, hb), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    ones = np.full((ha, wa), 255, np.uint8)
    valid = cv2.warpPerspective(ones, H, (wb, hb), flags=cv2.INTER_NEAREST)
    valid = cv2.erode(valid, np.ones((9, 9), np.uint8))
    return warped, valid > 0, info


def match_colors(ref, img, valid):
    """Match per-channel LAB mean/std of img to ref (removes season/exposure shifts)."""
    a = cv2.cvtColor(ref, cv2.COLOR_BGR2LAB).astype(np.float32)
    b = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    for c in range(3):
        ra, rb = a[..., c][valid], b[..., c][valid]
        sd = rb.std() if rb.std() > 1e-3 else 1.0
        b[..., c] = (b[..., c] - rb.mean()) / sd * ra.std() + ra.mean()
    return cv2.cvtColor(np.clip(b, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)


# ------------------------------------------------------------ vegetation
def exg_mask(img, thr=18):
    f = img.astype(np.float32)
    b, g, r = f[..., 0], f[..., 1], f[..., 2]
    exg = 2 * g - r - b
    return (exg > thr)


def structure_mask(img, min_area_px):
    """Rough 'man-made structure' mask: strong straight edges closed into blobs, non-vegetation."""
    g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (5, 5), 1.5)
    e = cv2.Canny(g, 60, 140)
    e = cv2.dilate(e, np.ones((3, 3), np.uint8))
    e = cv2.morphologyEx(e, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    cnts, _ = cv2.findContours(e, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out = np.zeros(g.shape, np.uint8)
    for c in cnts:
        a = cv2.contourArea(c)
        if a < min_area_px:
            continue
        r = cv2.minAreaRect(c)
        ra = r[1][0] * r[1][1]
        if ra > 0 and a / ra > 0.5:
            cv2.drawContours(out, [c], -1, 255, -1)
    return out > 0


# --------------------------------------------------------- corridor maths
def dist_points_to_polyline(pts, line):
    """pts (N,2), line (M,2) -> min distance (px) per point."""
    best = np.full(len(pts), np.inf)
    for i in range(len(line) - 1):
        a, b = line[i], line[i + 1]
        ab = b - a
        L2 = float(ab @ ab)
        if L2 == 0:
            d = np.linalg.norm(pts - a, axis=1)
        else:
            t = np.clip(((pts - a) @ ab) / L2, 0, 1)
            proj = a + t[:, None] * ab
            d = np.linalg.norm(pts - proj, axis=1)
        best = np.minimum(best, d)
    return best


def contour_to_ll(cnt_pts, geo):
    if not geo:
        return None
    return [list(map(lambda v: round(v, 7), geo.px_to_ll(float(x), float(y)))) for x, y in cnt_pts]


def severity_for(dist_m, in_boundary, has_boundary, buffer_m, dist_to_boundary_m):
    if has_boundary:
        if in_boundary:
            return "critical"
        if dist_to_boundary_m <= 15:
            return "high"
        if dist_to_boundary_m <= 30:
            return "medium"
        return "low"
    if dist_m <= buffer_m * 0.5:
        return "critical"
    if dist_m <= buffer_m:
        return "high"
    if dist_m <= buffer_m * 2:
        return "medium"
    return "low"


# ---------------------------------------------------------------- drawing
def draw_corridor(img, track_px, buffer_poly_px, boundary_px, mpp):
    out = img.copy()
    if boundary_px is not None:
        cv2.polylines(out, [boundary_px.astype(np.int32)], True, (255, 90, 0), 2, cv2.LINE_AA)
    elif buffer_poly_px:
        for c in buffer_poly_px:
            cv2.polylines(out, [c], True, (255, 200, 0), 2, cv2.LINE_AA)
    if track_px is not None:
        cv2.polylines(out, [track_px.astype(np.int32)], False, (255, 255, 0), 3, cv2.LINE_AA)
        cv2.polylines(out, [track_px.astype(np.int32)], False, (0, 0, 0), 1, cv2.LINE_AA)
    return out


def put_label(img, text, org, color):
    f, sc, th = cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1
    (tw, thh), _ = cv2.getTextSize(text, f, sc, th)
    x, y = org
    y = max(y, thh + 6)
    cv2.rectangle(img, (x, y - thh - 6), (x + tw + 6, y), color, -1)
    cv2.putText(img, text, (x + 3, y - 4), f, sc, (255, 255, 255), th, cv2.LINE_AA)


# ------------------------------------------------------------------- main
def run(cfg):
    params = dict(DEFAULT_PARAMS)
    params.update(cfg.get("params") or {})
    out_dir = cfg["out_dir"]
    os.makedirs(os.path.join(out_dir, "evidence"), exist_ok=True)

    b_meta, a_meta = cfg["before"], cfg["after"]
    before = load_image(b_meta.get("path"), "Before")
    after = load_image(a_meta.get("path"), "After")
    hb, wb = before.shape[:2]
    ha, wa = after.shape[:2]

    # --- metadata validation
    bb, ab = b_meta.get("bounds"), a_meta.get("bounds")
    if bb and ab:
        iou = bounds_iou(bb, ab)
        if iou < 0.6:
            raise PipelineError(f"the two images declare different areas (bounds overlap {iou:.0%}); "
                                "select the same area for both", )
    geo_bounds = bb or ab
    mpp_x, mpp_y = meters_per_pixel(geo_bounds, wb, hb, params["fallback_mpp"])
    if not geo_bounds and b_meta.get("resolution_m"):
        mpp_x = mpp_y = float(b_meta["resolution_m"])
    mpp = (mpp_x + mpp_y) / 2.0
    geo = GeoRef(geo_bounds, wb, hb) if geo_bounds else None
    a_mpp = sum(meters_per_pixel(ab, wa, ha, mpp)) / 2.0 if ab else None

    # --- alignment
    warped, valid, align_info = align(before, after, params)
    warped_c = match_colors(before, warped, valid)

    # --- corridor geometry (pixel space of the before image)
    cor = cfg.get("corridor") or {}
    track_px = None
    if cor.get("track_px"):
        track_px = np.array(cor["track_px"], np.float32)
    elif cor.get("track") and geo:
        track_px = np.array([geo.ll_to_px(lo, la) for lo, la in cor["track"]], np.float32)
    boundary_px = None
    if cor.get("boundary") and geo:
        boundary_px = np.array([geo.ll_to_px(lo, la) for lo, la in cor["boundary"]], np.float32)
    elif cor.get("boundary_px"):
        boundary_px = np.array(cor["boundary_px"], np.float32)
    buffer_m = float(cor.get("buffer_m", 30))
    has_boundary = boundary_px is not None and len(boundary_px) >= 3
    if track_px is None and not has_boundary:
        raise PipelineError("corridor needs at least a track line or a boundary polygon")
    if has_boundary and cor.get("boundary_verified"):
        corridor_basis = "verified_boundary"
        corridor_label = f"Verified railway-land boundary ({cor.get('boundary_source', 'official record')})"
    elif has_boundary:
        corridor_basis = "unverified_boundary"
        corridor_label = f"UNVERIFIED boundary polygon ({cor.get('boundary_source', 'hard-coded sample, not an official record')})"
    else:
        corridor_basis = "approximate_buffer"
        corridor_label = (f"APPROXIMATE: {buffer_m:g} m monitoring buffer around track line "
                          "(not an official boundary)")

    # monitoring zone mask (boundary, or buffer around track)
    zone = np.zeros((hb, wb), np.uint8)
    buffer_contours = None
    if has_boundary:
        cv2.fillPoly(zone, [boundary_px.astype(np.int32)], 255)
    else:
        cv2.polylines(zone, [track_px.astype(np.int32)], False, 255,
                      thickness=max(1, int(round(2 * buffer_m / mpp))))
        buffer_contours, _ = cv2.findContours(zone, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    zone_b = zone > 0

    # --- change detection
    ba = cv2.GaussianBlur(before, (0, 0), 2)
    bb_ = cv2.GaussianBlur(warped_c, (0, 0), 2)
    la = cv2.cvtColor(ba, cv2.COLOR_BGR2LAB).astype(np.float32)
    lb = cv2.cvtColor(bb_, cv2.COLOR_BGR2LAB).astype(np.float32)
    diff = np.sqrt(np.sum((la - lb) ** 2, axis=2))
    diff[~valid] = 0
    vals = diff[valid]
    med = float(np.median(vals))
    mad = float(np.median(np.abs(vals - med)) * 1.4826)
    thr = max(med + params["diff_k"] * mad, params["diff_floor"])
    cm = (diff > thr).astype(np.uint8) * 255
    min_area_px = params["min_area_m2"] / (mpp_x * mpp_y)
    k = max(5, int(round(math.sqrt(min_area_px) * 0.35)) | 1)
    cm = cv2.morphologyEx(cm, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (k, k)))
    cm = cv2.morphologyEx(cm, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (k + 4, k + 4)))
    cnts, _ = cv2.findContours(cm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    veg_a = exg_mask(before)
    veg_b = exg_mask(warped_c)
    struct_before = structure_mask(before, min_area_px * 0.5)
    gray_b = cv2.Canny(cv2.cvtColor(before, cv2.COLOR_BGR2GRAY), 60, 140) > 0
    gray_a = cv2.Canny(cv2.cvtColor(warped_c, cv2.COLOR_BGR2GRAY), 60, 140) > 0

    track_strip = None
    if track_px is not None:
        track_strip = np.zeros((hb, wb), np.uint8)
        cv2.polylines(track_strip, [track_px.astype(np.int32)], False, 255,
                      thickness=max(1, int(round(2 * params["track_half_width_m"] / mpp))))
        track_strip = track_strip > 0

    if track_strip is not None:  # rails/ballast are not buildings
        struct_before &= ~(cv2.dilate(track_strip.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0)

    candidates, rejected = [], {"too_small_or_large": 0, "not_building_shaped": 0,
                                "vegetation": 0, "track_or_ballast": 0}
    for c in cnts:
        area_px = cv2.contourArea(c)
        area_m2 = area_px * mpp_x * mpp_y
        if area_m2 < params["min_area_m2"] or area_m2 > params["max_area_m2"]:
            rejected["too_small_or_large"] += 1
            continue
        rect = cv2.minAreaRect(c)
        rw, rh = rect[1]
        if rw < 1 or rh < 1:
            continue
        rectangularity = area_px / (rw * rh)
        aspect = max(rw, rh) / min(rw, rh)
        if rectangularity < params["min_rectangularity"] or aspect > params["max_aspect"]:
            rejected["not_building_shaped"] += 1
            continue
        m = np.zeros((hb, wb), np.uint8)
        cv2.drawContours(m, [c], -1, 255, -1)
        mb = m > 0
        veg_frac = float(veg_b[mb].mean())
        if veg_frac > params["max_vegetation_fraction"] and float(veg_a[mb].mean()) > 0.3:
            rejected["vegetation"] += 1
            continue
        if track_strip is not None and float((track_strip & mb).sum()) / max(1, mb.sum()) > 0.6:
            rejected["track_or_ballast"] += 1
            continue

        mean_diff = float(diff[mb].mean())
        edge_a = float(gray_a[mb].mean())
        edge_b = float(gray_b[mb].mean())
        edge_gain = edge_a / (edge_b + 0.01)
        score = 0.4 * min(1.0, rectangularity) + 0.3 * min(1.0, edge_gain / 3.0) + 0.3 * min(1.0, mean_diff / 60.0)

        x, y, w, h = cv2.boundingRect(c)
        ring = cv2.dilate(m, np.ones((15, 15), np.uint8)) > 0
        ctype = "expanded" if (struct_before & ring).sum() > 0.05 * ring.sum() else "new"

        pts = c.reshape(-1, 2).astype(np.float32)
        M = cv2.moments(c)
        cx, cy = (M["m10"] / M["m00"], M["m01"] / M["m00"]) if M["m00"] else (x + w / 2, y + h / 2)

        dist_m = None
        if track_px is not None:
            dist_m = float(dist_points_to_polyline(pts, track_px).min() * mpp)
        in_boundary, d_boundary = False, None
        if has_boundary:
            bpoly = boundary_px.astype(np.float32).reshape(-1, 1, 2)
            signed = [cv2.pointPolygonTest(bpoly, (float(px), float(py)), True) for px, py in pts[::3]]
            signed.append(cv2.pointPolygonTest(bpoly, (float(cx), float(cy)), True))
            best = max(signed)
            in_boundary = best >= 0
            d_boundary = 0.0 if in_boundary else float(-best * mpp)
        sev = severity_for(dist_m if dist_m is not None else 1e9, in_boundary, has_boundary, buffer_m,
                           d_boundary if d_boundary is not None else 1e9)
        in_zone = bool(in_boundary) if has_boundary else (dist_m is not None and dist_m <= buffer_m)

        eps = 0.01 * cv2.arcLength(c, True)
        poly = cv2.approxPolyDP(c, eps, True).reshape(-1, 2)
        cand = {
            "bbox_px": [int(x), int(y), int(w), int(h)],
            "polygon_px": poly.tolist(),
            "centroid_px": [round(cx, 1), round(cy, 1)],
            "centroid_lonlat": [round(v, 7) for v in geo.px_to_ll(cx, cy)] if geo else None,
            "polygon_lonlat": contour_to_ll(poly, geo),
            "area_m2": round(area_m2, 1),
            "type": ctype,
            "building_score": round(float(score), 3),
            "mean_change": round(mean_diff, 1),
            "rectangularity": round(float(rectangularity), 3),
            "vegetation_fraction": round(veg_frac, 3),
            "distance_to_track_m": round(dist_m, 1) if dist_m is not None else None,
            "inside_boundary": bool(in_boundary) if has_boundary else None,
            "distance_to_boundary_m": round(d_boundary, 1) if d_boundary is not None else None,
            "in_monitoring_zone": bool(in_zone),
            "severity": sev,
            "flagged": sev in ("critical", "high"),
        }
        candidates.append(cand)

    candidates.sort(key=lambda c: (SEV_ORDER.index(c["severity"]), -c["building_score"]))
    for i, c in enumerate(candidates, 1):
        c["index"] = i

    # --- vegetation growth in corridor
    veg_new = (veg_b & ~veg_a & zone_b & valid).astype(np.uint8) * 255
    vk = max(5, int(round(math.sqrt(params["veg_min_area_m2"] / (mpp_x * mpp_y)) * 0.3)) | 1)
    veg_new = cv2.morphologyEx(veg_new, cv2.MORPH_OPEN, np.ones((vk, vk), np.uint8))
    veg_new = cv2.morphologyEx(veg_new, cv2.MORPH_CLOSE, np.ones((vk + 6, vk + 6), np.uint8))
    vc, _ = cv2.findContours(veg_new, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    veg_regions = []
    for c in vc:
        a_m2 = cv2.contourArea(c) * mpp_x * mpp_y
        if a_m2 < params["veg_min_area_m2"]:
            continue
        x, y, w, h = cv2.boundingRect(c)
        pts = c.reshape(-1, 2).astype(np.float32)
        d = float(dist_points_to_polyline(pts, track_px).min() * mpp) if track_px is not None else None
        sev = "high" if (d is not None and d <= buffer_m * 0.5) else "medium"
        veg_regions.append({"bbox_px": [int(x), int(y), int(w), int(h)], "area_m2": round(a_m2, 1),
                            "distance_to_track_m": round(d, 1) if d is not None else None,
                            "severity": sev})
    veg_regions.sort(key=lambda r: -r["area_m2"])
    zone_valid = zone_b & valid
    zsum = max(1, int(zone_valid.sum()))
    veg_summary = {
        "zone_area_m2": round(zsum * mpp_x * mpp_y, 1),
        "vegetation_pct_before": round(100.0 * float((veg_a & zone_valid).sum()) / zsum, 1),
        "vegetation_pct_after": round(100.0 * float((veg_b & zone_valid).sum()) / zsum, 1),
        "new_vegetation_regions": veg_regions[:20],
    }

    # --- annotated output
    base_before = draw_corridor(before, track_px, buffer_contours, boundary_px if has_boundary else None, mpp)
    ann_after = draw_corridor(warped_c if cfg.get("annotate_on_aligned", True) else after,
                              track_px, buffer_contours, boundary_px if has_boundary else None, mpp)
    for r in veg_regions:
        x, y, w, h = r["bbox_px"]
        cv2.rectangle(ann_after, (x, y), (x + w, y + h), (60, 180, 60), 2)
        put_label(ann_after, "veg", (x, y), (60, 150, 60))
    for c in candidates:
        x, y, w, h = c["bbox_px"]
        col = SEV_COLORS[c["severity"]]
        cv2.rectangle(ann_after, (x, y), (x + w, y + h), col, 3)
        d = f"{c['distance_to_track_m']:.0f}m" if c["distance_to_track_m"] is not None else ""
        put_label(ann_after, f"#{c['index']} {c['severity']} {d}", (x, y), col)
    heat = cv2.applyColorMap(np.clip(diff / max(thr * 3, 1) * 255, 0, 255).astype(np.uint8), cv2.COLORMAP_INFERNO)

    cv2.imwrite(os.path.join(out_dir, "before.png"), before)
    cv2.imwrite(os.path.join(out_dir, "before_corridor.png"), base_before)
    cv2.imwrite(os.path.join(out_dir, "after_aligned.png"), warped_c)
    cv2.imwrite(os.path.join(out_dir, "annotated_after.png"), ann_after)
    cv2.imwrite(os.path.join(out_dir, "change_heatmap.png"), heat)

    pad = 40
    for c in candidates:
        x, y, w, h = c["bbox_px"]
        x0, y0 = max(0, x - pad), max(0, y - pad)
        x1, y1 = min(wb, x + w + pad), min(hb, y + h + pad)
        cb = before[y0:y1, x0:x1].copy()
        ca = warped_c[y0:y1, x0:x1].copy()
        cv2.rectangle(ca, (x - x0, y - y0), (x - x0 + w, y - y0 + h), SEV_COLORS[c["severity"]], 2)
        sc = max(1, int(round(240 / max(cb.shape[:2]))))
        if sc > 1:
            cb = cv2.resize(cb, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
            ca = cv2.resize(ca, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
        pair = np.hstack([cb, np.full((cb.shape[0], 6, 3), 255, np.uint8), ca])
        name = f"candidate_{c['index']:02d}.png"
        cv2.imwrite(os.path.join(out_dir, "evidence", name), pair)
        c["evidence_image"] = f"evidence/{name}"

    sev_counts = {s: sum(1 for c in candidates if c["severity"] == s) for s in SEV_ORDER}
    result = {
        "ok": True,
        "validation": {
            "same_area": True,
            "alignment": align_info,
            "bounds_declared_both": bool(bb and ab),
            "notes": ([] if (bb and ab) else
                      ["Bounds not supplied for both images; same-area check relied on image features only."]),
        },
        "images": {
            "before": {"date": b_meta.get("date"), "source": b_meta.get("source"),
                       "size_px": [wb, hb], "resolution_m_per_px": round(mpp, 3), "bounds": bb},
            "after": {"date": a_meta.get("date"), "source": a_meta.get("source"),
                      "size_px": [wa, ha], "resolution_m_per_px": round(a_mpp, 3) if a_mpp else None,
                      "bounds": ab},
            "reference_size_px": [wb, hb],
        },
        "corridor": {
            "basis": corridor_basis,
            "label": corridor_label,
            "buffer_m": buffer_m,
            "track_px": track_px.round(1).tolist() if track_px is not None else None,
            "boundary_px": boundary_px.round(1).tolist() if has_boundary else None,
            "track_lonlat": contour_to_ll(track_px, geo) if track_px is not None else None,
            "zone_lonlat": (
                [contour_to_ll(boundary_px, geo)] if has_boundary else
                [contour_to_ll(cv2.approxPolyDP(c, 2.0, True).reshape(-1, 2), geo) for c in buffer_contours]
            ) if geo else None,
        },
        "params": {**params, "threshold_used": round(thr, 2)},
        "summary": {"candidates": len(candidates), "flagged": sum(1 for c in candidates if c["flagged"]),
                    "by_severity": sev_counts, "rejected_filters": rejected},
        "candidates": candidates,
        "vegetation": veg_summary,
        "files": {"before": "before.png", "before_corridor": "before_corridor.png", "after_aligned": "after_aligned.png",
                  "annotated_after": "annotated_after.png", "heatmap": "change_heatmap.png"},
    }
    with open(os.path.join(out_dir, "result.json"), "w") as f:
        json.dump(result, f, indent=2)
    return result


def main():
    if len(sys.argv) != 2:
        fail("usage: detect.py config.json")
    try:
        with open(sys.argv[1]) as f:
            cfg = json.load(f)
        res = run(cfg)
        print(json.dumps({"ok": True, "summary": res["summary"]}))
    except PipelineError as e:
        fail(str(e), "validation_failed")
    except (KeyError, ValueError, json.JSONDecodeError) as e:
        fail(f"bad config: {e}")
    except Exception as e:  # noqa
        print(json.dumps({"ok": False, "error": {"code": "internal", "message": str(e)}}))
        sys.exit(1)


if __name__ == "__main__":
    main()
