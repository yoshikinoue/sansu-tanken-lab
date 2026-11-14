import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import CurriculumEngine, {
  WORLDS_METADATA,
  getWorldsMetadata,
  getStageMetadata,
  normalizeWorldAndStage,
  generateProblem,
  generateStageProblems,
  selectNextProblem,
  determineAdaptiveDifficulty,
  generateVariationProblem,
  evaluateAnswer,
  diagnoseError,
  normalizeUserAnswer
} from '../src/services/curriculum-engine.js';

describe('Milestone 1: Core Math Curriculum Engine', () => {
  describe('1. Worlds & Stages Metadata (5 Worlds, 15 Stages, Mini-Lessons)', () => {
    it('exports all 5 worlds and 15 stages with complete metadata and 3-card mini-lessons', () => {
      const worlds = getWorldsMetadata();
      assert.equal(worlds.length, 5);
      assert.equal(WORLDS_METADATA.length, 5);

      let totalStages = 0;
      for (let w = 1; w <= 5; w++) {
        const world = worlds[w - 1];
        assert.equal(world.worldId, w);
        assert.ok(world.title.length > 0);
        assert.equal(world.stages.length, 3);

        for (let s = 1; s <= 3; s++) {
          totalStages++;
          const stage = getStageMetadata(w, s);
          assert.equal(stage.worldId, w);
          assert.equal(stage.stageId, s);
          assert.equal(stage.globalStageNumber, (w - 1) * 3 + s);
          assert.equal(stage.globalId, `stage-${(w - 1) * 3 + s}`);
          assert.ok(stage.title.length > 0);
          assert.ok(stage.miniLesson);
          assert.equal(stage.miniLesson.cards.length, 3);
          assert.equal(stage.miniLesson.cards[0].type, 'concept');
          assert.equal(stage.miniLesson.cards[1].type, 'quiz');
          assert.equal(stage.miniLesson.cards[1].choices.length, 2);
          assert.equal(
            stage.miniLesson.cards[1].choices.filter((c) => c.isCorrect).length,
            1
          );
          assert.equal(stage.miniLesson.cards[2].type, 'summary');
        }
      }
      assert.equal(totalStages, 15);
    });

    it('falls back safely to World 1 Stage 1 for out-of-range worldId or stageId', () => {
      assert.deepEqual(normalizeWorldAndStage(0, 1), {
        worldId: 1,
        stageId: 1,
        globalStageNumber: 1
      });
      assert.deepEqual(normalizeWorldAndStage(99, 5), {
        worldId: 1,
        stageId: 1,
        globalStageNumber: 1
      });
      assert.deepEqual(normalizeWorldAndStage(null, undefined), {
        worldId: 1,
        stageId: 1,
        globalStageNumber: 1
      });
      assert.deepEqual(normalizeWorldAndStage('stage-12'), {
        worldId: 4,
        stageId: 3,
        globalStageNumber: 12
      });
      assert.deepEqual(normalizeWorldAndStage('w3_s2'), {
        worldId: 3,
        stageId: 2,
        globalStageNumber: 8
      });

      const fallbackProb = generateProblem(999, -5);
      assert.equal(fallbackProb.worldId, 1);
      assert.equal(fallbackProb.stageId, 1);
    });
  });

  describe('2. Dual-Compatibility Schema & StepGuide Contract Across All 15 Stages', () => {
    it('generates valid MathProblem objects with both PROJECT.md and analysis.md fields for all 15 stages', () => {
      for (let w = 1; w <= 5; w++) {
        for (let s = 1; s <= 3; s++) {
          const problem = generateProblem(w, s, {
            questionIndex: 3,
            difficultyLevel: 'hurdle'
          });

          assert.equal(typeof problem.id, 'string');
          assert.equal(problem.worldId, w);
          assert.equal(problem.stageId, s);
          assert.equal(problem.questionIndex, 3);
          assert.ok([1, 2, 3].includes(problem.level));
          assert.equal(problem.difficultyLevel, 'hurdle');
          assert.equal(typeof problem.prompt, 'string');
          assert.equal(typeof problem.expression, 'string');
          assert.ok(['horizontal', 'column', 'tree'].includes(problem.displayFormat));
          assert.ok(Array.isArray(problem.operands) && problem.operands.length >= 2);
          assert.ok(['+', '-', '×', '÷', 'mixed'].includes(problem.operator));

          // Answer contracts
          assert.equal(typeof problem.correctAnswer, 'object');
          assert.equal(typeof problem.correctAnswer.value, 'number');
          assert.ok(!Number.isNaN(problem.correctAnswer.value));

          if (problem.operator === '÷') {
            assert.equal(typeof problem.expectedAnswer, 'object');
            assert.equal(problem.expectedAnswer.quotient, problem.correctAnswer.value);
            assert.equal(problem.expectedAnswer.remainder, problem.correctAnswer.remainder);
          } else {
            assert.equal(typeof problem.expectedAnswer, 'number');
            assert.equal(problem.expectedAnswer, problem.correctAnswer.value);
          }

          // Hybrid stepGuide: works both as Array and as { mode, steps }
          assert.ok(Array.isArray(problem.stepGuide));
          assert.ok(problem.stepGuide.length >= 2);
          assert.equal(problem.stepGuide.steps, problem.stepGuide);
          assert.ok(
            ['column_add_sub', 'column_mult', 'column_div_2digit', 'order_of_ops'].includes(
              problem.stepGuide.mode
            )
          );

          for (const step of problem.stepGuide) {
            assert.equal(typeof step.stepNumber, 'number');
            assert.equal(typeof step.title, 'string');
            assert.equal(typeof step.actionName, 'string');
            assert.equal(typeof step.explanation, 'string');
            assert.equal(typeof step.instructionText, 'string');
            assert.equal(typeof step.blankPosition, 'string');
            assert.equal(typeof step.targetInputId, 'string');
            assert.equal(typeof step.expectedStepValue, 'number');
            assert.equal(step.expectedValue, step.expectedStepValue);
            assert.equal(typeof step.hint, 'string');
          }

          // CommonTrap & ErrorDiagnostics
          assert.ok(problem.commonTrap);
          assert.equal(typeof problem.commonTrap.mistakeValue, 'number');
          assert.equal(typeof problem.commonTrap.diagnosis, 'string');
          assert.equal(typeof problem.commonTrap.hintMessage, 'string');
          assert.ok(Array.isArray(problem.errorDiagnostics));
          assert.ok(problem.errorDiagnostics.length >= 1);
        }
      }
    });
  });

  describe('3. Stage-Specific Grade 4 MEXT Curriculum Constraints', () => {
    it('World 1 (Addition, Subtraction Across Zero, Missing Box Inverse)', () => {
      // Stage 1-1: 3-digit / 4-digit addition with carries
      const p1_1_warmup = generateProblem(1, 1, { difficultyLevel: 'warmup' });
      const [a11, b11] = p1_1_warmup.operands;
      assert.equal(p1_1_warmup.correctAnswer.value, a11 + b11);
      assert.ok((a11 % 10) + (b11 % 10) >= 10, 'Ones place must have a carry');

      const p1_1_challenge = generateProblem(1, 1, { difficultyLevel: 'challenge' });
      assert.ok(p1_1_challenge.operands[0] >= 1000 && p1_1_challenge.operands[1] >= 1000);
      assert.equal(
        p1_1_challenge.correctAnswer.value,
        p1_1_challenge.operands[0] + p1_1_challenge.operands[1]
      );

      // Stage 1-2: Subtraction with borrowing across zero (0 in tens place)
      const p1_2_hurdle = generateProblem(1, 2, { difficultyLevel: 'hurdle' });
      const [a12, b12] = p1_2_hurdle.operands;
      assert.ok(a12 > b12);
      assert.equal(p1_2_hurdle.correctAnswer.value, a12 - b12);
      assert.equal(Math.floor(a12 / 10) % 10, 0, 'Hurdle problem must have 0 in tens place');
      assert.ok((a12 % 10) < (b12 % 10), 'Ones place must require borrowing across zero');

      // Stage 1-3: Missing box inverse operations
      const p1_3 = generateProblem(1, 3, { difficultyLevel: 'hurdle' });
      assert.ok(p1_3.expression.includes('□'));
      const boxVal = p1_3.correctAnswer.value;
      const evaluatedExpr = p1_3.expression.replace('□', String(boxVal));
      const [lhs, rhs] = evaluatedExpr.split('=').map((s) => s.trim());
      if (lhs.includes('+')) {
        const [x, y] = lhs.split('+').map(Number);
        assert.equal(x + y, Number(rhs));
      } else {
        const [x, y] = lhs.split('-').map(Number);
        assert.equal(x - y, Number(rhs));
      }
    });

    it('World 2 (Multiples of 10/100, 3-Digit × 1-Digit Middle Zero, 2-Digit × 2-Digit Partial Products)', () => {
      // Stage 2-1: Multiples of 10/100
      const p2_1 = generateProblem(2, 1, { difficultyLevel: 'hurdle' });
      assert.equal(p2_1.correctAnswer.value, p2_1.operands[0] * p2_1.operands[1]);
      assert.equal(p2_1.correctAnswer.value % 100, 0);

      // Stage 2-2: Middle zero in 3-digit x 1-digit for hurdle/challenge
      const p2_2 = generateProblem(2, 2, { difficultyLevel: 'hurdle' });
      const [a22, b22] = p2_2.operands;
      assert.equal(p2_2.correctAnswer.value, a22 * b22);
      assert.ok(a22 >= 100 && Math.floor(a22 / 10) % 10 === 0, 'Must have middle zero X0Y');
      assert.ok((a22 % 10) * b22 >= 10, 'Must carry into the middle zero');

      // Stage 2-3: 2-digit x 2-digit partial products & shift trap
      const p2_3 = generateProblem(2, 3, { difficultyLevel: 'standard' });
      const [a23, b23] = p2_3.operands;
      assert.equal(p2_3.correctAnswer.value, a23 * b23);
      const b0 = b23 % 10;
      const b1 = Math.floor(b23 / 10);
      assert.equal(p2_3.stepGuide[0].expectedStepValue, a23 * b0);
      assert.equal(p2_3.stepGuide[1].expectedStepValue, a23 * b1 * 10);
      assert.equal(p2_3.stepGuide[2].expectedStepValue, a23 * b23);
      assert.equal(p2_3.commonTrap.mistakeValue, a23 * b0 + a23 * b1);
    });

    it('World 3 (Division with Remainder, 2-Digit ÷ 1-Digit, 3-Digit ÷ 1-Digit Zero in Tens of Quotient)', () => {
      // Stage 3-1: Division with remainder & verification step
      const p3_1 = generateProblem(3, 1, { difficultyLevel: 'standard' });
      const [a31, b31] = p3_1.operands;
      assert.equal(p3_1.correctAnswer.value, Math.floor(a31 / b31));
      assert.equal(p3_1.correctAnswer.remainder, a31 % b31);
      assert.ok(p3_1.correctAnswer.remainder > 0 && p3_1.correctAnswer.remainder < b31);
      assert.equal(p3_1.stepGuide[3].expectedStepValue, a31);

      // Stage 3-2: 2-digit / 1-digit with 2-digit quotient
      const p3_2 = generateProblem(3, 2, { difficultyLevel: 'hurdle' });
      const [a32, b32] = p3_2.operands;
      assert.ok(p3_2.correctAnswer.value >= 10);
      assert.equal(
        b32 * p3_2.correctAnswer.value + p3_2.correctAnswer.remainder,
        a32
      );

      // Stage 3-3: 3-digit / 1-digit with zero in tens place of quotient (e.g. 624 / 3 = 208)
      const p3_3_hurdle = generateProblem(3, 3, { difficultyLevel: 'hurdle' });
      const q33 = p3_3_hurdle.correctAnswer.value;
      assert.ok(q33 >= 100);
      assert.equal(Math.floor(q33 / 10) % 10, 0, 'Quotient tens digit must be 0');
      assert.equal(p3_3_hurdle.commonTrap.mistakeValue, Math.floor(q33 / 100) * 10 + (q33 % 10));

      const p3_3_warmup = generateProblem(3, 3, { difficultyLevel: 'warmup' });
      assert.ok(p3_3_warmup.correctAnswer.value >= 10 && p3_3_warmup.correctAnswer.value < 100);
    });

    it('World 4 (Division by 10s Remainder Scale Trap, 2-Digit Estimation, Trial Quotient Adjustment)', () => {
      // Stage 4-1: Division by multiples of 10 with remainder scale trap
      const p4_1 = generateProblem(4, 1, { difficultyLevel: 'hurdle' });
      const [a41, b41] = p4_1.operands;
      assert.equal(a41 % 10, 0);
      assert.equal(b41 % 10, 0);
      assert.ok(p4_1.correctAnswer.remainder >= 10);
      assert.equal(p4_1.correctAnswer.remainder % 10, 0);
      assert.equal(p4_1.commonTrap.mistakeRemainder, p4_1.correctAnswer.remainder / 10);

      // Stage 4-2: 1-shot quotient estimation by rounding divisor to nearest 10
      const p4_2 = generateProblem(4, 2, { difficultyLevel: 'hurdle' });
      const [a42, b42] = p4_2.operands;
      const roundedB42 = Math.round(b42 / 10) * 10;
      assert.equal(Math.floor(a42 / roundedB42), p4_2.correctAnswer.value);
      assert.equal(p4_2.stepGuide[0].estimatedReference, roundedB42);

      // Stage 4-3: Trial quotient self-adjustment (-1 when too big, +1 when too small)
      const p4_3_big = generateProblem(4, 3, { questionIndex: 3, difficultyLevel: 'hurdle' });
      const step1Big = p4_3_big.stepGuide[0];
      assert.ok(step1Big.correctionTrigger);
      assert.equal(step1Big.correctionTrigger.condition, 'product_greater_than_dividend');
      assert.equal(step1Big.correctionTrigger.adjustedValue, p4_3_big.correctAnswer.value);

      const p4_3_small = generateProblem(4, 3, { questionIndex: 5, difficultyLevel: 'challenge' });
      const step1Small = p4_3_small.stepGuide[0];
      assert.ok(step1Small.correctionTrigger);
      assert.equal(step1Small.correctionTrigger.condition, 'difference_gte_divisor');
      assert.equal(step1Small.correctionTrigger.adjustedValue, p4_3_small.correctAnswer.value);
    });

    it('World 5 (Parentheses, Mixed Operations Order Trap, Smart Calculation Laws)', () => {
      // Stage 5-1: Parentheses
      const p5_1 = generateProblem(5, 1, { difficultyLevel: 'standard' });
      assert.ok(p5_1.expression.includes('(') && p5_1.expression.includes(')'));
      assert.notEqual(p5_1.correctAnswer.value, p5_1.commonTrap.mistakeValue);

      // Stage 5-2: Mixed operations without parens, left-to-right trap
      const p5_2 = generateProblem(5, 2, { difficultyLevel: 'warmup' });
      const [a52, b52, c52] = p5_2.operands;
      assert.equal(p5_2.correctAnswer.value, a52 + b52 * c52);
      assert.equal(p5_2.commonTrap.mistakeValue, (a52 + b52) * c52);

      // Stage 5-3: Smart calculation (making 100)
      const p5_3_assoc = generateProblem(5, 3, { difficultyLevel: 'warmup' });
      assert.equal(p5_3_assoc.operands[0], 25);
      assert.equal(p5_3_assoc.stepGuide[0].expectedStepValue, 100);
      assert.equal(
        p5_3_assoc.correctAnswer.value,
        p5_3_assoc.operands[0] * p5_3_assoc.operands[1]
      );
    });
  });

  describe('4. Adaptive 5-Question Stage Flow & Dynamic Selection', () => {
    it('generates 5 distinct problems progressing from warmup to challenge on a clean history', () => {
      const problems = generateStageProblems(1, 2, []);
      assert.equal(problems.length, 5);
      assert.equal(problems[0].difficultyLevel, 'warmup');
      assert.equal(problems[1].difficultyLevel, 'standard');
      assert.equal(problems[2].difficultyLevel, 'hurdle');
      assert.equal(problems[3].difficultyLevel, 'challenge');
      assert.equal(problems[4].difficultyLevel, 'challenge');

      const expressions = new Set(problems.map((p) => p.expression));
      assert.equal(expressions.size, 5, 'All 5 problems in a stage set must be distinct');

      // Stage 1-2 requirement: at least 2 problems include borrowing across zero
      const zeroBorrowCount = problems.filter((p) => p.trapMetadata?.acrossZero).length;
      assert.ok(zeroBorrowCount >= 2, 'Stage 1-2 must include at least 2 borrow-across-zero problems');
    });

    it('adapts difficulty to remedial/standard when learner makes errors or uses hints', () => {
      const strugglingHistory = [
        { questionIndex: 1, isCorrect: true, usedHint: false },
        { questionIndex: 2, isCorrect: false, usedHint: true },
        { questionIndex: 3, isCorrect: false, wasSelfCorrected: true },
        { questionIndex: 4, isCorrect: true, usedHint: true }
      ];

      const problems = generateStageProblems(4, 3, strugglingHistory);
      assert.equal(problems.length, 5);
      assert.equal(problems[0].difficultyLevel, 'warmup');
      assert.equal(problems[1].difficultyLevel, 'standard');
      assert.equal(problems[2].difficultyLevel, 'remedial');
      assert.equal(problems[3].difficultyLevel, 'remedial');
      assert.equal(problems[4].difficultyLevel, 'remedial');

      // selectNextProblem produces a variation problem when previous question had an error
      const q2Prob = problems[1];
      const nextQ3 = selectNextProblem(4, 3, 3, strugglingHistory.slice(0, 2), q2Prob);
      assert.equal(nextQ3.questionIndex, 3);
      assert.equal(nextQ3.difficultyLevel, 'remedial');
      assert.notEqual(nextQ3.expression, q2Prob.expression);
    });
  });

  describe('5. Review Variation Generator (Power-Up Treasure Box)', () => {
    it('generates number-varied problems preserving cognitive traps across all 15 stages', () => {
      for (let w = 1; w <= 5; w++) {
        for (let s = 1; s <= 3; s++) {
          const orig = generateProblem(w, s, { difficultyLevel: 'hurdle' });
          const varied = generateVariationProblem(orig);

          assert.equal(varied.worldId, orig.worldId);
          assert.equal(varied.stageId, orig.stageId);
          assert.equal(varied.difficultyLevel, orig.difficultyLevel);
          assert.equal(varied.patternType, orig.patternType);
          assert.notEqual(
            varied.expression,
            orig.expression,
            `Variation for W${w}-S${s} must have different numbers`
          );
        }
      }

      // Also supports compact treasure-box storage format
      const compactOrig = {
        worldId: 3,
        stageId: 3,
        num1: 624,
        num2: 3,
        operator: '÷',
        answer: 208,
        remainder: 0
      };
      const compactVar = generateVariationProblem(compactOrig);
      assert.equal(compactVar.worldId, 3);
      assert.equal(compactVar.stageId, 3);
      assert.notEqual(compactVar.operands[0], 624);
      assert.ok(compactVar.correctAnswer.value >= 100);
      assert.equal(Math.floor(compactVar.correctAnswer.value / 10) % 10, 0);
    });
  });

  describe('6. Answer Evaluation, Error Diagnostics & Strict "No-X" Compliance', () => {
    it('evaluates exact answers and division remainders across multiple input formats', () => {
      const divProblem = generateProblem(4, 1, { difficultyLevel: 'hurdle' });
      const q = divProblem.correctAnswer.value;
      const r = divProblem.correctAnswer.remainder;

      assert.equal(evaluateAnswer(divProblem, { quotient: q, remainder: r }).isCorrect, true);
      assert.equal(evaluateAnswer(divProblem, { value: q, remainder: r }).isCorrect, true);
      assert.equal(evaluateAnswer(divProblem, `${q} あまり ${r}`).isCorrect, true);
      assert.equal(evaluateAnswer(divProblem, `${q}...${r}`).isCorrect, true);

      // Remainder scale mistake (e.g. 5 あまり 2 instead of 5 あまり 20)
      const scaleMistake = evaluateAnswer(divProblem, { quotient: q, remainder: r / 10 });
      assert.equal(scaleMistake.isCorrect, false);
      assert.equal(scaleMistake.isQuotientCorrect, true);
      assert.equal(scaleMistake.isRemainderCorrect, false);
      assert.equal(scaleMistake.diagnosis.reasonCategory, 'remainder_scale');
    });

    it('detects specific buggy rules and never emits forbidden negative or X symbols', () => {
      const forbiddenPattern = /[×✕❌✖]|バツ|不正解|ダメ|失敗/;

      for (let w = 1; w <= 5; w++) {
        for (let s = 1; s <= 3; s++) {
          const problem = generateProblem(w, s, { difficultyLevel: 'hurdle' });
          const trapInput =
            problem.operator === '÷'
              ? {
                  quotient: problem.commonTrap.mistakeValue,
                  remainder: problem.commonTrap.mistakeRemainder ?? 0
                }
              : problem.commonTrap.mistakeValue;

          const evalRes = evaluateAnswer(problem, trapInput);
          assert.equal(evalRes.isCorrect, false);
          assert.equal(evalRes.feedbackTone, 'exploratory');
          assert.ok(evalRes.diagnosis.matched);
          assert.ok(!forbiddenPattern.test(evalRes.feedbackTitle));
          assert.ok(!forbiddenPattern.test(evalRes.feedbackMessage));
          assert.ok(!forbiddenPattern.test(evalRes.diagnosis.diagnosis));
          assert.ok(!forbiddenPattern.test(evalRes.diagnosis.adviceMessage));
          assert.ok(!forbiddenPattern.test(evalRes.diagnosis.hintMessage));
        }
      }
    });
  });
});
