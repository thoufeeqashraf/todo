import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ConfigNotice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="bg-card/85 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}
