// 그림 판: 장면 그림을 캔버스에 그린다.
// 좌표는 가로 100 × 세로 75 단위(4:3). 화면 크기와 상관없이 같은 자리에 같은 것이 그려진다.
// 그림(PAINTERS)은 { base(g, P), anim(g, t, P), dyn: [...] } 꼴이다.
//   base: 매개변수가 바뀔 때만 다시 그려 따로 저장해 두는 층
//   anim: 매 프레임 그 위에 그리는 움직이는 층 (dyn에 적힌 매개변수만 바뀌면 base는 그대로 둔다)

// ── 붓 ──────────────────────────────────────────────────
const U = (() => {
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = (i, s) => { const r = rng((i * 374761393 + s * 668265263) | 0); r(); return r(); };
  function noise(x, s = 1) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return hash(i, s) * (1 - u) + hash(i + 1, s) * u;
  }
  function fbm(x, s = 1, oct = 3) {
    let v = 0, a = 0.5, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { v += noise(x * f, s + o * 17) * a; n += a; a *= 0.5; f *= 2; }
    return v / n;
  }
  const hex = c => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  function mix(a, b, t) {
    const A = hex(a), B = hex(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  function rgba(c, a) { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; }
  function lin(g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    return gr;
  }
  function rad(g, x, y, r, stops) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    return gr;
  }
  function rect(g, x, y, w, h, fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); }
  function poly(g, pts, fill, stroke, lw) {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 0.2; g.stroke(); }
  }
  function line(g, x0, y0, x1, y1, stroke, lw = 0.2) {
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokeStyle = stroke; g.lineWidth = lw; g.stroke();
  }
  function ellipse(g, x, y, rx, ry, fill, rot = 0) {
    g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
  }
  function sky(g, stops) { rect(g, 0, 0, 100, 75, lin(g, 0, 0, 0, 75, stops)); }
  // 능선: y 근처에서 출렁이는 실루엣을 바닥까지 채운다
  function ridge(g, { y, amp = 4, freq = 0.05, seed = 1, fill, x0 = -1, x1 = 101, bottom = 76, oct = 3, step = 0.8 }) {
    g.beginPath();
    g.moveTo(x0, bottom);
    for (let x = x0; x <= x1 + step; x += step) g.lineTo(x, y - fbm(x * freq, seed, oct) * amp);
    g.lineTo(x1, bottom);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  }
  function glow(g, x, y, r, color, a = 0.6) {
    g.fillStyle = rad(g, x, y, r, [[0, rgba(color, a)], [1, rgba(color, 0)]]);
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function stars(g, n, seed, ymax = 40, t = 0) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r() * 100, y = r() * ymax, s = r() * 0.25 + 0.08;
      const tw = 0.55 + 0.45 * Math.sin(t * (1 + r() * 2) + i);
      g.fillStyle = `rgba(255,255,240,${0.35 + 0.5 * tw * r()})`;
      g.fillRect(x, y, s, s);
    }
  }
  function snow(g, t, n, { seed = 3, speed = 3, size = 0.35, alpha = 0.8, wind = 1 } = {}) {
    const r = rng(seed);
    g.fillStyle = `rgba(245,248,255,${alpha})`;
    for (let i = 0; i < n; i++) {
      const x0 = r() * 110, v = speed * (0.6 + r() * 0.8), s = size * (0.5 + r());
      const y = (r() * 80 + t * v) % 80 - 3;
      const x = ((x0 + t * wind * 1.2) % 110) - 5 + Math.sin(t * 0.8 + i) * 1.2;
      g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
    }
  }
  function smoke(g, x, y, t, { n = 9, rise = 2.4, spread = 3, size = 2.6, color = '#7d7a76', alpha = 0.35, seed = 5, lean = 0.5 } = {}) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const ph = (t * 0.12 + i / n + r() * 0.1) % 1;
      const yy = y - ph * rise * 10;
      const xx = x + ph * lean * 10 + Math.sin(t * 0.5 + i) * spread * ph;
      ellipse(g, xx, yy, size * (0.5 + ph * 1.6), size * (0.4 + ph * 1.2), rgba(color, alpha * (1 - ph)));
    }
  }

  // 사람: 발 위치 (x, y), 키 h. 실루엣에 가까운 단순한 형태.
  function person(g, x, y, h, o = {}) {
    const c = o.color || '#23262a';
    const top = o.shirt || c;
    const skin = o.skin || c;
    const dir = o.dir || 1;
    const s = o.stretch || 1;
    const ph = o.t || 0;
    g.save();
    g.translate(x, y);
    g.scale(dir, s);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const hip = -h * 0.47, sh = -h * 0.8, headY = -h * 0.905, hr = h * 0.075;
    const lw = h * 0.085;
    const pose = o.pose || 'stand';
    let la = 0.06, lb = -0.06;
    if (pose === 'walk' || pose === 'march') { la = Math.sin(ph) * 0.32; lb = -la; }
    if (pose === 'run') { la = Math.sin(ph) * 0.75; lb = -Math.sin(ph) * 0.75; }
    const legs = (a) => {
      const kx = Math.sin(a) * h * 0.24, ky = hip + h * 0.24;
      const fx = Math.sin(a) * h * 0.47 + (pose === 'run' && a < 0 ? -h * 0.06 : 0);
      g.beginPath(); g.moveTo(0, hip); g.quadraticCurveTo(kx * 1.1, ky, fx, pose === 'run' && a > 0.3 ? -h * 0.06 : 0);
      g.strokeStyle = o.legs || c; g.lineWidth = lw; g.stroke();
    };
    if (pose === 'sit') {
      g.beginPath(); g.moveTo(0, hip); g.lineTo(h * 0.24, hip); g.lineTo(h * 0.26, 0);
      g.strokeStyle = o.legs || c; g.lineWidth = lw; g.stroke();
    } else if (pose === 'lie') {
      // 웅크려 누운 사람
      g.restore();
      ellipse(g, x, y - h * 0.08, h * 0.42, h * 0.11, c);
      ellipse(g, x + h * 0.38 * dir, y - h * 0.12, h * 0.08, h * 0.08, skin);
      return;
    } else {
      legs(la); legs(lb);
    }
    // 긴 옷: 치마·외투·망토
    if (o.skirt || o.coat || o.cape) {
      const w = o.cape ? h * 0.3 : o.coat ? h * 0.17 : h * 0.2;
      const bot = o.cape ? -h * 0.08 : o.coat ? -h * 0.18 : -h * 0.16;
      poly(g, [[-h * 0.11, sh + h * 0.04], [h * 0.11, sh + h * 0.04], [w, bot], [-w, bot]], o.cape || o.coat || o.skirt);
    }
    // 몸통
    poly(g, [[-h * 0.115, sh], [h * 0.115, sh], [h * 0.095, hip + h * 0.02], [-h * 0.095, hip + h * 0.02]], top);
    // 팔
    const arm = (sx, ex, ey, mx, my) => {
      g.beginPath(); g.moveTo(sx, sh + h * 0.03); g.quadraticCurveTo(mx, my, ex, ey);
      g.strokeStyle = o.sleeve || top; g.lineWidth = lw * 0.78; g.stroke();
    };
    const arms = o.arms || (pose === 'run' ? 'run' : pose === 'walk' || pose === 'march' ? 'swing' : 'down');
    if (arms === 'down') { arm(h * 0.1, h * 0.12, hip + h * 0.04, h * 0.14, sh + h * 0.2); arm(-h * 0.1, -h * 0.12, hip + h * 0.04, -h * 0.14, sh + h * 0.2); }
    else if (arms === 'swing') { const a = Math.sin(ph) * h * 0.12; arm(h * 0.1, h * 0.06 + a, hip + h * 0.05, h * 0.12, sh + h * 0.2); arm(-h * 0.1, -h * 0.06 - a, hip + h * 0.05, -h * 0.12, sh + h * 0.2); }
    else if (arms === 'run') { const a = Math.sin(ph) * h * 0.2; arm(h * 0.1, h * 0.18 + a, sh + h * 0.22, h * 0.2, sh + h * 0.12); arm(-h * 0.1, -h * 0.12 - a, sh + h * 0.26, -h * 0.18, sh + h * 0.16); }
    else if (arms === 'trousers') { arm(h * 0.1, h * 0.05, hip + h * 0.02, h * 0.17, sh + h * 0.2); arm(-h * 0.1, -h * 0.04, hip + h * 0.02, -h * 0.16, sh + h * 0.2); }
    else if (arms === 'wave') { arm(h * 0.1, h * 0.2, sh - h * 0.17, h * 0.22, sh); arm(-h * 0.1, -h * 0.12, hip + h * 0.04, -h * 0.14, sh + h * 0.2); }
    else if (arms === 'up') { arm(h * 0.1, h * 0.12, sh - h * 0.2, h * 0.14, sh - h * 0.05); arm(-h * 0.1, -h * 0.12, sh - h * 0.2, -h * 0.14, sh - h * 0.05); }
    else if (arms === 'front') { arm(h * 0.1, h * 0.26, sh + h * 0.2, h * 0.16, sh + h * 0.22); arm(-h * 0.1, h * 0.2, sh + h * 0.24, 0, sh + h * 0.28); }
    else if (arms === 'hips') { arm(h * 0.1, h * 0.09, hip + h * 0.04, h * 0.2, sh + h * 0.16); arm(-h * 0.1, -h * 0.09, hip + h * 0.04, -h * 0.2, sh + h * 0.16); }
    // 총
    if (o.rifle) {
      g.beginPath();
      if (o.rifle === 'aim') { g.moveTo(-h * 0.02, sh + h * 0.04); g.lineTo(h * 0.55, sh - h * 0.02); }
      else { g.moveTo(h * 0.12, hip + h * 0.12); g.lineTo(h * 0.03, sh - h * 0.3); }
      g.strokeStyle = o.rifleColor || '#2a2018'; g.lineWidth = h * 0.035; g.stroke();
    }
    if (o.broom) {
      g.beginPath(); g.moveTo(h * 0.14, hip + h * 0.05); g.lineTo(-h * 0.05, sh - h * 0.32); g.strokeStyle = '#8a6a3c'; g.lineWidth = h * 0.03; g.stroke();
      poly(g, [[-h * 0.03, sh - h * 0.3], [-h * 0.12, sh - h * 0.42], [h * 0.02, sh - h * 0.42]], '#b89a5a');
    }
    // 머리
    ellipse(g, 0, headY, hr, hr * 1.12, skin);
    if (o.hair) ellipse(g, -hr * 0.2, headY - hr * 0.35, hr * 0.85, hr * 0.6, o.hair);
    const hat = o.hat;
    if (hat === 'cap') poly(g, [[-hr * 1.05, headY - hr * 0.35], [hr * 1.05, headY - hr * 0.35], [hr * 1.5, headY - hr * 0.1], [hr * 0.9, headY - hr * 1.05], [-hr * 0.9, headY - hr * 1.0]], o.hatColor || '#2b2a26');
    else if (hat === 'beret') ellipse(g, hr * 0.1, headY - hr * 0.7, hr * 1.25, hr * 0.5, o.hatColor || '#1d1d1f', -0.15);
    else if (hat === 'helmet') { g.beginPath(); g.arc(0, headY - hr * 0.1, hr * 1.25, Math.PI, 0); g.fillStyle = o.hatColor || '#4a4d3d'; g.fill(); }
    else if (hat === 'fez') poly(g, [[-hr * 0.75, headY - hr * 0.55], [hr * 0.75, headY - hr * 0.55], [hr * 0.6, headY - hr * 1.7], [-hr * 0.6, headY - hr * 1.7]], o.hatColor || '#b3261e');
    else if (hat === 'hat') { ellipse(g, 0, headY - hr * 0.7, hr * 1.7, hr * 0.32, o.hatColor || '#2a2a2c'); poly(g, [[-hr * 0.85, headY - hr * 0.7], [hr * 0.85, headY - hr * 0.7], [hr * 0.7, headY - hr * 1.6], [-hr * 0.7, headY - hr * 1.6]], o.hatColor || '#2a2a2c'); }
    else if (hat === 'scarf') { g.beginPath(); g.arc(0, headY, hr * 1.2, Math.PI * 1.05, Math.PI * 1.95); g.lineTo(hr * 0.9, headY + hr * 1.2); g.lineTo(-hr * 0.9, headY + hr * 1.2); g.closePath(); g.fillStyle = o.hatColor || '#2c2c30'; g.fill(); }
    else if (hat === 'hood') { g.beginPath(); g.moveTo(-hr * 1.25, headY + hr * 1.6); g.quadraticCurveTo(-hr * 1.4, headY - hr * 1.9, 0, headY - hr * 1.6); g.quadraticCurveTo(hr * 1.4, headY - hr * 1.9, hr * 1.25, headY + hr * 1.6); g.closePath(); g.fillStyle = o.hatColor || '#efe9dc'; g.fill(); ellipse(g, hr * 0.25, headY + hr * 0.1, hr * 0.6, hr * 0.75, skin); }
    else if (hat === 'teja') ellipse(g, 0, headY - hr * 0.7, hr * 2.1, hr * 0.42, o.hatColor || '#151515');
    else if (hat === 'peaked') { poly(g, [[-hr * 1.0, headY - hr * 0.4], [hr * 1.0, headY - hr * 0.4], [hr * 1.2, headY - hr * 1.2], [-hr * 1.2, headY - hr * 1.2]], o.hatColor || '#3c4230'); poly(g, [[hr * 0.4, headY - hr * 0.42], [hr * 1.6, headY - hr * 0.3], [hr * 1.0, headY - hr * 0.55]], '#111'); }
    if (o.glasses) { g.strokeStyle = o.glasses; g.lineWidth = hr * 0.14; g.beginPath(); g.arc(hr * 0.42, headY, hr * 0.3, 0, Math.PI * 2); g.stroke(); }
    if (o.beard) { g.beginPath(); g.moveTo(-hr * 0.2, headY + hr * 0.3); g.quadraticCurveTo(hr * 0.5, headY + hr * 1.6, hr * 0.95, headY + hr * 0.25); g.closePath(); g.fillStyle = o.beard; g.fill(); }
    g.restore();
  }

  // 깃발: 왼쪽 위 모서리 (x, y), 가로 w, 세로 h. 바람에 펄럭인다.
  const FLAGS = {
    red: [['#bf2a21', 1]],
    rep: [['#c0221c', 1], ['#f0b818', 1], ['#6b2c7d', 1]],
    nat: [['#c0221c', 1], ['#f0b818', 2], ['#c0221c', 1]],
    cat: [['#f2c318', 1], ['#c42a1d', 1], ['#f2c318', 1], ['#c42a1d', 1], ['#f2c318', 1], ['#c42a1d', 1], ['#f2c318', 1], ['#c42a1d', 1], ['#f2c318', 1]],
  };
  function flag(g, x, y, w, h, kind, t = 0, o = {}) {
    const N = 10, amp = (o.amp == null ? 0.09 : o.amp) * h, hang = o.hang;
    const fade = o.fade || 0;
    const tint = c => (fade ? mix(c, '#b9ad9a', fade) : c);
    const off = (i) => Math.sin(t * 2.2 + i * 0.8 + (o.phase || 0)) * amp * (i / N);
    for (let i = 0; i < N; i++) {
      const xa = x + (w * i) / N, xb = x + (w * (i + 1)) / N + 0.05;
      const da = off(i), db = off(i + 1);
      if (kind === 'cnt' || kind === 'falange') {
        if (kind === 'cnt') {
          // 깃대 쪽 위가 붉고, 대각선 아래가 검다
          const ya = y + h * (i / N), yb = y + h * ((i + 1) / N);
          poly(g, [[xa, y + da], [xb, y + db], [xb, yb + db], [xa, ya + da]], tint('#b8231b'));
          poly(g, [[xa, ya + da], [xb, yb + db], [xb, y + h + db], [xa, y + h + da]], tint('#161616'));
        } else {
          const third = i < N / 3 || i >= (2 * N) / 3 ? '#b8231b' : '#161616';
          poly(g, [[xa, y + da], [xb, y + db], [xb, y + h + db], [xa, y + h + da]], tint(third));
        }
        continue;
      }
      const bands = FLAGS[kind] || FLAGS.red;
      const tot = bands.reduce((a, b) => a + b[1], 0);
      let acc = 0;
      for (const [col, part] of bands) {
        const y0 = y + (h * acc) / tot, y1 = y + (h * (acc + part)) / tot;
        poly(g, [[xa, y0 + da], [xb, y0 + db], [xb, y1 + db], [xa, y1 + da]], tint(col));
        acc += part;
      }
    }
    if (o.torn) {
      g.fillStyle = o.torn;
      for (let i = 0; i < 4; i++) poly(g, [[x + w - 0.1, y + (h * i) / 4 + off(N)], [x + w - w * 0.12, y + (h * (i + 0.5)) / 4 + off(N)], [x + w - 0.1, y + (h * (i + 1)) / 4 + off(N)]], o.torn);
    }
    if (hang !== false && !o.banner) line(g, x, y - 0.4, x, y + h + (o.pole || h * 0.6), '#2c2a28', 0.25);
  }

  function windows(g, x, y, w, h, cols, rows, o = {}) {
    const ww = (w / cols) * (o.ww || 0.42), wh = (h / rows) * (o.wh || 0.55);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const cx = x + (w * (i + 0.5)) / cols, cy = y + (h * (j + 0.42)) / rows;
      rect(g, cx - ww / 2, cy - wh / 2, ww, wh, (o.lit && o.lit(i, j)) || o.color || '#2d2620');
      if (o.balcony) { rect(g, cx - ww * 0.75, cy + wh / 2, ww * 1.5, wh * 0.08, o.balcony); for (let k = 0; k <= 4; k++) rect(g, cx - ww * 0.72 + (ww * 1.44 * k) / 4, cy + wh * 0.28, wh * 0.02 + 0.06, wh * 0.24, o.balcony); rect(g, cx - ww * 0.75, cy + wh * 0.26, ww * 1.5, 0.12, o.balcony); }
      if (o.shutter) { rect(g, cx - ww / 2 - ww * 0.32, cy - wh / 2, ww * 0.3, wh, o.shutter); rect(g, cx + ww / 2 + 0.02, cy - wh / 2, ww * 0.3, wh, o.shutter); }
    }
  }

  // 원근 벽: 가까운 모서리(xn, 위 tn, 아래 bn)에서 먼 모서리(xf, tf, bf)로 줄어드는 사각형, 창 격자 포함
  function wall(g, n, f, o = {}) {
    poly(g, [[n.x, n.t], [f.x, f.t], [f.x, f.b], [n.x, n.b]], o.fill);
    if (!o.cols) return;
    const P = (u, v) => {
      const k = Math.pow(u, o.persp || 1.7);
      const x = n.x + (f.x - n.x) * k;
      const t = n.t + (f.t - n.t) * k, b = n.b + (f.b - n.b) * k;
      return [x, t + (b - t) * v];
    };
    for (let i = 0; i < o.cols; i++) for (let j = 0; j < o.rows; j++) {
      if (o.skip && o.skip(i, j)) continue;
      const u0 = (i + 0.28) / o.cols, u1 = (i + 0.72) / o.cols;
      const v0 = (j + 0.2) / o.rows, v1 = (j + 0.72) / o.rows;
      const q = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
      poly(g, q, (o.lit && o.lit(i, j)) || o.win || '#2b2420');
      if (o.balcony) { const a = P(u0 - 0.04 / o.cols, v1), b = P(u1 + 0.04 / o.cols, v1), c2 = P(u1 + 0.04 / o.cols, v1 + 0.12 / o.rows), d = P(u0 - 0.04 / o.cols, v1 + 0.12 / o.rows); poly(g, [a, b, c2, d], o.balcony); }
    }
  }

  function vignette(g, a = 0.45, color = '#000') {
    g.fillStyle = rad(g, 50, 40, 70, [[0.55, rgba(color, 0)], [1, rgba(color, a)]]);
    g.fillRect(0, 0, 100, 75);
  }

  // 엘 그레코의 하늘: 굽이치는 흰 구름 덩어리
  function grecoClouds(g, { seed = 7, y0 = 4, y1 = 30, n = 26, light = '#e9efe4', dark = '#20383a', t = 0, a = 1 } = {}) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const cx = r() * 120 - 10 + Math.sin(t * 0.05 + i) * 0.8, cy = y0 + r() * (y1 - y0);
      const rx = 6 + r() * 14, ry = 1.5 + r() * 3.5, rot = (r() - 0.5) * 0.7;
      g.save();
      g.globalAlpha = a * (0.25 + r() * 0.45);
      ellipse(g, cx + 0.8, cy + 1.2, rx, ry, dark, rot);
      g.fillStyle = rad(g, cx - rx * 0.2, cy - ry * 0.3, rx, [[0, light], [0.6, rgba(light, 0.6)], [1, rgba(light, 0)]]);
      g.beginPath(); g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }

  function text(g, s, x, y, size, { color = '#222', weight = 700, family = 'Georgia, serif', align = 'left', alpha = 1, rot = 0 } = {}) {
    g.save();
    g.globalAlpha = alpha;
    g.translate(x, y);
    if (rot) g.rotate(rot);
    g.font = `${weight} ${size}px ${family}`;
    g.textAlign = align;
    g.textBaseline = 'alphabetic';
    g.fillStyle = color;
    g.fillText(s, 0, 0);
    g.restore();
  }

  return { rng, noise, fbm, mix, rgba, lin, rad, rect, poly, line, ellipse, sky, ridge, glow, stars, snow, smoke, person, flag, windows, wall, vignette, grecoClouds, text };
})();

