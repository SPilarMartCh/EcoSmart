import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoBadge({ label = "Datos simulados", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn-soft px-2.5 py-1 text-xs font-medium text-earth",
        className,
      )}
    >
      <FlaskConical className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function DemoNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-warn/30 bg-warn-soft/60 px-4 py-3 text-sm text-earth">{children}</div>
  );
}
