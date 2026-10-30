import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { helpArticlePath, helpCenterPath } from '@/components/help/nav';
import { Badge } from '@/components/ui/badge';
import type { HelpArticle, HelpCategory } from '@/content/help';
import { articleReadingMinutes } from '@/content/help';

export function HelpArticleView({
  article,
  category,
  related,
}: {
  article: HelpArticle;
  category: HelpCategory;
  related: HelpArticle[];
}) {
  const minutes = articleReadingMinutes(article);

  return (
    <article className="mx-auto max-w-2xl space-y-10">
      <div className="space-y-5">
        <Link
          href={helpCenterPath}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Help center
        </Link>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{category.title}</Badge>
            <span className="font-numeric text-xs text-muted-foreground">{minutes} min read</span>
          </div>
          <h1>{article.title}</h1>
          <p className="text-base text-muted-foreground">{article.summary}</p>
          <p className="text-xs text-muted-foreground">Updated {article.updated}</p>
        </div>
      </div>

      <div className="space-y-4 text-sm leading-relaxed">
        {article.blocks.map((block, index) => {
          if (block.kind === 'h') {
            return (
              <h2 key={index} className="pt-2">
                {block.text}
              </h2>
            );
          }
          if (block.kind === 'ul') {
            return (
              <ul key={index} className="list-disc space-y-2 pl-5 text-muted-foreground">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          }
          if (block.kind === 'callout') {
            return (
              <aside key={index} className="rounded-xl bg-muted/70 px-4 py-3 ring-1 ring-foreground/10">
                <p className="font-medium text-foreground">{block.title}</p>
                <p className="mt-1 text-muted-foreground">{block.text}</p>
              </aside>
            );
          }
          return (
            <p key={index} className="text-muted-foreground">
              {block.text}
            </p>
          );
        })}
      </div>

      {related.length > 0 ? (
        <section className="space-y-3 border-t pt-8">
          <h2>More in {category.title}</h2>
          <ul className="space-y-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  href={helpArticlePath(item.slug)}
                  className="block rounded-xl bg-card/80 px-4 py-3 ring-1 ring-foreground/10 hover:ring-foreground/20"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
