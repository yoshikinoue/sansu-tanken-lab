/**
 * Gamification Engine: Lab Ranks, 8 Badges, Stage Stars, Self-Correction Empowerment,
 * 5-World Radar Analytics & Parent Cheer Stamps
 * 算数探検ラボ (Smart Math Discovery Lab)
 */

export const LAB_RANKS = [
  {
    level: 1,
    title: '見習い探検員',
    altTitle: '見習い研究員',
    aliases: ['見習い探検員', '見習い研究員'],
    minScore: 0,
    maxScore: 99,
    icon: '🔍',
    badgeColor: '#38bdf8'
  },
  {
    level: 2,
    title: 'ひらめき探索者',
    altTitle: 'ひらめき探索者',
    aliases: ['ひらめき探索者'],
    minScore: 100,
    maxScore: 249,
    icon: '💡',
    badgeColor: '#22d3ee'
  },
  {
    level: 3,
    title: '計算チャレンジャー',
    altTitle: '計算チャレンジャー',
    aliases: ['計算チャレンジャー'],
    minScore: 250,
    maxScore: 499,
    icon: '🚀',
    badgeColor: '#34d399'
  },
  {
    level: 4,
    title: '筆算マスター',
    altTitle: '筆算マスター',
    aliases: ['筆算マスター'],
    minScore: 500,
    maxScore: 799,
    icon: '📐',
    badgeColor: '#a3e635'
  },
  {
    level: 5,
    title: '見積もりエキスパート',
    altTitle: '見積もりエキスパート',
    aliases: ['見積もりエキスパート'],
    minScore: 800,
    maxScore: 1199,
    icon: '🧭',
    badgeColor: '#facc15'
  },
  {
    level: 6,
    title: 'わり算ブレイクスルー',
    altTitle: 'わり算ブレイクスルー',
    aliases: ['わり算ブレイクスルー'],
    minScore: 1200,
    maxScore: 1699,
    icon: '⚡',
    badgeColor: '#fb923c'
  },
  {
    level: 7,
    title: '四則演算スペシャリスト',
    altTitle: '四則演算スペシャリスト',
    aliases: ['四則演算スペシャリスト'],
    minScore: 1700,
    maxScore: 2299,
    icon: '🧪',
    badgeColor: '#f472b6'
  },
  {
    level: 8,
    title: '自己修正プロフェッショナル',
    altTitle: '自己修正プロフェッショナル',
    aliases: ['自己修正プロフェッショナル'],
    minScore: 2300,
    maxScore: 2999,
    icon: '🛠️',
    badgeColor: '#c084fc'
  },
  {
    level: 9,
    title: '算数ラボ主任研究員',
    altTitle: '算数ラボ主任研究員',
    aliases: ['算数ラボ主任研究員'],
    minScore: 3000,
    maxScore: 3999,
    icon: '🦉',
    badgeColor: '#818cf8'
  },
  {
    level: 10,
    title: '伝説の算数マスター',
    altTitle: '算数マスター大博士',
    aliases: ['伝説の算数マスター', '算数マスター大博士'],
    minScore: 4000,
    maxScore: Infinity,
    icon: '👑',
    badgeColor: '#fbbf24'
  }
];

export const BADGE_DEFINITIONS = [
  {
    id: 'first_step',
    name: '初めの一歩',
    title: '初めの一歩',
    aliases: ['初めの一歩'],
    description: '最初の問題・ステージをクリアした記念バッジ！',
    icon: '🌱'
  },
  {
    id: 'self_repair_master',
    name: '自己是正達人',
    title: '自己是正達人（リカバリーの達人）',
    aliases: ['自己是正達人', 'リカバリーの達人'],
    description: '間違えても自分で気づいて直せた「ナイス・リカバリー！」の証！',
    icon: '💪'
  },
  {
    id: 'hint_master',
    name: 'ヒント発見王',
    title: 'ヒント発見王（ノーミス探検家）',
    aliases: ['ヒント発見王', 'ノーミス探検家', 'perfect_clear'],
    description: 'ステップガイドのヒントを活用して解き明かした探究の証！',
    icon: '🔎'
  },
  {
    id: 'treasure_hunter',
    name: 'お宝ハンター',
    title: 'お宝ハンター',
    aliases: ['お宝ハンター'],
    description: 'パワーアップ宝箱のお宝問題を完全マスターした証！',
    icon: '💎'
  },
  {
    id: 'treasure_legend',
    name: '宝箱マスター',
    title: '宝箱マスター',
    aliases: ['宝箱マスター'],
    description: 'パワーアップ宝箱の問題を10問完全マスターした伝説の証！',
    icon: '🏆'
  },
  {
    id: 'streak_3',
    name: '3日連続ラボ活動',
    title: '3日連続ラボ活動',
    aliases: ['3日連続ラボ活動'],
    description: '3日連続で算数探検ラボで学習を続けた継続の証！',
    icon: '🔥'
  },
  {
    id: 'streak_7',
    name: '研究への情熱',
    title: '研究への情熱',
    aliases: ['研究への情熱'],
    description: '7日連続でプレイを達成した情熱の研究員バッジ！',
    icon: '🌟'
  },
  {
    id: 'cheer_receiver',
    name: '心の絆',
    title: '心の絆',
    aliases: ['心の絆'],
    description: 'おうちの人からの応援スタンプを受け取った絆の証！',
    icon: '❤️'
  }
];

