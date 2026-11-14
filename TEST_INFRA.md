# E2E Test Infrastructure & Specification (算数探検ラボ)

## 1. Overview & Architecture
This test suite provides comprehensive opaque-box End-to-End (E2E) testing for the Elementary 4th Grade Math Step-Up Learning Web Application (小学4年生向け 四則演算ステップアップ学習Webアプリ「算数探検ラボ」).

All tests are authored using Node.js native `node:test` and `node:assert` modules without requiring external npm packages, guaranteeing 100% autonomous execution in isolated environments.

### Execution Command
```bash
node --test tests/e2e/*.test.js
```

---

## 2. 4-Tier Test Suite Structure

The E2E suite is partitioned into four rigorous testing tiers across `tests/e2e/`:

```
tests/e2e/
├── tier1-feature-coverage.test.js      # Tier 1: Equivalence class coverage (>=5 cases per feature across 25 features)
├── tier2-boundary-corner.test.js       # Tier 2: Boundary & corner cases (>=5 cases per feature across 25 features)
├── tier3-cross-feature.test.js         # Tier 3: Pairwise cross-feature interactions
└── tier4-application-scenarios.test.js  # Tier 4: Real-world child & parent learning journeys
```

### Tier 1: Feature Coverage (Features 1 - 25)
- **F1 (World 1 - Addition & Subtraction Lab)**: 3-4 digit addition with carries, subtraction with multi-borrowing across zeroes, reverse missing-number equations (`□`).
- **F2 (World 2 - Multiplication Power Lab)**: Multiples of 10/100, 2-3 digit × 1 digit with carries, 2 digit × 2 digit partial products with positional shift.
- **F3 (World 3 - Division & Remainder Lab)**: Division with remainder condition (`remainder < divisor`), 2-digit ÷ 1-digit long division, 3-digit ÷ 1-digit with intermediate zero in quotient.
- **F4 (World 4 - 2-Digit Division & Estimation Lab)**: Multiples of 10 division with remaining tens, 2-digit ÷ 2-digit round-number trial quotient, self-correction of trial quotient (`±1`).
- **F5 (World 5 - Order of Operations & Mixed Operations Lab)**: Parentheses priority, `×`/`÷` before `+`/`-`, distributive/associative mental math simplifications (`25 × 4`).
- **F6 (Adaptive 5-Question Stage Flow)**: Q1 warmup, Q2 standard benchmark, Q3 diagnostic branching, Q4/Q5 consolidation and adaptive level adjustment.
- **F7 (Step Breakdown Generator)**: Scaffolding data structure generation for addition, subtraction, multiplication, and long division.
- **F8 (Review Variation Generator)**: Arithmetic trap and difficulty preservation in generated variation problems.
- **F9 (Node.js Backend Server)**: Static file serving, `/api/progress` GET, atomic POST persistence.
- **F10 (3-Tier Storage Service)**: Instant localStorage cache, asynchronous server sync, JSON backup import/export, 8-character transfer code (`LAB-XXXX-XXXX`).
- **F11 (Web Audio Sound Synthesizer)**: Procedural tone synthesis for tap, correct, near-miss, self-correction, stage clear, stamp, and badge.
- **F12 (Web Speech API Integration)**: Japanese TTS configuration, card reading, question narration, fallback on unsupported environments.
- **F13 (Gamification Engine)**: 10 ranks, 8 badges, 3-star stage evaluation, self-correction count and point bonuses.
- **F14 (Tablet Canvas Memo Pad)**: HiDPI scaling, pointer events, grid toggle, column layout assistance, clear and undo states.
- **F15 (Virtual 10-Key Keypad)**: 10-key numeric input, backspace, clear, remainder toggle, touch sizing compliance (>=48px).
- **F16 (Hybrid Step Guide UI)**: Modal scaffolding launch on mistake or help request, step-by-step blank verification.
- **F17 (No-X Feedback Toast)**: Rejection of "❌", affirmative messaging ("おしい！もう一歩！", "ヒント発見！"), shake animation trigger.
- **F18 (Modern CSS Design System)**: Color palette (smart lab theme), responsive tablet grid/flexbox, accessibility standards.
- **F19 (1-Minute Mini-Lesson View)**: 3-step structured cards, interactive 2-choice quiz gating, completion flag persistence.
- **F20 (Stage Map & World Navigator)**: 5-world navigation, progressive stage unlocking, star indicators, researcher badge displays.
- **F21 (Power-Up Treasure Box)**: Incorrect problem quarantine, 2-consecutive variation clear requirement for "Complete Mastery".
- **F22 (Parent Cheer Board)**: 4-digit PIN authentication, 5-dimension radar chart data, self-correction metric, cheer stamp messaging.
- **F23 (App Shell & Router)**: SPA view switching, hash/state routing, offline status handling.
- **F24 (Package & Vite Configuration)**: ESM module conformity, zero external runtime dependency, scripts definition.
- **F25 (E2E Testing & Hardening)**: Complete test suite orchestration, assertions validation, test runner integrity.

