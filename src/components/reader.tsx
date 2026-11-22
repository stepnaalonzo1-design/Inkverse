"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { EmptyState } from "@/components/ui";
import { getAuthHeaders } from "@/lib/client-api";
import { COMPLETION_RATIO } from "@/lib/constants";

export type ReaderChapter = { id: number; number: number; title: string };

type ReaderProps = {
  manhwa: { slug: string; title: string };
  chapter: ReaderChapter & { pages: string[] };
  chapters: ReaderChapter[];
  prevNumber: number | null;
  nextNumber: number | null;
  initialScroll: number | null;
  initiallyCompleted: boolean;
  isLoggedIn: boolean;
};

type ProgressPayload = {
  chapterId: number;
  scrollPosition: number;
  completed: boolean;
  opened: boolean;
};

export function Reader({
  manhwa,
  chapter,
  chapters,
  prevNumber,
  nextNumber,
  initialScroll,
  initiallyCompleted,
  isLoggedIn,
}: ReaderProps) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { notify } = useToast();
  const [progress, setProgress] = useState(initialScroll ?? 0);

  const loggedIn = isLoggedIn || Boolean(authUser);

  const ratioRef = useRef(initialScroll ?? 0);
  const dirtyRef = useRef(false);
  const completedRef = useRef(initiallyCompleted);
  const openedRef = useRef(false);
  const restoredRef = useRef(false);

  const sendProgress = useCallback(
    (keepalive: boolean) => {
      if (!loggedIn) return;
      const payload: ProgressPayload = {
        chapterId: chapter.id,
        scrollPosition: ratioRef.current,
        completed: completedRef.current,
        opened: !openedRef.current,
      };
      openedRef.current = true;
      dirtyRef.current = false;

      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      };

      void fetch("/api/reading/progress", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        credentials: "include",
        ...(keepalive ? { keepalive: true } : {}),
      }).catch(() => undefined);
    },
    [chapter.id, loggedIn],
  );

  useEffect(() => {
    const currentRatio = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 1;
      return Math.min(1, Math.max(0, window.scrollY / max));
    };

    const update = () => {
      if (!restoredRef.current) return;
      const ratio = currentRatio();
      ratioRef.current = ratio;
      setProgress(ratio);
      dirtyRef.current = true;
      if (loggedIn && !completedRef.current && ratio >= COMPLETION_RATIO) {
        completedRef.current = true;
        notify({
          tone: "success",
          title: `Chapter ${chapter.number} complete`,
          description: "Your progress has been saved.",
        });
      }
    };

    const restore = () => {
      if (restoredRef.current) return;
      restoredRef.current = true;
      if (initialScroll && initialScroll > 0.01) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: max * initialScroll, behavior: "auto" });
        notify({
          tone: "info",
          title: "Progress restored",
          description: `Picked up where you left off (${Math.round(initialScroll * 100)}%).`,
        });
      }
      update();
    };

    restore();
    window.addEventListener("load", restore, { once: true });

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    if (loggedIn) sendProgress(false);

    const interval = window.setInterval(() => {
      if (dirtyRef.current) sendProgress(false);
    }, 4000);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendProgress(true);
    };
    const onPageHide = () => sendProgress(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("load", restore);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      sendProgress(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  const percent = Math.round(progress * 100);
  const chapterHref = (number: number) => `/read/${manhwa.slug}/${number}`;

  return (
    <div className="min-h-screen">
      <div className="fixed inset-x-0 top-0 z-[60] h-1 bg-white/5" aria-hidden>
        <div
          className="h-full bg-gradient-to-r from-violet-500 via-violet-400 to-blue-500 transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="sticky top-16 z-40 border-b border-white/5 bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link
            href={`/manhwa/${manhwa.slug}`}
            aria-label="Back to title details"
            className="btn btn-ghost px-3 py-2"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{manhwa.title}</p>
            <p className="truncate text-xs text-ink-400">
              Chapter {chapter.number}
              {chapter.title ? ` · ${chapter.title}` : ""} · {percent}% read
            </p>
          </div>
          <label htmlFor="chapter-select" className="sr-only">
            Select chapter
          </label>
          <select
            id="chapter-select"
            value={chapter.number}
            onChange={(event) => router.push(chapterHref(Number(event.target.value)))}
            className="input h-10 w-auto max-w-[170px] py-0 text-sm"
          >
            {chapters.map((item) => (
              <option key={item.id} value={item.number}>
                Ch. {item.number}
                {item.title ? ` · ${item.title}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      </div>

      {!loggedIn ? (
        <div className="mx-auto mt-4 max-w-3xl px-4">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
            Your progress is not being saved.{" "}
            <Link href={`/login?next=${encodeURIComponent(chapterHref(chapter.number))}`} className="font-semibold underline underline-offset-4">
              Sign in
            </Link>{" "}
            to resume reading on any device.
          </div>
        </div>
      ) : null}

      <article className="mx-auto max-w-3xl pb-6 pt-4">
        {chapter.pages.length === 0 ? (
          <div className="px-4">
            <EmptyState title="This chapter has no pages yet" description="Check back soon." />
          </div>
        ) : (
          chapter.pages.map((src, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${index}-${src}`}
              src={src}
              alt={`${manhwa.title}, chapter ${chapter.number}, page ${index + 1}`}
              width={800}
              height={1200}
              loading={index < 2 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              className="block h-auto w-full select-none"
            />
          ))
        )}
      </article>

      <nav className="mx-auto mb-28 flex max-w-3xl items-center justify-between gap-3 px-4 sm:mb-12" aria-label="Chapter navigation">
        {prevNumber !== null ? (
          <Link href={chapterHref(prevNumber)} className="btn btn-ghost">
            ← Previous
          </Link>
        ) : (
          <span className="btn btn-ghost pointer-events-none opacity-40">← Previous</span>
        )}
        <Link href={`/manhwa/${manhwa.slug}`} className="hidden text-sm text-ink-400 transition hover:text-white sm:inline">
          Back to chapters
        </Link>
        {nextNumber !== null ? (
          <Link href={chapterHref(nextNumber)} className="btn btn-primary">
            Next →
          </Link>
        ) : (
          <span className="btn btn-ghost pointer-events-none opacity-40">Next →</span>
        )}
      </nav>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-white/10 bg-ink-950/95 px-4 py-3 backdrop-blur-xl sm:hidden">
        {prevNumber !== null ? (
          <Link href={chapterHref(prevNumber)} className="btn btn-ghost flex-1 px-3 py-2 text-xs">← Prev</Link>
        ) : (
          <span className="btn btn-ghost flex-1 px-3 py-2 text-xs opacity-40">← Prev</span>
        )}
        <span className="min-w-14 text-center text-xs font-semibold text-violet-200">{percent}%</span>
        {nextNumber !== null ? (
          <Link href={chapterHref(nextNumber)} className="btn btn-primary flex-1 px-3 py-2 text-xs">Next →</Link>
        ) : (
          <span className="btn btn-ghost flex-1 px-3 py-2 text-xs opacity-40">Next →</span>
        )}
      </div>
    </div>
  );
}
