import { describe, expect, test } from "../../../harness/bun-test.ts";
import { CapabilityError, CapabilityRegistry } from "../src/capabilities.ts";

function reg(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-cap",
    version: "1.0.0",
    operations: ["TEST_OP"],
    available: true,
    handle: { ping: true },
    ...overrides,
  };
}

describe("capability registry", () => {
  test("register, lookup, describe, sorted list", () => {
    const registry = new CapabilityRegistry();
    registry.register(reg({ id: "b-cap", version: "2.0.0", operations: ["B"] }));
    registry.register(reg({ id: "a-cap" }));
    expect(registry.lookup("a-cap")?.version).toBe("1.0.0");
    expect(registry.lookup("ghost")).toBeNull();
    expect(registry.describe("b-cap")).toEqual({
      id: "b-cap",
      version: "2.0.0",
      operations: ["B"],
      available: true,
    });
    expect(registry.list().map((d) => d.id)).toEqual(["a-cap", "b-cap"]);
  });

  test("duplicate registration fails", () => {
    const registry = new CapabilityRegistry();
    registry.register(reg({ id: "dup" }));
    try {
      registry.register(reg({ id: "dup" }));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CapabilityError);
      expect((error as CapabilityError).code).toBe("CAPABILITY_DUPLICATE");
    }
  });

  test("invalid registrations fail closed", () => {
    const registry = new CapabilityRegistry();
    const bad = [
      reg({ id: "" }),
      reg({ id: "x", version: "" }),
      reg({ id: "x", operations: "nope" }),
      reg({ id: "x", available: "yes" }),
      reg({ id: "x", available: true, handle: null }),
    ];
    for (const input of bad) {
      try {
        registry.register(input as never);
        expect.unreachable();
      } catch (error) {
        expect((error as CapabilityError).code).toBe("CAPABILITY_INVALID");
      }
    }
  });

  test("require distinguishes unknown from unavailable", () => {
    const registry = new CapabilityRegistry();
    registry.register({
      id: "down",
      version: "0.0.0",
      operations: [],
      available: false,
      unavailableReason: "not configured",
      handle: null,
    });
    try {
      registry.require("ghost");
      expect.unreachable();
    } catch (error) {
      expect((error as CapabilityError).code).toBe("CAPABILITY_UNKNOWN");
    }
    try {
      registry.require("down");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CapabilityError);
      expect((error as CapabilityError).code).toBe("CAPABILITY_UNAVAILABLE");
      expect(String(error)).toContain("not configured");
    }
  });

  test("require returns the opaque handle when available", () => {
    const registry = new CapabilityRegistry();
    const handle = { search: async () => ({}) };
    registry.register({ id: "k", version: "3.1.0", operations: ["SEARCH"], available: true, handle });
    const got: unknown = registry.require("k");
    expect(got === (handle as unknown)).toBe(true);
  });

  test("health reports descriptors without handles", async () => {
    const registry = new CapabilityRegistry();
    registry.register(reg({ id: "up" }));
    registry.register({ id: "down", version: "0", operations: [], available: false, unavailableReason: "x", handle: null });
    const health = await registry.health();
    expect(health.capabilities).toHaveLength(2);
    expect(JSON.stringify(health)).not.toContain("ping");
  });
});
