import { Check, Lock } from "lucide-react";
import { useState } from "react";
import { ProgressNumber } from "@/components/progress-number";
import { ReportAction } from "@/components/report/report-action";
import { ReportLayout } from "@/components/report/report-layout";
import { Button } from "@/components/ui/button";
import {
  completedLessonsCount,
  lessonStatus,
  totalLessonsCount,
  type LessonProgressStatus,
} from "@/data/course-progress";
import { cn } from "@/lib/utils";

interface LessonDetail {
  kicker: string;
  title: string;
  description: string;
  criterion: string;
  metaChips: string[];
}

interface LessonContent {
  id: string;
  number: string;
  title: string;
  meta?: string;
  detail?: LessonDetail;
}

interface CourseBlock {
  id: number;
  tabLabel: string;
  contentTitle: string;
  contentDescription: string;
  lessons: LessonContent[];
}

function placeholderLesson(blockId: number, index: number): LessonContent {
  return {
    id: `${blockId}${index}`,
    number: String(index),
    title: `Блок ${blockId}. Урок ${index}`,
  };
}

function examLesson(blockId: number): LessonContent {
  return {
    id: `E${blockId}`,
    number: "Э",
    title: `Блок ${blockId}. Экзамен`,
    meta: "без подсказок · после всех уроков",
    detail: {
      kicker: `БЛОК ${blockId} · ЭКЗАМЕН`,
      title: `Блок ${blockId}. Экзамен`,
      description: "Условия экзамена появятся позже.",
      criterion: "Критерий успеха появится позже.",
      metaChips: ["Длительность уточняется"],
    },
  };
}

const courseBlocks: CourseBlock[] = [
  {
    id: 1,
    tabLabel: "Подготовка",
    contentTitle: "Блок 1 · Подготовка",
    contentDescription: "Материалы блока появятся позже.",
    lessons: [
      placeholderLesson(1, 1), placeholderLesson(1, 2), placeholderLesson(1, 3), placeholderLesson(1, 4),
      examLesson(1),
    ],
  },
  {
    id: 2,
    tabLabel: "SPIN",
    contentTitle: "Блок 2 · SPIN",
    contentDescription: "Материалы блока появятся позже.",
    lessons: [
      placeholderLesson(2, 1), placeholderLesson(2, 2), placeholderLesson(2, 3), placeholderLesson(2, 4),
      examLesson(2),
    ],
  },
  {
    id: 3,
    tabLabel: "Гарвардский подход",
    contentTitle: "Поиск решения: Гарвардский подход",
    contentDescription: "Интересы вместо позиций, варианты взаимной выгоды и объективные критерии.",
    lessons: [
      {
        id: "31",
        number: "1",
        title: "Люди отдельно от проблемы",
        meta: "пройден · 3 из 4 · без подсказок",
        detail: {
          kicker: "БЛОК 3 · УРОК 1",
          title: "Люди отдельно от проблемы",
          description: "Научиться отделять отношение к человеку от сути разногласий.",
          criterion: "Критерий успеха появится позже.",
          metaChips: ["3 из 4 этапов"],
        },
      },
      {
        id: "32",
        number: "2",
        title: "Позиции и интересы",
        meta: "Пилот изменений на заводе · 10–14 минут",
        detail: {
          kicker: "БЛОК 3 · УРОК 2",
          title: "Позиции и интересы",
          description: "Научиться слышать причину за жёстким требованием",
          criterion: "Критерий успеха: назвать возможный интерес как гипотезу и проверить её вопросом.",
          metaChips: ["10–14 минут", "4 ситуации + разговор с AI"],
        },
      },
      placeholderLesson(3, 3),
      placeholderLesson(3, 4),
      examLesson(3),
    ],
  },
  {
    id: 4,
    tabLabel: "ВАТНА",
    contentTitle: "Блок 4 · ВАТНА",
    contentDescription: "Материалы блока появятся позже.",
    lessons: [
      placeholderLesson(4, 1), placeholderLesson(4, 2), placeholderLesson(4, 3), placeholderLesson(4, 4),
      examLesson(4),
    ],
  },
];

function statusMeta(status: LessonProgressStatus, lessonNumber: number): string {
  if (status === "locked") return lessonNumber > 1 ? `откроется после урока ${lessonNumber - 1}` : "заблокирован";
  if (status === "done") return "Пройден";
  return "Материалы появятся позже";
}

function statusDetail(lesson: LessonContent, status: LessonProgressStatus): LessonDetail {
  return {
    kicker: `УРОК ${lesson.number}`,
    title: lesson.title,
    description: "Описание урока появится позже.",
    criterion: "Критерий успеха появится позже.",
    metaChips: [status === "done" ? "Пройден" : "Длительность уточняется"],
  };
}

function defaultLessonId(block: CourseBlock) {
  const withStatus = block.lessons.map((lesson) => ({ lesson, status: lessonStatus(lesson.id) }));
  const current = withStatus.find(({ status }) => status === "current");
  const available = withStatus.find(({ status }) => status !== "locked");
  return (current ?? available ?? withStatus[0]).lesson.id;
}

