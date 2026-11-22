"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/toast-provider";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

/** Generic confirm-then-call button used for deletes and other single API mutations. */
export function ActionButton({
  url,
  method = "DELETE",
  label,
  pendingLabel = "Working…",
  confirmMessage,
  successTitle = "Done",
  redirectTo,
  variant = "ghost",
  className,
}: {
  url: string;
  method?: "POST" | "PATCH" | "DELETE";
  label: string;
  pendingLabel?: string;
  confirmMessage?: string;
  successTitle?: string;
  redirectTo?: string;
  variant?: "ghost" | "danger" | "primary";
  className?: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, setPending] = useState(false);

  async function run() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setPending(true);
    const result = await api(url, method);
    setPending(false);

    if (!result.ok) {
      notify({ tone: "error", title: "Action failed", description: result.data.error ?? "Please try again." });
      return;
    }

    notify({ tone: "success", title: successTitle, description: result.data.message });
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={cn(
        "btn px-3 py-2 text-xs",
        variant === "danger" ? "btn-danger" : variant === "primary" ? "btn-primary" : "btn-ghost",
        className,
      )}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
