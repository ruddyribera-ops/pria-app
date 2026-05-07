"""
PRIA v7 — FastAPI Backend
Main application entry point
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from app.auth.routes import router as auth_router
from app.pdc.routes import router as pdc_router
from app.planning.routes import router as planning_router
from app.health.routes import router as health_router

# Initialize FastAPI app
app = FastAPI(
    title="PRIA v7 API",
    description="Curriculum Planning & Trimester Management System",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS Middleware
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/api/health", tags=["health"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(pdc_router, prefix="/api/pdc", tags=["pdc"])
app.include_router(planning_router, prefix="/api/planning", tags=["planning"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "PRIA v7 API",
        "version": "0.1.0",
        "docs": "/api/docs",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
