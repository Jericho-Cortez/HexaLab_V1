from pydantic import BaseModel
from typing import List, Optional

class ScanRequest(BaseModel):
    target_files: List[str]

class ScanStatus(BaseModel):
    job_id: str
    status: str
    detail: Optional[str] = None

class Vulnerability(BaseModel):
    id: str
    package: str
    version: str
    severity: str
    url: Optional[str] = None

class ScanReport(BaseModel):
    job_id: str
    summary: str
    total_vulns: int
    critical: int
    high: int
    vulnerabilities: List[Vulnerability] = []
