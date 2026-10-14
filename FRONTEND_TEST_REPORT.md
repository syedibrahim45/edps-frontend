# EDPS Frontend Test Report

## Validation date

2026-10-14

## Automated checks

| Command | Result | Details |
| --- | --- | --- |
| `npm test` | Passed | 3 test files, 16 tests passed, 0 failed. |
| `npm run lint` | Passed | ESLint completed with no errors or warnings. |
| `npm run build` | Passed | Vite production build completed successfully. |

The test script uses Vitest with one fork worker and extended test/hook timeouts to run reliably in this Windows environment. The suite covers API errors, response validation, credentials/CSRF behavior, patient workflows, prediction form behavior, history details, Explainable AI and federated result rendering, integrity verification gating, and service health/settings. Component tests mock backend responses; they do not establish live integration with Spring Boot, MySQL, or the ML service.

## Browser and integration scope

A local Vite browser smoke check succeeded at desktop load and a 390 × 844 mobile viewport. Navigation to Federated Learning rendered the expected page, the three client cards were explicitly marked simulated, and the backend-unavailable state appeared when the configured Spring Boot service could not be reached. This was a UI smoke check only, not a backend-backed end-to-end test. No real Spring Boot, MySQL, or Python ML-service-backed workflow was run.

Backend/ML integration status is therefore based on source-contract inspection, not a live-service test. The Spring Boot repository supports patient and prediction APIs, audit verification/history, actuator health, and production CSRF. It does not currently implement the frontend's intended `/api/ml/explainability/global`, `/api/ml/explainability/individual`, `/api/ml/federated/results`, or a FastAPI health proxy. Those pages surface unavailable responses rather than manufacturing successful results or bypassing Spring Boot.

## Reproduction

Run from the frontend repository root:

```sh
npm ci
npm test
npm run lint
npm run build
```

For live integration testing, start the documented backend services first, then run `npm run dev` and exercise the synthetic-data demo in `DEMO_GUIDE.md`.