export const WORLD_DEFINITIONS = [
  { worldId: 1, key: 'world-1', name: 'たし算・ひき算', fullName: 'たし算・ひき算ラボ', stages: ['stage-1', 'stage-2', 'stage-3'] },
  { worldId: 2, key: 'world-2', name: 'かけ算パワー', fullName: 'かけ算パワーラボ', stages: ['stage-4', 'stage-5', 'stage-6'] },
  { worldId: 3, key: 'world-3', name: 'わり算とあまり', fullName: 'わり算とあまりラボ', stages: ['stage-7', 'stage-8', 'stage-9'] },
  { worldId: 4, key: 'world-4', name: '2桁わり算・見積もり', fullName: '2桁わり算・見積もりラボ', stages: ['stage-10', 'stage-11', 'stage-12'] },
  { worldId: 5, key: 'world-5', name: '計算のきまり・四則混合', fullName: '計算のきまり・四則混合ラボ', stages: ['stage-13', 'stage-14', 'stage-15'] },
  { worldId: 6, key: 'world-6', name: '小数', fullName: '小数ラボ', stages: ['stage-16', 'stage-17', 'stage-18'] },
  { worldId: 7, key: 'world-7', name: '分数', fullName: '分数パーク', stages: ['stage-19', 'stage-20', 'stage-21'] },
  { worldId: 8, key: 'world-8', name: '大きな数とがい数', fullName: '大きな数とがい数ラボ', stages: ['stage-22', 'stage-23', 'stage-24'] }
];

// ワールド数・総ステージ数は定義から導出する (ワールド追加に追随)
const MAX_WORLD_ID = WORLD_DEFINITIONS.length;
const TOTAL_STAGE_COUNT = WORLD_DEFINITIONS.reduce((n, w) => n + w.stages.length, 0);

export const PARENT_STAMPS = [
  { id: 'STAMP_FOCUS', icon: '🌟', label: 'すごい集中力！' },
  { id: 'STAMP_RECOVERY', icon: '💪', label: '自分で直せてえらい！' },
  { id: 'STAMP_LOVE', icon: '❤️', label: 'いつも応援してるよ！' },
  { id: 'STAMP_TREASURE', icon: '💎', label: 'お宝マスターへの道！' },
  { id: 'STAMP_CHALLENGE', icon: '🚀', label: 'ナイスチャレンジ！' },
  { id: 'STAMP_FIRE', icon: '🔥', label: 'その調子でいこう！' },
  { id: 'STAMP_GENIUS', icon: '👑', label: '計算博士になってきたね！' },
  { id: 'STAMP_EFFORT', icon: '🌈', label: '今日もがんばったね！' }
];

const NO_X_ENCOURAGEMENTS = [
  'おしい！もう一歩！',
  'ヒントを発見！',
  'ラボデータ再スキャン！もう一回やってみよう！'
];

/**
 * Create a clean initial gamification state.
 */
