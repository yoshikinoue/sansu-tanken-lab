/**
 * @file storage-service.js
 * @description 3-Tier Hybrid Persistence Service for Sansu Tanken Lab (算数探検ラボ).
 *   - Tier 1: Instant synchronous localStorage read/write with QuotaExceeded recovery & in-memory fallback
 *   - Tier 2: Asynchronous debounced background sync with /api/progress, conflict resolution, and offline queue
 *   - Tier 3: JSON Backup Export/Import & 8-Character Transfer Code (LAB-XXXX-XXXX) with 48h TTL
 */

export const STORAGE_KEY = 'math_lab_progress_v1';
export const TRANSFER_STORE_KEY = 'math_lab_transfers_v1';
export const SYNC_PENDING_KEY = 'math_lab_sync_pending_v1';
export const SCHEMA_VERSION = '1.0.0';
export const TRANSFER_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTVWXYZ';
export const TRANSFER_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
export const DEFAULT_DEBOUNCE_MS = 1000;
export const TOTAL_STAGES = 15;
export const DIAGNOSIS_LOG_LIMIT = 500;

// In-memory storage fallback for Node.js or restricted browser environments
const memoryStore = new Map();

const fallbackStorage = {
  getItem(key) {
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  setItem(key, value) {
    memoryStore.set(key, String(value));
  },
  removeItem(key) {
    memoryStore.delete(key);
  },
  clear() {
    memoryStore.clear();
  }
};

// In-memory transfer code registry (shared with localStorage TRANSFER_STORE_KEY)
const transferRegistry = new Map();

// Tier 2 background sync state
let debounceTimer = null;
let microtaskScheduled = false;
let latestQueuedData = null;
let latestQueuedOptions = null;
let pendingWaiters = [];
let onlineListenerRegistered = false;
let syncPendingState = false;

/**
 * Deep clone helper using structuredClone with JSON fallback.
 * @template T
 * @param {T} obj
 * @returns {T}
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch {
      // Fallback to JSON clone
    }
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Resolve active storage backend (custom option -> globalThis.localStorage -> fallbackStorage).
 * @param {object} [options]
 * @returns {Storage}
 */
export function getStorageBackend(options = {}) {
  if (options && options.storage && typeof options.storage.getItem === 'function') {
    return options.storage;
  }
  try {
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.localStorage &&
      typeof globalThis.localStorage.getItem === 'function' &&
      typeof globalThis.localStorage.setItem === 'function'
    ) {
      return globalThis.localStorage;
    }
  } catch {
    // SecurityError in sandboxed iframe/context
  }
  return fallbackStorage;
}

/**
 * Create a clean default progress object conforming to schemaVersion 1.0.0.
 * Includes all 15 stages (stage-1 unlocked, stage-2..stage-15 locked).
 * @returns {object}
 */
export function createDefaultProgress() {
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.split('T')[0];

  const stageProgress = {};
  for (let i = 1; i <= TOTAL_STAGES; i++) {
    const stageKey = `stage-${i}`;
    stageProgress[stageKey] = {
      stageId: stageKey,
      unlocked: i === 1,
      stars: 0,
      cleared: false,
      firstTryCorrectCount: 0,
      totalAttempts: 0,
      miniLessonSeen: false,
      lastPlayedAt: null
    };
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    lastUpdated: nowIso,
    userProfile: {
      userName: 'たんけんキッズ',
      avatarId: 'lab-robot-1',
      grade: 4,
      createdAt: nowIso
    },
    gamification: {
      totalScore: 0,
      labExp: 0,
      labRank: 1,
      selfCorrectionCount: 0,
      streakDays: 1,
      lastActiveDate: todayStr,
      unlockedBadges: []
    },
    stageProgress,
    treasureBox: {
      items: []
    },
    diagnosisLog: [],
    parentCheer: {
      parentPinHash: '1234',
      pinConfigured: false,
      cheerMessages: []
    },
    settings: {
      soundMuted: false,
      seVolume: 0.8,
      bgmVolume: 0.5,
      ttsAutoPlay: true,
      ttsVoice: 'ja-JP',
      ttsRate: 1.0
    },
    bonusGame: {
      tickets: 1,
      totalPlayed: 0,
      totalEscapes: 0,
      selectedCharacterId: 'momonga',
      unlockedCharacters: ['momonga', 'marupi', 'hachiwaren']
    }
  };
}

