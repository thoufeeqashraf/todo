# Design system

Last updated: 30 Oct 2026. Source of truth is the code: `src/app/globals.css`, `components.json`, `src/app/layout.tsx`, and the components imported by screens. Web UI is shadcn until `docs/memory/DECISIONS.md` says otherwise. Do not add a second component library.

The product name and per-company logos and colours are not designed. Company branding is not built. The mark on the landing page is the letter W on a primary square.

## Stack

| Piece | In the repo |
| --- | --- |
| Style | shadcn `base-nova` (`components.json`) |
| CSS | Tailwind CSS 4, `@import "shadcn/tailwind.css"`, `tw-animate-css` |
| Colour | CSS variables, `oklch`, `baseColor: neutral` |
| Icons | `lucide-react` |
| Primitives | `@base-ui/react` under `src/components/ui` |
| Theme | `next-themes`, `attribute="class"`, `defaultTheme="system"` |
| Toasts | `sonner` via `src/components/ui/sonner.tsx` |
| Fonts | Geist Sans and Geist Mono from `next/font/google`, `display: swap` |

## Typography

Geist Sans is `--font-geist-sans`, used as `--font-sans` and `--font-heading`. Geist Mono is `--font-geist-mono`. Body uses `text-base`, antialiased, feature settings `ss01` and `cv11`, letter-spacing `-0.011em`.

| Token | Size | Line height |
| --- | --- | --- |
| `--text-xs` | 0.75rem | 1rem |
| `--text-sm` | 0.8125rem | 1.25rem |
| `--text-base` | 0.9375rem | 1.5rem |
| `--text-lg` | 1.0625rem | 1.6rem |
| `--text-xl` | 1.25rem | 1.75rem |
| `--text-2xl` | 1.5rem | 1.9rem |
| `--text-3xl` | 1.875rem | 2.25rem |
| `--text-4xl` | 2.375rem | 1.15 |

Headings use `--font-heading`, weight 600, tracking `--tracking-display` (`-0.035em`). `h1` is `--text-3xl`, `h2` is `--text-xl`, `h3` is `--text-base` at weight 500. The landing `h1` overrides that with `text-4xl` and `sm:text-5xl`.

`font-numeric` sets the mono font, tabular numbers, and letter-spacing `-0.04em`. Module screens use it for the JSON panel.

## Colour and radius

Light and dark tokens are in `src/app/globals.css`. Radius base is `--radius: 0.625rem`. Steps are `sm` 0.6, `md` 0.8, `lg` 1, `xl` 1.4, `2xl` 1.8, `3xl` 2.2, `4xl` 2.6 times that base.

Primary is blue-violet, not the neutral base:

| Token | Light | Dark |
| --- | --- | --- |
| `--primary` | `oklch(0.457 0.16 264)` | `oklch(0.735 0.12 264)` |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.18 0.04 264)` |
| `--ring` | same as light primary | same as dark primary |
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |

Also defined and wired through `@theme inline`: `card`, `popover`, `secondary`, `muted`, `accent`, `border`, `input`, `chart-1` through `chart-5`, and the sidebar set (`sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-accent`, `sidebar-border`, `sidebar-ring`). Chart tokens are neutral grays in both themes. Sidebar primary in dark is `oklch(0.488 0.243 264.376)`.

Surfaces in use:

- `app-canvas` is the page wash: two primary radial gradients over `--background`. Used on the landing page and the error page.
- `glass` is `color-mix` of `--background` at 72% plus an 18px blur. Used on the landing header.
- Cards on customer screens use `bg-card/80` or `bg-card/85` and `shadow-sm`.

The operator dashboard does not use the sidebar component. Its aside is `bg-foreground` with `text-background`.

## Components in use

Imported by screens or layout:

| Component | Where |
| --- | --- |
| `Button` | Landing, signup, customer login, invite, tasks, staff, module screens, shell, theme toggle, error page |
| `Card` and header, title, description, content | Landing, signup, login, invite, customer home, modules, staff, module screens, `ConfigNotice` |
| `Input`, `Label` | Forms and module screens |
| `Badge` | Landing, customer home, modules, tasks, staff, shell |
| `Skeleton` | Signup, customer login, modules, tasks, staff |
| `Tabs` | Modules, tasks, staff |
| `Switch` | Modules page |
| `Table` | Tasks and staff |
| `Select` | Tasks and staff dialogs |
| `Dialog` | Tasks, staff, and the shell command dialog |
| `ScrollArea` | Module screen JSON panel |
| `Sidebar` and its pieces | `CustomerShell` |
| `Tooltip` | Root layout provider. Sidebar buttons pass a `tooltip` string. |
| `Toaster` (`sonner`) | Root layout. Success and error toasts on signup, login, tasks, staff, modules, invite, and module save. |
| `EmptyState` | Tasks and staff empty and error states. Dashed border, `bg-muted/40`. |
| `ConfigNotice` | Missing Supabase config and `error.tsx`. A card, not a stack trace. |
| `ThemeToggle` | Landing, signup, customer login, invite, customer shell |

Installed under `src/components/ui` and only reached through other UI files, not imported by a screen:

| File | Reached from |
| --- | --- |
| `sheet.tsx` | `sidebar.tsx` (mobile sidebar) |
| `separator.tsx` | `sidebar.tsx` |
| `tooltip.tsx` | Layout provider and sidebar |
| `avatar.tsx` | Not imported |
| `dropdown-menu.tsx` | Not imported |

`global-error.tsx` does not use these components. It is a small unstyled document so a root failure still shows "This page could not load" and a Try again button.

## Layout patterns

Customer console: `CustomerShell` with a grouped sidebar (Work, People, Business, Platform). Admin-only items are Modules, Audit, and Settings. The header has the company name, industry, a theme toggle, and sign out.

Marketing and auth pages (landing, signup, customer login, invite) are centered columns on `app-canvas` with a sticky or simple header and `ThemeToggle`.

Copy stays short. Errors that reach the page are one sentence ("Sign in again.", "Something went wrong.", "Database is not configured"). Server logs keep Supabase codes. See `docs/RUNBOOK.md`.
