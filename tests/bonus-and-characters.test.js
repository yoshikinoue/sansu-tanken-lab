/**
 * tests/bonus-and-characters.test.js
 * Unit & Integration Tests for:
 * - Chiikawa-style Cute Characters & Character Book (Default: Momonga / ももんちゃん)
 * - 4-Color Stationery CanvasPad with Partner Watermark
 * - Backrooms 2D Action Maze Bonus Game (Easy & Thrill Modes, Zero Math)
 * - StorageService bonusGame Persistence & MathLabApp Integration
 * - Standalone sansu_tanken_lab.html Bundle Integrity
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_CHARACTER_ID,
  INITIAL_UNLOCKED_CHARACTERS,
  CUTE_CHARACTERS,
  getCharacterById,
  getCharacterQuote,
  renderCharacterSvg,
  MascotCompanionWidget,
  CharacterBookModal
} from '../src/components/cute-characters.js';

import {
  TILE_TYPES,
  computeReachableDistances,
  generateBackroomsMaze,
  pickRescueTargetCharacter,
  createBonusGameState,
  movePlayer,
  stepEntities,
  resolveEntityCollision,
  BackroomsBonusModal
} from '../src/components/backrooms-bonus.js';

import CanvasPad, {
  PEN_COLORS,
  createPadState,
  setStrokeColor,
  startStroke,
  moveStroke,
  endStroke,
  undo,
  clear
} from '../src/components/canvas-pad.js';

import * as StorageService from '../src/services/storage-service.js';
import * as SoundEffects from '../src/services/sound-effects.js';
import { MathLabApp } from '../src/main.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

describe('Bonus Game (Backrooms) & Cute Characters (Momonga Default)', () => {
  // =========================================================================
  // 1. Cute Characters & Momonga Default
  // =========================================================================
  describe('1. Cute Characters System & Momonga Default', () => {
    it('sets Momonga (ももんちゃん) as the default partner character with 3 initial unlocked chars', () => {
      assert.equal(DEFAULT_CHARACTER_ID, 'momonga');
      assert.deepEqual(INITIAL_UNLOCKED_CHARACTERS, ['momonga', 'marupi', 'hachiwaren']);
      assert.equal(CUTE_CHARACTERS.length, 8);

      const momonga = getCharacterById('momonga');
      assert.equal(momonga.id, 'momonga');
      assert.equal(momonga.name, 'ももんちゃん');
      assert.ok(momonga.quotes.cheer.some((q) => q.includes('なんとかなれ')));
      assert.ok(momonga.quotes.happy.some((q) => q.includes('ほめろ')));
    });

    it('renders valid inline SVG for all 8 characters across all moods', () => {
      const moods = ['normal', 'focus', 'cheer', 'happy', 'surprised', 'selfCorrect'];
      for (const ch of CUTE_CHARACTERS) {
        for (const mood of moods) {
          const svg = renderCharacterSvg(ch.id, mood, 64);
          assert.ok(svg.startsWith('<svg '), `Missing <svg> start for ${ch.id}/${mood}`);
          assert.ok(svg.endsWith('</svg>'), `Missing </svg> end for ${ch.id}/${mood}`);
          assert.ok(svg.includes(`data-char-id="${ch.id}"`));
        }
      }
    });

    it('returns mood-appropriate quotes and falls back cleanly for unknown IDs', () => {
      const unknown = getCharacterById('non-existent');
      assert.equal(unknown.id, 'momonga');
      const q = getCharacterQuote('momonga', 'cheer', 0);
      assert.ok(typeof q === 'string' && q.length > 0);
    });

    it('MascotCompanionWidget initializes in headless mode and switches characters/moods cleanly', () => {
      const widget = new MascotCompanionWidget({
        selectedCharacterId: 'momonga',
        unlockedCharacters: ['momonga', 'marupi', 'hachiwaren']
      });
      assert.equal(widget.characterId, 'momonga');
      widget.setMood('cheer');
      assert.equal(widget.mood, 'cheer');
      widget.setCharacter('hachiwaren');
      assert.equal(widget.characterId, 'hachiwaren');
      widget.destroy();
    });

    it('playCuteVoice handles headless / muted environments without throwing', () => {
      SoundEffects.resetAudioEngine();
      const res = SoundEffects.playCuteVoice('momonga');
      assert.equal(res.played, false);
    });
  });

  // =========================================================================
  // 2. CanvasPad 4-Color Stationery Upgrade
  // =========================================================================
  describe('2. CanvasPad 4-Color Pens & Watermark', () => {
    it('exports 4 cute pen colors and tracks strokeColors alongside plain strokes', () => {
      assert.equal(PEN_COLORS.length, 4);
      const pad = createPadState();
      assert.equal(pad.strokeColor, '#38bdf8');
      assert.equal(pad.watermarkCharacterId, 'momonga');
      assert.deepEqual(pad.strokeColors, []);

      setStrokeColor(pad, '#f472b6');
      startStroke(pad, 10, 10);
      moveStroke(pad, 20, 20);
      endStroke(pad);

      setStrokeColor(pad, '#facc15');
      startStroke(pad, 30, 30);
      endStroke(pad);

      assert.equal(pad.strokes.length, 2);
      assert.deepEqual(pad.strokes[1], [{ x: 30, y: 30 }]);
      assert.deepEqual(pad.strokeColors, ['#f472b6', '#facc15']);

      undo(pad);
      assert.equal(pad.strokes.length, 1);
      assert.deepEqual(pad.strokeColors, ['#f472b6']);

      clear(pad);
      assert.deepEqual(pad.strokes, []);
      assert.deepEqual(pad.strokeColors, []);
    });

    it('updates watermarkCharacterId on CanvasPad instance', () => {
      const cp = new CanvasPad({ watermarkCharacterId: 'momonga' });
      assert.equal(cp.state.watermarkCharacterId, 'momonga');
      cp.setWatermarkCharacter('marupi');
      assert.equal(cp.state.watermarkCharacterId, 'marupi');
      cp.setStrokeColor('#34d399');
      assert.equal(cp.state.strokeColor, '#34d399');
    });
  });

  // =========================================================================
  // 3. Backrooms 2D Maze Bonus Game
  // =========================================================================
  describe('3. Backrooms 2D Action Maze Bonus Game (Easy & Thrill)', () => {
    it('generates a connected maze with guaranteed BFS reachability to Key, Friend, Sasumata, Snack, Warps, and Exit', () => {
      for (const seed of [1, 7, 42, 99]) {
        const maze = generateBackroomsMaze({ width: 11, height: 11, seed });
        const dist = computeReachableDistances(maze.grid, maze.start);

        assert.ok(dist.has(`${maze.exit.x},${maze.exit.y}`), `Exit unreachable for seed ${seed}`);
        assert.ok(maze.items.key && dist.has(`${maze.items.key.x},${maze.items.key.y}`), `Key unreachable for seed ${seed}`);
        assert.ok(maze.items.friend && dist.has(`${maze.items.friend.x},${maze.items.friend.y}`), `Friend unreachable for seed ${seed}`);
        assert.ok(maze.items.sasumata && dist.has(`${maze.items.sasumata.x},${maze.items.sasumata.y}`), `Sasumata unreachable for seed ${seed}`);
        assert.ok(maze.items.snack && dist.has(`${maze.items.snack.x},${maze.items.snack.y}`), `Snack unreachable for seed ${seed}`);
        assert.ok(maze.items.warpA && dist.has(`${maze.items.warpA.x},${maze.items.warpA.y}`), `WarpA unreachable for seed ${seed}`);
        assert.ok(maze.items.warpB && dist.has(`${maze.items.warpB.x},${maze.items.warpB.y}`), `WarpB unreachable for seed ${seed}`);
      }
    });

    it('supports Easy mode (0 entities) and Thrill mode (entity active)', () => {
      const easy = createBonusGameState({ mode: 'easy', selectedCharacterId: 'momonga', seed: 12 });
      assert.equal(easy.mode, 'easy');
      assert.equal(easy.entities.length, 0);
      assert.equal(easy.selectedCharacterId, 'momonga');

      const thrill = createBonusGameState({ mode: 'thrill', selectedCharacterId: 'momonga', seed: 12 });
      assert.equal(thrill.mode, 'thrill');
      assert.equal(thrill.entities.length, 1);
      assert.equal(pickRescueTargetCharacter(['momonga', 'marupi', 'hachiwaren']), 'usapyon');
    });

    it('processes items, warp teleport, friend rescue, key lock/unlock, and exit escape without any math quiz', () => {
      // Construct a clean deterministic 5x5 floor corridor maze for exact step testing
      const grid = [
        [1, 1, 1, 1, 1, 1, 1],
        [1, 2, 10, 6, 7, 8, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 9, 5, 4, 3, 0, 1],
        [1, 1, 1, 1, 1, 1, 1]
      ];
      const customMaze = {
        width: 7,
        height: 5,
        grid,
        start: { x: 1, y: 1 },
        exit: { x: 4, y: 3 },
        items: {
          star: { x: 2, y: 1 },
          sasumata: { x: 3, y: 1 },
          snack: { x: 4, y: 1 },
          warpA: { x: 5, y: 1 },
          warpB: { x: 1, y: 3 },
          friend: { x: 2, y: 3 },
          key: { x: 3, y: 3 }
        }
      };

      const state = createBonusGameState({ mode: 'easy', maze: customMaze });

      // Walk into wall -> blocked
      assert.equal(movePlayer(state, 0, -1).event, 'wall');

      // Pick up STAR
      assert.equal(movePlayer(state, 1, 0).event, 'star');
      assert.equal(state.starsCollected, 1);

      // Pick up SASUMATA
      assert.equal(movePlayer(state, 1, 0).event, 'sasumata');
      assert.equal(state.sasumataCount, 1);

      // Pick up SNACK
      assert.equal(movePlayer(state, 1, 0).event, 'snack');
      assert.ok(state.speedBoostSteps > 0);

      // Step onto WARP_A -> teleports to WARP_B (1, 3)
      assert.equal(movePlayer(state, 1, 0).event, 'warp');
      assert.deepEqual(state.player, { x: 1, y: 3 });

      // Rescue FRIEND
      assert.equal(movePlayer(state, 1, 0).event, 'friend_rescued');
      assert.equal(state.rescuedFriend, true);

      // Pick up KEY
      assert.equal(movePlayer(state, 1, 0).event, 'key');
      assert.equal(state.hasKey, true);

      // Reach EXIT with key -> escaped!
      assert.equal(movePlayer(state, 1, 0).event, 'escaped');
      assert.equal(state.status, 'escaped');
    });

    it('blocks EXIT until KEY is collected', () => {
      const grid = [
        [1, 1, 1, 1],
        [1, 2, 3, 1],
        [1, 1, 1, 1]
      ];
      const state = createBonusGameState({
        mode: 'easy',
        maze: { width: 4, height: 3, grid, start: { x: 1, y: 1 }, exit: { x: 2, y: 1 }, items: {} }
      });
      const res = movePlayer(state, 1, 0);
      assert.equal(res.event, 'exit_locked');
      assert.equal(state.status, 'playing');
    });

    it('defeats shadow entity with Sasumata ("ヤーッ！"), or pushes player back to start when unarmed', () => {
      const grid = [
        [1, 1, 1, 1, 1],
        [1, 2, 0, 0, 1],
        [1, 1, 1, 1, 1]
      ];
      const state = createBonusGameState({
        mode: 'thrill',
        maze: { width: 5, height: 3, grid, start: { x: 1, y: 1 }, exit: { x: 3, y: 1 }, items: {} }
      });

      // Armed with 1 sasumata -> defeats entity
      state.sasumataCount = 1;
      state.entities = [{ id: 's1', x: 2, y: 1, homeX: 3, homeY: 1, stunnedSteps: 0 }];
      const resWin = movePlayer(state, 1, 0);
      assert.equal(resWin.event, 'entity_defeated');
      assert.equal(state.sasumataCount, 0);
      assert.equal(state.defeatedEntities, 1);
      assert.ok(state.lastMessage.includes('ヤーッ'));

      // Unarmed -> startled and returned to start (1, 1)
      state.entities = [{ id: 's1', x: 3, y: 1, homeX: 3, homeY: 1, stunnedSteps: 0 }];
      movePlayer(state, 1, 0); // now at (3, 1) where entity is!
      assert.equal(state.lastEvent, 'entity_caught');
      assert.deepEqual(state.player, { x: 1, y: 1 });
    });
  });

  // =========================================================================
  // 4. StorageService & MathLabApp Integration
  // =========================================================================
  describe('4. StorageService bonusGame & MathLabApp Integration', () => {
    it('initializes and normalizes bonusGame with Momonga as default partner and 1 initial ticket', () => {
      const def = StorageService.createDefaultProgress();
      assert.equal(def.bonusGame.selectedCharacterId, 'momonga');
      assert.equal(def.bonusGame.tickets, 1);
      assert.deepEqual(def.bonusGame.unlockedCharacters, ['momonga', 'marupi', 'hachiwaren']);

      // Normalizing legacy v1 progress without bonusGame fills safe defaults
      const legacy = {
        schemaVersion: '1.0.0',
        userProfile: { userName: 'テスト' }
      };
      const normalized = StorageService.normalizeProgressData(legacy);
      assert.equal(normalized.bonusGame.selectedCharacterId, 'momonga');
      assert.equal(normalized.bonusGame.tickets, 1);
      assert.ok(normalized.bonusGame.unlockedCharacters.includes('momonga'));
    });

    it('MathLabApp.setSelectedCharacter switches partner character and persists state', () => {
      const app = new MathLabApp();
      app.progress = StorageService.createDefaultProgress();
      assert.equal(app.progress.bonusGame.selectedCharacterId, 'momonga');

      app.setSelectedCharacter('marupi');
      assert.equal(app.progress.bonusGame.selectedCharacterId, 'marupi');
    });
  });

  // =========================================================================
  // 5. Standalone sansu_tanken_lab.html Bundle Verification
  // =========================================================================
  describe('5. Standalone sansu_tanken_lab.html Bundle Integrity', () => {
    it('contains valid bundled JavaScript with cute-characters and backrooms-bonus modules', () => {
      const htmlPath = path.join(ROOT_DIR, 'sansu_tanken_lab.html');
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(html.includes("__mods['components/cute-characters.js']"));
      assert.ok(html.includes("__mods['components/backrooms-bonus.js']"));
      assert.ok(html.includes('btn-nav-charbook'));
      assert.ok(html.includes('btn-nav-bonus'));

      const scriptMatch = html.match(/<!-- Bundled Standalone Application Script -->\s*<script>([\s\S]*?)<\/script>/);
      assert.ok(scriptMatch, 'Expected bundled script block in sansu_tanken_lab.html');

      // Verify clean syntax & headless execution inside a sandboxed VM
      const sandbox = { console, setTimeout, clearTimeout, setInterval, clearInterval, Math, Date, JSON, Array, Object, Set, Map, Number, String, Boolean, Error, TypeError, Promise };
      vm.createContext(sandbox);
      vm.runInContext(scriptMatch[1], sandbox);
    });
  });
});
