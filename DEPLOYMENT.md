# EDPS Frontend Deployment

## Readiness

The frontend production build is deployable as a static Vite application. The Spring Boot backend provides the `/api/ml/**` health, explainability, and federated-results proxy routes used by the dashboard; the browser does not call FastAPI directly.

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
6. Keep FastAPI private behind Spring Boot. The backend's `ML_SERVICE_URL` integration covers prediction, health, explainability, and federated-results requests.
7. Keep the proxy routes protected by the Spring production authentication policy:
   - `GET /api/ml/explainability/global`
   - `POST /api/ml/explainability/individual`
   - `GET /api/ml/federated/results`

   Also verify `GET /api/ml/health`. Production reads require the configured administrator authentication; validate these routes after deployment.

## Static host

Deploy the contents of `dist/` to the selected static host and configure SPA fallback to `index.html` if the host requires it. Configure the API origin before building. This project has not been deployed from this workspace; no cloud resources or credentials were used.

## Deployment checklist

- [ ] `npm ci`, lint, tests, and production build pass in CI.
- [ ] HTTPS frontend and API origins are configured.
- [ ] API CORS origin matches the deployed frontend exactly.
- [ ] Production admin credentials are delivered only through a secret manager.
- [ ] Spring Boot production authentication and CSRF flow has been exercised in a browser.
- [ ] Synthetic-only demonstration data is used.
- [ ] ML health, explainability, and federated-results routes are reachable only through the authenticated Spring proxy and have been tested.
- [ ] No live-hospital or decentralized-blockchain claim is made.
