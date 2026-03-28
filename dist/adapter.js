"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMemoryAdapter = createMemoryAdapter;

function createMemoryAdapter(client) {
  return {
    /**
     * Store a memory by sending content to SUBSTRATE via `respond`.
     */
    async create(entry) {
      const result = await client.call("respond", {
        content: entry.content,
        ...(entry.metadata ? { metadata: entry.metadata } : {}),
      });

      const id = (result === null || result === void 0 ? void 0 : result.memory_id) ??
        (result === null || result === void 0 ? void 0 : result.id) ??
        crypto.randomUUID();
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
     */
    async read(id) {
      if (!id || typeof id !== "string") {
        return null;
      }

      try {
        const result = await client.call("memory_search", {
          query: id,
          limit: 1,
          exact_id: true,
        });

        const items = (result === null || result === void 0 ? void 0 : result.results) ?? [];
        if (items.length === 0) {
          return null;
        }

        const item = items[0];
        return {
          id: item.id ?? id,
          content: item.content ?? "",
          metadata: item.metadata,
          score: item.score,
          createdAt: new Date(),
        };
      } catch (_e) {
        return null;
      }
    },

    /**
     * Semantic search across SUBSTRATE's cognitive memory.
     * Uses `hybrid_search` + `get_emotion_state` enrichment.
     */
    async search(query, options) {
      const limit = (options === null || options === void 0 ? void 0 : options.limit) ?? 10;
      const threshold = (options === null || options === void 0 ? void 0 : options.threshold) ?? 0.0;

      const result = await client.call("hybrid_search", {
        query,
        limit,
        ...(threshold > 0 ? { threshold } : {}),
        ...((options === null || options === void 0 ? void 0 : options.filter) ? { filter: options.filter } : {}),
      });

      const items = (result === null || result === void 0 ? void 0 : result.results) ?? [];
      if (items.length === 0) {
        return [];
      }

      const enriched = await Promise.all(
        items.map(async (item) => {
          const base = {
            id: item.id ?? "",
            content: item.content ?? "",
            metadata: item.metadata,
            score: item.score,
            createdAt: new Date(),
          };

          if (!item.id) {
            return base;
          }

          try {
            const emotion = await client.call("get_emotion_state", {
              memory_id: item.id,
            });

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
          } catch (_e) {
            // Emotion enrichment is best-effort
          }

          return base;
        })
      );

      return enriched;
    },

    /**
     * No-op — SUBSTRATE manages memory retention internally.
     */
    async delete(_id) {
      // SUBSTRATE manages memory retention through its cognitive lifecycle.
    },
  };
}
