/**
 * Tier 2: Boundary & Corner Cases Test Suite (算数探検ラボ)
 *
 * Verifies all 25 features (F1 - F25) against boundary conditions, edge cases,
 * arithmetic limits, and malformed inputs (>= 5 test cases per feature, 125+ total).
 * Uses native node:test and node:assert/strict.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadCurriculumEngine,
  loadStorageService,
  loadSoundEffects,
  loadSpeechService,
  loadGamificationEngine,
  MockLocalStorage,
  MockAudioContext,
  MockSpeechSynthesis,
  MockSpeechSynthesisUtterance,
  ServerContractReference,
  CanvasPadReference,
  KeypadReference,
  StepGuideReference,
  ToastFeedbackReference,
  DesignSystemReference,
  MiniLessonReference,
  StageMapReference,
  TreasureBoxReference,
  ParentBoardReference,
  RouterReference,
  PackageConfigReference
} from './test-helpers.js';

describe('Tier 2: Boundary & Corner Cases (F1 - F25)', async () => {
  const curriculum = await loadCurriculumEngine();
  const storage = await loadStorageService();
  const soundSynth = await loadSoundEffects();
  const speech = await loadSpeechService();
  const gamification = await loadGamificationEngine();

  // =========================================================================
  // F1: World 1 Addition/Subtraction Boundaries
  // =========================================================================
  describe('F1: World 1 Addition & Subtraction Boundaries', () => {
    it('F1-B1: handles zero operand identity boundaries (+ 0 and - 0)', () => {
      const addZero = { operands: [450, 0], operator: '+', expectedAnswer: 450 };
      const subZero = { operands: [450, 0], operator: '-', expectedAnswer: 450 };
      assert.equal(curriculum.evaluateAnswer(addZero, 450), true);
      assert.equal(curriculum.evaluateAnswer(subZero, 450), true);
      const steps = curriculum.generateStepBreakdown(addZero);
      assert.equal(steps[0].expectedStepValue, 0);
    });

    it('F1-B2: evaluates maximum 4-digit addition boundary (9999 + 9999 = 19998)', () => {
      const maxAdd = {
        operands: [9999, 9999],
        operator: '+',
        expectedAnswer: 19998,
        commonTrap: { mistakeValue: 18998, diagnosis: 'くり上がり忘れ', hintMessage: 'くり上がりをたそう' }
      };
      assert.equal(curriculum.evaluateAnswer(maxAdd, 19998), true);
      assert.equal(curriculum.evaluateAnswer(maxAdd, 19997), false);
      const steps = curriculum.generateStepBreakdown(maxAdd);
      assert.equal(steps[0].expectedStepValue, 8); // (9 + 9) % 10 = 8
      assert.equal(steps[1].expectedStepValue, 9); // (9 + 9 + 1) % 10 = 9
    });

    it('F1-B3: handles continuous borrow across 3 consecutive zeroes (1000 - 1, 1000 - 999, 5004 - 1238)', () => {
      const b1 = { operands: [1000, 1], operator: '-', expectedAnswer: 999 };
      const b2 = { operands: [1000, 999], operator: '-', expectedAnswer: 1 };
      const pStage2L3 = curriculum.generateSingleProblem(1, 2, 5, 3);
      assert.equal(curriculum.evaluateAnswer(b1, 999), true);
      assert.equal(curriculum.evaluateAnswer(b2, 1), true);
      assert.deepEqual(pStage2L3.operands, [5004, 1238]);
      assert.equal(pStage2L3.expectedAnswer, 3766);
    });

    it('F1-B4: handles missing number (□) equation at zero boundary (□ + 80 = 80 -> 0)', () => {
      const zeroMissing = {
        operands: [0, 80],
        operator: '+',
        prompt: '□ + 80 = 80',
        expectedAnswer: 0,
        commonTrap: { mistakeValue: 160, diagnosis: 'たし算ミス', hintMessage: '80 - 80 を計算しよう' }
      };
      assert.equal(curriculum.evaluateAnswer(zeroMissing, 0), true);
      assert.equal(curriculum.evaluateAnswer(zeroMissing, '0'), true);
      const diag = curriculum.diagnoseError(zeroMissing, 160);
      assert.equal(diag.isKnownTrap, true);
    });

    it('F1-B5: enforces non-negative subtraction invariant (a >= b) across all Stage 2 levels', () => {
      for (const level of [1, 2, 3]) {
        const p = curriculum.generateSingleProblem(1, 2, 1, level);
        assert.ok(p.operands[0] >= p.operands[1], `Expected a >= b for level ${level}`);
        assert.ok(p.expectedAnswer >= 0);
      }
    });
  });

  // =========================================================================
  // F2: World 2 Multiplication Boundaries
  // =========================================================================
  describe('F2: World 2 Multiplication Boundaries', () => {
    it('F2-B1: handles multiplication by zero (40 × 0 = 0) and identity 1 (99 × 1 = 99)', () => {
      const mulZero = { operands: [40, 0], operator: '×', expectedAnswer: 0 };
      const mulOne = { operands: [99, 1], operator: '×', expectedAnswer: 99 };
      assert.equal(curriculum.evaluateAnswer(mulZero, 0), true);
      assert.equal(curriculum.evaluateAnswer(mulOne, 99), true);
      const stepsZero = curriculum.generateStepBreakdown(mulZero);
      assert.equal(stepsZero.length, 1);
      assert.equal(stepsZero[0].expectedStepValue, 0);
    });

    it('F2-B2: evaluates maximum 2-digit × 2-digit boundary (99 × 99 = 9801)', () => {
      const max2x2 = { operands: [99, 99], operator: '×', expectedAnswer: 9801 };
      assert.equal(curriculum.evaluateAnswer(max2x2, 9801), true);
      const steps = curriculum.generateStepBreakdown(max2x2);
      assert.equal(steps.length, 3);
      assert.equal(steps[0].expectedStepValue, 891); // 99 * 9
      assert.equal(steps[1].expectedStepValue, 891); // 99 * 9
      assert.equal(steps[2].expectedStepValue, 9801);
    });

    it('F2-B3: evaluates maximum 3-digit × 1-digit boundary (999 × 9 = 8991)', () => {
      const max3x1 = { operands: [999, 9], operator: '×', expectedAnswer: 8991 };
      assert.equal(curriculum.evaluateAnswer(max3x1, 8991), true);
      const steps = curriculum.generateStepBreakdown(max3x1);
      assert.equal(steps.length, 1);
      assert.equal(steps[0].expectedStepValue, 8991);
    });

    it('F2-B4: handles double-zero multiples (100 × 90 = 9000)', () => {
      const doubleZero = { operands: [100, 90], operator: '×', expectedAnswer: 9000 };
      assert.equal(curriculum.evaluateAnswer(doubleZero, 9000), true);
      const steps = curriculum.generateStepBreakdown(doubleZero);
      assert.equal(steps.length, 3);
      assert.equal(steps[0].expectedStepValue, 0);    // 100 * 0
      assert.equal(steps[1].expectedStepValue, 900);  // 100 * 9
      assert.equal(steps[2].expectedStepValue, 9000);
    });

    it('F2-B5: verifies full carry propagation across all places in 2-digit × 2-digit', () => {
      const carryProb = { operands: [87, 65], operator: '×', expectedAnswer: 5655 };
      const steps = curriculum.generateStepBreakdown(carryProb);
      assert.equal(steps[0].expectedStepValue, 435);  // 87 * 5
      assert.equal(steps[1].expectedStepValue, 522);  // 87 * 6
      assert.equal(steps[2].expectedStepValue, 5655); // 435 + 5220
    });
  });

  // =========================================================================
  // F3: World 3 Division & Remainder Boundaries
  // =========================================================================
  describe('F3: World 3 Division & Remainder Boundaries', () => {
    it('F3-B1: validates minimum non-zero remainder boundary (remainder = 1)', () => {
      const p = curriculum.generateSingleProblem(3, 7, 1, 2); // 29 ÷ 4 = 7 R 1
      assert.equal(p.expectedAnswer.quotient, 7);
      assert.equal(p.expectedAnswer.remainder, 1);
      assert.equal(curriculum.evaluateAnswer(p, { quotient: 7, remainder: 1 }), true);
    });

    it('F3-B2: validates maximum remainder boundary (remainder = divisor - 1)', () => {
      const maxRemProb = {
        operands: [39, 8],
        operator: '÷',
        expectedAnswer: { quotient: 4, remainder: 7 }
      };
      assert.equal(maxRemProb.expectedAnswer.remainder, maxRemProb.operands[1] - 1);
      assert.equal(curriculum.evaluateAnswer(maxRemProb, { quotient: 4, remainder: 7 }), true);
      assert.equal(curriculum.evaluateAnswer(maxRemProb, { quotient: 3, remainder: 15 }), false);
    });

    it('F3-B3: validates exact division boundary (remainder = 0)', () => {
      const p = curriculum.generateSingleProblem(3, 8, 1, 2); // 84 ÷ 3 = 28
      assert.equal(p.expectedAnswer, 28);
      assert.equal(curriculum.evaluateAnswer(p, 28), true);
      const steps = curriculum.generateStepBreakdown(p);
      assert.equal(steps[0].expectedStepValue, 28);
      assert.equal(steps[1].expectedStepValue, 0);
    });

    it('F3-B4: handles 3-digit ÷ 1-digit with intermediate zero (604 ÷ 6, 624 ÷ 3) and trailing zero (630 ÷ 3)', () => {
      const pIntermediate = curriculum.generateSingleProblem(3, 9, 1, 2); // 624 ÷ 3 = 208
      assert.equal(pIntermediate.expectedAnswer, 208);

      const pRemIntermediate = {
        operands: [604, 6],
        operator: '÷',
        expectedAnswer: { quotient: 100, remainder: 4 }
      };
      assert.equal(curriculum.evaluateAnswer(pRemIntermediate, { quotient: 100, remainder: 4 }), true);

      const pTrailing = { operands: [630, 3], operator: '÷', expectedAnswer: 210 };
      assert.equal(curriculum.evaluateAnswer(pTrailing, 210), true);
    });

    it('F3-B5: handles divisor = 1 identity boundary (85 ÷ 1 = 85 R 0)', () => {
      const divOne = { operands: [85, 1], operator: '÷', expectedAnswer: 85 };
      const steps = curriculum.generateStepBreakdown(divOne);
      assert.equal(steps[0].expectedStepValue, 85);
      assert.equal(steps[1].expectedStepValue, 0);
      assert.equal(curriculum.evaluateAnswer(divOne, 85), true);
    });
  });

  // =========================================================================
  // F4: World 4 2-Digit Division & Estimation Boundaries
  // =========================================================================
  describe('F4: World 4 2-Digit Division & Estimation Boundaries', () => {
    it('F4-B1: handles exact multiples of 10 division (90 ÷ 30 = 3)', () => {
      const exactTens = { operands: [90, 30], operator: '÷', expectedAnswer: 3 };
      assert.equal(curriculum.evaluateAnswer(exactTens, 3), true);
      const steps = curriculum.generateStepBreakdown(exactTens);
      assert.equal(steps[0].expectedStepValue, 3);
      assert.equal(steps[1].expectedStepValue, 0);
    });

    it('F4-B2: preserves true magnitude of remainder in multiples of 10 (95 ÷ 30 = 3 R 5, not R 0.5)', () => {
      const remTens = {
        operands: [95, 30],
        operator: '÷',
        expectedAnswer: { quotient: 3, remainder: 5 }
      };
      const steps = curriculum.generateStepBreakdown(remTens);
      assert.equal(steps[0].expectedStepValue, 3);
      assert.equal(steps[1].expectedStepValue, 5);
      assert.equal(curriculum.evaluateAnswer(remTens, { quotient: 3, remainder: 5 }), true);
      assert.equal(curriculum.evaluateAnswer(remTens, { quotient: 3, remainder: 0.5 }), false);
    });

    it('F4-B3: handles trial quotient requiring -1 revision (84 ÷ 26 = 3 R 6)', () => {
      const p = curriculum.generateSingleProblem(4, 12, 1, 2);
      assert.deepEqual(p.operands, [84, 26]);
      assert.deepEqual(p.expectedAnswer, { quotient: 3, remainder: 6 });
      assert.equal(p.stepGuide[0].expectedStepValue, 4); // initial guess
      assert.equal(p.stepGuide[2].expectedStepValue, 3); // revised -1
    });

    it('F4-B4: handles trial quotient requiring -2 revision (81 ÷ 29 = 2 R 23 where 80 ÷ 20 = 4)', () => {
      const rev2Prob = {
        operands: [81, 29],
        operator: '÷',
        expectedAnswer: { quotient: 2, remainder: 23 },
        commonTrap: {
          mistakeValue: { quotient: 3, remainder: 0 },
          diagnosis: '29×3=87でまだ81より大きいです',
          hintMessage: 'もう1つ商を小さくして2にしよう！'
        }
      };
      const steps = curriculum.generateStepBreakdown(rev2Prob);
      assert.equal(steps[0].expectedStepValue, 2);
      assert.equal(steps[1].expectedStepValue, 23);
      assert.equal(curriculum.evaluateAnswer(rev2Prob, { quotient: 2, remainder: 23 }), true);
      const diag = curriculum.diagnoseError(rev2Prob, { quotient: 3, remainder: 0 });
      assert.equal(diag.isKnownTrap, true);
    });

    it('F4-B5: handles dividend smaller than divisor boundary (15 ÷ 20 = 0 R 15)', () => {
      const smallDiv = {
        operands: [15, 20],
        operator: '÷',
        expectedAnswer: { quotient: 0, remainder: 15 }
      };
      const steps = curriculum.generateStepBreakdown(smallDiv);
      assert.equal(steps[0].expectedStepValue, 0);
      assert.equal(steps[1].expectedStepValue, 15);
      assert.equal(curriculum.evaluateAnswer(smallDiv, { quotient: 0, remainder: 15 }), true);
    });
  });

  // =========================================================================
  // F5: World 5 Mixed Operations & Order of Operations Boundaries
  // =========================================================================
  describe('F5: World 5 Mixed Operations & Order of Operations Boundaries', () => {
    it('F5-B1: handles parentheses evaluating to zero ((30 - 30) × 5 = 0)', () => {
      const zeroParen = {
        operands: [30, 30, 5],
        operator: 'mixed',
        prompt: '(30 - 30) × 5 = ?',
        expectedAnswer: 0,
        commonTrap: { mistakeValue: -120, diagnosis: 'かっこが先', hintMessage: '30 - 30 = 0' }
      };
      assert.equal(curriculum.evaluateAnswer(zeroParen, 0), true);
      assert.equal(curriculum.evaluateAnswer(zeroParen, 150), false);
    });

    it('F5-B2: enforces division before subtraction (50 - 24 ÷ 6 = 46)', () => {
      const divBeforeSub = {
        operands: [50, 24, 6],
        operator: 'mixed',
        prompt: '50 - 24 ÷ 6 = ?',
        expectedAnswer: 46,
        commonTrap: { mistakeValue: 4, diagnosis: 'わり算が先', hintMessage: '24 ÷ 6 = 4 を先に計算しよう' }
      };
      assert.equal(curriculum.evaluateAnswer(divBeforeSub, 46), true);
      assert.equal(curriculum.evaluateAnswer(divBeforeSub, 4), false);
    });

    it('F5-B3: verifies associative and distributive mental math boundaries (125 × 8 = 1000, 25 × 4 = 100, 99 × 5 = 495)', () => {
      const pStage15 = curriculum.generateSingleProblem(5, 15, 1, 2); // 25 × 17 × 4
      assert.equal(pStage15.stepGuide[0].expectedStepValue, 100);
      assert.equal(pStage15.expectedAnswer, 1700);

      const p125x8 = { operands: [125, 8], operator: '×', expectedAnswer: 1000 };
      const p99x5 = { operands: [99, 5], operator: '×', expectedAnswer: 495 };
      assert.equal(curriculum.evaluateAnswer(p125x8, 1000), true);
      assert.equal(curriculum.evaluateAnswer(p99x5, 495), true);
    });

    it('F5-B4: enforces left-to-right tie-breaking for equal precedence (40 - 10 + 5 = 35, not 25)', () => {
      const leftToRight = {
        operands: [40, 10, 5],
        operator: 'mixed',
        prompt: '40 - 10 + 5 = ?',
        expectedAnswer: 35,
        commonTrap: {
          mistakeValue: 25,
          diagnosis: '10 + 5 を先に足してしまっています',
          hintMessage: 'たし算とひき算だけの時は左から順番に計算しよう！'
        }
      };
      assert.equal(curriculum.evaluateAnswer(leftToRight, 35), true);
      const diag = curriculum.diagnoseError(leftToRight, 25);
      assert.equal(diag.isKnownTrap, true);
    });

    it('F5-B5: guarantees integer-only expected answers across all World 5 stages', () => {
      for (const stageId of [13, 14, 15]) {
        const problems = curriculum.generateStageProblems(5, stageId, []);
        for (const p of problems) {
          assert.equal(Number.isInteger(p.expectedAnswer), true, `Non-integer answer in stage ${stageId}`);
        }
      }
    });
  });

  // =========================================================================
  // F6: Adaptive 5-Question Stage Flow Boundaries
  // =========================================================================
  describe('F6: Adaptive 5-Question Stage Flow Boundaries', () => {
    it('F6-B1: handles empty history array [] without throwing and defaults Q4 to level 3', () => {
      const problems = curriculum.generateStageProblems(1, 1, []);
      assert.equal(problems.length, 5);
      assert.equal(problems[3].level, 3);
    });

    it('F6-B2: ensures all-wrong history array never drops any question level below 1', () => {
      const allWrong = [
        { questionIndex: 1, isCorrect: false },
        { questionIndex: 2, isCorrect: false },
        { questionIndex: 3, isCorrect: false }
      ];
      const problems = curriculum.generateStageProblems(1, 1, allWrong);
      for (const p of problems) {
        assert.ok(p.level >= 1, `Level ${p.level} dropped below 1`);
      }
      assert.equal(problems[3].level, 2); // Q4 drops to standard (2), never < 1
    });

    it('F6-B3: ensures all-correct history array caps question level at 3', () => {
      const allCorrect = [
        { questionIndex: 1, isCorrect: true },
        { questionIndex: 2, isCorrect: true },
        { questionIndex: 3, isCorrect: true }
      ];
      const problems = curriculum.generateStageProblems(1, 1, allCorrect);
      for (const p of problems) {
        assert.ok(p.level <= 3, `Level ${p.level} exceeded 3`);
      }
      assert.equal(problems[3].level, 3);
      assert.equal(problems[4].level, 3);
    });

    it('F6-B4: handles boundary stage IDs (stageId = 1, stageId = 15, and unknown stageId = 99 fallback)', () => {
      const firstStage = curriculum.generateStageProblems(1, 1, []);
      const lastStage = curriculum.generateStageProblems(5, 15, []);
      const fallbackStage = curriculum.generateSingleProblem(9, 99, 1, 1);
      assert.equal(firstStage[0].stageId, 1);
      assert.equal(lastStage[0].stageId, 15);
      assert.equal(fallbackStage.expectedAnswer, 42);
    });

    it('F6-B5: enforces strict 5-question count invariant across all 15 stages', () => {
      for (let s = 1; s <= 15; s++) {
        const w = Math.ceil(s / 3);
        const set = curriculum.generateStageProblems(w, s, []);
        assert.equal(set.length, 5, `Stage ${s} did not generate 5 problems`);
      }
    });
  });

  // =========================================================================
  // F7: Step Breakdown Generator Boundaries
  // =========================================================================
  describe('F7: Step Breakdown Generator Boundaries', () => {
    it('F7-B1: generates accurate steps for 3-digit addition with zero carries (111 + 222)', () => {
      const steps = curriculum.generateStepBreakdown({ operands: [111, 222], operator: '+' });
      assert.equal(steps.length, 3);
      assert.equal(steps[0].expectedStepValue, 3);
      assert.equal(steps[1].expectedStepValue, 3);
      assert.equal(steps[2].expectedStepValue, 3);
    });

    it('F7-B2: generates accurate steps for addition with double carry across 9s (999 + 1)', () => {
      const steps = curriculum.generateStepBreakdown({ operands: [999, 1], operator: '+' });
      assert.equal(steps.length, 3);
      assert.equal(steps[0].expectedStepValue, 0); // (9 + 1) % 10 = 0, carry 1
      assert.equal(steps[1].expectedStepValue, 0); // (9 + 0 + 1) % 10 = 0, carry 1
      assert.equal(steps[2].expectedStepValue, 10); // 9 + 0 + 1 = 10
    });

    it('F7-B3: distinguishes multiplication by 1-digit (b < 10 -> 1 step) vs 2-digit (b >= 10 -> 3 steps)', () => {
      const steps1Digit = curriculum.generateStepBreakdown({ operands: [45, 9], operator: '×' });
      const steps2Digit = curriculum.generateStepBreakdown({ operands: [45, 10], operator: '×' });
      assert.equal(steps1Digit.length, 1);
      assert.equal(steps2Digit.length, 3);
    });

    it('F7-B4: generates division steps with 0 remainder boundary (28 ÷ 4)', () => {
      const steps = curriculum.generateStepBreakdown({ operands: [28, 4], operator: '÷' });
      assert.equal(steps.length, 2);
      assert.equal(steps[0].expectedStepValue, 7);
      assert.equal(steps[1].expectedStepValue, 0);
    });

    it('F7-B5: returns empty array safely for unsupported operator ("?")', () => {
      const steps = curriculum.generateStepBreakdown({ operands: [10, 20], operator: '?' });
      assert.deepEqual(steps, []);
    });
  });

  // =========================================================================
  // F8: Review Variation Generator Boundaries
  // =========================================================================
  describe('F8: Review Variation Generator Boundaries', () => {
    it('F8-B1: guarantees deep clone immutability (mutating variation does not mutate original problem)', () => {
      const orig = curriculum.generateSingleProblem(1, 1, 1, 2);
      const origOperand0 = orig.operands[0];
      const origStep0 = orig.stepGuide[0].expectedStepValue;
      const variation = curriculum.generateVariationProblem(orig);
      variation.operands[0] = 999999;
      variation.stepGuide[0].expectedStepValue = -1;
      assert.equal(orig.operands[0], origOperand0);
      assert.equal(orig.stepGuide[0].expectedStepValue, origStep0);
    });

    it('F8-B2: produces distinct IDs when called repeatedly in the same tick', () => {
      const orig = curriculum.generateSingleProblem(1, 1, 1, 2);
      const v1 = curriculum.generateVariationProblem(orig);
      const v2 = curriculum.generateVariationProblem(orig);
      assert.notEqual(v1.id, v2.id);
    });

    it('F8-B3: preserves remainder < divisor invariant for division variations', () => {
      const orig = curriculum.generateSingleProblem(3, 7, 1, 2); // 29 ÷ 4
      const v = curriculum.generateVariationProblem(orig);
      assert.ok(v.expectedAnswer.remainder < v.operands[1]);
      assert.equal(v.operands[1] * v.expectedAnswer.quotient + v.expectedAnswer.remainder, v.operands[0]);
    });

    it('F8-B4: preserves positive difference for subtraction variations', () => {
      const orig = curriculum.generateSingleProblem(1, 2, 1, 1); // 524 - 268
      const v = curriculum.generateVariationProblem(orig);
      assert.ok(v.operands[0] > v.operands[1]);
      assert.ok(v.expectedAnswer > 0);
      assert.equal(v.expectedAnswer, v.operands[0] - v.operands[1]);
    });

    it('F8-B5: updates stepGuide to match the new variation operands', () => {
      const orig = curriculum.generateSingleProblem(1, 2, 1, 2); // 1000 - 364 -> var: 603 - 347
      const v = curriculum.generateVariationProblem(orig);
      assert.deepEqual(v.operands, [603, 347]);
      assert.equal(v.stepGuide[0].expectedStepValue, ((603 % 10) + 10 - (347 % 10)) % 10);
    });
  });

  // =========================================================================
  // F9: Backend Server Contract Boundaries
  // =========================================================================
  describe('F9: Backend Server Contract Boundaries', () => {
    it('F9-B1: blocks path traversal via "../" and nested "a/../../.."', () => {
      const root = '/home/antigravity';
      assert.throws(() => {
        ServerContractReference.sanitizePath('../secret.txt', root);
      }, /Path traversal/);
      assert.throws(() => {
        ServerContractReference.sanitizePath('src/../../etc/shadow', root);
      }, /Path traversal/);
    });

    it('F9-B2: resolves root path "/" and "index.html" within rootDir safely', () => {
      const root = '/home/antigravity';
      assert.equal(ServerContractReference.sanitizePath('', root), '/home/antigravity');
      assert.equal(ServerContractReference.sanitizePath('index.html', root), '/home/antigravity/index.html');
    });

    it('F9-B3: returns undefined for unknown file extension in mimeTypes map', () => {
      assert.equal(ServerContractReference.mimeTypes['.unknown'], undefined);
      assert.equal(ServerContractReference.mimeTypes['.wasm'], undefined);
    });

    it('F9-B4: rejects empty object {} and outdated schemaVersion "0.9.0" in validateAtomicPayload', () => {
      assert.throws(() => {
        ServerContractReference.validateAtomicPayload({});
      }, /Unsupported schema version/);
      assert.throws(() => {
        ServerContractReference.validateAtomicPayload({ schemaVersion: '0.9.0' });
      }, /Unsupported schema version/);
    });

    it('F9-B5: rejects non-object primitives (undefined, "string", 123) in validateAtomicPayload', () => {
      for (const invalid of [undefined, 'string', 123, false]) {
        assert.throws(() => {
          ServerContractReference.validateAtomicPayload(invalid);
        }, /Invalid JSON payload/);
      }
    });
  });

  // =========================================================================
  // F10: 3-Tier Storage Service Boundaries
  // =========================================================================
  describe('F10: 3-Tier Storage Service Boundaries', () => {
    it('F10-B1: returns empty string "" when normalizeTransferCode receives null, undefined, or non-string', () => {
      assert.equal(storage.normalizeTransferCode(null), '');
      assert.equal(storage.normalizeTransferCode(undefined), '');
      assert.equal(storage.normalizeTransferCode(12345), '');
      assert.equal(storage.normalizeTransferCode({}), '');
    });

    it('F10-B2: strips spaces, hyphens, and punctuation in normalizeTransferCode', () => {
      const dirty = ' lab - 2345 - 6789! ';
      assert.equal(storage.normalizeTransferCode(dirty), 'LAB23456789');
    });

    it('F10-B3: never includes ambiguous characters (0, O, 1, I) across 50 generated transfer codes', () => {
      const def = storage.createDefaultProgress();
      for (let i = 0; i < 50; i++) {
        const code = storage.generateTransferCode(def);
        const body = code.replace(/^LAB-/, '').replace(/-/g, '');
        assert.equal(body.length, 8);
        assert.equal(/[0O1I]/.test(body), false, `Ambiguous char found in ${code}`);
      }
    });

    it('F10-B4: rejects valid JSON missing data or schemaVersion in importBackupJSON', () => {
      assert.throws(() => {
        storage.importBackupJSON(JSON.stringify({ app: 'sansu-tankyu-lab' }));
      }, /JSONインポート失敗/);
      assert.throws(() => {
        storage.importBackupJSON(JSON.stringify({ data: { schemaVersion: '2.0.0' } }));
      }, /JSONインポート失敗/);
    });

    it('F10-B5: handles MockLocalStorage boundaries (missing key -> null, out-of-range key(999) -> null, clear())', () => {
      const ls = new MockLocalStorage({ a: '1', b: '2' });
      assert.equal(ls.getItem('nonexistent'), null);
      assert.equal(ls.key(0), 'a');
      assert.equal(ls.key(999), null);
      ls.clear();
      assert.equal(ls.length, 0);
      assert.equal(ls.key(0), null);
    });
  });

  // =========================================================================
  // F11: Web Audio Synthesizer Boundaries
  // =========================================================================
  describe('F11: Web Audio Synthesizer Boundaries', () => {
    it('F11-B1: returns null when effectName is empty string "", null, or nonexistent', () => {
      const ctx = new MockAudioContext();
      assert.equal(soundSynth.synthesize(ctx, ''), null);
      assert.equal(soundSynth.synthesize(ctx, null), null);
      assert.equal(soundSynth.synthesize(ctx, 'nonexistent'), null);
    });

    it('F11-B2: starts MockAudioContext in "suspended" state and transitions to "running" on resume()', async () => {
      const ctx = new MockAudioContext();
      assert.equal(ctx.state, 'suspended');
      await ctx.resume();
      assert.equal(ctx.state, 'running');
    });

    it('F11-B3: ramps oscillator frequency to endFreq for pitch-sweep effects (starPop: 880 -> 1760)', () => {
      const ctx = new MockAudioContext();
      const res = soundSynth.synthesize(ctx, 'starPop');
      assert.ok(res);
      assert.equal(res.osc.frequency.value, 1760);
      assert.equal(res.duration, 0.1);
    });

    it('F11-B4: ramps gain envelope down to 0.01 to prevent audio clicking', () => {
      const ctx = new MockAudioContext();
      const res = soundSynth.synthesize(ctx, 'tap');
      assert.ok(res);
      assert.equal(res.gain.gain.value, 0.01);
    });

    it('F11-B5: accumulates oscillator and gain nodes accurately across multiple rapid synthesize calls', () => {
      const ctx = new MockAudioContext();
      soundSynth.synthesize(ctx, 'tap');
      soundSynth.synthesize(ctx, 'correct');
      soundSynth.synthesize(ctx, 'badge');
      assert.equal(ctx.history.length, 6); // 3 oscillators + 3 gains
    });
  });

  // =========================================================================
  // F12: Web Speech API Boundaries
  // =========================================================================
  describe('F12: Web Speech API Boundaries', () => {
    it('F12-B1: speaks empty string "" utterance without error', async () => {
      const synth = new MockSpeechSynthesis();
      const res = await speech.speak('', synth, MockSpeechSynthesisUtterance);
      assert.equal(res.played, true);
      assert.equal(res.text, '');
    });

    it('F12-B2: resolves { played: false, fallback: true } when speechSynth is null or undefined', async () => {
      const resNull = await speech.speak('テスト', null);
      const resUndef = await speech.speak('テスト', undefined);
      assert.deepEqual(resNull, { played: false, fallback: true });
      assert.deepEqual(resUndef, { played: false, fallback: true });
    });

    it('F12-B3: resolves { played: false, error: true } when utterance triggers onerror', async () => {
      const errorSynth = {
        speak(utter) {
          if (typeof utter.onerror === 'function') utter.onerror(new Error('TTS error'));
        }
      };
      const res = await speech.speak('エラーテスト', errorSynth, MockSpeechSynthesisUtterance);
      assert.deepEqual(res, { played: false, error: true });
    });

    it('F12-B4: transitions paused state accurately on pause() and resume()', () => {
      const synth = new MockSpeechSynthesis();
      assert.equal(synth.paused, false);
      synth.pause();
      assert.equal(synth.paused, true);
      synth.resume();
      assert.equal(synth.paused, false);
    });

    it('F12-B5: resets both speaking and paused flags on cancel()', () => {
      const synth = new MockSpeechSynthesis();
      synth.speaking = true;
      synth.paused = true;
      synth.cancel();
      assert.equal(synth.speaking, false);
      assert.equal(synth.paused, false);
    });
  });

  // =========================================================================
  // F13: Gamification Engine Boundaries
  // =========================================================================
  describe('F13: Gamification Engine Boundaries', () => {
    it('F13-B1: returns Rank 1 for 0 EXP and negative EXP (-10)', () => {
      assert.equal(gamification.calculateRank(0).rank, 1);
      assert.equal(gamification.calculateRank(-10).rank, 1);
    });

    it('F13-B2: transitions from Rank 1 to Rank 2 at exact threshold boundary (99 vs 100 EXP)', () => {
      assert.equal(gamification.calculateRank(99).rank, 1);
      assert.equal(gamification.calculateRank(100).rank, 2);
    });

    it('F13-B3: transitions from Rank 9 to Rank 10 at max threshold (3999 vs 4000 and 999999 EXP)', () => {
      assert.equal(gamification.calculateRank(3999).rank, 9);
      assert.equal(gamification.calculateRank(4000).rank, 10);
      assert.equal(gamification.calculateRank(999999).rank, 10);
    });

    it('F13-B4: guarantees minimum 1 star even when 0 questions were answered on first try or self-corrected', () => {
      assert.equal(gamification.calculateStars(5, 0, 0), 1);
      assert.equal(gamification.calculateStars(5, 4, 0), 1);
    });

    it('F13-B5: awards fallback 5 points when neither first-try nor self-corrected', () => {
      assert.equal(gamification.awardPoints({ isFirstTry: false, wasSelfCorrected: false }), 5);
    });
  });

  // =========================================================================
  // F14: Canvas Memo Pad Boundaries
  // =========================================================================
  describe('F14: Canvas Memo Pad Boundaries', () => {
    it('F14-B1: returns undefined safely when calling undo() on empty pad', () => {
      const state = CanvasPadReference.createPadState();
      assert.equal(CanvasPadReference.undo(state), undefined);
      assert.equal(state.strokes.length, 0);
    });

    it('F14-B2: ignores moveStroke() safely when currentStroke is null', () => {
      const state = CanvasPadReference.createPadState();
      CanvasPadReference.moveStroke(state, 50, 50);
      assert.equal(state.currentStroke, null);
      assert.equal(state.strokes.length, 0);
    });

    it('F14-B3: does not push empty stroke when endStroke() is called with currentStroke === null', () => {
      const state = CanvasPadReference.createPadState();
      CanvasPadReference.endStroke(state);
      assert.equal(state.strokes.length, 0);
    });

    it('F14-B4: records a single-point tap stroke (startStroke immediately followed by endStroke)', () => {
      const state = CanvasPadReference.createPadState();
      CanvasPadReference.startStroke(state, 120, 240);
      CanvasPadReference.endStroke(state);
      assert.equal(state.strokes.length, 1);
      assert.deepEqual(state.strokes[0], [{ x: 120, y: 240 }]);
    });

    it('F14-B5: discards in-progress currentStroke and all saved strokes when clear() is called mid-stroke', () => {
      const state = CanvasPadReference.createPadState();
      CanvasPadReference.startStroke(state, 10, 10);
      CanvasPadReference.endStroke(state);
      CanvasPadReference.startStroke(state, 30, 30);
      CanvasPadReference.moveStroke(state, 40, 40);
      CanvasPadReference.clear(state);
      assert.equal(state.strokes.length, 0);
      assert.equal(state.currentStroke, null);
    });
  });

  // =========================================================================
  // F15: Virtual 10-Key Keypad Boundaries
  // =========================================================================
  describe('F15: Virtual 10-Key Keypad Boundaries', () => {
    it('F15-B1: keeps quotientText and remainderText as "" when pressing del on empty state', () => {
      let state = KeypadReference.createKeypadState(true);
      state = KeypadReference.handleInput(state, 'del');
      assert.equal(state.quotientText, '');
      state = KeypadReference.handleInput(state, 'rem');
      state = KeypadReference.handleInput(state, 'del');
      assert.equal(state.remainderText, '');
    });

    it('F15-B2: returns 0 (or { quotient: 0, remainder: 0 }) from getValue on empty state', () => {
      const singleState = KeypadReference.createKeypadState(false);
      const remState = KeypadReference.createKeypadState(true);
      assert.equal(KeypadReference.getValue(singleState), 0);
      assert.deepEqual(KeypadReference.getValue(remState), { quotient: 0, remainder: 0 });
    });

    it('F15-B3: ignores "rem" toggle key when hasRemainder is false', () => {
      let state = KeypadReference.createKeypadState(false);
      state = KeypadReference.handleInput(state, 'rem');
      assert.equal(state.activeField, 'quotient');
    });

    it('F15-B4: caps remainder field at 4 digits while capping quotient field at 6 digits', () => {
      let state = KeypadReference.createKeypadState(true);
      for (let i = 0; i < 8; i++) state = KeypadReference.handleInput(state, '1');
      assert.equal(state.quotientText.length, 6);
      state = KeypadReference.handleInput(state, 'rem');
      for (let i = 0; i < 8; i++) state = KeypadReference.handleInput(state, '2');
      assert.equal(state.remainderText.length, 4);
    });

    it('F15-B5: ignores non-digit invalid keys ("a", "-", " ") without mutating text', () => {
      let state = KeypadReference.createKeypadState(false);
      state = KeypadReference.handleInput(state, '5');
      for (const badKey of ['a', '-', ' ', '99', '']) {
        state = KeypadReference.handleInput(state, badKey);
      }
      assert.equal(state.quotientText, '5');
    });
  });

  // =========================================================================
  // F16: Hybrid Step Guide UI Boundaries
  // =========================================================================
  describe('F16: Hybrid Step Guide UI Boundaries', () => {
    it('F16-B1: returns false for negative step index (-1)', () => {
      const p = curriculum.generateSingleProblem(1, 1, 1, 2);
      const session = StepGuideReference.createSession(p);
      assert.equal(StepGuideReference.submitStepAnswer(session, -1, 0), false);
    });

    it('F16-B2: returns false for step index equal to steps.length', () => {
      const p = curriculum.generateSingleProblem(1, 1, 1, 2);
      const session = StepGuideReference.createSession(p);
      assert.equal(StepGuideReference.submitStepAnswer(session, session.steps.length, 0), false);
    });

    it('F16-B3: initializes safely when problem has empty or missing stepGuide', () => {
      const session = StepGuideReference.createSession({ id: 'empty-prob' });
      assert.deepEqual(session.steps, []);
      assert.equal(StepGuideReference.submitStepAnswer(session, 0, 1), false);
    });

    it('F16-B4: coerces numeric string input ("2") to match numeric expectedStepValue (2)', () => {
      const p = curriculum.generateSingleProblem(1, 1, 1, 2); // 587 + 645 -> step 0 expected: 2
      const session = StepGuideReference.createSession(p);
      const expectedStr = String(session.steps[0].expectedStepValue);
      const res = StepGuideReference.submitStepAnswer(session, 0, expectedStr);
      assert.equal(res.success, true);
    });

    it('F16-B5: increments errorCount on repeated wrong submissions without advancing currentStepIndex', () => {
      const p = curriculum.generateSingleProblem(1, 1, 1, 2);
      const session = StepGuideReference.createSession(p);
      StepGuideReference.submitStepAnswer(session, 0, -99);
      StepGuideReference.submitStepAnswer(session, 0, -98);
      const res3 = StepGuideReference.submitStepAnswer(session, 0, -97);
      assert.equal(res3.success, false);
      assert.equal(session.errorCount, 3);
      assert.equal(session.currentStepIndex, 0);
    });
  });

  // =========================================================================
  // F17: No-X Feedback Toast Boundaries
  // =========================================================================
  describe('F17: No-X Feedback Toast Boundaries', () => {
    it('F17-B1: rejects each forbidden symbol ("❌", "✖", "✕", "ばつ", "バツ") individually in validateToastContent', () => {
      for (const sym of ToastFeedbackReference.forbiddenSymbols) {
        assert.equal(ToastFeedbackReference.validateToastContent(`テスト${sym}メッセージ`), false);
      }
    });

    it('F17-B2: defaults to encouraging message when createToast receives unknown type', () => {
      const toast = ToastFeedbackReference.createToast('unknown_type');
      assert.equal(toast.message, 'おしい！もう一歩！');
    });

    it('F17-B3: validates that every message in positiveMessages passes validateToastContent', () => {
      for (const msg of ToastFeedbackReference.positiveMessages) {
        assert.equal(ToastFeedbackReference.validateToastContent(msg), true);
      }
    });

    it('F17-B4: sets hasForbiddenSymbol strictly to false on all generated toasts', () => {
      for (const t of ['encourage', 'hint', 'rescan']) {
        assert.equal(ToastFeedbackReference.createToast(t).hasForbiddenSymbol, false);
      }
    });

    it('F17-B5: ensures toast color is warm amber (#eab308) and never punitive red (#ef4444 or #ff0000)', () => {
      const toast = ToastFeedbackReference.createToast('encourage');
      assert.equal(toast.color, '#eab308');
      assert.notEqual(toast.color, '#ef4444');
      assert.notEqual(toast.color, '#ff0000');
    });
  });

  // =========================================================================
  // F18: Modern CSS Design System Boundaries
  // =========================================================================
  describe('F18: Modern CSS Design System Boundaries', () => {
    it('F18-B1: enforces exact 1px boundary between mobileMax (767) and tabletPortrait (768)', () => {
      assert.equal(DesignSystemReference.breakpoints.tabletPortrait - DesignSystemReference.breakpoints.mobileMax, 1);
    });

    it('F18-B2: orders tabletLandscape (1024) and desktop (1280) breakpoints strictly ascending', () => {
      const bp = DesignSystemReference.breakpoints;
      assert.ok(bp.mobileMax < bp.tabletPortrait);
      assert.ok(bp.tabletPortrait < bp.tabletLandscape);
      assert.ok(bp.tabletLandscape < bp.desktop);
    });

    it('F18-B3: enforces touchTargetMinPx >= 48 boundary for child finger ergonomics', () => {
      assert.equal(DesignSystemReference.touchTargetMinPx, 48);
    });

    it('F18-B4: validates all 8 palette colors are well-formed 7-character hex strings', () => {
      const values = Object.values(DesignSystemReference.palette);
      assert.equal(values.length, 8);
      for (const hex of values) {
        assert.match(hex, /^#[0-9a-fA-F]{6}$/);
      }
    });

    it('F18-B5: pairs dark lab surface (#0f172a) with light foreground text (#f8fafc)', () => {
      const bgLum = parseInt(DesignSystemReference.palette.bgDark.slice(1, 3), 16);
      const fgLum = parseInt(DesignSystemReference.palette.textMain.slice(1, 3), 16);
      assert.ok(fgLum - bgLum > 200);
    });
  });

  // =========================================================================
  // F19: 1-Minute Mini-Lesson Boundaries
  // =========================================================================
  describe('F19: 1-Minute Mini-Lesson Boundaries', () => {
    it('F19-B1: returns false from canAdvance at Card 1 before quiz is answered', () => {
      const state = MiniLessonReference.createLessonState('stage-1');
      MiniLessonReference.nextCard(state); // -> Card 1
      assert.equal(state.currentCardIndex, 1);
      assert.equal(MiniLessonReference.canAdvance(state), false);
    });

    it('F19-B2: keeps currentCardIndex at 1 when nextCard is called with unanswered or wrong quiz', () => {
      const state = MiniLessonReference.createLessonState('stage-1');
      MiniLessonReference.nextCard(state); // -> Card 1
      assert.equal(MiniLessonReference.nextCard(state), false);
      assert.equal(state.currentCardIndex, 1);
      MiniLessonReference.answerQuiz(state, 'WRONG', 'RIGHT');
      assert.equal(MiniLessonReference.nextCard(state), false);
      assert.equal(state.currentCardIndex, 1);
    });

    it('F19-B3: updates quizIsCorrect accurately if learner answers wrong after answering right', () => {
      const state = MiniLessonReference.createLessonState('stage-1');
      state.currentCardIndex = 1;
      MiniLessonReference.answerQuiz(state, 'A', 'A');
      assert.equal(state.quizIsCorrect, true);
      MiniLessonReference.answerQuiz(state, 'B', 'A');
      assert.equal(state.quizIsCorrect, false);
      assert.equal(MiniLessonReference.canAdvance(state), false);
    });

    it('F19-B4: returns false and stays at index 2 when nextCard is called at final Card 2', () => {
      const state = MiniLessonReference.createLessonState('stage-1');
      MiniLessonReference.nextCard(state); // 0 -> 1
      MiniLessonReference.answerQuiz(state, 'A', 'A');
      MiniLessonReference.nextCard(state); // 1 -> 2
      assert.equal(MiniLessonReference.nextCard(state), false);
      assert.equal(state.currentCardIndex, 2);
    });

    it('F19-B5: sets completed = true only upon reaching Card 2', () => {
      const state = MiniLessonReference.createLessonState('stage-1');
      assert.equal(state.completed, false);
      MiniLessonReference.nextCard(state); // Card 1
      assert.equal(state.completed, false);
      MiniLessonReference.answerQuiz(state, 'A', 'A');
      assert.equal(state.completed, false);
      MiniLessonReference.nextCard(state); // Card 2
      assert.equal(state.completed, true);
    });
  });

  // =========================================================================
  // F20: Stage Map & World Navigator Boundaries
  // =========================================================================
  describe('F20: Stage Map & World Navigator Boundaries', () => {
    it('F20-B1: always unlocks Stage 1 even when clearedStagesMap is empty {}', () => {
      assert.equal(StageMapReference.isStageUnlocked(1, {}), true);
    });

    it('F20-B2: keeps Stage 2 locked when stage-1 exists but cleared is explicitly false', () => {
      assert.equal(StageMapReference.isStageUnlocked(2, { 'stage-1': { cleared: false } }), false);
    });

    it('F20-B3: checks Stage 15 boundary unlock against stage-14 cleared status', () => {
      assert.equal(StageMapReference.isStageUnlocked(15, { 'stage-14': { cleared: false } }), false);
      assert.equal(StageMapReference.isStageUnlocked(15, { 'stage-14': { cleared: true } }), true);
    });

    it('F20-B4: maps exact world transition boundaries (3->1, 4->2, 6->2, 7->3, 9->3, 10->4, 12->4, 13->5, 15->5)', () => {
      const pairs = [
        [3, 1], [4, 2], [6, 2], [7, 3], [9, 3], [10, 4], [12, 4], [13, 5], [15, 5]
      ];
      for (const [stage, expectedWorld] of pairs) {
        assert.equal(StageMapReference.getWorldForStage(stage), expectedWorld);
      }
    });

    it('F20-B5: maintains invariant totalStages === totalWorlds * stagesPerWorld (15 === 5 * 3)', () => {
      assert.equal(
        StageMapReference.totalStages,
        StageMapReference.totalWorlds * StageMapReference.stagesPerWorld
      );
    });
  });

  // =========================================================================
  // F21: Power-Up Treasure Box Boundaries
  // =========================================================================
  describe('F21: Power-Up Treasure Box Boundaries', () => {
    it('F21-B1: keeps consecutiveCorrect at 0 when recordAttempt(item, false) is called at 0', () => {
      const box = { items: [] };
      const p = curriculum.generateSingleProblem(1, 1, 1, 1);
      const item = TreasureBoxReference.addItem(box, p);
      const res = TreasureBoxReference.recordAttempt(item, false);
      assert.equal(res.consecutiveCorrect, 0);
      assert.equal(res.masteryLevel, 0);
    });

    it('F21-B2: resets masteryLevel from 2 to 0 if learner fails a subsequent review attempt', () => {
      const box = { items: [] };
      const p = curriculum.generateSingleProblem(1, 1, 1, 1);
      const item = TreasureBoxReference.addItem(box, p);
      TreasureBoxReference.recordAttempt(item, true);
      TreasureBoxReference.recordAttempt(item, true);
      assert.equal(item.masteryLevel, 2);
      const afterFail = TreasureBoxReference.recordAttempt(item, false);
      assert.equal(afterFail.consecutiveCorrect, 0);
      assert.equal(afterFail.masteryLevel, 0);
    });

    it('F21-B3: caps masteryLevel at 2 on 3rd and 4th consecutive correct attempts', () => {
      const box = { items: [] };
      const p = curriculum.generateSingleProblem(1, 1, 1, 1);
      const item = TreasureBoxReference.addItem(box, p);
      TreasureBoxReference.recordAttempt(item, true);
      TreasureBoxReference.recordAttempt(item, true);
      const third = TreasureBoxReference.recordAttempt(item, true);
      assert.equal(third.consecutiveCorrect, 3);
      assert.equal(third.masteryLevel, 2);
    });

    it('F21-B4: deep-clones originalProblem in addItem so external mutations do not corrupt stored item', () => {
      const box = { items: [] };
      const p = curriculum.generateSingleProblem(1, 1, 1, 1);
      const item = TreasureBoxReference.addItem(box, p);
      p.operands[0] = -999;
      assert.notEqual(item.originalProblem.operands[0], -999);
    });

    it('F21-B5: generates unique item IDs for distinct problems added in the same tick', () => {
      const box = { items: [] };
      const p1 = curriculum.generateSingleProblem(1, 1, 1, 1);
      const p2 = curriculum.generateSingleProblem(1, 2, 1, 1);
      const item1 = TreasureBoxReference.addItem(box, p1);
      const item2 = TreasureBoxReference.addItem(box, p2);
      assert.notEqual(item1.id, item2.id);
    });
  });

  // =========================================================================
  // F22: Parent Cheer Board Boundaries
  // =========================================================================
  describe('F22: Parent Cheer Board Boundaries', () => {
    it('F22-B1: coerces numeric PIN input verifyPin(1234, "1234") to true', () => {
      assert.equal(ParentBoardReference.verifyPin(1234, '1234'), true);
    });

    it('F22-B2: rejects empty string "", null, and undefined in verifyPin', () => {
      assert.equal(ParentBoardReference.verifyPin('', '1234'), false);
      assert.equal(ParentBoardReference.verifyPin(null, '1234'), false);
      assert.equal(ParentBoardReference.verifyPin(undefined, '1234'), false);
    });

    it('F22-B3: returns 0 for all 5 worlds when calculateRadarScores receives empty stageProgress {}', () => {
      const scores = ParentBoardReference.calculateRadarScores({ stageProgress: {} });
      assert.deepEqual(scores, { world1: 0, world2: 0, world3: 0, world4: 0, world5: 0 });
    });

    it('F22-B4: returns 100 for all 5 worlds when all 15 stages are cleared', () => {
      const stageProgress = {};
      for (let s = 1; s <= 15; s++) {
        stageProgress[`stage-${s}`] = { cleared: true };
      }
      const scores = ParentBoardReference.calculateRadarScores({ stageProgress });
      assert.deepEqual(scores, { world1: 100, world2: 100, world3: 100, world4: 100, world5: 100 });
    });

    it('F22-B5: handles empty/undefined customText and exact 50 vs 51 char truncation boundary in createCheerStamp', () => {
      const emptyCheer = ParentBoardReference.createCheerStamp('STAMP_1', undefined);
      assert.equal(emptyCheer.customText, '');

      const exact50 = 'あ'.repeat(50);
      const over51 = 'い'.repeat(51);
      assert.equal(ParentBoardReference.createCheerStamp('STAMP_1', exact50).customText.length, 50);
      assert.equal(ParentBoardReference.createCheerStamp('STAMP_1', over51).customText.length, 50);
    });
  });

  // =========================================================================
  // F23: App Shell & Router Boundaries
  // =========================================================================
  describe('F23: App Shell & Router Boundaries', () => {
    it('F23-B1: resolves both "" and "#map" to { view: "#map", param: null }', () => {
      assert.deepEqual(RouterReference.parseRoute(''), { view: '#map', param: null });
      assert.deepEqual(RouterReference.parseRoute('#map'), { view: '#map', param: null });
    });

    it('F23-B2: extracts param "stage-15" from boundary route "#stage/stage-15"', () => {
      assert.deepEqual(RouterReference.parseRoute('#stage/stage-15'), {
        view: '#stage',
        param: 'stage-15'
      });
    });

    it('F23-B3: returns param: null when route has trailing slash "#parent/"', () => {
      assert.deepEqual(RouterReference.parseRoute('#parent/'), {
        view: '#parent',
        param: null
      });
    });

    it('F23-B4: ensures all 5 core routes start with "#"', () => {
      for (const r of RouterReference.routes) {
        assert.ok(r.startsWith('#'), `Route ${r} does not start with #`);
      }
    });

    it('F23-B5: guarantees route list has exactly 5 unique routes', () => {
      const unique = new Set(RouterReference.routes);
      assert.equal(RouterReference.routes.length, 5);
      assert.equal(unique.size, 5);
    });
  });

  // =========================================================================
  // F24: Package & Vite Config Boundaries
  // =========================================================================
  describe('F24: Package & Vite Config Boundaries', () => {
    it('F24-B1: enforces expectedType strictly equal to "module" (not "commonjs")', () => {
      assert.equal(PackageConfigReference.expectedType, 'module');
      assert.notEqual(PackageConfigReference.expectedType, 'commonjs');
    });

    it('F24-B2: requires exactly dev, build, and test scripts', () => {
      assert.deepEqual(PackageConfigReference.requiredScripts, ['dev', 'build', 'test']);
    });

    it('F24-B3: configures vitePort within valid unprivileged TCP port range (1024..65535)', () => {
      assert.ok(PackageConfigReference.vitePort >= 1024 && PackageConfigReference.vitePort <= 65535);
    });

    it('F24-B4: verifies Node.js runtime major version is >= 20', () => {
      const major = Number(process.versions.node.split('.')[0]);
      assert.ok(major >= 20, `Expected Node >= 20, got ${process.versions.node}`);
    });

    it('F24-B5: verifies native node:test and node:assert modules are active without external runner', () => {
      assert.equal(typeof describe, 'function');
      assert.equal(typeof it, 'function');
      assert.equal(typeof assert.equal, 'function');
    });
  });

  // =========================================================================
  // F25: E2E Infrastructure & Harness Boundaries
  // =========================================================================
  describe('F25: E2E Infrastructure & Harness Boundaries', () => {
    it('F25-B1: overwrites existing key in MockLocalStorage without incrementing length', () => {
      const ls = new MockLocalStorage();
      ls.setItem('k1', 'v1');
      ls.setItem('k1', 'v2');
      assert.equal(ls.length, 1);
      assert.equal(ls.getItem('k1'), 'v2');
    });

    it('F25-B2: treats MockLocalStorage.removeItem on non-existent key as safe no-op', () => {
      const ls = new MockLocalStorage({ k1: 'v1' });
      ls.removeItem('missing_key');
      assert.equal(ls.length, 1);
    });

    it('F25-B3: updates MockAudioContext oscillator frequency .value on setValueAtTime and exponentialRampToValueAtTime', () => {
      const ctx = new MockAudioContext();
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(523, 0);
      assert.equal(osc.frequency.value, 523);
      osc.frequency.exponentialRampToValueAtTime(1046, 0.5);
      assert.equal(osc.frequency.value, 1046);
    });

    it('F25-B4: handles MockSpeechSynthesis.speak safely when utterance has no onstart or onend callbacks', () => {
      const synth = new MockSpeechSynthesis();
      const utter = new MockSpeechSynthesisUtterance('コールバックなし');
      synth.speak(utter);
      assert.equal(synth.spokenUtterances.length, 1);
      assert.equal(synth.speaking, false);
    });

    it('F25-B5: resolves all 5 dynamic module loaders to non-null objects exposing PROJECT.md contract methods', async () => {
      assert.equal(typeof curriculum.generateStageProblems, 'function');
      assert.equal(typeof curriculum.generateVariationProblem, 'function');
      assert.equal(typeof storage.loadProgress, 'function');
      assert.equal(typeof storage.saveProgress, 'function');
      assert.equal(typeof storage.restoreFromTransferCode, 'function');
      assert.equal(typeof soundSynth.playSound, 'function');
      assert.equal(typeof speech.speakText, 'function');
      assert.equal(typeof speech.stopSpeech, 'function');
      assert.equal(typeof gamification.recordResult, 'function');
      assert.equal(typeof gamification.getUserProfile, 'function');
    });
  });
});
