import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { message } from "../../api/client";
import { Alert, Loader, clock } from "../../components/ui";

/**
 * The attempt screen. Two rules drive the design:
 *  - the countdown is anchored to the server's expiry, not to a browser timer
 *  - every selection is written to the server immediately, so a refresh loses nothing
 */
export default function AttemptQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const submitting = useRef(false);

  const submit = useCallback(
    async (auto = false) => {
      if (submitting.current) return;
      submitting.current = true;
      try {
        const { data } = await api.post(`/quizzes/${quizId}/submit`, []);
        navigate(`/attempts/${data.id}`, { replace: true, state: { auto } });
      } catch (err) {
        setError(message(err, "Could not submit the attempt."));
        submitting.current = false;
      }
    },
    [quizId, navigate]
  );

  useEffect(() => {
    api
      .post(`/quizzes/${quizId}/start`)
      .then(({ data }) => {
        setSession(data);
        setRemaining(data.seconds_remaining);
        setAnswers(
          Object.fromEntries(
            data.questions.filter((q) => q.selected_option_id).map((q) => [q.id, q.selected_option_id])
          )
        );
      })
      .catch((err) => setError(message(err, "This quiz is not available.")));
  }, [quizId]);

  useEffect(() => {
    if (!session) return undefined;
    const expiry = new Date(session.expires_at).getTime();
    const drift = Date.now() - new Date(session.server_time).getTime();
    const tick = () => {
      const left = Math.max(0, Math.round((expiry - (Date.now() - drift)) / 1000));
      setRemaining(left);
      if (left === 0) submit(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session, submit]);

  useEffect(() => {
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const choose = async (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    try {
      await api.patch(`/attempts/${session.attempt_id}/answer`, {
        question_id: questionId,
        selected_option_id: optionId,
      });
    } catch (err) {
      if (err.response?.status === 409) submit(true);
      else setError(message(err, "That answer did not save. Check your connection."));
    }
  };

  if (error && !session) return <div className="mx-auto max-w-lg p-8"><Alert>{error}</Alert></div>;
  if (!session) return <Loader label="Preparing your attempt" />;

  const total = session.questions.length;
  const question = session.questions[current];
  const answered = Object.keys(answers).length;
  const fraction = remaining / Math.max(session.duration * 60, 1);
  const tone = fraction <= 0.1 ? "fail" : fraction <= 0.25 ? "warn" : "mark";
  const toneText = { fail: "text-fail", warn: "text-warn", mark: "text-ink" }[tone];
  const toneBar = { fail: "bg-fail", warn: "bg-warn", mark: "bg-mark" }[tone];

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-rule bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="eyebrow">Attempt in progress</p>
            <h1 className="truncate font-display text-base font-semibold">{session.quiz_title}</h1>
          </div>
          <div className="text-right">
            <p className="eyebrow">Time remaining</p>
            <p className={`font-mono text-2xl font-semibold tabular-nums ${toneText}`}>{clock(remaining)}</p>
          </div>
        </div>
        <div className="h-[3px] w-full bg-rule">
          <div className={`h-full transition-[width] duration-1000 ease-linear ${toneBar}`} style={{ width: `${Math.max(fraction * 100, 0)}%` }} />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_248px]">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <p className="eyebrow">
              Question {current + 1} of {total}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              {question.marks} {question.marks === 1 ? "mark" : "marks"}
            </p>
          </div>

          <h2 className="mt-3 font-display text-xl font-semibold leading-snug">{question.question_text}</h2>

          <div className="mt-5 space-y-2.5">
            {question.options.map((option, index) => {
              const selected = answers[question.id] === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => choose(question.id, option.id)}
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-3 rounded-[8px] border px-4 py-3 text-left text-sm transition ${
                    selected ? "border-mark bg-mark-wash text-ink" : "border-rule bg-white hover:border-ink-faint"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[11px] ${
                      selected ? "border-mark bg-mark text-white" : "border-rule text-ink-faint"
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option.option_text}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-rule pt-5">
            <button className="btn-ghost btn-sm" disabled={current === 0} onClick={() => setCurrent((i) => i - 1)}>
              Previous
            </button>
            <div className="flex gap-2">
              {answers[question.id] && (
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    setAnswers((prev) => {
                      const next = { ...prev };
                      delete next[question.id];
                      return next;
                    });
                    choose(question.id, null);
                  }}
                >
                  Clear answer
                </button>
              )}
              {current === total - 1 ? (
                <button className="btn-primary btn-sm" onClick={() => setConfirming(true)}>
                  Submit quiz
                </button>
              ) : (
                <button className="btn-primary btn-sm" onClick={() => setCurrent((i) => i + 1)}>
                  Next
                </button>
              )}
            </div>
          </div>
          {error && <div className="mt-4"><Alert>{error}</Alert></div>}
        </section>

        <aside className="card h-fit p-4 lg:sticky lg:top-28">
          <p className="eyebrow">Answer sheet</p>
          <p className="mt-1.5 font-mono text-sm tabular-nums">
            {answered}/{total} answered
          </p>
          <div className="mt-4 grid grid-cols-6 gap-2 lg:grid-cols-5">
            {session.questions.map((q, index) => {
              const done = Boolean(answers[q.id]);
              const active = index === current;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrent(index)}
                  aria-label={`Question ${index + 1}${done ? ", answered" : ", not answered"}`}
                  className={`grid h-9 w-9 place-items-center rounded-full border font-mono text-xs tabular-nums transition ${
                    active
                      ? "border-ink bg-ink text-white"
                      : done
                        ? "border-mark bg-mark-wash text-mark"
                        : "border-rule text-ink-faint hover:border-ink-faint"
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <button className="btn-primary btn-sm mt-5 w-full" onClick={() => setConfirming(true)}>
            Submit quiz
          </button>
          <p className="mt-3 text-xs text-ink-faint">Answers save the moment you pick them.</p>
        </aside>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4" role="dialog" aria-modal="true">
          <div className="card w-full max-w-md p-5">
            <h2 className="h2">Submit this attempt?</h2>
            <p className="mt-2 text-sm text-ink-soft">
              {total - answered > 0
                ? `${total - answered} question${total - answered === 1 ? "" : "s"} still unanswered. Unanswered questions score zero.`
                : "Every question has an answer. You cannot change them after submitting."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                Keep working
              </button>
              <button className="btn-primary btn-sm" onClick={() => submit(false)}>
                Submit quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
