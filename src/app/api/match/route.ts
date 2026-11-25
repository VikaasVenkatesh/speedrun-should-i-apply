import { structured, MissingKeyError } from "@/lib/claude";
import { getJob, searchJobs, stripDescription, type JobSource } from "@/lib/jobs";
import { MATCH_SYSTEM, jobForPrompt, profileForPrompt } from "@/lib/prompts";
import { MatchBatchSchema, type Job, type Preferences, type Profile } from "@/lib/schemas";

export const maxDuration = 300;

const MAX_JOBS = 15;
const BATCH = 3;

/**
 * Streams NDJSON:
 *   {type:"jobs", jobs, source}   -> as soon as roles are pulled
 *   {type:"match", match}         -> per role, as Claude scores each batch
 *   {type:"error", error, job_ids?}
 *   {type:"done"}
 */
export async function POST(req: Request) {
  const { profile, prefs } = (await req.json()) as { profile: Profile; prefs?: Preferences };
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: new MissingKeyError().message, code: "missing_key" }, { status: 503 });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        const { jobs, source } = await gatherJobs(profile, prefs);
        send({ type: "jobs", jobs: jobs.map(stripDescription), source });

        const full = await Promise.all(jobs.map(async (j) => (await getJob(j.id)) ?? j));
        const batches: Job[][] = [];
        for (let i = 0; i < full.length; i += BATCH) batches.push(full.slice(i, i + BATCH));

        await Promise.all(
          batches.map(async (batch) => {
            try {
              const res = await structured({
                schema: MatchBatchSchema,
                system: MATCH_SYSTEM,
                effort: "low",
                content: `<candidate>\n${profileForPrompt(profile, prefs)}\n</candidate>\n\n${batch
                  .map((j) => `<job>\n${jobForPrompt(j)}\n</job>`)
                  .join("\n\n")}`,
              });
              for (const m of res.matches) if (batch.some((j) => j.id === m.job_id)) send({ type: "match", match: m });
            } catch (e) {
              console.error("[match] batch failed", e);
              send({ type: "error", error: "Couldn't score some roles.", job_ids: batch.map((j) => j.id) });
            }
          }),
        );
        send({ type: "done" });
      } catch (e) {
        console.error(e);
        send({ type: "error", error: e instanceof Error ? e.message : "Matching failed" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}

async function gatherJobs(profile: Profile, prefs?: Preferences): Promise<{ jobs: Job[]; source: JobSource }> {
  const fn = profile.target_functions.join(",") || undefined;
  const wp = prefs?.remote_only ? "remote" : undefined;
  const queries = profile.search_queries.slice(0, 4);
  const searches = await Promise.all([
    // speedrun portfolio first, then the wider a16z portfolio
    ...queries.slice(0, 2).map((q) => searchJobs({ q, fn, wp, scope: "speedrun" })),
    ...queries.map((q) => searchJobs({ q, fn, wp, scope: "portfolio" })),
    searchJobs({ fn, wp, scope: "speedrun" }),
  ]);
  const source = searches.some((s) => s.source === "mcp") ? "mcp" : searches.some((s) => s.source === "rest") ? "rest" : "sample";
  // round-robin across searches so one query doesn't crowd out the rest
  const seen = new Set<string>();
  const out: Job[] = [];
  const lists = searches.map((s) => s.jobs.filter((j) => !/stealth/i.test(j.company)));
  for (let i = 0; out.length < MAX_JOBS && lists.some((l) => l[i]); i++) {
    for (const l of lists) {
      const j = l[i];
      if (j && !seen.has(j.id) && out.length < MAX_JOBS) {
        seen.add(j.id);
        out.push(j);
      }
    }
  }
  return { jobs: out, source };
}
