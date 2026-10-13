# EDPS Frontend

The EDPS frontend is an academic demonstration UI for the Spring Boot API and its Python prediction service. The existing dashboard, patient directory, prediction, history, simulated node directory, integrity audit, analytics, and project information screens are retained.

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
npm run build
```

The API defaults to `http://localhost:8080`. To configure a different backend, copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL`:

```dotenv
VITE_API_BASE_URL=http://localhost:8080
```

Restart Vite after changing environment variables. The frontend does not persist patient or prediction records in browser storage; the Spring Boot backend/MySQL is authoritative. The optional symptom notes and temperature shown with a prediction are held only in the current page state and are not part of the backend prediction request.

## Backend API contract used by this frontend

The API client is in `src/api.js`. It uses JSON over HTTP and these Spring Boot endpoints:

| Operation | Endpoint |
| --- | --- |
| List/create patients | `GET /patients`, `POST /patients` |
| Update/delete patient | `PUT /patients/{id}`, `DELETE /patients/{id}` |
| Submit/list predictions | `POST /predictions`, `GET /predictions` |
| Delete a prediction | `DELETE /predictions/{id}` |
| Verify audit-chain integrity | `GET /integrity/audit/verify` |

Patient records use the backend patient fields: `name`, `age`, `gender`, `phone`, `email`, `bloodPressure`, `glucose`, `bmi`, `heartRate`, and `cholesterol`. The prediction request matches `PredictionRequest`: `{ "patientId": 123, "patient": { ... } }`; `patientId` may be omitted for a new patient, or may match the nested patient's `id` for an existing record. The frontend sends `"Male"` or `"Female"` as the patient gender string. Spring maps male to model code `0` and female to `1` before forwarding snake_case feature keys to Python.

Prediction values are numeric: age is an integer (1–120); blood pressure 40–300; glucose 20–1000; BMI 5–100; heart rate 20–250; cholesterol 50–1000. The form validates against the Python model schema. Returned probabilities in the `[0, 1]` range are displayed as percentages; values already expressed as percentages are also supported.

The prediction response includes the persisted prediction ID, disease type, prediction result, risk level, probability, creation time, and patient. History and dashboard summaries are reloaded from `GET /predictions`; CSV export uses those backend records. Since the backend exposes per-record deletion rather than a collection `DELETE`, the history clear action deletes returned IDs individually.

The audit endpoint returns an integrity summary (`valid`, `checkedRecords`, `brokenReference`, and `verifiedAt`). The audit screen reports only that backend verification result; prediction history is not represented as verified audit evidence. The service implements a MySQL-backed SHA-256 hash chain for this academic demonstration, not a distributed blockchain network. The hospital-node cards are sample/simulated and do not represent live federated clients.

## Running with the backend

Start the Python ML service and Spring Boot backend using their own project instructions, then start Vite. The backend's development profile permits local API requests. Its production profile uses HTTP Basic authentication; this frontend intentionally does not implement a login or store credentials, so production-authenticated deployment requires an approved authentication integration. Ensure the backend CORS allowed origins include the Vite origin (`http://localhost:5173`) when using a different frontend host.

## Known backend limitations

- The prediction response DTO currently contains no per-prediction explainability values. The UI displays explainability only if the backend response provides it; the Python global feature-importance route is not currently proxied by Spring Boot.
- Integrity verification is returned as a chain-level summary rather than an item-by-item audit verification list.
- Authentication is not implemented in the frontend. The current app does not claim secure login, live hospital connectivity, or a deployed blockchain.
