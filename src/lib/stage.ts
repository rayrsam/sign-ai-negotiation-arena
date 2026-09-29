/**
 * Desktop screens are laid out on the 1920×1080 reference canvas and scaled as a whole,
 * so every proportion of the design is kept on any desktop resolution.
 * Narrow and short viewports keep the responsive layout.
 */
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;
const MIN_STAGE_VIEWPORT_WIDTH = 1101;
const MIN_STAGE_VIEWPORT_HEIGHT = 500;

function syncStage() {
  const root = document.documentElement;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const enabled = width >= MIN_STAGE_VIEWPORT_WIDTH && height >= MIN_STAGE_VIEWPORT_HEIGHT;
  root.classList.toggle("ui-stage", enabled);
  // Fixed-height screens fit into the viewport; scrolling screens fit by width only.
  root.style.setProperty("--stage-zoom", String(Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT)));
  root.style.setProperty("--stage-zoom-x", String(width / STAGE_WIDTH));
}

export function installStageScaling() {
  syncStage();
  window.addEventListener("resize", syncStage);
}
