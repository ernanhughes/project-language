import copy
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE / "src"))
from understanding.cli import compile_request
from understanding.contracts import validate_wire
from understanding.pipeline import analyse_file


def request(text="Operators may proceed only after owner approval. Vendor approval is unknown."):
    version = json.loads((BASE / "profiles" / "technical-policy.json").read_text(encoding="utf-8"))["version"]
    return {"source_id": "wire-test", "source_text": text, "profile": "technical-policy", "profile_version": version, "context": {"purpose": "handoff", "intended_recipient": "fresh operator"}}


def cli(data, *args):
    env = {**os.environ, "PYTHONPATH": str(BASE / "src"), "PYTHONUTF8": "1"}
    return subprocess.run([sys.executable, *args, "-m", "understanding", "--stdin-json"], input=json.dumps(data, ensure_ascii=False).encode(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, cwd=BASE, timeout=15)


class WireTests(unittest.TestCase):
    def test_json_unicode_crlf_exact(self):
        r = request("🧭 Operators may proceed only after approval.\r\nVendor approval is unknown.")
        p = cli(r)
        self.assertEqual(p.returncode, 0, p.stderr)
        result = json.loads(p.stdout)
        self.assertEqual(result["source"]["sha256"], hashlib.sha256(r["source_text"].encode()).hexdigest())
        for item in result["segments"]:
            self.assertEqual(r["source_text"][item["start"]:item["end"]], item["text"])
        self.assertEqual(result["offset_unit"], "UNICODE_CODE_POINTS")
        self.assertEqual(result["context"], r["context"])
        validate_wire(result, "inventory-v0.1")

    def test_file_mode_preserves_crlf_and_cli(self):
        text = "Operators must retain records.\r\nApproval is unknown."
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "source.txt"
            path.write_bytes(text.encode())
            r = analyse_file(path, source_id="file", profile=BASE / "profiles/technical-policy.json")
            self.assertEqual(r["source"]["text"], text)
            p = subprocess.run([sys.executable, "-m", "understanding", "--text", str(path), "--profile", str(BASE / "profiles/technical-policy.json"), "--format", "json"], cwd=BASE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertEqual(json.loads(p.stdout)["source"]["text"], text)

    def test_batch_is_independent_and_versioned(self):
        value = {"schema": "language-understanding-batch-request/0.1", "documents": [request(), request("Staff must preserve logs.")]}
        p = cli(value)
        self.assertEqual(p.returncode, 0, p.stderr)
        results = json.loads(p.stdout)["inventories"]
        self.assertEqual(len(results), 2)
        self.assertNotEqual(results[0]["source"]["sha256"], results[1]["source"]["sha256"])
        self.assertEqual(results[0]["meaning_units"][0]["classification"]["kind"], "conditional_permission")
        self.assertEqual(results[0]["meaning_units"][-1]["classification"]["kind"], "unknown")

    def test_invalid_inputs_and_output_schema_are_refused(self):
        for value in [{**request(), "profile": "../../other"}, {**request(), "profile_version": "other"}, {**request(), "question": "hidden"}, {**request(), "context": {"question": "hidden"}}]:
            with self.assertRaises(ValueError):
                compile_request(value)
        bad = compile_request(request())
        bad["meaning_units"][0]["classification"]["review"] = "VERIFIED"
        with self.assertRaises(ValueError):
            validate_wire(bad, "inventory-v0.1")

    def test_missing_dependencies_are_explicit_without_fallback(self):
        p = cli(request(), "-S")
        self.assertNotEqual(p.returncode, 0)
        self.assertEqual(p.stdout, b"")
        self.assertIn(b"DEPENDENCY_MISSING", p.stderr)

    def test_adversarial_limits_are_preserved(self):
        cases = ["Staff may proceed only after owner approval.", "Staff must proceed before owner approval.", "Staff may publish. This permission applies only to redacted reports.", "It may proceed after review.", "Emergency rollback is allowed only for known-good builds. It never permits a new migration.", "The recipient shall return confidential records after termination.", 'Alice said, "Bob must retain the records."']
        results = [compile_request(request(text)) for text in cases]
        first, second = (r["meaning_units"][0]["classification"] for r in results[:2])
        self.assertEqual(first["kind"], "conditional_permission")
        self.assertEqual(second["kind"], "requirement")
        self.assertIn("after", first["temporal_cues"])
        self.assertIn("before", second["temporal_cues"])
        self.assertTrue(results[3]["meaning_units"][0]["classification"]["possible_unresolved_reference"])
        for r in results:
            self.assertEqual(r["relations"], [])
            self.assertEqual(r["coverage"]["standing"], "NOT_EVALUATED")
        # The narrow profile does not identify the obligation holder or resolve the quotation speaker.
        self.assertNotIn("speaker", results[-1]["meaning_units"][0])


if __name__ == "__main__":
    unittest.main()
