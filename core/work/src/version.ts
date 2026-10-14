export const PLUGIN_ID = "opencode-work" as const;
export const PLUGIN_VERSION = "0.1.0" as const;
export const WORK_SCHEMA = "opencode.work.v1" as const;
export const RUN_SCHEMA = "opencode.work.run.v1" as const;
export const ACCEPTANCE_SCHEMA = "opencode.acceptance.v1" as const;

/**
 * Upstream packages this runtime drives through adapters. There are no
 * vendored copies of their construction semantics anywhere in this repo
 * (that would rebuild sibling behavior against their own rules); adapters
 * import the real code at configured paths until registry publication.
 */
export const EVIDENCE_PKG_REF = "opencode-evidence@88cc2e6" as const;
export const VERIFY_PKG_REF = "opencode-verify@a341298" as const;
export const PROOF_PKG_REF = "opencode-proof@e8bc732" as const;
