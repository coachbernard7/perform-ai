from pathlib import Path
from PIL import Image

path = Path(__file__).resolve().parents[1] / "assets" / "images" / "guardian.png"
image = Image.open(path).convert("RGBA")
image.thumbnail((720, 1044), Image.Resampling.LANCZOS)
image.save(path, format="PNG", optimize=True, compress_level=9)
print(f"guardian.png: {image.size}, {path.stat().st_size} bytes")
