"""Targeted development fixtures for the LC-02-R1 decomposition baseline.

These are regression fixtures, not a semantic benchmark. They pin only the
behaviour that the LC-02-BATCH20 evidence showed was missing or misleading.
"""
import sys
import unittest
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE / "src"))
from understanding.pipeline import analyse

PROFILE = BASE / "profiles" / "technical-policy.json"
GENERAL = BASE / "profiles" / "general.json"


def run(text, profile=PROFILE):
    return analyse(text, source_id="r1-fixture", profile=profile)


class DecompositionFixtures(unittest.TestCase):
    def test_one_sentence_can_yield_multiple_meaning_units(self):
        result = run(
            "Paging is permitted; restarting the replica still requires a separate incident command."
        )
        self.assertEqual(len(result["segments"]), 1)
        self.assertEqual(len(result["meaning_units"]), 2)
        self.assertEqual(result["meaning_units"][0]["source_quote"], "Paging is permitted")
        self.assertEqual(result["meaning_units"][0]["classification"]["kind"], "permission")
        self.assertEqual(result["meaning_units"][1]["classification"]["kind"], "requirement")

    def test_requirements_and_separately_attached_prerequisites(self):
        result = run(
            "An incident operator may restore the service only if a signed known-good image is used and the audit log remains intact."
        )
        unit = result["meaning_units"][0]
        self.assertEqual(unit["classification"]["kind"], "conditional_permission")
        self.assertEqual(
            unit["classification"]["prerequisites"],
            ["a signed known-good image is used", "the audit log remains intact"],
        )

    def test_negation_and_scope_are_not_collapsed(self):
        result = run(
            "The note does not grant an operator permission to discard the replica. "
            "The replica must not be exposed to customers. "
            "A failed checksum may indicate that the replica is stale."
        )
        forces = [m["classification"]["normative_force"] for m in result["meaning_units"]]
        self.assertEqual(forces, ["DOES_NOT_CONFER_PERMISSION", "PROHIBITED", "ASSERTED_IN_SOURCE"])
        self.assertNotIn("PERMITTED_IN_SOURCE", forces)

    def test_conditional_permission(self):
        result = run("An operator may proceed only if the ticket is open and the audit log is intact.")
        unit = result["meaning_units"][0]
        self.assertEqual(unit["classification"]["kind"], "conditional_permission")
        self.assertIn("only if", unit["classification"]["condition_cues"])

    def test_later_exception_is_preserved_but_not_linked(self):
        result = run(
            "During an outage, operators may retrieve the backup credential into an isolated terminal. "
            "This exception does not allow posting the credential in a shared chat."
        )
        self.assertEqual(len(result["meaning_units"]), 2)
        exception = result["meaning_units"][1]
        self.assertEqual(exception["classification"]["kind"], "authority_limit")
        self.assertTrue(exception["classification"]["possible_unresolved_reference"])
        # The baseline deliberately does not claim a cross-sentence relation.
        self.assertEqual(result["relations"], [])

    def test_cross_sentence_reference_is_flagged_not_resolved(self):
        result = run("Such a restore must not expose the recovery environment to customers.")
        unit = result["meaning_units"][0]
        self.assertTrue(unit["classification"]["possible_unresolved_reference"])
        self.assertEqual(unit["classification"]["kind"], "prohibition")

    def test_speaker_attribution_is_captured_as_a_candidate(self):
        result = run("Reviewer: Can the draft go to the group? Chair: Yes, I approve circulating the draft inside that group.")
        self.assertEqual([m["classification"]["speaker"] for m in result["meaning_units"]], ["Reviewer", "Chair"])
        self.assertEqual(result["meaning_units"][1]["classification"]["review"], "HEURISTIC_UNVERIFIED")

    def test_appropriate_uncertainty(self):
        result = run("Whether the outside vendor may retain its own recovery copy has not yet been decided.")
        unit = result["meaning_units"][0]
        self.assertEqual(unit["classification"]["kind"], "unknown")
        self.assertEqual(unit["classification"]["normative_force"], "UNRESOLVED")

    def test_general_profile_does_not_inherit_policy_split_rules(self):
        result = run(
            "Paging is permitted; restarting the replica still requires a separate incident command.",
            profile=GENERAL,
        )
        self.assertEqual(len(result["segments"]), 1)
        self.assertEqual(len(result["meaning_units"]), 1)

    def test_engine_states_blank_fallback_explicitly(self):
        result = run("Operators may proceed.")
        self.assertIn(result["engine"]["id"], ("spacy/blank-en+sentencizer", "spacy/en_core_web_sm"))
        if not result["engine"]["trained_syntax_available"]:
            self.assertEqual(result["engine"]["fallback_reason"], "SPACY_MODEL_NOT_INSTALLED")
            self.assertEqual(result["engine"]["trained_model_requested"], "en_core_web_sm")
        self.assertEqual(result["engine"]["version"], "0.2.0")


if __name__ == "__main__":
    unittest.main()
