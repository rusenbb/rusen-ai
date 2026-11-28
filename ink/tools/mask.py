#!/usr/bin/env python3
"""Cut a person out of a photo: writes <photo>.mask.png next to it (white = person).

    python3 tools/mask.py path/to/photo.jpg [more photos...]

portrait() reads the mask when it exists, so a busy or dark background
does not turn into hatching. Uses U^2-Net (human segmentation, Apache-2.0),
downloaded once to ~/.cache/ink. Needs: pip install onnxruntime pillow numpy
"""
import os
import sys
import urllib.request

import numpy as np
import onnxruntime as ort
from PIL import Image

URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx"
MODEL = os.path.expanduser("~/.cache/ink/u2net_human_seg.onnx")


def session():
    if not os.path.exists(MODEL):
        os.makedirs(os.path.dirname(MODEL), exist_ok=True)
        print("downloading", URL)
        urllib.request.urlretrieve(URL, MODEL)
    return ort.InferenceSession(MODEL, providers=["CPUExecutionProvider"])


def mask(sess, path):
    im = Image.open(path).convert("RGB")
    x = np.asarray(im.resize((320, 320), Image.LANCZOS), dtype=np.float32)
    x = x / max(x.max(), 1e-6)
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    out = sess.run(None, {sess.get_inputs()[0].name: x})[0][0, 0]
    out = (out - out.min()) / max(out.max() - out.min(), 1e-6)
    m = Image.fromarray((out * 255).astype(np.uint8)).resize(im.size, Image.LANCZOS)
    dst = os.path.splitext(path)[0] + ".mask.png"
    m.save(dst)
    return dst


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    s = session()
    for p in sys.argv[1:]:
        print(mask(s, p))