function createDefaultState() {
  const stageStars = {};
  const stageStats = {};
  for (let i = 1; i <= TOTAL_STAGE_COUNT; i++) {
    const stageKey = `stage-${i}`;
    stageStars[stageKey] = 0;
    stageStats[stageKey] = {
      stageId: stageKey,
      worldId: Math.ceil(i / 3),
      cleared: false,
      stars: 0,
      attempts: 0,
      correctCount: 0,
      firstTryCorrectCount: 0,
      selfCorrectedCount: 0,
      mistakesCount: 0,
      stepsUsedCount: 0
    };
  }

  const worldTracking = {};
  for (const w of WORLD_DEFINITIONS) {
    worldTracking[w.worldId] = {
      worldId: w.worldId,
      name: w.name,
      fullName: w.fullName,
      clearedStages: new Set(),
      attempts: 0,
      correctCount: 0,
      firstTryCorrectCount: 0,
      selfCorrectedCount: 0,
      mistakesCount: 0,
      treasureMistakes: 0,
      treasureMastered: 0
    };
  }

  return {
    totalScore: 0,
    labExp: 0,
    selfCorrectionCount: 0,
    hintsDiscoveredCount: 0,
    perfectClearCount: 0,
    treasureMasteredCount: 0,
    streakDays: 1,
    lastActiveDate: new Date().toISOString().slice(0, 10),
    unlockedBadgeIds: new Set(),
    badgeUnlockedAt: {},
    stageStars,
    stageStats,
    worldTracking,
    cheerMessages: []
  };
}

let state = createDefaultState();

/**
 * Resolve worldId and canonical stageKey ('stage-N') from flexible inputs.
 * 範囲は WORLD_DEFINITIONS から導出する。
 */
function resolveWorldAndStage(worldIdInput, stageIdInput) {
  let worldId = Number(worldIdInput) || 1;
  worldId = Math.max(1, Math.min(MAX_WORLD_ID, Math.floor(worldId)));

  let globalStageNum = 1;
  if (typeof stageIdInput === 'string') {
    const match = stageIdInput.match(/(\d+)/);
    if (match) {
      const parsed = Number(match[1]);
      if (stageIdInput.toLowerCase().startsWith('stage-') && parsed >= 1 && parsed <= TOTAL_STAGE_COUNT) {
        globalStageNum = parsed;
        worldId = Math.ceil(globalStageNum / 3);
      } else if (parsed >= 1 && parsed <= 3) {
        globalStageNum = (worldId - 1) * 3 + parsed;
      } else if (parsed >= 1 && parsed <= TOTAL_STAGE_COUNT) {
        globalStageNum = parsed;
        worldId = Math.ceil(globalStageNum / 3);
      }
    }
  } else if (typeof stageIdInput === 'number' && !Number.isNaN(stageIdInput)) {
    const num = Math.floor(stageIdInput);
    if (num >= 1 && num <= 3 && worldIdInput !== undefined) {
      globalStageNum = (worldId - 1) * 3 + num;
    } else if (num >= 1 && num <= TOTAL_STAGE_COUNT) {
      globalStageNum = num;
      worldId = Math.ceil(globalStageNum / 3);
    }
  } else {
    globalStageNum = (worldId - 1) * 3 + 1;
  }

  const stageKey = `stage-${globalStageNum}`;
  return { worldId, stageKey, globalStageNum };
}

/**
 * Look up the Lab Rank object for a given score/EXP value.
 * @param {number} score
 * @returns {object}
 */
export function getRankForScore(score) {
  const safeScore = Math.max(0, Number(score) || 0);
  for (let i = LAB_RANKS.length - 1; i >= 0; i--) {
    if (safeScore >= LAB_RANKS[i].minScore) {
      const r = LAB_RANKS[i];
      return { id: `rank-${r.level}`, rank: r.level, name: r.title, ...r };
    }
  }
  const r0 = LAB_RANKS[0];
  return { id: `rank-${r0.level}`, rank: r0.level, name: r0.title, ...r0 };
}

/**
 * Calculate 1..3 stars for a stage where self-correction gives full credit toward clearing.
 *
 * Criteria:
 * - 3 stars (⭐⭐⭐): Stage cleared AND (firstTryCorrectCount + selfCorrectedCount >= 4, or >= 80% of questions)
 *   AND not hintsFullyOpened. Self-correction gives full credit so a child who catches and fixes their own mistake
 *   can still earn 3 stars! (If stepsUsed > 2 on multiple problems without self-correction credit, 2 stars).
 * - 2 stars (⭐⭐): Stage cleared using step-by-step guide or moderate accuracy (>= 2 questions credited).
 * - 1 star (⭐): Stage completed with full hints opened or lower accuracy (minimum 1 star guaranteed on clear).
 *
 * @param {object} params
 * @returns {number} 0 | 1 | 2 | 3
 */
