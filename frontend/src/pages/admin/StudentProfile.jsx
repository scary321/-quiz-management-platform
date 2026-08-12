import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/client";
import { Badge, Empty, Loader, PageHeader, StatCard, clock, formatDate } from "../../components/ui";

export default function StudentProfile() {
  const { userId } = useParams();
  const [student, setStudent] = useState(null);
  const [attempts, setAttempts] = useState(null);

  useEffect(() => {
    api.get(`/users/${userId}`).then(({ data }) => setStudent(data));
    api.get(`/users/${userId}/attempts`).then(({ data }) => setAttempts(data));
  }, [userId]);

  if (!student || !attempts) return <Loader />;

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/admin/students" className="eyebrow hover:text-ink">← All students</Link>
      <PageHeader
        eyebrow={student.email}
        title={student.name}
        subtitle={`Registered ${formatDate(student.created_at)}`}
        actions={<Badge status={student.status} />}
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Attempted" value={student.quizzes_attempted} />
        <StatCard label="Average" value={`${student.average_score}%`} tone="mark" />
        <StatCard label="Highest" value={`${student.highest_score}%`} />
      </div>

      <h2 className="h2 mb-3 mt-6">Attempt history</h2>
      {attempts.length === 0 ? (
        <Empty title="No attempts recorded" hint="This student has not submitted a quiz yet." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
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
                  <td className="td">{formatDate(attempt.completed_at || attempt.started_at)}</td>
                  <td className="td font-mono tabular-nums text-ink">{attempt.percentage}%</td>
                  <td className="td font-mono tabular-nums">{clock(attempt.time_taken)}</td>
                  <td className="td"><Badge status={attempt.status} /></td>
                  <td className="td text-right">
                    {attempt.status !== "IN_PROGRESS" && (
                      <Link to={`/attempts/${attempt.id}`} className="btn-ghost btn-sm">View</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
