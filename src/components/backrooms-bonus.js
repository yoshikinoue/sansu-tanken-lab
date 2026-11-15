/**
 * src/components/backrooms-bonus.js
 * 算数探検ラボ - ボーナスゲーム「バックルーム（Backrooms）2D迷路たんけん」
 *
 * Dual capability:
 * 1. Pure headless maze generator, BFS reachability verifier, and action-maze state machine
 * 2. Interactive BackroomsBonusModal with mode selection (🌱やさしい / 👻ドキドキ),
 *    2D yellow wallpaper canvas rendering, tablet D-pad, tap-to-move, keyboard controls,
 *    and character rescue celebration (100% pure action maze, zero math questions).
 */

import * as SoundEffects from '../services/sound-effects.js';
import {
  CUTE_CHARACTERS,
  DEFAULT_CHARACTER_ID,
  INITIAL_UNLOCKED_CHARACTERS,
  getCharacterById,
  renderCharacterSvg
} from './cute-characters.js';

export const TILE_TYPES = {
  FLOOR: 0,
  WALL: 1,
  START: 2,
  EXIT: 3,
  KEY: 4,
  FRIEND: 5,
  SASUMATA: 6,
  SNACK: 7,
  WARP_A: 8,
  WARP_B: 9,
  STAR: 10
};

/**
 * Deterministic seeded pseudo-random generator (Mulberry32).
 * @param {number} seed
 * @returns {() => number}
 */
function createRng(seed = 1) {
  let a = (Number(seed) || 1) >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compute BFS shortest distances from a start position across walkable tiles.
 * @param {number[][]} grid
 * @param {{ x: number, y: number }} start
 * @returns {Map<string, number>}
 */
export function computeReachableDistances(grid, start) {
  const height = grid.length;
  const width = grid[0]?.length || 0;
  const dist = new Map();
  if (
    start.y < 0 || start.y >= height ||
    start.x < 0 || start.x >= width ||
    grid[start.y][start.x] === TILE_TYPES.WALL
  ) {
    return dist;
  }

  const queue = [{ x: start.x, y: start.y, d: 0 }];
  dist.set(`${start.x},${start.y}`, 0);

  let head = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (head < queue.length) {
    const cur = queue[head++];
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (grid[ny][nx] === TILE_TYPES.WALL) continue;
      const key = `${nx},${ny}`;
      if (!dist.has(key)) {
        dist.set(key, cur.d + 1);
        queue.push({ x: nx, y: ny, d: cur.d + 1 });
      }
    }
  }
  return dist;
}

/**
 * Generate a connected 2D Backrooms maze with guaranteed reachability to
 * Key, Lost Friend, Sasumata, Speed Snack, Warp Pair, Stars, and Exit.
 *
 * @param {object} [options={}]
 * @returns {object} Maze layout metadata
 */
