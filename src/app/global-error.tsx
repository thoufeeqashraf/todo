"use client";

import { ErrorState } from "@/components/system/error-state";

import "./globals.css";

const themeBoot = `(function(){try{var t=localStorage.getItem("theme");var dark=t==="dark"||((t==null||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);var root=document.documentElement;root.classList.toggle("dark",dark);root.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-svh bg-background font-sans text-foreground antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        <ErrorState reset={reset} digest={error.digest} />
      </body>
    </html>
  );
}
