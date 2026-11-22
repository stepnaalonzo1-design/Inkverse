import { notFound } from "next/navigation";
import { Reader } from "@/components/reader";
import { getCurrentUser } from "@/lib/auth";
import {
  getChapterById,
  getChapterOutline,
  getManhwaBySlug,
  getReaderState,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; number: string }> };

export default async function ReaderPage({ params }: Props) {
  const { slug, number: rawNumber } = await params;
  const chapterNumber = Number(rawNumber);
  if (!Number.isInteger(chapterNumber) || chapterNumber < 0) notFound();

  const title = await getManhwaBySlug(slug);
  if (!title) notFound();

  const outline = await getChapterOutline(title.id);
  const index = outline.findIndex((chapter) => chapter.number === chapterNumber);
  if (index === -1) notFound();

  const current = outline[index];
  const chapter = await getChapterById(current.id);
  if (!chapter) notFound();

  const user = await getCurrentUser();
  const state = user
    ? await getReaderState(user.id, title.id, chapter.id)
    : { scrollPosition: null, completed: false };

  const previous = index > 0 ? outline[index - 1] : null;
  const next = index < outline.length - 1 ? outline[index + 1] : null;

  return (
    <Reader
      key={chapter.id}
      manhwa={{ slug: title.slug, title: title.title }}
      chapter={{ id: chapter.id, number: chapter.number, title: chapter.title, pages: chapter.pages }}
      chapters={outline.map((item) => ({ id: item.id, number: item.number, title: item.title }))}
      prevNumber={previous?.number ?? null}
      nextNumber={next?.number ?? null}
      initialScroll={state.scrollPosition}
      initiallyCompleted={state.completed}
      isLoggedIn={Boolean(user)}
    />
  );
}
