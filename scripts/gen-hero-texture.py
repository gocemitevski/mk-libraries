#!/usr/bin/env python3
"""
Hero background texture — procedural generator.

Produces public/hero/shelves.webp: an original image of a library aisle, rendered from
scratch. No third-party pixels are involved, so the site owns the asset outright and
there is no licence to clear.

Why generate instead of photograph:
  * The hero uses `background-blend-mode: luminosity`, which throws the image's colour
    away and keeps only its luminance — so what matters here is *structure*, not hue.
  * The band is always shown behind a left-to-right scrim, so the right half only has to
    read as shelving texture, never as a specific recognisable place.
  * We control the exact file weight; the site ships one decorative image and nothing else.

How it is built:
  1. A flat shelf wall, a floor and a ceiling are drawn as 2D textures (book spines with
     cylinder shading, head/tail bands, title blocks, shelf boards, structural uprights).
  2. The corridor is rendered analytically: for every screen pixel the ray direction is
     computed and intersected against five planes (left wall, right wall, floor, ceiling,
     end wall), keeping the nearest hit. That gives true one-point perspective — rows and
     uprights converge on the vanishing point, which is the whole depth cue.
  3. Atmosphere (haze that washes distance toward light), a window glow, depth-of-field
     (variable blur, sharp only near the focus plane), film grain, warm duotone.

Geometry is in metres with the camera at the origin looking down +Z; screen projection is
sx = CX + F*X/Z, sy = CY - F*Y/Z.

Everything is seeded, so re-running reproduces the identical file.

    python3 scripts/gen-hero-texture.py [out.webp]
"""

from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

# ── Frame ────────────────────────────────────────────────────────────────────
W, H = 1920, 1072  # matches the asset the CSS already expects (16:9-ish)
SEED = 20261015

# ── Corridor geometry (metres) ───────────────────────────────────────────────
F = 1500.0  # focal length in px → ~65° horizontal field of view
# The vanishing point sits well left of centre on purpose: the hero's scrim is strongest
# on the left and weakest on the right, so the glow belongs where the scrim hides it and
# the plain shelving belongs where the stat tiles sit. Put the bright end under the tiles
# instead and it costs the tile captions their contrast.
CX = 0.30 * W
CY = 0.47 * H
A = 0.95  # corridor half-width (1.9 m aisle)
HF = 1.55  # floor, below the camera
HC = 1.15  # ceiling, above the camera
ZMAX = 16.0  # distance to the end wall

# ── Texture resolution ───────────────────────────────────────────────────────
TW, TH = 4096, 1024  # wall: u = along the wall, v = height (tiles seamlessly)
N_ROWS = 11  # shelf rows per TH → 0.36 m rows at 256 px/m
FW, FH = 256, 1024  # floor / ceiling: u = across the aisle, v = depth
PPM = TW / ZMAX  # 256 px per metre on the walls

# ── Atmosphere & lens ────────────────────────────────────────────────────────
HAZE_DIST = 10.0  # metres over which distance washes out
HAZE_POW = 2.5  # keeps the wash off the near shelves and on the far end
HAZE_LIGHT = 0.97  # the colour distance washes toward
FOCUS = 4.5  # metres — the plane held sharp
BLUR_MAX = 30.0
BLUR_LEVELS = [0.0, 1.5, 4.0, 8.0, 14.0, 22.0, 32.0]
GAMMA = 1.15  # >1 deepens midtones; tune against TARGET_MEAN / TARGET_ROI
ALBEDO = 0.95  # exposure of the shelving itself, before glow and haze
WINDOW_K = 0.16  # weight of the high window on the left
MOUTH_K = 2.00  # weight of the lit mouth of the aisle (lands at CX)
# The mouth is a light source, not a lit surface, so it needs an additive term as
# well — a purely multiplicative glow can never exceed the dark albedo under it.
MOUTH_ADD = 0.70
MOUTH_SIGMA = 0.15  # mouth glow reach, as a fraction of the frame width

