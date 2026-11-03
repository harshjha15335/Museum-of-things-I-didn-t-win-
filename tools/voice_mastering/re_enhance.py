"""Resemble Enhance (local, CPU): speech restoration + bandwidth extension to 44.1 kHz.

Usage: PYTHONPATH=<deepspeed stub dir> python re_enhance.py <run_dir> <mode: denoise|enhance> <nfe> <lambd> <tau> <in.wav> <out.wav>
lambd = how much of the model's own denoiser is applied before enhancing (0..1),
tau = prior temperature (lower = more conservative, closer to the input).
"""
import sys
import time
from pathlib import Path

import soundfile as sf
import torch
import torchaudio

from resemble_enhance.enhancer.inference import denoise, enhance

run_dir, mode, nfe, lambd, tau, src, dst = sys.argv[1:8]
torch.set_num_threads(4)
wav, sr = torchaudio.load(src)
wav = wav.mean(0)
t = time.time()
if mode == "denoise":
    out, osr = denoise(wav, sr, "cpu", run_dir=Path(run_dir))
else:
    out, osr = enhance(wav, sr, "cpu", nfe=int(nfe), solver="midpoint", lambd=float(lambd), tau=float(tau), run_dir=Path(run_dir))
sf.write(dst, out.numpy(), osr, subtype="FLOAT")
print(f"{src.split('/')[-1]} {mode} nfe={nfe} lambd={lambd} tau={tau}: {wav.shape[-1]/sr:.1f}s audio in {time.time()-t:.1f}s -> {osr} Hz")
