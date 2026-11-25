import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = "claude-opus-5-5";

let _client: Anthropic | null = null;
function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new MissingKeyError();
  }
  _client ??= new Anthropic();
  return _client;
}

export class MissingKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set on the server.");
  }
}

type Content = Anthropic.Beta.Messages.BetaContentBlockParam[] | string;

/**
 * One structured call to Claude. Returns parsed, schema-validated JSON.
 * Server-only: the API key never reaches the browser.
 */
export async function structured<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  content: Content;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const res = await client().beta.messages.parse({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.content }],
  });
  if (res.stop_reason === "refusal") throw new Error("Claude declined this request.");
  if (res.stop_reason === "max_tokens") throw new Error("Response was cut off (max_tokens).");
  if (!res.parsed_output) throw new Error("Could not parse Claude's response.");
  return res.parsed_output as z.infer<S>;
}

export function errorResponse(err: unknown) {
  if (err instanceof MissingKeyError) {
    return Response.json({ error: err.message, code: "missing_key" }, { status: 503 });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return Response.json({ error: "Rate limited by the Claude API. Try again in a moment." }, { status: 429 });
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return Response.json({ error: "The server's Anthropic API key was rejected." }, { status: 503 });
  }
  if (err instanceof Anthropic.APIError) {
    return Response.json({ error: `Claude API error (${err.status}).` }, { status: 502 });
  }
  console.error(err);
  return Response.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
}
