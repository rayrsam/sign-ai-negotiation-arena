import { useLayoutEffect } from "react";

export type ModuleClass = "table-module" | "free-module";

/**
 * Marks the document while a module is shown. The table and the free negotiations share class names
 * with different styles, so their stylesheets are scoped to this class at build time (see vite.config.ts).
 */
export function useModuleClass(name: ModuleClass) {
  useLayoutEffect(() => {
    document.documentElement.classList.add(name);
    return () => document.documentElement.classList.remove(name);
  }, [name]);
}
