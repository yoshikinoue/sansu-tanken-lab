/**
 * src/components/stage-map.js
 * 算数探検ラボ - 全ワールド・ステージのマップ＆ナビゲーター (StageMap)
 *
 * Dual capability:
 * 1. Pure helper functions and constants matching StageMapReference for headless Node.js
 * 2. Interactive DOM StageMap class for tablet browser rendering all worlds,
 *    star ratings, stage lock/unlock states, and mini-lesson review triggers.
 */

import { WORLDS_METADATA } from '../services/curriculum-engine.js';
import * as SoundEffects from '../services/sound-effects.js';
import { showToast } from './toast-feedback.js';
import {
  CUTE_CHARACTERS,
  DEFAULT_CHARACTER_ID,
  INITIAL_UNLOCKED_CHARACTERS,
  getCharacterById,
  renderCharacterSvg
} from './cute-characters.js';

// --- PURE HELPER FUNCTIONS & CONSTANTS (HEADLESS COMPATIBLE) ---

// ワールド数・総ステージ数はカリキュラムのメタデータから導出する (ワールド追加に追随)
export const totalWorlds = WORLDS_METADATA.length;
export const stagesPerWorld = WORLDS_METADATA[0]?.stages.length || 3;
export const totalStages = WORLDS_METADATA.reduce((n, world) => n + world.stages.length, 0);

/**
 * 指定ステージがアンロックされているか判定
 * Stage 1 は常に true
 * Stage N (2..総ステージ数) は前の Stage (N - 1) が cleared === true のとき true
 * @param {number} stageNumber 1..総ステージ数
 * @param {object} clearedStagesMap progress.stageProgress マップ
 * @returns {boolean}
 */
export function isStageUnlocked(stageNumber, clearedStagesMap = {}) {
  const num = Number(stageNumber);
  if (num === 1) return true;
  if (!clearedStagesMap || typeof clearedStagesMap !== 'object') return false;

  const prevStageKey = `stage-${num - 1}`;
  const prevStage = clearedStagesMap[prevStageKey];
  return Boolean(prevStage && prevStage.cleared === true);
}

/**
 * ステージ番号から所属ワールド番号を算出
 * @param {number} stageNumber 1..総ステージ数
 * @returns {number} ワールド番号
 */
export function getWorldForStage(stageNumber) {
  const num = Number(stageNumber);
  if (isNaN(num) || num <= 0) return 1;
  return Math.ceil(num / stagesPerWorld);
}

// --- DOM CLASS FOR BROWSER RUNTIME ---

export class StageMap {
  constructor(options = {}) {
    this.container = options.container || null;
    this.progress = options.progress || null;
    this.onSelectStage = options.onSelectStage || null;
    this.onOpenLesson = options.onOpenLesson || null;
    this.onOpenBonusGame = options.onOpenBonusGame || null;
    this.onOpenCharacterBook = options.onOpenCharacterBook || null;
    // Issue #20: 復習キュー（期限到来件数とセッション開始コールバック）
    this.reviewDueCount = typeof options.reviewDueCount === 'number' ? options.reviewDueCount : 0;
    this.onStartReviewQueue = options.onStartReviewQueue || null;
    this.rootEl = null;
  }

  mount(container) {
    this.container = container;
    this.render();
    return this;
  }