export function generateBackroomsMaze(options = {}) {
  const rawW = Math.max(9, Number(options.width) || 11);
  const rawH = Math.max(9, Number(options.height) || 11);
  const width = rawW % 2 === 0 ? rawW + 1 : rawW;
  const height = rawH % 2 === 0 ? rawH + 1 : rawH;
  const rng = createRng(options.seed ?? 1);

  const grid = Array.from({ length: height }, () => Array(width).fill(TILE_TYPES.WALL));
  const start = { x: 1, y: 1 };
  const exit = { x: width - 2, y: height - 2 };

  // Randomized DFS maze carving on odd cells
  const visited = new Set([`${start.x},${start.y}`]);
  const stack = [start];
  grid[start.y][start.x] = TILE_TYPES.FLOOR;

  const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];
  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    const neighbors = [];
    for (const [dx, dy] of dirs) {
      const nx = top.x + dx;
      const ny = top.y + dy;
      if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && !visited.has(`${nx},${ny}`)) {
        neighbors.push({ nx, ny, wx: top.x + dx / 2, wy: top.y + dy / 2 });
      }
    }
    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }
    const chosen = neighbors[Math.floor(rng() * neighbors.length)];
    grid[chosen.wy][chosen.wx] = TILE_TYPES.FLOOR;
    grid[chosen.ny][chosen.nx] = TILE_TYPES.FLOOR;
    visited.add(`${chosen.nx},${chosen.ny}`);
    stack.push({ x: chosen.nx, y: chosen.ny });
  }

  // Braid a few interior walls so Backrooms feels like interconnected yellow office rooms/corridors
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      if (grid[y][x] === TILE_TYPES.WALL) {
        const openH = grid[y][x - 1] === TILE_TYPES.FLOOR && grid[y][x + 1] === TILE_TYPES.FLOOR;
        const openV = grid[y - 1][x] === TILE_TYPES.FLOOR && grid[y + 1][x] === TILE_TYPES.FLOOR;
        if ((openH || openV) && rng() < 0.24) {
          grid[y][x] = TILE_TYPES.FLOOR;
        }
      }
    }
  }

  grid[start.y][start.x] = TILE_TYPES.START;
  grid[exit.y][exit.x] = TILE_TYPES.EXIT;

  // Collect all reachable floor cells sorted by distance from start
  const distMap = computeReachableDistances(grid, start);
  const candidates = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (x === start.x && y === start.y) continue;
      if (x === exit.x && y === exit.y) continue;
      if (grid[y][x] !== TILE_TYPES.FLOOR) continue;
      const d = distMap.get(`${x},${y}`);
      if (typeof d === 'number' && d >= 2) {
        candidates.push({ x, y, d });
      }
    }
  }

  candidates.sort((a, b) => a.d - b.d);

  const used = new Set([`${start.x},${start.y}`, `${exit.x},${exit.y}`]);
  const pickFromSlice = (minRatio, maxRatio) => {
    if (candidates.length === 0) return null;
    const lo = Math.min(candidates.length - 1, Math.floor(candidates.length * minRatio));
    const hi = Math.min(candidates.length, Math.max(lo + 1, Math.ceil(candidates.length * maxRatio)));
    const slice = candidates.slice(lo, hi).filter((c) => !used.has(`${c.x},${c.y}`));
    const pool = slice.length > 0 ? slice : candidates.filter((c) => !used.has(`${c.x},${c.y}`));
    if (pool.length === 0) return null;
    const picked = pool[Math.floor(rng() * pool.length)];
    used.add(`${picked.x},${picked.y}`);
    return { x: picked.x, y: picked.y };
  };

  // Place guaranteed items across short, mid, and far sections
  const sasumataPos = pickFromSlice(0.05, 0.35);
  const snackPos = pickFromSlice(0.10, 0.45);
  const warpAPos = pickFromSlice(0.15, 0.45);
  const warpBPos = pickFromSlice(0.65, 0.95);
  const keyPos = pickFromSlice(0.45, 0.85);
  const friendPos = pickFromSlice(0.55, 0.95);

  if (sasumataPos) grid[sasumataPos.y][sasumataPos.x] = TILE_TYPES.SASUMATA;
  if (snackPos) grid[snackPos.y][snackPos.x] = TILE_TYPES.SNACK;
  if (warpAPos && warpBPos) {
    grid[warpAPos.y][warpAPos.x] = TILE_TYPES.WARP_A;
    grid[warpBPos.y][warpBPos.x] = TILE_TYPES.WARP_B;
  }
  if (keyPos) grid[keyPos.y][keyPos.x] = TILE_TYPES.KEY;
  if (friendPos) grid[friendPos.y][friendPos.x] = TILE_TYPES.FRIEND;

  // Place 4 bonus stars
  const stars = [];
  for (let i = 0; i < 4; i++) {
    const sp = pickFromSlice(0.15, 0.9);
    if (sp) {
      grid[sp.y][sp.x] = TILE_TYPES.STAR;
      stars.push(sp);
    }
  }

  return {
    width,
    height,
    grid,
    start,
    exit,
    items: {
      key: keyPos,
      friend: friendPos,
      sasumata: sasumataPos,
      snack: snackPos,
      warpA: warpAPos,
      warpB: warpBPos,
      stars
    }
  };
}

/**
 * Determine which locked character should be rescued next in the Backrooms maze.
 * @param {string[]} unlockedCharacters
 * @returns {string}
 */
export function pickRescueTargetCharacter(unlockedCharacters = INITIAL_UNLOCKED_CHARACTERS) {
  const unlockedSet = new Set(Array.isArray(unlockedCharacters) ? unlockedCharacters : []);
  const locked = CUTE_CHARACTERS.filter((c) => !unlockedSet.has(c.id));
  if (locked.length > 0) {
    return locked[0].id;
  }
  // If all 8 are already collected, pick a non-Momonga pal to celebrate together
  const others = CUTE_CHARACTERS.filter((c) => c.id !== DEFAULT_CHARACTER_ID);
  return others[Math.floor(Math.random() * others.length)]?.id || DEFAULT_CHARACTER_ID;
}

/**
 * Create a complete Backrooms Bonus Game state.
 * @param {object} [options={}]
 * @returns {object}
 */
