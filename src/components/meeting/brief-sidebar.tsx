import { cn } from "@/lib/utils";
import type { HintLevel } from "@/types/reporting";

interface BriefSidebarProps {
  briefOpen: boolean;
  onToggleBrief: () => void;
  hintVisible: boolean;
  hintsAvailable: boolean;
  hintLevel: HintLevel | null;
  hintText: string;
  inputMode: "voice" | "text";
  onCloseHint: () => void;
  onCopyHint: () => void;
}

const hintSteps = [
  { label: "намёк на направление", icon: "/icons/Group%20205.svg" },
  { label: "возможный интерес", icon: "/icons/Group%20240.svg" },
  { label: "пример фразы", icon: "/icons/Group%20238.svg" },
];

export function BriefSidebar({
  briefOpen, onToggleBrief, hintVisible, hintsAvailable, hintLevel, hintText, inputMode, onCloseHint, onCopyHint,
}: BriefSidebarProps) {
  return (
    <aside className="brief-column">
      <section className={cn("brief-panel", briefOpen && "is-open")}>
        <button
          id="brief-toggle"
          type="button"
          className="brief-toggle"
          onClick={onToggleBrief}
          aria-expanded={briefOpen}
          aria-controls="brief-facts"
        >
          <span>Бриф и факты</span>
          <svg className="brief-chevron" viewBox="-2 -2 20 12" fill="none" aria-hidden="true">
            <path d={briefOpen ? "M0 8 8 0 16 8" : "M0 0 8 8 16 0"} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div
          id="brief-facts"
          className="brief-details"
          hidden={!briefOpen}
          role="region"
          aria-labelledby="brief-toggle"
          tabIndex={0}
        >
          <div className="brief-copy">
            <section>
              <h2>Роль</h2>
              <p>Вы руководите интеграционным проектом международной производственной компании.</p>
            </section>
            <section>
              <h2>Ситуация</h2>
              <p>
                Компания недавно приобрела региональный завод. Головной офис предлагает сделать подбор,
                оценку и обучение сотрудников прозрачнее. Директор завода требует отложить изменения:
                через десять недель запускается обновлённая линия, а мастера уже перегружены.
              </p>
            </section>
            <section>
              <h2>Ваша задача</h2>
              <p>Понять, что стоит за требованием об отсрочке, и договориться о следующем шаге.</p>
            </section>
            <section>
              <h2>Известные факты</h2>
              <ul>
                <li>Запуск линии через десять недель</li>
                <li>Мастера участвуют и в запуске, и в кадровых решениях</li>
                <li>Головная компания хочет начать изменения в текущем квартале</li>
                <li>Директор предлагает вернуться к вопросу через полгода</li>
              </ul>
            </section>
          </div>
          <p className="brief-footnote">
            Факты видны всё время встречи.<br />
            Скрытые интересы директора здесь не показываются.
          </p>
        </div>
      </section>

      <section className="task-card" hidden={briefOpen || hintVisible}>
        <h2>Ваша задача</h2>
        <p>Понять, что стоит за требованием об отсрочке, и договориться о следующем шаге.</p>
      </section>

      <section className={cn("mentor-panel", hintVisible && "is-hint-open")} hidden={briefOpen || !hintsAvailable}>
        <div className="mentor-title">
          <img src="/icons/mentor.svg" alt="" width="32" height="32" />
          <h2>Наставник</h2>
        </div>
        {hintVisible && hintLevel ? (
          <>
            <p className="mentor-progress-label">Подсказка {hintLevel} из 3</p>
            <div className="mentor-progress" role="img" aria-label={`Уровень подсказки ${hintLevel} из 3`}>
              {[1, 2, 3].map((step) => (
                <span key={step} className={cn(step === hintLevel && "active")} />
              ))}
            </div>
            <p className="mentor-hint" aria-live="polite">{hintText}</p>
            <div className="mentor-actions">
              {hintLevel === 3 && inputMode === "text" && (
                <button type="button" className="mentor-copy-action" onClick={onCopyHint}>
                  Скопировать в черновик
                </button>
              )}
              <button type="button" className="mentor-return-action" onClick={onCloseHint}>
                Вернуться к разговору
              </button>
            </div>
            <small>Подсказка закрывается только вами.<br />Отправка — отдельным действием.</small>
          </>
        ) : (
          <>
            <p>Появится здесь, только если вы попросите подсказку. Сам в разговор не вмешивается</p>
            <div className="mentor-options" aria-label="Уровни подсказок">
              {hintSteps.map(({ label, icon }) => (
                <div className="mentor-option" key={label}>
                  <img src={icon} alt="" width="61" height="43" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <small>Подсказка не снижает оценку качества ответа — попытка отмечается как выполненная с поддержкой</small>
          </>
        )}
      </section>
    </aside>
  );
}
