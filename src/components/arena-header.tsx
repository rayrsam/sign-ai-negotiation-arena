import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ProgressTrack } from "@/components/progress-track";
import { Button } from "@/components/ui/button";
import "./arena-header.css";

interface ArenaHeaderProps {
  activeStep: number;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function ArenaHeader({
  activeStep,
  title = "Позиции и интересы",
  subtitle = "Блок 3 · Урок 2 · Пилот изменений на заводе",
  actions,
}: ArenaHeaderProps) {
  return (
    <header className="arena-header">
      <div className="brand-block">
        <a className="brand-mark" href="?screen=lessons" aria-label="К урокам">
          <BrandLogo className="brand-logo" />
        </a>
        <div className="brand-copy">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <ProgressTrack activeStep={activeStep} />
      <div className="header-actions">
        {actions ?? (
          <Button
            type="button"
            variant="outline"
            className="lesson-exit"
            onClick={() => {
              window.location.search = "?screen=lessons";
            }}
          >
            Выйти из урока
          </Button>
        )}
      </div>
    </header>
  );
}
