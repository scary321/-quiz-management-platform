import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { Badge, Empty, Loader, PageHeader, clock, formatDate } from "../../components/ui";

export default function Attempts() {
  const [attempts, setAttempts] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [filters, setFilters] = useState({ quiz_id: "", status: "" });

  useEffect(() => {
    api.get("/quizzes").then(({ data }) => setQuizzes(data));
  }, []);

  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")), [filters]);

  useEffect(() => {
    setAttempts(null);
    api.get("/admin/attempts", { params }).then(({ data }) => setAttempts(data));
  }, [params]);

  return (
    <>
      <PageHeader eyebrow="Administration" title="All attempts" subtitle="Every submitted attempt across the platform." />

      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="quiz">Quiz</label>
          <select id="quiz" className="input" value={filters.quiz_id} onChange={(e) => setFilters((f) => ({ ...f, quiz_id: e.target.value }))}>
            <option value="">All quizzes</option>
            {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Outcome</label>
          <select id="status" className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {!attempts ? (
        <Loader />
      ) : attempts.length === 0 ? (
        <Empty title="No attempts match those filters" hint="Change the quiz or outcome filter." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-rule bg-paper">
                <tr>
                  <th className="th">Student</th>
                  <th className="th">Quiz</th>
                  <th className="th">Submitted</th>
                  <th className="th">Score</th>
                  <th className="th">Correct</th>
                  <th className="th">Time</th>
                  <th className="th">Status</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-paper/60">
                    <td className="td font-medium text-ink">{attempt.student_name}</td>
                    <td className="td">{attempt.quiz_title}</td>
                    <td className="td">{formatDate(attempt.completed_at)}</td>
                    <td className="td font-mono tabular-nums text-ink">{attempt.percentage}%</td>
                    <td className="td font-mono tabular-nums">
                      {attempt.correct_answers}/{attempt.correct_answers + attempt.incorrect_answers + attempt.unanswered}
                    </td>
                    <td className="td font-mono tabular-nums">{clock(attempt.time_taken)}</td>
                    <td className="td"><Badge status={attempt.status} /></td>
                    <td className="td text-right">
                      <Link to={`/attempts/${attempt.id}`} className="btn-ghost btn-sm">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
