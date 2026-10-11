"""Vidéo d'ouverture Belle Saison : plan-séquence en boucle à partir d'une photo.

Mouvements de caméra virtuels (travelling avant, glissement latéral, rapproché,
retour au plan large) calculés image par image avec une précision inférieure au
pixel, puis encodés en MP4 H.264 par ffmpeg. Aucune IA générative : les motifs,
la lumière et le mobilier restent exactement ceux de la photo.

La trajectoire est une courbe fermée (Catmull-Rom périodique) : la dernière image
rejoint la première, vitesse comprise, pour une boucle sans raccord visible.

Usage :
  python3 make-hero-video.py photo.jpg sortie/                      # boucle sur une photo (ordinateur + mobile)
  python3 make-hero-video.py --montage photo.jpg bandes.png sortie/ # montage 4 plans (ordinateur)
« bandes.png » est une image composée de plusieurs photos panoramiques empilées, séparées
par un filet clair (format fourni par le générateur d'images) ; elles sont découpées
automatiquement.
Nécessite Pillow et ffmpeg.
"""
import math
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageFilter

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


# ---------------------------------------------------------------------------
# Montage en plusieurs plans (brief « vidéo cinématographique », 4 séquences)
# ---------------------------------------------------------------------------
CROSSFADE = 20  # images (0,8 s)

# (source, cadre de départ, cadre d'arrivée, durée en images, netteté ajoutée en %)
# Les cadres sont (centre x, centre y, largeur) dans la photo source.
MONTAGE_SHOTS = [
    ("photo", (836, 470, 1600), (820, 455, 1460), 140, 30),  # 1. travelling avant dans le salon
    ("bande1", (1000, 179, 636), (1170, 176, 612), 145, 60), # 2. glissement le long du papier peint toile
    ("bande2", (1150, 132, 471), (1030, 130, 455), 145, 55), # 3. gros plan texture et feuillages
    ("bande3", (900, 160, 500), (880, 154, 547), 130, 60),   # 4. recul dans la chambre
]


def split_strips(image, threshold=230):
    """Découpe une image composée de bandes séparées par des filets clairs."""
    rows = [sum(image.crop((0, y, image.width, y + 1)).resize((1, 1), Image.BOX).getpixel((0, 0))) / 3 for y in range(image.height)]
    separators = [y for y, value in enumerate(rows) if value > threshold]
    strips, start = [], 0
    for y in separators + [image.height]:
        if y - start > 40:
            strips.append(image.crop((0, start + 2, image.width, y - 2)))
        start = y + 1
    return strips


def smooth(t):
    return t * t * (3 - 2 * t)


def frame_of(src, a, b, u, size, sharpen):
    out_w, out_h = size
    aspect = out_w / out_h
    e = smooth(u)
    cx, cy = a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e
    w = math.exp(math.log(a[2]) + (math.log(b[2]) - math.log(a[2])) * e)
    w = min(w, src.width, src.height * aspect)
    h = w / aspect
    x0 = min(max(cx - w / 2, 0), src.width - w)
    y0 = min(max(cy - h / 2, 0), src.height - h)
    frame = src.resize(size, Image.LANCZOS, box=(x0, y0, x0 + w, y0 + h))
    if sharpen:
        frame = frame.filter(ImageFilter.UnsharpMask(radius=2, percent=sharpen, threshold=2))
    return frame


def render_montage(sources, size, out_path, crf):
    out_w, out_h = size
    total = FPS * DURATION
    starts, t = [], 0
    for shot in MONTAGE_SHOTS:
        starts.append(t)
        t += shot[3] - CROSSFADE
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{out_w}x{out_h}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-profile:v", "high",
        "-pix_fmt", "yuv420p", "-g", str(FPS * 2), "-movflags", "+faststart", "-an", str(out_path),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    first = MONTAGE_SHOTS[0]
    loop_frame = frame_of(sources[first[0]], first[1], first[2], 0, size, first[4])
    for f in range(total):
        layers = []
        for (name, a, b, length, sharpen), start in zip(MONTAGE_SHOTS, starts):
            if start <= f < start + length:
                weight = 1.0
                if f >= start + length - CROSSFADE and name != MONTAGE_SHOTS[-1][0]:
                    weight = (start + length - f) / CROSSFADE
                layers.append((frame_of(sources[name], a, b, (f - start) / (length - 1), size, sharpen), weight))
        frame = layers[0][0]
        if len(layers) > 1:
            frame = Image.blend(layers[1][0], layers[0][0], smooth(layers[0][1]))
        # Fondu final vers la toute première image : la boucle repart sans raccord visible.
        if f >= total - CROSSFADE:
            frame = Image.blend(frame, loop_frame, smooth((f - (total - CROSSFADE) + 1) / CROSSFADE))
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit(f"ffmpeg a échoué pour {out_path}")
    end = starts[-1] + MONTAGE_SHOTS[-1][3]
    if end != total:
        raise SystemExit(f"Durée du montage incohérente : {end} images au lieu de {total}.")


def main():
    if len(sys.argv) == 5 and sys.argv[1] == "--montage":
        photo = Image.open(sys.argv[2]).convert("RGB")
        strips = split_strips(Image.open(sys.argv[3]).convert("RGB"))
        if len(strips) < 3:
            raise SystemExit(f"{len(strips)} bande(s) trouvée(s) dans {sys.argv[3]}, 3 attendues.")
        sources = {"photo": photo, "bande1": strips[0], "bande2": strips[1], "bande3": strips[2]}
        print("Bandes découpées :", ", ".join(f"{im.width}x{im.height}" for im in strips))
        out = Path(sys.argv[4])
        out.mkdir(parents=True, exist_ok=True)
        render_montage(sources, (1920, 1080), out / "belle-saison-ouverture-montage-1920x1080.mp4", crf=23)
        print(f"Montage écrit dans {out}")
        return
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
