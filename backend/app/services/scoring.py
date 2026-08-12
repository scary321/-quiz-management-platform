"""Attempt scoring. Runs only on the server: the client never sends marks."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Answer, Attempt, AttemptStatus, Option, Question


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def is_expired(attempt: Attempt, now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    return _aware(attempt.expires_at) <= now


def finalize(db: Session, attempt: Attempt, completed_at: datetime | None = None) -> Attempt:
    """Grade an attempt and persist the result. Idempotent."""
    if attempt.status is not AttemptStatus.IN_PROGRESS:
        return attempt

    quiz = attempt.quiz
    questions = db.scalars(select(Question).where(Question.quiz_id == quiz.id)).all()
    correct_by_question = {
        q.id: db.scalar(select(Option.id).where(Option.question_id == q.id, Option.is_correct.is_(True)))
        for q in questions
    }
    answers = {a.question_id: a for a in attempt.answers}

    score = 0.0
    total_marks = 0.0
    correct = incorrect = unanswered = 0

    for question in questions:
        total_marks += question.marks
        answer = answers.get(question.id)
        if answer is None or answer.selected_option_id is None:
            unanswered += 1
            if answer is not None:
                answer.is_correct = False
            continue
        if answer.selected_option_id == correct_by_question.get(question.id):
            answer.is_correct = True
            correct += 1
            score += question.marks
        else:
            answer.is_correct = False
            incorrect += 1
            score -= quiz.negative_marks

    score = max(score, 0.0)
    percentage = round((score / total_marks) * 100, 2) if total_marks else 0.0
    ended = completed_at or datetime.now(timezone.utc)
    hard_stop = _aware(attempt.expires_at)
    if ended > hard_stop:
        ended = hard_stop

    attempt.score = round(score, 2)
    attempt.total_marks = round(total_marks, 2)
    attempt.percentage = percentage
    attempt.correct_answers = correct
    attempt.incorrect_answers = incorrect
    attempt.unanswered = unanswered
    attempt.time_taken = max(int((ended - _aware(attempt.started_at)).total_seconds()), 0)
    attempt.completed_at = ended
    attempt.status = AttemptStatus.PASSED if percentage >= quiz.passing_score else AttemptStatus.FAILED
    db.commit()
    db.refresh(attempt)
    return attempt


def ensure_answer(db: Session, attempt: Attempt, question_id: int, option_id: int | None) -> Answer:
    answer = next((a for a in attempt.answers if a.question_id == question_id), None)
    if answer is None:
        answer = Answer(attempt_id=attempt.id, question_id=question_id)
        db.add(answer)
    answer.selected_option_id = option_id
    return answer
