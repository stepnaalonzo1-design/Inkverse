import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { BookmarkButton } from "@/components/bookmark-button";
import { EmptyState, StatusBadge } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import {
  getChapterOutline,
  getCompletedChapterIds,
  getContinueForManhwa,
  getManhwaBySlug,
} from "@/lib/queries";
import { cn, coverSrc, formatDate, formatNumber, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getManhwaBySlug(slug);
  return { title: item ? item.title : "Title not found" };
}

export default async function ManhwaDetailPage({ params }: Props) {
  const { slug } = await params;
  const item = await getManhwaBySlug(slug);
  if (!item) notFound();

  const user = await getCurrentUser();
  const outline = await getChapterOutline(item.id);
  const completed = user ? await getCompletedChapterIds(user.id, item.id) : new Set<number>();
  const resume = user ? await getContinueForManhwa(user.id, item.id) : null;

  let bookmarked = false;
  if (user) {
    const [row] = await db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, user.id), eq(bookmarks.manhwaId, item.id)))
      .limit(1);
    bookmarked = Boolean(row);
  }

  const firstChapter = outline[0];
  const readHref = resume
    ? `/read/${item.slug}/${resume.chapterNumber}`
    : firstChapter
      ? `/read/${item.slug}/${firstChapter.number}`
      : null;
  const newestFirst = [...outline].reverse();

  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverSrc(item)}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-10 h-full w-full scale-125 object-cover opacity-20 blur-3xl"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/30 via-ink-950/80 to-ink-950" />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[280px_1fr] md:gap-12 lg:px-8 lg:py-16">
          <div className="mx-auto w-full max-w-[280px] animate-fade-up md:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverSrc(item)}
              alt={`${item.title} cover`}
              className="aspect-[3/4] w-full rounded-3xl object-cover shadow-2xl shadow-black/60 ring-1 ring-white/10"
            />
          </div>

          <div className="animate-fade-up [animation-delay:100ms]">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={item.status} />
              {item.isFeatured ? (
                <span className="chip border-violet-500/40 text-violet-200">Featured</span>
              ) : null}
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{item.title}</h1>
            {item.alternativeTitles.length > 0 ? (
              <p className="mt-2 text-ink-400">{item.alternativeTitles.join(" · ")}</p>
            ) : null}

            <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="card p-4">
                <dt className="text-xs uppercase tracking-wider text-ink-400">Chapters</dt>
                <dd className="mt-1 text-xl font-bold">{item.chapterCount}</dd>
              </div>
              <div className="card p-4">
                <dt className="text-xs uppercase tracking-wider text-ink-400">Views</dt>
                <dd className="mt-1 text-xl font-bold">{formatNumber(item.views)}</dd>
              </div>
              <div className="card p-4">
                <dt className="text-xs uppercase tracking-wider text-ink-400">Author</dt>
                <dd className="mt-1 truncate text-sm font-semibold">{item.authors.join(", ") || "Unknown"}</dd>
              </div>
              <div className="card p-4">
                <dt className="text-xs uppercase tracking-wider text-ink-400">Artist</dt>
                <dd className="mt-1 truncate text-sm font-semibold">{item.artists.join(", ") || "Unknown"}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              {item.genres.map((genre) => (
                <Link
                  key={genre}
                  href={`/browse?genre=${encodeURIComponent(genre)}`}
                  className="chip transition hover:border-violet-400/40 hover:text-white"
                >
                  {genre}
                </Link>
              ))}
            </div>

            <p className="mt-6 max-w-3xl leading-relaxed text-ink-300">
              {item.synopsis || "No synopsis has been added yet."}
            </p>
            <p className="mt-4 text-xs text-ink-400">
              Released {formatDate(item.createdAt)}
              {item.lastChapterAt ? ` · Last updated ${timeAgo(item.lastChapterAt)}` : ""}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {readHref ? (
                <Link href={readHref} className="btn btn-primary">
                  {resume ? `Continue · Chapter ${resume.chapterNumber}` : "Start reading"}
                </Link>
              ) : (
                <span className="btn btn-ghost pointer-events-none opacity-60">No chapters yet</span>
              )}
              <BookmarkButton
                manhwaId={item.id}
                initialBookmarked={bookmarked}
                isLoggedIn={Boolean(user)}
                loginHref={`/login?next=${encodeURIComponent(`/manhwa/${item.slug}`)}`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Episodes</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Chapters</h2>
          </div>
          <span className="text-sm text-ink-400">{outline.length} total</span>
        </div>

        {outline.length === 0 ? (
          <EmptyState title="No chapters yet" description="New chapters will appear here as soon as they are published." />
        ) : (
          <ol className="grid gap-2 md:grid-cols-2">
            {newestFirst.map((chapter) => {
              const isDone = completed.has(chapter.id);
              const isResume = resume?.chapterId === chapter.id;
              return (
                <li key={chapter.id}>
                  <Link
                    href={`/read/${item.slug}/${chapter.number}`}
                    className={cn(
                      "group flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition duration-200 hover:-translate-y-0.5",
                      isResume
                        ? "border-violet-500/50 bg-violet-500/10"
                        : "border-white/10 bg-ink-850/60 hover:border-violet-500/30 hover:bg-ink-800",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium transition group-hover:text-violet-300">
                        Chapter {chapter.number}
                        {chapter.title ? <span className="text-ink-400"> · {chapter.title}</span> : null}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {formatDate(chapter.createdAt)} · {chapter.pagesCount} pages
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isResume ? <span className="chip border-violet-400/40 text-violet-200">Resume</span> : null}
                      {isDone ? <span className="chip border-emerald-400/30 text-emerald-200">✓ Read</span> : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
