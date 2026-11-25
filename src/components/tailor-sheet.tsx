"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Flag, X, FileText, MessageSquareText, Copy, Check, ArrowUpRight } from "lucide-react";
import type { Job, Match, Preferences, Profile, Tailored } from "@/lib/schemas";
import { Button, Spinner, VerdictBadge } from "./ui";

type Tab = "pdf" | "flags" | "answers";

export function TailorSheet({
  job,
  match,
  profile,
  prefs,
  email,
  onClose,
}: {
  job: Job | null;
  match?: Match;
  profile: Profile;
  prefs: Preferences;
  email: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {job && <Panel key={job.id} job={job} match={match} profile={profile} prefs={prefs} email={email} onClose={onClose} />}
    </AnimatePresence>
  );
}

function Panel({
  job,
  match,
  profile,
  prefs,
  email,
  onClose,
}: {
  job: Job;
  match?: Match;
  profile: Profile;
  prefs: Preferences;
  email: string;
  onClose: () => void;
}) {
  const [t, setT] = useState<Tailored | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pdf");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/tailor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile, prefs, job_id: job.id }),
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Tailoring failed");
        setT(d.tailored);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => {
    if (!t) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    import("./resume-pdf").then(async ({ renderResumeBlob }) => {
      const blob = await renderResumeBlob(profile, t, email);
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [t, profile, email]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const inferred = t ? [...t.experience.flatMap((r) => r.bullets), ...t.projects.flatMap((p) => p.bullets)].filter((b) => b.inferred) : [];
  const fileName = `${profile.name.replace(/\s+/g, "_") || "resume"}_${job.company.replace(/[^a-z0-9]+/gi, "_")}.pdf`;

  return (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-label={`Tailored resume for ${job.title}`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col bg-bg shadow-2xl sm:rounded-l-3xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-accent">Step 3 of 3 · Tailor</p>
                <h3 className="truncate text-lg font-semibold tracking-tight">
                  {job.title} <span className="text-ink-3">· {job.company}</span>
                </h3>
                {match && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-ink-3">
                    <VerdictBadge verdict={match.verdict} size="sm" /> {match.one_liner}
                  </div>
                )}
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-ink-3 hover:bg-surface-2 hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            {!t && !error && <Loading />}
            {error && (
              <div className="m-5 rounded-2xl bg-danger-bg p-4 text-sm text-danger">
                {error}
                <Button variant="secondary" className="ml-3" onClick={() => {
                    setError(null);
                    setAttempt((a) => a + 1);
                  }}>
                  Try again
                </Button>
              </div>
            )}

            {t && (
              <>
                <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
                  <div className="flex rounded-full bg-surface-2 p-1 text-sm">
                    <TabBtn on={tab === "pdf"} onClick={() => setTab("pdf")} icon={<FileText className="size-4" />}>
                      Resume
                    </TabBtn>
                    <TabBtn on={tab === "flags"} onClick={() => setTab("flags")} icon={<Flag className="size-4" />}>
                      Flags <span className="tabular-nums text-ink-3">{inferred.length}</span>
                    </TabBtn>
                    <TabBtn on={tab === "answers"} onClick={() => setTab("answers")} icon={<MessageSquareText className="size-4" />}>
                      Answers
                    </TabBtn>
                  </div>
                  {url ? (
                    <a href={url} download={fileName} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg hover:opacity-90">
                      <Download className="size-4" /> <span className="hidden sm:inline">Download</span> PDF
                    </a>
                  ) : (
                    <Spinner className="text-ink-3" />
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {tab === "pdf" && (
                    <div className="h-full p-4">
                      {inferred.length > 0 && (
                        <button
                          onClick={() => setTab("flags")}
                          className="mb-3 flex w-full items-center gap-2 rounded-xl bg-stretch-bg px-3 py-2 text-left text-sm text-stretch"
                        >
                          <Flag className="size-4 shrink-0" /> {inferred.length} bullet{inferred.length === 1 ? "" : "s"} go beyond your resume&apos;s exact wording. Review before sending.
                        </button>
                      )}
                      {url ? (
                        <>
                          <iframe src={`${url}#view=FitH&toolbar=0`} title="Resume PDF preview" className="hidden h-[calc(100%-3rem)] min-h-[600px] w-full rounded-xl bg-white ring-1 ring-line md:block" />
                          <div className="md:hidden">
                            <HtmlResume t={t} profile={profile} email={email} />
                          </div>
                        </>
                      ) : (
                        <div className="shimmer h-[600px] w-full rounded-xl" />
                      )}
                    </div>
                  )}
                  {tab === "flags" && <Flags t={t} />}
                  {tab === "answers" && <Answers t={t} job={job} />}
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
  );
}

function Loading() {
  const steps = ["Reading the full posting", "Picking your most relevant work", "Rewriting bullets with only your facts", "Laying out one page"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 3500);
    return () => clearInterval(id);
  }, [steps.length]);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8">
      <div className="w-full max-w-sm space-y-3">
        {steps.map((s, j) => (
          <motion.div key={s} initial={{ opacity: 0 }} animate={{ opacity: j <= i ? 1 : 0.35 }} className="flex items-center gap-3 text-sm">
            {j < i ? <Check className="size-4 text-apply" /> : j === i ? <Spinner className="text-accent" /> : <span className="size-4 rounded-full ring-1 ring-line" />}
            {s}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TabBtn({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${on ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}>
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}

function Flags({ t }: { t: Tailored }) {
  const all = [
    ...t.experience.map((r) => ({ head: `${r.title} · ${r.company}`, bullets: r.bullets })),
    ...t.projects.map((p) => ({ head: p.name, bullets: p.bullets })),
  ];
  return (
    <div className="space-y-5 p-5">
      <p className="text-sm text-ink-2">
        Every bullet comes from your profile. <mark className="rounded bg-stretch-bg px-1 text-stretch">Highlighted</mark> ones reword or generalize beyond what you wrote. Check them before you send.
      </p>
      {all.map((g, i) => (
        <div key={i}>
          <p className="mb-1.5 text-sm font-semibold">{g.head}</p>
          <ul className="space-y-1.5">
            {g.bullets.map((b, j) => (
              <li key={j} className={`rounded-lg px-3 py-2 text-sm ${b.inferred ? "bg-stretch-bg" : "bg-surface ring-1 ring-line"}`}>
                <p>{b.text}</p>
                {b.inferred && b.note && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-stretch">
                    <Flag className="mt-0.5 size-3 shrink-0" /> {b.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {t.omitted.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-semibold">Left out to fit one page</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-3">
            {t.omitted.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Answers({ t, job }: { t: Tailored; job: Job }) {
  return (
    <div className="space-y-4 p-5">
      {t.answers.map((a, i) => (
        <AnswerCard key={i} q={a.question} a={a.answer} />
      ))}
      <a href={job.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
        Open the posting to apply <ArrowUpRight className="size-4" />
      </a>
    </div>
  );
}

function AnswerCard({ q, a }: { q: string; a: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{q}</p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(a);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-full p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
          aria-label="Copy answer"
        >
          {copied ? <Check className="size-4 text-apply" /> : <Copy className="size-4" />}
        </button>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">{a}</p>
    </div>
  );
}

function HtmlResume({ t, profile, email }: { t: Tailored; profile: Profile; email: string }) {
  return (
    <div className="rounded-xl bg-white p-5 text-[13px] leading-snug text-neutral-900 ring-1 ring-line">
      <p className="text-xl font-bold">{profile.name}</p>
      <p className="text-xs text-neutral-500">{[profile.location, email || profile.email].filter(Boolean).join(" · ")}</p>
      <p className="mt-2">{t.summary}</p>
      <p className="mt-3 border-b border-neutral-200 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Experience</p>
      {t.experience.map((r, i) => (
        <div key={i} className="mt-2">
          <p className="font-semibold">
            {r.title}, {r.company} <span className="font-normal text-neutral-500">{r.dates}</span>
          </p>
          <ul className="list-disc pl-4">
            {r.bullets.map((b, j) => (
              <li key={j} className={b.inferred ? "bg-amber-100" : ""}>
                {b.text}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="mt-3 border-b border-neutral-200 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Skills</p>
      <p className="mt-1">{t.skills.join(" · ")}</p>
    </div>
  );
}
