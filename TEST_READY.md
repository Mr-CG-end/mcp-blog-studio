# TEST_READY — E2E Test Suite for Shiro Blog Frontend Integration

## Status: READY ✅
- Date: 2026-09-30
- Architect: `test_writer_e2e`
- Test Suite Path: `tests/e2e/`
- Verification Status: 100% Executable, Types Validated (`tsc --noEmit`), Lint Clean (`eslint tests/e2e`), 147 Total Playwright Tests Discovered.

---

## 1. Feature Coverage Matrix (Tiers 1 - 4)

| # | Feature | Spec Source | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Cross) | Tier 4 (Scenario) | Status |
|---|---------|-------------|:-----------------:|:-----------------:|:--------------:|:-----------------:|:------:|
| 1 | Shiro Design System & Theme | R1 / PROJECT § 20 | 5 tests | 5 tests | ✓ (3.1, 3.8) | ✓ (S1, S5) | READY |
| 2 | Layout Shell & Navigation | R1 / PROJECT § 20 | 5 tests | 5 tests | ✓ (3.1, 3.7) | ✓ (S1, S5) | READY |
| 3 | Payload Data Adapter | R2 / PROJECT § 20 | 5 tests | 5 tests | ✓ (3.4, 3.5) | ✓ (S3, S4) | READY |
| 4 | Core Routes & Pages | R2 / PROJECT § 20 | 6 tests | 5 tests | ✓ (3.2, 3.3) | ✓ (S1, S6) | READY |
| 5 | Module Pruning | R2 / PROJECT § 20 | 6 tests | 5 tests | ✓ (3.5, 3.11)| ✓ (S3, S6) | READY |
| 6 | Lexical to Markdown Adapter | R3 / PROJECT § 20 | 5 tests | 5 tests | ✓ (3.6) | ✓ (S4) | READY |
| 7 | Shiro Article Reader | R3 / PROJECT § 20 | 5 tests | 5 tests | ✓ (3.3, 3.6, 3.9) | ✓ (S2, S4) | READY |
| 8 | Code Syntax Highlighting | R3 / PROJECT § 20 | 5 tests | 5 tests | ✓ (3.6) | ✓ (S2) | READY |
| 9 | TOC & Reading Progress | R3 / PROJECT § 20 | 5 tests | 5 tests | ✓ (3.8) | ✓ (S1, S5) | READY |
| 10| Post Detail Page Integration | R3 / PROJECT § 20 | 5 tests | 5 tests | ✓ (3.2, 3.9, 3.10)| ✓ (S1, S2, S4) | READY |
| 11| Build & Typecheck Health | R4 / PROJECT § 20 | 5 tests | 5 tests | ✓ (3.11) | ✓ (S1-S6) | READY |
| 12| Payload Admin Coexistence | R4 / PROJECT § 20 | 5 tests | 5 tests | ✓ (3.4, 3.5, 3.10)| ✓ (S4) | READY |

### Coverage Totals
- **Tier 1 (Feature Coverage)**: 62 tests (Threshold: >= 60)
- **Tier 2 (Boundary & Corner Cases)**: 60 tests (Threshold: >= 60)
- **Tier 3 (Cross-Feature Interactions)**: 12 tests (Threshold: >= 10)
- **Tier 4 (Real-World Scenarios)**: 6 user journeys (Threshold: >= 6)
- **Total Test Suite Volume**: 140 new Shiro integration tests (+ 7 existing base tests = 147 tests)

---

## 2. Test File Inventory

| File Path | Description | Test Count |
|-----------|-------------|:----------:|
| `tests/e2e/tier1-features.spec.ts` | Primary behavior coverage for Features 1 - 12 | 62 tests |
| `tests/e2e/tier2-boundaries.spec.ts` | Edge cases, null-safety, extreme inputs, adversarial tests | 60 tests |
| `tests/e2e/tier3-interactions.spec.ts` | Cross-module flows (theme persistence, category navigation, search to reader) | 12 tests |
| `tests/e2e/tier4-scenarios.spec.ts` | Real-world visitor & author journeys (Scenarios 1 - 6 from TEST_INFRA.md) | 6 tests |
| `tests/e2e/helpers/contracts.ts` | Dynamic interface contract loader supporting progressive testability | Helper |
| `tests/e2e/runner.ts` | Unified matrix audit & verification runner | Executable |

---

## 3. How to Run the Tests

### Single-Command Unified Audit & Runner
```bash
pnpm exec tsx tests/e2e/runner.ts
```
Verifies file presence, audits feature-by-feature coverage goals against `PROJECT.md`, validates Playwright parser integrity, and exits 0 on success.

### Playwright Discovery & List Verification
```bash
pnpm exec playwright test --list
```
Lists all 147 registered tests across the 7 spec files.

### Playwright E2E Execution (against running app)
```bash
pnpm test:e2e
```
Or for specific tiers:
```bash
pnpm exec playwright test tests/e2e/tier1-features.spec.ts
pnpm exec playwright test tests/e2e/tier2-boundaries.spec.ts
pnpm exec playwright test tests/e2e/tier3-interactions.spec.ts
pnpm exec playwright test tests/e2e/tier4-scenarios.spec.ts
```

### Static Typecheck Verification
```bash
pnpm typecheck
```

### Linter Verification
```bash
pnpm exec eslint tests/e2e
```

---

## 4. Progressive Testability Design

To adhere to the progressive testability guideline during milestone implementation:
- Tests for features from upcoming milestones (e.g. `shiroAdapter.ts` in M2, `lexicalToMarkdown.ts` in M3) use dynamic loaders in `tests/e2e/helpers/contracts.ts` with `test.skip(!adapter, ...)`.
- As soon as Worker M2 or Worker M3 creates the respective module, the tests automatically activate and verify the real logic without needing any test modifications.

---

## 5. Escalated Implementation Observations

1. **React 19 / ESLint set-state-in-effect Warnings in M1 Components**:
   - `src/components/shiro/layout/HeaderDrawerButton.tsx:12:5`
   - `src/components/shiro/ui/SearchFAB.tsx:34:7`
   - `src/components/shiro/ui/ThemeSwitcher.tsx:106:5`
   - `src/components/shiro/ui/sheet/Sheet.tsx:67:7`
   - Rule `react-hooks/set-state-in-effect`: Calling `setState` synchronously within an effect triggers cascading renders.
   - Escalated to: Worker M1 / implementing agent to adjust state synchronization or initialize state during render.
