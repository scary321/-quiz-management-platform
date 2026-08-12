from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_admin
from ..models import Category, Quiz
from ..schemas import CategoryIn, CategoryOut

router = APIRouter(prefix="/api/categories", tags=["categories"])


def _with_counts(db: Session) -> list[CategoryOut]:
    rows = db.execute(
        select(Category, func.count(Quiz.id))
        .outerjoin(Quiz, Quiz.category_id == Category.id)
        .group_by(Category.id)
        .order_by(Category.name)
    ).all()
    out = []
    for cat, count in rows:
        item = CategoryOut.model_validate(cat)
        item.quiz_count = count
        out.append(item)
    return out


@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _with_counts(db)


@router.post("", response_model=CategoryOut, status_code=201, dependencies=[Depends(require_admin)])
def create_category(payload: CategoryIn, db: Session = Depends(get_db)):
    if db.scalar(select(Category).where(func.lower(Category.name) == payload.name.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "A category with that name already exists.")
    cat = Category(name=payload.name.strip(), description=payload.description)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return CategoryOut.model_validate(cat)


@router.put("/{category_id}", response_model=CategoryOut, dependencies=[Depends(require_admin)])
def update_category(category_id: int, payload: CategoryIn, db: Session = Depends(get_db)):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such category.")
    cat.name, cat.description = payload.name.strip(), payload.description
    db.commit()
    db.refresh(cat)
    return CategoryOut.model_validate(cat)


@router.delete("/{category_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such category.")
    db.delete(cat)
    db.commit()
