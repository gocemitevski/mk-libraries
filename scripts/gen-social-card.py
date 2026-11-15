#!/usr/bin/env python3
"""
Social card — generator.

Produces the two raster assets the project hands to social platforms:

    assets/social/facebook-post-2400x1260.png   post artwork (2400x1260)
    app/opengraph-image.png                     link preview (1200x630)

Both are the same composition: the second is the downscaled copy that every page points at
through `app/opengraph-image.png`. Rendering them together is what keeps the pair in sync —
before this script the 1200x630 file was resized by hand.

What is baked in and what is drawn here:
  * `assets/social/card-background.webp` is the plate (lossless WebP): the shelving
    photograph, the maroon scrim, the gold rule and the „Библиотеки.мк“ wordmark. Those are
    artwork — they change only when the brand does, and they sit on a photograph that cannot
    be re-derived from code — so they stay in the plate.
  * Everything below the wordmark is copy, and the copy is the part that gets rewritten
    between campaigns. It is drawn here in Geologica, from the same `.woff2` files the site
    ships, so the card cannot drift from the site's typography.

Requirements: Pillow, plus fontTools and brotli (the latter two only to unpack the
`.woff2` files the site already ships, into a temporary directory).

    python3 scripts/gen-social-card.py           # regenerate both PNGs
    python3 scripts/gen-social-card.py --check   # fail if the committed PNGs are stale

The output is deterministic: the same plate, copy and fonts reproduce byte-identical PNGs,
so a re-run that changes nothing produces no diff and `--check` is a real comparison.
"""

from __future__ import annotations

import io
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PLATE = ROOT / "assets/social/card-background.webp"
POST_OUT = ROOT / "assets/social/facebook-post-2400x1260.png"
OG_OUT = ROOT / "app/opengraph-image.png"

# ── Canvas ───────────────────────────────────────────────────────────────────
W, H = 2400, 1260  # the plate's own size; the layout below is expressed in these pixels
OG = (1200, 630)  # 1.91:1, the card every platform crops to

# ── Palette ──────────────────────────────────────────────────────────────────
# Sampled from the artwork: the gold is the dot in the wordmark and the rule above it;
# the off-white is the original card's body copy, which is warm rather than pure white.
GOLD = (220, 149, 55)
OFFWHITE = (233, 224, 226)

# ── Typography ───────────────────────────────────────────────────────────────
# The site's font files are subsets: the Cyrillic one has no punctuation, the Latin one
# has it — exactly the split the browser resolves through `unicode-range`. The renderer
# below reproduces that fallback instead of shipping a second copy of the font.
FONT_DIR = ROOT / "public/fonts"
FONT_FILES = ["geologica-cyrillic.woff2", "geologica-latin.woff2"]

# ── Copy ─────────────────────────────────────────────────────────────────────
# One entry per line: the copy is short and where it breaks is a design decision, not
# something the script should search for. `gap` is the baseline distance to the line above,
# `tracking` adds space between glyphs (which also drops their kerning).
X0 = 177  # left edge of the copy column, shared with the wordmark
FIRST_BASELINE = 709  # where the original subtitle started, which fixes the title gap
LEAD = 82  # line height, as in the original card
SIZE = 58  # body size, as in the original card
SAFE_RIGHT = 1400  # past this the photograph lightens and the copy loses contrast


@dataclass(frozen=True)
class Line:
    text: str
    weight: int
    colour: tuple[int, int, int]
    size: float = SIZE
    tracking: float = 0.0
    gap: float = LEAD  # baseline distance to the line above


COPY = [
    Line("Најди библиотека најблиску до тебе.", 400, OFFWHITE),
    Line("Зачлени се. Читај.", 600, GOLD),
    # the address sits on its own beat below the call to action: smaller, so it signs the
    # card off rather than competing with it
    Line("https://biblioteki.mk", 500, OFFWHITE, size=40, tracking=0.5, gap=109),
]


# ── Fonts ────────────────────────────────────────────────────────────────────
def unpack_fonts(tmp: Path) -> list[tuple[str, set[int]]]:
    """Unpack the site's woff2 subsets and return (ttf path, codepoints) pairs.

    FreeType cannot read woff2, so the files are converted once per run. The codepoint
    sets drive the fallback: each run is drawn with the first file that has its glyphs.
    """
    try:
        from fontTools.ttLib import TTFont
    except ImportError:  # pragma: no cover - environment guard
        sys.exit("gen-social-card: needs fontTools (pip install fonttools brotli)")

    faces = []
    for name in FONT_FILES:
        src = FONT_DIR / name
        if not src.exists():
            sys.exit(f"gen-social-card: missing {src.relative_to(ROOT)}")
        try:
            font = TTFont(src)
        except ImportError:  # fontTools needs brotli to inflate woff2
            sys.exit("gen-social-card: cannot unpack woff2 — is brotli installed?")
        except Exception as err:  # corrupt or unsupported file: say what actually failed
            sys.exit(f"gen-social-card: cannot read {src.relative_to(ROOT)}: {err}")
        font.flavor = None
        dst = tmp / (Path(name).stem + ".ttf")
        font.save(dst)
        faces.append((str(dst), set(font.getBestCmap())))
    return faces


