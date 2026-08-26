import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "leaf" | "sky" | "warn" | "navy";

const toneStyles: Record<Tone, string> = {
  leaf: "bg-leaf-soft text-accent-foreground",
  sky: "bg-sky-soft text-sky",
  warn: "bg-warn-soft text-earth",
  navy: "bg-navy/10 text-navy",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  tone = "leaf",
  footer,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: Tone;
  footer?: React.ReactNode;
}) {
  return (
    <div className="card-soft p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {value}
            {unit ? <span className="ml-1 text-base font-medium text-muted-foreground">{unit}</span> : null}
          </p>
        </div>
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", toneStyles[tone])}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      {hint ? <p className="mt-3 text-xs text-muted-foreground">{hint}</p> : null}
      {footer}
    </div>
  );
}
