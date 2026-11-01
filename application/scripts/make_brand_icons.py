from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "images"
PUBLIC = ROOT / "public" / "assets"
SOURCE = ASSETS / "guardian.png"


def contain(source: Image.Image, size: int, padding: float, background):
    canvas = Image.new("RGBA", (size, size), background)
    max_side = int(size * (1 - padding * 2))
    image = source.copy()
    image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - image.width) // 2
    y = (size - image.height) // 2
    canvas.alpha_composite(image, (x, y))
    return canvas


source = Image.open(SOURCE).convert("RGBA")

contain(source, 1024, 0.08, (5, 8, 17, 255)).convert("RGB").save(ASSETS / "icon.png", quality=95)
contain(source, 1024, 0.18, (5, 8, 17, 255)).convert("RGB").save(ASSETS / "splash-icon.png", quality=95)
contain(source, 432, 0.17, (0, 0, 0, 0)).save(ASSETS / "android-icon-foreground.png")
Image.new("RGBA", (432, 432), (5, 8, 17, 255)).save(ASSETS / "android-icon-background.png")

foreground = contain(source, 432, 0.17, (0, 0, 0, 0))
alpha = foreground.getchannel("A")
mono = Image.new("RGBA", foreground.size, (255, 255, 255, 0))
mono.putalpha(alpha)
mono.save(ASSETS / "android-icon-monochrome.png")

contain(source, 64, 0.06, (5, 8, 17, 255)).convert("RGB").save(ASSETS / "favicon.png")

PUBLIC.mkdir(parents=True, exist_ok=True)
contain(source, 192, 0.08, (5, 8, 17, 255)).convert("RGB").save(PUBLIC / "icon-192.png")
contain(source, 512, 0.08, (5, 8, 17, 255)).convert("RGB").save(PUBLIC / "icon-512.png")

for filename in [
    "icon.png",
    "splash-icon.png",
    "android-icon-foreground.png",
    "android-icon-background.png",
    "android-icon-monochrome.png",
    "favicon.png",
]:
    image = Image.open(ASSETS / filename)
    print(f"{filename}: {image.size} {image.mode}")
