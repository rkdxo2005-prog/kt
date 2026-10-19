// 시기별 전선이 역사적 점령 상황과 맞는지 도시 단위로 검사한다.
//   node tools/check-fronts.mjs
// 지도와 같은 메르카토르 좌표에서 점-다각형 판정을 한다(화면에 그려지는 모양 그대로).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {};
vm.createContext(ctx);
for (const f of ['js/geo.js', 'js/places.js', 'js/fronts.js'])
  vm.runInContext(readFileSync(join(root, f), 'utf8') + '\n;globalThis.GEO = typeof GEO !== "undefined" ? GEO : globalThis.GEO;' +
    'globalThis.PLACES = typeof PLACES !== "undefined" ? PLACES : globalThis.PLACES;' +
    'globalThis.PHASES = typeof PHASES !== "undefined" ? PHASES : globalThis.PHASES;', ctx);
const { GEO, PLACES, PHASES } = ctx;

const RAD = Math.PI / 180;
const yTop = Math.log(Math.tan(Math.PI / 4 + GEO.view.lat1 * RAD / 2));
const project = ([lon, lat]) => [(lon - GEO.view.lon0) * RAD * GEO.view.k, (yTop - Math.log(Math.tan(Math.PI / 4 + lat * RAD / 2))) * GEO.view.k];
function inside([x, y], poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function sideAt(phase, key) {
  const p = project(PLACES[key].slice(1, 3));
  const rep = (phase.rep || []).some(r => inside(p, r.map(project)));
  const nat = (phase.nat || []).some(r => inside(p, r.map(project)));
  return rep && !nat ? 'rep' : 'nat';
}

// 각 시기에 반드시 맞아야 하는 도시들(점령 날짜 기준)
const EXPECT = {
  p1: {
    nat: 'pamplona burgos valladolid salamanca zaragoza huesca teruel caceres sevilla cadiz cordoba granada oviedo palma ibiza vitoria leon coruna segovia avila jaca jerez quinto belchite fuentes lecinena navalmoral',
    rep: 'madrid barcelona valencia bilbao sansebastian santander gijon malaga almeria murcia badajoz merida toledo ciudadreal jaen huelva albacete cuenca guadalajara siguenza lleida tarragona girona alicante castellon mahon barbastro alcaniz caspe ronda talavera irun cartagena donbenito alcubierre pina osera sietamo montalban alfambra estepona aviles',
  },
  p1b: {
    nat: 'badajoz merida huelva trujillo navalmoral loja sevilla cordoba granada oviedo caceres antequera',
    rep: 'ibiza talavera toledo ronda irun sansebastian donbenito malaga madrid jaen guadalajara siguenza estepona marbella',
  },
  p1c: {
    nat: 'talavera toledo irun sansebastian siguenza ronda ibiza grado estepona badajoz atienza',
    rep: 'madrid getafe navalcarnero eibar elgeta bilbao gijon aviles mieres malaga marbella aranjuez guadalajara jaen donbenito andujar alcala brihuega',
  },
  p2: {
    nat: 'getafe navalcarnero brunete boadilla estepona toledo villanueva arrasate',
    rep: 'madrid majadahonda lasrozas aranjuez alcala paracuellos guadalajara malaga marbella motril almeria eibar elgeta otxandio amurrio',
  },
  p3: {
    nat: 'malaga motril marbella majadahonda lasrozas ciempozuelos sanmartin porcuna lopera siguenza antequera',
    rep: 'madrid arganda morata aranjuez brihuega trijueque bilbao guernica durango eibar santander gijon almeria pozoblanco andujar jaen guadalajara alcala',
  },
  p3b: { nat: 'bilbao guernica durango eibar amurrio villanueva', rep: 'santander castro reinosa gijon aviles santona' },
  p3c: { nat: 'santander reinosa castro santona brunete', rep: 'gijon aviles llanes mieres villanueva' },
  p4: {
    nat: 'gijon aviles llanes mieres teruel fuentes zaragoza huesca brunete',
    rep: 'belchite quinto villanueva alcaniz caspe lleida barbastro montalban alfambra madrid',
  },
  p5: {
    nat: 'belchite caspe alcaniz lleida barbastro fraga gandesa vinaros morella tremp balaguer mequinenza benicarlo teruel alfambra montalban jaca',
    rep: 'barcelona tarragona reus girona flix mora tortosa manresa castellon valencia sagunto ademuz cuenca madrid bielsa donbenito castuera',
  },
  p6: {
    nat: 'castellon vilareal bielsa donbenito castuera sarrion lleida gandesa',
    rep: 'sagunto valencia viver ademuz madrid cuenca ciudadreal almaden pozoblanco barcelona tarragona flix mora tortosa',
  },
  p6b: { nat: 'barcelona tarragona lleida reus manresa sabadell', rep: 'girona figueres vic mahon valencia madrid' },
  p7: {
    nat: 'girona figueres mahon barcelona',
    rep: 'madrid valencia alicante murcia cartagena almeria jaen ciudadreal cuenca guadalajara albacete sagunto elda',
  },
};

// ── 면적 비율: 화면과 같은 다각형으로 주사선 채우기를 해서 공화파 영토 비율을 잰다.
// 메르카토르는 위도마다 축척이 달라서 픽셀 면적에 (R·cosφ/k)²를 곱해 실제 면적(km²)으로 바꾼다.
function pathRings(d) {
  const rings = []; let cur = null, x = 0, y = 0, cmd = '';
  const tok = d.match(/[Mlz]|-?\d*\.?\d+/g);
  for (let i = 0; i < tok.length;) {
    const t = tok[i];
    if (t === 'M' || t === 'l' || t === 'z') { cmd = t; i++; if (t === 'z') { cur = null; } continue; }
    const a = +tok[i], b = +tok[i + 1]; i += 2;
    if (cmd === 'M') { x = a; y = b; cur = [[x, y]]; rings.push(cur); cmd = 'l'; }
    else { x += a; y += b; cur.push([x, y]); }
  }
  return rings;
}
function spans(rings, y) {
  const xs = [];
  for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [x1, y1] = r[j], [x2, y2] = r[i];
    if ((y1 > y) !== (y2 > y)) xs.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
  }
  xs.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}
