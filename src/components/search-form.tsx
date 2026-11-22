"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";

export function SearchForm({
  variant = "compact",
  defaultValue = "",
  className,
}: {
  variant?: "compact" | "hero";
  defaultValue?: string;
  className?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/browse?q=${encodeURIComponent(trimmed)}` : "/browse");
  }

  return (
    <form onSubmit={onSubmit} role="search" className={cn("relative", className)}>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-400",
          variant === "hero" ? "left-4 h-5 w-5" : "left-3.5 h-4 w-4",
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search titles, authors, alternative names…"
        aria-label="Search manhwa"
        className={cn(
          "input",
          variant === "hero" ? "h-14 rounded-2xl pl-12 pr-32 text-base" : "h-10 pl-10 pr-4",
        )}
      />
      {variant === "hero" ? (
        <button type="submit" className="btn btn-primary absolute right-2 top-2 h-10">
          Search
        </button>
      ) : null}
    </form>
  );
}
