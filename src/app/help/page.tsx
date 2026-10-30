import type { Metadata } from 'next';

import Link from 'next/link';

import { HelpBrowser } from '@/components/help/help-browser';
import { customerOnboardingPath } from '@/components/help/nav';
import { Badge } from '@/components/ui/badge';
import { helpCategories, helpListItems } from '@/content/help';

export const metadata: Metadata = {
  title: 'Help center',
  description: 'Search articles on companies, people, modules, attendance, and the mobile app that comes later.',
};

export default function HelpPage() {
  return (
    <div className="space-y-10">
      <div className="max-w-2xl space-y-3">
        <Badge variant="secondary">Help center</Badge>
        <h1>Find the answer, then get back to the floor.</h1>
        <p className="text-base text-muted-foreground">
          Short articles for signup, roles, modules, and attendance. Search stays in the browser. Nothing here is loaded
          from the database.
        </p>
        <p className="text-sm text-muted-foreground">
          Already signed in?{' '}
          <Link href={customerOnboardingPath} className="text-primary hover:underline">
            Open the setup checklist
          </Link>
          .
        </p>
      </div>
      <HelpBrowser articles={helpListItems()} categories={helpCategories} />
    </div>
  );
}
