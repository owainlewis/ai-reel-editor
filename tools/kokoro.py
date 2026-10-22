"""Speak a script with Kokoro (local, free): python tools/kokoro.py <script.txt> <out.wav> [voice] [speed]

Run through uv so its dependencies stay out of the project:
  uv run -p 3.12 --with kokoro-onnx --with soundfile python tools/kokoro.py ...
The model (about 340 MB) lives in ~/.cache/reel/kokoro and is downloaded on first use. Kokoro's
bundled espeak is broken on macOS, so it uses Homebrew's: brew install espeak-ng.
"""
import sys, urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import EspeakConfig, Kokoro

MODELS = Path.home() / ".cache/reel/kokoro"
RELEASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
ESPEAK = Path("/opt/homebrew/opt/espeak-ng")


def model(name: str) -> str:
    path = MODELS / name
    if not path.exists():
        MODELS.mkdir(parents=True, exist_ok=True)
        print(f"  downloading {name}")
        urllib.request.urlretrieve(RELEASE + name, path)
    return str(path)


def main():
    script, out = Path(sys.argv[1]), sys.argv[2]
    voice = sys.argv[3] if len(sys.argv) > 3 else "am_michael"
    speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.05
    if not (ESPEAK / "share/espeak-ng-data/phontab").exists():
        sys.exit("Kokoro needs espeak-ng: brew install espeak-ng")
    k = Kokoro(model("kokoro-v1.0.onnx"), model("voices-v1.0.bin"),
               espeak_config=EspeakConfig(lib_path=str(ESPEAK / "lib/libespeak-ng.dylib"), data_path=str(ESPEAK / "share/espeak-ng-data")))
    lang = "en-gb" if voice.startswith("b") else "en-us"
    # One paragraph at a time, with a short pause between, so long scripts keep their phrasing.
    parts, sr = [], 24000
    for para in [p.strip() for p in script.read_text().split("\n\n") if p.strip()]:
        audio, sr = k.create(para, voice=voice, speed=speed, lang=lang)
        parts += [audio, np.zeros(int(sr * 0.35), dtype=audio.dtype)]
    sf.write(out, np.concatenate(parts), sr)


if __name__ == "__main__":
    main()
