# EDPS Presentation Demo Guide

Use synthetic values only. Do not enter real patient names, contact details, or health records. EDPS output is an experimental academic estimate, not a medical diagnosis.

## Before the demonstration

1. Start MySQL and the Spring Boot backend according to `edps-backend/README.md`.
2. Start the Python ML service using its configured virtual environment:

   ```powershell
   Set-Location D:\Aca-proj\edps-ml-service
   .\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

3. Start the frontend:

   ```powershell
   Set-Location D:\Aca-proj\edps-frontend
   npm ci
   npm run dev
   ```

4. Open `http://localhost:5173`. For a development backend profile, API calls do not require login. For production profile, open **Service Health & Settings** and authenticate with the configured backend administrator credentials. They are held in memory only.
5. Verify the overview displays a backend health response and persisted patient/prediction counts. If unavailable, demonstrate the disconnected/error states rather than presenting sample content as live.

## Guided walkthrough

1. **Overview** — introduce the project, real backend totals, backend health response, recent saved predictions, risk distribution, and integrity status. Point out any disconnected services.
2. **Service Health & Settings** — show the Spring Boot actuator result. Database detail is reported only if exposed by Spring Boot. Explain that the FastAPI health proxy and ML proxy routes are not implemented in the current backend.
3. **Patient Management** — add a clearly synthetic record such as `Synthetic Demo A`, age `45`, gender `Female`, blood pressure `122`, glucose `105`, BMI `24.5`, heart rate `72`, cholesterol `185`. Leave phone/email blank. Confirm the row comes from the backend; refresh the page and verify it remains.
4. **Disease Risk Prediction** — select the saved backend patient, confirm the ID is selected, submit the feature snapshot, and show the returned risk and probability. The backend persists the prediction and history; selected-patient measurements are sent as the prediction snapshot.
5. **Prediction History** — open the new server-saved prediction, view its details, filter results, and optionally export CSV.
6. **Explainable AI** — distinguish global permutation importance from individual one-feature replacement sensitivity. The present Spring Boot app does not implement `/api/ml/explainability/global` or `/api/ml/explainability/individual`; the page must show the real unavailable response until those proxy routes are added. Do not substitute direct browser calls to FastAPI.
7. **Federated Learning** — show three generic simulated client slots and explain that they are synthetic partitions, not hospitals. The present Spring Boot app does not implement `/api/ml/federated/results`; metrics remain unavailable until that proxy exists.
8. **Integrity Audit** — run verification and only describe it as verified if the backend returns `valid: true`. Show checked record count, timestamp, any broken reference, and audit event history. Explain the centralized SHA-256 hash-linked prototype, not a decentralized chain.
9. **Architecture** — describe the frontend → Spring Boot → FastAPI prediction flow, MySQL patient/prediction persistence, and the current missing proxy routes for explainability/federated data. The Python FedAvg experiment is separate from the Random Forest inference model.

## Screenshot capture instructions

Capture only synthetic-data states. Use browser developer tools responsive mode and save screenshots outside source folders unless screenshots are intentionally added to project documentation.

| Screenshot | Viewport | Suggested page/state |
| --- | --- | --- |
| `edps-dashboard-desktop.png` | 1440 × 900 | Overview, service status, recent activity |
| `edps-patients-desktop.png` | 1366 × 768 | Patient directory with synthetic record |
| `edps-prediction-result.png` | 1366 × 900 | Returned prediction from a running backend/ML service |
| `edps-explainability.png` | 1366 × 900 | Global/individual charts only if proxy responses are available; otherwise capture explicit unavailable state |
| `edps-federated-mobile.png` | 390 × 844 | Simulation labels and actual proxy response or unavailable state |
| `edps-audit-tablet.png` | 768 × 1024 | Backend verification result and audit list |

Do not annotate an unavailable API response as a successful integration.
