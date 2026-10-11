"""Découpe des images d'aperçu dans la maquette (docs/maquette.png).

Ces images servent uniquement à l'aperçu local (npm run preview) ; elles ne
sont jamais envoyées dans la boutique. Nécessite Pillow : pip install pillow.
Si ffmpeg est installé, une courte vidéo de démonstration (zoom lent) est aussi
créée pour tester les sections vidéo.
"""
import shutil
import subprocess
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE / "preview-out" / "img"
CROPS = {
    "hero": (560, 118, 1024, 478),
    "col1": (15, 716, 215, 908),
    "col2": (224, 716, 417, 908),
    "col3": (425, 716, 618, 908),
    "col4": (627, 716, 806, 908),
    "col5": (815, 716, 1010, 908),
    "story": (0, 1012, 560, 1256),
    "ins1": (0, 1332, 200, 1536),
    "ins2": (208, 1332, 408, 1536),
    "ins3": (416, 1332, 616, 1536),
    "ins4": (624, 1332, 826, 1536),
    "ins5": (834, 1332, 1024, 1536),
}

OUT.mkdir(parents=True, exist_ok=True)
mockup = Image.open(HERE.parent / "docs" / "maquette.png").convert("RGB")
for name, box in CROPS.items():
    crop = mockup.crop(box)
    scale = 4 if name == "hero" else 3
    crop.resize((crop.width * scale, crop.height * scale), Image.LANCZOS).save(OUT / f"{name}.jpg", quality=88)
print(f"{len(CROPS)} images écrites dans {OUT}")

if shutil.which("ffmpeg"):
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", str(OUT / "hero.jpg"),
            "-vf", "scale=3840:-2,zoompan=z='min(zoom+0.0005,1.08)':x='iw/2-(iw/zoom/2)'"
            ":y='ih/2-(ih/zoom/2)':d=150:s=1280x720:fps=25,format=yuv420p",
            "-t", "6", "-c:v", "libx264", "-crf", "24", "-an", str(OUT / "demo.mp4"),
        ],
        check=True,
    )
    print(f"Vidéo de démonstration écrite dans {OUT / 'demo.mp4'}")
else:
    print("ffmpeg absent : pas de vidéo de démonstration.")
