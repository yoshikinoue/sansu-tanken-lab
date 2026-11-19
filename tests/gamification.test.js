import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  SOUND_PRESETS,
  playSound,
  playTap,
  playCorrect,
  playSelfCorrect,
  playTryAgain,
  playStageClear,
  playStarPop,
  playUnlock,
  setMuted,
  isMuted,
  toggleMute,
  setVolume,
  getVolume,
  setAudioContextFactory,
  resetAudioEngine
} from '../src/services/sound-effects.js';

import {
  MINI_LESSON_SCRIPTS,
  getMiniLessonData,
  speakText,
  stopSpeech,
  setSpeechEnabled,
  isSpeechEnabled,
  toggleSpeech,
  setSpeechRate,
  getSpeechRate,
  setSpeechPitch,
  getSpeechPitch,
  getJapaneseVoices,
  setSpeechSynthesisProvider,
  resetSpeechService
} from '../src/services/speech-service.js';

import {
  LAB_RANKS,
  BADGE_DEFINITIONS,
  WORLD_DEFINITIONS,
  PARENT_STAMPS,
  recordResult,
  getUserProfile,
  getRankForScore,
  calculateStageStars,
  calculateWorldRadarStats,
  recordTreasureMastered,
  recordDailyStreak,
  sendParentCheer,
  markCheerRead,
  resetGamificationState,
  loadGamificationState,
  exportGamificationState
} from '../src/services/gamification-engine.js';

/**
 * Helper: Create a deterministic MockAudioContext that records oscillators, frequencies,
 * gain envelopes, and resume() calls.
 */
function createMockAudioContext(initialState = 'running') {
  const createdOscillators = [];
  const createdGains = [];
  let resumeCalled = 0;

  const ctx = {
    state: initialState,
    currentTime: 10.0,
    destination: { id: 'mock-destination' },
    resume() {
      resumeCalled += 1;
      this.state = 'running';
      return Promise.resolve();
    },
    createOscillator() {
      const freqEvents = [];
      const osc = {
        type: 'sine',
        connectedTo: null,
        startTime: null,
        stopTime: null,
        frequency: {
          setValueAtTime(val, time) {
            freqEvents.push({ op: 'setValueAtTime', value: val, time });
          },
          exponentialRampToValueAtTime(val, time) {
            freqEvents.push({ op: 'exponentialRampToValueAtTime', value: val, time });
          },
          linearRampToValueAtTime(val, time) {
            freqEvents.push({ op: 'linearRampToValueAtTime', value: val, time });
          }
        },
        connect(target) {
          this.connectedTo = target;
        },
        start(when) {
          this.startTime = when;
        },
        stop(when) {
          this.stopTime = when;
        },
        getFreqEvents() {
          return freqEvents;
        }
      };
      createdOscillators.push(osc);
      return osc;
    },
    createGain() {
      const gainEvents = [];
      const gainNode = {
        connectedTo: null,
        gain: {
          setValueAtTime(val, time) {
            gainEvents.push({ op: 'setValueAtTime', value: val, time });
          },
          linearRampToValueAtTime(val, time) {
            gainEvents.push({ op: 'linearRampToValueAtTime', value: val, time });
          },
          exponentialRampToValueAtTime(val, time) {
            gainEvents.push({ op: 'exponentialRampToValueAtTime', value: val, time });
          }
        },
        connect(target) {
          this.connectedTo = target;
        },
        getGainEvents() {
          return gainEvents;
        }
      };
      createdGains.push(gainNode);
      return gainNode;
    },
    getStats() {
      return {
        oscillators: createdOscillators,
        gains: createdGains,
        resumeCalled
      };
    }
  };

  return ctx;
}

/**
 * Helper: Create a deterministic mock Web Speech API environment.
 */
function createMockSpeechProvider({ autoFinish = true } = {}) {
  const spokenUtterances = [];
  let cancelCount = 0;

  class MockSpeechSynthesisUtterance {
    constructor(text) {
      this.text = text;
      this.lang = '';
      this.rate = 1.0;
      this.pitch = 1.0;
      this.voice = null;
      this.onboundary = null;
      this.onend = null;
      this.onerror = null;
    }
  }

  const voices = [
    { name: 'English US', lang: 'en-US' },
    { name: 'Kyoko', lang: 'ja-JP' },
    { name: 'Google 日本語', lang: 'ja-JP' }
  ];

  const speechSynthesis = {
    getVoices() {
      return voices;
    },
    cancel() {
      cancelCount += 1;
    },
    speak(utterance) {
      spokenUtterances.push(utterance);
      if (autoFinish) {
        queueMicrotask(() => {
          if (typeof utterance.onboundary === 'function') {
            utterance.onboundary({ name: 'word', charIndex: 0 });
          }
          if (typeof utterance.onend === 'function') {
            utterance.onend({ type: 'end', utterance });
          }
        });
      }
    }
  };

  return {
    speechSynthesis,
    SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
    getStats() {
      return { spokenUtterances, cancelCount };
    }
  };
}

