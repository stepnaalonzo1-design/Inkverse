"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";
export type NotifyInput = { tone: Tone; title: string; description?: string };
type ToastItem = NotifyInput & { id: number };
type ToastContextValue = { notify: (input: NotifyInput) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<Tone, string> = {
  success: "border-emerald-500/30 bg-emerald-950/90 text-emerald-50 shadow-emerald-900/30",
  error: "border-rose-500/30 bg-rose-950/90 text-rose-50 shadow-rose-900/30",
  info: "border-violet-500/30 bg-ink-850/95 text-zinc-50 shadow-violet-900/30",
};

const TONE_ICON: Record<Tone, string> = { success: "✓", error: "!", info: "i" };

const TOAST_DURATION_MS = 4800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (input: NotifyInput) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current.slice(-3), { ...input, id }]);
      window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-20 z-[100] flex flex-col items-center gap-3 px-4 sm:items-end sm:px-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl",
              TONE_STYLES[toast.tone],
            )}
          >
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">
              {TONE_ICON[toast.tone]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-sm text-white/70">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-lg leading-none text-white/50 transition hover:text-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>.");
  return context;
}
