'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { helpArticlePath } from '@/components/help/nav';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { HelpCategory, HelpListItem } from '@/content/help';

export function HelpBrowser({
  articles,
  categories,
}: {
  articles: HelpListItem[];
  categories: HelpCategory[];
}) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return articles.filter((article) => {
      if (categoryId && article.categoryId !== categoryId) return false;
      return words.every((word) => article.haystack.includes(word));
    });
  }, [articles, categoryId, query]);

  const activeCategory = categories.find((category) => category.id === categoryId);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <label className="relative block">
          <span className="sr-only">Search help articles</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search articles"
            type="search"
            autoComplete="off"
            aria-controls="help-results"
            className="h-10 bg-card/80 pl-9 shadow-sm"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
          <Button
            type="button"
            size="sm"
            variant={categoryId === null ? 'default' : 'outline'}
            aria-pressed={categoryId === null}
            onClick={() => setCategoryId(null)}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              size="sm"
              variant={categoryId === category.id ? 'default' : 'outline'}
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
            >
              {category.title}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          <span className="font-numeric">{results.length}</span>{' '}
          {results.length === 1 ? 'article' : 'articles'}
          {activeCategory ? ` in ${activeCategory.title}` : ''}
          {query.trim() ? ` for “${query.trim()}”` : ''}
        </p>
        {activeCategory ? (
          <p className="max-w-xl text-sm text-muted-foreground">{activeCategory.description}</p>
        ) : null}
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="No articles match"
          body="Try a broader word, or clear the category. The catalogue is the published help set."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery('');
                setCategoryId(null);
              }}
            >
              Clear search
            </Button>
          }
        />
      ) : (
        <ul id="help-results" className="grid gap-3 sm:grid-cols-2">
          {results.map((article) => (
            <li key={article.slug}>
              <Link
                href={helpArticlePath(article.slug)}
                className="flex h-full flex-col gap-3 rounded-xl bg-card/80 p-5 shadow-sm ring-1 ring-foreground/10 transition-colors hover:bg-card hover:ring-foreground/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="secondary">{article.categoryTitle}</Badge>
                  <span className="font-numeric text-xs text-muted-foreground">{article.minutes} min</span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-base">{article.title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{article.summary}</p>
                </div>
                <p className="mt-auto text-xs text-muted-foreground">Updated {article.updated}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
