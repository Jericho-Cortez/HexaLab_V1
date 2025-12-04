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
  const downloadPdf = () => {
  if (!report) return;

  const now = new Date().toLocaleString();
  const fileName = file ? file.name : "Fichier inconnu";
  const job = jobId || "N/A";

  const vulnRows = (report.vulnerabilities || [])
    .map(
      (v) => `
        <tr>
          <td>${v.id || ""}</td>
          <td>${v.package || ""}</td>
          <td>${v.version || ""}</td>
          <td>${v.severity || ""}</td>
          <td>${v.url ? v.url : ""}</td>
        </tr>
      `
    )
    .join("");

  const rawJson = JSON.stringify(report, null, 2);

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Rapport Hexalab</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #050716;
            color: #f5f7ff;
            padding: 24px;
          }
          h1, h2, h3 {
            margin-top: 0;
          }
          .header {
            text-align: center;
            margin-bottom: 24px;
          }
          .logo-title {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 3px;
          }
          .meta {
            font-size: 13px;
            color: #c0c4f0;
            margin-bottom: 18px;
          }
          .summary-box {
            border-radius: 12px;
            border: 1px solid #3c4680;
            padding: 12px 14px;
            margin-bottom: 18px;
            background: #050716;
            font-size: 14px;
          }
          .summary-grid {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            margin-top: 8px;
          }
          .summary-item {
            min-width: 120px;
          }
          .label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #9ca3c9;
          }
          .value {
            font-size: 18px;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #262b46;
            padding: 6px 8px;
          }
          th {
            background: #10152f;
            text-align: left;
          }
          tbody tr:nth-child(even) {
            background: #080b22;
          }
          .annexe {
            margin-top: 28px;
            font-size: 11px;
          }
          pre {
            background: #050716;
            border-radius: 10px;
            border: 1px solid #262b46;
            padding: 10px;
            white-space: pre-wrap;
            word-break: break-word;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-title">HEXALAB – Rapport de scan</div>
        </div>

        <div class="meta">
          <div><b>Fichier :</b> ${fileName}</div>
          <div><b>Job ID :</b> ${job}</div>
          <div><b>Date du rapport :</b> ${now}</div>
        </div>

        <div class="summary-box">
          <div><b>Résumé :</b> ${report.summary || "N/A"}</div>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="label">Total vulnérabilités</div>
              <div class="value">${report.total_vulns ?? 0}</div>
            </div>
            <div class="summary-item">
              <div class="label">Critiques</div>
              <div class="value">${report.critical ?? 0}</div>
            </div>
            <div class="summary-item">
              <div class="label">High</div>
              <div class="value">${report.high ?? 0}</div>
            </div>
          </div>
        </div>

        <h2>Détails des vulnérabilités (${(report.vulnerabilities || []).length})</h2>

        <table>
          <thead>
            <tr>
              <th>CVE / ID</th>
              <th>Package</th>
              <th>Version</th>
              <th>Gravité</th>
              <th>Référence</th>
            </tr>
          </thead>
          <tbody>
            ${vulnRows || "<tr><td colspan='5'>Aucune vulnérabilité détectée.</td></tr>"}
          </tbody>
        </table>

        <div class="annexe">
          <h3>Annexe – Données brutes du rapport (JSON)</h3>
          <pre>${rawJson}</pre>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print(); // l’utilisateur choisit "Enregistrer au format PDF"
};


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
    <div className="report-header">
    <h2>Résultat du scan</h2>
    <button className="secondary-btn" onClick={downloadPdf}>
        Télécharger le rapport (PDF)
      </button>
    </div>
    
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
