import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_LABELS } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name}'s profile picture`}
        style={style}
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-white/15", className)}
      />
    );
  }
  return (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.38) }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 font-bold text-white ring-1 ring-white/15",
        className,
      )}
      aria-label={`${name}'s avatar`}
    >
      {initials(name)}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel = "View all",
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="shrink-0 text-sm font-medium text-ink-300 transition hover:text-violet-300"
        >
          {linkLabel} →
        </Link>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <p className="text-lg font-semibold text-white">{title}</p>
      {description ? <p className="max-w-md text-sm text-ink-400">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  ongoing: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  completed: "border-sky-400/30 bg-sky-500/15 text-sky-200",
  hiatus: "border-amber-400/30 bg-amber-500/15 text-amber-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm",
        STATUS_STYLES[status] ?? "border-white/10 bg-white/10 text-zinc-200",
      )}
    >
      {(STATUS_LABELS as Record<string, string>)[status] ?? status}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-5 transition duration-300 hover:-translate-y-0.5 hover:border-violet-500/30">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}
