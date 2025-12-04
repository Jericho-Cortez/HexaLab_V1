from celery import Celery
from app.config import settings
from sbom.sbom_engine import run_full_scan

celery_app = Celery(
    "hexalab_sbom",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

@celery_app.task
def sbom_scan_task(target_files: list[str]):
    return run_full_scan(target_files)