describe('Milestone 3: Sound Effects Synthesizer (sound-effects.js)', () => {
  beforeEach(() => {
    resetAudioEngine();
  });

  it('safely falls back as no-op in headless/Node environments without AudioContext', () => {
    const res = playSound('correct');
    assert.equal(res.played, false);
    assert.equal(res.effect, 'correct');
    assert.equal(res.reason, 'no_audio_context');
    assert.deepEqual(res.notes, [523.25, 659.25, 783.99, 1046.50]);
  });

  it('synthesizes all 7 required sound effects and aliases with Web Audio API oscillators', () => {
    const mockCtx = createMockAudioContext('running');
    setAudioContextFactory(() => mockCtx);

    const effectsToTest = [
      { name: 'correct', expectedNotes: [523.25, 659.25, 783.99, 1046.50], wave: 'triangle' },
      { name: 'near_miss', expectedNotes: [349.23, 440.00], wave: 'sine' },
      { name: 'step_clear', expectedNotes: [392.00, 523.25, 659.25, 783.99], wave: 'sine' },
      { name: 'stage_clear', expectedNotes: [523.25, 698.46, 783.99, 1046.50], wave: 'triangle' },
      { name: 'stamp', expectedNotes: [880.00, 1760.00], wave: 'sine' },
      { name: 'badge', expectedNotes: [523.25, 783.99, 1046.50, 1318.51], wave: 'triangle' },
      { name: 'click', expectedNotes: [600.00, 300.00], wave: 'sine' }
    ];

    for (const item of effectsToTest) {
      const res = playSound(item.name);
      assert.equal(res.played, true, `Expected ${item.name} to play`);
      assert.equal(res.effect, item.name);
      assert.equal(res.waveform, item.wave);
      assert.deepEqual(res.notes, item.expectedNotes);
      assert.ok(res.scheduledCount >= 1);
    }

    // Verify oscillators were connected and scheduled
    const stats = mockCtx.getStats();
    assert.ok(stats.oscillators.length >= 20);
    assert.equal(stats.oscillators[0].type, 'triangle');
    assert.equal(stats.oscillators[0].getFreqEvents()[0].value, 523.25);
  });

  it('supports helper functions and aliases (playTap, playCorrect, playSelfCorrect, playTryAgain, playStageClear, playStarPop, playUnlock)', () => {
    const mockCtx = createMockAudioContext('running');
    setAudioContextFactory(() => mockCtx);

    assert.equal(playTap().effect, 'click');
    assert.equal(playCorrect().effect, 'correct');
    assert.equal(playSelfCorrect().effect, 'step_clear');
    assert.equal(playTryAgain().effect, 'near_miss');
    assert.equal(playStageClear().effect, 'stage_clear');
    assert.equal(playStarPop().effect, 'stamp');
    assert.equal(playUnlock().effect, 'badge');
    assert.equal(playSound('hint').effect, 'near_miss');
  });

  it('automatically calls resume() when AudioContext is suspended (iOS/Chrome autoplay policy)', () => {
    const mockCtx = createMockAudioContext('suspended');
    setAudioContextFactory(() => mockCtx);

    const res = playSound('click');
    assert.equal(res.played, true);
    assert.equal(mockCtx.getStats().resumeCalled, 1);
    assert.equal(mockCtx.state, 'running');
  });

  it('respects mute/unmute toggle and volume clamping', () => {
    const mockCtx = createMockAudioContext('running');
    setAudioContextFactory(() => mockCtx);

    assert.equal(isMuted(), false);
    setMuted(true);
    assert.equal(isMuted(), true);

    const mutedRes = playSound('correct');
    assert.equal(mutedRes.played, false);
    assert.equal(mutedRes.reason, 'muted');

    toggleMute();
    assert.equal(isMuted(), false);

    setVolume(1.8);
    assert.equal(getVolume(), 1.0);
    setVolume(-0.5);
    assert.equal(getVolume(), 0.0);

    const zeroVolRes = playSound('correct');
    assert.equal(zeroVolRes.played, false);
    assert.equal(zeroVolRes.reason, 'zero_volume');

    setVolume(0.75);
    const activeRes = playSound('correct');
    assert.equal(activeRes.played, true);
  });

  it('handles unknown effect names gracefully without throwing', () => {
    const res = playSound('non_existent_sound');
    assert.equal(res.played, false);
    assert.equal(res.reason, 'unknown_effect');
  });
});

