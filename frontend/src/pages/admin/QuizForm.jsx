import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { message } from "../../api/client";
import { Alert, Loader, PageHeader } from "../../components/ui";

export default function QuizForm() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(quizId);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(!editing);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      category_id: "",
      difficulty: "BEGINNER",
      duration: 20,
      passing_score: 60,
      max_attempts: 1,
      status: "DRAFT",
      negative_marks: 0,
      randomize_questions: false,
      randomize_options: false,
    },
  });

  useEffect(() => {
    api.get("/categories").then(({ data }) => setCategories(data));
  }, []);

  useEffect(() => {
    if (!editing) return;
    api.get(`/quizzes/${quizId}`).then(({ data }) => {
      reset({ ...data, category_id: data.category_id ?? "" });
      setReady(true);
    });
  }, [editing, quizId, reset]);

  const onSubmit = async (values) => {
    setError("");
    const payload = {
      ...values,
      category_id: values.category_id === "" ? null : Number(values.category_id),
      duration: Number(values.duration),
      passing_score: Number(values.passing_score),
      max_attempts: Number(values.max_attempts),
      negative_marks: Number(values.negative_marks),
    };
    try {
      const { data } = editing
        ? await api.put(`/quizzes/${quizId}`, payload)
        : await api.post("/quizzes", payload);
      navigate(`/admin/quizzes/${data.id}/questions`);
    } catch (err) {
      setError(message(err, "Could not save this quiz."));
    }
  };

  if (!ready) return <Loader />;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/quizzes" className="eyebrow hover:text-ink">← All quizzes</Link>
      <PageHeader
        eyebrow="Administration"
        title={editing ? "Edit quiz" : "New quiz"}
        subtitle="Settings apply to every attempt started after you save."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5 p-6">
        {error && <Alert>{error}</Alert>}

        <div>
          <label className="label" htmlFor="title">Quiz title</label>
          <input id="title" className="input" placeholder="JavaScript Fundamentals" {...register("title", { required: "Give the quiz a title." })} />
          {errors.title && <p className="mt-1 text-xs text-fail">{errors.title.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" rows={3} className="input" placeholder="What this quiz covers." {...register("description")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="category_id">Category</label>
            <select id="category_id" className="input" {...register("category_id")}>
              <option value="">Uncategorised</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="difficulty">Difficulty</label>
            <select id="difficulty" className="input" {...register("difficulty")}>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" className="input" {...register("status")}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="UNPUBLISHED">Unpublished</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="duration">Duration (min)</label>
            <input id="duration" type="number" min="1" className="input" {...register("duration", { required: true, min: 1 })} />
          </div>
          <div>
            <label className="label" htmlFor="passing_score">Pass mark (%)</label>
            <input id="passing_score" type="number" min="0" max="100" className="input" {...register("passing_score", { required: true })} />
          </div>
          <div>
            <label className="label" htmlFor="max_attempts">Max attempts</label>
            <input id="max_attempts" type="number" min="1" className="input" {...register("max_attempts", { required: true })} />
          </div>
          <div>
            <label className="label" htmlFor="negative_marks">Negative marks</label>
            <input id="negative_marks" type="number" step="0.25" min="0" className="input" {...register("negative_marks")} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="thumbnail">Thumbnail URL (optional)</label>
          <input id="thumbnail" className="input" placeholder="https://…" {...register("thumbnail")} />
        </div>

        <fieldset className="rounded-[8px] border border-rule p-4">
          <legend className="eyebrow px-1">Attempt behaviour</legend>
          <label className="flex items-center gap-3 py-1.5 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-mark" {...register("randomize_questions")} />
            Shuffle question order for each attempt
          </label>
          <label className="flex items-center gap-3 py-1.5 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-mark" {...register("randomize_options")} />
            Shuffle answer options for each attempt
          </label>
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-rule pt-5">
          <Link to="/admin/quizzes" className="btn-ghost">Cancel</Link>
          <button className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : editing ? "Save changes" : "Create and add questions"}
          </button>
        </div>
      </form>
    </div>
  );
}
