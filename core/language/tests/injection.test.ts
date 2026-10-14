import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyInjection,
  extractOwnedBlock,
  parseOwnedRevision,
  isWellFormedOwned,
} from "../src/index.ts";

const BLOCK_A = "<<<LANGUAGE-PROJECTION-START>>>\nschema: language.render/v1\nrevision: rev_aaa\n<<<LANGUAGE-PROJECTION-END>>>\n";
const BLOCK_B = "<<<LANGUAGE-PROJECTION-START>>>\nschema: language.render/v1\nrevision: rev_bbb\n<<<LANGUAGE-PROJECTION-END>>>\n";

function sys(...texts: string[]): unknown[] {
  return texts.map((text) => ({ type: "text", text }));
}

describe("owned-block injection math", () => {
  it("injects exactly one block when none exists", () => {
    const before = sys("hello");
    const r = applyInjection(before, BLOCK_A, "rev_aaa");
    assert.equal(r.outcome, "INJECTED");
    assert.equal(r.code, "LANG_INJECTED");
    assert.equal(r.system.length, 2);
    assert.equal(before.length, 1);
    assert.equal(extractOwnedBlock(r.system), BLOCK_A);
  });

  it("repeated hook invocation keeps exactly one block", () => {
    const first = applyInjection(sys("hello"), BLOCK_A, "rev_aaa");
    const second = applyInjection(first.system, BLOCK_A, "rev_aaa");
    assert.equal(second.outcome, "ALREADY_PRESENT");
    assert.equal(second.code, "LANG_ALREADY_PRESENT");
    assert.equal(second.system.length, 2);
    const third = applyInjection(second.system, BLOCK_A, "rev_aaa");
    assert.equal(third.system.length, 2);
  });

  it("exact pre-existing block is a no-op returning the input", () => {
    const existing = sys("x", BLOCK_A);
    const r = applyInjection(existing, BLOCK_A, "rev_aaa");
    assert.equal(r.outcome, "ALREADY_PRESENT");
    assert.equal(r.system, existing);
  });

  it("a single well-formed older revision is replaced deterministically", () => {
    const r = applyInjection(sys("x", BLOCK_A), BLOCK_B, "rev_bbb");
    assert.equal(r.outcome, "REPLACED");
    assert.equal(r.code, "LANG_REPLACED");
    assert.equal(r.system.length, 2);
    assert.equal(r.present_revision, "rev_aaa");
    assert.equal(extractOwnedBlock(r.system), BLOCK_B);
  });

  it("malformed lookalike markers fail closed", () => {
    const lookalike = sys("x", "<<<LANGUAGE-PROJECTION-START>>>\nno end here");
    const r = applyInjection(lookalike, BLOCK_A, "rev_aaa");
    assert.equal(r.outcome, "MALFORMED");
    assert.equal(r.code, "LANG_CONFLICTING_PROJECTION");
    assert.equal(r.system.length, 2);
  });

  it("duplicate owned markers fail closed", () => {
    const r = applyInjection(sys(BLOCK_A, BLOCK_A), BLOCK_B, "rev_bbb");
    assert.equal(r.outcome, "CONFLICT");
    assert.equal(r.system.length, 2);
  });

  it("same revision with different bytes fails closed", () => {
    const tampered = BLOCK_A.replace("schema:", "schema :").replace("schema :", "schema:");
    void tampered;
    const other = "<<<LANGUAGE-PROJECTION-START>>>\nschema: language.render/v1\nrevision: rev_aaa\nextra: forged\n<<<LANGUAGE-PROJECTION-END>>>\n";
    const r = applyInjection(sys(other), BLOCK_A, "rev_aaa");
    assert.equal(r.outcome, "CONFLICT");
  });

  it("ordinary similar content is not edited", () => {
    const content = sys("a block about <<< LANGUAGE projections >>> with spaces");
    const r = applyInjection(content, BLOCK_A, "rev_aaa");
    assert.equal(r.outcome, "INJECTED");
    assert.equal((r.system[0] as { text: string }).text, "a block about <<< LANGUAGE projections >>> with spaces");
  });

  it("adversarial text inside the block cannot terminate the wrapper", () => {
    const evil = "<<<LANGUAGE-PROJECTION-START>>>\ntext: quoted <<<LANGUAGE-PROJECTION-END_>> lookalike\nrevision: rev_e\n<<<LANGUAGE-PROJECTION-END>>>\n";
    assert.ok(isWellFormedOwned(evil));
    const r = applyInjection(sys("x"), evil, "rev_e");
    assert.equal(extractOwnedBlock(r.system), evil);
  });

  it("non-array context is an API error", () => {
    const r = applyInjection("nope", BLOCK_A, "rev_aaa");
    assert.equal(r.outcome, "UNSUPPORTED_SHAPE");
    assert.equal(r.code, "LANG_API_UNSUPPORTED");
  });

  it("revision parsing and well-formedness", () => {
    assert.equal(parseOwnedRevision(BLOCK_A), "rev_aaa");
    assert.equal(parseOwnedRevision("no markers"), null);
    assert.equal(isWellFormedOwned(BLOCK_A), true);
    assert.equal(isWellFormedOwned("<<<LANGUAGE-PROJECTION-END>>>\n<<<LANGUAGE-PROJECTION-START>>>\n"), false);
  });
});
