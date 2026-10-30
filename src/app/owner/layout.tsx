import type { ReactNode } from 'react';

import { OwnerShell } from '@/components/owner/shell';
import { requirePageOwner } from '@/lib/owner/page-owner';

export const instant = false;

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const owner = await requirePageOwner();
  return <OwnerShell email={owner.email}>{children}</OwnerShell>;
}