export function createBonusGameState(options = {}) {
  const mode = options.mode === 'thrill' ? 'thrill' : 'easy';
  const selectedCharacterId = getCharacterById(options.selectedCharacterId || DEFAULT_CHARACTER_ID).id;
  const unlockedCharacters = Array.isArray(options.unlockedCharacters) && options.unlockedCharacters.length > 0
    ? [...options.unlockedCharacters]
    : [...INITIAL_UNLOCKED_CHARACTERS];

  const rescueTargetId = options.rescueTargetId || pickRescueTargetCharacter(unlockedCharacters);
  const maze = options.maze || generateBackroomsMaze({
    width: options.width || 11,
    height: options.height || 11,
    seed: options.seed ?? 1
  });

  // In 'thrill' mode, place 1 roaming shadow entity on a floor tile far from start
  const entities = [];
  if (mode === 'thrill') {
    const dist = computeReachableDistances(maze.grid, maze.start);
    let bestCell = { x: maze.width - 2, y: 1 };
    let bestD = -1;
    for (let y = 1; y < maze.height - 1; y++) {
      for (let x = 1; x < maze.width - 1; x++) {
        if (maze.grid[y][x] === TILE_TYPES.FLOOR) {
          const d = dist.get(`${x},${y}`) || 0;
          if (d > bestD && !(x === maze.exit.x && y === maze.exit.y)) {
            bestD = d;
            bestCell = { x, y };
          }
        }
      }
    }
    entities.push({
      id: 'shadow-1',
      x: bestCell.x,
      y: bestCell.y,
      homeX: bestCell.x,
      homeY: bestCell.y,
      stunnedSteps: 0
    });
  }

  return {
    mode,
    selectedCharacterId,
    rescueTargetId,
    maze,
    player: { x: maze.start.x, y: maze.start.y },
    trail: [{ x: maze.start.x, y: maze.start.y }],
    hasKey: false,
    rescuedFriend: false,
    sasumataCount: 0,
    speedBoostSteps: 0,
    starsCollected: 0,
    defeatedEntities: 0,
    score: 0,
    steps: 0,
    status: 'playing', // 'playing' | 'escaped'
    lastEvent: 'init',
    lastMessage: mode === 'thrill'
      ? '👻 ドキドキ探検スタート！🔱さすまたを拾えば黒い影も「ヤーッ！」できるぞ！'
      : '🌱 やさしい探検スタート！🔑カギと🐾おともだちを見つけて🚪EXITへ！',
    entities
  };
}

/**
 * Resolve collision between player and any active shadow entity.
 * @param {object} state
 * @returns {string|null} event name if collision happened
 */
export function resolveEntityCollision(state) {
  if (!state || state.mode !== 'thrill' || state.status !== 'playing') return null;

  for (const ent of state.entities) {
    if (ent.stunnedSteps > 0) continue;
    if (ent.x === state.player.x && ent.y === state.player.y) {
      if (state.sasumataCount > 0) {
        state.sasumataCount -= 1;
        state.defeatedEntities += 1;
        ent.stunnedSteps = 6;
        ent.x = ent.homeX;
        ent.y = ent.homeY;
        state.score += 50;
        state.lastEvent = 'entity_defeated';
        state.lastMessage = '🔱 ヤーッ！！さすまたで黒い影をやっつけたぞ！ (+50pt)';
        return 'entity_defeated';
      } else {
        state.player.x = state.maze.start.x;
        state.player.y = state.maze.start.y;
        ent.x = ent.homeX;
        ent.y = ent.homeY;
        state.lastEvent = 'entity_caught';
        state.lastMessage = '👻 わわっ！黒い影にびっくりしてスタートに戻された！（アイテムはそのまま！）';
        return 'entity_caught';
      }
    }
  }
  return null;
}

/**
 * Move the player by (dx, dy) in the 2D Backrooms maze and process item/gimmick interactions.
 * @param {object} state
 * @param {number} dx
 * @param {number} dy
 * @returns {{ moved: boolean, event: string, state: object }}
 */
export function movePlayer(state, dx, dy) {
  if (!state || state.status !== 'playing') {
    return { moved: false, event: 'not_playing', state };
  }

  const stepDx = Math.sign(Number(dx) || 0);
  const stepDy = Math.sign(Number(dy) || 0);
  if ((stepDx === 0 && stepDy === 0) || (stepDx !== 0 && stepDy !== 0)) {
    return { moved: false, event: 'invalid_dir', state };
  }

  const nx = state.player.x + stepDx;
  const ny = state.player.y + stepDy;
  const { width, height, grid } = state.maze;

  if (nx < 0 || nx >= width || ny < 0 || ny >= height || grid[ny][nx] === TILE_TYPES.WALL) {
    state.lastEvent = 'wall';
    return { moved: false, event: 'wall', state };
  }

  // Record previous position for cute follower trail
  state.trail.unshift({ x: state.player.x, y: state.player.y });
  if (state.trail.length > 6) state.trail.pop();

  state.player.x = nx;
  state.player.y = ny;
  state.steps += 1;
  if (state.speedBoostSteps > 0) {
    state.speedBoostSteps -= 1;
  }

  let event = 'moved';
  const tile = grid[ny][nx];

  if (tile === TILE_TYPES.STAR) {
    grid[ny][nx] = TILE_TYPES.FLOOR;
    state.starsCollected += 1;
    state.score += 10;
    event = 'star';
    state.lastMessage = '⭐ お宝スターをゲット！ (+10pt)';
  } else if (tile === TILE_TYPES.SASUMATA) {
    grid[ny][nx] = TILE_TYPES.FLOOR;
    state.sasumataCount += 1;
    state.score += 20;
    event = 'sasumata';
    state.lastMessage = '🔱 さすまたを拾った！黒い影にぶつかっても「ヤーッ！」で退治できるぞ！';
  } else if (tile === TILE_TYPES.SNACK) {
    grid[ny][nx] = TILE_TYPES.FLOOR;
    state.speedBoostSteps += 8;
    state.score += 30;
    event = 'snack';
    state.lastMessage = '🍮 スピードアップおやつ！モグモグ…元気いっぱい (+30pt)！';
  } else if (tile === TILE_TYPES.WARP_A && state.maze.items.warpB) {
    const dest = state.maze.items.warpB;
    state.player.x = dest.x;
    state.player.y = dest.y;
    state.score += 15;
    event = 'warp';
    state.lastMessage = '🌀 秘密のワープ床！別のエリアへシュッと瞬間移動した！';
  } else if (tile === TILE_TYPES.WARP_B && state.maze.items.warpA) {
    const dest = state.maze.items.warpA;
    state.player.x = dest.x;
    state.player.y = dest.y;
    state.score += 15;
    event = 'warp';
    state.lastMessage = '🌀 秘密のワープ床！別のエリアへシュッと瞬間移動した！';
  } else if (tile === TILE_TYPES.FRIEND) {
    grid[ny][nx] = TILE_TYPES.FLOOR;
    state.rescuedFriend = true;
    state.score += 100;
    const friend = getCharacterById(state.rescueTargetId);
    event = 'friend_rescued';
    state.lastMessage = `🐾 ${friend.name}を救出した！後ろをトコトコついてくるよ！ (+100pt)`;
  } else if (tile === TILE_TYPES.KEY) {
    grid[ny][nx] = TILE_TYPES.FLOOR;
    state.hasKey = true;
    state.score += 50;
    event = 'key';
    state.lastMessage = '🔑 非常口のカギをゲット！緑に光る「🚪EXIT」へ向かおう！';
  } else if (tile === TILE_TYPES.EXIT) {
    if (state.hasKey) {
      state.status = 'escaped';
      state.score += 150 + (state.rescuedFriend ? 50 : 0);
      event = 'escaped';
      state.lastMessage = '🎉 非常口（EXIT）から脱出成功！！おめでとう！！';
    } else {
      event = 'exit_locked';
      state.lastMessage = '🚪 非常口だ！でもカギがかかっている…先に「🔑」を探そう！';
    }
  }

  state.lastEvent = event;

  // Check if player walked into an entity
  const colEvent = resolveEntityCollision(state);
  if (colEvent) {
    event = colEvent;
  }

  return { moved: true, event, state };
}

