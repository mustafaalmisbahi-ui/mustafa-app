import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MetricCardProps = {
  title: string;
  value: number;
  helperText?: string;
};

export function MetricCard({ title, value, helperText }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {helperText ? <p className="mt-2 text-xs text-muted-foreground">{helperText}</p> : null}
      </CardContent>
    </Card>
  );
}