/**
 * Validate whether a candidate object is a valid AppProgressData payload.
 * @param {any} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateProgressData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'データ形式が不正です（オブジェクトではありません）' };
  }
  if (data.schemaVersion !== SCHEMA_VERSION) {
    return {
      valid: false,
      error: `サポートされていないスキーマバージョンです: ${String(data.schemaVersion)}`
    };
  }
  if (data.userProfile !== undefined && (typeof data.userProfile !== 'object' || data.userProfile === null)) {
    return { valid: false, error: 'userProfile形式が不正です' };
  }
  if (data.gamification !== undefined && (typeof data.gamification !== 'object' || data.gamification === null)) {
    return { valid: false, error: 'gamification形式が不正です' };
  }
  if (data.stageProgress !== undefined && (typeof data.stageProgress !== 'object' || data.stageProgress === null)) {
    return { valid: false, error: 'stageProgress形式が不正です' };
  }
  if (data.diagnosisLog !== undefined && !Array.isArray(data.diagnosisLog)) {
    return { valid: false, error: 'diagnosisLog形式が不正です' };
  }
  return { valid: true };
}

/**
 * Sanitize a raw diagnosis log: keep only well-formed entries
 * ({ category: string, at: parseable date string }) and cap to the latest
 * DIAGNOSIS_LOG_LIMIT entries. Issue #21.
 * @param {any} rawLog
 * @returns {Array<{category: string, worldId: any, stageId: any, at: string}>}
 */
export function sanitizeDiagnosisLog(rawLog) {
  if (!Array.isArray(rawLog)) return [];
  const cleaned = [];
  for (const entry of rawLog) {
    if (!entry || typeof entry !== 'object') continue;
    if (typeof entry.category !== 'string' || entry.category === '') continue;
    if (typeof entry.at !== 'string' || !Number.isFinite(Date.parse(entry.at))) continue;
    cleaned.push({
      category: entry.category,
      worldId: entry.worldId ?? null,
      stageId: entry.stageId ?? null,
      at: entry.at
    });
  }
  return cleaned.slice(-DIAGNOSIS_LOG_LIMIT);
}

/**
 * Append one diagnosis entry to progress.diagnosisLog, creating the log when
 * missing (legacy saves) and capping it to the latest DIAGNOSIS_LOG_LIMIT
 * entries. Mutates and returns the progress object. Issue #21.
 * @param {object} progress
 * @param {{category: string, worldId?: any, stageId?: any, at?: string}} entry
 * @returns {object} progress
 */
export function appendDiagnosisLogEntry(progress, entry) {
  if (!progress || typeof progress !== 'object') return progress;
  if (!entry || typeof entry.category !== 'string' || entry.category === '') return progress;
  if (!Array.isArray(progress.diagnosisLog)) {
    progress.diagnosisLog = [];
  }
  progress.diagnosisLog.push({
    category: entry.category,
    worldId: entry.worldId ?? null,
    stageId: entry.stageId ?? null,
    at: typeof entry.at === 'string' && Number.isFinite(Date.parse(entry.at))
      ? entry.at
      : new Date().toISOString()
  });
  if (progress.diagnosisLog.length > DIAGNOSIS_LOG_LIMIT) {
    progress.diagnosisLog = progress.diagnosisLog.slice(-DIAGNOSIS_LOG_LIMIT);
  }
  return progress;
}

/**
 * Normalize and merge partial valid progress data onto the complete default schema.
 * @param {object} data
 * @returns {object}
 */
