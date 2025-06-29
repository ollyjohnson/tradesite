from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import trades, webhooks, alpha

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


app.include_router(trades.router, prefix="/api")
app.include_router(webhooks.router, prefix="/webhooks")
app.include_router(alpha.router, prefix="/alpha")