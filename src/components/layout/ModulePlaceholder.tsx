import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "./PageHeader";

type Props = {
  title: string;
  description?: string;
  stage: number;
  bullets?: string[];
};

export function ModulePlaceholder({ title, description, stage, bullets = [] }: Props) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<Badge variant="info">Etapa {stage}</Badge>}
      />
      <Card>
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            Este módulo será desenvolvido na <strong>Etapa {stage}</strong> do roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground list-disc pl-5">
            {bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