---

## 3. Tier 2: Boundary & Corner Cases Checklist
- Zero operands and identity elements (`+ 0`, `- 0`, `× 0`, `× 1`, `÷ 1`).
- Maximum 4th-grade arithmetic bounds (sums up to 19,998, 4-digit subtractions, 2-digit × 2-digit max 9801).
- Division edge cases: minimum remainder (1), maximum remainder (`divisor - 1`), quotient with internal/trailing zeroes (`604 ÷ 6`, `624 ÷ 3`).
- Continuous borrows across consecutive zeroes (`1000 - 364`, `5004 - 1238`).
- Order of operations boundary cases: multiple parentheses, division resulting in fractions prevented (integer only).
- Storage edge cases: corrupted JSON handling, missing fields, storage quota simulation, invalid transfer codes.
- Input validation: rapid multiple taps, non-numeric input prevention, remainder entered without quotient.

---

## 4. Tier 3: Cross-Feature Interaction Matrix
- **Interaction 1 (Curriculum -> Step Guide -> Keypad -> Toast)**: Incorrect answer triggers step guide modal with specific scaffolding matching the math trap.
- **Interaction 2 (Step Guide -> Gamification -> Parent Board)**: Successfully solving via step guide increments `selfCorrectionCount` and awards bonus points on parent analytics.
- **Interaction 3 (Curriculum -> Treasure Box -> Variation Generator)**: Mistake registers into treasure box; launching treasure box invokes variation generator preserving math trap.
- **Interaction 4 (Storage Service -> Backend Server -> Transfer Code)**: Data saved locally syncs to `/api/progress` and validates transfer code round-trip restore.
- **Interaction 5 (Mini-Lesson -> Speech Service -> Stage Map)**: Mini-lesson quiz completion marks stage ready, reads TTS narration, updates world map status.

---

## 5. Tier 4: Real-World User Scenarios
- **Scenario A (First-Time Student Journey)**: Student starts World 1 Stage 1, completes 1-minute mini-lesson, answers 5 adaptive questions, uses handwriting memo pad, clears stage with 3 stars.
- **Scenario B (Struggling Learner Self-Correction)**: Student encounters 2-digit division (`87 ÷ 29`), overestimates quotient to 4, receives encouraging toast ("おしい！"), uses step-guide to adjust quotient to 3, achieves self-correction bonus.
- **Scenario C (Treasure Box Mastery Flow)**: Student revisits stored mistake in Power-Up Treasure Box, solves 2 variation problems consecutively, achieves "完全マスター！".
- **Scenario D (Parent Review & Multi-Device Transfer)**: Parent enters 4-digit PIN to access Cheer Board, reviews radar chart & self-correction log, sends cheer stamp, exports JSON backup and tests 8-digit transfer code.
