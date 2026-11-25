"use client";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Job, Match, Preferences, Profile } from "@/lib/schemas";
import { SAMPLE_RESUME } from "@/lib/sample-resume";
import { Header } from "./ui";
import { Upload, type ResumeInput } from "./upload";
import { ProfileCard } from "./profile-card";
import { Matches } from "./matches";
import { TailorSheet } from "./tailor-sheet";

type Step = "upload" | "profile" | "matches";

export function App() {
  const [step, setStep] = useState<Step>("upload");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({ open_to_relocate: true, needs_sponsorship: false, remote_only: false });
  const [email, setEmail] = useState("");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [source, setSource] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [tailorJob, setTailorJob] = useState<Job | null>(null);
  const abort = useRef<AbortController | null>(null);

  const go = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function parse(input: ResumeInput) {
    setParsing(true);
    setParseError(null);
    try {
      const r = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const d = await r.json().catch(() => ({ error: "The server returned an unexpected response." }));
      if (!r.ok) throw new Error(d.error ?? "Couldn't read that resume.");
      setProfile(d.profile);
      if (d.profile.email) setEmail(d.profile.email);
      go("profile");
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setParsing(false);
    }
  }

  const runMatch = useCallback(async () => {
    if (!profile) return;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setJobs([]);
    setMatches({});
    setFailed(new Set());
    setSource(null);
    setMatchError(null);
    setStatus("loading");
    go("matches");
    try {
      const r = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile, prefs }),
        signal: ctrl.signal,
      });
      if (!r.ok || !r.body) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Matching failed.");
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === "jobs") {
            setJobs(ev.jobs);
            setSource(ev.source);
          } else if (ev.type === "match") {
            setMatches((m) => ({ ...m, [ev.match.job_id]: ev.match }));
          } else if (ev.type === "error") {
            if (ev.job_ids) setFailed((f) => new Set([...f, ...ev.job_ids]));
            else setMatchError(ev.error);
          }
        }
      }
      setStatus("done");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setMatchError(e instanceof Error ? e.message : "Matching failed.");
      setStatus("error");
    }
  }, [profile, prefs]);

  function reset() {
    abort.current?.abort();
    setProfile(null);
    setJobs([]);
    setMatches({});
    setEmail("");
    go("upload");
  }

  return (
    <>
      <Header
        right={
          step !== "upload" ? (
            <button onClick={reset} className="rounded-full px-3 py-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink">
              New resume
            </button>
          ) : null
        }
      />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {step === "upload" && (
              <Upload onSubmit={parse} onSample={() => parse({ text: SAMPLE_RESUME, fileName: "sample resume" })} busy={parsing} error={parseError} />
            )}
            {step === "profile" && profile && (
              <ProfileCard
                profile={profile}
                setProfile={setProfile}
                prefs={prefs}
                setPrefs={setPrefs}
                email={email}
                setEmail={setEmail}
                onContinue={runMatch}
                onReset={reset}
              />
            )}
            {step === "matches" && profile && (
              <Matches
                jobs={jobs}
                matches={matches}
                failed={failed}
                status={status}
                source={source}
                error={matchError}
                name={profile.name}
                onTailor={setTailorJob}
                onEditProfile={() => go("profile")}
                onRetry={runMatch}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      {profile && (
        <TailorSheet
          job={tailorJob}
          match={tailorJob ? matches[tailorJob.id] : undefined}
          profile={profile}
          prefs={prefs}
          email={email}
          onClose={() => setTailorJob(null)}
        />
      )}
    </>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          A demo built for the a16z speedrun Product Engineer role. Not affiliated with a16z. Jobs via the{" "}
          <a className="underline underline-offset-2 hover:text-ink" href="https://speedrun-talent-network.com/developers" target="_blank" rel="noreferrer">
            speedrun talent network MCP
          </a>
          .
        </p>
        <a className="underline underline-offset-2 hover:text-ink" href="https://github.com/VikaasVenkatesh/speedrun-should-i-apply" target="_blank" rel="noreferrer">
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
