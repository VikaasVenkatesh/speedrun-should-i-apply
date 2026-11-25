import { structured, errorResponse } from "@/lib/claude";
import { getJob } from "@/lib/jobs";
import { FOUNDERS_SYSTEM, jobForPrompt } from "@/lib/prompts";
import { CandidatesSchema } from "@/lib/schemas";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { job_id } = (await req.json()) as { job_id: string };
    const job = await getJob(job_id);
    if (!job) return Response.json({ error: "Role not found." }, { status: 404 });
    const res = await structured({
      schema: CandidatesSchema,
      system: FOUNDERS_SYSTEM,
      effort: "low",
      content: `<job>\n${jobForPrompt(job)}\n</job>`,
    });
    const candidates = [...res.candidates].sort((a, b) => b.score - a.score);
    return Response.json({ candidates, job: { ...job, description: undefined } });
  } catch (err) {
    return errorResponse(err);
  }
}
