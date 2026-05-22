from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from database import get_db
from models import Conversation, ConversationMessage, Prompt, Project, Dataset
from routers.auth import get_current_user, User
from services.llm_gateway import call_llm
from services.prompt_architect import get_system_prompt_with_context
from services.data_analyst import get_full_context_for_chat

router = APIRouter(tags=["conversations"])

PROMPT_TRIGGER = "PROMPT GERADO PARA O SLIDE:"


class ConversationCreate(BaseModel):
    title: Optional[str] = "Nova conversa"
    dataset_id: Optional[int] = None


class MessageCreate(BaseModel):
    content: str


class ConversationResponse(BaseModel):
    id: int
    project_id: int
    dataset_id: Optional[int]
    title: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class SendMessageResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse
    has_prompt: bool
    prompt_content: Optional[str]


@router.post("/api/projects/{project_id}/conversations", response_model=ConversationResponse)
def create_conversation(
    project_id: int,
    body: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_project(project_id, current_user, db)
    convo = Conversation(
        project_id=project_id,
        dataset_id=body.dataset_id,
        title=body.title or "Nova conversa",
    )
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


@router.get("/api/projects/{project_id}/conversations", response_model=List[ConversationResponse])
def list_conversations(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_project(project_id, current_user, db)
    return (
        db.query(Conversation)
        .filter(Conversation.project_id == project_id)
        .order_by(Conversation.created_at.desc())
        .all()
    )


@router.post("/api/conversations/{conversation_id}/messages", response_model=SendMessageResponse)
async def send_message(
    conversation_id: int,
    body: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    convo = _get_conversation(conversation_id, current_user, db)

    user_msg = ConversationMessage(
        conversation_id=conversation_id,
        role="user",
        content=body.content,
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    history = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.conversation_id == conversation_id)
        .order_by(ConversationMessage.created_at)
        .all()
    )

    messages = [{"role": m.role, "content": m.content} for m in history]

    dataset_summary = None
    if convo.dataset_id:
        dataset = db.query(Dataset).filter(Dataset.id == convo.dataset_id).first()
        if dataset and dataset.profile_data:
            dataset_summary = get_full_context_for_chat(dataset.profile_data)

    system_prompt = get_system_prompt_with_context(dataset_summary)

    try:
        ai_content = await call_llm(messages=messages, system_prompt=system_prompt, db=db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")

    assistant_msg = ConversationMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=ai_content,
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    has_prompt = PROMPT_TRIGGER in ai_content
    prompt_content = None
    if has_prompt:
        idx = ai_content.find(PROMPT_TRIGGER)
        prompt_content = ai_content[idx + len(PROMPT_TRIGGER):].strip()

    return SendMessageResponse(
        user_message=MessageResponse.model_validate(user_msg),
        assistant_message=MessageResponse.model_validate(assistant_msg),
        has_prompt=has_prompt,
        prompt_content=prompt_content,
    )


@router.post("/api/conversations/{conversation_id}/generate-prompt")
def generate_prompt_from_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    convo = _get_conversation(conversation_id, current_user, db)

    last_ai = (
        db.query(ConversationMessage)
        .filter(
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.role == "assistant",
        )
        .order_by(ConversationMessage.created_at.desc())
        .first()
    )

    if not last_ai or PROMPT_TRIGGER not in last_ai.content:
        raise HTTPException(status_code=400, detail="No generated prompt found in last assistant message")

    idx = last_ai.content.find(PROMPT_TRIGGER)
    prompt_content = last_ai.content[idx + len(PROMPT_TRIGGER):].strip()

    first_line = prompt_content.split("\n")[0][:200] if prompt_content else "Slide prompt"

    prompt = Prompt(
        conversation_id=conversation_id,
        project_id=convo.project_id,
        dataset_id=convo.dataset_id,
        content=prompt_content,
        title=first_line,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)

    return {
        "id": prompt.id,
        "title": prompt.title,
        "content": prompt.content,
        "conversation_id": conversation_id,
        "project_id": convo.project_id,
        "dataset_id": convo.dataset_id,
        "created_at": prompt.created_at,
    }


@router.get("/api/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
def get_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_conversation(conversation_id, current_user, db)
    return (
        db.query(ConversationMessage)
        .filter(ConversationMessage.conversation_id == conversation_id)
        .order_by(ConversationMessage.created_at)
        .all()
    )


def _get_project(project_id: int, current_user: User, db: Session):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_conversation(conversation_id: int, current_user: User, db: Session):
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    _get_project(convo.project_id, current_user, db)
    return convo
