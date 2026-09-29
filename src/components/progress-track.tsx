import { ProgressNumber } from "@/components/progress-number";
import { cn } from "@/lib/utils";
import { progressSteps } from "@/data/lesson";
import "./progress-track.css";

interface ProgressTrackProps {
  activeStep: number;
}

export function ProgressTrack({ activeStep }: ProgressTrackProps) {
  const completedThrough = activeStep === 0 ? 1 : activeStep - 1;

  return (
    <ol className="progress-track" aria-label="Этапы урока">
      {progressSteps.map((step) => (
        <li
          key={step.number}
          className={cn(
            "progress-step",
            step.number <= completedThrough && "completed",
            step.number === activeStep && "active",
          )}
          aria-label={`${step.number}. ${step.label}`}
          aria-current={step.number === activeStep ? "step" : undefined}
        >
          <ProgressNumber number={step.number} />
          <small aria-hidden="true">{step.label}</small>
        </li>
      ))}
    </ol>
  );
}
