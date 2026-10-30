import type { ReactNode } from "react";

import { BrandMark } from "@/components/system/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { siteName } from "@/lib/seo";

export function SystemScreen({
  kicker,
  title,
  description,
  children,
  actions,
  footnote,
}: {
  kicker: string;
  title: string;
  description: string;
  children?: ReactNode;
  actions?: ReactNode;
  footnote?: string;
}) {
  return (
    <div className="app-canvas flex min-h-svh items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md border-0 bg-card/85 shadow-xl shadow-primary/5 ring-1 ring-foreground/10 backdrop-blur-md">
        <CardHeader>
          <div className="flex flex-col items-center gap-2 text-center">
            <BrandMark />
            <p className="pt-1 text-sm font-semibold tracking-tight">{siteName}</p>
            <Badge variant="secondary">{kicker}</Badge>
            <CardTitle className="pt-1 text-2xl tracking-tight">
              <h1 className="text-2xl">{title}</h1>
            </CardTitle>
            <CardDescription className="max-w-sm text-sm leading-relaxed">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {children}
          {actions ? (
            <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>
          ) : null}
          {footnote ? <p className="font-mono text-xs text-muted-foreground">{footnote}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
