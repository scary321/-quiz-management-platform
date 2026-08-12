import { Link } from "react-router-dom";

/**
 * Sign-in surface. The left panel is an answer sheet that fills itself in —
 * the same bubble language used inside the attempt screen.
 */
export default function AuthShell({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <span className="grid h-8 w-8 place-items-center rounded-[6px] bg-white font-mono text-sm font-semibold text-ink">
            Q
          </span>
          <p className="mt-10 font-display text-[34px] font-semibold leading-[1.15] tracking-tight">
            Timed assessments,
            <br />
            graded on the server.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            Admins build quizzes and watch the numbers. Students attempt them against a clock that the
            browser cannot argue with.
          </p>
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">Answer sheet</p>
          <div className="mt-4 grid max-w-md grid-cols-10 gap-2">
            {Array.from({ length: 40 }).map((_, i) => (
              <span
                key={i}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`h-3.5 w-3.5 rounded-full border border-white/25 ${
                  [2, 5, 9, 11, 14, 18, 21, 23, 27, 30, 33, 36, 38].includes(i)
                    ? "animate-[pulse_2.4s_ease-in-out_infinite] bg-white/85"
                    : ""
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="h1 mt-2">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-sm text-ink-soft">{footer}</div>}
          <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            <Link to="/login" className="hover:text-ink">
              Quiz Platform
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
