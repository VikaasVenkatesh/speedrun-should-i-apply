"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowUpRight, Ban, FileText, MapPin, RotateCcw, Database } from "lucide-react";
import type { Job, Match } from "@/lib/schemas";
import { Button, VERDICT, VerdictBadge, formatComp, workplaceLabel, type Verdict } from "./ui";

type Status = "loading" | "done" | "error";
const ORDER: Record<Verdict, number> = { apply: 0, stretch: 1, skip: 2 };

export function Matches({
  jobs,
  matches,
  failed,
  status,
  source,
  error,
  name,
  onTailor,
  onEditProfile,
  onRetry,
}: {
  jobs: Job[];
  matches: Record<string, Match>;
  failed: Set<string>;
  status: Status;
  source: string | null;
  error: string | null;
  name: string;
  onTailor: (job: Job) => void;
  onEditProfile: () => void;
  onRetry: () => void;
}) {
  const [verdict, setVerdict] = useState<Verdict | "all">("all");
  const [loc, setLoc] = useState<string>("all");
  const [type, setType] = useState<string>("all");

  const scored = jobs.filter((j) => matches[j.id]).length;
  const counts = useMemo(() => {
    const c = { apply: 0, stretch: 0, skip: 0 };
    for (const m of Object.values(matches)) c[m.verdict]++;
    return c;
  }, [matches]);

  const locOptions = useMemo(() => uniq(jobs.map(locBucket)), [jobs]);
  const typeOptions = useMemo(() => uniq(jobs.map(typeBucket)), [jobs]);

  const visible = useMemo(() => {
    return jobs
      .filter((j) => (loc === "all" ? true : locBucket(j) === loc))
      .filter((j) => (type === "all" ? true : typeBucket(j) === type))
      .filter((j) => (verdict === "all" ? true : matches[j.id]?.verdict === verdict))
      .sort((a, b) => {
        const ma = matches[a.id];
        const mb = matches[b.id];
        if (!ma && !mb) return 0;
        if (!ma) return 1;
        if (!mb) return -1;
        return ORDER[ma.verdict] - ORDER[mb.verdict] || mb.score - ma.score;
      });
  }, [jobs, matches, verdict, loc, type]);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Step 2 of 3 · Your matches</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {status === "loading" && !jobs.length
              ? "Pulling live roles…"
              : status === "loading"
                ? `Checking ${jobs.length} roles for ${firstName(name)}…`
                : counts.apply
                  ? `${counts.apply} role${counts.apply === 1 ? "" : "s"} worth applying to today`
                  : "No clear fits yet. Here's where you stand."}
          </h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3">
            <span>
              {scored}/{jobs.length || "…"} scored
            </span>
            {source && (
              <span className="inline-flex items-center gap-1">
                <Database className="size-3.5" />
                {source === "sample" ? (
                  <span className="rounded bg-stretch-bg px-1.5 py-0.5 font-medium text-stretch">Sample data</span>
                ) : (
                  <>via speedrun {source === "mcp" ? "MCP server" : "API"}</>
                )}
              </span>
            )}
            <button onClick={onEditProfile} className="underline-offset-2 hover:text-ink hover:underline">
              Edit profile
            </button>
          </p>
        </div>
        <VerdictBar counts={counts} total={jobs.length} />
      </div>

      {/* Filters */}
      <div className="sticky top-14 z-20 -mx-4 mt-6 flex gap-2 overflow-x-auto border-b border-line/60 bg-bg/85 px-4 py-3 backdrop-blur-md [scrollbar-width:none]">
        <div className="flex shrink-0 rounded-full bg-surface-2 p-1 text-sm">
          {(["all", "apply", "stretch", "skip"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVerdict(v)}
              className={`rounded-full px-3 py-1 font-medium transition ${
                verdict === v ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
              }`}
            >
              {v === "all" ? "All" : VERDICT[v].label}
              {v !== "all" && <span className="ml-1 tabular-nums text-ink-3">{counts[v]}</span>}
            </button>
          ))}
        </div>
        <Select value={loc} onChange={setLoc} options={locOptions} all="Any location" />
        <Select value={type} onChange={setType} options={typeOptions} all="Any role type" />
      </div>

      {error && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-danger-bg px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <Button variant="secondary" onClick={onRetry}>
            <RotateCcw className="size-4" /> Retry
          </Button>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {!jobs.length && status === "loading" && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        <AnimatePresence initial={false}>
          {visible.map((j) => (
            <motion.div
              key={j.id}
              layout="position"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              <MatchCard job={j} match={matches[j.id]} failed={failed.has(j.id)} onTailor={() => onTailor(j)} />
            </motion.div>
          ))}
        </AnimatePresence>
        {status !== "loading" && jobs.length > 0 && !visible.length && (
          <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-ink-3">
            Nothing matches these filters.
          </div>
        )}
        {status === "done" && !jobs.length && (
          <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <p className="font-medium">No open roles matched your profile&apos;s searches.</p>
            <p className="mt-1 text-sm text-ink-3">Try adding skills or editing your headline, then search again.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function MatchCard({ job, match, failed, onTailor }: { job: Job; match?: Match; failed: boolean; onTailor: () => void }) {
  const comp = formatComp(job.comp_min, job.comp_max, job.comp_currency);
  const wp = workplaceLabel(job.workplace_type, job.remote);
  const hard = match?.blockers.filter((b) => b.hard) ?? [];
  const soft = match?.blockers.filter((b) => !b.hard) ?? [];
  const accent = match ? { apply: "before:bg-apply", stretch: "before:bg-stretch", skip: "before:bg-line" }[match.verdict] : "before:bg-transparent";

  return (
    <article
      className={`relative overflow-hidden rounded-2xl bg-surface p-4 ring-1 ring-line transition before:absolute before:inset-y-0 before:left-0 before:w-1 sm:p-5 ${accent} ${
        match?.verdict === "skip" ? "opacity-80 hover:opacity-100" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-semibold tracking-tight">{job.title}</h3>
            {job.tier === "speedrun" && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                speedrun{job.cohort ? ` ${job.cohort}` : ""}
              </span>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-3">
            <span className="font-medium text-ink-2">{job.company}</span>
            {job.location && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="size-3.5" />
                {job.location}
              </span>
            )}
            {wp && <span>· {wp}</span>}
            {comp && <span>· {comp}</span>}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {match ? (
            <>
              <VerdictBadge verdict={match.verdict} />
              <span className="text-[11px] tabular-nums text-ink-3">{match.score}/100 fit</span>
            </>
          ) : failed ? (
            <span className="text-xs text-ink-3">Couldn&apos;t score</span>
          ) : (
            <span className="shimmer h-6 w-20 rounded-full" />
          )}
        </div>
      </div>

      {match ? (
        <>
          <p className="mt-3 font-medium text-ink">{match.one_liner}</p>
          {hard.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {hard.map((b, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-danger-bg px-2.5 py-1 text-xs font-medium text-danger">
                  <Ban className="size-3.5 shrink-0" /> {b.detail}
                </span>
              ))}
            </div>
          )}
          {soft.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {soft.map((b, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-stretch-bg px-2.5 py-1 text-xs font-medium text-stretch">
                  <AlertTriangle className="size-3.5 shrink-0" /> {b.detail}
                </span>
              ))}
            </div>
          )}
          <ul className="mt-3 space-y-2.5">
            {match.reasons.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${r.sentiment === "pro" ? "bg-apply" : "bg-stretch"}`} />
                <div className="min-w-0">
                  <p className="text-ink-2">{r.text}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-ink-3">
                      <span className="font-semibold text-ink-2">Posting</span> “{r.posting}”
                    </span>
                    <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-ink-3">
                      <span className="font-semibold text-ink-2">You</span> {r.resume}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {match.verdict !== "skip" && (
              <Button onClick={onTailor} className="py-2">
                <FileText className="size-4" /> Tailor my resume
              </Button>
            )}
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-ink-2 ring-1 ring-line transition hover:bg-surface-2 hover:text-ink"
            >
              View posting <ArrowUpRight className="size-4" />
            </a>
            {match.verdict === "skip" && (
              <button onClick={onTailor} className="px-2 text-sm text-ink-3 underline-offset-2 hover:text-ink hover:underline">
                Tailor anyway
              </button>
            )}
          </div>
        </>
      ) : !failed ? (
        <div className="mt-4 space-y-2">
          <div className="shimmer h-4 w-3/4 rounded" />
          <div className="shimmer h-3 w-full rounded" />
          <div className="shimmer h-3 w-5/6 rounded" />
        </div>
      ) : null}
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="shimmer h-4 w-48 rounded" />
          <div className="shimmer h-3 w-32 rounded" />
        </div>
        <div className="shimmer h-6 w-20 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="shimmer h-3 w-full rounded" />
        <div className="shimmer h-3 w-4/5 rounded" />
      </div>
    </div>
  );
}

function VerdictBar({ counts, total }: { counts: Record<Verdict, number>; total: number }) {
  if (!total) return null;
  return (
    <div className="w-full sm:w-64">
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
        {(["apply", "stretch", "skip"] as const).map((v) => (
          <motion.div
            key={v}
            className={{ apply: "bg-apply", stretch: "bg-stretch", skip: "bg-ink-3/40" }[v]}
            initial={{ width: 0 }}
            animate={{ width: `${(counts[v] / total) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-ink-3">
        <span>
          <b className="text-apply">{counts.apply}</b> apply
        </span>
        <span>
          <b className="text-stretch">{counts.stretch}</b> stretch
        </span>
        <span>
          <b className="text-ink-2">{counts.skip}</b> skip
        </span>
      </div>
    </div>
  );
}

function Select({ value, onChange, options, all }: { value: string; onChange: (v: string) => void; options: string[]; all: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="shrink-0 cursor-pointer appearance-none rounded-full bg-surface py-1.5 pl-3 pr-8 text-sm font-medium text-ink-2 ring-1 ring-line outline-none hover:ring-ink-3"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%238a8a83' stroke-width='2'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      <option value="all">{all}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function locBucket(j: Job) {
  if (j.remote || /remote/i.test(j.workplace_type ?? "")) return "Remote";
  const l = j.location.toLowerCase();
  if (/san francisco|\bsf\b|bay area|palo alto|mountain view|san mateo|oakland|berkeley|menlo park|redwood/.test(l)) return "SF Bay Area";
  if (/new york|nyc|brooklyn/.test(l)) return "New York";
  if (/los angeles|\bla\b|santa monica/.test(l)) return "Los Angeles";
  if (/seattle/.test(l)) return "Seattle";
  if (/london|uk|united kingdom/.test(l)) return "London";
  return "Other";
}

function typeBucket(j: Job) {
  const e = (j.employment_type ?? "").toLowerCase();
  if (e.includes("intern")) return "Internship";
  if (e.includes("contract") || e.includes("temp")) return "Contract";
  if (e.includes("part")) return "Part-time";
  const fn = j.function ?? "";
  return fn ? fn[0].toUpperCase() + fn.slice(1).replace(/_/g, " ") : "Full-time";
}

function uniq(a: string[]) {
  return [...new Set(a)].sort();
}
function firstName(n: string) {
  return n.split(/\s+/)[0] || "you";
}
