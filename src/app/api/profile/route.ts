import { structured, errorResponse } from "@/lib/claude";
import { PROFILE_SYSTEM } from "@/lib/prompts";
import { ProfileSchema } from "@/lib/schemas";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string; pdfBase64?: string };
    const text = body.text?.trim();
    if (!text && !body.pdfBase64) return Response.json({ error: "Upload a PDF or paste your resume." }, { status: 400 });
    if (text && text.length > 40_000) return Response.json({ error: "That resume is too long (40k characters max)." }, { status: 413 });

    const content = body.pdfBase64
      ? [
          { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: body.pdfBase64 } },
          { type: "text" as const, text: "Parse this resume into the profile schema." },
        ]
      : `Parse this resume into the profile schema.\n\n<resume>\n${text}\n</resume>`;

    const profile = await structured({ schema: ProfileSchema, system: PROFILE_SYSTEM, content, effort: "low" });
    return Response.json({ profile });
  } catch (err) {
    return errorResponse(err);
  }
}