  update(progress) {
    this.progress = progress;
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

  render() {
    if (typeof document === 'undefined') return null;

    const stageMapEl = document.createElement('div');
    stageMapEl.className = 'stage-map-view';

    const stageProg = this.progress?.stageProgress || {};
    const bonusData = this.progress?.bonusGame || {};
    const selectedChar = getCharacterById(bonusData.selectedCharacterId || DEFAULT_CHARACTER_ID);
    const unlockedList = Array.isArray(bonusData.unlockedCharacters) && bonusData.unlockedCharacters.length > 0
      ? bonusData.unlockedCharacters
      : INITIAL_UNLOCKED_CHARACTERS;
    const tickets = typeof bonusData.tickets === 'number' ? bonusData.tickets : 1;

    // Top Bonus Game & Cute Character Hub Banner
    const hubBar = document.createElement('section');
    hubBar.className = 'bonus-hub-bar';
    hubBar.innerHTML = `
      <div class="hub-card companion-hub-card">
        <div class="hub-char-avatar">${renderCharacterSvg(selectedChar.id, 'happy', 64)}</div>
        <div class="hub-card-info">
          <div class="hub-card-title">💖 今の応援相棒：${selectedChar.name}</div>
          <div class="hub-card-sub">おともだち図鑑：<strong>${unlockedList.length} / ${CUTE_CHARACTERS.length}</strong> キャラ</div>
        </div>
        <button type="button" class="btn btn-sm btn-primary btn-open-char-book">🐾 図鑑・キャラ変更</button>
      </div>
      <div class="hub-card backrooms-hub-card">
        <div class="hub-backrooms-icon" aria-hidden="true">🟨</div>
        <div class="hub-card-info">
          <div class="hub-card-title">ボーナスゲーム：バックルームたんけん</div>
          <div class="hub-card-sub">🎫 チケット：<strong>${tickets}</strong> 枚（1ステージクリアごとに+1枚！）</div>
        </div>
        <button type="button" class="btn btn-sm btn-accent btn-open-bonus-game">🎮 バックルームへ！</button>
      </div>
    `;

    const bookBtn = hubBar.querySelector('.btn-open-char-book');
    if (bookBtn) {
      bookBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        SoundEffects.playSound('tap');
        if (typeof this.onOpenCharacterBook === 'function') {
          this.onOpenCharacterBook();
        }
      });
    }

