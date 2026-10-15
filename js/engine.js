/* ──────────────────────────────────────────────────────────────
   콘티 엔진
   핀홀 카메라 투영 + 페인터 알고리즘으로 3D 세트를 SVG 콘티로 그린다.
   좌표계: x 오른쪽, y 위, z 앞(카메라에서 멀어지는 방향). 단위 m.
   ────────────────────────────────────────────────────────────── */
(function (G) {
  'use strict';

  const D2R = Math.PI / 180;
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  };

  const n1 = (x) => (Math.round(x * 10) / 10);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ── 스토리보드 팔레트: 종이 위 흑연 + 쿨그레이 마커 + 스팟 컬러 ── */
  const C = {
    paper: '#FAFAF6', ink: '#2A2D31',
    g1: '#E8EAEA', g2: '#D6D9DB', g3: '#C2C6C9', g4: '#A9AEB2', g5: '#8F959A',
    g6: '#747A80', g7: '#5C6167', g8: '#464A50', g9: '#33363B',
    npb: '#7FB9DD', red: '#D1392E', blue: '#2F74C0',
    warm: '#F2B54E', amber: '#E89A3C', magenta: '#E0508A', cyan: '#3FB5D3',
    safe: '#C9372C', cool: '#BFD8E8', lit: '#F6E2A8',
  };

  /* ── 카메라 ── */
  function makeCam(o) {
    const W = o.W, H = o.H;
    const F = (o.lens / 36) * W;
    let yaw, pitch;
    if (o.target) {
      const d = V.sub(o.target, o.pos);
      const hd = Math.hypot(d[0], d[2]);
      yaw = hd < 1e-3 ? (o.yaw || 0) * D2R : Math.atan2(d[0], d[2]);
      pitch = Math.atan2(d[1], hd);
    } else {
      yaw = (o.yaw || 0) * D2R;
      pitch = (o.pitch || 0) * D2R;
    }
    if (o.shift) {
      yaw -= Math.atan((o.shift[0] || 0) * (W / 2) / F);
      pitch -= Math.atan((o.shift[1] || 0) * (H / 2) / F);
    }
    pitch = clamp(pitch, -89.6 * D2R, 89.6 * D2R);
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const f = [sy * cp, sp, cy * cp];
    let r = [cy, 0, -sy];
    let u = V.cross(f, r);
    const roll = (o.roll || 0) * D2R;
    if (roll) {
      const cr = Math.cos(roll), sr = Math.sin(roll);
      const r2 = V.add(V.mul(r, cr), V.mul(u, sr));
      const u2 = V.sub(V.mul(u, cr), V.mul(r, sr));
      r = r2; u = u2;
    }
    return {
      pos: o.pos.slice(), f, r, u, F, W, H, lens: o.lens, yaw, pitch, roll,
      rH: [cy, 0, -sy], fH: [sy, 0, cy], near: 0.04,
    };
  }

  function toCam(cam, p) {
    const d = [p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]];
    return [V.dot(d, cam.r), V.dot(d, cam.u), V.dot(d, cam.f)];
  }
  function scr(cam, c) {
    const z = Math.max(c[2], cam.near);
    return [cam.W / 2 + cam.F * c[0] / z, cam.H / 2 - cam.F * c[1] / z];
  }
  function project(cam, p) { return scr(cam, toCam(cam, p)); }

  function clipNear(pts, near) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ain = a[2] >= near, bin = b[2] >= near;
      if (ain) out.push(a);
      if (ain !== bin) {
        const t = (near - a[2]) / (b[2] - a[2]);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near]);
      }
    }
    return out;
  }

  /* 월드 폴리곤 → 화면 경로. 화면 밖이면 null */
  function polyPath(cam, pts, closed = true) {
    const cpts = clipNear(pts.map((p) => toCam(cam, p)), cam.near);
    if (cpts.length < (closed ? 3 : 2)) return null;
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, dsum = 0;
    const sp = cpts.map((c) => {
      const s = scr(cam, c);
      if (s[0] < minx) minx = s[0]; if (s[0] > maxx) maxx = s[0];
      if (s[1] < miny) miny = s[1]; if (s[1] > maxy) maxy = s[1];
      dsum += c[2];
      return s;
    });
    const m = 60;
    if (maxx < -m || minx > cam.W + m || maxy < -m || miny > cam.H + m) return null;
    let d = 'M' + n1(sp[0][0]) + ' ' + n1(sp[0][1]);
    for (let i = 1; i < sp.length; i++) d += 'L' + n1(sp[i][0]) + ' ' + n1(sp[i][1]);
    if (closed) d += 'Z';
    return { d, depth: dsum / cpts.length, area: (maxx - minx) * (maxy - miny), sp, bbox: [minx, miny, maxx, maxy] };
  }

  function lineClip(cam, a, b) {
    let ca = toCam(cam, a), cb = toCam(cam, b);
    const near = cam.near;
    if (ca[2] < near && cb[2] < near) return null;
    if (ca[2] < near) { const t = (near - ca[2]) / (cb[2] - ca[2]); ca = V.lerp(ca, cb, t); }
    else if (cb[2] < near) { const t = (near - cb[2]) / (ca[2] - cb[2]); cb = V.lerp(cb, ca, t); }
    return { a: scr(cam, ca), b: scr(cam, cb), depth: (ca[2] + cb[2]) / 2 };
  }

  /* ── 씬 그래프 ── */
  class Scene {
    constructor() {
      this.items = [];   // faces, lines
      this.sprites = []; // 인물, 소품, 광원 등 사용자 그리기 함수
      this.lights = [];
      this.plan = [];    // 평면도용 사각형
      this.sky = null;
      this.ground = null;
    }
    face(pts, st) { this.items.push({ k: 'f', pts, st: st || {} }); return this; }
    line(a, b, st) { this.items.push({ k: 'l', a, b, st: st || {} }); return this; }
    poly(pts, st) { this.items.push({ k: 'p', pts, st: st || {} }); return this; }
    sprite(pos, draw, o) { this.sprites.push(Object.assign({ pos, draw }, o || {})); return this; }
    light(o) { this.lights.push(Object.assign({ color: C.warm, glow: 0.6, pool: 0, on: true }, o)); return this; }
    /* 축 정렬 박스. st.fills = {top,bot,e,w,n,s}, st.dec = {e:[..], ...} 데칼 */
    box(x0, x1, y0, y1, z0, z1, st) {
      st = st || {};
      const f = st.fills || {};
      const base = st.fill || C.g3;
      const dec = st.dec || {};
      const common = { stroke: st.stroke, sw: st.sw, layer: st.layer, op: st.op, blend: st.blend, tag: st.tag };
      const faces = {
        top: { pts: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], n: [0, 1, 0] },
        bot: { pts: [[x0, y0, z0], [x0, y0, z1], [x1, y0, z1], [x1, y0, z0]], n: [0, -1, 0] },
        e: { pts: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], n: [1, 0, 0] },
        w: { pts: [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], n: [-1, 0, 0] },
        n: { pts: [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]], n: [0, 0, 1] },
        s: { pts: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], n: [0, 0, -1] },
      };
      const skip = st.skip || '';
      for (const k in faces) {
        if (skip.indexOf(k) >= 0) continue;
        const fc = faces[k];
        let fill = f[k];
        if (fill === undefined) fill = k === 'top' ? (st.topFill || base) : (k === 'e' || k === 'w') ? (st.sideFill || base) : base;
        this.items.push({ k: 'f', pts: fc.pts, st: Object.assign({}, common, { fill, n: fc.n, dec: dec[k] }) });
      }
      if (st.plan) this.plan.push({ x0, x1, z0, z1, kind: st.plan, label: st.planLabel });
      return this;
    }
  }

  /* 면 위 데칼 사각형 생성 (면의 외향 법선 방향으로 살짝 띄움) */
  function quadOn(side, a0, a1, b0, b1, at, off) {
    // side: 'n','s' (z 고정; a=x, b=y) / 'e','w' (x 고정; a=z, b=y) / 'top' (y 고정; a=x, b=z)
    off = off === undefined ? 0.02 : off;
    switch (side) {
      case 's': { const z = at - off; return [[a0, b0, z], [a1, b0, z], [a1, b1, z], [a0, b1, z]]; }
      case 'n': { const z = at + off; return [[a1, b0, z], [a0, b0, z], [a0, b1, z], [a1, b1, z]]; }
      case 'w': { const x = at - off; return [[x, b0, a1], [x, b0, a0], [x, b1, a0], [x, b1, a1]]; }
      case 'e': { const x = at + off; return [[x, b0, a0], [x, b0, a1], [x, b1, a1], [x, b1, a0]]; }
      case 'top': { const y = at + off; return [[a0, y, b0], [a1, y, b0], [a1, y, b1], [a0, y, b1]]; }
    }
    return null;
  }

  /* ── 피사계 심도: 착란원(px) ── */
  function cocPx(cam, dof, depth) {
    if (!dof || !dof.focus) return 0;
    const f = cam.lens / 1000; // m
    const N = dof.N || 2.8;
    const D = Math.max(dof.focus, f * 2);
    const z = Math.max(depth, 0.05);
    const c = (f * f / (N * (D - f))) * Math.abs(z - D) / z; // m on sensor
    return (c * 1000 / 36) * cam.W;
  }
  const BLUR_LEVELS = [0, 1, 1.8, 2.8, 4, 5.5, 7];
  function blurLevel(px, max) {
    const sd = Math.min(px * 0.33, max === undefined ? 6 : max);
    let best = 0;
    for (let i = 0; i < BLUR_LEVELS.length; i++) if (sd >= BLUR_LEVELS[i] * 0.85) best = i;
    return best;
  }

  /* 경로 문자열: 로컬 명령 + 투영 함수 */
  function pathFrom(cmds, P) {
    let d = '';
    for (const c of cmds) {
      const t = c[0];
      if (t === 'Z') { d += 'Z'; continue; }
      const pts = [];
      for (let i = 1; i < c.length; i += 2) {
        const s = P(c[i], c[i + 1]);
        pts.push(n1(s[0]) + ' ' + n1(s[1]));
      }
      d += t + pts.join(' ');
    }
    return d;
  }
  /* 타원 → 베지어 명령 */
  function ellipseCmds(cx, cy, rx, ry) {
    const k = 0.5523;
    return [
      ['M', cx + rx, cy],
      ['C', cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry],
      ['C', cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy],
      ['C', cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry],
      ['C', cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy],
      ['Z'],
    ];
  }
  /* 관절 사슬 → 굵기 있는 팔/다리 외곽선 */
  function limbCmds(pts, widths) {
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const w = widths[i] / 2;
      L.push([p[0] - dy * w, p[1] + dx * w]);
      R.push([p[0] + dy * w, p[1] - dx * w]);
    }
    const cmds = [['M', L[0][0], L[0][1]]];
    for (let i = 1; i < L.length; i++) cmds.push(['L', L[i][0], L[i][1]]);
    const e = pts[pts.length - 1], wl = widths[widths.length - 1] / 2;
    // 끝을 둥글게
    const pe = pts[pts.length - 1], pp = pts[pts.length - 2] || pe;
    let ex = pe[0] - pp[0], ey = pe[1] - pp[1]; const el = Math.hypot(ex, ey) || 1; ex /= el; ey /= el;
    cmds.push(['Q', e[0] + ex * wl * 1.2, e[1] + ey * wl * 1.2, R[R.length - 1][0], R[R.length - 1][1]]);
    for (let i = R.length - 2; i >= 0; i--) cmds.push(['L', R[i][0], R[i][1]]);
    cmds.push(['Z']);
    return cmds;
  }

  let UID = 0;
  const nextUid = () => 'k' + (++UID).toString(36);

  G.KONTI = G.KONTI || {};
  Object.assign(G.KONTI, {
    D2R, V, C, n1, clamp, lerp, ease, rng, makeCam, toCam, scr, project, clipNear, polyPath, lineClip,
    Scene, quadOn, cocPx, blurLevel, BLUR_LEVELS, pathFrom, ellipseCmds, limbCmds, nextUid,
  });
})(typeof window !== 'undefined' ? window : globalThis);
