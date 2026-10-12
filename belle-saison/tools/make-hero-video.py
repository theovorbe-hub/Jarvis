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
  python3 tools/make-hero-video.py histoire sortie/  # « Notre histoire » : plans de media/histoire/, 4:3
  python3 tools/make-hero-video.py histoire-salon sortie/       # ancienne version (photos du salon)
  python3 tools/make-hero-video.py histoire-salon-jour sortie/  # la même, en lumière du jour
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
    # Étalonnage
    "exposure": 0.0,     # diaphragmes
    "white": (1.0, 1.0, 1.0),  # balance des blancs (gains rouge, vert, bleu en lumière linéaire)
    "tone": (0.028, 0.072, 0.17, 0.39, 0.635, 0.815, 0.965),  # courbe film (sorties)
    "shadow_tint": (-0.016, 0.006, 0.002),  # ombres vers le vert forêt
    "light_tint": (0.016, 0.004, -0.022),   # hautes lumières ambrées
    "saturation": 0.9,
}


@dataclass
class Shot:
    image: str
    start: tuple  # (centre x, centre y, largeur) en fractions de la photo (x et largeur : de sa largeur)
    end: tuple
    focus: tuple  # point net (x, y) en fractions de la photo, ou deux points pour une bascule de point
    aperture: float  # flou maximal (sigma en pixels pour 1920 px de large)
    frames: int = 0
    effects: tuple = ()  # vie dans la scène : Flame, Curtain
    dust: float = 0.0  # poussières dans la lumière
    shimmer: float = 0.0  # lumière tamisée par des feuillages qui bougent


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
# Vie dans la scène : de petits mouvements réels, là où ils existent vraiment
# ---------------------------------------------------------------------------
def _wave(t, parts):
    return sum(a * math.sin(2 * math.pi * f * t + p) for a, f, p in parts)


class Flame:
    """Flamme de bougie : elle vacille, se balance, et la lumière qu'elle répand respire.
    x, y en fractions de la photo, size = demi-largeur de la flamme (fraction de la largeur)."""

    def __init__(self, x, y, size, seed=0.0):
        self.x, self.y, self.size, self.seed = x, y, size, seed

    def bind(self, src):
        self.cx, self.cy, self.r = self.x * src.w, self.y * src.h, self.size * src.w
        return self

    def level(self, t):
        s = self.seed
        return _wave(t, ((0.5, 1.3, s), (0.3, 3.1, 2 * s + 1), (0.2, 7.7, 3 * s + 2)))

    def motion(self, mx, my, t, u):
        s = self.seed
        d2 = ((mx - self.cx) ** 2 + (my - self.cy + self.r) ** 2) / (2 * (1.6 * self.r) ** 2)
        w = np.exp(-d2)
        sway = _wave(t, ((0.6, 0.9, s), (0.4, 2.3, 1.7 * s + 0.5)))
        return w * (0.35 * self.r * sway), w * (0.15 * self.r * self.level(t))

    def gain(self, mx, my, t, u):
        d2 = (mx - self.cx) ** 2 + (my - self.cy) ** 2
        lv = self.level(t)
        return lv * (0.05 * np.exp(-d2 / (2 * (14 * self.r) ** 2)) + 0.12 * np.exp(-d2 / (2 * (5 * self.r) ** 2))
                     + 0.25 * np.exp(-d2 / (2 * (1.4 * self.r) ** 2)))