export function LessonsScreen() {
  const [selectedBlockId, setSelectedBlockId] = useState(3);
  const selectedBlock = courseBlocks.find((block) => block.id === selectedBlockId) ?? courseBlocks[0];

  const [selectedLessonId, setSelectedLessonId] = useState(() =>
    defaultLessonId(courseBlocks.find((block) => block.id === 3)!),
  );

  const selectedLesson =
    selectedBlock.lessons.find((lesson) => lesson.id === selectedLessonId) ?? selectedBlock.lessons[0];
  const selectedStatus = lessonStatus(selectedLesson.id);

  function selectBlock(block: CourseBlock) {
    setSelectedBlockId(block.id);
    setSelectedLessonId(defaultLessonId(block));
  }

  function selectLesson(lesson: LessonContent) {
    if (lessonStatus(lesson.id) === "locked") return;
    setSelectedLessonId(lesson.id);
  }

  function openLesson() {
    window.location.search = `?screen=theory&id=${selectedLesson.id}`;
  }

  const countedLessons = selectedBlock.lessons.filter((lesson) => lesson.number !== "Э");
  const doneInBlock = countedLessons.filter((lesson) => lessonStatus(lesson.id) === "done").length;
  const detail = selectedLesson.detail ?? statusDetail(selectedLesson, selectedStatus);

  return (
    <ReportLayout title="Обучение" breadcrumb="Главная / Обучение" className="lessons-page">
      <div className="lessons-tabs" role="tablist" aria-label="Блоки курса">
        {courseBlocks.map((block) => (
          <button
            key={block.id}
            type="button"
            role="tab"
            aria-selected={block.id === selectedBlockId}
            className={cn("lessons-tab", block.id === selectedBlockId && "is-active")}
            onClick={() => selectBlock(block)}
          >
            Блок {block.id} · {block.tabLabel}
          </button>
        ))}
        <button
          type="button"
          className="lessons-tab is-disabled"
          disabled
          aria-disabled="true"
          title="Откроется после всех блоков"
        >
          Экзамен курса
        </button>
      </div>

      <div className="lessons-content-grid">
        <article className="lessons-list-card">
          <span className="lessons-list-kicker">
            БЛОК {selectedBlock.id} · ПРОЙДЕНО {doneInBlock} ИЗ {countedLessons.length} УРОКОВ
          </span>
          <h2 className="lessons-list-title">{selectedBlock.contentTitle}</h2>
          <p className="lessons-list-description">{selectedBlock.contentDescription}</p>

          <ol className="lessons-rows">
            {selectedBlock.lessons.map((lesson) => {
              const status = lessonStatus(lesson.id);
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    className={cn("lesson-row", status, lesson.id === selectedLessonId && "is-selected")}
                    onClick={() => selectLesson(lesson)}
                    disabled={status === "locked"}
                    aria-current={lesson.id === selectedLessonId ? "true" : undefined}
                  >
                    <span className="lesson-row-number" aria-hidden="true">
                      {lesson.number === "Э" ? (
                        <span className="lesson-row-number-exam">Э</span>
                      ) : (
                        <ProgressNumber number={Number(lesson.number)} />
                      )}
                    </span>
                    <span className="lesson-row-body">
                      <strong>{lesson.title}</strong>
                      <small>{lesson.meta ?? statusMeta(status, Number(lesson.number))}</small>
                    </span>
                    {status === "done" && (
                      <span className="lesson-row-state is-done" aria-hidden="true"><Check size={16} /></span>
                    )}
                    {status === "locked" && (
                      <span className="lesson-row-state is-locked" aria-hidden="true"><Lock size={14} /></span>
                    )}
                    {status === "current" && <span className="lesson-row-tag">текущий урок</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </article>

        <div className="lessons-detail-column">
          <article className="lessons-detail-card">
            <span className="lessons-detail-kicker">{detail.kicker}</span>
            <h2 className="lessons-detail-title">{detail.title}</h2>
            <p className="lessons-detail-description">{detail.description}</p>
            <p className="lessons-detail-criterion">{detail.criterion}</p>

            <div className="lessons-detail-meta">
              {detail.metaChips.map((chip) => (
                <span key={chip} className="lessons-chip"><i />{chip}</span>
              ))}
            </div>

            <p className="lessons-detail-progress">
              {selectedStatus === "done" ? "Пройден" : "Не начат"}
            </p>
          </article>

          <div className="lessons-detail-actions">
            <Button
              type="button"
              className="report-action is-primary lessons-open-action"
              disabled={selectedLesson.id !== "32"}
              onClick={openLesson}
            >
              {selectedLesson.id === "32" ? "Начать урок" : "Появится в полной версии"}
            </Button>
            <ReportAction href={`?screen=brief&id=${selectedLesson.id}`} disabled={selectedLesson.id !== "32"}>
              К практике
            </ReportAction>
          </div>

          <article className="lessons-progress-card">
            <h2>Прогресс курса</h2>
            <div className="lessons-progress-blocks">
              {courseBlocks.map((block) => (
                <div key={block.id} className="lessons-progress-block">
                  <span className="lessons-progress-label">Блок {block.id}</span>
                  <span className="lessons-progress-dots">
                    {block.lessons.filter((lesson) => lesson.number !== "Э").map((lesson) => (
                      <i key={lesson.id} className={`is-${lessonStatus(lesson.id)}`} />
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <p className="lessons-progress-note">
              {completedLessonsCount()} из {totalLessonsCount()} уроков
            </p>
          </article>
        </div>
      </div>
    </ReportLayout>
  );
}
