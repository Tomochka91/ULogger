# backend/app/loggers/mbox/tests/test_transform.py
"""
Unit tests for MBox domain transformer.

These tests validate business logic applied after parsing:
- tare subtraction and clamping to zero
- detection of zero-weight errors
- detection of duplicate-weight errors
- behavior when specific error checks are disabled

Transformer is stateful: duplicate detection depends on previous frames.
"""

from datetime import datetime

from backend.app.loggers.mbox.config import MboxConfig
from backend.app.loggers.mbox.parser import MboxLabelRecord
from backend.app.loggers.mbox.transform import MboxTransformer


def make_cfg(**kwargs) -> MboxConfig:
    """
    Create a minimal MboxConfig for transformer tests.

    Allows overriding individual fields via kwargs.
    """
    base = {
        "port": {
            "port": "/dev/null",
            "baudrate": 9600,
            "databits": 8,
            "parity": "None",
            "stopbits": 1.0,
            "flowcontrol": "None",
            "autoconnect": True,
            "timeout": 1.0,
        },
        "tare": 0.5,
        "treat_zero_as_error": True,
        "treat_duplicate_as_error": True,
        "error_label_zero": "no weight",
        "error_label_duplicate": "no weight",
        "encoding": "ascii",
    }
    base.update(kwargs)
    return MboxConfig(**base)


def make_rec(r: float, n: float = 10.0, sn: str = "SN") -> MboxLabelRecord:
    """
    Helper to create a synthetic parsed record
    with configurable weights and serial number.
    """
    return MboxLabelRecord(
        dt=datetime(2024, 1, 1, 12, 0, 0),
        sFishType="MACKEREL",
        sSize="M",
        sLot="",
        nWeight=n,
        rWeight=r,
        sSNumber=sn,
    )


def test_tare_and_clamp():
    """
    Weight after tare subtraction must be clamped to zero.
    Zero adjusted weight is treated as an error.
    """
    cfg = make_cfg(tare=5.0)
    tr = MboxTransformer(cfg)

    res = tr.transform(make_rec(r=4.0))
    assert res.adj_r_weight == 0.0
    assert res.variables["adj_r_weight"] == 0.0
    assert res.on_error is True
    assert res.error_info == "no weight"


def test_zero_weight_error():
    """
    Raw zero weight must trigger error
    when treat_zero_as_error is enabled.
    """
    cfg = make_cfg(tare=0.0)
    tr = MboxTransformer(cfg)

    res = tr.transform(make_rec(r=0.0))
    assert res.on_error is True
    assert res.error_info == "no weight"


def test_duplicate_weight_error():
    """
    Repeated adjusted weight must be treated as an error
    when duplicate detection is enabled.
    """
    cfg = make_cfg(tare=0.0)
    tr = MboxTransformer(cfg)

    r1 = tr.transform(make_rec(r=10.0, sn="A"))
    assert r1.on_error is False

    r2 = tr.transform(make_rec(r=10.0, sn="B"))
    assert r2.on_error is True
    assert r2.error_info == "no weight"


def test_duplicate_disabled():
    """
    Duplicate weights must be allowed
    when treat_duplicate_as_error is disabled.
    """
    cfg = make_cfg(tare=0.0, treat_duplicate_as_error=False)
    tr = MboxTransformer(cfg)

    r1 = tr.transform(make_rec(r=10.0, sn="A"))
    r2 = tr.transform(make_rec(r=10.0, sn="B"))
    assert r1.on_error is False
    assert r2.on_error is False


def test_zero_disabled():
    """
    Zero weight must be allowed
    when treat_zero_as_error is disabled.
    """
    cfg = make_cfg(tare=0.0, treat_zero_as_error=False)
    tr = MboxTransformer(cfg)

    r = tr.transform(make_rec(r=0.0))
    assert r.on_error is False
    assert r.error_info == ""
