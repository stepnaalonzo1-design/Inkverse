import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { ChapterCreateForm } from "@/components/admin-chapter-forms";
import { ManhwaForm } from "@/components/admin-manhwa-form";
import { StatusBadge } from "@/components/ui";
import { getChapterOutline, getManhwaById } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditManhwaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const manhwaId = Number(id);
  if (!Number.isInteger(manhwaId) || manhwaId <= 0) notFound();

  const item = await getManhwaById(manhwaId);
  if (!item) notFound();

  const outline = await getChapterOutline(item.id);
  const suggestedNumber = outline.length > 0 ? Math.max(...outline.map((chapter) => chapter.number)) + 1 : 1;
  const chaptersNewestFirst = [...outline].reverse();

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/manhwa" className="text-sm text-ink-400 hover:text-violet-300">← Back to manhwa</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">{item.title}</h1>
            <StatusBadge status={item.status} />
          </div>
          <p className="mt-1 text-sm text-ink-400">
            Public page:{" "}
            <Link href={`/manhwa/${item.slug}`} className="text-violet-300 hover:text-violet-200">/manhwa/{item.slug}</Link>
          </p>
        </div>
        <ActionButton
          url={`/api/admin/manhwa/${item.id}`}
          label="Delete manhwa"
          variant="danger"
          successTitle="Manhwa deleted"
          redirectTo="/admin/manhwa"
          confirmMessage={`Delete “${item.title}” and all of its chapters? This cannot be undone.`}
        />
      </header>

      <ManhwaForm
        mode="edit"
        initial={{
          id: item.id,
          title: item.title,
          slug: item.slug,
          alternativeTitles: item.alternativeTitles,
          synopsis: item.synopsis,
          authors: item.authors,
          artists: item.artists,
          genres: item.genres,
          status: item.status,
          coverUrl: item.coverUrl,
          isFeatured: item.isFeatured,
        }}
      />

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Chapters</h2>
            <p className="mt-1 text-sm text-ink-400">{outline.length} published chapters. Open a chapter to manage its page images.</p>
          </div>
        </div>

        <ChapterCreateForm manhwaId={item.id} suggestedNumber={suggestedNumber} />

        {chaptersNewestFirst.length === 0 ? (
          <p className="card p-6 text-sm text-ink-400">No chapters yet. Add the first chapter above.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Chapter</th>
                  <th className="px-3 py-3 font-medium">Pages</th>
                  <th className="px-3 py-3 font-medium">Published</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {chaptersNewestFirst.map((chapter) => (
                  <tr key={chapter.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-5 py-3 font-medium">
                      Chapter {chapter.number}
                      {chapter.title ? <span className="text-ink-400"> · {chapter.title}</span> : null}
                    </td>
                    <td className="px-3 py-3">{chapter.pagesCount}</td>
                    <td className="px-3 py-3 text-ink-400">{formatDate(chapter.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/manhwa/${item.id}/chapters/${chapter.id}`} className="btn btn-ghost px-3 py-2 text-xs">
                          Manage pages
                        </Link>
                        <ActionButton
                          url={`/api/admin/chapters/${chapter.id}`}
                          label="Delete"
                          variant="danger"
                          successTitle="Chapter deleted"
                          confirmMessage={`Delete chapter ${chapter.number}? Reader progress for it will be removed.`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
