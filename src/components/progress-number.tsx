const numberAssets: Record<number, string> = {
  1: "one",
  2: "two",
  3: "three",
  4: "four",
};

export function ProgressNumber({ number }: { number: number }) {
  return <span className="progress-number" data-number={numberAssets[number]} aria-hidden="true" />;
}