/**
 * Advance roaming shadow entities by 1 step in 'thrill' mode.
 * @param {object} state
 * @returns {{ event: string|null, state: object }}
 */
export function stepEntities(state) {
  if (!state || state.mode !== 'thrill' || state.status !== 'playing') {
    return { event: null, state };
  }

  const { width, height, grid } = state.maze;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (const ent of state.entities) {
    if (ent.stunnedSteps > 0) {
      ent.stunnedSteps -= 1;
      continue;
    }

    const validMoves = [];
    for (const [dx, dy] of dirs) {
      const nx = ent.x + dx;
      const ny = ent.y + dy;
      if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1) continue;
      if (grid[ny][nx] === TILE_TYPES.WALL) continue;
      // Don't camp right on start tile unless player is nearby
      const dToPlayer = Math.abs(nx - state.player.x) + Math.abs(ny - state.player.y);
      validMoves.push({ nx, ny, dToPlayer });
    }

    if (validMoves.length > 0) {
      // Gently bias toward player without being frustratingly relentless
      validMoves.sort((a, b) => a.dToPlayer - b.dToPlayer);
      const chosen = Math.random() < 0.65
        ? validMoves[0]
        : validMoves[Math.floor(Math.random() * validMoves.length)];
      ent.x = chosen.nx;
      ent.y = chosen.ny;
    }
  }

  const colEvent = resolveEntityCollision(state);
  return { event: colEvent, state };
}

/**
 * Interactive Backrooms 2D Maze Modal (ブラウザUIコンポーネント)
 */
export class BackroomsBonusModal {
  constructor(options = {}) {
    this.progress = options.progress || null;
    this.selectedCharacterId = options.selectedCharacterId
      || this.progress?.bonusGame?.selectedCharacterId
      || DEFAULT_CHARACTER_ID;
    this.unlockedCharacters = Array.isArray(options.unlockedCharacters)
      ? [...options.unlockedCharacters]
      : [...(this.progress?.bonusGame?.unlockedCharacters || INITIAL_UNLOCKED_CHARACTERS)];
    this.onComplete = options.onComplete || null;
    this.onOpenBook = options.onOpenBook || null;
    this.onClose = options.onClose || null;

    this.phase = 'select'; // 'select' | 'playing' | 'escaped'
    this.state = null;
    this.overlay = null;
    this.canvas = null;
    this.ctx = null;
    this.entityTimer = null;
    this._boundClick = null;
    this._boundKeyDown = null;
    this._boundCanvasClick = null;
  }

  open(target = null) {
    if (typeof document === 'undefined') return this;
    const mountParent = target || document.getElementById('modal-root') || document.body;
    if (!mountParent) return this;

    this.mountParent = mountParent;
    this.phase = 'select';
    this.renderModal();
    return this;
  }

