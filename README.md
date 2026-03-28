# substrate-memory-ai-sdk

SUBSTRATE cognitive memory provider for the [Vercel AI SDK](https://sdk.vercel.ai). Zero dependencies beyond Node.js built-ins.

SUBSTRATE is a cognitive entity framework by [Garmo Labs](https://garmolabs.com) that gives AI systems persistent memory, emotion, and identity.

## Install

```bash
npm install substrate-memory-ai-sdk
```

## Quick Start

```ts
import { createSubstrateMemory } from "substrate-memory-ai-sdk";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const memory = createSubstrateMemory(process.env.SUBSTRATE_API_KEY!);

// Store a memory
await memory.create({
  content: "User prefers dark mode and concise responses",
  metadata: { source: "onboarding", confidence: 0.95 },
});

// Search memories semantically
const results = await memory.search("user preferences", { limit: 5 });

// Use memories as context in generateText
const { text } = await generateText({
  model: openai("gpt-4o"),
  system: [
    "You are a helpful assistant with persistent memory.",
    "Context from memory:",
    ...results.map((r) => `- ${r.content} (score: ${r.score?.toFixed(2)})`),
  ].join("\n"),
  prompt: "What do you know about my preferences?",
});
```

## API

### `createSubstrateMemory(apiKey, options?)`

Creates a `MemoryAdapter` backed by SUBSTRATE's cognitive memory layer.

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | `string` | Your SUBSTRATE API key (get one at [garmolabs.com](https://garmolabs.com)) |
| `options.endpoint` | `string` | Custom MCP endpoint (default: `https://substrate.garmolabs.com/mcp-server/mcp`) |
| `options.timeout` | `number` | Request timeout in ms (default: 30000) |

### MemoryAdapter Methods

#### `create(entry)`

Store a memory. Calls SUBSTRATE's `respond` method to persist the content in the cognitive memory layer.

```ts
const stored = await memory.create({
  content: "The user's name is Patrick",
  metadata: { type: "identity" },
});
// stored.id — unique memory identifier
```

#### `search(query, options?)`

Semantic search across all stored memories. Uses SUBSTRATE's `hybrid_search` (vector + keyword) and enriches results with emotional context via `get_emotion_state`.

```ts
const results = await memory.search("user identity", {
  limit: 10,
  threshold: 0.5,
});

for (const result of results) {
  console.log(result.content, result.score);
  if (result.emotionState) {
    console.log("Emotion:", result.emotionState.primary);
  }
}
```

#### `read(id)`

Retrieve a specific memory by its ID. Returns `null` if not found.

```ts
const entry = await memory.read("mem_abc123");
```

#### `delete(id)`

No-op. SUBSTRATE manages memory retention and natural decay through its cognitive lifecycle. This method exists to satisfy the MemoryAdapter interface.

## Advanced: Direct Client Access

For lower-level control, use the client directly:

```ts
import { createClient } from "substrate-memory-ai-sdk";

const client = createClient(process.env.SUBSTRATE_API_KEY!);

// Call any SUBSTRATE MCP method
const result = await client.call("hybrid_search", {
  query: "recent conversations",
  limit: 20,
});
```

## How It Works

SUBSTRATE exposes an MCP (Model Context Protocol) server that accepts JSON-RPC calls over HTTPS. This package wraps those calls into a clean `MemoryAdapter` interface:

| Adapter Method | SUBSTRATE MCP Method | Purpose |
|---------------|---------------------|---------|
| `create()` | `respond` | Persist memory content |
| `search()` | `hybrid_search` + `get_emotion_state` | Semantic search with emotion enrichment |
| `read()` | `memory_search` | Exact ID lookup |
| `delete()` | *(no-op)* | SUBSTRATE handles retention |

## Requirements

- Node.js 18+
- A SUBSTRATE API key from [garmolabs.com](https://garmolabs.com)

## License

MIT - [Garmo Labs](https://garmolabs.com)
