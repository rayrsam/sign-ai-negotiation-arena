import { CounterpartyAvatar } from "@/components/counterparty-avatar";
import { TheoryDots } from "@/components/theory/theory-dots";
import type { TheoryCharacter } from "@/types/theory";

interface TheoryCharacterCardProps {
  character: TheoryCharacter;
  mood: number;
  moodMax: number;
  memo: string[];
}

export function TheoryCharacterCard({ character, mood, moodMax, memo }: TheoryCharacterCardProps) {
  return (
    <aside className="theory-side-column">
      <article className="theory-character-card">
        <div className="theory-character-avatar"><CounterpartyAvatar /></div>
        <strong>{character.name}</strong>
        <p>{character.subtitle}</p>
        <span className="theory-character-mood-label">Настроение</span>
        <TheoryDots value={mood} max={moodMax} tone="coral" label="Настроение" />
      </article>

      <article className="theory-memo-card">
        <h2>Памятка</h2>
        <ul>
          {memo.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </article>
    </aside>
  );
}