class Curtain:
    """Voilage ou rideau de lin qui ondule doucement. polygon en fractions de la photo ;
    le mouvement croît du haut (tringle) vers le bas, et une ondulation descend le long du tissu."""

    def __init__(self, polygon, amplitude, period, wavelength):
        self.polygon, self.amplitude, self.period, self.wavelength = polygon, amplitude, period, wavelength

    def bind(self, src):
        from PIL import ImageDraw, ImageFilter

        ow, oh = src.orig_w, src.orig_h
        mask = Image.new("L", (ow, oh), 0)
        ImageDraw.Draw(mask).polygon([(x * ow, y * oh) for x, y in self.polygon], fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(ow * 0.003)).resize((src.w, src.h), Image.BILINEAR)
        self.mask = np.asarray(mask, dtype=np.float32) / 255
        ys = [y for _, y in self.polygon]
        self.top, self.bottom = min(ys) * src.h, max(ys) * src.h
        self.amp = self.amplitude * src.w
        self.lam = self.wavelength * src.w
        return self

    def motion(self, mx, my, t, u):
        m = cv2.remap(self.mask, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        h = np.clip((my - self.top) / (self.bottom - self.top), 0, 1) ** 1.3
        ph = 2 * math.pi * (t / self.period - my / self.lam - mx / (3 * self.lam))
        return m * self.amp * h * (0.75 * np.sin(ph) + 0.25 * np.sin(2 * ph + 0.8)), None

    def gain(self, mx, my, t, u):
        return None


class LightSweep:
    """Lumière rasante qui glisse lentement sur le mur et révèle la matière du papier peint.
    La bande lumineuse va de x0 à x1 (fractions de la largeur de la photo) pendant le plan."""

    def __init__(self, x0, x1, width, strength, slope=0.6):
        self.x0, self.x1, self.width, self.strength, self.slope = x0, x1, width, strength, slope

    def bind(self, src):
        self.w, self.h = src.w, src.h
        return self

    def motion(self, mx, my, t, u):
        return None, None

    def gain(self, mx, my, t, u):
        pos = (self.x0 + (self.x1 - self.x0) * u) * self.w
        d = (mx + (my - self.h / 2) * self.slope - pos) / (self.width * self.w)
        return self.strength * (np.exp(-d * d) - 0.35)


class Glow:
    """Lampe qui s'allume doucement : l'abat-jour et son halo sur le mur montent en lumière
    entre ramp[0] et ramp[1] du plan. x, y, size en fractions de la photo (size : rayon)."""

    def __init__(self, x, y, size, strength=0.35, ramp=(0.2, 0.6)):
        self.x, self.y, self.size, self.strength, self.ramp = x, y, size, strength, ramp

    def bind(self, src):
        self.cx, self.cy, self.r = self.x * src.w, self.y * src.h, self.size * src.w
        return self

    def motion(self, mx, my, t, u):
        return None, None

    def gain(self, mx, my, t, u):
        k = smoothstep((u - self.ramp[0]) / (self.ramp[1] - self.ramp[0])) - 1
        d2 = (mx - self.cx) ** 2 + (my - self.cy) ** 2
        return self.strength * k * (0.7 * np.exp(-d2 / (2 * self.r ** 2)) + 0.3 * np.exp(-d2 / (2 * (4 * self.r) ** 2)))


def _periodic_noise(n, seed, cutoff):
    """Champ de bruit doux et périodique (n x n), valeurs dans [-1, 1]."""
    rng = np.random.default_rng(seed)
    spec = np.fft.fft2(rng.standard_normal((n, n)))
    fy, fx = np.meshgrid(np.fft.fftfreq(n), np.fft.fftfreq(n), indexing="ij")
    spec *= np.exp(-(fx ** 2 + fy ** 2) / (2 * cutoff ** 2))
    field = np.real(np.fft.ifft2(spec))
    return (field / np.abs(field).max()).astype(np.float32)


class Atmosphere:
    """Poussières en suspension dans la lumière et lumière tamisée par un feuillage, en
    mouvement périodique sur la durée de la vidéo (la boucle reste parfaite)."""

    def __init__(self, size, total, count=170, seed=11):
        self.size, self.total = size, total
        out_w, out_h = size
        rng = np.random.default_rng(seed)
        self.x0, self.y0 = rng.random(count), rng.random(count)
        self.z = rng.random(count) ** 1.4  # 0 = loin et fin, 1 = tout près et flou
        self.cx = rng.choice([-1, 0, 0, 1], count)  # traversées complètes par boucle
        self.cy = rng.choice([-1, -1, 0, 1], count)
        self.ax, self.ay = 0.02 + 0.04 * rng.random(count), 0.02 + 0.05 * rng.random(count)
        self.kx, self.ky = rng.integers(1, 4, count), rng.integers(1, 4, count)
        self.px, self.py, self.pt = (2 * math.pi * rng.random(count) for _ in range(3))
        self.kt = rng.integers(2, 7, count)
        self.noise = _periodic_noise(128, seed + 1, 0.035)
        self.noise2 = _periodic_noise(128, seed + 2, 0.06)
        k = out_w / 1920
        self.layers = ((0.0, 0.33, 1.1 * k, 0.55), (0.33, 0.7, 2.4 * k, 0.40), (0.7, 1.01, 6.0 * k, 0.22))
        gx, gy = np.meshgrid(np.arange(out_w, dtype=np.float32), np.arange(out_h, dtype=np.float32))
        cell = out_w / 2.5  # taille des taches de lumière
        self.nx, self.ny = gx / cell * 128 / 4, gy / cell * 128 / 4

    def light(self, lin, lo, hi):
        out_w, out_h = self.size
        lum = lin @ np.float32([0.2126, 0.7152, 0.0722])
        small = cv2.resize(lum, (out_w // 8, out_h // 8), interpolation=cv2.INTER_AREA)
        small = cv2.resize(cv2.GaussianBlur(small, (0, 0), 2), (out_w, out_h), interpolation=cv2.INTER_LINEAR)
        t = np.clip((small - lo) / (hi - lo), 0, 1)
        return t * t * (3 - 2 * t)

    def shimmer(self, lin, f, amount):
        u = f / self.total
        a = cv2.remap(self.noise, self.nx + 128 * u, self.ny + 64 * u, cv2.INTER_CUBIC, borderMode=cv2.BORDER_WRAP)
        b = cv2.remap(self.noise2, self.nx * 1.7 - 128 * u, self.ny * 1.7 + 128 * u, cv2.INTER_CUBIC, borderMode=cv2.BORDER_WRAP)
        mask = self.light(lin, 0.35, 0.9)
        return lin * (1 + amount * (0.6 * a + 0.4 * b) * mask)[..., None]

    def dust(self, lin, f, amount):
        out_w, out_h = self.size
        u = f / self.total
        m = 0.08
        x = (self.x0 + self.cx * u + self.ax * np.sin(2 * math.pi * self.kx * u + self.px)) % 1.0
        y = (self.y0 + self.cy * u + self.ay * np.sin(2 * math.pi * self.ky * u + self.py)) % 1.0
        x = (x * (1 + 2 * m) - m) * out_w
        y = (y * (1 + 2 * m) - m) * out_h
        twinkle = 0.55 + 0.45 * np.sin(2 * math.pi * self.kt * u + self.pt) ** 2
        layer = np.zeros((out_h, out_w), np.float32)
        for lo, hi, sigma, bright in self.layers:
            sel = (self.z >= lo) & (self.z < hi) & (x >= 0) & (x < out_w - 1) & (y >= 0) & (y < out_h - 1)
            acc = np.zeros((out_h, out_w), np.float32)
            np.add.at(acc, (y[sel].astype(int), x[sel].astype(int)), bright * twinkle[sel] * 2 * math.pi * sigma ** 2)
            layer += cv2.GaussianBlur(acc, (0, 0), sigma)
        glow = layer * self.light(lin, 0.25, 0.75)
        return lin + amount * glow[..., None] * np.float32([1.0, 0.9, 0.74])


# « Notre histoire » : sept plans cosy inspirés des photos d'alfmabi (le seuil d'une porte,
# la console avec sa lampe, la matière du papier peint, le chevet), peu de fleurs, 23 s en
# boucle, format 4:3.
VOILAGE = (
    Curtain(((0.2105, 0.0), (0.2919, 0.0), (0.2919, 0.2125), (0.2907, 0.4463), (0.2907, 0.6589),
             (0.2961, 0.7439), (0.3110, 0.8236), (0.2632, 0.8236), (0.2632, 0.7492), (0.2063, 0.7439),
             (0.2081, 0.3720)), 0.0030, 5.0, 0.30),
    Curtain(((0.1800, 0.0), (0.2105, 0.0), (0.2081, 0.3720), (0.2063, 0.7439), (0.1800, 0.7439)), 0.0040, 4.0, 0.26),
)
HISTOIRE_SIZE = (1440, 1080)
# Version « lumière du jour » : blancs neutres, image plus claire et plus douce, peu de
# contraste et de saturation, comme les intérieurs photographiés en lumière diffuse.
HISTOIRE_JOUR = {
    "white": (0.76, 1.0, 1.42),  # environ 55 % de la correction vers un blanc neutre
    "exposure": 0.7,
    "tone": (0.05, 0.10, 0.205, 0.415, 0.635, 0.80, 0.935),
    "shadow_tint": (0.004, 0.003, -0.002),
    "light_tint": (0.006, 0.003, -0.004),
    "saturation": 0.74,
    "halation": 0.04,
    "mist": 0.2,
    "vignette": 0.08,
    "grain": 0.012,
}
HISTOIRE_SALON = [
    # 1. Le seuil : on passe la porte du salon vers la salle à manger ; le point passe du
    #    chambranle à la fenêtre du fond.
    Shot("salon-ouverture-source.jpg", (0.4964, 0.3932, 0.3828), (0.4934, 0.4463, 0.2572), ((0.3768, 0.3188), (0.5742, 0.3507)), 4.0, 100,
         dust=0.5),
    # 2. La console : la lampe s'allume doucement près des livres et du tableau doré.
    Shot("salon-ouverture-source.jpg", (0.7476, 0.4357, 0.2392), (0.7386, 0.4442, 0.2153), ((0.6968, 0.4995),), 3.0, 100,
         effects=(Glow(0.6968, 0.4516, 0.030),), dust=0.3),
    # 3. La matière du papier peint, révélée par une lumière rasante qui glisse.
    Shot("montage-3-detail-papier-peint.png", (0.7775, 0.5019, 0.2028), (0.8373, 0.4906, 0.1974), ((0.80, 0.50),), 3.0, 100,
         effects=(LightSweep(0.70, 0.92, 0.10, 0.10),)),
    # 4. Le fauteuil de lecture et son plaid dans le soleil ; le voilage ondule derrière.
    Shot("salon-ouverture-source.jpg", (0.1974, 0.7811, 0.2871), (0.2063, 0.7917, 0.2572), ((0.205, 0.80),), 3.0, 100,
         effects=VOILAGE, dust=0.8, shimmer=0.06),
    # 5. Le canapé, le plaid vert et la cheminée ; le point passe du plaid aux bougies.
    Shot("montage-2-salon-toile.png", (0.7775, 0.5056, 0.2632), (0.8254, 0.4916, 0.2512), ((0.7775, 0.7865), (0.8493, 0.1966)), 5.0, 100,
         effects=(Flame(0.8565, 0.1461, 0.0015, 0.3), Flame(0.8367, 0.2022, 0.0015, 1.9),
                  Flame(0.8193, 0.2444, 0.0015, 3.1), Flame(0.9288, 0.1236, 0.0015, 4.4)),
         dust=0.3),
    # 6. Le lit, les oreillers et le plaid ; lent travelling avant.
    Shot("montage-4-chambre.png", (0.6459, 0.5065, 0.2344), (0.6549, 0.4902, 0.2153), ((0.60, 0.40),), 4.0, 100,
         dust=0.3),
    # 7. Le chevet, la lampe et le fauteuil cannelé ; le point passe du coussin à la lampe.
    Shot("montage-4-chambre.png", (0.8493, 0.5065, 0.2344), (0.8732, 0.4967, 0.2213), ((0.933, 0.75), (0.79, 0.45)), 5.0, 100,
         dust=0.3),
]


# « Notre histoire », version actuelle : plans fournis par Belle Saison
# (media/histoire/histoire-plan-1.jpg à 9), du rouleau de papier peint à la chambre tapissée.
# Un seul plan de main sur le papier, au début, puis directement la chambre (demande de la
# cliente). 6 plans de 4 s enchaînés en fondu, 19 s en boucle, format 4:3. Les plans 5, 6 et 8
# (gros plan matière, rouleau et coupelle, seconde main) restent disponibles dans media/histoire/.
H = "histoire/histoire-plan-{}.jpg".format
HISTOIRE = [
    # 1. Le rouleau sur la table, dans le soleil.
    Shot(H(1), (0.50, 0.50, 0.80), (0.57, 0.54, 0.68), ((0.55, 0.45),), 3.0, 96, dust=0.6, shimmer=0.07),
    # 2. La main se pose sur le papier rayé ; lent glissement le long des rayures.
    Shot(H(2), (0.46, 0.50, 0.78), (0.54, 0.50, 0.74), ((0.62, 0.40),), 4.0, 96, dust=0.3),
    # 3. On passe la porte de la chambre.
    Shot(H(4), (0.50, 0.50, 0.88), (0.50, 0.55, 0.62), ((0.12, 0.50), (0.50, 0.58)), 4.0, 96, dust=0.3),
    # 4. Le lit et sa lampe ; le point passe des oreillers à la lampe.
    Shot(H(7), (0.42, 0.50, 0.80), (0.52, 0.48, 0.74), ((0.30, 0.55), (0.73, 0.35)), 4.0, 96),
    # 5. Le chevet et la lampe champignon, lent travelling avant.
    Shot(H(3), (0.50, 0.50, 0.82), (0.58, 0.52, 0.70), ((0.68, 0.45),), 3.0, 96, dust=0.3),
    # 6. La chambre en plan large ; recul lent, puis retour au rouleau.
    Shot(H(9), (0.55, 0.55, 0.70), (0.50, 0.50, 0.86), ((0.60, 0.65),), 2.0, 96, dust=0.5, shimmer=0.04),
]
# Étalonnage de cette version : les plans sont déjà dorés et doux ; on garde leur chaleur.
HISTOIRE_LOOK = {
    "exposure": 0.15,
    "tone": (0.04, 0.09, 0.19, 0.40, 0.63, 0.81, 0.95),
    "shadow_tint": (0.0, 0.004, 0.002),
    "light_tint": (0.008, 0.004, -0.008),
    "saturation": 0.88,
    "halation": 0.06,
    "mist": 0.16,
    "vignette": 0.12,
    "grain": 0.014,
}


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


def view(src, grid, cam, ref, anchor, focus, aperture, jitter, effects=(), t=0.0, u=0.0):
    """Image (lumière linéaire) vue par la caméra cam = (cx, cy, largeur) en pixels de src.
    effects : éléments animés de la scène (flammes, rideaux), au temps t en secondes."""
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
    gain = None
    for effect in effects:
        ex, ey = effect.motion(mx, my, t, u)
        eg = effect.gain(mx, my, t, u)
        if ex is not None:
            mx = mx + ex
        if ey is not None:
            my = my + ey
        if eg is not None:
            gain = eg if gain is None else gain + eg
    image = cv2.remap(src.linear, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT_101)
    if gain is not None:
        image *= (1 + gain)[..., None]
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


class Look:
    """Traitement « film » ; les réglages de LOOK peuvent être remplacés vidéo par vidéo."""

    def __init__(self, size, seed=7, **overrides):
        self.p = {**LOOK, **overrides}
        out_w, out_h = size
        self.size = size
        self.k = out_w / 1920
        yy, xx = np.mgrid[0:out_h, 0:out_w].astype(np.float32)
        nx = (xx + 0.5) / out_w * 2 - 1
        ny = (yy + 0.5) / out_h * 2 - 1
        r = np.sqrt(nx ** 2 + ny ** 2) / math.sqrt(2)
        t = np.clip((r - 0.35) / 0.75, 0, 1)
        self.vignette = (1 - self.p["vignette"] * t * t * (3 - 2 * t))[..., None].astype(np.float32)
        self.rng = np.random.default_rng(seed)

    def __call__(self, lin):
        out_w, out_h = self.size
        k = self.k
        p = self.p
        if p["exposure"] or p["white"] != (1.0, 1.0, 1.0):
            lin = lin * (np.float32(p["white"]) * np.float32(2 ** p["exposure"]))
        # Aberration chromatique : rouge un peu agrandi, bleu un peu réduit, depuis le centre.
        ab = p["aberration"] * k
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
        lin = lin + p["mist"] * np.maximum(glow - lin, 0)
        # Halo chaud autour des sources lumineuses (fenêtres, lampes, bougies).
        hot = np.clip((lum - 0.55) / 0.45, 0, 1)
        hot = cv2.resize(hot, (out_w // 2, out_h // 2), interpolation=cv2.INTER_AREA)
        hot = cv2.resize(cv2.GaussianBlur(hot, (0, 0), 5 * k), (out_w, out_h), interpolation=cv2.INTER_LINEAR)
        lin = lin + p["halation"] * hot[..., None] * np.float32([1.0, 0.42, 0.16])
        lin *= self.vignette
        # Courbe film : noirs relevés, contraste doux, hautes lumières arrondies.
        img = np.clip(lin, 0, 1) ** (1 / 2.2)
        img = np.interp(img, TONE_IN, np.float32(p["tone"])).astype(np.float32)
        # Virage : ombres vers le vert forêt, hautes lumières ambrées ; saturation un peu retenue.
        y = img @ np.float32([0.2126, 0.7152, 0.0722])
        shadow = ((1 - y) ** 2)[..., None]
        light = (y ** 2)[..., None]
        img = img + shadow * np.float32(p["shadow_tint"]) + light * np.float32(p["light_tint"])
        img = y[..., None] + (img - y[..., None]) * p["saturation"]
        # Grain : plus marqué dans les tons moyens, comme sur une pellicule.
        if p["grain"] > 0:
            noise = self.rng.standard_normal((out_h // 2, out_w // 2)).astype(np.float32)
            noise = cv2.resize(noise, (out_w, out_h), interpolation=cv2.INTER_LINEAR)
            img = img + (p["grain"] * (0.45 + 2.2 * y * (1 - y)) * noise)[..., None]
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
def shot_frame(shot, src, grid, t, jitter, f=0, atmosphere=None):
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
    effects = [e.bind(src) if getattr(e, "_src", None) is not src else e for e in shot.effects]
    for e in effects:
        e._src = src
    lin = view(src, grid, cam, ref, anchor, focus, shot.aperture, jitter, effects, f / FPS, t)
    if atmosphere is not None:
        if shot.shimmer:
            lin = atmosphere.shimmer(lin, f, shot.shimmer)
        if shot.dust:
            lin = atmosphere.dust(lin, f, shot.dust)
    return lin


def scale_for(shot_widths, image_w, out_w):
    """Agrandissement préalable pour que le cadre le plus serré soit au moins en 1:1."""
    return max(1.0, out_w / (min(shot_widths) * image_w) * 1.05)


def render_sequence(shots, out_path, size, crf, look=None):
    """Plans enchaînés en fondu ; la fin se fond dans la première image pour boucler."""
    starts, t = [], 0
    for shot in shots:
        starts.append(t)
        t += shot.frames - DISSOLVE
    total = starts[-1] + shots[-1].frames
    grid = Grid(size)
    look = Look(size, **(look or {}))
    atmosphere = Atmosphere(size, total) if any(s.dust or s.shimmer for s in shots) else None
    srcs = []
    for shot in shots:
        w = Image.open(MEDIA / shot.image).width
        srcs.append(source(shot.image, scale_for([shot.start[2], shot.end[2]], w, size[0])))
    first = shot_frame(shots[0], srcs[0], grid, 0.0, float_offset(0, total), 0, atmosphere)
    enc = Encoder(out_path, size, crf)
    began = time.time()
    poster = None
    for f in range(total):
        jitter = float_offset(f, total)
        layers = []
        for shot, src, start in zip(shots, srcs, starts):
            if start <= f < start + shot.frames:
                layers.append((shot_frame(shot, src, grid, (f - start) / (shot.frames - 1), jitter, f, atmosphere), start))
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
        poster = render_sequence(MONTAGE, out / "belle-saison-ouverture-film-1920x1080.mp4", (1920, 1080), 25)
        save_poster(poster, out / "belle-saison-ouverture-film-couverture.jpg")
    elif len(args) == 2 and args[0] == "histoire":
        out = Path(args[1])
        out.mkdir(parents=True, exist_ok=True)
        poster = render_sequence(HISTOIRE, out / "belle-saison-histoire-4-1440x1080.mp4", HISTOIRE_SIZE, 25, HISTOIRE_LOOK)
        save_poster(poster, out / "belle-saison-histoire-4-couverture.jpg")
    elif len(args) == 2 and args[0] in ("histoire-salon", "histoire-salon-jour"):
        out = Path(args[1])
        out.mkdir(parents=True, exist_ok=True)
        jour = args[0].endswith("jour")
        name = "belle-saison-histoire-2-" + ("jour" if jour else "doree")
        poster = render_sequence(HISTOIRE_SALON, out / f"{name}-1440x1080.mp4", HISTOIRE_SIZE, 25, HISTOIRE_JOUR if jour else None)
        save_poster(poster, out / f"{name}-couverture.jpg")
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
