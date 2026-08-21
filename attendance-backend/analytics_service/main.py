import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from shared.config import get_settings
from shared.middleware.logging import log_requests
from analytics_service.routes.analytics_routes import router as analytics_router

settings = get_settings()
logging.basicConfig(level=settings.log_level.upper())

app = FastAPI(
    title="Analytics Service",
    description="AI-driven productivity estimation and engagement scoring.",
    version="1.0.0",
)

app.add_middleware(BaseHTTPMiddleware, dispatch=log_requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
async def health_check():
    return {"service": "analytics_service", "status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.analytics_service_port, reload=True)
