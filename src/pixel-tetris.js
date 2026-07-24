const FALLBACK_COLORS = ["#ff8300", "#FFFFFF"];
const CLEAR_BLINKS = 2;
const BLINK_MS = 90;

const SHAPES = [
  [[0, 1], [1, 1], [2, 1], [3, 1]], // I
  [[0, 0], [0, 1], [1, 1], [2, 1]], // J
  [[2, 0], [0, 1], [1, 1], [2, 1]], // L
  [[1, 0], [2, 0], [0, 1], [1, 1]], // S
  [[0, 0], [1, 0], [1, 1], [2, 1]], // Z
  [[1, 0], [0, 1], [1, 1], [2, 1]], // T
  [[0, 0], [1, 0], [0, 1], [1, 1]], // O
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseColor(color) {
  const value = (color ?? "").trim();
  const hex = value.replace("#", "");
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      1,
    ];
  }
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (match) {
    const parts = match[1].split(",").map((p) => parseFloat(p));
    return [
      parts[0] || 0,
      parts[1] || 0,
      parts[2] || 0,
      parts[3] === undefined ? 1 : parts[3],
    ];
  }
  return [255, 255, 255, 1];
}

const rgba = (c, alpha) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3] * alpha})`;

export class PixelTetris {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    
    this.boardColor = options.boardColor || "rgba(255, 255, 255, 0.06)";
    this.colors = options.colors || ["#ff8300", "#FFFFFF", "#ebd0a7"];
    this.movement = options.movement !== undefined ? options.movement : 4;
    this.cellSize = options.cellSize !== undefined ? options.cellSize : 29;
    this.gap = options.gap !== undefined ? options.gap : 1;
    this.rounded = options.rounded !== undefined ? options.rounded : 20;
    this.dropSpeed = options.dropSpeed !== undefined ? options.dropSpeed : 2;

    this.alive = true;
    this.raf = 0;
    this.last = 0;
    this.dropAcc = 0;
    this.dpr = 1;
    this.cols = 0;
    this.rows = 0;
    this.cellW = 0;
    this.cellH = 0;
    this.pitchX = 0;
    this.pitchY = 0;
    this.cellRadius = 0;
    this.grid = [];
    this.piece = null;
    this.clearing = [];
    this.clearMs = 0;

    this.boardRGB = parseColor(this.boardColor);
    const source = this.colors && this.colors.length ? this.colors : FALLBACK_COLORS;
    this.blockRGB = source.map(parseColor);
    
    this.rand = mulberry32(0x7e7415);
    this.pitch = this.cellSize + this.gap;
    this.dropEvery = 1000 / Math.max(1, this.dropSpeed * 4);
    this.wander = Math.min(10, Math.max(0, this.movement)) / 10;

    this.loop = this.loop.bind(this);
    
    this.build();

    let built = `${this.canvas.clientWidth}x${this.canvas.clientHeight}`;
    this.ro = new ResizeObserver(() => {
      const size = `${this.canvas.clientWidth}x${this.canvas.clientHeight}`;
      if (size === built) return;
      built = size;
      this.build();
    });
    this.ro.observe(this.canvas);

    this.raf = requestAnimationFrame(this.loop);
  }

  at(col, row) {
    return this.grid[row * this.cols + col];
  }

  rotate(shape, turns) {
    let cells = SHAPES[shape].map(([c, r]) => [c, r]);
    for (let t = 0; t < turns; t++) {
      let maxRow = 0;
      for (const [, r] of cells) maxRow = Math.max(maxRow, r);
      cells = cells.map(([c, r]) => [maxRow - r, c]);
    }
    let minC = Infinity;
    let minR = Infinity;
    for (const [c, r] of cells) {
      minC = Math.min(minC, c);
      minR = Math.min(minR, r);
    }
    return cells.map(([c, r]) => [c - minC, r - minR]);
  }

  fits(cells, col, row) {
    for (const [c, r] of cells) {
      const gc = col + c;
      const gr = row + r;
      if (gc < 0 || gc >= this.cols || gr >= this.rows) return false;
      if (gr >= 0 && this.at(gc, gr) !== -1) return false;
    }
    return true;
  }

  landing(cells, col) {
    if (!this.fits(cells, col, 0)) return -1;
    let row = 0;
    while (this.fits(cells, col, row + 1)) row++;
    return row;
  }

  score(cells, col, row) {
    const test = this.grid.slice();
    for (const [c, r] of cells) {
      const gr = row + r;
      if (gr >= 0) test[gr * this.cols + (col + c)] = 1;
    }

    let lines = 0;
    for (let r = 0; r < this.rows; r++) {
      let full = true;
      for (let c = 0; c < this.cols; c++) {
        if (test[r * this.cols + c] === -1) {
          full = false;
          break;
        }
      }
      if (full) lines++;
    }

    let aggHeight = 0;
    let holes = 0;
    let bump = 0;
    let prevTop = -1;
    for (let c = 0; c < this.cols; c++) {
      let top = this.rows;
      for (let r = 0; r < this.rows; r++) {
        if (test[r * this.cols + c] !== -1) {
          top = r;
          break;
        }
      }
      const height = this.rows - top;
      aggHeight += height;
      for (let r = top + 1; r < this.rows; r++) {
        if (test[r * this.cols + c] === -1) holes++;
      }
      if (prevTop >= 0) bump += Math.abs(top - prevTop);
      prevTop = top;
    }

    return lines * 4.0 - aggHeight * 0.5 - holes * 3.5 - bump * 0.3;
  }

  spawn() {
    const shape = Math.floor(this.rand() * SHAPES.length);
    let bestCells = null;
    let bestCol = 0;
    let bestRow = 0;
    let bestScore = -Infinity;

    for (let turn = 0; turn < 4; turn++) {
      const cells = this.rotate(shape, turn);
      let width = 0;
      for (const [c] of cells) width = Math.max(width, c);
      for (let col = 0; col + width < this.cols; col++) {
        const row = this.landing(cells, col);
        if (row < 0) continue;
        const s = this.score(cells, col, row);
        if (s > bestScore) {
          bestScore = s;
          bestCells = cells;
          bestCol = col;
          bestRow = row;
        }
      }
    }

    if (!bestCells) {
      this.grid = new Array(this.cols * this.rows).fill(-1);
      this.piece = null;
      return;
    }

    let startRow = 0;
    let width = 0;
    for (const [c, r] of bestCells) {
      startRow = Math.max(startRow, r);
      width = Math.max(width, c);
    }
    startRow = -1 - startRow;
    const maxCol = this.cols - 1 - width;
    const swing = Math.round((this.rand() * 2 - 1) * this.wander * this.cols);
    const startCol = Math.min(maxCol, Math.max(0, bestCol + swing));
    const color = this.blockRGB.length > 1 ? Math.floor(this.rand() * this.blockRGB.length) : 0;
    
    this.piece = {
      shape,
      cells: bestCells,
      color,
      col: startCol,
      row: startRow,
      startCol,
      startRow,
      targetCol: bestCol,
      targetRow: bestRow,
    };
  }

  lock() {
    if (!this.piece) return;
    for (const [c, r] of this.piece.cells) {
      const gr = this.piece.row + r;
      const gc = this.piece.col + c;
      if (gr >= 0 && gr < this.rows && gc >= 0 && gc < this.cols) {
        this.grid[gr * this.cols + gc] = this.piece.color;
      }
    }
    this.piece = null;

    const full = [];
    for (let r = 0; r < this.rows; r++) {
      let solid = true;
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r * this.cols + c] === -1) {
          solid = false;
          break;
        }
      }
      if (solid) full.push(r);
    }
    if (full.length) {
      this.clearing = full;
      this.clearMs = CLEAR_BLINKS * BLINK_MS * 2;
    }
  }

  collapse() {
    const gone = new Set(this.clearing);
    const next = new Array(this.cols * this.rows).fill(-1);
    let write = this.rows - 1;
    for (let r = this.rows - 1; r >= 0; r--) {
      if (gone.has(r)) continue;
      for (let c = 0; c < this.cols; c++) {
        next[write * this.cols + c] = this.grid[r * this.cols + c];
      }
      write--;
    }
    this.grid = next;
    this.clearing = [];
  }

  build() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(this.canvas.clientWidth));
    const h = Math.max(1, Math.round(this.canvas.clientHeight));
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    
    this.cols = Math.max(4, Math.floor((w + this.gap) / this.pitch));
    this.rows = Math.max(6, Math.floor((h + this.gap) / this.pitch));
    
    this.cellW = Math.max(1, (w - this.gap * (this.cols - 1)) / this.cols);
    this.cellH = Math.max(1, (h - this.gap * (this.rows - 1)) / this.rows);
    this.pitchX = this.cellW + this.gap;
    this.pitchY = this.cellH + this.gap;
    
    this.cellRadius = (Math.min(this.cellW, this.cellH) / 2) * (Math.min(20, Math.max(0, this.rounded)) / 20);
    
    this.grid = new Array(this.cols * this.rows).fill(-1);
    this.piece = null;
    this.clearing = [];
    this.clearMs = 0;
    this.spawn();
  }

  tilePath(col, row) {
    const x = col * this.pitchX;
    const y = row * this.pitchY;
    if (this.cellRadius > 0 && typeof this.ctx.roundRect === "function") {
      this.ctx.roundRect(x, y, this.cellW, this.cellH, this.cellRadius);
    } else {
      this.ctx.rect(x, y, this.cellW, this.cellH);
    }
  }

  colorFor(index) {
    return this.blockRGB[index] ?? this.blockRGB[0];
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

    this.ctx.beginPath();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) this.tilePath(c, r);
    }
    this.ctx.fillStyle = rgba(this.boardRGB, 1);
    this.ctx.fill();

    const flashing = new Set(this.clearing);
    const lit = this.clearMs > 0 && Math.floor(this.clearMs / BLINK_MS) % 2 === 0;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const color = this.grid[r * this.cols + c];
        if (color === -1) continue;
        this.ctx.beginPath();
        this.tilePath(c, r);
        if (flashing.has(r) && lit) {
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        } else {
          this.ctx.fillStyle = rgba(this.colorFor(color), 1);
        }
        this.ctx.fill();
      }
    }

    if (this.piece) {
      this.ctx.fillStyle = rgba(this.colorFor(this.piece.color), 1);
      for (const [c, r] of this.piece.cells) {
        const gr = this.piece.row + r;
        if (gr < 0) continue;
        this.ctx.beginPath();
        this.tilePath(this.piece.col + c, gr);
        this.ctx.fill();
      }
    }
  }

  loop(time) {
    if (!this.alive) return;
    const dt = this.last ? Math.min(time - this.last, 200) : 0;
    this.last = time;

    if (this.clearMs > 0) {
      this.clearMs -= dt;
      if (this.clearMs <= 0) {
        this.clearMs = 0;
        this.collapse();
        this.spawn();
      }
      this.draw();
      this.raf = requestAnimationFrame(this.loop);
      return;
    }

    if (this.piece) {
      this.dropAcc += dt;
      while (this.dropAcc >= this.dropEvery && this.piece) {
        this.dropAcc -= this.dropEvery;
        if (this.piece.row < this.piece.targetRow) {
          this.piece.row++;
          const span = this.piece.targetRow - this.piece.startRow;
          const prog = span > 0 ? (this.piece.row - this.piece.startRow) / span : 1;
          this.piece.col = Math.round(
            this.piece.startCol + (this.piece.targetCol - this.piece.startCol) * prog
          );
        } else {
          this.piece.col = this.piece.targetCol;
          this.lock();
        }
      }
    } else {
      this.spawn();
    }

    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
  }
}
