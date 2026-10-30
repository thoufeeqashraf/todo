export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-[55%]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M6 7.5h12" />
        <path d="M6 12h12" />
        <path d="M6 16.5h6" />
        <path d="M15.2 15.2 17 17l3.2-3.4" />
      </svg>
    </span>
  );
}
