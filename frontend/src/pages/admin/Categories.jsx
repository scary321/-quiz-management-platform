import { useCallback, useEffect, useState } from "react";
import api, { message } from "../../api/client";
import { Alert, Confirm, Empty, Loader, PageHeader } from "../../components/ui";

export default function Categories() {
  const [categories, setCategories] = useState(null);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(() => api.get("/categories").then(({ data }) => setCategories(data)), []);
  useEffect(() => { load(); }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (editingId) await api.put(`/categories/${editingId}`, draft);
      else await api.post("/categories", draft);
      setDraft({ name: "", description: "" });
      setEditingId(null);
      load();
    } catch (err) {
      setError(message(err, "Could not save this category."));
    }
  };

  const remove = async () => {
    await api.delete(`/categories/${pendingDelete.id}`);
    setPendingDelete(null);
    load();
  };

  return (
    <>
      <PageHeader eyebrow="Administration" title="Categories" subtitle="Categories group quizzes and drive the student-side filters." />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <form onSubmit={submit} className="card h-fit space-y-4 p-5">
          <p className="eyebrow">{editingId ? "Edit category" : "New category"}</p>
          {error && <Alert>{error}</Alert>}
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" placeholder="JavaScript" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" rows={3} className="input" value={draft.description || ""} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary btn-sm">{editingId ? "Save changes" : "Add category"}</button>
            {editingId && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => { setEditingId(null); setDraft({ name: "", description: "" }); }}>
                Cancel
              </button>
            )}
          </div>
        </form>

        {!categories ? (
          <Loader />
        ) : categories.length === 0 ? (
          <Empty title="No categories yet" hint="Add one on the left to start grouping quizzes." />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-rule bg-paper">
                <tr>
                  <th className="th">Category</th>
                  <th className="th">Quizzes</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-paper/60">
                    <td className="td">
                      <p className="font-medium text-ink">{category.name}</p>
                      {category.description && <p className="text-xs text-ink-faint">{category.description}</p>}
                    </td>
                    <td className="td font-mono tabular-nums">{category.quiz_count}</td>
                    <td className="td">
                      <div className="flex justify-end gap-1.5">
                        <button className="btn-ghost btn-sm" onClick={() => { setEditingId(category.id); setDraft({ name: category.name, description: category.description || "" }); }}>
                          Edit
                        </button>
                        <button className="btn-danger btn-sm" onClick={() => setPendingDelete(category)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Confirm
        open={Boolean(pendingDelete)}
        title={`Delete "${pendingDelete?.name}"?`}
        body="Quizzes in this category stay, but they become uncategorised."
        confirmLabel="Delete category"
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
