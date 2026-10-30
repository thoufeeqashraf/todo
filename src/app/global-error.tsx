'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'ui-sans-serif, system-ui, sans-serif', background: '#fafafa', color: '#171717' }}>
        <main style={{ maxWidth: 480, margin: '0 auto', padding: '4rem 1.5rem' }}>
          <h1 style={{ fontSize: '1.25rem', letterSpacing: '-0.02em' }}>This page could not load</h1>
          <p style={{ color: '#525252', lineHeight: 1.5 }}>
            A setting is missing, or the request failed. The details stay on the server.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ marginTop: '1rem', borderRadius: 8, border: '1px solid #e5e5e5', background: '#fff', padding: '0.5rem 0.75rem' }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
