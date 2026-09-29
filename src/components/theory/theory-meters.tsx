import { TheoryDots } from "@/components/theory/theory-dots";

interface TheoryMetersProps {
  trust: number;
  tension: number;
  max: number;
}

export function TheoryMeters({ trust, tension, max }: TheoryMetersProps) {
  return (
    <div className="theory-meters">
      <div className="theory-meter">
        <TheoryDots value={trust} max={max} tone="blue" direction="column" label="Доверие" />
        <span>Доверие</span>
      </div>
      <div className="theory-meter">
        <TheoryDots value={tension} max={max} tone="coral" direction="column" label="Напряжение" />
        <span>Напряжение</span>
      </div>
    </div>
  );
}
