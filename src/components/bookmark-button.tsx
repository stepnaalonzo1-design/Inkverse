"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export function BookmarkButton({
  manhwaId,
  initialBookmarked,
  isLoggedIn,
  loginHref,
}: {
  manhwaId: number;
  initialBookmarked: boolean;
  isLoggedIn: boolean;
  loginHref: string;
}) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { notify } = useToast();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, setPending] = useState(false);

  const loggedIn = isLoggedIn || Boolean(authUser);

  if (!loggedIn) {
    return (
      <Link href={loginHref} className="btn btn-ghost">
        ☆ Sign in to bookmark
      </Link>
    );
  }

  async function toggle() {
    setPending(true);
    const result = bookmarked
      ? await api(`/api/bookmarks?manhwaId=${manhwaId}`, "DELETE")
      : await api("/api/bookmarks", "POST", { manhwaId });
    setPending(false);

    if (!result.ok) {
      notify({ tone: "error", title: "Could not update your library", description: result.data.error });
      return;
    }

    const next = !bookmarked;
    setBookmarked(next);
    notify({
      tone: "success",
      title: next ? "Bookmarked" : "Removed from library",
      description: next ? "Find it anytime under My Library." : "This title is no longer in your library.",
    });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={bookmarked}
      className={cn(
        "btn",
        bookmarked ? "border border-violet-400/50 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25" : "btn-ghost",
      )}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M6 3h12v18l-6-4-6 4z" />
      </svg>
      {pending ? "Saving…" : bookmarked ? "Bookmarked" : "Bookmark"}
    </button>
  );
}
