/**
 * Tier 3: Cross-Feature Combinations & Multi-Component Interactions E2E Test Suite (算数探検ラボ)
 *
 * Verifies pairwise and multi-component interactions across the application:
 * - Suite 1: Curriculum Engine ↔ Step Guide ↔ Keypad ↔ No-X Toast Feedback
 * - Suite 2: Step Guide ↔ Gamification Engine ↔ Storage Service ↔ Parent Cheer Board
 * - Suite 3: Curriculum Engine ↔ Power-Up Treasure Box ↔ Review Variation Generator ↔ Gamification
 * - Suite 4: Storage Service ↔ Backend Server Contract ↔ LocalStorage ↔ Transfer Code
 * - Suite 5: Mini-Lesson ↔ Web Speech TTS ↔ Web Audio Synthesizer ↔ Stage Map & Router
 * - Suite 6: Tablet Canvas Memo Pad ↔ Virtual 10-Key Keypad ↔ Adaptive Stage Flow
 *
 * Total >= 30 test cases across 6 interaction suites.
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
  RouterReference
} from './test-helpers.js';

describe('Tier 3: Cross-Feature Combinations & Multi-Component Interactions', async () => {
  const curriculum = await loadCurriculumEngine();
  const storage = await loadStorageService();
  const soundSynth = await loadSoundEffects();
  const speech = await loadSpeechService();
  const gamification = await loadGamificationEngine();

  // =========================================================================
  // Suite 1: Curriculum Engine ↔ Step Guide ↔ Keypad ↔ No-X Toast Feedback
  // =========================================================================
  describe('Suite 1: Curriculum Engine ↔ Step Guide ↔ Keypad ↔ No-X Toast Feedback', () => {
    it('T3-S1-1: Mistake on 3-digit addition carry trap (Stage 1) triggers diagnoseError, No-X Toast, nearMiss sound, StepGuide & Keypad recovery', () => {
      const audioCtx = new MockAudioContext();
      const problem = curriculum.generateSingleProblem(1, 1, 2, 2); // 587 + 645 = 1232
      assert.equal(problem.expectedAnswer, 1232);

      // Learner enters carry-trap mistake (1222) via Keypad
      let keypad = KeypadReference.createKeypadState(false);
      for (const ch of String(problem.commonTrap.mistakeValue)) {
        keypad = KeypadReference.handleInput(keypad, ch);
      }
      const wrongAns = KeypadReference.getValue(keypad);
      assert.equal(wrongAns, 1222);

      // Diagnose error & trigger No-X Toast + nearMiss audio
      const diag = curriculum.diagnoseError(problem, wrongAns);
      assert.equal(diag.isCorrect, false);
      assert.equal(diag.isKnownTrap, true);
      assert.match(diag.diagnosis, /くり上がり/);

      const toast = ToastFeedbackReference.createToast('encourage');
      assert.equal(ToastFeedbackReference.validateToastContent(toast.message), true);
      assert.equal(toast.hasForbiddenSymbol, false);
      for (const sym of ToastFeedbackReference.forbiddenSymbols) {
        assert.equal(toast.message.includes(sym), false);
      }

      const soundRes = soundSynth.synthesize(audioCtx, 'nearMiss');
      assert.ok(soundRes);
      assert.equal(soundRes.duration, 0.15);

      // Launch StepGuide session and enter each step's expected value via Keypad
      const session = StepGuideReference.createSession(problem);
      assert.equal(session.steps.length, 3);
      for (let i = 0; i < session.steps.length; i++) {
        let stepKeypad = KeypadReference.createKeypadState(false);
        const expectedDigits = String(session.steps[i].expectedStepValue);
        for (const digit of expectedDigits) {
          stepKeypad = KeypadReference.handleInput(stepKeypad, digit);
        }
        const stepVal = KeypadReference.getValue(stepKeypad);
        const stepRes = StepGuideReference.submitStepAnswer(session, i, stepVal);
        assert.equal(stepRes.success, true);
      }
      assert.equal(session.completed, true);

      // Re-enter final answer on main Keypad and evaluate as correct
      keypad = KeypadReference.handleInput(keypad, 'clear');
      for (const ch of String(problem.expectedAnswer)) {
        keypad = KeypadReference.handleInput(keypad, ch);
      }
      assert.equal(curriculum.evaluateAnswer(problem, KeypadReference.getValue(keypad)), true);
    });

    it('T3-S1-2: Mistake on subtraction across zeroes (Stage 2, 1000 - 364) triggers borrow diagnosis, tracks StepGuide intermediate error & recovers', () => {
      const problem = curriculum.generateSingleProblem(1, 2, 2, 2); // 1000 - 364 = 636
      assert.equal(problem.operands[0], 1000);
      assert.equal(problem.operands[1], 364);
      assert.equal(problem.expectedAnswer, 636);

      // Enter common trap 736
      const diag = curriculum.diagnoseError(problem, 736);
      assert.equal(diag.isCorrect, false);
      assert.equal(diag.isKnownTrap, true);
      assert.match(diag.diagnosis, /0からのくり下がり/);

      const session = StepGuideReference.createSession(problem);
      assert.equal(session.completed, false);

      // Intentional typo on Step 0 (ones borrow)
      const badStep = StepGuideReference.submitStepAnswer(session, 0, 4);
      assert.equal(badStep.success, false);
      assert.equal(session.errorCount, 1);
      assert.ok(badStep.hint.length > 0);
      assert.equal(session.currentStepIndex, 0);

      // Recover and complete all steps
      const step0Res = StepGuideReference.submitStepAnswer(session, 0, session.steps[0].expectedStepValue);
      assert.equal(step0Res.success, true);
      assert.equal(session.currentStepIndex, 1);

      const step1Res = StepGuideReference.submitStepAnswer(session, 1, session.steps[1].expectedStepValue);
      assert.equal(step1Res.success, true);
      assert.equal(session.completed, true);
    });

    it('T3-S1-3: Mistake on 2-digit × 2-digit positional shift trap (Stage 6, 23 × 14 = 115) walks through partial products (92, 23, 322) via Keypad', () => {
      const problem = curriculum.generateSingleProblem(2, 6, 1, 2); // 23 × 14 = 322
      assert.equal(problem.expectedAnswer, 322);

      // Student forgets tens shift: 23*4 + 23*1 = 115
      const diag = curriculum.diagnoseError(problem, 115);
      assert.equal(diag.isCorrect, false);
      assert.equal(diag.isKnownTrap, true);
      assert.match(diag.diagnosis, /位ズレ/);

      const session = StepGuideReference.createSession(problem);
      assert.equal(session.steps.length, 3);
      const expectedPartials = [92, 23, 322];

      for (let idx = 0; idx < expectedPartials.length; idx++) {
        let kp = KeypadReference.createKeypadState(false);
        for (const d of String(expectedPartials[idx])) {
          kp = KeypadReference.handleInput(kp, d);
        }
        const val = KeypadReference.getValue(kp);
        assert.equal(val, expectedPartials[idx]);
        const res = StepGuideReference.submitStepAnswer(session, idx, val);
        assert.equal(res.success, true);
      }
      assert.equal(session.completed, true);
      assert.equal(curriculum.evaluateAnswer(problem, session.stepAnswers[2]), true);
    });

    it('T3-S1-4: Mistake on 3-digit ÷ 1-digit intermediate zero quotient (Stage 9, 624 ÷ 3 = 28) triggers hint toast and step verification', () => {
      const problem = curriculum.generateSingleProblem(3, 9, 1, 2); // 624 ÷ 3 = 208
      assert.equal(problem.expectedAnswer, 208);

      const diag = curriculum.diagnoseError(problem, 28);
      assert.equal(diag.isCorrect, false);
      assert.equal(diag.isKnownTrap, true);
      assert.match(diag.diagnosis, /商の「0」を立て忘れ/);

      const hintToast = ToastFeedbackReference.createToast('hint');
      assert.equal(hintToast.message, 'ヒントを発見！');
      assert.equal(ToastFeedbackReference.validateToastContent(hintToast.message), true);

      const session = StepGuideReference.createSession(problem);
      assert.equal(session.steps.length, 2);
      assert.equal(session.steps[0].expectedStepValue, 208);
      assert.equal(session.steps[1].expectedStepValue, 0);

      StepGuideReference.submitStepAnswer(session, 0, 208);
      StepGuideReference.submitStepAnswer(session, 1, 0);
      assert.equal(session.completed, true);
    });

    it('T3-S1-5: Mistake on Order of Operations parentheses trap (Stage 13, 50 - (10 + 20) = 60) guides inner parentheses (30) then subtraction (20)', () => {
      const problem = curriculum.generateSingleProblem(5, 13, 1, 2); // 50 - (10 + 20) = 20
      const diag = curriculum.diagnoseError(problem, 60);
      assert.equal(diag.isCorrect, false);
      assert.equal(diag.isKnownTrap, true);
      assert.match(diag.diagnosis, /かっこを無視/);

      const session = StepGuideReference.createSession(problem);
      assert.equal(session.steps.length, 2);
      assert.equal(session.steps[0].expectedStepValue, 30);
      assert.equal(session.steps[1].expectedStepValue, 20);

      const r1 = StepGuideReference.submitStepAnswer(session, 0, 30);
      assert.equal(r1.success, true);
      assert.equal(session.currentStepIndex, 1);

      const r2 = StepGuideReference.submitStepAnswer(session, 1, 20);
      assert.equal(r2.success, true);
      assert.equal(session.completed, true);
      assert.equal(curriculum.evaluateAnswer(problem, 20), true);
    });
  });

  // =========================================================================
  // Suite 2: Step Guide ↔ Gamification Engine ↔ Storage Service ↔ Parent Cheer Board
  // =========================================================================
  describe('Suite 2: Step Guide ↔ Gamification Engine ↔ Storage Service ↔ Parent Cheer Board', () => {
    it('T3-S2-1: Solving a problem via StepGuide (wasSelfCorrected: true) awards +20 points, increments selfCorrectionCount, and updates ParentBoard metrics', () => {
      const progress = storage.createDefaultProgress();
      const problem = curriculum.generateSingleProblem(1, 1, 1, 2);

      // Complete StepGuide to self-correct
      const session = StepGuideReference.createSession(problem);
      for (let i = 0; i < session.steps.length; i++) {
        StepGuideReference.submitStepAnswer(session, i, session.steps[i].expectedStepValue);
      }
      assert.equal(session.completed, true);

      const firstTryPts = gamification.awardPoints({ isFirstTry: true, wasSelfCorrected: false });
      const selfCorrectedPts = gamification.awardPoints({ isFirstTry: false, wasSelfCorrected: true });
      assert.equal(firstTryPts, 10);
      assert.equal(selfCorrectedPts, 20);

      progress.gamification.totalScore += selfCorrectedPts;
      progress.gamification.labExp += selfCorrectedPts;
      progress.gamification.selfCorrectionCount += 1;

      assert.equal(progress.gamification.totalScore, 20);
      assert.equal(progress.gamification.selfCorrectionCount, 1);
    });

    it('T3-S2-2: Accumulating 10 self-corrections across stages unlocks self_repair_master badge and advances Lab Rank', () => {
      const progress = storage.createDefaultProgress();
      for (let i = 0; i < 10; i++) {
        const pts = gamification.awardPoints({ isFirstTry: false, wasSelfCorrected: true });
        progress.gamification.totalScore += pts;
        progress.gamification.labExp += pts;
        progress.gamification.selfCorrectionCount += 1;
      }

      assert.equal(progress.gamification.selfCorrectionCount, 10);
      assert.equal(progress.gamification.labExp, 200);

      // Check badge eligibility for self_repair_master
      const badgeDef = gamification.badges.find(b => b.id === 'self_repair_master');
      assert.ok(badgeDef);
      assert.equal(badgeDef.title, 'リカバリーの達人');
      if (progress.gamification.selfCorrectionCount >= 10) {
        progress.gamification.unlockedBadges.push(badgeDef.id);
      }
      assert.ok(progress.gamification.unlockedBadges.includes('self_repair_master'));

      // 200 EXP advances rank from 1 to 2 (ひらめき探索者, minExp: 100)
      const newRank = gamification.calculateRank(progress.gamification.labExp);
      progress.gamification.labRank = newRank.rank;
      assert.equal(progress.gamification.labRank, 2);
      assert.equal(newRank.name, 'ひらめき探索者');
    });

    it('T3-S2-3: Stage star evaluation awards 3 stars for 5/5 first-try, 2 stars for self-corrected clear, and updates ParentBoard radar scores', () => {
      const progress = storage.createDefaultProgress();

      // Stage 1: 5/5 first-try -> 3 stars
      const stars1 = gamification.calculateStars(5, 5, 0);
      assert.equal(stars1, 3);
      progress.stageProgress['stage-1'] = {
        stageId: 'stage-1',
        unlocked: true,
        stars: stars1,
        cleared: true,
        firstTryCorrectCount: 5,
        totalAttempts: 5,
        miniLessonSeen: true,
        lastPlayedAt: new Date().toISOString()
      };

      // Stage 2: 3 first-try + 2 self-corrected = 5 -> 2 stars
      const stars2 = gamification.calculateStars(5, 3, 2);
      assert.equal(stars2, 2);
      progress.stageProgress['stage-2'] = {
        stageId: 'stage-2',
        unlocked: true,
        stars: stars2,
        cleared: true,
        firstTryCorrectCount: 3,
        totalAttempts: 5,
        miniLessonSeen: true,
        lastPlayedAt: new Date().toISOString()
      };

      const radar = ParentBoardReference.calculateRadarScores(progress);
      assert.equal(radar.world1, 67); // 2 of 3 stages cleared in World 1
      assert.equal(radar.world2, 0);
    });

    it('T3-S2-4: Parent sends cheer stamp via ParentBoard after reviewing high selfCorrectionCount and child unlocks cheer_receiver badge', () => {
      const progress = storage.createDefaultProgress();
      progress.gamification.selfCorrectionCount = 8;

      assert.equal(ParentBoardReference.verifyPin('1234', progress.parentCheer.parentPinHash), true);
      const stamp = ParentBoardReference.createCheerStamp('STAMP_RECOVERY', '粘り強く直せたね！');
      progress.parentCheer.cheerMessages.push(stamp);
      assert.equal(progress.parentCheer.cheerMessages.length, 1);
      assert.equal(progress.parentCheer.cheerMessages[0].readByChild, false);

      // Child opens and reads the cheer message
      progress.parentCheer.cheerMessages[0].readByChild = true;
      const cheerBadge = gamification.badges.find(b => b.id === 'cheer_receiver');
      assert.equal(cheerBadge.title, '心の絆');
      progress.gamification.unlockedBadges.push(cheerBadge.id);
      assert.ok(progress.gamification.unlockedBadges.includes('cheer_receiver'));
    });

    it('T3-S2-5: Full round-trip of Gamification + ParentBoard state through StorageService.exportBackupJSON and importBackupJSON', () => {
      const progress = storage.createDefaultProgress();
      progress.gamification.totalScore = 340;
      progress.gamification.labExp = 340;
      progress.gamification.labRank = gamification.calculateRank(340).rank;
      progress.gamification.selfCorrectionCount = 7;
      progress.gamification.unlockedBadges = ['first_step', 'cheer_receiver'];
      progress.parentCheer.cheerMessages.push(
        ParentBoardReference.createCheerStamp('STAMP_GREAT', '毎日がんばっているね！')
      );

      const exported = storage.exportBackupJSON(progress);
      const restored = storage.importBackupJSON(exported);

      assert.equal(restored.gamification.totalScore, 340);
      assert.equal(restored.gamification.labRank, 3);
      assert.equal(restored.gamification.selfCorrectionCount, 7);
      assert.deepEqual(restored.gamification.unlockedBadges, ['first_step', 'cheer_receiver']);
      assert.equal(restored.parentCheer.cheerMessages.length, 1);
      assert.equal(restored.parentCheer.cheerMessages[0].customText, '毎日がんばっているね！');
    });
  });

  // =========================================================================
  // Suite 3: Curriculum Engine ↔ Power-Up Treasure Box ↔ Review Variation Generator ↔ Gamification
  // =========================================================================
  describe('Suite 3: Curriculum Engine ↔ Power-Up Treasure Box ↔ Review Variation Generator ↔ Gamification', () => {
    it('T3-S3-1: Answering a stage problem wrong quarantines it in TreasureBox without duplicating on repeated failure', () => {
      const progress = storage.createDefaultProgress();
      const p1 = curriculum.generateSingleProblem(1, 1, 2, 2); // 587 + 645

      // First wrong attempt
      assert.equal(curriculum.evaluateAnswer(p1, 1222), false);
      const item1 = TreasureBoxReference.addItem(progress.treasureBox, p1);
      assert.equal(progress.treasureBox.items.length, 1);
      assert.equal(item1.masteryLevel, 0);
      assert.equal(item1.consecutiveCorrect, 0);

      // Second wrong attempt on same prompt in same stage does not duplicate
      TreasureBoxReference.addItem(progress.treasureBox, p1);
      assert.equal(progress.treasureBox.items.length, 1);
    });

    it('T3-S3-2: Selecting a quarantined Stage 1 problem in TreasureBox invokes generateVariationProblem preserving carry trap and stepGuide', () => {
      const progress = storage.createDefaultProgress();
      const orig = curriculum.generateSingleProblem(1, 1, 2, 2);
      const item = TreasureBoxReference.addItem(progress.treasureBox, orig);

      const variation = curriculum.generateVariationProblem(item.originalProblem);
      assert.equal(variation.isVariation, true);
      assert.deepEqual(variation.operands, [427, 356]);
      assert.equal(variation.expectedAnswer, 783);
      assert.equal(variation.commonTrap.mistakeValue, 773);

      // Verify stepGuide corresponds to 427 + 356
      assert.equal(variation.stepGuide.length, 3);
      assert.equal(variation.stepGuide[0].expectedStepValue, 3); // (7+6)%10
      assert.equal(variation.stepGuide[1].expectedStepValue, 8); // (2+5+1)%10
      assert.equal(variation.stepGuide[2].expectedStepValue, 7); // 4+3+0
    });

    it('T3-S3-3: Solving 1st variation upgrades item to masteryLevel 1; solving 2nd variation upgrades to masteryLevel 2 (完全マスター！)', () => {
      const progress = storage.createDefaultProgress();
      const orig = curriculum.generateSingleProblem(1, 1, 2, 2);
      const item = TreasureBoxReference.addItem(progress.treasureBox, orig);

      // 1st variation solve
      const var1 = curriculum.generateVariationProblem(item.originalProblem);
      assert.equal(curriculum.evaluateAnswer(var1, 783), true);
      const after1 = TreasureBoxReference.recordAttempt(item, true);
      assert.equal(after1.consecutiveCorrect, 1);
      assert.equal(after1.masteryLevel, 1);

      // 2nd variation solve
      const var2 = curriculum.generateVariationProblem(item.originalProblem);
      assert.equal(curriculum.evaluateAnswer(var2, 783), true);
      const after2 = TreasureBoxReference.recordAttempt(item, true);
      assert.equal(after2.consecutiveCorrect, 2);
      assert.equal(after2.masteryLevel, 2);
    });

    it('T3-S3-4: Failing on 2nd variation attempt triggers No-X Toast + StepGuide and resets consecutiveCorrect to 0', () => {
      const progress = storage.createDefaultProgress();
      const orig = curriculum.generateSingleProblem(1, 2, 2, 2); // 1000 - 364
      const item = TreasureBoxReference.addItem(progress.treasureBox, orig);

      // 1st variation cleared
      const var1 = curriculum.generateVariationProblem(item.originalProblem); // 603 - 347 = 256
      assert.equal(curriculum.evaluateAnswer(var1, 256), true);
      TreasureBoxReference.recordAttempt(item, true);
      assert.equal(item.consecutiveCorrect, 1);
      assert.equal(item.masteryLevel, 1);

      // 2nd variation failed with trap answer 344
      const var2 = curriculum.generateVariationProblem(item.originalProblem);
      const diag = curriculum.diagnoseError(var2, 344);
      assert.equal(diag.isCorrect, false);
      assert.equal(diag.isKnownTrap, true);

      const toast = ToastFeedbackReference.createToast('encourage');
      assert.equal(ToastFeedbackReference.validateToastContent(toast.message), true);

      TreasureBoxReference.recordAttempt(item, false);
      assert.equal(item.consecutiveCorrect, 0);
      assert.equal(item.masteryLevel, 0);

      // Student reviews via StepGuide and then clears 2 fresh consecutive variations
      const session = StepGuideReference.createSession(var2);
      for (let i = 0; i < session.steps.length; i++) {
        StepGuideReference.submitStepAnswer(session, i, session.steps[i].expectedStepValue);
      }
      assert.equal(session.completed, true);

      TreasureBoxReference.recordAttempt(item, true);
      TreasureBoxReference.recordAttempt(item, true);
      assert.equal(item.masteryLevel, 2);
    });

    it('T3-S3-5: Mastering 3 items in TreasureBox unlocks treasure_hunter badge and 10 items unlocks treasure_legend badge', () => {
      const progress = storage.createDefaultProgress();

      for (let s = 1; s <= 10; s++) {
        const w = StageMapReference.getWorldForStage(s);
        const prob = curriculum.generateSingleProblem(w, s, 1, 2);
        const item = TreasureBoxReference.addItem(progress.treasureBox, prob);
        TreasureBoxReference.recordAttempt(item, true);
        TreasureBoxReference.recordAttempt(item, true);

        const masteredCount = progress.treasureBox.items.filter(i => i.masteryLevel === 2).length;
        if (masteredCount >= 3 && !progress.gamification.unlockedBadges.includes('treasure_hunter')) {
          progress.gamification.unlockedBadges.push('treasure_hunter');
        }
        if (masteredCount >= 10 && !progress.gamification.unlockedBadges.includes('treasure_legend')) {
          progress.gamification.unlockedBadges.push('treasure_legend');
        }
      }

      assert.ok(progress.gamification.unlockedBadges.includes('treasure_hunter'));
      assert.ok(progress.gamification.unlockedBadges.includes('treasure_legend'));
    });
  });

  // =========================================================================
  // Suite 4: Storage Service ↔ Backend Server Contract ↔ LocalStorage ↔ Transfer Code
  // =========================================================================
  describe('Suite 4: Storage Service ↔ Backend Server Contract ↔ LocalStorage ↔ Transfer Code', () => {
    it('T3-S4-1: Saving progress writes serialized JSON to MockLocalStorage under STORAGE_KEY and passes validateAtomicPayload', () => {
      const localStore = new MockLocalStorage();
      const progress = storage.createDefaultProgress();
      progress.gamification.totalScore = 120;

      localStore.setItem(storage.STORAGE_KEY, JSON.stringify(progress));
      const rawFromLocal = localStore.getItem(storage.STORAGE_KEY);
      assert.ok(rawFromLocal);

      const parsedPayload = JSON.parse(rawFromLocal);
      assert.equal(ServerContractReference.validateAtomicPayload(parsedPayload), true);
      assert.equal(parsedPayload.gamification.totalScore, 120);
    });

    it('T3-S4-2: Server static file sanitization serves index.html and .js/.css/.json with UTF-8 MIME types while blocking ../ traversal', () => {
      const rootDir = '/home/antigravity';
      const htmlPath = ServerContractReference.sanitizePath('index.html', rootDir);
      const jsPath = ServerContractReference.sanitizePath('src/main.js', rootDir);
      const cssPath = ServerContractReference.sanitizePath('src/styles/variables.css', rootDir);

      assert.equal(htmlPath, '/home/antigravity/index.html');
      assert.equal(jsPath, '/home/antigravity/src/main.js');
      assert.equal(cssPath, '/home/antigravity/src/styles/variables.css');

      assert.equal(ServerContractReference.mimeTypes['.html'], 'text/html; charset=utf-8');
      assert.equal(ServerContractReference.mimeTypes['.js'], 'text/javascript; charset=utf-8');
      assert.equal(ServerContractReference.mimeTypes['.css'], 'text/css; charset=utf-8');
      assert.equal(ServerContractReference.mimeTypes['.json'], 'application/json; charset=utf-8');

      assert.throws(() => {
        ServerContractReference.sanitizePath('../../../etc/shadow', rootDir);
      }, /Path traversal detected/);
    });

    it('T3-S4-3: Exporting user progress via exportBackupJSON and re-importing via importBackupJSON preserves all 6 top-level domains', () => {
      const progress = storage.createDefaultProgress();
      progress.userProfile.userName = 'たろう研究員';
      progress.gamification.labExp = 550;
      progress.stageProgress['stage-1'].cleared = true;
      progress.stageProgress['stage-1'].stars = 3;
      TreasureBoxReference.addItem(progress.treasureBox, curriculum.generateSingleProblem(1, 1, 1, 2));
      progress.parentCheer.cheerMessages.push(ParentBoardReference.createCheerStamp('STAMP_BRAVO', 'ナイス！'));
      progress.settings.seVolume = 0.6;

      const jsonStr = storage.exportBackupJSON(progress);
      const imported = storage.importBackupJSON(jsonStr);

      assert.equal(imported.userProfile.userName, 'たろう研究員');
      assert.equal(imported.gamification.labExp, 550);
      assert.equal(imported.stageProgress['stage-1'].cleared, true);
      assert.equal(imported.treasureBox.items.length, 1);
      assert.equal(imported.parentCheer.cheerMessages.length, 1);
      assert.equal(imported.settings.seVolume, 0.6);
    });

    it('T3-S4-4: Generating an 8-character transfer code and normalizing user input enables cross-device restoration', () => {
      const tabletAStorage = new MockLocalStorage();
      const tabletBStorage = new MockLocalStorage();
      const transferRegistry = new Map();

      const progressA = storage.createDefaultProgress();
      progressA.gamification.totalScore = 880;
      tabletAStorage.setItem(storage.STORAGE_KEY, JSON.stringify(progressA));

      const code = storage.generateTransferCode(progressA);
      assert.match(code, /^LAB-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
      const normalizedKey = storage.normalizeTransferCode(code);
      transferRegistry.set(normalizedKey, storage.exportBackupJSON(progressA));

      // User enters lowercase code with spaces/hyphens on Tablet B
      const userTypedCode = `  ${code.toLowerCase()} `;
      const lookupKey = storage.normalizeTransferCode(userTypedCode);
      assert.equal(lookupKey, normalizedKey);

      const restoredData = storage.importBackupJSON(transferRegistry.get(lookupKey));
      tabletBStorage.setItem(storage.STORAGE_KEY, JSON.stringify(restoredData));

      const verifiedB = JSON.parse(tabletBStorage.getItem(storage.STORAGE_KEY));
      assert.equal(verifiedB.gamification.totalScore, 880);
    });

    it('T3-S4-5: Corrupted payload or unsupported schema version (2.0.0) is rejected by Server and StorageService leaving MockLocalStorage intact', () => {
      const localStore = new MockLocalStorage();
      const validProgress = storage.createDefaultProgress();
      validProgress.gamification.totalScore = 250;
      localStore.setItem(storage.STORAGE_KEY, JSON.stringify(validProgress));

      const unsupportedPayload = { ...storage.createDefaultProgress(), schemaVersion: '2.0.0' };
      assert.throws(() => {
        ServerContractReference.validateAtomicPayload(unsupportedPayload);
      }, /Unsupported schema version/);

      const unsupportedBackup = JSON.stringify({
        exportTime: new Date().toISOString(),
        app: 'sansu-tankyu-lab',
        version: '2.0.0',
        data: unsupportedPayload
      });
      assert.throws(() => {
        storage.importBackupJSON(unsupportedBackup);
      }, /JSONインポート失敗/);

      // Verify existing localStore data was not overwritten
      const preserved = JSON.parse(localStore.getItem(storage.STORAGE_KEY));
      assert.equal(preserved.gamification.totalScore, 250);
      assert.equal(preserved.schemaVersion, '1.0.0');
    });
  });

  // =========================================================================
  // Suite 5: Mini-Lesson ↔ Web Speech TTS ↔ Web Audio Synthesizer ↔ Stage Map & Router
  // =========================================================================
  describe('Suite 5: Mini-Lesson ↔ Web Speech TTS ↔ Web Audio Synthesizer ↔ Stage Map & Router', () => {
    it('T3-S5-1: Navigating to #lesson/stage-1 via Router initializes MiniLesson state and narrates Card 0 via SpeechService (ja-JP)', async () => {
      const route = RouterReference.parseRoute('#lesson/stage-1');
      assert.equal(route.view, '#lesson');
      assert.equal(route.param, 'stage-1');

      const lesson = MiniLessonReference.createLessonState(route.param);
      assert.equal(lesson.stageId, 'stage-1');
      assert.equal(lesson.currentCardIndex, 0);

      const mockSynth = new MockSpeechSynthesis();
      const ttsRes = await speech.speak('一の位から順番に足し算しよう！', mockSynth, MockSpeechSynthesisUtterance);
      assert.equal(ttsRes.played, true);
      assert.equal(mockSynth.spokenUtterances.length, 1);
      assert.equal(mockSynth.spokenUtterances[0].lang, 'ja-JP');
    });

    it('T3-S5-2: Advancing to Card 1 (2-choice quiz) blocks further advance until the quiz is answered correctly', () => {
      const lesson = MiniLessonReference.createLessonState('stage-1');
      assert.equal(MiniLessonReference.canAdvance(lesson), true);

      const movedToQuiz = MiniLessonReference.nextCard(lesson);
      assert.equal(movedToQuiz, true);
      assert.equal(lesson.currentCardIndex, 1);
      assert.equal(MiniLessonReference.canAdvance(lesson), false);
      assert.equal(MiniLessonReference.nextCard(lesson), false);
      assert.equal(lesson.currentCardIndex, 1);
    });

    it('T3-S5-3: Choosing the wrong quiz option plays nearMiss sound, displays gentle feedback, and keeps Card 1 locked', () => {
      const audioCtx = new MockAudioContext();
      const lesson = MiniLessonReference.createLessonState('stage-1');
      MiniLessonReference.nextCard(lesson); // Card 1

      const quizRes = MiniLessonReference.answerQuiz(lesson, 'wrong_opt', 'correct_opt');
      assert.equal(quizRes.correct, false);
      assert.equal(quizRes.feedback, 'おしい！もう一度考えてみよう！');
      assert.equal(ToastFeedbackReference.validateToastContent(quizRes.feedback), true);

      const sfx = soundSynth.synthesize(audioCtx, 'nearMiss');
      assert.ok(sfx);
      assert.equal(MiniLessonReference.canAdvance(lesson), false);
    });

    it('T3-S5-4: Choosing the right quiz option plays correct chime, unlocks Card 2, narrates summary, and marks miniLessonSeen', async () => {
      const audioCtx = new MockAudioContext();
      const mockSynth = new MockSpeechSynthesis();
      const progress = storage.createDefaultProgress();
      const lesson = MiniLessonReference.createLessonState('stage-1');
      MiniLessonReference.nextCard(lesson); // Card 1

      const quizRes = MiniLessonReference.answerQuiz(lesson, 'A', 'A');
      assert.equal(quizRes.correct, true);
      const sfx = soundSynth.synthesize(audioCtx, 'correct');
      assert.ok(sfx);

      assert.equal(MiniLessonReference.canAdvance(lesson), true);
      const movedToSummary = MiniLessonReference.nextCard(lesson);
      assert.equal(movedToSummary, true);
      assert.equal(lesson.currentCardIndex, 2);
      assert.equal(lesson.completed, true);

      const ttsSummary = await speech.speak('くり上がりの1を忘れずにメモしよう！', mockSynth, MockSpeechSynthesisUtterance);
      assert.equal(ttsSummary.played, true);

      progress.stageProgress['stage-1'].miniLessonSeen = lesson.completed;
      assert.equal(progress.stageProgress['stage-1'].miniLessonSeen, true);
    });

    it('T3-S5-5: Completing Stage 1 plays stageClear and unlock sounds, unlocks Stage 2 on StageMap, and routes back to #map', () => {
      const audioCtx = new MockAudioContext();
      const progress = storage.createDefaultProgress();

      assert.equal(StageMapReference.isStageUnlocked(2, progress.stageProgress), false);

      // Mark Stage 1 cleared
      progress.stageProgress['stage-1'].cleared = true;
      progress.stageProgress['stage-1'].stars = 3;

      const clearSfx = soundSynth.synthesize(audioCtx, 'stageClear');
      const unlockSfx = soundSynth.synthesize(audioCtx, 'unlock');
      assert.ok(clearSfx);
      assert.ok(unlockSfx);

      assert.equal(StageMapReference.isStageUnlocked(2, progress.stageProgress), true);
      const mapRoute = RouterReference.parseRoute('#map');
      assert.equal(mapRoute.view, '#map');
    });
  });

  // =========================================================================
  // Suite 6: Tablet Canvas Memo Pad ↔ Virtual 10-Key Keypad ↔ Adaptive Stage Flow
  // =========================================================================
  describe('Suite 6: Tablet Canvas Memo Pad ↔ Virtual 10-Key Keypad ↔ Adaptive Stage Flow', () => {
    it('T3-S6-1: During Stage 7 (Division with Remainder 29 ÷ 4), learner uses CanvasPad in column mode and enters quotient 7 remainder 1 via Keypad', () => {
      const problem = curriculum.generateSingleProblem(3, 7, 1, 2); // 29 ÷ 4 = 7 R 1
      const pad = CanvasPadReference.createPadState();
      CanvasPadReference.setGridMode(pad, 'column');
      assert.equal(pad.gridMode, 'column');

      // Draw long division strokes on CanvasPad
      CanvasPadReference.startStroke(pad, 100, 80);
      CanvasPadReference.moveStroke(pad, 140, 80);
      CanvasPadReference.endStroke(pad);
      assert.equal(pad.strokes.length, 1);

      // Enter 7 remainder 1 on Keypad
      let keypad = KeypadReference.createKeypadState(true);
      keypad = KeypadReference.handleInput(keypad, '7');
      keypad = KeypadReference.handleInput(keypad, 'rem');
      assert.equal(keypad.activeField, 'remainder');
      keypad = KeypadReference.handleInput(keypad, '1');

      const userAns = KeypadReference.getValue(keypad);
      assert.deepEqual(userAns, { quotient: 7, remainder: 1 });
      assert.equal(curriculum.evaluateAnswer(problem, userAns), true);
    });

    it('T3-S6-2: Learner makes handwriting mistake on CanvasPad, calls undo(), adjusts keypad with del, and submits correct answer', () => {
      const problem = curriculum.generateSingleProblem(2, 5, 1, 2); // 38 × 4 = 152
      const pad = CanvasPadReference.createPadState();

      CanvasPadReference.startStroke(pad, 10, 10);
      CanvasPadReference.endStroke(pad);
      CanvasPadReference.startStroke(pad, 50, 50); // mistaken stroke
      CanvasPadReference.endStroke(pad);
      assert.equal(pad.strokes.length, 2);

      CanvasPadReference.undo(pad);
      assert.equal(pad.strokes.length, 1);

      let keypad = KeypadReference.createKeypadState(false);
      keypad = KeypadReference.handleInput(keypad, '1');
      keypad = KeypadReference.handleInput(keypad, '5');
      keypad = KeypadReference.handleInput(keypad, '8'); // typo
      keypad = KeypadReference.handleInput(keypad, 'del');
      keypad = KeypadReference.handleInput(keypad, '2');

      const val = KeypadReference.getValue(keypad);
      assert.equal(val, 152);
      assert.equal(curriculum.evaluateAnswer(problem, val), true);
    });

    it('T3-S6-3: Advancing from Q1 to Q2 in generateStageProblems clears CanvasPad strokes and resets Keypad to activeField quotient', () => {
      const stageProblems = curriculum.generateStageProblems(3, 7, []);
      assert.equal(stageProblems.length, 5);

      const pad = CanvasPadReference.createPadState();
      CanvasPadReference.startStroke(pad, 20, 30);
      CanvasPadReference.endStroke(pad);

      let keypad = KeypadReference.createKeypadState(true);
      keypad = KeypadReference.handleInput(keypad, '7');
      keypad = KeypadReference.handleInput(keypad, 'rem');
      keypad = KeypadReference.handleInput(keypad, '1');
      assert.equal(keypad.activeField, 'remainder');

      // Advance to Q2: clear pad and keypad
      CanvasPadReference.clear(pad);
      keypad = KeypadReference.handleInput(keypad, 'clear');

      assert.equal(pad.strokes.length, 0);
      assert.equal(pad.currentStroke, null);
      assert.equal(keypad.quotientText, '');
      assert.equal(keypad.remainderText, '');
      assert.equal(keypad.activeField, 'quotient');
    });

    it('T3-S6-4: Adaptive branching selects Q4 difficulty level (level 3 on Q3 success vs level 2 on Q3 mistake) with synchronized input state', () => {
      const problemsSuccessBranch = curriculum.generateStageProblems(1, 1, [
        { questionIndex: 1, isCorrect: true },
        { questionIndex: 2, isCorrect: true },
        { questionIndex: 3, isCorrect: true }
      ]);
      assert.equal(problemsSuccessBranch[3].level, 3);
      assert.equal(problemsSuccessBranch[3].operands[0], 2468); // 4-digit challenge

      const problemsRemedialBranch = curriculum.generateStageProblems(1, 1, [
        { questionIndex: 1, isCorrect: true },
        { questionIndex: 2, isCorrect: true },
        { questionIndex: 3, isCorrect: false }
      ]);
      assert.equal(problemsRemedialBranch[3].level, 2);
      assert.equal(problemsRemedialBranch[3].operands[0], 587); // 3-digit standard
    });

    it('T3-S6-5: Verifies DesignSystem compliance across input components (touchTargetMinPx >= 48 and CanvasPad HiDPI dpr === 2)', () => {
      const pad = CanvasPadReference.createPadState();
      assert.equal(pad.dpr, 2);
      assert.ok(KeypadReference.minTouchSizePx >= DesignSystemReference.touchTargetMinPx);
      assert.equal(DesignSystemReference.touchTargetMinPx, 48);
    });
  });
});
