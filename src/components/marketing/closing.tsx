import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Mesh } from '@/components/marketing/mesh';
import { Reveal } from '@/components/marketing/reveal';
import { Button } from '@/components/ui/button';

export function Closing() {
  return (
    <section className="px-6 pb-24">
      <Reveal>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[oklch(0.17_0.045_268)] px-8 py-16 text-white sm:px-12">
          <Mesh variant="brand" />
          <div className="relative max-w-xl">
            <h2 className="text-balance text-3xl leading-tight text-white sm:text-4xl">
              Open the company. The floor can follow.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
              Signup creates the tenant and the first admin. Customer sign-in is the door after that.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg" className="h-10 px-4">
                  Create a company
                  <ArrowRight />
                </Button>
              </Link>
              <Link href="/customer-login">
                <Button size="lg" variant="outline" className="h-10 border-white/20 bg-transparent px-4 text-white hover:bg-white/10 hover:text-white">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
