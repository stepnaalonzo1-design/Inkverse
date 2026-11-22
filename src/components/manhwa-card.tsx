import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { coverSrc, formatNumber } from "@/lib/utils";

export type CardData = {
  slug: string;
  title: string;
  coverUrl: string | null;
  status: string;
  genres?: string[];
  views?: number;
  latestChapter?: number | null;
};

export function ManhwaCard({ item }: { item: CardData }) {
  return (
    <Link href={`/manhwa/${item.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-ink-800 ring-1 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-violet-900/40 group-hover:ring-violet-500/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverSrc(item)}
          alt={`${item.title} cover`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2">
          <StatusBadge status={item.status} />
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-12">
          <div className="flex items-center justify-between gap-2 text-xs text-ink-300">
            <span>{item.latestChapter != null ? `Ch. ${item.latestChapter}` : "No chapters yet"}</span>
            {item.views != null ? <span>{formatNumber(item.views)} views</span> : null}
          </div>
        </div>
      </div>
      <h3 className="mt-3 line-clamp-1 text-sm font-semibold text-zinc-100 transition group-hover:text-violet-300 sm:text-base">
        {item.title}
      </h3>
      {item.genres && item.genres.length > 0 ? (
        <p className="mt-0.5 line-clamp-1 text-xs text-ink-400">{item.genres.slice(0, 2).join(" · ")}</p>
      ) : null}
    </Link>
  );
}

export function ManhwaGrid({ items }: { items: CardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {items.map((item) => (
        <ManhwaCard key={item.slug} item={item} />
      ))}
    </div>
  );
}
