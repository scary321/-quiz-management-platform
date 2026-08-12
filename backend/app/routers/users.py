from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import Attempt, AttemptStatus, Role, User, UserStatus
from ..schemas import AttemptSummaryOut, StudentRow, UserOut

router = APIRouter(prefix="/api/users", tags=["users (admin)"], dependencies=[Depends(require_admin)])


def _stats_map(db: Session, user_ids: list[int]) -> dict[int, tuple[int, float, float]]:
    if not user_ids:
        return {}
    rows = db.execute(
        select(
            Attempt.user_id,
            func.count(Attempt.id),
            func.avg(Attempt.percentage),
            func.max(Attempt.percentage),
        )
        .where(Attempt.user_id.in_(user_ids), Attempt.status != AttemptStatus.IN_PROGRESS)
        .group_by(Attempt.user_id)
    ).all()
    return {r[0]: (r[1], round(r[2] or 0, 1), round(r[3] or 0, 1)) for r in rows}


@router.get("", response_model=list[StudentRow])
def list_students(
    search: str | None = None,
    status_filter: UserStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    stmt = select(User).where(User.role == Role.STUDENT)
    if search:
        term = f"%{search.lower()}%"
        stmt = stmt.where(func.lower(User.name).like(term) | func.lower(User.email).like(term))
    if status_filter:
        stmt = stmt.where(User.status == status_filter)
    users = db.scalars(stmt.order_by(User.created_at.desc())).all()
    stats = _stats_map(db, [u.id for u in users])
    out = []
    for u in users:
        attempted, avg, best = stats.get(u.id, (0, 0.0, 0.0))
        row = StudentRow.model_validate(u)
        row.quizzes_attempted, row.average_score, row.highest_score = attempted, avg, best
        out.append(row)
    return out


@router.get("/{user_id}", response_model=StudentRow)
def get_student(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such user.")
    attempted, avg, best = _stats_map(db, [user.id]).get(user.id, (0, 0.0, 0.0))
    row = StudentRow.model_validate(user)
    row.quizzes_attempted, row.average_score, row.highest_score = attempted, avg, best
    return row


@router.get("/{user_id}/attempts", response_model=list[AttemptSummaryOut])
def student_attempts(user_id: int, db: Session = Depends(get_db)):
    attempts = db.scalars(
        select(Attempt).where(Attempt.user_id == user_id).order_by(Attempt.started_at.desc())
    ).all()
    out = []
    for a in attempts:
        row = AttemptSummaryOut.model_validate(a)
        row.quiz_title = a.quiz.title if a.quiz else None
        row.student_name = a.user.name if a.user else None
        out.append(row)
    return out


@router.patch("/{user_id}/status", response_model=UserOut)
def toggle_status(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user or user.role is Role.ADMIN:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such student.")
    user.status = UserStatus.INACTIVE if user.status is UserStatus.ACTIVE else UserStatus.ACTIVE
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_student(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user or user.role is Role.ADMIN:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such student.")
    db.delete(user)
    db.commit()
