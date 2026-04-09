from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    appointments,
    audit_logs,
    auth,
    dashboard,
    dental_chart,
    patient_images,
    patients,
    treatment_plans,
    treatment_records,
    treatment_types,
    users,
)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://dentease.netlify.app",        # update with your actual Netlify URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(treatment_types.router, prefix=API_PREFIX)
app.include_router(patients.router, prefix=API_PREFIX)
app.include_router(appointments.router, prefix=API_PREFIX)
app.include_router(treatment_records.router, prefix=API_PREFIX)
app.include_router(patient_images.router, prefix=API_PREFIX)
app.include_router(dental_chart.router, prefix=API_PREFIX)
app.include_router(treatment_plans.router, prefix=API_PREFIX)
app.include_router(audit_logs.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.1.0"}
