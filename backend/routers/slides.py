from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os

from database import get_db
from models import Slide, Prompt, Project, Dataset, Conversation
from routers.auth import get_current_user, User
from services.llm_gateway import call_llm
from services.slide_builder import SLIDE_BUILDER_SYSTEM, build_slide_prompt, extract_html_from_response
from services.data_analyst import get_full_context_for_chat
from services.agents import run_qa, run_full_prompt_pipeline

router = APIRouter(tags=["slides"])

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "slides")
os.makedirs(STORAGE_DIR, exist_ok=True)


class SlideUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    section: Optional[str] = None
    slide_type: Optional[str] = None


class PipelineRequest(BaseModel):
    intent: str
    dataset_id: Optional[int] = None
    conversation_id: Optional[int] = None


class SlideResponse(BaseModel):
    id: int
    project_id: int
    prompt_id: Optional[int]
    dataset_id: Optional[int]
    title: str
    status: str
    slide_type: Optional[str]
    section: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.post("/api/projects/{project_id}/slides/pipeline")
async def run_slide_pipeline(
    project_id: int,
    body: PipelineRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Full 3-agent pipeline: Data Sonda → Analyst → Design → Slide Builder → QA
    Returns the generated prompt and HTML slide.
    """
    _get_project(project_id, current_user, db)

    profile = None
    if body.dataset_id:
        dataset = db.query(Dataset).filter(Dataset.id == body.dataset_id).first()
        if dataset and dataset.profile_data:
            profile = dataset.profile_data

    if not profile:
        raise HTTPException(status_code=400, detail="Base de dados não encontrada ou sem perfil")

    # Run 3-agent pipeline
    pipeline_result = await run_full_prompt_pipeline(
        user_intent=body.intent,
        profile=profile,
        db=db,
    )

    # Generate HTML with Slide Builder
    user_message = build_slide_prompt(
        pipeline_result["final_prompt"],
        get_full_context_for_chat(profile),
        profile.get("preview"),
    )

    try:
        html_content = await call_llm(
            messages=[{"role": "user", "content": user_message}],
            system_prompt=SLIDE_BUILDER_SYSTEM,
            db=db,
        )
        html_content = extract_html_from_response(html_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Slide Builder error: {str(e)}")

    # QA validation
    qa_result = await run_qa(html_content, db=db)

    # Save to DB
    prompt_obj = Prompt(
        conversation_id=body.conversation_id,
        project_id=project_id,
        dataset_id=body.dataset_id,
        content=pipeline_result["final_prompt"],
        title=body.intent[:200],
    )
    db.add(prompt_obj)
    db.commit()
    db.refresh(prompt_obj)

    slide = Slide(
        project_id=project_id,
        prompt_id=prompt_obj.id,
        dataset_id=body.dataset_id,
        title=body.intent[:200],
        html_content=html_content,
        status="ready" if qa_result["status"] == "approved" else "needs_review",
    )
    db.add(slide)
    db.commit()
    db.refresh(slide)

    slide_path = os.path.join(STORAGE_DIR, f"slide_{slide.id}.html")
    with open(slide_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    return {
        "slide_id": slide.id,
        "prompt_id": prompt_obj.id,
        "status": slide.status,
        "qa": qa_result,
        "pipeline": {
            "sonda": pipeline_result["sonda"],
            "analyst": pipeline_result["analyst"],
            "design": pipeline_result["design"],
        },
        "html_preview": html_content[:500] + "...",
    }


@router.post("/api/prompts/{prompt_id}/build-slide", response_model=SlideResponse)
async def build_slide(
    prompt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    _get_project(prompt.project_id, current_user, db)

    slide = Slide(
        project_id=prompt.project_id,
        prompt_id=prompt_id,
        dataset_id=prompt.dataset_id,
        title=prompt.title or "Novo Slide",
        status="generating",
    )
    db.add(slide)
    db.commit()
    db.refresh(slide)

    dataset_summary = None
    dataset_preview = None
    if prompt.dataset_id:
        dataset = db.query(Dataset).filter(Dataset.id == prompt.dataset_id).first()
        if dataset and dataset.profile_data:
            dataset_summary = get_full_context_for_chat(dataset.profile_data)
            dataset_preview = dataset.profile_data.get("preview")

    user_message = build_slide_prompt(prompt.content, dataset_summary, dataset_preview)

    try:
        html_content = await call_llm(
            messages=[{"role": "user", "content": user_message}],
            system_prompt=SLIDE_BUILDER_SYSTEM,
            db=db,
        )
        html_content = extract_html_from_response(html_content)

        # QA validation
        qa_result = await run_qa(html_content, db=db)

        slide_path = os.path.join(STORAGE_DIR, f"slide_{slide.id}.html")
        with open(slide_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        slide.html_content = html_content
        slide.status = "ready" if qa_result["status"] == "approved" else "needs_review"
    except Exception as e:
        slide.status = "error"
        slide.error_message = str(e)

    db.commit()
    db.refresh(slide)
    return slide


@router.get("/api/projects/{project_id}/slides", response_model=List[SlideResponse])
def list_slides(
    project_id: int,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_project(project_id, current_user, db)
    q = db.query(Slide).filter(Slide.project_id == project_id)
    if status:
        q = q.filter(Slide.status == status)
    return q.order_by(Slide.created_at.desc()).all()


@router.get("/api/slides/{slide_id}", response_model=SlideResponse)
def get_slide(
    slide_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_slide(slide_id, current_user, db)


@router.get("/api/slides/{slide_id}/html", response_class=HTMLResponse)
def get_slide_html(
    slide_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slide = _get_slide(slide_id, current_user, db)
    if not slide.html_content:
        raise HTTPException(status_code=404, detail="Slide HTML not available")
    return HTMLResponse(content=slide.html_content)


@router.post("/api/slides/{slide_id}/regenerate", response_model=SlideResponse)
async def regenerate_slide(
    slide_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slide = _get_slide(slide_id, current_user, db)
    if not slide.prompt_id:
        raise HTTPException(status_code=400, detail="Slide has no associated prompt")

    prompt = db.query(Prompt).filter(Prompt.id == slide.prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    slide.status = "generating"
    slide.error_message = None
    db.commit()

    dataset_summary = None
    dataset_preview = None
    if slide.dataset_id:
        dataset = db.query(Dataset).filter(Dataset.id == slide.dataset_id).first()
        if dataset and dataset.profile_data:
            dataset_summary = get_full_context_for_chat(dataset.profile_data)
            dataset_preview = dataset.profile_data.get("preview")

    user_message = build_slide_prompt(prompt.content, dataset_summary, dataset_preview)

    try:
        html_content = await call_llm(
            messages=[{"role": "user", "content": user_message}],
            system_prompt=SLIDE_BUILDER_SYSTEM,
            db=db,
        )
        html_content = extract_html_from_response(html_content)

        qa_result = await run_qa(html_content, db=db)

        slide_path = os.path.join(STORAGE_DIR, f"slide_{slide.id}.html")
        with open(slide_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        slide.html_content = html_content
        slide.status = "ready" if qa_result["status"] == "approved" else "needs_review"
    except Exception as e:
        slide.status = "error"
        slide.error_message = str(e)

    db.commit()
    db.refresh(slide)
    return slide


@router.put("/api/slides/{slide_id}", response_model=SlideResponse)
def update_slide(
    slide_id: int,
    body: SlideUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slide = _get_slide(slide_id, current_user, db)
    if body.title is not None:
        slide.title = body.title
    if body.status is not None:
        slide.status = body.status
    if body.section is not None:
        slide.section = body.section
    if body.slide_type is not None:
        slide.slide_type = body.slide_type
    db.commit()
    db.refresh(slide)
    return slide


@router.delete("/api/slides/{slide_id}")
def delete_slide(
    slide_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slide = _get_slide(slide_id, current_user, db)
    db.delete(slide)
    db.commit()
    return {"ok": True}


def _get_project(project_id: int, current_user: User, db: Session):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_slide(slide_id: int, current_user: User, db: Session) -> Slide:
    slide = db.query(Slide).filter(Slide.id == slide_id).first()
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")
    _get_project(slide.project_id, current_user, db)
    return slide
