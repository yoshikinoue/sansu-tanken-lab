/**
 * src/services/review-queue.js
 * 算数探検ラボ - 復習キュー (Review Queue / Spaced Repetition)
 *
 * Issue #20: 誤答した問題を「その場の自己修正・宝箱の卒業」とは別概念として、
 * 時間間隔（1日 → 3日 → 7日）をおいて再出題し、定着（mastered）を測る。
 *
 * Pure logic only (headless compatible). すべての関数は時刻を引数 `now`
 * (Date | number(ms) | ISO文字列) で受け取るため、テストで時間を注入できる。
 *
 * Entry shape (progress.reviewQueue.entries[]):
 * {
 *   key: string,              // `${stageId}|${patternType}|${prompt}` の重複排除キー
 *   treasureItemId: string|null,
 *   stageId: string,          // 'stage-N'
 *   worldId: string,          // 'world-N'
 *   patternType: string|null,
 *   originalProblem: object,  // 宝箱アイテムと同じ保存形式（類題生成に使用）
 *   stepIndex: number,        // 0..REVIEW_INTERVAL_DAYS.length-1
 *   status: 'active' | 'mastered',
 *   dueAt: string|null,       // 次回出題期限 (ISO). mastered のとき null
 *   createdAt: string,
 *   updatedAt: string,
 *   lastAttemptAt: string|null,
 *   masteredAt: string|null,
 *   attempts: number,
 *   correctCount: number
 * }
 */

export const REVIEW_INTERVAL_DAYS = [1, 3, 7];

const DAY_MS = 24 * 60 * 60 * 1000;

// --- INTERNAL HELPERS ---

/**
 * 呼び出し側が渡す `now` をミリ秒に変換する。
 * アプリ内の呼び出しはすべて有効な Date / 有効な number / ISO文字列を渡す
 * 前提であり、解釈できない値が来た場合は無言で現在時刻にフォールバック
 * せず TypeError を投げて、呼び出し側のバグを顕在化させる。
 * @param {Date|number|string} now
 * @returns {number}
 */
function toMs(now) {
  if (now instanceof Date) {
    const ms = now.getTime();
    if (!Number.isNaN(ms)) return ms;
  } else if (typeof now === 'number' && Number.isFinite(now)) {
    return now;
  } else if (typeof now === 'string') {
    const parsed = Date.parse(now);
    if (!Number.isNaN(parsed)) return parsed;
  }
  throw new TypeError(`review-queue: "now" として解釈できない値です: ${String(now)}`);
}

/**
 * 保存済みデータ側の日時（dueAt 等）をミリ秒に変換する。
 * 保存データは壊れている可能性があるため、解釈できない場合は例外にせず
 * NaN を返し、due 判定から外れるようにする（期限到来とは扱わない）。
 * @param {any} value
 * @returns {number} ミリ秒。解釈できない場合は NaN
 */
function parseStoredMs(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') return Date.parse(value);
  return NaN;
}

/**
 * stepIndex を有効範囲 0..REVIEW_INTERVAL_DAYS.length-1 に収める。
 * 範囲外の値（例: 9）が保存データから入っても、間隔テーブルの参照で
 * undefined が混入して例外（RangeError）になるのを防ぐための正規化。
 * @param {any} stepIndex
 * @returns {number}
 */
function clampStepIndex(stepIndex) {
  const max = REVIEW_INTERVAL_DAYS.length - 1;
  if (typeof stepIndex !== 'number' || !Number.isFinite(stepIndex)) return 0;
  return Math.min(Math.max(Math.trunc(stepIndex), 0), max);
}

function toIso(ms) {
  return new Date(ms).toISOString();
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj ?? null));
}

function promptOf(problem) {
  if (!problem || typeof problem !== 'object') return '';
  return problem.prompt ||
    `${problem.operands?.[0]} ${problem.operator} ${problem.operands?.[1]}`;
}

function stageKeyOf(source, problem) {
  // originalProblem.globalStageId ('stage-N', 全体通し番号) が正。
  // 宝箱アイテム側の stageId はワールド内番号から作られており全体番号と
  // 一致しないため、キーには使わない。
  if (problem?.globalStageId) return problem.globalStageId;
  const rawWorld = problem?.worldId ?? source?.worldId;
  const world = (typeof rawWorld === 'string'
    ? parseInt(rawWorld.replace('world-', ''), 10)
    : Number(rawWorld)) || 1;
  const rawStage = problem?.stageId ?? 1;
  const stageInWorld = (typeof rawStage === 'string'
    ? parseInt(rawStage.replace('stage-', ''), 10)
    : Number(rawStage)) || 1;
  return `stage-${(world - 1) * 3 + stageInWorld}`;
}

