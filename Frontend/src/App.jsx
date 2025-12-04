import { useState, useRef, useMemo } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const inputRef = useRef(null);
  const API_URL = "http://localhost:8000";

  const resetState = () => {
    setJobId("");
    setStatus("");
    setReport(null);
    setError("");
  };

  const handleFileSelected = (newFile) => {
    if (!newFile) return;
    resetState();
    setFile(newFile);
  };

  const handleFileChange = (e) => {
    const newFile = e.target.files?.[0];
    handleFileSelected(newFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const newFile = e.dataTransfer.files?.[0];
    handleFileSelected(newFile);
  };

  const triggerFileDialog = () => {
    inputRef.current?.click();
  };

  const uploadAndScan = async () => {
    if (!file) {
      setError("Choisis (ou dépose) un fichier à scanner.");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);
    setStatus("Envoi du fichier...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/scan/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Erreur API: ${res.status}`);
      }

      const data = await res.json();
      setJobId(data.job_id);
      setStatus("Scan lancé, en attente du résultat...");

      pollStatus(data.job_id);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'upload ou du lancement du scan.");
      setLoading(false);
    }
  };

  const pollStatus = (jobId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/scan/${jobId}/status`);
        if (!res.ok) {
          throw new Error("Erreur lors de la récupération du statut.");
        }

        const data = await res.json();
        setStatus(`Statut du job : ${data.status}`);

        if (data.status === "SUCCESS") {
          clearInterval(interval);
          fetchReport(jobId);
        } else if (data.status === "FAILURE") {
          clearInterval(interval);
          setError("Le scan a échoué.");
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setError("Erreur en interrogeant le statut du job.");
        clearInterval(interval);
        setLoading(false);
      }
    }, 3000);
  };

  const fetchReport = async (jobId) => {
    setStatus("Récupération du rapport...");
    try {
      const res = await fetch(`${API_URL}/scan/${jobId}/report`);
      if (!res.ok) {
        throw new Error("Rapport non encore prêt ou erreur serveur.");
      }
      const data = await res.json();
      setReport(data);
      setStatus("Scan terminé ✅");
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la récupération du rapport.");
    } finally {
      setLoading(false);
    }
  };

  // Calcul pour la petite barre de répartition en bas de la card
  const barSegments = useMemo(() => {
    if (!report) return null;
    const total = report.total_vulns || 0;
    if (!total) {
      return {
        totalWidth: 0,
        criticalWidth: 0,
        highWidth: 0,
      };
    }
    const criticalWidth = Math.max(
      5,
      (report.critical / total) * 100 || 0
    );
    const highWidth = Math.max(
      5,
      (report.high / total) * 100 || 0
    );
    const baseWidth = 100 - criticalWidth - highWidth;
    return {
      totalWidth: Math.max(0, baseWidth),
      criticalWidth,
      highWidth,
    };
  }, [report]);

  return (
    <div className="hexalab-root">
      <header className="hexalab-header">
        <div className="hexalab-logo">
          <div className="image">
            <img src="./hexalab_logo.png" alt="Hexalab Logo" />
          </div>
          <span className="hexalab-logo-text">EXALAB</span>
        </div>
      </header>

      <main className="hexalab-main">
        <section className="hexalab-left">
          <h1>Analysez vos fichiers firmware et drivers</h1>
          <p className="hexalab-subtitle">
            Hexalab détecte les problèmes dans vos fichiers{" "}
            <b>.sys</b>, <b>.dll</b>, <b>.bin</b>, <b>.img</b> et autres
            formats. Obtenez un résumé clair des vulnérabilités détectées.
          </p>

          {/* Drag & Drop zone */}
          <div
            className={`dropzone ${dragActive ? "dropzone-active" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileDialog}
          >
            <div className="dropzone-icon">⬆</div>
            <p className="dropzone-title">
              Glissez-déposez votre fichier ici
            </p>
            <p className="dropzone-subtitle">
              ou cliquez pour sélectionner
            </p>
            <p className="dropzone-types">
              .sys · .dll · .bin · .img · .iso · autre
            </p>
            <input
              type="file"
              ref={inputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>

          {/* Selected file card */}
          {file && (
            <div className="file-card">
              <div className="file-card-left">
                <div className="file-icon">📄</div>
                <div>
                  <div className="file-name">{file.name}</div>
                  <div className="file-meta">
                    {(file.size / 1024).toFixed(1)} Ko
                  </div>
                </div>
              </div>
              <button
                className="file-remove"
                onClick={() => setFile(null)}
                disabled={loading}
              >
                ✕
              </button>
            </div>
          )}

          {/* Actions / status */}
          <div className="actions-row">
            <button
              className="primary-btn"
              onClick={uploadAndScan}
              disabled={!file || loading}
            >
              {loading ? "Scan en cours..." : "Lancer le scan"}
            </button>

            {status && (
              <span className="status-text">
                {status.includes("terminé") ? "🟢" : "🟡"} {status}
              </span>
            )}
          </div>

          {error && (
            <div className="alert alert-error">
              ⚠ {error}
            </div>
          )}

          {jobId && (
            <div className="jobid">
              <span className="jobid-label">Job ID :</span> {jobId}
            </div>
          )}

          {report && (
  <div className="card report-card">
    <h2>Résultat du scan</h2>
    <p className="report-summary">
      <b>Résumé :</b> {report.summary}
    </p>

    {/* métriques globales */}
    <div className="report-grid">
      <div className="badge metric">
        <span className="metric-label">Total vulnérabilités</span>
        <span className="metric-value">
          {report.total_vulns}
        </span>
      </div>
      <div className="badge metric metric-critical">
        <span className="metric-label">Critiques</span>
        <span className="metric-value">
          {report.critical}
        </span>
      </div>
      <div className="badge metric metric-high">
        <span className="metric-label">High</span>
        <span className="metric-value">
          {report.high}
        </span>
      </div>
    </div>

    {/* barre de répartition */}
    {barSegments && report.total_vulns > 0 && (
      <div className="report-bar">
        <div
          className="report-bar-segment report-bar-total"
          style={{ width: `${barSegments.totalWidth}%` }}
        />
        <div
          className="report-bar-segment report-bar-critical"
          style={{ width: `${barSegments.criticalWidth}%` }}
        />
        <div
          className="report-bar-segment report-bar-high"
          style={{ width: `${barSegments.highWidth}%` }}
        />
      </div>
    )}

    {/* 🔽 nouvelle section : détails des vulnérabilités */}
    {report.vulnerabilities && report.vulnerabilities.length > 0 && (
      <div className="vuln-details">
        <h3>
          Détails des vulnérabilités ({report.vulnerabilities.length})
        </h3>

        <div className="vuln-table">
          {report.vulnerabilities.map((vuln, index) => (
            <div className="vuln-row" key={index}>
              <div className="v-col cve">{vuln.id}</div>
              <div className="v-col pkg">{vuln.package}</div>
              <div className="v-col ver">{vuln.version}</div>
              <div
                className={
                  "v-col sev " +
                  (vuln.severity
                    ? "sev-" + vuln.severity.toLowerCase()
                    : "")
                }
              >
                {vuln.severity}
              </div>
              {vuln.url && (
                <a
                  href={vuln.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="v-col link"
                  title="Voir le détail de la CVE"
                >
                  🔗
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}
        </section>
        
      </main>

      <footer className="hexalab-footer">
        Hexalab v1.0.0 – Analyse de firmwares en environnements différenciés
      </footer>
    </div>
  );
}

export default App;
