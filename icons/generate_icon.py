"""Erzeugt die App-Icons (Schallplatte mit «?»-Etikett) für Jahrgang."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
BG, AMBER, CORAL, INK = (28, 15, 38), (255, 178, 63), (255, 93, 115), (42, 7, 16)


def icon(size: int) -> Image.Image:
    s = size * 4  # supersampling
    im = Image.new("RGB", (s, s), BG)
    d = ImageDraw.Draw(im)
    # sanfter Farbschein oben links
    for r in range(int(s * 0.9), 0, -8):
        t = r / (s * 0.9)
        col = tuple(int(BG[k] + ((74, 29, 79)[k] - BG[k]) * (1 - t) * 0.9) for k in range(3))
        d.ellipse([-r * 0.3, -r * 0.3, r * 1.1, r * 1.1], fill=col)
    c, R = s / 2, s * 0.40  # Platte bleibt in der Maskable-Safe-Zone
    d.ellipse([c - R, c - R, c + R, c + R], fill=(14, 14, 14))
    # dezentes Glanzlicht unter den Rillen
    d.pieslice([c - R, c - R, c + R, c + R], 205, 230, fill=(30, 28, 32))
    d.pieslice([c - R, c - R, c + R, c + R], 25, 50, fill=(26, 24, 28))
    for i, rr in enumerate(range(int(R * 0.98), int(R * 0.36), -int(s * 0.012))):
        d.ellipse([c - rr, c - rr, c + rr, c + rr], outline=(40, 38, 42) if i % 2 else (20, 20, 20), width=max(2, s // 300))
    L = R * 0.36
    d.ellipse([c - L, c - L, c + L, c + L], fill=CORAL, outline=AMBER, width=s // 70)
    font = None
    for name in ("DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        try:
            font = ImageFont.truetype(name, int(L * 1.25))
            break
        except OSError:
            pass
    font = font or ImageFont.load_default()
    d.text((c, c + s * 0.005), "?", fill=INK, font=font, anchor="mm")
    return im.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    for n in (180, 192, 512):
        icon(n).save(HERE / f"icon-{n}.png", optimize=True)
    print("Icons geschrieben.")
