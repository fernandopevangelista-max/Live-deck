from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import os
import shutil
import uuid

from database import get_db
from models import Dataset, Project
from routers.auth import get_current_user, User
from services.data_profiler import profile_dataset

router = APIRouter(tags=["datasets"])

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "datasets")
os.makedirs(STORAGE_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".xlsx", ".xlsm", ".xls", ".csv", ".json"}


class DatasetResponse(BaseModel):
    id: int
    project_id: int
    original_filename: str
    stored_filename: str
    file_type: str
    selected_sheet: Optional[str]
    row_count: Optional[int]
    column_count: Optional[int]
    profile_data: Optional[Any]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/api/projects/{project_id}/datasets/upload", response_model=DatasetResponse)
async def upload_dataset(
    project_id: int,
    file: UploadFile = File(...),
    selected_sheet: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    original_name = file.filename or "upload"
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not supported. Use: xlsx, xlsm, xls, csv, json")

    stored_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(STORAGE_DIR, stored_name)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    profile = profile_dataset(file_path, selected_sheet)

    dataset = Dataset(
        project_id=project_id,
        original_filename=original_name,
        stored_filename=stored_name,
        file_path=file_path,
        file_type=ext.lstrip("."),
        selected_sheet=profile.get("suggested_sheet"),
        row_count=profile.get("row_count"),
        column_count=profile.get("column_count"),
        profile_data=profile,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


@router.post("/api/datasets/{dataset_id}/profile", response_model=DatasetResponse)
def profile_dataset_endpoint(
    dataset_id: int,
    selected_sheet: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = _get_dataset_for_user(dataset_id, current_user, db)
    profile = profile_dataset(dataset.file_path, selected_sheet or dataset.selected_sheet)

    dataset.selected_sheet = profile.get("suggested_sheet", dataset.selected_sheet)
    dataset.row_count = profile.get("row_count", dataset.row_count)
    dataset.column_count = profile.get("column_count", dataset.column_count)
    dataset.profile_data = profile
    db.commit()
    db.refresh(dataset)
    return dataset


@router.get("/api/datasets/{dataset_id}/preview")
def preview_dataset(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = _get_dataset_for_user(dataset_id, current_user, db)
    profile = dataset.profile_data or {}
    return {
        "columns": profile.get("columns", []),
        "preview": profile.get("preview", []),
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
    }


@router.get("/api/projects/{project_id}/datasets", response_model=List[DatasetResponse])
def list_datasets(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(Dataset).filter(Dataset.project_id == project_id).order_by(Dataset.created_at.desc()).all()


def _get_dataset_for_user(dataset_id: int, current_user: User, db: Session) -> Dataset:
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    project = db.query(Project).filter(
        Project.id == dataset.project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=403, detail="Not authorized")
    return dataset
