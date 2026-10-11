"""Vidéos d'ouverture Belle Saison, rendu « film » à partir de vraies photos.

Chaque plan est une caméra virtuelle qui se déplace très lentement dans une photo :
- profondeur : une carte de profondeur (voir profondeur.py) fait bouger les premiers plans
  plus vite que le fond (parallaxe) et grossir ce qui est proche quand la caméra avance ;
- mise au point : flou de profondeur de champ, avec bascule de point d'un plan à l'autre ;
- image film : étalonnage (noirs veloutés et verts profonds, hautes lumières ambrées),
  diffusion des hautes lumières, halo chaud, vignettage, légère aberration et grain ;
- caméra portée : un flottement à peine perceptible, comme sur un stabilisateur.
Aucune IA générative : motifs, couleurs et mobilier restent ceux des photos.

Usage (depuis belle-saison/) :
  python3 tools/make-hero-video.py montage sortie/   # ordinateur, 4 plans enchaînés en fondu
  python3 tools/make-hero-video.py boucle sortie/    # salon seul : ordinateur et mobile
  python3 tools/make-hero-video.py profondeur modele.onnx photo.jpg [...]  # recalcule les cartes
  python3 tools/make-hero-video.py bandes image.png  # découpe une image faite de photos empilées
Nécessite numpy, Pillow, opencv-python-headless et ffmpeg (onnxruntime pour « profondeur »).
"""
import math
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import profondeur  # noqa: E402

MEDIA = Path(__file__).resolve().parent.parent / "media"
FPS = 24
DURATION = 20  # secondes
DISSOLVE = 24  # images (1 s) entre deux plans et au raccord de la boucle

# Image « film ». Les rayons et le flou sont donnés pour une image de 1920 px de large.
LOOK = {
    "parallax": 0.32,    # déplacement en plus des premiers plans, par rapport au fond
    "dolly": 1.1,        # grossissement en plus des premiers plans quand la caméra avance
    "mist": 0.16,        # diffusion des hautes lumières (filtre « mist »)
    "halation": 0.10,    # halo chaud autour des sources lumineuses
    "vignette": 0.22,
    "aberration": 0.8,   # pixels, au bord de l'image
    "grain": 0.016,
    "float": 0.0012,     # flottement de la caméra (part de la largeur du cadre)
    "roll": 0.06,        # roulis en degrés
}


@dataclass
class Shot:
    image: str
    start: tuple  # (centre x, centre y, largeur) en fractions de la photo (x et largeur : de sa largeur)
    end: tuple
    focus: tuple  # point net (x, y) en fractions de la photo, ou deux points pour une bascule de point
    aperture: float  # flou maximal (sigma en pixels pour 1920 px de large)
    frames: int = 0


# Montage ordinateur : les 4 séquences du brief (24 i/s, plans de 5,75 s, fondus de 1 s).
MONTAGE = [
    # 1. Travelling avant dans le salon, la porte et la lumière.
    Shot("salon-ouverture-source.jpg", (0.500, 0.4995, 0.957), (0.492, 0.484, 0.870), ((0.80, 0.32),), 4.0, 138),
    # 2. Glissement latéral le long du mur tapissé de toile ; le point passe du bouquet au mur.
    Shot("montage-2-salon-toile.png", (0.598, 0.50, 0.355), (0.700, 0.49, 0.340), ((0.575, 0.66), (0.74, 0.22)), 6.0, 138),
    # 3. Gros plan sur la matière du papier peint ; le motif devient net.
    Shot("montage-3-detail-papier-peint.png", (0.520, 0.50, 0.262), (0.600, 0.49, 0.255), ((0.36, 0.55), (0.66, 0.45)), 7.0, 138),
    # 4. Recul lent dans la chambre, retour vers une vue d'ensemble.
    Shot("montage-4-chambre.png", (0.535, 0.50, 0.285), (0.525, 0.50, 0.312), ((0.55, 0.40),), 4.0, 138),
]

# Boucle sur une seule photo : trajectoire fermée (centre x, centre y, largeur) en pixels de
# la photo du salon (1672 x 941). La dernière image rejoint la première, vitesse comprise.
LOOP_IMAGE = "salon-ouverture-source.jpg"
LOOP_FOCUS = (0.80, 0.32)
KEYS_DESKTOP = [(836, 470, 1600), (832, 456, 1480), (960, 432, 1360), (1040, 404, 1250)]
KEYS_MOBILE = [(820, 470, 500), (860, 462, 486), (1060, 444, 470), (1170, 412, 452)]


