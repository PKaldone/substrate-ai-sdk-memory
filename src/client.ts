import https from "node:https";
import { URL } from "node:url";

const DEFAULT_ENDPOINT = "https://substrate.garmolabs.com/mcp-server/mcp";
const REQUEST_TIMEOUT_MS = 30_000;

export interface SubstrateClientOptions {
  readonly endpoint?: string;
  readonly timeout?: number;
}

export interface JsonRpcRequest {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

export interface JsonRpcResponse<T = unknown> {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly result?: T;
  readonly error?: {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
  };
}

let requestCounter = 0;

function nextId(): number {
  requestCounter += 1;
  return requestCounter;
}

export function createClient(apiKey: string, options?: SubstrateClientOptions) {
  const endpoint = options?.endpoint ?? DEFAULT_ENDPOINT;
  const timeout = options?.timeout ?? REQUEST_TIMEOUT_MS;

  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("substrate-memory-ai-sdk: apiKey is required and must be a non-empty string");
  }

  async function call<T = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const body: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: nextId(),
      method,
      ...(params !== undefined ? { params } : {}),
    };

    const payload = JSON.stringify(body);
    const parsed = new URL(endpoint);

    return new Promise<T>((resolve, reject) => {
      const req = https.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || 443,
          path: parsed.pathname + parsed.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            Authorization: `Bearer ${apiKey}`,
            "User-Agent": "substrate-memory-ai-sdk/1.0.0",
          },
          timeout,
        },
        (res) => {
          const chunks: Buffer[] = [];

          res.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });

          res.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf-8");

            if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
              reject(
                new Error(
                  `substrate-memory-ai-sdk: HTTP ${res.statusCode} from ${endpoint} — ${raw.slice(0, 500)}`
                )
              );
              return;
            }

            try {
              const response: JsonRpcResponse<T> = JSON.parse(raw);

              if (response.error) {
                reject(
                  new Error(
                    `substrate-memory-ai-sdk: RPC error ${response.error.code} — ${response.error.message}`
                  )
                );
                return;
              }

              resolve(response.result as T);
            } catch {
              reject(
                new Error(
                  `substrate-memory-ai-sdk: failed to parse response — ${raw.slice(0, 500)}`
                )
              );
            }
          });

          res.on("error", reject);
        }
      );

      req.on("error", reject);

      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`substrate-memory-ai-sdk: request timed out after ${timeout}ms`));
      });

      req.write(payload);
      req.end();
    });
  }

  return { call };
}

export type SubstrateClient = ReturnType<typeof createClient>;
