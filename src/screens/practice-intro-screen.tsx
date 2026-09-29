import { useState } from "react";
import { ArenaHeader } from "@/components/arena-header";
import { IntroSplash } from "@/components/intro-splash";
import { LongArrow } from "@/components/long-arrow";
import { ProgressNumber } from "@/components/progress-number";
import { Button } from "@/components/ui/button";

const practiceSteps = [
  { number: 1, title: "Бриф", description: "роль, ситуация и ваша задача" },
  {
    number: 2,
    title: "Встреча",
    description: "разговор с директором завода голосом или текстом",
  },
  {
    number: 3,
    title: "Разбор",
    description: "короткий отчёт и переигрывание момента",
  },
];

const concepts = [
  { title: "Позиция", description: "заявленное требование", className: "position" },
  { title: "Интерес", description: "то, что человек защищает", className: "interest" },
  { title: "Проверка", description: "вопрос «верно ли я понял?»", className: "check" },
];

export function PracticeIntroScreen() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <main className="arena-shell practice-gateway-screen">
      {!splashDone && <IntroSplash onDone={() => setSplashDone(true)} />}
      <ArenaHeader activeStep={0} />

      <section className="practice-gateway-grid" aria-label="Введение в практику">
        <article className="practice-gateway-card">
          <span className="practice-gateway-kicker">БЛОК 3 · УРОК 2</span>
          <h2>Практика</h2>
          <p className="practice-gateway-lead">Применить полученные знания в реальном кейсе</p>

          <ol className="practice-gateway-steps">
            {practiceSteps.map(({ number, title, description }, index) => (
              <li className={index === 0 ? "active" : undefined} key={number}>
                <ProgressNumber number={number} />
                <div>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </div>
              </li>
            ))}
          </ol>

          <div className="practice-gateway-visual" aria-hidden="true">
            <img src="/practice-art.svg" alt="" />
          </div>

          <Button
            type="button"
            className="practice-gateway-action"
            onClick={() => { window.location.search = "?screen=brief&id=32"; }}
          >
            К практике
            <LongArrow />
          </Button>
        </article>

        <div className="practice-concepts" aria-label="Ключевые понятия">
          {concepts.map(({ title, description, className }) => (
            <article className={`practice-concept ${className}`} key={title}>
              <h3>{title}</h3>
              <span aria-hidden="true" />
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
