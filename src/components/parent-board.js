/**
 * src/components/parent-board.js
 * 算数探検ラボ - 保護者応援ボード＆3重バックアップUI (ParentBoard)
 *
 * Dual capability:
 * 1. Pure helper functions matching ParentBoardReference for headless Node.js
 * 2. Interactive DOM ParentBoard class for tablet browser featuring 4-digit PIN authentication,
 *    5-dimension radar progress chart, self-correction highlights, cheer stamp sender,
 *    and 3-tier backup/device transfer controls.
 */

import * as StorageService from '../services/storage-service.js';
import * as SoundEffects from '../services/sound-effects.js';
import * as GamificationEngine from '../services/gamification-engine.js';
import { summarizeDiagnosisLog } from '../services/curriculum-engine.js';
import { showToast } from './toast-feedback.js';

// --- PURE HELPER FUNCTIONS (HEADLESS COMPATIBLE) ---

/**
 * 4桁PINコードの認証照合 (デフォルト: '1234')
 * null, undefined, 空文字は false
 * 数値・文字列両方の比較に対応
 * @param {string|number} inputPin
 * @param {string|number} storedPin
 * @returns {boolean}
 */
export function verifyPin(inputPin, storedPin = '1234') {
  if (inputPin === null || inputPin === undefined || inputPin === '') return false;
  return String(inputPin) === String(storedPin);
}

/**
 * ステージ進捗から5ワールドのレーダーチャートスコア (0..100) を算出
 * 各ワールドのクリアステージ数 / 3 * 100 (四捨五入)
 * @param {object} progress
 * @returns {{ world1: number, world2: number, world3: number, world4: number, world5: number }}
 */
export function calculateRadarScores(progress) {
  const scores = { world1: 0, world2: 0, world3: 0, world4: 0, world5: 0 };
  const stageProg = (progress && progress.stageProgress) || {};

  for (let w = 1; w <= 5; w++) {
    let clearedInWorld = 0;
    for (let s = 1; s <= 3; s++) {
      const sKey = `stage-${(w - 1) * 3 + s}`;
      if (stageProg[sKey] && stageProg[sKey].cleared) {
        clearedInWorld++;
      }
    }
    scores[`world${w}`] = Math.round((clearedInWorld / 3) * 100);
  }

  return scores;
}

/**
 * 応援スタンプオブジェクトを生成（メッセージは最大50文字にトリム）
 * @param {string} stampId 例: 'STAMP_RECOVERY'
 * @param {string} [customText=''] 最大50文字
 * @returns {object} cheerMessage
 */
export function createCheerStamp(stampId, customText) {
  let text = customText || '';
  if (text.length > 50) {
    text = text.slice(0, 50);
  }

  return {
    id: `cheer-${Date.now()}`,
    stampId,
    customText: text,
    sentAt: new Date().toISOString(),
    readByChild: false,
    childReaction: null
  };
}

// --- DOM CLASS FOR BROWSER RUNTIME ---

export class ParentBoard {
  constructor(options = {}) {
    this.container = options.container || null;
    this.progress = options.progress || null;
    this.onSendStamp = options.onSendStamp || null;
    this.onSave = options.onSave || null;
    this.onTransferRestored = options.onTransferRestored || null;
    this._explicitPinOption = Boolean(options.pin !== undefined && options.pin !== null && options.pin !== '');
    this.storedPin = this._explicitPinOption
      ? String(options.pin)
      : String(this.progress?.parentCheer?.parentPinHash || '1234');
    this.isAuthenticated = false;
    this.selectedStampId = 'STAMP_RECOVERY';
    this.rootEl = null;

    this.maxFailedAttempts = typeof options.maxFailedAttempts === 'number' && options.maxFailedAttempts > 0
      ? options.maxFailedAttempts
      : 5;
    this.lockoutDurationMs = typeof options.lockoutDurationMs === 'number' && options.lockoutDurationMs > 0
      ? options.lockoutDurationMs
      : 3 * 60 * 1000;
    this.lockoutEnabled = Boolean(
      options.enableLockout ||
      typeof options.maxFailedAttempts === 'number' ||
      options.progress ||
      options.container ||
      typeof document !== 'undefined'
    );
    this.failedAttempts = Number(this.progress?.parentCheer?.failedAttempts) || 0;
    this.lockoutUntil = Number(this.progress?.parentCheer?.lockoutUntil) || 0;
    this.pinErrorMessage = '';
  }

  mount(container) {
    this.container = container;
    this.render();
    return this;
  }

  update(progress) {
    this.progress = progress;
    if (!this._explicitPinOption && this.progress?.parentCheer?.parentPinHash) {
      this.storedPin = String(this.progress.parentCheer.parentPinHash);
    }
    if (this.rootEl && this.rootEl.parentNode) {
      const oldEl = this.rootEl;
      const parent = oldEl.parentNode;
      const newEl = this.render();
      if (newEl && oldEl.parentNode === parent && newEl !== oldEl) {
        parent.replaceChild(newEl, oldEl);
        this.rootEl = newEl;
      }
    }
  }

