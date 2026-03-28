"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;

const https = require("node:https");
const { URL } = require("node:url");

const DEFAULT_ENDPOINT = "https://substrate.garmolabs.com/mcp-server/mcp";
const REQUEST_TIMEOUT_MS = 30000;

let requestCounter = 0;

function nextId() {
  requestCounter += 1;
  return requestCounter;
}

function createClient(apiKey, options) {
  const endpoint = (options === null || options === void 0 ? void 0 : options.endpoint) ?? DEFAULT_ENDPOINT;
  const timeout = (options === null || options === void 0 ? void 0 : options.timeout) ?? REQUEST_TIMEOUT_MS;

  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("substrate-memory-ai-sdk: apiKey is required and must be a non-empty string");
  }

  async function call(method, params) {
    const body = {
      jsonrpc: "2.0",
      id: nextId(),
      method,
      ...(params !== undefined ? { params } : {}),
    };

    const payload = JSON.stringify(body);
    const parsed = new URL(endpoint);

    return new Promise((resolve, reject) => {
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
          const chunks = [];

          res.on("data", (chunk) => {
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
              const response = JSON.parse(raw);

              if (response.error) {
                reject(
                  new Error(
                    `substrate-memory-ai-sdk: RPC error ${response.error.code} — ${response.error.message}`
                  )
                );
                return;
              }

              resolve(response.result);
            } catch (_e) {
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