# Tonal target, measured on the mood reference: mean ≈0.38, median ≈0.30 over the
# whole frame and ≈0.26 across the region the hero tiles occupy, with a bright p95.
# The hero keeps only this luminance (see the blend), so getting the *level* right is
# what decides whether the headline still has something dark to sit on.
TARGET_MEAN = 0.38
TARGET_ROI = 0.26


# ── Textures ─────────────────────────────────────────────────────────────────
def make_wall(rng: np.random.Generator) -> np.ndarray:
    """A bay of shelving: rows of spines sitting on shelf boards."""
    tex = np.zeros((TH, TW), np.float32)
    bounds = np.linspace(0, TH, N_ROWS + 1).round().astype(int)
    xs = np.arange(TW, dtype=np.float32)

    for i in range(N_ROWS):
        y0, y1 = int(bounds[i]), int(bounds[i + 1])
        board_h = max(6, int(round((y1 - y0) * 0.13)))
        top, bot = y0, y1 - board_h
        interior = bot - top
        if interior < 12:
            continue

        # Books cluster: neighbouring depths hold books of similar tone.
        ph = rng.uniform(0, 2 * np.pi, 3)
        cluster = (
            0.11 * np.sin(xs / 307.0 + ph[0])
            + 0.075 * np.sin(xs / 91.0 + ph[1])
            + 0.045 * np.sin(xs / 37.0 + ph[2])
        )
        base = float(rng.uniform(0.17, 0.31))

        x = 0
        while x < TW:
            if rng.random() < 0.045:  # a gap where a book is missing
                x += int(rng.integers(5, 26))
                continue
            w = int(np.clip(rng.lognormal(2.72, 0.40), 7, 78))
            w = min(w, TW - x)
            if w <= 1:
                break
            bh = int(round(interior * rng.uniform(0.70, 1.0)))
            ytop = bot - bh
            bl = float(np.clip(base + cluster[x + w // 2] + rng.normal(0, 0.06), 0.10, 0.92))

            u = (np.arange(w, dtype=np.float32) + 0.5) / w
            shade = 0.78 + 0.40 * np.exp(-((u - 0.62) / 0.46) ** 2)  # round spine
            v = (np.arange(bh, dtype=np.float32) + 0.5) / bh
            vshade = 0.84 + 0.16 * v  # shadow from the shelf above
            spine = bl * shade[None, :] * vshade[:, None]

            edge = max(1, int(bh * 0.05))
            spine[:edge] *= 0.80  # head band
            spine[-edge:] *= 0.85  # tail band
            if rng.random() < 0.40:  # gilt title block
                a = int(bh * rng.uniform(0.16, 0.30))
                b = a + max(2, int(bh * 0.10))
                spine[a : min(b, bh)] *= rng.uniform(1.25, 1.65)
            elif rng.random() < 0.35:  # a dark panel
                a = int(bh * rng.uniform(0.45, 0.62))
                b = a + max(2, int(bh * 0.12))
                spine[a : min(b, bh)] *= rng.uniform(0.55, 0.80)

            spine[:, -1] *= 0.55  # the joint between two spines
            tex[ytop:bot, x : x + w] = np.clip(spine, 0, 1.35)
            x += w

        # Shelf board, with the contact shadow the books cast on it.
        board = float(rng.uniform(0.28, 0.40)) * np.linspace(0.72, 1.0, board_h, dtype=np.float32)
        tex[bot:y1, :] = board[:, None]
        tex[max(bot - 4, top) : bot, :] *= 0.55

    # Structural uprights: regular bays read as depth once they converge.
    x = int(rng.integers(0, 300))
    while x < TW:
        uw = int(rng.integers(11, 19))
        u = (np.arange(uw, dtype=np.float32) + 0.5) / uw
        prof = 0.62 + 0.42 * np.exp(-((u - 0.55) / 0.50) ** 2)
        tex[:, x : x + uw] = (rng.uniform(0.34, 0.47) * prof)[None, :]
        tex[:, x : x + 2] *= 0.60
        tex[:, x + uw - 2 : x + uw] *= 0.60
        x += uw + int(rng.uniform(0.85, 1.35) * PPM)
    return tex


def make_floor(rng: np.random.Generator) -> np.ndarray:
    """Planks running down the aisle, with light pooling along the centre line."""
    fl = np.full((FH, FW), 0.28, np.float32)
    seam = ((np.arange(FW) % 14) < 2).astype(np.float32)  # plank joints
    fl *= (1.0 - 0.22 * seam)[None, :]
    fl += (0.06 * np.sin(np.arange(FH, dtype=np.float32) / 57.0))[:, None]
    centre = np.exp(-((np.arange(FW, dtype=np.float32) - FW / 2) / (FW * 0.42)) ** 2)
    fl += (0.12 * centre)[None, :]
    fl += rng.normal(0, 0.02, (FH, FW)).astype(np.float32)
    return fl


def make_ceiling(rng: np.random.Generator) -> np.ndarray:
    cl = np.full((FH, FW), 0.13, np.float32)
    cl += (0.05 * np.sin(np.arange(FH, dtype=np.float32) / 71.0))[:, None]
    cl += rng.normal(0, 0.012, (FH, FW)).astype(np.float32)
    return cl


# ── Sampling ─────────────────────────────────────────────────────────────────
def sample(tex: np.ndarray, u: np.ndarray, v: np.ndarray) -> np.ndarray:
    """Bilinear lookup; v wraps (the wall tiles vertically), u is clamped."""
    th, tw = tex.shape
    u = np.clip(u, 0.0, tw - 1.001)
    v = np.mod(v, th)  # can land on exactly `th` through float rounding
    x0 = u.astype(np.int32)
    y0 = np.minimum(v.astype(np.int32), th - 1)
    fx = u - x0
    fy = v - y0
    x1 = np.minimum(x0 + 1, tw - 1)
    y1 = (y0 + 1) % th
    a, b = tex[y0, x0], tex[y0, x1]
    c, d = tex[y1, x0], tex[y1, x1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


# ── Render ───────────────────────────────────────────────────────────────────
def render(rng: np.random.Generator) -> np.ndarray:
    wall_tex, floor_tex, ceil_tex = make_wall(rng), make_floor(rng), make_ceiling(rng)

    sy, sx = np.mgrid[0:H, 0:W].astype(np.float32)
    dx = (sx - CX) / F
    dy = -(sy - CY) / F
    eps = 1e-6
    dxs = np.where(np.abs(dx) < eps, np.where(dx >= 0, eps, -eps), dx)
    dys = np.where(np.abs(dy) < eps, np.where(dy >= 0, eps, -eps), dy)
    big = np.float32(1e9)

    hits = np.stack(
        [
            np.where(dx < 0, -A / dxs, big),  # left wall   X = -A
            np.where(dx > 0, A / dxs, big),  # right wall  X = +A
            np.where(dy < 0, -HF / dys, big),  # floor       Y = -HF
            np.where(dy > 0, HC / dys, big),  # ceiling     Y = +HC
            np.full((H, W), ZMAX, np.float32),  # end wall   Z = ZMAX
        ]
    )
    side = np.argmin(hits, axis=0).astype(np.int8)
    dist = np.min(hits, axis=0)
    world_x = dist * dx
    world_y = dist * dy

    # Wall coordinates: left recedes with Z, right mirrored so the sides differ.
    wall_v = (world_y + HF) * PPM
    wall_u = np.where(
        side == 1, (ZMAX - dist) * PPM, np.where(side == 4, (world_x + A) * PPM, dist * PPM)
    )
    floor_u = (world_x + A) * (FW / (2 * A))
    floor_v = dist * (FH / ZMAX)

    lum = sample(wall_tex, wall_u, wall_v)
    lum[side == 2] = sample(floor_tex, floor_u, floor_v)[side == 2]
    lum[side == 3] = sample(ceil_tex, floor_u, floor_v)[side == 3]
    lum *= ALBEDO  # exposure of the surfaces, before glow and haze

    # Illumination: a window high on the left, and the lit mouth of the aisle.
    window = np.exp(
        -(((sx - 0.30 * W) / (0.52 * W)) ** 2 + ((sy - 0.10 * H) / (0.56 * H)) ** 2)
    )
    mouth = np.exp(-(((sx - CX) / (MOUTH_SIGMA * W)) ** 2 + ((sy - CY) / (0.19 * H)) ** 2))
    lum = lum * (1.0 + WINDOW_K * window + MOUTH_K * mouth) + MOUTH_ADD * mouth

    # Atmosphere: distance washes toward light. The exponent holds the wash off the
    # near shelving so the frame keeps its darks and only the far end blows out.
    haze = (1.0 - np.exp(-dist / HAZE_DIST)) ** HAZE_POW
    lum = lum * (1.0 - haze) + HAZE_LIGHT * haze

    # Depth of field: sharp only near FOCUS, softening both toward the lens and away.
    rb = 0.6 + 26.0 * np.clip(np.abs(np.log(dist / FOCUS)) - 0.30, 0.0, None) ** 1.7
    np.clip(rb, 0.0, BLUR_MAX, out=rb)
    blurred = [lum if r == 0 else gaussian_filter(lum, r) for r in BLUR_LEVELS]
    out = blurred[0]
    for i in range(1, len(BLUR_LEVELS)):
        w = np.clip((rb - BLUR_LEVELS[i - 1]) / (BLUR_LEVELS[i] - BLUR_LEVELS[i - 1]), 0, 1)
        out = out * (1 - w) + blurred[i] * w

    # A touch of gamma gives the frame real blacks rather than a uniformly pale wash —
    # this is what keeps the hero's text side dark once the blend has taken the colour.
    out = np.clip(out, 0.0, 1.0) ** GAMMA

    # Grain sits after the lens, as it would on film, and dithers any banding.
    out += rng.normal(0, 0.012, (H, W)).astype(np.float32)
    return np.clip(out, 0.0, 1.0)


def to_rgb(lum: np.ndarray) -> np.ndarray:
    """Warm duotone — the reference's neutral-warm room, expressed in one channel."""
    shadow = np.array([32, 27, 23], np.float32)
    high = np.array([247, 242, 233], np.float32)
    tone = np.clip(lum, 0.0, 1.0) ** 0.95
    return (shadow + (high - shadow) * tone[..., None]).astype(np.uint8)


def main() -> None:
    out = sys.argv[1] if len(sys.argv) > 1 else "public/hero/shelves.webp"
    Image.fromarray(to_rgb(render(np.random.default_rng(SEED))), "RGB").save(
        out, "WEBP", quality=72, method=6
    )

    # Measure the shipped file in the same space the targets were taken in (WCAG
    # relative luminance of the encoded RGB), so the comparison is like for like.
    arr = np.asarray(Image.open(out).convert("RGB")).astype(np.float32) / 255.0
    wcag = 0.2126 * arr[..., 0] + 0.7152 * arr[..., 1] + 0.0722 * arr[..., 2]
    roi = wcag[int(0.20 * H) : int(0.80 * H), int(0.55 * W) :]
    p = np.percentile(wcag, [5, 50, 95])
    print(f"{out}: {W}x{H}, {os.path.getsize(out) / 1024:.1f} KB")
    print(
        f"  luminance  mean {wcag.mean():.3f} (target {TARGET_MEAN})   "
        f"tile-ROI {roi.mean():.3f} (target {TARGET_ROI})   "
        f"p5/50/95 {p[0]:.2f} {p[1]:.2f} {p[2]:.2f}"
    )


if __name__ == "__main__":
    main()
