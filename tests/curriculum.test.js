import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import CurriculumEngine, {
  WORLDS_METADATA,
  getWorldsMetadata,
  getWorldIdByGlobalStage,
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
import { StepGuideModal } from '../src/components/step-guide.js';

describe('Milestone 1: Core Math Curriculum Engine', () => {
  describe('1. Worlds & Stages Metadata (7 Worlds, 21 Stages, Mini-Lessons)', () => {
    it('exports all 7 worlds and 21 stages with complete metadata and 3-card mini-lessons', () => {
      const worlds = getWorldsMetadata();
      assert.equal(worlds.length, 7);
      assert.equal(WORLDS_METADATA.length, 7);

      let totalStages = 0;
      for (let w = 1; w <= 7; w++) {
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
      assert.equal(totalStages, 21);
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

  describe('2. Dual-Compatibility Schema & StepGuide Contract Across All 21 Stages', () => {
    it('generates valid MathProblem objects with both PROJECT.md and analysis.md fields for all 21 stages', () => {
      for (let w = 1; w <= 7; w++) {
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
    it('generates number-varied problems preserving cognitive traps across all 21 stages', () => {
      for (let w = 1; w <= 7; w++) {
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

      for (let w = 1; w <= 7; w++) {
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

describe('BUG-008: hint and step-guide wording must match the actual problem and answer', () => {
  it('example 1 (stage 4, 70x60): a place-value slip in multiplication never mentions くり下がり', () => {
    const problem = {
      operator: '×',
      operands: [70, 60],
      correctAnswer: { value: 4200, remainder: 0 },
      answer: 4200,
      remainder: 0,
      errorDiagnostics: [],
      commonTrap: { mistakeValue: 420, reasonCategory: 'shift_forgotten', diagnosis: 'x', hintMessage: 'y' }
    };
    const diag = diagnoseError(problem, 4300); // off by exactly 100
    assert.equal(diag.matched, true);
    assert.equal(diag.reasonCategory, 'place_value_slip');
    assert.ok(!diag.adviceMessage.includes('くり下がり'), diag.adviceMessage);
    assert.ok(!diag.adviceMessage.includes('くり上がり'), diag.adviceMessage);
    assert.ok(!diag.diagnosis.includes('くり下がり'), diag.diagnosis);
    assert.deepEqual(diag.userAnswer, { value: 4300, remainder: 0 });
  });

  it('place-value slip wording stays operation-specific for addition and subtraction', () => {
    const base = {
      operands: [500, 200],
      correctAnswer: { value: 700, remainder: 0 },
      answer: 700,
      remainder: 0,
      errorDiagnostics: [],
      commonTrap: { mistakeValue: 701, reasonCategory: 'x', diagnosis: 'x', hintMessage: 'y' }
    };
    const addDiag = diagnoseError({ ...base, operator: '+' }, 800);
    assert.equal(addDiag.reasonCategory, 'carry_forgotten');
    assert.ok(addDiag.adviceMessage.includes('くり上がり'));
    assert.ok(!addDiag.adviceMessage.includes('くり下がり'));

    const subDiag = diagnoseError({ ...base, operator: '-', correctAnswer: { value: 300, remainder: 0 }, answer: 300 }, 400);
    assert.equal(subDiag.reasonCategory, 'borrow_forgotten');
    assert.ok(subDiag.adviceMessage.includes('くり下がり'));
    assert.ok(!subDiag.adviceMessage.includes('くり上がり'));
  });

  it('example 2 (stage 10, exact division): an unmatched answer must not quote the trap hint verbatim', () => {
    const prob = generateProblem(4, 1, { level: 1, questionIndex: 1 });
    assert.equal(prob.correctAnswer.remainder, 0, 'warmup stage 4-1 problem must be exact');
    const q = prob.correctAnswer.quotient ?? prob.correctAnswer.value;
    // Learner answers one less than the correct quotient, remainder 0.
    const diag = diagnoseError(prob, { quotient: q - 1, remainder: 0 });
    assert.equal(diag.reasonCategory, 'general_recheck');
    assert.ok(!diag.adviceMessage.includes('大正解'), diag.adviceMessage);
    assert.ok(!diag.adviceMessage.includes('ではなく'), diag.adviceMessage);
    assert.deepEqual(diag.userAnswer, { value: q - 1, remainder: 0 });
  });

  it('example 2 (stage 10, exact division): answering the correct quotient with remainder 1 is not self-contradictory', () => {
    const prob = generateProblem(4, 1, { level: 1, questionIndex: 1 });
    const q = prob.correctAnswer.quotient ?? prob.correctAnswer.value;
    const diag = diagnoseError(prob, { quotient: q, remainder: 1 });
    assert.equal(diag.matched, true);
    assert.ok(!diag.adviceMessage.includes('ではなく'), diag.adviceMessage);
    assert.ok(diag.adviceMessage.includes('あまりは「0」'), diag.adviceMessage);
  });

  it('example 3 (stage 12): diagnosis for a too-small answer advises increasing the quotient', () => {
    const prob = generateProblem(4, 3, { level: 2, questionIndex: 1 });
    const q = prob.correctAnswer.quotient ?? prob.correctAnswer.value;
    const r = prob.correctAnswer.remainder;
    const B = prob.operands[1];
    const diag = diagnoseError(prob, { quotient: q - 1, remainder: r + B });
    assert.equal(diag.reasonCategory, 'quotient_too_small');
    assert.ok(diag.adviceMessage.includes('商を1つ増やして'), diag.adviceMessage);
    assert.deepEqual(diag.userAnswer, { value: q - 1, remainder: r + B });
  });

  it('example 3 (stage 12, 95/34): step 1 is rewritten from the learner\u2019s actual too-small answer', () => {
    const problem = {
      operands: [95, 34],
      operator: '÷',
      correctAnswer: { value: 2, quotient: 2, remainder: 27 },
      stepGuide: [
        {
          stepNumber: 1,
          title: '仮の商をたてて自己修正しよう',
          explanation: '34 をおよそ 30 とみて仮の商「3」をたてると、積が 102 で 95 から引けないね！商を1小さく修正するといくつ？',
          expectedStepValue: 2,
          correctionTrigger: {
            condition: 'product_greater_than_dividend',
            hintMessage: '仮の商「3」だと積が102になり引けないね！',
            adjustedValue: 2
          }
        }
      ]
    };
    const diagnosis = {
      reasonCategory: 'quotient_too_small',
      userAnswer: { value: 1, remainder: 61 }
    };
    const modal = new StepGuideModal({ problem, diagnosis });
    const step1 = modal.session.steps[0];
    assert.ok(step1.explanation.includes('あなたがたてた商「1」'), step1.explanation);
    assert.ok(step1.explanation.includes('あまりが 61'), step1.explanation);
    assert.ok(step1.explanation.includes('1大きく修正するといくつ'), step1.explanation);
    assert.equal(step1.expectedStepValue, 2);
    // The problem's own step guide must not be mutated.
    assert.ok(problem.stepGuide[0].explanation.includes('仮の商「3」'));
  });

  it('step guide is left untouched when the learner\u2019s error matches the designed trap', () => {
    const problem = {
      operands: [95, 34],
      operator: '÷',
      correctAnswer: { value: 2, quotient: 2, remainder: 27 },
      stepGuide: [
        {
          stepNumber: 1,
          title: '仮の商をたてて自己修正しよう',
          explanation: 'original too-big explanation',
          expectedStepValue: 2,
          correctionTrigger: {
            condition: 'product_greater_than_dividend',
            hintMessage: 'h',
            adjustedValue: 2
          }
        }
      ]
    };
    const diagnosis = {
      reasonCategory: 'quotient_too_big',
      userAnswer: { value: 3, remainder: 0 }
    };
    const modal = new StepGuideModal({ problem, diagnosis });
    assert.equal(modal.session.steps[0].explanation, 'original too-big explanation');
  });

  it('issue #13: a difference of exactly 1000 is diagnosed at the thousands place', () => {
    const problem = {
      operator: '+',
      operands: [3000, 2000],
      correctAnswer: { value: 5000, remainder: 0 },
      answer: 5000,
      remainder: 0,
      errorDiagnostics: [],
      commonTrap: { mistakeValue: 5001, reasonCategory: 'x', diagnosis: 'x', hintMessage: 'y' }
    };
    const diag = diagnoseError(problem, 4000); // off by exactly 1000
    assert.equal(diag.matched, true);
    assert.equal(diag.reasonCategory, 'carry_forgotten');
    assert.ok(diag.diagnosis.includes('千の位'), diag.diagnosis);
    assert.ok(!diag.diagnosis.includes('百の位'), diag.diagnosis);
  });

  it('issue #13: the place named in the diagnosis matches the differing digit (100 vs 1000)', () => {
    const mul = {
      operator: '×',
      operands: [70, 60],
      correctAnswer: { value: 4200, remainder: 0 },
      answer: 4200,
      remainder: 0,
      errorDiagnostics: [],
      commonTrap: { mistakeValue: 420, reasonCategory: 'x', diagnosis: 'x', hintMessage: 'y' }
    };
    const diag100 = diagnoseError(mul, 4300); // off by exactly 100
    assert.ok(diag100.diagnosis.includes('百の位'), diag100.diagnosis);
    assert.ok(!diag100.diagnosis.includes('千の位'), diag100.diagnosis);

    const add = {
      operator: '+',
      operands: [3000, 2000],
      correctAnswer: { value: 5000, remainder: 0 },
      answer: 5000,
      remainder: 0,
      errorDiagnostics: [],
      commonTrap: { mistakeValue: 5001, reasonCategory: 'x', diagnosis: 'x', hintMessage: 'y' }
    };
    const diag1000 = diagnoseError(add, 6000); // off by exactly 1000
    assert.ok(diag1000.diagnosis.includes('千の位'), diag1000.diagnosis);
    assert.ok(!diag1000.diagnosis.includes('百の位'), diag1000.diagnosis);
  });

  it('issue #13: the remainder-scale trap (170/30 answered as 5 r 2) is diagnosed', () => {
    const problem = {
      operator: '÷',
      operands: [170, 30],
      correctAnswer: { value: 5, quotient: 5, remainder: 20 },
      answer: 5,
      remainder: 20,
      errorDiagnostics: [],
      commonTrap: { mistakeValue: 4, reasonCategory: 'x', diagnosis: 'x', hintMessage: 'y' }
    };
    const diag = diagnoseError(problem, { quotient: 5, remainder: 2 });
    assert.equal(diag.matched, true);
    assert.equal(diag.reasonCategory, 'remainder_scale');
    assert.ok(diag.adviceMessage.includes('20'), diag.adviceMessage);
  });

  it('issue #13: step 1 is rewritten when the submitted remainder equals the divisor exactly (72/18)', () => {
    const problem = {
      operands: [72, 18],
      operator: '÷',
      correctAnswer: { value: 4, quotient: 4, remainder: 0 },
      stepGuide: [
        {
          stepNumber: 1,
          title: '仮の商をたてて自己修正しよう',
          explanation: 'original too-big explanation',
          expectedStepValue: 4,
          correctionTrigger: {
            condition: 'product_greater_than_dividend',
            hintMessage: 'h',
            adjustedValue: 4
          }
        }
      ]
    };
    const diagnosis = {
      reasonCategory: 'quotient_too_small',
      userAnswer: { value: 3, remainder: 18 } // remainder == divisor: boundary of userR >= B
    };
    const modal = new StepGuideModal({ problem, diagnosis });
    const step1 = modal.session.steps[0];
    assert.ok(step1.explanation.includes('商が小さすぎたから'), step1.explanation);
    assert.ok(step1.explanation.includes('あまりが 18'), step1.explanation);
    assert.equal(step1.expectedStepValue, 4);
  });

  it('issue #13: step 1 is not rewritten when the submitted product equals the dividend exactly (72/18)', () => {
    const problem = {
      operands: [72, 18],
      operator: '÷',
      correctAnswer: { value: 4, quotient: 4, remainder: 0 },
      stepGuide: [
        {
          stepNumber: 1,
          title: '仮の商をたてて自己修正しよう',
          explanation: 'original too-small explanation',
          expectedStepValue: 4,
          correctionTrigger: {
            condition: 'difference_gte_divisor',
            hintMessage: 'h',
            adjustedValue: 4
          }
        }
      ]
    };
    const diagnosis = {
      reasonCategory: 'quotient_too_big',
      userAnswer: { value: 4, remainder: 5 } // 4 * 18 == 72 == dividend: boundary of userQ * B > A
    };
    const modal = new StepGuideModal({ problem, diagnosis });
    assert.equal(modal.session.steps[0].explanation, 'original too-small explanation');
  });
});

describe('Issue #16: World 6 小数ラボ (decimals)', () => {
  it('normalizes World 6 stages and keeps stage-1..15 interpretations unchanged', () => {
    assert.deepEqual(normalizeWorldAndStage(null, 'stage-16'), {
      worldId: 6,
      stageId: 1,
      globalStageNumber: 16
    });
    assert.deepEqual(normalizeWorldAndStage(null, 'stage-17'), {
      worldId: 6,
      stageId: 2,
      globalStageNumber: 17
    });
    assert.deepEqual(normalizeWorldAndStage(null, 'stage-18'), {
      worldId: 6,
      stageId: 3,
      globalStageNumber: 18
    });
    assert.deepEqual(normalizeWorldAndStage(6, 2), {
      worldId: 6,
      stageId: 2,
      globalStageNumber: 17
    });
    // Out-of-range values still fall back to World 1 Stage 1
    // (World 7 / stage-19..21 became valid with Issue #17, so use 8 / stage-22)
    assert.deepEqual(normalizeWorldAndStage(8, 1), {
      worldId: 1,
      stageId: 1,
      globalStageNumber: 1
    });
    assert.deepEqual(normalizeWorldAndStage(null, 'stage-22'), {
      worldId: 1,
      stageId: 1,
      globalStageNumber: 1
    });
    // Existing stages keep their meaning
    for (let g = 1; g <= 15; g++) {
      const norm = normalizeWorldAndStage(null, `stage-${g}`);
      assert.equal(norm.globalStageNumber, g);
      assert.equal(norm.worldId, Math.ceil(g / 3));
      assert.equal(norm.stageId, ((g - 1) % 3) + 1);
    }
  });

  it('exposes World 6 metadata with decimal stages and 3-card mini-lessons', () => {
    const meta = getStageMetadata(6, 1);
    assert.equal(meta.globalId, 'stage-16');
    assert.equal(meta.usesDecimal, true);
    assert.equal(getStageMetadata(6, 2).globalId, 'stage-17');
    assert.equal(getStageMetadata(6, 3).globalId, 'stage-18');
    const world6 = getWorldsMetadata()[5];
    assert.equal(world6.title, '小数ラボ');
    assert.equal(world6.stages.length, 3);
  });

  it('generates arithmetically exact decimal addition/subtraction across difficulties', () => {
    for (const diff of ['warmup', 'standard', 'hurdle', 'challenge', 'remedial']) {
      for (let i = 0; i < 40; i++) {
        const add = generateProblem(6, 2, { difficultyLevel: diff });
        const scale = add.trapMetadata.decimalScale;
        assert.ok(scale === 10 || scale === 100);
        const expectAdd =
          (Math.round(add.operands[0] * scale) + Math.round(add.operands[1] * scale)) / scale;
        assert.equal(add.correctAnswer.value, expectAdd);
        // 0.1 + 0.2 style float error must never mark a correct answer wrong
        assert.equal(evaluateAnswer(add, add.correctAnswer.value).isCorrect, true);
        assert.equal(evaluateAnswer(add, String(add.correctAnswer.value)).isCorrect, true);

        const sub = generateProblem(6, 3, { difficultyLevel: diff });
        const sScale = sub.trapMetadata.decimalScale;
        const expectSub =
          (Math.round(sub.operands[0] * sScale) - Math.round(sub.operands[1] * sScale)) / sScale;
        assert.equal(sub.correctAnswer.value, expectSub);
        assert.ok(sub.correctAnswer.value > 0);
        assert.equal(evaluateAnswer(sub, sub.correctAnswer.value).isCorrect, true);
      }
    }
  });

  it('requires a ones-place carry in decimal addition and a borrow in subtraction', () => {
    for (let i = 0; i < 60; i++) {
      const add = generateProblem(6, 2, { difficultyLevel: 'standard' });
      const scale = add.trapMetadata.decimalScale;
      const aLow = Math.round(add.operands[0] * scale) % 10;
      const bLow = Math.round(add.operands[1] * scale) % 10;
      assert.ok(aLow + bLow >= 10, `lowest place must carry: ${add.expression}`);

      const sub = generateProblem(6, 3, { difficultyLevel: 'standard' });
      const sScale = sub.trapMetadata.decimalScale;
      const aLowS = Math.round(sub.operands[0] * sScale) % 10;
      const bLowS = Math.round(sub.operands[1] * sScale) % 10;
      assert.ok(aLowS < bLowS, `lowest place must borrow: ${sub.expression}`);
    }
  });

  it('generates decimal-structure problems whose answers are consistent', () => {
    for (const diff of ['warmup', 'standard', 'hurdle', 'challenge']) {
      for (let i = 0; i < 40; i++) {
        const p = generateProblem(6, 1, { difficultyLevel: diff });
        assert.equal(evaluateAnswer(p, p.correctAnswer.value).isCorrect, true);
        if (p.patternType === 'decimal_tenths_count') {
          // 0.1 が n こ = n / 10
          assert.equal(p.correctAnswer.value, p.trapMetadata.count / 10);
        }
        if (p.patternType.startsWith('decimal_count_of')) {
          // 答えは unit が何こ分か (整数)
          assert.ok(Number.isInteger(p.correctAnswer.value));
          assert.equal(p.correctAnswer.value, p.trapMetadata.count);
        }
      }
    }
  });

  it('diagnoses the integer-as-decimal trap with decimal categories', () => {
    for (let i = 0; i < 40; i++) {
      const add = generateProblem(6, 2, { difficultyLevel: 'standard' });
      const diag = diagnoseError(add, add.commonTrap.mistakeValue);
      assert.equal(diag.matched, true);
      assert.equal(diag.reasonCategory, 'decimal_point_ignored');

      const sub = generateProblem(6, 3, { difficultyLevel: 'standard' });
      const diagSub = diagnoseError(sub, sub.commonTrap.mistakeValue);
      assert.equal(diagSub.matched, true);
      assert.equal(diagSub.reasonCategory, 'decimal_point_ignored');
    }
  });

  it('diagnoses a one-place point shift dynamically', () => {
    const add = generateProblem(6, 2, { difficultyLevel: 'standard' });
    const shifted = add.correctAnswer.value * 10;
    if (shifted !== add.commonTrap.mistakeValue) {
      const diag = diagnoseError(add, shifted);
      assert.equal(diag.matched, true);
      assert.ok(
        diag.reasonCategory === 'decimal_point_position' ||
          diag.reasonCategory === 'decimal_point_ignored'
      );
    }
  });

  it('generates World 6 variations (incl. compact treasure-box format)', () => {
    for (let s = 1; s <= 3; s++) {
      const orig = generateProblem(6, s, { difficultyLevel: 'hurdle' });
      const varied = generateVariationProblem(orig);
      assert.equal(varied.worldId, 6);
      assert.equal(varied.stageId, s);
      assert.equal(varied.patternType, orig.patternType);
      assert.notEqual(varied.expression, orig.expression);
      assert.equal(evaluateAnswer(varied, varied.correctAnswer.value).isCorrect, true);
    }
    // Compact format without trapMetadata still yields a World 6 variation
    const compact = { worldId: 6, stageId: 2, num1: 3.25, num2: 1.48, operator: '+', answer: 4.73 };
    const compactVar = generateVariationProblem(compact);
    assert.equal(compactVar.worldId, 6);
    assert.equal(compactVar.stageId, 2);
    assert.equal(evaluateAnswer(compactVar, compactVar.correctAnswer.value).isCorrect, true);
  });

  it('serves a full 5-problem decimal stage set', () => {
    const problems = generateStageProblems(6, 17, []);
    assert.equal(problems.length, 5);
    for (const p of problems) {
      assert.equal(p.worldId, 6);
      assert.equal(evaluateAnswer(p, p.correctAnswer.value).isCorrect, true);
    }
  });

  it('grades decimals strictly: finer input than the scale is wrong (Pi review regression)', () => {
    const prob73 = {
      operator: '+',
      correctAnswer: { value: 7.3, quotient: 7.3, remainder: 0 },
      answer: 7.3,
      trapMetadata: { decimalScale: 100 }
    };
    assert.equal(evaluateAnswer(prob73, 7.3).isCorrect, true);
    // Math.round-only comparison used to accept these via rounding
    assert.equal(evaluateAnswer(prob73, 7.301).isCorrect, false);
    assert.equal(evaluateAnswer(prob73, 7.305).isCorrect, false);
    assert.equal(evaluateAnswer(prob73, '7.301').isCorrect, false);

    const prob73Scale10 = { ...prob73, trapMetadata: { decimalScale: 10 } };
    assert.equal(evaluateAnswer(prob73Scale10, 7.3).isCorrect, true);
    assert.equal(evaluateAnswer(prob73Scale10, 7.34).isCorrect, false);

    // 0.1 + 0.2 style binary float error must still be accepted
    const prob03 = {
      operator: '+',
      correctAnswer: { value: 0.3, quotient: 0.3, remainder: 0 },
      answer: 0.3,
      trapMetadata: { decimalScale: 10 }
    };
    assert.equal(evaluateAnswer(prob03, 0.1 + 0.2).isCorrect, true);

    // Generated problems: a sub-scale perturbation of the answer is never correct
    for (const diff of ['warmup', 'standard', 'hurdle', 'challenge', 'remedial']) {
      for (let i = 0; i < 30; i++) {
        for (const s of [2, 3]) {
          const p = generateProblem(6, s, { difficultyLevel: diff });
          const scale = p.trapMetadata.decimalScale;
          assert.equal(evaluateAnswer(p, p.correctAnswer.value).isCorrect, true);
          assert.equal(
            evaluateAnswer(p, p.correctAnswer.value + 1 / (scale * 10)).isCorrect,
            false,
            `${p.expression}: answer + 1/${scale * 10} must be wrong`
          );
          assert.equal(
            evaluateAnswer(p, p.correctAnswer.value + 5 / (scale * 100)).isCorrect,
            false,
            `${p.expression}: answer + 5/${scale * 100} must be wrong`
          );
        }
      }
    }
  });

  it('never shows a negative number in Stage 6-3 step explanations (borrow across 0)', () => {
    let sawBorrowFromZero = false;
    for (const diff of ['warmup', 'standard', 'hurdle', 'challenge', 'remedial']) {
      for (let i = 0; i < 120; i++) {
        const p = generateProblem(6, 3, { difficultyLevel: diff });
        for (const step of p.stepGuide.steps) {
          const text = step.explanation || '';
          assert.ok(!/-\d+。/.test(text), `negative value leaked into step text: ${text}`);
          if (text.includes('0 しかないので、上の位から 10 を借りてこよう')) {
            sawBorrowFromZero = true;
            // The expected step value must stay the plain digit result
            assert.ok(Number.isInteger(step.expectedStepValue));
            assert.ok(step.expectedStepValue >= 0 && step.expectedStepValue <= 9);
          }
        }
      }
    }
    assert.ok(sawBorrowFromZero, 'the borrow-across-zero wording must be exercised');
  });

  it('ends decimal_place_digit guides by assembling the whole number, not repeating the digit', () => {
    let seen = 0;
    for (let i = 0; i < 400 && seen < 30; i++) {
      const p = generateProblem(6, 1, { difficultyLevel: 'challenge' });
      if (p.patternType !== 'decimal_place_digit') continue;
      seen++;
      const steps = p.stepGuide.steps;
      const finalStep = steps[steps.length - 1];
      assert.equal(finalStep.id, 'final');
      // operands[0] is the full decimal (m / 100); the final step asks for it whole
      assert.equal(finalStep.expectedStepValue, p.operands[0]);
      assert.notEqual(finalStep.expectedStepValue, p.correctAnswer.value);
    }
    assert.ok(seen > 0, 'decimal_place_digit problems must be generated');
  });

  it('maps global stage numbers to worlds via metadata (getWorldIdByGlobalStage)', () => {
    assert.equal(getWorldIdByGlobalStage(1), 1);
    assert.equal(getWorldIdByGlobalStage(3), 1);
    assert.equal(getWorldIdByGlobalStage(4), 2);
    assert.equal(getWorldIdByGlobalStage(15), 5);
    assert.equal(getWorldIdByGlobalStage(16), 6);
    assert.equal(getWorldIdByGlobalStage(18), 6);
    assert.equal(getWorldIdByGlobalStage(0), 1);
    assert.equal(CurriculumEngine.getWorldIdByGlobalStage(17), 6);
    // Consistent with WORLDS_METADATA stage ranges
    for (const world of WORLDS_METADATA) {
      for (const stage of world.stages) {
        assert.equal(getWorldIdByGlobalStage(stage.globalStageNumber), world.worldId);
      }
    }
  });

  it('labels Stage 16 answers as こたえ with a non-misleading mixed operator', () => {
    const meta = getStageMetadata(6, 1);
    assert.equal(meta.answerLabel, 'こたえ');
    assert.equal(meta.operator, 'mixed');
  });
});

describe('Issue #17: World 7 分数パーク (fractions)', () => {
  it('normalizes World 7 stages and keeps stage-1..18 interpretations unchanged', () => {
    assert.deepEqual(normalizeWorldAndStage(null, 'stage-19'), {
      worldId: 7,
      stageId: 1,
      globalStageNumber: 19
    });
    assert.deepEqual(normalizeWorldAndStage(null, 'stage-20'), {
      worldId: 7,
      stageId: 2,
      globalStageNumber: 20
    });
    assert.deepEqual(normalizeWorldAndStage(null, 'stage-21'), {
      worldId: 7,
      stageId: 3,
      globalStageNumber: 21
    });
    assert.deepEqual(normalizeWorldAndStage(7, 2), {
      worldId: 7,
      stageId: 2,
      globalStageNumber: 20
    });
    // Existing stages keep their meaning
    for (let g = 1; g <= 18; g++) {
      const norm = normalizeWorldAndStage(null, `stage-${g}`);
      assert.equal(norm.globalStageNumber, g);
      assert.equal(norm.worldId, Math.ceil(g / 3));
      assert.equal(norm.stageId, ((g - 1) % 3) + 1);
    }
  });

  it('exposes World 7 metadata with fraction stages and 3-card mini-lessons', () => {
    const meta = getStageMetadata(7, 1);
    assert.equal(meta.globalId, 'stage-19');
    assert.equal(meta.usesFraction, true);
    assert.equal(getStageMetadata(7, 2).globalId, 'stage-20');
    assert.equal(getStageMetadata(7, 3).globalId, 'stage-21');
    const world7 = getWorldsMetadata()[6];
    assert.equal(world7.title, '分数パーク');
    assert.equal(world7.stages.length, 3);
  });

  it('generates arithmetically exact same-denominator addition/subtraction across difficulties', () => {
    for (const diff of ['warmup', 'standard', 'hurdle', 'challenge', 'remedial']) {
      for (let i = 0; i < 40; i++) {
        const add = generateProblem(7, 2, { difficultyLevel: diff });
        const fa = add.trapMetadata.fractionAnswer;
        const [aNum, aDen, bNum, bDen] = add.operands;
        assert.equal(aDen, bDen);
        assert.equal(fa.denominator, aDen);
        assert.equal(fa.numerator, aNum + bNum);
        assert.equal(add.hasFraction, true);
        if (diff === 'challenge') {
          assert.ok(fa.numerator > fa.denominator, 'challenge addition must exceed 1 (improper fraction)');
        } else {
          assert.ok(fa.numerator < fa.denominator, 'non-challenge addition must stay a proper fraction');
        }
        assert.equal(
          evaluateAnswer(add, { numerator: fa.numerator, denominator: fa.denominator }).isCorrect,
          true
        );
        assert.equal(evaluateAnswer(add, `${fa.numerator}/${fa.denominator}`).isCorrect, true);

        const sub = generateProblem(7, 3, { difficultyLevel: diff });
        const fs = sub.trapMetadata.fractionAnswer;
        const [sNum, sDen, tNum, tDen] = sub.operands;
        assert.equal(sDen, tDen);
        assert.equal(fs.denominator, sDen);
        assert.equal(fs.numerator, sNum - tNum);
        assert.ok(fs.numerator > 0, 'subtraction result must stay positive');
        assert.equal(sub.hasFraction, true);
        assert.equal(
          evaluateAnswer(sub, { numerator: fs.numerator, denominator: fs.denominator }).isCorrect,
          true
        );
      }
    }
  });

  it('generates fraction-structure problems whose answers are consistent', () => {
    for (const diff of ['warmup', 'standard', 'hurdle', 'challenge']) {
      for (let i = 0; i < 40; i++) {
        const p = generateProblem(7, 1, { difficultyLevel: diff });
        if (p.patternType === 'frac_unit_count') {
          // 「n/d は 1/d が何こ分？」の答えは分子 n (整数)
          assert.equal(p.trapMetadata.fractionAnswer, undefined);
          assert.equal(p.hasFraction, false);
          assert.equal(p.correctAnswer.value, p.operands[0]);
          assert.equal(evaluateAnswer(p, p.correctAnswer.value).isCorrect, true);
        } else if (p.patternType === 'frac_parts_to_fraction') {
          const fa = p.trapMetadata.fractionAnswer;
          assert.equal(fa.numerator, p.operands[0]);
          assert.equal(fa.denominator, p.operands[1]);
          assert.equal(p.hasFraction, true);
          assert.equal(
            evaluateAnswer(p, { numerator: fa.numerator, denominator: fa.denominator }).isCorrect,
            true
          );
        } else if (p.patternType === 'frac_mixed_to_improper') {
          const [whole, num, den] = p.operands;
          const fa = p.trapMetadata.fractionAnswer;
          assert.equal(fa.numerator, whole * den + num);
          assert.equal(fa.denominator, den);
          assert.equal(p.hasFraction, true);
          assert.equal(
            evaluateAnswer(p, { numerator: fa.numerator, denominator: fa.denominator }).isCorrect,
            true
          );
        } else {
          assert.fail(`unknown stage 7-1 pattern: ${p.patternType}`);
        }
      }
    }
  });

  it('diagnoses the denominator-added trap and inverted fractions', () => {
    for (let i = 0; i < 40; i++) {
      const add = generateProblem(7, 2, { difficultyLevel: 'standard' });
      const fa = add.trapMetadata.fractionAnswer;
      const diag = diagnoseError(add, add.commonTrap.mistakeValue);
      assert.equal(diag.matched, true);
      assert.equal(diag.reasonCategory, 'fraction_denominator_added');

      const keypadDiag = evaluateAnswer(add, {
        numerator: fa.numerator,
        denominator: fa.denominator * 2
      });
      assert.equal(keypadDiag.isCorrect, false);
      assert.equal(keypadDiag.diagnosis.reasonCategory, 'fraction_denominator_added');

      const inverted = evaluateAnswer(add, {
        numerator: fa.denominator,
        denominator: fa.numerator
      });
      assert.equal(inverted.isCorrect, false);
      assert.equal(inverted.diagnosis.reasonCategory, 'fraction_inverted');
    }
  });

  it('diagnoses the borrow-forgotten trap in mixed-number subtraction', () => {
    let sampled = 0;
    for (let i = 0; i < 200 && sampled < 20; i++) {
      const sub = generateProblem(7, 3, { difficultyLevel: 'hurdle' });
      if (sub.patternType !== 'frac_sub_mixed_borrow') continue;
      const { fracNum, fracSub, fracDen } = sub.trapMetadata;
      const res = evaluateAnswer(sub, { numerator: fracSub - fracNum, denominator: fracDen });
      assert.equal(res.isCorrect, false);
      assert.equal(res.diagnosis.reasonCategory, 'fraction_borrow_forgotten');
      sampled++;
    }
    assert.ok(sampled > 0, 'expected at least one borrow-pattern problem');
  });

  it('rejects fraction answers whose numerator or denominator is wrong', () => {
    const p = generateProblem(7, 2, { difficultyLevel: 'standard' });
    const fa = p.trapMetadata.fractionAnswer;
    const wrongNum = evaluateAnswer(p, { numerator: fa.numerator + 1, denominator: fa.denominator });
    assert.equal(wrongNum.isCorrect, false);
    assert.equal(wrongNum.diagnosis.reasonCategory, 'fraction_numerator_slip');
    const wrongDen = evaluateAnswer(p, { numerator: fa.numerator, denominator: fa.denominator + 1 });
    assert.equal(wrongDen.isCorrect, false);
    assert.equal(wrongDen.diagnosis.reasonCategory, 'fraction_denominator_changed');
    // A bare number (even the equivalent decimal value) is not a fraction answer
    assert.equal(evaluateAnswer(p, fa.numerator / fa.denominator).isCorrect, false);
    // normalizeUserAnswer understands fraction objects and "n/d" strings
    assert.deepEqual(normalizeUserAnswer({ numerator: 3, denominator: 7 }), {
      value: 3 / 7,
      remainder: 0,
      hasExplicitRemainder: false,
      numerator: 3,
      denominator: 7
    });
    assert.deepEqual(normalizeUserAnswer('3/7'), {
      value: 3 / 7,
      remainder: 0,
      hasExplicitRemainder: false,
      numerator: 3,
      denominator: 7
    });
  });

  it('generates World 7 variations (incl. compact treasure-box format)', () => {
    for (let s = 1; s <= 3; s++) {
      const orig = generateProblem(7, s, { difficultyLevel: 'hurdle' });
      const varied = generateVariationProblem(orig);
      assert.equal(varied.worldId, 7);
      assert.equal(varied.stageId, s);
      assert.equal(varied.patternType, orig.patternType);
      assert.notEqual(varied.expression, orig.expression);
      const fa = varied.trapMetadata.fractionAnswer;
      if (fa) {
        assert.equal(
          evaluateAnswer(varied, { numerator: fa.numerator, denominator: fa.denominator }).isCorrect,
          true
        );
      } else {
        assert.equal(evaluateAnswer(varied, varied.correctAnswer.value).isCorrect, true);
      }
    }
    // Compact format without trapMetadata still yields a World 7 variation
    // that preserves the shared denominator
    const compact = { worldId: 7, stageId: 2, operands: [2, 7, 3, 7], operator: '+', answer: 5 / 7 };
    const compactVar = generateVariationProblem(compact);
    assert.equal(compactVar.worldId, 7);
    assert.equal(compactVar.stageId, 2);
    assert.equal(compactVar.trapMetadata.fractionAnswer.denominator, 7);
    const cfa = compactVar.trapMetadata.fractionAnswer;
    assert.equal(
      evaluateAnswer(compactVar, { numerator: cfa.numerator, denominator: cfa.denominator }).isCorrect,
      true
    );
  });

  it('serves a full 5-problem fraction stage set', () => {
    const problems = generateStageProblems(7, 20, []);
    assert.equal(problems.length, 5);
    const expressions = new Set(problems.map((p) => p.expression));
    assert.equal(expressions.size, 5);
    for (const p of problems) {
      assert.equal(p.worldId, 7);
      const fa = p.trapMetadata.fractionAnswer;
      assert.equal(
        evaluateAnswer(p, { numerator: fa.numerator, denominator: fa.denominator }).isCorrect,
        true
      );
    }
  });
});
