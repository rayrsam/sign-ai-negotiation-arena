import { OutlineButton, CtaButton } from "@/table/components/controls";
import { clock, type useTable } from "@/table/hooks/use-table";
import { navigate } from "@/table/lib/router";

type Table = ReturnType<typeof useTable>;

/** Pause, lost connection, exit confirmation and the red-line warning (T10, T12–T14). */
export function TableOverlay({ table }: { table: Table }) {
  const { overlay, setOverlay } = table;
  if (!overlay) return null;

  async function leave() {
    await table.abort();
    navigate("settings");
  }

  const close = () => setOverlay(null);

  return (
    <div className="modal-layer ov-layer" role="presentation" onClick={(event) => { if (event.target === event.currentTarget && overlay !== "connection") close(); }}>
      {overlay === "pause" && (
        <section className="ov-box" style={{ top: 352, height: 360 }} role="dialog" aria-modal="true" aria-labelledby="ov-title">
          <h2 id="ov-title">Тренировка на паузе</h2>
          <p className="ov-text">Таймер остановлен, ход не тратится. Стол, карты и жетоны сохранены.</p>
          <OutlineButton className="ov-outline" weight={400} box={{ left: 54, top: 252, width: 393, height: 60 }} onClick={() => setOverlay("exit")}>Завершить тренировку</OutlineButton>
          <CtaButton className="ov-cta" weight={400} box={{ left: 475.8, top: 252, width: 307.8, height: 60 }} onClick={close}>Продолжить</CtaButton>
        </section>
      )}
      {overlay === "connection" && (
        <section className="ov-box" style={{ top: 332, height: 400 }} role="alertdialog" aria-modal="true" aria-labelledby="ov-title">
          <h2 id="ov-title">Связь прервалась</h2>
          <p className="ov-text">Стол сохранён. Карта и жетон не списаны, пока нет подтверждённого ответа поставщика.</p>
          <p className="ov-small" style={{ top: 208 }}>Таймер остановлен на {clock(table.elapsed)}.</p>
          <OutlineButton className="ov-outline" weight={400} box={{ left: 54, top: 292, width: 393, height: 60 }} onClick={() => setOverlay("exit")}>Завершить тренировку</OutlineButton>
          <CtaButton className="ov-cta" weight={400} box={{ left: 475.8, top: 292, width: 296.3, height: 60 }} onClick={table.retry}>Повторить</CtaButton>
        </section>
      )}
      {overlay === "exit" && (
        <section className="ov-box" style={{ top: 352, height: 360 }} role="dialog" aria-modal="true" aria-labelledby="ov-title">
          <h2 id="ov-title">Завершить тренировку?</h2>
          <p className="ov-text">Текущий результат не будет сохранён как завершённый.</p>
          <OutlineButton className="ov-outline" weight={400} box={{ left: 54, top: 252, width: 220, height: 60 }} onClick={() => void leave()}>Завершить</OutlineButton>
          <CtaButton className="ov-cta" weight={400} box={{ left: 303.8, top: 252, width: 307.8, height: 60 }} onClick={close}>Продолжить</CtaButton>
        </section>
      )}
      {overlay === "redline" && (
        <section className="ov-box is-wide" style={{ top: 330, height: 380 }} role="alertdialog" aria-modal="true" aria-labelledby="ov-title">
          <h2 id="ov-title">Красная линия нарушена</h2>
          <p className="ov-text">
            {table.selected === "concession" ? "Эта уступка выводит вас" : "Этот пакет выходит"} за вашу красную линию: {table.redLineText.join(", ") || "условия хуже допустимых"}.
          </p>
          <p className="ov-small" style={{ top: 178 }}>Решение за вами. Нарушение красной линии учитывается в разборе.</p>
          <OutlineButton className="ov-outline" weight={400} box={{ left: 54, top: 272, width: 364.8, height: 60 }} onClick={() => table.makeMove(true)}>Всё равно отправить</OutlineButton>
          <CtaButton className="ov-cta" weight={400} box={{ left: 447.9, top: 272, width: 363.8, height: 60 }} onClick={close}>
            {table.selected === "concession" ? "Изменить уступку" : "Изменить пакет"}
          </CtaButton>
        </section>
      )}
    </div>
  );
}
