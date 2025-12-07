                                                        
 <img width="386" height="114" alt="ascii-art-text" src="https://github.com/user-attachments/assets/66b28d60-86fb-4bb8-9356-6bc270126269" />
 
 # Firmware & Driver Vulnerability Analyzer
 

Analyse automatisée des firmwares, drivers et archives techniques (BIN, IMG, ISO, DLL, SYS…) pour :

* détecter les vulnérabilités (CVE),
* extraire un SBOM complet,
* générer un rapport clair (API + PDF),
* proposer des pistes de remédiation.

> **Objectif : rendre l’analyse firmware accessible, rapide et utile pour la réparation numérique.**

---

## 📌 Table des matières

1. [🎯 Vision & Objectifs](#-1-vision--objectifs)
2. [🏗️ Architecture du projet](#️-2-architecture-du-projet)
3. [⚙️ Backend (FastAPI + Celery + Redis)](#️-3-backend--fastapi--celery--redis)
4. [🎨 Frontend (React + Vite)](#-4-frontend--react--vite)
5. [🔄 Pipeline complet d’un scan](#-5-pipeline-complet-dun-scan)
6. [📦 Format des rapports (API + PDF)](#-6-format-des-rapports-api--pdf)
7. [🧪 Tests unitaires (pytest)](#-7-tests-unitaires-pytest)
8. [🐳 Déploiement via Docker](#-8-déploiement-via-docker)
9. [📁 Structure du projet](#-9-structure-du-projet)
10. [🚀 Roadmap](#-10-roadmap--améliorations-futures)
11. [👥 Auteurs](#-11-auteurs)

---

# 🎯 1. Vision & Objectifs

HexaLab vise à :

* **Analyser automatiquement un firmware / driver**, même sans documentation.
* **Générer un SBOM complet** et structuré.
* **Détecter les vulnérabilités connues (CVE)** via des scanners automatisés.
* **Rendre accessible l’analyse firmware**, même pour les non-experts.
* **Favoriser la réparation numérique et réduire les déchets électroniques.**

> *“Redonner une seconde vie aux appareils dont le firmware n’est plus mis à jour.”*

---

# 🏗️ 2. Architecture du projet

```
Frontend (React)
        ↓
     API FastAPI
        ↓
   Celery Worker
        ↓
    SBOM Engine
        ↓
 Redis (Queue & Results)
```

### ✔️ Frontend (React)

* Upload drag & drop
* Suivi temps réel du scan
* Visualisations (badges, graphiques, tableaux)
* Export PDF

### ✔️ Backend API (FastAPI)

* `/scan/upload`
* `/scan/{id}/status`
* `/scan/{id}/report`
* Communication avec Celery

### ✔️ Worker (Celery)

* Exécute les analyses lourdes
* Extraction SBOM
* Détection CVE

### ✔️ Redis

* Message broker
* Stockage des résultats

### ✔️ SBOM Engine

* Dépendances
* Versions vulnérables
* Résumé du scan

---

# ⚙️ 3. Backend — FastAPI + Celery + Redis

### 📥 `POST /scan/upload`

* Enregistre le fichier dans `/data/uploads/<uuid>/`
* Crée un job Celery
* Retourne un `job_id`

### 🔁 `GET /scan/{job_id}/status`

Renvoie : `PENDING`, `STARTED`, `SUCCESS`, `FAILURE`

### 📤 `GET /scan/{job_id}/report`

Exemple :

```json
{
  "job_id": "...",
  "summary": "...",
  "total_vulns": 12,
  "critical": 3,
  "high": 4,
  "vulnerabilities": [...]
}
```

### 🧠 Exemple Worker Celery

```python
@celery_app.task
def sbom_scan_task(target_files: list[str]):
    return run_full_scan(target_files)
```

---

# 🎨 4. Frontend — React + Vite

### Fonctionnalités

* Upload drag & drop
* Informations fichier (nom, taille…)
* Bouton *Lancer le scan*
* Suivi du job en temps réel
* Résultats :

  * résumé clair
  * compteurs (total, critique, high…)
  * graphe de répartition
  * tableau détaillé (CVE, package, version…)
* Export PDF via `window.print()`

### Contenu du PDF

* Titre / logo HexaLab
* Meta (fichier, job ID, date)
* Résumé du scan
* Métriques
* Tableau vulnérabilités
* Annexe : JSON brut formaté

---

# 🔄 5. Pipeline complet d’un scan

1. L’utilisateur upload son fichier.
2. Le frontend appelle `POST /scan/upload`.
3. L’API stocke le fichier + crée un job Celery.
4. Le worker exécute :

   * extraction SBOM
   * détection CVE
   * analyse des dépendances
   * génération du résumé
5. Le frontend interroge `/status`.
6. Une fois terminé → récupération du rapport.
7. Affichage + export PDF.

---

# 📦 6. Format des rapports (API + PDF)

### JSON retourné par l’API

```json
{
  "job_id": "string",
  "summary": "Résumé textuel du scan",
  "total_vulns": 12,
  "critical": 3,
  "high": 4,
  "vulnerabilities": [
    {
      "id": "CVE-2020-8203",
      "package": "lodash",
      "version": "4.17.19",
      "severity": "High",
      "url": "https://github.com/advisories/GHSA-35jh-r3h4-6jhm"
    }
  ]
}
```

### Contenu du PDF

* Header "HEXALAB – Rapport de scan"
* Résumé + métriques
* Tableau des vulnérabilités
* Annexe JSON

---

# 🧪 7. Tests unitaires (pytest)

Structure des tests :

```
Backend/tests/
├── test_api_client.py
├── test_api_import.py
├── test_basic.py
├── test_sanity.py
└── test_worker_import.py
```

### Améliorations possibles

* Tests d’upload (fichier factice)
* Tests `status` + `report` avec `job_id` fictif
* Tests du moteur SBOM (`run_full_scan`)
* Tests d’intégration API + Celery + Redis (Docker)

---

# 🐳 8. Déploiement via Docker

### Architecture des conteneurs

```
api     → FastAPI
worker  → Celery
redis   → Message broker + résultats
data    → Volume persistant
```

### Commandes

```bash
cd Backend
docker compose up --build
docker compose ps
docker compose logs -f worker
```

### Volumes importants

* `/data/uploads` → fichiers uploadés
* `/data/redis` → données Redis

⚠️ Ne pas supprimer `/data/redis` pendant un run.
✔️ On peut nettoyer `/data/uploads` sans risque.

---

# 📁 9. Structure du projet

```
HexaLab_V1/
│
├── Backend/
│   ├── app/
│   │   ├── api.py
│   │   ├── worker.py
│   │   ├── models.py
│   │   ├── config.py
│   │   └── ...
│   ├── sbom/
│   │   └── sbom_engine.py
│   ├── data/
│   │   ├── uploads/
│   │   └── redis/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── Frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── ...
│   ├── public/
│   │   └── hexalab_logo.png
│   └── vite.config.js
│
└── README.md
```

---

# 🚀 10. Roadmap & améliorations futures

### Court terme

* Support formats supplémentaires (ISO, IMG…)
* Scan multi-fichiers
* Visualisations avancées (heatmap, graphes)

### Moyen terme

* Comptes utilisateurs
* Historique + comparaison de versions
* Export avancé (JSON, CSV, SPDX…)

### Long terme

* Support complet **CycloneDX / SPDX**
* Suggestions automatiques de remédiation
* Intégration CI/CD + systèmes de ticketing

---

# 👥 11. Auteurs

* **Jericho Cortez** — Frontend, UX & intégration React
* **3uthym3nes** — Backend, API, Celery & architecture globale
* **ChatGPT** — Support, documentation & assistance technique

---