export function calculateStageStars({
  totalQuestions = 5,
  firstTryCorrectCount = 0,
  selfCorrectedCount = 0,
  stepsUsed = 0,
  allCleared = true,
  hintsFullyOpened = false
} = {}) {
  if (allCleared === false) {
    return 0;
  }

  if (hintsFullyOpened) {
    return 1;
  }

  const total = Math.max(1, Number(totalQuestions) || 5);
  const firstTry = Math.max(0, Number(firstTryCorrectCount) || 0);
  const selfCorr = Math.max(0, Number(selfCorrectedCount) || 0);
  const steps = Math.max(0, Number(stepsUsed) || 0);

  // Self-correction gives full credit toward stage mastery
  const effectiveMasteredQuestions = firstTry + selfCorr;
  const thresholdForThreeStars = Math.max(1, Math.ceil(total * 0.8)); // 4 out of 5

  if (effectiveMasteredQuestions >= thresholdForThreeStars && steps <= 3) {
    return 3;
  }

  if (effectiveMasteredQuestions >= Math.ceil(total * 0.4) || steps > 0) {
    return 2;
  }

  return 1;
}

/**
 * Unlock a badge by ID if not already unlocked.
 */
function unlockBadge(badgeId) {
  let canonicalId = badgeId;
  if (badgeId === 'perfect_clear') {
    canonicalId = 'hint_master';
  }
  const exists = BADGE_DEFINITIONS.some((b) => b.id === canonicalId);
  if (!exists) return false;

  if (!state.unlockedBadgeIds.has(canonicalId)) {
    state.unlockedBadgeIds.add(canonicalId);
    state.badgeUnlockedAt[canonicalId] = new Date().toISOString();
    return true;
  }
  return false;
}

/**
 * Evaluate all 8 badge conditions and unlock any newly qualified badges.
 * @returns {Array<object>} List of newly unlocked badge objects
 */
export function evaluateBadges() {
  const newlyUnlocked = [];

  const checkAndUnlock = (id) => {
    if (unlockBadge(id)) {
      const def = BADGE_DEFINITIONS.find((b) => b.id === id);
      if (def) newlyUnlocked.push({ ...def, unlocked: true, unlockedAt: state.badgeUnlockedAt[id] });
    }
  };

  // 1. first_step: At least 1 stage cleared or at least 1 correct answer recorded
  const anyStageCleared = Object.values(state.stageStats).some((s) => s.cleared || s.correctCount > 0);
  if (anyStageCleared || state.totalScore > 0) {
    checkAndUnlock('first_step');
  }

  // 2. self_repair_master (自己是正達人 / リカバリーの達人): Self-corrected at least 1+ times (or 3/10 milestone)
  if (state.selfCorrectionCount >= 1) {
    checkAndUnlock('self_repair_master');
  }

  // 3. hint_master (ヒント発見王 / ノーミス探検家): Used step guide hints or achieved a 3-star perfect clear
  if (state.hintsDiscoveredCount >= 1 || state.perfectClearCount >= 1) {
    checkAndUnlock('hint_master');
  }

  // 4. treasure_hunter (お宝ハンター): Mastered at least 3 treasure problems (or >= 1 when explicitly triggered)
  if (state.treasureMasteredCount >= 3) {
    checkAndUnlock('treasure_hunter');
  }

  // 5. treasure_legend (宝箱マスター): Mastered 10 treasure problems
  if (state.treasureMasteredCount >= 10) {
    checkAndUnlock('treasure_legend');
  }

  // 6. streak_3 (3日連続ラボ活動): 3 consecutive days
  if (state.streakDays >= 3) {
    checkAndUnlock('streak_3');
  }

  // 7. streak_7 (研究への情熱): 7 consecutive days
  if (state.streakDays >= 7) {
    checkAndUnlock('streak_7');
  }

  // 8. cheer_receiver (心の絆): Received/read a parent cheer stamp
  if (state.cheerMessages.length >= 1) {
    checkAndUnlock('cheer_receiver');
  }

  return newlyUnlocked;
}

/**
 * Compute 5-world radar chart statistics for the Parent Cheer Board.
 * Formula from survey_miner_2/analysis.md §5.2:
 *   WorldScore = (clearedStages / 3) * 40 + (accuracyRate * 40) + (treasureMasteryRatio * 20)
 *   (Unmistaken worlds receive full 20pt treasure bonus when active/cleared, or proportional score).
 *
 * @returns {Array<object>} Array of world stat objects (one per defined world)
 */
