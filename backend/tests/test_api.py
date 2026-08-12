"""End-to-end API tests: auth, authorization, scoring, timer and attempt limits."""
import os
import tempfile
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"
os.environ["SECRET_KEY"] = "test-secret"

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Attempt, Role, User  # noqa: E402
from app.rate_limit import reset as reset_limits  # noqa: E402
from app.security import hash_password  # noqa: E402

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    reset_limits()
    db = SessionLocal()
    db.add(User(name="Admin", email="admin@test.dev", password=hash_password("Admin@123"), role=Role.ADMIN))
    db.commit()
    db.close()
    yield


def auth(email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def admin_headers():
    return auth("admin@test.dev", "Admin@123")


def student_headers(email="s1@test.dev"):
    client.post("/api/auth/register", json={"name": "Student One", "email": email, "password": "Student@123"})
    return auth(email, "Student@123")


def build_quiz(headers, duration=20, passing=60, max_attempts=1, negative=0.0):
    quiz = client.post(
        "/api/quizzes",
        headers=headers,
        json={
            "title": "Sample Quiz",
            "description": "d",
            "difficulty": "BEGINNER",
            "duration": duration,
            "passing_score": passing,
            "max_attempts": max_attempts,
            "status": "DRAFT",
            "negative_marks": negative,
        },
    ).json()
    for i in range(4):
        client.post(
            f"/api/quizzes/{quiz['id']}/questions",
            headers=headers,
            json={
                "question_text": f"Question {i}?",
                "marks": 1,
                "explanation": "because",
                "difficulty": "BEGINNER",
                "options": [
                    {"option_text": "right", "is_correct": True},
                    {"option_text": "wrong", "is_correct": False},
                ],
            },
        )
    client.patch(f"/api/quizzes/{quiz['id']}/publish", headers=headers)
    return quiz["id"]


def test_register_rejects_duplicate_email():
    student_headers("dup@test.dev")
    r = client.post("/api/auth/register", json={"name": "Again", "email": "dup@test.dev", "password": "Student@123"})
    assert r.status_code == 409


def test_login_rejects_bad_password():
    student_headers("x@test.dev")
    r = client.post("/api/auth/login", json={"email": "x@test.dev", "password": "nope12345"})
    assert r.status_code == 401


def test_student_cannot_create_quiz():
    r = client.post("/api/quizzes", headers=student_headers(), json={"title": "Hack attempt"})
    assert r.status_code in (403, 422)


def test_unauthenticated_requests_are_rejected():
    assert client.get("/api/quizzes").status_code == 401


def test_publish_requires_questions():
    headers = admin_headers()
    quiz = client.post("/api/quizzes", headers=headers, json={"title": "Empty quiz"}).json()
    r = client.patch(f"/api/quizzes/{quiz['id']}/publish", headers=headers)
    assert r.status_code == 400


def test_students_only_see_published_quizzes():
    a = admin_headers()
    client.post("/api/quizzes", headers=a, json={"title": "Hidden draft"})
    build_quiz(a)
    titles = [q["title"] for q in client.get("/api/quizzes", headers=student_headers()).json()]
    assert titles == ["Sample Quiz"]


def test_scoring_is_computed_on_the_server():
    a = admin_headers()
    quiz_id = build_quiz(a, passing=60)
    s = student_headers()
    session = client.post(f"/api/quizzes/{quiz_id}/start", headers=s).json()
    answers = []
    for index, q in enumerate(session["questions"]):
        correct = next(o for o in q["options"] if o["option_text"] == "right")
        wrong = next(o for o in q["options"] if o["option_text"] == "wrong")
        answers.append({"question_id": q["id"], "selected_option_id": (correct if index < 3 else wrong)["id"]})
    result = client.post(f"/api/quizzes/{quiz_id}/submit", headers=s, json=answers).json()
    assert result["correct_answers"] == 3
    assert result["incorrect_answers"] == 1
    assert result["percentage"] == 75.0
    assert result["status"] == "PASSED"


def test_unanswered_questions_are_counted_and_fail_applied():
    a = admin_headers()
    quiz_id = build_quiz(a, passing=90)
    s = student_headers()
    client.post(f"/api/quizzes/{quiz_id}/start", headers=s)
    result = client.post(f"/api/quizzes/{quiz_id}/submit", headers=s, json=[]).json()
    assert result["unanswered"] == 4
    assert result["percentage"] == 0.0
    assert result["status"] == "FAILED"


def test_negative_marking_reduces_score():
    a = admin_headers()
    quiz_id = build_quiz(a, negative=0.5)
    s = student_headers()
    session = client.post(f"/api/quizzes/{quiz_id}/start", headers=s).json()
    answers = []
    for index, q in enumerate(session["questions"]):
        pick = "right" if index < 2 else "wrong"
        answers.append(
            {"question_id": q["id"], "selected_option_id": next(o for o in q["options"] if o["option_text"] == pick)["id"]}
        )
    result = client.post(f"/api/quizzes/{quiz_id}/submit", headers=s, json=answers).json()
    assert result["score"] == 1.0  # 2 correct - (2 wrong x 0.5)


def test_max_attempts_is_enforced():
    a = admin_headers()
    quiz_id = build_quiz(a, max_attempts=1)
    s = student_headers()
    client.post(f"/api/quizzes/{quiz_id}/start", headers=s)
    client.post(f"/api/quizzes/{quiz_id}/submit", headers=s, json=[])
    r = client.post(f"/api/quizzes/{quiz_id}/start", headers=s)
    assert r.status_code == 403


def test_expired_attempt_is_auto_submitted():
    a = admin_headers()
    quiz_id = build_quiz(a)
    s = student_headers()
    session = client.post(f"/api/quizzes/{quiz_id}/start", headers=s).json()

    db = SessionLocal()
    attempt = db.get(Attempt, session["attempt_id"])
    attempt.expires_at = datetime.now(timezone.utc) - timedelta(seconds=5)
    db.commit()
    db.close()

    r = client.get(f"/api/attempts/{session['attempt_id']}/session", headers=s)
    assert r.status_code == 409
    result = client.get(f"/api/attempts/{session['attempt_id']}", headers=s).json()
    assert result["attempt"]["status"] in ("PASSED", "FAILED")


def test_answers_persist_across_a_refresh():
    a = admin_headers()
    quiz_id = build_quiz(a)
    s = student_headers()
    session = client.post(f"/api/quizzes/{quiz_id}/start", headers=s).json()
    first = session["questions"][0]
    chosen = first["options"][0]["id"]
    assert client.patch(
        f"/api/attempts/{session['attempt_id']}/answer",
        headers=s,
        json={"question_id": first["id"], "selected_option_id": chosen},
    ).status_code == 204
    resumed = client.get(f"/api/attempts/{session['attempt_id']}/session", headers=s).json()
    assert resumed["questions"][0]["selected_option_id"] == chosen


def test_student_cannot_read_another_students_attempt():
    a = admin_headers()
    quiz_id = build_quiz(a)
    s1 = student_headers("one@test.dev")
    session = client.post(f"/api/quizzes/{quiz_id}/start", headers=s1).json()
    client.post(f"/api/quizzes/{quiz_id}/submit", headers=s1, json=[])
    s2 = student_headers("two@test.dev")
    assert client.get(f"/api/attempts/{session['attempt_id']}", headers=s2).status_code == 403


def test_correct_answers_are_hidden_during_the_attempt():
    a = admin_headers()
    quiz_id = build_quiz(a)
    s = student_headers()
    session = client.post(f"/api/quizzes/{quiz_id}/start", headers=s).json()
    assert "is_correct" not in session["questions"][0]["options"][0]


def test_password_reset_flow():
    student_headers("reset@test.dev")
    token = client.post("/api/auth/forgot-password", json={"email": "reset@test.dev"}).json()["reset_token"]
    assert client.post("/api/auth/reset-password", json={"token": token, "password": "Brandnew@1"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": "reset@test.dev", "password": "Brandnew@1"}).status_code == 200
    # token is single use
    assert client.post("/api/auth/reset-password", json={"token": token, "password": "Another@12"}).status_code == 400


def test_deactivated_student_cannot_sign_in():
    a = admin_headers()
    s = student_headers("off@test.dev")
    me = client.get("/api/auth/me", headers=s).json()
    client.patch(f"/api/users/{me['id']}/status", headers=a)
    assert client.post("/api/auth/login", json={"email": "off@test.dev", "password": "Student@123"}).status_code == 403


def test_admin_dashboards_and_leaderboard():
    a = admin_headers()
    quiz_id = build_quiz(a)
    s = student_headers()
    client.post(f"/api/quizzes/{quiz_id}/start", headers=s)
    client.post(f"/api/quizzes/{quiz_id}/submit", headers=s, json=[])
    stats = client.get("/api/admin/stats", headers=a).json()
    assert stats["total_attempts"] == 1 and stats["total_students"] == 1
    assert client.get("/api/admin/analytics", headers=a).status_code == 200
    board = client.get("/api/leaderboard", headers=s).json()
    assert board[0]["rank"] == 1
    assert client.get("/api/student/stats", headers=s).json()["attempted"] == 1
