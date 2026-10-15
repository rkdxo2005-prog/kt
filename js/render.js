/* ──────────────────────────────────────────────────────────────
   샷 렌더러
   세트 + 배우 + 카메라 + 조명 룩 → 한 장의 콘티 패널(SVG)
   그리고 같은 데이터로 평면도(블로킹 다이어그램)를 그린다.
   ────────────────────────────────────────────────────────────── */
(function (G) {
  'use strict';
  const K = G.KONTI;
  const { V, C, n1, clamp, lerp, ease, D2R, rng, makeCam, toCam, scr, polyPath, lineClip, cocPx, blurLevel, BLUR_LEVELS, drawFigure, PROPS, nextUid, CAST } = K;

  /* ── 문서 전역 defs (한 번만 삽입) ── */
  function glowGrad(id, col, a) {
    return '<radialGradient id="' + id + '"><stop offset="0" stop-color="' + col + '" stop-opacity="' + a + '"/><stop offset=".35" stop-color="' + col + '" stop-opacity="' + (a * 0.45) + '"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></radialGradient>';
  }
  function smearGrad(id, col) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".75"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient>';
  }
  const GLOW_COLORS = { w: '#FFD27A', a: '#FFB25A', c: '#7FE0F5', m: '#FF7DB0', r: '#FF5A45', wh: '#FFF7E6', b: '#A9D4FF', g: '#B9FFC9' };
  function installDefs() {
    if (typeof document === 'undefined' || document.getElementById('konti-defs')) return;
    let d = '<svg id="konti-defs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>';
    d += '<filter id="kSketch" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G"/></filter>';
    d += '<filter id="kSketchA" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence id="kSketchAT" type="fractalNoise" baseFrequency="0.028" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G"/></filter>';
    d += '<filter id="kGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .16  0 0 0 0 .17  0 0 0 0 .19  0 0 0 -1.6 1.05"/></filter>';
    for (let i = 1; i < BLUR_LEVELS.length; i++) d += '<filter id="kB' + i + '" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="' + BLUR_LEVELS[i] + '"/></filter>';
    d += '<filter id="kSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>';
    d += '<pattern id="kHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><line x1="0" y1="0" x2="0" y2="6" stroke="#2A2D31" stroke-width="1.15"/></pattern>';
    d += '<pattern id="kHatchX" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><line x1="0" y1="0" x2="0" y2="6" stroke="#2A2D31" stroke-width="0.9"/></pattern>';
    for (const k in GLOW_COLORS) { d += glowGrad('kG' + k, GLOW_COLORS[k], 0.95); d += smearGrad('kS' + k, GLOW_COLORS[k]); }
    d += '<radialGradient id="kPool"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset=".5" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>';
    d += '<radialGradient id="kVig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>';
    d += '<linearGradient id="kSkyNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B3139"/><stop offset=".7" stop-color="#4C535D"/><stop offset="1" stop-color="#6D6A70"/></linearGradient>';
    d += '<linearGradient id="kSkyFlat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9CED3"/><stop offset="1" stop-color="#E6E8EA"/></linearGradient>';
    d += '<linearGradient id="kFadeR" x1="0" y1="0" x2="1" y2="0"><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".92"/></linearGradient>';
    d += '<marker id="kArrR" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + C.red + '"/></marker>';
    d += '<marker id="kArrB" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + C.blue + '"/></marker>';
    d += '</defs></svg>';
    const wrap = document.createElement('div');
    wrap.innerHTML = d;
    document.body.insertBefore(wrap.firstChild, document.body.firstChild);
  }

  /* ── 조명 룩 ── */
  const LOOKS = {
    flat: { amb: [1, 1, 1], lk: 0, fig: 'flat', rain: 0.3, glow: 0.22, sky: 'kSkyFlat', label: '하이키 · 플랫' },
    night: { amb: [0.4, 0.44, 0.54], lk: 1, fig: 'shade', rain: 0.3, glow: 1, sky: 'kSkyNight', figMin: [0.62, 0.64, 0.7], label: '로우키 · 야간' },
    backlight: { amb: [0.27, 0.31, 0.41], lk: 0.75, fig: 'silhouette', rain: 'back', glow: 1.65, sky: 'kSkyNight', rim: '#FFE6B0', label: '역광 · 실루엣' },
    neon: { amb: [0.36, 0.33, 0.48], lk: 1.25, fig: 'shade', rain: 0.14, glow: 1.25, sky: 'kSkyNight', tint: '#F4A3C6', figMin: [0.62, 0.58, 0.72], label: '네온 로우키' },
    diner: { amb: [0.7, 0.66, 0.62], lk: 1, fig: 'shade', rain: 0, glow: 0.9, figMin: [0.86, 0.82, 0.78], label: '실내 · 펜던트 키' },
    dinerFlat: { amb: [1, 1, 1], lk: 0, fig: 'flat', rain: 0, glow: 0.3, label: '형광등 플랫' },
    safelight: { amb: [0.34, 0.12, 0.1], lk: 1, fig: 'shade', rain: 0, glow: 1.25, figMin: [0.62, 0.24, 0.2], label: '안전등 · 레드' },
    safekey: { amb: [0.34, 0.12, 0.1], lk: 1, fig: 'shade', rain: 0, glow: 1.2, figMin: [0.62, 0.24, 0.2], tint: '#9CC6F2', label: '안전등 + 블루 키' },
    fluor: { amb: [0.95, 1, 0.98], lk: 0.3, fig: 'flat', rain: 0, glow: 0.25, label: '형광등 · 백색광' },
    platform: { amb: [0.3, 0.33, 0.43], lk: 1, fig: 'shade', rain: 0, glow: 1.1, sky: 'kSkyNight', figMin: [0.66, 0.66, 0.7], label: '야간 플랫폼' },
    platformBack: { amb: [0.3, 0.33, 0.43], lk: 0.6, fig: 'silhouette', rain: 0, glow: 1.6, sky: 'kSkyNight', rim: '#FFE6B0', label: '역광 · 실루엣' },
  };

  /* ── 면 단위 조명: 주변광 × 광원 거리 감쇠 ── */
  const HEX = {};
  function hex2rgb(h) {
    let c = HEX[h];
    if (c) return c;
    const m = h.replace('#', '');
    const v = m.length === 3 ? m.split('').map((x) => parseInt(x + x, 16)) : [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
    HEX[h] = v;
    return v;
  }
  const h2 = (x) => { const v = Math.max(0, Math.min(255, Math.round(x))); return (v < 16 ? '0' : '') + v.toString(16); };
  function makeShader(scene, look) {
    const amb = look.amb || [1, 1, 1];
    const lk = look.lk === undefined ? 1 : look.lk;
    const lights = lk ? activeLights(scene, look).filter((L) => L.illum) : [];
    const ident = amb[0] >= 1 && amb[1] >= 1 && amb[2] >= 1 && !lights.length;
    function factor(p) {
      let r = amb[0], g = amb[1], b = amb[2];
      for (const L of lights) {
        const dx = p[0] - L.pos[0], dy = p[1] - L.pos[1], dz = p[2] - L.pos[2];
        const R = L.illum.r;
        const f = L.illum.int * lk / (1 + (dx * dx + dy * dy + dz * dz) / (R * R));
        r += f * L.illum.c[0]; g += f * L.illum.c[1]; b += f * L.illum.c[2];
      }
      return [Math.min(r, 1.08), Math.min(g, 1.08), Math.min(b, 1.08)];
    }
    function apply(hex, f) {
      if (!hex || hex[0] !== '#') return hex;
      const c = hex2rgb(hex);
      return '#' + h2(c[0] * f[0]) + h2(c[1] * f[1]) + h2(c[2] * f[2]);
    }
    return {
      ident, factor, apply,
      at(p, floor) {
        if (ident) return (x) => x;
        let f = factor(p);
        if (floor) f = [Math.max(f[0], floor[0]), Math.max(f[1], floor[1]), Math.max(f[2], floor[2])];
        return (hex) => apply(hex, f);
      },
    };
  }


  /* ── 샷 사이즈 → 화면에 담을 세로 범위 ── */
  const SIZE = {
    ECU: (t) => [t - 0.055, t - 0.165],
    CU: (t) => [t + 0.05, t - 0.33],
    MCU: (t) => [t + 0.08, t - 0.55],
    MS: (t) => [t + 0.12, t - 0.84],
    MLS: (t) => [t + 0.15, t - 1.25],
    FS: (t, g) => [t + 0.22, g - 0.14],
    LS: (t, g) => [g + (t - g) * 2.0, g - (t - g) * 0.55],
  };
  const SIZE_NAME = { ELS: '익스트림 롱 숏', LS: '롱 숏', FS: '풀 숏', MLS: '미디엄 롱 숏', MS: '미디엄 숏', MCU: '미디엄 클로즈업', CU: '클로즈업', ECU: '익스트림 클로즈업', INS: '인서트' };
  const MOVE_NAME = {
    static: 'FIX (고정)', pushIn: 'PUSH IN (달리 인)', pullOut: 'PULL BACK (달리 아웃)', zoomIn: 'ZOOM IN', crash: 'CRASH ZOOM',
    dollyZoom: 'DOLLY ZOOM', craneDown: 'CRANE DOWN', craneUp: 'CRANE UP', handheld: 'HANDHELD', steadicam: 'STEADICAM', track: 'TRACK', pan: 'PAN',
  };

  function headTopOf(f) {
    const P = CAST[f.who] || CAST.seoyeon;
    return f.pos[1] + (f.pose === 'sit' ? P.h - 0.41 : f.pose === 'run' ? P.h - 0.07 : P.h);
  }

  /* 배우의 t 시점 위치 */
  function castAt(cast, t) {
    return cast.map((f) => {
      const g = Object.assign({}, f);
      if (f.move) g.pos = V.add(f.pos, V.mul(f.move, t - 0.5));
      if (f.pose === 'run') g.phase = (f.phase0 || 0) + t * (f.cycles || 6) * Math.PI * 2;
      return g;
    });
  }

  /* 카메라 스펙(끝 프레임) 계산 */
  function baseCam(shot, cast, W) {
    const cs = shot.cam;
    const Href = W / 1.85;
    if (cs.frame) {
      const fr = cs.frame;
      const fig = cast.find((f) => f.id === fr.who) || cast[0];
      const ht = headTopOf(fig);
      const [t, b] = SIZE[fr.size](ht, fig.pos[1]);
      const cy = (t + b) / 2 + (fr.dy || 0), span = (t - b) * (fr.k || 1);
      const L = span * ((cs.lens / 36) * W) / Href;
      const az = (fr.rel !== undefined ? (180 - (fig.face || 0) + fr.rel) : (fr.az || 0)) * D2R;
      const el = (fr.el || 0) * D2R;
      const tgt = [fig.pos[0] + (fr.dx || 0), cy, fig.pos[2] + (fr.dz || 0)];
      const pos = [tgt[0] + L * Math.sin(az) * Math.cos(el), cy + L * Math.sin(el), tgt[2] - L * Math.cos(az) * Math.cos(el)];
      if (fr.camY !== undefined) pos[1] = fr.camY;
      return { pos, target: tgt, lens: cs.lens, roll: cs.roll || 0, shift: cs.shift, yaw: cs.yaw };
    }
    return { pos: cs.pos.slice(), target: cs.target ? cs.target.slice() : null, lens: cs.lens, roll: cs.roll || 0, shift: cs.shift, yaw: cs.yaw, pitch: cs.pitch };
  }

  /* 무빙: t(0..1)에서 카메라 */
  function noise(seed, t) {
    const r = rng(seed);
    let v = 0;
    for (let i = 0; i < 3; i++) { const f = 1.3 + r() * 4 * (i + 1), p = r() * 6.28; v += Math.sin(t * f * 6.28 + p) / (i + 1); }
    return v / 1.8;
  }
  function camAt(shot, cast, t, W) {
    const b = baseCam(shot, cast, W);
    const mv = shot.move || { type: 'static' };
    const c = { pos: b.pos.slice(), target: b.target && b.target.slice(), lens: b.lens, roll: b.roll, shift: b.shift, yaw: b.yaw, pitch: b.pitch };
    const tgt = c.target;
    const e = ease(clamp(t, 0, 1));
    const followDelta = () => {
      const who = mv.follow ? cast.find((f) => f.id === mv.follow) : null;
      return who && who.move ? V.mul(who.move, t - 0.5) : [0, 0, 0];
    };
    switch (mv.type) {
      case 'pushIn': {
        const k0 = mv.k || 1.7;
        c.pos = V.add(tgt, V.mul(V.sub(b.pos, tgt), lerp(k0, 1, e)));
        break;
      }
      case 'pullOut': {
        const k0 = mv.k || 0.5;
        c.pos = V.add(tgt, V.mul(V.sub(b.pos, tgt), lerp(k0, 1, e)));
        break;
      }
      case 'zoomIn': case 'crash': {
        const z0 = mv.z || 2.6;
        const tt = mv.type === 'crash' ? Math.pow(clamp(t, 0, 1), 0.28) : e;
        c.lens = lerp(b.lens / z0, b.lens, tt);
        break;
      }
      case 'dollyZoom': {
        const k0 = mv.k || 2.4;
        const kk = lerp(k0, 1, e);
        c.pos = V.add(tgt, V.mul(V.sub(b.pos, tgt), kk));
        c.lens = b.lens * kk;
        break;
      }
      case 'craneDown': case 'craneUp': case 'pan': {
        const fr = mv.from || {};
        const p0 = fr.pos || V.add(b.pos, [0, mv.type === 'craneDown' ? (mv.rise || 10) : -(mv.rise || 10), 0]);
        const t0 = fr.target || (tgt ? V.add(tgt, [0, mv.type === 'craneDown' ? (mv.rise || 10) * (mv.tk || 0.9) : -(mv.rise || 10) * (mv.tk || 0.5), 0]) : null);
        c.pos = V.lerp(p0, b.pos, e);
        if (tgt && t0) c.target = V.lerp(t0, tgt, e);
        if (fr.lens) c.lens = lerp(fr.lens, b.lens, e);
        break;
      }
      case 'handheld': {
        const d = followDelta();
        c.pos = V.add(b.pos, d);
        if (tgt) c.target = V.add(tgt, d);
        const a = mv.amp || 1;
        const sd = (shot.seed || 7) * 13;
        c.handheld = [noise(sd, t) * 1.2 * a, noise(sd + 1, t) * 0.9 * a, noise(sd + 2, t) * 2.4 * a];
        break;
      }
      case 'steadicam': case 'track': {
        const d = followDelta();
        c.pos = V.add(b.pos, d);
        if (tgt) c.target = V.add(tgt, d);
        break;
      }
      default: break;
    }
    return c;
  }
  function buildCam(c, W, H) {
    const o = { pos: c.pos, target: c.target, lens: c.lens, roll: c.roll, W, H, shift: c.shift, yaw: c.yaw, pitch: c.pitch };
    if (c.handheld) {
      const cam0 = makeCam(o);
      return makeCam({ pos: c.pos, yaw: cam0.yaw / D2R + c.handheld[0], pitch: cam0.pitch / D2R + c.handheld[1], roll: (c.roll || 0) + c.handheld[2], lens: c.lens, W, H });
    }
    return makeCam(o);
  }
  const KEY_T = { pushIn: 0, zoomIn: 0, crash: 0, pullOut: 1, dollyZoom: 1, craneDown: 1, craneUp: 1, pan: 1, handheld: 0.5, steadicam: 0.5, track: 0.5, static: 0.5 };

  /* ── 텍스트 데칼 ── */
  function textDecal(cam, dc, sh) {
    const [tl, tr, br, bl] = dc.pts;
    const ctl = toCam(cam, tl), ctr = toCam(cam, tr), cbl = toCam(cam, bl), cbr = toCam(cam, br);
    if (ctl[2] < 0.1 || ctr[2] < 0.1 || cbl[2] < 0.1 || cbr[2] < 0.1) return '';
    const a = scr(cam, ctl), b = scr(cam, ctr), d = scr(cam, cbl);
    const wl = V.len(V.sub(tr, tl)), hl = V.len(V.sub(bl, tl));
    const pxw = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (pxw < 6) return '';
    const bw = 100, bh = 100 * hl / wl;
    const m = [(b[0] - a[0]) / bw, (b[1] - a[1]) / bw, (d[0] - a[0]) / bh, (d[1] - a[1]) / bh, a[0], a[1]];
    const fam = dc.font === 'hand' ? "'Nanum Pen Script','IBM Plex Sans KR',sans-serif" : "'Black Han Sans','IBM Plex Sans KR',sans-serif";
    let s = '<g transform="matrix(' + m.map((x) => n1(x * 100) / 100).join(' ') + ')">';
    const col = sh ? sh(dc.color || C.ink) : (dc.color || C.ink);
    if (dc.vertical) {
      const chars = Array.from(dc.text);
      const step = bh / chars.length;
      const fs = Math.min(step * 0.82, bw * 0.8);
      chars.forEach((ch, i) => {
        s += '<text x="' + bw / 2 + '" y="' + n1(step * (i + 0.5)) + '" font-size="' + n1(fs) + '" text-anchor="middle" dominant-baseline="central" fill="' + col + '" font-family="' + fam + '">' + ch + '</text>';
      });
    } else {
      const fs = Math.min(bh * 0.72, (bw / Math.max(1, Array.from(dc.text).length)) * (dc.font === 'hand' ? 1.6 : 1.15));
      s += '<text x="' + bw / 2 + '" y="' + n1(bh / 2) + '" font-size="' + n1(fs) + '" text-anchor="middle" dominant-baseline="central" fill="' + col + '" font-family="' + fam + '"' + (dc.mirror ? ' transform="translate(' + bw + ' 0) scale(-1 1)"' : '') + (dc.ls ? ' letter-spacing="' + dc.ls + '"' : '') + '>' + dc.text + '</text>';
    }
    return s + '</g>';
  }

  /* ── 메인: 샷 렌더 ── */
  function renderShot(shot, opts) {
    installDefs();
    opts = opts || {};
    const W = opts.W || 1000;
    const aspect = opts.aspect || 1.85;
    const H = Math.round(W / aspect);
    const uid = nextUid();
    const lw = opts.thumb ? 1.7 : 1;
    const look = LOOKS[shot.look] || LOOKS.night;
    const t = opts.t !== undefined ? opts.t : (KEY_T[(shot.move && shot.move.type) || 'static'] ?? 0.5);

    if (shot.fx === 'black') return blackPanel(shot, W, H, opts);

    const cast0 = (shot.cast || []).map((f) => Object.assign({ id: f.who }, f));
    const cast = castAt(cast0, t);
    const cspec = camAt(shot, cast0, t, W);
    const cam = buildCam(cspec, W, H);
    const set = K.SETS[shot.set];
    const scene = set.build(shot, t);
    const ctx = { lw, uid, look, figs: [], thumb: !!opts.thumb, figMode: look.fig };

    // 초점 거리
    let dof = null;
    if (shot.dof !== false) {
      let fd = shot.focus;
      if (!fd) {
        const fw = shot.focusOn ? cast.find((f) => f.id === shot.focusOn) : (shot.cam.frame ? cast.find((f) => f.id === shot.cam.frame.who) : null);
        if (fw) fd = toCam(cam, [fw.pos[0], headTopOf(fw) - 0.12, fw.pos[2]])[2];
        else if (cspec.target) fd = toCam(cam, cspec.target)[2];
      }
      if (fd) dof = { focus: Math.max(0.2, fd), N: shot.N || 2.8 };
    }
    const blurCap = opts.thumb ? 3.2 : 6;
    const bl = (depth) => (dof ? blurLevel(cocPx(cam, dof, depth) * (opts.thumb ? 0.6 : 1), blurCap) : 0);

    const items = [];
    const shader = makeShader(scene, look);
    const centroid = (pts) => { let x = 0, y = 0, z = 0; for (const p of pts) { x += p[0]; y += p[1]; z += p[2]; } return [x / pts.length, y / pts.length, z / pts.length]; };
    // 면, 선
    for (const it of scene.items) {
      const st = it.st;
      if (it.k === 'f' || it.k === 'p') {
        if (st.n) {
          const p0 = it.pts[0];
          const vc = V.sub(p0, cam.pos);
          if (V.dot(st.n, vc) >= -1e-6) continue;
        }
        const pp = polyPath(cam, it.pts, true);
        if (!pp) continue;
        const sh = shader.at(centroid(it.pts));
        const fill = st.emit ? st.fill : sh(st.fill || C.g3);
        let svg = '<path d="' + pp.d + '" fill="' + fill + '"' + (st.stroke === 'none' ? ' stroke="none"' : ' stroke="' + (st.stroke || C.ink) + '" stroke-width="' + n1((st.sw || 1) * lw * 10) / 10 + '" stroke-linejoin="round"') + (st.op ? ' opacity="' + st.op + '"' : '') + (st.blend ? ' style="mix-blend-mode:' + st.blend + '"' : '') + '/>';
        if (st.dec && pp.area > 30) {
          for (const dc of st.dec) {
            if (dc.text) { svg += textDecal(cam, dc, dc.emit || !dc.color ? null : sh); continue; }
            if (dc.photo) {
              const [tl, tr, , bl2] = dc.pts;
              const q = polyPath(cam, dc.pts, true);
              if (!q || q.area < 20) continue;
              const A = K.project(cam, bl2), B = K.project(cam, V.add(bl2, V.sub(tr, tl))), D = K.project(cam, tl);
              const M = (x, y) => [A[0] + (B[0] - A[0]) * x + (D[0] - A[0]) * y, A[1] + (B[1] - A[1]) * x + (D[1] - A[1]) * y];
              const f = shader.ident ? null : shader.factor(centroid(dc.pts));
              svg += '<g opacity="' + (dc.op || 1) + '">' + K.photoArt(dc.photo, M, ctx) + '</g>';
              if (f) svg += '<path d="' + q.d + '" fill="rgb(' + Math.round(f[0] * 255) + ',' + Math.round(f[1] * 255) + ',' + Math.round(f[2] * 255) + ')" style="mix-blend-mode:multiply"/>';
              continue;
            }
            const q = polyPath(cam, dc.pts, true);
            if (!q || q.area < 4) continue;
            svg += '<path d="' + q.d + '" fill="' + (dc.emit ? (dc.fill || 'none') : sh(dc.fill || 'none')) + '"' + (dc.stroke === 'none' ? ' stroke="none"' : ' stroke="' + (dc.stroke || C.ink) + '" stroke-width="' + n1((dc.sw || 0.8) * lw * 10) / 10 + '"') + (dc.op ? ' opacity="' + dc.op + '"' : '') + '/>';
          }
        }
        items.push({ layer: st.layer === undefined ? 1 : st.layer, depth: pp.depth + (st.bias || 0), svg, blur: bl(pp.depth) });
      } else if (it.k === 'l') {
        const lc = lineClip(cam, it.a, it.b);
        if (!lc) continue;
        const svg = '<path d="M' + n1(lc.a[0]) + ' ' + n1(lc.a[1]) + 'L' + n1(lc.b[0]) + ' ' + n1(lc.b[1]) + '" stroke="' + (st.stroke || C.ink) + '" stroke-width="' + n1((st.sw || 1) * lw * 10) / 10 + '" fill="none"' + (st.op ? ' opacity="' + st.op + '"' : '') + (st.dash ? ' stroke-dasharray="' + st.dash + '"' : '') + '/>';
        items.push({ layer: st.layer === undefined ? 1 : st.layer, depth: lc.depth + (st.bias || 0), svg, blur: bl(lc.depth) });
      }
    }
    // 소품 스프라이트
    for (const sp of scene.sprites) {
      const cp = toCam(cam, sp.pos);
      if (cp[2] < cam.near) continue;
      let svg = sp.draw(cam, ctx);
      if (!svg) continue;
      if (!sp.emit && !shader.ident) {
        const sh = shader.at(sp.pos);
        svg = svg.replace(/fill="(#[0-9A-Fa-f]{6})"/g, (m, h) => 'fill="' + sh(h) + '"');
      }
      items.push({ layer: sp.layer === undefined ? 1 : sp.layer, depth: cp[2] + (sp.bias || 0), svg, blur: bl(cp[2]) });
    }
    // 광원: 광채, 빛 웅덩이, 젖은 바닥 반사
    lightItems(scene, cam, look, ctx, W, H, dof, opts, items, bl);
    // 시선: lookAt 대상의 화면 위치로 눈동자 방향 계산
    for (const f of cast) {
      if (!f.lookAt) continue;
      const tg = cast.find((g) => g.id === f.lookAt);
      if (!tg) continue;
      const a = toCam(cam, [f.pos[0], headTopOf(f) - 0.11, f.pos[2]]);
      const b = toCam(cam, [tg.pos[0], headTopOf(tg) - 0.11, tg.pos[2]]);
      if (a[2] < cam.near) continue;
      if (b[2] < cam.near * 4) { f.gaze = [0, 0]; f.gazeAbs = true; continue; }
      const pa = scr(cam, a), pb = scr(cam, b);
      const dx = pb[0] - pa[0], dy = pb[1] - pa[1];
      const l = Math.hypot(dx, dy) + cam.F * 0.12 / a[2];
      f.gaze = [clamp(dx / l * 1.3, -1, 1), clamp(-dy / l * 1.3, -1, 1)];
      f.gazeAbs = true;
    }
    // 배우
    const figClips = [];
    for (const f of cast) {
      if (f.hide) continue;
      const chest = [f.pos[0], headTopOf(f) - 0.35, f.pos[2]];
      ctx.sh = look.fig === 'silhouette' ? null : shader.at(chest, look.figMin);
      const r = drawFigure(f, cam, ctx);
      ctx.sh = null;
      if (!r) continue;
      r.f = f;
      ctx.figs.push(r);
      let svg = '<g>' + r.svg + '</g>';
      svg += figureLight(r, f, cam, scene, look, ctx);
      let sortDepth = r.depth - 0.35;
      if (f.clip) {
        const cpth = polyPath(cam, f.clip, true);
        if (cpth) {
          const id = uid + 'c' + figClips.length;
          figClips.push('<clipPath id="' + id + '"><path d="' + cpth.d + '"/></clipPath>');
          svg = '<g clip-path="url(#' + id + ')">' + svg + '</g>';
          sortDepth = cpth.depth - 0.4;
        }
      }
      items.push({ layer: f.layer === undefined ? 1 : f.layer, depth: sortDepth + (f.bias || 0), svg, blur: f.sharp ? 0 : bl(r.depth) });
    }

    items.sort((a, b) => (a.layer - b.layer) || (b.depth - a.depth));
    let body = '';
    let run = -1;
    for (const it of items) {
      if (it.blur !== run) {
        if (run > 0) body += '</g>';
        if (it.blur > 0) body += '<g filter="url(#kB' + it.blur + ')">';
        run = it.blur;
      }
      body += it.svg;
    }
    if (run > 0) body += '</g>';

    /* 하늘 */
    let sky = '';
    if (scene.sky) sky = '<rect x="-20" y="-20" width="' + (W + 40) + '" height="' + (H + 40) + '" fill="url(#' + (look.sky || 'kSkyNight') + ')"/>';
    else sky = '<rect x="-20" y="-20" width="' + (W + 40) + '" height="' + (H + 40) + '" fill="' + shader.at([0, 1.5, 0])(scene.bg || C.g3) + '"/>';

    /* 비 */
    const rain = (scene.rain && look.rain) ? rainLayer(shot, cam, look, ctx, W, H, opts, scene) : '';

    /* 주석 */
    const ann = opts.annotate === false ? '' : annotations(shot, cast0, cam, cspec, ctx, W, H, opts, t);
    const guides = opts.guides ? guideLayer(cam, W, H) : '';

    let core = sky + '<g filter="url(#' + (opts.anim ? 'kSketchA' : 'kSketch') + ')">' + body + '</g>' + rain;
    if (look.vig !== false && look.amb && look.amb[0] < 0.8) core += '<rect width="' + W + '" height="' + H + '" fill="url(#kVig)" opacity=".7"/>';
    core += '<rect width="' + W + '" height="' + H + '" filter="url(#kGrain)" opacity=".5" style="mix-blend-mode:multiply"/>';

    let inner = '<clipPath id="' + uid + 'f"><rect width="' + W + '" height="' + H + '"/></clipPath>' + figClips.join('');
    let content = '<g clip-path="url(#' + uid + 'f)">' + core;
    if (shot.fx === 'fade') content += '<rect width="' + W + '" height="' + H + '" fill="url(#kFadeR)"/>';
    content += guides + '</g>';

    if (shot.fx === 'freeze') {
      const sc = 0.8;
      content = '<rect width="' + W + '" height="' + H + '" fill="#26292E"/>' +
        '<g transform="translate(' + n1(W * 0.1) + ' ' + n1(H * 0.09) + ') rotate(-2.2 ' + n1(W * sc / 2) + ' ' + n1(H * sc / 2) + ') scale(' + sc + ')">' +
        '<rect x="-22" y="-22" width="' + (W + 44) + '" height="' + (H + 70) + '" fill="#FBFAF5" stroke="#1F2124" stroke-width="2"/>' + content + '</g>' +
        '<rect width="' + W + '" height="' + H + '" fill="#FFFFFF" opacity=".12"/>';
    }
    const frame = '<rect x="1.5" y="1.5" width="' + (W - 3) + '" height="' + (H - 3) + '" fill="none" stroke="' + C.ink + '" stroke-width="' + (opts.thumb ? 4 : 3) + '"/>';
    const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="konti-svg" role="img" aria-label="' + (opts.label || shot.alt || '콘티 패널') + '"><defs>' + inner + '</defs>' + content + ann + frame + '</svg>';
    return svg;
  }

  /* ── 인물 조명 (그림자 면, 실루엣 림, 색 키) ── */
  function figureLight(r, f, cam, scene, look, ctx) {
    if (!r.sil.length) return '';
    const id = ctx.uid + 's' + ctx.figs.length;
    const [x0, y0, x1, y1] = r.bbox;
    const w = x1 - x0, h = y1 - y0;
    let clip = '<clipPath id="' + id + '">' + r.sil.map((d) => '<path d="' + d + '"/>').join('') + '</clipPath>';
    let out = '';
    if (look.fig === 'silhouette') {
      out += '<g clip-path="url(#' + id + ')"><g fill="none" stroke="' + (look.rim || '#FFE6B0') + '" stroke-width="' + n1(clamp(r.headPx * 0.09, 1.2, 9) * (ctx.lw || 1)) + '" opacity=".85" style="mix-blend-mode:screen">' + r.sil.map((d) => '<path d="' + d + '"/>').join('') + '</g></g>';
      return '<defs>' + clip + '</defs>' + out;
    }
    if (look.fig === 'flat') return '';
    // 키 라이트 방향: 가장 밝은 광원의 화면 위치
    let side = f.key || scene.key || null;
    if (!side) {
      let best = null, bs = -1;
      for (const L of activeLights(scene, look)) {
        if (L.key === 0) continue;
        const cp = toCam(cam, L.pos);
        const d = V.len(V.sub(L.pos, f.pos));
        const sc = (L.key || (L.illum ? L.illum.int : 0) || 0.3) / (1 + d * d * 0.04);
        if (sc > bs) { bs = sc; best = cp; }
      }
      if (best) {
        const lp = scr(cam, best);
        side = lp[0] < (r.top ? r.top[0] : (x0 + x1) / 2) ? 'L' : 'R';
      } else side = 'L';
    }
    const cx = r.top ? r.top[0] : (x0 + x1) / 2;
    const off = w * 0.08;
    const sx = side === 'L' ? cx + off : x0 - 4;
    const ex = side === 'L' ? x1 + 4 : cx - off;
    const sk = clamp(r.headPx / 60, 0.6, 3);
    out += '<g clip-path="url(#' + id + ')">';
    out += '<rect x="' + n1(sx) + '" y="' + n1(y0 - 4) + '" width="' + n1(Math.max(0, ex - sx)) + '" height="' + n1(h + 8) + '" fill="#4C535C" opacity=".38" style="mix-blend-mode:multiply"/>';
    if (r.headPx > 14) out += '<rect x="' + n1(sx) + '" y="' + n1(y0 - 4) + '" width="' + n1(Math.max(0, ex - sx)) + '" height="' + n1(h + 8) + '" fill="url(#kHatch)" opacity="' + n1(clamp(0.35 / Math.sqrt(sk), 0.12, 0.4) * 100) / 100 + '"/>';
    if (look.tint) {
      const tx0 = side === 'L' ? x0 - 4 : cx + off, tx1 = side === 'L' ? cx - off * 0.3 : x1 + 4;
      out += '<rect x="' + n1(tx0) + '" y="' + n1(y0 - 4) + '" width="' + n1(Math.max(0, tx1 - tx0)) + '" height="' + n1(h + 8) + '" fill="' + look.tint + '" opacity=".75" style="mix-blend-mode:multiply"/>';
    }
    out += '</g>';
    return '<defs>' + clip + '</defs>' + out;
  }

  /* ── 광원 항목: 깊이 정렬에 함께 들어가므로 가림이 정확하다 ── */
  function lightItems(scene, cam, look, ctx, W, H, dof, opts, items, bl) {
    const gk = look.glow || 1;
    for (const L of activeLights(scene, look)) {
      const col = L.col || 'w';
      const a = clamp((L.int || 1) * gk, 0, 1);
      // 바닥 빛 웅덩이
      if (L.pool && a > 0.05) {
        const gy = L.groundY !== undefined ? L.groundY : 0;
        const pts = [];
        for (let i = 0; i < 20; i++) { const t = (i / 20) * Math.PI * 2; pts.push([L.pos[0] + Math.cos(t) * L.pool, gy + 0.01, L.pos[2] + Math.sin(t) * L.pool]); }
        const pp = polyPath(cam, pts, true);
        if (pp) items.push({ layer: L.poolLayer !== undefined ? L.poolLayer : 0.5, depth: pp.depth, blur: 0, svg: '<path d="' + pp.d + '" fill="url(#kG' + col + ')" opacity="' + n1((L.poolA || 0.5) * a * 100) / 100 + '" style="mix-blend-mode:screen"/>' });
      }
      const cp = toCam(cam, L.pos);
      if (cp[2] < cam.near) continue;
      const p = scr(cam, cp);
      const r = clamp((L.glow || 0) * cam.F / cp[2], 0, W * 0.7);
      if (r < 1.5 || a < 0.03) continue;
      if (p[0] < -r * 2.4 || p[0] > W + r * 2.4 || p[1] < -r * 2.4 || p[1] > H + r * 2.4) continue;
      let g = '';
      const coc = dof ? cocPx(cam, dof, cp[2]) * (opts.thumb ? 0.6 : 1) : 0;
      if (coc > 14 && L.bokeh !== false) {
        const br = clamp(coc * 0.55, 6, 70);
        g += '<circle cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="' + n1(br) + '" fill="' + GLOW_COLORS[col] + '" fill-opacity=".34" stroke="' + GLOW_COLORS[col] + '" stroke-opacity=".75" stroke-width="' + n1(br * 0.05 + 0.6) + '"/>';
        g += '<circle cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="' + n1(br * 2) + '" fill="url(#kG' + col + ')" opacity="' + n1(a * 0.45 * 100) / 100 + '"/>';
      } else {
        g += '<circle cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="' + n1(r * 2.2) + '" fill="url(#kG' + col + ')" opacity="' + n1(a * 100) / 100 + '"/>';
        if (L.core !== false) g += '<circle cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="' + n1(clamp(r * 0.2, 1, 26)) + '" fill="#FFFBEF" opacity="' + n1(a * 0.9 * 100) / 100 + '"/>';
      }
      items.push({ layer: L.layer !== undefined ? L.layer : 1, depth: cp[2] - 0.08, blur: coc > 14 ? 0 : bl(cp[2]), svg: '<g style="mix-blend-mode:screen">' + g + '</g>' });
      // 젖은 바닥 반사
      if (scene.wet && L.reflect !== false && L.pos[1] > 0.5) {
        const gy = L.groundY !== undefined ? L.groundY : 0;
        const g0 = toCam(cam, [L.pos[0], gy, L.pos[2]]);
        const g1 = toCam(cam, [L.pos[0], 2 * gy - L.pos[1], L.pos[2]]);
        if (g0[2] > cam.near && g1[2] > cam.near) {
          const a0 = scr(cam, g0), a1 = scr(cam, g1);
          const len = a1[1] - a0[1];
          if (len > 2) {
            const wpx = clamp(r * 0.55, 1.5, 70);
            items.push({ layer: 0.45, depth: g0[2], blur: 0, svg: '<rect x="' + n1(a0[0] - wpx / 2) + '" y="' + n1(a0[1]) + '" width="' + n1(wpx) + '" height="' + n1(Math.min(len * 1.05, H)) + '" fill="url(#kS' + col + ')" opacity="' + n1(a * 0.75 * 100) / 100 + '" style="mix-blend-mode:screen"/>' });
          }
        }
      }
    }
  }
  function lookName(look) { for (const k in LOOKS) if (LOOKS[k] === look) return k; return ''; }

  /* ── 비 ── */
  function activeLights(scene, look) {
    const nm = lookName(look);
    return scene.lights.filter((L) => L.on !== false && (!L.looks || L.looks.indexOf(nm) >= 0) && (!L.notLooks || L.notLooks.indexOf(nm) < 0));
  }
  function rainLayer(shot, cam, look, ctx, W, H, opts, scene) {
    const R = rng((shot.seed || 11) * 97 + (opts.anim ? Math.floor((opts.t || 0) * 40) : 0));
    const n = opts.thumb ? 140 : 260;
    const lens = cam.lens;
    const back = look.rain === 'back';
    const base = back ? 0.08 : look.rain;
    // 역광 판정용 광원 위치
    const lightPts = [];
    for (const L of activeLights(scene, look)) {
      const cp = toCam(cam, L.pos);
      if (cp[2] < cam.near) continue;
      lightPts.push({ p: scr(cam, cp), r: clamp((L.glow || 0.5) * cam.F / cp[2], 8, W) * (L.rainLit || 3) });
    }
    let s = '<g stroke-linecap="round">';
    const ang = (shot.wind || 8) * D2R;
    for (let i = 0; i < n; i++) {
      const x = R() * (W + 80) - 40, y = R() * (H + 40) - 20;
      const depthK = 0.35 + R() * R() * 1.6;
      const len = (10 + lens * 0.25) * depthK * (opts.thumb ? 1.2 : 1);
      let a = base * (0.5 + R() * 0.7);
      let col = '#E3EAF0';
      if (back) {
        let b = 0;
        for (const lp of lightPts) {
          const d = Math.hypot(x - lp.p[0], y - lp.p[1]);
          b = Math.max(b, 1 - d / lp.r);
        }
        a = 0.06 + 0.9 * clamp(b, 0, 1) * (0.6 + R() * 0.4);
        col = '#FFF4D8';
      }
      if (a < 0.04) continue;
      const dx = Math.sin(ang) * len, dy = Math.cos(ang) * len;
      s += '<path d="M' + n1(x) + ' ' + n1(y) + 'l' + n1(-dx) + ' ' + n1(dy) + '" stroke="' + col + '" stroke-width="' + n1(clamp(depthK * 1.1, 0.6, 2.2) * (opts.thumb ? 1.5 : 1)) + '" opacity="' + n1(a * 100) / 100 + '"/>';
    }
    return s + '</g>';
  }

  /* ── 가이드 (지평선, 3분할) ── */
  function guideLayer(cam, W, H) {
    let s = '<g stroke="' + C.npb + '" fill="none" stroke-width="1.2" opacity=".85">';
    s += '<path d="M' + n1(W / 3) + ' 0V' + H + 'M' + n1(2 * W / 3) + ' 0V' + H + 'M0 ' + n1(H / 3) + 'H' + W + 'M0 ' + n1(2 * H / 3) + 'H' + W + '" stroke-dasharray="4 6" opacity=".7"/>';
    const hl = horizon(cam);
    if (hl) {
      s += '<path d="M' + n1(hl[0][0]) + ' ' + n1(hl[0][1]) + 'L' + n1(hl[1][0]) + ' ' + n1(hl[1][1]) + '" stroke-width="1.6"/>';
      const lx = 14, ly = hl[0][1] + (hl[1][1] - hl[0][1]) * (lx / W);
      if (ly > 10 && ly < H - 4) s += '<text x="' + lx + '" y="' + n1(ly - 6) + '" fill="' + C.npb + '" stroke="none" font-size="22" font-family="\'Nanum Pen Script\',sans-serif">HL · 카메라 높이</text>';
    }
    return s + '</g>';
  }
  function horizon(cam) {
    const far = 5000;
    const a = toCam(cam, V.add(cam.pos, V.add(V.mul(cam.fH, far), V.mul(cam.rH, -far * 3))));
    const b = toCam(cam, V.add(cam.pos, V.add(V.mul(cam.fH, far), V.mul(cam.rH, far * 3))));
    if (a[2] <= 0 || b[2] <= 0) return null;
    const pa = scr(cam, a), pb = scr(cam, b);
    // 화면 폭으로 자르기
    const k0 = (0 - pa[0]) / (pb[0] - pa[0]), k1 = (cam.W - pa[0]) / (pb[0] - pa[0]);
    const y0 = pa[1] + (pb[1] - pa[1]) * k0, y1 = pa[1] + (pb[1] - pa[1]) * k1;
    if ((y0 < -5 && y1 < -5) || (y0 > cam.H + 5 && y1 > cam.H + 5)) return null;
    return [[0, y0], [cam.W, y1]];
  }

  /* ── 콘티 기호 (카메라 무빙: 빨강, 인물 동선: 파랑) ── */
  function handText(x, y, txt, col, size, anchor, rot) {
    return '<text x="' + n1(x) + '" y="' + n1(y) + '" fill="' + col + '" font-size="' + size + '" font-family="\'Nanum Pen Script\',\'IBM Plex Sans KR\',sans-serif" text-anchor="' + (anchor || 'start') + '" paint-order="stroke" stroke="#FAFAF6" stroke-width="5" stroke-linejoin="round"' + (rot ? ' transform="rotate(' + rot + ' ' + n1(x) + ' ' + n1(y) + ')"' : '') + '>' + txt + '</text>';
  }
  function arrow(x0, y0, x1, y1, col, w, curve) {
    const mk = col === C.blue ? 'kArrB' : 'kArrR';
    let d = 'M' + n1(x0) + ' ' + n1(y0);
    if (curve) d += 'Q' + n1(curve[0]) + ' ' + n1(curve[1]) + ' ' + n1(x1) + ' ' + n1(y1);
    else d += 'L' + n1(x1) + ' ' + n1(y1);
    return '<path d="' + d + '" fill="none" stroke="#FAFAF6" stroke-width="' + (w + 4) + '" stroke-linecap="round" opacity=".8"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" marker-end="url(#' + mk + ')"/>';
  }
  function annotations(shot, cast0, cam, cspec, ctx, W, H, opts, t) {
    const mv = shot.move || { type: 'static' };
    const th = opts.thumb;
    const fs = th ? 58 : 34;
    const aw = th ? 7 : 4.2;
    let s = '<g class="ann">';
    const col = C.red;
    const endRect = (camA, camB) => {
      // camB(끝/시작) 프레임을 camA 화면 좌표의 사각형으로
      const tg = cspec.target || V.add(camB.pos, V.mul(camB.f, 3));
      const pa = scr(camA, toCam(camA, tg)), pb = scr(camB, toCam(camB, tg));
      const da = toCam(camA, tg)[2], db = toCam(camB, tg)[2];
      const ratio = (db / da) * (camA.F / camB.F);
      return { x: pa[0] - pb[0] * ratio, y: pa[1] - pb[1] * ratio, w: W * ratio, h: H * ratio };
    };
    const rectSvg = (r) => '<rect x="' + n1(r.x) + '" y="' + n1(r.y) + '" width="' + n1(r.w) + '" height="' + n1(r.h) + '" fill="none" stroke="#FAFAF6" stroke-width="' + (aw + 3) + '" opacity=".7"/><rect x="' + n1(r.x) + '" y="' + n1(r.y) + '" width="' + n1(r.w) + '" height="' + n1(r.h) + '" fill="none" stroke="' + col + '" stroke-width="' + aw + '" stroke-dasharray="' + (th ? '22 12' : '14 8') + '"/>';
    const corners = (r, inward) => {
      const m = 0.06;
      const P = [[W * m, H * m, r.x, r.y], [W * (1 - m), H * m, r.x + r.w, r.y], [W * (1 - m), H * (1 - m), r.x + r.w, r.y + r.h], [W * m, H * (1 - m), r.x, r.y + r.h]];
      return P.map(([ox, oy, ix, iy]) => {
        const a = inward ? [ox, oy] : [ix, iy], b = inward ? [ix, iy] : [ox, oy];
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
        if (l < 30) return '';
        const k = (l - 10) / l;
        return arrow(a[0], a[1], a[0] + dx * k, a[1] + dy * k, col, aw);
      }).join('');
    };
    const type = mv.type || 'static';
    if (type === 'pushIn' || type === 'zoomIn' || type === 'crash') {
      const camEnd = buildCam(camAt(shot, cast0, 1, W), W, H);
      const r = endRect(cam, camEnd);
      if (r.w > 20 && r.w < W) {
        s += rectSvg(r) + corners(r, true);
        s += handText(r.x + 8, r.y - 10, type === 'pushIn' ? 'PUSH IN →' : type === 'crash' ? 'CRASH ZOOM!' : 'ZOOM IN', col, fs);
      }
    } else if (type === 'pullOut') {
      const camStart = buildCam(camAt(shot, cast0, 0, W), W, H);
      const r = endRect(cam, camStart);
      if (r.w > 20 && r.w < W) { s += rectSvg(r) + corners(r, false); s += handText(r.x + 8, r.y - 10, 'PULL BACK', col, fs); }
    } else if (type === 'dollyZoom') {
      const cx = W / 2, cy = H / 2;
      s += handText(W * 0.05, H * 0.12, 'DOLLY IN + ZOOM OUT', col, fs);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { s += arrow(cx + a * W * 0.18, cy + b * H * 0.2, cx + a * W * 0.42, cy + b * H * 0.42, col, aw); });
      s += handText(W * 0.05, H * 0.12 + fs * 1.05, '(배경이 늘어난다)', col, fs * 0.8);
    } else if (type === 'craneDown' || type === 'craneUp') {
      const x = W * 0.93;
      const down = type === 'craneDown';
      s += arrow(x, down ? H * 0.1 : H * 0.85, x, down ? H * 0.82 : H * 0.12, col, aw * 1.4, [x - W * 0.05, H * 0.47]);
      s += handText(x - 14, H * 0.5, down ? 'CRANE DOWN' : 'CRANE UP', col, fs, 'end');
    } else if (type === 'handheld') {
      let d = 'M' + n1(W * 0.04) + ' ' + n1(H * 0.1);
      for (let i = 1; i <= 7; i++) d += 'L' + n1(W * (0.04 + i * 0.025)) + ' ' + n1(H * (0.1 + (i % 2 ? -0.03 : 0.03)));
      s += '<path d="' + d + '" fill="none" stroke="#FAFAF6" stroke-width="' + (aw + 4) + '" opacity=".7"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + aw + '"/>';
      s += handText(W * 0.23, H * 0.1 + fs * 0.3, 'HANDHELD', col, fs);
    } else if (type === 'steadicam' || type === 'track') {
      const dir = mv.dir || 1;
      const y = H * 0.9;
      s += arrow(W * (dir > 0 ? 0.3 : 0.7), y, W * (dir > 0 ? 0.7 : 0.3), y, col, aw * 1.2, type === 'steadicam' ? [W * 0.5, y - H * 0.06] : null);
      s += handText(W * 0.5, y - H * 0.08, type === 'steadicam' ? 'STEADICAM FOLLOW' : 'TRACK', col, fs, 'middle');
    } else if (type === 'pan') {
      const dir = mv.dir || 1;
      s += arrow(W * (dir > 0 ? 0.3 : 0.7), H * 0.08, W * (dir > 0 ? 0.7 : 0.3), H * 0.08, col, aw * 1.2, [W * 0.5, H * 0.03]);
      s += handText(W * 0.5, H * 0.16, 'PAN', col, fs, 'middle');
    } else if (type === 'static' && !shot.fx) {
      const bx = W - (th ? 150 : 92), by = H - (th ? 72 : 46);
      s += '<rect x="' + bx + '" y="' + by + '" width="' + (th ? 128 : 76) + '" height="' + (th ? 54 : 32) + '" fill="#FAFAF6" stroke="' + col + '" stroke-width="' + (aw * 0.6) + '" rx="3" opacity=".92"/>';
      s += '<text x="' + (bx + (th ? 64 : 38)) + '" y="' + (by + (th ? 40 : 24)) + '" fill="' + col + '" font-size="' + (th ? 46 : 27) + '" text-anchor="middle" font-family="\'Nanum Pen Script\',sans-serif">FIX</text>';
    }
    // 인물 동선 (파랑)
    for (const f of cast0) {
      if (!f.move || f.hide) continue;
      const fa = castAt([f], t)[0];
      const ht = headTopOf(fa) - 0.7;
      const p0 = toCam(cam, [fa.pos[0], ht, fa.pos[2]]);
      const dir = V.norm(f.move);
      const p1 = toCam(cam, [fa.pos[0] + dir[0] * 1.2, ht + dir[1] * 1.2, fa.pos[2] + dir[2] * 1.2]);
      if (p0[2] < cam.near || p1[2] < cam.near) continue;
      const a = scr(cam, p0), b = scr(cam, p1);
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy);
      const lateral = cam.F * 1.2 / p0[2];
      if (l < lateral * 0.4) {
        // 거의 카메라 쪽으로 다가오거나 멀어짐
        const toward = p1[2] < p0[2];
        const fr = ctx.figs.find((g) => g.f.id === f.id);
        const hx = fr ? (fr.bbox[0] + fr.bbox[2]) / 2 : a[0];
        const hy = fr ? fr.bbox[1] - 12 : a[1] - 40;
        s += handText(clamp(hx, 80, W - 80), clamp(hy, 40, H - 20), toward ? '⊙ 카메라 쪽으로' : '⊗ 멀어짐', C.blue, fs * 0.9, 'middle');
        continue;
      }
      const want = th ? W * 0.2 : W * 0.14;
      dx = dx / l * want; dy = dy / l * want;
      const sx = clamp(a[0] + dx * 0.4, 30, W - 30), sy = clamp(a[1] + dy * 0.4, 30, H - 30);
      s += arrow(sx, sy, clamp(sx + dx, 20, W - 20), clamp(sy + dy, 20, H - 20), C.blue, aw * 1.15);
    }
    // 작은 인물 이름표
    for (const g of ctx.figs) {
      if (g.headPx > 22 || g.f.clip) continue;
      const nm = (CAST[g.f.who] || {}).name;
      if (!nm) continue;
      const hx = (g.bbox[0] + g.bbox[2]) / 2, hy = g.bbox[1];
      const lx = clamp(hx + W * 0.07, 40, W - 60), ly = clamp(hy - H * 0.13, 30, H - 10);
      s += '<path d="M' + n1(lx - 6) + ' ' + n1(ly + 6) + 'L' + n1(hx + 3) + ' ' + n1(hy - 3) + '" stroke="#FAFAF6" stroke-width="' + (aw + 3) + '" opacity=".7"/><path d="M' + n1(lx - 6) + ' ' + n1(ly + 6) + 'L' + n1(hx + 3) + ' ' + n1(hy - 3) + '" stroke="' + C.blue + '" stroke-width="' + (aw * 0.6) + '"/>';
      s += '<circle cx="' + n1(hx) + '" cy="' + n1((g.bbox[1] + g.bbox[3]) / 2) + '" r="' + n1(Math.max(10, (g.bbox[3] - g.bbox[1]) * 0.75)) + '" fill="none" stroke="' + C.blue + '" stroke-width="' + (aw * 0.55) + '" stroke-dasharray="5 4"/>';
      s += handText(lx, ly, nm, C.blue, fs * 0.95);
    }
    // 샷 코드
    if (shot.code && !th) {
      s += '<rect x="10" y="10" width="' + (shot.code.length * 13 + 22) + '" height="34" fill="#FAFAF6" stroke="' + C.ink + '" stroke-width="1.6" opacity=".93"/>';
      s += '<text x="21" y="35" fill="' + C.ink + '" font-size="24" font-family="\'IBM Plex Mono\',monospace" font-weight="600">' + shot.code + '</text>';
    }
    if (shot.fx === 'fade') s += handText(W * 0.72, H * 0.5, 'FADE OUT ▸', '#FAFAF6', fs * 1.1, 'middle');
    if (shot.fx === 'freeze') {
      s += handText(W * 0.06, H * 0.96, 'FREEZE → 사진이 된다', '#FFD9A8', fs);
      s += handText(W * 0.94, H * 0.94, 'SFX: 찰칵', '#FFD9A8', fs, 'end');
    }
    if (opts.stamp) s += stamp(opts.stamp, W, H, th);
    return s + '</g>';
  }
  function stamp(g, W, H) {
    const colr = { ok: '#2D8A4E', keep: '#B5791A', soso: '#6E747C', ng: '#C8372D' }[g.grade] || C.red;
    const txt = g.text;
    const w = txt.length * 30 + 50;
    return '<g transform="translate(' + n1(W - w * 0.62 - 30) + ' ' + n1(H * 0.2) + ') rotate(-9)" opacity=".9"><rect x="' + (-w / 2) + '" y="-36" width="' + w + '" height="72" fill="none" stroke="' + colr + '" stroke-width="6" rx="8"/><rect x="' + (-w / 2 + 7) + '" y="-29" width="' + (w - 14) + '" height="58" fill="none" stroke="' + colr + '" stroke-width="2" rx="5"/><text x="0" y="16" text-anchor="middle" font-size="46" fill="' + colr + '" font-family="\'Black Han Sans\',sans-serif" letter-spacing="2">' + txt + '</text></g>';
  }

  function blackPanel(shot, W, H, opts) {
    const fs = opts.thumb ? 70 : 42;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="konti-svg" role="img" aria-label="' + (shot.alt || '블랙 화면') + '"><rect width="' + W + '" height="' + H + '" fill="#111214"/>' +
      '<text x="' + W / 2 + '" y="' + (H / 2 - fs * 0.2) + '" fill="#E9E6DE" font-size="' + fs * 1.3 + '" text-anchor="middle" font-family="\'Nanum Pen Script\',sans-serif">CUT TO BLACK</text>' +
      '<text x="' + W / 2 + '" y="' + (H / 2 + fs * 1.1) + '" fill="#FFB3A8" font-size="' + fs + '" text-anchor="middle" font-family="\'Nanum Pen Script\',sans-serif">SFX: 찰칵 — (셔터음 위로 컷)</text>' +
      (shot.code && !opts.thumb ? '<text x="21" y="35" fill="#E9E6DE" font-size="24" font-family="\'IBM Plex Mono\',monospace" font-weight="600">' + shot.code + '</text>' : '') +
      (opts.stamp ? stamp(opts.stamp, W, H) : '') +
      '<rect x="1.5" y="1.5" width="' + (W - 3) + '" height="' + (H - 3) + '" fill="none" stroke="#2A2D31" stroke-width="3"/></svg>';
  }

  /* ── 평면도 (블로킹 다이어그램) ── */
  function renderPlan(shot, opts) {
    installDefs();
    opts = opts || {};
    const W = 340, H = 250;
    const cast0 = (shot.cast || []).map((f) => Object.assign({ id: f.who }, f));
    const set = K.SETS[shot.set];
    const scene = set.build(shot, 0.5);
    const c0 = camAt(shot, cast0, 0, 1000), c1 = camAt(shot, cast0, 1, 1000);
    const cK = buildCam(camAt(shot, cast0, KEY_T[(shot.move && shot.move.type) || 'static'] ?? 0.5, 1000), 1000, 540);
    const pts = [];
    cast0.filter((f) => !f.hide || f.planShow).forEach((f) => { pts.push([f.pos[0], f.pos[2]]); if (f.move) { pts.push([f.pos[0] - f.move[0] / 2, f.pos[2] - f.move[2] / 2]); pts.push([f.pos[0] + f.move[0] / 2, f.pos[2] + f.move[2] / 2]); } });
    pts.push([c0.pos[0], c0.pos[2]], [c1.pos[0], c1.pos[2]]);
    if (shot.planFocus) pts.push(...shot.planFocus);
    let minx = Math.min(...pts.map((p) => p[0])), maxx = Math.max(...pts.map((p) => p[0]));
    let minz = Math.min(...pts.map((p) => p[1])), maxz = Math.max(...pts.map((p) => p[1]));
    const span = Math.max(maxx - minx, (maxz - minz) * W / H, shot.planMin || 3.2) * 1.45;
    const cx = (minx + maxx) / 2, cz = (minz + maxz) / 2;
    const sc = W / span;
    const X = (x) => W / 2 + (x - cx) * sc;
    const Y = (z) => H / 2 - (z - cz) * sc;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="plan-svg" role="img" aria-label="평면도: 카메라와 인물의 위치">';
    s += '<rect width="' + W + '" height="' + H + '" fill="#FAFAF6"/>';
    // 모눈 (1m)
    const g0x = Math.floor((cx - span / 2)), g1x = Math.ceil(cx + span / 2);
    const vz = span * H / W;
    const g0z = Math.floor(cz - vz / 2), g1z = Math.ceil(cz + vz / 2);
    const step = span > 30 ? 5 : 1;
    s += '<g stroke="' + C.npb + '" stroke-width=".6" opacity=".55">';
    for (let x = Math.floor(g0x / step) * step; x <= g1x; x += step) s += '<path d="M' + n1(X(x)) + ' 0V' + H + '"/>';
    for (let z = Math.floor(g0z / step) * step; z <= g1z; z += step) s += '<path d="M0 ' + n1(Y(z)) + 'H' + W + '"/>';
    s += '</g>';
    // 세트 평면
    for (const r of scene.plan) {
      const fill = r.kind === 'wall' ? '#B8BDC2' : r.kind === 'train' ? '#D9D2C2' : r.kind === 'floor' ? 'none' : '#E3E5E6';
      s += '<rect x="' + n1(X(r.x0)) + '" y="' + n1(Y(r.z1)) + '" width="' + n1((r.x1 - r.x0) * sc) + '" height="' + n1((r.z1 - r.z0) * sc) + '" fill="' + fill + '" stroke="' + C.g6 + '" stroke-width="1"/>';
      if (r.label && (r.x1 - r.x0) * sc > 30) s += '<text x="' + n1(X((r.x0 + r.x1) / 2)) + '" y="' + n1(Y((r.z0 + r.z1) / 2) + 5) + '" text-anchor="middle" font-size="14" fill="' + C.g7 + '" font-family="\'Nanum Pen Script\',sans-serif">' + r.label + '</text>';
    }
    // 180도 선
    if (shot.axis) {
      const a = cast0.find((f) => f.id === shot.axis[0]), b = cast0.find((f) => f.id === shot.axis[1]);
      if (a && b) {
        const dx = b.pos[0] - a.pos[0], dz = b.pos[2] - a.pos[2], l = Math.hypot(dx, dz) || 1;
        const ex = dx / l * span, ez = dz / l * span;
        s += '<path d="M' + n1(X(a.pos[0] - ex)) + ' ' + n1(Y(a.pos[2] - ez)) + 'L' + n1(X(b.pos[0] + ex)) + ' ' + n1(Y(b.pos[2] + ez)) + '" stroke="' + C.red + '" stroke-width="1.8" stroke-dasharray="8 5"/>';
        const lx = X((a.pos[0] + b.pos[0]) / 2 + ex * 0.28), ly = Y((a.pos[2] + b.pos[2]) / 2 + ez * 0.28);
        s += '<text x="' + n1(lx) + '" y="' + n1(ly - 8) + '" font-size="22" fill="' + C.red + '" font-family="\'Nanum Pen Script\',sans-serif" text-anchor="middle" paint-order="stroke" stroke="#FAFAF6" stroke-width="4">180° 선</text>';
      }
    }
    // 카메라 이동 경로
    const moved = Math.hypot(c0.pos[0] - c1.pos[0], c0.pos[2] - c1.pos[2]);
    if (moved * sc > 10) s += '<path d="M' + n1(X(c0.pos[0])) + ' ' + n1(Y(c0.pos[2])) + 'L' + n1(X(c1.pos[0])) + ' ' + n1(Y(c1.pos[2])) + '" stroke="' + C.red + '" stroke-width="2.4" fill="none" marker-end="url(#kArrR)"/>';
    // 시야각
    const yaw = cK.yaw, fov = Math.atan(18 / cK.lens);
    const cp = [cK.pos[0], cK.pos[2]];
    const L = span * 0.7;
    const a1 = yaw - fov, a2 = yaw + fov;
    s += '<path d="M' + n1(X(cp[0])) + ' ' + n1(Y(cp[1])) + 'L' + n1(X(cp[0] + Math.sin(a1) * L)) + ' ' + n1(Y(cp[1] + Math.cos(a1) * L)) + 'L' + n1(X(cp[0] + Math.sin(a2) * L)) + ' ' + n1(Y(cp[1] + Math.cos(a2) * L)) + 'Z" fill="' + C.npb + '" opacity=".22"/>';
    s += '<path d="M' + n1(X(cp[0] + Math.sin(a1) * L)) + ' ' + n1(Y(cp[1] + Math.cos(a1) * L)) + 'L' + n1(X(cp[0])) + ' ' + n1(Y(cp[1])) + 'L' + n1(X(cp[0] + Math.sin(a2) * L)) + ' ' + n1(Y(cp[1] + Math.cos(a2) * L)) + '" fill="none" stroke="' + C.blue + '" stroke-width="1.2" stroke-dasharray="5 4"/>';
    // 인물
    for (const f of cast0) {
      if (f.hide && !f.planShow) continue;
      const fa = (f.face || 0) * D2R;
      const x = X(f.pos[0]), y = Y(f.pos[2]);
      const nx = Math.sin(fa), nz = Math.cos(fa);
      if (f.move) {
        const p0 = [f.pos[0] - f.move[0] / 2, f.pos[2] - f.move[2] / 2], p1 = [f.pos[0] + f.move[0] / 2, f.pos[2] + f.move[2] / 2];
        s += '<path d="M' + n1(X(p0[0])) + ' ' + n1(Y(p0[1])) + 'L' + n1(X(p1[0])) + ' ' + n1(Y(p1[1])) + '" stroke="' + C.blue + '" stroke-width="2.4" marker-end="url(#kArrB)"/>';
      }
      s += '<path d="M' + n1(x + nx * 15) + ' ' + n1(y - nz * 15) + 'L' + n1(x + nz * 7) + ' ' + n1(y + nx * 7) + 'L' + n1(x - nz * 7) + ' ' + n1(y - nx * 7) + 'Z" fill="' + C.ink + '"/>';
      s += '<circle cx="' + n1(x) + '" cy="' + n1(y) + '" r="10" fill="' + (f.who === 'junho' ? '#858B92' : '#FAFAF6') + '" stroke="' + C.ink + '" stroke-width="1.8"/>';
      const nm = (CAST[f.who] || {}).name || '';
      s += '<text x="' + n1(x) + '" y="' + n1(y + 28) + '" text-anchor="middle" font-size="22" fill="' + C.ink + '" font-family="\'Nanum Pen Script\',sans-serif" paint-order="stroke" stroke="#FAFAF6" stroke-width="4">' + nm + (f.hide ? '(OS)' : '') + '</text>';
    }
    // 카메라 아이콘
    const cxp = X(cp[0]), cyp = Y(cp[1]);
    const deg = Math.atan2(Math.cos(yaw), Math.sin(yaw)) / D2R;
    s += '<g transform="translate(' + n1(cxp) + ' ' + n1(cyp) + ') rotate(' + n1(-deg) + ')"><rect x="-13" y="-8" width="18" height="16" rx="2" fill="' + C.ink + '"/><path d="M5 -5L14 -9L14 9L5 5Z" fill="' + C.ink + '"/><circle cx="-8" cy="-11" r="4" fill="none" stroke="' + C.ink + '" stroke-width="1.6"/><circle cx="0" cy="-11" r="4" fill="none" stroke="' + C.ink + '" stroke-width="1.6"/></g>';
    const camH = cK.pos[1] - (shot.planGround || 0);
    s += '<text x="' + n1(cxp) + '" y="' + n1(cyp + 30) + '" text-anchor="middle" font-size="20" fill="' + C.blue + '" font-family="\'Nanum Pen Script\',sans-serif" paint-order="stroke" stroke="#FAFAF6" stroke-width="4">CAM · ' + cK.lens.toFixed(0) + 'mm · h ' + camH.toFixed(1) + 'm</text>';
    // 축척
    const one = step * sc;
    s += '<path d="M12 ' + (H - 14) + 'h' + n1(one) + '" stroke="' + C.ink + '" stroke-width="2"/><text x="' + n1(16 + one) + '" y="' + (H - 9) + '" font-size="15" fill="' + C.g7 + '" font-family="\'IBM Plex Mono\',monospace">' + step + 'm</text>';
    s += '<rect x="1" y="1" width="' + (W - 2) + '" height="' + (H - 2) + '" fill="none" stroke="' + C.ink + '" stroke-width="2"/>';
    return s + '</svg>';
  }

  /* 촬영 스펙 요약 */
  function shotSpec(shot, aspect) {
    const W = 1000;
    const cast0 = (shot.cast || []).map((f) => Object.assign({ id: f.who }, f));
    const t = KEY_T[(shot.move && shot.move.type) || 'static'] ?? 0.5;
    const cam = buildCam(camAt(shot, cast0, t, W), W, Math.round(W / (aspect || 1.85)));
    const pd = cam.pitch / D2R;
    let angle = shot.angle;
    if (!angle) angle = pd < -60 ? '버드아이 (부감)' : pd < -14 ? '하이 앵글' : pd > 14 ? '로우 앵글' : '아이 레벨';
    if (Math.abs(shot.cam.roll || 0) > 4) angle += ' · 더치';
    const lens = shot.lensLabel || (Math.round(shot.cam.lens) + 'mm');
    return {
      size: shot.size ? (shot.size + (SIZE_NAME[shot.size] ? ' · ' + SIZE_NAME[shot.size] : '')) : '',
      angle, lens,
      move: MOVE_NAME[(shot.move && shot.move.type) || 'static'] || '',
      look: (LOOKS[shot.look] || {}).label || '',
      dur: shot.dur || 3,
    };
  }

  Object.assign(K, { renderShot, renderPlan, shotSpec, camAt, buildCam, castAt, LOOKS, SIZE_NAME, MOVE_NAME, KEY_T, installDefs, headTopOf });
})(typeof window !== 'undefined' ? window : globalThis);
