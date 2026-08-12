"""Admin analytics, student dashboard and leaderboard.

Aggregation happens in Python rather than in SQL date functions so the same code
runs unchanged on PostgreSQL, MySQL and SQLite.
"""
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_admin, require_student
from ..models import Attempt, AttemptStatus, Category, Question, Quiz, QuizStatus, Role, User
from ..schemas import (
    AdminAnalyticsOut,
    AdminStatsOut,
    AttemptSummaryOut,
    LeaderboardRow,
    Point,
    StudentStatsOut,
)

router = APIRouter(prefix="/api", tags=["dashboard"])


def _day(value: datetime) -> str:
    return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).strftime("%d %b")


def _summary(attempt: Attempt) -> AttemptSummaryOut:
    row = AttemptSummaryOut.model_validate(attempt)
    row.quiz_title = attempt.quiz.title if attempt.quiz else None
    row.student_name = attempt.user.name if attempt.user else None
    return row


@router.get("/admin/stats", response_model=AdminStatsOut, dependencies=[Depends(require_admin)])
def admin_stats(db: Session = Depends(get_db)):
    count = lambda model, *where: db.scalar(select(func.count()).select_from(model).where(*where))
    graded = [Attempt.status != AttemptStatus.IN_PROGRESS]
    avg = db.scalar(select(func.avg(Attempt.percentage)).where(*graded)) or 0
    return AdminStatsOut(
        total_students=count(User, User.role == Role.STUDENT),
        total_quizzes=count(Quiz),
        published_quizzes=count(Quiz, Quiz.status == QuizStatus.PUBLISHED),
        draft_quizzes=count(Quiz, Quiz.status == QuizStatus.DRAFT),
        total_questions=count(Question),
        total_attempts=count(Attempt, *graded),
        average_score=round(avg, 1),
        passed_attempts=count(Attempt, Attempt.status == AttemptStatus.PASSED),
        failed_attempts=count(Attempt, Attempt.status == AttemptStatus.FAILED),
    )


@router.get("/admin/analytics", response_model=AdminAnalyticsOut, dependencies=[Depends(require_admin)])
def admin_analytics(days: int = Query(default=30, ge=7, le=180), db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    attempts = db.scalars(select(Attempt).where(Attempt.status != AttemptStatus.IN_PROGRESS)).all()
    users = db.scalars(select(User).where(User.role == Role.STUDENT)).all()

    buckets = [(since + timedelta(days=i)) for i in range(days + 1)]
    labels = [_day(d) for d in buckets]
    attempt_counts = Counter(_day(a.started_at) for a in attempts if _day(a.started_at) in set(labels))
    reg_counts = Counter(_day(u.created_at) for u in users if _day(u.created_at) in set(labels))

    by_quiz_scores: dict[str, list[float]] = defaultdict(list)
    quiz_hits: Counter[str] = Counter()
    category_hits: Counter[str] = Counter()
    for a in attempts:
        title = a.quiz.title if a.quiz else "Deleted quiz"
        by_quiz_scores[title].append(a.percentage)
        quiz_hits[title] += 1
        if a.quiz and a.quiz.category:
            category_hits[a.quiz.category.name] += 1

    avg_scores = sorted(
        (Point(label=k, value=round(sum(v) / len(v), 1)) for k, v in by_quiz_scores.items()),
        key=lambda p: p.value,
        reverse=True,
    )[:8]

    return AdminAnalyticsOut(
        attempts_over_time=[Point(label=l, value=attempt_counts.get(l, 0)) for l in labels],
        registrations_over_time=[Point(label=l, value=reg_counts.get(l, 0)) for l in labels],
        average_scores_by_quiz=avg_scores,
        pass_fail=[
            Point(label="Passed", value=sum(1 for a in attempts if a.status is AttemptStatus.PASSED)),
            Point(label="Failed", value=sum(1 for a in attempts if a.status is AttemptStatus.FAILED)),
        ],
        popular_quizzes=[Point(label=k, value=v) for k, v in quiz_hits.most_common(6)],
        popular_categories=[Point(label=k, value=v) for k, v in category_hits.most_common(6)],
    )


@router.get("/admin/attempts", response_model=list[AttemptSummaryOut], dependencies=[Depends(require_admin)])
def all_attempts(
    quiz_id: int | None = None,
    user_id: int | None = None,
    attempt_status: AttemptStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    stmt = select(Attempt).where(Attempt.status != AttemptStatus.IN_PROGRESS)
    if quiz_id:
        stmt = stmt.where(Attempt.quiz_id == quiz_id)
    if user_id:
        stmt = stmt.where(Attempt.user_id == user_id)
    if attempt_status:
        stmt = stmt.where(Attempt.status == attempt_status)
    return [_summary(a) for a in db.scalars(stmt.order_by(Attempt.completed_at.desc())).all()]


@router.get("/student/stats", response_model=StudentStatsOut)
def student_stats(db: Session = Depends(get_db), user: User = Depends(require_student)):
    attempts = db.scalars(
        select(Attempt)
        .where(Attempt.user_id == user.id, Attempt.status != AttemptStatus.IN_PROGRESS)
        .order_by(Attempt.completed_at.desc())
    ).all()
    percentages = [a.percentage for a in attempts]
    answered = sum(a.correct_answers + a.incorrect_answers for a in attempts)
    trend = [
        Point(label=a.quiz.title[:18] if a.quiz else "Quiz", value=a.percentage)
        for a in reversed(attempts[:10])
    ]
    return StudentStatsOut(
        attempted=len(attempts),
        passed=sum(1 for a in attempts if a.status is AttemptStatus.PASSED),
        failed=sum(1 for a in attempts if a.status is AttemptStatus.FAILED),
        average_score=round(sum(percentages) / len(percentages), 1) if percentages else 0.0,
        highest_score=round(max(percentages), 1) if percentages else 0.0,
        questions_answered=answered,
        score_trend=trend,
        recent=[_summary(a) for a in attempts[:5]],
    )


@router.get("/leaderboard", response_model=list[LeaderboardRow])
def leaderboard(
    scope: str = Query(default="overall", pattern="^(overall|weekly|monthly)$"),
    category_id: int | None = None,
    metric: str = Query(default="average", pattern="^(average|highest|completed)$"),
    limit: int = Query(default=20, ge=3, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Attempt).where(Attempt.status != AttemptStatus.IN_PROGRESS)
    now = datetime.now(timezone.utc)
    if scope == "weekly":
        stmt = stmt.where(Attempt.started_at >= now - timedelta(days=7))
    elif scope == "monthly":
        stmt = stmt.where(Attempt.started_at >= now - timedelta(days=30))
    if category_id:
        stmt = stmt.join(Quiz, Quiz.id == Attempt.quiz_id).where(Quiz.category_id == category_id)

    grouped: dict[int, list[Attempt]] = defaultdict(list)
    for a in db.scalars(stmt).unique().all():
        grouped[a.user_id].append(a)

    rows = []
    for user_id, items in grouped.items():
        student = items[0].user
        if not student or student.role is not Role.STUDENT:
            continue
        scores = [i.percentage for i in items]
        rows.append(
            LeaderboardRow(
                rank=0,
                user_id=user_id,
                student=student.name,
                average_score=round(sum(scores) / len(scores), 1),
                highest_score=round(max(scores), 1),
                quizzes_completed=len(items),
            )
        )
    key = {"average": "average_score", "highest": "highest_score", "completed": "quizzes_completed"}[metric]
    rows.sort(key=lambda r: (getattr(r, key), r.average_score), reverse=True)
    for index, row in enumerate(rows[:limit], start=1):
        row.rank = index
    return rows[:limit]