# ---------------------------------------------------------------------------
# Photos et profondeur
# ---------------------------------------------------------------------------
class Source:
    """Photo en lumière linéaire et carte de profondeur, agrandies pour le cadre le plus serré."""

    def __init__(self, name, scale):
        image = Image.open(MEDIA / name).convert("RGB")
        self.orig_w, self.orig_h = image.size
        size = (round(image.width * scale), round(image.height * scale))
        self.scale = size[0] / image.width
        rgb = np.asarray(image.resize(size, Image.LANCZOS), dtype=np.float32) / 255
        self.linear = np.ascontiguousarray(rgb ** 2.2)
        depth = profondeur.load(MEDIA / "profondeur" / (Path(name).stem + ".png"), size)
        # Les premiers plans débordent légèrement et les transitions sont adoucies : les bords
        # des objets glissent sans se déchirer.
        k = max(3, int(size[0] * 0.006) | 1)
        depth = cv2.dilate(depth, np.ones((k, k), np.uint8))
        self.depth = cv2.GaussianBlur(depth, (0, 0), size[0] * 0.004)
        self.w, self.h = size

    def depth_at(self, point):
        x, y = int(point[0] * self.w), int(point[1] * self.h)
        r = max(2, self.w // 200)
        return float(np.median(self.depth[max(0, y - r):y + r, max(0, x - r):x + r]))


_sources = {}


def source(name, scale):
    key = (name, round(scale, 3))
    if key not in _sources:
        _sources[key] = Source(name, scale)
    return _sources[key]


# ---------------------------------------------------------------------------
# Caméra
# ---------------------------------------------------------------------------
def smoothstep(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def ease(t):
    """Vitesse presque constante, adoucie aux extrémités (le mouvement continue pendant les fondus)."""
    return 0.5 * t + 0.5 * smoothstep(t)


def float_offset(f, total):
    """Flottement de caméra périodique sur la durée de la vidéo : la boucle reste parfaite."""
    p = 2 * math.pi * f / total
    jx = 0.6 * math.sin(3 * p + 0.4) + 0.4 * math.sin(7 * p + 1.3)
    jy = 0.6 * math.sin(4 * p + 2.0) + 0.4 * math.sin(6 * p + 0.7)
    roll = 0.7 * math.sin(2 * p + 2.1) + 0.3 * math.sin(5 * p + 0.2)
    return jx, jy, roll


class Grid:
    def __init__(self, size):
        out_w, out_h = size
        xs = (np.arange(out_w, dtype=np.float32) + 0.5) - out_w / 2
        ys = (np.arange(out_h, dtype=np.float32) + 0.5) - out_h / 2
        self.gx, self.gy = np.meshgrid(xs, ys)
        self.size = size


def view(src, grid, cam, ref, anchor, focus, aperture, jitter):
    """Image (lumière linéaire) vue par la caméra cam = (cx, cy, largeur) en pixels de src."""
    out_w, out_h = grid.size
    cx, cy, w = cam
    jx, jy, roll = jitter
    cx += jx * LOOK["float"] * w
    cy += jy * LOOK["float"] * w
    s = w / out_w
    a = math.radians(roll * LOOK["roll"])
    ca, sa = math.cos(a), math.sin(a)
    bx = (grid.gx * ca - grid.gy * sa) * s
    by = (grid.gx * sa + grid.gy * ca) * s
    # Parallaxe : le déplacement de la caméra depuis sa position de référence décale les
    # premiers plans (profondeur > ancre) plus que le fond.
    dx, dy = (cx - ref[0]) * LOOK["parallax"], (cy - ref[1]) * LOOK["parallax"]
    dz = math.log(ref[2] / w) * LOOK["dolly"]
    mx, my = bx + cx, by + cy
    for _ in range(3):
        d = cv2.remap(src.depth, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101) - anchor
        g = 1.0 / (1.0 + dz * d)
        mx = cx + bx * g + dx * d
        my = cy + by * g + dy * d
    image = cv2.remap(src.linear, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT_101)
    np.clip(image, 0, None, out=image)
    depth = d + anchor
    # Profondeur de champ : flou croissant avec l'écart au plan net.
    k = out_w / 1920
    coc = np.clip(aperture * k * (np.abs(depth - focus) - 0.04) * 1.6, 0, aperture * k)
    sigmas = [0.0, 1.0 * k, 2.2 * k, 4.0 * k, 6.5 * k]
    sigmas = [sg for sg in sigmas if sg <= aperture * k + 1e-6] or [0.0]
    if len(sigmas) == 1:
        return image
    idx = np.interp(coc, sigmas, np.arange(len(sigmas), dtype=np.float32)).astype(np.float32)
    out = np.zeros_like(image)
    for i, sg in enumerate(sigmas):
        wgt = np.clip(1 - np.abs(idx - i), 0, 1)
        if not wgt.any():
            continue
        layer = image if sg == 0 else cv2.GaussianBlur(image, (0, 0), sg)
        out += layer * wgt[..., None]
    return out


# ---------------------------------------------------------------------------
# Image film
# ---------------------------------------------------------------------------
TONE_IN = np.array([0.0, 0.06, 0.18, 0.40, 0.62, 0.82, 1.0], np.float32)
TONE_OUT = np.array([0.028, 0.072, 0.17, 0.39, 0.635, 0.815, 0.965], np.float32)


class Look:
    def __init__(self, size, seed=7):
        out_w, out_h = size
        self.size = size
        self.k = out_w / 1920
        yy, xx = np.mgrid[0:out_h, 0:out_w].astype(np.float32)
        nx = (xx + 0.5) / out_w * 2 - 1
        ny = (yy + 0.5) / out_h * 2 - 1
        r = np.sqrt(nx ** 2 + ny ** 2) / math.sqrt(2)
        t = np.clip((r - 0.35) / 0.75, 0, 1)
        self.vignette = (1 - LOOK["vignette"] * t * t * (3 - 2 * t))[..., None].astype(np.float32)
        self.rng = np.random.default_rng(seed)

    def __call__(self, lin):
        out_w, out_h = self.size
        k = self.k
        # Aberration chromatique : rouge un peu agrandi, bleu un peu réduit, depuis le centre.
        ab = LOOK["aberration"] * k
        if ab > 0:
            for c, sign in ((0, 1), (2, -1)):
                sc = 1 + sign * ab / (out_w / 2)
                m = np.float32([[sc, 0, (1 - sc) * out_w / 2], [0, sc, (1 - sc) * out_h / 2]])
                lin[..., c] = cv2.warpAffine(lin[..., c], m, (out_w, out_h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
        lum = lin @ np.float32([0.2126, 0.7152, 0.0722])
        # Diffusion : les hautes lumières bavent doucement dans les ombres.
        small = cv2.resize(lin, (out_w // 4, out_h // 4), interpolation=cv2.INTER_AREA)
        glow = 0.6 * cv2.GaussianBlur(small, (0, 0), 6 * k) + 0.4 * cv2.GaussianBlur(small, (0, 0), 22 * k)
        glow = cv2.resize(glow, (out_w, out_h), interpolation=cv2.INTER_LINEAR)
        lin = lin + LOOK["mist"] * np.maximum(glow - lin, 0)
        # Halo chaud autour des sources lumineuses (fenêtres, lampes, bougies).
        hot = np.clip((lum - 0.55) / 0.45, 0, 1)
        hot = cv2.resize(hot, (out_w // 2, out_h // 2), interpolation=cv2.INTER_AREA)
        hot = cv2.resize(cv2.GaussianBlur(hot, (0, 0), 5 * k), (out_w, out_h), interpolation=cv2.INTER_LINEAR)
        lin = lin + LOOK["halation"] * hot[..., None] * np.float32([1.0, 0.42, 0.16])
        lin *= self.vignette
        # Courbe film : noirs relevés, contraste doux, hautes lumières arrondies.
        img = np.clip(lin, 0, 1) ** (1 / 2.2)
        img = np.interp(img, TONE_IN, TONE_OUT).astype(np.float32)
        # Virage : ombres vers le vert forêt, hautes lumières ambrées ; saturation un peu retenue.
        y = img @ np.float32([0.2126, 0.7152, 0.0722])
        shadow = ((1 - y) ** 2)[..., None]
        light = (y ** 2)[..., None]
        img = img + shadow * np.float32([-0.016, 0.006, 0.002]) + light * np.float32([0.016, 0.004, -0.022])
        img = y[..., None] + (img - y[..., None]) * 0.9
        # Grain : plus marqué dans les tons moyens, comme sur une pellicule.
        if LOOK["grain"] > 0:
            noise = self.rng.standard_normal((out_h // 2, out_w // 2)).astype(np.float32)
            noise = cv2.resize(noise, (out_w, out_h), interpolation=cv2.INTER_LINEAR)
            img = img + (LOOK["grain"] * (0.45 + 2.2 * y * (1 - y)) * noise)[..., None]
        return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def to_display(lin):
    """Image linéaire vers 8 bits, sans traitement film (contrôles)."""
    return (np.clip(lin, 0, 1) ** (1 / 2.2) * 255 + 0.5).astype(np.uint8)


# ---------------------------------------------------------------------------
# Encodage
# ---------------------------------------------------------------------------
class Encoder:
    def __init__(self, path, size, crf):
        self.path = path
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{size[0]}x{size[1]}", "-r", str(FPS), "-i", "-",
            "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-profile:v", "high",
            "-pix_fmt", "yuv420p", "-g", str(FPS * 2), "-movflags", "+faststart", "-an", str(path),
        ]
        self.proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    def write(self, frame):
        self.proc.stdin.write(frame.tobytes())

    def close(self):
        self.proc.stdin.close()
        if self.proc.wait() != 0:
            raise SystemExit(f"ffmpeg a échoué pour {self.path}")
        print(f"{self.path.name} : {self.path.stat().st_size / 1e6:.1f} Mo")


# ---------------------------------------------------------------------------
# Montage et boucle
# ---------------------------------------------------------------------------
def shot_frame(shot, src, grid, t, jitter):
    def to_px(c):
        return c[0] * src.w, c[1] * src.h, c[2] * src.w

    a, b = to_px(shot.start), to_px(shot.end)
    e = ease(t)
    cam = (a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, math.exp(math.log(a[2]) + (math.log(b[2]) - math.log(a[2])) * e))
    ref = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, math.sqrt(a[2] * b[2]))
    anchor = src.depth_at(shot.focus[-1])
    if len(shot.focus) == 2:
        # Bascule de point entre 25 % et 70 % du plan.
        f0, f1 = src.depth_at(shot.focus[0]), anchor
        focus = f0 + (f1 - f0) * smoothstep((t - 0.25) / 0.45)
    else:
        focus = anchor
    return view(src, grid, cam, ref, anchor, focus, shot.aperture, jitter)


def scale_for(shot_widths, image_w, out_w):
    """Agrandissement préalable pour que le cadre le plus serré soit au moins en 1:1."""
    return max(1.0, out_w / (min(shot_widths) * image_w) * 1.05)


def render_montage(out_dir, size=(1920, 1080), crf=25, name="belle-saison-ouverture-film-1920x1080.mp4"):
    total = FPS * DURATION
    starts, t = [], 0
    for shot in MONTAGE:
        starts.append(t)
        t += shot.frames - DISSOLVE
    if starts[-1] + MONTAGE[-1].frames != total:
        raise SystemExit("Durées des plans incohérentes avec la durée de la vidéo.")
    grid = Grid(size)
    look = Look(size)
    srcs = []
    for shot in MONTAGE:
        w = Image.open(MEDIA / shot.image).width
        srcs.append(source(shot.image, scale_for([shot.start[2], shot.end[2]], w, size[0])))
    first = shot_frame(MONTAGE[0], srcs[0], grid, 0.0, float_offset(0, total))
    enc = Encoder(out_dir / name, size, crf)
    began = time.time()
    poster = None
    for f in range(total):
        jitter = float_offset(f, total)
        layers = []
        for shot, src, start in zip(MONTAGE, srcs, starts):
            if start <= f < start + shot.frames:
                layers.append((shot_frame(shot, src, grid, (f - start) / (shot.frames - 1), jitter), start))
        lin = layers[0][0]
        if len(layers) > 1:
            # Fondu enchaîné en lumière linéaire, comme une surimpression en pellicule.
            u = smoothstep((f - layers[1][1] + 1) / (DISSOLVE + 1))
            lin = lin * (1 - u) + layers[1][0] * u
        if f >= total - DISSOLVE:
            u = smoothstep((f - (total - DISSOLVE) + 1) / (DISSOLVE + 1))
            lin = lin * (1 - u) + first * u
        frame = look(lin)
        if f == 0:
            poster = frame
        enc.write(frame)
        if f % 48 == 0:
            print(f"  image {f}/{total} ({time.time() - began:.0f} s)", flush=True)
    enc.close()
    return poster


def loop_camera(keys, u):
    n = len(keys)
    x = u * n
    i = int(math.floor(x)) % n
    t = x - math.floor(x)
    pts = [keys[(i + k) % n] for k in (-1, 0, 1, 2)]

    def cr(p0, p1, p2, p3):
        return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)

    cx = cr(*(p[0] for p in pts))
    cy = cr(*(p[1] for p in pts))
    w = math.exp(cr(*(math.log(p[2]) for p in pts)))
    return cx, cy, w


def render_loop(keys, out_path, size, crf):
    total = FPS * DURATION
    image_w = Image.open(MEDIA / LOOP_IMAGE).width
    src = source(LOOP_IMAGE, scale_for([k[2] / image_w for k in keys], image_w, size[0]))
    sc = src.scale
    pk = [(k[0] * sc, k[1] * sc, k[2] * sc) for k in keys]
    ref = (sum(k[0] for k in pk) / len(pk), sum(k[1] for k in pk) / len(pk), math.exp(sum(math.log(k[2]) for k in pk) / len(pk)))
    anchor = src.depth_at(LOOP_FOCUS)
    aperture = 4.0
    grid = Grid(size)
    look = Look(size)
    enc = Encoder(out_path, size, crf)
    poster = None
    for f in range(total):
        cx, cy, w = loop_camera(pk, f / total)
        h = w * size[1] / size[0]
        cx = min(max(cx, w / 2), src.w - w / 2)
        cy = min(max(cy, h / 2), src.h - h / 2)
        lin = view(src, grid, (cx, cy, w), ref, anchor, anchor, aperture, float_offset(f, total))
        frame = look(lin)
        if f == 0:
            poster = frame
        enc.write(frame)
    enc.close()
    return poster


def save_poster(frame, path):
    Image.fromarray(frame).save(path, quality=88, optimize=True, progressive=True)
    print(f"{path.name} : {path.stat().st_size / 1e6:.2f} Mo")


# ---------------------------------------------------------------------------
# Outils
# ---------------------------------------------------------------------------
def split_strips(image, threshold=230):
    """Découpe une image composée de photos empilées, séparées par des filets clairs."""
    rows = np.asarray(image.convert("L"), dtype=np.float32).mean(axis=1)
    separators = [y for y, value in enumerate(rows) if value > threshold]
    strips, start = [], 0
    for y in separators + [image.height]:
        if y - start > 40:
            strips.append(image.crop((0, start + 2, image.width, y - 2)))
        start = y + 1
    return strips


def main():
    args = sys.argv[1:]
    if len(args) == 2 and args[0] == "montage":
        out = Path(args[1])
        out.mkdir(parents=True, exist_ok=True)
        poster = render_montage(out)
        save_poster(poster, out / "belle-saison-ouverture-film-couverture.jpg")
    elif len(args) == 2 and args[0] == "boucle":
        out = Path(args[1])
        out.mkdir(parents=True, exist_ok=True)
        render_loop(KEYS_DESKTOP, out / "belle-saison-ouverture-film-boucle-1920x1080.mp4", (1920, 1080), 25)
        poster = render_loop(KEYS_MOBILE, out / "belle-saison-ouverture-film-mobile-720x1280.mp4", (720, 1280), 23)
        save_poster(poster, out / "belle-saison-ouverture-film-couverture-mobile.jpg")
    elif len(args) >= 3 and args[0] == "profondeur":
        (MEDIA / "profondeur").mkdir(exist_ok=True)
        for name in args[2:]:
            path = Path(name)
            depth = profondeur.estimate(Image.open(path).convert("RGB"), args[1])
            profondeur.save(depth, MEDIA / "profondeur" / (path.stem + ".png"))
            print(f"profondeur/{path.stem}.png")
    elif len(args) == 2 and args[0] == "bandes":
        for i, strip in enumerate(split_strips(Image.open(args[1]).convert("RGB")), 1):
            path = Path(args[1]).with_name(f"{Path(args[1]).stem}-{i}.png")
            strip.save(path, optimize=True)
            print(f"{path.name} : {strip.width} x {strip.height}")
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