  isPinSetupRequired() {
    if (this._explicitPinOption) return false;
    const pc = this.progress?.parentCheer;
    if (!pc) return false;
    return !pc.pinConfigured && String(pc.parentPinHash || '1234') === '1234';
  }

  isLockedOut(now = Date.now()) {
    if (!this.lockoutEnabled) return false;
    if (this.lockoutUntil && now < this.lockoutUntil) {
      return true;
    }
    if (this.lockoutUntil && now >= this.lockoutUntil) {
      this.lockoutUntil = 0;
      this.failedAttempts = 0;
      if (this.progress?.parentCheer) {
        this.progress.parentCheer.lockoutUntil = 0;
        this.progress.parentCheer.failedAttempts = 0;
      }
    }
    return false;
  }

  getRemainingLockoutMs(now = Date.now()) {
    if (!this.isLockedOut(now)) return 0;
    return Math.max(0, this.lockoutUntil - now);
  }

  setupInitialPin(newPin) {
    const pinStr = String(newPin ?? '').trim();
    if (!/^\d{4}$/.test(pinStr)) {
      SoundEffects.playSound('near_miss');
      this.pinErrorMessage = '⚠️ 4桁の数字を入力してください';
      return false;
    }

    this.storedPin = pinStr;
    this._explicitPinOption = true;
    this.failedAttempts = 0;
    this.lockoutUntil = 0;
    this.pinErrorMessage = '';

    if (this.progress) {
      if (!this.progress.parentCheer || typeof this.progress.parentCheer !== 'object') {
        this.progress.parentCheer = { cheerMessages: [] };
      }
      this.progress.parentCheer.parentPinHash = pinStr;
      this.progress.parentCheer.pinConfigured = true;
      this.progress.parentCheer.failedAttempts = 0;
      this.progress.parentCheer.lockoutUntil = 0;
      if (typeof this.onSave === 'function') {
        Promise.resolve(this.onSave(this.progress)).catch(() => {});
      }
    }

    this.isAuthenticated = true;
    SoundEffects.playSound('unlock');
    showToast(null, 'success', '保護者PINを設定しました！');
    this.render();
    return true;
  }

  changePin(newPinOrCurrent, maybeNewPin) {
    let newPinRaw = newPinOrCurrent;
    if (maybeNewPin !== undefined) {
      if (!verifyPin(newPinOrCurrent, this.storedPin)) {
        SoundEffects.playSound('near_miss');
        return { success: false, error: '現在の暗証番号が正しくありません' };
      }
      newPinRaw = maybeNewPin;
    }

    const newPin = String(newPinRaw ?? '').trim();
    if (!/^\d{4}$/.test(newPin)) {
      SoundEffects.playSound('near_miss');
      return { success: false, error: '新しい暗証番号は4桁の数字で入力してください' };
    }

    this.storedPin = newPin;
    this._explicitPinOption = true;
    this.failedAttempts = 0;
    this.lockoutUntil = 0;
    this.pinErrorMessage = '';

    if (this.progress) {
      if (!this.progress.parentCheer || typeof this.progress.parentCheer !== 'object') {
        this.progress.parentCheer = { cheerMessages: [] };
      }
      this.progress.parentCheer.parentPinHash = newPin;
      this.progress.parentCheer.pinConfigured = true;
      this.progress.parentCheer.failedAttempts = 0;
      this.progress.parentCheer.lockoutUntil = 0;
      if (typeof this.onSave === 'function') {
        Promise.resolve(this.onSave(this.progress)).catch(() => {});
      }
    }

    SoundEffects.playSound('unlock');
    return { success: true };
  }

  authenticate(pin) {
    if (this.isLockedOut()) {
      SoundEffects.playSound('near_miss');
      const remainMin = Math.max(1, Math.ceil(this.getRemainingLockoutMs() / 60000));
      this.pinErrorMessage = `🔒 暗証番号を${this.maxFailedAttempts}回連続で間違えたため、一時ロック中です（あと約${remainMin}分お待ちください）`;
      return false;
    }

    if (verifyPin(pin, this.storedPin)) {
      this.isAuthenticated = true;
      this.failedAttempts = 0;
      this.lockoutUntil = 0;
      this.pinErrorMessage = '';
      if (this.progress?.parentCheer) {
        this.progress.parentCheer.failedAttempts = 0;
        this.progress.parentCheer.lockoutUntil = 0;
      }
      SoundEffects.playSound('unlock');
      this.render();
      return true;
    }

    SoundEffects.playSound('near_miss');
    if (this.lockoutEnabled) {
      this.failedAttempts += 1;
      if (this.failedAttempts >= this.maxFailedAttempts) {
        this.lockoutUntil = Date.now() + this.lockoutDurationMs;
        const remainMin = Math.max(1, Math.ceil(this.lockoutDurationMs / 60000));
        this.pinErrorMessage = `🔒 暗証番号を${this.maxFailedAttempts}回連続で間違えたため、${remainMin}分間ロックされました。`;
      } else {
        const left = this.maxFailedAttempts - this.failedAttempts;
        this.pinErrorMessage = `⚠️ 暗証番号が正しくありません（あと${left}回間違えるとロックされます）`;
      }
      if (this.progress?.parentCheer) {
        this.progress.parentCheer.failedAttempts = this.failedAttempts;
        this.progress.parentCheer.lockoutUntil = this.lockoutUntil;
        if (this.lockoutUntil > 0 && typeof this.onSave === 'function') {
          Promise.resolve(this.onSave(this.progress)).catch(() => {});
        }
      }
    } else {
      this.pinErrorMessage = '⚠️ 暗証番号が正しくありません';
    }
    return false;
  }

