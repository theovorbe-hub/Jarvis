"""Vidéo d'ouverture Belle Saison : plan-séquence en boucle à partir d'une photo.

Mouvements de caméra virtuels (travelling avant, glissement latéral, rapproché,
retour au plan large) calculés image par image avec une précision inférieure au
pixel, puis encodés en MP4 H.264 par ffmpeg. Aucune IA générative : les motifs,
la lumière et le mobilier restent exactement ceux de la photo.

La trajectoire est une courbe fermée (Catmull-Rom périodique) : la dernière image
rejoint la première, vitesse comprise, pour une boucle sans raccord visible.

Usage :
  python3 make-hero-video.py photo.jpg sortie/        # versions ordinateur et mobile
Nécessite Pillow et ffmpeg.
"""
import math
import subprocess
import sys
from pathlib import Path

from PIL import Image

FPS = 25
DURATION = 20  # secondes

# Images clés en coordonnées de la photo source (1672 x 941) :
# (centre x, centre y, largeur du cadre). La hauteur suit le format de sortie.
# Version ordinateur 16:9 : les 4 séquences du brief.
KEYS_DESKTOP = [
    (836, 470, 1600),   # 0 s  : vue d'ensemble du salon (marge gardée autour du cadre)
    (832, 456, 1480),   # 5 s  : travelling avant vers la porte et la lumière
    (960, 432, 1360),   # 10 s : glissement vers le mur tapissé, tableau et lampe
    (1040, 404, 1250),  # 15 s : rapproché sur le motif, le cadre doré et la cheminée
]
# Version mobile 9:16 : même récit dans un cadre vertical.
KEYS_MOBILE = [
    (820, 470, 500),    # la porte et la salle à manger lumineuse
    (860, 462, 486),
    (1060, 444, 470),   # le mur tapissé et la lampe
    (1170, 412, 452),   # le cadre doré et le motif
]


def catmull_rom(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)


def camera(keys, u):
    """Position de caméra pour u dans [0, 1[ sur une boucle fermée."""
    n = len(keys)
    x = u * n
    i = int(math.floor(x)) % n
    t = x - math.floor(x)
    pts = [keys[(i + k) % n] for k in (-1, 0, 1, 2)]
    cx = catmull_rom(*(p[0] for p in pts), t)
    cy = catmull_rom(*(p[1] for p in pts), t)
    # Le zoom est interpolé en échelle logarithmique pour une vitesse perçue régulière.
    w = math.exp(catmull_rom(*(math.log(p[2]) for p in pts), t))
    return cx, cy, w


def speed_report(keys, size, src_size):
    """Vitesse de la caméra en pixels de sortie par image (contrôle du « très lent »)."""
    out_w, out_h = size
    aspect = out_w / out_h
    frames = FPS * DURATION
    prev, speeds = None, []
    for f in range(frames + 1):
        cx, cy, w = camera(keys, (f % frames) / frames)
        if w > src_size[0] or w / aspect > src_size[1]:
            raise SystemExit(f"Cadre hors de la photo à l'image {f} : réduire la largeur des images clés.")
        if prev:
            scale = out_w / w
            speeds.append((math.hypot(cx - prev[0], cy - prev[1]) + abs(w - prev[2]) / 2) * scale)
        prev = (cx, cy, w)
    return max(speeds), sum(speeds) / len(speeds)


def render(src, keys, size, out_path, crf):
    out_w, out_h = size
    aspect = out_w / out_h
    src_w, src_h = src.size
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{out_w}x{out_h}", "-r", str(FPS), "-i", "-",
        "-vf", "unsharp=5:5:0.35:5:5:0",
        "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-profile:v", "high",
        "-pix_fmt", "yuv420p", "-g", str(FPS * 2), "-movflags", "+faststart", "-an", str(out_path),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    frames = FPS * DURATION
    for f in range(frames):
        cx, cy, w = camera(keys, f / frames)
        h = w / aspect
        # Le cadre reste toujours dans la photo (pas de bord vide).
        w, h = min(w, src_w, src_h * aspect), min(h, src_h, src_w / aspect)
        x0 = min(max(cx - w / 2, 0), src_w - w)
        y0 = min(max(cy - h / 2, 0), src_h - h)
        frame = src.resize((out_w, out_h), Image.LANCZOS, box=(x0, y0, x0 + w, y0 + h))
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit(f"ffmpeg a échoué pour {out_path}")


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    src = Image.open(sys.argv[1]).convert("RGB")
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    for keys, size, name, crf in (
        (KEYS_DESKTOP, (1920, 1080), "belle-saison-ouverture-1920x1080.mp4", 23),
        (KEYS_MOBILE, (720, 1280), "belle-saison-ouverture-mobile-720x1280.mp4", 23),
    ):
        top, mean = speed_report(keys, size, src.size)
        print(f"{name} : vitesse moyenne {mean:.1f} px/image, maximale {top:.1f} px/image")
        render(src, keys, size, out / name, crf)
    # Image de couverture affichée pendant le chargement (première image de la boucle).
    poster = src.resize((1920, round(1920 * src.size[1] / src.size[0])), Image.LANCZOS)
    poster.save(out / "belle-saison-ouverture-couverture.jpg", quality=86, optimize=True, progressive=True)
    print(f"Vidéos et image de couverture écrites dans {out}")


if __name__ == "__main__":
    main()
