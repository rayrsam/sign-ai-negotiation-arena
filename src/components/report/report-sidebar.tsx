import { BrandLogo } from "@/components/brand-logo";
import { type AppSectionId, appSections, sectionAction } from "@/lib/app-sections";

const icons: Record<AppSectionId, { image: string; activeImage?: string }> = {
  overview: { image: "home" },
  learning: { image: "learning", activeImage: "learning-active" },
  training: { image: "training" },
  free: { image: "negotiations" },
  progress: { image: "skills" },
  achievements: { image: "history" },
};

const current: AppSectionId = "learning";

export function ReportSidebar() {
  return (
    <aside className="report-sidebar" aria-label="Разделы приложения">
      <a className="report-sidebar-logo" href="?screen=lessons" aria-label="К урокам">
        <BrandLogo />
      </a>
      <nav className="report-sidebar-nav" aria-label="Разделы">
        {appSections.map((section) => {
          const active = section.id === current;
          const { image, activeImage } = icons[section.id];
          return (
            <button
              className={`report-sidebar-icon${active ? " is-active" : ""}`}
              type="button"
              title={section.label}
              aria-label={section.label}
              aria-current={active ? "page" : undefined}
              onClick={sectionAction(section, current, () => window.location.assign("?screen=lessons"))}
              key={section.id}
            >
              <img src={`/icons/${active && activeImage ? activeImage : image}.svg`} alt="" draggable="false" />
            </button>
          );
        })}
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
