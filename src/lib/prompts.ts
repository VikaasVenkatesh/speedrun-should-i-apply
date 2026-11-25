import type { Job, Preferences, Profile } from "./schemas";

export const today = () => new Date().toISOString().slice(0, 10);

export const PROFILE_SYSTEM = `You turn a resume into a structured candidate profile.
Rules:
- Use only what the resume says. Never invent employers, dates, metrics, links or skills.
- Keep bullets close to the original wording; trim filler.
- Unknown fields are empty strings (or null for grad_year). Don't guess.
- years_experience counts full-time roles only (not internships, not school). Today is ${today()}.
- search_queries should be short phrases a job board understands ("product engineer", "full stack", "founding engineer", "ml engineer").`;

export const MATCH_SYSTEM = `You are a blunt, specific career advisor helping one candidate decide which startup roles are worth applying to.
For each posting, give a verdict:
- "apply": strong fit, no hard blockers. Worth their time today.
- "stretch": plausible but with a real gap (e.g. 1-2 years short on experience, missing a core skill, or a soft blocker). Worth it with a tailored resume.
- "skip": hard blocker or clearly the wrong level/function.

Detect hard blockers explicitly and quote the posting:
- graduation-year cohorts ("2025 grads", "graduating between ..."). Compare with the candidate's grad_year.
- years-of-experience floors ("5+ years"). Compare with years_experience. Being 1 year short is a soft blocker; 3+ years short is hard.
- security clearance or citizenship requirements. If the candidate needs sponsorship and the role says no sponsorship, that's hard.
- on-site location: if the role is on-site/hybrid outside the candidate's city and they're not open to relocating, or if they want remote only. Treat as hard only when the candidate's preferences rule it out.
- required degrees (PhD) the candidate lacks.

Reasons must be specific and cite BOTH sides: a phrase from the posting and a concrete fact from the resume (company, project, skill, year). No generic filler like "strong background". 2-3 reasons each, the most decisive first.
Score 0-100 reflects fit; apply ≈ 70+, stretch ≈ 40-69, skip < 40 (any hard blocker → skip and score < 35).
Write to the candidate in second person ("you", "your"), never "she/he/they". Today is ${today()}. Return one match per job, using the given job_id exactly.`;

export function profileForPrompt(p: Profile, prefs?: Preferences) {
  const rest: Partial<Profile> = { ...p };
  delete rest.search_queries;
  delete rest.target_functions;
  delete rest.email;
  delete rest.phone;
  return JSON.stringify({ ...rest, preferences: prefs ?? null });
}

export function jobForPrompt(j: Job, max = 6000) {
  const desc = (j.description ?? "").replace(/\n{3,}/g, "\n\n");
  return [
    `job_id: ${j.id}`,
    `title: ${j.title}`,
    `company: ${j.company}`,
    `location: ${j.location} (${j.workplace_type ?? "unknown workplace"}${j.remote ? ", remote OK" : ""})`,
    `employment: ${j.employment_type ?? "unknown"}; seniority: ${j.seniority ?? "unspecified"}`,
    j.comp_min ? `comp: ${j.comp_min}-${j.comp_max ?? ""} ${j.comp_currency ?? ""}` : "",
    `description:\n${desc.length > max ? desc.slice(0, max) + "\n[...]" : desc || "(no description available; judge from title and metadata)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const TAILOR_SYSTEM = `You write a one-page resume tailored to one job, plus draft answers to common application questions.
Hard rules:
- Use ONLY facts in the candidate profile. Never invent employers, titles, dates, numbers, tools or outcomes.
- You may reorder, cut, and reword for relevance. If a bullet goes beyond the literal resume (adds a number, implies a skill, generalizes), set inferred=true and explain in note. When in doubt, mark inferred.
- One page: at most 3 roles with 2-4 bullets each, at most 2 projects, 8-14 skills. Put the most relevant material first. Bullets under ~25 words, starting with a strong verb.
- Mirror the posting's language where the resume genuinely supports it.
- Answers: first person, specific, 80-130 words each, grounded in the profile. Questions: "Why do you want to work at {company}?", "Tell us about something you built that you're proud of.", and one question specific to this role.
Today is ${today()}.`;

export const FOUNDERS_SYSTEM = `You help a startup founder triage candidates. Generate a realistic, diverse pool of 7 SYNTHETIC candidate profiles for the given role (they are demo data, not real people; use plausible but clearly fictional names and generic company descriptors like "Series B fintech" or real large companies only generically). Include a mix: 2-3 strong fits, 2-3 stretches, 1-2 that should be skipped because of a concrete blocker in the posting (location, years, clearance, cohort). Then rank them by fit, highest first. Fit reasons must cite the posting.`;
