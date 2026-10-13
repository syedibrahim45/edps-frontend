# EDPS Frontend Test Report

## Validation performed

Executed from the project root:

```bash
npm install
npm run lint
npm run build
npx vitest run --pool=threads --maxWorkers=1
```

## Results

### Lint
- Status: passed
- Command: `npm run lint`
- Result: ESLint completed with no errors or warnings.

### Production build
- Status: passed
- Command: `npm run build`
- Result: Vite production build succeeded in 992ms.

### Test suite
- Status: passed
- Command: `npx vitest run --pool=threads --maxWorkers=1`
- Result: 1 test file passed, 6 tests passed.

## Test coverage included
- API error handling
- backend validation error reporting
- network downtime messaging
- request timeout handling
- audit/explainability/simulation schema validation
- probability normalization

## Notes
- A default Vitest worker fork timeout occurred with the default runner on this environment; the suite was re-run in a single worker configuration to complete successfully.
- The frontend remains intentionally honest about unavailable backend/ML services and does not fabricate data or mark simulated results as live.
