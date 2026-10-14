/**
 * Capability seam: the Work runtime coordinates capabilities, never absorbs them.
 *
 * A capability is an independent behavior owner (evidence, verify, proof,
 * expertise, model, ...) behind a narrow contract: identity, supported
 * operations, availability, and an opaque handle the engine invokes through
 * typed per-capability interfaces. The registry answers what exists and
 * whether it is usable; it never judges truth, intent, amendments, or
 * authority. No capability may reach the Work mutation path — handles are
 * the only reference the engine holds.
 */

export class CapabilityError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
  }
}

export interface CapabilityRegistration {
  /** Stable capability id, e.g. "evidence", "verify", "proof", "expertise", "model". */
  id: string;
  /** Capability implementation version (upstream package version where applicable). */
  version: string;
  /** Work op kinds this capability serves, e.g. ["CAPTURE_EVIDENCE"]. */
  operations: readonly string[];
  /** False when registered but not usable (missing runtime, no provider, ...). */
  available: boolean;
  /** Machine-readable reason when unavailable; absent when available. */
  unavailableReason?: string;
  /** Opaque handle; null when unavailable. Engine invokes it only via typed interfaces. */
  handle: unknown;
}

export interface CapabilityDescriptor {
  id: string;
  version: string;
  operations: readonly string[];
  available: boolean;
  reason?: string;
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export class CapabilityRegistry {
  private readonly map = new Map<string, CapabilityRegistration>();

  register(reg: CapabilityRegistration): void {
    if (typeof reg !== "object" || reg === null) {
      throw new CapabilityError("CAPABILITY_INVALID", "registration must be an object");
    }
    if (!nonEmptyString(reg.id)) {
      throw new CapabilityError("CAPABILITY_INVALID", "registration id must be a non-empty string");
    }
    if (this.map.has(reg.id)) {
      throw new CapabilityError("CAPABILITY_DUPLICATE", `capability "${reg.id}" is already registered`);
    }
    if (!nonEmptyString(reg.version)) {
      throw new CapabilityError("CAPABILITY_INVALID", `capability "${reg.id}": version required`);
    }
    if (!Array.isArray(reg.operations) || !reg.operations.every((o) => typeof o === "string")) {
      throw new CapabilityError("CAPABILITY_INVALID", `capability "${reg.id}": operations must be string[]`);
    }
    if (typeof reg.available !== "boolean") {
      throw new CapabilityError("CAPABILITY_INVALID", `capability "${reg.id}": available must be boolean`);
    }
    if (reg.available && (reg.handle === null || reg.handle === undefined)) {
      throw new CapabilityError(
        "CAPABILITY_INVALID",
        `capability "${reg.id}": available capabilities must carry a handle`,
      );
    }
    this.map.set(reg.id, { ...reg, operations: [...reg.operations] });
  }

  lookup(id: string): CapabilityRegistration | null {
    return this.map.get(id) ?? null;
  }

  /** Resolve a usable handle or fail loudly. Unknown and unavailable are distinct errors. */
  require<T>(id: string): T {
    const reg = this.map.get(id);
    if (!reg) {
      throw new CapabilityError("CAPABILITY_UNKNOWN", `no capability registered as "${id}"`);
    }
    if (!reg.available || reg.handle === null || reg.handle === undefined) {
      throw new CapabilityError(
        "CAPABILITY_UNAVAILABLE",
        `capability "${id}" unavailable: ${reg.unavailableReason ?? "not configured"}`,
      );
    }
    return reg.handle as T;
  }

  describe(id: string): CapabilityDescriptor {
    const reg = this.map.get(id);
    if (!reg) {
      throw new CapabilityError("CAPABILITY_UNKNOWN", `no capability registered as "${id}"`);
    }
    return {
      id: reg.id,
      version: reg.version,
      operations: [...reg.operations],
      available: reg.available,
      ...(reg.unavailableReason !== undefined ? { reason: reg.unavailableReason } : {}),
    };
  }

  list(): CapabilityDescriptor[] {
    return [...this.map.values()]
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((reg) => ({
        id: reg.id,
        version: reg.version,
        operations: [...reg.operations],
        available: reg.available,
        ...(reg.unavailableReason !== undefined ? { reason: reg.unavailableReason } : {}),
      }));
  }

  async health(): Promise<{ capabilities: CapabilityDescriptor[] }> {
    return { capabilities: this.list() };
  }
}
