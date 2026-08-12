import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { message } from "../../api/client";
import { Alert, Badge, Loader, PageHeader } from "../../components/ui";

export default function QuizDetail() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api
      .get(`/quizzes/${quizId}`)
      .then(({ data }) => setQuiz(data))
      .catch((err) => setError(message(err, "That quiz is not available.")));
  }, [quizId]);

  const start = async () => {
    setStarting(true);
    setError("");
    try {
      await api.post(`/quizzes/${quizId}/start`);
      navigate(`/quizzes/${quizId}/attempt`);
    } catch (err) {
      setError(message(err, "Could not start this quiz."));
      setStarting(false);
    }
  };

  if (error && !quiz) return <Alert>{error}</Alert>;
  if (!quiz) return <Loader />;

  const exhausted = quiz.attempts_left <= 0;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/quizzes" className="eyebrow hover:text-ink">
        ← All quizzes
      </Link>
      <PageHeader
        eyebrow={quiz.category_name || "Uncategorised"}
        title={quiz.title}
        subtitle={quiz.description}
        actions={<Badge status={quiz.difficulty} />}
      />

      <div className="card p-6">
        <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {[
            ["Questions", quiz.question_count],
            ["Duration", `${quiz.duration} min`],
            ["Passing score", `${quiz.passing_score}%`],
            ["Attempts allowed", quiz.max_attempts],
            ["Attempts used", quiz.attempts_used],
            ["Your best", quiz.best_percentage === null ? "—" : `${quiz.best_percentage}%`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="eyebrow">{label}</dt>
              <dd className="mt-1.5 font-mono text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <ul className="mt-6 space-y-2 border-t border-rule pt-5 text-sm text-ink-soft">
          <li>The clock starts the moment you begin and runs on the server, so refreshing does not reset it.</li>
          <li>Answers are saved as you pick them. If you close the tab, resume from where you left off.</li>
          {quiz.negative_marks > 0 && <li>Wrong answers lose {quiz.negative_marks} marks. Skipping costs nothing.</li>}
          {quiz.randomize_questions && <li>Questions appear in a different order for every attempt.</li>}
          <li>When the timer hits zero the attempt is submitted for you.</li>
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={start} disabled={starting || exhausted}>
            {starting ? "Starting…" : quiz.attempts_used > 0 ? "Start another attempt" : "Start quiz"}
          </button>
          {exhausted && <p className="text-sm text-ink-soft">You have used all {quiz.max_attempts} attempts.</p>}
        </div>
        {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      </div>
    </div>
  );
}
