// 화면 조립: 타임라인 지도와 전보 패널, 시간 띠, 사상 지도, 내전 속의 내전, 국제전, 인물, 예술가, 결산.
const LANES = { war: '전투', pol: '정치·내분', intl: '국제', art: '예술·문화' };
const SIDE_NAME = { rep: '공화파', nat: '국민파', mid: '불간섭·중립' };
EVENTS.sort((a, b) => a.date.localeCompare(b.date));
const EVENT_BY = Object.fromEntries(EVENTS.map(e => [e.id, e]));
const PERSON_BY = Object.fromEntries(PEOPLE.map(p => [p.id, p]));
const ARTIST_BY = Object.fromEntries(ARTISTS.map(a => [a.id, a]));
const PHASE_BY = Object.fromEntries(PHASES.map(p => [p.id, p]));
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const initial = name => name.replace(/^[A-Z.\s]+(?=[가-힣])/, '').trim()[0];

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}.${m}.${d}`;
}
function fmtWhen(ev) {
  if (ev.when) return ev.when;
  if (!ev.end) return fmtDate(ev.date);
  const [y1, m1] = ev.date.split('-').map(Number), [y2, m2, d2] = ev.end.split('-').map(Number);
  const tail = y1 !== y2 ? `${y2}.${m2}.${d2}` : m1 !== m2 ? `${m2}.${d2}` : `${d2}`;
  return `${fmtDate(ev.date)}–${tail}`;
}
function dateline(ev) {
  const p = ev.at && PLACES[ev.at];
  return `${p ? esc(p[4].toUpperCase()) + ' · ' : ''}<b>${esc(fmtWhen(ev))}</b>`;
}

const state = { i: EVENTS.findIndex(e => e.id === 'coup'), lanes: new Set(Object.keys(LANES)), playing: false, timer: null };
let atlas, artistMap;

// ── 전보 패널 ────────────────────────────────────────────
function factionChip(id, pos) {
  const f = FACTIONS[id];
  if (f) return `<button class="chip ${f.side}" data-faction="${id}" title="${esc(f.name)} · 사상 지도에서 보기">${esc(f.short)}</button>`;
  return `<span class="chip foreign static ${pos}">${esc(id)}</span>`;
}
function personChip(id) {
  const p = PERSON_BY[id];
  return p ? `<button class="chip ${p.side === 'intl' ? '' : p.side}" data-person="${id}">${esc(p.name.replace(/ ".*"$/, ''))}</button>` : '';
}

function renderDispatch() {
  const ev = EVENTS[state.i], box = $('#dispatch-body');
  const tags = [`<span class="tag ${ev.lane}"><i></i>${LANES[ev.lane]}</span>`];
  if ((ev.tags || []).includes('within')) tags.push('<span class="tag within">내전 속의 내전</span>');
  if ((ev.tags || []).includes('atrocity')) tags.push('<span class="tag atrocity">학살·민간인 피해</span>');
  let h = `<div class="dl type">${dateline(ev)}</div><div class="tags">${tags.join('')}</div><h2 class="ev-title" id="ev-title">${esc(ev.title)}</h2>`;
  const [a = [], b = []] = ev.vs || [];
  if (a.length || b.length) {
    const within = (ev.tags || []).includes('within') && ev.vsLabels;
    const capA = within ? ev.vsLabels[0] : '공화파 쪽', capB = within ? ev.vsLabels[1] : '국민파 쪽';
    h += `<div class="vs"><div class="vs-side rep"><span class="vs-cap">${esc(capA)}</span>${a.map(x => factionChip(x, 'rep')).join('') || '<span class="chip static">—</span>'}</div>` +
      `<span class="vs-x">대</span><div class="vs-side nat"><span class="vs-cap">${esc(capB)}</span>${b.map(x => factionChip(x, 'nat')).join('') || '<span class="chip static">—</span>'}</div></div>`;
  }
  const sec = (t, x) => x ? `<section class="ev-sec"><h3>${t}</h3><p>${esc(x)}</p></section>` : '';
  h += sec('무엇을 두고, 왜 여기서', ev.why) + sec('결과', ev.result) + sec('의미와 파장', ev.meaning);
  if (ev.stats) h += `<div class="stats">${ev.stats.map(([v, l]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>`;
  if (ev.quote) h += `<blockquote class="quote"><p>${esc(ev.quote[0])}</p><cite>${esc(ev.quote[1])}</cite></blockquote>`;
  if (ev.irony) h += `<p class="irony"><b>아이러니</b>${esc(ev.irony)}</p>`;
  if (ev.people && ev.people.length) h += `<div class="who"><h3>이 사건의 인물</h3>${ev.people.map(personChip).join('')}</div>`;
  if (ev.artists && ev.artists.length) {
    h += `<div class="art-call"><h3>${ev.lane === 'art' ? '이 장면의 예술가' : '예술가의 시선'}</h3>`;
    for (const id of ev.artists) {
      const ar = ARTIST_BY[id];
      const note = (ev.notes && ev.notes[id]) || (ev.lane === 'art' ? ar.works.map(w => `『${w[0]}』(${w[1]})`).slice(0, 3).join(', ') : ar.spark.split('. ')[0] + '.');
      h += `<div class="art-item"><span class="avatar art">${esc(initial(ar.name))}</span><div><p><b>${esc(ar.name)}</b> ${esc(note)}</p><button class="link-btn" data-artist="${id}">작가 카드와 발자취 보기</button></div></div>`;
    }
    h += '</div>';
  }
  box.innerHTML = h;
  box.parentElement.scrollTop = 0;
  const visible = visibleIdx();
  $('#ev-count').textContent = `${visible.indexOf(state.i) + 1} / ${visible.length}`;
  $('#ev-prev').disabled = !visible.some(i => i < state.i);
  $('#ev-next').disabled = !visible.some(i => i > state.i);
}

function renderStamp() {
  const ev = EVENTS[state.i], ph = PHASE_BY[ev.phase];
  $('#stamp-label').textContent = ph.neutral ? (ph.id === 'p0' ? '내전 이전' : '내전 이후') : '전선 상황';
  $('#stamp-phase').textContent = ph.label;
  const g = $('#gauge');
  if (ph.share === undefined) { g.hidden = true; return; }
  g.hidden = false;
  $('#gauge-rep').style.width = ph.share + '%';
  $('#gauge-r').textContent = `공화파 ${ph.share}%`;
  $('#gauge-n').textContent = `국민파 ${100 - ph.share}%`;
}

function visibleIdx() { return EVENTS.map((e, i) => state.lanes.has(e.lane) ? i : -1).filter(i => i >= 0); }

function go(i, { animate = true, scroll = false } = {}) {
  state.i = Math.max(0, Math.min(EVENTS.length - 1, i));
  const ev = EVENTS[state.i];
  const past = EVENTS.slice(0, state.i).filter(e => state.lanes.has(e.lane) && e.date >= '1936-07-17');
  atlas.setEvent(ev, ev.date >= '1936-07-17' && ev.date < '1975' ? past : [], { animate });
  renderDispatch(); renderStamp(); drawScrub();
  if (scroll) $('#atlas').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
function step(dir) {
  const v = visibleIdx();
  const next = dir > 0 ? v.find(i => i > state.i) : [...v].reverse().find(i => i < state.i);
  if (next !== undefined) go(next);
  return next !== undefined;
}
function goToEvent(id) { stopPlay(); const i = EVENTS.findIndex(e => e.id === id); if (i >= 0) { closeDrawer(); go(i, { scroll: true }); } }

function setPlay(on) {
  state.playing = on;
  const b = $('#ev-play');
  b.setAttribute('aria-pressed', on);
  b.innerHTML = on ? '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 2h3v10H3zM8 2h3v10H8z" fill="currentColor"/></svg>일시정지' : '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" fill="currentColor"/></svg>자동 재생';
  clearTimeout(state.timer);
  if (on) {
    const tick = () => { if (!step(1)) { setPlay(false); return; } state.timer = setTimeout(tick, 6500); };
    state.timer = setTimeout(tick, 1200);
  }
}
const stopPlay = () => state.playing && setPlay(false);

// ── 시간 띠 ─────────────────────────────────────────────
const SEGS = [['1931-03-01', '1936-07-10', .09], ['1936-07-10', '1939-04-15', .75], ['1939-04-15', '2023-06-01', .16]];
const dnum = iso => Date.parse(iso + 'T00:00:00Z');
function timeX(iso, x0, w) {
  const t = dnum(iso);
  let acc = 0;
  for (let k = 0; k < SEGS.length; k++) {
    const [a, b, f] = SEGS[k], ta = dnum(a), tb = dnum(b);
    if (t <= tb || k === SEGS.length - 1) return x0 + (acc + Math.max(0, Math.min(1, (t - ta) / (tb - ta))) * f) * w;
    acc += f;
  }
  return x0 + w;
}
function drawScrub() {
  const wrap = $('#scrub-track'), W = Math.max(760, wrap.clientWidth), L = 92, R = 14, w = W - L - R;
  const laneY = { war: 84, pol: 108, intl: 132, art: 156 }, H = 172;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-label="사건 시간 띠">`;
  // 압축 구간 배경
  const xa = timeX('1936-07-10', L, w), xb = timeX('1939-04-15', L, w);
  s += `<rect class="t-break" x="${L}" y="14" width="${xa - L}" height="${H - 14}"/><rect class="t-break" x="${xb}" y="14" width="${L + w - xb}" height="${H - 14}"/>`;
  s += `<text class="t-break-l" x="${(L + xa) / 2}" y="${H - 4}" text-anchor="middle">배경</text><text class="t-break-l" x="${(xb + L + w) / 2}" y="${H - 4}" text-anchor="middle">그 후</text>`;
  // 축과 연도
  s += `<line class="t-axis" x1="${L}" x2="${L + w}" y1="22" y2="22"/>`;
  for (let y = 1936; y <= 1939; y++) for (let m = 1; m <= 12; m++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-01`;
    if (iso < '1936-08-01' || iso > '1939-04-01') continue;
    const x = timeX(iso, L, w);
    s += `<line class="t-tick" x1="${x}" x2="${x}" y1="${m === 1 ? 14 : 18}" y2="22"/>`;
  }
  const yl = [['1931-04-14', '1931'], ['1934-10-05', '1934'], ['1936-07-17', '1936.7'], ['1937-01-01', '1937'], ['1938-01-01', '1938'], ['1939-01-01', '1939'], ['1945-05-08', '1945'], ['1975-11-20', '1975'], ['2007-12-26', '2007']];
  for (const [iso, t] of yl) s += `<text class="t-year" x="${timeX(iso, L, w) + 3}" y="12">${t}</text>`;
  // 공화파 영토 비율(계단 영역)
  const top = 30, hh = 34, ys = v => top + hh - v / 60 * hh;
  const steps = PHASES.filter(p => p.share !== undefined);
  let d = `M${timeX('1936-07-18', L, w)} ${ys(0)}`, line = '';
  steps.forEach((p, k) => {
    const x1 = timeX(k === 0 ? '1936-07-18' : p.date, L, w), x2 = k + 1 < steps.length ? timeX(steps[k + 1].date, L, w) : timeX('1939-04-01', L, w);
    d += `L${x1} ${ys(p.share)}L${x2} ${ys(p.share)}`;
    line += `${k ? 'L' : 'M'}${x1} ${ys(p.share)}L${x2} ${ys(p.share)}`;
  });
  d += `L${timeX('1939-04-01', L, w)} ${ys(0)}Z`;
  s += `<line class="t-half" x1="${xa}" x2="${xb}" y1="${ys(50)}" y2="${ys(50)}"/><path class="t-share" d="${d}" opacity=".55"/><path class="t-share-line" d="${line}"/>`;
  s += `<text class="t-share-l" x="${L - 8}" y="${top + 13}" text-anchor="end">공화파 영토</text><text class="t-share-l" x="${L - 8}" y="${top + 27}" text-anchor="end">0–60%</text>`;
  s += `<text class="t-share-l" x="${xa + 4}" y="${ys(50) - 3}">50%</text>`;
  // 갈래별 사건
  for (const [lane, label] of Object.entries(LANES)) {
    s += `<rect class="t-lane-bg" x="${L}" y="${laneY[lane] - 10}" width="${w}" height="20" opacity="${state.lanes.has(lane) ? .5 : .2}"/><text class="t-lane-l" x="${L - 8}" y="${laneY[lane] + 4}" text-anchor="end">${label}</text>`;
  }
  const cur = EVENTS[state.i];
  EVENTS.forEach((e, i) => {
    const x = timeX(e.date, L, w), y = laneY[e.lane], off = state.lanes.has(e.lane) ? '' : ' off';
    if (e.end) { const x2 = timeX(e.end, L, w); if (x2 - x > 4) s += `<line class="t-span ${e.lane}${off}" x1="${x}" x2="${x2}" y1="${y}" y2="${y}"/>`; }
    const shape = e.lane === 'war' ? `<rect class="t-dot ${e.lane}${off}" x="${x - 4.6}" y="${y - 4.6}" width="9.2" height="9.2" transform="rotate(45 ${x} ${y})"/>` : `<circle class="t-dot ${e.lane}${off}" cx="${x}" cy="${y}" r="5"/>`;
    s += `<g class="t-ev" data-i="${i}">${shape}<circle class="t-hit" cx="${x}" cy="${y}" r="11"><title>${esc(fmtWhen(e) + ' · ' + e.title)}</title></circle></g>`;
  });
  const cx = timeX(cur.date, L, w);
  s += `<line class="t-cursor" x1="${cx}" x2="${cx}" y1="22" y2="${H - 10}"/><path class="t-cursor-head" d="M${cx - 5} 15L${cx + 5} 15L${cx} 22Z"/><circle class="t-cur-ring" cx="${cx}" cy="${laneY[cur.lane]}" r="9"/>`;
  s += '</svg>';
  wrap.innerHTML = s;
  // 좁은 화면에선 커서가 보이도록 가로 스크롤
  if (W > wrap.clientWidth) {
    const target = cx - wrap.clientWidth / 2;
    if (Math.abs(wrap.scrollLeft - target) > wrap.clientWidth * .3) wrap.scrollLeft = target;
  }
}

// ── 사상 지도 ───────────────────────────────────────────
const CMP = { w: 600, h: 520, x0: 64, x1: 556, y0: 36, y1: 474 };
const cx = x => CMP.x0 + (x + 1) / 2 * (CMP.x1 - CMP.x0);
const cy = y => CMP.y1 - (y + 1) / 2 * (CMP.y1 - CMP.y0);
const LABEL_SIDE = { army: 'l', carlist: 'l', monarch: 'l', ceda: 'l', church: 'l', pce: 't' };
const ideas = { sel: 'pce', cleave: null };
const GCOL = ['var(--art)', 'var(--intl)', 'var(--pol)', 'var(--ink)'];
function drawCompass() {
  const cl = CLEAVAGES.find(c => c.id === ideas.cleave);
  const groupOf = {};
  if (cl) cl.groups.forEach((g, k) => g.ids.forEach(id => { groupOf[id] = k; }));
  let s = `<svg viewBox="0 0 ${CMP.w} ${CMP.h}" role="img" aria-labelledby="compass-cap">`;
  for (const t of [-.5, .5]) s += `<line class="c-grid" x1="${cx(t)}" x2="${cx(t)}" y1="${CMP.y0}" y2="${CMP.y1}"/><line class="c-grid" x1="${CMP.x0}" x2="${CMP.x1}" y1="${cy(t)}" y2="${cy(t)}"/>`;
  s += `<line class="c-axis" x1="${CMP.x0}" x2="${CMP.x1}" y1="${cy(0)}" y2="${cy(0)}"/><line class="c-axis" x1="${cx(0)}" x2="${cx(0)}" y1="${CMP.y0}" y2="${CMP.y1}"/>`;
  s += `<text class="c-axl" x="${CMP.x0}" y="${cy(0) - 8}">← 혁명·집산화</text><text class="c-axl" x="${CMP.x1}" y="${cy(0) - 8}" text-anchor="end">사유재산·전통 질서 →</text>`;
  s += `<text class="c-axl" x="${cx(0) + 8}" y="${CMP.y0 - 14}">↑ 권위주의·전체주의</text><text class="c-axl" x="${cx(0) + 8}" y="${CMP.y1 + 30}">↓ 국가 폐지·분권</text>`;
  // 공산당: 최종 목표와 전시 노선
  const pce = FACTIONS.pce;
  if (!cl || cl.id === 'regime' || cl.id === 'revwar') {
    s += `<path class="c-goal" d="M${cx(pce.pos[0]) + 12} ${cy(pce.pos[1]) + 3}L${cx(pce.goal[0]) - 8} ${cy(pce.goal[1])}" marker-end="url(#c-arr)"/>`;
    s += `<text class="c-goal-l" x="${cx(pce.goal[0]) - 4}" y="${cy(pce.goal[1]) + 18}">공산당의 전시 노선</text>`;
  }
  s += '<defs><marker id="c-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8Z" fill="var(--ink-2)"/></marker></defs>';
  for (const [id, f] of Object.entries(FACTIONS)) {
    const x = cx(f.pos[0]), y = cy(f.pos[1]);
    const dim = cl && (groupOf[id] === undefined || (cl.repOnly && f.side !== 'rep'));
    const gk = groupOf[id];
    const fill = cl && gk !== undefined ? ` style="fill: ${GCOL[gk]}"` : '';
    const side = LABEL_SIDE[id] || 'r';
    const shape = f.side === 'rep' ? `<circle class="shape" cx="${x}" cy="${y}" r="9"${fill}/>` : `<rect class="shape" x="${x - 8}" y="${y - 8}" width="16" height="16"${fill}/>`;
    const tx = side === 'l' ? x - 15 : side === 't' ? x : x + 15, ty = side === 't' ? y - 15 : y + 4.5, an = side === 'l' ? 'end' : side === 't' ? 'middle' : 'start';
    s += `<g class="c-node ${f.side}${dim ? ' dim' : ''}${ideas.sel === id ? ' sel' : ''}" data-faction="${id}" tabindex="0" role="button" aria-label="${esc(f.name)}">` +
      (f.region ? `<circle class="c-region" cx="${x}" cy="${y}" r="14"/>` : '') + shape +
      (cl && gk !== undefined && !dim ? `<text class="c-badge" x="${x}" y="${y + 3.5}">${'ABCD'[gk]}</text>` : '') +
      `<text x="${tx}" y="${ty}" text-anchor="${an}">${esc(f.short)}</text></g>`;
  }
  s += '</svg>';
  $('#compass').innerHTML = s;
  // 설명
  const note = $('#cleave-note');
  if (!cl) {
    note.innerHTML = `<p class="prose">동그라미는 공화파, 네모는 국민파 쪽 세력이다. 점선 고리는 지방 자치나 특권을 앞세운 세력. 위의 단추로 갈등의 축을 바꿔 보면, 같은 진영 안에서도 줄이 엇갈리는 모습이 드러난다.</p>`;
  } else {
    note.innerHTML = `<p class="prose">${esc(cl.text)}</p><div class="groups">${cl.groups.map((g, k) => `<div class="group"><span class="g-key g${k}">${'ABCD'[k]}</span><div><b>${esc(g.label)}</b><span>${g.ids.map(id => esc(FACTIONS[id].short)).join(', ')}</span></div></div>`).join('')}</div><p class="irony"><b>엇갈림</b>${esc(cl.note)}</p>`;
  }
  drawFactionCard();
}
function drawFactionCard() {
  const f = FACTIONS[ideas.sel];
  const evs = EVENTS.filter(e => (e.vs || []).flat().includes(ideas.sel));
  $('#faction-card').innerHTML = `<div><span class="side-pill ${f.side}">${SIDE_NAME[f.side]}</span></div><h3>${esc(f.name)}</h3><div class="orig">${esc(f.orig)}</div><p>${esc(f.line)}</p>
    <dl><dt>원한 것</dt><dd>${esc(f.want)}</dd><dt>두려워한 것</dt><dd>${esc(f.fear)}</dd><dt>지지 기반</dt><dd>${esc(f.base)}</dd><dt>상징</dt><dd>${esc(f.symbol)}</dd><dt>최후</dt><dd>${esc(f.fate)}</dd></dl>
    <div class="who"><h3>인물</h3>${f.people.map(personChip).join('')}</div>
    <div class="who"><h3>등장하는 사건 ${evs.length}건</h3>${evs.slice(0, 8).map(e => `<button class="chip static-ev" data-event="${e.id}">${esc(fmtDate(e.date).slice(0, 7))} ${esc(e.title.length > 16 ? e.title.slice(0, 15) + '…' : e.title)}</button>`).join('')}</div>`;
}
function initIdeas() {
  const bar = $('#cleave-bar');
  bar.innerHTML = `<button class="seg" data-cleave="" aria-pressed="true">진영</button>` + CLEAVAGES.map(c => `<button class="seg" data-cleave="${c.id}" aria-pressed="false">${esc(c.name)}</button>`).join('');
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-cleave]'); if (!b) return;
    ideas.cleave = b.dataset.cleave || null;
    bar.querySelectorAll('.seg').forEach(x => x.setAttribute('aria-pressed', x === b));
    drawCompass();
  });
  const pick = e => { const n = e.target.closest('.c-node'); if (n) { ideas.sel = n.dataset.faction; drawCompass(); } };
  $('#compass').addEventListener('click', pick);
  $('#compass').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });
  drawCompass();
}
function showFaction(id) {
  ideas.sel = id; drawCompass();
  $('#ideas').scrollIntoView({ behavior: 'smooth' });
}

// ── 내전 속의 내전(순서도) ───────────────────────────────
function drawWithin(side) {
  const data = WITHIN[side], W = 560, LX = 196, RX = 512, top = 54, rowH = 68;
  const n = data.lanes.length, lx = k => LX + (RX - LX) * (n === 1 ? .5 : k / (n - 1));
  const laneIdx = Object.fromEntries(data.lanes.map(([id], k) => [id, k]));
  const H = top + data.rows.length * rowH + 14;
  const endRow = {};
  data.rows.forEach((r, k) => (r.ends || []).forEach(id => { if (endRow[id] === undefined) endRow[id] = k; }));
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(data.title)}"><defs><marker id="w-${side}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8Z" fill="var(--ink)"/></marker></defs>`;
  data.lanes.forEach(([id, label], k) => {
    const x = lx(k), yEnd = endRow[id] !== undefined ? top + endRow[id] * rowH + rowH / 2 : H - 6;
    s += `<text class="s-head" x="${x}" y="30">${esc(label)}</text><line class="s-lane" x1="${x}" x2="${x}" y1="40" y2="${yEnd}"/>`;
  });
  data.rows.forEach((r, k) => {
    const y = top + k * rowH + rowH / 2;
    const words = r.text.split(' '), lines = [];
    let cur = '';
    for (const wd of words) { if ((cur + ' ' + wd).trim().length > 14 && cur) { lines.push(cur); cur = wd; } else cur = (cur + ' ' + wd).trim(); }
    lines.push(cur);
    s += `<g class="s-row" data-event="${r.event}" tabindex="0" role="button"><text class="s-date" x="10" y="${y - 12}">${esc(r.date)}</text>`;
    lines.slice(0, 3).forEach((l, j) => { s += `<text class="s-text" x="10" y="${y + 4 + j * 15}">${esc(l)}</text>`; });
    const xs = v => (Array.isArray(v) ? v : [v]).map(id => lx(laneIdx[id]));
    if (r.kind === 'note') xs(r.lanes).forEach(x => { s += `<circle class="s-dot" cx="${x}" cy="${y}" r="5"/>`; });
    if (r.kind === 'merge') {
      const to = xs(r.to)[0];
      xs(r.from).forEach(x => { s += `<path class="s-merge" d="M${x} ${y - 10}C${x} ${y + 8} ${to} ${y - 4} ${to + (x < to ? -7 : 7)} ${y + 14}" marker-end="url(#w-${side})"/>`; });
    }
    if (r.kind === 'purge') {
      const [a] = xs(r.from), [b] = xs(r.to);
      s += `<line class="s-purge" x1="${a}" x2="${b + (a < b ? -10 : 10)}" y1="${y}" y2="${y}" marker-end="url(#w-${side})"/>`;
    }
    if (r.kind === 'clash') {
      const all = [...xs(r.from), ...xs(r.to)], x0 = Math.min(...all), x1 = Math.max(...all);
      let z = `M${x0} ${y}`;
      for (let x = x0; x < x1; x += 10) z += `L${Math.min(x + 5, x1)} ${y - 6}L${Math.min(x + 10, x1)} ${y}`;
      s += `<path class="s-clash" d="${z}"/>`;
      all.forEach(x => { s += `<circle class="s-dot" cx="${x}" cy="${y}" r="4.5" style="fill: var(--rep)"/>`; });
    }
    if (r.kind === 'exit') {
      const [a] = xs(r.from);
      s += `<line class="s-exit" x1="${a}" x2="${W - 6}" y1="${y}" y2="${y}" marker-end="url(#w-${side})"/>`;
    }
    (r.ends || []).forEach(id => {
      if (r.kind === 'merge') return;
      const x = lx(laneIdx[id]);
      s += `<path class="s-x" d="M${x - 6} ${y + 8}L${x + 6} ${y + 20}M${x + 6} ${y + 8}L${x - 6} ${y + 20}"/>`;
    });
    s += '</g>';
  });
  return s + '</svg>';
}
function initWithin() {
  for (const side of ['rep', 'nat']) { $('#seq-' + side).innerHTML = drawWithin(side); $('#seq-end-' + side).textContent = '→ ' + WITHIN[side].end; }
  const list = EVENTS.filter(e => (e.tags || []).includes('within'));
  $('#within-list').innerHTML = list.map(e => `<button class="within-item" data-event="${e.id}"><span class="type">${esc(fmtWhen(e))}</span><b>${esc(e.title)}</b><span>${esc(e.result.split('. ')[0])}.</span></button>`).join('');
}

// ── 국제전 ──────────────────────────────────────────────
function drawTroops() {
  const box = $('#troops'), W = Math.max(300, box.clientWidth), narrow = W < 600, max = 80000;
  const L = narrow ? 4 : 210, R = narrow ? 118 : 150, rowH = narrow ? 50 : 38, top = 26;
  const H = top + FOREIGN_TROOPS.length * rowH + 8, sx = v => L + v / max * (W - L - R);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="외국인 병력 추정치 범위 막대그래프">`;
  for (let v = 0; v <= max; v += 20000) s += `<line class="r-grid" x1="${sx(v)}" x2="${sx(v)}" y1="${top - 6}" y2="${H - 6}"/><text class="r-tick" x="${sx(v)}" y="${top - 12}" text-anchor="${v ? 'middle' : 'start'}">${v ? v / 10000 + '만' : '0'}</text>`;
  FOREIGN_TROOPS.forEach((t, k) => {
    const y = top + k * rowH + (narrow ? rowH - 14 : rowH / 2);
    s += `<g><title>${esc(`${t.name}: ${t.label} (${SIDE_NAME[t.side]} 쪽)`)}</title>`;
    s += narrow ? `<text class="r-name" x="${L}" y="${y - 13}">${esc(t.name)}</text>` : `<text class="r-name" x="${L - 12}" y="${y + 4.5}" text-anchor="end">${esc(t.name)}</text>`;
    s += `<rect class="r-bar ${t.side}" x="${sx(t.lo)}" y="${y - 6}" width="${Math.max(8, sx(t.hi) - sx(t.lo))}" height="12" rx="4"/>`;
    s += `<text class="r-val" x="${Math.max(sx(t.hi), sx(t.lo) + 8) + 8}" y="${y + 4.5}">${esc(t.label)}</text><rect class="r-hit" x="0" y="${y - rowH / 2}" width="${W}" height="${rowH}"/></g>`;
  });
  box.innerHTML = s + '</svg>';
}
function initWorld() {
  drawTroops();
  const col = side => FOREIGN.filter(f => f.side === side).map(f => `<article class="wcard"><h4>${esc(f.name)} <small>${esc(f.who)}</small></h4><p><b>보낸 것</b>${esc(f.sent)}</p><p><b>원한 것</b>${esc(f.want)}</p><p><b>얻은 것</b>${esc(f.got)}</p></article>`).join('');
  $('#world-nat').innerHTML += col('nat');
  $('#world-mid').innerHTML += col('mid');
  $('#world-rep').innerHTML += col('rep');
}

// ── 인물 ────────────────────────────────────────────────
function initPeople() {
  const grid = $('#people-grid');
  const render = f => {
    grid.innerHTML = PEOPLE.filter(p => f === 'all' || p.side === f).map(p =>
      `<button class="pcard" data-person="${p.id}"><span class="avatar ${p.side}">${esc(initial(p.name))}</span><span><b>${esc(p.name)}</b><small>${esc(p.orig)} · ${esc(p.life)}</small><span class="pc-role">${esc(p.role)}</span></span></button>`).join('');
  };
  $('#people-filter').addEventListener('click', e => {
    const b = e.target.closest('[data-side]'); if (!b) return;
    $('#people-filter').querySelectorAll('.seg').forEach(x => x.setAttribute('aria-pressed', x === b));
    render(b.dataset.side);
  });
  render('all');
}
function eventLinks(list) {
  return `<div class="ev-links">${list.map(e => `<button class="ev-link" data-event="${e.id}"><small>${esc(fmtWhen(e))}</small><span>${esc(e.title)}</span></button>`).join('')}</div>`;
}
function openPerson(id) {
  const p = PERSON_BY[id], f = FACTIONS[p.faction];
  const evs = EVENTS.filter(e => (e.people || []).includes(id));
  openDrawer(`<div class="drawer-top"><span class="avatar ${p.side}">${esc(initial(p.name))}</span><button class="btn" data-close>닫기</button></div>
    <div><h3 id="drawer-title">${esc(p.name)}</h3><div class="orig">${esc(p.orig)} · ${esc(p.life)}</div></div>
    <p>${esc(p.role)}</p>
    <dl>${f ? `<div><dt>소속</dt><dd><button class="chip ${f.side}" data-faction="${p.faction}">${esc(f.name)}</button></dd></div>` : ''}
    <div><dt>원한 것</dt><dd>${esc(p.want)}</dd></div><div><dt>한 일</dt><dd>${esc(p.did)}</dd></div><div><dt>최후</dt><dd>${esc(p.fate)}</dd></div>
    ${evs.length ? `<div><dt>타임라인에서 보기</dt><dd>${eventLinks(evs)}</dd></div>` : ''}</dl>`);
}

// ── 예술가 ──────────────────────────────────────────────
function artistBody(a) {
  const evs = a.events.map(id => EVENT_BY[id]).filter(Boolean);
  return `<div class="acard-body"><p class="point">영감의 지점: ${esc(PLACES[a.point[0]][0])} · ${esc(a.point[1])}</p>
    <div><h4>무엇을 보았나</h4><p>${esc(a.spark)}</p></div><div><h4>무엇이 되었나</h4><p>${esc(a.after)}</p></div>
    ${a.quote ? `<blockquote class="quote"><p>${esc(a.quote[0])}</p><cite>${esc(a.quote[1])}</cite></blockquote>` : ''}
    ${evs.length ? `<div><h4>타임라인에서 보기</h4>${eventLinks(evs)}</div>` : ''}</div>`;
}
let artistSel = null;
function selectArtist(id, { open = true, scroll = false } = {}) {
  const a = ARTIST_BY[id];
  artistSel = id;
  artistMap.showRoute(a);
  $('#artist-cap').innerHTML = `<b>${esc(a.name)}</b>의 발자취<ol class="stops">${a.route.map(s => `<li><span class="d">${esc(s[1])}</span><span>${esc(PLACES[s[0]][0])} · ${esc(s[2])}</span></li>`).join('')}</ol>`;
  document.querySelectorAll('.acard').forEach(d => { if (d.dataset.artist !== id) d.open = false; else if (open) d.open = true; });
  if (scroll) $('#artists').scrollIntoView({ behavior: 'smooth' });
}
function initArtists() {
  const symLabel = { rep: '공화국 지지', nat: '반란 측 취재', both: '양쪽을 응시' };
  $('#artist-list').innerHTML = ARTISTS.map(a => `<details class="acard" data-artist="${a.id}"><summary><span class="avatar art">${esc(initial(a.name))}</span><span><b>${esc(a.name)}</b><small>${esc(a.from)} · ${esc(a.life)}</small><span class="works">${a.works.map(w => `${esc(w[0])}(${w[1]})`).join(' · ')}</span></span><span class="sym ${a.sym}">${symLabel[a.sym]}</span></summary>${artistBody(a)}</details>`).join('');
  $('#artist-list').addEventListener('toggle', e => { const d = e.target; if (d.open && d.dataset.artist !== artistSel) selectArtist(d.dataset.artist, { open: false }); }, true);
  selectArtist('kazantzakis');
}

// ── 서랍 ────────────────────────────────────────────────
let lastFocus = null;
function openDrawer(html) {
  lastFocus = document.activeElement;
  const d = $('#drawer');
  $('#drawer-panel').innerHTML = html;
  d.hidden = false;
  const c = d.querySelector('[data-close]'); if (c) c.focus();
}
function closeDrawer() {
  const d = $('#drawer'); if (d.hidden) return;
  d.hidden = true;
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

// ── 결산 ────────────────────────────────────────────────
function initAfter() {
  $('#ledger').innerHTML = `<dl>${TOLL.map(t => `<div><dt>${esc(t.k)}</dt><dd>${esc(t.v)}</dd><p>${esc(t.d)}</p></div>`).join('')}</dl>`;
  $('#why-list').innerHTML = WHY_LOST.map(([b, s]) => `<li><b>${esc(b)}</b><span>${esc(s)}</span></li>`).join('');
  $('#irony-grid').innerHTML = IRONIES.map(([b, s]) => `<div class="icard"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('');
}

// ── 연결 ────────────────────────────────────────────────
function bindGlobal() {
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-event],[data-person],[data-artist],[data-faction],[data-close]');
    if (!t) { if (e.target.id === 'drawer') closeDrawer(); return; }
    if (t.closest('.acard summary')) return;
    if (t.hasAttribute('data-close')) return closeDrawer();
    if (t.dataset.event && !t.closest('#scrub-track')) return goToEvent(t.dataset.event);
    if (t.dataset.person) return openPerson(t.dataset.person);
    if (t.dataset.artist && !t.classList.contains('acard')) { closeDrawer(); return selectArtist(t.dataset.artist, { scroll: true }); }
    if (t.dataset.faction && !t.closest('#compass')) { closeDrawer(); return showFaction(t.dataset.faction); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') return closeDrawer();
    if (e.key === 'Enter' && e.target.matches && e.target.matches('[role="button"][data-event]')) return goToEvent(e.target.dataset.event);
    if (!$('#drawer').hidden || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const r = $('#atlas').getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      e.preventDefault(); stopPlay(); step(e.key === 'ArrowRight' ? 1 : -1);
    }
  });
  $('#ev-prev').addEventListener('click', () => { stopPlay(); step(-1); });
  $('#ev-next').addEventListener('click', () => { stopPlay(); step(1); });
  $('#ev-play').addEventListener('click', () => setPlay(!state.playing));
  $('#scrub-track').addEventListener('click', e => { const g = e.target.closest('.t-ev'); if (g) { stopPlay(); go(+g.dataset.i); } });
  $('#lane-filter').addEventListener('change', e => {
    const lane = e.target.value;
    if (e.target.checked) state.lanes.add(lane); else state.lanes.delete(lane);
    if (!state.lanes.size) { state.lanes.add(lane); e.target.checked = true; }
    if (!state.lanes.has(EVENTS[state.i].lane)) { if (!step(1)) step(-1); } else go(state.i, { animate: false });
  });
  $('#zoom-in').addEventListener('click', () => atlas.zoomBy(1.6));
  $('#zoom-out').addEventListener('click', () => atlas.zoomBy(1 / 1.6));
  $('#zoom-reset').addEventListener('click', () => atlas.resetView());
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { drawScrub(); drawTroops(); }, 120); });
  // 머리띠: 지금 읽는 섹션 표시
  const links = [...document.querySelectorAll('.nav a')];
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) links.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-40% 0px -55% 0px' });
  links.forEach(a => { const s = $(a.getAttribute('href')); if (s) io.observe(s); });
}

function start() {
  atlas = new AtlasMap($('#map'), { onPick: e => { stopPlay(); go(EVENTS.indexOf(e)); } });
  artistMap = new AtlasMap($('#artist-svg'), { mini: true });
  bindGlobal();
  go(state.i, { animate: false });
  initIdeas(); initWithin(); initWorld(); initPeople(); initArtists(); initAfter();
}
start();
