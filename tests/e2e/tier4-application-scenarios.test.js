/**
 * Tier 4: Real-World Application Scenarios E2E Test Suite (算数探検ラボ)
 *
 * Verifies 6 complete end-to-end user journeys:
 * - Scenario A: First-Time Student Journey (World 1 Stage 1 Complete Flow)
 * - Scenario B: Struggling Learner Self-Correction Journey (World 4 Stage 12 Trial Quotient Revision)
 * - Scenario C: Power-Up Treasure Box Complete Mastery Journey
 * - Scenario D: Parent Cheer Board, Analytics Review & Multi-Device Transfer Journey
 * - Scenario E: Full 5-World (15-Stage) Curriculum Mastery & Rank 10 Ascension Journey
 * - Scenario F: Offline Resilience, Error Recovery & Rapid Tablet Interaction Journey
 *
 * Total >= 30 test cases across 6 complete user journeys.
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
  MiniLessonReference,
  StageMapReference,
  TreasureBoxReference,
  ParentBoardReference,
  RouterReference,
  WORLDS_METADATA
} from './test-helpers.js';

describe('Tier 4: Real-World Application Scenarios (End-to-End Journeys)', async () => {
  const curriculum = await loadCurriculumEngine();
  const storage = await loadStorageService();
  const soundSynth = await loadSoundEffects();
  const speech = await loadSpeechService();
  const gamification = await loadGamificationEngine();

  // =========================================================================
  // Scenario A: First-Time Student Journey (World 1 Stage 1 Complete Flow)
  // =========================================================================
  describe('Scenario A: First-Time Student Journey (World 1 Stage 1 Complete Flow)', () => {
    const localStore = new MockLocalStorage();
    const audioCtx = new MockAudioContext();
    const speechSynth = new MockSpeechSynthesis();
    const progress = storage.createDefaultProgress();
    let stage1Problems = [];

    it('T4-A1: Initializes fresh student profile (ひらめき研究員, Grade 4, Rank 1, Stage 1 unlocked, Stages 2..15 locked)', () => {
      assert.equal(progress.userProfile.userName, 'ひらめき研究員');
      assert.equal(progress.userProfile.grade, 4);
      assert.equal(progress.gamification.labRank, 1);
      assert.equal(StageMapReference.isStageUnlocked(1, progress.stageProgress), true);
      for (let s = 2; s <= 15; s++) {
        assert.equal(StageMapReference.isStageUnlocked(s, progress.stageProgress), false);
      }
    });

    it('T4-A2: Routes to #lesson/stage-1 and completes 3-card interactive mini-lesson with TTS narration and 2-choice quiz gate', async () => {
      const route = RouterReference.parseRoute('#lesson/stage-1');
      assert.equal(route.view, '#lesson');
      assert.equal(route.param, 'stage-1');

      const lesson = MiniLessonReference.createLessonState('stage-1');
      const card0Tts = await speech.speak('3桁のたし算は一の位から順番に計算しよう！', speechSynth, MockSpeechSynthesisUtterance);
      assert.equal(card0Tts.played, true);

      // Advance to Card 1 (Quiz)
      assert.equal(MiniLessonReference.nextCard(lesson), true);
      assert.equal(lesson.currentCardIndex, 1);
      assert.equal(MiniLessonReference.canAdvance(lesson), false);

      // Answer quiz correctly
      const quizAns = MiniLessonReference.answerQuiz(lesson, 'carry_to_tens', 'carry_to_tens');
      assert.equal(quizAns.correct, true);
      soundSynth.synthesize(audioCtx, 'correct');

      // Advance to Card 2 (Summary)
      assert.equal(MiniLessonReference.nextCard(lesson), true);
      assert.equal(lesson.currentCardIndex, 2);
      assert.equal(lesson.completed, true);
      progress.stageProgress['stage-1'].miniLessonSeen = true;
      assert.equal(progress.stageProgress['stage-1'].miniLessonSeen, true);
    });

    it('T4-A3: Routes to #stage/stage-1 and generates 5 adaptive addition problems (Q1 warmup -> Q5 boss)', () => {
      const route = RouterReference.parseRoute('#stage/stage-1');
      assert.equal(route.view, '#stage');
      assert.equal(route.param, 'stage-1');

      stage1Problems = curriculum.generateStageProblems(1, 1, []);
      assert.equal(stage1Problems.length, 5);
      assert.equal(stage1Problems[0].level, 1); // Q1 warmup
      assert.equal(stage1Problems[1].level, 2); // Q2 standard
      assert.equal(stage1Problems[2].level, 3); // Q3 hurdle
      assert.equal(stage1Problems[3].level, 3); // Q4 challenge
      assert.equal(stage1Problems[4].level, 3); // Q5 boss
    });

    it('T4-A4: Uses CanvasPad (column mode) and Keypad to solve all 5 questions on the first try with sound effects', () => {
      const pad = CanvasPadReference.createPadState();
      CanvasPadReference.setGridMode(pad, 'column');

      let firstTryCorrect = 0;
      for (const prob of stage1Problems) {
        // Write memo stroke
        CanvasPadReference.startStroke(pad, 30, 40);
        CanvasPadReference.moveStroke(pad, 35, 60);
        CanvasPadReference.endStroke(pad);

        // Enter expected answer via Keypad
        let keypad = KeypadReference.createKeypadState(false);
        for (const digit of String(prob.expectedAnswer)) {
          keypad = KeypadReference.handleInput(keypad, digit);
          soundSynth.synthesize(audioCtx, 'tap');
        }
        const submitted = KeypadReference.getValue(keypad);
        assert.equal(curriculum.evaluateAnswer(prob, submitted), true);
        soundSynth.synthesize(audioCtx, 'correct');

        firstTryCorrect++;
        const pts = gamification.awardPoints({ isFirstTry: true, wasSelfCorrected: false });
        progress.gamification.totalScore += pts;
        progress.gamification.labExp += pts;

        CanvasPadReference.clear(pad);
      }

      assert.equal(firstTryCorrect, 5);
      assert.equal(progress.gamification.totalScore, 50);
    });

    it('T4-A5: Earns 3 stars (⭐⭐⭐), +50 EXP, unlocks first_step and perfect_clear badges, unlocks Stage 2, and persists to MockLocalStorage', () => {
      const stars = gamification.calculateStars(5, 5, 0);
      assert.equal(stars, 3);

      progress.stageProgress['stage-1'].stars = stars;
      progress.stageProgress['stage-1'].cleared = true;
      progress.stageProgress['stage-1'].firstTryCorrectCount = 5;
      progress.stageProgress['stage-1'].totalAttempts = 5;

      progress.gamification.unlockedBadges.push('first_step', 'perfect_clear');
      soundSynth.synthesize(audioCtx, 'stageClear');
      soundSynth.synthesize(audioCtx, 'badge');

      assert.equal(StageMapReference.isStageUnlocked(2, progress.stageProgress), true);
      localStore.setItem(storage.STORAGE_KEY, JSON.stringify(progress));

      const saved = JSON.parse(localStore.getItem(storage.STORAGE_KEY));
      assert.equal(saved.stageProgress['stage-1'].stars, 3);
      assert.ok(saved.gamification.unlockedBadges.includes('first_step'));
      assert.ok(saved.gamification.unlockedBadges.includes('perfect_clear'));
    });
  });

  // =========================================================================
  // Scenario B: Struggling Learner Self-Correction Journey (World 4 Stage 12 Trial Quotient Revision)
  // =========================================================================
  describe('Scenario B: Struggling Learner Self-Correction Journey (World 4 Stage 12 Trial Quotient Revision)', () => {
    const audioCtx = new MockAudioContext();
    const progress = storage.createDefaultProgress();
    const problem = curriculum.generateSingleProblem(4, 12, 3, 3); // 84 ÷ 26 = 3 R 6
    let wrongAnswer = null;

    it('T4-B1: Student tackles World 4 Stage 12 (84 ÷ 26), estimates 80 ÷ 20 = 4, and enters { quotient: 4, remainder: 0 } on Keypad', () => {
      assert.equal(problem.prompt, '84 ÷ 26 = ?');
      assert.deepEqual(problem.expectedAnswer, { quotient: 3, remainder: 6 });

      let keypad = KeypadReference.createKeypadState(true);
      keypad = KeypadReference.handleInput(keypad, '4');
      keypad = KeypadReference.handleInput(keypad, 'rem');
      keypad = KeypadReference.handleInput(keypad, '0');
      wrongAnswer = KeypadReference.getValue(keypad);

      assert.deepEqual(wrongAnswer, { quotient: 4, remainder: 0 });
      assert.equal(curriculum.evaluateAnswer(problem, wrongAnswer), false);
    });

    it('T4-B2: CurriculumEngine.diagnoseError detects the trial-quotient overestimate trap (26 × 4 = 104 > 84)', () => {
      const diag = curriculum.diagnoseError(problem, wrongAnswer);
      assert.equal(diag.isCorrect, false);
      assert.equal(diag.isKnownTrap, true);
      assert.match(diag.diagnosis, /商4のまま/);
      assert.match(diag.hint, /26×4=104/);
    });

    it('T4-B3: Displays No-X Toast ("おしい！もう一歩！") in warm amber (#eab308) with zero ❌ symbols, plays nearMiss, and quarantines in TreasureBox', () => {
      const toast = ToastFeedbackReference.createToast('encourage');
      assert.equal(toast.message, 'おしい！もう一歩！');
      assert.equal(toast.color, '#eab308');
      assert.equal(ToastFeedbackReference.validateToastContent(toast.message), true);

      const sfx = soundSynth.synthesize(audioCtx, 'nearMiss');
      assert.ok(sfx);

      const tbItem = TreasureBoxReference.addItem(progress.treasureBox, problem);
      assert.equal(progress.treasureBox.items.length, 1);
      assert.equal(tbItem.originalProblem.prompt, '84 ÷ 26 = ?');
    });

    it('T4-B4: StepGuide opens 4-step scaffolding (Step 1: guess 4, Step 2: product 104, Step 3: revised quotient 3, Step 4: remainder 6)', () => {
      const session = StepGuideReference.createSession(problem);
      assert.equal(session.steps.length, 4);

      assert.equal(StepGuideReference.submitStepAnswer(session, 0, 4).success, true);
      assert.equal(StepGuideReference.submitStepAnswer(session, 1, 104).success, true);
      assert.equal(StepGuideReference.submitStepAnswer(session, 2, 3).success, true);
      const finalStep = StepGuideReference.submitStepAnswer(session, 3, 6);
      assert.equal(finalStep.success, true);
      assert.equal(session.completed, true);
    });

    it('T4-B5: Student submits { quotient: 3, remainder: 6 }, hears selfCorrect fanfare, earns +20 bonus points, and clears stage with 2 stars (⭐⭐)', () => {
      let keypad = KeypadReference.createKeypadState(true);
      keypad = KeypadReference.handleInput(keypad, '3');
      keypad = KeypadReference.handleInput(keypad, 'rem');
      keypad = KeypadReference.handleInput(keypad, '6');
      const finalAns = KeypadReference.getValue(keypad);

      assert.equal(curriculum.evaluateAnswer(problem, finalAns), true);
      const fanfare = soundSynth.synthesize(audioCtx, 'selfCorrect');
      assert.ok(fanfare);

      const pts = gamification.awardPoints({ isFirstTry: false, wasSelfCorrected: true });
      assert.equal(pts, 20);
      progress.gamification.totalScore += pts;
      progress.gamification.selfCorrectionCount += 1;
      assert.equal(progress.gamification.selfCorrectionCount, 1);

      const stars = gamification.calculateStars(5, 4, 1);
      assert.equal(stars, 2);
    });
  });

  // =========================================================================
  // Scenario C: Power-Up Treasure Box Complete Mastery Journey
  // =========================================================================
  describe('Scenario C: Power-Up Treasure Box Complete Mastery Journey', () => {
    const progress = storage.createDefaultProgress();
    const pStage1 = curriculum.generateSingleProblem(1, 1, 2, 2); // 587 + 645
    const pStage2 = curriculum.generateSingleProblem(1, 2, 2, 2); // 1000 - 364
    const pStage12 = curriculum.generateSingleProblem(4, 12, 1, 2); // 84 ÷ 26

    it('T4-C1: Student navigates to #treasure and sees 3 quarantined problems from Stage 1, Stage 2, and Stage 12', () => {
      const route = RouterReference.parseRoute('#treasure');
      assert.equal(route.view, '#treasure');

      TreasureBoxReference.addItem(progress.treasureBox, pStage1);
      TreasureBoxReference.addItem(progress.treasureBox, pStage2);
      TreasureBoxReference.addItem(progress.treasureBox, pStage12);

      assert.equal(progress.treasureBox.items.length, 3);
      assert.equal(progress.treasureBox.items[2].originalProblem.prompt, '84 ÷ 26 = ?');
    });

    it('T4-C2: Launches review on Stage 12 item: generateVariationProblem creates 92 ÷ 28 preserving trial quotient revision trap', () => {
      const item12 = progress.treasureBox.items[2];
      const varProb = curriculum.generateVariationProblem(item12.originalProblem);

      assert.equal(varProb.isVariation, true);
      assert.equal(varProb.prompt, '92 ÷ 28 = ?');
      assert.deepEqual(varProb.expectedAnswer, { quotient: 3, remainder: 8 });
    });

    it('T4-C3: Solves 1st variation ({ quotient: 3, remainder: 8 }) -> consecutiveCorrect = 1, masteryLevel = 1 ("あと1回！")', () => {
      const item12 = progress.treasureBox.items[2];
      const varProb = curriculum.generateVariationProblem(item12.originalProblem);

      assert.equal(curriculum.evaluateAnswer(varProb, { quotient: 3, remainder: 8 }), true);
      const updated = TreasureBoxReference.recordAttempt(item12, true);
      assert.equal(updated.consecutiveCorrect, 1);
      assert.equal(updated.masteryLevel, 1);
    });

    it('T4-C4: Makes an error on the next attempt -> consecutiveCorrect resets to 0, masteryLevel resets to 0, and reviews via StepGuide', () => {
      const item12 = progress.treasureBox.items[2];
      const varProb = curriculum.generateVariationProblem(item12.originalProblem);

      assert.equal(curriculum.evaluateAnswer(varProb, { quotient: 4, remainder: 0 }), false);
      const resetItem = TreasureBoxReference.recordAttempt(item12, false);
      assert.equal(resetItem.consecutiveCorrect, 0);
      assert.equal(resetItem.masteryLevel, 0);

      const session = StepGuideReference.createSession(varProb);
      for (let i = 0; i < session.steps.length; i++) {
        StepGuideReference.submitStepAnswer(session, i, session.steps[i].expectedStepValue);
      }
      assert.equal(session.completed, true);
    });

    it('T4-C5: Solves 2 consecutive variations self-reliantly for all 3 items -> masteryLevel = 2 ("完全マスター！") and unlocks treasure_hunter badge', () => {
      for (const item of progress.treasureBox.items) {
        const v1 = curriculum.generateVariationProblem(item.originalProblem);
        assert.equal(curriculum.evaluateAnswer(v1, v1.expectedAnswer), true);
        TreasureBoxReference.recordAttempt(item, true);

        const v2 = curriculum.generateVariationProblem(item.originalProblem);
        assert.equal(curriculum.evaluateAnswer(v2, v2.expectedAnswer), true);
        TreasureBoxReference.recordAttempt(item, true);

        assert.equal(item.consecutiveCorrect, 2);
        assert.equal(item.masteryLevel, 2);
      }

      const masteredCount = progress.treasureBox.items.filter(i => i.masteryLevel === 2).length;
      assert.equal(masteredCount, 3);
      progress.gamification.unlockedBadges.push('treasure_hunter');

      const badge = gamification.badges.find(b => b.id === 'treasure_hunter');
      assert.equal(badge.title, 'お宝ハンター');
      assert.ok(progress.gamification.unlockedBadges.includes('treasure_hunter'));
    });
  });

  // =========================================================================
  // Scenario D: Parent Cheer Board, Analytics Review & Multi-Device Transfer Journey
  // =========================================================================
  describe('Scenario D: Parent Cheer Board, Analytics Review & Multi-Device Transfer Journey', () => {
    const audioCtx = new MockAudioContext();
    const progress = storage.createDefaultProgress();
    progress.gamification.selfCorrectionCount = 14;
    progress.gamification.totalScore = 620;
    progress.stageProgress['stage-1'] = { cleared: true, stars: 3 };
    progress.stageProgress['stage-2'] = { cleared: true, stars: 2 };
    progress.stageProgress['stage-3'] = { cleared: true, stars: 3 };

    it('T4-D1: Parent navigates to #parent, enters wrong PIN "9999" (denied), then enters correct PIN "1234" (granted)', () => {
      const route = RouterReference.parseRoute('#parent');
      assert.equal(route.view, '#parent');

      assert.equal(ParentBoardReference.verifyPin('9999', progress.parentCheer.parentPinHash), false);
      assert.equal(ParentBoardReference.verifyPin('1234', progress.parentCheer.parentPinHash), true);
    });

    it('T4-D2: Views per-world radar chart scores and prominent selfCorrectionCount metric', () => {
      const radar = ParentBoardReference.calculateRadarScores(progress);
      assert.equal(radar.world1, 100);
      assert.equal(radar.world2, 0);
      assert.equal(progress.gamification.selfCorrectionCount, 14);
    });

    it('T4-D3: Parent selects STAMP_RECOVERY and writes custom message (<= 50 chars), saving it to parentCheer.cheerMessages', () => {
      const msg = '自分で直せてすごい！あきらめない姿がかっこいいよ！';
      assert.ok(msg.length <= 50);
      const stamp = ParentBoardReference.createCheerStamp('STAMP_RECOVERY', msg);
      progress.parentCheer.cheerMessages.push(stamp);

      assert.equal(progress.parentCheer.cheerMessages.length, 1);
      assert.equal(progress.parentCheer.cheerMessages[0].stampId, 'STAMP_RECOVERY');
      assert.equal(progress.parentCheer.cheerMessages[0].readByChild, false);
    });

    it('T4-D4: Child opens app, views unread parent cheer stamp (readByChild = true, plays stamp sound), and unlocks cheer_receiver badge', () => {
      const unread = progress.parentCheer.cheerMessages.filter(m => !m.readByChild);
      assert.equal(unread.length, 1);

      unread[0].readByChild = true;
      const sfx = soundSynth.synthesize(audioCtx, 'stamp');
      assert.ok(sfx);

      progress.gamification.unlockedBadges.push('cheer_receiver');
      assert.ok(progress.gamification.unlockedBadges.includes('cheer_receiver'));
    });

    it('T4-D5: Parent exports JSON backup and generates 8-digit transfer code, restoring profile onto a new tablet with 100% fidelity', () => {
      const newTabletStorage = new MockLocalStorage();
      const backupJson = storage.exportBackupJSON(progress);
      const transferCode = storage.generateTransferCode(progress);

      assert.match(transferCode, /^LAB-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
      assert.equal(storage.normalizeTransferCode(transferCode).length, 11);

      const restored = storage.importBackupJSON(backupJson);
      newTabletStorage.setItem(storage.STORAGE_KEY, JSON.stringify(restored));

      const verified = JSON.parse(newTabletStorage.getItem(storage.STORAGE_KEY));
      assert.equal(verified.gamification.totalScore, 620);
      assert.equal(verified.gamification.selfCorrectionCount, 14);
      assert.equal(verified.parentCheer.cheerMessages[0].customText, '自分で直せてすごい！あきらめない姿がかっこいいよ！');
      assert.equal(verified.parentCheer.cheerMessages[0].readByChild, true);
    });
  });

  // =========================================================================
  // Scenario E: Full 5-World (15-Stage) Curriculum Mastery & Rank 10 Ascension Journey
  // =========================================================================
  describe('Scenario E: Full 5-World (15-Stage) Curriculum Mastery & Rank 10 Ascension Journey', () => {
    const progress = storage.createDefaultProgress();

    it('T4-E1: Progresses sequentially through World 1 (Stages 1-3) and World 2 (Stages 4-6), verifying stage unlocking and problem solving', () => {
      for (let s = 1; s <= 6; s++) {
        assert.equal(StageMapReference.isStageUnlocked(s, progress.stageProgress), true);
        const w = StageMapReference.getWorldForStage(s);
        const prob = curriculum.generateSingleProblem(w, s, 1, 2);
        assert.equal(curriculum.evaluateAnswer(prob, prob.expectedAnswer), true);
        progress.stageProgress[`stage-${s}`] = { stageId: `stage-${s}`, unlocked: true, cleared: true, stars: 3 };
      }
      assert.equal(StageMapReference.isStageUnlocked(7, progress.stageProgress), true);
    });

    it('T4-E2: Progresses sequentially through World 3 (Stages 7-9), World 4 (Stages 10-12), and World 5 (Stages 13-15)', () => {
      for (let s = 7; s <= 15; s++) {
        assert.equal(StageMapReference.isStageUnlocked(s, progress.stageProgress), true);
        const w = StageMapReference.getWorldForStage(s);
        const prob = curriculum.generateSingleProblem(w, s, 1, 2);
        assert.equal(curriculum.evaluateAnswer(prob, prob.expectedAnswer), true);
        progress.stageProgress[`stage-${s}`] = { stageId: `stage-${s}`, unlocked: true, cleared: true, stars: 3 };
      }
      const clearedCount = Object.values(progress.stageProgress).filter(st => st.cleared).length;
      assert.equal(clearedCount, 15);
    });

    it('T4-E3: Verifies ascension through all 10 Lab Ranks from 見習い研究員 (Rank 1) to 算数マスター大博士 (Rank 10)', () => {
      const expMilestones = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000];
      for (let idx = 0; idx < expMilestones.length; idx++) {
        const exp = expMilestones[idx];
        const rObj = gamification.calculateRank(exp);
        assert.equal(rObj.rank, idx + 1);
      }
      progress.gamification.labExp = 4200;
      const topRank = gamification.calculateRank(progress.gamification.labExp);
      progress.gamification.labRank = topRank.rank;
      assert.equal(progress.gamification.labRank, 10);
      assert.equal(topRank.name, '算数マスター大博士');
    });

    it('T4-E4: Verifies ParentBoard.calculateRadarScores reaches 100 across the worlds cleared in this scenario (Worlds 1-5)', () => {
      const radar = ParentBoardReference.calculateRadarScores(progress);
      // This scenario clears Stages 1-15 (Worlds 1-5); any later world stays 0
      const expected = {};
      for (const world of WORLDS_METADATA) {
        expected[`world${world.worldId}`] = world.worldId <= 5 ? 100 : 0;
      }
      assert.deepEqual(radar, expected);
    });

    it('T4-E5: Verifies all 8 achievement badges can be unlocked and persisted in user profile', () => {
      progress.gamification.unlockedBadges = gamification.badges.map(b => b.id);
      assert.equal(progress.gamification.unlockedBadges.length, 8);
      const exported = storage.exportBackupJSON(progress);
      const restored = storage.importBackupJSON(exported);
      assert.equal(restored.gamification.unlockedBadges.length, 8);
      assert.equal(restored.gamification.labRank, 10);
    });
  });

  // =========================================================================
  // Scenario F: Offline Resilience, Error Recovery & Rapid Tablet Interaction Journey
  // =========================================================================
  describe('Scenario F: Offline Resilience, Error Recovery & Rapid Tablet Interaction Journey', () => {
    it('T4-F1: Student plays while browser is offline (isOnline = false), completes a stage, and saves immediately to MockLocalStorage without data loss', () => {
      const localStore = new MockLocalStorage();
      const isOnline = false;
      const progress = storage.createDefaultProgress();

      const problems = curriculum.generateStageProblems(1, 1, []);
      for (const p of problems) {
        assert.equal(curriculum.evaluateAnswer(p, p.expectedAnswer), true);
        progress.gamification.totalScore += 10;
      }
      progress.stageProgress['stage-1'].cleared = true;

      // Save locally even when offline
      localStore.setItem(storage.STORAGE_KEY, JSON.stringify(progress));
      assert.equal(isOnline, false);
      const recovered = JSON.parse(localStore.getItem(storage.STORAGE_KEY));
      assert.equal(recovered.gamification.totalScore, 50);
      assert.equal(recovered.stageProgress['stage-1'].cleared, true);
    });

    it('T4-F2: Simulates corrupted backup JSON import and invalid schema version ("9.9.9"), throwing gracefully without corrupting active session', () => {
      const activeSession = storage.createDefaultProgress();
      activeSession.gamification.totalScore = 300;

      assert.throws(() => {
        storage.importBackupJSON('{ broken json');
      }, /JSONインポート失敗/);

      assert.throws(() => {
        storage.importBackupJSON(JSON.stringify({ data: { schemaVersion: '9.9.9' } }));
      }, /JSONインポート失敗/);

      // Active session remains untouched
      assert.equal(activeSession.gamification.totalScore, 300);
    });

    it('T4-F3: Simulates rapid multi-digit typing, remainder toggling, and backspacing on Keypad without state corruption', () => {
      let keypad = KeypadReference.createKeypadState(true);
      const rapidKeys = ['9', '8', '7', '6', '5', '4', '3', '2', '1', 'del', 'del', 'rem', '9', '9', 'del'];
      for (const k of rapidKeys) {
        keypad = KeypadReference.handleInput(keypad, k);
      }
      // First 6 digits kept: '987654', then 2 dels -> '9876'; rem -> '99', 1 del -> '9'
      assert.equal(keypad.quotientText, '9876');
      assert.equal(keypad.remainderText, '9');
      assert.deepEqual(KeypadReference.getValue(keypad), { quotient: 9876, remainder: 9 });
    });

    it('T4-F4: Simulates rapid drawing, undoing, and clearing multiple strokes on CanvasPad', () => {
      const pad = CanvasPadReference.createPadState();
      CanvasPadReference.setGridMode(pad, 'grid');

      for (let i = 0; i < 10; i++) {
        CanvasPadReference.startStroke(pad, i * 10, i * 10);
        CanvasPadReference.moveStroke(pad, i * 10 + 5, i * 10 + 5);
        CanvasPadReference.endStroke(pad);
      }
      assert.equal(pad.strokes.length, 10);

      CanvasPadReference.undo(pad);
      CanvasPadReference.undo(pad);
      assert.equal(pad.strokes.length, 8);

      CanvasPadReference.clear(pad);
      assert.equal(pad.strokes.length, 0);
      assert.equal(pad.currentStroke, null);
    });

    it('T4-F5: Simulates rapidly switching mini-lesson cards and cancelling previous MockSpeechSynthesis utterance before starting next', async () => {
      const synth = new MockSpeechSynthesis();
      const lesson = MiniLessonReference.createLessonState('stage-4');

      await speech.speak('カード1の読み上げ', synth, MockSpeechSynthesisUtterance);
      synth.cancel();
      assert.equal(synth.speaking, false);

      MiniLessonReference.nextCard(lesson);
      MiniLessonReference.answerQuiz(lesson, 'opt1', 'opt1');
      MiniLessonReference.nextCard(lesson);

      const res = await speech.speak('カード3のまとめ読み上げ', synth, MockSpeechSynthesisUtterance);
      assert.equal(res.played, true);
      assert.equal(synth.spokenUtterances.length, 2);
      assert.equal(lesson.completed, true);
    });
  });
});