  startGame(mode = 'easy') {
    this.clearTimers();
    this.state = createBonusGameState({
      mode,
      selectedCharacterId: this.selectedCharacterId,
      unlockedCharacters: this.unlockedCharacters,
      seed: Date.now() & 0xffff
    });
    this.phase = 'playing';
    SoundEffects.playSound('tap');
    this.renderModal();

    if (mode === 'thrill' && typeof setInterval === 'function') {
      this.entityTimer = setInterval(() => {
        if (this.phase !== 'playing' || !this.state) return;
        const { event } = stepEntities(this.state);
        if (event === 'entity_defeated') {
          SoundEffects.playSound('step_clear');
        } else if (event === 'entity_caught') {
          SoundEffects.playSound('near_miss');
        }
        this.updatePlayingUI();
      }, 950);
    }
  }

  handleMove(dx, dy) {
    if (this.phase !== 'playing' || !this.state) return;
    const stepsToTake = this.state.speedBoostSteps > 0 ? 1 : 1;
    for (let i = 0; i < stepsToTake; i++) {
      const res = movePlayer(this.state, dx, dy);
      if (!res.moved) {
        if (res.event === 'wall') SoundEffects.playSound('click');
        break;
      }
      if (res.event === 'star' || res.event === 'snack') {
        SoundEffects.playSound('stamp');
      } else if (res.event === 'sasumata' || res.event === 'key') {
        SoundEffects.playSound('correct');
      } else if (res.event === 'warp') {
        SoundEffects.playSound('step_clear');
      } else if (res.event === 'friend_rescued') {
        SoundEffects.playSound('badge');
        SoundEffects.playCuteVoice(this.state.rescueTargetId);
      } else if (res.event === 'entity_defeated') {
        SoundEffects.playSound('step_clear');
      } else if (res.event === 'entity_caught') {
        SoundEffects.playSound('near_miss');
      } else if (res.event === 'exit_locked') {
        SoundEffects.playSound('near_miss');
      } else if (res.event === 'escaped') {
        this.handleEscapeVictory();
        return;
      } else {
        SoundEffects.playSound('click');
      }
    }
    this.updatePlayingUI();
  }

  handleEscapeVictory() {
    this.clearTimers();
    this.phase = 'escaped';
    SoundEffects.playSound('stage_clear');
    SoundEffects.playSound('badge');

    const rescuedId = this.state.rescuedFriend ? this.state.rescueTargetId : null;
    if (rescuedId && !this.unlockedCharacters.includes(rescuedId)) {
      this.unlockedCharacters.push(rescuedId);
    }

    if (typeof this.onComplete === 'function') {
      this.onComplete({
        score: this.state.score,
        starsCollected: this.state.starsCollected,
        rescuedCharacterId: rescuedId,
        mode: this.state.mode
      });
    }

    this.renderModal();
  }

