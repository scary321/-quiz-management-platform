from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_admin
from ..models import Attempt, AttemptStatus, Category, Difficulty, Question, Quiz, QuizStatus, Role, User
from ..schemas import QuizDetailOut, QuizIn, QuizOut

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])


def serialize(db: Session, quiz: Quiz) -> QuizOut:
    out = QuizOut.model_validate(quiz)
    out.category_name = quiz.category.name if quiz.category else None
    out.question_count = db.scalar(
        select(func.count()).select_from(Question).where(Question.quiz_id == quiz.id)
    )
    out.attempt_count = db.scalar(
        select(func.count())
        .select_from(Attempt)
        .where(Attempt.quiz_id == quiz.id, Attempt.status != AttemptStatus.IN_PROGRESS)
    )
    return out


@router.get("", response_model=list[QuizOut])
def list_quizzes(
    search: str | None = None,
    category_id: int | None = None,
    difficulty: Difficulty | None = None,
    max_duration: int | None = None,
    quiz_status: QuizStatus | None = Query(default=None, alias="status"),
    sort: str = Query(default="recent", pattern="^(recent|popular|title)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Quiz)
    if user.role is Role.STUDENT:
        stmt = stmt.where(Quiz.status == QuizStatus.PUBLISHED)
    elif quiz_status:
        stmt = stmt.where(Quiz.status == quiz_status)
    if search:
        term = f"%{search.lower()}%"
        stmt = stmt.outerjoin(Category, Quiz.category_id == Category.id).where(
            func.lower(Quiz.title).like(term) | func.lower(Category.name).like(term)
        )
    if category_id:
        stmt = stmt.where(Quiz.category_id == category_id)
    if difficulty:
        stmt = stmt.where(Quiz.difficulty == difficulty)
    if max_duration:
        stmt = stmt.where(Quiz.duration <= max_duration)

    quizzes = db.scalars(stmt.order_by(Quiz.created_at.desc())).unique().all()
    items = [serialize(db, q) for q in quizzes]
    if sort == "popular":
        items.sort(key=lambda q: q.attempt_count, reverse=True)
    elif sort == "title":
        items.sort(key=lambda q: q.title.lower())
    return items


@router.get("/{quiz_id}", response_model=QuizDetailOut)
def get_quiz(quiz_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    quiz = db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such quiz.")
    if user.role is Role.STUDENT and quiz.status is not QuizStatus.PUBLISHED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such quiz.")
    out = QuizDetailOut.model_validate(serialize(db, quiz).model_dump())
    if user.role is Role.STUDENT:
        used = db.scalar(
            select(func.count())
            .select_from(Attempt)
            .where(Attempt.quiz_id == quiz.id, Attempt.user_id == user.id)
        )
        best = db.scalar(
            select(func.max(Attempt.percentage)).where(
                Attempt.quiz_id == quiz.id,
                Attempt.user_id == user.id,
                Attempt.status != AttemptStatus.IN_PROGRESS,
            )
        )
        out.attempts_used = used
        out.attempts_left = max(quiz.max_attempts - used, 0)
        out.best_percentage = round(best, 1) if best is not None else None
    return out


@router.post("", response_model=QuizOut, status_code=201, dependencies=[Depends(require_admin)])
def create_quiz(payload: QuizIn, db: Session = Depends(get_db)):
    quiz = Quiz(**payload.model_dump())
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return serialize(db, quiz)


@router.put("/{quiz_id}", response_model=QuizOut, dependencies=[Depends(require_admin)])
def update_quiz(quiz_id: int, payload: QuizIn, db: Session = Depends(get_db)):
    quiz = db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such quiz.")
    for key, value in payload.model_dump().items():
        setattr(quiz, key, value)
    db.commit()
    db.refresh(quiz)
    return serialize(db, quiz)


@router.patch("/{quiz_id}/publish", response_model=QuizOut, dependencies=[Depends(require_admin)])
def toggle_publish(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such quiz.")
    if quiz.status is QuizStatus.PUBLISHED:
        quiz.status = QuizStatus.UNPUBLISHED
    else:
        question_count = db.scalar(
            select(func.count()).select_from(Question).where(Question.quiz_id == quiz.id)
        )
        if question_count == 0:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Add at least one question before publishing this quiz."
            )
        quiz.status = QuizStatus.PUBLISHED
    db.commit()
    db.refresh(quiz)
    return serialize(db, quiz)


@router.delete("/{quiz_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such quiz.")
    db.delete(quiz)
    db.commit()
