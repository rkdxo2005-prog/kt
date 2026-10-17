// TopoJSON 원본(스페인 주 경계 es-atlas + Natural Earth 주변국)을 지도용 SVG 경로로 바꾼다.
//   npm pack es-atlas@0.6.0 world-atlas@2.0.2   (데이터만 받는다. 설치 스크립트는 돌리지 않는다)
//   node tools/build-geo.mjs <es-atlas>/es/provinces.json <world-atlas>/countries-10m.json
//   → js/geo.js
//
// 투영은 메르카토르. 같은 상수(GEO.view)를 js/map.js가 그대로 써서
// 전선·도시·화살표의 경위도를 같은 좌표계로 옮긴다.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [esPath, worldPath] = process.argv.slice(2);
if (!esPath || !worldPath) {
  console.error('사용법: node tools/build-geo.mjs <es-atlas provinces.json> <world-atlas countries-10m.json>');
  process.exit(1);
}

// ── 투영 ───────────────────────────────────────────────
const VIEW = { w: 1000, lon0: -9.9, lon1: 4.6, lat0: 34.85, lat1: 44.0 };
const RAD = Math.PI / 180;
const k = VIEW.w / ((VIEW.lon1 - VIEW.lon0) * RAD);
const merc = lat => Math.log(Math.tan(Math.PI / 4 + lat * RAD / 2));
const yTop = merc(VIEW.lat1);
const H = Math.round(k * (yTop - merc(VIEW.lat0)));
const project = ([lon, lat]) => [(lon - VIEW.lon0) * RAD * k, (yTop - merc(lat)) * k];

// ── TopoJSON 해독 ──────────────────────────────────────
function decodeArcs(topo) {
  const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
  return topo.arcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; });
  });
}
const polygonsOf = g => g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
function stitch(ringArcs, arcs) {
  const out = [];
  ringArcs.forEach((i, n) => {
    const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
    (n ? a.slice(1) : a).forEach(p => out.push(p));
  });
  return out;
}

// ── 단순화(더글러스-포커) ─────────────────────────────
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let best = -1, bestD = tol;
    for (let i = a + 1; i < b; i++) {
      // 닫힌 고리(시작점 = 끝점)는 선분이 없으므로 시작점과의 거리로 잰다.
      const d = len < 1e-9
        ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay)
        : Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > bestD) { bestD = d; best = i; }
    }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// ── 사각형 자르기(서덜랜드-호지먼) ──────────────────────
function clipRing(ring, [x0, y0, x1, y1]) {
  const edges = [
    [p => p[0] >= x0, (p, q) => [x0, p[1] + (q[1] - p[1]) * (x0 - p[0]) / (q[0] - p[0])]],
    [p => p[0] <= x1, (p, q) => [x1, p[1] + (q[1] - p[1]) * (x1 - p[0]) / (q[0] - p[0])]],
    [p => p[1] >= y0, (p, q) => [p[0] + (q[0] - p[0]) * (y0 - p[1]) / (q[1] - p[1]), y0]],
    [p => p[1] <= y1, (p, q) => [p[0] + (q[0] - p[0]) * (y1 - p[1]) / (q[1] - p[1]), y1]],
  ];
  let out = ring;
  for (const [inside, cut] of edges) {
    const src = out; out = [];
    for (let i = 0; i < src.length; i++) {
      const p = src[i], q = src[(i + 1) % src.length];
      if (inside(p)) { out.push(p); if (!inside(q)) out.push(cut(p, q)); }
      else if (inside(q)) out.push(cut(p, q));
    }
    if (!out.length) break;
  }
  return out;
}

const area = r => r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;

// SVG 경로를 0.1px 정밀도의 상대 좌표(l)로 적는다. 반올림 오차가 쌓이지 않게
// 반올림한 절대 좌표끼리의 차이를 쓴다.
const num = n => n === 0 ? '0' : String(n).replace(/^(-?)0\./, '$1.');
function pathD(pts, close) {
  let s = '', px = 0, py = 0, started = false;
  for (const [fx, fy] of pts) {
    const x = Math.round(fx * 10), y = Math.round(fy * 10);
    if (!s) s = 'M' + num(x / 10) + ' ' + num(y / 10);
    else {
      const dx = num((x - px) / 10), dy = num((y - py) / 10);
      if (dx === '0' && dy === '0') continue;
      s += (started ? (dx[0] === '-' ? '' : ' ') : 'l') + dx + (dy[0] === '-' ? '' : ' ') + dy;
      started = true;
    }
    px = x; py = y;
  }
  return s + (close ? 'z' : '');
}
const ringD = r => pathD(r, true);
const lineD = r => pathD(r, false);

// ── 스페인(es-atlas): 주마다 경로 + 내부 경계선 ─────────
const es = JSON.parse(readFileSync(esPath, 'utf8'));
const esArcs = decodeArcs(es);
const CANARIES = new Set(['35', '38']);
const GIBRALTAR = '54';
const provGeoms = es.objects.provinces.geometries;

