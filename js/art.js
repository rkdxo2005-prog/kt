/* ──────────────────────────────────────────────────────────────
   인물·소품 드로잉
   인물은 카메라를 향한 빌보드 평면(로컬 u: 화면 오른쪽, v: 위, 단위 m)에
   그려지고, 각 점은 원근 투영된다. 인물이 바라보는 방향과 카메라 방향의
   관계(s: 옆으로 돈 정도, c: 카메라를 향한 정도)에서 얼굴·팔·다리 배치가
   자동으로 계산되므로, 카메라가 180도 선을 넘으면 인물의 시선 방향도
   실제로 뒤집혀 보인다.
   ────────────────────────────────────────────────────────────── */
(function (G) {
  'use strict';
  const K = G.KONTI;
  const { V, C, n1, clamp, D2R, toCam, scr, pathFrom, ellipseCmds, limbCmds } = K;

  const CAST = {
    seoyeon: { name: '서연', h: 1.64, hair: 'long', hairC: '#3B3E44', coat: '#CDC6BA', coat2: '#B3AB9E', pants: '#4A4E55', shoe: '#2F3236', skin: '#FBF7F0', umbrella: '#B0453C' },
    junho: { name: '준호', h: 1.72, hair: 'short', hairC: '#9A9FA5', coat: '#858B92', coat2: '#6B7178', pants: '#50555C', shoe: '#2C2F33', skin: '#F7F1E7', glasses: true, old: true },
    kid: { name: '아이', h: 1.05, hair: 'long', hairC: '#3B3E44', coat: '#E3E5E7', coat2: '#C9CDD1', pants: '#5D6268', shoe: '#33363B', skin: '#FBF7F0', coatLen: 'short' },
  };

  const EXPR = {
    neutral: { lid: 1.0, brow: 0.1, bh: 0, mouth: 0, open: 0 },
    cold: { lid: 0.62, brow: -0.7, bh: -0.004, mouth: -0.12, open: 0 },
    sad: { lid: 0.78, brow: 0.9, bh: 0.002, mouth: -0.55, open: 0 },
    tears: { lid: 0.72, brow: 1.1, bh: 0.003, mouth: -0.75, open: 0.12, tear: true },
    shock: { lid: 1.4, brow: 0.35, bh: 0.012, mouth: 0, open: 0.75 },
    soft: { lid: 0.82, brow: 0.45, bh: 0.002, mouth: 0.6, open: 0 },
    tired: { lid: 0.66, brow: 0.55, bh: 0, mouth: -0.25, open: 0 },
    focus: { lid: 0.8, brow: -0.35, bh: -0.002, mouth: -0.1, open: 0 },
    down: { lid: 0.42, brow: 0.25, bh: 0, mouth: -0.2, open: 0, gazeDown: true },
    pant: { lid: 0.9, brow: 0.5, bh: 0.004, mouth: -0.1, open: 0.55 },
  };

  /* 인물 방향 파라미터: s>0 화면 오른쪽을 봄, c>0 카메라를 봄 */
  function turnOf(fig, cam) {
    const fa = (fig.face || 0) * D2R;
    const F = [Math.sin(fa), 0, Math.cos(fa)];
    return { F, s: V.dot(F, cam.rH), c: -V.dot(F, cam.fH) };
  }

  /* ── 빌보드 인물 도형 생성 (로컬 좌표) ── */
  function capsule(a, b, wa, wb) {
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1e-6; dx /= l; dy /= l;
    const nx = -dy, ny = dx, ha = wa / 2, hb = wb / 2, k = 1.3;
    return [
      ['M', a[0] + nx * ha, a[1] + ny * ha],
      ['L', b[0] + nx * hb, b[1] + ny * hb],
      ['C', b[0] + nx * hb + dx * hb * k, b[1] + ny * hb + dy * hb * k, b[0] - nx * hb + dx * hb * k, b[1] - ny * hb + dy * hb * k, b[0] - nx * hb, b[1] - ny * hb],
      ['L', a[0] - nx * ha, a[1] - ny * ha],
      ['C', a[0] - nx * ha - dx * ha * k, a[1] - ny * ha - dy * ha * k, a[0] + nx * ha - dx * ha * k, a[1] + ny * ha - dy * ha * k, a[0] + nx * ha, a[1] + ny * ha],
      ['Z'],
    ];
  }
  function mapCmds(cmds, f) {
    return cmds.map((c) => {
      if (c[0] === 'Z') return c;
      const o = [c[0]];
      for (let i = 1; i < c.length; i += 2) { const p = f(c[i], c[i + 1]); o.push(p[0], p[1]); }
      return o;
    });
  }

  function figureShapes(fig, s, c, lod) {
    const P = CAST[fig.who] || CAST.seoyeon;
    const k = P.h / 1.64;
    const pose = fig.pose || 'stand';
    const ac = Math.abs(c), as = Math.abs(s);
    const sgnS = s >= 0 ? 1 : -1;
    const bw = 0.6 + 0.4 * ac;
    const back = c < -0.32;
    const seated = pose === 'sit';
    const run = pose === 'run';
    const ph = fig.phase || 0;
    const E = EXPR[fig.expr || 'neutral'] || EXPR.neutral;

    let top = P.h;
    if (seated) top = P.h - 0.41 * k;
    if (run) top = P.h - 0.07;
    const hh = 0.225;
    const shY = top - 0.30 * k;
    const sh = 0.19 * k * bw;
    const waistY = top - 0.62 * k;
    const hipY = seated ? 0.5 : top - 0.80 * k;
    const hemY = seated ? 0.47 : (P.coatLen === 'short' ? hipY - 0.04 : hipY - 0.26 * k);
    const leanAmt = run ? 0.2 : (fig.lean || 0);
    const lean = (v) => s * leanAmt * clamp((v - hipY) / (shY - hipY), 0, 1.4);
    const tilt = fig.headDown ? 0.025 : 0;
    const tx = s * 0.016;
    const body = (cmds) => mapCmds(cmds, (u, v) => [u + lean(v) + tx, v]);

    // (w: 몸 옆, d: 앞, v: 위) → u. sg=+1 왼쪽, -1 오른쪽
    const U = (sg, w, d, v) => sg * c * w + s * d + lean(v);
    const depthOf = (sg, w, d) => sg * s * w - c * d;

    const out = [];
    const add = (cmds, o) => { out.push(Object.assign({ cmds, fill: C.paper, sw: 1, sil: true }, o)); };

    /* 팔·다리 관절 */
    function armPts(sg, kind) {
      const S = [sh - 0.035 * bw, 0, shY - 0.045];
      let E1, W1;
      switch (kind) {
        case 'umbrella': E1 = [sh + 0.01, 0.06, shY - 0.27]; W1 = [0.08, 0.2, shY - 0.2]; break;
        case 'camera': E1 = [sh - 0.01, 0.2, shY - 0.21]; W1 = [0.075, 0.17, top - 0.13]; break;
        case 'table': E1 = [sh - 0.01, 0.16, 0.81]; W1 = [0.12, 0.4, 0.795]; break;
        case 'reach': E1 = [sh - 0.04, 0.3, 0.86]; W1 = [0.06, 0.6, 0.8]; break;
        case 'tray': E1 = [sh + 0.0, 0.1, shY - 0.28]; W1 = [0.1, 0.36, hipY + 0.12]; break;
        case 'pocket': E1 = [sh + 0.025, -0.03, shY - 0.28]; W1 = [sh - 0.03, 0.05, hipY + 0.02]; break;
        case 'chest': E1 = [sh + 0.0, 0.08, shY - 0.28]; W1 = [0.05, 0.16, shY - 0.2]; break;
        case 'run': {
          const a = Math.sin(ph) * -sg;
          const ta = a * 0.75;
          E1 = [sh + 0.01, Math.sin(ta) * 0.27, S[2] - Math.cos(ta) * 0.27];
          const tb = ta + 1.15;
          W1 = [sh - 0.05, E1[1] + Math.sin(tb) * 0.24, E1[2] - Math.cos(tb) * 0.24];
          break;
        }
        default: E1 = [sh + 0.02, -0.01, shY - 0.30]; W1 = [sh + 0.0, 0.02, shY - 0.56];
      }
      return [S, E1, W1];
    }
    function legPts(sg) {
      const lx = 0.07 * bw * k;
      if (seated) return [[lx, 0, 0.5], [lx + 0.01, 0.42, 0.52], [lx + 0.01, 0.46, 0.08]];
      if (run) {
        const a = Math.sin(ph) * sg;
        const th = a * 0.78;
        const bend = a > 0 ? 0.45 : 1.45 + 0.2 * Math.max(0, -a);
        const hip = [lx * 0.75, 0, hipY];
        const kn = [lx * 0.75, Math.sin(th) * 0.44 * k, hipY - Math.cos(th) * 0.44 * k];
        const an = [lx * 0.75, kn[1] + Math.sin(th - bend) * 0.43 * k, kn[2] - Math.cos(th - bend) * 0.43 * k];
        return [hip, kn, an];
      }
      const st = fig.stance || 0;
      return [[lx, 0, hipY], [lx * 1.02, st * sg, 0.46 * k], [lx * 1.05, st * sg * 1.6, 0.07]];
    }
    const toLocal = (sg, p) => [U(sg, p[0], p[1], p[2]), p[2]];

    const armL = fig.arm && typeof fig.arm === 'object' ? fig.arm.L : (fig.arm || (run ? 'run' : 'down'));
    const armR = fig.arm && typeof fig.arm === 'object' ? fig.arm.R : (fig.arm || (run ? 'run' : 'down'));
    const arms = [{ sg: 1, kind: armL === 'umbrella' ? 'down' : armL }, { sg: -1, kind: armR }];
    arms.forEach((a) => { a.pts = armPts(a.sg, a.kind); a.depth = depthOf(a.sg, a.pts[1][0], a.pts[1][1]); });
    const legs = [1, -1].map((sg) => { const p = legPts(sg); return { sg, pts: p, depth: depthOf(sg, p[0][0], (p[1][1] + p[2][1]) / 2) }; });
    legs.sort((a, b) => b.depth - a.depth);

    function drawArm(a) {
      const loc = a.pts.map((p) => toLocal(a.sg, p));
      add(capsule(loc[0], loc[1], 0.1, 0.085), { fill: P.coat2 });
      add(capsule(loc[1], loc[2], 0.085, 0.07), { fill: P.coat2 });
      if (a.kind !== 'pocket') {
        let dx = loc[2][0] - loc[1][0], dy = loc[2][1] - loc[1][1];
        const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        add(capsule([loc[2][0] - dx * 0.005, loc[2][1] - dy * 0.005], [loc[2][0] + dx * 0.065, loc[2][1] + dy * 0.065], 0.058, 0.05), { fill: P.skin, sw: 0.9 });
      }
      return loc;
    }

    /* 머리 위치 */
    const hu = s * 0.008 + lean(top) + tx + s * tilt;
    const hc = top - hh / 2 - tilt * 0.4;
    const chin = top - hh - tilt * 0.4;
    const hw2 = 0.077 + 0.012 * as;
    const ev = hc + 0.004 - (E.gazeDown ? 0.004 : 0);

    /* 1) 뒷머리 덩어리 (긴 머리) */
    if (P.hair === 'long' && !back) {
      const bx = hu - s * 0.04;
      const len = P === CAST.kid ? 0.08 : 0.07;
      add([
        ['M', bx - 0.1, hc + 0.01],
        ['C', bx - 0.11, top + 0.032, bx + 0.11, top + 0.032, bx + 0.1, hc + 0.01],
        ['C', bx + 0.118, hc - 0.08, bx + 0.125 - s * 0.035, shY - len + 0.05, bx + 0.105 - s * 0.04, shY - len],
        ['Q', bx - s * 0.04, shY - len - 0.04, bx - 0.105 - s * 0.04, shY - len],
        ['C', bx - 0.125 - s * 0.035, shY - len + 0.05, bx - 0.118, hc - 0.08, bx - 0.1, hc + 0.01],
        ['Z'],
      ], { fill: P.hairC, cls: 'hair' });
    }

    /* 2) 먼 팔 */
    const farArms = as > 0.45 ? arms.filter((a) => a.depth > 0) : [];
    const nearArms = arms.filter((a) => farArms.indexOf(a) < 0);
    const hands = {};
    farArms.forEach((a) => { const l = drawArm(a); hands[a.sg] = l[2]; });

    /* 3) 다리 */
    legs.forEach((lg) => {
      const loc = lg.pts.map((p) => toLocal(lg.sg, p));
      const wt = seated ? [0.15, 0.12, 0.1] : [0.125, 0.1, 0.08];
      add(capsule(loc[0], loc[1], wt[0], wt[1]), { fill: P.pants });
      add(capsule(loc[1], loc[2], wt[1], wt[2]), { fill: P.pants });
      const an = loc[2];
      add(ellipseCmds(an[0] + s * 0.06, an[1] - 0.03, 0.05 + 0.04 * as, 0.034), { fill: P.shoe, sw: 0.9 });
    });

    /* 4) 몸통(코트) */
    const hw = 0.2 * bw * k, ww = 0.155 * bw * k;
    add(body([
      ['M', -0.05, shY + 0.035],
      ['C', -sh * 0.55, shY + 0.045, -sh * 0.96, shY + 0.02, -sh, shY - 0.055],
      ['C', -sh * 1.03, shY - 0.13, -sh * 0.9, shY - 0.22, -ww, waistY],
      ['C', -ww * 1.04, waistY - 0.1, -hw * 0.96, hemY + 0.12, -hw, hemY],
      ['Q', 0, hemY - 0.02, hw, hemY],
      ['C', hw * 0.96, hemY + 0.12, ww * 1.04, waistY - 0.1, ww, waistY],
      ['C', sh * 0.9, shY - 0.22, sh * 1.03, shY - 0.13, sh, shY - 0.055],
      ['C', sh * 0.96, shY + 0.02, sh * 0.55, shY + 0.045, 0.05, shY + 0.035],
      ['Z'],
    ]), { fill: P.coat, cls: 'coat' });
    if (lod >= 1) {
      const det = { fill: 'none', sw: 0.8, sil: false, op: 0.85 };
      if (c > 0.25) {
        const cx0 = s * 0.06;
        add(body([['M', -0.06 * c + cx0, shY + 0.03], ['L', cx0 - 0.005, shY - 0.24], ['L', 0.06 * c + cx0, shY + 0.03]]), det);
        add(body([['M', cx0 + 0.012, shY - 0.24], ['L', cx0 + 0.016, hemY + 0.01]]), det);
        if (lod >= 2) [0.3, 0.42, 0.54].forEach((dv) => add(ellipseCmds(cx0 + 0.035 + lean(shY - dv) + tx, shY - dv, 0.008, 0.008), { fill: C.g6, sw: 0.5, sil: false }));
        if (P.old) add(body([['M', -ww, waistY + 0.02], ['L', ww, waistY + 0.02]]), Object.assign({}, det, { sw: 1.3 }));
      } else if (back) {
        add(body([['M', 0, shY - 0.02], ['L', 0, hemY + 0.01]]), det);
        if (P.old) add(body([['M', -ww, waistY + 0.02], ['L', ww, waistY + 0.02]]), Object.assign({}, det, { sw: 1.3 }));
      } else {
        add(body([['M', s * 0.02, shY - 0.05], ['Q', s * 0.05, waistY, s * 0.03, hemY + 0.01]]), det);
        add(body([['M', s * 0.09, shY - 0.03], ['L', s * 0.05, shY - 0.2]]), det);
      }
      // 주름(옷)
      if (lod >= 2) add(body([['M', -ww * 0.6, waistY - 0.05], ['Q', -ww * 0.7, hemY + 0.15, -hw * 0.75, hemY + 0.03]]), Object.assign({}, det, { op: 0.45, sw: 0.6 }));
    }

    /* 5) 목 */
    add([['M', hu - 0.032, chin + 0.035], ['L', hu - 0.036 + lean(shY) * 0.6 + tx * 0.5, shY + 0.03], ['L', hu + 0.036 + lean(shY) * 0.6 + tx * 0.5, shY + 0.03], ['L', hu + 0.032, chin + 0.035], ['Z']], { fill: P.skin, sw: 0.9 });
    if (c > 0.2 && lod >= 1) add([['M', hu - 0.075 + lean(shY), shY + 0.045], ['L', hu + lean(shY), shY - 0.035], ['L', hu + 0.075 + lean(shY), shY + 0.045]], { fill: 'none', sw: 0.9, sil: false });

    /* 6) 머리 */
    const jx = hu + s * 0.032;
    add([
      ['M', hu, top],
      ['C', hu + hw2 * 0.62, top, hu + hw2, top - 0.04, hu + hw2, hc + 0.012],
      ['C', hu + hw2, hc - 0.045, hu + hw2 * 0.78 + s * 0.02, chin + 0.07, hu + hw2 * 0.62 + s * 0.02, chin + 0.04],
      ['Q', jx + 0.03, chin + 0.002, jx, chin],
      ['Q', jx - 0.03, chin + 0.002, hu - hw2 * 0.62 + s * 0.02, chin + 0.04],
      ['C', hu - hw2 * 0.78 + s * 0.02, chin + 0.07, hu - hw2, hc - 0.045, hu - hw2, hc + 0.012],
      ['C', hu - hw2, top - 0.04, hu - hw2 * 0.62, top, hu, top],
      ['Z'],
    ], { fill: P.skin, cls: 'head', sw: 1.05 });

    const faceVis = c > -0.18;
    /* 7) 얼굴 */
    if (faceVis && lod >= 1) {
      const fd = { fill: 'none', sil: false };
      const gx = fig.gazeAbs ? fig.gaze[0] : clamp((fig.gaze ? fig.gaze[0] : 0) + s * 0.6, -1, 1);
      const gy = fig.gaze ? fig.gaze[1] : (E.gazeDown ? -0.6 : 0);
      [1, -1].forEach((sg) => {
        const vis = 0.85 * c - 0.5 * sg * s;
        if (vis < 0.06) return;
        const eu = hu + sg * c * 0.034 + s * 0.064;
        const ew = 0.0165 * Math.pow(clamp(vis, 0, 1), 0.6);
        const h = 0.0088 * E.lid;
        const o = sg * (c >= 0 ? 1 : -1);
        if (lod === 1) { add([['M', eu - ew, ev], ['L', eu + ew, ev]], Object.assign({}, fd, { sw: 1.4 })); return; }
        const droop = (E.brow > 0.5 ? 0.25 : 0) * h;
        add([
          ['M', eu - ew * o, ev],
          ['C', eu - ew * 0.45 * o, ev + h * 1.25, eu + ew * 0.45 * o, ev + h * 1.3 - droop, eu + ew * o, ev + h * 0.05 - droop],
          ['C', eu + ew * 0.45 * o, ev - h * 0.75, eu - ew * 0.45 * o, ev - h * 0.8, eu - ew * o, ev],
          ['Z'],
        ], { fill: '#FFFFFF', sw: 0.6, sil: false });
        const ir = Math.min(ew * 0.46, 0.0088);
        const ix = eu + gx * ew * 0.35, iy = ev + gy * h * 0.35 + h * 0.1;
        add(ellipseCmds(ix, iy, ir, Math.min(ir, h * 0.95)), { fill: C.ink, sw: 0.4, sil: false });
        if (lod >= 3) add(ellipseCmds(ix - ir * 0.3, iy + ir * 0.35, ir * 0.24, ir * 0.24), { fill: '#FFFFFF', stroke: 'none', sil: false });
        add([['M', eu - ew * 1.05 * o, ev - h * 0.05], ['C', eu - ew * 0.45 * o, ev + h * 1.3, eu + ew * 0.45 * o, ev + h * 1.35 - droop, eu + ew * 1.12 * o, ev - droop]], Object.assign({}, fd, { sw: 1.7 }));
        if (lod >= 3) add([['M', eu - ew * 0.6 * o, ev + h * 1.6], ['Q', eu + ew * 0.1 * o, ev + h * 2.0, eu + ew * 0.9 * o, ev + h * 1.2 - droop]], Object.assign({}, fd, { sw: 0.6, op: 0.7 }));
        const by = ev + 0.022 + E.bh;
        const inner = -sg * (c >= 0 ? 1 : -1);
        const bi = E.brow * 0.006, bo = -E.brow * 0.002;
        const bx0 = eu + inner * ew * 1.0, bx1 = eu - inner * ew * 1.25;
        add([['M', bx0, by + bi], ['Q', (bx0 + bx1) / 2, by + 0.006 + (bi + bo) / 2, bx1, by + bo - 0.002]], Object.assign({}, fd, { sw: lod >= 3 ? 2.6 : 1.8 }));
        if (E.tear && sg === (s >= 0 ? -1 : 1) && lod >= 2) {
          const tx0 = eu + ew * 0.2 * o, ty0 = ev - h * 0.9;
          add([['M', tx0, ty0], ['C', tx0 + 0.004, ty0 - 0.012, tx0 + 0.006, ty0 - 0.02, tx0 + 0.001, ty0 - 0.026], ['C', tx0 - 0.004, ty0 - 0.02, tx0 - 0.003, ty0 - 0.012, tx0, ty0], ['Z']], { fill: '#DCEBF5', sw: 0.6, sil: false });
          add([['M', tx0 + 0.001, ty0 - 0.03], ['Q', tx0 + 0.004, ty0 - 0.05, tx0 + 0.002, ty0 - 0.07]], Object.assign({}, fd, { sw: 0.6, op: 0.6 }));
        }
        if (P.old && lod >= 3) {
          const ox = eu + ew * 1.15 * o;
          add([['M', ox, ev + 0.002], ['L', ox + 0.008 * o, ev + 0.006]], Object.assign({}, fd, { sw: 0.5, op: 0.6 }));
          add([['M', ox, ev - 0.003], ['L', ox + 0.008 * o, ev - 0.007]], Object.assign({}, fd, { sw: 0.5, op: 0.6 }));
          add([['M', eu - ew * 0.6 * o, ev - h * 1.4], ['Q', eu, ev - h * 1.9, eu + ew * 0.7 * o, ev - h * 1.5]], Object.assign({}, fd, { sw: 0.5, op: 0.5 }));
        }
      });
      const nb = hu + s * 0.072, nt = hu + s * (0.05 + 0.046 * as);
      if (lod >= 2) {
        if (as > 0.55) {
          add([['M', nb, ev + 0.003], ['Q', nt + s * 0.002, ev - 0.03, nt, ev - 0.044], ['Q', nt - s * 0.012, ev - 0.054, hu + s * 0.07, ev - 0.05]], { fill: P.skin, sw: 1.0, sil: false });
        } else {
          add([['M', hu + s * 0.03 + 0.003, ev - 0.008], ['Q', nt + 0.006 * sgnS, ev - 0.032, nt, ev - 0.046], ['Q', nt - 0.008, ev - 0.05, nt - 0.014, ev - 0.044]], Object.assign({}, fd, { sw: 1.0 }));
          if (lod >= 3) add([['M', nt + 0.012, ev - 0.044], ['Q', nt + 0.008, ev - 0.05, nt + 0.003, ev - 0.048]], Object.assign({}, fd, { sw: 0.8 }));
        }
      }
      const mu = hu + s * 0.068, mv = ev - 0.075 + (E.open ? 0.002 : 0);
      const mw = 0.024 * (0.35 + 0.65 * clamp(c, 0, 1));
      if (lod >= 2) {
        const curve = E.mouth * 0.007;
        if (E.open > 0.3) {
          add(ellipseCmds(mu, mv - 0.004, mw * 0.55, 0.009 * E.open + 0.003), { fill: C.g8, sw: 0.9, sil: false });
        } else {
          add([['M', mu - mw, mv + curve], ['Q', mu, mv - curve * 1.2 - (E.open ? 0.004 : 0), mu + mw, mv + curve]], Object.assign({}, fd, { sw: 1.3 }));
          if (lod >= 3) add([['M', mu - mw * 0.5, mv - 0.014], ['Q', mu, mv - 0.017, mu + mw * 0.5, mv - 0.014]], Object.assign({}, fd, { sw: 0.6, op: 0.5 }));
        }
        if (P.old && lod >= 3) {
          add([['M', hu + s * 0.05 - 0.03 * c, ev - 0.04], ['Q', hu + s * 0.05 - 0.04 * c, ev - 0.07, hu + s * 0.05 - 0.035 * c, ev - 0.09]], Object.assign({}, fd, { sw: 0.6, op: 0.55 }));
          add([['M', hu + s * 0.05 + 0.03 * c, ev - 0.04], ['Q', hu + s * 0.05 + 0.04 * c, ev - 0.07, hu + s * 0.05 + 0.035 * c, ev - 0.09]], Object.assign({}, fd, { sw: 0.6, op: 0.55 }));
          add([['M', hu - 0.04, top - 0.045], ['Q', hu, top - 0.04, hu + 0.04, top - 0.046]], Object.assign({}, fd, { sw: 0.5, op: 0.5 }));
        }
      }
      if (P.glasses && lod >= 2) {
        const gl = { fill: 'none', sw: lod >= 3 ? 1.4 : 1.0, sil: false };
        const lens = [];
        [1, -1].forEach((sg) => {
          const vis = 0.85 * c - 0.5 * sg * s;
          if (vis < 0.08) return;
          const eu = hu + sg * c * 0.034 + s * 0.072;
          const ew = 0.022 * Math.pow(clamp(vis, 0, 1), 0.6) + 0.003;
          add([['M', eu - ew, ev + 0.012], ['L', eu + ew, ev + 0.012], ['Q', eu + ew, ev - 0.016, eu, ev - 0.016], ['Q', eu - ew, ev - 0.016, eu - ew, ev + 0.012], ['Z']], gl);
          lens.push([eu, ew]);
        });
        if (lens.length === 2) { const d = Math.sign(lens[0][0] - lens[1][0]); add([['M', lens[0][0] - lens[0][1] * d, ev + 0.008], ['L', lens[1][0] + lens[1][1] * d, ev + 0.008]], gl); }
        if (as > 0.3 && lens.length) { const l0 = lens[lens.length - 1]; add([['M', l0[0] - sgnS * l0[1], ev + 0.01], ['L', hu - s * 0.02, ev + 0.006]], gl); }
      }
    }

    /* 8) 머리카락 */
    const strand = (cmds) => add(cmds, { fill: 'none', sw: 0.5, sil: false, stroke: P.hair === 'long' ? '#70757C' : '#6A6F75', op: 0.8 });
    if (P.hair === 'long') {
      if (back) {
        add([
          ['M', hu - 0.1, hc],
          ['C', hu - 0.11, top + 0.033, hu + 0.11, top + 0.033, hu + 0.1, hc],
          ['C', hu + 0.12, hc - 0.09, hu + 0.125, shY + 0.0, hu + 0.11, shY - 0.07],
          ['Q', hu, shY - 0.105, hu - 0.11, shY - 0.07],
          ['C', hu - 0.125, shY + 0.0, hu - 0.12, hc - 0.09, hu - 0.1, hc],
          ['Z'],
        ], { fill: P.hairC, cls: 'hair' });
        if (lod >= 3) for (let i = -2; i <= 2; i++) strand([['M', hu + i * 0.03, top - 0.01], ['Q', hu + i * 0.04, hc - 0.05, hu + i * 0.035, shY - 0.06]]);
      } else {
        // 정수리 + 이마선 (가르마는 얼굴 쪽으로)
        const pt = hu + s * 0.045;
        add([
          ['M', hu - hw2 - 0.013, hc - 0.005],
          ['C', hu - hw2 - 0.017, top + 0.035, hu + hw2 + 0.017, top + 0.035, hu + hw2 + 0.013, hc - 0.005],
          ['C', hu + hw2 * 0.92 + s * 0.02, hc + 0.035, hu + hw2 * 0.5 + s * 0.03, top - 0.036, pt + 0.012, top - 0.036],
          ['C', pt - 0.022, top - 0.062, hu - hw2 * 0.7 + s * 0.04, top - 0.07, hu - hw2 * 0.93 + s * 0.02, hc + 0.02],
          ['Z'],
        ], { fill: P.hairC, cls: 'hair' });
        // 옆/뒤를 덮는 머리 (돌아선 정도에 따라)
        if (as > 0.18) {
          const b = -sgnS;                                  // 뒤통수 방향
          const fe = hu - sgnS * c * 0.072 + s * 0.035;      // 관자놀이(머리카락 앞선)
          add([
            ['M', hu + s * 0.02, top + 0.01],
            ['C', hu + b * hw2 * 0.8, top + 0.03, hu + b * (hw2 + 0.02), hc + 0.03, hu + b * (hw2 + 0.016), hc - 0.03],
            ['C', hu + b * (hw2 + 0.02), chin, hu + b * (0.1 + 0.03 * as), shY + 0.02, hu + b * (0.1 + 0.02 * as) - s * 0.02, shY - 0.07],
            ['L', fe - s * 0.035, shY - 0.03],
            ['C', fe - s * 0.025, chin - 0.02, fe - s * 0.012, ev - 0.02, fe, ev + 0.015],
            ['C', fe + s * 0.01, hc + 0.05, hu + s * 0.03, top - 0.03, hu + s * 0.02, top + 0.01],
            ['Z'],
          ], { fill: P.hairC, cls: 'hair' });
          if (lod >= 3) strand([['M', hu + b * 0.02, top - 0.005], ['Q', hu + b * 0.08, hc - 0.02, hu + b * 0.07 - s * 0.02, shY - 0.04]]);
        }
        // 정면에 가까울 때 얼굴 양옆으로 흘러내리는 머리
        if (c > 0.9) {
          [-1, 1].forEach((dir) => {
            const x0 = hu + dir * (hw2 + 0.01) + s * 0.01;
            add([
              ['M', x0, hc + 0.02],
              ['C', x0 - dir * 0.01, hc - 0.05, x0 - dir * 0.012, chin + 0.02, x0 - dir * 0.004, chin - 0.035],
              ['L', x0 + dir * 0.03, chin - 0.03],
              ['C', x0 + dir * 0.035, hc - 0.05, x0 + dir * 0.03, hc, x0 + dir * 0.012, hc + 0.045],
              ['Z'],
            ], { fill: P.hairC, cls: 'hair' });
          });
        }
        if (lod >= 3) {
          strand([['M', pt, top - 0.036], ['Q', hu - 0.03, top - 0.01, hu - hw2 * 0.8, hc + 0.01]]);
          strand([['M', pt + 0.01, top - 0.034], ['Q', hu + 0.05, top - 0.015, hu + hw2 * 0.85, hc]]);
        }
      }
    } else {
      // 짧은 머리 (준호)
      if (back) {
        add([
          ['M', hu - hw2 - 0.008, hc - 0.005],
          ['C', hu - hw2 - 0.012, top + 0.024, hu + hw2 + 0.012, top + 0.024, hu + hw2 + 0.008, hc - 0.005],
          ['C', hu + hw2 + 0.004, chin + 0.07, hu + hw2 * 0.6, chin + 0.04, hu, chin + 0.035],
          ['C', hu - hw2 * 0.6, chin + 0.04, hu - hw2 - 0.004, chin + 0.07, hu - hw2 - 0.008, hc - 0.005],
          ['Z'],
        ], { fill: P.hairC, cls: 'hair' });
        if (lod >= 2) for (let i = -2; i <= 2; i++) strand([['M', hu + i * 0.025, top - 0.01], ['Q', hu + i * 0.03, hc, hu + i * 0.028, chin + 0.05]]);
      } else {
        const fb = hu - s * 0.03;
        add([
          ['M', hu - hw2 - 0.007, hc + 0.005],
          ['C', hu - hw2 - 0.011, top + 0.023, hu + hw2 + 0.011, top + 0.023, hu + hw2 + 0.007, hc + 0.005],
          ['C', hu + hw2 * 0.9 + s * 0.02, top - 0.02, fb + 0.03 + s * 0.05, top - 0.018, fb + s * 0.04, top - 0.024],
          ['C', fb - 0.03 + s * 0.05, top - 0.018, hu - hw2 * 0.9 + s * 0.02, top - 0.02, hu - hw2 - 0.007, hc + 0.005],
          ['Z'],
        ], { fill: P.hairC, cls: 'hair' });
        if (as > 0.25) {
          const b = -sgnS;
          const fe = hu - sgnS * c * 0.072 + s * 0.03;
          add([
            ['M', fe + s * 0.012, top - 0.022],
            ['C', hu + b * hw2 * 0.7, top + 0.026, hu + b * (hw2 + 0.014), hc + 0.03, hu + b * (hw2 + 0.01), hc - 0.03],
            ['C', hu + b * (hw2 + 0.006), chin + 0.08, hu + b * hw2 * 0.7, chin + 0.05, hu + b * hw2 * 0.45, chin + 0.05],
            ['C', fe - s * 0.02, chin + 0.07, fe - s * 0.008, ev - 0.01, fe, ev + 0.03],
            ['Q', fe + s * 0.004, top - 0.05, fe + s * 0.012, top - 0.022],
            ['Z'],
          ], { fill: P.hairC, cls: 'hair' });
        }
        if (lod >= 3) for (let i = -1; i <= 1; i++) strand([['M', hu + i * 0.03, top + 0.012], ['Q', hu + i * 0.035 - s * 0.02, top - 0.005, hu + i * 0.03 - s * 0.03, top - 0.02]]);
      }
    }

    /* 귀 (짧은 머리만) */
    if (lod >= 1 && P.hair !== 'long') {
      [1, -1].forEach((sg) => {
        const towardCam = -sg * s;
        if (towardCam < -0.15 || (back && towardCam < 0.3)) return;
        const eu = hu + sg * c * 0.079 - s * 0.012;
        const ew = 0.018 * clamp(0.35 + towardCam, 0.3, 1);
        const dir = Math.sign(eu - hu) || 1;
        add([['M', eu, ev + 0.012], ['C', eu + dir * ew * 1.6, ev + 0.02, eu + dir * ew * 1.5, ev - 0.03, eu + dir * 0.002, ev - 0.03]], { fill: P.skin, sw: 0.9 });
      });
    }

    /* 9) 가까운 팔 */
    nearArms.forEach((a) => { const l = drawArm(a); hands[a.sg] = l[2]; });
    const handR = hands[-1], handL = hands[1];

    /* 10) 소품: 카메라 */
    if (armR === 'camera' || armL === 'camera') {
      const cu = hu + s * 0.17 * (1 - ac * 0.4), cv = top - 0.125;
      const bwid = 0.07 * (0.4 + 0.6 * ac) + 0.025;
      if (c > -0.3) {
        add([['M', cu - bwid, cv - 0.045], ['L', cu + bwid, cv - 0.045], ['L', cu + bwid, cv + 0.04], ['L', cu - bwid, cv + 0.04], ['Z']], { fill: C.g8, sw: 1 });
        add([['M', cu - bwid, cv + 0.01], ['L', cu + bwid, cv + 0.01]], { fill: 'none', sw: 0.6, sil: false, stroke: C.g4 });
        if (c > 0.2) add(ellipseCmds(cu, cv - 0.008, 0.026, 0.026), { fill: C.g6, sw: 1 });
        if (c > 0.2) add(ellipseCmds(cu, cv - 0.008, 0.014, 0.014), { fill: C.g9, sw: 0.6, sil: false });
        if (as > 0.5) add([['M', cu + sgnS * bwid, cv - 0.03], ['L', cu + sgnS * (bwid + 0.05), cv - 0.028], ['L', cu + sgnS * (bwid + 0.05), cv + 0.01], ['L', cu + sgnS * bwid, cv + 0.012], ['Z']], { fill: C.g7, sw: 1 });
      }
    }

    /* 11) 우산 */
    if (armR === 'umbrella' || armL === 'umbrella') {
      const hd = armR === 'umbrella' ? handR : handL;
      const au = hu + s * 0.04 + (hd ? (hd[0] - hu) * 0.25 : 0);
      const rim = top + 0.1, apex = top + 0.37, R = 0.52;
      if (hd) add([['M', hd[0], hd[1] - 0.06], ['L', au, apex + 0.04]], { fill: 'none', sw: 1.4, sil: true });
      const ribs = 6;
      const cmds = [['M', au - R, rim], ['C', au - R * 0.95, rim + 0.17, au - R * 0.45, apex, au, apex], ['C', au + R * 0.45, apex, au + R * 0.95, rim + 0.17, au + R, rim]];
      for (let i = ribs - 1; i >= 0; i--) {
        const x0 = au - R + (2 * R) * (i / ribs), x1 = au - R + (2 * R) * ((i + 1) / ribs);
        cmds.push(['Q', (x0 + x1) / 2, rim + 0.045, x0, rim]);
      }
      cmds.push(['Z']);
      add(cmds, { fill: P.umbrella || '#4E545A', sw: 1.2, cls: 'umbrella' });
      if (lod >= 1) {
        for (let i = 1; i < ribs; i++) {
          const x = au - R + (2 * R) * (i / ribs);
          add([['M', au, apex], ['Q', au + (x - au) * 0.6, apex - 0.02, x, rim]], { fill: 'none', sw: 0.7, sil: false, stroke: '#2A2D31', op: 0.8 });
        }
        add([['M', au, apex], ['L', au, apex + 0.05]], { fill: 'none', sw: 1.2, sil: false });
      }
    }

    return { shapes: out, top, chin, hc, hu };
  }

  /* ── 탑뷰 인물 (부감) ── */
  function topShapes(fig) {
    const P = CAST[fig.who] || CAST.seoyeon;
    const seated = fig.pose === 'sit';
    const top = seated ? P.h - 0.41 : P.h;
    const out = [];
    const add = (cmds, y, o) => out.push(Object.assign({ cmds, y, fill: C.paper, sw: 1, sil: true }, o));
    if (seated) {
      add(ellipseCmds(-0.09, 0.28, 0.07, 0.2), 0.52, { fill: P.pants });
      add(ellipseCmds(0.09, 0.28, 0.07, 0.2), 0.52, { fill: P.pants });
    }
    const armA = fig.arm === 'table' || fig.arm === 'reach';
    add(ellipseCmds(-0.21, armA ? 0.18 : 0.02, 0.05, armA ? 0.18 : 0.08), top - 0.42, { fill: P.coat2 });
    add(ellipseCmds(0.21, armA ? 0.18 : 0.02, 0.05, armA ? 0.18 : 0.08), top - 0.42, { fill: P.coat2 });
    add(ellipseCmds(0, -0.01, 0.22, 0.12), top - 0.3, { fill: P.coat });
    add(ellipseCmds(0, 0.0, 0.085, 0.1), top - 0.02, { fill: P.hairC });
    add([['M', -0.025, 0.09], ['L', 0, 0.125], ['L', 0.025, 0.09]], top - 0.1, { fill: P.skin, sw: 0.8 });
    if (fig.arm === 'umbrella' || (fig.arm && fig.arm.R === 'umbrella')) {
      const ucol = P.umbrella || '#4E545A';
      const cm = [];
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        cm.push([i === 0 ? 'M' : 'L', Math.cos(a) * 0.52, 0.05 + Math.sin(a) * 0.52]);
      }
      cm.push(['Z']);
      add(cm, top + 0.3, { fill: ucol, sw: 1.2 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        add([['M', 0, 0.05], ['L', Math.cos(a) * 0.52, 0.05 + Math.sin(a) * 0.52]], top + 0.31, { fill: 'none', sw: 0.6, sil: false });
      }
    }
    return out;
  }

  /* ── 인물 SVG ── */
  function drawFigure(fig, cam, ctx) {
    const pos = fig.pos;
    const P = CAST[fig.who] || CAST.seoyeon;
    const { s, c, F } = turnOf(fig, cam);
    const steep = cam.pitch < -62 * D2R;
    const depth = toCam(cam, [pos[0], pos[1] + 1.0, pos[2]])[2];
    if (depth < cam.near) return null;

    let shapes, Pfn;
    // 머리 크기(px) → 디테일 수준
    const headTopY = pos[1] + (fig.pose === 'sit' ? P.h - 0.41 : P.h);
    const a1 = scr(cam, toCam(cam, [pos[0], headTopY, pos[2]]));
    const a2 = scr(cam, toCam(cam, [pos[0], headTopY - 0.225, pos[2]]));
    const headPx = Math.hypot(a1[0] - a2[0], a1[1] - a2[1]);
    let lod = headPx < 9 ? 0 : headPx < 26 ? 1 : headPx < 85 ? 2 : 3;
    if (ctx.lodCap !== undefined) lod = Math.min(lod, ctx.lodCap);

    if (steep) {
      const Rp = [F[2], 0, -F[0]];
      const ts = topShapes(fig);
      shapes = ts;
      Pfn = (a, b, y) => scr(cam, toCam(cam, [pos[0] + Rp[0] * a + F[0] * b, pos[1] + y, pos[2] + Rp[2] * a + F[2] * b]));
    } else {
      const r = figureShapes(fig, s, c, lod);
      shapes = r.shapes;
      const rH = cam.rH;
      Pfn = (u, v) => scr(cam, toCam(cam, [pos[0] + rH[0] * u, pos[1] + v, pos[2] + rH[2] * u]));
    }
    const swK = clamp(Math.sqrt(headPx / 55), 0.38, 2.6) * (ctx.lw || 1);
    const mode = ctx.figMode || 'shade';
    let body = '';
    const sil = [];
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const sh of shapes) {
      const proj = steep ? (a, b) => Pfn(a, b, sh.y) : Pfn;
      const d = pathFrom(sh.cmds, (u, v) => {
        const p = proj(u, v);
        if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0];
        if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1];
        return p;
      });
      let fill = sh.fill;
      if (mode === 'silhouette' && fill !== 'none') fill = sh.cls === 'umbrella' ? '#1E2024' : '#24272B';
      else if (ctx.sh && fill && fill !== 'none') fill = ctx.sh(fill);
      const stroke = sh.stroke || C.ink;
      if (mode === 'silhouette' && !sh.sil) continue;
      body += '<path d="' + d + '" fill="' + fill + '" stroke="' + (sh.stroke === 'none' ? 'none' : stroke) + '" stroke-width="' + n1(sh.sw * 1.35 * swK * 10) / 10 + '"' + (sh.op ? ' opacity="' + sh.op + '"' : '') + ' stroke-linejoin="round" stroke-linecap="round"/>';
      if (sh.sil) sil.push(d);
    }
    return { svg: body, sil, depth, bbox: [minx, miny, maxx, maxy], headPx, s, c, top: a1 };
  }

  /* ── 소품 (빌보드) ── */
  function billboard(cam, pos) {
    const rH = cam.rH;
    return (u, v) => scr(cam, toCam(cam, [pos[0] + rH[0] * u, pos[1] + v, pos[2] + rH[2] * u]));
  }
  function stroke(w, ctx) { return n1(w * (ctx.lw || 1) * 10) / 10; }

  const PROPS = {
    cup(cam, pos, ctx) {
      const steep = cam.pitch < -62 * D2R;
      const sw = stroke(1.1, ctx);
      if (steep) {
        const P = (a, b, y) => scr(cam, toCam(cam, [pos[0] + a, pos[1] + y, pos[2] + b]));
        const circ = (r, y) => pathFrom(ellipseCmds(0, 0, r, r), (a, b) => P(a, b, y));
        return '<path d="' + circ(0.075, 0.005) + '" fill="#FFFFFF" stroke="' + C.ink + '" stroke-width="' + sw + '"/>' +
          '<path d="' + circ(0.042, 0.08) + '" fill="#FFFFFF" stroke="' + C.ink + '" stroke-width="' + sw + '"/>' +
          '<path d="' + circ(0.033, 0.07) + '" fill="#5B4A3E" stroke="none"/>';
      }
      const P = billboard(cam, pos);
      const look = clamp(-Math.sin(cam.pitch) * 1.2, 0.08, 1);
      const e = (cx, cy, rx, ry) => pathFrom(ellipseCmds(cx, cy, rx, ry), P);
      return '<path d="' + e(0, 0.004, 0.075, 0.075 * look * 0.5) + '" fill="#FFFFFF" stroke="' + C.ink + '" stroke-width="' + sw + '"/>' +
        '<path d="' + pathFrom([['M', -0.042, 0.085], ['L', -0.035, 0.012], ['Q', 0, 0.0, 0.035, 0.012], ['L', 0.042, 0.085], ['Z']], P) + '" fill="#FFFFFF" stroke="' + C.ink + '" stroke-width="' + sw + '"/>' +
        '<path d="' + pathFrom([['M', 0.04, 0.07], ['C', 0.075, 0.075, 0.075, 0.03, 0.037, 0.028]], P) + '" fill="none" stroke="' + C.ink + '" stroke-width="' + sw + '"/>' +
        '<path d="' + e(0, 0.085, 0.042, 0.042 * look * 0.55) + '" fill="#6A584A" stroke="' + C.ink + '" stroke-width="' + sw + '"/>';
    },
    filmcam(cam, pos, ctx) {
      const steep = cam.pitch < -62 * D2R;
      const sw = stroke(1.1, ctx);
      if (steep) {
        const P = (a, b, y) => scr(cam, toCam(cam, [pos[0] + a, pos[1] + y, pos[2] + b]));
        const rect = pathFrom([['M', -0.07, -0.035], ['L', 0.07, -0.035], ['L', 0.07, 0.035], ['L', -0.07, 0.035], ['Z']], (a, b) => P(a, b, 0.09));
        const lens = pathFrom([['M', -0.025, -0.035], ['L', 0.025, -0.035], ['L', 0.025, -0.09], ['L', -0.025, -0.09], ['Z']], (a, b) => P(a, b, 0.05));
        return '<path d="' + lens + '" fill="' + C.g7 + '" stroke="' + C.ink + '" stroke-width="' + sw + '"/><path d="' + rect + '" fill="' + C.g8 + '" stroke="' + C.ink + '" stroke-width="' + sw + '"/>';
      }
      const P = billboard(cam, pos);
      const p = (cmds) => pathFrom(cmds, P);
      return '<path d="' + p([['M', -0.07, 0.0], ['L', 0.07, 0.0], ['L', 0.07, 0.085], ['L', 0.035, 0.085], ['L', 0.025, 0.1], ['L', -0.025, 0.1], ['L', -0.035, 0.085], ['L', -0.07, 0.085], ['Z']]) + '" fill="' + C.g8 + '" stroke="' + C.ink + '" stroke-width="' + sw + '"/>' +
        '<path d="' + p([['M', -0.07, 0.055], ['L', 0.07, 0.055]]) + '" fill="none" stroke="' + C.g3 + '" stroke-width="' + sw * 0.6 + '"/>' +
        '<path d="' + p(ellipseCmds(0, 0.04, 0.03, 0.03)) + '" fill="' + C.g6 + '" stroke="' + C.ink + '" stroke-width="' + sw + '"/>' +
        '<path d="' + p(ellipseCmds(0, 0.04, 0.017, 0.017)) + '" fill="' + C.g9 + '" stroke="none"/>' +
        '<path d="' + p(ellipseCmds(0.05, 0.072, 0.008, 0.008)) + '" fill="' + C.g3 + '" stroke="none"/>';
    },
    pendant(cam, pos, ctx) {
      const P = billboard(cam, pos);
      const sw = stroke(1.2, ctx);
      return '<path d="' + pathFrom([['M', 0, 1.2], ['L', 0, 0.18]], P) + '" stroke="' + C.ink + '" stroke-width="' + sw * 0.8 + '" fill="none"/>' +
        '<path d="' + pathFrom([['M', -0.05, 0.18], ['L', 0.05, 0.18], ['L', 0.22, 0], ['Q', 0, -0.03, -0.22, 0], ['Z']], P) + '" fill="' + C.g7 + '" stroke="' + C.ink + '" stroke-width="' + sw + '"/>' +
        '<path d="' + pathFrom(ellipseCmds(0, -0.01, 0.06, 0.03), P) + '" fill="' + C.lit + '" stroke="none"/>';
    },
    stool(cam, pos, ctx) {
      const P = billboard(cam, pos);
      const sw = stroke(1, ctx);
      return '<path d="' + pathFrom([['M', -0.02, 0], ['L', -0.02, 0.7], ['L', 0.02, 0.7], ['L', 0.02, 0], ['Z']], P) + '" fill="' + C.g6 + '" stroke="' + C.ink + '" stroke-width="' + sw + '"/>' +
        '<path d="' + pathFrom(ellipseCmds(0, 0.72, 0.19, 0.05), P) + '" fill="' + C.g5 + '" stroke="' + C.ink + '" stroke-width="' + sw + '"/>' +
        '<path d="' + pathFrom(ellipseCmds(0, 0.01, 0.17, 0.03), P) + '" fill="' + C.g6 + '" stroke="' + C.ink + '" stroke-width="' + sw + '"/>';
    },
    lamppost(cam, pos, ctx, o) {
      const P = billboard(cam, pos);
      const sw = stroke(1.2, ctx);
      const h = (o && o.h) || 7;
      const dir = (o && o.dir) || 1;
      return '<path d="' + pathFrom([['M', -0.07, 0], ['L', -0.05, h], ['L', 0.05, h], ['L', 0.07, 0], ['Z']], P) + '" fill="' + C.g7 + '" stroke="' + C.ink + '" stroke-width="' + sw + '"/>' +
        '<path d="' + pathFrom([['M', 0, h], ['Q', dir * 0.6, h + 0.5, dir * 1.3, h + 0.2]], P) + '" fill="none" stroke="' + C.ink + '" stroke-width="' + sw * 1.4 + '"/>' +
        '<path d="' + pathFrom([['M', dir * 1.05, h + 0.25], ['L', dir * 1.55, h + 0.2], ['L', dir * 1.5, h + 0.05], ['L', dir * 1.1, h + 0.08], ['Z']], P) + '" fill="' + C.g8 + '" stroke="' + C.ink + '" stroke-width="' + sw + '"/>';
    },
  };

  /* ── 2D 사진 속 그림 (인화지 위 이미지) ── */
  function photoArt(kind, M, ctx) {
    // M(x,y): 사진 좌표(0..1, y 위) → 화면
    const sw = stroke(0.9, ctx);
    const p = (cmds) => pathFrom(cmds, M);
    let g = '';
    if (kind === 'gallery') {
      g += '<path d="' + p([['M', 0, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']]) + '" fill="#E9E6E1" stroke="none"/>';
      g += '<path d="' + p([['M', 0, 0], ['L', 1, 0], ['L', 1, 0.16], ['L', 0, 0.16], ['Z']]) + '" fill="#B9B5AF" stroke="none"/>';
      g += '<path d="' + p([['M', 0.55, 0.16], ['L', 0.82, 0.16], ['L', 0.82, 0.8], ['L', 0.55, 0.8], ['Z']]) + '" fill="#4F4B47" stroke="' + C.ink + '" stroke-width="' + sw + '"/>';
      g += '<path d="' + p([['M', 0.12, 0.38], ['L', 0.42, 0.38], ['L', 0.42, 0.86], ['L', 0.12, 0.86], ['Z']]) + '" fill="#FFFFFF" stroke="' + C.ink + '" stroke-width="' + sw + '"/>';
      g += '<path d="' + p([['M', 0.16, 0.48], ['L', 0.38, 0.48], ['L', 0.38, 0.7], ['L', 0.16, 0.7], ['Z']]) + '" fill="#8E8A85" stroke="none"/>';
      g += '<path d="' + p([['M', 0.16, 0.76], ['L', 0.36, 0.76]]) + '" stroke="' + C.ink + '" stroke-width="' + sw * 1.6 + '"/>';
      g += '<path d="' + p([['M', 0.16, 0.8], ['L', 0.3, 0.8]]) + '" stroke="' + C.ink + '" stroke-width="' + sw + '"/>';
      // 문 앞의 작은 서연 (멀리서 몰래 찍은 사진)
      const f = figureShapes({ who: 'seoyeon', face: 0, pose: 'stand' }, 0.55, 0.6, 1);
      for (const sh of f.shapes) {
        if (sh.fill === 'none') continue;
        g += '<path d="' + pathFrom(sh.cmds, (u, v) => M(0.47 + u * 0.24, 0.16 + v * 0.24)) + '" fill="' + sh.fill + '" stroke="' + C.ink + '" stroke-width="' + sw * 0.7 + '"/>';
      }
      // 앞쪽 흐릿한 나뭇가지 (몰래 찍은 느낌)
      g += '<path d="' + p([['M', 0, 0.92], ['Q', 0.2, 0.86, 0.34, 1], ['L', 0, 1], ['Z']]) + '" fill="#3E3B38" stroke="none" opacity="0.85"/>';
      g += '<path d="' + p([['M', 0.88, 0], ['Q', 0.95, 0.4, 1, 0.55], ['L', 1, 0], ['Z']]) + '" fill="#3E3B38" stroke="none" opacity="0.8"/>';
    } else if (kind === 'shoulders') {
      g += '<path d="' + p([['M', 0, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']]) + '" fill="#E4E2DE" stroke="none"/>';
      g += '<path d="' + p([['M', 0, 0.45], ['L', 1, 0.42]]) + '" stroke="' + C.ink + '" stroke-width="' + sw + '"/>';
      g += '<path d="' + p([['M', 0, 0], ['L', 1, 0], ['L', 1, 0.43], ['L', 0, 0.45], ['Z']]) + '" fill="#C5C2BD" stroke="none"/>';
      g += '<path d="' + p(ellipseCmds(0.8, 0.78, 0.07, 0.07)) + '" fill="#FFFFFF" stroke="' + C.ink + '" stroke-width="' + sw + '"/>';
      const dad = figureShapes({ who: 'junho', face: 0, pose: 'stand', arm: 'down' }, 0.1, 0.95, 1);
      for (const sh of dad.shapes) {
        if (sh.fill === 'none') continue;
        g += '<path d="' + pathFrom(sh.cmds, (u, v) => M(0.4 + u * 0.36, 0.06 + v * 0.36)) + '" fill="' + sh.fill + '" stroke="' + C.ink + '" stroke-width="' + sw * 0.7 + '"/>';
      }
      const kid = figureShapes({ who: 'kid', face: 0, pose: 'sit', arm: 'down', expr: 'soft' }, -0.1, 0.95, 1);
      for (const sh of kid.shapes) {
        if (sh.fill === 'none') continue;
        g += '<path d="' + pathFrom(sh.cmds, (u, v) => M(0.4 + u * 0.36, 0.53 + v * 0.36)) + '" fill="' + sh.fill + '" stroke="' + C.ink + '" stroke-width="' + sw * 0.7 + '"/>';
      }
    } else {
      // 추상적인 작은 인화지
      g += '<path d="' + p([['M', 0, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']]) + '" fill="#D8D6D2" stroke="none"/>';
      g += '<path d="' + p([['M', 0, 0], ['L', 1, 0], ['L', 1, 0.4], ['Q', 0.5, 0.5, 0, 0.35], ['Z']]) + '" fill="#8C8985" stroke="none"/>';
      g += '<path d="' + p(ellipseCmds(0.5, 0.55, 0.08, 0.18)) + '" fill="#4D4A47" stroke="none"/>';
    }
    return g;
  }

  K.CAST = CAST;
  K.EXPR = EXPR;
  K.turnOf = turnOf;
  K.figureShapes = figureShapes;
  K.drawFigure = drawFigure;
  K.PROPS = PROPS;
  K.photoArt = photoArt;
  K.billboard = billboard;
})(typeof window !== 'undefined' ? window : globalThis);
