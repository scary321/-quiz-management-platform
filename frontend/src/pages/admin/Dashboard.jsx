import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/client";
import { Loader, PageHeader, StatCard } from "../../components/ui";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data));
    api.get("/admin/analytics", { params: { days: 14 } }).then(({ data }) => setAnalytics(data));
  }, []);

  if (!stats || !analytics) return <Loader />;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Platform overview"
        subtitle="Everything that has happened on the platform, at a glance."
        actions={
          <>
            <Link to="/admin/quizzes/new" className="btn-primary btn-sm">New quiz</Link>
            <Link to="/admin/analytics" className="btn-ghost btn-sm">Full analytics</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Students" value={stats.total_students} />
        <StatCard label="Quizzes" value={stats.total_quizzes} hint={`${stats.published_quizzes} published · ${stats.draft_quizzes} draft`} />
        <StatCard label="Questions" value={stats.total_questions} />
        <StatCard label="Attempts" value={stats.total_attempts} />
        <StatCard label="Average score" value={`${stats.average_score}%`} tone="mark" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <p className="eyebrow">Last 14 days</p>
          <h2 className="h2 mt-1">Attempts per day</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.attempts_over_time} margin={{ left: -24, right: 8, top: 8 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6B7385" }} tickLine={false} axisLine={false} interval={1} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6B7385" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "#F1F3F8" }} />
                <Bar dataKey="value" fill="#2A3BE0" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5">
          <p className="eyebrow">Outcomes</p>
          <h2 className="h2 mt-1">Pass / fail split</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.pass_fail} dataKey="value" nameKey="label" innerRadius={52} outerRadius={78} paddingAngle={2}>
                  {analytics.pass_fail.map((entry) => (
                    <Cell key={entry.label} fill={entry.label === "Passed" ? "#0F7B5A" : "#C42B1C"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-5 font-mono text-xs">
            <span className="text-pass">Passed {stats.passed_attempts}</span>
            <span className="text-fail">Failed {stats.failed_attempts}</span>
          </div>
        </section>
      </div>
    </>
  );
}
