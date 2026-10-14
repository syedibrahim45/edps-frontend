# EDPS Frontend Test Report

## Validation date

2026-10-14

## Automated checks

| Command | Result | Details |
| --- | --- | --- |
| `npm test` | Passed | 3 test files, 17 tests passed, 0 failed. |
| `npm run lint` | Passed | ESLint completed with no errors or warnings. |
| `npm run build` | Passed | Vite production build completed successfully. |

The test script uses Vitest with one fork worker and extended test/hook timeouts to run reliably in this Windows environment. The suite covers API errors, response validation, credentials/CSRF behavior, patient workflows, prediction form behavior, history details, Explainable AI and federated result rendering, integrity verification gating, and backend/ML service health. Component tests mock backend responses; they do not establish live integration with Spring Boot or MySQL.

## Browser and integration scope

On 2026-10-14, the frontend loaded in the integrated browser at `http://127.0.0.1:5173/`. The dashboard and Federated Learning page rendered. Since Spring Boot was not running, the browser showed `ERR_CONNECTION_REFUSED` and the explicit backend-unavailable state; it did not silently use FastAPI directly. A full patient/prediction/history/audit browser flow was not run because database credentials were not available to the test session.

FastAPI was started at `http://127.0.0.1:8000/` and verified directly: health, valid synthetic prediction, global explainability, individual explainability, and a completed 3-client/10-round synthetic FedAvg result returned valid data. An invalid prediction request returned HTTP 422. These direct checks do not constitute a live Spring-to-FastAPI proxy test. The Spring Boot source and tests include `/api/ml/health`, explainability, and federated-results proxies, but their live end-to-end operation and MySQL persistence remain unverified in this run.

## Reproduction

Run from the frontend repository root:

```sh
npm ci
npm test
npm run lint
npm run build
```

For live integration testing, start the documented backend services first, then run `npm run dev` and exercise the synthetic-data demo in `DEMO_GUIDE.md`.
