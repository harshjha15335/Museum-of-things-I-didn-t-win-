"""Inference-only stand-in for deepspeed: resemble-enhance imports it for training code paths only."""
class DeepSpeedConfig:  # noqa: D101
    def __init__(self, *a, **k):
        raise RuntimeError("deepspeed stub: training is not supported")
def init_distributed(*a, **k):
    raise RuntimeError("deepspeed stub: training is not supported")
