/**
 * Clamped texts (line-clamp / ellipsis) keep the reference geometry on long live content.
 * When such a text is actually cut, hovering it shows the full text as a native tooltip.
 */
export function installTruncationTitles() {
  document.addEventListener("mouseover", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.hasAttribute("title")) return;
    const cut = target.scrollHeight > target.clientHeight + 1 || target.scrollWidth > target.clientWidth + 1;
    const text = target.textContent?.trim();
    if (cut && text && !target.matches("textarea, input, [role='log'], .conversation-list, .current-reply, .brief-details, .report-page")) {
      target.title = text;
    }
  }, { passive: true });
}
