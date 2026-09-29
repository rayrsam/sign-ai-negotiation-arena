import { cn } from "@/lib/utils";

interface TheoryDotsProps {
  value: number;
  max: number;
  tone: "blue" | "coral";
  direction?: "row" | "column";
  label?: string;
}

export function TheoryDots({ value, max, tone, direction = "row", label }: TheoryDotsProps) {
  return (
    <div
      className={cn("theory-dots", `theory-dots-${direction}`, `theory-dots-${tone}`)}
      role="img"
      aria-label={label ? `${label}: ${value} из ${max}` : `${value} из ${max}`}
    >
      {Array.from({ length: max }).map((_, index) => (
        <i key={index} className={cn(index < value && "is-filled")} />
      ))}
    </div>
  );
}