// 호(arc)를 투영 공간에서 먼저 단순화해야 인접한 주의 경계가 어긋나지 않는다.
const projArcs = esArcs.map(a => simplify(a.map(project), 0.25));
const owners = new Map(); // 호 번호 → 이 호를 쓰는 본토 주 id
for (const g of provGeoms) {
  if (CANARIES.has(g.id)) continue;
  for (const poly of polygonsOf(g)) for (const ring of poly) for (const i of ring) {
    const idx = i < 0 ? ~i : i;
    if (!owners.has(idx)) owners.set(idx, new Set());
    owners.get(idx).add(g.id);
  }
}
// 두 주가 함께 쓰는 호 = 주 경계선. 지도에선 옅은 안내선이라 조금 더 단순화한다.
const inner = [];
for (const [idx, ids] of owners)
  if ([...ids].filter(id => id !== GIBRALTAR).length > 1) inner.push(lineD(simplify(projArcs[idx], 0.6)));

// 국토 전체(본토·발레아르·세우타·멜리야) = es-atlas border 객체에서 카나리아를 뺀 것.
// 전선 레이어의 clipPath로도 쓴다. 지브롤터는 위에 영국령으로 덧칠한다.
const land = [];
for (const poly of polygonsOf(es.objects.border.geometries[0])) {
  const outerRing = stitch(poly[0], esArcs);
  if (outerRing[0][1] < 30) continue; // 카나리아
  land.push(poly.map(ring => ringD(stitch(ring, projArcs))).join(''));
}
const gib = provGeoms.find(g => g.id === GIBRALTAR);
const gibraltarD = polygonsOf(gib).map(poly => poly.map(ring => ringD(stitch(ring, projArcs))).join('')).join('');

// 카나리아 제도: 같은 축척의 절반으로 왼쪽 아래 대서양에 삽입도로 넣는다.
const canRings = [];
for (const g of provGeoms) if (CANARIES.has(g.id))
  for (const poly of polygonsOf(g)) canRings.push(simplify(stitch(poly[0], esArcs).map(project), 0.25));
const cb = canRings.flat().reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);
const INSET = { s: 0.5, x: 14, y: H - 112 };
const canD = canRings.map(r => ringD(r.map(([x, y]) => [INSET.x + 10 + (x - cb[0]) * INSET.s, INSET.y + 22 + (y - cb[1]) * INSET.s]))).join('');
const lasPalmas = project([-15.43, 28.12]);
const canaries = {
  d: canD,
  box: [INSET.x, INSET.y, Math.round((cb[2] - cb[0]) * INSET.s) + 20, Math.round((cb[3] - cb[1]) * INSET.s) + 32],
  lasPalmas: [INSET.x + 10 + (lasPalmas[0] - cb[0]) * INSET.s, INSET.y + 22 + (lasPalmas[1] - cb[1]) * INSET.s].map(v => Math.round(v * 10) / 10),
};

// ── 주변국(Natural Earth 10m) ─────────────────────────
const world = JSON.parse(readFileSync(worldPath, 'utf8'));
const wArcs = decodeArcs(world);
const NEIGHBORS = { '620': 'pt', '250': 'fr', '020': 'ad', '504': 'ma', '012': 'dz' };
const bbox = [VIEW.lon0 - 0.6, VIEW.lat0 - 0.6, VIEW.lon1 + 0.6, VIEW.lat1 + 0.6];
const neighbors = [];
for (const g of world.objects.countries.geometries) {
  const key = NEIGHBORS[g.id];
  if (!key) continue;
  const rings = [];
  for (const poly of polygonsOf(g)) for (const ring of poly) {
    const clipped = clipRing(stitch(ring, wArcs), bbox);
    if (clipped.length < 3) continue;
    const r = simplify(clipped.map(project), 0.35);
    if (r.length >= 3 && Math.abs(area(r)) > 0.5) rings.push(ringD(r));
  }
  if (rings.length) neighbors.push({ id: key, d: rings.join('') });
}
neighbors.push({ id: 'gi', d: gibraltarD });

const geo = {
  view: { w: VIEW.w, h: H, lon0: VIEW.lon0, lat1: VIEW.lat1, k: Math.round(k * 1000) / 1000 },
  land: land.join(''), inner: inner.join(''), neighbors, canaries,
};
const out = join(root, 'js', 'geo.js');
writeFileSync(out,
  '// 자동 생성 파일: node tools/build-geo.mjs (손으로 고치지 않는다)\n' +
  '// 출처: 스페인 국립지리원(IGN) 경계 via es-atlas 0.6.0 (CC BY 4.0), Natural Earth via world-atlas 2.0.2 (퍼블릭 도메인)\n' +
  'const GEO = ' + JSON.stringify(geo) + ';\n');
console.log('geo → ' + out + ' (' + (readFileSync(out).length / 1024).toFixed(0) + ' KB, ' + VIEW.w + '×' + H + ')');