  lock() {
    this.isAuthenticated = false;
    this.pinErrorMessage = '';
    SoundEffects.playSound('tap');
    this.render();
  }

  render() {
    if (typeof document === 'undefined') return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'parent-board-container';

    if (!this.isAuthenticated) {
      wrapper.appendChild(this.renderPinView());
    } else {
      wrapper.appendChild(this.renderDashboardView());
    }

    if (this.container) {
      this.container.innerHTML = '';
      this.container.appendChild(wrapper);
    }

    this.rootEl = wrapper;
    return wrapper;
  }

  renderPinView() {
    const card = document.createElement('div');
    card.className = 'pin-entry-card';

    const needsSetup = this.isPinSetupRequired();
    const lockedOut = !needsSetup && this.isLockedOut();
    const remainMin = lockedOut ? Math.max(1, Math.ceil(this.getRemainingLockoutMs() / 60000)) : 0;
    const defaultErrorText = lockedOut
      ? `🔒 暗証番号を${this.maxFailedAttempts}回連続で間違えたため、一時ロック中です（あと約${remainMin}分お待ちください）`
      : (this.pinErrorMessage || '⚠️ 暗証番号が正しくありません');
    const showErrorInitially = Boolean(lockedOut || this.pinErrorMessage);

    const headingText = needsSetup ? '保護者PINの初期設定' : '保護者認証';
    const descText = needsSetup
      ? 'お子様の学習記録や設定を保護するため、おうちの方専用の4桁の暗証番号（数字4桁）を設定してください。'
      : 'お子様の学習記録とおうちの方専用の設定を保護するため、4桁の暗証番号を入力してください。';
    const placeholderText = needsSetup ? '新しい4桁のPIN' : '4桁の暗証番号';
    const buttonText = needsSetup ? 'PINを設定して開く 🔐' : 'ロック解除 🔓';

    card.innerHTML = `
      <div style="font-size:3rem; margin-bottom:8px;">🛡️</div>
      <h2 style="font-size:1.4rem;">${headingText}</h2>
      <p style="color:var(--color-text-muted); font-size:0.9rem;">
        ${descText}
      </p>
      <div style="margin:16px 0;">
        <input type="password" maxlength="4" pattern="[0-9]*" inputmode="numeric" class="pin-input"
          placeholder="${placeholderText}"
          ${lockedOut ? 'disabled' : ''}
          style="font-size:1.8rem; letter-spacing:8px; text-align:center; width:220px; padding:12px; border-radius:var(--radius-lg); border:2px solid var(--color-card-border); background:rgba(0,0,0,0.3); color:white;">
      </div>
      <div class="pin-error-msg" style="display:${showErrorInitially ? 'block' : 'none'}; color:var(--color-amber-warm); font-weight:700; font-size:0.9rem;">
        ${defaultErrorText}
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
        <button type="button" class="btn btn-primary btn-unlock" style="padding:12px;" ${lockedOut ? 'disabled' : ''}>${buttonText}</button>
        <button type="button" class="btn btn-secondary btn-back-home" style="padding:8px;">マップへ戻る</button>
      </div>
    `;

    const input = card.querySelector('.pin-input');
    const unlockBtn = card.querySelector('.btn-unlock');
    const backBtn = card.querySelector('.btn-back-home');
    const errorMsg = card.querySelector('.pin-error-msg');

    const tryUnlock = () => {
      const pinVal = input?.value?.trim() || '';
      if (needsSetup) {
        const ok = this.setupInitialPin(pinVal);
        if (!ok) {
          if (errorMsg) {
            errorMsg.textContent = this.pinErrorMessage || '⚠️ 4桁の数字を入力してください';
            errorMsg.style.display = 'block';
          }
          if (input) {
            input.value = '';
            input.focus();
          }
        }
        return;
      }

      const success = this.authenticate(pinVal);
      if (!success) {
        if (this.isLockedOut()) {
          this.render();
          return;
        }
        if (errorMsg) {
          errorMsg.textContent = this.pinErrorMessage || '⚠️ 暗証番号が正しくありません';
          errorMsg.style.display = 'block';
        }
        if (input) {
          input.value = '';
          input.focus();
        }
      }
    };

    if (unlockBtn) unlockBtn.onclick = tryUnlock;
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') tryUnlock();
      });
      if (!lockedOut) {
        setTimeout(() => input.focus(), 100);
      }
    }

    if (backBtn) {
      backBtn.onclick = () => {
        window.location.hash = '#map';
      };
    }

    return card;
  }

  renderDashboardView() {
    const dashboard = document.createElement('div');
    dashboard.style.display = 'flex';
    dashboard.style.flexDirection = 'column';
    dashboard.style.gap = '24px';

    const profile = GamificationEngine.getUserProfile(this.progress?.gamification);
    const radarScores = calculateRadarScores(this.progress);
    const stageProgressValues = Object.values(this.progress?.stageProgress || {});
    const stageProgressStars = stageProgressValues.reduce((sum, sp) => sum + (Number(sp?.stars) || 0), 0);
    const gamificationStageStars = Object.values(this.progress?.gamification?.stageStars || {}).reduce(
      (sum, s) => sum + (Number(s) || 0),
      0
    );
    const gamificationStars = Math.max(
      Number(profile?.stars) || 0,
      Number(profile?.totalStars) || 0,
      Number(this.progress?.gamification?.totalStars) || 0,
      gamificationStageStars
    );
    const displayStars = Math.max(stageProgressStars, gamificationStars);

    const stageSelfCorrectedTotal = stageProgressValues.reduce(
      (sum, sp) => sum + (Number(sp?.selfCorrectedCount) || 0),
      0
    );
    const displaySelfCorrectionCount = Math.max(
      Number(this.progress?.gamification?.selfCorrectionCount) || 0,
      Number(profile?.selfCorrectionCount) || 0,
      stageSelfCorrectedTotal
    );
    const stageFirstTryTotal = stageProgressValues.reduce(
      (sum, sp) => sum + (Number(sp?.firstTryCorrectCount) || 0),
      0
    );
    const displayFirstTryCount = Math.max(
      stageFirstTryTotal,
      (profile?.worldStats || []).reduce((sum, w) => sum + (Number(w?.firstTryCorrectCount) || 0), 0)
    );
    const displayRankTitle = profile?.labRank?.title || profile?.rankTitle || profile?.rank?.title || '見習い探検員';

    // Top Header & Lock
    const header = document.createElement('div');
    header.className = 'card-dark';
    header.style.padding = '20px 24px';
    header.style.borderRadius = 'var(--radius-xl)';
    header.style.border = '1px solid var(--color-card-border)';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.flexWrap = 'wrap';
    header.style.gap = '12px';

    header.innerHTML = `
      <div>
        <h2 style="font-size:1.4rem; display:flex; align-items:center; gap:8px;">
          <span>🛡️</span>
          <span>保護者応援ボード</span>
        </h2>
        <p style="color:var(--color-text-muted); font-size:0.85rem; margin-top:4px;">
          お子様の思考の成長・自己是正プロセスとバックアップ状態を管理できます。
        </p>
      </div>
      <button type="button" class="btn btn-secondary btn-lock" style="padding:8px 16px;">
        🔒 ボードをロックする
      </button>
    `;

    const lockBtn = header.querySelector('.btn-lock');
    if (lockBtn) lockBtn.onclick = () => this.lock();
    dashboard.appendChild(header);

    // Self-Correction & Key Highlights Section
    const highlightCard = document.createElement('div');
    highlightCard.className = 'card-dark';
    highlightCard.style.padding = '24px';
    highlightCard.style.borderRadius = 'var(--radius-xl)';
    highlightCard.style.border = '2px solid rgba(234, 179, 8, 0.4)';
    highlightCard.style.background = 'linear-gradient(135deg, rgba(234, 179, 8, 0.08), rgba(15, 23, 42, 0.8))';

    highlightCard.innerHTML = `
      <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
        <div style="font-size:3rem; background:rgba(234, 179, 8, 0.15); width:72px; height:72px; border-radius:var(--radius-xl); display:flex; align-items:center; justify-content:center;">
          💡
        </div>
        <div style="flex:1;">
          <div style="font-size:0.9rem; font-weight:700; color:var(--color-amber-warm); letter-spacing:1px;">
            【最重要ハイライト】自分で気づいて直せた回数
          </div>
          <div style="display:flex; align-items:baseline; gap:8px; margin:4px 0;">
            <span style="font-size:2.4rem; font-weight:900; color:var(--color-text-main);">
              ${displaySelfCorrectionCount}
            </span>
            <span style="font-size:1.1rem; color:var(--color-text-muted); font-weight:700;">回 自力修正</span>
          </div>
          <p style="font-size:0.85rem; color:var(--color-text-muted); margin:0;">
            間違えたとき、あきらめずにステップガイドやヒントを使って自力で正解を導き出せた回数です。結果の点数以上に尊い「粘り強く考える力」が育っています！
          </p>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
            <span class="parent-stat-chip" style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.35); color:var(--color-emerald-success); padding:4px 10px; border-radius:var(--radius-full); font-size:0.8rem; font-weight:700;">
              ✨ 初回正解: ${displayFirstTryCount}問
            </span>
            <span class="parent-stat-chip" style="background:rgba(234,179,8,0.15); border:1px solid rgba(234,179,8,0.35); color:var(--color-amber-warm); padding:4px 10px; border-radius:var(--radius-full); font-size:0.8rem; font-weight:700;">
              💡 じぶん修正: ${displaySelfCorrectionCount}回
            </span>
          </div>
        </div>
        <div style="display:flex; gap:12px; font-size:0.85rem;">
          <div style="background:rgba(0,0,0,0.3); padding:10px 16px; border-radius:var(--radius-md); text-align:center;">
            <div style="color:var(--color-text-muted);">探検ランク</div>
            <div style="font-weight:700; color:var(--color-accent-cyan); font-size:1rem;">${displayRankTitle}</div>
          </div>
          <div style="background:rgba(0,0,0,0.3); padding:10px 16px; border-radius:var(--radius-md); text-align:center;">
            <div style="color:var(--color-text-muted);">獲得した星</div>
            <div style="font-weight:700; color:var(--color-amber-warm); font-size:1rem;">⭐ ${displayStars} 個</div>
          </div>
        </div>
      </div>
    `;
    dashboard.appendChild(highlightCard);

    // 5-Dimension Radar Chart
    const radarCard = document.createElement('div');
    radarCard.className = 'radar-chart-container';

    const worldLabels = [
      { key: 'world1', label: 'W1: たし算・ひき算ラボ' },
      { key: 'world2', label: 'W2: かけ算パワーラボ' },
      { key: 'world3', label: 'W3: わり算とあまりラボ' },
      { key: 'world4', label: 'W4: 2桁わり算・見積もり' },
      { key: 'world5', label: 'W5: 計算のきまり・四則混合' }
    ];

    let radarRowsHtml = '';
    worldLabels.forEach(w => {
      const score = radarScores[w.key] || 0;
      radarRowsHtml += `
        <div class="radar-row">
          <div class="radar-label">${w.label}</div>
          <div class="radar-bar-bg">
            <div class="radar-bar-fill" style="width: ${score}%;"></div>
          </div>
          <div class="radar-value">${score}%</div>
        </div>
      `;
    });

    radarCard.innerHTML = `
      <h3 style="font-size:1.1rem; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
        <span>📊</span>
        <span>5ワールド成長チャート（習熟進捗）</span>
      </h3>
      ${radarRowsHtml}
    `;
    dashboard.appendChild(radarCard);

    // Diagnosis Pattern Stats Card (Issue #21)
    const diagnosisCard = document.createElement('div');
    diagnosisCard.className = 'card-dark diagnosis-stats-card';
    diagnosisCard.style.padding = '24px';
    diagnosisCard.style.borderRadius = 'var(--radius-xl)';
    diagnosisCard.style.border = '1px solid var(--color-card-border)';

    const diagnosisSummary = summarizeDiagnosisLog(this.progress?.diagnosisLog, new Date());
    let diagnosisBodyHtml = '';
    if (diagnosisSummary.totalEntries === 0) {
      diagnosisBodyHtml = `
        <p style="font-size:0.9rem; color:var(--color-text-muted); margin:0;">
          まだ記録がありません。まちがえた問題のつまずきパターンが、ここに自動で記録されます。
        </p>
      `;
    } else {
      const patternRow = (label, detail) => `
        <div class="diagnosis-pattern-row" style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding:8px 12px; background:rgba(0,0,0,0.25); border-radius:var(--radius-md); margin-top:8px;">
          <span style="font-weight:700; font-size:0.95rem;">${label}</span>
          <span style="font-size:0.85rem; color:var(--color-text-muted);">${detail}</span>
        </div>
      `;
      const focusHtml = diagnosisSummary.focusPatterns.length > 0
        ? diagnosisSummary.focusPatterns
          .map((p) => patternRow(p.label, `直近30日で ${p.recent30} 回（これまで ${p.total} 回）`))
          .join('')
        : `
          <p style="font-size:0.9rem; color:var(--color-text-muted); margin:8px 0 0;">
            直近30日につまずいた記録はありません。
          </p>
        `;
      const resolvedHtml = diagnosisSummary.resolvedPatterns.length > 0
        ? `
          <div style="font-size:0.9rem; font-weight:700; color:var(--color-emerald-success); margin-top:20px;">
            ✅ 解消したパターン
          </div>
          ${diagnosisSummary.resolvedPatterns
            .map((p) => patternRow(p.label, `これまで ${p.total} 回（直近30日は出ていません）`))
            .join('')}
        `
        : '';
      diagnosisBodyHtml = `
        <div style="font-size:0.9rem; font-weight:700; color:var(--color-amber-warm);">
          🎯 今の重点パターン
        </div>
        ${focusHtml}
        ${resolvedHtml}
      `;
    }

    diagnosisCard.innerHTML = `
      <h3 style="font-size:1.1rem; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
        <span>🧩</span>
        <span>つまずきパターンの記録</span>
      </h3>
      ${diagnosisBodyHtml}
    `;
    dashboard.appendChild(diagnosisCard);

    // Cheer Stamp Sender Section
    const cheerCard = document.createElement('div');
    cheerCard.className = 'card-dark';
    cheerCard.style.padding = '24px';
    cheerCard.style.borderRadius = 'var(--radius-xl)';
    cheerCard.style.border = '1px solid var(--color-card-border)';

    let stampBtnsHtml = '';
    const stamps = GamificationEngine.PARENT_STAMPS || [
      { id: 'STAMP_FOCUS', icon: '🌟', label: 'すごい集中力！' },
      { id: 'STAMP_RECOVERY', icon: '💪', label: '自分で直せてえらい！' },
      { id: 'STAMP_LOVE', icon: '❤️', label: 'いつも応援してるよ！' },
      { id: 'STAMP_TREASURE', icon: '💎', label: 'お宝マスターへの道！' }
    ];

    stamps.forEach(s => {
      const isSelected = s.id === this.selectedStampId;
      stampBtnsHtml += `
        <button type="button" class="stamp-btn ${isSelected ? 'selected' : ''}" data-stamp-id="${s.id}">
          <span class="stamp-icon">${s.icon}</span>
          <span class="stamp-name">${s.label}</span>
        </button>
      `;
    });

    cheerCard.innerHTML = `
      <h3 style="font-size:1.1rem; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
        <span>💌</span>
        <span>応援スタンプを送る</span>
      </h3>
      <p style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:16px;">
        スタンプと温かいメッセージを選ぶと、次回お子様がアプリを開いたときにヘッダーにお手紙として届きます。
      </p>

      <div class="stamp-selector">
        ${stampBtnsHtml}
      </div>

      <div style="margin-top:16px;">
        <label style="display:block; font-size:0.85rem; margin-bottom:6px; color:var(--color-text-muted);">
          メッセージ（50文字以内）
        </label>
        <input type="text" maxlength="50" class="cheer-message-input"
          value="自分で直せてえらい！その調子！"
          placeholder="50文字以内で応援メッセージを入力"
          style="width:100%; padding:12px; border-radius:var(--radius-md); border:1px solid var(--color-card-border); background:rgba(0,0,0,0.3); color:white; font-size:1rem;">
      </div>

      <div style="display:flex; justify-content:flex-end; margin-top:16px;">
        <button type="button" class="btn btn-primary btn-send-cheer" style="padding:10px 24px;">
          送信する 🚀
        </button>
      </div>
    `;

    // Stamp selection listeners
    const stampBtns = cheerCard.querySelectorAll('.stamp-btn');
    stampBtns.forEach(btn => {
      btn.onclick = () => {
        SoundEffects.playSound('tap');
        this.selectedStampId = btn.dataset.stampId;
        stampBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });

    // Send cheer listener
    const sendBtn = cheerCard.querySelector('.btn-send-cheer');
    const msgInput = cheerCard.querySelector('.cheer-message-input');

    if (sendBtn) {
      sendBtn.onclick = () => {
        const text = msgInput?.value?.trim() || '';
        const cheer = createCheerStamp(this.selectedStampId, text);

        if (!this.progress.parentCheer) {
          this.progress.parentCheer = { cheerMessages: [], stampsReceived: [] };
        }
        if (!Array.isArray(this.progress.parentCheer.cheerMessages)) {
          this.progress.parentCheer.cheerMessages = [];
        }
        this.progress.parentCheer.cheerMessages.push(cheer);

        SoundEffects.playSound('stamp');
        showToast(null, 'success', '応援スタンプを送信しました！次回起動時に届きます。');

        if (typeof this.onSendStamp === 'function') {
          this.onSendStamp(cheer);
        }
        if (typeof this.onSave === 'function') {
          this.onSave(this.progress);
        }
      };
    }

    dashboard.appendChild(cheerCard);

    // 3-Tier Backup & Device Transfer UI Section
    const backupCard = document.createElement('div');
    backupCard.className = 'card-dark';
    backupCard.style.padding = '24px';
    backupCard.style.borderRadius = 'var(--radius-xl)';
    backupCard.style.border = '1px solid var(--color-card-border)';

    const isStaticHosting =
      typeof StorageService.isStaticHostingEnvironment === 'function' &&
      StorageService.isStaticHostingEnvironment();

    const staticHostingBanner = isStaticHosting
      ? `
      <div class="static-hosting-guide" style="background:rgba(14,165,233,0.12); border:1px solid var(--color-accent-cyan); color:var(--color-text-main); padding:12px 16px; border-radius:var(--radius-lg); font-size:0.85rem; margin-bottom:16px; line-height:1.5;">
        ℹ️ 現在は端末内保存モードで動作中です。別のタブレットへデータを引き継ぐ場合は、JSONバックアップファイル書き出しをご利用ください。
      </div>`
      : '';

    const tier2StatusText = isStaticHosting
      ? '⚪ 端末内保存モード（サーバー同期なし）'
      : '🟢 /api/progress 同期完了';
    const tier2StatusColor = isStaticHosting
      ? 'var(--color-text-muted)'
      : 'var(--color-accent-cyan)';

    backupCard.innerHTML = `
      <h3 style="font-size:1.1rem; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
        <span>💾</span>
        <span>3重バックアップ＆端末間引き継ぎ</span>
      </h3>
      <p style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:16px;">
        学習データを端末内・サーバー・バックアップファイル・引き継ぎコードの多重構造で安全に保護します。
      </p>
      ${staticHostingBanner}
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px; margin-bottom:20px;">
        <div style="background:rgba(0,0,0,0.2); padding:16px; border-radius:var(--radius-lg); border-left:4px solid var(--color-emerald-success);">
          <div style="font-weight:700;">Tier 1: 端末内即時保存</div>
          <div style="font-size:0.8rem; color:var(--color-emerald-success); margin-top:4px;">🟢 localStorage 正常稼働中</div>
        </div>
        <div style="background:rgba(0,0,0,0.2); padding:16px; border-radius:var(--radius-lg); border-left:4px solid var(--color-primary-lab);">
          <div style="font-weight:700;">Tier 2: サーバー自動同期</div>
          <div style="font-size:0.8rem; color:${tier2StatusColor}; margin-top:4px;">${tier2StatusText}</div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- File Export / Import -->
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <button type="button" class="btn btn-outline btn-export-backup" style="flex:1; min-width:200px;">
            📥 JSONバックアップを保存
          </button>
          <label class="btn btn-outline" style="flex:1; min-width:200px; text-align:center; cursor:pointer;">
            📤 バックアップファイルから復元
            <input type="file" class="file-import-input" accept=".json" style="display:none;">
          </label>
        </div>

        <!-- 8-Digit Transfer Code -->
        <div style="background:rgba(0,0,0,0.2); padding:20px; border-radius:var(--radius-lg); border:1px solid var(--color-card-border); margin-top:8px;">
          <h4 style="font-size:0.95rem; margin-bottom:8px; color:var(--color-accent-cyan);">
            🔑 8桁引き継ぎコード発行＆別端末復元
          </h4>
          <p style="font-size:0.8rem; color:var(--color-text-muted); margin-bottom:12px;">
            新しいタブレットへ学習データを移行する際、発行から48時間有効な引き継ぎコードをご利用ください。
          </p>

          <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
            <button type="button" class="btn btn-secondary btn-generate-code" style="padding:10px 16px;">
              引き継ぎコードを発行
            </button>
            <div class="code-display" style="display:none; align-items:center; gap:8px; font-family:monospace; font-size:1.3rem; font-weight:700; color:var(--color-amber-warm); background:rgba(0,0,0,0.4); padding:8px 16px; border-radius:var(--radius-md);">
              <span class="code-text"></span>
            </div>
          </div>

          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <input type="text" class="input-transfer-code" placeholder="例: LAB-XXXX-XXXX"
              style="padding:10px 14px; font-family:monospace; font-size:1rem; border-radius:var(--radius-md); border:1px solid var(--color-card-border); background:rgba(0,0,0,0.3); color:white; width:220px;">
            <button type="button" class="btn btn-primary btn-restore-code" style="padding:10px 20px;">
              コードから復元
            </button>
          </div>
        </div>
      </div>
    `;

    // Export Backup
    const exportBtn = backupCard.querySelector('.btn-export-backup');
    if (exportBtn) {
      exportBtn.onclick = () => {
        try {
          const jsonStr = StorageService.exportBackupJSON(this.progress);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `math-lab-backup-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast(null, 'success', 'バックアップJSONをダウンロードしました。');
        } catch {
          showToast(null, 'encourage', 'エクスポートに失敗しました。');
        }
      };
    }

    // Import Backup
    const fileInput = backupCard.querySelector('.file-import-input');
    if (fileInput) {
      fileInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const content = ev.target?.result;
            const imported = StorageService.importBackupJSON(content);
            this.progress = imported;
            if (imported?.parentCheer?.parentPinHash) {
              this.storedPin = String(imported.parentCheer.parentPinHash);
              this._explicitPinOption = Boolean(imported.parentCheer.pinConfigured);
            }
            await StorageService.saveProgress(imported);
            showToast(null, 'success', 'バックアップから学習データを復元しました！');
            if (typeof this.onTransferRestored === 'function') {
              this.onTransferRestored(imported);
            }
            this.render();
          } catch {
            showToast(null, 'encourage', 'バックアップファイルの復元に失敗しました。');
          }
        };
        reader.readAsText(file);
      };
    }

    // Generate Code
    const genCodeBtn = backupCard.querySelector('.btn-generate-code');
    const codeDisplay = backupCard.querySelector('.code-display');
    const codeText = backupCard.querySelector('.code-text');

    if (genCodeBtn) {
      genCodeBtn.onclick = () => {
        try {
          const code = StorageService.generateTransferCode(this.progress);
          if (codeDisplay && codeText) {
            codeText.textContent = code;
            codeDisplay.style.display = 'inline-flex';
          }
          showToast(null, 'success', '8桁引き継ぎコードを発行しました（48時間有効）');
        } catch {
          showToast(null, 'encourage', 'コード発行に失敗しました。');
        }
      };
    }

    // Restore Code
    const restoreCodeBtn = backupCard.querySelector('.btn-restore-code');
    const inputCode = backupCard.querySelector('.input-transfer-code');

    if (restoreCodeBtn) {
      restoreCodeBtn.onclick = async () => {
        const codeVal = inputCode?.value?.trim() || '';
        if (!codeVal) {
          showToast(null, 'encourage', '引き継ぎコードを入力してください。');
          return;
        }
        try {
          const restored = await StorageService.restoreFromTransferCode(codeVal);
          if (restored) {
            this.progress = restored;
            if (restored?.parentCheer?.parentPinHash) {
              this.storedPin = String(restored.parentCheer.parentPinHash);
              this._explicitPinOption = Boolean(restored.parentCheer.pinConfigured);
            }
            await StorageService.saveProgress(restored);
            showToast(null, 'success', '引き継ぎコードから学習データを復元しました！');
            if (typeof this.onTransferRestored === 'function') {
              this.onTransferRestored(restored);
            }
            this.render();
          }
        } catch {
          showToast(null, 'encourage', '引き継ぎコードが見つからないか期限切れです。');
        }
      };
    }

    dashboard.appendChild(backupCard);

    // Parent PIN Settings Card
    const pinCard = document.createElement('div');
    pinCard.className = 'card-dark parent-pin-settings-card';
    pinCard.style.padding = '24px';
    pinCard.style.borderRadius = 'var(--radius-xl)';
    pinCard.style.border = '1px solid var(--color-card-border)';

    pinCard.innerHTML = `
      <h3 style="font-size:1.1rem; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
        <span>🔐</span>
        <span>保護者PIN（暗証番号）の変更</span>
      </h3>
      <p style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:14px;">
        お子様が保護者ボードを開けないよう、4桁の数字で暗証番号を設定・変更できます。
      </p>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <input type="password" maxlength="4" pattern="[0-9]*" inputmode="numeric" class="input-new-pin"
          placeholder="新しい4桁のPIN"
          style="padding:10px 14px; font-size:1.1rem; letter-spacing:4px; text-align:center; border-radius:var(--radius-md); border:1px solid var(--color-card-border); background:rgba(0,0,0,0.3); color:white; width:180px;">
        <button type="button" class="btn btn-secondary btn-change-pin" style="padding:10px 20px;">
          PINを変更する
        </button>
      </div>
      <div class="pin-change-msg" style="display:none; margin-top:10px; font-size:0.9rem; font-weight:700;"></div>
    `;

    const newPinInput = pinCard.querySelector('.input-new-pin');
    const changePinBtn = pinCard.querySelector('.btn-change-pin');
    const pinChangeMsg = pinCard.querySelector('.pin-change-msg');

    const handleChangePin = () => {
      const nextPin = newPinInput?.value?.trim() || '';
      const res = this.changePin(nextPin);
      if (pinChangeMsg) {
        pinChangeMsg.style.display = 'block';
        if (res.success) {
          pinChangeMsg.style.color = 'var(--color-emerald-success)';
          pinChangeMsg.textContent = '✅ 保護者PINを変更しました！次回ロック解除から新しいPINが使われます。';
          showToast(null, 'success', '保護者PINを変更しました！');
        } else {
          pinChangeMsg.style.color = 'var(--color-amber-warm)';
          pinChangeMsg.textContent = `⚠️ ${res.error}`;
        }
      }
      if (res.success && newPinInput) {
        newPinInput.value = '';
      }
    };

    if (changePinBtn) {
      changePinBtn.onclick = handleChangePin;
    }
    if (newPinInput) {
      newPinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault?.();
          handleChangePin();
        }
      });
    }

    dashboard.appendChild(pinCard);
    return dashboard;
  }

  destroy() {
    if (this.rootEl && this.rootEl.parentNode) {
      this.rootEl.parentNode.removeChild(this.rootEl);
    }
    this.rootEl = null;
  }
}

export const ParentBoardView = ParentBoard;
export default ParentBoard;
