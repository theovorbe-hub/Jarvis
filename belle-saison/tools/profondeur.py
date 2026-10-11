"""Cartes de profondeur des photos, pour la parallaxe et la mise au point des vidéos.

Modèle : Depth Anything V2 Small (licence Apache 2.0), export ONNX de
https://github.com/fabio-sim/Depth-Anything-ONNX (fichier depth_anything_v2_vits.onnx,
entrée fixe 518 x 518). Le modèle n'est pas versionné : les cartes calculées le sont,
dans media/profondeur/, et suffisent pour refaire les vidéos.

La photo est analysée en entier (cohérence d'ensemble), puis par tuiles carrées qui se
chevauchent (finesse des contours) ; chaque tuile est recalée sur la vue d'ensemble.
Valeurs : 0 = le plus loin, 1 = le plus près.
"""
import numpy as np
from PIL import Image

SIZE = 518
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def _infer(session, image):
    x = np.asarray(image.convert("RGB").resize((SIZE, SIZE), Image.BICUBIC), dtype=np.float32) / 255
    x = ((x - MEAN) / STD).transpose(2, 0, 1)[None]
    out = session.run(None, {session.get_inputs()[0].name: x})[0][0]
    return out.astype(np.float32)


def _resize(depth, size):
    return np.asarray(Image.fromarray(depth, mode="F").resize(size, Image.BICUBIC), dtype=np.float32)


def estimate(image, model_path):
    import onnxruntime as ort

    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    w, h = image.size
    coarse = _resize(_infer(session, image), (w, h))
    side = min(w, h)
    stride = max(1, side // 2)
    xs = list(range(0, w - side + 1, stride))
    ys = list(range(0, h - side + 1, stride))
    if xs[-1] != w - side:
        xs.append(w - side)
    if ys[-1] != h - side:
        ys.append(h - side)
    acc = np.zeros((h, w), np.float32)
    weight = np.zeros((h, w), np.float32)
    ramp = np.minimum(np.arange(side) + 1, side - np.arange(side)).astype(np.float32)
    feather = np.minimum.outer(ramp, ramp) / (side / 2)
    for y in ys:
        for x in xs:
            tile = _resize(_infer(session, image.crop((x, y, x + side, y + side))), (side, side))
            ref = coarse[y:y + side, x:x + side]
            a, b = np.polyfit(tile.ravel(), ref.ravel(), 1)  # recalage échelle + décalage
            acc[y:y + side, x:x + side] += (a * tile + b) * feather
            weight[y:y + side, x:x + side] += feather
    depth = acc / np.maximum(weight, 1e-6)
    lo, hi = np.percentile(depth, [1, 99])
    return np.clip((depth - lo) / (hi - lo), 0, 1)


def save(depth, path):
    Image.fromarray((depth * 65535).round().astype(np.uint16)).save(path)


def load(path, size):
    depth = np.asarray(Image.open(path), dtype=np.float32) / 65535
    if depth.shape[::-1] != tuple(size):
        depth = _resize(depth, size)
    return depth
