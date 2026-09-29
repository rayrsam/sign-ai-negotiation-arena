import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { AtRule, Plugin as PostcssPlugin } from "postcss";
import { defineConfig } from "vite";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

/** Stylesheets of these modules apply only while the module marks <html> (src/lib/module-class.ts). */
const moduleStyles: Array<[directory: string, scope: string]> = [
  [path.resolve(rootDirectory, "src/table"), "table-module"],
  [path.resolve(rootDirectory, "src/free"), "free-module"],
];

// `:root` and `html` are the marked element itself, everything else is its descendant; :where() keeps specificity.
function scopeSelector(selector: string, scope: string) {
  const own = selector.match(/^(:root|html)(?![\w-])/);
  if (own) return `${own[1]}:where(.${scope})${selector.slice(own[1].length)}`;
  return `:where(html.${scope}) ${selector}`;
}

/** The table and the free negotiations reuse class names (.pill, .app-rail, …) with different styles. */
function scopeModuleStyles(): PostcssPlugin {
  return {
    postcssPlugin: "scope-module-styles",
    Once(root) {
      const file = root.source?.input.file?.split("?")[0];
      const scope = file && moduleStyles.find(([directory]) => path.resolve(file).startsWith(directory + path.sep))?.[1];
      if (!scope) return;
      root.walkRules((rule) => {
        if (rule.parent?.type === "atrule" && /keyframes$/i.test((rule.parent as AtRule).name)) return;
        rule.selectors = rule.selectors.map((selector) => scopeSelector(selector, scope));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    postcss: {
      plugins: [scopeModuleStyles()],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDirectory, "src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:3001",
    },
  },
});