export function calculateWorldRadarStats() {
  return WORLD_DEFINITIONS.map((worldDef) => {
    const wt = state.worldTracking[worldDef.worldId];

    // Count cleared stages for this world
    let clearedCount = wt ? wt.clearedStages.size : 0;
    for (const stgKey of worldDef.stages) {
      if (state.stageStats[stgKey]?.cleared || state.stageStars[stgKey] > 0) {
        wt.clearedStages.add(stgKey);
      }
    }
    clearedCount = Math.min(3, wt.clearedStages.size);

    const stageClearComponent = (clearedCount / 3) * 40;

    // Accuracy rate (self-correction counts positively toward mastery!)
    const attempts = wt.attempts;
    const effectiveCorrect = Math.min(attempts, wt.firstTryCorrectCount + wt.selfCorrectedCount);
    const accuracyRate = attempts > 0 ? (effectiveCorrect / attempts) : 0;
    const accuracyComponent = accuracyRate * 40;

    // Treasure mastery ratio (20 points max)
    let treasureComponent = 0;
    if (wt.treasureMistakes > 0) {
      const ratio = Math.min(1, wt.treasureMastered / wt.treasureMistakes);
      treasureComponent = ratio * 20;
    } else if (attempts > 0 || clearedCount > 0) {
      // No unmastered mistakes in this active world -> full 20pt bonus per spec §5.2
      treasureComponent = 20;
    }

    const rawScore = stageClearComponent + accuracyComponent + treasureComponent;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    return {
      worldId: worldDef.worldId,
      key: worldDef.key,
      name: worldDef.name,
      fullName: worldDef.fullName,
      clearedStages: clearedCount,
      totalStages: 3,
      attempts,
      correctCount: wt.correctCount,
      firstTryCorrectCount: wt.firstTryCorrectCount,
      selfCorrectedCount: wt.selfCorrectedCount,
      accuracyRate: Number(accuracyRate.toFixed(2)),
      treasureMistakes: wt.treasureMistakes,
      treasureMastered: wt.treasureMastered,
      score
    };
  });
}

/**
 * Record the result of a problem attempt or stage completion.
 *
 * Points & Empowerment rules:
 * - Normal correct (`isCorrect && !wasSelfCorrected`): +10 points
 * - Self-corrected (`isCorrect && wasSelfCorrected`): +20 points (10 base + 10 self-correction bonus)
 *   and increments `selfCorrectionCount` by 1, returning badge message "ナイス・リカバリー！自分で直せた！"
 * - Incorrect (`!isCorrect`): 0 points, NO '×' mark, returns positive lab hint message ("おしい！もう一歩！" / "ヒントを発見！")
 *
 * @param {object} payload
 * @returns {object} Detailed result update including pointsAwarded, newTotalScore, labRank, stars, newlyUnlockedBadges, feedbackMessage
 */