class Typeface:
    """Geologica at a given weight, falling back between the subsets it ships in."""

    def __init__(self, faces: list[tuple[str, set[int]]]):
        self.faces = faces
        self._fonts: dict[tuple[int, int, float], ImageFont.FreeTypeFont] = {}

    def font(self, face: int, weight: int, size: float = SIZE) -> ImageFont.FreeTypeFont:
        key = (face, weight, size)
        if key not in self._fonts:
            f = ImageFont.truetype(self.faces[face][0], size)
            f.set_variation_by_axes([weight])  # Geologica is variable: wght 100-900
            self._fonts[key] = f
        return self._fonts[key]

    def runs(self, text: str) -> list[tuple[int, str]]:
        """Split `text` into (face index, run) pairs, one face per run."""
        out: list[tuple[int, str]] = []
        for ch in text:
            idx = next((i for i, (_, cmap) in enumerate(self.faces) if ord(ch) in cmap), None)
            if idx is None:
                sys.exit(f"gen-social-card: no glyph for {ch!r} in {FONT_FILES}")
            if out and out[-1][0] == idx:
                out[-1] = (idx, out[-1][1] + ch)
            else:
                out.append((idx, ch))
        return out

    def width(self, text: str, weight: int, size: float = SIZE, tracking: float = 0.0) -> float:
        return self.layout(text, weight, size, tracking)[1]

    def layout(
        self, text: str, weight: int, size: float = SIZE, tracking: float = 0.0
    ) -> tuple[list[tuple[float, ImageFont.FreeTypeFont, str]], float]:
        """Return [(x offset, font, chunk)] and the final cursor.

        Drawing and measuring go through the same pass, so what the safe-area checks
        measure is exactly what ends up on the canvas.
        """
        chunks: list[tuple[float, ImageFont.FreeTypeFont, str]] = []
        x = 0.0
        for face, run in self.runs(text):
            f = self.font(face, weight, size)
            if tracking:
                # letter-spaced runs are placed glyph by glyph; kerning is dropped on purpose
                for ch in run:
                    chunks.append((x, f, ch))
                    x += f.getlength(ch) + tracking
            else:
                chunks.append((x, f, run))
                x += f.getlength(run)
        return chunks, x

    def draw_line(
        self,
        d: ImageDraw.ImageDraw,
        text: str,
        x: float,
        baseline: float,
        weight: int,
        colour: tuple[int, int, int],
        size: float = SIZE,
        tracking: float = 0.0,
    ) -> None:
        chunks, _ = self.layout(text, weight, size, tracking)
        for dx, f, chunk in chunks:
            d.text((x + dx, baseline), chunk, font=f, fill=colour, anchor="ls")


# ── Compose ──────────────────────────────────────────────────────────────────
def main(argv: list[str]) -> None:
    check = "--check" in argv
    unknown = [a for a in argv if a != "--check"]
    if unknown:
        sys.exit(f"gen-social-card: unknown argument {unknown[0]!r}")

    if not PLATE.exists():
        sys.exit(f"gen-social-card: missing plate {PLATE.relative_to(ROOT)}")
    if not COPY:
        sys.exit("gen-social-card: COPY is empty, there is nothing to draw")

    plate = Image.open(PLATE).convert("RGB")
    if plate.size != (W, H):
        sys.exit(f"gen-social-card: plate is {plate.size}, expected {(W, H)}")

    d = ImageDraw.Draw(plate)
    right = 0.0
    baseline = FIRST_BASELINE
    # the temporary directory has to outlive the drawing: the unpacked fonts are loaded
    # lazily, per face, weight and size
    with tempfile.TemporaryDirectory() as tmp:
        type_ = Typeface(unpack_fonts(Path(tmp)))
        for i, line in enumerate(COPY):
            if i:
                baseline += line.gap
            type_.draw_line(d, line.text, X0, baseline, line.weight, line.colour, line.size, line.tracking)
            right = max(right, X0 + type_.width(line.text, line.weight, line.size, line.tracking))

    last = COPY[-1]
    if right > SAFE_RIGHT:
        sys.exit(f"gen-social-card: copy reaches x={right:.0f}, past the safe area ({SAFE_RIGHT})")
    if baseline + last.size * 0.25 > H:  # the deepest descender sits ~0.2em below the baseline
        sys.exit("gen-social-card: copy runs off the bottom of the card")

    outputs = [(POST_OUT, plate), (OG_OUT, plate.resize(OG, Image.LANCZOS))]

    if check:  # verify the committed files without touching them
        for path, image in outputs:
            buffer = io.BytesIO()
            image.save(buffer, "PNG", optimize=True)
            if not path.exists():
                sys.exit(f"gen-social-card: {path.relative_to(ROOT)} is missing")
            if path.read_bytes() != buffer.getvalue():
                sys.exit(f"gen-social-card: {path.relative_to(ROOT)} is stale — run npm run social:build")
        print("social card: up to date")
        return

    for path, image in outputs:
        path.parent.mkdir(parents=True, exist_ok=True)
        image.save(path, optimize=True)
        kb = path.stat().st_size / 1024
        print(f"{path.relative_to(ROOT)}: {image.size[0]}x{image.size[1]}, {kb:.0f} KB")
    print(f"  copy: {len(COPY)} lines, widest x={right:.0f} (safe {SAFE_RIGHT}), last baseline y={baseline}")


if __name__ == "__main__":
    main(sys.argv[1:])
