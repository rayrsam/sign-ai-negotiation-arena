import { type AppSectionId, appSections, sectionAction } from "@/lib/app-sections";
import { navigate } from "@/free/lib/router";

/** Positions of the section icons in rail.svg (the order of appSections). */
const sectionTops: Record<AppSectionId, number> = {
  overview: 246,
  learning: 328,
  training: 410,
  free: 492,
  progress: 574,
  achievements: 656,
};

const accountSpots = [
  { label: "Профиль", top: 897 },
  { label: "Настройки", top: 963 },
];

const current: AppSectionId = "free";

/** Application rail from the mockup; «Свободные переговоры» is the active section. */
export function AppRail() {
  return (
    <nav className="app-rail" aria-label="Разделы приложения">
      <img className="app-rail-art" src="/free/rail.svg" alt="" width="120" height="1010" draggable={false} />
      <button type="button" className="app-rail-logo" aria-label="Новая сессия" title="Новая сессия" onClick={() => navigate("setup")} />
      {appSections.map((section) => (
        <button
          key={section.id}
          type="button"
          className="app-rail-spot"
          style={{ top: sectionTops[section.id] }}
          title={section.label}
          aria-label={section.label}
          aria-current={section.id === current ? "page" : undefined}
          onClick={sectionAction(section, current, () => navigate("setup"))}
        />
      ))}
      {accountSpots.map((spot) => (
        <button key={spot.label} type="button" className="app-rail-spot" style={{ top: spot.top }} title={spot.label} aria-label={spot.label} />
      ))}
    </nav>
  );
}
