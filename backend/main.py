from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from database import create_tables
from routers import auth, projects, datasets, conversations, slides, decks

app = FastAPI(title="LiveDeck Studio API", version="1.0.0")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(datasets.router)
app.include_router(conversations.router)
app.include_router(slides.router)
app.include_router(decks.router)


@app.on_event("startup")
def startup():
    create_tables()


@app.get("/")
def root():
    return {"status": "ok", "app": "LiveDeck Studio API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
