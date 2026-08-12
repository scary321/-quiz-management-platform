import { useEffect, useState } from "react";
import api from "../../api/client";
import { Empty, Loader, PageHeader } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState({ scope: "overall", metric: "average", category_id: "" });

  useEffect(() => {
    api.get("/categories").then(({ data }) => setCategories(data));
  }, []);

  useEffect(() => {
    const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== ""));
    setRows(null);
    api.get("/leaderboard", { params }).then(({ data }) => setRows(data));
  }, [query]);

  const set = (key) => (event) => setQuery((q) => ({ ...q, [key]: event.target.value }));

  return (
    <>
      <PageHeader eyebrow="Standings" title="Leaderboard" subtitle="Ranked from submitted attempts only." />

      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="scope">Period</label>
          <select id="scope" className="input" value={query.scope} onChange={set("scope")}>
            <option value="overall">Overall</option>
            <option value="monthly">Last 30 days</option>
            <option value="weekly">Last 7 days</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="metric">Ranked by</label>
          <select id="metric" className="input" value={query.metric} onChange={set("metric")}>
            <option value="average">Average score</option>
            <option value="highest">Highest score</option>
            <option value="completed">Quizzes completed</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cat">Category</label>
          <select id="cat" className="input" value={query.category_id} onChange={set("category_id")}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!rows ? (
        <Loader />
      ) : rows.length === 0 ? (
        <Empty title="Nothing to rank yet" hint="Rankings appear once quizzes have been submitted in this period." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-rule bg-paper">
              <tr>
                <th className="th w-16">Rank</th>
                <th className="th">Student</th>
                <th className="th">Average</th>
                <th className="th">Highest</th>
                <th className="th">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((row) => {
                const isMe = row.user_id === user.id;
                return (
                  <tr key={row.user_id} className={isMe ? "bg-mark-wash" : "hover:bg-paper/60"}>
                    <td className="td">
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-full font-mono text-xs font-semibold tabular-nums ${
                          row.rank <= 3 ? "bg-ink text-white" : "border border-rule text-ink-faint"
                        }`}
                      >
                        {row.rank}
                      </span>
                    </td>
                    <td className="td font-medium text-ink">
                      {row.student}
                      {isMe && <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] text-mark">You</span>}
                    </td>
                    <td className="td font-mono tabular-nums text-ink">{row.average_score}%</td>
                    <td className="td font-mono tabular-nums">{row.highest_score}%</td>
                    <td className="td font-mono tabular-nums">{row.quizzes_completed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
