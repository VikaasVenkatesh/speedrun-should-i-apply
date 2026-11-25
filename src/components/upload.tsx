"use client";
import { useRef, useState } from "react";
import { motion } from "motion/react";
import { FileText, Sparkles, Upload as UploadIcon, ShieldCheck } from "lucide-react";
import { Button, Spinner, VerdictBadge, type Verdict } from "./ui";

export type ResumeInput = { pdfBase64?: string; text?: string; fileName?: string };

export function Upload({
  onSubmit,
  onSample,
  busy,
  error,
}: {
  onSubmit: (input: ResumeInput) => void;
  onSample: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [text, setText] = useState("");
  const [drag, setDrag] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function handleFile(f: File | undefined) {
    setLocalErr(null);
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      if (f.type.startsWith("text/") || /\.(txt|md)$/i.test(f.name)) {
        onSubmit({ text: await f.text(), fileName: f.name });
        return;
      }
      setLocalErr("Please upload a PDF, or paste your resume as text.");
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      setLocalErr("That PDF is over 3 MB. Try exporting a smaller one, or paste the text.");
      return;
    }
    setFileName(f.name);
    const buf = await f.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    onSubmit({ pdfBase64: btoa(bin), fileName: f.name });
  }

  const err = localErr ?? error;

  return (
    <section className="relative">
      <div className="grid-bg pointer-events-none absolute inset-x-0 -top-14 h-[420px] opacity-60" />
      <div className="relative mx-auto grid max-w-5xl gap-10 px-4 pb-16 pt-12 md:grid-cols-[1.1fr_0.9fr] md:pt-20">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-2 ring-1 ring-line"
          >
            <span className="size-1.5 rounded-full bg-accent" /> Live roles from the speedrun talent network
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl"
          >
            Know which roles are worth your time <span className="text-ink-3">before you apply.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 max-w-xl text-pretty text-ink-2"
          >
            Drop in your resume. Claude checks it against open roles across the a16z portfolio, flags hard blockers like
            grad-year cohorts and clearance requirements, and writes a one-page resume for the ones you should go after.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8"
          >
            <div className="mb-3 inline-flex rounded-full bg-surface-2 p-1 text-sm">
              {(["file", "text"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3.5 py-1.5 font-medium transition ${mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}
                >
                  {m === "file" ? "Upload PDF" : "Paste text"}
                </button>
              ))}
            </div>

            {mode === "file" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => input.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  handleFile(e.dataTransfer.files[0]);
                }}
                className={`group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                  drag ? "border-accent bg-accent/5" : "border-line bg-surface hover:border-ink-3"
                }`}
              >
                {busy ? (
                  <>
                    <Spinner className="size-6 text-accent" />
                    <span className="font-medium">Reading {fileName ?? "your resume"}…</span>
                    <span className="text-sm text-ink-3">Pulling out education, roles, skills and projects</span>
                  </>
                ) : (
                  <>
                    <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-ink-2 transition group-hover:scale-105">
                      <UploadIcon className="size-5" />
                    </span>
                    <span className="font-medium">Drop your resume PDF here, or click to browse</span>
                    <span className="text-sm text-ink-3">PDF up to 3 MB</span>
                  </>
                )}
              </button>
            ) : (
              <div className="rounded-2xl bg-surface p-3 ring-1 ring-line">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your resume here…"
                  rows={9}
                  className="w-full resize-none bg-transparent p-2 text-sm outline-none placeholder:text-ink-3"
                />
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <span className="text-xs text-ink-3">{text.length ? `${text.length.toLocaleString()} characters` : ""}</span>
                  <Button disabled={busy || text.trim().length < 80} onClick={() => onSubmit({ text })}>
                    {busy ? <Spinner /> : <FileText className="size-4" />} Parse resume
                  </Button>
                </div>
              </div>
            )}
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf,.txt,.md"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            {err && <p className="mt-3 rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{err}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <button
                onClick={onSample}
                disabled={busy}
                className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline disabled:opacity-50"
              >
                <Sparkles className="size-4" /> No resume handy? Try a sample
              </button>
              <span className="inline-flex items-center gap-1.5 text-ink-3">
                <ShieldCheck className="size-4" /> Processed in memory, never stored
              </span>
            </div>
          </motion.div>
        </div>

        <PreviewStack />
      </div>
    </section>
  );
}

const PREVIEW: { verdict: Verdict; title: string; co: string; reason: string }[] = [
  { verdict: "apply", title: "Product Engineer", co: "Seed · San Francisco", reason: "Asks for Next.js + shipping end to end. You built Ledgerly's onboarding solo." },
  { verdict: "stretch", title: "Founding Engineer", co: "Series A · New York", reason: "Wants 4+ yrs; you have ~2.5. Your Shelfie launch shows founder-mode." },
  { verdict: "skip", title: "Software Engineer, New Grad", co: "Robotics · Boston", reason: "Limited to 2025 grads. You graduated in 2023." },
];

function PreviewStack() {
  return (
    <div className="relative hidden md:block" aria-hidden>
      <div className="sticky top-24 space-y-3">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-3">What you&apos;ll get</p>
        {PREVIEW.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.12, type: "spring", stiffness: 200, damping: 24 }}
            className="rounded-2xl bg-surface p-4 shadow-[0_1px_0_var(--line),0_8px_24px_-12px_rgba(0,0,0,0.12)] ring-1 ring-line"
            style={{ marginLeft: i * 14 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-ink-3">{p.co}</p>
              </div>
              <VerdictBadge verdict={p.verdict} size="sm" />
            </div>
            <p className="mt-2 text-sm text-ink-2">{p.reason}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
