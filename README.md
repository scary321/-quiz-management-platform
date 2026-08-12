# Quiz Management & Online Assessment Platform

A full-stack, two-role (Admin / Student) quiz platform. Admins build quizzes, questions and
categories and watch the analytics; students discover quizzes, attempt them against a
server-enforced clock, and get graded results with answer review.

**Stack:** React 18 + Vite + Tailwind CSS · FastAPI + SQLAlchemy 2.0 · PostgreSQL (SQLite for
zero-setup local runs) · JWT auth · Recharts · React Hook Form.

---

## 1. Run it locally

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                    # then set SECRET_KEY
python seed.py --reset                                  # demo data: quizzes, students, attempts
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

By default the app uses SQLite (`quiz.db`) so it runs with nothing else installed. For
PostgreSQL, start `docker compose up -d db` and set in `.env`:

```
DATABASE_URL=postgresql+psycopg2://quiz:quiz@localhost:5432/quizdb
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies /api to :8000
```

### Demo accounts

| Role    | Email                     | Password      |
| ------- | ------------------------- | ------------- |
| Admin   | `admin@quizplatform.dev`  | `Admin@123`   |
| Student | `rahul@student.dev`       | `Student@123` |

Any seeded first name works as a student login (`priya@student.dev`, `amit@student.dev`, …).
`meera@student.dev` is deliberately deactivated so you can see the blocked-login path.

### Tests

```bash
cd backend && pytest -q      # 17 tests: auth, RBAC, scoring, timer, attempt limits
```

---

## 2. What is implemented

**Authentication** — register, login, logout, forgot password, reset password (single-use,
expiring token), bcrypt hashing, JWT bearer tokens, rate limiting on all auth routes.

**Roles** — `ADMIN` and `STUDENT`, enforced by FastAPI dependencies on the server and by route
guards in React. Students never receive admin data even if they guess the URL.

**Admin** — dashboard statistics and charts, student management (search, filter, profile,
attempt history, activate/deactivate, delete), category CRUD, quiz CRUD with
publish/unpublish, question and option CRUD, all-attempts view with filters, analytics page
(attempts over time, registrations, average score per quiz, pass/fail split, popular quizzes
and categories).

**Student** — dashboard with statistics and a score trend, quiz discovery with search and
filters (category, difficulty, sort by recent/popular/title), quiz details page, the timed
attempt screen, results with full answer review and explanations, attempt history, and a
leaderboard filterable by period, metric and category.

**Advanced features from the brief** — negative marking, configurable maximum attempts,
question randomisation, option randomisation, and resumable attempts.

---

## 3. Design decisions worth knowing

**The clock is the server's, not the browser's.** `POST /api/quizzes/{id}/start` writes
`started_at` and `expires_at` to the database. The UI counts down against `expires_at`,
correcting for clock drift using the `server_time` field in the same response. Refreshing,
closing the tab or changing the system clock does not buy extra time — any request to a
stale attempt triggers grading against the stored expiry. `finalize()` also clamps
`completed_at` to the expiry, so a late submission cannot inflate the recorded time.

**Answers are written as they are picked.** Each selection issues
`PATCH /api/attempts/{id}/answer`, so a dropped connection or accidental refresh loses at
most the current click. Resuming reopens the same attempt with selections restored.

**Nothing about scoring reaches the client.** During an attempt the questions payload omits
`is_correct` entirely; correct answers appear only in the result response after submission.
Marks, percentage and pass/fail are computed in `app/services/scoring.py` from the database.

**Grading is idempotent.** `finalize()` returns early on an already-graded attempt, so the
auto-submit path, the manual submit and a concurrent request cannot double-score.

**Analytics aggregate in Python, not in SQL date functions.** `date()` behaves differently
across PostgreSQL, MySQL and SQLite; keeping the grouping in application code means the same
file runs unchanged on all three.

**Deleting a quiz or student cascades.** Foreign keys use `ON DELETE CASCADE` for owned rows
and `SET NULL` for a quiz's category, so removing a category leaves its quizzes uncategorised
rather than deleting them.

---

## 4. Project layout

