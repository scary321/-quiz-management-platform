import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_student
from ..models import Attempt, AttemptStatus, Option, Question, Quiz, QuizStatus, Role, User
from ..schemas import (
    AnswerIn,
    AttemptOptionOut,
    AttemptQuestionOut,
    AttemptResultOut,
    AttemptSessionOut,
    AttemptSummaryOut,
    OptionOut,
    ReviewItemOut,
)
from ..services.scoring import ensure_answer, finalize, is_expired

router = APIRouter(prefix="/api", tags=["attempts"])


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _summary(attempt: Attempt) -> AttemptSummaryOut:
    row = AttemptSummaryOut.model_validate(attempt)
    row.quiz_title = attempt.quiz.title if attempt.quiz else None
    row.student_name = attempt.user.name if attempt.user else None
    return row


def _session_payload(db: Session, attempt: Attempt) -> AttemptSessionOut:
    quiz = attempt.quiz
    order = [int(i) for i in (attempt.question_order or "").split(",") if i]
    questions = db.scalars(select(Question).where(Question.id.in_(order))).all()
    by_id = {q.id: q for q in questions}
    answers = {a.question_id: a.selected_option_id for a in attempt.answers}

    items: list[AttemptQuestionOut] = []
    for qid in order:
        question = by_id.get(qid)
        if not question:
            continue
        options = list(question.options)
        if quiz.randomize_options:
            random.Random(attempt.id * 1000 + question.id).shuffle(options)
        items.append(
            AttemptQuestionOut(
                id=question.id,
                question_text=question.question_text,
                marks=question.marks,
                options=[AttemptOptionOut(id=o.id, option_text=o.option_text) for o in options],
                selected_option_id=answers.get(question.id),
            )
        )

    now = datetime.now(timezone.utc)
    return AttemptSessionOut(
        attempt_id=attempt.id,
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        duration=quiz.duration,
        negative_marks=quiz.negative_marks,
        server_time=now,
        expires_at=_aware(attempt.expires_at),
        seconds_remaining=max(int((_aware(attempt.expires_at) - now).total_seconds()), 0),
        questions=items,
    )


def _load_attempt(db: Session, attempt_id: int, user: User) -> Attempt:
    attempt = db.get(Attempt, attempt_id)
    if not attempt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such attempt.")
    if user.role is not Role.ADMIN and attempt.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "That attempt belongs to another student.")
    return attempt


@router.post("/quizzes/{quiz_id}/start", response_model=AttemptSessionOut)
def start_quiz(quiz_id: int, db: Session = Depends(get_db), user: User = Depends(require_student)):
    quiz = db.get(Quiz, quiz_id)
    if not quiz or quiz.status is not QuizStatus.PUBLISHED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This quiz is not available.")

    live = db.scalar(
        select(Attempt).where(
            Attempt.quiz_id == quiz_id,
            Attempt.user_id == user.id,
            Attempt.status == AttemptStatus.IN_PROGRESS,
        )
    )
    if live:
        if is_expired(live):
            finalize(db, live)
        else:
            return _session_payload(db, live)

    used = db.scalar(
        select(func.count()).select_from(Attempt).where(Attempt.quiz_id == quiz_id, Attempt.user_id == user.id)
    )
    if used >= quiz.max_attempts:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"You have used all {quiz.max_attempts} attempts for this quiz.",
        )

    question_ids = list(db.scalars(select(Question.id).where(Question.quiz_id == quiz_id)).all())
    if not question_ids:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This quiz has no questions yet.")

    now = datetime.now(timezone.utc)
    attempt = Attempt(
        quiz_id=quiz_id,
        user_id=user.id,
        started_at=now,
        expires_at=now + timedelta(minutes=quiz.duration),
    )
    db.add(attempt)
    db.flush()
    if quiz.randomize_questions:
        random.Random(attempt.id).shuffle(question_ids)
    attempt.question_order = ",".join(str(i) for i in question_ids)
    db.commit()
    db.refresh(attempt)
    return _session_payload(db, attempt)