export function normalizeProgressData(data) {
  const base = createDefaultProgress();
  const cloned = deepClone(data);

  const stageProgress = { ...base.stageProgress };
  if (cloned.stageProgress && typeof cloned.stageProgress === 'object') {
    for (const [key, val] of Object.entries(cloned.stageProgress)) {
      if (val && typeof val === 'object') {
        stageProgress[key] = {
          ...(stageProgress[key] || {
            stageId: key,
            unlocked: false,
            stars: 0,
            cleared: false,
            firstTryCorrectCount: 0,
            totalAttempts: 0,
            miniLessonSeen: false,
            lastPlayedAt: null
          }),
          ...val,
          stageId: val.stageId || key
        };
      }
    }
  }

  const rawParentCheer = cloned.parentCheer || {};
  const resolvedPinHash = rawParentCheer.parentPinHash !== undefined
    ? rawParentCheer.parentPinHash
    : base.parentCheer.parentPinHash;
  const resolvedPinConfigured = Boolean(
    rawParentCheer.pinConfigured ||
    (resolvedPinHash && String(resolvedPinHash) !== '1234')
  );

  return {
    ...base,
    ...cloned,
    schemaVersion: SCHEMA_VERSION,
    lastUpdated: cloned.lastUpdated || base.lastUpdated,
    userProfile: {
      ...base.userProfile,
      ...(cloned.userProfile || {})
    },
    gamification: {
      ...base.gamification,
      ...(cloned.gamification || {}),
      unlockedBadges: Array.isArray(cloned.gamification?.unlockedBadges)
        ? [...cloned.gamification.unlockedBadges]
        : []
    },
    stageProgress,
    treasureBox: {
      ...base.treasureBox,
      ...(cloned.treasureBox || {}),
      items: Array.isArray(cloned.treasureBox?.items)
        ? [...cloned.treasureBox.items]
        : []
    },
    diagnosisLog: sanitizeDiagnosisLog(cloned.diagnosisLog),
    parentCheer: {
      ...base.parentCheer,
      ...rawParentCheer,
      parentPinHash: resolvedPinHash,
      pinConfigured: resolvedPinConfigured,
      cheerMessages: Array.isArray(cloned.parentCheer?.cheerMessages)
        ? [...cloned.parentCheer.cheerMessages]
        : []
    },
    settings: {
      ...base.settings,
      ...(cloned.settings || {})
    },
    bonusGame: {
      tickets: typeof cloned.bonusGame?.tickets === 'number' && cloned.bonusGame.tickets >= 0
        ? Math.floor(cloned.bonusGame.tickets)
        : base.bonusGame.tickets,
      totalPlayed: typeof cloned.bonusGame?.totalPlayed === 'number' && cloned.bonusGame.totalPlayed >= 0
        ? Math.floor(cloned.bonusGame.totalPlayed)
        : 0,
      totalEscapes: typeof cloned.bonusGame?.totalEscapes === 'number' && cloned.bonusGame.totalEscapes >= 0
        ? Math.floor(cloned.bonusGame.totalEscapes)
        : 0,
      selectedCharacterId: typeof cloned.bonusGame?.selectedCharacterId === 'string' && cloned.bonusGame.selectedCharacterId.trim()
        ? cloned.bonusGame.selectedCharacterId
        : base.bonusGame.selectedCharacterId,
      unlockedCharacters: Array.from(new Set([
        ...base.bonusGame.unlockedCharacters,
        ...(Array.isArray(cloned.bonusGame?.unlockedCharacters) ? cloned.bonusGame.unlockedCharacters : [])
      ]))
    }
  };
}

/**
 * Prune non-essential history arrays when localStorage hits QuotaExceededError.
 * @param {object} userData
 * @returns {object}
 */
function pruneProgressForQuota(userData) {
  const pruned = deepClone(userData);
  if (pruned.treasureBox && Array.isArray(pruned.treasureBox.items)) {
    // Remove already mastered items first, then cap to latest 20 items
    const unmastered = pruned.treasureBox.items.filter((item) => !item.mastered);
    pruned.treasureBox.items = unmastered.slice(-20);
  }
  if (pruned.parentCheer && Array.isArray(pruned.parentCheer.cheerMessages)) {
    pruned.parentCheer.cheerMessages = pruned.parentCheer.cheerMessages.slice(-10);
  }
  if (Array.isArray(pruned.diagnosisLog)) {
    pruned.diagnosisLog = pruned.diagnosisLog.slice(-100);
  }
  return pruned;
}

/**
 * Check if an error represents a storage quota exceeded condition.
 * @param {any} err
 * @returns {boolean}
 */
function isQuotaExceededError(err) {
  if (!err) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    (typeof err.message === 'string' && /quota/i.test(err.message))
  );
}

/**
 * Write JSON string to storage with QuotaExceededError recovery and fallback.
 * @param {Storage} storage
 * @param {string} key
 * @param {object} userData
 * @returns {boolean}
 */
