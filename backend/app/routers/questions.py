from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import Option, Question, Quiz
from ..schemas import QuestionIn, QuestionOut

router = APIRouter(prefix="/api", tags=["questions (admin)"], dependencies=[Depends(require_admin)])


def _validate_options(payload: QuestionIn) -> None:
    correct = [o for o in payload.options if o.is_correct]
    if len(correct) != 1:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Mark exactly one option as the correct answer."
        )


@router.get("/quizzes/{quiz_id}/questions", response_model=list[QuestionOut])
def list_questions(quiz_id: int, db: Session = Depends(get_db)):
    if not db.get(Quiz, quiz_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such quiz.")
    return db.scalars(select(Question).where(Question.quiz_id == quiz_id).order_by(Question.id)).all()


@router.post("/quizzes/{quiz_id}/questions", response_model=QuestionOut, status_code=201)
def create_question(quiz_id: int, payload: QuestionIn, db: Session = Depends(get_db)):
    if not db.get(Quiz, quiz_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such quiz.")
    _validate_options(payload)
    question = Question(
        quiz_id=quiz_id,
        question_text=payload.question_text,
        marks=payload.marks,
        explanation=payload.explanation,
        difficulty=payload.difficulty,
        options=[Option(option_text=o.option_text, is_correct=o.is_correct) for o in payload.options],
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.put("/questions/{question_id}", response_model=QuestionOut)
def update_question(question_id: int, payload: QuestionIn, db: Session = Depends(get_db)):
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such question.")
    _validate_options(payload)
    question.question_text = payload.question_text
    question.marks = payload.marks
    question.explanation = payload.explanation
    question.difficulty = payload.difficulty
    question.options.clear()
    db.flush()
    for o in payload.options:
        question.options.append(Option(option_text=o.option_text, is_correct=o.is_correct))
    db.commit()
    db.refresh(question)
    return question


@router.delete("/questions/{question_id}", status_code=204)
def delete_question(question_id: int, db: Session = Depends(get_db)):
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such question.")
    db.delete(question)
    db.commit()