@router.get("/attempts/{attempt_id}/session", response_model=AttemptSessionOut)
def resume(attempt_id: int, db: Session = Depends(get_db), user: User = Depends(require_student)):
    attempt = _load_attempt(db, attempt_id, user)
    if attempt.status is not AttemptStatus.IN_PROGRESS:
        raise HTTPException(status.HTTP_409_CONFLICT, "This attempt is already submitted.")
    if is_expired(attempt):
        finalize(db, attempt)
        raise HTTPException(status.HTTP_409_CONFLICT, "Time ran out. The attempt was submitted for you.")
    return _session_payload(db, attempt)


@router.patch("/attempts/{attempt_id}/answer", status_code=204)
def save_answer(
    attempt_id: int,
    payload: AnswerIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
):
    attempt = _load_attempt(db, attempt_id, user)
    if attempt.status is not AttemptStatus.IN_PROGRESS:
        raise HTTPException(status.HTTP_409_CONFLICT, "This attempt is already submitted.")
    if is_expired(attempt):
        finalize(db, attempt)
        raise HTTPException(status.HTTP_409_CONFLICT, "Time ran out. The attempt was submitted for you.")

    question = db.get(Question, payload.question_id)
    if not question or question.quiz_id != attempt.quiz_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That question is not part of this quiz.")
    if payload.selected_option_id is not None:
        option = db.get(Option, payload.selected_option_id)
        if not option or option.question_id != question.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That option is not part of this question.")
    ensure_answer(db, attempt, payload.question_id, payload.selected_option_id)
    db.commit()


@router.post("/quizzes/{quiz_id}/submit", response_model=AttemptSummaryOut)
def submit_quiz(
    quiz_id: int,
    answers: list[AnswerIn] | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
):
    attempt = db.scalar(
        select(Attempt).where(
            Attempt.quiz_id == quiz_id,
            Attempt.user_id == user.id,
            Attempt.status == AttemptStatus.IN_PROGRESS,
        )
    )
    if not attempt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No attempt in progress for this quiz.")
    if answers and not is_expired(attempt):
        valid_ids = {q.id for q in attempt.quiz.questions}
        for item in answers:
            if item.question_id in valid_ids:
                ensure_answer(db, attempt, item.question_id, item.selected_option_id)
        db.commit()
    return _summary(finalize(db, attempt))


@router.get("/attempts", response_model=list[AttemptSummaryOut])
def my_attempts(db: Session = Depends(get_db), user: User = Depends(require_student)):
    attempts = db.scalars(
        select(Attempt)
        .where(Attempt.user_id == user.id, Attempt.status != AttemptStatus.IN_PROGRESS)
        .order_by(Attempt.started_at.desc())
    ).all()
    return [_summary(a) for a in attempts]


@router.get("/attempts/{attempt_id}", response_model=AttemptResultOut)
def attempt_result(attempt_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    attempt = _load_attempt(db, attempt_id, user)
    if attempt.status is AttemptStatus.IN_PROGRESS:
        if is_expired(attempt):
            finalize(db, attempt)
        else:
            raise HTTPException(status.HTTP_409_CONFLICT, "This attempt is still in progress.")

    answers = {a.question_id: a for a in attempt.answers}
    review: list[ReviewItemOut] = []
    order = [int(i) for i in (attempt.question_order or "").split(",") if i]
    questions = {q.id: q for q in attempt.quiz.questions}
    for qid in order or list(questions):
        question = questions.get(qid)
        if not question:
            continue
        answer = answers.get(qid)
        correct_id = next((o.id for o in question.options if o.is_correct), 0)
        review.append(
            ReviewItemOut(
                question_id=question.id,
                question_text=question.question_text,
                marks=question.marks,
                explanation=question.explanation,
                selected_option_id=answer.selected_option_id if answer else None,
                correct_option_id=correct_id,
                is_correct=bool(answer and answer.is_correct),
                options=[OptionOut.model_validate(o) for o in question.options],
            )
        )
    return AttemptResultOut(
        attempt=_summary(attempt), passing_score=attempt.quiz.passing_score, review=review
    )