export function recordResult(payload = {}) {
  const {
    problemId = null,
    worldId: rawWorldId = 1,
    stageId: rawStageId = 1,
    isCorrect = true,
    wasSelfCorrected = false,
    stepsUsed = 0,
    hintsFullyOpened = false,
    isStageComplete = true,
    stageQuestionsTotal = 5,
    stageFirstTryCorrect,
    stageSelfCorrected,
    isTreasureMastered = false
  } = payload;

  const { worldId, stageKey } = resolveWorldAndStage(rawWorldId, rawStageId);
  const stg = state.stageStats[stageKey];
  const wt = state.worldTracking[worldId];

  const prevRank = getRankForScore(state.totalScore);
  let pointsAwarded = 0;
  let feedbackMessage = '';
  let feedbackType = 'info';

  stg.attempts += 1;
  wt.attempts += 1;

  if (Number(stepsUsed) > 0) {
    stg.stepsUsedCount += Number(stepsUsed);
    state.hintsDiscoveredCount += 1;
  }

  if (isCorrect) {
    stg.correctCount += 1;
    wt.correctCount += 1;

    if (wasSelfCorrected) {
      pointsAwarded = 20; // +10 base + 10 self-correction empowerment bonus
      state.selfCorrectionCount += 1;
      stg.selfCorrectedCount += 1;
      wt.selfCorrectedCount += 1;
      feedbackMessage = 'ナイス・リカバリー！自分で直せた！ (+20pt)';
      feedbackType = 'self_corrected';
    } else {
      pointsAwarded = 10;
      stg.firstTryCorrectCount += 1;
      wt.firstTryCorrectCount += 1;
      feedbackMessage = 'ピンポン！大正解！ (+10pt)';
      feedbackType = 'correct';
    }
  } else {
    pointsAwarded = 0;
    stg.mistakesCount += 1;
    wt.mistakesCount += 1;
    wt.treasureMistakes += 1;
    state.hintsDiscoveredCount += 1;
    const msgIdx = (stg.mistakesCount - 1) % NO_X_ENCOURAGEMENTS.length;
    feedbackMessage = NO_X_ENCOURAGEMENTS[msgIdx];
    feedbackType = 'near_miss';
  }

  if (isTreasureMastered) {
    state.treasureMasteredCount += 1;
    wt.treasureMastered += 1;
    pointsAwarded += 50; // Treasure mastery bonus per spec §4.2
  }

  state.totalScore += pointsAwarded;
  state.labExp = state.totalScore;

  // Compute stage stars if problem is correct or stage is marked complete
  let earnedStars = stg.stars;
  if (isCorrect && isStageComplete) {
    stg.cleared = true;
    wt.clearedStages.add(stageKey);

    const firstTryForCalc = stageFirstTryCorrect !== undefined
      ? Number(stageFirstTryCorrect)
      : (wasSelfCorrected ? 0 : Math.max(4, stg.firstTryCorrectCount));
    const selfCorrForCalc = stageSelfCorrected !== undefined
      ? Number(stageSelfCorrected)
      : (wasSelfCorrected ? Math.max(4, stg.selfCorrectedCount) : stg.selfCorrectedCount);

    const computedStars = calculateStageStars({
      totalQuestions: stageQuestionsTotal,
      firstTryCorrectCount: firstTryForCalc,
      selfCorrectedCount: selfCorrForCalc,
      stepsUsed: Number(stepsUsed) || 0,
      allCleared: true,
      hintsFullyOpened: Boolean(hintsFullyOpened)
    });

    if (computedStars === 3 && stg.mistakesCount === 0) {
      state.perfectClearCount += 1;
    }

    earnedStars = Math.max(stg.stars, computedStars);
    stg.stars = earnedStars;
    state.stageStars[stageKey] = earnedStars;
  }

  const newRank = getRankForScore(state.totalScore);
  const rankUp = newRank.level > prevRank.level;
  const newlyUnlockedBadges = evaluateBadges();

  return {
    problemId,
    worldId,
    stageId: stageKey,
    isCorrect: Boolean(isCorrect),
    wasSelfCorrected: Boolean(isCorrect && wasSelfCorrected),
    pointsAwarded,
    totalScore: state.totalScore,
    labExp: state.labExp,
    selfCorrectionCount: state.selfCorrectionCount,
    stars: earnedStars,
    stageStars: state.stageStars[stageKey],
    labRank: newRank,
    rankUp,
    newlyUnlockedBadges,
    feedbackType,
    feedbackMessage
  };
}

/**
 * Record stage clear status and stars into gamification internal state so
 * profile.stars and world radar stats stay synchronized with stageProgress.
 * @param {object} [params={}]
 * @returns {object}
 */
export function recordStageClear({
  stageId = 1,
  worldId,
  stars = 0,
  firstTryCorrectCount = 0,
  selfCorrectedCount = 0
} = {}) {
  const resolved = resolveWorldAndStage(worldId, stageId);
  const stg = state.stageStats[resolved.stageKey];
  const wt = state.worldTracking[resolved.worldId];
  const numericStars = Math.max(0, Math.min(3, Number(stars) || 0));

  if (stg) {
    stg.cleared = true;
    stg.stars = Math.max(stg.stars || 0, numericStars);
    stg.firstTryCorrectCount = Math.max(stg.firstTryCorrectCount || 0, Number(firstTryCorrectCount) || 0);
    stg.selfCorrectedCount = Math.max(stg.selfCorrectedCount || 0, Number(selfCorrectedCount) || 0);
    state.stageStars[resolved.stageKey] = Math.max(state.stageStars[resolved.stageKey] || 0, stg.stars);
  }
  if (wt) {
    wt.clearedStages.add(resolved.stageKey);
  }
  if (numericStars === 3 && stg && stg.mistakesCount === 0) {
    state.perfectClearCount += 1;
  }

  const newlyUnlockedBadges = evaluateBadges();
  const totalStars = Object.values(state.stageStars).reduce((sum, s) => sum + (Number(s) || 0), 0);

  return {
    stageId: resolved.stageKey,
    worldId: resolved.worldId,
    stars: state.stageStars[resolved.stageKey] || 0,
    totalStars,
    newlyUnlockedBadges
  };
}

/**
 * Record that a Power-Up Treasure Box item was fully mastered (2 consecutive clears).
 * @param {object} [params={}]
 * @returns {object}
 */
