import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OperatorBoard } from "@/lib/operator-preview";
import type { OperatorRole } from "@/lib/session-token";

import { signOut } from "@/app/login/actions";

const stateVariant = {
  "Due today": "default",
  "Proof missing": "destructive",
  Waiting: "secondary",
  Ready: "outline",
} as const;

export function OperatorDashboard({
  username,
  role,
  greeting,
  dateLabel,
  board,
}: {
  username: string;
  role: OperatorRole;
  greeting: string;
  dateLabel: string;
  board: OperatorBoard;
}) {
  const roleLabel = role === "admin" ? "Admin" : "Staff";

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col justify-between bg-foreground px-5 py-6 text-background md:flex">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-1">
            <p className="text-xs tracking-[0.16em] text-background/60 uppercase">
              Operator
            </p>
            <p className="text-lg font-semibold tracking-tight">Workplace</p>
          </div>
          <nav aria-label="Dashboard" className="flex flex-col gap-1 text-sm">
            <a
              href="#attention"
              className="rounded-lg px-2 py-1.5 text-background/80 hover:bg-background/10 hover:text-background"
            >
              Needs attention
            </a>
            <a
              href="#companies"
              className="rounded-lg px-2 py-1.5 text-background/80 hover:bg-background/10 hover:text-background"
            >
              Companies
            </a>
            <a
              href="#app"
              className="rounded-lg px-2 py-1.5 text-background/80 hover:bg-background/10 hover:text-background"
            >
              Customer app
            </a>
          </nav>
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-xs leading-5 text-background/60">
            Development sign-in. Remove before go-live.
          </p>
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              className="w-full border-background/20 bg-transparent text-background hover:bg-background/10 hover:text-background"
            >
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b px-5 py-4 md:hidden">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Operator · {roleLabel}</p>
            <p className="truncate font-medium">{username}</p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 py-8 md:px-10 md:py-12">
          <header className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {dateLabel}
              <span className="px-2 text-border">/</span>
              Johannesburg
            </p>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
                {greeting}, {username}
              </h1>
              <p className="text-sm font-medium">{roleLabel}</p>
            </div>
            <p className="max-w-2xl text-muted-foreground">{board.lede}</p>
            <p className="text-sm text-muted-foreground">
              {board.scope}. These companies are a development preview. Live
              tenants replace them.
            </p>
          </header>

          <section aria-label="Today" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {board.metrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-xl bg-card p-5 ring-1 ring-foreground/10"
              >
                <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {metric.label}
                </h2>
                <p className="mt-4 font-mono text-4xl tracking-tight tabular-nums">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{metric.note}</p>
              </article>
            ))}
          </section>

          <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.85fr)]">
            <section id="attention" className="scroll-mt-8">
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold tracking-tight">
                  Needs attention
                </h2>
                <p className="text-sm text-muted-foreground">
                  {board.attention.length} on the floor
                </p>
              </div>
              <ul className="divide-y divide-border">
                {board.attention.map((item, index) => (
                  <li
                    key={item.id}
                    className="grid gap-3 py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-start"
                  >
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.detail}
                      </p>
                      <p className="mt-2 text-sm">
                        {item.company}
                        <span className="text-muted-foreground">
                          {" "}
                          · {item.place} · {item.when}
                        </span>
                      </p>
                    </div>
                    <Badge variant={stateVariant[item.state]}>{item.state}</Badge>
                  </li>
                ))}
              </ul>
            </section>

            <section id="companies" className="scroll-mt-8">
              <h2 className="mb-2 text-lg font-semibold tracking-tight">
                Companies
              </h2>
              <ul className="flex flex-col gap-3">
                {board.companies.map((company) => (
                  <li
                    key={company.id}
                    className="rounded-xl bg-card p-4 ring-1 ring-foreground/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {company.place}
                        </p>
                      </div>
                      <Badge variant="outline">{company.industry}</Badge>
                    </div>
                    <p className="mt-4 font-mono text-sm tabular-nums text-muted-foreground">
                      {company.people} people · {company.openTasks} open
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section
            id="app"
            className="scroll-mt-8 rounded-xl bg-foreground px-6 py-6 text-background md:px-8"
          >
            <p className="text-xs tracking-[0.16em] text-background/60 uppercase">
              Customer app
            </p>
            <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight">
              iOS and Android are controlled from this console.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-background/70">
              {role === "admin"
                ? "Admins set up the companies and the work those apps carry. The mobile apps are not connected in this build yet."
                : "Staff watch the companies on their desk once those apps are connected. The mobile apps are not in this build yet."}
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-background/15 px-4 py-3">
                <dt className="text-sm text-background/60">iOS</dt>
                <dd className="mt-1 font-medium">Not connected</dd>
              </div>
              <div className="rounded-lg border border-background/15 px-4 py-3">
                <dt className="text-sm text-background/60">Android</dt>
                <dd className="mt-1 font-medium">Not connected</dd>
              </div>
            </dl>
          </section>
        </main>
      </div>
    </div>
  );
}
