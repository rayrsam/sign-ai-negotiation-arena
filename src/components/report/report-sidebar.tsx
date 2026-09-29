import { BrandLogo } from "@/components/brand-logo";

const sections: Array<{ label: string; image: string; activeImage?: string; active?: boolean }> = [
  { label: "Обзор", image: "home" },
  { label: "Обучение", image: "learning", activeImage: "learning-active", active: true },
  { label: "Тренировки", image: "training" },
  { label: "Практика", image: "negotiations" },
  { label: "Прогресс", image: "skills" },
  { label: "Достижения", image: "history" },
];

export function ReportSidebar() {
  return (
    <aside className="report-sidebar" aria-label="Разделы приложения">
      <a className="report-sidebar-logo" href="?screen=lessons" aria-label="К урокам">
        <BrandLogo />
      </a>
      <nav className="report-sidebar-nav" aria-label="Разделы">
        {sections.map(({ label, image, activeImage, active }) => (
          <button
            className={`report-sidebar-icon${active ? " is-active" : ""}`}
            type="button"
            title={label}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            key={label}
          >
            <img src={`/icons/${active && activeImage ? activeImage : image}.svg`} alt="" draggable="false" />
          </button>
        ))}
      </nav>
      <div className="report-sidebar-bottom" aria-label="Профиль и настройки">
        <button className="report-sidebar-account" type="button" title="Профиль" aria-label="Профиль">
          <img src="/icons/profile.svg" alt="" draggable="false" />
        </button>
        <button className="report-sidebar-settings" type="button" title="Настройки" aria-label="Настройки">
          <img src="/icons/settings.svg" alt="" draggable="false" />
        </button>
      </div>
    </aside>
  );
}