function worldKeyOf(source, problem) {
  const rawWorld = source?.worldId ?? problem?.worldId;
  if (typeof rawWorld === 'string' && rawWorld.startsWith('world-')) return rawWorld;
  const world = Number(rawWorld ?? 1) || 1;
  return `world-${world}`;
}

// --- PUBLIC API ---

/**
 * 空の復習キューを作成
 * @returns {{ entries: Array }}
 */
export function createReviewQueue() {
  return { entries: [] };
}

/**
 * progress.reviewQueue を保証し、返す。
 * 既存セーブデータ（reviewQueue 項目なし）でも壊れないようデフォルトで補完する。
 * @param {object} progress
 * @returns {{ entries: Array }}
 */
export function ensureReviewQueue(progress) {
  if (!progress || typeof progress !== 'object') return createReviewQueue();
  const queue = progress.reviewQueue;
  if (!queue || typeof queue !== 'object' || !Array.isArray(queue.entries)) {
    progress.reviewQueue = createReviewQueue();
    return progress.reviewQueue;
  }
  // 保存データ由来の範囲外 stepIndex をここで正規化しておき、
  // recordReviewResult 等の間隔テーブル参照が例外にならないようにする。
  for (const entry of queue.entries) {
    if (entry && typeof entry === 'object') {
      entry.stepIndex = clampStepIndex(entry.stepIndex);
    }
  }
  return queue;
}

/**
 * 問題または宝箱アイテムから復習エントリの重複排除キーを作る。
 * キー = ステージ + patternType + 元の問題文（類題ではなく元の問題で識別）。
 * @param {object} source MathProblem または宝箱アイテム
 * @returns {string}
 */
export function buildReviewKey(source) {
  const problem = source?.originalProblem && typeof source.originalProblem === 'object'
    ? source.originalProblem
    : (source || {});
  const stageKey = stageKeyOf(source, problem);
  const pattern = problem.patternType || 'unknown';
  return `${stageKey}|${pattern}|${promptOf(problem)}`;
}

/**
 * 誤答で宝箱に追加されたアイテムから復習エントリを作成する。
 * - 同キーの active なエントリがある場合はそのまま返す（スケジュールは変えない）
 * - mastered 済みのエントリが再び誤答された場合はステップ0から再開する
 * @param {object} progress
 * @param {object} item 宝箱アイテム (addItem の戻り値)
 * @param {Date|number|string} now
 * @returns {object|null} 作成または更新されたエントリ
 */
export function enqueueFromTreasureItem(progress, item, now) {
  if (!progress || !item || typeof item !== 'object') return null;
  const queue = ensureReviewQueue(progress);
  const nowMs = toMs(now);
  const key = buildReviewKey(item);
  const problem = item.originalProblem && typeof item.originalProblem === 'object'
    ? item.originalProblem
    : {};

  const existing = queue.entries.find(e => e && e.key === key);
  if (existing) {
    if (existing.status === 'mastered') {
      // 定着済みの問題を再び間違えたら、ステップ0から数え直す。
      // attempts / correctCount もリセットし、新規エントリと同じ状態にする。
      existing.status = 'active';
      existing.stepIndex = 0;
      existing.dueAt = toIso(nowMs + REVIEW_INTERVAL_DAYS[0] * DAY_MS);
      existing.masteredAt = null;
      existing.attempts = 0;
      existing.correctCount = 0;
      existing.originalProblem = deepCopy(problem);
      existing.treasureItemId = item.id || existing.treasureItemId || null;
      existing.updatedAt = toIso(nowMs);
    }
    return existing;
  }

  const entry = {
    key,
    treasureItemId: item.id || null,
    stageId: stageKeyOf(item, problem),
    worldId: worldKeyOf(item, problem),
    patternType: problem.patternType || null,
    originalProblem: deepCopy(problem),
    stepIndex: 0,
    status: 'active',
    dueAt: toIso(nowMs + REVIEW_INTERVAL_DAYS[0] * DAY_MS),
    createdAt: toIso(nowMs),
    updatedAt: toIso(nowMs),
    lastAttemptAt: null,
    masteredAt: null,
    attempts: 0,
    correctCount: 0
  };
  queue.entries.push(entry);
  return entry;
}

/**
 * エントリが期限到来しているか
 * @param {object} entry
 * @param {Date|number|string} now
 * @returns {boolean}
 */
