# EDPS Frontend Deployment

## Readiness

The frontend production build is deployable as a static Vite application. Full feature deployment is **not yet complete** because the current Spring Boot repository does not expose the `/api/ml/**` proxy routes used by Explainable AI and Federated Learning. The dashboard deliberately does not call FastAPI directly from the browser.

Production deployment also depends on HTTPS, the production Spring profile, valid MySQL configuration, and the existing shared HTTP Basic administrator. This is not a multi-user authentication system and should not be presented as one.

## Build and verify

Use the same supported Node version as CI (Node.js 22):

```powershell
npm ci
npm run lint
npm test
npm run build
```

The generated static site is in `dist/`. `VITE_API_BASE_URL` is embedded at build time. For example, set the production API origin in the build environment:

```powershell
$env:VITE_API_BASE_URL = "https://edps-api.example.edu"
npm run build
```

Do not place backend administrator credentials, database passwords, or other secrets in `VITE_*` variables; Vite exposes those values to browser clients.

## Backend and network configuration

1. Configure the Spring Boot `prod` profile with `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `CORS_ALLOWED_ORIGINS`, `APP_ADMIN_USERNAME`, and `APP_ADMIN_PASSWORD` through the deployment environment or secret manager.
2. Require TLS at the API and frontend ingress. HTTP Basic credentials must not be sent over plaintext transport.
3. Set `CORS_ALLOWED_ORIGINS` to the exact HTTPS frontend origin. The backend enables credentialed CORS and expects `Authorization`, `Content-Type`, and `X-XSRF-TOKEN`.
4. The frontend requests `GET /csrf` and sends its token on `POST`, `PUT`, and `DELETE`. Browser cross-origin cookie behavior must be tested with the real deployed origins.
5. Ensure `GET /actuator/health` is reachable for health checks. The frontend only reports database health when the response includes a database component; it does not infer database status.
6. Keep FastAPI private behind Spring Boot. The existing backend's `ML_SERVICE_URL` integration currently covers prediction calls only.
7. Before enabling the Explainable AI and Federated Learning pages in production, implement and secure Spring Boot routes for:
   - `GET /api/ml/explainability/global`
   - `POST /api/ml/explainability/individual`
   - `GET /api/ml/federated/results`

   Proxy responses must match the DTOs documented by the Python ML service. Add backend auth/CSRF policy and tests for those routes before deployment.

## Static host

Deploy the contents of `dist/` to the selected static host and configure SPA fallback to `index.html` if the host requires it. Configure the API origin before building. This project has not been deployed from this workspace; no cloud resources or credentials were used.

## Deployment checklist

- [ ] `npm ci`, lint, tests, and production build pass in CI.
- [ ] HTTPS frontend and API origins are configured.
- [ ] API CORS origin matches the deployed frontend exactly.
- [ ] Production admin credentials are delivered only through a secret manager.
- [ ] Spring Boot production authentication and CSRF flow has been exercised in a browser.
- [ ] Synthetic-only demonstration data is used.
- [ ] ML explainability/federated proxy routes are implemented and tested, or those pages are presented as unavailable.
- [ ] No live-hospital or decentralized-blockchain claim is made.
