import type { TheoryOption } from "@/types/theory";

type Letter = TheoryOption["letter"];

// Hand-drawn answer letters from the mockups (strokes 14 units wide). The source vectors come rotated
// by 53.13° — their straight strokes run at a 3:4 slope — and are stored here turned upright.
// 100 units = 1em of the letter.
const glyphs: Record<Letter, { d: string; w: number; h: number; join: "round" | "miter" }> = {
  A: {
    d: "M64.9 100.85L64.8 62.65M64.8 62.65L64.99 9.03C65 7.75 63.83 6.79 62.57 7.04C35.61 12.43 14.62 33.65 9.54 60.68L7.5 71.55L7 105.55M64.8 62.65L49.38 69.73C44.06 72.17 38.21 73.27 32.36 72.95L7.5 71.55",
    w: 71.99,
    h: 112.55,
    join: "round",
  },
  B: {
    d: "M7.11 66.68L7.1 69.54C7.05 86.3 21.6 99.36 38.26 97.52L48.7 96.37C56.47 95.51 62.45 89.11 62.78 81.29C63.17 71.99 55.5 64.36 46.2 64.8L7.11 66.68ZM7.11 66.68L7 35.09C6.95 20.93 17.62 8.95 31.67 7.21C48.11 5.18 62.82 17.92 62.94 34.48C63.04 48.34 52.88 60.14 39.16 62.1L7.11 66.68Z",
    w: 69.94,
    h: 104.7,
    join: "round",
  },
  C: {
    d: "M64.28 20.78C61.35 11.97 52.78 6.31 43.52 7.07L35.34 7.74C19.55 9.03 7.35 22.17 7.24 38.02L7 70.05C6.87 88.37 23.27 102.4 41.34 99.42L43.64 99.04C52.53 97.58 59.98 91.52 63.24 83.12",
    w: 71.28,
    h: 106.82,
    join: "miter",
  },
};

/** Answer card letter A, B or C drawn in the hand style of the mockups; it takes the text colour. */
export function AnswerLetter({ letter }: { letter: Letter }) {
  const { d, w, h, join } = glyphs[letter];
  return (
    <svg
      className="answer-letter"
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: `${w / 100}em`, height: `${h / 100}em` }}
      role="img"
      aria-label={letter}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth={14} strokeLinecap="round" strokeLinejoin={join} />
    </svg>
  );
}
