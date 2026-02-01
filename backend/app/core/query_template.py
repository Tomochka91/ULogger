# backend/app/core/query_template.py
"""
SQL query template utilities.

Provides compilation and building of SQL queries from string templates
with placeholders in the form {var_name}.

Classes:
- CompiledQueryTemplate: compiled template with SQL and parameter names.
- QueryTemplateError: raised for invalid templates.

Functions:
- compile_query_template(template): compile {var} placeholders into :var for SQLAlchemy.
- build_query(template, variables): build SQL string and parameters dict from template and values.
"""

from dataclasses import dataclass
from typing import Dict, Any, Set, Tuple


@dataclass(frozen=True)
class CompiledQueryTemplate:
    """
    Result of compiling a SQL query template:
    - sql: string with placeholders in :name format
    - param_names: set of parameter names extracted from the template
    """
    sql: str
    param_names: Set[str]


class QueryTemplateError(ValueError):
    """Errors during SQL query template parsing."""


def compile_query_template(template: str) -> CompiledQueryTemplate:
    """
    Compiles a template with {name} placeholders into SQL with :name parameters.

    Supports:
      - {var}  ->  :var
      - {{     ->  '{'
      - }}     ->  '}'

    Requirements:
      - placeholder inside {} cannot be empty
      - must be a valid Python identifier (isidentifier())
      - single '}' without a pair is an error
      - '{' without a closing '}' is an error
    """
    result_parts: list[str] = []
    param_names: Set[str] = set()

    i = 0
    n = len(template)

    while i < n:
        ch = template[i]

        if ch == "{":
            # Escaped '{{'
            if i + 1 < n and template[i + 1] == "{":
                result_parts.append("{")
                i += 2
                continue

            # Start of placeholder
            j = i + 1
            while j < n and template[j] != "}":
                j += 1
            if j >= n:
                raise QueryTemplateError("Unmatched '{' in query template")

            name = template[i + 1 : j].strip()
            if not name:
                raise QueryTemplateError("Empty placeholder '{}' in query template")
            if not name.isidentifier():
                raise QueryTemplateError(
                    f"Invalid placeholder name '{name}' in query template"
                )

            param_names.add(name)
            result_parts.append(f":{name}")
            i = j + 1
            continue

        if ch == "}":
            # Escaped '}}'
            if i + 1 < n and template[i + 1] == "}":
                result_parts.append("}")
                i += 2
                continue
            # Lone '}'
            raise QueryTemplateError("Single '}' in query template")

        # Normal character
        result_parts.append(ch)
        i += 1

    return CompiledQueryTemplate(sql="".join(result_parts), param_names=param_names)


def build_query(
    template: str,
    variables: Dict[str, Any],
) -> Tuple[str, Dict[str, Any]]:
    """
    Builds SQL query and parameters dictionary from a template and variables.

    Args:
      - template: string containing {var_name} placeholders
      - variables: dict mapping var_name -> value (from logger parser)

    Returns:
      - sql: string with :var_name placeholders
      - params: dict var_name -> value (only used variables)

    Raises KeyError if any {var} in template is missing from variables.
    Extra variables are ignored.
    """
    compiled = compile_query_template(template)

    params: Dict[str, Any] = {}
    missing: list[str] = []

    for name in compiled.param_names:
        if name not in variables:
            missing.append(name)
        else:
            params[name] = variables[name]

    if missing:
        raise KeyError(
            f"Missing variables for query template: {', '.join(sorted(missing))}"
        )

    return compiled.sql, params
