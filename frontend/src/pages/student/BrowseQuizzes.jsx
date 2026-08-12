import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { Badge, Empty, Loader, PageHeader } from "../../components/ui";

export default function BrowseQuizzes() {
  const [quizzes, setQuizzes] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: "", category_id: "", difficulty: "", max_duration: "", sort: "recent" });

  useEffect(() => {
    api.get("/categories").then(({ data }) => setCategories(data));
  }, []);

  const params = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
    [filters]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      api.get("/quizzes", { params }).then(({ data }) => setQuizzes(data));
    }, 200);
    return () => clearTimeout(timeout);
  }, [params]);

  const set = (key) => (event) => setFilters((f) => ({ ...f, [key]: event.target.value }));

  return (
    <>
      <PageHeader eyebrow="Browse" title="Available quizzes" subtitle="Only published quizzes appear here." />

      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="label" htmlFor="search">Search</label>
          <input id="search" className="input" placeholder="Title or category" value={filters.search} onChange={set("search")} />
        </div>
        <div>
          <label className="label" htmlFor="category">Category</label>
          <select id="category" className="input" value={filters.category_id} onChange={set("category_id")}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="difficulty">Difficulty</label>
          <select id="difficulty" className="input" value={filters.difficulty} onChange={set("difficulty")}>
            <option value="">Any</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sort">Sort by</label>
          <select id="sort" className="input" value={filters.sort} onChange={set("sort")}>
            <option value="recent">Recently added</option>
            <option value="popular">Popularity</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>

      {!quizzes ? (
        <Loader />
      ) : quizzes.length === 0 ? (
        <Empty title="No quizzes match those filters" hint="Clear a filter or two and look again." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => (
            <Link key={quiz.id} to={`/quizzes/${quiz.id}`} className="card group flex flex-col p-5 transition hover:border-ink-faint">
              <div className="flex items-start justify-between gap-3">
                <p className="eyebrow">{quiz.category_name || "Uncategorised"}</p>
                <Badge status={quiz.difficulty} />
              </div>
              <h2 className="h2 mt-2 group-hover:text-mark">{quiz.title}</h2>
              <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-ink-soft">{quiz.description}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-rule pt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                <div><dt>Questions</dt><dd className="mt-1 text-sm tabular-nums text-ink">{quiz.question_count}</dd></div>
                <div><dt>Minutes</dt><dd className="mt-1 text-sm tabular-nums text-ink">{quiz.duration}</dd></div>
                <div><dt>Pass</dt><dd className="mt-1 text-sm tabular-nums text-ink">{quiz.passing_score}%</dd></div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
