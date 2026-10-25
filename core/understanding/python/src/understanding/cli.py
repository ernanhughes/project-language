"""File CLI plus bounded UTF-8 JSON stdin transport; never downloads resources."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

MAX_INPUT = 262144
MAX_SOURCE = 65536
PROFILES = Path(__file__).resolve().parents[2] / "profiles"


def validate_request(value):
    from .contracts import validate_wire
    validate_wire(value, "request-v0.1")
    if not isinstance(value, dict) or set(value) - {"source_id", "source_text", "profile", "profile_version", "context"}:
        raise ValueError("INVALID_REQUEST_FIELDS")
    for name in ("source_id", "source_text", "profile", "profile_version"):
        if not isinstance(value.get(name), str) or not value[name].strip():
            raise ValueError("INVALID_" + name.upper())
    if len(value["source_id"]) > 256 or len(value["source_text"].encode("utf-8")) > MAX_SOURCE:
        raise ValueError("SOURCE_SIZE_LIMIT")
    if value["profile"] not in ("technical-policy", "general"):
        raise ValueError("UNKNOWN_PROFILE")
    context = value.get("context", {})
    if not isinstance(context, dict) or set(context) - {"purpose", "intended_recipient", "declared_context"}:
        raise ValueError("INVALID_CONTEXT")
    for key in ("purpose", "intended_recipient"):
        if key in context and not isinstance(context[key], str):
            raise ValueError("INVALID_CONTEXT")
    if "declared_context" in context and not isinstance(context["declared_context"], dict):
        raise ValueError("INVALID_CONTEXT")
    path = PROFILES / (value["profile"] + ".json")
    profile = json.loads(path.read_text(encoding="utf-8"))
    if profile["id"] != value["profile"] or profile["version"] != value["profile_version"]:
        raise ValueError("PROFILE_VERSION_MISMATCH")
    return value, profile


def compile_request(value):
    value, profile = validate_request(value)
    from .pipeline import analyse
    result = analyse(value["source_text"], source_id=value["source_id"], profile=profile)
    result["context"] = value.get("context", {})
    from .contracts import validate_wire
    validate_wire(result, "inventory-v0.1")
    return result


def stdin_result():
    raw = sys.stdin.buffer.read(MAX_INPUT + 1)
    if len(raw) > MAX_INPUT:
        raise ValueError("INPUT_SIZE_LIMIT")
    value = json.loads(raw.decode("utf-8"))
    if isinstance(value, dict) and value.get("schema") == "language-understanding-batch-request/0.1":
        if set(value) != {"schema", "documents"} or not isinstance(value["documents"], list) or not 1 <= len(value["documents"]) <= 64:
            raise ValueError("INVALID_BATCH")
        for item in value["documents"]:
            validate_request(item)
        return {"schema": "language-understanding-batch/0.1", "inventories": [compile_request(item) for item in value["documents"]]}
    return compile_request(value)


def main():
    ap = argparse.ArgumentParser(description="Provisional source-linked meaning inventory, not certified understanding")
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--text", help="UTF-8 source text file")
    group.add_argument("--stdin-json", action="store_true", help="Bounded UTF-8 JSON request or batch on stdin; JSON on stdout")
    ap.add_argument("--profile", help="Versioned JSON profile for file input")
    ap.add_argument("--source-id", default="input")
    ap.add_argument("--format", choices=("table", "json"), default="table")
    a = ap.parse_args()
    try:
        if a.stdin_json:
            result = stdin_result()
        else:
            if not a.profile:
                ap.error("--profile is required with --text")
            from .pipeline import analyse_file
            result = analyse_file(a.text, source_id=a.source_id, profile=Path(a.profile))
        if a.stdin_json or a.format == "json":
            payload = json.dumps(result, ensure_ascii=False, allow_nan=False).encode("utf-8")
            if len(payload) > 4194304:
                raise ValueError("OUTPUT_SIZE_LIMIT")
            sys.stdout.buffer.write(payload + b"\n")
        else:
            from .pipeline import render_table
            print(render_table(result))
            print("\nRESEARCH STANDING: HEURISTIC_UNVERIFIED (not a semantic coverage certificate)")
    except ImportError:
        sys.stderr.write("UNDERSTANDING_DEPENDENCY_MISSING: install the declared spaCy and NLTK dependencies in the selected Python environment.\n")
        return 2
    except (ValueError, TypeError, KeyError, OSError) as exc:
        # Error categories only: never echo input text or environment values.
        sys.stderr.write("UNDERSTANDING_INPUT_OR_PROFILE_ERROR: " + type(exc).__name__ + "\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