    const bonusBtn = hubBar.querySelector('.btn-open-bonus-game');
    if (bonusBtn) {
      bonusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        SoundEffects.playSound('tap');
        if (typeof this.onOpenBonusGame === 'function') {
          this.onOpenBonusGame();
        }
      });
    }

    stageMapEl.appendChild(hubBar);

    // Issue #20: 今日の復習バナー（期限到来の復習がある日だけ表示）
    if (this.reviewDueCount > 0) {
      const reviewBar = document.createElement('section');
      reviewBar.className = 'bonus-hub-bar review-queue-bar';
      reviewBar.innerHTML = `
        <div class="hub-card review-queue-card">
          <div class="hub-backrooms-icon" aria-hidden="true">📅</div>
          <div class="hub-card-info">
            <div class="hub-card-title">今日の復習：${this.reviewDueCount}件</div>
            <div class="hub-card-sub">まちがえた問題を、時間をおいてもう一度！おぼえているか確かめよう。</div>
          </div>
          <button type="button" class="btn btn-sm btn-primary btn-start-review-queue">▶️ 復習をはじめる</button>
        </div>
      `;

      const reviewBtn = reviewBar.querySelector('.btn-start-review-queue');
      if (reviewBtn) {
        reviewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          SoundEffects.playSound('tap');
          if (typeof this.onStartReviewQueue === 'function') {
            this.onStartReviewQueue();
          }
        });
      }

      stageMapEl.appendChild(reviewBar);
    }

    // Render 5 Worlds
    WORLDS_METADATA.forEach(world => {
      const worldCard = document.createElement('section');
      worldCard.className = 'world-card';
      worldCard.dataset.worldId = String(world.worldId);

      // Check if this world has active/unlocked stages
      let worldHasUnlocked = false;
      let worldClearedCount = 0;

      world.stages.forEach(st => {
        const sNum = st.globalStageNumber || st.stageId;
        const sKey = `stage-${sNum}`;
        const unlocked = isStageUnlocked(sNum, stageProg);
        if (unlocked) worldHasUnlocked = true;
        if (stageProg[sKey]?.cleared) worldClearedCount++;
      });

      if (worldHasUnlocked) {
        worldCard.classList.add('active-world');
      }

      // World Header
      const header = document.createElement('div');
      header.className = 'world-header';
      header.innerHTML = `
        <div class="world-info">
          <div class="world-badge" aria-hidden="true">${world.icon || '🧪'}</div>
          <div>
            <div class="world-title">ワールド ${world.worldId}: ${world.title}</div>
            <div class="world-desc">${world.description || world.subtitle || ''}</div>
          </div>
        </div>
        <div class="world-progress-badge" style="font-weight:700; color:var(--color-accent-cyan);">
          クリア: ${worldClearedCount} / ${world.stages.length}
        </div>
      `;
      worldCard.appendChild(header);

      // Stages Grid
      const stagesGrid = document.createElement('div');
      stagesGrid.className = 'stages-grid';

      world.stages.forEach(st => {
        const sNum = st.globalStageNumber || st.stageId;
        const sKey = `stage-${sNum}`;
        const unlocked = isStageUnlocked(sNum, stageProg);
        const stageData = stageProg[sKey] || {};
        const isCleared = Boolean(stageData.cleared);
        const starsCount = Math.max(0, Math.min(3, Number(stageData.stars || 0)));

        const stageCard = document.createElement('div');
        stageCard.className = `stage-card ${unlocked ? 'unlocked' : 'locked'}`;
        stageCard.dataset.stageId = sKey;
        stageCard.dataset.stageNumber = String(sNum);

        if (unlocked) {
          // Star display (e.g. ⭐⭐⭐ or ☆☆☆)
          let starStr = '';
          if (isCleared) {
            starStr = '⭐'.repeat(starsCount) + '☆'.repeat(3 - starsCount);
          } else {
            starStr = '☆☆☆';
          }

          stageCard.innerHTML = `
            <div class="stage-card-top">
              <span class="stage-number">STAGE ${sNum}</span>
              <span class="stage-stars" aria-label="獲得星: ${starsCount}個">${starStr}</span>
            </div>
            <h3 class="stage-name" style="font-size:1.1rem; margin:4px 0;">${st.title}</h3>
            <p class="stage-desc" style="font-size:0.85rem; color:var(--color-text-muted); flex:1;">${st.subtitle || st.description || ''}</p>
            <div class="stage-actions" style="display:flex; gap:8px; margin-top:8px;">
              <button type="button" class="btn btn-sm btn-outline btn-open-lesson" style="flex:1;" aria-label="ミニ授業を見る">📖 ミニ授業</button>
              <button type="button" class="btn btn-sm btn-primary btn-start-stage" style="flex:1;" aria-label="探検スタート">🚀 探検</button>
            </div>
          `;

          const lessonBtn = stageCard.querySelector('.btn-open-lesson');
          if (lessonBtn) {
            lessonBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              SoundEffects.playSound('tap');
              if (typeof this.onOpenLesson === 'function') {
                this.onOpenLesson(sKey, sNum);
              }
            });
          }

          const startBtn = stageCard.querySelector('.btn-start-stage');
          if (startBtn) {
            startBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              SoundEffects.playSound('tap');
              if (typeof this.onSelectStage === 'function') {
                this.onSelectStage(sKey, sNum);
              }
            });
          }

          stageCard.addEventListener('click', () => {
            SoundEffects.playSound('tap');
            if (typeof this.onSelectStage === 'function') {
              this.onSelectStage(sKey, sNum);
            }
          });
        } else {
          // Locked stage
          stageCard.innerHTML = `
            <div class="stage-card-top">
              <span class="stage-number" style="color:var(--color-text-muted);">STAGE ${sNum}</span>
              <span style="font-size:1.2rem;">🔒</span>
            </div>
            <h3 class="stage-name" style="font-size:1.1rem; margin:4px 0; color:var(--color-text-muted);">${st.title}</h3>
            <p class="stage-desc" style="font-size:0.85rem; color:var(--color-text-muted); flex:1;">前のステージをクリアしてアンロック！</p>
          `;

          stageCard.addEventListener('click', () => {
            SoundEffects.playSound('near_miss');
            showToast(null, 'encourage', '前のステージをクリアしてアンロックしよう！');
          });
        }

        stagesGrid.appendChild(stageCard);
      });

      worldCard.appendChild(stagesGrid);
      stageMapEl.appendChild(worldCard);
    });

    if (this.container) {
      this.container.innerHTML = '';
      this.container.appendChild(stageMapEl);
    }

    this.rootEl = stageMapEl;
    return stageMapEl;
  }

  destroy() {
    if (this.rootEl && this.rootEl.parentNode) {
      this.rootEl.parentNode.removeChild(this.rootEl);
    }
    this.rootEl = null;
  }
}

export const StageMapView = StageMap;
export default StageMap;
