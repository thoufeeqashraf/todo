import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function StatGrid({
  items,
}: {
  items: { label: string; value: string; hint: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="bg-card/80 shadow-sm">
          <CardHeader>
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="font-numeric text-2xl tracking-tight">{item.value}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{item.hint}</CardContent>
        </Card>
      ))}
    </div>
  );
}
