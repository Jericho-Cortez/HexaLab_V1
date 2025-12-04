from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.models import ScanRequest, ScanStatus, ScanReport
from app.worker import sbom_scan_task
from app.config import settings

from celery import Celery
from celery.result import AsyncResult

# Celery instance for API
celery_api = Celery(
    "hexalab_sbom",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

app = FastAPI(title="HexaLab SBOM/CVE API")
UPLOAD_ROOT = settings.DATA_DIR + "/uploads"
origins = [
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/scan", response_model=ScanStatus)
def create_scan(req: ScanRequest):
    job = sbom_scan_task.delay(req.target_files)
    return ScanStatus(job_id=job.id, status="queued")


@app.post("/scan/upload", response_model=ScanStatus)
async def upload_and_scan(file: UploadFile = File(...)):
    import uuid, os

    folder = f"/data/uploads/{uuid.uuid4()}"
    os.makedirs(folder, exist_ok=True)

    file_path = f"{folder}/{file.filename}"

    with open(file_path, "wb") as f:
        f.write(await file.read())

    job = sbom_scan_task.delay([file_path])
    return ScanStatus(job_id=job.id, status="queued")


@app.get("/scan/{job_id}/status", response_model=ScanStatus)
def status(job_id: str):
    res = AsyncResult(job_id, app=celery_api)
    return ScanStatus(job_id=job_id, status=res.state)


@app.get("/scan/{job_id}/report", response_model=ScanReport)
def report(job_id: str):
    res = AsyncResult(job_id, app=celery_api)

    if not res.ready():
        raise HTTPException(404, "Not ready")

    data = res.get()

    return ScanReport(
        job_id=job_id,
        summary=data["summary_text"],
        total_vulns=data["total_vulns"],
        critical=data["critical"],
        high=data["high"],
        vulnerabilities=data.get("vulnerabilities", []),
    )
