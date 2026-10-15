/* ──────────────────────────────────────────────────────────────
   세트: 「막차」의 다섯 공간
   city(도심 횡단보도) · diner(24시 식당) · darkroom(암실)
   street(역으로 가는 골목길) · platform(플랫폼)
   광원: glow(화면 광채 반경 m), illum(주변을 밝히는 반경/세기/색), pool(바닥 빛 웅덩이)
   ────────────────────────────────────────────────────────────── */
(function (G) {
  'use strict';
  const K = G.KONTI;
  const { Scene, C, quadOn, rng, PROPS, V } = K;

  const WARM = [1.0, 0.78, 0.5], COOL = [0.75, 0.88, 1.0], WHITE = [1, 1, 1], RED = [1.0, 0.22, 0.16], MAG = [1.0, 0.45, 0.7], CYAN = [0.45, 0.9, 1.0];

  /* 창문 격자 데칼 */
  function windows(side, a0, a1, b0, b1, at, o) {
    o = Object.assign({ w: 1.4, h: 1.8, ga: 2.7, gb: 3.3, lit: 0.35, seed: 1, dark: C.g7, litFill: '#F7DC9B', stroke: C.ink, sw: 0.6 }, o);
    const R = rng(o.seed);
    const out = [];
    const na = Math.floor((a1 - a0 - 0.6) / o.ga), nb = Math.floor((b1 - b0 - 0.8) / o.gb);
    const pa = (a1 - a0 - na * o.ga) / 2, pb = (b1 - b0 - nb * o.gb) / 2;
    for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) {
      const ca = a0 + pa + (i + 0.5) * o.ga, cb = b0 + pb + (j + 0.5) * o.gb;
      const lit = R() < o.lit;
      out.push({ pts: quadOn(side, ca - o.w / 2, ca + o.w / 2, cb - o.h / 2, cb + o.h / 2, at, 0.03), fill: lit ? o.litFill : o.dark, emit: lit, stroke: o.stroke, sw: o.sw });
    }
    return out;
  }
  function text(side, a0, a1, b0, b1, at, txt, o) {
    const q = quadOn(side, a0, a1, b0, b1, at, (o && o.off) || 0.04);
    // quadOn 순서: [하좌, 하우, 상우, 상좌] → 텍스트용 [상좌, 상우, 하우, 하좌]
    return Object.assign({ pts: [q[3], q[2], q[1], q[0]], text: txt }, o);
  }
  function lamp3D(S, x, z, h, dx, dz, o) {
    o = o || {};
    const gy = o.gy || 0;
    S.box(x - 0.07, x + 0.07, gy, gy + h, z - 0.07, z + 0.07, { fill: C.g7, sw: 0.8 });
    S.line([x, gy + h, z], [x + dx, gy + h + 0.15, z + dz], { sw: 2.2 });
    const hx = x + dx, hz = z + dz;
    S.box(hx - 0.32, hx + 0.32, gy + h - 0.05, gy + h + 0.12, hz - 0.18, hz + 0.18, { fill: C.g8, sw: 0.8, fills: { bot: '#FFF3CF' } });
    S.light(Object.assign({ pos: [hx, gy + h - 0.1, hz], col: 'w', glow: 0.55, int: 0.95, pool: 3.4, groundY: gy, illum: { r: 5.5, int: 0.9, c: WARM } }, o.light));
  }

  /* 비 맺힌 유리 위 빗줄기 (창 안쪽에서) */
  function glassStreaks(S, quads, seed, o) {
    S.sprite(V.mul(V.add(quads[0][0], quads[0][2]), 0.5), (cam, ctx) => {
      const R = rng(seed);
      let s = '<g stroke="#DDE7EF" stroke-linecap="round" fill="none" opacity="' + ((o && o.op) || 0.55) + '">';
      for (const q of quads) {
        const pp = K.polyPath(cam, q, true);
        if (!pp) continue;
        const [x0, y0, x1, y1] = pp.bbox;
        const n = Math.min(60, Math.max(4, Math.round((x1 - x0) * (y1 - y0) / 1800)));
        const id = ctx.uid + 'gl' + Math.floor(R() * 1e6);
        s += '<clipPath id="' + id + '"><path d="' + pp.d + '"/></clipPath><g clip-path="url(#' + id + ')">';
        for (let i = 0; i < n; i++) {
          const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), l = 6 + R() * 26;
          s += '<path d="M' + K.n1(x) + ' ' + K.n1(y) + 'q' + K.n1(R() * 3 - 1.5) + ' ' + K.n1(l / 2) + ' ' + K.n1(R() * 2 - 1) + ' ' + K.n1(l) + '" stroke-width="' + K.n1(0.6 + R() * 1.2) + '"/>';
          if (R() < 0.4) s += '<circle cx="' + K.n1(x) + '" cy="' + K.n1(y + l) + '" r="' + K.n1(1 + R() * 1.6) + '" fill="#E8F0F5" stroke="none"/>';
        }
        s += '</g>';
      }
      return s + '</g>';
    }, { layer: (o && o.layer) !== undefined ? o.layer : 0.6, bias: -0.05, emit: true });
  }

  /* 차량 */
  function car(S, x, z, dir, o) {
    o = o || {};
    const L = 2.3, Wd = 0.9;
    S.box(x - Wd, x + Wd, 0.25, 0.95, z - L, z + L, { fill: o.fill || C.g5, sw: 0.9 });
    S.box(x - Wd + 0.1, x + Wd - 0.1, 0.95, 1.45, z - 1.1, z + 1.0, { fill: C.g7, sw: 0.9, fills: { top: o.fill || C.g5 } });
    if (o.taxi) S.box(x - 0.3, x + 0.3, 1.45, 1.65, z - 0.15, z + 0.15, { fill: '#F2D27A', sw: 0.7 });
    const front = z + dir * L;
    S.light({ pos: [x - 0.6, 0.65, front + dir * 0.05], col: dir < 0 ? 'wh' : 'r', glow: dir < 0 ? 0.4 : 0.22, int: 1, reflect: true });
    S.light({ pos: [x + 0.6, 0.65, front + dir * 0.05], col: dir < 0 ? 'wh' : 'r', glow: dir < 0 ? 0.4 : 0.22, int: 1, reflect: true });
  }

  const SETS = {};

  /* ════════ S#1 도심 횡단보도 ════════ */
  SETS.city = {
    name: '도심 횡단보도',
    build(shot) {
      const S = new Scene();
      S.sky = true; S.rain = shot.rain !== false; S.wet = true;
      S.face([[-400, -0.02, -120], [400, -0.02, -120], [400, -0.02, 600], [-400, -0.02, 600]], { fill: C.g6, layer: -1, n: [0, 1, 0], stroke: 'none' });
      S.face([[-7, 0, -120], [7, 0, -120], [7, 0, 400], [-7, 0, 400]], { fill: '#6A7076', layer: 0, n: [0, 1, 0], sw: 0.8 });
      // 보도
      S.box(-11, -7, 0, 0.15, -120, 400, { fill: C.g4, topFill: '#A9AEB3', layer: 0.2, sw: 0.8, plan: 'floor' });
      S.box(7, 11, 0, 0.15, -120, 400, { fill: C.g4, topFill: '#A9AEB3', layer: 0.2, sw: 0.8, plan: 'floor' });
      // 중앙선, 정지선
      for (let z = -100; z < 380; z += 9) S.face([[-0.12, 0.005, z], [0.12, 0.005, z], [0.12, 0.005, z + 4.5], [-0.12, 0.005, z + 4.5]], { fill: '#E9E2C8', layer: 0.1, n: [0, 1, 0], stroke: 'none' });
      S.face([[-7, 0.005, 7.6], [7, 0.005, 7.6], [7, 0.005, 8.0], [-7, 0.005, 8.0]], { fill: '#EDEDE8', layer: 0.1, n: [0, 1, 0], stroke: 'none' });
      // 횡단보도
      for (let i = 0; i < 13; i++) {
        const x = -6.6 + i * 1.05;
        S.face([[x, 0.006, 9.3], [x + 0.55, 0.006, 9.3], [x + 0.55, 0.006, 12.8], [x, 0.006, 12.8]], { fill: '#F1F1EC', layer: 0.1, n: [0, 1, 0], sw: 0.5 });
      }
      // 물웅덩이
      [[-3.5, 4, 2.2, 0.8], [2.5, 18, 3, 1.1], [-1, 26, 1.8, 0.7], [8.8, 12.5, 1.2, 0.5], [4.8, 6.5, 1.6, 0.6]].forEach(([x, z, rx, rz], i) => {
        const pts = []; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; pts.push([x + Math.cos(a) * rx * (1 + 0.15 * Math.sin(a * 3 + i)), x > 7 ? 0.152 : 0.004, z + Math.sin(a) * rz]); }
        S.face(pts, { fill: '#4C535B', layer: 0.15, n: [0, 1, 0], sw: 0.5 });
      });
      // 건물
      const R = rng(41);
      const right = [[-120, -72, 40], [-70, -40, 26], [-38, -14, 34], [-12, 7, 20], [15, 40, 52], [42, 78, 30], [80, 122, 64], [124, 170, 44]];
      const left = [[-120, -72, 30], [-70, -30, 40], [-28, 2, 56], [4, 26, 24], [28, 58, 38], [60, 100, 72], [102, 150, 50]];
      right.forEach(([z0, z1, h], i) => {
        const dec = { w: windows('w', z0, z1, 4, h - 1, 11, { seed: 100 + i, lit: 0.32 }), s: windows('s', 11, 26, 4, h - 1, z0, { seed: 200 + i, lit: 0.3 }) };
        dec.w.push({ pts: quadOn('w', z0 + 0.4, z1 - 0.4, 0.15, 3.3, 11, 0.03), fill: i === 3 ? '#F4D58E' : C.g5, emit: i === 3, sw: 0.7 });
        S.box(11, 26, 0, h, z0, z1, { fill: R() < 0.5 ? C.g4 : C.g5, topFill: C.g3, sideFill: C.g4, dec, plan: 'bldg' });
        if (h > 35) S.box(14, 18, h, h + 3, z0 + 3, z0 + 7, { fill: C.g6, sw: 0.7 });
      });
      left.forEach(([z0, z1, h], i) => {
        const dec = { e: windows('e', z0, z1, 4, h - 1, -11, { seed: 300 + i, lit: 0.3 }), s: windows('s', -26, -11, 4, h - 1, z0, { seed: 400 + i, lit: 0.3 }) };
        dec.e.push({ pts: quadOn('e', z0 + 0.4, z1 - 0.4, 0.15, 3.3, -11, 0.03), fill: i === 3 ? '#BFEFF7' : C.g5, emit: i === 3, sw: 0.7 });
        S.box(-26, -11, 0, h, z0, z1, { fill: R() < 0.5 ? C.g4 : C.g5, topFill: C.g3, sideFill: C.g4, dec, plan: 'bldg' });
        if (h > 45) S.box(-20, -15, h, h + 4, z0 + 4, z0 + 8, { fill: C.g6, sw: 0.7 });
      });
      // 먼 스카이라인
      for (let i = 0; i < 16; i++) {
        const x0 = -110 + i * 14 + R() * 4, h = 40 + R() * 90, z0 = 190 + R() * 60;
        S.box(x0, x0 + 10 + R() * 4, 0, h, z0, z0 + 12, { fill: '#5A6068', topFill: '#6A7078', sw: 0.6, dec: { s: windows('s', x0, x0 + 10, 6, h - 2, z0, { seed: 500 + i, lit: 0.18, w: 1.2, h: 1.4, ga: 2.4, gb: 3.6, sw: 0.3 }) } });
      }
      // 세로 네온 간판
      S.box(10.4, 11, 4.2, 10.2, 1.2, 2.2, { fill: '#2A2633', sw: 0.8, dec: { w: [text('w', 1.25, 2.15, 4.4, 10.0, 10.4, '노래연습장', { vertical: true, color: '#FF9DC6' })], s: [text('s', 10.45, 10.95, 4.4, 10.0, 1.2, '노래연습장', { vertical: true, color: '#FF9DC6' })] } });
      S.light({ pos: [10.0, 7.2, 1.7], col: 'm', glow: 1.6, int: 0.75, core: false, illum: { r: 4.5, int: 0.8, c: MAG } });
      S.box(-11, -10.4, 3.6, 9.0, 12.5, 13.5, { fill: '#1F2A30', sw: 0.8, dec: { e: [text('e', 12.6, 13.4, 3.8, 8.8, -10.4, '24시약국', { vertical: true, color: '#9BEFFF' })], s: [text('s', -10.95, -10.45, 3.8, 8.8, 12.5, '24시약국', { vertical: true, color: '#9BEFFF' })] } });
      S.light({ pos: [-10.0, 6.3, 13], col: 'c', glow: 1.5, int: 0.7, core: false, illum: { r: 4, int: 0.7, c: CYAN } });
      // 가로등
      [-90, -60, -30, 0, 33, 63, 93, 123].forEach((z) => lamp3D(S, -7.5, z, 7, 1.2, 0));
      [-75, -45, -15, 63, 93, 123].forEach((z) => lamp3D(S, 7.5, z, 7, -1.2, 0, { gy: 0.15 }));
      // 서연 뒤의 역광 가로등
      lamp3D(S, 9.9, 13.8, 6.2, -0.9, 0, { gy: 0.15, light: { glow: 0.75, int: 1, rainLit: 4.2, illum: { r: 6.5, int: 1.05, c: WARM }, key: 2 } });
      // 신호등
      S.box(7.45, 7.6, 0.15, 3.3, 13.2, 13.35, { fill: C.g7, sw: 0.7 });
      S.box(7.3, 7.75, 2.6, 3.4, 13.05, 13.5, { fill: C.g9, sw: 0.8 });
      S.light({ pos: [7.3, 3.15, 13.27], col: 'r', glow: 0.22, int: 0.9 });
      S.box(-7.6, -7.45, 0.15, 3.3, 13.4, 13.55, { fill: C.g7, sw: 0.7 });
      S.box(-7.75, -7.3, 2.6, 3.4, 13.25, 13.7, { fill: C.g9, sw: 0.8 });
      S.light({ pos: [-7.3, 3.15, 13.47], col: 'r', glow: 0.22, int: 0.9 });
      // 차
      car(S, -3.6, 38, -1, { taxi: true, fill: '#C9B98A' });
      car(S, 3.4, 64, 1, { fill: C.g5 });
      car(S, -3.4, 92, -1, { fill: C.g4 });
      return S;
    },
  };

  /* ════════ S#2·3 24시 식당 ════════ */
  SETS.diner = {
    name: '24시 식당',
    build(shot) {
      const S = new Scene();
      S.bg = C.g5;
      const X0 = -4.5, X1 = 4.5, Z0 = -4, Z1 = 3, Y1 = 3;
      // 바닥 체크 타일
      const T = 0.6;
      for (let i = 0; i < 15; i++) for (let j = 0; j < 12; j++) {
        const x = X0 + i * T, z = Z0 + j * (7 / 12);
        S.face([[x, 0, z], [x + T, 0, z], [x + T, 0, z + 7 / 12], [x, 0, z + 7 / 12]], { fill: (i + j) % 2 ? '#E9EAE6' : '#5E646A', layer: 0, n: [0, 1, 0], sw: 0.4 });
      }
      const wallFill = '#C5C9C4';
      // 뒷벽 (창)
      const winQ = [[-4.1, -1.5], [-1.3, 1.3], [1.5, 4.1]].map(([a, b]) => quadOn('n', a, b, 0.95, 2.45, Z1, 0.0).map((p) => [p[0], p[1], p[2] - 0.02]));
      const backDec = [];
      [[-4.1, -1.5], [-1.3, 1.3], [1.5, 4.1]].forEach(([a, b]) => {
        backDec.push({ pts: quadOn('n', a, b, 0.95, 2.45, Z1, -0.01).map((p) => p), fill: '#2E3640', stroke: C.ink, sw: 1.2, emit: true });
      });
      // 반전된 유리 글자 (안에서 본 '24시 식당')
      backDec.push(Object.assign(text('n', -1.1, 1.1, 2.08, 2.38, Z1, '24시 식당', { mirror: true, color: '#E25B4E', off: -0.03 }), {}));
      // 시계 23:41
      const clk = [];
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; clk.push([Math.cos(a) * 0.19, 2.72 + Math.sin(a) * 0.19, Z1 - 0.03]); }
      backDec.push({ pts: clk, fill: '#F5F4EE', sw: 1.2 });
      backDec.push({ pts: [[-0.012, 2.72, Z1 - 0.04], [0.012, 2.72, Z1 - 0.04], [-0.06, 2.80, Z1 - 0.04], [-0.075, 2.79, Z1 - 0.04]], fill: C.ink, sw: 0.6 });
      backDec.push({ pts: [[-0.01, 2.72, Z1 - 0.04], [0.01, 2.72, Z1 - 0.04], [-0.13, 2.67, Z1 - 0.04], [-0.135, 2.69, Z1 - 0.04]], fill: C.ink, sw: 0.6 });
      S.face([[X1, 0, Z1], [X0, 0, Z1], [X0, Y1, Z1], [X1, Y1, Z1]], { fill: wallFill, n: [0, 0, -1], layer: 0, dec: backDec });
      // 창 너머 거리 불빛
      S.light({ pos: [-2.6, 1.7, 9], col: 'm', glow: 0.9, int: 0.65, core: false, reflect: false, layer: 0.5 });
      S.light({ pos: [2.9, 1.5, 11], col: 'c', glow: 0.8, int: 0.6, core: false, reflect: false });
      S.light({ pos: [0.6, 2.1, 14], col: 'a', glow: 0.5, int: 0.6, reflect: false });
      glassStreaks(S, winQ, 77);
      // 앞벽 (출입문)
      const frontDec = [
        { pts: quadOn('s', -3.9, -1.9, 0.9, 2.4, Z0, -0.01).map((p) => p), fill: '#2E3640', emit: true, sw: 1.2 },
        { pts: quadOn('s', 2.0, 3.2, 0.02, 2.3, Z0, -0.01), fill: '#3A434D', emit: true, sw: 1.4 },
        text('s', 2.15, 3.05, 1.7, 2.0, Z0, 'OPEN', { color: '#FF7A6A', off: -0.03 }),
      ];
      S.face([[X0, 0, Z0], [X1, 0, Z0], [X1, Y1, Z0], [X0, Y1, Z0]], { fill: wallFill, n: [0, 0, 1], layer: 0, dec: frontDec });
      // 왼벽 (액자, 코트걸이)
      const leftDec = [
        { pts: quadOn('e', -1.2, -0.3, 1.35, 2.05, X0, -0.02).map((p) => p), fill: '#FFFFFF', sw: 1.4 },
        { pts: quadOn('e', -1.1, -0.4, 1.45, 1.95, X0, -0.03), photo: 'shoulders' },
        { pts: quadOn('e', 0.4, 1.4, 1.3, 2.1, X0, -0.02), fill: '#D8D2C2', sw: 1.4 },
        text('e', 0.5, 1.3, 1.55, 1.85, X0, '오늘의 커피', { font: 'hand', off: -0.04 }),
      ];
      S.face([[X0, 0, Z1], [X0, 0, Z0], [X0, Y1, Z0], [X0, Y1, Z1]], { fill: '#BFC4BE', n: [1, 0, 0], layer: 0, dec: leftDec });
      // 오른벽 (주방문, 메뉴)
      const rightDec = [
        { pts: quadOn('w', -1.0, 0.0, 0.02, 2.2, X1, -0.02), fill: C.g5, sw: 1.4 },
        { pts: (() => { const p = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; p.push([X1 - 0.03, 1.6 + Math.sin(a) * 0.17, -0.5 + Math.cos(a) * 0.17]); } return p; })(), fill: '#F3E3B5', emit: true, sw: 1.1 },
        { pts: quadOn('w', 0.7, 2.4, 1.5, 2.5, X1, -0.02), fill: '#2F3436', sw: 1.4 },
        text('w', 0.85, 2.25, 2.12, 2.4, X1, 'MENU', { color: '#F2EDE0', off: -0.04 }),
        text('w', 0.85, 2.25, 1.62, 2.0, X1, '커피 · 토스트 · 국밥', { color: '#F2EDE0', font: 'hand', off: -0.04 }),
      ];
      S.face([[X1, 0, Z0], [X1, 0, Z1], [X1, Y1, Z1], [X1, Y1, Z0]], { fill: '#BFC4BE', n: [-1, 0, 0], layer: 0, dec: rightDec });
      // 천장 + 형광등
      const ceilDec = [];
      [[-2.5, -1.6], [2.5, -1.6], [-2.5, 1.4], [2.5, 1.4]].forEach(([x, z]) => ceilDec.push({ pts: [[x - 0.6, Y1 - 0.01, z + 0.15], [x + 0.6, Y1 - 0.01, z + 0.15], [x + 0.6, Y1 - 0.01, z - 0.15], [x - 0.6, Y1 - 0.01, z - 0.15]], fill: '#F4F8F6', emit: true, sw: 0.8 }));
      S.face([[X0, Y1, Z0], [X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0]], { fill: '#D9DCD8', n: [0, -1, 0], layer: 0, dec: ceilDec });
      [[-2.5, -1.6], [2.5, -1.6], [-2.5, 1.4], [2.5, 1.4]].forEach(([x, z]) => S.light({ pos: [x, Y1 - 0.05, z], col: 'wh', glow: 0.25, int: 0.3, core: false, reflect: false, illum: { r: 3.2, int: 0.32, c: [0.9, 0.97, 1] } }));
      // 카운터 + 스툴
      S.box(-4.5, 1.0, 0, 1.0, -3.45, -2.85, { fill: '#8F7F6F', topFill: '#D9D6CF', sw: 1, plan: 'furn', planLabel: '카운터' });
      S.box(-4.5, 1.1, 1.0, 1.06, -3.5, -2.75, { fill: '#D9D6CF', sw: 0.9 });
      S.box(-4.4, -2.0, 1.06, 1.9, -3.95, -3.7, { fill: C.g6, sw: 0.8 });
      [-3.6, -2.6, -1.6, -0.6, 0.4].forEach((x) => S.sprite([x, 0, -2.5], (cam, ctx) => PROPS.stool(cam, [x, 0, -2.5], ctx)));
      // 다른 부스들
      [[-3.2, 1.9], [3.2, 1.9]].forEach(([x, z]) => {
        S.box(x - 0.45, x + 0.45, 0.72, 0.76, z - 0.4, z + 0.4, { fill: '#E6E3DC', sw: 0.9 });
        S.box(x - 0.05, x + 0.05, 0, 0.72, z - 0.05, z + 0.05, { fill: C.g6, sw: 0.7 });
      });
      // 메인 부스
      S.box(-0.42, 0.42, 0.72, 0.76, -0.45, 0.45, { fill: '#E6E3DC', topFill: '#EFEDE7', sw: 1.1, plan: 'furn', planLabel: '테이블' });
      S.box(-0.06, 0.06, 0, 0.72, -0.06, 0.06, { fill: C.g6, sw: 0.8 });
      const booth = { fill: '#8A5E57', topFill: '#9C6C64', sideFill: '#7D544E', sw: 1 };
      S.box(-1.34, -0.88, 0, 0.45, -0.6, 0.6, booth);
      S.box(-1.34, -1.2, 0.45, 1.2, -0.6, 0.6, Object.assign({ plan: 'furn' }, booth));
      S.box(0.88, 1.34, 0, 0.45, -0.6, 0.6, booth);
      S.box(1.2, 1.34, 0.45, 1.2, -0.6, 0.6, Object.assign({ plan: 'furn' }, booth));
      // 펜던트 조명
      S.sprite([0, 1.85, 0], (cam, ctx) => PROPS.pendant(cam, [0, 1.85, 0], ctx), { bias: -0.02 });
      S.light({ pos: [0, 1.82, 0], col: 'w', glow: 0.22, int: 0.9, pool: 0.75, groundY: 0.765, poolA: 0.55, reflect: false, illum: { r: 1.5, int: 0.8, c: WARM }, key: 3 });
      // 소품
      const cups = shot.cups || [[-0.2, 0.76, 0.1], [0.22, 0.76, -0.08]];
      cups.forEach((p) => S.sprite(p, (cam, ctx) => PROPS.cup(cam, p, ctx), { bias: -0.3 }));
      if (shot.filmcam !== false) {
        const fp = shot.filmcam || [-0.1, 0.76, -0.2];
        S.sprite(fp, (cam, ctx) => PROPS.filmcam(cam, fp, ctx), { bias: -0.3 });
      }
      S.box(-0.05, 0.05, 0.76, 0.9, 0.28, 0.4, { fill: '#F0F0EC', sw: 0.7 });
      S.plan.push({ x0: X0, x1: X1, z0: Z1, z1: Z1 + 0.15, kind: 'wall', label: '창' });
      S.plan.push({ x0: X0, x1: X1, z0: Z0 - 0.15, z1: Z0, kind: 'wall' });
      return S;
    },
  };

  /* ════════ S#4 암실 ════════ */
  SETS.darkroom = {
    name: '서연의 암실',
    build(shot) {
      const S = new Scene();
      S.bg = '#3A2A28';
      const X0 = -1.8, X1 = 1.8, Z0 = -2.2, Z1 = 1.2, Y1 = 2.5;
      S.face([[X0, 0, Z0], [X1, 0, Z0], [X1, 0, Z1], [X0, 0, Z1]], { fill: '#6C6F72', n: [0, 1, 0], layer: 0, dec: [] });
      for (let i = 1; i < 6; i++) S.line([X0, 0.002, Z0 + i * 0.6], [X1, 0.002, Z0 + i * 0.6], { sw: 0.5, layer: 0.1, op: 0.6 });
      const wall = '#9EA2A3';
      const backDec = [
        // 안전등
        { pts: quadOn('n', 0.82, 1.08, 1.96, 2.14, Z1, -0.11), fill: '#FF6A4E', emit: true, sw: 1.0 },
        // 타이머 시계
        (() => { const p = []; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; p.push([-0.75 + Math.cos(a) * 0.11, 1.32 + Math.sin(a) * 0.11, Z1 - 0.02]); } return { pts: p, fill: '#F4F2EC', sw: 1 }; })(),
        { pts: [[-0.755, 1.32, Z1 - 0.03], [-0.745, 1.32, Z1 - 0.03], [-0.69, 1.38, Z1 - 0.03], [-0.7, 1.39, Z1 - 0.03]], fill: C.ink, sw: 0.5 },
      ];
      S.face([[X1, 0, Z1], [X0, 0, Z1], [X0, Y1, Z1], [X1, Y1, Z1]], { fill: wall, n: [0, 0, -1], layer: 0, dec: backDec });
      S.face([[X0, 0, Z0], [X1, 0, Z0], [X1, Y1, Z0], [X0, Y1, Z0]], { fill: wall, n: [0, 0, 1], layer: 0, dec: [
        { pts: quadOn('s', -0.5, 0.45, 0.02, 2.05, Z0, -0.02), fill: '#6E7275', sw: 1.4 },
        { pts: quadOn('s', -0.35, 0.3, 1.45, 1.75, Z0, -0.03), fill: '#C9372C', sw: 1 },
        text('s', -0.33, 0.28, 1.47, 1.73, Z0, '현상 중 · 열지 마시오', { color: '#FFF1E8', font: 'hand', off: -0.05 }),
      ] });
      S.face([[X0, 0, Z1], [X0, 0, Z0], [X0, Y1, Z0], [X0, Y1, Z1]], { fill: '#979B9C', n: [1, 0, 0], layer: 0, dec: [
        { pts: quadOn('e', -1.4, -0.2, 1.1, 1.9, X0, -0.02), fill: '#4A4E52', sw: 1.2 },
        text('e', -1.3, -0.3, 1.45, 1.75, X0, '노출표 f/8 · 12s', { color: '#E8E4DA', font: 'hand', off: -0.04 }),
      ] });
      S.face([[X1, 0, Z0], [X1, 0, Z1], [X1, Y1, Z1], [X1, Y1, Z0]], { fill: '#979B9C', n: [-1, 0, 0], layer: 0 });
      S.face([[X0, Y1, Z0], [X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0]], { fill: '#8B8F90', n: [0, -1, 0], layer: 0, dec: [{ pts: [[-0.6, Y1 - 0.01, -0.3], [0.6, Y1 - 0.01, -0.3], [0.6, Y1 - 0.01, -0.5], [-0.6, Y1 - 0.01, -0.5]], fill: '#F2F6F4', emit: true, sw: 0.8 }] });
      // 카운터
      S.box(X0 + 0.05, X1 - 0.05, 0, 0.88, 0.55, Z1, { fill: '#5D6266', topFill: '#71767A', sw: 1, plan: 'furn', planLabel: '작업대', dec: { s: [
        { pts: quadOn('s', -1.65, -0.6, 0.08, 0.8, 0.55, 0.01), fill: 'none', sw: 0.8 },
        { pts: quadOn('s', -0.5, 0.5, 0.08, 0.8, 0.55, 0.01), fill: 'none', sw: 0.8 },
        { pts: quadOn('s', 0.6, 1.65, 0.08, 0.8, 0.55, 0.01), fill: 'none', sw: 0.8 },
      ] } });
      S.box(X0 + 0.02, X1 - 0.02, 0.88, 0.92, 0.5, Z1, { fill: '#7C8185', sw: 0.9 });
      // 트레이 3개
      [[-0.52, '현상', '#D7D2C6'], [0, '정지', '#CFCBC2'], [0.52, '정착', '#D2CEC6']].forEach(([x, lb, liq], i) => {
        const z0 = 0.66, z1 = 0.98;
        S.box(x - 0.2, x + 0.2, 0.92, 0.98, z0, z1, { fill: '#ECEAE4', topFill: '#ECEAE4', sw: 1, dec: {
          top: [{ pts: quadOn('top', x - 0.17, x + 0.17, z0 + 0.03, z1 - 0.03, 0.98, 0.001), fill: liq, sw: 0.6 }].concat(i === 0 && shot.photo !== false ? [
            { pts: quadOn('top', x - 0.13, x + 0.13, z0 + 0.06, z1 - 0.06, 0.98, 0.003), fill: '#F8F6F0', sw: 0.6 },
            { pts: (() => { const q = quadOn('top', x - 0.115, x + 0.115, z0 + 0.075, z1 - 0.075, 0.98, 0.004); return [q[3], q[2], q[1], q[0]]; })(), photo: 'gallery', op: shot.photoOp || 0.82 },
          ] : []),
          s: [text('s', x - 0.18, x + 0.18, 0.925, 0.975, z0, lb, { font: 'hand', color: C.ink, off: 0.005 })],
        } });
      });
      // 집게
      S.box(0.12, 0.3, 0.98, 1.0, 0.7, 0.73, { fill: '#C0C4C8', sw: 0.6 });
      // 선반 + 병
      S.box(-1.6, -0.35, 1.88, 1.92, 0.95, Z1, { fill: '#7B8084', sw: 0.8 });
      [-1.5, -1.3, -1.12, -0.9, -0.62].forEach((x, i) => S.box(x, x + 0.12, 1.92, 2.12 + (i % 2) * 0.06, 1.0, 1.12, { fill: i % 2 ? '#6E5A44' : '#4E5A63', sw: 0.7 }));
      // 확대기
      S.box(-1.62, -1.12, 0.92, 0.96, 0.62, 1.12, { fill: '#E8E6E0', sw: 0.8 });
      S.box(-1.4, -1.34, 0.96, 1.85, 1.02, 1.08, { fill: C.g7, sw: 0.7 });
      S.box(-1.56, -1.16, 1.35, 1.62, 0.72, 1.06, { fill: C.g8, sw: 0.9 });
      S.box(-1.42, -1.3, 1.24, 1.35, 0.82, 0.94, { fill: C.g9, sw: 0.7 });
      // 안전등
      S.box(0.82, 1.08, 1.96, 2.14, 1.09, Z1, { fill: '#3B2A28', sw: 0.9, fills: { s: '#FF6A4E' }, dec: {} });
      S.light({ pos: [0.95, 2.05, 1.05], col: 'r', glow: 0.3, int: 1, looks: ['safelight', 'safekey'], illum: { r: 1.6, int: 1.5, c: RED }, key: 4, rainLit: 1 });
      S.light({ pos: [0, 2.45, -0.4], col: 'wh', glow: 0.35, int: 0.8, looks: ['fluor'], illum: { r: 4, int: 0.6, c: WHITE } });
      // 빨랫줄 + 인화지
      S.line([X0, 2.05, -0.95], [X1, 2.05, -0.95], { sw: 1.1 });
      const prints = shot.prints || [[-1.35, 'misc'], [-0.85, 'shoulders'], [-0.3, 'misc'], [0.3, 'gallery'], [0.85, 'misc'], [1.35, 'shoulders']];
      prints.forEach(([x, kind]) => {
        const q = [[x - 0.11, 1.74, -0.95], [x + 0.11, 1.74, -0.95], [x + 0.11, 2.02, -0.95], [x - 0.11, 2.02, -0.95]];
        S.face(q, { fill: '#F4F2EC', sw: 0.8, dec: [{ pts: [[x - 0.095, 2.0, -0.951], [x + 0.095, 2.0, -0.951], [x + 0.095, 1.76, -0.951], [x - 0.095, 1.76, -0.951]], photo: kind, op: 0.85 }] });
        S.box(x - 0.012, x + 0.012, 1.99, 2.08, -0.97, -0.93, { fill: '#B98E5A', sw: 0.5 });
      });
      S.plan.push({ x0: X0, x1: X1, z0: Z1, z1: Z1 + 0.12, kind: 'wall' });
      S.plan.push({ x0: X0, x1: X1, z0: Z0 - 0.12, z1: Z0, kind: 'wall', label: '문' });
      S.plan.push({ x0: X0 - 0.12, x1: X0, z0: Z0, z1: Z1, kind: 'wall' });
      S.plan.push({ x0: X1, x1: X1 + 0.12, z0: Z0, z1: Z1, kind: 'wall' });
      return S;
    },
  };

  /* ════════ S#5 역으로 가는 길 ════════ */
  SETS.street = {
    name: '역으로 가는 길',
    build(shot) {
      const S = new Scene();
      S.sky = true; S.rain = shot.rain !== false; S.wet = true;
      S.face([[-400, -0.02, -200], [400, -0.02, -200], [400, -0.02, 400], [-400, -0.02, 400]], { fill: C.g6, layer: -1, n: [0, 1, 0], stroke: 'none' });
      S.face([[-200, 0, -7.4], [64, 0, -7.4], [64, 0, -0.4], [-200, 0, -0.4]], { fill: '#686E74', layer: 0, n: [0, 1, 0], sw: 0.8 });
      S.box(-200, 64, 0, 0.15, -0.4, 3.4, { fill: C.g4, topFill: '#ADB2B6', layer: 0.2, sw: 0.8, plan: 'floor' });
      S.box(-200, 64, 0, 0.15, -9.6, -7.4, { fill: C.g4, topFill: '#ADB2B6', layer: 0.2, sw: 0.8 });
      for (let x = -190; x < 60; x += 8) S.face([[x, 0.005, -3.98], [x + 4, 0.005, -3.98], [x + 4, 0.005, -3.82], [x, 0.005, -3.82]], { fill: '#E9E2C8', layer: 0.1, n: [0, 1, 0], stroke: 'none' });
      // 보도 블록 줄눈
      for (let x = -60; x < 60; x += 1.2) S.line([x, 0.152, -0.4], [x, 0.152, 3.4], { sw: 0.35, op: 0.5, layer: 0.3 });
      // 물웅덩이
      [[-3, 1.6, 1.0, 0.45], [5, 0.4, 1.4, 0.5], [13, 2.2, 0.9, 0.4], [-11, 0.8, 1.2, 0.5], [21, 1.0, 1.1, 0.4]].forEach(([x, z, rx, rz], i) => {
        const pts = []; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; pts.push([x + Math.cos(a) * rx * (1 + 0.12 * Math.sin(a * 3 + i)), 0.153, z + Math.sin(a) * rz]); }
        S.face(pts, { fill: '#585F66', layer: 0.35, n: [0, 1, 0], sw: 0.5 });
      });
      // 가게들 (가까운 쪽, 정면 z=3.4)
      const R = rng(9);
      const names = ['세탁소', '철물점', '분식', '부동산', '편의점', '꽃집', '인쇄소', '치킨', '약국', '문구', '사진관', '국밥'];
      let x = -60, i = 0;
      while (x < 60) {
        const w = 7 + R() * 4, h = 7 + R() * 9;
        const nm = names[i % names.length];
        const lit = nm === '편의점' || nm === '사진관' || nm === '국밥';
        const dec = {
          s: [
            { pts: quadOn('s', x + 0.5, x + w - 0.5, 0.15, 2.7, 3.4, 0.02), fill: lit ? '#F3E1A6' : '#7D838A', emit: lit, sw: 0.8 },
          ].concat(lit ? [] : [0.6, 1.0, 1.4, 1.8, 2.2].map((y) => ({ pts: quadOn('s', x + 0.5, x + w - 0.5, y, y + 0.03, 3.4, 0.03), fill: C.g8, stroke: 'none' })))
            .concat(windows('s', x, x + w, 3.8, h - 0.5, 3.4, { seed: 700 + i, lit: 0.3, w: 1.2, h: 1.4, ga: 2.3, gb: 2.8 })),
        };
        S.box(x, x + w, 0, h, 3.4, 14, { fill: R() < 0.5 ? C.g4 : '#9AA0A5', topFill: C.g3, sideFill: C.g5, dec, plan: 'bldg' });
        // 간판
        S.box(x + 0.6, x + w - 0.6, 2.85, 3.55, 3.18, 3.4, { fill: lit ? '#F7F3E4' : '#E5E2DA', sw: 0.9, dec: { s: [text('s', x + 0.8, x + w - 0.8, 2.92, 3.48, 3.18, nm, { color: lit ? '#C33A2F' : C.ink })] } });
        if (lit) S.light({ pos: [x + w / 2, 1.4, 3.2], col: 'a', glow: 0.9, int: 0.55, core: false, reflect: true, illum: { r: 3.6, int: 0.7, c: WARM } });
        x += w + 0.4; i++;
      }
      // 맞은편 건물 (정면 z=-9.6)
      x = -60; i = 0;
      while (x < 60) {
        const w = 8 + R() * 6, h = 9 + R() * 16;
        S.box(x, x + w, 0, h, -22, -9.6, { fill: R() < 0.5 ? C.g4 : C.g5, topFill: C.g3, sw: 0.9, dec: { n: windows('n', x, x + w, 3.2, h - 0.6, -9.6, { seed: 800 + i, lit: 0.35, w: 1.3, h: 1.5, ga: 2.5, gb: 3 }).concat([{ pts: quadOn('n', x + 0.4, x + w - 0.4, 0.15, 2.8, -9.6, 0.02), fill: i % 3 === 1 ? '#CDEBF2' : '#73797F', emit: i % 3 === 1, sw: 0.7 }]) } });
        x += w + 0.5; i++;
      }
      // 역 건물 (거리 끝)
      S.box(64, 92, 0, 14.5, -16, 18, { fill: '#8C9298', topFill: C.g3, sw: 1, plan: 'bldg', planLabel: '역', dec: { w: [
        { pts: quadOn('w', -6, 8, 7.2, 10.2, 64, 0.03), fill: '#F6F2E2', emit: true, sw: 1.2 },
        text('w', -5.6, 7.6, 7.5, 9.9, 64, '해원역 HAEWON', { color: '#24477A' }),
        { pts: quadOn('w', -4, 6, 0.0, 4.8, 64, 0.02), fill: '#F2DEA2', emit: true, sw: 1.2 },
        { pts: quadOn('w', -5.2, -1.6, 10.6, 12.6, 64, 0.03), fill: '#202326', sw: 1 },
        text('w', -5.0, -1.8, 10.8, 12.4, 64, '23:53', { color: '#FF6A55', off: 0.05 }),
      ] } });
      S.light({ pos: [63.5, 8.7, 1], col: 'wh', glow: 3.2, int: 0.7, core: false, illum: { r: 12, int: 0.6, c: WARM } });
      S.light({ pos: [63.5, 2.4, 1], col: 'a', glow: 2.4, int: 0.6, core: false });
      // 역 방향 표지판 (양면: 어느 쪽에서 보느냐에 따라 화살표가 반대)
      S.box(2.92, 3.08, 0.15, 2.4, -0.25, -0.15, { fill: C.g7, sw: 0.7 });
      S.box(2.0, 4.0, 2.4, 2.95, -0.24, -0.16, { fill: '#2D5B97', sw: 0.9, dec: {
        s: [text('s', 2.08, 3.92, 2.45, 2.9, -0.24, '해원역 →', { color: '#FFFFFF' })],
        n: [text('n', 2.08, 3.92, 2.45, 2.9, -0.16, '← 해원역', { color: '#FFFFFF' })],
      } });
      // 가로등, 전봇대, 전선
      [-48, -32, -16, 0, 16, 32, 48].forEach((lx) => lamp3D(S, lx + 7, -0.15, 6.2, 0, -1.3, { gy: 0.15 }));
      [-40, -15, 10, 35].forEach((px) => {
        S.box(px - 0.13, px + 0.13, 0.15, 9.5, -0.33, -0.07, { fill: C.g7, sw: 0.8 });
        S.box(px - 0.06, px + 0.06, 8.6, 8.75, -1.1, 0.7, { fill: C.g7, sw: 0.6 });
      });
      [[-40, -15], [-15, 10], [10, 35]].forEach(([a, b]) => {
        [-1.0, -0.2, 0.6].forEach((dz) => {
          const m = [(a + b) / 2, 7.9, -0.2 + dz];
          S.line([a, 8.7, -0.2 + dz], m, { sw: 0.7, op: 0.85 });
          S.line(m, [b, 8.7, -0.2 + dz], { sw: 0.7, op: 0.85 });
        });
        S.line([b, 9.2, -0.2], [b - 6, 7.2, -9.6], { sw: 0.6, op: 0.7 });
      });
      return S;
    },
  };

  /* ════════ S#6 플랫폼 ════════ */
  SETS.platform = {
    name: '해원역 플랫폼',
    build(shot, t) {
      const S = new Scene();
      S.sky = true; S.rain = false;
      const PY = 1.1;
      const off = (shot.trainX || 0) + (shot.trainV || 0) * ((t === undefined ? 0.5 : t) - 0.5);
      S.face([[-400, -0.02, -200], [400, -0.02, -200], [400, -0.02, 400], [-400, -0.02, 400]], { fill: C.g6, layer: -1, n: [0, 1, 0], stroke: 'none' });
      S.face([[-200, 0, 0], [200, 0, 0], [200, 0, 8], [-200, 0, 8]], { fill: '#6B6660', layer: 0, n: [0, 1, 0], sw: 0.6 });
      // 침목 + 레일
      for (let sx = -60; sx < 60; sx += 0.7) S.face([[sx, 0.08, 0.7], [sx + 0.25, 0.08, 0.7], [sx + 0.25, 0.08, 2.9], [sx, 0.08, 2.9]], { fill: '#56514C', layer: 0.1, n: [0, 1, 0], sw: 0.3 });
      [1.25, 2.35, 5.0, 6.1].forEach((z) => S.line([-200, 0.17, z], [200, 0.17, z], { sw: 1.4, layer: 0.2 }));
      // 플랫폼
      S.box(-200, 200, 0, PY, -8, 0, { fill: '#858A8F', topFill: '#A4A7A8', layer: 0.3, sw: 0.9, plan: 'floor', planLabel: '플랫폼' });
      S.face([[-200, PY + 0.003, -0.95], [200, PY + 0.003, -0.95], [200, PY + 0.003, -0.6], [-200, PY + 0.003, -0.6]], { fill: '#E3BE3E', layer: 0.4, n: [0, 1, 0], sw: 0.5 });
      S.face([[-200, PY + 0.003, -0.18], [200, PY + 0.003, -0.18], [200, PY + 0.003, -0.06], [-200, PY + 0.003, -0.06]], { fill: '#F2F0E8', layer: 0.4, n: [0, 1, 0], stroke: 'none' });
      for (let x = -60; x < 60; x += 1.5) S.line([x, PY + 0.002, -8], [x, PY + 0.002, -0.95], { sw: 0.3, op: 0.4, layer: 0.35 });
      // 기둥 + 지붕
      const roofDec = [];
      for (let lx = -64; lx <= 64; lx += 8) roofDec.push({ pts: [[lx - 1.4, 5.59, -3.1], [lx + 1.4, 5.59, -3.1], [lx + 1.4, 5.59, -3.3], [lx - 1.4, 5.59, -3.3]], fill: '#FBF7E8', emit: true, sw: 0.7 });
      S.box(-200, 200, 5.6, 5.95, -8.5, -2.4, { fill: '#5F656B', sw: 1, dec: { bot: roofDec }, fills: { bot: '#7E8489' } });
      for (let lx = -60; lx <= 60; lx += 12) S.box(lx - 0.18, lx + 0.18, PY, 5.6, -4.6, -4.24, { fill: '#7A8086', sideFill: '#6A7076', sw: 0.9, plan: 'furn' });
      for (let lx = -64; lx <= 64; lx += 8) S.light({ pos: [lx, 5.5, -3.2], col: 'wh', glow: 0.5, int: 0.55, core: false, pool: 2.6, groundY: PY, poolA: 0.35, reflect: false, illum: { r: 3.4, int: 0.3, c: [0.95, 0.97, 1] } });
      // 역명판, 시계, 벤치
      S.box(4.6, 7.6, 4.3, 4.95, -3.05, -2.95, { fill: '#F4F3EE', sw: 1, dec: { s: [text('s', 4.75, 7.45, 4.4, 4.85, -3.05, '해원 HAEWON', { color: '#24477A' })], n: [text('n', 4.75, 7.45, 4.4, 4.85, -2.95, '해원 HAEWON', { color: '#24477A' })] } });
      S.line([5.0, 4.95, -3.0], [5.0, 5.6, -3.0], { sw: 1 }); S.line([7.2, 4.95, -3.0], [7.2, 5.6, -3.0], { sw: 1 });
      S.box(-3.6, -2.4, 4.55, 4.95, -3.05, -2.95, { fill: '#202326', sw: 1, dec: { s: [text('s', -3.5, -2.5, 4.6, 4.9, -3.05, '23:55', { color: '#FF6A55' })], n: [text('n', -3.5, -2.5, 4.6, 4.9, -2.95, '23:55', { color: '#FF6A55' })] } });
      S.line([-3.0, 4.95, -3.0], [-3.0, 5.6, -3.0], { sw: 1 });
      S.box(-9, -6.5, PY + 0.42, PY + 0.48, -5.4, -4.9, { fill: '#A27A55', sw: 0.8 });
      S.box(-8.9, -8.8, PY, PY + 0.42, -5.3, -5.0, { fill: C.g7, sw: 0.6 }); S.box(-6.7, -6.6, PY, PY + 0.42, -5.3, -5.0, { fill: C.g7, sw: 0.6 });
      // 건너편 담장, 건물
      S.box(-200, 200, 0, 2.2, 8.5, 8.8, { fill: C.g5, sw: 0.8 });
      const R = rng(13);
      for (let bx = -80; bx < 80; bx += 12 + R() * 6) {
        const h = 12 + R() * 30;
        S.box(bx, bx + 10, 0, h, 26 + R() * 10, 40, { fill: '#5E646B', topFill: '#6C7279', sw: 0.6, dec: { s: windows('s', bx, bx + 10, 3, h - 1, 26, { seed: 900 + Math.floor(bx), lit: 0.25, w: 1.2, h: 1.4, ga: 2.4, gb: 3 }) } });
      }
      // 열차
      const ZN = 0.35, ZF = 3.35;
      for (let k = -4; k <= 2; k++) {
        const x0 = -7.55 + 20.5 * k + off;
        const dec = [];
        [2.0, 7.3, 10.0, 12.7, 18.0].forEach((wx) => dec.push({ pts: quadOn('s', x0 + wx - 0.75, x0 + wx + 0.75, 2.05, 2.95, ZN, 0.01), fill: '#F6E3B0', emit: true, sw: 1.1 }));
        [4.65, 15.35].forEach((dx) => {
          dec.push({ pts: quadOn('s', x0 + dx - 0.65, x0 + dx + 0.65, 1.12, 3.15, ZN, 0.01), fill: '#9AA0A6', sw: 1.1 });
          dec.push({ pts: quadOn('s', x0 + dx - 0.55, x0 + dx - 0.05, 2.0, 2.95, ZN, 0.02), fill: '#F6E3B0', emit: true, sw: 0.8 });
          dec.push({ pts: quadOn('s', x0 + dx + 0.05, x0 + dx + 0.55, 2.0, 2.95, ZN, 0.02), fill: '#F6E3B0', emit: true, sw: 0.8 });
        });
        dec.push({ pts: quadOn('s', x0 + 0.1, x0 + 19.9, 1.62, 1.78, ZN, 0.005), fill: '#2F6FB0', stroke: 'none' });
        if (shot.speed) for (let q = 0; q < 6; q++) { const y = 1.3 + q * 0.42; dec.push({ pts: quadOn('s', x0, x0 + 20, y, y + 0.02, ZN, 0.03), fill: '#FFF2CF', emit: true, stroke: 'none', op: 0.7 }); }
        S.box(x0, x0 + 20, 1.05, 4.0, ZN, ZF, { fill: '#B7BCC0', topFill: '#9DA2A7', sideFill: '#AAB0B4', sw: 1.1, dec: { s: dec }, plan: k === 0 ? 'train' : undefined, planLabel: k === 0 ? '열차' : undefined });
        S.box(x0 + 0.5, x0 + 19.5, 0.35, 1.05, 0.6, 3.1, { fill: C.g8, sw: 0.8 });
        [3.2, 9.6, 16.4].forEach((wx) => S.light({ pos: [x0 + wx, 2.4, ZN - 1.2], col: 'w', glow: 0.0, int: 0, core: false, reflect: false, illum: { r: 2.0, int: 0.22, c: WARM }, key: 2 }));
        if (k === -4) [0.75, 2.95].forEach((tz) => S.light({ pos: [x0 - 0.05, 1.6, tz], col: 'r', glow: 0.35, int: 1, reflect: false }));
        if (shot.trainV) [2.0, 10.0, 18.0].forEach((wx) => S.light({ pos: [x0 + wx, 2.5, ZN - 0.05], col: 'w', glow: 0.9, int: 0.35, core: false, reflect: false }));
      }
      // 창 유리 반사 (준호가 있는 창)
      const wq = [[1.7 + off, 2.05, ZN - 0.03], [3.2 + off, 2.05, ZN - 0.03], [3.2 + off, 2.95, ZN - 0.03], [1.7 + off, 2.95, ZN - 0.03]];
      S.sprite([2.45 + off, 2.5, ZN - 0.03], (cam, ctx) => {
        const pp = K.polyPath(cam, wq, true);
        if (!pp) return '';
        const [x0, y0, x1, y1] = pp.bbox;
        const id = ctx.uid + 'wr';
        let s = '<clipPath id="' + id + '"><path d="' + pp.d + '"/></clipPath><g clip-path="url(#' + id + ')" opacity=".55" style="mix-blend-mode:screen">';
        const w = x1 - x0;
        [[0.1, 0.12], [0.3, 0.05], [0.62, 0.09]].forEach(([a, b]) => {
          s += '<path d="M' + K.n1(x0 + w * a) + ' ' + K.n1(y1) + 'L' + K.n1(x0 + w * (a + b)) + ' ' + K.n1(y1) + 'L' + K.n1(x0 + w * (a + b + 0.25)) + ' ' + K.n1(y0) + 'L' + K.n1(x0 + w * (a + 0.25)) + ' ' + K.n1(y0) + 'Z" fill="#FFFFFF" opacity=".5"/>';
        });
        return s + '</g>';
      }, { bias: -0.6, emit: true });
      S.windowClip = wq;
      return S;
    },
  };

  K.SETS = SETS;
})(typeof window !== 'undefined' ? window : globalThis);