function writeToLocalStorageSafe(storage, key, userData) {
  const serialized = JSON.stringify(userData);
  try {
    storage.setItem(key, serialized);
    if (storage !== fallbackStorage) {
      fallbackStorage.setItem(key, serialized);
    }
    return true;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      const pruned = pruneProgressForQuota(userData);
      // Issue #21: pruneProgressForQuota works on a clone, so without this
      // step the caller's in-memory progress keeps the un-trimmed diagnosis
      // log and diverges from what was actually persisted (later saves or
      // server syncs would resurrect the dropped entries). Reflect the
      // trimmed log back onto the passed object by mutation.
      if (Array.isArray(userData.diagnosisLog) && Array.isArray(pruned.diagnosisLog)
          && pruned.diagnosisLog.length < userData.diagnosisLog.length) {
        userData.diagnosisLog = pruned.diagnosisLog;
      }
      const prunedSerialized = JSON.stringify(pruned);
      try {
        storage.setItem(key, prunedSerialized);
        if (storage !== fallbackStorage) {
          fallbackStorage.setItem(key, prunedSerialized);
        }
        return true;
      } catch {
        // Fallback to in-memory store so active session continues safely
        fallbackStorage.setItem(key, prunedSerialized);
        return true;
      }
    }
    fallbackStorage.setItem(key, serialized);
    return false;
  }
}

/**
 * Read and validate progress data from local storage synchronously.
 * @param {object} [options]
 * @returns {object|null}
 */
export function readLocalProgress(options = {}) {
  const storage = getStorageBackend(options);
  let raw = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    // SecurityError or DOMException; fallback to in-memory store
  }
  if (raw === null || raw === undefined) {
    try {
      raw = fallbackStorage.getItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    const check = validateProgressData(parsed);
    if (!check.valid) {
      return null;
    }
    return normalizeProgressData(parsed);
  } catch {
    return null;
  }
}

/**
 * Mark or clear offline sync pending flag.
 * @param {boolean} pending
 * @param {object} [options]
 */
function setSyncPending(pending, options = {}) {
  syncPendingState = Boolean(pending);
  const storage = getStorageBackend(options);
  try {
    if (syncPendingState) {
      storage.setItem(SYNC_PENDING_KEY, 'true');
    } else {
      storage.removeItem(SYNC_PENDING_KEY);
    }
  } catch {
    // Ignore storage error on metadata flag
  }
}

/**
 * Check whether an offline sync is currently pending.
 * @param {object} [options]
 * @returns {boolean}
 */
