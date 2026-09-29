import { useState } from "react";
import { scenario } from "../../../shared/table/scenario";
import { Stage } from "@/table/components/stage";
import { TableHeader } from "@/table/components/layout";
import { HandText } from "@/table/components/hand-text";
import { CtaButton, OutlineButton } from "@/table/components/controls";
import { LockIcon, TriangleIcon } from "@/table/components/icons";
import { currentParams, navigate } from "@/table/lib/router";
import { cn } from "@/lib/utils";

const STEPS = [
  { top: 377, title: "Выберите карту", text: "шесть действий внизу стола — у каждой свой лимит" },
  { top: 468.1, title: "Настройте и сделайте ход", text: "значения выбираются из готовых — сумма считается сама" },
  { top: 559.3, title: "Прочитайте ответ", text: "ответ может открыть мотив поставщика — «Вы узнали»" },
  { top: 653.2, title: "Соберите пакет и зафиксируйте", text: "на ходах 6–8: все пять условий и резюме" },
];

const CHIPS = [
  { kind: "plain", label: "без изменений" },
  { kind: "you", label: "изменили вы" },
  { kind: "supplier", label: "изменил поставщик" },
  { kind: "redline", label: "за красной линией" },
  { kind: "agreed", label: "согласовано" },
];

/** T03 · «Как устроен стол» — the compact rules and brief before the first move. */
export function HowtoScreen() {
  const params = currentParams();
  const id = params.get("id");
  const starting = params.get("start") === "1";
  const [briefOpen, setBriefOpen] = useState(false);

  const toTable = () => (id ? navigate("table", { id }, starting) : navigate("settings"));

  return (
    <Stage label="Как устроен стол">
      <TableHeader title={scenario.title} subtitle="Тренировка / Стол переговоров · как играть">
        <OutlineButton box={{ left: 1641.8, top: 42, width: 162.3, height: 60 }} onClick={() => navigate("settings")}>Выйти</OutlineButton>
      </TableHeader>

      <section className="panel ht-main" aria-labelledby="ht-title">
        <p className="ht-kicker">Механика</p>
        <h2 id="ht-title">Как устроен стол</h2>
        <ol className="ht-steps">
          {STEPS.map((step, index) => (
            <li key={step.title} style={{ top: step.top - 208 }}>
              <HandText className="ht-step-number" text={String(index + 1)} size={43} color="#CDDFF8" />
              <strong>{step.title}</strong>
              <span>{step.text}</span>
              {index < STEPS.length - 1 && <i className="ht-step-line" />}
            </li>
          ))}
        </ol>
        <ul className="ht-rules">
          <li>Жетон уступки тратится, когда вы ухудшаете своё условие на шаг: цена 44→46 000, 100→120 шт., 7→14 дней, отсрочка → 50/50.</li>
          <li>Уступка без встречного условия — бесплатная: доверие падает, в отчёте она снижает оценку.</li>
          <li>Таймер — ориентир: тренировку он не обрывает. Подсказок нет, игровые очки — не оценка навыка.</li>
        </ul>
      </section>

      <section className="panel ht-colors" aria-labelledby="ht-colors-title">
        <h2 id="ht-colors-title">Цвета и элементы</h2>
        <p className="ht-kicker is-sub">Фишки условий</p>
        {CHIPS.map((chip, index) => (
          <div key={chip.kind} className={cn("ht-chip", `is-${chip.kind}`)} style={{ left: 44 + 170 * index }}>
            <span className="ht-chip-disc">
              {chip.kind === "redline" && <TriangleIcon className="ht-chip-mark" size={14} />}
              {chip.kind === "agreed" && <LockIcon className="ht-chip-mark" />}
              44 000
            </span>
            <small>{chip.label}</small>
          </div>
        ))}
        <p className="ht-note">Цвет всегда дублирован подписью под фишкой: «вы», «поставщик», «красная линия», «согласовано».</p>
      </section>

      <section className="panel ht-box" style={{ left: 896, top: 502.3 }}>
        <p className="ht-kicker">Жетоны уступок</p>
        <span className="ht-token" style={{ left: 36 }} />
        <span className="ht-token is-pending" style={{ left: 192 }} />
        <span className="ht-token is-spent" style={{ left: 348 }} />
        <small style={{ left: 60 }}>есть</small>
        <small style={{ left: 216 }}>к списанию</small>
        <small style={{ left: 372 }}>потрачен</small>
      </section>

      <section className="panel ht-box" style={{ left: 1361, top: 502.3 }}>
        <p className="ht-kicker">Мотивы поставщика</p>
        <span className="ht-motive is-closed"><img src="/assets/motive-q.svg" alt="" width="30" height="30" /></span>
        <span className="ht-motive">Объём</span>
        <p className="ht-motive-text"><b>закрыт</b> — откроется<br />от вашего действия;</p>
        <p className="ht-motive-text" style={{ top: 110 }}><b>открыт</b> — «Вы узнали»</p>
      </section>

      <section className="panel ht-box is-cards is-low" style={{ left: 896, top: 682.8 }}>
        <p className="ht-kicker">Карты переговоров</p>
        <span className="ht-card" style={{ left: 29.6 }} />
        <span className="ht-card is-selected" style={{ left: 190 }} />
        <span className="ht-card is-disabled" style={{ left: 348.5 }} />
        <small style={{ left: 30, top: 131 }}>обычная</small>
        <small style={{ left: 190, top: 131 }}>выбрана</small>
        <small style={{ left: 343, top: 134 }}>недоступна</small>
      </section>

      <section className="panel ht-box is-low" style={{ left: 1361, top: 682.8 }}>
        <p className="ht-kicker">Доверие и очки</p>
        <HandText className="ht-points" text="36" size={30} color="#CDDFF8" />
        <p className="ht-inline" style={{ left: 89.4, top: 60 }}>— игровые очки сессии</p>
        <span className="ht-dots" aria-hidden="true">{[1, 1, 1, 1, 0, 0].map((on, index) => <i key={index} className={cn(on && "is-on")} />)}</span>
        <p className="ht-inline" style={{ left: 167, top: 98 }}>доверие — реакция на ваш стиль</p>
      </section>

      <section className="panel ht-small" style={{ left: 896 }}>
        <p className="ht-kicker">Ход</p>
        <HandText className="ht-turn" text="8" size={56} color="#FF6547" />
        <p className="ht-inline" style={{ left: 84.3, top: 69 }}>— ваш ход<br />в переговорах</p>
      </section>

      <section className="panel ht-small" style={{ left: 1131 }}>
        <p className="ht-kicker">Таймер</p>
        <span className="ht-timer"><i />06:05</span>
        <p className="ht-inline" style={{ left: 108.1, top: 69 }}>— время<br />переговоров</p>
      </section>

      <CtaButton className="ht-brief" variant="dark" box={{ left: 1364.7, top: 870.5, width: 435.6, height: 60 }} onClick={() => setBriefOpen(true)}>К брифу</CtaButton>
      <CtaButton className="ht-start" variant="orange" box={{ left: 1361.8, top: 963, width: 438, height: 60 }} onClick={toTable}>
        {starting ? "Начать тренировку" : "Вернуться к столу"}
      </CtaButton>

      {briefOpen && (
        <div className="modal-layer ov-layer" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setBriefOpen(false); }}>
          <section className="ov-box ht-brief-box" role="dialog" aria-modal="true" aria-labelledby="ht-brief-title">
            <h2 id="ht-brief-title">Бриф встречи</h2>
            <dl>
              <dt>Роль</dt><dd>{scenario.brief.role}</dd>
              <dt>Ситуация</dt><dd>{scenario.brief.situation}</dd>
              <dt>Ваша задача</dt><dd>{scenario.brief.task}</dd>
              <dt>Известные факты</dt>
              <dd><ul>{scenario.brief.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul></dd>
            </dl>
            <p className="ht-brief-foot">Мотивы, границы и запасные варианты поставщика скрыты — их предстоит выяснить за столом.</p>
            <CtaButton className="ov-cta" weight={400} box={{ left: 474, top: 612, width: 307.8, height: 60 }} onClick={() => setBriefOpen(false)}>Понятно</CtaButton>
          </section>
        </div>
      )}
    </Stage>
  );
}
