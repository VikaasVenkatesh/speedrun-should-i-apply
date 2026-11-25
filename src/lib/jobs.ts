import "server-only";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Job } from "./schemas";
import { SAMPLE_JOBS } from "./sample-jobs";

/**
 * Jobs come from the speedrun talent network.
 *   1. Primary: speedrun's public MCP server (mcp.speedrun-talent-network.com)
 *   2. Fallback: the same data over its REST API (/api/v1)
 *   3. Last resort: a small bundled sample, labeled "Sample data" in the UI
 * Everything is cached in memory for a few minutes. No user data is sent.
 */

const MCP_URL = "https://mcp.speedrun-talent-network.com/mcp";
const REST = "https://speedrun-talent-network.com/api/v1";
const SOURCE = "should-i-apply";
const TTL = 5 * 60_000;

export type JobSource = "mcp" | "rest" | "sample";
export type SearchParams = { q?: string; fn?: string; wp?: string; scope?: "speedrun" | "portfolio"; sen?: string; emp?: string };

const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return value;
}

/* ---------------- MCP ---------------- */

let mcp: Promise<Client> | null = null;
function mcpClient() {
  mcp ??= (async () => {
    const c = new Client({ name: SOURCE, version: "1.0.0" });
    await c.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)));
    return c;
  })().catch((e) => {
    mcp = null;
    throw e;
  });
  return mcp;
}

async function callMcp<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const run = async () => {
    const c = await mcpClient();
    const res = await withTimeout(c.callTool({ name, arguments: { ...args } }), 12_000);
    if (res.isError) throw new Error(`MCP ${name} error`);
    const block = (res.content as { type: string; text?: string }[]).find((b) => b.type === "text");
    if (!block?.text) throw new Error(`MCP ${name}: empty`);
    return JSON.parse(block.text) as T;
  };
  try {
    return await run();
  } catch {
    // session may have expired; reconnect once
    mcp = null;
    return await run();
  }
}

/* ---------------- REST ---------------- */

async function rest<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
  const u = new URL(REST + path);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  u.searchParams.set("source", SOURCE);
  const res = await fetch(u, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`REST ${path} ${res.status}`);
  return (await res.json()) as T;
}

/* ---------------- Public API ---------------- */

type RawJob = Record<string, unknown>;

export async function searchJobs(p: SearchParams): Promise<{ jobs: Job[]; total: number; source: JobSource }> {
  const args = Object.fromEntries(Object.entries(p).filter(([, v]) => v)) as Record<string, string>;
  return cached(`search:${JSON.stringify(args)}`, async () => {
    try {
      const r = await callMcp<{ jobs: RawJob[]; total: number }>("search_jobs", args);
      return { jobs: r.jobs.map(normalize), total: r.total, source: "mcp" as const };
    } catch (e) {
      console.warn("[jobs] MCP search failed, using REST", e);
    }
    try {
      const r = await rest<{ jobs: RawJob[]; total: number }>("/jobs", args);
      return { jobs: r.jobs.map(normalize), total: r.total, source: "rest" as const };
    } catch (e) {
      console.warn("[jobs] REST search failed, using sample data", e);
    }
    const jobs = sampleSearch(p);
    return { jobs, total: jobs.length, source: "sample" as const };
  });
}

export async function getJob(id: string): Promise<Job | null> {
  return cached(`job:${id}`, async () => {
    const sample = SAMPLE_JOBS.find((j) => j.id === id);
    if (sample) return sample;
    try {
      const r = await callMcp<{ job: RawJob }>("get_job", { id });
      return normalize(r.job);
    } catch {}
    try {
      const r = await rest<{ job: RawJob }>(`/jobs/${encodeURIComponent(id)}`);
      return normalize(r.job);
    } catch {}
    return null;
  });
}

function normalize(j: RawJob): Job {
  const s = (k: string) => (typeof j[k] === "string" ? (j[k] as string) : null);
  const n = (k: string) => (typeof j[k] === "number" ? (j[k] as number) : null);
  const url = (s("url") ?? "").replace(/\?utm_source=[^&]*&utm_medium=agent$/, "");
  return {
    id: String(j.id),
    title: (s("title") ?? "").trim(),
    company: s("company") ?? s("company_key") ?? "",
    company_slug: s("company_slug") ?? undefined,
    url: url ? `${url}${url.includes("?") ? "&" : "?"}utm_source=${SOURCE}` : "",
    location: s("location") ?? "",
    workplace_type: s("workplace_type"),
    employment_type: s("employment_type"),
    function: s("function") ?? s("fn"),
    seniority: s("seniority"),
    remote: Boolean(j.remote ?? j.is_remote),
    comp_min: n("comp_min"),
    comp_max: n("comp_max"),
    comp_currency: s("comp_currency"),
    tier: s("tier"),
    cohort: s("cohort"),
    published_at: s("published_at"),
    description: s("description_text") ?? undefined,
  };
}

function sampleSearch(p: SearchParams): Job[] {
  const q = (p.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return SAMPLE_JOBS.filter((j) => {
    if (p.scope === "speedrun" && j.tier !== "speedrun") return false;
    if (p.fn && !p.fn.split(",").includes(j.function ?? "")) return false;
    if (!q.length) return true;
    const hay = `${j.title} ${j.company} ${j.description}`.toLowerCase();
    return q.some((w) => hay.includes(w));
  });
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

export function stripDescription(j: Job): Job {
  const copy = { ...j };
  delete copy.description;
  return copy;
}
