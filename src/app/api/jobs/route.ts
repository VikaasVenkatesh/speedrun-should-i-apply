import { stripDescription, searchJobs } from "@/lib/jobs";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const scope = u.searchParams.get("scope") === "portfolio" ? "portfolio" : "speedrun";
  const q = u.searchParams.get("q")?.slice(0, 120) || undefined;
  const fn = u.searchParams.get("fn") || undefined;
  const r = await searchJobs({ q, fn, scope });
  return Response.json(
    { jobs: r.jobs.filter((j) => !/stealth/i.test(j.company)).map(stripDescription), total: r.total, source: r.source },
    { headers: { "cache-control": "public, s-maxage=120" } },
  );
}
