import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ToastProvider } from "@/components/toast-provider";
import { getCurrentUser, publicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "InkVerse · Premium Manhwa Reader",
    template: "%s · InkVerse",
  },
  description:
    "InkVerse is a premium manhwa reading platform with a personal library, reading progress tracking and a vertical-scroll chapter reader.",
};

export const viewport: Viewport = {
  themeColor: "#050508",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUser();
  const initialUser = currentUser ? publicUser(currentUser) : null;

  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-950 font-sans text-zinc-100 antialiased selection:bg-violet-500/40">
        <ToastProvider>
          <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