  renderModal() {
    if (!this.mountParent || typeof document === 'undefined') return;
    this.cleanupDomListeners();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open backrooms-overlay';

    const card = document.createElement('div');
    card.className = 'modal-card backrooms-modal-card';

    const playerChar = getCharacterById(this.selectedCharacterId);
    const targetChar = getCharacterById(
      this.state?.rescueTargetId || pickRescueTargetCharacter(this.unlockedCharacters)
    );

    if (this.phase === 'select') {
      card.innerHTML = `
        <div class="modal-header backrooms-header">
          <h2 class="modal-title">🟨 バックルームたんけんボーナス！</h2>
          <button type="button" class="icon-btn btn-close-backrooms" aria-label="閉じる">✕</button>
        </div>
        <div class="modal-body backrooms-select-body">
          <div class="backrooms-intro-banner">
            <div class="backrooms-intro-chars">
              <div class="backrooms-char-preview">
                ${renderCharacterSvg(playerChar.id, 'happy', 76)}
                <span>探検: ${playerChar.name}</span>
              </div>
              <div style="font-size:1.6rem;">➡️</div>
              <div class="backrooms-char-preview">
                ${renderCharacterSvg(targetChar.id, 'cheer', 76)}
                <span>迷子: ${targetChar.name}</span>
              </div>
            </div>
            <p class="backrooms-intro-text">
              黄色い壁紙の不思議な迷路（バックルーム）へ出発だ！<br />
              <strong>🔑 カギ</strong>と<strong>🐾 ${targetChar.name}</strong>を見つけて<strong>🚪 非常口（EXIT）</strong>から脱出しよう！（算数の問題はないよ♪）
            </p>
          </div>

          <div class="backrooms-item-legend">
            <span>🔱 さすまた：黒い影を1回「ヤーッ！」で撃退</span>
            <span>🍮 おやつ：スピードアップ＆ボーナス</span>
            <span>🌀 ワープ床：別の部屋へ瞬間移動</span>
          </div>

          <div class="backrooms-mode-grid">
            <button type="button" class="btn backrooms-mode-btn easy btn-start-easy">
              <span style="font-size:2rem;">🌱</span>
              <strong>やさしいモード</strong>
              <small>お化けなし！のんびり迷路探検</small>
            </button>
            <button type="button" class="btn backrooms-mode-btn thrill btn-start-thrill">
              <span style="font-size:2rem;">👻</span>
              <strong>ドキドキモード</strong>
              <small>黒い影がウロウロ！🔱さすまたで退治だ！</small>
            </button>
          </div>
        </div>
      `;
    } else if (this.phase === 'playing' && this.state) {
      const modeBadge = this.state.mode === 'thrill' ? '👻 ドキドキ' : '🌱 やさしい';
      card.innerHTML = `
        <div class="modal-header backrooms-header">
          <h2 class="modal-title">🟨 バックルーム (${modeBadge})</h2>
          <button type="button" class="icon-btn btn-close-backrooms" aria-label="やめる">✕</button>
        </div>
        <div class="modal-body backrooms-play-body">
          <div class="backrooms-hud" id="backrooms-hud"></div>
          <div class="backrooms-status-msg" id="backrooms-status-msg">${this.state.lastMessage}</div>
          <div class="backrooms-stage-layout">
            <div class="backrooms-canvas-wrap">
              <canvas class="backrooms-canvas" width="396" height="396"></canvas>
            </div>
            <div class="backrooms-controls">
              <div class="backrooms-dpad">
                <div></div>
                <button type="button" class="btn dpad-btn" data-dx="0" data-dy="-1" aria-label="上へ">▲</button>
                <div></div>
                <button type="button" class="btn dpad-btn" data-dx="-1" data-dy="0" aria-label="左へ">◀</button>
                <div class="dpad-center">${renderCharacterSvg(playerChar.id, 'normal', 40)}</div>
                <button type="button" class="btn dpad-btn" data-dx="1" data-dy="0" aria-label="右へ">▶</button>
                <div></div>
                <button type="button" class="btn dpad-btn" data-dx="0" data-dy="1" aria-label="下へ">▼</button>
                <div></div>
              </div>
              <p class="backrooms-hint-small">矢印キー / WASD / 迷路タップでも移動できるよ！</p>
            </div>
          </div>
        </div>
      `;
    } else if (this.phase === 'escaped' && this.state) {
      const friend = getCharacterById(this.state.rescueTargetId);
      card.innerHTML = `
        <div class="modal-header backrooms-header">
          <h2 class="modal-title">🎉 バックルーム脱出成功！！</h2>
          <button type="button" class="icon-btn btn-close-backrooms" aria-label="閉じる">✕</button>
        </div>
        <div class="modal-body backrooms-result-body">
          <div class="backrooms-victory-chars">
            ${renderCharacterSvg(playerChar.id, 'happy', 84)}
            ${this.state.rescuedFriend ? renderCharacterSvg(friend.id, 'happy', 84) : ''}
          </div>
          <h3 style="font-size:1.4rem; color:#fef08a; margin:10px 0;">
            ${this.state.rescuedFriend
              ? `🐾 「${friend.name}」を救出しておともだち図鑑に登録したよ！`
              : '🚪 無事に非常口から脱出したよ！'}
          </h3>
          <div class="backrooms-result-stats">
            <div>⭐ お宝スター: <strong>${this.state.starsCollected}コ</strong></div>
            <div>🏆 ボーナス得点: <strong>+${this.state.score} pt</strong></div>
            ${this.state.defeatedEntities > 0 ? `<div>🔱 撃退した影: <strong>${this.state.defeatedEntities}回</strong></div>` : ''}
          </div>
          <div class="backrooms-result-actions">
            ${this.state.rescuedFriend
              ? `<button type="button" class="btn btn-accent btn-switch-to-rescued" data-char-id="${friend.id}">💖 ${friend.name}を応援相棒にする！</button>`
              : ''}
            <button type="button" class="btn btn-primary btn-open-charbook-after">🐾 おともだち図鑑を見る</button>
            <button type="button" class="btn btn-secondary btn-close-backrooms">🗺️ マップへ戻る</button>
          </div>
        </div>
      `;
    }

    this._boundClick = (e) => {
      if (e.target === overlay || e.target.closest?.('.btn-close-backrooms')) {
        SoundEffects.playSound('tap');
        this.close(true);
        return;
      }
      if (e.target.closest?.('.btn-start-easy')) {
        this.startGame('easy');
        return;
      }
      if (e.target.closest?.('.btn-start-thrill')) {
        this.startGame('thrill');
        return;
      }
      const dpadBtn = e.target.closest?.('.dpad-btn');
      if (dpadBtn) {
        const dx = Number(dpadBtn.dataset.dx || 0);
        const dy = Number(dpadBtn.dataset.dy || 0);
        this.handleMove(dx, dy);
        return;
      }
      const switchBtn = e.target.closest?.('.btn-switch-to-rescued');
      if (switchBtn) {
        const cid = switchBtn.dataset.charId;
        if (cid && this.progress?.bonusGame) {
          this.progress.bonusGame.selectedCharacterId = cid;
        }
        SoundEffects.playCuteVoice(cid);
        this.close(true);
        return;
      }
      if (e.target.closest?.('.btn-open-charbook-after')) {
        SoundEffects.playSound('tap');
        this.close(false);
        if (typeof this.onOpenBook === 'function') {
          this.onOpenBook();
        }
      }
    };

    overlay.addEventListener('click', this._boundClick);
    overlay.appendChild(card);

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.replaceChild(overlay, this.overlay);
    } else {
      this.mountParent.appendChild(overlay);
    }
    this.overlay = overlay;

