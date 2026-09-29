import type { CSSProperties, ReactNode } from "react";
import { ArrowIcon } from "@/table/components/icons";
import { cn } from "@/lib/utils";

export interface Box { left: number; top: number; width: number; height: number }

export function boxStyle(box: Box, extra?: CSSProperties): CSSProperties {
  return { left: box.left, top: box.top, width: box.width, height: box.height, ...extra };
}

interface CtaProps {
  box: Box;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "light" | "orange" | "dark";
  fontSize?: number;
  weight?: number;
  arrowColor?: string;
  className?: string;
  type?: "button" | "submit";
}

/** Rounded call-to-action with the long arrow from the mockups. */
export function CtaButton({ box, children, onClick, disabled, variant = "light", fontSize = 24, weight = 700, arrowColor, className, type = "button" }: CtaProps) {
  const color = arrowColor ?? (variant === "orange" ? "#544C4C" : "#FF6547");
  return (
    <button
      type={type}
      className={cn("pill pill-cta", variant !== "light" && variant, className)}
      style={boxStyle(box, { fontSize, fontWeight: weight })}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
      <ArrowIcon color={color} width={44} />
    </button>
  );
}

export function OutlineButton({ box, children, onClick, disabled, fontSize = 23.5, weight = 700, className, pressed }: {
  box: Box; children: ReactNode; onClick?: () => void; disabled?: boolean; fontSize?: number; weight?: number; className?: string; pressed?: boolean;
}) {
  return (
    <button type="button" className={cn("pill pill-outline", pressed && "is-pressed", className)} style={boxStyle(box, { fontSize, fontWeight: weight })} onClick={onClick} disabled={disabled} aria-pressed={pressed}>
      {children}
    </button>
  );
}

/** Row of trust dots (10 × 17.9 px, step 23.85). */
export function TrustDots({ value, className, style }: { value: number; className?: string; style?: CSSProperties }) {
  const filled = Math.max(0, Math.min(10, Math.round(value / 10)));
  return (
    <span className={cn("trust-dots", className)} style={style} role="img" aria-label={`Доверие ${filled} из 10`}>
      {Array.from({ length: 10 }, (_, index) => <i key={index} className={cn(index < filled && "is-on")} />)}
    </span>
  );
}
