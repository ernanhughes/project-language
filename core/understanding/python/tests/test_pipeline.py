import json
import sys
import unittest
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE / "src"))
from understanding.pipeline import analyse, analyse_file, render_table

PROFILE = BASE / "profiles" / "technical-policy.json"
EXAMPLE = BASE / "examples" / "migration.txt"

class BaselineTests(unittest.TestCase):
    def setUp(self):
        self.result = analyse_file(EXAMPLE, source_id="migration", profile=PROFILE)

    def test_source_and_all_spans_exact(self):
        text = self.result["source"]["text"]
        for item in self.result["segments"]:
            self.assertEqual(text[item["start"]:item["end"]], item["text"])
        for item in self.result["meaning_units"]:
            self.assertEqual(text[item["start"]:item["end"]], item["source_quote"])

    def test_one_to_many_meanings(self):
        first = [m for m in self.result["meaning_units"] if m["source_segments"] == ["s1"]]
        self.assertEqual(len(first), 2)
        self.assertEqual(first[1]["classification"]["normative_force"], "DOES_NOT_CONFER_PERMISSION")
        self.assertNotEqual(first[1]["classification"]["normative_force"], "PROHIBITED")

    def test_five_sentences_and_six_meaning_units(self):
        self.assertEqual(len(self.result["segments"]), 5)
        self.assertEqual(len(self.result["meaning_units"]), 6)

    def test_different_forces(self):
        labels = {m["classification"]["normative_force"] for m in self.result["meaning_units"]}
        for needed in ("ASSERTED_IN_SOURCE", "DOES_NOT_CONFER_PERMISSION", "REQUIRED", "PERMITTED_IN_SOURCE", "UNRESOLVED"):
            self.assertIn(needed, labels)

    def test_unknown_stays_unknown(self):
        self.assertEqual(self.result["meaning_units"][-1]["classification"]["normative_force"], "UNRESOLVED")

    def test_no_implied_verification(self):
        self.assertEqual(self.result["coverage"]["semantic_completeness"], "NOT_ESTABLISHED")
        self.assertEqual(self.result["relations"], [])
        self.assertTrue(all(m["classification"]["review"] == "HEURISTIC_UNVERIFIED" for m in self.result["meaning_units"]))

    def test_bad_profile_refused(self):
        with self.assertRaises(ValueError):
            analyse("hello", source_id="x", profile={"schema":"wrong", "id":"x"})

    def test_general_profile_does_not_force_split(self):
        r = analyse_file(EXAMPLE, source_id="migration", profile=BASE / "profiles" / "general.json")
        self.assertEqual(len(r["segments"]), len(r["meaning_units"]))

    def test_table(self):
        table = render_table(self.result)
        self.assertIn("Candidate type", table)
        self.assertIn("authority_limit", table)

if __name__ == "__main__":
    unittest.main()
