import { Link } from "react-router-dom";

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "ink" }) {
  const tones = { ink: "text-ink", pass: "text-pass", fail: "text-fail", mark: "text-mark" };
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Badge({ status }) {
  const map = {
    PUBLISHED: "bg-pass-wash text-pass",
    DRAFT: "bg-paper text-ink-faint",
    UNPUBLISHED: "bg-warn-wash text-warn",
    PASSED: "bg-pass-wash text-pass",
    FAILED: "bg-fail-wash text-fail",
    IN_PROGRESS: "bg-mark-wash text-mark",
    ACTIVE: "bg-pass-wash text-pass",
    INACTIVE: "bg-fail-wash text-fail",
    BEGINNER: "bg-paper text-ink-soft",
    INTERMEDIATE: "bg-mark-wash text-mark",
    ADVANCED: "bg-warn-wash text-warn",
  };
  return <span className={`badge ${map[status] || "bg-paper text-ink-soft"}`}>{String(status).replace("_", " ")}</span>;
}

export function Empty({ title, hint, action, to }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="h-2.5 w-2.5 rounded-full border border-rule" />
        ))}
      </div>
      <p className="h2">{title}</p>
      {hint && <p className="max-w-sm text-sm text-ink-soft">{hint}</p>}
      {action && to && (
        <Link to={to} className="btn-primary btn-sm mt-1">
          {action}
        </Link>
      )}
    </div>
  );
}

export function Loader({ label = "Loading" }) {
  return (
    <div className="flex items-center gap-2 py-16 justify-center">
      <span className="h-2 w-2 animate-pulse rounded-full bg-mark" />
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink-faint">{label}</span>
    </div>
  );
}

export function Alert({ tone = "fail", children }) {
  if (!children) return null;
  const tones = {
    fail: "border-fail/25 bg-fail-wash text-fail",
    pass: "border-pass/25 bg-pass-wash text-pass",
    warn: "border-warn/25 bg-warn-wash text-warn",
  };
  return <p className={`rounded-[8px] border px-3 py-2 text-sm ${tones[tone]}`}>{children}</p>;
}

export function Confirm({ open, title, body, confirmLabel = "Delete", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4" role="dialog" aria-modal="true">
      <div className="card w-full max-w-md p-5">
        <h2 className="h2">{title}</h2>
        <p className="mt-2 text-sm text-ink-soft">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost btn-sm" onClick={onCancel}>
            Keep it
          </button>
          <button className="btn-danger btn-sm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export const clock = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
