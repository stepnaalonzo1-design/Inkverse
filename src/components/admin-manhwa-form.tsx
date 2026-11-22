"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ImageUpload } from "@/components/image-upload";
import { useToast } from "@/components/toast-provider";
import { api } from "@/lib/client-api";
import { GENRES, MANHWA_STATUSES, STATUS_LABELS, type ManhwaStatus } from "@/lib/constants";
import { coverSrc } from "@/lib/utils";

export type ManhwaFormValues = {
  id?: number;
  title: string;
  slug: string;
  alternativeTitles: string[];
  synopsis: string;
  authors: string[];
  artists: string[];
  genres: string[];
  status: string;
  coverUrl: string | null;
  isFeatured: boolean;
};

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const fieldClass = "input";

export function ManhwaForm({ mode, initial }: { mode: "create" | "edit"; initial: ManhwaFormValues }) {
  const router = useRouter();
  const { notify } = useToast();
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [alternativeTitles, setAlternativeTitles] = useState(initial.alternativeTitles.join(", "));
  const [synopsis, setSynopsis] = useState(initial.synopsis);
  const [authors, setAuthors] = useState(initial.authors.join(", "));
  const [artists, setArtists] = useState(initial.artists.join(", "));
  const [genres, setGenres] = useState<string[]>(initial.genres);
  const [status, setStatus] = useState(initial.status);
  const [coverUrl, setCoverUrl] = useState<string | null>(initial.coverUrl);
  const [isFeatured, setIsFeatured] = useState(initial.isFeatured);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleGenre(genre: string) {
    setGenres((current) => {
      if (current.includes(genre)) return current.filter((item) => item !== genre);
      if (current.length >= 8) return current;
      return [...current, genre];
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const payload = {
      title,
      slug: slug.trim(),
      alternativeTitles: splitList(alternativeTitles),
      synopsis,
      authors: splitList(authors),
      artists: splitList(artists),
      genres,
      status,
      coverUrl: coverUrl || null,
      isFeatured,
    };

    const result =
      mode === "create"
        ? await api<{ id?: number }>("/api/admin/manhwa", "POST", payload)
        : await api<{ id?: number }>(`/api/admin/manhwa/${initial.id}`, "PATCH", payload);
    setPending(false);

    if (!result.ok) {
      const message = result.data.error ?? "Could not save this manhwa.";
      setError(message);
      notify({ tone: "error", title: "Save failed", description: message });
      return;
    }

    notify({
      tone: "success",
      title: mode === "create" ? "Manhwa created" : "Changes saved",
      description: result.data.message,
    });
    if (mode === "create" && result.data.id) {
      router.push(`/admin/manhwa/${result.data.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_340px]" noValidate>
      {error ? (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 xl:col-span-2">
          {error}
        </div>
      ) : null}

      <div className="card space-y-5 p-6">
        <div>
          <label className="label" htmlFor="m-title">Title</label>
          <input id="m-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="label" htmlFor="m-slug">URL slug</label>
          <input id="m-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="generated-from-title-if-empty" className={fieldClass} />
          <p className="mt-1.5 text-xs text-ink-400">Lowercase letters, numbers and hyphens. Used in the public URL.</p>
        </div>
        <div>
          <label className="label" htmlFor="m-alt">Alternative titles</label>
          <input id="m-alt" value={alternativeTitles} onChange={(e) => setAlternativeTitles(e.target.value)} placeholder="Separate with commas" className={fieldClass} />
        </div>
        <div>
          <label className="label" htmlFor="m-synopsis">Synopsis</label>
          <textarea id="m-synopsis" rows={6} maxLength={5000} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} className={fieldClass} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="m-authors">Authors</label>
            <input id="m-authors" value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="Comma-separated" className={fieldClass} />
          </div>
          <div>
            <label className="label" htmlFor="m-artists">Artists</label>
            <input id="m-artists" value={artists} onChange={(e) => setArtists(e.target.value)} placeholder="Comma-separated" className={fieldClass} />
          </div>
        </div>
        <fieldset>
          <legend className="label">Genres (up to 8)</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GENRES.map((genre) => {
              const selected = genres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleGenre(genre)}
                  className={
                    selected
                      ? "rounded-xl border border-violet-400/50 bg-violet-500/20 px-3 py-2 text-left text-xs font-semibold text-violet-100"
                      : "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-ink-300 transition hover:border-white/20 hover:text-white"
                  }
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="space-y-6">
        <div className="card space-y-5 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-300">Cover image</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverSrc({ coverUrl, title: title || "Untitled", slug: slug || "untitled" })}
            alt="Cover preview"
            className="aspect-[3/4] w-full rounded-2xl object-cover ring-1 ring-white/10"
          />
          <ImageUpload
            endpoint="/api/admin/upload"
            label="Upload cover image"
            hint="JPG, PNG, WEBP or GIF · up to 8 MB"
            onUploaded={(url) => setCoverUrl(url)}
          />
          <div>
            <label className="label" htmlFor="m-cover">…or cover URL</label>
            <input id="m-cover" value={coverUrl ?? ""} onChange={(e) => setCoverUrl(e.target.value || null)} placeholder="https://… or leave empty for placeholder" className={fieldClass} />
          </div>
        </div>

        <div className="card space-y-5 p-6">
          <div>
            <label className="label" htmlFor="m-status">Release status</label>
            <select id="m-status" value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}>
              {MANHWA_STATUSES.map((item) => (
                <option key={item} value={item}>{STATUS_LABELS[item as ManhwaStatus]}</option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Featured on homepage</span>
              <span className="block text-xs text-ink-400">Shows in the hero spotlight.</span>
            </span>
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-5 w-5 accent-violet-500" />
          </label>
          <button type="submit" disabled={pending} className="btn btn-primary w-full py-3">
            {pending ? "Saving…" : mode === "create" ? "Create manhwa" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
