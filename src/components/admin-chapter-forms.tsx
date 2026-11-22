"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ImageUpload } from "@/components/image-upload";
import { useToast } from "@/components/toast-provider";
import { api } from "@/lib/client-api";

export function ChapterCreateForm({ manhwaId, suggestedNumber }: { manhwaId: number; suggestedNumber: number }) {
  const router = useRouter();
  const { notify } = useToast();
  const [number, setNumber] = useState(String(suggestedNumber));
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await api<{ id?: number }>("/api/admin/chapters", "POST", {
      manhwaId,
      number: Number(number),
      title,
    });
    setPending(false);

    if (!result.ok || !result.data.id) {
      notify({ tone: "error", title: "Could not add chapter", description: result.data.error ?? "Check the chapter number." });
      return;
    }
    notify({ tone: "success", title: "Chapter added", description: "Now add its pages." });
    router.push(`/admin/manhwa/${manhwaId}/chapters/${result.data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-4 p-5 sm:grid-cols-[140px_1fr_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="c-number">Chapter no.</label>
        <input id="c-number" type="number" min={0} required value={number} onChange={(e) => setNumber(e.target.value)} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="c-title">Title (optional)</label>
        <input id="c-title" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Awakening" className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Adding…" : "Add chapter"}
      </button>
    </form>
  );
}

export function ChapterEditor({
  chapter,
}: {
  manhwaId: number;
  chapter: { id: number; number: number; title: string; pages: string[] };
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [number, setNumber] = useState(String(chapter.number));
  const [title, setTitle] = useState(chapter.title);
  const [pages, setPages] = useState<string[]>(chapter.pages);
  const [newPage, setNewPage] = useState("");
  const [pending, setPending] = useState(false);

  function move(index: number, delta: number) {
    setPages((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removePage(index: number) {
    setPages((current) => current.filter((_, position) => position !== index));
  }

  function addPageUrl() {
    const trimmed = newPage.trim();
    if (!trimmed) return;
    setPages((current) => [...current, trimmed]);
    setNewPage("");
  }

  async function save() {
    setPending(true);
    const result = await api("/api/admin/chapters/" + chapter.id, "PATCH", {
      number: Number(number),
      title,
      pages,
    });
    setPending(false);

    if (!result.ok) {
      notify({ tone: "error", title: "Save failed", description: result.data.error });
      return;
    }
    notify({ tone: "success", title: "Chapter saved", description: `${pages.length} pages stored.` });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="card grid gap-4 p-6 sm:grid-cols-[160px_1fr]">
        <div>
          <label className="label" htmlFor="ce-number">Chapter no.</label>
          <input id="ce-number" type="number" min={0} value={number} onChange={(e) => setNumber(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ce-title">Title</label>
          <input id="ce-title" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Pages ({pages.length})</h2>
            <p className="mt-1 text-sm text-ink-400">Pages are shown top to bottom in the order listed here.</p>
          </div>
          <ImageUpload
            endpoint="/api/admin/upload"
            label="Upload page image"
            hint="Upload one page at a time, in reading order."
            onUploaded={(url) => setPages((current) => [...current, url])}
          />
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            aria-label="Add page by URL"
            value={newPage}
            onChange={(e) => setNewPage(e.target.value)}
            placeholder="Paste an https:// image link or an uploaded /api/media path"
            className="input"
          />
          <button type="button" onClick={addPageUrl} className="btn btn-ghost">
            Add URL
          </button>
        </div>

        {pages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-ink-400">No pages yet. Upload or add a page image above.</p>
        ) : (
          <ol className="mt-6 space-y-3">
            {pages.map((url, index) => (
              <li key={`${index}-${url}`} className="flex items-center gap-4 rounded-xl border border-white/10 bg-ink-900/60 p-3">
                <span className="w-7 shrink-0 text-center text-sm font-semibold text-ink-400">{index + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" loading="lazy" className="h-20 w-14 shrink-0 rounded-md bg-ink-800 object-cover" />
                <p className="min-w-0 flex-1 truncate text-xs text-ink-400">{url}</p>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move page ${index + 1} up`} className="btn btn-ghost px-2.5 py-1.5 text-xs">↑</button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === pages.length - 1} aria-label={`Move page ${index + 1} down`} className="btn btn-ghost px-2.5 py-1.5 text-xs">↓</button>
                  <button type="button" onClick={() => removePage(index)} className="btn btn-danger px-2.5 py-1.5 text-xs">Remove</button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button type="button" onClick={save} disabled={pending} className="btn btn-primary px-8 py-3 shadow-2xl">
          {pending ? "Saving…" : "Save chapter"}
        </button>
      </div>
    </div>
  );
}
