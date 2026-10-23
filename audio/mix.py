"""Mix a reel's audio: the speaker, a music bed ducked under speech, and sound effects.

    python -m audio.mix projects/<slug>

Reads build/audio.json (written by `reel validate`) and source/voice.wav,
writes build/mix.wav at -14 LUFS integrated and -1 dBTP, the level the
platforms normalise to. Sound files come from sounds/<kind>/ and music/<mood>/;
anything missing is synthesised.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

from . import sfx
from .dsp import SR
from .library import SoundLibrary, decode, music_bed, music_files

ROOT = Path(__file__).resolve().parent.parent


def library_root() -> Path:
    """Where sounds/ and music/ live. They are git-ignored, so a git worktree has
    empty copies; it uses the main checkout's instead. REEL_LIBRARY overrides both."""
    import os

    if os.environ.get("REEL_LIBRARY"):
        return Path(os.environ["REEL_LIBRARY"]).expanduser()
    common = subprocess.run(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    main = Path(common).parent if common else ROOT
    has_audio = lambda root: any(p.is_file() and not p.name.startswith(".") and p.suffix != ".md" for p in (root / "sounds").rglob("*"))
    return main if not has_audio(ROOT) and has_audio(main) else ROOT
TARGET_LUFS = -14.0
TRUE_PEAK = -1.5  # headroom for AAC encoding, which adds about 0.5 dB

# The voice arrives finished: Owain grades and masters it in Final Cut (2026-10-22). It is never
# filtered, EQ'd or compressed here; only one linear gain reaches the platform loudness target.


def ffmpeg(args: list[str]) -> str:
    proc = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-y", *args], capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed:\n{proc.stderr[-3000:]}")
    return proc.stderr


def loudness(path: Path) -> dict:
    out = ffmpeg(["-i", str(path), "-af", f"loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}:LRA=11:print_format=json", "-f", "null", "-"])
    return json.loads(out[out.rindex("{") : out.rindex("}") + 1])


def main(project: Path) -> None:
    cfg = json.loads((project / "build/audio.json").read_text())
    seconds = float(cfg["duration"])
    cache = ROOT / ".cache/audio"
    work = project / "build/audio"
    work.mkdir(parents=True, exist_ok=True)
    n = int(seconds * SR)

    def fit(x: np.ndarray) -> np.ndarray:
        x = x[:n]
        return np.concatenate([x, np.zeros((n - len(x), 2), dtype=np.float32)]) if len(x) < n else x

    voice = fit(decode(project / "source/voice.wav", cache))
    sf.write(work / "voice.wav", voice, SR, subtype="FLOAT")

    lib = library_root()
    m = cfg.get("music")
    tracks = ([lib / "music" / m["track"]] if m.get("track") else music_files(lib / "music", m.get("mood", "focus"))) if m else []
    if m and tracks:
        pick = tracks[sum(map(ord, project.name)) % len(tracks)]
        bed = music_bed(pick, seconds, cache)
        print(f"  music: {pick.name}")
        sf.write(work / "music.wav", fit(bed), SR, subtype="FLOAT")
        music_db = float(m.get("level", -20))
    else:
        # A synthesised bed always sounded cheap; no music beats bad music.
        if m:
            print(f"  music: none (no tracks in {lib / 'music'}; add some to get a bed)")
        sf.write(work / "music.wav", np.zeros((n, 2), dtype=np.float32), SR, subtype="FLOAT")
        music_db = -90.0

    library = SoundLibrary(lib / "sounds", cache)
    print(f"  sounds: {library.summary()}")
    effects = sfx.render(cfg.get("sfx", []), seconds, 220.0, library)
    sf.write(work / "sfx.wav", fit(effects * 0.5), SR, subtype="FLOAT")

    gain = float(cfg.get("voiceGain", 0))
    graph = (
        f"[0:a]volume={gain}dB,asplit=2[v][key];"
        f"[1:a]volume={music_db}dB[m];"
        "[m][key]sidechaincompress=threshold=0.05:ratio=3:attack=40:release=900:makeup=1[duck];"
        "[2:a]volume=-7dB[fx];"
        "[v][duck][fx]amix=inputs=3:normalize=0,alimiter=limit=0.89:attack=3:release=60[mix]"
    )
    pre = work / "premaster.wav"
    ffmpeg(["-i", str(work / "voice.wav"), "-i", str(work / "music.wav"), "-i", str(work / "sfx.wav"),
            "-filter_complex", graph, "-map", "[mix]", "-c:a", "pcm_f32le", str(pre)])

    # Two-pass loudness normalisation for an exact integrated target.
    s = loudness(pre)
    norm = (
        f"loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}:LRA=11:measured_I={s['input_i']}:measured_TP={s['input_tp']}:"
        f"measured_LRA={s['input_lra']}:measured_thresh={s['input_thresh']}:offset={s['target_offset']}:linear=true"
    )
    out = project / "build/mix.wav"
    ffmpeg(["-i", str(pre), "-af", norm, "-ar", str(SR), "-c:a", "pcm_s24le", str(out)])
    final = loudness(out)
    print(f"  mix: {out.relative_to(project)} at {float(final['input_i']):.1f} LUFS, {float(final['input_tp']):.1f} dBTP")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
