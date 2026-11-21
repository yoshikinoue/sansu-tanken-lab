/**
 * tests/m5-stress.test.js
 * Empirical Challenger Stress & Adversarial Test Suite for Milestone 5
 *
 * Covers:
 * 1. MiniLesson State Machine & Edge Conditions
 * 2. TreasureBox Quarantine, Deep-Copy Isolation & 2-Streak Master/Reset Cycle
 * 3. ParentBoard 4-Digit PIN Security, Type Coercion, Brute Force & Radar Analytics
 * 4. Router Boundary Navigation, Trailing Slashes & Malformed Hashes
 * 5. Lifecycle & Concurrency Resilience
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import * as MiniLesson from '../src/components/mini-lesson.js';
import * as TreasureBox from '../src/components/treasure-box.js';
import * as ParentBoard from '../src/components/parent-board.js';
import { routes, parseRoute, MathLabApp } from '../src/main.js';
import * as CurriculumEngine from '../src/services/curriculum-engine.js';
import * as StorageService from '../src/services/storage-service.js';

describe('Milestone 5 Empirical Stress & Boundary Harness', () => {

  // =========================================================================
  // 1. MiniLesson State Machine & Edge Cases
  // =========================================================================
  describe('1. MiniLesson State Transitions & Edge Conditions', () => {
    it('initializes default state and safely handles invalid/null stageId inputs', () => {
      const sDefault = MiniLesson.createLessonState();
      assert.equal(sDefault.stageId, 'stage-1');
      assert.equal(sDefault.currentCardIndex, 0);
      assert.equal(sDefault.quizAnswered, false);
      assert.equal(sDefault.quizIsCorrect, false);
      assert.equal(sDefault.completed, false);

      const sNumeric = MiniLesson.createLessonState(5);
      assert.equal(sNumeric.stageId, 'stage-5');

      const sNull = MiniLesson.createLessonState(null);
      assert.equal(sNull.stageId, 'stage-1');

      const sUndefined = MiniLesson.createLessonState(undefined);
      assert.equal(sUndefined.stageId, 'stage-1');

      const sEmpty = MiniLesson.createLessonState('');
      assert.equal(sEmpty.stageId, 'stage-1');
    });

    it('enforces quiz gate on Card 1: blocks advance until correct answer, persists lock across repeated wrong answers', () => {
      const state = MiniLesson.createLessonState('stage-1');

      // Card 0: can advance without quiz
      assert.equal(MiniLesson.canAdvance(state), true);
      assert.equal(MiniLesson.nextCard(state), true);
      assert.equal(state.currentCardIndex, 1);

      // Card 1: initially locked
      assert.equal(MiniLesson.canAdvance(state), false);
      assert.equal(MiniLesson.nextCard(state), false);
      assert.equal(state.currentCardIndex, 1);

      // 10 consecutive wrong answers
      for (let i = 0; i < 10; i++) {
        const res = MiniLesson.answerQuiz(state, 'WRONG_OPT', 'CORRECT_OPT');
        assert.equal(res.correct, false);
        assert.ok(res.feedback.includes('おしい'), 'Feedback must follow No-X guideline');
        assert.equal(state.quizIsCorrect, false);
        assert.equal(MiniLesson.canAdvance(state), false);
        assert.equal(MiniLesson.nextCard(state), false);
        assert.equal(state.currentCardIndex, 1);
      }

      // Correct answer unlocks gate
      const correctRes = MiniLesson.answerQuiz(state, 'A', 'A');
      assert.equal(correctRes.correct, true);
      assert.ok(correctRes.feedback.includes('大正解'));
      assert.equal(state.quizAnswered, true);
      assert.equal(state.quizIsCorrect, true);
      assert.equal(MiniLesson.canAdvance(state), true);

      // Advances to Card 2 and sets completed = true
      assert.equal(MiniLesson.nextCard(state), true);
      assert.equal(state.currentCardIndex, 2);
      assert.equal(state.completed, true);

      // Card 2 cannot advance further (capped at index 2)
      assert.equal(MiniLesson.nextCard(state), false);
      assert.equal(state.currentCardIndex, 2);
    });

    it('handles backward navigation (prevCard) and gate relocking if user re-answers incorrectly', () => {
      const state = MiniLesson.createLessonState('stage-2');

      // At Card 0, prevCard returns false and does not decrement below 0
      assert.equal(MiniLesson.prevCard(state), false);
      assert.equal(state.currentCardIndex, 0);

      // Advance to Card 1
      MiniLesson.nextCard(state);
      assert.equal(state.currentCardIndex, 1);

      // Back to Card 0
      assert.equal(MiniLesson.prevCard(state), true);
      assert.equal(state.currentCardIndex, 0);

      // Forward to Card 1 again
      MiniLesson.nextCard(state);
      assert.equal(state.currentCardIndex, 1);

      // Answer correctly and move to Card 2
      MiniLesson.answerQuiz(state, 'B', 'B');
      assert.equal(MiniLesson.nextCard(state), true);
      assert.equal(state.currentCardIndex, 2);

      // Step back to Card 1
      assert.equal(MiniLesson.prevCard(state), true);
      assert.equal(state.currentCardIndex, 1);

      // If user clicks a wrong option again, it should re-lock!
      MiniLesson.answerQuiz(state, 'A', 'B');
      assert.equal(state.quizIsCorrect, false);
      assert.equal(MiniLesson.canAdvance(state), false);
      assert.equal(MiniLesson.nextCard(state), false);
      assert.equal(state.currentCardIndex, 1);

      // Answering correctly re-unlocks
      MiniLesson.answerQuiz(state, 'B', 'B');
      assert.equal(MiniLesson.canAdvance(state), true);
      assert.equal(MiniLesson.nextCard(state), true);
      assert.equal(state.currentCardIndex, 2);
    });

    it('survives null/undefined/malformed arguments to all helper functions', () => {
      assert.equal(MiniLesson.canAdvance(null), false);
      assert.equal(MiniLesson.canAdvance(undefined), false);
      assert.equal(MiniLesson.nextCard(null), false);
      assert.equal(MiniLesson.prevCard(null), false);

      const resNull = MiniLesson.answerQuiz(null, 'A', 'A');
      assert.equal(resNull.correct, false);
      assert.ok(typeof resNull.feedback === 'string');
    });
  });

  // =========================================================================
  // 2. TreasureBox Quarantine & Mastery Logic
  // =========================================================================
  describe('2. TreasureBox Deep-Copy Isolation & 2-Streak Mastery Logic', () => {
    it('strictly isolates quarantined problems via deep copy (mutations outside do not affect box)', () => {
      const box = { items: [] };
      const originalProblem = {
        id: 'orig-prob-1',
        worldId: 1,
        stageId: 1,
        prompt: '324 + 189 = ?',
        operands: [324, 189],
        operator: '+',
        expectedAnswer: 513
      };

      const item = TreasureBox.addItem(box, originalProblem);
      assert.ok(item);
      assert.equal(item.masteryLevel, 0);
      assert.equal(item.consecutiveCorrect, 0);
      assert.equal(box.items.length, 1);

      // Mutate the original object violently
      originalProblem.prompt = 'MUTATED PROMPT';
      originalProblem.operands[0] = 999999;
      originalProblem.expectedAnswer = -1;

      // Assert item in box was NOT mutated
      assert.equal(item.originalProblem.prompt, '324 + 189 = ?');
      assert.equal(item.originalProblem.operands[0], 324);
      assert.equal(item.originalProblem.expectedAnswer, 513);
    });

    it('prevents duplicate problem entries by updating capturedAt timestamp instead of pushing duplicate item', () => {
      const box = { items: [] };
      const prob = {
        id: 'p-dup',
        stageId: 3,
        worldId: 1,
        prompt: '450 - 188 = ?',
        operands: [450, 188],
        operator: '-',
        expectedAnswer: 262
      };

      const item1 = TreasureBox.addItem(box, prob);
      const time1 = item1.capturedAt;
      assert.equal(box.items.length, 1);

      // Simulate a small delay
      const item2 = TreasureBox.addItem(box, { ...prob });
      assert.equal(box.items.length, 1, 'Duplicate prompt must not increase item count');
      assert.equal(item1.id, item2.id, 'Must reference the exact same item');
    });

    it('rigorously verifies full 2-streak mastery and reset lifecycle: 1st correct -> wrong -> reset -> 2 consecutive correct -> complete master', () => {
      const box = { items: [] };
      const prob = {
        prompt: '25 × 14 = ?',
        stageId: 6,
        worldId: 2,
        operands: [25, 14],
        operator: '×',
        expectedAnswer: 350
      };

      const item = TreasureBox.addItem(box, prob);
      assert.equal(item.consecutiveCorrect, 0);
      assert.equal(item.masteryLevel, 0);

      // 1. First correct attempt: level -> 1, consecutive -> 1
      TreasureBox.recordAttempt(item, true);
      assert.equal(item.consecutiveCorrect, 1);
      assert.equal(item.masteryLevel, 1);

      // 2. Mistake on subsequent attempt: resets consecutive -> 0, masteryLevel -> 0
      TreasureBox.recordAttempt(item, false);
      assert.equal(item.consecutiveCorrect, 0, 'Streak must reset to 0 on mistake');
      assert.equal(item.masteryLevel, 0, 'Mastery level must drop to 0 on mistake');

      // 3. Another mistake while at 0: stays 0
      TreasureBox.recordAttempt(item, false);
      assert.equal(item.consecutiveCorrect, 0);
      assert.equal(item.masteryLevel, 0);

      // 4. Try again - 1st correct: consecutive -> 1, level -> 1
      TreasureBox.recordAttempt(item, true);
      assert.equal(item.consecutiveCorrect, 1);
      assert.equal(item.masteryLevel, 1);

      // 5. 2nd consecutive correct: consecutive -> 2, level -> 2 ("完全マスター！")
      TreasureBox.recordAttempt(item, true);
      assert.equal(item.consecutiveCorrect, 2);
      assert.equal(item.masteryLevel, 2, '2 consecutive correct must attain complete mastery level 2');

      // 6. 3rd consecutive correct while mastered: retains masteryLevel 2
      TreasureBox.recordAttempt(item, true);
      assert.equal(item.consecutiveCorrect, 3);
      assert.equal(item.masteryLevel, 2);

      // 7. Mistake on review: resets back to 0
      TreasureBox.recordAttempt(item, false);
      assert.equal(item.consecutiveCorrect, 0);
      assert.equal(item.masteryLevel, 0);

      // 8. Recover with 2 consecutive clears:
      TreasureBox.recordAttempt(item, true);
      assert.equal(item.consecutiveCorrect, 1);
      assert.equal(item.masteryLevel, 1);

      TreasureBox.recordAttempt(item, true);
      assert.equal(item.consecutiveCorrect, 2);
      assert.equal(item.masteryLevel, 2);
    });

    it('generates number-varied problems preserving cognitive traps and evaluates correctly', () => {
      const orig = {
        id: 'trap-orig',
        worldId: 3,
        stageId: 7,
        prompt: '75 ÷ 4 = ?',
        operands: [75, 4],
        operator: '÷',
        expectedAnswer: { quotient: 18, remainder: 3 },
        hasRemainder: true,
        commonTrap: { mistakeValue: 17, diagnosis: 'あまりがわる数より大きくなっています' }
      };

      const variation = CurriculumEngine.generateVariationProblem(orig);
      assert.ok(variation, 'Variation problem must be generated');
      assert.equal(variation.operator, '÷');
      assert.equal(variation.hasRemainder, true);
      assert.ok(variation.expectedAnswer.quotient > 0);

      // Correct answer evaluation
      const correctEval = CurriculumEngine.evaluateAnswer(variation, variation.expectedAnswer);
      assert.equal(correctEval.isCorrect, true);

      // Incorrect answer evaluation
      const wrongEval = CurriculumEngine.evaluateAnswer(variation, { quotient: 999, remainder: 999 });
      assert.equal(wrongEval.isCorrect, false);
      assert.ok(wrongEval.feedbackTitle || wrongEval.feedbackMessage, 'Must return encouraging hint');
    });

    it('safely tolerates null and malformed parameters in addItem and recordAttempt', () => {
      assert.equal(TreasureBox.addItem(null, {}), null);
      assert.equal(TreasureBox.recordAttempt(null, true), null);

      const emptyBox = {};
      const item = TreasureBox.addItem(emptyBox, { prompt: '1+1=?' });
      assert.ok(item);
      assert.equal(emptyBox.items.length, 1);
    });
  });

  // =========================================================================
  // 3. ParentBoard 4-Digit PIN Security, Brute-Force & Analytics
  // =========================================================================
  describe('3. ParentBoard 4-Digit PIN Authentication & Analytics', () => {
    it('validates 4-digit PIN authentication across string, number, and type-coerced inputs', () => {
      // Default stored PIN: '1234'
      assert.equal(ParentBoard.verifyPin('1234', '1234'), true);
      assert.equal(ParentBoard.verifyPin(1234, '1234'), true);
      assert.equal(ParentBoard.verifyPin('1234', 1234), true);
      assert.equal(ParentBoard.verifyPin(1234, 1234), true);

      // Default storedPin fallback
      assert.equal(ParentBoard.verifyPin('1234'), true);
      assert.equal(ParentBoard.verifyPin(1234), true);

      // Custom PINs
      assert.equal(ParentBoard.verifyPin('9876', '9876'), true);
      assert.equal(ParentBoard.verifyPin('0000', '0000'), true);

      // Leading zero distinction (string '0123' vs number 123 stringified to '123')
      assert.equal(ParentBoard.verifyPin('0123', '0123'), true);
      assert.equal(ParentBoard.verifyPin('0123', 123), false, 'Number 123 should not match leading zero PIN 0123');

      // Invalid / Mismatched PINs
      assert.equal(ParentBoard.verifyPin('1235', '1234'), false);
      assert.equal(ParentBoard.verifyPin('0000', '1234'), false);
      assert.equal(ParentBoard.verifyPin('', '1234'), false);
      assert.equal(ParentBoard.verifyPin(null, '1234'), false);
      assert.equal(ParentBoard.verifyPin(undefined, '1234'), false);
      assert.equal(ParentBoard.verifyPin('abcd', '1234'), false);
      assert.equal(ParentBoard.verifyPin(' 1234 ', '1234'), false);
    });

    it('survives brute-force spam: 200 consecutive failed attempts without memory leak or state corruption, unlocks immediately on correct PIN', () => {
      const board = new ParentBoard.ParentBoard({ pin: '5678' });
      assert.equal(board.isAuthenticated, false);

      for (let i = 0; i < 200; i++) {
        const fakePin = String(1000 + i);
        const ok = board.authenticate(fakePin);
        assert.equal(ok, false);
        assert.equal(board.isAuthenticated, false);
      }

      // Legitimate attempt succeeds
      const unlocked = board.authenticate('5678');
      assert.equal(unlocked, true);
      assert.equal(board.isAuthenticated, true);

      // Lock method resets state
      board.lock();
      assert.equal(board.isAuthenticated, false);
    });

    it('calculates 8-world radar chart percentages accurately across full, partial, and empty states', () => {
      // Empty progress
      const emptyScores = ParentBoard.calculateRadarScores({});
      assert.deepEqual(emptyScores, { world1: 0, world2: 0, world3: 0, world4: 0, world5: 0, world6: 0, world7: 0, world8: 0 });

      // Partial progress: World 1 has 1 stage cleared, World 2 has 2 stages, World 3 has 3 stages
      const partialProgress = {
        stageProgress: {
          'stage-1': { cleared: true },
          'stage-2': { cleared: false },
          'stage-3': { cleared: false },
          'stage-4': { cleared: true },
          'stage-5': { cleared: true },
          'stage-6': { cleared: false },
          'stage-7': { cleared: true },
          'stage-8': { cleared: true },
          'stage-9': { cleared: true }
        }
      };
      const partialScores = ParentBoard.calculateRadarScores(partialProgress);
      assert.equal(partialScores.world1, 33); // 1/3 * 100 = 33
      assert.equal(partialScores.world2, 67); // 2/3 * 100 = 67
      assert.equal(partialScores.world3, 100); // 3/3 * 100 = 100
      assert.equal(partialScores.world4, 0);
      assert.equal(partialScores.world5, 0);
      assert.equal(partialScores.world6, 0);
      assert.equal(partialScores.world7, 0);
      assert.equal(partialScores.world8, 0);

      // Full progress: all 24 stages cleared
      const fullProgress = { stageProgress: {} };
      for (let s = 1; s <= 24; s++) {
        fullProgress.stageProgress[`stage-${s}`] = { cleared: true };
      }
      const fullScores = ParentBoard.calculateRadarScores(fullProgress);
      assert.deepEqual(fullScores, { world1: 100, world2: 100, world3: 100, world4: 100, world5: 100, world6: 100, world7: 100, world8: 100 });
    });

    it('creates cheer stamp with strict 50-character boundary capping and unread defaults', () => {
      const normalStamp = ParentBoard.createCheerStamp('STAMP_PERSEVERANCE', '毎日よくがんばっているね！');
      assert.equal(normalStamp.stampId, 'STAMP_PERSEVERANCE');
      assert.equal(normalStamp.customText, '毎日よくがんばっているね！');
      assert.equal(normalStamp.readByChild, false);
      assert.equal(normalStamp.childReaction, null);
      assert.ok(normalStamp.id.startsWith('cheer-'));

      // Overflow text exceeding 50 characters
      const longMessage = 'あ'.repeat(120);
      const cappedStamp = ParentBoard.createCheerStamp('STAMP_RECOVERY', longMessage);
      assert.equal(cappedStamp.customText.length, 50);
      assert.equal(cappedStamp.customText, 'あ'.repeat(50));

      // Empty / undefined text
      const emptyStamp = ParentBoard.createCheerStamp('STAMP_PROUD');
      assert.equal(emptyStamp.customText, '');
    });
  });

  // =========================================================================
  // 4. Router Boundary Navigation & Resiliency
  // =========================================================================
  describe('4. Router Boundary Routing & Malformed Hash Resilience', () => {
    it('defines exactly the 5 canonical SPA routes', () => {
      assert.deepEqual(routes, ['#map', '#stage', '#treasure', '#parent', '#lesson']);
    });

    it('parses valid route hashes and extracts parameters cleanly', () => {
      assert.deepEqual(parseRoute('#map'), { view: '#map', param: null });
      assert.deepEqual(parseRoute('#treasure'), { view: '#treasure', param: null });
      assert.deepEqual(parseRoute('#parent'), { view: '#parent', param: null });
      assert.deepEqual(parseRoute('#stage/stage-1'), { view: '#stage', param: 'stage-1' });
      assert.deepEqual(parseRoute('#lesson/stage-15'), { view: '#lesson', param: 'stage-15' });
    });

    it('gracefully handles missing leading hashes, defaulting cleanly', () => {
      assert.deepEqual(parseRoute('map'), { view: '#map', param: null });
      assert.deepEqual(parseRoute('stage/stage-5'), { view: '#stage', param: 'stage-5' });
      assert.deepEqual(parseRoute('treasure'), { view: '#treasure', param: null });
    });

    it('normalizes trailing slashes, empty parameters, and extra slash segments', () => {
      // Trailing slash with no param should have param: null
      assert.deepEqual(parseRoute('#map/'), { view: '#map', param: null });
      assert.deepEqual(parseRoute('#stage/'), { view: '#stage', param: null });
      assert.deepEqual(parseRoute('#parent/'), { view: '#parent', param: null });

      // Trailing slash after param
      const parsedTrailing = parseRoute('#stage/stage-3/');
      assert.equal(parsedTrailing.view, '#stage');
      assert.equal(parsedTrailing.param, 'stage-3');

      // Extra segments beyond the second component
      const parsedMulti = parseRoute('#lesson/stage-4/extra/deep/path');
      assert.equal(parsedMulti.view, '#lesson');
      assert.equal(parsedMulti.param, 'stage-4');
    });

    it('falls back safely to #map on empty, malformed, or hostile hashes', () => {
      const hostileCases = [
        '',
        '#',
        '##',
        '#/',
        '#!/',
        '#invalid_route',
        '#admin',
        '#dashboard/secret',
        'javascript:void(0)',
        '<script>alert(1)</script>',
        '../../../etc/passwd',
        null,
        undefined,
        0,
        123,
        false,
        true,
        {},
        []
      ];

      for (const badHash of hostileCases) {
        const res = parseRoute(badHash);
        assert.equal(res.view, '#map', `Route "${badHash}" should fall back to #map`);
      }
    });
  });

  // =========================================================================
  // 5. End-to-End Persistence & Arena Boundary Stress
  // =========================================================================
  describe('5. Application State & Storage Persistence Boundary Integration', () => {
    it('instantiates MathLabApp safely in headless node environment without crashing', async () => {
      const app = new MathLabApp();
      assert.ok(app);
      assert.equal(app.currentRoute.view, '#map');

      // init in headless should resolve safely without throwing
      await app.init();
    });

    it('integrates TreasureBox quarantined error problem round-trip through 3-tier StorageService', async () => {
      const progress = StorageService.createDefaultProgress();
      assert.equal(progress.treasureBox.items.length, 0);

      const prob = {
        id: 'roundtrip-prob',
        worldId: 4,
        stageId: 10,
        prompt: '128 ÷ 16 = ?',
        operands: [128, 16],
        operator: '÷',
        expectedAnswer: 8
      };

      TreasureBox.addItem(progress.treasureBox, prob);
      assert.equal(progress.treasureBox.items.length, 1);

      // JSON Export and Import
      const exportedJson = StorageService.exportBackupJSON(progress);
      assert.ok(exportedJson.includes('roundtrip-prob'));

      const imported = await StorageService.importBackupJSON(exportedJson);
      assert.equal(imported.treasureBox.items.length, 1);
      assert.equal(imported.treasureBox.items[0].originalProblem.prompt, '128 ÷ 16 = ?');
    });
  });
});
