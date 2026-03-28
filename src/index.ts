export { createClient, type SubstrateClient, type SubstrateClientOptions } from "./client";
export {
  createMemoryAdapter,
  type MemoryAdapter,
  type MemoryEntry,
  type StoredMemoryEntry,
  type EmotionState,
  type SearchOptions,
} from "./adapter";

import { createClient, type SubstrateClientOptions } from "./client";
import { createMemoryAdapter, type MemoryAdapter } from "./adapter";

/**
 * Create a SUBSTRATE-backed memory provider for the Vercel AI SDK.
 *
 * @param apiKey  - Your SUBSTRATE API key from garmolabs.com
 * @param options - Optional configuration (custom endpoint, timeout)
 * @returns A MemoryAdapter compatible with the Vercel AI SDK
 *
 * @example
 * ```ts
 * import { createSubstrateMemory } from "substrate-memory-ai-sdk";
 * import { generateText } from "ai";
 * import { openai } from "@ai-sdk/openai";
 *
 * const memory = createSubstrateMemory(process.env.SUBSTRATE_API_KEY!);
 *
 * // Store a memory
 * await memory.create({ content: "User prefers dark mode" });
 *
 * // Search memories for context
 * const results = await memory.search("user preferences");
 *
 * // Use memories as context in generateText
 * const { text } = await generateText({
 *   model: openai("gpt-4o"),
 *   system: `Context from memory:\n${results.map(r => r.content).join("\n")}`,
 *   prompt: "What are the user's preferences?",
 * });
 * ```
 */
export function createSubstrateMemory(
  apiKey: string,
  options?: SubstrateClientOptions
): MemoryAdapter {
  const client = createClient(apiKey, options);
  return createMemoryAdapter(client);
}
