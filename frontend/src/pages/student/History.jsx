import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { Badge, Empty, Loader, PageHeader, clock, formatDate } from "../../components/ui";

export default function History() {
  const [attempts, setAttempts] = useState(null);

  useEffect(() => {
    api.get("/attempts").then(({ data }) => setAttempts(data));
  }, []);

  if (!attempts) return <Loader />;

  return (
    <>
      <PageHeader eyebrow="Record" title="My attempts" subtitle="Every submitted attempt, newest first." />
      {attempts.length === 0 ? (
        <Empty title="No attempts yet" hint="Your submitted quizzes will be listed here." action="Browse quizzes" to="/quizzes" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-rule bg-paper">
                <tr>
                  <th className="th">Quiz</th>
                  <th className="th">Date</th>
                  <th className="th">Score</th>
                  <th className="th">Time</th>
                  <th className="th">Status</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-paper/60">
                    <td className="td font-medium text-ink">{attempt.quiz_title}</td>
                    <td className="td">{formatDate(attempt.completed_at)}</td>
                    <td className="td font-mono tabular-nums text-ink">{attempt.percentage}%</td>
                    <td className="td font-mono tabular-nums">{clock(attempt.time_taken)}</td>
                    <td className="td"><Badge status={attempt.status} /></td>
                    <td className="td text-right">
                      <Link to={`/attempts/${attempt.id}`} className="btn-ghost btn-sm">
                        Review
                      </Link>
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
