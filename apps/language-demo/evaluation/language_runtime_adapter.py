#!/usr/bin/env python
"""Read-only Studio adapter for Language Runtime v0.1.

This adapter proves that an exchange already produced by Language Studio can be
represented in the portable Language envelope without migrating Studio, changing
its ``language-delivery/0.1`` record, or re-running an interpreter.

It reads one stored Studio evidence file, verifies its source and delivery hashes,
builds L0 and L1 envelopes, invokes the independent portable runtime, and writes
new evidence outside the Studio repository. It imports no Studio server or UI
code and writes nothing under ``C:\\Projects\\project-language``.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

DEFAULT_STUDIO_ROOT = Path(r"C:\Projects\project-language")
DEFAULT_RUNTIME_ROOT = Path(os.environ.get("LANGUAGE_RUNTIME_ROOT", r"C:\Projects\language-runtime"))
EVIDENCE_RELATIVE = Path("apps/language-demo/evidence/lc-02-development-001/offline/comparison.json")
CASE_ID = "lc02-d1"
NOW = "2026-10-24T00:00:00Z"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--studio-root", type=Path, default=DEFAULT_STUDIO_ROOT)
    parser.add_argument("--runtime-root", type=Path, default=DEFAULT_RUNTIME_ROOT)
    args = parser.parse_args()

    runtime_root = args.runtime_root.resolve()
    if os.environ.get("LANGUAGE_RUNTIME_INSTALLED") != "1":
        sys.path.insert(0, str(runtime_root / "python"))
    from language_runtime import LanguageRuntime, hash_json, make_message  # noqa: PLC0415

    studio_root = args.studio_root.resolve()
    evidence_path = studio_root / EVIDENCE_RELATIVE
    if not evidence_path.is_file():
        raise SystemExit(f"STUDIO_EVIDENCE_NOT_FOUND: {evidence_path}")

    before_file_hash = sha256_bytes(evidence_path.read_bytes())
    document = load_json(evidence_path)
    case = next((item for item in document["comparison"]["cases"] if item["id"] == CASE_ID), None)
    trial = next((item for item in document["comparison"]["state"]["trials"] if item["case_id"] == CASE_ID), None)
    if case is None or trial is None:
        raise SystemExit("STUDIO_CASE_OR_TRIAL_NOT_FOUND")
    answer = next((item for item in trial["answers"] if item["arm"] == "LANGUAGE"), None)
    if answer is None:
        raise SystemExit("STUDIO_LANGUAGE_ARM_NOT_FOUND")

    delivered = answer["delivered"]
    source = delivered["source"]
    source_bytes = source["text"].encode("utf-8")
    source_hash = sha256_bytes(source_bytes)
    if source_hash != source["hash"]:
        raise SystemExit("STUDIO_SOURCE_HASH_MISMATCH")
    if hash_json(delivered) != answer["delivered_hash"]:
        raise SystemExit("STUDIO_DELIVERED_HASH_MISMATCH")
    if delivered.get("schema") != "language-delivery/0.1":
        raise SystemExit("STUDIO_PROTOCOL_SCHEMA_CHANGED")

    artifact_id = "studio-source-lc02-d1"
    artifact_ref = {
        "id": artifact_id,
        "uri": f"studio://lc-02-development-001/sources/{source['id']}",
        "media_type": "text/plain",
        "sha256": source_hash,
        "bytes": len(source_bytes),
        "version": "lc02-development-v1",
        "label": "Studio LC-02 readiness and authority source",
        "attributes": {
            "case_id": CASE_ID,
            "arm": "LANGUAGE",
            "studio_schema": delivered["schema"],
            "delivered_sha256": answer["delivered_hash"],
            "source_truth": delivered["source_truth"],
            "action_authority": delivered["action_authority"],
        },
    }

    case_meta = {"case": case, "trial": {key: trial[key] for key in ("id", "case_id", "case_hash", "name", "phase")}}
    context_refs = [
        {
            "id": "studio-case-lc02-d1",
            "uri": "studio://lc-02-development-001/cases/lc02-d1",
            "media_type": "application/json",
            "sha256": hash_json(case_meta),
            "version": "lc02-development-v1",
            "kind": "EVALUATION",
            "label": "LC-02 development case and trial metadata",
        },
        {
            "id": "studio-delivery-lc02-d1-language",
            "uri": "studio://lc-02-development-001/deliveries/lc02-d1-language",
            "media_type": "application/json",
            "sha256": answer["delivered_hash"],
            "version": delivered["schema"],
            "kind": "REFERENCE",
            "label": "Stored Studio language-delivery/0.1 record (read-only)",
        },
    ]

    c0 = {
        "available": context_refs,
        "admitted": [],
        "used": [],
        "excluded": [ref["id"] for ref in context_refs],
        "unavailable": [
            {
                "id": "studio-recipient-evaluation-lc02-d1",
                "reason": "Studio-owned recipient evaluation was not made available to this read-only adapter.",
                "kind": "EVALUATION",
            }
        ],
        "selection": {
            "decision": "NONE",
            "reason": "L0 preserves the Studio source identity without reading context or evaluating the communication.",
            "at": NOW,
        },
    }
    c1 = {
        "available": context_refs,
        "admitted": ["studio-delivery-lc02-d1-language"],
        "used": ["studio-delivery-lc02-d1-language"],
        "excluded": ["studio-case-lc02-d1"],
        "unavailable": [
            {
                "id": "studio-recipient-evaluation-lc02-d1",
                "reason": "Studio-owned recipient evaluation was not made available to this read-only adapter.",
                "kind": "EVALUATION",
            }
        ],
        "selection": {
            "decision": "SUBSET",
            "reason": "L1 reads the stored delivery only to verify the source and record structural observations; recipient evaluation remains unavailable to this adapter.",
            "at": NOW,
        },
    }

    target_description = (
        "Represent the Studio-originated communication 'Readiness and authority' for a fresh maintenance coordinator, "
        "retaining its conditions, exceptions and unknowns without re-interpreting or accepting it."
    )

    def message(level: str, context: dict, execution_id: str) -> dict:
        result = make_message(
            language_id="studio.communication",
            project="LANGUAGE-STUDIO",
            sequence="lc-02-development",
            source_refs=[artifact_ref],
            target_description=target_description,
            target_criteria=[],
            context=context,
            level=level,
            message_id=f"msg-{execution_id}",
            execution_id=execution_id,
            created_at=NOW,
            mode="OFFLINE_LOCAL",
        )
        result["language"]["capabilities"] = ["DETERMINISTIC", "MEASUREMENT"]
        return result

    runtime = LanguageRuntime()
    started = time.perf_counter()
    l0_request = message("L0_SILENT", c0, "exec-studio-l0")
    l0 = runtime.l0(l0_request, now=NOW)

    l1_request = message("L1_OBSERVE", c1, "exec-studio-l1")

    def observer(_message):
        text = source["text"]
        return [
            {
                "id": "studio-obs-byte-length",
                "subject": {"artifact_id": artifact_id},
                "property": "studio.source.byte_length",
                "value": len(source_bytes),
                "unit": "bytes",
                "method": {"kind": "MEASUREMENT", "id": "utf8-byte-length", "version": "1.0.0"},
                "uncertainty": {"kind": "NONE"},
                "status": "OBSERVED",
                "evidence_refs": [artifact_id],
            },
            {
                "id": "studio-obs-word-count",
                "subject": {"artifact_id": artifact_id},
                "property": "studio.source.word_count",
                "value": len(text.split()),
                "unit": "whitespace-delimited words",
                "method": {"kind": "ALGORITHM", "id": "unicode-whitespace-split", "version": "1.0.0"},
                "uncertainty": {"kind": "NONE"},
                "status": "OBSERVED",
                "evidence_refs": [artifact_id],
            },
            {
                "id": "studio-obs-authority-condition",
                "subject": {"artifact_id": artifact_id},
                "property": "studio.source.authority_condition_present",
                "value": "separate approval" in text,
                "method": {"kind": "ALGORITHM", "id": "literal-substring", "version": "1.0.0"},
                "uncertainty": {
                    "kind": "QUALITATIVE",
                    "note": "Literal substring presence only; this is not a semantic interpretation or acceptance.",
                },
                "status": "OBSERVED",
                "evidence_refs": [artifact_id],
            },
            {
                "id": "studio-obs-delivered-schema",
                "subject": {"artifact_id": artifact_id},
                "property": "studio.delivery.schema",
                "value": delivered["schema"],
                "method": {"kind": "ALGORITHM", "id": "field-read", "version": "1.0.0"},
                "uncertainty": {"kind": "NONE"},
                "status": "OBSERVED",
                "evidence_refs": [artifact_id],
            },
        ]

    l1 = runtime.observe(l1_request, observer, now=NOW)
    elapsed = time.perf_counter() - started

    after_file_hash = sha256_bytes(evidence_path.read_bytes())
    if before_file_hash != after_file_hash:
        raise SystemExit("STUDIO_EVIDENCE_CHANGED_DURING_READ")

    out_dir = runtime_root / "evidence"
    if out_dir == studio_root or studio_root in out_dir.parents:
        raise SystemExit("STUDIO_WRITE_GUARD: evidence output must not be under the Studio root")
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, value in {
        "studio-l0-request.json": l0_request,
        "studio-l1-request.json": l1_request,
        "studio-l0.json": l0,
        "studio-l1.json": l1,
    }.items():
        (out_dir / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    summary = {
        "schema": "studio.language-runtime-adapter/0.1",
        "standing": "STUDIO_OWNED_SOURCE_REPRESENTED_NOT_MIGRATED",
        "studio": {
            "evidence_path": str(evidence_path),
            "evidence_sha256_before": before_file_hash,
            "evidence_sha256_after": after_file_hash,
            "evidence_unchanged": before_file_hash == after_file_hash,
            "files_written_under_studio_root": 0,
            "studio_write_guard": True,
            "studio_protocol": delivered["schema"],
            "studio_evidence_standing": document.get("standing"),
            "studio_delivery_sha256": answer["delivered_hash"],
            "studio_derived_standing": delivered.get("derived_standing"),
            "studio_source_truth": delivered["source_truth"],
            "studio_action_authority": delivered["action_authority"],
            "interpreter_rerun": False,
            "recipient_evaluation_read": False,
            "human_acceptance_changed": False,
        },
        "exchange": {
            "case_id": CASE_ID,
            "case_name": case["name"],
            "trial_id": trial["id"],
            "arm": "LANGUAGE",
            "source_id": source["id"],
            "source_sha256": source_hash,
            "source_bytes": len(source_bytes),
            "intent": delivered["intent"],
            "purpose": delivered["purpose"],
            "audience": delivered["audience"],
        },
        "l0": {
            "decision": l0["decision"]["status"],
            "artifact_identity_unchanged": l0["source"]["artifact_refs"][0]["sha256"] == source_hash,
            "provenance_method": l0["provenance"]["method"]["kind"],
        },
        "l1": {
            "observations": len(l1["observations"]),
            "properties": [item["property"] for item in l1["observations"]],
            "decision": l1["decision"]["status"],
            "artifact_identity_unchanged": l1["source"]["artifact_refs"][0]["sha256"] == source_hash,
            "provenance_context_refs": l1["provenance"]["inputs"]["context_refs"],
        },
        "context": {
            "available": [ref["id"] for ref in context_refs],
            "admitted": c1["admitted"],
            "used": c1["used"],
            "excluded": c1["excluded"],
            "unavailable": c1["unavailable"],
        },
        "portable_standing": l1["standing"],
        "authority": l1["authority"],
        "runtime": {
            "elapsed_seconds": round(elapsed, 3),
            "model_calls": 0,
            "network_calls": 0,
            "studio_imports": 0,
        },
        "hashes": {
            "l0_request": hash_json(l0_request),
            "l0": hash_json(l0),
            "l1_request": hash_json(l1_request),
            "l1": hash_json(l1),
        },
    }
    (out_dir / "studio-language-summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
