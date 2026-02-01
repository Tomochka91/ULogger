# /app/schemas/query_template.py
"""
Schemas for testing SQL query templates.

This module defines request/response models for an API endpoint that
validates and compiles SQL query templates with placeholders.

The endpoint is intended for:
- validating query_template syntax,
- checking placeholder substitution,
- previewing the resulting SQL and parameters
  *before* saving the configuration or writing to the database.
"""

from pydantic import BaseModel
from typing import Dict, Any


class QueryTemplateTestRequest(BaseModel):
    """
    Request payload for query template test.

    Attributes:
        query_template:
            SQL template string with placeholders in `{var}` format.
            Example:
                "INSERT INTO table (a, b) VALUES ({x}, {y})"
        variables:
            Dictionary of variable values that should be substituted
            into the template.
            Extra variables are ignored; missing ones produce an error.
    """
    query_template: str
    variables: Dict[str, Any]


class QueryTemplateTestResponse(BaseModel):
    """
    Response payload for query template test.

    Exactly one of the following outcomes is expected:
    - sql + params: template successfully compiled and validated
    - error: human-readable description of the failure
    """
    sql: str | None = None
    params: Dict[str, Any] | None = None
    error: str | None = None
