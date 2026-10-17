// 지도 엔진: 기본 도형(GEO) 위에 시기별 전선(PHASES)과 사건 표지·화살표를 SVG로 그린다.
// 좌표는 build-geo.mjs와 같은 메르카토르 투영. 글자와 표지는 화면 픽셀 기준 크기를 유지한다.
const SVGNS = 'http://www.w3.org/2000/svg';
const RAD = Math.PI / 180;
const VIEW = GEO.view;
const Y_TOP = Math.log(Math.tan(Math.PI / 4 + VIEW.lat1 * RAD / 2));

function project([lon, lat]) {
  return [(lon - VIEW.lon0) * RAD * VIEW.k, (Y_TOP - Math.log(Math.tan(Math.PI / 4 + lat * RAD / 2))) * VIEW.k];
}
const isOffmap = p => typeof p === 'string' && p[0] !== '@' && PLACES[p] && PLACES[p][3] === 0;
function placeXY(p) {
  if (p === '@canarias') return GEO.canaries.lasPalmas;
  if (typeof p === 'string') return project(PLACES[p].slice(1, 3));
  return project(p);
}
const ringD = r => 'M' + r.map(p => project(p).map(v => v.toFixed(1)).join(' ')).join('L') + 'Z';

function svgEl(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function smoothD(pts) {
  const f = p => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
  if (pts.length === 2) {
    const [a, b] = pts, dx = b[0] - a[0], dy = b[1] - a[1];
    return `M${f(a)}Q${f([(a[0] + b[0]) / 2 - dy * .14, (a[1] + b[1]) / 2 + dx * .14])} ${f(b)}`;
  }
  let d = 'M' + f(pts[0]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += 'C' + f([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' +
      f([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + f(p2);
  }
  return d;
}
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let mapCount = 0;

// 바다·나라 이름(지도 단위가 아닌 화면 px 크기로 그린다)
const STATIC_LABELS = [
  ['대서양', [-9.3, 40.6], 'sea', 13], ['비스케이만', [-4.3, 44.2], 'sea', 13], ['지중해', [2.6, 37.8], 'sea', 14],
  ['포르투갈', [-8.15, 40.1], 'country', 12], ['프랑스', [0.6, 43.65], 'country', 12], ['안도라', [1.55, 42.68], 'country', 10],
  ['스페인령 모로코', [-4.3, 35.05], 'country', 11], ['프랑스령 모로코', [-6.6, 34.95], 'country', 10], ['알제리(프랑스령)', [1.6, 35.55], 'country', 11],
  ['마요르카', [2.95, 39.35], 'country', 10], ['메노르카', [4.0, 40.13], 'country', 10],
];

class AtlasMap {
  constructor(svg, { mini = false, onPick = null } = {}) {
    this.svg = svg; this.mini = mini; this.onPick = onPick;
    this.uid = 'am' + (++mapCount);
    this.view = { x: 0, y: 0, w: VIEW.w, h: VIEW.h };
    this.phaseId = null; this.ev = null; this.route = null; this.pastEvents = [];
    this.build();
    this.ro = new ResizeObserver(() => this.drawOverlay(false));
    this.ro.observe(svg);
  }

  // 화면 1px이 지도 몇 단위인가
  u(px) {
    const w = this.svg.getBoundingClientRect().width || 600;
    return px * this.view.w / w;
  }

  build() {
    const s = this.svg, id = this.uid;
    s.setAttribute('viewBox', `0 0 ${VIEW.w} ${VIEW.h}`);
    const defs = svgEl('defs', {}, s);
    svgEl('path', { d: GEO.land }, svgEl('clipPath', { id: id + '-es' }, defs));
    svgEl('path', { d: GEO.neighbors.find(n => n.id === 'ma').d }, svgEl('clipPath', { id: id + '-ma' }, defs));
    const hatch = (hid, cls, angle) => {
      const p = svgEl('pattern', { id: hid, patternUnits: 'userSpaceOnUse', width: 5, height: 5, patternTransform: `rotate(${angle})` }, defs);
      svgEl('rect', { width: 5, height: 5, class: cls + '-bg' }, p);
      svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 5, class: cls }, p);
      return p;
    };
    this.patLost = hatch(id + '-lost', 'h-lost', 45);
    this.patGain = hatch(id + '-gain', 'h-gain', -45);

    svgEl('rect', { x: -200, y: -200, width: VIEW.w + 400, height: VIEW.h + 400, class: 'm-sea' }, s);
    const out = svgEl('g', {}, s);
    for (const n of GEO.neighbors) svgEl('path', { d: n.d, class: 'm-out' }, out);
    this.prot = svgEl('path', { d: ringD(PROTECTORATE), class: 'm-prot', 'clip-path': `url(#${id}-ma)` }, s);
    svgEl('path', { d: ringD(TANGIER), class: 'm-out', 'clip-path': `url(#${id}-ma)` }, s);
    this.land = svgEl('path', { d: GEO.land, class: 'm-land neutral' }, s);
    const zones = svgEl('g', { 'clip-path': `url(#${id}-es)` }, s);
    this.gLost = svgEl('g', {}, zones);
    this.gRep = svgEl('g', {}, zones);
    this.gOld = svgEl('g', {}, zones);
    this.gPocket = svgEl('g', {}, zones);
    this.gArea = svgEl('g', {}, zones);
    this.gFront = svgEl('g', {}, zones);
    svgEl('path', { d: GEO.inner, class: 'm-inner' }, s);
    svgEl('path', { d: GEO.land, class: 'm-coast' }, s);
    svgEl('path', { d: GEO.neighbors.find(n => n.id === 'gi').d, class: 'm-out' }, s);
    // 카나리아 제도 삽입도
    const c = GEO.canaries;
    this.gInset = svgEl('g', {}, s);
    svgEl('rect', { x: c.box[0], y: c.box[1], width: c.box[2], height: c.box[3], class: 'm-inset-box' }, this.gInset);
    this.inset = svgEl('path', { d: c.d, class: 'm-land neutral' }, this.gInset);
    this.gStatic = svgEl('g', { 'aria-hidden': 'true' }, s);
    this.gOver = svgEl('g', {}, s);
    this.svg.addEventListener('pointerdown', e => this.panStart(e));
  }

  // ── 전선 시기 ─────────────────────────────────────────
  setPhase(id) {
    if (id === this.phaseId) return;
    const prevId = this.phaseId;
    this.phaseId = id;
    const idx = PHASES.findIndex(p => p.id === id), ph = PHASES[idx];
    const neutral = !!(ph.neutral || ph.morocco || this.mini);
    this.land.setAttribute('class', 'm-land' + (neutral ? ' neutral' : ''));
    this.inset.setAttribute('class', 'm-land' + (neutral ? ' neutral' : ''));
    this.prot.style.opacity = (ph.neutral || this.mini) ? 0 : 1;
    // 직전 시기의 공화파 지역 = 이번 시기에 잃은 땅(빗금)
    let prev = null;
    for (let i = idx - 1; i >= 0; i--) if (!PHASES[i].neutral && !PHASES[i].morocco) { prev = PHASES[i]; break; }
    this.gLost.replaceChildren();
    if (prev && !ph.neutral && !this.mini) for (const r of prev.rep || []) svgEl('path', { d: ringD(r), fill: `url(#${this.uid}-lost)` }, this.gLost);
    // 바뀌기 전 모습을 위에 두고 서서히 지운다
    this.gOld.replaceChildren();
    if (prevId && !reduceMotion()) {
      for (const n of this.gRep.children) { const k = n.cloneNode(); k.setAttribute('class', 'm-old fade'); this.gOld.appendChild(k); }
      clearTimeout(this.fadeT);
      this.fadeT = setTimeout(() => this.gOld.replaceChildren(), 800);
    }
    this.gRep.replaceChildren(); this.gFront.replaceChildren(); this.gPocket.replaceChildren();
    if (neutral) return;
    for (const r of ph.rep || []) {
      const d = ringD(r);
      svgEl('path', { d, class: 'm-rep' }, this.gRep);
      svgEl('path', { d, class: 'm-front' }, this.gFront);
    }
    for (const r of ph.nat || []) {
      const d = ringD(r);
      svgEl('path', { d, class: 'm-pocket' }, this.gPocket);
      svgEl('path', { d, class: 'm-front' }, this.gFront);
    }
  }

  // ── 사건 ──────────────────────────────────────────────
  setEvent(ev, past = [], { animate = true } = {}) {
    this.ev = ev; this.pastEvents = past;
    this.setPhase(ev.phase);
    this.gArea.replaceChildren();
    for (const a of ev.areas || []) svgEl('path', { d: ringD(a.poly), class: 'm-gain', fill: `url(#${this.uid}-gain)` }, this.gArea);
    const [cx, cy, z] = this.eventView(ev);
    this.flyTo(cx, cy, z, animate);
  }

  eventView(ev) {
    if (!ev.zoom) return [VIEW.w / 2, VIEW.h / 2, 1];
    const [c, z] = ev.zoom;
    const [x, y] = placeXY(c);
    return [x, y, z];
  }

  showRoute(artist) {
    this.route = artist; this.ev = null;
    this.setPhase('p0');
    const pts = artist.route.filter(s => !isOffmap(s[0])).map(s => placeXY(s[0]));
    let cx = VIEW.w / 2, cy = VIEW.h / 2, z = 1;
    if (pts.length) {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      cx = (minX + maxX) / 2; cy = (minY + maxY) / 2;
      z = Math.max(1, Math.min(3.2, VIEW.w / ((maxX - minX) * 1.9 + 160), VIEW.h / ((maxY - minY) * 1.9 + 140)));
    }
    this.flyTo(cx, cy, z, true);
  }

  // ── 시점 이동 ─────────────────────────────────────────
  clampView(cx, cy, z) {
    const w = VIEW.w / z, h = VIEW.h / z;
    return { x: Math.max(0, Math.min(VIEW.w - w, cx - w / 2)), y: Math.max(0, Math.min(VIEW.h - h, cy - h / 2)), w, h };
  }
  applyView() {
    const v = this.view;
    this.svg.setAttribute('viewBox', `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}`);
    this.svg.classList.toggle('zoomed', v.w < VIEW.w - 1);
  }
  flyTo(cx, cy, z, animate) {
    const to = this.clampView(cx, cy, z), from = { ...this.view };
    cancelAnimationFrame(this.raf);
    const same = Math.abs(to.x - from.x) + Math.abs(to.y - from.y) + Math.abs(to.w - from.w) < 1;
    if (!animate || reduceMotion() || same) {
      this.view = to; this.applyView(); this.drawOverlay(true); return;
    }
    this.gOver.style.opacity = 0;
    const t0 = performance.now(), dur = 750;
    const step = now => {
      const t = Math.min(1, (now - t0) / dur), k = ease(t);
      this.view = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, w: from.w + (to.w - from.w) * k, h: from.h + (to.h - from.h) * k };
      this.applyView();
      if (t < 1) this.raf = requestAnimationFrame(step);
      else { this.drawOverlay(true); this.gOver.style.opacity = 1; }
    };
    this.raf = requestAnimationFrame(step);
  }
  zoomBy(f) {
    const v = this.view, z = Math.max(1, Math.min(6, VIEW.w / v.w * f));
    this.flyTo(v.x + v.w / 2, v.y + v.h / 2, z, true);
  }
  resetView() {
    if (this.ev) { const [cx, cy, z] = this.eventView(this.ev); this.flyTo(cx, cy, z, true); }
    else if (this.route) this.showRoute(this.route);
    else this.flyTo(VIEW.w / 2, VIEW.h / 2, 1, true);
  }
  panStart(e) {
    if (this.view.w >= VIEW.w - 1 || e.button > 0) return;
    if (e.target.closest && e.target.closest('.m-hit')) return;
    const sx = e.clientX, sy = e.clientY, v0 = { ...this.view }, scale = this.view.w / (this.svg.getBoundingClientRect().width || 1);
    let moved = false;
    const move = m => {
      const dx = (m.clientX - sx) * scale, dy = (m.clientY - sy) * scale;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      this.view = this.clampView(v0.x + v0.w / 2 - dx, v0.y + v0.h / 2 - dy, VIEW.w / v0.w);
      this.applyView();
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      if (moved) this.drawOverlay(false);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  }

  // ── 덧그림: 표지, 화살표, 지명, 지도 밖 방향 ─────────────
  drawOverlay(animate) {
    const g = this.gOver; g.replaceChildren();
    this.drawStatic();
    this.taken = [];
    if (this.route) { this.drawRoute(g); return; }
    const ev = this.ev;
    if (!ev) return;
    // 지나간 사건 표지
    const gPast = svgEl('g', {}, g);
    for (const p of this.pastEvents) {
      if (!p.at || isOffmap(p.at) || p === ev) continue;
      const [x, y] = placeXY(p.at);
      const cls = 'm-past' + (p.tags && p.tags.includes('within') ? ' within' : '') + (p.lane === 'art' ? ' art' : '');
      svgEl('circle', { cx: x, cy: y, r: this.u(3.4), class: cls }, gPast);
      const hit = svgEl('circle', { cx: x, cy: y, r: this.u(9), class: 'm-hit' }, gPast);
      hit.addEventListener('pointerenter', () => this.tip(p, x, y));
      hit.addEventListener('pointerleave', () => this.tip(null));
      hit.addEventListener('click', () => this.onPick && this.onPick(p));
    }
    const gA = svgEl('g', {}, g);
    for (const a of ev.arrows || []) this.drawArrow(gA, a, animate);
    // 결과가 갈린 여러 지점(쿠데타 등)
    const gL = svgEl('g', {}, g);
    const labelled = new Map();
    for (const l of ev.locs || []) {
      if (isOffmap(l.p)) continue;
      const [x, y] = placeXY(l.p);
      // 반란 성공 = 네모, 공화국 유지 = 동그라미(색과 함께 모양으로도 구분)
      const r = this.u(6.5);
      if (l.side === 'nat') svgEl('rect', { x: x - r * .9, y: y - r * .9, width: r * 1.8, height: r * 1.8, class: 'm-loc nat', 'stroke-width': 2 }, gL);
      else svgEl('circle', { cx: x, cy: y, r, class: 'm-loc rep', 'stroke-width': 2 }, gL);
      labelled.set(l.p, l.note);
    }
    // 현재 사건 표지
    if (ev.at && !isOffmap(ev.at) && !(ev.locs || []).some(l => l.p === ev.at)) {
      const [x, y] = placeXY(ev.at);
      if (!reduceMotion()) svgEl('circle', { cx: x, cy: y, r: this.u(9), class: 'm-ring', 'stroke-width': 2 }, gL);
      svgEl('circle', { cx: x, cy: y, r: this.u(7.5), class: 'm-cur', 'stroke-width': 2, fill: `var(--${ev.lane})` }, gL);
    }
    // 지명: 사건과 관련된 곳 먼저, 그다음 주요 도시
    const refs = new Set();
    const add = p => { if (typeof p === 'string' && p[0] !== '@' && !isOffmap(p)) refs.add(p); };
    add(ev.at); (ev.locs || []).forEach(l => add(l.p));
    for (const a of ev.arrows || []) { add(a.from); add(a.to); (a.via || []).forEach(add); }
    const gN = svgEl('g', {}, g);
    const marked = new Set([ev.at, ...(ev.locs || []).map(l => l.p)]);
    for (const k of refs) this.placeLabel(gN, k, labelled.get(k), true, !marked.has(k));
    for (const k in PLACES) if (PLACES[k][3] === 1 && !refs.has(k)) this.placeLabel(gN, k, null, false, true);
    // 지도 밖
    const offs = new Set(ev.off || []);
    if (isOffmap(ev.at)) offs.add(ev.at);
    for (const a of ev.arrows || []) if (isOffmap(a.to)) offs.add(a.to);
    this.drawPointers(g, [...offs]);
    if ((ev.arrows || []).some(a => a.from === '@canarias')) this.labelInset(gN);
  }

  drawStatic() {
    const g = this.gStatic; g.replaceChildren();
    const v = this.view;
    for (const [t, p, cls, size] of STATIC_LABELS) {
      if (this.mini && cls === 'sea' && size < 14) continue;
      const [x, y] = project(p);
      if (x < v.x || x > v.x + v.w || y < v.y || y > v.y + v.h) continue;
      const e = svgEl('text', { x, y, class: 'm-text ' + cls, 'font-size': this.u(size), 'text-anchor': 'middle', 'stroke-width': this.u(3) }, g);
      e.textContent = t;
    }
    const c = GEO.canaries;
    const e = svgEl('text', { x: c.box[0] + this.u(5), y: c.box[1] + this.u(13), class: 'm-text country', 'font-size': this.u(10.5), 'stroke-width': this.u(2.5) }, g);
    e.textContent = '카나리아 제도';
  }

  labelInset(g) {
    const [x, y] = GEO.canaries.lasPalmas;
    svgEl('circle', { cx: x, cy: y, r: this.u(4), class: 'm-cur', fill: 'var(--art)', 'stroke-width': 1.5 }, g);
  }

  // 겹치지 않는 자리를 골라 지명을 단다
  placeLabel(g, key, note, strong, dot) {
    const pl = PLACES[key]; if (!pl) return;
    const [x, y] = project(pl.slice(1, 3)), v = this.view;
    if (x < v.x || x > v.x + v.w || y < v.y || y > v.y + v.h) return;
    const fs = this.u(strong ? 13.5 : 12), text = note ? `${pl[0]} · ${note}` : pl[0];
    const w = text.length * fs * .92, h = fs * 1.15, gap = this.u(7);
    const tries = [[x + gap, y + fs * .35, 'start'], [x - gap, y + fs * .35, 'end'], [x, y - gap, 'middle'], [x, y + gap + fs * .8, 'middle']];
    const box = ([tx, ty, an]) => { const x0 = an === 'start' ? tx : an === 'end' ? tx - w : tx - w / 2; return [x0, ty - h * .82, x0 + w, ty + h * .2]; };
    const free = b => b[0] >= v.x && b[2] <= v.x + v.w && b[1] >= v.y && b[3] <= v.y + v.h && !this.taken.some(t => b[0] < t[2] && b[2] > t[0] && b[1] < t[3] && b[3] > t[1]);
    let spot = tries.find(t => free(box(t)));
    // 자리가 없으면 사건의 중심지만 겹치더라도 쓰고, 나머지는 뺀다
    if (!spot) { if (!strong || (this.ev && key !== this.ev.at)) return; spot = tries[0]; }
    this.taken.push(box(spot));
    if (dot) svgEl('circle', { cx: x, cy: y, r: this.u(strong ? 3.6 : 2.8), class: 'm-city', 'stroke-width': 1.2 }, g);
    const t = svgEl('text', { x: spot[0], y: spot[1], 'text-anchor': spot[2], class: 'm-text', 'font-size': fs, 'font-weight': strong ? 700 : 500, 'stroke-width': this.u(3.2) }, g);
    t.textContent = text;
  }

  drawArrow(g, a, animate) {
    const pts = [a.from, ...(a.via || []), a.to].map(p => isOffmap(p) ? null : placeXY(p));
    let target = pts[pts.length - 1];
    if (!target) {
      // 지도 밖 목적지: 화면 가장자리에서 멈춘다
      const from = pts[pts.length - 2], far = project(PLACES[a.to].slice(1, 3));
      target = this.edgePoint(from, far, this.u(60));
      pts[pts.length - 1] = target;
    }
    const d = smoothD(pts.filter(Boolean));
    const path = svgEl('path', { d, class: 'm-arrow ' + a.kind + (a.style ? ' ' + a.style : '') }, g);
    const len = path.getTotalLength();
    if (animate && !reduceMotion() && (a.kind === 'nat' || a.kind === 'rep')) {
      path.style.setProperty('--len', len);
      path.style.strokeDasharray = len;
      path.classList.add('draw');
    }
    if (a.kind !== 'line' && a.kind !== 'hold') {
      const end = path.getPointAtLength(len), back = path.getPointAtLength(Math.max(0, len - this.u(6)));
      const ang = Math.atan2(end.y - back.y, end.x - back.x), L = this.u(a.kind === 'nat' || a.kind === 'rep' ? 15 : 12), W = L * .62;
      const p1 = [end.x + Math.cos(ang) * L * .25, end.y + Math.sin(ang) * L * .25];
      const p2 = [end.x - Math.cos(ang) * L + Math.cos(ang + Math.PI / 2) * W, end.y - Math.sin(ang) * L + Math.sin(ang + Math.PI / 2) * W];
      const p3 = [end.x - Math.cos(ang) * L - Math.cos(ang + Math.PI / 2) * W, end.y - Math.sin(ang) * L - Math.sin(ang + Math.PI / 2) * W];
      const head = svgEl('path', { d: `M${p1}L${p2}L${p3}Z`, class: 'm-head ' + a.kind }, g);
      if (animate && !reduceMotion() && (a.kind === 'nat' || a.kind === 'rep')) head.style.animation = 'zonein .3s 1s both';
    } else if (a.kind === 'hold') {
      const end = path.getPointAtLength(len), s = this.u(6);
      svgEl('path', { d: `M${end.x - s} ${end.y - s}L${end.x + s} ${end.y + s}M${end.x + s} ${end.y - s}L${end.x - s} ${end.y + s}`, class: 'm-arrow hold', 'stroke-width': 2 }, g);
    }
    if (a.label) {
      const mid = path.getPointAtLength(len * (a.kind === 'line' ? .5 : .45)), m2 = path.getPointAtLength(Math.min(len, len * .45 + 1));
      let nx = -(m2.y - mid.y), ny = m2.x - mid.x; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      if (ny > 0) { nx = -nx; ny = -ny; }
      const off = this.u(11), fs = this.u(12.5);
      const lx = mid.x + nx * off, ly = mid.y + ny * off;
      const t = svgEl('text', { x: lx, y: ly, class: 'm-alabel ' + a.kind, 'font-size': fs, 'text-anchor': 'middle', 'stroke-width': this.u(3.4) }, g);
      t.textContent = a.label;
      this.taken.push([lx - a.label.length * fs * .46, ly - fs, lx + a.label.length * fs * .46, ly + fs * .25]);
    }
  }

  // from에서 far 쪽으로 가다가 보이는 영역(여백 m) 경계와 만나는 점
  edgePoint(from, far, m) {
    const v = this.view, x0 = v.x + m, y0 = v.y + m, x1 = v.x + v.w - m, y1 = v.y + v.h - m;
    const dx = far[0] - from[0], dy = far[1] - from[1];
    let t = Infinity;
    if (dx > 0) t = Math.min(t, (x1 - from[0]) / dx); if (dx < 0) t = Math.min(t, (x0 - from[0]) / dx);
    if (dy > 0) t = Math.min(t, (y1 - from[1]) / dy); if (dy < 0) t = Math.min(t, (y0 - from[1]) / dy);
    if (!isFinite(t) || t < 0) t = 0;
    return [from[0] + dx * t, from[1] + dy * t];
  }

  drawPointers(g, keys) {
    const v = this.view, center = [v.x + v.w / 2, v.y + v.h / 2], used = [];
    for (const k of keys) {
      const far = project(PLACES[k].slice(1, 3));
      let [x, y] = this.edgePoint(center, far, this.u(26));
      const ang = Math.atan2(far[1] - center[1], far[0] - center[0]);
      const fs = this.u(13), label = PLACES[k][0], w = label.length * fs * .95 + this.u(30), h = fs * 1.9;
      let bx = Math.max(v.x + this.u(6), Math.min(v.x + v.w - w - this.u(6), x - w / 2)), by = Math.max(v.y + this.u(6), Math.min(v.y + v.h - h - this.u(6), y - h / 2));
      while (used.some(u => Math.abs(u[1] - by) < h && Math.abs(u[0] - bx) < w)) by += h * 1.15;
      used.push([bx, by]);
      const pg = svgEl('g', { class: 'm-ptr' }, g);
      svgEl('rect', { x: bx, y: by, width: w, height: h, rx: this.u(2) }, pg);
      const ax = bx + this.u(13), ay = by + h / 2, s = this.u(5.5);
      svgEl('path', { d: `M${ax + Math.cos(ang) * s} ${ay + Math.sin(ang) * s}L${ax + Math.cos(ang + 2.5) * s} ${ay + Math.sin(ang + 2.5) * s}L${ax + Math.cos(ang - 2.5) * s} ${ay + Math.sin(ang - 2.5) * s}Z`, style: 'fill: var(--paper)' }, pg);
      const t = svgEl('text', { x: bx + this.u(24), y: by + h / 2 + fs * .36, 'font-size': fs }, pg);
      t.textContent = label;
      this.taken.push([bx, by, bx + w, by + h]);
    }
  }

  drawRoute(g) {
    const a = this.route, onmap = a.route.filter(s => !isOffmap(s[0]));
    const pts = onmap.map(s => placeXY(s[0]));
    if (pts.length > 1) svgEl('path', { d: smoothD(pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1])), class: 'm-route' }, g);
    const seen = new Map();
    a.route.forEach((s, i) => {
      if (isOffmap(s[0])) return;
      const [x, y] = placeXY(s[0]), k = s[0];
      const n = (seen.get(k) || 0); seen.set(k, n + 1);
      const ox = n * this.u(15);
      svgEl('circle', { cx: x + ox, cy: y, r: this.u(8), class: 'm-stop', 'stroke-width': 1.4 }, g);
      const t = svgEl('text', { x: x + ox, y: y + this.u(3.8), class: 'm-stop-n', 'font-size': this.u(11) }, g);
      t.textContent = i + 1;
    });
    const gN = svgEl('g', {}, g);
    for (const k of new Set(onmap.map(s => s[0]))) this.placeLabel(gN, k, null, true, false);
    this.drawPointers(g, [...new Set(a.route.filter(s => isOffmap(s[0])).map(s => s[0]))]);
  }

  tip(ev, x, y) {
    const box = this.svg.parentElement.querySelector('.map-tip');
    if (!box) return;
    if (!ev) { box.hidden = true; return; }
    const r = this.svg.getBoundingClientRect(), wrap = this.svg.parentElement.getBoundingClientRect();
    box.innerHTML = '';
    const small = document.createElement('small'); small.textContent = fmtWhen(ev);
    box.append(small, document.createTextNode(ev.title));
    box.style.left = (r.left - wrap.left + (x - this.view.x) / this.view.w * r.width) + 'px';
    box.style.top = (r.top - wrap.top + (y - this.view.y) / this.view.h * r.height) + 'px';
    box.hidden = false;
  }
}
