import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { Badge, Confirm, Empty, Loader, PageHeader, formatDate } from "../../components/ui";

export default function Students() {
  const [students, setStudents] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));
    api.get("/users", { params }).then(({ data }) => setStudents(data));
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const toggle = async (student) => {
    await api.patch(`/users/${student.id}/status`);
    load();
  };

  const remove = async () => {
    await api.delete(`/users/${pendingDelete.id}`);
    setPendingDelete(null);
    load();
  };

  return (
    <>
      <PageHeader eyebrow="Administration" title="Students" subtitle="Deactivated accounts cannot sign in or start attempts." />

      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="search">Search</label>
          <input id="search" className="input" placeholder="Name or email" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="status">Account status</label>
          <select id="status" className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Deactivated</option>
          </select>
        </div>
      </div>

      {!students ? (
        <Loader />
      ) : students.length === 0 ? (
        <Empty title="No students match that search" hint="Try a shorter search term." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-rule bg-paper">
                <tr>
                  <th className="th">Student</th>
                  <th className="th">Registered</th>
                  <th className="th">Attempted</th>
                  <th className="th">Average</th>
                  <th className="th">Highest</th>
                  <th className="th">Status</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-paper/60">
                    <td className="td">
                      <p className="font-medium text-ink">{student.name}</p>
                      <p className="text-xs text-ink-faint">{student.email}</p>
                    </td>
                    <td className="td">{formatDate(student.created_at)}</td>
                    <td className="td font-mono tabular-nums">{student.quizzes_attempted}</td>
                    <td className="td font-mono tabular-nums">{student.average_score}%</td>
                    <td className="td font-mono tabular-nums">{student.highest_score}%</td>
                    <td className="td"><Badge status={student.status} /></td>
                    <td className="td">
                      <div className="flex justify-end gap-1.5">
                        <Link to={`/admin/students/${student.id}`} className="btn-ghost btn-sm">Profile</Link>
                        <button className="btn-ghost btn-sm" onClick={() => toggle(student)}>
                          {student.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                        <button className="btn-danger btn-sm" onClick={() => setPendingDelete(student)}>Delete</button>
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
        title={`Delete ${pendingDelete?.name}?`}
        body="The account and its full attempt history are removed. This cannot be undone."
        confirmLabel="Delete student"
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