export function isSyncPending(options = {}) {
  if (syncPendingState) return true;
  const storage = getStorageBackend(options);
  try {
    return storage.getItem(SYNC_PENDING_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Determine whether a fetch call can be executed in the current environment.
 * @param {string} apiUrl
 * @param {object} [options]
 * @returns {{ fn: Function|null, url: string }}
 */
function resolveFetch(apiUrl, options = {}) {
  const fetchFn = options.fetchImpl || globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    return { fn: null, url: apiUrl };
  }
  const url = apiUrl || options.apiUrl || '/api/progress';
  // In Node.js without a custom fetchImpl or base URL, relative '/api/progress' throws Invalid URL unless window.location exists
  const isRelative = url.startsWith('/');
  if (isRelative && !options.fetchImpl) {
    if (typeof globalThis.window !== 'undefined' && globalThis.window?.location?.origin) {
      return { fn: fetchFn, url: `${globalThis.window.location.origin}${url}` };
    }
    // Check if globalThis.fetch is a mock/spy in tests (native Node fetch has name 'fetch' and no mock property,
    // wait: node:test mock.fn() or custom function might be assigned to globalThis.fetch!).
    // Even if native fetch is called with relative URL, catching the error in syncToServer handles it cleanly!
  }
  return { fn: fetchFn, url };
}

/**
 * Register a browser 'online' listener once to automatically flush pending syncs.
 * @param {object} [options]
 */
function ensureOnlineListener(options = {}) {
  if (onlineListenerRegistered) return;
  if (typeof globalThis.window !== 'undefined' && typeof globalThis.window.addEventListener === 'function') {
    onlineListenerRegistered = true;
    globalThis.window.addEventListener('online', () => {
      flushPendingSync(options).catch(() => {});
    });
  }
}

/**
 * Detect whether the app is running on a static hosting environment
 * (e.g. GitHub Pages, file:, Cloudflare Pages, Netlify, Vercel) where
 * `/api/progress` is unavailable.
 * @param {object} [options]
 * @returns {boolean}
 */
export function isStaticHostingEnvironment(options = {}) {
  if (options.skipServer === true) {
    return true;
  }
  if (options.skipServer === false || options.apiUrl || options.fetchImpl) {
    return false;
  }
  if (typeof globalThis.window === 'undefined' || !globalThis.window.location) {
    return false;
  }

  const protocol = globalThis.window.location.protocol || '';
  const hostname = (globalThis.window.location.hostname || '').toLowerCase();

  return (
    protocol === 'file:' ||
    hostname.endsWith('.github.io') ||
    hostname === 'github.io' ||
    hostname.endsWith('.pages.dev') ||
    hostname.endsWith('.netlify.app') ||
    hostname.endsWith('.vercel.app')
  );
}

/**
 * Return the status/offline banner text tailored to the hosting environment.
 * Static hosts (e.g., GitHub Pages) never sync to `/api/progress`, so they
 * must not claim automatic server synchronization on reconnect.
 * @param {object} [options]
 * @returns {string}
 */
export function getOfflineBannerText(options = {}) {
  if (isStaticHostingEnvironment(options)) {
    return '💾 学習データはこの端末に保存されます（別の端末へ移すときは保護者ボードからバックアップがおすすめです）';
  }
  return '⚡ オフラインモードで動作中（学習データはこの端末に保存され、再接続時に自動同期されます）';
}

/**
 * Perform HTTP POST to /api/progress to sync userData.
 * @param {object} userData
 * @param {object} [options]
 * @returns {Promise<boolean>}
 */
async function syncToServer(userData, options = {}) {
  if (isStaticHostingEnvironment(options)) {
    return true;
  }

  // Check browser offline status if explicitly false
  if (
    typeof globalThis.navigator !== 'undefined' &&
    globalThis.navigator.onLine === false &&
    !options.forceOnline
  ) {
    setSyncPending(true, options);
    ensureOnlineListener(options);
    return false;
  }

  const { fn: fetchFn, url } = resolveFetch(options.apiUrl || '/api/progress', options);
  if (!fetchFn) {
    return true;
  }

  try {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (!response || !response.ok) {
      setSyncPending(true, options);
      ensureOnlineListener(options);
      return false;
    }

    setSyncPending(false, options);
    return true;
  } catch (err) {
    // If native Node fetch failed only because '/api/progress' is a relative URL without a server configured,
    // mark pending only if an explicit apiUrl or mocked fetch was used, or if network failed.
    const isRelativeUrlTypeError =
      err instanceof TypeError &&
      (url === '/api/progress' || url.startsWith('/')) &&
      /Invalid URL|Failed to parse URL/i.test(err.message);

    if (!isRelativeUrlTypeError) {
      setSyncPending(true, options);
      ensureOnlineListener(options);
    }
    return false;
  }
}

/**
 * Flush any pending debounced or offline-queued sync immediately.
 * @param {object} [options]
 * @returns {Promise<boolean>}
 */
export async function flushPendingSync(options = {}) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  microtaskScheduled = false;

  const dataToSync = latestQueuedData || readLocalProgress(options);
  const mergedOptions = { ...(latestQueuedOptions || {}), ...options };
  const waiters = pendingWaiters.splice(0, pendingWaiters.length);
  latestQueuedData = null;
  latestQueuedOptions = null;

  if (!dataToSync) {
    for (const resolve of waiters) resolve(false);
    return false;
  }

  const ok = await syncToServer(dataToSync, mergedOptions);
  for (const resolve of waiters) resolve(ok);
  return ok;
}

/**
 * Resolve conflict between two valid progress objects using `lastUpdated` timestamp.
 * Returns the newer progress object.
 * @param {object|null} localData
 * @param {object|null} serverData
 * @returns {{ winner: object, source: 'local'|'server'|'default' }}
 */
export function resolveProgressConflict(localData, serverData) {
  const localValid = localData && validateProgressData(localData).valid;
  const serverValid = serverData && validateProgressData(serverData).valid;

  if (localValid && serverValid) {
    const localTime = Date.parse(localData.lastUpdated || '') || 0;
    const serverTime = Date.parse(serverData.lastUpdated || '') || 0;
    if (serverTime > localTime) {
      return { winner: normalizeProgressData(serverData), source: 'server' };
    }
    return { winner: normalizeProgressData(localData), source: 'local' };
  }

  if (serverValid) {
    return { winner: normalizeProgressData(serverData), source: 'server' };
  }

  if (localValid) {
    return { winner: normalizeProgressData(localData), source: 'local' };
  }

  return { winner: createDefaultProgress(), source: 'default' };
}

/**
 * Load user progress across Tier 1 (localStorage) and Tier 2 (/api/progress),
 * resolving conflicts by newest `lastUpdated` timestamp.
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function loadProgress(options = {}) {
  const storage = getStorageBackend(options);
  const localData = readLocalProgress(options);

  let serverData = null;
  if (!isStaticHostingEnvironment(options)) {
    const { fn: fetchFn, url } = resolveFetch(options.apiUrl || '/api/progress', options);
    if (fetchFn) {
      try {
        const res = await fetchFn(url, {
          method: 'GET',
          headers: { Accept: 'application/json' }
        });
        if (res && res.ok && typeof res.json === 'function') {
          const parsed = await res.json();
          const candidate = parsed && parsed.data && parsed.data.schemaVersion ? parsed.data : parsed;
          if (validateProgressData(candidate).valid) {
            serverData = candidate;
          }
        }
      } catch {
        // Offline or server not running; fallback to localStorage
      }
    }
  }

  const { winner, source } = resolveProgressConflict(localData, serverData);
  writeToLocalStorageSafe(storage, STORAGE_KEY, winner);

  // If local data was newer than server data and server is available, queue background sync
  if (source === 'local' && serverData && options.syncIfLocalNewer !== false) {
    syncToServer(winner, options).catch(() => {});
  }

  return deepClone(winner);
}

/**
 * Save user progress immediately to Tier 1 (localStorage) and schedule Tier 2 (/api/progress) sync.
 * @param {object} userData
 * @param {object} [options]
 * @returns {Promise<boolean>}
 */
export function saveProgress(userData, options = {}) {
  const validation = validateProgressData(userData);
  if (!validation.valid) {
    return Promise.reject(new Error(`Invalid progress data: ${validation.error}`));
  }

  const nowIso = new Date().toISOString();
  if (!options.preserveTimestamp || !userData.lastUpdated) {
    userData.lastUpdated = nowIso;
  }

  const normalized = normalizeProgressData(userData);
  const storage = getStorageBackend(options);

  // Tier 1: Immediate synchronous write to localStorage
  writeToLocalStorageSafe(storage, STORAGE_KEY, normalized);

  if (isStaticHostingEnvironment(options)) {
    return Promise.resolve(true);
  }

  // Tier 2: Immediate sync if requested
  if (options.immediate === true || options.debounceMs === 0) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    microtaskScheduled = false;
    latestQueuedData = null;
    latestQueuedOptions = null;
    const waiters = pendingWaiters.splice(0, pendingWaiters.length);
    return syncToServer(normalized, options).then((ok) => {
      for (const resolve of waiters) resolve(ok);
      return ok;
    });
  }

  // Queue latest state for coalesced / debounced sync
  latestQueuedData = normalized;
  latestQueuedOptions = options;

  // If explicit debounceMs > 0 is provided, use timed trailing-edge debounce
  if (typeof options.debounceMs === 'number' && options.debounceMs > 0) {
    return new Promise((resolve) => {
      pendingWaiters.push(resolve);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        flushPendingSync(options).catch(() => {});
      }, options.debounceMs);
    });
  }

  // Default: coalesce synchronous bursts within the current microtask turn
  return new Promise((resolve) => {
    pendingWaiters.push(resolve);
    if (!microtaskScheduled) {
      microtaskScheduled = true;
      queueMicrotask(() => {
        if (!microtaskScheduled) return;
        microtaskScheduled = false;
        flushPendingSync(options).catch(() => {});
      });
    }
  });
}

