import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeUserBanner } from "@/components/home-user-banner";
import { ManhwaGrid } from "@/components/manhwa-card";
import { SearchForm } from "@/components/search-form";
import { EmptyState, SectionHeader } from "@/components/ui";
import { adminExists, getCurrentUser } from "@/lib/auth";
import { GENRES } from "@/lib/constants";
import { getHomeData } from "@/lib/queries";
import { coverSrc, formatNumber, hueFromString, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await adminExists())) redirect("/setup");

  const user = await getCurrentUser();
  const data = await getHomeData(user?.id ?? null);
  const featured = data.featured[0];
  const resume = data.continueReading[0];
  const genreCounts = new Map(data.genres.map((row) => [row.genre, row.count]));

  return (
    <div>
      <HomeUserBanner />
      <section className="relative isolate overflow-hidden border-b border-white/5">
        {featured ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc(featured)}
            alt=""
            aria-hidden
            className="absolute inset-0 -z-10 h-full w-full scale-125 object-cover opacity-25 blur-3xl"
          />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-violet-950/30 via-ink-950/70 to-ink-950" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-8 lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
              New chapters added every week
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Step into <span className="gradient-text">stories</span> that never let go.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-300 sm:text-lg">
              Read premium manhwa with smooth vertical scrolling, pick up exactly where you stopped,
              and keep a private library that follows you across devices.
            </p>

            <div className="mt-8 max-w-xl">
              <SearchForm variant="hero" />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {resume ? (
                <Link
                  href={`/read/${resume.slug}/${resume.chapterNumber}`}
                  className="btn btn-primary"
                >
                  Continue reading · {resume.title} Ch. {resume.chapterNumber}
                </Link>
              ) : null}
              {featured ? (
                <Link href={`/manhwa/${featured.slug}`} className="btn btn-ghost">
                  View featured title
                </Link>
              ) : null}
            </div>
          </div>

          {featured ? (
            <Link
              href={`/manhwa/${featured.slug}`}
              className="group relative mx-auto block w-full max-w-sm animate-fade-up [animation-delay:150ms]"
            >
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-violet-600/40 to-blue-600/30 opacity-70 blur-2xl transition duration-500 group-hover:opacity-100" />
              <div className="relative overflow-hidden rounded-3xl ring-1 ring-white/15 shadow-2xl shadow-black/60 transition duration-500 group-hover:-rotate-1 group-hover:scale-[1.02]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverSrc(featured)}
                  alt={`${featured.title} cover`}
                  className="aspect-[3/4] w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-6 pt-20">
                  <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Featured</p>
                  <h2 className="mt-1 text-2xl font-bold">{featured.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-ink-300">{featured.synopsis}</p>
                </div>
              </div>
            </Link>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 lg:px-8">
        {user && data.continueReading.length > 0 ? (
          <section>
            <SectionHeader eyebrow="Your shelf" title="Continue reading" href="/library?tab=reading" linkLabel="All in-progress" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.continueReading.map((item) => (
                <Link
                  key={item.manhwaId}
                  href={`/read/${item.slug}/${item.chapterNumber}`}
                  className="group card flex items-center gap-4 p-3 transition duration-300 hover:-translate-y-0.5 hover:border-violet-500/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverSrc(item)}
                    alt=""
                    className="h-24 w-18 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
                    style={{ width: 72 }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-semibold transition group-hover:text-violet-300">{item.title}</p>
                    <p className="mt-1 text-sm text-ink-400">
                      Chapter {item.chapterNumber} · {Math.round((item.scrollPosition ?? 0) * 100)}% read
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                        style={{ width: `${Math.max(4, Math.round((item.scrollPosition ?? 0) * 100))}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {data.trending.length > 0 ? (
          <section>
            <SectionHeader eyebrow="This week" title="Trending now" href="/browse?sort=popular" />
            <ManhwaGrid items={data.trending.slice(0, 6)} />
          </section>
        ) : null}

        {data.recentChapters.length > 0 ? (
          <section>
            <SectionHeader eyebrow="Fresh drops" title="Recently updated chapters" href="/browse?sort=latest" linkLabel="Latest updates" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.recentChapters.slice(0, 9).map((chapter) => (
                <Link
                  key={chapter.chapterId}
                  href={`/read/${chapter.slug}/${chapter.number}`}
                  className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-ink-850/70 p-3 transition duration-300 hover:-translate-y-0.5 hover:border-violet-500/40 hover:bg-ink-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverSrc({ coverUrl: chapter.coverUrl, title: chapter.manhwaTitle, slug: chapter.slug })}
                    alt=""
                    className="h-20 shrink-0 rounded-lg object-cover"
                    style={{ width: 56 }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-semibold transition group-hover:text-violet-300">{chapter.manhwaTitle}</p>
                    <p className="mt-1 text-sm text-violet-300">
                      Chapter {chapter.number}
                      {chapter.title ? <span className="text-ink-400"> · {chapter.title}</span> : null}
                    </p>
                    <p className="mt-1 text-xs text-ink-400">{timeAgo(chapter.createdAt)}</p>
                  </div>
                  <span className="hidden text-sm font-medium text-ink-300 transition group-hover:text-white sm:inline">Read →</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {data.popular.length > 0 ? (
          <section>
            <SectionHeader eyebrow="All-time favourites" title="Popular manhwa" href="/browse?sort=popular" />
            <ManhwaGrid items={data.popular.slice(0, 6)} />
          </section>
        ) : null}

        {data.latest.length > 0 ? (
          <section>
            <SectionHeader eyebrow="Just arrived" title="Latest releases" href="/browse?sort=newest" linkLabel="New releases" />
            <ManhwaGrid items={data.latest.slice(0, 6)} />
          </section>
        ) : null}

        <section>
          <SectionHeader eyebrow="Explore" title="Genre categories" href="/browse" linkLabel="Browse all" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {GENRES.map((genre) => (
              <Link
                key={genre}
                href={`/browse?genre=${encodeURIComponent(genre)}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-ink-850/80 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-violet-500/40"
              >
                <span
                  aria-hidden
                  className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-30 blur-2xl transition group-hover:opacity-60"
                  style={{ background: `hsl(${hueFromString(genre)} 80% 60%)` }}
                />
                <p className="relative text-sm font-semibold text-white">{genre}</p>
                <p className="relative mt-1 text-xs text-ink-400">
                  {formatNumber(genreCounts.get(genre) ?? 0)} titles
                </p>
              </Link>
            ))}
          </div>
        </section>

        {data.featured.length === 0 ? (
          <EmptyState
            title="The library is empty"
            description="Sign in as an administrator to add the first manhwa and its chapters."
            action={<Link href="/admin/manhwa/new" className="btn btn-primary">Add a manhwa</Link>}
          />
        ) : null}

        {data.featured.length > 1 ? (
          <section>
            <SectionHeader eyebrow="Editor picks" title="More to explore" />
            <ManhwaGrid items={data.featured.slice(1)} />
          </section>
        ) : null}
      </div>
    </div>
  );
}

