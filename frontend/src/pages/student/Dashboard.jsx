import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/client";
import { Badge, Empty, Loader, PageHeader, StatCard, formatDate } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/student/stats").then(({ data }) => setStats(data));
  }, []);

  if (!stats) return <Loader />;

  return (
    <>
      <PageHeader
        eyebrow="Student"
        title={`Hello, ${user.name.split(" ")[0]}`}
        subtitle="Your attempt record, scores and what is still open to you."
        actions={
          <Link to="/quizzes" className="btn-primary btn-sm">
            Browse quizzes
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Attempted" value={stats.attempted} />
        <StatCard label="Passed" value={stats.passed} tone="pass" />
        <StatCard label="Failed" value={stats.failed} tone="fail" />
        <StatCard label="Average" value={`${stats.average_score}%`} tone="mark" />
        <StatCard label="Highest" value={`${stats.highest_score}%`} />
        <StatCard label="Answered" value={stats.questions_answered} hint="questions" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <p className="eyebrow">Score trend</p>
          <h2 className="h2 mt-1">Last {stats.score_trend.length} attempts</h2>
          {stats.score_trend.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-faint">Attempt a quiz to start the trend line.</p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.score_trend} margin={{ left: -20, right: 8, top: 8 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B7385" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6B7385" }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="value" stroke="#2A3BE0" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card p-5 lg:col-span-2">
          <p className="eyebrow">Recent attempts</p>
          <h2 className="h2 mt-1">Latest results</h2>
          {stats.recent.length === 0 ? (
            <div className="mt-4">
              <Empty title="Nothing attempted yet" hint="Pick a published quiz and start the clock." action="Browse quizzes" to="/quizzes" />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-rule">
              {stats.recent.map((attempt) => (
                <li key={attempt.id}>
                  <Link to={`/attempts/${attempt.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{attempt.quiz_title}</p>
                      <p className="text-xs text-ink-faint">{formatDate(attempt.completed_at)}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-semibold tabular-nums">{attempt.percentage}%</span>
                      <Badge status={attempt.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
