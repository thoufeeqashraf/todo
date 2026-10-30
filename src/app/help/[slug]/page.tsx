import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { HelpArticleView } from '@/components/help/help-article';
import { getHelpArticle, getHelpCategory, helpArticles, relatedArticles } from '@/content/help';

export const instant = false;

export function generateStaticParams() {
  return helpArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) return { title: 'Help' };
  return {
    title: `${article.title} · Help`,
    description: article.summary,
  };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) notFound();
  const category = getHelpCategory(article.categoryId);
  if (!category) notFound();

  return <HelpArticleView article={article} category={category} related={relatedArticles(article.slug)} />;
}