export function isDue(entry, now) {
  if (!entry || entry.status !== 'active' || !entry.dueAt) return false;
  const dueMs = parseStoredMs(entry.dueAt);
  // dueAt が解釈できない壊れたデータは「期限到来」とは扱わない
  if (Number.isNaN(dueMs)) return false;
  return dueMs <= toMs(now);
}

/**
 * 期限到来している active なエントリを dueAt 昇順で返す
 * @param {object} progress
 * @param {Date|number|string} now
 * @returns {Array}
 */
export function getDueEntries(progress, now) {
  const queue = ensureReviewQueue(progress);
  const nowMs = toMs(now);
  return queue.entries
    .filter(e => {
      if (!e || e.status !== 'active' || !e.dueAt) return false;
      const dueMs = parseStoredMs(e.dueAt);
      // dueAt が解釈できない壊れたデータは due 判定から外す
      return !Number.isNaN(dueMs) && dueMs <= nowMs;
    })
    .sort((a, b) => parseStoredMs(a.dueAt) - parseStoredMs(b.dueAt));
}

/**
 * 期限到来している復習の件数
 * @param {object} progress
 * @param {Date|number|string} now
 * @returns {number}
 */
export function countDueReviews(progress, now) {
  return getDueEntries(progress, now).length;
}

/**
 * 復習セッションでの解答結果を記録し、スケジュールを更新する。
 * - 期限到来後の正解: 次のステップへ進む。最終ステップ正解で mastered（定着）
 * - 期限到来後の誤答: ステップを1つ戻し（最小0）、そのステップの間隔で再スケジュール
 * - 期限前の解答: ステップは進めない（attempts のみ記録し outcome は 'early'）
 *
 * 次回期限は「解答した時刻 + そのステップの間隔」で決まる（解答時刻起点）。
 * 前回の期限からの繰り越しはしないため、遅れて答えるほど次の出題も後ろへずれる。
 * @param {object} progress
 * @param {string} key エントリのキー
 * @param {boolean} isCorrect
 * @param {Date|number|string} now
 * @returns {{ entry: object|null, outcome: 'advanced'|'mastered'|'steppedBack'|'early'|'notFound' }}
 */
export function recordReviewResult(progress, key, isCorrect, now) {
  const queue = ensureReviewQueue(progress);
  const entry = queue.entries.find(e => e && e.key === key);
  if (!entry) return { entry: null, outcome: 'notFound' };
  if (entry.status !== 'active') return { entry, outcome: 'notFound' };

  // ensureReviewQueue でも正規化するが、直接壊れた値が残っていても
  // 間隔テーブル参照が例外にならないよう、ここでも範囲内に収める。
  entry.stepIndex = clampStepIndex(entry.stepIndex);

  const nowMs = toMs(now);
  entry.attempts = (entry.attempts || 0) + 1;
  entry.lastAttemptAt = toIso(nowMs);
  entry.updatedAt = toIso(nowMs);

  if (!isDue(entry, nowMs)) {
    // 'early' 分岐: アプリの通常フローではセッションは due なエントリだけを
    // 対象に始まるため到達不能。到達不能だが、直接呼び出しや状態の競合に
    // 対する安全網として残している（ステップを進めず attempts のみ記録）。
    return { entry, outcome: 'early' };
  }

  if (isCorrect) {
    entry.correctCount = (entry.correctCount || 0) + 1;
    if (entry.stepIndex >= REVIEW_INTERVAL_DAYS.length - 1) {
      entry.status = 'mastered';
      entry.masteredAt = toIso(nowMs);
      entry.dueAt = null;
      return { entry, outcome: 'mastered' };
    }
    entry.stepIndex += 1;
    entry.dueAt = toIso(nowMs + REVIEW_INTERVAL_DAYS[entry.stepIndex] * DAY_MS);
    return { entry, outcome: 'advanced' };
  }

  entry.stepIndex = Math.max(0, (entry.stepIndex || 0) - 1);
  entry.dueAt = toIso(nowMs + REVIEW_INTERVAL_DAYS[entry.stepIndex] * DAY_MS);
  return { entry, outcome: 'steppedBack' };
}

export const ReviewQueue = {
  REVIEW_INTERVAL_DAYS,
  createReviewQueue,
  ensureReviewQueue,
  buildReviewKey,
  enqueueFromTreasureItem,
  isDue,
  getDueEntries,
  countDueReviews,
  recordReviewResult
};

export default ReviewQueue;
