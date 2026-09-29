import { useEffect, useRef, useState } from "react";

interface DotMatrixInstance {
  play: (items: unknown[], opts: { loop: boolean }) => Promise<unknown>;
  destroy: () => void;
}

interface DotMatrixConstructor {
  new (canvas: HTMLCanvasElement, options: Record<string, unknown>): DotMatrixInstance;
}

interface ArenaLogoApi {
  svg: (variant: "full" | "cut") => string;
}

declare global {
  interface Window {
    DotMatrix?: DotMatrixConstructor;
    ArenaLogo?: ArenaLogoApi;
  }
}

const SCRIPT_SRCS = [
  "/vendor/dotmatrix/dotmatrix.js",
  "/vendor/dotmatrix/arena-logo.js",
  "/vendor/dotmatrix/arena-anims.js",
];

let scriptsPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
    document.head.appendChild(script);
  });
}

function loadDotMatrixScripts(): Promise<void> {
  if (!scriptsPromise) {
    scriptsPromise = SCRIPT_SRCS.reduce(
      (chain, src) => chain.then(() => loadScript(src)),
      Promise.resolve(),
    );
  }
  return scriptsPromise;
}

const SCENE_OPTIONS = {
  cols: 96,
  dot: 0.91,
  offDot: 0.783,
  offOutline: true,
  glow: 0.44,
  offColor: "#2B2725",
  effect: "twinkle",
  effectStrength: 0.02,
  hover: "grow",
  hoverRadius: 3.5,
};

const HANDSHAKE_ITEM = {
  source: {
    type: "anim",
    name: "handshake-outline",
    params: { duration: 3.2, shakes: 2, swing: 1, size: 1.25 },
    colors: ["#FF6547", "#CDDFF8"],
    options: { threshold: 0.4, scale: 1 },
  },
  hold: 3,
  transition: { pattern: "all", style: "fade", duration: 0.2, spread: 0 },
};

const LOGO_TRANSITION = { pattern: "rows", style: "scatter", duration: 2.6, spread: 0.5, scatter: 1, swirl: 0.15 };
const LOGO_HOLD = 1.2;

const TOTAL_MS = (HANDSHAKE_ITEM.transition.duration + HANDSHAKE_ITEM.hold + LOGO_TRANSITION.duration + LOGO_HOLD) * 1000;

interface IntroSplashProps {
  onDone: () => void;
  className?: string;
}

export function IntroSplash({ onDone, className }: IntroSplashProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let dm: DotMatrixInstance | null = null;
    let revealTimer: number | null = null;
    let leaveTimer: number | null = null;

    loadDotMatrixScripts().then(() => {
      if (cancelled || !canvasRef.current || !window.DotMatrix || !window.ArenaLogo) return;

      dm = new window.DotMatrix(canvasRef.current, SCENE_OPTIONS);
      dm.play(
        [
          HANDSHAKE_ITEM,
          {
            source: {
              type: "svg",
              svg: window.ArenaLogo.svg("full"),
              options: {
                colors: ["#FF6547", "#CDDFF8"],
                palette: ["#FF6547", "#CDDFF8"],
                colorMode: "palette",
                threshold: 0.45,
                detail: 0.3,
                sizeMode: "fixed",
                scale: 1,
                padding: 0.1,
                removeBg: true,
                invert: false,
              },
            },
            hold: LOGO_HOLD,
            transition: LOGO_TRANSITION,
          },
        ],
        { loop: false },
      );

      revealTimer = window.setTimeout(() => {
        setLeaving(true);
        leaveTimer = window.setTimeout(onDone, 400);
      }, TOTAL_MS);
    });

    return () => {
      cancelled = true;
      if (revealTimer !== null) window.clearTimeout(revealTimer);
      if (leaveTimer !== null) window.clearTimeout(leaveTimer);
      dm?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`intro-splash${leaving ? " is-leaving" : ""}${className ? ` ${className}` : ""}`} aria-hidden="true">
      <canvas ref={canvasRef} className="intro-splash-canvas" />
    </div>
  );
}
