from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from database import get_db
from models import Deck, DeckSlide, Slide, Project
from routers.auth import get_current_user, User

router = APIRouter(tags=["decks"])


class DeckCreate(BaseModel):
    title: str
    description: Optional[str] = None


class DeckSlideAdd(BaseModel):
    slide_id: int
    order: Optional[int] = 0


class DeckResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.post("/api/projects/{project_id}/decks", response_model=DeckResponse)
def create_deck(
    project_id: int,
    body: DeckCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_project(project_id, current_user, db)
    deck = Deck(project_id=project_id, title=body.title, description=body.description)
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return deck


@router.get("/api/projects/{project_id}/decks", response_model=List[DeckResponse])
def list_decks(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_project(project_id, current_user, db)
    return db.query(Deck).filter(Deck.project_id == project_id).order_by(Deck.created_at.desc()).all()


@router.get("/api/decks/{deck_id}", response_model=DeckResponse)
def get_deck(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deck = _get_deck(deck_id, current_user, db)
    return deck


@router.post("/api/decks/{deck_id}/slides")
def add_slide_to_deck(
    deck_id: int,
    body: DeckSlideAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deck = _get_deck(deck_id, current_user, db)
    slide = db.query(Slide).filter(Slide.id == body.slide_id, Slide.project_id == deck.project_id).first()
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found in this project")
    deck_slide = DeckSlide(deck_id=deck_id, slide_id=body.slide_id, order=body.order)
    db.add(deck_slide)
    db.commit()
    return {"ok": True}


@router.delete("/api/decks/{deck_id}")
def delete_deck(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deck = _get_deck(deck_id, current_user, db)
    db.delete(deck)
    db.commit()
    return {"ok": True}


def _get_project(project_id: int, current_user: User, db: Session):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_deck(deck_id: int, current_user: User, db: Session) -> Deck:
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    _get_project(deck.project_id, current_user, db)
    return deck
