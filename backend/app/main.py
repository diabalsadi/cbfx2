import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth
from app.routers import articles, clients, campaigns, users

# Import all models so SQLAlchemy creates their tables
import app.models.user
import app.models.article
import app.models.client
import app.models.campaign

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CBFX API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(articles.router)
app.include_router(clients.router)
app.include_router(campaigns.router)
app.include_router(users.router)


@app.get("/")
async def read_root():
    return {"message": "CBFX API v1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
