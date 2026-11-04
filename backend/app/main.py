import logging
import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import engine, SessionLocal, get_db
from app.models import Base
from app.api.v1 import (
    auth, users, audit, dashboard, projects, vendors,
    inspections, defects, assets, readiness, dependencies,
    map, offline, reports, notifications, admin
)
from scripts.seed_demo_data import run_seed_if_empty

logger = logging.getLogger("civicproof.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Auto-seeds essential roles, permissions, departments and demo accounts on first run."""
    # Ensure evidence storage directory exists
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        run_seed_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CivicProof: Field-Verified Infrastructure Readiness and Asset Accountability Platform API for Godavari Pushkaralu 2027.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Production Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), camera=(self)"
    if settings.COOKIE_SECURE or settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Global validation error handler for consistent API responses
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    clean_errors = []
    for err in errors:
        loc = " -> ".join([str(x) for x in err.get("loc", [])])
        msg = err.get("msg", "Validation error")
        clean_errors.append(f"{loc}: {msg}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "; ".join(clean_errors),
            "details": errors
        }
    )


# Global unhandled exception handler for production resilience
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    error_id = str(uuid.uuid4())
    logger.error(f"Unhandled server error [Trace ID: {error_id}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected server error occurred. System administrators have been notified.",
            "trace_id": error_id
        }
    )


# System Health and Monitoring Endpoints
@app.get("/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    """
    Production health & readiness check validating database connectivity and evidence storage.
    Returns HTTP 200 when healthy, or HTTP 503 when degraded.
    """
    db_healthy = False
    db_error = None
    try:
        db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception as e:
        db_error = str(e)
        logger.error(f"Database health check failed: {e}")

    storage_healthy = os.path.isdir(settings.STORAGE_DIR) and os.access(settings.STORAGE_DIR, os.W_OK)
    
    overall_status = "healthy" if (db_healthy and storage_healthy) else "degraded"
    status_code = status.HTTP_200_OK if overall_status == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=status_code,
        content={
            "status": overall_status,
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "database": "connected" if db_healthy else f"disconnected ({db_error})",
            "storage": "writable" if storage_healthy else "unwritable",
        }
    )


@app.get("/health/liveness", tags=["System"])
def liveness_check():
    """Fast liveness probe for Kubernetes and container managers."""
    return {"status": "alive", "service": settings.PROJECT_NAME}


@app.get("/health/readiness", tags=["System"])
def readiness_check(db: Session = Depends(get_db)):
    """Deep readiness probe ensuring application database is ready to accept user traffic."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database not ready: {e}"
        )


# Include API v1 routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(projects.router, prefix=settings.API_V1_STR)
app.include_router(vendors.router, prefix=settings.API_V1_STR)
app.include_router(inspections.router, prefix=settings.API_V1_STR)
app.include_router(defects.router, prefix=settings.API_V1_STR)
app.include_router(assets.router, prefix=settings.API_V1_STR)
app.include_router(readiness.router, prefix=settings.API_V1_STR)
app.include_router(dependencies.router, prefix=settings.API_V1_STR)
app.include_router(map.router, prefix=settings.API_V1_STR)
app.include_router(offline.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
