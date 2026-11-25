"use client";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Check, CircleDashed, X } from "lucide-react";

export type Verdict = "apply" | "stretch" | "skip";

export const VERDICT: Record<Verdict, { label: string; fg: string; bg: string; ring: string; icon: typeof Check }> = {
  apply: { label: "Apply", fg: "text-apply", bg: "bg-apply-bg", ring: "ring-apply/25", icon: Check },
  stretch: { label: "Stretch", fg: "text-stretch", bg: "bg-stretch-bg", ring: "ring-stretch/25", icon: CircleDashed },
  skip: { label: "Skip", fg: "text-skip", bg: "bg-skip-bg", ring: "ring-skip/25", icon: X },
};

export function VerdictBadge({ verdict, size = "md" }: { verdict: Verdict; size?: "sm" | "md" | "lg" }) {
  const v = VERDICT[verdict];
  const Icon = v.icon;
  const sz =
    size === "lg" ? "text-sm px-3 py-1.5 gap-1.5" : size === "sm" ? "text-[11px] px-2 py-0.5 gap-1" : "text-xs px-2.5 py-1 gap-1.5";
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ring-1 ring-inset ${v.fg} ${v.bg} ${v.ring} ${sz}`}>
      <Icon className={size === "lg" ? "size-4" : "size-3.5"} strokeWidth={2.5} />
      {v.label}
    </span>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" }) {
  const styles = {
    primary: "bg-ink text-bg hover:opacity-90 shadow-sm",
    secondary: "bg-surface text-ink ring-1 ring-line hover:bg-surface-2",
    ghost: "text-ink-2 hover:text-ink hover:bg-surface-2",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Header({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-6 place-items-center rounded-md bg-ink text-[13px] font-bold text-bg">?</span>
          Should I Apply?
          <span className="hidden rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-3 sm:inline">
            for speedrun jobs
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {right}
          <Link href="/founders" className="rounded-full px-3 py-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink">
            For founders
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} />;
}

export function formatComp(min: number | null, max: number | null, cur: string | null) {
  if (!min) return null;
  const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  const sym = !cur || cur === "USD" ? "$" : `${cur} `;
  return max && max !== min ? `${sym}${k(min)}–${k(max)}` : `${sym}${k(min)}`;
}

export function workplaceLabel(wp: string | null, remote: boolean) {
  if (remote) return "Remote";
  const w = (wp ?? "").toLowerCase();
  if (w.startsWith("on")) return "On-site";
  if (w.startsWith("hy")) return "Hybrid";
  if (w.startsWith("re")) return "Remote";
  return null;
}
