import Link from "next/link";
import { ManhwaGrid } from "@/components/manhwa-card";
import { EmptyState } from "@/components/ui";
import { browseManhwa } from "@/lib/queries";
import { GENRES, MANHWA_STATUSES, PAGE_SIZE, SORT_OPTIONS, STATUS_LABELS, type ManhwaStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  // Every filter is validated against an allow-list before it reaches the database.
  const q = first(params.q).trim().slice(0, 100);
  const genreInput = first(params.genre);
  const genre = (GENRES as readonly string[]).includes(genreInput) ? genreInput : "";
  const statusInput = first(params.status);
  const status = (MANHWA_STATUSES as readonly string[]).includes(statusInput) ? statusInput : "";
  const sortInput = first(params.sort);
  const sort = SORT_OPTIONS.some((option) => option.value === sortInput) ? sortInput : "popular";
  const pageInput = Number(first(params.page));
  const page = Number.isInteger(pageInput) && pageInput > 0 ? Math.min(pageInput, 10000) : 1;

  const { items, total } = await browseManhwa({ q, genre, status, sort, page });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number): string {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (genre) next.set("genre", genre);
    if (status) next.set("status", status);
    if (sort !== "popular") next.set("sort", sort);
    if (target > 1) next.set("page", String(target));
    const query = next.toString();
    return query ? `/browse?${query}` : "/browse";
  }

  const heading = genre ? `${genre} manhwa` : q ? `Results for “${q}”` : "Browse the library";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <header className="mb-8 animate-fade-up">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Library</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{heading}</h1>
        <p className="mt-2 text-sm text-ink-400">
          {total} {total === 1 ? "title" : "titles"} found
        </p>
      </header>

      <form
        method="get"
        action="/browse"
        className="card mb-10 grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto] md:items-end sm:p-5"
      >
        <div>
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={q} className="input" placeholder="Title, author or alternative name" />
        </div>
        <div>
          <label className="label" htmlFor="genre">Genre</label>
          <select id="genre" name="genre" defaultValue={genre} className="input">
            <option value="">All genres</option>
            {GENRES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status} className="input">
            <option value="">Any status</option>
            {MANHWA_STATUSES.map((item) => (
              <option key={item} value={item}>{STATUS_LABELS[item as ManhwaStatus]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sort">Sort by</label>
          <select id="sort" name="sort" defaultValue={sort} className="input">
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary w-full sm:col-span-2 md:col-span-1">Apply filters</button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No titles match these filters"
          description="Try a different keyword, or clear the filters to see the full library."
          action={<Link href="/browse" className="btn btn-ghost">Clear filters</Link>}
        />
      ) : (
        <ManhwaGrid items={items} />
      )}

      {totalPages > 1 ? (
        <nav className="mt-12 flex items-center justify-between gap-4" aria-label="Pagination">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn btn-ghost">← Previous</Link>
          ) : (
            <span className="btn btn-ghost pointer-events-none opacity-40">← Previous</span>
          )}
          <p className="text-sm text-ink-400">Page {page} of {totalPages}</p>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="btn btn-ghost">Next →</Link>
          ) : (
            <span className="btn btn-ghost pointer-events-none opacity-40">Next →</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
