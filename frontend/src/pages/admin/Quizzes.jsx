import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { message } from "../../api/client";
import { Alert, Badge, Confirm, Empty, Loader, PageHeader } from "../../components/ui";

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));
    api.get("/quizzes", { params }).then(({ data }) => setQuizzes(data));
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const togglePublish = async (quiz) => {
    setError("");
    try {
      await api.patch(`/quizzes/${quiz.id}/publish`);
      load();
    } catch (err) {
      setError(message(err));
    }
  };

  const remove = async () => {
    await api.delete(`/quizzes/${pendingDelete.id}`);
    setPendingDelete(null);
    load();
  };

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Quizzes"
        subtitle="Create quizzes, attach questions, then publish when they are ready."
        actions={<Link to="/admin/quizzes/new" className="btn-primary btn-sm">New quiz</Link>}
      />

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="search">Search</label>
          <input id="search" className="input" placeholder="Title or category" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="UNPUBLISHED">Unpublished</option>
          </select>
        </div>
      </div>

      {!quizzes ? (
        <Loader />
      ) : quizzes.length === 0 ? (
        <Empty title="No quizzes here yet" hint="Create the first quiz, add questions, then publish it." action="New quiz" to="/admin/quizzes/new" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-rule bg-paper">
                <tr>
                  <th className="th">Quiz</th>
                  <th className="th">Category</th>
                  <th className="th">Questions</th>
                  <th className="th">Duration</th>
                  <th className="th">Attempts</th>
                  <th className="th">Status</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {quizzes.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-paper/60">
                    <td className="td">
                      <p className="font-medium text-ink">{quiz.title}</p>
                      <p className="text-xs text-ink-faint">{quiz.difficulty.toLowerCase()} · pass {quiz.passing_score}%</p>
                    </td>
                    <td className="td">{quiz.category_name || "—"}</td>
                    <td className="td font-mono tabular-nums">{quiz.question_count}</td>
                    <td className="td font-mono tabular-nums">{quiz.duration}m</td>
                    <td className="td font-mono tabular-nums">{quiz.attempt_count}</td>
                    <td className="td"><Badge status={quiz.status} /></td>
                    <td className="td">
                      <div className="flex justify-end gap-1.5">
                        <Link to={`/admin/quizzes/${quiz.id}/questions`} className="btn-ghost btn-sm">Questions</Link>
                        <Link to={`/admin/quizzes/${quiz.id}/edit`} className="btn-ghost btn-sm">Edit</Link>
                        <button className="btn-ghost btn-sm" onClick={() => togglePublish(quiz)}>
                          {quiz.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </button>
                        <button className="btn-danger btn-sm" onClick={() => setPendingDelete(quiz)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Confirm
        open={Boolean(pendingDelete)}
        title={`Delete "${pendingDelete?.title}"?`}
        body="Its questions and every recorded attempt go with it. This cannot be undone."
        confirmLabel="Delete quiz"
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
