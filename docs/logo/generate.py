"""Final 'Gapura Lapisan' masters for Arsitektur SPBE Gresik.

Construction (40-unit tile, same as components/brand/logo-geometry.ts):
five pill layers, height 4.4, gap 1.2, centred on x=20, widths 8/13/18/23/28 (step 5),
a 4.4-wide doorway splits the two base layers. Block shifted 0.4 up for optical centring.
Small cut (32-unit grid, pixel-aligned at 16/32 px): height 4, gap 2, widths 8/12/18/22/28, door 4.
"""
import json, os, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

C = {"tile": "#2D2D2F", "teal": "#00A6A6", "yellow": "#EFCA08", "amber": "#F49F0A", "orange": "#F08700", "sky": "#BBDEF0"}
ORDER = ["teal", "yellow", "amber", "orange", "sky"]


def bars(size, H, gap, widths, door, lift=0.0):
    top = (size - (5 * H + 4 * gap)) / 2 - lift
    cx = size / 2
    out = []
    for i, w in enumerate(widths):
        y = round(top + i * (H + gap), 2)
        if i >= 3:
            half = round((w - door) / 2, 2)
            out.append({"row": i, "x": round(cx - w / 2, 2), "y": y, "w": half, "color": ORDER[i]})
            out.append({"row": i, "x": round(cx + door / 2, 2), "y": y, "w": half, "color": ORDER[i]})
        else:
            out.append({"row": i, "x": round(cx - w / 2, 2), "y": y, "w": w, "color": ORDER[i]})
    return out


MAIN = dict(size=40, H=4.4, gap=1.2, widths=[8, 13, 18, 23, 28], door=4.4, lift=0.4)
SMALL = dict(size=32, H=4, gap=2, widths=[8, 12, 18, 22, 28], door=4, lift=0)


def svg(spec, tile=True, mono=None, title="Arsitektur SPBE"):
    s, H = spec["size"], spec["H"]
    b = bars(s, H, spec["gap"], spec["widths"], spec["door"], spec["lift"])
    rects = "".join(
        f'<rect x="{r["x"]}" y="{r["y"]}" width="{r["w"]}" height="{H}" rx="{H/2}" fill="{mono or C[r["color"]]}"/>' for r in b
    )
    bg = f'<rect width="{s}" height="{s}" rx="{s/4}" fill="{C["tile"]}"/>' if tile else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {s} {s}" width="256" height="256"><title>{title}</title>{bg}{rects}</svg>'


def lockup(stacked=False, dark=False):
    mark = svg(MAIN).split(">", 1)[1].rsplit("</svg>", 1)[0].replace("<title>Arsitektur SPBE</title>", "")
    ink = "#FFFFFF" if dark else C["tile"]
    sub = "#BBDEF0" if dark else "#6B6B70"
    font = "Plus Jakarta Sans, Arial, sans-serif"
    if stacked:
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 150" width="720" height="450"><title>Arsitektur SPBE Kabupaten Gresik</title>'
                f'<g transform="translate(96 4) scale(1.2)">{mark}</g>'
                f'<text x="120" y="88" text-anchor="middle" font-family="{font}" font-weight="800" font-size="24" letter-spacing="-0.5" fill="{ink}">Arsitektur SPBE</text>'
                f'<text x="120" y="110" text-anchor="middle" font-family="{font}" font-weight="500" font-size="13" fill="{sub}">Kabupaten Gresik</text></svg>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 48" width="920" height="192"><title>Arsitektur SPBE Kabupaten Gresik</title>'
            f'<g transform="translate(4 4)">{mark}</g>'
            f'<text x="56" y="24" font-family="{font}" font-weight="800" font-size="19" letter-spacing="-0.4" fill="{ink}">Arsitektur SPBE</text>'
            f'<text x="56" y="40" font-family="{font}" font-weight="500" font-size="11.5" fill="{sub}">Kabupaten Gresik</text></svg>')


files = {
    "symbol-color.svg": svg(MAIN),
    "symbol-black.svg": svg(MAIN, tile=False, mono="#000000"),
    "symbol-charcoal.svg": svg(MAIN, tile=False, mono=C["tile"]),
    # Reversed: bars 0.2 thinner (gap grows) to offset irradiation on dark grounds.
    "symbol-white.svg": svg(dict(MAIN, H=4.2, gap=1.45), tile=False, mono="#FFFFFF"),
    "symbol-teal.svg": svg(MAIN, tile=False, mono=C["teal"]),
    "symbol-layers-only.svg": svg(MAIN, tile=False),
    "symbol-small.svg": svg(SMALL),
    "lockup-horizontal.svg": lockup(),
    "lockup-horizontal-dark.svg": lockup(dark=True),
    "lockup-stacked.svg": lockup(stacked=True),
}
for name, body in files.items():
    open(os.path.join(OUT, name), "w", encoding="utf-8").write(body)

json.dump({"main": bars(**{k: MAIN[k] for k in MAIN}), "small": bars(**SMALL)}, open(os.path.join(OUT, "geometry.json"), "w"), indent=1)
print("\n".join(files))
