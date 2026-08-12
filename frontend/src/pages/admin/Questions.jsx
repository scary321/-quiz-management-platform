import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { message } from "../../api/client";
import { Alert, Badge, Confirm, Empty, Loader, PageHeader } from "../../components/ui";

const blank = () => ({
  question_text: "",
  marks: 1,
  explanation: "",
  difficulty: "BEGINNER",
  options: [
    { option_text: "", is_correct: true },
    { option_text: "", is_correct: false },
    { option_text: "", is_correct: false },
    { option_text: "", is_correct: false },
  ],
});

function QuestionEditor({ value, onChange, onSave, onCancel, saving, error }) {
  const setOption = (index, patch) =>
    onChange({ ...value, options: value.options.map((o, i) => (i === index ? { ...o, ...patch } : o)) });

  return (
    <div className="card border-mark/40 p-5">
      <p className="eyebrow">{value.id ? "Edit question" : "New question"}</p>

      {error && <div className="mt-3"><Alert>{error}</Alert></div>}

      <div className="mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="qtext">Question</label>
          <textarea
            id="qtext"
            rows={2}
            className="input"
            placeholder="Which method converts a JSON string into a JavaScript object?"
            value={value.question_text}
            onChange={(e) => onChange({ ...value, question_text: e.target.value })}
          />
        </div>

        <div>
          <p className="label">Options — select the correct one</p>
          <div className="space-y-2">
            {value.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Mark option ${String.fromCharCode(65 + index)} correct`}
                  onClick={() => onChange({ ...value, options: value.options.map((o, i) => ({ ...o, is_correct: i === index })) })}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border font-mono text-[11px] transition ${
                    option.is_correct ? "border-pass bg-pass text-white" : "border-rule text-ink-faint hover:border-ink-faint"
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </button>
                <input
                  className="input"
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  value={option.option_text}
                  onChange={(e) => setOption(index, { option_text: e.target.value })}
                />
                {value.options.length > 2 && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => onChange({ ...value, options: value.options.filter((_, i) => i !== index) })}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {value.options.length < 8 && (
            <button
              type="button"
              className="btn-ghost btn-sm mt-2"
              onClick={() => onChange({ ...value, options: [...value.options, { option_text: "", is_correct: false }] })}
            >
              Add option
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="marks">Marks</label>
            <input
              id="marks"
              type="number"
              step="0.5"
              min="0.5"
              className="input"
              value={value.marks}
              onChange={(e) => onChange({ ...value, marks: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label" htmlFor="qdiff">Difficulty</label>
            <select id="qdiff" className="input" value={value.difficulty} onChange={(e) => onChange({ ...value, difficulty: e.target.value })}>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="explanation">Explanation shown after submission</label>
          <textarea
            id="explanation"
            rows={2}
            className="input"
            value={value.explanation || ""}
            onChange={(e) => onChange({ ...value, explanation: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-rule pt-4">
        <button className="btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn-primary btn-sm" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : value.id ? "Save changes" : "Add question"}
        </button>
      </div>
    </div>
  );
}

export default function Questions() {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(() => {
    api.get(`/quizzes/${quizId}`).then(({ data }) => setQuiz(data));
    api.get(`/quizzes/${quizId}/questions`).then(({ data }) => setQuestions(data));
  }, [quizId]);

  useEffect(load, [load]);

  const save = async () => {
    setSaving(true);
    setError("");
    const payload = {
      question_text: draft.question_text,
      marks: draft.marks,
      explanation: draft.explanation || null,
      difficulty: draft.difficulty,
      options: draft.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })),
    };
    try {
      if (draft.id) await api.put(`/questions/${draft.id}`, payload);
      else await api.post(`/quizzes/${quizId}/questions`, payload);
      setDraft(null);
      load();
    } catch (err) {
      setError(message(err, "Could not save this question."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await api.delete(`/questions/${pendingDelete.id}`);
    setPendingDelete(null);
    load();
  };

  if (!quiz || !questions) return <Loader />;

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/admin/quizzes" className="eyebrow hover:text-ink">← All quizzes</Link>
      <PageHeader
        eyebrow={quiz.category_name || "Uncategorised"}
        title={quiz.title}
        subtitle={`${questions.length} question${questions.length === 1 ? "" : "s"} · ${totalMarks} total marks · ${quiz.duration} minutes`}
        actions={
          <>
            <Badge status={quiz.status} />
            {!draft && <button className="btn-primary btn-sm" onClick={() => setDraft(blank())}>Add question</button>}
          </>
        }
      />

      {draft && (
        <div className="mb-5">
          <QuestionEditor value={draft} onChange={setDraft} onSave={save} onCancel={() => { setDraft(null); setError(""); }} saving={saving} error={error} />
        </div>
      )}

      {questions.length === 0 && !draft ? (
        <Empty title="No questions yet" hint="A quiz cannot be published until it has at least one question." />
      ) : (
        <ol className="space-y-3">
          {questions.map((question, index) => (
            <li key={question.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                  Q{index + 1} · {question.marks} {question.marks === 1 ? "mark" : "marks"}
                </p>
                <div className="flex gap-1.5">
                  <button className="btn-ghost btn-sm" onClick={() => setDraft({ ...question })}>Edit</button>
                  <button className="btn-danger btn-sm" onClick={() => setPendingDelete(question)}>Delete</button>
                </div>
              </div>
              <p className="mt-2 font-display text-base font-semibold leading-snug">{question.question_text}</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {question.options.map((option, optionIndex) => (
                  <li
                    key={option.id}
                    className={`flex items-center gap-2.5 rounded-[8px] border px-3 py-2 text-sm ${
                      option.is_correct ? "border-pass/40 bg-pass-wash text-pass" : "border-rule text-ink-soft"
                    }`}
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current font-mono text-[10px]">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    {option.option_text}
                  </li>
                ))}
              </ul>
              {question.explanation && <p className="mt-3 text-sm text-ink-faint">{question.explanation}</p>}
            </li>
          ))}
        </ol>
      )}

      <Confirm
        open={Boolean(pendingDelete)}
        title="Delete this question?"
        body="It is removed from the quiz immediately. Past attempts keep their recorded scores."
        confirmLabel="Delete question"
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