/**
 * Tier 3: Export user progress as a formatted JSON backup string.
 * @param {object} [userData]
 * @returns {string}
 */
export function exportBackupJSON(userData) {
  const targetData = userData !== undefined ? userData : (readLocalProgress() || createDefaultProgress());
  const validation = validateProgressData(targetData);
  if (!validation.valid) {
    throw new Error(`バックアップ書き出し失敗: ${validation.error}`);
  }

  const backupObj = {
    exportTime: new Date().toISOString(),
    app: 'sansu-tankyu-lab',
    version: SCHEMA_VERSION,
    data: normalizeProgressData(targetData)
  };
  return JSON.stringify(backupObj, null, 2);
}

/**
 * Tier 3: Import and validate a backup JSON string.
 * Restores valid data into localStorage without corrupting existing storage on error.
 * Works both synchronously (`const d = importBackupJSON(json)`) and with `await`.
 * @param {string} jsonString
 * @param {object} [options]
 * @returns {object}
 */
export function importBackupJSON(jsonString, options = {}) {
  if (typeof jsonString !== 'string' || jsonString.trim() === '') {
    throw new Error('JSONインポート失敗: 空のバックアップデータです');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`JSONインポート失敗: ${err.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSONインポート失敗: 無効なバックアップデータです');
  }

  // Support both wrapped backup format { app, version, data } and direct progress object
  const rawData = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
  const validation = validateProgressData(rawData);
  if (!validation.valid) {
    throw new Error(`JSONインポート失敗: 無効なバックアップデータです (${validation.error})`);
  }

  const normalized = normalizeProgressData(rawData);
  const storage = getStorageBackend(options);
  writeToLocalStorageSafe(storage, STORAGE_KEY, normalized);

  return normalized;
}

/**
 * Normalize a transfer code by uppercasing and stripping hyphens/whitespace/punctuation.
 * Example: 'lab-7k9a-4e2w' -> 'LAB7K9A4E2W'
 * @param {string} code
 * @returns {string}
 */
export function normalizeTransferCode(code) {
  if (typeof code !== 'string') return '';
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Load persisted transfer map from storage into memory registry.
 * @param {Storage} storage
 */
function syncTransferRegistryFromStorage(storage) {
  try {
    const raw = storage.getItem(TRANSFER_STORE_KEY) ?? fallbackStorage.getItem(TRANSFER_STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [key, entry] of Object.entries(parsed)) {
        if (entry && typeof entry === 'object' && !transferRegistry.has(key)) {
          transferRegistry.set(key, entry);
        }
      }
    }
  } catch {
    // Ignore malformed transfer cache
  }
}

/**
 * Persist transfer registry to storage.
 * @param {Storage} storage
 */
function persistTransferRegistryToStorage(storage) {
  try {
    const serializedObj = {};
    for (const [key, value] of transferRegistry.entries()) {
      serializedObj[key] = value;
    }
    const json = JSON.stringify(serializedObj);
    storage.setItem(TRANSFER_STORE_KEY, json);
    if (storage !== fallbackStorage) {
      fallbackStorage.setItem(TRANSFER_STORE_KEY, json);
    }
  } catch {
    // Ignore quota errors on transfer cache; in-memory transferRegistry still holds it
  }
}

/**
 * Tier 3: Generate an 8-character transfer code in `LAB-XXXX-XXXX` format
 * using unambiguous characters (excluding 0, O, 1, I).
 * Stores a snapshot with a 48-hour expiration.
 * @param {object} [userData]
 * @param {object} [options]
 * @returns {string}
 */
export function generateTransferCode(userData, options = {}) {
  const targetData = userData !== undefined ? userData : (readLocalProgress(options) || createDefaultProgress());
  const validation = validateProgressData(targetData);
  if (!validation.valid) {
    throw new Error(`引き継ぎコード発行失敗: ${validation.error}`);
  }

  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += TRANSFER_ALPHABET[Math.floor(Math.random() * TRANSFER_ALPHABET.length)];
    p2 += TRANSFER_ALPHABET[Math.floor(Math.random() * TRANSFER_ALPHABET.length)];
  }

  const code = `LAB-${p1}-${p2}`;
  const normalizedCode = normalizeTransferCode(code);
  const now = typeof options.now === 'number' ? options.now : Date.now();
  const ttlMs = typeof options.ttlMs === 'number' ? options.ttlMs : TRANSFER_TTL_MS;

  const record = {
    code,
    normalizedCode,
    data: normalizeProgressData(targetData),
    createdAt: now,
    expiresAt: now + ttlMs
  };

  const storage = getStorageBackend(options);
  syncTransferRegistryFromStorage(storage);
  transferRegistry.set(normalizedCode, record);
  persistTransferRegistryToStorage(storage);

  // Optional background sync to server transfer endpoint if requested
  if (options.syncServer || options.transferApiUrl) {
    const { fn: fetchFn, url } = resolveFetch(
      options.transferApiUrl || '/api/transfer/generate',
      options
    );
    if (fetchFn) {
      Promise.resolve(
        fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, data: record.data, expiresAt: record.expiresAt })
        })
      ).catch(() => {});
    }
  }

  return code;
}

/**
 * Tier 3: Restore user progress from an 8-character transfer code (`LAB-XXXX-XXXX` or `labxxxx...`).
 * Enforces 48-hour expiration and validates restored schema.
 * Works both synchronously for local codes and with `await` for async callers.
 * @param {string} code
 * @param {object} [options]
 * @returns {object|Promise<object>}
 */
export function restoreFromTransferCode(code, options = {}) {
  let normalized = normalizeTransferCode(code);
  if (!normalized) {
    throw new Error('引き継ぎコードを入力してください');
  }

  // Allow 8-char code without 'LAB' prefix as well as full 11-char 'LABXXXXXXXX'
  if (normalized.length === 8 && !normalized.startsWith('LAB')) {
    normalized = `LAB${normalized}`;
  }

  if (!/^LAB[2-9A-HJ-NP-Z]{8}$/.test(normalized)) {
    throw new Error('無効な引き継ぎコード形式です（LAB-XXXX-XXXX）');
  }

  const storage = getStorageBackend(options);
  syncTransferRegistryFromStorage(storage);

  const record = transferRegistry.get(normalized);
  const now = typeof options.now === 'number' ? options.now : Date.now();

  if (record) {
    if (typeof record.expiresAt === 'number' && now > record.expiresAt) {
      throw new Error('この引き継ぎコードは有効期限（48時間）が切れています。元の端末で再発行してください');
    }
    const restored = normalizeProgressData(record.data);
    writeToLocalStorageSafe(storage, STORAGE_KEY, restored);
    return deepClone(restored);
  }

  // If server transfer claim is explicitly configured via transferApiUrl or useServer
  if (options.useServer || options.transferApiUrl) {
    const { fn: fetchFn, url } = resolveFetch(
      options.transferApiUrl || '/api/transfer/claim',
      options
    );
    if (fetchFn) {
      return (async () => {
        const res = await fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: normalized })
        });
        if (!res.ok) {
          let errMsg = '引き継ぎコードが見つかりません';
          try {
            const errBody = await res.json();
            if (errBody && errBody.error) errMsg = errBody.error;
          } catch {
            // Ignore parse error
          }
          throw new Error(errMsg);
        }
        const body = await res.json();
        const rawData = body.data || body;
        const check = validateProgressData(rawData);
        if (!check.valid) {
          throw new Error(`引き継ぎデータが破損しています: ${check.error}`);
        }
        const restored = normalizeProgressData(rawData);
        writeToLocalStorageSafe(storage, STORAGE_KEY, restored);
        return deepClone(restored);
      })();
    }
  }

  throw new Error('引き継ぎコードが見つかりません。コードをご確認のうえ再入力してください');
}

/**
 * Reset in-memory state and clear storage keys (utility for tests and account reset).
 * @param {object} [options]
 */
export function resetStorageState(options = {}) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  microtaskScheduled = false;
  latestQueuedData = null;
  latestQueuedOptions = null;
  pendingWaiters = [];
  syncPendingState = false;
  transferRegistry.clear();
  memoryStore.clear();

  const storage = getStorageBackend(options);
  try {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(TRANSFER_STORE_KEY);
    storage.removeItem(SYNC_PENDING_KEY);
  } catch {
    // Ignore storage removal errors
  }
}

export const StorageService = {
  STORAGE_KEY,
  TRANSFER_STORE_KEY,
  SYNC_PENDING_KEY,
  SCHEMA_VERSION,
  TRANSFER_ALPHABET,
  TRANSFER_TTL_MS,
  DEFAULT_DEBOUNCE_MS,
  TOTAL_STAGES,
  DIAGNOSIS_LOG_LIMIT,
  createDefaultProgress,
  validateProgressData,
  normalizeProgressData,
  sanitizeDiagnosisLog,
  appendDiagnosisLogEntry,
  readLocalProgress,
  resolveProgressConflict,
  loadProgress,
  saveProgress,
  flushPendingSync,
  isSyncPending,
  exportBackupJSON,
  importBackupJSON,
  normalizeTransferCode,
  generateTransferCode,
  restoreFromTransferCode,
  resetStorageState,
  getStorageBackend,
  isStaticHostingEnvironment,
  getOfflineBannerText
};

export default StorageService;