    if (this.phase === 'playing') {
      this.canvas = overlay.querySelector('.backrooms-canvas');
      if (this.canvas && typeof this.canvas.getContext === 'function') {
        this.ctx = this.canvas.getContext('2d');
      }
      if (this.canvas && typeof this.canvas.addEventListener === 'function') {
        this._boundCanvasClick = (e) => this.handleCanvasTap(e);
        this.canvas.addEventListener('click', this._boundCanvasClick);
      }
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        this._boundKeyDown = (e) => this.handleKeyDown(e);
        window.addEventListener('keydown', this._boundKeyDown);
      }
      this.updatePlayingUI();
    }
  }

  handleKeyDown(e) {
    if (this.phase !== 'playing') return;
    const key = e.key;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      e.preventDefault?.();
      this.handleMove(0, -1);
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      e.preventDefault?.();
      this.handleMove(0, 1);
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      e.preventDefault?.();
      this.handleMove(-1, 0);
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      e.preventDefault?.();
      this.handleMove(1, 0);
    }
  }

  handleCanvasTap(e) {
    if (!this.canvas || !this.state || this.phase !== 'playing') return;
    const rect = this.canvas.getBoundingClientRect();
    const cellW = rect.width / this.state.maze.width;
    const cellH = rect.height / this.state.maze.height;
    const tapX = Math.floor((e.clientX - rect.left) / cellW);
    const tapY = Math.floor((e.clientY - rect.top) / cellH);
    const dx = tapX - this.state.player.x;
    const dy = tapY - this.state.player.y;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
      this.handleMove(Math.sign(dx), 0);
    } else if (dy !== 0) {
      this.handleMove(0, Math.sign(dy));
    }
  }

  updatePlayingUI() {
    if (!this.overlay || !this.state) return;
    const hud = this.overlay.querySelector('#backrooms-hud');
    if (hud) {
      hud.innerHTML = `
        <span class="hud-pill ${this.state.hasKey ? 'active' : ''}">🔑 カギ: ${this.state.hasKey ? 'GET!' : '未'}</span>
        <span class="hud-pill ${this.state.rescuedFriend ? 'active' : ''}">🐾 仲間: ${this.state.rescuedFriend ? '救出!' : '捜索中'}</span>
        <span class="hud-pill ${this.state.sasumataCount > 0 ? 'active' : ''}">🔱 さすまた: ${this.state.sasumataCount}</span>
        ${this.state.speedBoostSteps > 0 ? `<span class="hud-pill active">🍮 加速:${this.state.speedBoostSteps}</span>` : ''}
        <span class="hud-pill">⭐ ${this.state.score}pt</span>
      `;
    }
    const msgEl = this.overlay.querySelector('#backrooms-status-msg');
    if (msgEl) {
      msgEl.textContent = this.state.lastMessage;
    }
    this.drawMaze();
  }

  drawMaze() {
    if (!this.ctx || !this.canvas || !this.state) return;
    const ctx = this.ctx;
    const { width: cols, height: rows, grid } = this.state.maze;
    const cw = this.canvas.width / cols;
    const ch = this.canvas.height / rows;

    // 1. Backrooms yellow carpet & subtle wallpaper grid
    ctx.fillStyle = '#d9c973';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * cw;
        const py = y * ch;
        const tile = grid[y][x];

        if (tile === TILE_TYPES.WALL) {
          // Backrooms iconic yellow striped wallpaper wall
          ctx.fillStyle = '#8b7a2c';
          ctx.fillRect(px, py, cw, ch);
          ctx.fillStyle = '#a3913b';
          ctx.fillRect(px + 2, py + 2, cw - 4, ch - 6);
          ctx.fillStyle = '#756621';
          ctx.fillRect(px + 6, py + 2, 3, ch - 6);
          ctx.fillRect(px + cw - 10, py + 2, 3, ch - 6);
        } else {
          // Carpet tile seam
          ctx.fillStyle = (x + y) % 2 === 0 ? '#e3d586' : '#d6c672';
          ctx.fillRect(px, py, cw, ch);
        }

        // Tile icons
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${Math.floor(cw * 0.62)}px sans-serif`;

        if (tile === TILE_TYPES.EXIT) {
          ctx.fillStyle = this.state.hasKey ? '#10b981' : '#334155';
          ctx.fillRect(px + 3, py + 3, cw - 6, ch - 6);
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.floor(cw * 0.28)}px sans-serif`;
          ctx.fillText('EXIT', px + cw / 2, py + ch * 0.72);
          ctx.font = `${Math.floor(cw * 0.45)}px sans-serif`;
          ctx.fillText(this.state.hasKey ? '🚪' : '🔒', px + cw / 2, py + ch * 0.36);
        } else if (tile === TILE_TYPES.KEY) {
          ctx.fillText('🔑', px + cw / 2, py + ch / 2);
        } else if (tile === TILE_TYPES.FRIEND) {
          ctx.fillStyle = '#fce7f3';
          ctx.beginPath?.();
          ctx.arc?.(px + cw / 2, py + ch / 2, cw * 0.36, 0, Math.PI * 2);
          ctx.fill?.();
          ctx.fillText('🐾', px + cw / 2, py + ch / 2);
        } else if (tile === TILE_TYPES.SASUMATA) {
          ctx.fillText('🔱', px + cw / 2, py + ch / 2);
        } else if (tile === TILE_TYPES.SNACK) {
          ctx.fillText('🍮', px + cw / 2, py + ch / 2);
        } else if (tile === TILE_TYPES.WARP_A || tile === TILE_TYPES.WARP_B) {
          ctx.fillStyle = 'rgba(139, 92, 246, 0.32)';
          ctx.fillRect(px + 3, py + 3, cw - 6, ch - 6);
          ctx.fillText('🌀', px + cw / 2, py + ch / 2);
        } else if (tile === TILE_TYPES.STAR) {
          ctx.fillText('⭐', px + cw / 2, py + ch / 2);
        }
      }
    }

    // 2. Draw rescued friend following right behind player!
    if (this.state.rescuedFriend && this.state.trail.length > 0) {
      const followPos = this.state.trail[0];
      const friend = getCharacterById(this.state.rescueTargetId);
      const fx = followPos.x * cw + cw / 2;
      const fy = followPos.y * ch + ch / 2;
      ctx.fillStyle = friend.bodyColor;
      ctx.beginPath?.();
      ctx.arc?.(fx, fy, cw * 0.3, 0, Math.PI * 2);
      ctx.fill?.();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke?.();
      ctx.font = `${Math.floor(cw * 0.36)}px sans-serif`;
      ctx.fillText('💕', fx, fy - cw * 0.32);
    }

    // 3. Draw shadow entities in thrill mode
    if (this.state.mode === 'thrill') {
      for (const ent of this.state.entities) {
        if (ent.stunnedSteps > 0) continue;
        const ex = ent.x * cw + cw / 2;
        const ey = ent.y * ch + ch / 2;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath?.();
        ctx.arc?.(ex, ey, cw * 0.36, 0, Math.PI * 2);
        ctx.fill?.();
        ctx.font = `${Math.floor(cw * 0.5)}px sans-serif`;
        ctx.fillText('👻', ex, ey);
      }
    }

    // 4. Draw cute player character avatar
    const pChar = getCharacterById(this.state.selectedCharacterId);
    const px = this.state.player.x * cw + cw / 2;
    const py = this.state.player.y * ch + ch / 2;

    // Soft fluorescent halo around player
    ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
    ctx.beginPath?.();
    ctx.arc?.(px, py, cw * 0.48, 0, Math.PI * 2);
    ctx.fill?.();

    // Ears + head
    ctx.fillStyle = pChar.earColor;
    ctx.beginPath?.();
    ctx.arc?.(px - cw * 0.18, py - cw * 0.22, cw * 0.12, 0, Math.PI * 2);
    ctx.arc?.(px + cw * 0.18, py - cw * 0.22, cw * 0.12, 0, Math.PI * 2);
    ctx.fill?.();

    ctx.fillStyle = pChar.bodyColor;
    ctx.beginPath?.();
    ctx.arc?.(px, py, cw * 0.34, 0, Math.PI * 2);
    ctx.fill?.();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.2;
    ctx.stroke?.();

    // Cheeks + eyes
    ctx.fillStyle = pChar.cheekColor;
    ctx.beginPath?.();
    ctx.arc?.(px - cw * 0.16, py + cw * 0.05, cw * 0.06, 0, Math.PI * 2);
    ctx.arc?.(px + cw * 0.16, py + cw * 0.05, cw * 0.06, 0, Math.PI * 2);
    ctx.fill?.();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath?.();
    ctx.arc?.(px - cw * 0.1, py - cw * 0.03, cw * 0.045, 0, Math.PI * 2);
    ctx.arc?.(px + cw * 0.1, py - cw * 0.03, cw * 0.045, 0, Math.PI * 2);
    ctx.fill?.();

    if (this.state.sasumataCount > 0) {
      ctx.font = `${Math.floor(cw * 0.38)}px sans-serif`;
      ctx.fillText('🔱', px + cw * 0.32, py - cw * 0.26);
    }
  }

  clearTimers() {
    if (this.entityTimer) {
      clearInterval(this.entityTimer);
      this.entityTimer = null;
    }
  }

  cleanupDomListeners() {
    if (this.overlay && this._boundClick) {
      this.overlay.removeEventListener('click', this._boundClick);
    }
    this._boundClick = null;

    if (this.canvas && this._boundCanvasClick) {
      this.canvas.removeEventListener('click', this._boundCanvasClick);
    }
    this._boundCanvasClick = null;

    if (this._boundKeyDown && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('keydown', this._boundKeyDown);
    }
    this._boundKeyDown = null;
  }

  close(triggerCallback = true) {
    this.clearTimers();
    this.cleanupDomListeners();
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.canvas = null;
    this.ctx = null;
    if (triggerCallback && typeof this.onClose === 'function') {
      this.onClose();
    }
  }

  destroy() {
    this.close(false);
  }
}

export default {
  TILE_TYPES,
  computeReachableDistances,
  generateBackroomsMaze,
  pickRescueTargetCharacter,
  createBonusGameState,
  resolveEntityCollision,
  movePlayer,
  stepEntities,
  BackroomsBonusModal
};
