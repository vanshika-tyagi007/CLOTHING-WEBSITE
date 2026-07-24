const DEFAULTS = {
    label: "Please wait",
    textColor: "#F1EDDF",
    paddingX: 64,
    paddingY: 28,
    rounded: 100,
    glass: {
        tint: "rgba(214, 194, 162, 0.12)",
        blur: 40,
        frost: 10,
    },
    waterAmount: 69,
    waterColor: "#ff9900", // Using MOD Apparels accent color
    border: true,
    borderOptions: {
        color: "rgba(120, 120, 120, 0.7)",
        stroke: 1,
    },
    shadow: true,
    shadowOptions: {
        color: "#141A1F",
        intensity: 20,
    },
};

const DEFAULT_FONT = {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "18px",
    fontWeight: 600,
    letterSpacing: "-0.01em",
};

const COLUMNS = 64;
const SUBSTEPS = 6;
const GRAVITY = 6000;
const VISCOSITY = 2.6;
const CURSOR_REACH = 46;
const SWEEP_FORCE = 3;
const DIP_FORCE = 1.5;
const CLICK_FORCE = 260;
const MAX_KICK = 8;
const MAX_FILL = 0.9;
const STILL = 0.05;
const SLEEP_FRAMES = 20;

const MAX_DROPS = 96;
const DROP_GRAVITY = 1400;
const DROP_DRAG = 0.6;
const DROP_VOLUME = 0.18;
const DROP_RADIUS = 1.25;
const SPRAY_THRESHOLD = 1.6;
const SPRAY_RATE = 0.5;
const SPRAY_PER_FRAME = 4;
const SPRAY_LIFT = 150;
const BREAK_SPEED = 210;
const MIN_SPRAY_DEPTH = 2;

const RIPPLE = 1;
const MAX_PIXEL_SCALE = 8;
const MAX_PIXELS = 2_000_000;

const dropShadow = (color, intensity) => {
    const k = Math.min(100, Math.max(0, intensity)) / 100;
    const [r, g, b, a] = parseColor(color);
    const tone = (alpha) =>
        `rgba(${r}, ${g}, ${b}, ${(alpha * k * a).toFixed(4)})`;
    return [
        `0 0 0.75px ${tone(0.2)}`,
        `0.7px 0.8px 1.2px -0.4px ${tone(0.1)}`,
        `1.3px 1.5px 2.2px -0.8px ${tone(0.1)}`,
        `2.3px 2.6px 3.9px -1.2px ${tone(0.1)}`,
        `3.9px 4.4px 6.6px -1.7px ${tone(0.1)}`,
        `6.5px 7.2px 10.9px -2.1px ${tone(0.1)}`,
        `8px 9px 14px -2.5px ${tone(0.2)}`,
    ].join(", ");
};

function parseColor(color) {
    const value = (color || "").trim();
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
    return [62, 155, 214, 1];
}

const clampKick = (value) => Math.max(-MAX_KICK, Math.min(MAX_KICK, value));

const shift = (channel, f) =>
    Math.round(
        Math.max(
            0,
            Math.min(255, channel + (f > 0 ? (255 - channel) * f : channel * f))
        )
    );

