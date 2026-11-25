import { structured, errorResponse } from "@/lib/claude";
import { getJob } from "@/lib/jobs";
import { TAILOR_SYSTEM, jobForPrompt, profileForPrompt } from "@/lib/prompts";
import { TailoredSchema, type Preferences, type Profile } from "@/lib/schemas";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { profile, prefs, job_id } = (await req.json()) as { profile: Profile; prefs?: Preferences; job_id: string };
    const job = await getJob(job_id);
    if (!job) return Response.json({ error: "Role not found." }, { status: 404 });
    const tailored = await structured({
      schema: TailoredSchema,
      system: TAILOR_SYSTEM,
      effort: "medium",
      content: `<candidate_profile>\n${profileForPrompt(profile, prefs)}\n</candidate_profile>\n\n<job>\n${jobForPrompt(job, 8000)}\n</job>`,
    });
    return Response.json({ tailored, job: { ...job, description: undefined } });
  } catch (err) {
    return errorResponse(err);
  }
}
