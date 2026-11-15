/**
 * src/components/canvas-pad.js
 * 算数探検ラボ - 手書き計算メモパッド (CanvasPad)
 *
 * Dual capability:
 * 1. Pure state management functions for headless Node.js test environment
 * 2. Interactive DOM CanvasPad class for tablet browser with HiDPI DPR scaling,
 *    pointer events, smooth stroke drawing, and math grid / column guides.
 */

import { DEFAULT_CHARACTER_ID, renderCharacterSvg } from './cute-characters.js';

export const PEN_COLORS = [
  { id: 'cyan', color: '#38bdf8', label: 'みずいろ' },
  { id: 'pink', color: '#f472b6', label: 'ももいろ' },
  { id: 'yellow', color: '#facc15', label: 'きいろ' },
  { id: 'mint', color: '#34d399', label: 'ミント' }
];

// --- PURE STATE MANAGEMENT FUNCTIONS (HEADLESS COMPATIBLE) ---

export function createPadState(options = {}) {
  const dpr = (typeof options.dpr === 'number')
    ? options.dpr
    : (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 2;

  return {
    dpr,
    gridMode: options.gridMode || 'none', // 'none' | 'grid' | 'column'
    strokeColor: options.strokeColor || '#38bdf8',
    strokeColors: [],
    watermarkCharacterId: options.watermarkCharacterId || DEFAULT_CHARACTER_ID,
    strokes: [],
    currentStroke: null,
    width: options.width || 600,
    height: options.height || 400
  };
}

export function setStrokeColor(state, color) {
  if (typeof color === 'string' && color.trim().length > 0) {
    state.strokeColor = color;
  }
  return state;
}

export function setGridMode(state, mode) {
  if (mode === 'none' || mode === 'grid' || mode === 'column') {
    state.gridMode = mode;
  }
  return state;
}

export function startStroke(state, x, y) {
  state.currentStroke = [{ x: Number(x), y: Number(y) }];
  return state;
}

export function moveStroke(state, x, y) {
  if (state.currentStroke) {
    state.currentStroke.push({ x: Number(x), y: Number(y) });
  }
  return state;
}

export function endStroke(state) {
  if (state.currentStroke && state.currentStroke.length > 0) {
    state.strokes.push([...state.currentStroke]);
    if (!Array.isArray(state.strokeColors)) {
      state.strokeColors = [];
    }
    state.strokeColors.push(state.strokeColor || '#38bdf8');
  }
  state.currentStroke = null;
  return state;
}

export function undo(state) {
  if (Array.isArray(state.strokeColors) && state.strokeColors.length > 0) {
    state.strokeColors.pop();
  }
  return state.strokes.pop();
}

export function clear(state) {
  state.strokes = [];
  state.strokeColors = [];
  state.currentStroke = null;
  return state;
}

// --- DOM CONTROLLER CLASS FOR BROWSER RUNTIME ---

export class CanvasPad {
  constructor(options = {}) {
    this.options = {
      strokeColor: '#38bdf8', // accent cyan lab chalk
      lineWidth: 3,
      gridCellSize: 28,
      columnWidth: 44,
      ...options
    };

    this.state = createPadState(options);
    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.toolbar = null;
    this.resizeObserver = null;
    this._boundPointerDown = null;
    this._boundPointerMove = null;
    this._boundPointerUp = null;
    this._boundPointerCancel = null;
    this._boundToolbarClick = null;
    this._onStrokeChange = options.onStrokeChange || null;
    this._onDrawStart = options.onDrawStart || null;
  }

  mount(target) {
    if (typeof document === 'undefined') return this;
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) return this;

    this.container = container;
    this.render();
    this.setupEvents();
    this.resize();
    return this;
  }

  render() {
    const colorBtnsHtml = PEN_COLORS.map((c) => `
      <button type="button" class="pen-color-btn ${this.state.strokeColor === c.color ? 'active' : ''}" data-color="${c.color}" title="${c.label}ペン" aria-label="${c.label}ペン" style="background:${c.color};"></button>
    `).join('');

    this.container.innerHTML = `
      <div class="canvas-pad-container">
        <div class="canvas-toolbar">
          <div class="toolbar-group">
            <button type="button" class="btn btn-sm btn-outline grid-btn ${this.state.gridMode === 'none' ? 'active' : ''}" data-grid="none">無地</button>
            <button type="button" class="btn btn-sm btn-outline grid-btn ${this.state.gridMode === 'grid' ? 'active' : ''}" data-grid="grid">方眼</button>
            <button type="button" class="btn btn-sm btn-outline grid-btn ${this.state.gridMode === 'column' ? 'active' : ''}" data-grid="column">筆算ガイド</button>
          </div>
          <div class="toolbar-group pen-color-group" aria-label="ペンいろ">
            ${colorBtnsHtml}
          </div>
          <div class="toolbar-group">
            <button type="button" class="btn btn-sm btn-outline undo-btn" title="1つ戻す">元に戻す</button>
            <button type="button" class="btn btn-sm btn-outline clear-btn" title="全消去">全消去</button>
          </div>
        </div>
        <div class="canvas-wrapper">
          <div class="canvas-mascot-watermark" aria-hidden="true">${renderCharacterSvg(this.state.watermarkCharacterId, 'normal', 76)}</div>
          <canvas class="memo-canvas"></canvas>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('canvas.memo-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
    this.toolbar = this.container.querySelector('.canvas-toolbar');
  }

  setupEvents() {
    if (!this.canvas) return;

    this._boundPointerDown = (e) => this.handlePointerDown(e);
    this._boundPointerMove = (e) => this.handlePointerMove(e);
    this._boundPointerUp = (e) => this.handlePointerUp(e);
    this._boundPointerCancel = (e) => this.handlePointerCancel(e);

    this.canvas.addEventListener('pointerdown', this._boundPointerDown);
    this.canvas.addEventListener('pointermove', this._boundPointerMove);
    this.canvas.addEventListener('pointerup', this._boundPointerUp);
    this.canvas.addEventListener('pointercancel', this._boundPointerCancel);

    // Toolbar button delegation
    if (this.toolbar) {
      this._boundToolbarClick = (e) => {
        const gridBtn = e.target.closest('.grid-btn');
        if (gridBtn) {
          const mode = gridBtn.dataset.grid;
          this.setGridMode(mode);
          this.toolbar.querySelectorAll('.grid-btn').forEach(b => b.classList.toggle('active', b === gridBtn));
          return;
        }

        const colorBtn = e.target.closest('.pen-color-btn');
        if (colorBtn) {
          const color = colorBtn.dataset.color;
          this.setStrokeColor(color);
          this.toolbar.querySelectorAll('.pen-color-btn').forEach(b => b.classList.toggle('active', b === colorBtn));
          return;
        }

        if (e.target.closest('.undo-btn')) {
          this.undo();
          return;
        }

        if (e.target.closest('.clear-btn')) {
          this.clear();
          return;
        }
      };
      this.toolbar.addEventListener('click', this._boundToolbarClick);
    }

    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas.parentElement);
    }
  }

  getPointerCoords(e) {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  handlePointerDown(e) {
    e.preventDefault();
    if (this.canvas && this.canvas.setPointerCapture) {
      try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {}
    }
    const { x, y } = this.getPointerCoords(e);
    startStroke(this.state, x, y);

    if (typeof this._onDrawStart === 'function') {
      this._onDrawStart(this.state);
    }

    // Immediate visual feedback for single tap
    this.drawPoint(x, y, this.state.strokeColor || this.options.strokeColor);
  }

  handlePointerMove(e) {
    if (!this.state.currentStroke) return;
    e.preventDefault();
    const { x, y } = this.getPointerCoords(e);
    const prev = this.state.currentStroke[this.state.currentStroke.length - 1];
    moveStroke(this.state, x, y);

    // Real-time incremental line segment drawing
    if (prev && this.ctx) {
      this.ctx.beginPath();
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(x, y);
      this.ctx.strokeStyle = this.state.strokeColor || this.options.strokeColor;
      this.ctx.lineWidth = this.options.lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.stroke();
    }
  }

  handlePointerUp(e) {
    if (!this.state.currentStroke) return;
    if (this.canvas && this.canvas.releasePointerCapture) {
      try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    endStroke(this.state);
    this.redraw();
    if (typeof this._onStrokeChange === 'function') {
      this._onStrokeChange(this.state);
    }
  }

  handlePointerCancel(e) {
    this.handlePointerUp(e);
  }

  setGridMode(mode) {
    setGridMode(this.state, mode);
    this.redraw();
  }

  setStrokeColor(color) {
    setStrokeColor(this.state, color);
    this.options.strokeColor = this.state.strokeColor;
  }

  setWatermarkCharacter(charId) {
    this.state.watermarkCharacterId = charId || DEFAULT_CHARACTER_ID;
    if (this.container) {
      const wm = this.container.querySelector('.canvas-mascot-watermark');
      if (wm) {
        wm.innerHTML = renderCharacterSvg(this.state.watermarkCharacterId, 'normal', 76);
      }
    }
  }

  undo() {
    const undone = undo(this.state);
    this.redraw();
    if (typeof this._onStrokeChange === 'function') {
      this._onStrokeChange(this.state);
    }
    return undone;
  }

  clear() {
    clear(this.state);
    this.redraw();
    if (typeof this._onStrokeChange === 'function') {
      this._onStrokeChange(this.state);
    }
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const width = Math.max(rect.width, 300);
    const height = Math.max(rect.height, 200);

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 2;
    this.state.dpr = dpr;
    this.state.width = width;
    this.state.height = height;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.scale?.(dpr, dpr);
    this.redraw();
  }

  redraw() {
    if (!this.ctx) return;
    const { width, height, gridMode, strokes, strokeColors, currentStroke } = this.state;
    this.ctx.clearRect(0, 0, width, height);

    // 1. Draw Background Guides
    if (gridMode === 'grid') {
      this.drawSquareGrid(width, height);
    } else if (gridMode === 'column') {
      this.drawColumnGuides(width, height);
    }

    // 2. Draw Committed Strokes
    for (let i = 0; i < strokes.length; i++) {
      const color = (Array.isArray(strokeColors) && strokeColors[i]) || this.options.strokeColor;
      this.drawStroke(strokes[i], color);
    }

    // 3. Draw Active In-Progress Stroke
    if (currentStroke) {
      this.drawStroke(currentStroke, this.state.strokeColor || this.options.strokeColor);
    }
  }

  drawPoint(x, y, color = null) {
    if (!this.ctx) return;
    this.ctx.fillStyle = color || this.state.strokeColor || this.options.strokeColor;
    this.ctx.beginPath?.();
    this.ctx.arc?.(x, y, this.options.lineWidth / 2, 0, Math.PI * 2);
    this.ctx.fill?.();
  }

  drawStroke(stroke, color = null) {
    if (!this.ctx || !stroke || stroke.length === 0) return;
    const strokeCol = color || this.state.strokeColor || this.options.strokeColor;
    if (stroke.length === 1) {
      this.drawPoint(stroke[0].x, stroke[0].y, strokeCol);
      return;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(stroke[0].x, stroke[0].y);

    if (stroke.length === 2) {
      this.ctx.lineTo(stroke[1].x, stroke[1].y);
    } else {
      // Smooth curve with quadratic midpoints
      for (let i = 1; i < stroke.length - 1; i++) {
        const xc = (stroke[i].x + stroke[i + 1].x) / 2;
        const yc = (stroke[i].y + stroke[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, xc, yc);
      }
      this.ctx.lineTo(stroke[stroke.length - 1].x, stroke[stroke.length - 1].y);
    }

    this.ctx.strokeStyle = strokeCol;
    this.ctx.lineWidth = this.options.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();
  }

  drawSquareGrid(width, height) {
    if (!this.ctx) return;
    const size = this.options.gridCellSize;
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();

    for (let x = size; x < width; x += size) {
      this.ctx.moveTo(x + 0.5, 0);
      this.ctx.lineTo(x + 0.5, height);
    }
    for (let y = size; y < height; y += size) {
      this.ctx.moveTo(0, y + 0.5);
      this.ctx.lineTo(width, y + 0.5);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawColumnGuides(width, height) {
    if (!this.ctx) return;
    const colW = this.options.columnWidth;
    this.ctx.save();

    // Column background shading for alternating place values
    let colIndex = 0;
    for (let x = width - colW; x >= 0; x -= colW, colIndex++) {
      if (colIndex % 2 === 1) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        this.ctx.fillRect(x, 0, colW, height);
      }
    }

    // Vertical dashed column lines
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    for (let x = width - colW; x >= 0; x -= colW) {
      this.ctx.moveTo(x + 0.5, 0);
      this.ctx.lineTo(x + 0.5, height);
    }
    this.ctx.stroke();

    // Horizontal division/equals line helper
    this.ctx.setLineDash([]);
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, height * 0.45 + 0.5);
    this.ctx.lineTo(width, height * 0.45 + 0.5);
    this.ctx.stroke();

    this.ctx.restore();
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.canvas) {
      if (this._boundPointerDown) this.canvas.removeEventListener('pointerdown', this._boundPointerDown);
      if (this._boundPointerMove) this.canvas.removeEventListener('pointermove', this._boundPointerMove);
      if (this._boundPointerUp) this.canvas.removeEventListener('pointerup', this._boundPointerUp);
      if (this._boundPointerCancel) this.canvas.removeEventListener('pointercancel', this._boundPointerCancel);
    }
    if (this.toolbar && this._boundToolbarClick) {
      this.toolbar.removeEventListener('click', this._boundToolbarClick);
    }
  }
}

export default CanvasPad;
