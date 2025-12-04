import subprocess
import json
from typing import List


# Binaries installés via Dockerfile avec -b /usr/local/bin
SYFT_BIN = "/usr/local/bin/syft"
GRYPE_BIN = "/usr/local/bin/grype"

def run_cmd(cmd_list: List[str], output_file: str) -> None:
    """Exécute une commande Linux et capture stdout/stderr dans output_file."""
    with open(output_file, "w") as f:
        subprocess.run(
            cmd_list,
            stdout=f,
            stderr=subprocess.STDOUT,
            check=True
        )

def generate_sbom(files: List[str]) -> str:
    """
    files : chemins internes Docker (ex: /data/uploads/<uuid>/file.sys)
    """
    if not files:
        raise ValueError("No files provided to generate SBOM")

    sbom_path = "/data/sbom.cdx.json"  # peut être personnalisé plus tard

    cmd = [SYFT_BIN, *files, "-o", "cyclonedx-json"]
    run_cmd(cmd, sbom_path)
    return sbom_path

def scan_cve(sbom_file: str) -> str:
    cve_path = "/data/cve_report.json"
    cmd = [GRYPE_BIN, f"sbom:{sbom_file}", "-o", "json"]
    run_cmd(cmd, cve_path)
    return cve_path

def run_full_scan(files: List[str]) -> dict:
    """
    Pipeline complet :
      - SBOM via syft
      - CVE via grype
      - Résumé converti en dictionnaire pour l'API FastAPI
    """
    sbom = generate_sbom(files)
    cve = scan_cve(sbom)

    with open(cve, "r") as f:
        data = json.load(f)

    matches = data.get("matches", [])
    total = len(matches)
    critical = sum(1 for x in matches if x["vulnerability"]["severity"] == "Critical")
    high = sum(1 for x in matches if x["vulnerability"]["severity"] == "High")

# Construire une liste simplifiée des vulnérabilités
    vulnerabilities = []
    for m in matches:
        vul = m.get("vulnerability", {})
        art = m.get("artifact", {})

        vulnerabilities.append({
            "id": vul.get("id", ""),
            "package": art.get("name", ""),
            "version": art.get("version", ""),
            "severity": vul.get("severity", ""),
            # Grype met souvent l’URL dans dataSource
            "url": vul.get("dataSource") or vul.get("url", "")
        })
    
    return {
        "summary_text": f"{total} CVE détectées",
        "total_vulns": total,
        "critical": critical,
        "high": high,
        "sbom_file": sbom,
        "cve_file": cve,
        "vulnerabilities": vulnerabilities,
    }
    
    