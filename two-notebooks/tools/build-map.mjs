// Natural Earth(world-atlas) TopoJSON을 작은 SVG 경로로 바꾼다.
//   npm pack world-atlas@2.0.2      (데이터만 받는다. 설치 스크립트는 돌리지 않는다)
//   node tools/build-map.mjs <world-atlas 폴더>
//   → js/mapdata.js
//
// 투영은 정거원통(경도에 중위도 코사인을 곱한다). 같은 상수(view)를 js/maps.js가 그대로 써서
// 도시와 경로의 경위도를 같은 좌표계로 옮긴다.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2];
if (!dir) {
  console.error('사용법: node tools/build-map.mjs <world-atlas 폴더>');
  process.exit(1);
}
const read = f => JSON.parse(readFileSync(join(dir, f), 'utf8'));

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
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let best = -1, bestD = tol;
    for (let i = a + 1; i < b; i++) {
      // 닫힌 고리는 시작점 = 끝점이라 선분이 없다. 시작점과의 거리로 잰다.
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
      const pin = inside(p), qin = inside(q);
      if (pin) out.push(p);
      if (pin !== qin) out.push(cut(p, q));
    }
    if (!out.length) break;
  }
  return out;
}

function makeView(v) {
  const RAD = Math.PI / 180;
  const c = Math.cos(((v.lat0 + v.lat1) / 2) * RAD);
  const k = v.w / ((v.lon1 - v.lon0) * c);
  const h = Math.round((v.lat1 - v.lat0) * k);
  return { ...v, h, k, c, project: ([lon, lat]) => [(lon - v.lon0) * c * k, (v.lat1 - lat) * k] };
}

function pathOf(geoms, arcs, view, tol, minArea) {
  const box = [-2, -2, view.w + 2, view.h + 2];
  const parts = [];
  for (const g of geoms) {
    for (const poly of polygonsOf(g)) {
      poly.forEach(ringArcs => {
        let ring = stitch(ringArcs, arcs).map(view.project);
        ring = clipRing(ring, box);
        if (ring.length < 3) return;
        ring.push(ring[0]);
        ring = simplify(ring, tol);
        if (ring.length < 4) return;
        let area = 0;
        for (let i = 0; i < ring.length - 1; i++) area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
        if (Math.abs(area / 2) < minArea) return;
        parts.push('M' + ring.slice(0, -1).map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join('L') + 'Z');
      });
    }
  }
  return parts.join('');
}

const c50 = read('countries-50m.json');
const l50 = read('land-50m.json');
const l110 = read('land-110m.json');
const a50 = decodeArcs(c50), la50 = decodeArcs(l50), la110 = decodeArcs(l110);
const byName = n => c50.objects.countries.geometries.filter(g => g.properties.name === n);

// 이베리아: 두 사람의 동선 지도와 장면 표지판의 작은 지도
const ib = makeView({ w: 600, lon0: -10.2, lon1: 4.6, lat0: 35.6, lat1: 44.2 });
// 유럽: "누가 싸우는가" — 마드리드로 모여드는 나라들
const eu = makeView({ w: 600, lon0: -12, lon1: 42, lat0: 27, lat1: 61 });

const strip = v => ({ w: v.w, h: v.h, lon0: v.lon0, lon1: v.lon1, lat0: v.lat0, lat1: v.lat1 });
const data = {
  iberia: {
    ...strip(ib),
    land: pathOf(l50.objects.land.geometries, la50, ib, 0.7, 6),
    spain: pathOf(byName('Spain'), a50, ib, 0.6, 6),
    portugal: pathOf(byName('Portugal'), a50, ib, 0.6, 6),
  },
  europe: {
    ...strip(eu),
    land: pathOf(l110.objects.land.geometries, la110, eu, 0.8, 10),
    spain: pathOf(byName('Spain'), a50, eu, 0.8, 4),
  },
};

const out = join(root, 'js', 'mapdata.js');
writeFileSync(out,
  '// (생성됨) tools/build-map.mjs — Natural Earth(world-atlas 2.0.2) 단순화 경로\n' +
  'const MAPDATA = ' + JSON.stringify(data) + ';\n');
console.log('mapdata → ' + out + ' (' + (readFileSync(out).length / 1024).toFixed(1) + ' KB)');
