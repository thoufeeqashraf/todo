import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm text-muted-foreground">P1 · Web console</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Workplace operations
      </h1>
      <p className="text-muted-foreground">
        Company tasks, proof of work, and hierarchy. This dev server is the
        web shell. iOS and Android are not part of this command.
      </p>
      <Link href="/login" className={buttonVariants({ className: "w-fit" })}>
        Sign in
      </Link>
    </main>
  );
}
