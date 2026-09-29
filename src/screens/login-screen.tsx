import { useState } from "react";
import { IntroSplash } from "@/components/intro-splash";
import "@/styles/login.css";

// Visual imitation of signing in: the saved profile is fixed and nothing is authenticated.
const profile = { name: "Анна Смирнова", email: "anna.smirnova@company.ru" };

export function LoginScreen() {
  const [entering, setEntering] = useState(false);

  return (
    <div className={`login-viewport${entering ? " is-entering" : ""}`}>
      <main className="login-stage" aria-label="Вход">
        <img className="login-brand" src="/login/brand.svg" alt="Сайн · деловые переговоры" width={210} height={100} draggable={false} />
        <h1 className="login-title">
          Вернитесь
          <br />
          <span>в переговоры</span>
        </h1>
        <p className="login-lead">
          Продолжите с того места, где остановились
          <br />
          Ваш прогресс и история тренировок сохранены
        </p>

        <section className="login-card" aria-labelledby="login-welcome">
          <img className="login-avatar" src="/login/avatar.svg" alt="" width={148} height={148} draggable={false} />
          <p className="login-kicker">ТЕКУЩИЙ ПРОФИЛЬ</p>
          <p className="login-name">{profile.name}</p>
          <p className="login-email">{profile.email}</p>
          <span className="login-divider" aria-hidden="true" />

          <h2 id="login-welcome" className="login-welcome">С возвращением!</h2>
          <p className="login-prompt">Продолжить работу с сохраненным профилем?</p>

          <button type="button" className="login-continue" disabled={entering} onClick={() => setEntering(true)}>
            <span className="login-continue-label">Продолжить как {profile.name}</span>
            <svg className="login-continue-arrow" viewBox="1631.6 599 85.2 37.3" aria-hidden="true">
              <path
                d="M1634.12 615.113C1632.74 615.113 1631.62 616.233 1631.62 617.613C1631.63 618.994 1632.74 620.113 1634.13 620.113L1634.12 617.613L1634.12 615.113ZM1715.81 619.381C1716.78 618.405 1716.78 616.822 1715.81 615.846L1699.9 599.936C1698.92 598.959 1697.34 598.959 1696.36 599.936C1695.39 600.912 1695.39 602.495 1696.36 603.471L1710.5 617.613L1696.36 631.755C1695.39 632.732 1695.39 634.315 1696.36 635.291C1697.34 636.267 1698.92 636.267 1699.9 635.291L1715.81 619.381ZM1634.12 617.613L1634.13 620.113L1714.04 620.113L1714.04 617.613L1714.04 615.113L1634.12 615.113L1634.12 617.613Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <span className="login-or-line" aria-hidden="true" />
          <p className="login-or">или</p>
          <span className="login-or-line is-right" aria-hidden="true" />

          {/* Switching accounts is not part of the imitation. */}
          <button type="button" className="login-switch" disabled>
            <span className="login-switch-label">Сменить аккаунт</span>
          </button>

          <p className="login-footnote">Безопасный вход. Данные профиля доступны только на этом устройстве</p>
        </section>
      </main>

      {/* The same dot animation as the practice intro; it fades out to the empty background, then the lessons open. */}
      {entering && <IntroSplash className="login-dots" onDone={() => window.location.replace("?screen=lessons")} />}
    </div>
  );
}
