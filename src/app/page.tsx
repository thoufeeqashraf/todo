import type { Metadata } from 'next';

import { Closing } from '@/components/marketing/closing';
import { Faq } from '@/components/marketing/faq';
import { FeatureGrid } from '@/components/marketing/feature-grid';
import { Hero } from '@/components/marketing/hero';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { Industries } from '@/components/marketing/industries';
import { Pricing } from '@/components/marketing/pricing';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { SocialProof } from '@/components/marketing/social-proof';

export const metadata: Metadata = {
  title: 'ToDo App',
  description: 'Company console for tasks, deadlines, proof of work, and industry-specific operations.',
};

export default function Home() {
  return (
    <div className="min-h-svh scroll-smooth bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <SocialProof />
        <FeatureGrid />
        <Industries />
        <HowItWorks />
        <Pricing />
        <Faq />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}
