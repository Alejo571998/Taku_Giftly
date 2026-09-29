import { cn } from "@/lib/utils";

function scoreTone(score: number): string {
  if (score >= 75) return "bg-accent/15 text-accent-ink";
  if (score >= 50) return "bg-primary/12 text-primary-ink";
  return "bg-muted text-muted-foreground";
}

export function CompatibilityBadge({
  score,
  showLabel = false,
  className,
}: {
  score: number;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums",
        scoreTone(score),
        className
      )}
      title={`Compatibilidad: ${score} de 100`}
    >
      {score}%{showLabel && <span className="font-semibold"> compatible</span>}
      {!showLabel && <span className="sr-only"> de compatibilidad</span>}
    </span>
  );
}
