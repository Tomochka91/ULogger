# backend/tests/test_query_template.py
"""
Unit tests for the SQL query template utilities:
- compile_query_template(): converts {placeholders} into SQLAlchemy-style :params
- build_query(): builds final SQL + params dict from a template and variables
- QueryTemplateError: raised for invalid template syntax / placeholders
"""

from backend.app.core.query_template import (
    compile_query_template,
    build_query,
    QueryTemplateError,
)


def test_compile_basic_placeholders():
    tpl = "INSERT INTO t (a, b) VALUES ({x}, {y})"
    compiled = compile_query_template(tpl)

    assert compiled.sql == "INSERT INTO t (a, b) VALUES (:x, :y)"
    assert compiled.param_names == {"x", "y"}


def test_build_query_uses_only_needed_vars():
    tpl = "INSERT INTO t (a, b) VALUES ({x}, {y})"
    sql, params = build_query(
        tpl,
        {"x": 1, "y": 2, "z": 999},  # z is extra and must be ignored
    )

    assert sql == "INSERT INTO t (a, b) VALUES (:x, :y)"
    assert params == {"x": 1, "y": 2}


def test_build_query_missing_var_raises():
    tpl = "SELECT * FROM t WHERE a = {x} AND b = {y}"

    try:
        build_query(tpl, {"x": 10})
        assert False, "Expected KeyError for missing variable 'y'"
    except KeyError as e:
        msg = str(e)
        assert "y" in msg


def test_escape_braces():
    tpl = "SELECT '{{' as lbrace, '}}' as rbrace, {x} as value"
    compiled = compile_query_template(tpl)

    assert compiled.sql == "SELECT '{' as lbrace, '}' as rbrace, :x as value"
    assert compiled.param_names == {"x"}

    sql, params = build_query(tpl, {"x": 42})
    assert sql == compiled.sql
    assert params == {"x": 42}


def test_invalid_placeholder_name_raises():
    # Spaces / invalid placeholder names
    bad_tpls = [
        "SELECT { }",
        "SELECT {1x}",
        "SELECT {x-y}",
    ]
    for tpl in bad_tpls:
        try:
            compile_query_template(tpl)
            assert False, f"Expected QueryTemplateError for template: {tpl!r}"
        except QueryTemplateError:
            pass


def test_unmatched_braces_raise():
    # Unclosed '{'
    try:
        compile_query_template("SELECT {x")
        assert False, "Expected QueryTemplateError for unmatched '{'"
    except QueryTemplateError:
        pass

    # Single '}' without matching '{'
    try:
        compile_query_template("SELECT x}")
        assert False, "Expected QueryTemplateError for single '}'"
    except QueryTemplateError:
        pass
