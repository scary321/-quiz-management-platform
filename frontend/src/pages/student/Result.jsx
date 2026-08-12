import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api, { message } from "../../api/client";
import { Alert, Badge, Loader, PageHeader, clock, formatDate } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function Result() {
  const { attemptId } = useParams();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/attempts/${attemptId}`)
      .then(({ data }) => setResult(data))
      .catch((err) => setError(message(err, "That result is not available.")));
  }, [attemptId]);

  if (error) return <Alert>{error}</Alert>;
  if (!result) return <Loader />;

  const { attempt, review, passing_score: passing } = result;
  const passed = attempt.status === "PASSED";

  return (
    <div className="mx-auto max-w-4xl">
      {location.state?.auto && (
        <div className="mb-4">
          <Alert tone="warn">Time ran out, so the attempt was submitted automatically.</Alert>
        </div>
      )}

      <PageHeader
        eyebrow="Result"
        title={attempt.quiz_title}
        subtitle={`${isAdmin ? `${attempt.student_name} · ` : ""}Completed ${formatDate(attempt.completed_at)}`}
        actions={
          <Link to={isAdmin ? "/admin/attempts" : "/history"} className="btn-ghost btn-sm">
            Back to attempts
          </Link>
        }
      />

      <section className={`card overflow-hidden p-0`}>
        <div className={`flex flex-wrap items-end justify-between gap-6 border-b border-rule p-6 ${passed ? "bg-pass-wash" : "bg-fail-wash"}`}>
          <div>
            <p className="eyebrow">Score</p>
            <p className={`font-mono text-5xl font-semibold tabular-nums ${passed ? "text-pass" : "text-fail"}`}>
              {attempt.percentage}%
            </p>
            <p className="mt-1 font-mono text-xs text-ink-soft">
              {attempt.score} / {attempt.total_marks} marks · pass mark {passing}%
            </p>
          </div>
          <Badge status={attempt.status} />
        </div>

        <dl className="grid grid-cols-2 divide-rule sm:grid-cols-4 sm:divide-x">
          {[
            ["Correct", attempt.correct_answers],
            ["Incorrect", attempt.incorrect_answers],
            ["Unanswered", attempt.unanswered],
            ["Time taken", clock(attempt.time_taken)],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-rule p-4 sm:border-b-0">
              <dt className="eyebrow">{label}</dt>
              <dd className="mt-1.5 font-mono text-xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <h2 className="h2 mb-3 mt-8">Answer review</h2>
      <ol className="space-y-3">
        {review.map((item, index) => (
          <li key={item.question_id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">Q{index + 1}</p>
              <Badge status={item.is_correct ? "PASSED" : item.selected_option_id ? "FAILED" : "DRAFT"} />
            </div>
            <p className="mt-2 font-display text-base font-semibold leading-snug">{item.question_text}</p>

            <ul className="mt-4 space-y-2">
              {item.options.map((option, optionIndex) => {
                const chosen = option.id === item.selected_option_id;
                const correct = option.id === item.correct_option_id;
                const style = correct
                  ? "border-pass/40 bg-pass-wash text-pass"
                  : chosen
                    ? "border-fail/40 bg-fail-wash text-fail"
                    : "border-rule text-ink-soft";
                return (
                  <li key={option.id} className={`flex items-center gap-3 rounded-[8px] border px-3.5 py-2.5 text-sm ${style}`}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current font-mono text-[11px]">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span className="flex-1">{option.option_text}</span>
                    {chosen && <span className="font-mono text-[10px] uppercase tracking-[0.12em]">Your pick</span>}
                    {correct && !chosen && <span className="font-mono text-[10px] uppercase tracking-[0.12em]">Correct</span>}
                  </li>
                );
              })}
            </ul>

            {item.explanation && (
              <p className="mt-4 border-t border-rule pt-3 text-sm text-ink-soft">
                <span className="eyebrow mr-2">Why</span>
                {item.explanation}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
