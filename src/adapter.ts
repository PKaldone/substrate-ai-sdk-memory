import { type SubstrateClient } from "./client";

// ── Types ──────────────────────────────────────────────────────────────

export interface MemoryEntry {
  readonly id?: string;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt?: Date;
}

export interface StoredMemoryEntry extends MemoryEntry {
  readonly id: string;
  readonly createdAt: Date;
  readonly score?: number;
  readonly emotionState?: EmotionState;
}

export interface EmotionState {
  readonly valence: number;
  readonly arousal: number;
  readonly dominance: number;
  readonly primary?: string;
}

export interface SearchOptions {
  readonly limit?: number;
  readonly threshold?: number;
  readonly filter?: Record<string, unknown>;
}

export interface SubstrateRespondResult {
  readonly id?: string;
  readonly response?: string;
  readonly memory_id?: string;
  readonly [key: string]: unknown;
}

export interface SubstrateSearchResult {
  readonly results?: ReadonlyArray<{
    readonly id?: string;
    readonly content?: string;
    readonly score?: number;
    readonly metadata?: Record<string, unknown>;
    readonly [key: string]: unknown;
  }>;
  readonly [key: string]: unknown;
}

export interface SubstrateEmotionResult {
  readonly valence?: number;
  readonly arousal?: number;
  readonly dominance?: number;
  readonly primary?: string;
  readonly [key: string]: unknown;
}

// ── Adapter ────────────────────────────────────────────────────────────

export interface MemoryAdapter {
  create(entry: MemoryEntry): Promise<StoredMemoryEntry>;
  read(id: string): Promise<StoredMemoryEntry | null>;
  search(query: string, options?: SearchOptions): Promise<readonly StoredMemoryEntry[]>;
  delete(id: string): Promise<void>;
}

export function createMemoryAdapter(client: SubstrateClient): MemoryAdapter {
  return {
    /**
     * Store a memory by sending content to SUBSTRATE via `respond`.
     * SUBSTRATE persists the interaction in its cognitive memory layer.
     */
    async create(entry: MemoryEntry): Promise<StoredMemoryEntry> {
      const result = await client.call<SubstrateRespondResult>("respond", {
        content: entry.content,
        ...(entry.metadata ? { metadata: entry.metadata } : {}),
      });

      const id = result?.memory_id ?? result?.id ?? crypto.randomUUID();
      const now = new Date();

      return {
        id,
        content: entry.content,
        metadata: entry.metadata,
        createdAt: entry.createdAt ?? now,
      };
    },

    /**
     * Retrieve a memory by ID using `memory_search` with an exact-match query.
     * Returns null if no matching memory is found.
     */
    async read(id: string): Promise<StoredMemoryEntry | null> {
      if (!id || typeof id !== "string") {
        return null;
      }

      try {
        const result = await client.call<SubstrateSearchResult>("memory_search", {
          query: id,
          limit: 1,
          exact_id: true,
        });

        const items = result?.results ?? [];
        if (items.length === 0) {
          return null;
        }

        const item = items[0];
        return {
          id: item.id ?? id,
          content: item.content ?? "",
          metadata: item.metadata as Record<string, unknown> | undefined,
          score: item.score,
          createdAt: new Date(),
        };
      } catch {
        return null;
      }
    },

    /**
     * Semantic search across SUBSTRATE's cognitive memory.
     *
     * Uses `hybrid_search` for best recall (combines vector + keyword),
     * then enriches each result with `get_emotion_state` to surface
     * the emotional context stored alongside the memory.
     */
    async search(
      query: string,
      options?: SearchOptions
    ): Promise<readonly StoredMemoryEntry[]> {
      const limit = options?.limit ?? 10;
      const threshold = options?.threshold ?? 0.0;

      const result = await client.call<SubstrateSearchResult>("hybrid_search", {
        query,
        limit,
        ...(threshold > 0 ? { threshold } : {}),
        ...(options?.filter ? { filter: options.filter } : {}),
      });

      const items = result?.results ?? [];
      if (items.length === 0) {
        return [];
      }

      // Enrich results with emotion state in parallel
      const enriched: StoredMemoryEntry[] = await Promise.all(
        items.map(async (item) => {
          const base: StoredMemoryEntry = {
            id: item.id ?? "",
            content: item.content ?? "",
            metadata: item.metadata as Record<string, unknown> | undefined,
            score: item.score,
            createdAt: new Date(),
          };

          if (!item.id) {
            return base;
          }

          try {
            const emotion = await client.call<SubstrateEmotionResult>(
              "get_emotion_state",
              { memory_id: item.id }
            );

            if (emotion && typeof emotion.valence === "number") {
              return {
                ...base,
                emotionState: {
                  valence: emotion.valence,
                  arousal: emotion.arousal ?? 0,
                  dominance: emotion.dominance ?? 0,
                  primary: emotion.primary,
                },
              };
            }
          } catch {
            // Emotion enrichment is best-effort; return base entry on failure
          }

          return base;
        })
      );

      return enriched;
    },

    /**
     * Delete is a no-op — SUBSTRATE manages memory retention and decay
     * through its own cognitive lifecycle. This method exists to satisfy
     * the MemoryAdapter interface contract.
     */
    async delete(_id: string): Promise<void> {
      // SUBSTRATE manages memory retention internally.
      // Memories decay naturally through the cognitive lifecycle.
    },
  };
}