export function recordTreasureMastered({ worldId = 1, count = 1 } = {}) {
  const safeCount = Math.max(1, Number(count) || 1);
  const wId = Math.max(1, Math.min(5, Number(worldId) || 1));
  state.treasureMasteredCount += safeCount;
  if (state.worldTracking[wId]) {
    state.worldTracking[wId].treasureMastered += safeCount;
  }
  state.totalScore += 50 * safeCount;
  state.labExp = state.totalScore;
  const newlyUnlockedBadges = evaluateBadges();
  return {
    treasureMasteredCount: state.treasureMasteredCount,
    totalScore: state.totalScore,
    newlyUnlockedBadges
  };
}

/**
 * Update daily streak days and evaluate streak badges ('streak_3', 'streak_7').
 * @param {number|string} streakOrDate
 * @returns {object}
 */
export function recordDailyStreak(streakOrDate) {
  if (typeof streakOrDate === 'number') {
    state.streakDays = Math.max(1, Math.floor(streakOrDate));
  } else if (typeof streakOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(streakOrDate)) {
    const prevDate = new Date(`${state.lastActiveDate}T00:00:00Z`);
    const nextDate = new Date(`${streakOrDate}T00:00:00Z`);
    const diffDays = Math.round((nextDate - prevDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      state.streakDays += 1;
    } else if (diffDays > 1) {
      state.streakDays = 1;
    }
    state.lastActiveDate = streakOrDate;
  }
  const newlyUnlockedBadges = evaluateBadges();
  return {
    streakDays: state.streakDays,
    lastActiveDate: state.lastActiveDate,
    newlyUnlockedBadges
  };
}

/**
 * Send a Parent Cheer Stamp & optional message (up to 50 chars, sanitized).
 * Also unlocks the 'cheer_receiver' (心の絆) badge.
 *
 * @param {object} params
 * @returns {object}
 */
export function sendParentCheer({ stampId = 'STAMP_RECOVERY', customText = '' } = {}) {
  const stamp = PARENT_STAMPS.find((s) => s.id === stampId) || PARENT_STAMPS[0];
  const sanitizedText = String(customText ?? '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 50);

  const message = {
    id: `cheer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    stampId: stamp.id,
    stampIcon: stamp.icon,
    stampLabel: stamp.label,
    customText: sanitizedText || stamp.label,
    sentAt: new Date().toISOString(),
    readByChild: false,
    childReaction: null
  };

  state.cheerMessages.push(message);
  const newlyUnlockedBadges = evaluateBadges();

  return {
    cheer: message,
    newlyUnlockedBadges
  };
}

/**
 * Mark a parent cheer message as read by the child and record their reaction ('THANKS' | 'HEART' | 'SMILE').
 */
export function markCheerRead(cheerId, reaction = 'THANKS') {
  const msg = state.cheerMessages.find((m) => m.id === cheerId) || state.cheerMessages[state.cheerMessages.length - 1];
  if (msg) {
    msg.readByChild = true;
    msg.childReaction = reaction;
  }
  evaluateBadges();
  return msg || null;
}

/**
 * Return the complete user gamification profile matching PROJECT.md & SCOPE.md contracts:
 * `getUserProfile()` -> `{ labRank, stars, badges, selfCorrectionCount, worldStats, ... }`
 *
 * @returns {object}
 */
export function getUserProfile() {
  const rankObj = getRankForScore(state.totalScore);
  const totalStars = Object.values(state.stageStars).reduce((sum, s) => sum + (Number(s) || 0), 0);

  const badges = BADGE_DEFINITIONS.map((def) => {
    const unlocked = state.unlockedBadgeIds.has(def.id);
    return {
      ...def,
      unlocked,
      unlockedAt: unlocked ? state.badgeUnlockedAt[def.id] : null
    };
  });

  const unlockedBadges = badges.filter((b) => b.unlocked);
  const worldStats = calculateWorldRadarStats();

  return {
    labRank: {
      ...rankObj,
      // Provide convenient string comparison/coercion alongside object properties
      toString() {
        return rankObj.title;
      }
    },
    rankLevel: rankObj.level,
    rankTitle: rankObj.title,
    stars: totalStars,
    stageStars: { ...state.stageStars },
    badges,
    unlockedBadges,
    unlockedBadgeIds: Array.from(state.unlockedBadgeIds),
    selfCorrectionCount: state.selfCorrectionCount,
    worldStats,
    totalScore: state.totalScore,
    labExp: state.labExp,
    streakDays: state.streakDays,
    treasureMasteredCount: state.treasureMasteredCount,
    cheerMessages: [...state.cheerMessages]
  };
}

/**
 * Export serializable state for persistence with storage-service.js.
 */
export function exportGamificationState() {
  return {
    totalScore: state.totalScore,
    labExp: state.labExp,
    labRank: getRankForScore(state.totalScore).level,
    selfCorrectionCount: state.selfCorrectionCount,
    hintsDiscoveredCount: state.hintsDiscoveredCount,
    perfectClearCount: state.perfectClearCount,
    treasureMasteredCount: state.treasureMasteredCount,
    streakDays: state.streakDays,
    lastActiveDate: state.lastActiveDate,
    unlockedBadges: Array.from(state.unlockedBadgeIds),
    stageStars: { ...state.stageStars },
    cheerMessages: [...state.cheerMessages]
  };
}

/**
 * Load/hydrate gamification state from saved progress data.
 * @param {object} saved
 */
export function loadGamificationState(saved = {}) {
  state = createDefaultState();
  if (!saved || typeof saved !== 'object') return getUserProfile();

  const gam = saved.gamification || saved;
  if (typeof gam.totalScore === 'number') {
    state.totalScore = Math.max(0, gam.totalScore);
    state.labExp = state.totalScore;
  } else if (typeof gam.labExp === 'number') {
    state.labExp = Math.max(0, gam.labExp);
    state.totalScore = state.labExp;
  }

  if (typeof gam.selfCorrectionCount === 'number') {
    state.selfCorrectionCount = Math.max(0, gam.selfCorrectionCount);
  }
  if (typeof gam.streakDays === 'number') {
    state.streakDays = Math.max(1, gam.streakDays);
  }
  if (typeof gam.lastActiveDate === 'string') {
    state.lastActiveDate = gam.lastActiveDate;
  }
  if (typeof gam.treasureMasteredCount === 'number') {
    state.treasureMasteredCount = Math.max(0, gam.treasureMasteredCount);
  }
  if (Array.isArray(gam.unlockedBadges)) {
    for (const bId of gam.unlockedBadges) {
      unlockBadge(bId);
    }
  }

  if (gam.stageStars && typeof gam.stageStars === 'object') {
    for (const [k, v] of Object.entries(gam.stageStars)) {
      if (state.stageStars[k] !== undefined) {
        const merged = Math.max(Number(state.stageStars[k]) || 0, Number(v) || 0);
        state.stageStars[k] = merged;
        if (merged > 0) {
          state.stageStats[k].cleared = true;
          state.stageStats[k].stars = Math.max(Number(state.stageStats[k].stars) || 0, merged);
        }
      }
    }
  }

  if (saved.stageProgress && typeof saved.stageProgress === 'object') {
    for (const [k, sp] of Object.entries(saved.stageProgress)) {
      if (state.stageStats[k] && sp) {
        const mergedStars = Math.max(
          Number(state.stageStars[k]) || 0,
          Number(state.stageStats[k].stars) || 0,
          Number(sp.stars) || 0
        );
        const isCleared = Boolean(sp.cleared) || Boolean(state.stageStats[k].cleared) || mergedStars > 0;
        state.stageStats[k].cleared = isCleared;
        state.stageStats[k].stars = mergedStars;
        state.stageStats[k].firstTryCorrectCount = Math.max(
          state.stageStats[k].firstTryCorrectCount || 0,
          Number(sp.firstTryCorrectCount) || 0
        );
        state.stageStats[k].selfCorrectedCount = Math.max(
          state.stageStats[k].selfCorrectedCount || 0,
          Number(sp.selfCorrectedCount) || 0
        );
        state.stageStats[k].attempts = Math.max(
          state.stageStats[k].attempts || 0,
          Number(sp.totalAttempts) || 0
        );
        state.stageStars[k] = mergedStars;

        const wId = state.stageStats[k].worldId;
        if (state.worldTracking[wId]) {
          if (isCleared) state.worldTracking[wId].clearedStages.add(k);
          state.worldTracking[wId].attempts += Number(sp.totalAttempts) || 0;
          state.worldTracking[wId].firstTryCorrectCount += Number(sp.firstTryCorrectCount) || 0;
          state.worldTracking[wId].selfCorrectedCount += Number(sp.selfCorrectedCount) || 0;
        }
      }
    }
  }

  evaluateBadges();
  return getUserProfile();
}

/**
 * Reset gamification engine state (with optional initial overrides for testing).
 * @param {object} [initialState]
 */
export function resetGamificationState(initialState) {
  state = createDefaultState();
  if (initialState && typeof initialState === 'object') {
    return loadGamificationState(initialState);
  }
  return getUserProfile();
}
