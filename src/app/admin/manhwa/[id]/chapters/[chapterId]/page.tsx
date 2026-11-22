import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { ChapterEditor } from "@/components/admin-chapter-forms";
import { getChapterById, getManhwaById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ChapterPagesPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const { id, chapterId } = await params;
  const manhwaId = Number(id);
  const chapterKey = Number(chapterId);
  if (!Number.isInteger(manhwaId) || !Number.isInteger(chapterKey)) notFound();

  const title = await getManhwaById(manhwaId);
  if (!title) notFound();

  const chapter = await getChapterById(chapterKey);
  if (!chapter || chapter.manhwaId !== manhwaId) notFound();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="flex flex-wrap items-center gap-2 text-sm text-ink-400" aria-label="Breadcrumb">
            <Link href="/admin/manhwa" className="hover:text-violet-300">Manhwa</Link>
            <span>/</span>
            <Link href={`/admin/manhwa/${title.id}`} className="hover:text-violet-300">{title.title}</Link>
            <span>/</span>
            <span className="text-white">Chapter {chapter.number}</span>
          </nav>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Chapter {chapter.number}
            {chapter.title ? <span className="text-ink-400"> · {chapter.title}</span> : null}
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            Public reader:{" "}
            <Link href={`/read/${title.slug}/${chapter.number}`} className="text-violet-300 hover:text-violet-200">
              /read/{title.slug}/{chapter.number}
            </Link>
          </p>
        </div>
        <ActionButton
          url={`/api/admin/chapters/${chapter.id}`}
          label="Delete chapter"
          variant="danger"
          successTitle="Chapter deleted"
          redirectTo={`/admin/manhwa/${title.id}`}
          confirmMessage={`Delete chapter ${chapter.number}? Reader progress for it will be removed.`}
        />
      </header>

      <ChapterEditor
        manhwaId={title.id}
        chapter={{ id: chapter.id, number: chapter.number, title: chapter.title, pages: chapter.pages }}
      />
    </div>
  );
}
