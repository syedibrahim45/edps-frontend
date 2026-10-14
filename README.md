# EDPS Frontend

The EDPS frontend is an academic demonstration UI for the Spring Boot API and its Python prediction service. It includes the overview, patient management, disease prediction, prediction history, Explainable AI, federated learning, simulated node, integrity audit, service health/settings, analytics, and project information screens.

> **Academic disclaimer:** EDPS predictions are not medical diagnoses. Do not use them to make treatment decisions or delay professional or emergency care.

## Start the frontend

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173` by default. For validation and a production build:

```sh
npm run lint
npm test
npm run build
```

The API defaults to `http://localhost:8080`. To configure a different backend, copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL`:

```dotenv
VITE_API_BASE_URL=http://localhost:8080
```

Restart Vite after changing environment variables. The frontend does not persist patient or prediction records or authentication credentials in browser storage; Spring Boot/MySQL is authoritative. Production HTTP Basic credentials and the CSRF token are held in JavaScript memory for the current tab only, and are cleared when the page reloads or the user signs out. The optional symptom notes and temperature shown with a prediction are held only in current page state and are not part of the backend prediction request.

## Backend API contract used by this frontend

The API client is in `src/api.js`. It uses JSON over HTTP and these Spring Boot endpoints:

| Operation | Endpoint |
| --- | --- |
| List/create patients | `GET /patients`, `POST /patients` |
| Update/delete patient | `PUT /patients/{id}`, `DELETE /patients/{id}` |
| Submit/list predictions | `POST /predictions`, `GET /predictions` |
| Delete a prediction | `DELETE /predictions/{id}` |
| Verify audit-chain integrity | `GET /integrity/audit/verify` |
| List audit events | `GET /integrity/audit/records` |
| Service health | `GET /actuator/health` |
| Production CSRF token | `GET /csrf` |

Patient records use the backend patient fields: `name`, `age`, `gender`, `phone`, `email`, `bloodPressure`, `glucose`, `bmi`, `heartRate`, and `cholesterol`. The prediction request matches `PredictionRequest`: `{ "patientId": 123, "patient": { ... } }`; `patientId` may be omitted for a new patient, or may match the nested patient's `id` for an existing record. The frontend sends `"Male"` or `"Female"` as the patient gender string. Spring maps male to model code `0` and female to `1` before forwarding snake_case feature keys to Python.

Prediction values are numeric: age is an integer (1–120); blood pressure 40–300; glucose 20–1000; BMI 5–100; heart rate 20–250; cholesterol 50–1000. The form validates against the Python model schema. Returned probabilities in the `[0, 1]` range are displayed as percentages; values already expressed as percentages are also supported.

The prediction response includes the persisted prediction ID, disease type, prediction result, risk level, probability, creation time, and patient. History and dashboard summaries are reloaded from `GET /predictions`; CSV export uses those backend records. Since the backend exposes per-record deletion rather than a collection `DELETE`, the history clear action deletes returned IDs individually.

The audit verify endpoint returns an integrity summary (`valid`, `checkedRecords`, `brokenReference`, and `verifiedAt`); the records endpoint returns audit event/reference and hash-chain fields. The audit screen reports only backend verification results; prediction history is not represented as verified audit evidence. The service implements a MySQL-backed SHA-256 hash chain for this academic demonstration, not a distributed blockchain network. Federated client cards are generic simulated slots and do not represent live hospitals.

## Running with the backend

Start MySQL, the Python ML service, and Spring Boot using their respective repository instructions, then start Vite:

```powershell
# In the backend repository, configure DB_URL, DB_USERNAME, DB_PASSWORD and SPRING_PROFILES_ACTIVE=dev.
.\mvnw.cmd spring-boot:run

# In the ML service repository, activate its configured Python environment and start FastAPI on port 8000.
uvicorn app.main:app --host 127.0.0.1 --port 8000

# In this repository:
npm run dev
```

The backend `dev` profile permits local API requests. In production, use the Service Health & Settings page to authenticate with the existing HTTP Basic administrator. The frontend first obtains `/csrf`, includes the CSRF token on writes, and retains credentials only in memory. Use HTTPS and configure `CORS_ALLOWED_ORIGINS` for the exact frontend origin. Do not use the shared demonstration administrator as a real multi-user identity system.

### Dashboard pages

- Overview: backend patient/prediction totals, saved-result risk distribution, recent predictions, backend health, and latest integrity verification.
- Patients and Disease Prediction: backend CRUD and prediction submission, with numeric feature validation and selected patient IDs.
- Prediction History and Analytics: persisted backend prediction responses, details, filtering, and CSV export.
- Explainable AI and Federated Learning: use the Spring proxy routes listed below; no direct browser-to-FastAPI fallback is made.
- Integrity Audit: chain verification and backend event history.
- Service Health & Settings: `/actuator/health`, reported database health details when available, production authentication, and route readiness.

### ML proxy routes still required

The current Spring Boot repository does **not** implement any `/api/ml/**` controller or proxy routes. The frontend is prepared to request:

| Intended frontend request | Python service source route | Current status |
| --- | --- | --- |
| `GET /api/ml/explainability/global` | `GET /explainability/global` | Spring proxy not implemented |
| `POST /api/ml/explainability/individual` | `POST /explainability/individual` | Spring proxy not implemented |
| `GET /api/ml/federated/results` | `GET /federated/results` | Spring proxy not implemented |

The frontend therefore shows the actual HTTP failure and does not call FastAPI directly. The expected transparent proxy response schemas are validated against the ML service's Pydantic response models. Spring Boot must implement these proxy endpoints (including production authentication/authorization) before the feature dashboards can display results.

## Known backend limitations

- The Spring Boot repository currently has no proxy for Python ML health, explainability, or federated-results routes. The Explainable AI and Federated Learning pages surface this as unavailable until implemented.
- Actuator health may omit database component details depending on the backend management configuration; the frontend reports “Not reported” rather than inferring database state.
- Integrity verification is returned as a chain-level summary. Audit record history is separately fetched from `/integrity/audit/records`.
- Production authentication is one shared HTTP Basic administrator, not per-user login or authorization. Configure TLS for production; credentials remain only in tab memory.
- No live hospital clients are connected. The three client cards are simulation labels only.
