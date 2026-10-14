import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeState,
  parseState,
  serializeState,
  validateState,
  LanguageError,
  type LanguageState,
} from "../src/index.ts";
import { item, ref } from "./helpers.ts";

function validState(): LanguageState {
  return {
    schema: "language.state/v1",
    items: [
      { ...item("a1", { kind: "objective", text: "Ship it." }), sources: [ref("s1", "m1")] },
      item("b2", { kind: "ambiguity", standing: "tentative", text: "Which date?" }),
    ],
    superseded: [],
  };
}

describe("canonical markdown", () => {
  it("round-trips parse(serialize) and serialize(parse)", () => {
    const text = serializeState(validState());
    const parsed = parseState(text);
    assert.equal(serializeState(parsed), text);
    assert.deepEqual(parseState(serializeState(parsed)), parsed);
  });

  it("is UTF-8 with LF endings and exactly one final newline", () => {
    const text = serializeState(validState());
    assert.ok(!text.includes("\r"));
    assert.ok(text.endsWith("\n") && !text.endsWith("\n\n"));
    const reparsed = parseState(text);
    assert.equal(serializeState(reparsed), text);
  });

  it("normalizes CRLF human edits on parse, canonicalizes on serialize", () => {
    const canonical = serializeState(validState());
    const crlf = canonical.replace(/\n/g, "\r\n");
    assert.equal(serializeState(parseState(crlf)), canonical);
  });

  it("canonical JSON output is stable", async () => {
    const { canonicalJsonBytes } = await import("../src/index.ts");
    assert.equal(canonicalJsonBytes({ b: 1, a: 2 }), canonicalJsonBytes({ a: 2, b: 1 }));
    assert.ok(canonicalJsonBytes({ a: 1 }).endsWith("\n"));
  });

  it("rejects malformed headings, fields, ids, standings, hashes, and versions", () => {
    const base = serializeState(validState());
    assert.throws(() => parseState("no header"), LanguageError);
    assert.throws(() => parseState(base.replace("schema: language.state/v1", "schema: language.state/v9")), LanguageError);
    assert.throws(() => parseState(base.replace("### item a1", "### item a1\n### item a1")), LanguageError);
    assert.throws(() => parseState(base.replace("standing: explicit", "standing: certain")), LanguageError);
    assert.throws(() => parseState(base.replace("a".repeat(64), "ZZZ")), LanguageError);
    assert.throws(() => parseState(`${base}\n## Secrets\n`), LanguageError);
    assert.throws(() => parseState(base.replace("kind: objective", "kind: objective\nkind: objective")), LanguageError);
    assert.throws(() => parseState(base.replace("scope: episode", "scope:")), LanguageError);
  });

  it("rejects missing actor, scope, and sources", () => {
    const noActor = { ...item("x1"), actor: "" };
    assert.throws(() => validateState({ schema: "language.state/v1", items: [noActor], superseded: [] }), LanguageError);
    const noSources = { ...item("x1"), sources: [] };
    assert.throws(() => validateState({ schema: "language.state/v1", items: [noSources], superseded: [] }), LanguageError);
  });

  it("enforces active/superseded consistency and ambiguity resolution rules", () => {
    const badActive = { ...item("x1"), superseded_by: "y" };
    assert.throws(() => validateState({ schema: "language.state/v1", items: [badActive], superseded: [] }), LanguageError);
    const badSuperseded = { ...item("x1"), standing: "superseded" as const };
    assert.throws(() => validateState({ schema: "language.state/v1", items: [badSuperseded], superseded: [] }), LanguageError);
    const resolvedNoRef = { ...item("x1", { kind: "ambiguity" }), standing: "explicit" as const };
    assert.throws(() => validateState({ schema: "language.state/v1", items: [resolvedNoRef], superseded: [] }), LanguageError);
    const selfResolved = {
      ...item("x1", { kind: "ambiguity" }),
      standing: "explicit" as const,
      resolved_by: ref("s-x1", "m-x1"),
    };
    assert.throws(() => validateState({ schema: "language.state/v1", items: [selfResolved], superseded: [] }), LanguageError);
    const ok = {
      ...item("x1", { kind: "ambiguity" }),
      standing: "explicit" as const,
      resolved_by: ref("s-new", "m-new"),
    };
    validateState({ schema: "language.state/v1", items: [ok], superseded: [] });
  });

  it("canonicalizes item and source order deterministically", () => {
    const s1 = validState();
    const reversed: LanguageState = { schema: s1.schema, items: [...s1.items].reverse(), superseded: [] };
    assert.equal(serializeState(reversed), serializeState(s1));
    assert.deepEqual(canonicalizeState(reversed).items.map((i) => i.id), ["a1", "b2"]);
  });

  it("rejects reserved renderer delimiters in item text", () => {
    const evil = item("x1", { text: "<<<LANGUAGE-PROJECTION-START>>>" });
    assert.throws(() => validateState({ schema: "language.state/v1", items: [evil], superseded: [] }), LanguageError);
  });
});
