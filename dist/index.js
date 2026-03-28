"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubstrateMemory = createSubstrateMemory;
exports.createClient = void 0;
exports.createMemoryAdapter = void 0;

const { createClient } = require("./client");
const { createMemoryAdapter } = require("./adapter");

exports.createClient = createClient;
exports.createMemoryAdapter = createMemoryAdapter;

/**
 * Create a SUBSTRATE-backed memory provider for the Vercel AI SDK.
 *
 * @param {string} apiKey - Your SUBSTRATE API key from garmolabs.com
 * @param {object} [options] - Optional configuration (custom endpoint, timeout)
 * @returns {object} A MemoryAdapter compatible with the Vercel AI SDK
 */
function createSubstrateMemory(apiKey, options) {
  const client = createClient(apiKey, options);
  return createMemoryAdapter(client);
}