describe('Milestone 3: Web Speech API TTS & Mini-Lessons (speech-service.js)', () => {
  beforeEach(() => {
    resetSpeechService();
  });

  it('resolves cleanly in headless environments without speechSynthesis and invokes onEnd', async () => {
    let endCalled = false;
    await speakText('一の位から順番に計算しよう！', {
      onEnd: (evt) => {
        endCalled = true;
        assert.equal(evt.fallback, true);
      }
    });
    assert.equal(endCalled, true);
  });

  it('speaks Japanese text with Grade 4 friendly rate (~0.95), pitch (~1.05), and preferred Google 日本語 voice', async () => {
    const provider = createMockSpeechProvider({ autoFinish: true });
    setSpeechSynthesisProvider(provider);

    const voices = getJapaneseVoices();
    assert.equal(voices.length, 2);
    assert.equal(voices[0].name, 'Google 日本語');

    let boundaryCount = 0;
    let ended = false;

    await speakText('引けない時はとなりの位から十をもらおう。', {
      onBoundary: () => {
        boundaryCount += 1;
      },
      onEnd: () => {
        ended = true;
      }
    });

    assert.equal(boundaryCount, 1);
    assert.equal(ended, true);

    const { spokenUtterances } = provider.getStats();
    assert.equal(spokenUtterances.length, 1);
    assert.equal(spokenUtterances[0].lang, 'ja-JP');
    assert.equal(spokenUtterances[0].rate, 0.95);
    assert.equal(spokenUtterances[0].pitch, 1.05);
    assert.equal(spokenUtterances[0].voice.name, 'Google 日本語');
  });

  it('cancels overlapping utterances on rapid card transitions and resolves stopSpeech() cleanly', async () => {
    const provider = createMockSpeechProvider({ autoFinish: false });
    setSpeechSynthesisProvider(provider);

    // Start first utterance (does not auto-finish)
    const p1 = speakText('カード1の説明です');
    // Immediately start second utterance -> should cancel first and resolve p1
    const p2 = speakText('カード2のクイズです');
    await p1; // Must resolve immediately without hanging!

    // Call stopSpeech() -> should cancel second utterance and resolve p2
    stopSpeech();
    await p2;

    const { cancelCount, spokenUtterances } = provider.getStats();
    assert.equal(spokenUtterances.length, 2);
    assert.ok(cancelCount >= 2);
  });

  it('supports speech enable/disable toggle and rate/pitch clamping', async () => {
    const provider = createMockSpeechProvider({ autoFinish: true });
    setSpeechSynthesisProvider(provider);

    setSpeechRate(3.0);
    assert.equal(getSpeechRate(), 2.0);
    setSpeechPitch(0.1);
    assert.equal(getSpeechPitch(), 0.5);

    setSpeechEnabled(false);
    assert.equal(isSpeechEnabled(), false);

    await speakText('ミュート中は再生されません');
    assert.equal(provider.getStats().spokenUtterances.length, 0);

    toggleSpeech();
    assert.equal(isSpeechEnabled(), true);
  });

  it('provides all 15 stages of 1-minute mini-lesson scripts (3 cards + 2-choice quiz + TTS)', () => {
    assert.equal(Object.keys(MINI_LESSON_SCRIPTS).length, 15);
    for (let i = 1; i <= 15; i++) {
      const lesson = getMiniLessonData(`stage-${i}`);
      assert.equal(lesson.stageId, `stage-${i}`);
      assert.ok(lesson.title.length > 0);
      assert.ok(lesson.card1.text.length > 0);
      assert.ok(lesson.card2.question.length > 0);
      assert.equal(lesson.card2.options.length, 2);
      assert.ok(['A', 'B'].includes(lesson.card2.correctOption));
      assert.ok(lesson.card3.rule.length > 0);
    }

    // Also test lookup by number and { worldId, stageId }
    assert.equal(getMiniLessonData(12).stageId, 'stage-12');
    assert.equal(getMiniLessonData({ worldId: 4, stageId: 2 }).stageId, 'stage-11');
  });
});

