"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useToast } from "@/components/toast-provider";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

/** Uploads a single image to an API endpoint that accepts multipart field "file" and returns { url }. */
export function ImageUpload({
  endpoint,
  label,
  hint,
  onUploaded,
  className,
}: {
  endpoint: string;
  label: string;
  hint?: string;
  onUploaded: (url: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { notify } = useToast();

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const result = await api<{ url?: string }>(endpoint, "POST", form);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";

    if (!result.ok || !result.data.url) {
      notify({
        tone: "error",
        title: "Upload failed",
        description: result.data.error ?? "Please try a different image.",
      });
      return;
    }
    onUploaded(result.data.url);
    notify({ tone: "success", title: "Image uploaded", description: result.data.message });
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="btn btn-ghost px-3.5 py-2 text-sm"
      >
        {uploading ? "Uploading…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleChange}
        className="sr-only"
        aria-label={label}
        tabIndex={-1}
      />
      {hint ? <p className="text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}
