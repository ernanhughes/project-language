"""Validate the bounded, published wire-schema subset without another NLP dependency.

This is deliberately NOT a general JSON Schema implementation. It checks the exact
keywords used by our two versioned schemas and rejects unknown validation keywords.
"""
import json
import re
from pathlib import Path

SCHEMAS = Path(__file__).resolve().parents[3] / "schemas"


def _check(value, schema):
    known = {"$schema", "title", "description", "default", "type", "properties", "required", "additionalProperties", "propertyNames", "items", "minItems", "maxItems", "minLength", "maxLength", "pattern", "const", "enum", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"}
    if set(schema) - known:
        raise ValueError("UNSUPPORTED_CONTRACT_KEYWORD")
    if "const" in schema and value != schema["const"]:
        raise ValueError("CONTRACT_CONST")
    if "enum" in schema and value not in schema["enum"]:
        raise ValueError("CONTRACT_ENUM")
    kind = schema.get("type")
    types = {"string": lambda v: isinstance(v, str), "object": lambda v: isinstance(v, dict), "array": lambda v: isinstance(v, list), "boolean": lambda v: isinstance(v, bool), "integer": lambda v: isinstance(v, int) and not isinstance(v, bool), "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)}
    if kind and (kind not in types or not types[kind](value)):
        raise ValueError("CONTRACT_TYPE")
    if isinstance(value, dict):
        props = schema.get("properties", {})
        if not set(schema.get("required", [])).issubset(value):
            raise ValueError("CONTRACT_REQUIRED")
        for key, item in value.items():
            if "propertyNames" in schema:
                _check(key, schema["propertyNames"])
            if key in props:
                _check(item, props[key])
            elif schema.get("additionalProperties") is False:
                raise ValueError("CONTRACT_EXTRA_FIELD")
            elif isinstance(schema.get("additionalProperties"), dict):
                _check(item, schema["additionalProperties"])
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0) or len(value) > schema.get("maxItems", float("inf")):
            raise ValueError("CONTRACT_ARRAY_LENGTH")
        for item in value:
            _check(item, schema.get("items", {}))
    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0) or len(value) > schema.get("maxLength", float("inf")):
            raise ValueError("CONTRACT_STRING_LENGTH")
        if "pattern" in schema and not re.search(schema["pattern"], value):
            raise ValueError("CONTRACT_PATTERN")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if value < schema.get("minimum", -float("inf")) or value > schema.get("maximum", float("inf")):
            raise ValueError("CONTRACT_NUMBER_RANGE")
        if "exclusiveMinimum" in schema and value <= schema["exclusiveMinimum"] or "exclusiveMaximum" in schema and value >= schema["exclusiveMaximum"]:
            raise ValueError("CONTRACT_NUMBER_RANGE")


def validate_wire(value, name):
    if name not in ("request-v0.1", "inventory-v0.1"):
        raise ValueError("UNKNOWN_WIRE_CONTRACT")
    _check(value, json.loads((SCHEMAS / (name + ".json")).read_text(encoding="utf-8")))
    return value
