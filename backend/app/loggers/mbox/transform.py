# backend/app/loggers/mbox/transform.py
"""
Domain-level transformation logic for MBox records.

This module applies business rules to parsed MBox data:
- tare adjustment
- error detection (zero weight, duplicate weight)
- preparation of variables for SQL query templates

The transformer is stateful: it remembers the last adjusted weight
to detect duplicates.
"""

from dataclasses import dataclass
from typing import Any, Dict, Optional

from backend.app.loggers.mbox.parser import MboxLabelRecord
from backend.app.loggers.mbox.config import MboxConfig


@dataclass
class MboxTransformResult:
    """
    Result of domain-level transformation.

    - variables: dictionary passed directly to query_template
    - on_error: indicates whether the record is considered erroneous
    - error_info: human-readable error description
    - adj_r_weight: adjusted real weight (after tare and clamping)
    """
    variables: Dict[str, Any]
    on_error: bool
    error_info: str
    adj_r_weight: float


class MboxTransformer:
    """
    Stateful MBox transformer.

    Responsibilities:
    - apply tare to real weight
    - clamp negative values to zero
    - detect domain-specific error conditions:
        * zero weight
        * duplicate weight
    - keep track of the last adjusted weight
    """

    def __init__(self, config: MboxConfig) -> None:
        """
        Reset internal state.

        Used when the logical stream is restarted
        (e.g. device reconnect, counter reset, etc.).
        """
        self._cfg = config
        self._last_adj_r_weight: Optional[float] = None

    def reset_state(self) -> None:
        self._last_adj_r_weight = None

    def transform(self, mbox_id: int, rec: MboxLabelRecord) -> MboxTransformResult:
        """
        Apply domain rules to a parsed MBox record.

        Steps:
        1) Apply tare to real weight and clamp to zero
        2) Detect error conditions according to configuration
        3) Update internal state
        4) Build variables dictionary for SQL insertion

        :param mbox_id: Logical MBox identifier
        :param rec: Parsed MBox label record
        :return: Transformation result
        """
        cfg = self._cfg

        # 1) Apply tare and clamp negative values
        adj_r = rec.rWeight - float(cfg.tare)
        if adj_r < 0:
            adj_r = 0.0

        # 2) Error detection
        on_error = False
        error_info = ""

        # Zero-weight detection
        if cfg.treat_zero_as_error and adj_r == 0.0:
            # Fallback to net weight
            adj_r = rec.nWeight
            on_error = True
            error_info = cfg.error_label_zero

        # Duplicate-weight detection (stateful)
        if (not on_error) and cfg.treat_duplicate_as_error:
            if self._last_adj_r_weight is not None and adj_r == self._last_adj_r_weight:
                on_error = True
                error_info = cfg.error_label_duplicate

        # 3) Update state after processing
        self._last_adj_r_weight = adj_r

        # 4) Build variables for query_template
        variables: Dict[str, Any] = {
            "mbox_id": mbox_id,
            "on_error": on_error,
            "created_at": rec.dt,
            "fish_name": rec.sFishType,
            "fish_grade": rec.sSize,
            "lot": '',
            "n_weight": rec.nWeight,
            "r_weight": adj_r if adj_r is not None else rec.nWeight,
            "sn": rec.sSNumber,

            "error_info": error_info,
            "tare": float(cfg.tare),
        }

        return MboxTransformResult(
            variables=variables,
            on_error=on_error,
            error_info=error_info,
            adj_r_weight=adj_r,
        )