```
quiz-platform/
├── backend/
│   ├── app/
│   │   ├── main.py            FastAPI app, CORS, security headers, error handlers
│   │   ├── config.py          env-driven settings
│   │   ├── database.py        engine + session
│   │   ├── models.py          users, categories, quizzes, questions, options, attempts, answers
│   │   ├── schemas.py         Pydantic request/response models
│   │   ├── security.py        bcrypt hashing, JWT issue/verify
│   │   ├── deps.py            current-user, require_admin, require_student
│   │   ├── rate_limit.py      in-process limiter for auth routes
│   │   ├── services/scoring.py grading, expiry, answer upsert
│   │   └── routers/           auth, users, categories, quizzes, questions, attempts, dashboard
│   ├── seed.py                demo data
│   └── tests/test_api.py
├── frontend/
│   └── src/
│       ├── api/client.js      axios instance, token interceptor, 401 handling
│       ├── context/AuthContext.jsx
│       ├── components/        Layout, ProtectedRoute, AuthShell, shared UI
│       └── pages/             auth/ · student/ · admin/
└── docker-compose.yml         PostgreSQL for local development
```

---

## 5. API reference

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | any |
| GET | `/api/auth/me` | any |
| POST | `/api/auth/forgot-password` | public |
| POST | `/api/auth/reset-password` | public |
| GET | `/api/users` · `/api/users/{id}` · `/api/users/{id}/attempts` | admin |
| PATCH | `/api/users/{id}/status` | admin |
| DELETE | `/api/users/{id}` | admin |
| GET | `/api/categories` | any |
| POST / PUT / DELETE | `/api/categories[/{id}]` | admin |
| GET | `/api/quizzes` · `/api/quizzes/{id}` | any (students see published only) |
| POST / PUT / DELETE | `/api/quizzes[/{id}]` | admin |
| PATCH | `/api/quizzes/{id}/publish` | admin |
| GET / POST | `/api/quizzes/{id}/questions` | admin |
| PUT / DELETE | `/api/questions/{id}` | admin |
| POST | `/api/quizzes/{id}/start` | student |
| GET | `/api/attempts/{id}/session` | student (own) |
| PATCH | `/api/attempts/{id}/answer` | student (own) |
| POST | `/api/quizzes/{id}/submit` | student |
| GET | `/api/attempts` | student |
| GET | `/api/attempts/{id}` | student (own) or admin |
| GET | `/api/admin/stats` · `/api/admin/analytics` · `/api/admin/attempts` | admin |
| GET | `/api/student/stats` | student |
| GET | `/api/leaderboard` | any |

---

## 6. Security checklist

| Requirement | How it is handled |
| --- | --- |
| Password hashing | bcrypt with per-password salt |
| Session security | JWT (HS256), expiry from `ACCESS_TOKEN_EXPIRE_MINUTES`, verified per request |
| Role-based authorization | server-side dependencies; UI guards are convenience only |
| Input validation | Pydantic models with length, range and email constraints |
| SQL injection | SQLAlchemy parameterised queries throughout, no string-built SQL |
| XSS | React escapes by default; no `dangerouslySetInnerHTML` anywhere |
| CSRF | bearer tokens in headers, not cookies, so no cross-site form replay |
| Rate limiting | login, register, forgot and reset routes |
| Secure headers | `nosniff`, `DENY` framing, `no-referrer`, restrictive permissions policy |
| Error handling | generic 500 body, full detail logged server-side only |
| Secrets | `.env`, never committed; `.env.example` documents the keys |

The frontend is trusted for nothing: correct answers, marks, roles, completion state and
attempt eligibility are all decided server-side.

---

## 7. Deployment notes

- **Backend** — any container or PaaS host. Start with
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set `DATABASE_URL`, `SECRET_KEY` and
  `CORS_ORIGINS` (your frontend origin) as environment variables. Tables are created on
  startup; run `python seed.py` once if you want demo content.
- **Frontend** — `npm run build` emits `dist/`; deploy it as a static site with
  `VITE_API_URL` pointing at the deployed API. Configure an SPA rewrite so client-side routes
  resolve to `index.html`.
- Swap the in-process rate limiter for a Redis-backed one before running multiple API
  replicas, and add Alembic migrations before the schema starts changing in production.

## 8. Not built (and why)

Certificate generation, email notifications, dark mode and CSV/Excel question import are
listed in the brief as advanced extras. They sit outside the core requirement set and each
adds an external dependency (PDF renderer, SMTP provider, file parsing). The data model and
routers leave room for all four.
