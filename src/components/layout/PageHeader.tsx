import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 mb-5", className)}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight leading-tight">{title}</h1>
        {description && <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
