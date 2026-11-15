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
    this.storedPin = options.pin || '1234';
    this.isAuthenticated = false;
    this.selectedStampId = 'STAMP_RECOVERY';
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
      const parent = this.rootEl.parentNode;
      const newEl = this.render();
      if (newEl) {
        parent.replaceChild(newEl, this.rootEl);
        this.rootEl = newEl;
      }
    }
  }

  authenticate(pin) {
    if (verifyPin(pin, this.storedPin)) {
      this.isAuthenticated = true;
      SoundEffects.playSound('unlock');
      this.render();
      return true;
    } else {
      SoundEffects.playSound('near_miss');
      return false;
    }
  }

  lock() {
    this.isAuthenticated = false;
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

    card.innerHTML = `
      <div style="font-size:3rem; margin-bottom:8px;">🛡️</div>
      <h2 style="font-size:1.4rem;">保護者認証</h2>
      <p style="color:var(--color-text-muted); font-size:0.9rem;">
        お子様の学習記録とおうちの方専用の設定を保護するため、4桁の暗証番号を入力してください。
      </p>
      <div style="margin:16px 0;">
        <input type="password" maxlength="4" pattern="[0-9]*" inputmode="numeric" class="pin-input"
          placeholder="4桁のPIN (初期値: 1234)"
          style="font-size:1.8rem; letter-spacing:8px; text-align:center; width:220px; padding:12px; border-radius:var(--radius-lg); border:2px solid var(--color-card-border); background:rgba(0,0,0,0.3); color:white;">
      </div>
      <div class="pin-error-msg" style="display:none; color:var(--color-amber-warm); font-weight:700; font-size:0.9rem;">
        ⚠️ 暗証番号が正しくありません
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
        <button type="button" class="btn btn-primary btn-unlock" style="padding:12px;">ロック解除 🔓</button>
        <button type="button" class="btn btn-secondary btn-back-home" style="padding:8px;">マップへ戻る</button>
      </div>
    `;

    const input = card.querySelector('.pin-input');
    const unlockBtn = card.querySelector('.btn-unlock');
    const backBtn = card.querySelector('.btn-back-home');
    const errorMsg = card.querySelector('.pin-error-msg');

    const tryUnlock = () => {
      const pinVal = input?.value?.trim() || '';
      const success = this.authenticate(pinVal);
      if (!success) {
        if (errorMsg) errorMsg.style.display = 'block';
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
      setTimeout(() => input.focus(), 100);
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
    const displaySelfCorrectionCount = Math.max(
      Number(this.progress?.gamification?.selfCorrectionCount) || 0,
      Number(profile?.selfCorrectionCount) || 0
    );
    const displayRankTitle = profile?.labRank?.title || profile?.rankTitle || profile?.rank?.title || '見習い探検員';
    const displayStars = profile?.stars ?? profile?.totalStars ?? Object.values(this.progress?.stageProgress || {}).reduce((sum, sp) => sum + (Number(sp?.stars) || 0), 0);

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