function roundRectPath(ctx, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

export class WaterButton {
    constructor(container, options = {}) {
        this.container = container;
        this.options = { ...DEFAULTS, ...options };
        this.options.glass = { ...DEFAULTS.glass, ...(options.glass || {}) };
        this.options.borderOptions = { ...DEFAULTS.borderOptions, ...(options.borderOptions || {}) };
        this.options.shadowOptions = { ...DEFAULTS.shadowOptions, ...(options.shadowOptions || {}) };
        this.font = { ...DEFAULT_FONT, ...(options.font || {}) };

        this.initDOM();
        this.initSim();
    }

    initDOM() {
        const {
            label, textColor, paddingX, paddingY, rounded,
            glass, border, shadow, shadowOptions, borderOptions
        } = this.options;

        const { tint, blur, frost } = glass;
        const shadowStyle = shadow ? dropShadow(shadowOptions.color, shadowOptions.intensity) : "none";

        this.container.innerHTML = `
            <div class="water-btn-root" style="
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: fit-content;
                padding: ${paddingY}px ${paddingX}px;
                box-sizing: border-box;
                border-radius: ${rounded}px;
                background: transparent;
                box-shadow: ${shadowStyle};
                cursor: pointer;
                isolation: isolate;
                transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
            ">
                <div class="water-btn-frost" aria-hidden="true" style="
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    overflow: hidden;
                    background: hsl(0 0% 100% / ${frost / 100});
                    backdrop-filter: blur(${blur}px);
                    -webkit-backdrop-filter: blur(${blur}px);
                    pointer-events: none;
                "></div>
                <div class="water-btn-tint" aria-hidden="true" style="
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    background-color: ${tint};
                    pointer-events: none;
                "></div>
                <div class="water-btn-canvas-wrap" aria-hidden="true" style="
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                ">
                    <canvas style="display: block; width: 100%; height: 100%;"></canvas>
                </div>
                <span class="water-btn-label" style="
                    font-family: ${this.font.fontFamily};
                    font-size: ${this.font.fontSize};
                    font-weight: ${this.font.fontWeight};
                    letter-spacing: ${this.font.letterSpacing};
                    position: relative;
                    z-index: 3;
                    color: ${textColor};
                    text-align: center;
                    white-space: pre;
                    user-select: none;
                    line-height: 1;
                    display: block;
                ">${label}</span>
            </div>
        `;

        this.root = this.container.querySelector('.water-btn-root');
        this.canvas = this.container.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    initSim() {
        const { waterAmount, waterColor, border, borderOptions, rounded } = this.options;
        const borderColor = borderOptions.color;
        const borderStroke = Math.max(0, borderOptions.stroke);
        
        let alive = true;
        let raf = 0;
        let last = 0;
        let pixScale = 1;
        let W = 0;
        let H = 0;

        const h = new Float32Array(COLUMNS);
        const u = new Float32Array(COLUMNS + 1);
        const flux = new Float32Array(COLUMNS + 1);
        let rest = 0;
        let colW = 1;

        const dropX = new Float32Array(MAX_DROPS);
        const dropY = new Float32Array(MAX_DROPS);
        const dropVX = new Float32Array(MAX_DROPS);
        const dropVY = new Float32Array(MAX_DROPS);
        const dropLive = new Uint8Array(MAX_DROPS);
        let flying = 0;

        let hovering = false;
        let asleep = false;
        let quiet = 0;
        const pointer = { x: -9999, y: -9999, vx: 0, vy: 0 };

        const amount = Math.min(MAX_FILL, Math.max(0, waterAmount / 100));
        const ripple = RIPPLE;

        const [cr, cg, cb, ca] = parseColor(waterColor);
        const surfaceTone = `rgba(${shift(cr, 0.45)}, ${shift(cg, 0.45)}, ${shift(cb, 0.45)}, ${ca})`;
        const bodyTone = `rgba(${cr}, ${cg}, ${cb}, ${ca})`;
        const depthTone = `rgba(${shift(cr, -0.35)}, ${shift(cg, -0.35)}, ${shift(cb, -0.35)}, ${ca})`;
        const glintTone = `rgba(${shift(cr, 0.75)}, ${shift(cg, 0.75)}, ${shift(cb, 0.75)}, ${Math.min(1, ca + 0.25)})`;

        const [rr, rg, rb, ra] = parseColor(borderColor);
        const borderTone = `rgba(${rr}, ${rg}, ${rb}, ${ra})`;
        const borderBase = `rgba(${rr}, ${rg}, ${rb}, ${ra * 0.35})`;
        const borderFade = `rgba(${rr}, ${rg}, ${rb}, 0)`;

        const colX = (i) => (i + 0.5) * colW;

        const pixelScale = () => {
            const rect = this.root.getBoundingClientRect();
            const zoom = rect.width > 1 && W > 1 ? rect.width / W : 1;
            let s = Math.min(MAX_PIXEL_SCALE, (window.devicePixelRatio || 1) * zoom);
            const area = Math.max(1, W * H);
            if (area * s * s > MAX_PIXELS) s = Math.sqrt(MAX_PIXELS / area);
            return Math.max(1, s);
        };

        const raster = () => {
            pixScale = pixelScale();
            this.canvas.width = Math.round(W * pixScale);
            this.canvas.height = Math.round(H * pixScale);
            this.ctx.setTransform(pixScale, 0, 0, pixScale, 0, 0);
        };

        const build = () => {
            W = Math.max(2, this.root.clientWidth);
            H = Math.max(2, this.root.clientHeight);
            raster();

            colW = W / COLUMNS;
            rest = H * amount;
            h.fill(rest);
            u.fill(0);
            dropLive.fill(0);
            flying = 0;
            asleep = true;
            quiet = 0;
        };

        const freeze = () => {
            h.fill(rest);
            u.fill(0);
            dropLive.fill(0);
            flying = 0;
            asleep = true;
            quiet = 0;
        };

        const drive = (dt) => {
            const reach = CURSOR_REACH;
            const kx = clampKick(pointer.vx) * 60;
            const ky = clampKick(pointer.vy) * 60;
            const first = Math.max(1, Math.floor((pointer.x - reach) / colW));
            const last = Math.min(COLUMNS - 1, Math.ceil((pointer.x + reach) / colW));
            
            for (let i = first; i <= last; i++) {
                const dx = i * colW - pointer.x;
                const fall = 1 - Math.abs(dx) / reach;
                if (fall <= 0) continue;
                if (pointer.y < H - h[i] - reach) continue;
                const bite = fall * ripple * dt;
                u[i] += kx * SWEEP_FORCE * bite;
                u[i] += Math.sign(dx) * ky * DIP_FORCE * bite;
            }
        };

        const splash = (px) => {
            const reach = CURSOR_REACH;
            const first = Math.max(1, Math.floor((px - reach) / colW));
            const last = Math.min(COLUMNS - 1, Math.ceil((px + reach) / colW));
            for (let i = first; i <= last; i++) {
                const dx = i * colW - px;
                const fall = 1 - Math.abs(dx) / reach;
                if (fall <= 0) continue;
                u[i] += Math.sign(dx || 1) * CLICK_FORCE * fall * ripple;
            }
        };

        const tear = (i, vx, vy) => {
            if (h[i] <= MIN_SPRAY_DEPTH) return;
            let slot = -1;
            for (let d = 0; d < MAX_DROPS; d++) {
                if (!dropLive[d]) {
                    slot = d;
                    break;
                }
            }
            if (slot < 0) return;

            dropLive[slot] = 1;
            flying++;
            dropX[slot] = colX(i);
            dropY[slot] = H - h[i] - DROP_RADIUS;
            dropVX[slot] = vx;
            dropVY[slot] = vy;
            h[i] -= DROP_VOLUME / colW;
        };

        const spray = (dt) => {
            if (hovering) {
                const kx = clampKick(pointer.vx);
                const ky = clampKick(pointer.vy);
                const speed = Math.abs(kx) + Math.abs(ky);
                if (speed > SPRAY_THRESHOLD) {
                    const want = Math.min(
                        SPRAY_PER_FRAME,
                        Math.round((speed - SPRAY_THRESHOLD) * SPRAY_RATE * ripple)
                    );
                    for (let k = 0; k < want; k++) {
                        const x = pointer.x + (Math.random() - 0.5) * CURSOR_REACH * 0.7;
                        const i = Math.max(0, Math.min(COLUMNS - 1, Math.floor(x / colW)));
                        if (pointer.y < H - h[i] - CURSOR_REACH * 0.5) continue;
                        tear(
                            i,
                            kx * 60 * 0.45 + (Math.random() - 0.5) * 70,
                            -(SPRAY_LIFT * (0.6 + Math.random() * 0.9)) + ky * 60 * 0.25
                        );
                    }
                }
            }

            for (let i = 1; i < COLUMNS - 1; i++) {
                const flow = Math.abs(u[i]);
                if (flow < BREAK_SPEED) continue;
                if (Math.random() > (flow - BREAK_SPEED) * 0.004 * ripple * dt * 60) continue;
                tear(
                    i,
                    u[i] * 0.5 + (Math.random() - 0.5) * 40,
                    -(SPRAY_LIFT * 0.5 * (0.5 + Math.random()))
                );
            }
        };

        const fall = (dt) => {
            if (flying === 0) return;
            for (let d = 0; d < MAX_DROPS; d++) {
                if (!dropLive[d]) continue;
                dropVY[d] += DROP_GRAVITY * dt;
                dropVX[d] -= dropVX[d] * Math.min(1, DROP_DRAG * dt);
                dropX[d] += dropVX[d] * dt;
                dropY[d] += dropVY[d] * dt;

                if (dropX[d] < 0) {
                    dropX[d] = 0;
                    dropVX[d] = -dropVX[d] * 0.35;
                } else if (dropX[d] > W) {
                    dropX[d] = W;
                    dropVX[d] = -dropVX[d] * 0.35;
                }

                const i = Math.max(0, Math.min(COLUMNS - 1, Math.floor(dropX[d] / colW)));
                if (dropVY[d] > 0 && dropY[d] >= H - h[i]) {
                    h[i] += DROP_VOLUME / colW;
                    if (i > 0 && i < COLUMNS) u[i] += dropVX[d] * 0.25;
                    dropLive[d] = 0;
                    flying--;
                }
            }
        };

        const step = (dt) => {
            spray(dt);
            fall(dt);

            const sub = dt / SUBSTEPS;
            for (let s = 0; s < SUBSTEPS; s++) {
                if (hovering) drive(sub);

                for (let i = 1; i < COLUMNS; i++) {
                    u[i] += ((-GRAVITY * (h[i] - h[i - 1])) / colW) * sub;
                    u[i] -= u[i] * Math.min(1, VISCOSITY * sub);
                }
                u[0] = 0;
                u[COLUMNS] = 0;

                for (let i = 1; i < COLUMNS; i++) {
                    flux[i] = (u[i] > 0 ? h[i - 1] : h[i]) * u[i];
                }
                flux[0] = 0;
                flux[COLUMNS] = 0;

                for (let i = 0; i < COLUMNS; i++) {
                    h[i] -= ((flux[i + 1] - flux[i]) / colW) * sub;
                    if (h[i] < 0) h[i] = 0;
                }
            }

            let worst = 0;
            for (let i = 0; i < COLUMNS; i++) {
                const off = Math.abs(h[i] - rest);
                if (off > worst) worst = off;
            }
            return worst;
        };

        const draw = () => {
            this.ctx.clearRect(0, 0, W, H);
            this.ctx.save();
            roundRectPath(this.ctx, 0, 0, W, H, rounded);
            this.ctx.clip();

            const surfaceAt = (i) => H - h[i];

            this.ctx.beginPath();
            this.ctx.moveTo(0, surfaceAt(0));
            for (let i = 0; i < COLUMNS; i++) this.ctx.lineTo(colX(i), surfaceAt(i));
            this.ctx.lineTo(W, surfaceAt(COLUMNS - 1));
            this.ctx.lineTo(W, H);
            this.ctx.lineTo(0, H);
            this.ctx.closePath();

            const grad = this.ctx.createLinearGradient(0, H - rest, 0, H);
            grad.addColorStop(0, surfaceTone);
            grad.addColorStop(0.35, bodyTone);
            grad.addColorStop(1, depthTone);
            this.ctx.fillStyle = grad;
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.moveTo(0, surfaceAt(0));
            for (let i = 0; i < COLUMNS; i++) this.ctx.lineTo(colX(i), surfaceAt(i));
            this.ctx.lineTo(W, surfaceAt(COLUMNS - 1));
            this.ctx.strokeStyle = glintTone;
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();

            if (flying > 0) {
                this.ctx.beginPath();
                for (let d = 0; d < MAX_DROPS; d++) {
                    if (!dropLive[d]) continue;
                    this.ctx.moveTo(dropX[d] + DROP_RADIUS, dropY[d]);
                    this.ctx.arc(dropX[d], dropY[d], DROP_RADIUS, 0, Math.PI * 2);
                }
                this.ctx.fillStyle = surfaceTone;
                this.ctx.fill();
            }

            this.ctx.restore();

            if (!border || borderStroke <= 0) return;

            const half = borderStroke / 2;
            roundRectPath(
                this.ctx,
                half,
                half,
                W - borderStroke,
                H - borderStroke,
                rounded - half
            );
            this.ctx.lineWidth = borderStroke;

            this.ctx.strokeStyle = borderBase;
            this.ctx.stroke();

            const rim = this.ctx.createLinearGradient(W, H, 0, 0);
            rim.addColorStop(0, borderTone);
            rim.addColorStop(0.3, borderFade);
            rim.addColorStop(0.7, borderFade);
            rim.addColorStop(1, borderTone);
            this.ctx.strokeStyle = rim;
            this.ctx.stroke();
        };

        const loop = (now) => {
            if (!alive) return;
            const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
            last = now;

            pointer.vx *= 0.8;
            pointer.vy *= 0.8;

            if (!asleep) {
                const worst = step(dt);
                draw();

                if (!hovering && flying === 0 && worst < STILL) quiet++;
                else quiet = 0;
                
                if (quiet > SLEEP_FRAMES) {
                    freeze();
                    draw();
                }
            }
            raf = requestAnimationFrame(loop);
        };

        const wake = () => {
            asleep = false;
            quiet = 0;
        };

        const toLocal = (e) => {
            const rect = this.root.getBoundingClientRect();
            const sx = rect.width > 0 ? W / rect.width : 1;
            const sy = rect.height > 0 ? H / rect.height : 1;
            return {
                x: (e.clientX - rect.left) * sx,
                y: (e.clientY - rect.top) * sy,
            };
        };

        const onEnter = (e) => {
            hovering = true;
            const p = toLocal(e);
            pointer.x = p.x;
            pointer.y = p.y;
            pointer.vx = 0;
            pointer.vy = 0;
            wake();
        };

        const onMove = (e) => {
            const p = toLocal(e);
            pointer.vx = p.x - pointer.x;
            pointer.vy = p.y - pointer.y;
            pointer.x = p.x;
            pointer.y = p.y;
            wake();
        };

        const onLeave = () => {
            hovering = false;
            pointer.x = -9999;
            pointer.y = -9999;
            pointer.vx = 0;
            pointer.vy = 0;
            wake();
        };

        const onDown = (e) => {
            const p = toLocal(e);
            pointer.x = p.x;
            pointer.y = p.y;
            splash(p.x);
            wake();
            this.root.style.transform = "scale(0.97)";
        };
        
        const onUp = () => {
            this.root.style.transform = "scale(1)";
        };

        this.root.addEventListener("mouseenter", onEnter);
        this.root.addEventListener("mousemove", onMove);
        this.root.addEventListener("mouseleave", onLeave);
        this.root.addEventListener("pointerdown", onDown);
        window.addEventListener("pointerup", onUp);

        const observer = new ResizeObserver(() => {
            build();
            draw();
        });
        observer.observe(this.root);

        const probe = window.setInterval(() => {
            if (!alive) return;
            if (Math.abs(pixelScale() - pixScale) < 0.02) return;
            raster();
            draw();
        }, 300);

        build();
        draw();
        raf = requestAnimationFrame(loop);

        this.cleanup = () => {
            alive = false;
            cancelAnimationFrame(raf);
            clearInterval(probe);
            this.root.removeEventListener("mouseenter", onEnter);
            this.root.removeEventListener("mousemove", onMove);
            this.root.removeEventListener("mouseleave", onLeave);
            this.root.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointerup", onUp);
            observer.disconnect();
        };
    }

    destroy() {
        if (this.cleanup) this.cleanup();
        if (this.container) this.container.innerHTML = '';
    }
}
