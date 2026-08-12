import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/client";
import { Empty, Loader, PageHeader } from "../../components/ui";

function Panel({ eyebrow, title, children, empty }) {
  return (
    <section className="card p-5">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="h2 mt-1">{title}</h2>
      {empty ? <p className="py-14 text-center text-sm text-ink-faint">Not enough data yet.</p> : <div className="mt-4 h-60">{children}</div>}
    </section>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get("/admin/analytics", { params: { days } }).then((res) => setData(res.data));
  }, [days]);

  if (!data) return <Loader />;

  const axis = { fontSize: 11, fill: "#6B7385" };

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Analytics"
        subtitle="Activity, outcomes and where students are spending their attempts."
        actions={
          <select className="input w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel eyebrow="Activity" title="Quiz attempts over time" empty={data.attempts_over_time.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.attempts_over_time} margin={{ left: -24, right: 8, top: 8 }}>
              <CartesianGrid stroke="#DCE0EC" vertical={false} />
              <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval={Math.ceil(data.attempts_over_time.length / 8)} />
              <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#2A3BE0" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel eyebrow="Growth" title="Student registrations" empty={data.registrations_over_time.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.registrations_over_time} margin={{ left: -24, right: 8, top: 8 }}>
              <CartesianGrid stroke="#DCE0EC" vertical={false} />
              <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval={Math.ceil(data.registrations_over_time.length / 8)} />
              <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#12151C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel eyebrow="Difficulty check" title="Average score by quiz" empty={data.average_scores_by_quiz.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.average_scores_by_quiz} layout="vertical" margin={{ left: 40, right: 16 }}>
              <XAxis type="number" domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10, fill: "#6B7385" }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => `${v}%`} cursor={{ fill: "#F1F3F8" }} />
              <Bar dataKey="value" fill="#2A3BE0" radius={[0, 3, 3, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel eyebrow="Demand" title="Most attempted quizzes" empty={data.popular_quizzes.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.popular_quizzes} layout="vertical" margin={{ left: 40, right: 16 }}>
              <XAxis type="number" allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10, fill: "#6B7385" }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "#F1F3F8" }} />
              <Bar dataKey="value" fill="#12151C" radius={[0, 3, 3, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <section className="card mt-4 p-5">
        <p className="eyebrow">Categories</p>
        <h2 className="h2 mt-1">Attempts by category</h2>
        {data.popular_categories.length === 0 ? (
          <div className="mt-4"><Empty title="No category activity yet" /></div>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.popular_categories.map((row) => {
              const max = data.popular_categories[0].value || 1;
              return (
                <li key={row.label} className="flex items-center gap-4">
                  <span className="w-40 truncate text-sm">{row.label}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                    <span className="block h-full rounded-full bg-mark" style={{ width: `${(row.value / max) * 100}%` }} />
                  </span>
                  <span className="w-10 text-right font-mono text-sm tabular-nums">{row.value}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