const len = s => s.reduce((t, [a, b]) => t + b - a, 0);
function intersect(A, B) {
  const out = [];
  for (const [a1, a2] of A) for (const [b1, b2] of B) { const l = Math.max(a1, b1), r = Math.min(a2, b2); if (r > l) out.push([l, r]); }
  return out;
}
const landRings = pathRings(GEO.land);
const R = 6371, CANARIAS_KM2 = 7447;
const latAt = y => (2 * Math.atan(Math.exp(yTop - y / GEO.view.k)) - Math.PI / 2) / RAD;
function measure(phase) {
  const rep = (phase.rep || []).map(r => r.map(project)), nat = (phase.nat || []).map(r => r.map(project));
  let land = 0, repA = 0;
  for (let y = 0.25; y < GEO.view.h; y += 0.5) {
    const w = (R * Math.cos(latAt(y) * RAD) / GEO.view.k) ** 2 * 0.5;
    const L = spans(landRings, y);
    land += len(L) * w;
    const inRep = intersect(L, spans(rep, y));
    repA += (len(inRep) - len(intersect(inRep, spans(nat, y)))) * w;
  }
  return { land, rep: repA };
}
const shares = {};
for (const ph of PHASES) {
  if (ph.neutral || ph.morocco) continue;
  const m = measure(ph);
  shares[ph.id] = Math.round(m.rep / (m.land + CANARIAS_KM2) * 100);
  if (ph.id === 'p1') console.log(`본토·섬 면적 ${Math.round(m.land).toLocaleString()} km² (실제 약 498,500 km²)`);
}
console.log('공화파 영토 비율(%):', JSON.stringify(shares));
for (const ph of PHASES) if (ph.id in shares && ph.share !== undefined && Math.abs(ph.share - shares[ph.id]) > 1)
  console.log(`✗ ${ph.id}: fronts.js의 share ${ph.share}% ≠ 측정 ${shares[ph.id]}%`), process.exitCode = 1;

let fails = 0, checks = 0;
for (const [id, exp] of Object.entries(EXPECT)) {
  const phase = PHASES.find(p => p.id === id);
  for (const side of ['rep', 'nat']) for (const key of exp[side].split(/\s+/)) {
    if (!PLACES[key]) { console.log(`? ${id}: 지명 없음 ${key}`); fails++; continue; }
    checks++;
    const got = sideAt(phase, key);
    if (got !== side) { fails++; console.log(`✗ ${id} ${PLACES[key][0]}(${key}): 기대 ${side}, 실제 ${got}`); }
  }
}
console.log(fails ? `${fails}건 불일치 / ${checks}건 검사` : `모두 일치 (${checks}건)`);
process.exit(fails || process.exitCode ? 1 : 0);
