import { z } from "zod";

/* ---------- Profile (parsed from resume) ---------- */

export const RoleSchema = z.object({
  title: z.string(),
  company: z.string(),
  start: z.string().describe("e.g. 'Jun 2023' or '2023'. Empty string if unknown."),
  end: z.string().describe("e.g. 'Present' or 'Aug 2024'. Empty string if unknown."),
  location: z.string(),
  bullets: z.array(z.string()).describe("Accomplishments, close to verbatim from the resume."),
});

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  tech: z.array(z.string()),
  link: z.string(),
});

export const EducationSchema = z.object({
  school: z.string(),
  degree: z.string(),
  field: z.string(),
  grad_date: z.string().describe("e.g. 'May 2024'. Empty string if unknown."),
  grad_year: z.number().int().nullable(),
  details: z.string().describe("GPA, honors, coursework. Empty string if none."),
});

export const LinkSchema = z.object({ label: z.string(), url: z.string() });

export const ProfileSchema = z.object({
  name: z.string(),
  headline: z.string().describe("One-line summary in the candidate's own framing, e.g. 'Full-stack engineer, 3 yrs, AI products'."),
  location: z.string(),
  email: z.string(),
  phone: z.string(),
  years_experience: z.number().describe("Full-time professional years, excluding internships. Use decimals."),
  education: z.array(EducationSchema),
  roles: z.array(RoleSchema),
  projects: z.array(ProjectSchema),
  skills: z.array(z.string()),
  links: z.array(LinkSchema),
  target_functions: z
    .array(z.enum(["engineering", "product", "design", "research", "data", "growth", "marketing", "sales", "operations"]))
    .describe("1-2 job functions this person most plausibly targets."),
  search_queries: z
    .array(z.string())
    .describe("3-4 short job-board search queries (2-3 words each) for roles this person fits, e.g. 'product engineer', 'full stack', 'founding engineer'."),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** What the user can add on the profile card. Never stored server-side. */
export type Preferences = {
  open_to_relocate: boolean;
  needs_sponsorship: boolean;
  remote_only: boolean;
};

/* ---------- Jobs ---------- */

export type Job = {
  id: string;
  title: string;
  company: string;
  company_slug?: string;
  url: string;
  location: string;
  workplace_type: string | null;
  employment_type: string | null;
  function: string | null;
  seniority: string | null;
  remote: boolean;
  comp_min: number | null;
  comp_max: number | null;
  comp_currency: string | null;
  tier: string | null;
  cohort: string | null;
  published_at: string | null;
  description?: string;
};

/* ---------- Match ---------- */

export const BlockerSchema = z.object({
  kind: z.enum(["grad_year", "years_experience", "clearance", "citizenship", "sponsorship", "location", "degree", "other"]),
  detail: z.string().describe("Short, quote the posting, e.g. 'Requires 5+ years (you have ~2.5)'."),
  hard: z.boolean().describe("true if it disqualifies on its face; false if it's a soft preference."),
});

export const MatchSchema = z.object({
  job_id: z.string(),
  verdict: z.enum(["apply", "stretch", "skip"]),
  score: z.number().int().describe("0-100"),
  one_liner: z.string().describe("Max 12 words. The single most important reason."),
  reasons: z
    .array(
      z.object({
        text: z.string().describe("One sentence that connects a posting requirement to a resume fact."),
        posting: z.string().describe("Short quote or paraphrase from the posting (max 12 words)."),
        resume: z.string().describe("Short pointer to the resume fact (max 12 words)."),
        sentiment: z.enum(["pro", "con"]),
      }),
    )
    .describe("2-3 reasons."),
  blockers: z.array(BlockerSchema),
});
export const MatchBatchSchema = z.object({ matches: z.array(MatchSchema) });
export type Match = z.infer<typeof MatchSchema>;
export type Blocker = z.infer<typeof BlockerSchema>;

/* ---------- Tailor ---------- */

const Bullet = z.object({
  text: z.string(),
  inferred: z.boolean().describe("true if this rewords beyond what the resume literally says (e.g. adds a metric or implies a skill)."),
  note: z.string().describe("If inferred, what was inferred and why. Else empty string."),
});

export const TailoredSchema = z.object({
  summary: z.string().describe("2 sentences max, tailored to the role. Only resume facts."),
  skills: z.array(z.string()).describe("8-14 skills, most relevant to the role first. Only skills present in the profile."),
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      dates: z.string(),
      location: z.string(),
      bullets: z.array(Bullet).describe("2-4 bullets, reordered and reworded for this role."),
    }),
  ),
  projects: z.array(
    z.object({ name: z.string(), link: z.string(), bullets: z.array(Bullet).describe("1-2 bullets") }),
  ),
  education: z.array(z.object({ school: z.string(), degree: z.string(), dates: z.string(), details: z.string() })),
  omitted: z.array(z.string()).describe("Things left out to fit one page, briefly."),
  answers: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .describe("Draft answers to 3 common application questions for this role."),
});
export type Tailored = z.infer<typeof TailoredSchema>;

/* ---------- Founders view ---------- */

export const CandidatesSchema = z.object({
  candidates: z.array(
    z.object({
      name: z.string(),
      headline: z.string(),
      location: z.string(),
      years_experience: z.number(),
      background: z.array(z.string()).describe("2-3 resume-style highlights"),
      score: z.number().int().describe("0-100"),
      verdict: z.enum(["apply", "stretch", "skip"]),
      fit_reasons: z.array(z.string()).describe("2-3 reasons citing the posting"),
      risk: z.string().describe("The main risk or open question, one sentence"),
    }),
  ),
});
export type Candidate = z.infer<typeof CandidatesSchema>["candidates"][number];
