import { UserRound } from "lucide-react";
import { ArenaHeader } from "@/components/arena-header";
import { LongArrow } from "@/components/long-arrow";
import { Button } from "@/components/ui/button";
import { getBriefContent } from "@/data/brief-content";

export function BriefScreen() {
  const id = new URLSearchParams(window.location.search).get("id") || "00";
  const brief = getBriefContent(id);

  return (
    <main className="arena-shell brief-screen">
      <ArenaHeader activeStep={2} title={brief.lessonTitle} subtitle={brief.blockLabel} />

      <section className="brief-screen-grid" aria-label="Бриф">
        <article className="brief-screen-overview" aria-label="Описание ситуации">
          <span className="brief-screen-kicker">БРИФ ВСТРЕЧИ</span>
          <h2 className="brief-screen-title">{brief.title}</h2>
          <section className="brief-screen-section">
            <h3>РОЛЬ</h3>
            <p>{brief.role}</p>
          </section>
          <section className="brief-screen-section">
            <h3>СИТУАЦИЯ</h3>
            <p>{brief.situation}</p>
          </section>
          <section className="brief-screen-task">
            <h3>ВАША ЗАДАЧА</h3>
            <p>{brief.task}</p>
          </section>
          <section className="brief-screen-section brief-screen-lesson">
            <h3>ФОКУС УРОКА</h3>
            <p>{brief.focus}</p>
          </section>
        </article>

        <div className="brief-screen-side">
          <div className="role-chip brief-screen-role">
            <UserRound size={18} />
            {brief.character.name} · {brief.character.subtitle}
          </div>
          <article className="brief-screen-facts" aria-label="Факты">
            <h2>Известные факты</h2>
            <ul className="brief-screen-facts-list">
              {brief.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
            <p className="brief-screen-footnote">Факты остаются под рукой всю встречу — в панели «Бриф и факты».</p>
          </article>
          <article className="brief-screen-how" aria-label="Как проходит встреча">
            <h2>Как проходит встреча</h2>
            <div className="brief-screen-how-row">
              <span className="brief-screen-how-icon"><img src="/icons/microphone.svg" alt="" /></span>
              <div><h3>Голос или текст</h3><p>Переключайтесь в любой момент. Распознанную речь можно исправить до отправки.</p></div>
            </div>
            <div className="brief-screen-how-row">
              <span className="brief-screen-how-icon"><img src="/icons/mentor.svg" alt="" /></span>
              <div><h3>Подсказка — только по запросу</h3><p>Наставник подскажет в три шага и сам в разговор не вмешивается.</p></div>
            </div>
            <div className="brief-screen-how-row">
              <span className="brief-screen-how-icon brief-screen-pause-icon"><img src="/icons/pause.svg" alt="" /></span>
              <div><h3>Пауза и завершение</h3><p>На паузе директор ждёт. Завершить встречу можно с подтверждением.</p></div>
            </div>
          </article>
          <div className="brief-screen-actions">
            <Button
              type="button"
              variant="outline"
              className="brief-back"
              onClick={() => {
                window.location.search = `?screen=theory&id=${brief.id}`;
              }}
            >
              Вернуться к теории
            </Button>
            <Button type="button" className="brief-start" onClick={() => { window.location.search = "?screen=meeting"; }}>
              Начать встречу
              <LongArrow />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
