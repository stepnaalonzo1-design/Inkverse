import Link from "next/link";
import { ManhwaForm } from "@/components/admin-manhwa-form";

export const dynamic = "force-dynamic";

export default function NewManhwaPage() {
  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/manhwa" className="text-sm text-ink-400 hover:text-violet-300">← Back to manhwa</Link>
        <h1 className="mt-3 text-3xl font-black tracking-tight">New manhwa</h1>
        <p className="mt-1 text-sm text-ink-400">Add the core details. You can add chapters once the title is created.</p>
      </header>
      <ManhwaForm
        mode="create"
        initial={{
          title: "",
          slug: "",
          alternativeTitles: [],
          synopsis: "",
          authors: [],
          artists: [],
          genres: [],
          status: "ongoing",
          coverUrl: null,
          isFeatured: false,
        }}
      />
    </div>
  );
}
