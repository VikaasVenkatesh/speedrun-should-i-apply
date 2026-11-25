"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Briefcase, GraduationCap, Link2, Plus, Rocket, X, Mail } from "lucide-react";
import type { Preferences, Profile } from "@/lib/schemas";
import { Button } from "./ui";

export function ProfileCard({
  profile,
  setProfile,
  prefs,
  setPrefs,
  email,
  setEmail,
  onContinue,
  onReset,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
  email: string;
  setEmail: (e: string) => void;
  onContinue: () => void;
  onReset: () => void;
}) {
  const [newSkill, setNewSkill] = useState("");
  const edu = profile.education[0];
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile({ ...profile, [k]: v });

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm font-medium text-accent">Step 1 of 3 · Your profile</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Here&apos;s what Claude read. Fix anything off.</h2>
        <p className="mt-2 text-ink-2">Everything below feeds the fit checks. Edits apply instantly; nothing is saved on our side.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mt-6 overflow-hidden rounded-3xl bg-surface ring-1 ring-line shadow-[0_12px_40px_-20px_rgba(0,0,0,0.25)]"
      >
        <div className="border-b border-line p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ink text-lg font-semibold text-bg">
              {initials(profile.name)}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Inline value={profile.name} onChange={(v) => set("name", v)} className="text-xl font-semibold" placeholder="Your name" />
              <Inline value={profile.headline} onChange={(v) => set("headline", v)} className="text-ink-2" placeholder="Headline" />
              <Inline value={profile.location} onChange={(v) => set("location", v)} className="text-sm text-ink-3" placeholder="Location" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Years full-time">
              <input
                type="number"
                step="0.5"
                min={0}
                value={profile.years_experience}
                onChange={(e) => set("years_experience", Number(e.target.value))}
                className="w-full bg-transparent text-lg font-semibold outline-none"
              />
            </Stat>
            <Stat label="Grad year">
              <input
                type="number"
                value={edu?.grad_year ?? ""}
                placeholder="—"
                onChange={(e) => {
                  const year = e.target.value ? Number(e.target.value) : null;
                  const education = profile.education.length
                    ? profile.education.map((ed, i) => (i === 0 ? { ...ed, grad_year: year } : ed))
                    : [{ school: "", degree: "", field: "", grad_date: "", details: "", grad_year: year }];
                  set("education", education);
                }}
                className="w-full bg-transparent text-lg font-semibold outline-none"
              />
            </Stat>
            <Stat label="Roles · Projects" className="col-span-2 sm:col-span-1">
              <p className="text-lg font-semibold">
                {profile.roles.length} · {profile.projects.length}
              </p>
            </Stat>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
          <Block icon={<Briefcase className="size-4" />} title="Experience">
            <ul className="space-y-2.5">
              {profile.roles.map((r, i) => (
                <li key={i} className="text-sm">
                  <p className="font-medium">
                    {r.title} <span className="text-ink-3">· {r.company}</span>
                  </p>
                  <p className="text-xs text-ink-3">
                    {[r.start, r.end].filter(Boolean).join(" – ")}
                  </p>
                </li>
              ))}
              {!profile.roles.length && <li className="text-sm text-ink-3">No roles found</li>}
            </ul>
          </Block>
          <Block icon={<GraduationCap className="size-4" />} title="Education">
            <ul className="space-y-2.5">
              {profile.education.map((e, i) => (
                <li key={i} className="text-sm">
                  <p className="font-medium">{e.school}</p>
                  <p className="text-xs text-ink-3">{[e.degree, e.field, e.grad_date].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ul>
          </Block>
          <Block icon={<Rocket className="size-4" />} title="Projects">
            <ul className="space-y-1.5 text-sm">
              {profile.projects.map((p, i) => (
                <li key={i}>
                  <span className="font-medium">{p.name}</span>{" "}
                  <span className="text-ink-3">{p.description.slice(0, 70)}{p.description.length > 70 ? "…" : ""}</span>
                </li>
              ))}
              {!profile.projects.length && <li className="text-ink-3">None listed</li>}
            </ul>
          </Block>
          <Block icon={<Link2 className="size-4" />} title="Links">
            <ul className="space-y-1 text-sm">
              {profile.links.map((l, i) => (
                <li key={i} className="truncate text-ink-2">
                  {l.url}
                </li>
              ))}
              {!profile.links.length && <li className="text-ink-3">None listed</li>}
            </ul>
          </Block>

          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-3">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <span key={s} className="group inline-flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-2.5 pr-1.5 text-xs font-medium">
                  {s}
                  <button
                    aria-label={`Remove ${s}`}
                    onClick={() => set("skills", profile.skills.filter((x) => x !== s))}
                    className="rounded-full p-0.5 text-ink-3 hover:bg-line hover:text-ink"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const s = newSkill.trim();
                  if (s && !profile.skills.includes(s)) set("skills", [...profile.skills, s]);
                  setNewSkill("");
                }}
                className="inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs ring-1 ring-dashed ring-line"
              >
                <input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add skill"
                  className="w-20 bg-transparent outline-none placeholder:text-ink-3"
                />
                <button type="submit" aria-label="Add skill" className="rounded-full p-0.5 text-ink-3 hover:text-ink">
                  <Plus className="size-3" />
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="border-t border-line bg-surface-2/50 p-5 sm:p-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-3">Preferences used for blocker checks</p>
          <div className="flex flex-wrap gap-2">
            <Toggle on={prefs.open_to_relocate} onChange={(v) => setPrefs({ ...prefs, open_to_relocate: v })} label="Open to relocating" />
            <Toggle on={prefs.remote_only} onChange={(v) => setPrefs({ ...prefs, remote_only: v })} label="Remote only" />
            <Toggle on={prefs.needs_sponsorship} onChange={(v) => setPrefs({ ...prefs, needs_sponsorship: v })} label="Need visa sponsorship" />
          </div>

          <label className="mt-5 block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <Mail className="size-4 text-ink-3" /> Email <span className="font-normal text-ink-3">(optional)</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={profile.email || "you@example.com"}
              className="w-full rounded-xl bg-surface px-3 py-2.5 text-sm outline-none ring-1 ring-line transition focus:ring-2 focus:ring-ink"
            />
            <span className="mt-1.5 block text-xs text-ink-3">
              Used only on your tailored resume header. In a real version this is where you&apos;d join the speedrun talent network.
            </span>
          </label>
        </div>
      </motion.div>

      <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onReset}>
          Start over
        </Button>
        <Button onClick={onContinue} className="px-6 py-3 text-base">
          Find my matches <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?"
  );
}

function Inline({ value, onChange, className = "", placeholder }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`-mx-1.5 block w-full rounded-md bg-transparent px-1.5 py-0.5 outline-none transition hover:bg-surface-2 focus:bg-surface-2 ${className}`}
    />
  );
}

function Stat({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-surface-2 px-3.5 py-2.5 ${className}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">{label}</p>
      {children}
    </div>
  );
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-3">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
        on ? "bg-ink text-bg ring-ink" : "bg-surface text-ink-2 ring-line hover:ring-ink-3"
      }`}
    >
      <span className={`relative h-4 w-7 rounded-full transition ${on ? "bg-bg/30" : "bg-line"}`}>
        <span className={`absolute top-0.5 size-3 rounded-full transition-all ${on ? "left-3.5 bg-bg" : "left-0.5 bg-ink-3"}`} />
      </span>
      {label}
    </button>
  );
}