describe('Milestone 3: Gamification Engine (gamification-engine.js)', () => {
  beforeEach(() => {
    resetGamificationState();
  });

  it('awards +10pt for first-try correct, +20pt and increments selfCorrectionCount for self-corrected, and 0pt No-X message for near_miss', () => {
    // 1. Normal first-try correct -> +10pt
    const r1 = recordResult({
      problemId: 'p1',
      worldId: 1,
      stageId: 1,
      isCorrect: true,
      wasSelfCorrected: false,
      isStageComplete: false
    });
    assert.equal(r1.pointsAwarded, 10);
    assert.equal(r1.totalScore, 10);
    assert.equal(r1.selfCorrectionCount, 0);

    // 2. Incorrect attempt -> 0pt, No '×' symbol in message
    const r2 = recordResult({
      problemId: 'p2',
      worldId: 1,
      stageId: 1,
      isCorrect: false,
      wasSelfCorrected: false,
      isStageComplete: false
    });
    assert.equal(r2.pointsAwarded, 0);
    assert.equal(r2.totalScore, 10);
    assert.ok(!r2.feedbackMessage.includes('×'));
    assert.ok(r2.feedbackMessage.includes('おしい') || r2.feedbackMessage.includes('ヒント'));

    // 3. Self-corrected attempt -> +20pt and selfCorrectionCount +1
    const r3 = recordResult({
      problemId: 'p2',
      worldId: 1,
      stageId: 1,
      isCorrect: true,
      wasSelfCorrected: true,
      stepsUsed: 1,
      isStageComplete: true
    });
    assert.equal(r3.pointsAwarded, 20);
    assert.equal(r3.totalScore, 30);
    assert.equal(r3.selfCorrectionCount, 1);
    assert.ok(r3.feedbackMessage.includes('自分で直せた'));
  });

  it('calculates 1..3 stars per stage and gives full credit for self-correction', () => {
    // 5 first-try correct -> 3 stars
    assert.equal(
      calculateStageStars({ totalQuestions: 5, firstTryCorrectCount: 5, selfCorrectedCount: 0, stepsUsed: 0 }),
      3
    );

    // 2 first-try correct + 3 self-corrected = 5 mastered -> full credit 3 stars!
    assert.equal(
      calculateStageStars({ totalQuestions: 5, firstTryCorrectCount: 2, selfCorrectedCount: 3, stepsUsed: 2 }),
      3
    );

    // Cleared with many steps used -> 2 stars
    assert.equal(
      calculateStageStars({ totalQuestions: 5, firstTryCorrectCount: 2, selfCorrectedCount: 1, stepsUsed: 5 }),
      2
    );

    // Cleared with full hints opened -> 1 star guaranteed
    assert.equal(
      calculateStageStars({ totalQuestions: 5, firstTryCorrectCount: 1, selfCorrectedCount: 0, hintsFullyOpened: true }),
      1
    );

    // Not cleared -> 0 stars
    assert.equal(
      calculateStageStars({ totalQuestions: 5, firstTryCorrectCount: 0, allCleared: false }),
      0
    );
  });

  it('issue #13: 3-star threshold is 80% mastery AND at most 3 steps (boundary cases)', () => {
    // 3 of 5 mastered = 60% < 80% threshold -> 2 stars, even with 0 steps used
    assert.equal(
      calculateStageStars({ totalQuestions: 5, firstTryCorrectCount: 3, selfCorrectedCount: 0, stepsUsed: 0 }),
      2
    );

    // Full mastery but 5 steps used (> 3) -> the AND condition fails -> 2 stars
    assert.equal(
      calculateStageStars({ totalQuestions: 5, firstTryCorrectCount: 5, selfCorrectedCount: 0, stepsUsed: 5 }),
      2
    );
  });

  it('progresses through all 10 Lab Ranks from 見習い探検員 (Lv.1) to 伝説の算数マスター (Lv.10)', () => {
    assert.equal(LAB_RANKS.length, 10);
    assert.equal(LAB_RANKS[0].title, '見習い探検員');
    assert.equal(LAB_RANKS[9].title, '伝説の算数マスター');

    const testThresholds = [
      { score: 0, expectedLevel: 1, expectedTitle: '見習い探検員' },
      { score: 100, expectedLevel: 2, expectedTitle: 'ひらめき探索者' },
      { score: 250, expectedLevel: 3, expectedTitle: '計算チャレンジャー' },
      { score: 500, expectedLevel: 4, expectedTitle: '筆算マスター' },
      { score: 800, expectedLevel: 5, expectedTitle: '見積もりエキスパート' },
      { score: 1200, expectedLevel: 6, expectedTitle: 'わり算ブレイクスルー' },
      { score: 1700, expectedLevel: 7, expectedTitle: '四則演算スペシャリスト' },
      { score: 2300, expectedLevel: 8, expectedTitle: '自己修正プロフェッショナル' },
      { score: 3000, expectedLevel: 9, expectedTitle: '算数ラボ主任研究員' },
      { score: 4000, expectedLevel: 10, expectedTitle: '伝説の算数マスター' },
      { score: 9999, expectedLevel: 10, expectedTitle: '伝説の算数マスター' }
    ];

    for (const t of testThresholds) {
      const rank = getRankForScore(t.score);
      assert.equal(rank.level, t.expectedLevel);
      assert.equal(rank.title, t.expectedTitle);
    }
  });

  it('unlocks all 8 Badges including 自己是正達人, ヒント発見王, and お宝ハンター', () => {
    assert.equal(BADGE_DEFINITIONS.length, 8);
    const badgeNames = BADGE_DEFINITIONS.map((b) => b.name);
    assert.ok(badgeNames.includes('初めの一歩'));
    assert.ok(badgeNames.includes('自己是正達人'));
    assert.ok(badgeNames.includes('ヒント発見王'));
    assert.ok(badgeNames.includes('お宝ハンター'));
    assert.ok(badgeNames.includes('宝箱マスター'));
    assert.ok(badgeNames.includes('3日連続ラボ活動'));
    assert.ok(badgeNames.includes('研究への情熱'));
    assert.ok(badgeNames.includes('心の絆'));

    // Unlock first_step, self_repair_master, hint_master via recordResult
    recordResult({
      problemId: 'q1',
      worldId: 1,
      stageId: 1,
      isCorrect: true,
      wasSelfCorrected: true,
      stepsUsed: 2,
      isStageComplete: true
    });

    // Unlock treasure_hunter (3 mastered) and treasure_legend (10 mastered)
    recordTreasureMastered({ worldId: 1, count: 3 });
    recordTreasureMastered({ worldId: 2, count: 7 });

    // Unlock streak_3 and streak_7
    recordDailyStreak(3);
    recordDailyStreak(7);

    // Unlock cheer_receiver via Parent Cheer Stamp
    const cheerRes = sendParentCheer({ stampId: 'STAMP_RECOVERY', customText: 'いつも応援してるよ！' });
    markCheerRead(cheerRes.cheer.id, 'THANKS');

    const profile = getUserProfile();
    assert.equal(profile.unlockedBadges.length, 8);
    assert.equal(profile.badges.every((b) => b.unlocked === true), true);
  });

  it('calculates 5-World Radar Chart stats accurately for the Parent Cheer Board', () => {
    assert.equal(WORLD_DEFINITIONS.length, 5);

    // Clear all 3 stages of World 1 with 100% accuracy and 0 mistakes -> should score 100
    recordResult({ worldId: 1, stageId: 1, isCorrect: true, wasSelfCorrected: false, isStageComplete: true });
    recordResult({ worldId: 1, stageId: 2, isCorrect: true, wasSelfCorrected: true, isStageComplete: true });
    recordResult({ worldId: 1, stageId: 3, isCorrect: true, wasSelfCorrected: false, isStageComplete: true });

    const radar = calculateWorldRadarStats();
    assert.equal(radar.length, 5);

    const w1 = radar.find((w) => w.worldId === 1);
    assert.equal(w1.clearedStages, 3);
    assert.equal(w1.score, 100);

    const w2 = radar.find((w) => w.worldId === 2);
    assert.equal(w2.clearedStages, 0);
    assert.equal(w2.score, 0);
  });

  it('exports and hydrates gamification state for storage-service integration', () => {
    recordResult({ worldId: 2, stageId: 2, isCorrect: true, wasSelfCorrected: true, isStageComplete: true });
    const exported = exportGamificationState();
    assert.equal(exported.selfCorrectionCount, 1);
    assert.equal(exported.totalScore, 20);

    resetGamificationState();
    assert.equal(getUserProfile().totalScore, 0);

    const restored = loadGamificationState(exported);
    assert.equal(restored.totalScore, 20);
    assert.equal(restored.selfCorrectionCount, 1);
  });
});
