/** v0 engineering bounds. Conservative defaults; not empirically validated optima. */
export interface BoundsPolicy {
  policy_version: string;
  max_state_bytes: number;
  max_items: number;
  max_item_text_bytes: number;
  max_sources_per_item: number;
  max_supersession_entries: number;
  max_scope_bytes: number;
  max_actor_bytes: number;
}

export const DEFAULT_BOUNDS_V1: BoundsPolicy = {
  policy_version: "bounds/v1",
  max_state_bytes: 65536,
  max_items: 200,
  max_item_text_bytes: 4096,
  max_sources_per_item: 12,
  max_supersession_entries: 100,
  max_scope_bytes: 512,
  max_actor_bytes: 128,
};
