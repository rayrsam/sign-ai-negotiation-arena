import { useEffect, useRef, useState } from "react";
import {
  defaultSettings, difficultyHints, difficultyLabels, difficultyRules, formats, methods, roles, skills, topics,
} from "../../../shared/table/scenario";
import type { Difficulty, FormatId, MethodId, TrainingSettings } from "../../../shared/table/types";
import { Stage } from "@/table/components/stage";
import { AppLayout } from "@/table/components/layout";
import { HandText } from "@/table/components/hand-text";
import { ArrowUpIcon, ChevronDownIcon } from "@/table/components/icons";
import { CtaButton } from "@/table/components/controls";
import { navigate } from "@/table/lib/router";
import { cn } from "@/lib/utils";
import { startTable } from "@/table/services/api";
import { readSettingsDraft, writeSettingsDraft } from "@/table/services/history";

const FORMAT_LEFT = [208, 756.7, 1305.3];
const ART: Record<FormatId, { src: string; left: number; top: number; width: number; height: number }> = {
  ai: { src: "/assets/format-ai.svg", left: 502, top: 300, width: 196, height: 122 },
  table: { src: "/assets/format-table.svg", left: 1064, top: 328, width: 192, height: 80 },
  choice: { src: "/assets/format-choice.svg", left: 1582, top: 300, width: 222, height: 108 },
};