// ── 그림 판 ─────────────────────────────────────────────
const Plates = (() => {
  let frame = null, cv = null, g = null, spotsEl = null;
  let cur = { id: null, params: {} };
  let base = null, baseKey = '';
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0, running = false;
  let grainPat = null;
  const t0 = performance.now();
  let ro = null;

  function mount(el) {
    frame = el;
    cv = el.querySelector('canvas');
    g = cv.getContext('2d');
    spotsEl = el.querySelector('.spots');
    if (ro) ro.disconnect();
    ro = new ResizeObserver(() => resize());
    ro.observe(frame);
    resize();
    start();
  }
  function resize() {
    if (!frame) return;
    const r = frame.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    baseKey = '';
    draw(performance.now());
  }
  function makeGrain() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const im = x.createImageData(128, 128);
    const r = U.rng(42);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = Math.floor(r() * 255);
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return c;
  }
  const painter = () => PAINTERS[cur.id] || PAINTERS.blank;
  function keyOf() {
    const p = painter();
    const dyn = new Set(p.dyn || []);
    return cur.id + '|' + W + 'x' + H + '|' + Object.entries(cur.params).filter(([k]) => !dyn.has(k)).map(([k, v]) => k + ':' + (typeof v === 'number' ? v.toFixed(3) : v)).join(',');
  }
  function renderBase() {
    base = base || document.createElement('canvas');
    base.width = cv.width; base.height = cv.height;
    const b = base.getContext('2d');
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, base.width, base.height);
    const s = (W * dpr) / 100;
    b.setTransform(s, 0, 0, s, 0, 0);
    try { painter().base(b, cur.params); } catch (e) { console.error(e); }
    // 종이 결
    b.setTransform(1, 0, 0, 1, 0, 0);
    grainPat = grainPat || makeGrain();
    b.globalAlpha = 0.07;
    b.globalCompositeOperation = 'overlay';
    b.fillStyle = b.createPattern(grainPat, 'repeat');
    b.fillRect(0, 0, base.width, base.height);
    b.globalAlpha = 1;
    b.globalCompositeOperation = 'source-over';
    baseKey = keyOf();
  }
  function draw(now) {
    if (!g || !cur.id) return;
    if (keyOf() !== baseKey) renderBase();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(base, 0, 0);
    const p = painter();
    if (p.anim) {
      const s = (W * dpr) / 100;
      g.setTransform(s, 0, 0, s, 0, 0);
      const t = reduceMotion() ? 0 : (now - t0) / 1000;
      try { p.anim(g, t, cur.params); } catch (e) { console.error(e); }
    }
  }
  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    if (now - last < 33) return; // 30fps면 충분하다
    last = now;
    draw(now);
  }
  function start() {
    if (running) return;
    running = true;
    if (reduceMotion()) { running = false; draw(performance.now()); return; }
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    if (ro) { ro.disconnect(); ro = null; }
    frame = null; g = null;
  }
  function show(id, params = {}) {
    cur = { id, params: { ...params } };
    setSpots([]);
    if (frame) frame.querySelector('#imagine').hidden = true;
    draw(performance.now());
  }
  function set(p) {
    Object.assign(cur.params, p);
    draw(performance.now());
  }

  let onPick = null;
  function setSpots(spots, pick) {
    if (!spotsEl) return;
    spotsEl.innerHTML = '';
    onPick = pick || null;
    for (const sp of spots) {
      const b = document.createElement('button');
      b.className = 'spot';
      b.dataset.id = sp.id;
      b.style.left = sp.x + '%';
      b.style.top = (sp.y / 75) * 100 + '%';
      b.setAttribute('aria-label', sp.label);
      b.innerHTML = `<span class="tip">${esc(sp.label)}</span>`;
      b.onclick = () => onPick && onPick(sp);
      spotsEl.append(b);
    }
  }
  function markSpot(id) {
    const b = spotsEl && spotsEl.querySelector(`.spot[data-id="${id}"]`);
    if (b) b.classList.add('seen');
  }
  function flash() {
    const f = frame && frame.querySelector('.flash');
    if (!f) return;
    f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  }
  function shake() {
    if (!frame) return;
    frame.classList.remove('shake'); void frame.offsetWidth; frame.classList.add('shake');
  }
  function imagine(on) {
    const el = frame && frame.querySelector('#imagine');
    if (el) el.hidden = !on;
  }
  return { mount, show, set, setSpots, markSpot, flash, shake, imagine, stop, get el() { return frame; }, get params() { return cur.params; } };
})();