function Segmented<T extends string>({ options, value, onChange, left, top, label }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; left: number; top: number; label: string }) {
  return (
    <div className="st-segmented" style={{ left, top }} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" role="radio" aria-checked={option.value === value} className={cn(option.value === value && "is-on")} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SelectField({ value, options, onChange, left, top, label, chevron = true }: { value: string; options: string[]; onChange: (value: string) => void; left: number; top: number; label: string; chevron?: boolean }) {
  return (
    <label className={cn("st-select", chevron && "has-chevron")} style={{ left, top }}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <span className="st-select-value" aria-hidden="true">{value}</span>
      {chevron && <ChevronDownIcon className="st-select-chevron" />}
    </label>
  );
}

export function SettingsScreen() {
  const [settings, setSettings] = useState<TrainingSettings>(() => ({ ...defaultSettings(), ...readSettingsDraft<TrainingSettings>() }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const method = methods.find((item) => item.id === settings.method) ?? methods[1];
  const rules = difficultyRules[settings.difficulty];
  const format = formats.find((item) => item.id === settings.format)!;
  const available = settings.format === "table";
  // «Переговоры с AI» are assembled in the free negotiations section.
  const freeTalk = settings.format === "ai";

  useEffect(() => writeSettingsDraft(settings), [settings]);

  const update = (patch: Partial<TrainingSettings>) => {
    setError(null);
    setSettings((current) => ({ ...current, ...patch }));
  };

  async function build() {
    if (freeTalk) {
      window.location.assign("?screen=free-setup");
      return;
    }
    if (!available || busy) return;
    setBusy(true);
    setError(null);
    try {
      const state = await startTable(settings);
      navigate("howto", { id: state.id, start: "1" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось собрать тренировку");
      setBusy(false);
    }
  }

  const formatMeta = settings.format === "table" ? `до ${rules.maxTurns} ходов · ${rules.minutes}` : format.meta;

  return (
    <Stage label="Новая тренировка">
      <AppLayout title="Тренировка" breadcrumb="Главная/Тренировка/Новая тренировка" active="training">
        <div className="st-formats" ref={cardsRef} role="radiogroup" aria-label="Формат тренировки">
          {formats.map((item, index) => {
            const on = settings.format === item.id;
            const art = ART[item.id];
            const meta = item.id === "table" ? formatMeta : item.meta;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={cn("panel st-format", on && "is-on")}
                style={{ left: FORMAT_LEFT[index] }}
                onClick={() => update({ format: item.id })}
              >
                <HandText className="st-format-number" text={String(index + 1)} size={39} color={on ? "#FF6547" : "#8B8484"} />
                <strong>{item.title}</strong>
                <span className={cn("st-radio", on && "is-on")} aria-hidden="true" />
                <small>{item.text}</small>
                <span className="st-format-meta"><i />{meta}</span>
                <img className="asset" src={art.src} alt="" width={art.width} height={art.height} style={{ left: art.left - FORMAT_LEFT[index], top: art.top - 172 }} draggable={false} />
              </button>
            );
          })}
        </div>

        <section className="panel st-panel" aria-labelledby="st-title">
          <h2 id="st-title" className="st-title">Настройки</h2>
          <div className="st-format-bar">
            <span className="st-format-bar-label">Формат</span>
            <span className="st-format-bar-value">{available ? `${format.title} · ${formatMeta}` : `${format.title} · этот формат собирается в своём разделе`}</span>
            <button type="button" onClick={() => (cardsRef.current?.querySelector("button[aria-checked='true']") as HTMLButtonElement | null)?.focus()}>
              Изменить формат
              <ArrowUpIcon />
            </button>
          </div>

          <p className="st-label" style={{ left: 37.5, top: 177 }}>1 · Методика</p>
          <Segmented label="Методика" left={36} top={212} value={settings.method} onChange={(value: MethodId) => update({ method: value, stage: methods.find((item) => item.id === value)!.stages[0] })}
            options={methods.map((item) => ({ value: item.id, label: item.label }))} />

          <p className="st-label" style={{ left: 37, top: 285 }}>2 · Этап методики</p>
          <SelectField label="Этап методики" left={36} top={315} value={settings.stage} options={method.stages} onChange={(value) => update({ stage: value })} chevron={false} />

          <p className="st-label" style={{ left: 37, top: 393 }}>3 · Навык</p>
          <SelectField label="Навык" left={36} top={418.2} value={settings.skill} options={skills} onChange={(value) => update({ skill: value })} />

          <p className="st-label" style={{ left: 549.5, top: 177 }}>4 · Тематика</p>
          <SelectField label="Тематика" left={548.7} top={205.6} value={settings.topic} options={topics} onChange={(value) => update({ topic: value })} />

          <p className="st-label" style={{ left: 549.8, top: 285 }}>5 · Ваша роль</p>
          <SelectField label="Ваша роль" left={548.7} top={313.6} value={settings.role} options={roles} onChange={(value) => update({ role: value })} />

          <p className="st-label" style={{ left: 549.5, top: 393 }}>6 · Сложность</p>
          <Segmented label="Сложность" left={548.7} top={421.6} value={settings.difficulty} onChange={(value: Difficulty) => update({ difficulty: value })}
            options={(Object.keys(difficultyLabels) as Difficulty[]).map((id) => ({ value: id, label: difficultyLabels[id] }))} />

          <p className="st-hint" style={{ left: 36.5 }}>{method.hint}</p>
          <p className="st-hint" style={{ left: 549.7 }}>{difficultyHints[settings.difficulty]}</p>
        </section>

        <section className="panel st-history" aria-labelledby="st-history-title">
          <img className="asset" src="/assets/history-deco.svg" alt="" width="525" height="485" style={{ left: 0, top: 0 }} draggable={false} />
          <h2 id="st-history-title">История<br />тренировок</h2>
          <p>Хронология и статистика по вашим тренировкам. Лучшие результаты, рекомендации и возможность оценить динамику</p>
          <button type="button" className="st-history-button" onClick={() => navigate("history")}>Посмотреть</button>
        </section>

        {error && <p className="st-error" role="alert">{error}</p>}
        <CtaButton className="st-build" variant="orange" box={{ left: 1305.3, top: 963, width: 524.7, height: 60 }} fontSize={24} onClick={() => void build()} disabled={!(available || freeTalk) || busy}>
          {busy ? "Собираем стол…" : "Собрать тренировку"}
        </CtaButton>
      </AppLayout>
    </Stage>
  );
}
