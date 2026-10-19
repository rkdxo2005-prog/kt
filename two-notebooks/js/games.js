// 미니 게임: 몸으로 먼저 겪게 하는 장치들
//   trench   알쿠비에레의 다섯 밤 — 무엇에 시간을 쓰는가 (→ "다섯 가지")
//   aim      바지를 붙든 사람 — 겨누고, 쏘거나 쏘지 않는다
//   papers   5월 사태의 신문들 — 내가 본 것과 맞춰 본다
//   memory   톨레도, 기억과 지금 사이
//   tag      헤타페 — 누가 싸우는가 (유럽 지도에 화살표)
//   compose  기사 쓰기 — 틀을 고르고 문장을 고르고, 검열을 거친다
//   clippings 실린 기사를 오려 붙인다
//   revise   이듬해 책으로 묶으며 고쳐 쓴다
const GAMES = {};

const ICONS = {
  wood: '<svg viewBox="0 0 32 32"><path d="M5 22 25 10M8 26l20-12" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M14 9c2-4 6-4 5-7 4 3 4 7 1 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  food: '<svg viewBox="0 0 32 32"><path d="M6 16h20a10 10 0 0 1-20 0z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 11c0-3 3-3 3-6M18 11c0-3 3-3 3-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  tob: '<svg viewBox="0 0 32 32"><rect x="4" y="17" width="20" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><path d="M24 17h4v5h-4" fill="currentColor"/><path d="M26 13c0-3-3-3-2-6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  candle: '<svg viewBox="0 0 32 32"><rect x="12" y="13" width="8" height="15" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 4c3 4 3 6 0 8-3-2-3-4 0-8z" fill="currentColor"/></svg>',
  enemy: '<svg viewBox="0 0 32 32"><path d="M3 16s5-8 13-8 13 8 13 8-5 8-13 8S3 16 3 16z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="3.5" fill="currentColor"/></svg>',
};

// ── 참호: 다섯 밤 ──────────────────────────────────────
GAMES.trench = ctx => {
  const TASKS = [
    { id: 'wood', name: '장작', need: 'warm', sub: '덤불 뿌리 캐기' },
    { id: 'food', name: '먹을 것', need: 'food', sub: '배급 받기, 나눠 먹기' },
    { id: 'tob', name: '담배', need: 'tob', sub: '구하기, 말기' },
    { id: 'candle', name: '초', need: 'light', sub: '아끼기, 구하기' },
    { id: 'enemy', name: '적 감시', need: null, sub: '흉벽 너머 지켜보기' },
  ];
  const ORDER = ['wood', 'food', 'tob', 'candle', 'enemy'];
  const NEED_LABEL = { warm: '체온', food: '배', tob: '담배', light: '빛' };
  const need = { warm: 5, food: 6, tob: 6, light: 5 };
  const DECAY = n => ({ warm: [4, 4, 5, 5, 6][n - 1], food: 3, tob: 2.5, light: 2 });
  const HOURS = 3, GAIN = 4, NIGHTS = 5;
  const total = { wood: 0, food: 0, tob: 0, candle: 0, enemy: 0 };
  const INTRO = [
    '첫날 밤. 기온이 영하로 떨어졌다. 자는 시간은 서너 시간, 나머지는 보초다.',
    '둘째 밤. 바람이 능선을 훑는다. 장작이라고 해 봐야 비탈의 마른 덤불 뿌리를 캐 오는 것이다.',
    '셋째 밤. 진눈깨비. 군화 속까지 젖었다.',
    '넷째 밤. 이가 옷 솔기마다 알을 깠다. 담배 한 개비를 넷이 돌려 피운다.',
    '다섯째 밤. 눈이 내린다. 골짜기 건너편 적 참호에서도 연기가 오른다.',
  ];
  const WATCH = [
    '적 참호에는 아무 움직임이 없다.',
    '멀리서 총소리 두어 발. 아무 일도 없었다.',
    '누군가 적의 불빛을 보았다고 소리쳤다. 별이었다.',
    '적 쪽에서도 누군가 기침을 한다. 그들도 춥다.',
    '적은 오지 않았다. 아무도 오지 않았다.',
  ];
  const LOW = {
    warm: '손가락이 얼어 총을 쥘 수 없다. 밤새 이가 덜덜 떨렸다.',
    food: '배가 고파 잠이 오지 않는다.',
    tob: '담배가 떨어졌다. 다들 신경이 곤두섰다.',
    light: '초가 없다. 오후 다섯 시부터 어둠 속이다. 이를 잡을 수도, 편지를 쓸 수도 없다.',
  };
  let night = 1;
  let alloc = { wood: 0, food: 0, tob: 0, candle: 0, enemy: 0 };
  const left = () => HOURS - Object.values(alloc).reduce((a, b) => a + b, 0);

  const box = h('div', { class: 'game' });
  ctx.host.append(box);

  function paintParams() {
    Plates.set({ night, warmth: need.warm / 10, light: need.light / 10 });
  }

  function render() {
    box.innerHTML = '';
    box.append(
      h('h3', null, `${night}일째 밤`),
      h('p', { class: 'sub' }, INTRO[night - 1] + ` 오늘 밤 쓸 수 있는 시간은 ${HOURS}시간. 무엇에 쓸까?`),
    );
    const needs = h('div', { class: 'needs' });
    for (const [k, l] of Object.entries(NEED_LABEL)) {
      const v = need[k];
      needs.append(h('div', { class: 'need' + (v <= 2.5 ? ' low' : '') }, `${l} ${Math.round(v)}`, h('div', { class: 'nbar' }, h('b', { style: `width:${v * 10}%` }))));
    }
    box.append(needs);
    const tasks = h('div', { class: 'tasks' });
    for (const t of TASKS) {
      const n = alloc[t.id];
      const b = h('button', { class: 'task' + (n ? ' has' : ''), 'aria-label': `${t.name}에 한 시간 쓰기 (지금 ${n}시간)`, onclick: () => { if (left() > 0) { alloc[t.id]++; Sound.fx('page'); render(); } } });
      b.innerHTML = ICONS[t.id];
      b.append(h('span', null, t.name), h('span', { class: 'hrs' }, Array.from({ length: n }, () => h('i'))));
      tasks.append(b);
    }
    box.append(tasks);
    const row = h('div', { class: 'g-row' },
      h('span', { class: 'hours-left' }, left() ? `남은 시간 ${left()}` : '시간을 다 나눴다'),
      h('button', { class: 'next ghost', onclick: () => { alloc = { wood: 0, food: 0, tob: 0, candle: 0, enemy: 0 }; render(); } }, '다시 나누기'),
      h('button', { class: 'next', disabled: left() > 0, onclick: pass }, '밤을 보낸다'));
    box.append(row);
    ctx.reveal(box);
  }

  function pass() {
    const lines = [];
    for (const t of TASKS) {
      total[t.id] += alloc[t.id];
      if (t.need) need[t.need] = Math.min(10, need[t.need] + alloc[t.id] * GAIN);
    }
    const d = DECAY(night);
    for (const k of Object.keys(d)) need[k] = Math.max(0, need[k] - d[k]);
    lines.push(alloc.enemy ? WATCH[night - 1] : '흉벽 너머를 지켜본 사람은 없었다. 그래도 아무 일도 일어나지 않았다.');
    const lows = Object.keys(LOW).filter(k => need[k] <= 2.5);
    lows.forEach(k => lines.push(LOW[k]));
    if (!lows.length) lines.push('그럭저럭 버틴 밤이었다.');
    ctx.add(h('div', { class: 'night-log' }, h('p', null, h('b', null, `${night}일째 밤 — `), lines.join(' '))));
    Sound.fx(lows.length ? 'wind' : 'page');
    night++;
    alloc = { wood: 0, food: 0, tob: 0, candle: 0, enemy: 0 };
    paintParams();
    if (night > NIGHTS) return result();
    render();
  }

  function result() {
    const names = Object.fromEntries(TASKS.map(t => [t.id, t.name]));
    const mine = ORDER.slice().sort((a, b) => total[b] - total[a] || ORDER.indexOf(a) - ORDER.indexOf(b));
    const max = Math.max(1, ...Object.values(total));
    const same = mine.filter((k, i) => ORDER[i] === k).length;
    box.innerHTML = '';
    box.append(h('h3', null, '다섯 밤 동안 시간을 쓴 순서'));
    const rank = h('div', { class: 'rank' });
    rank.append(
      h('div', null, h('h4', null, '당신'), h('ol', null, mine.map((k, i) => h('li', { class: ORDER[i] === k ? 'match' : '' }, h('span', null, names[k]), h('span', { class: 'bar', style: `width:${(total[k] / max) * 70 + 4}px` }), h('span', { class: 'hrs-n' }, `${total[k]}시간`))))),
      h('div', null, h('h4', null, '오웰'), h('ol', null, ORDER.map(k => h('li', null, h('span', null, names[k]), h('span'), h('span')))))
    );
    box.append(rank);
    const enemyLast = mine[4] === 'enemy';
    box.append(h('p', { class: 'sub' },
      `다섯 자리 가운데 ${same}자리가 같다. ` + (enemyLast ? '당신에게도 적은 꼴찌였다.' : `당신은 적 감시에 ${total.enemy}시간을 썼다. 다섯 밤 동안 적은 한 번도 오지 않았다.`)));
    ctx.flag('trenchOrder', mine.join(','));
    ctx.note('중요한 순서: ' + mine.map(k => names[k]).join(', '), 'thought');
    box.append(h('button', { class: 'next', onclick: ctx.done }, '계속', h('kbd', null, 'Space')));
    ctx.reveal(box);
  }

  paintParams();
  render();
};

// ── 겨누기: 바지를 붙든 사람 ───────────────────────────
GAMES.aim = ctx => {
  const DUR = reduceMotion() ? 9000 : 7000;
  const frame = Plates.el;
  const cross = h('div', { class: 'crosshair', 'aria-hidden': 'true' });
  frame.append(cross);
  let px = null, py = null, t0 = performance.now(), raf = 0, decided = false, run = 0;
  const box = h('div', { class: 'game' },
    h('h3', null, '한 사람이 참호에서 뛰쳐나왔다'),
    h('p', { class: 'sub' }, '전령인 듯하다. 반쯤 옷을 걸친 채, 두 손으로 바지를 붙들고 흉벽 위를 달린다. 백 미터. 조준선 안에 그가 있다.'),
    h('div', { class: 'opts' },
      h('button', { class: 'opt', onclick: () => decide(true) }, h('span', { class: 'k' }, '1'), h('span', null, '쏜다')),
      h('button', { class: 'opt', onclick: () => decide(false) }, h('span', { class: 'k' }, '2'), h('span', null, '쏘지 않는다'))),
    h('div', { class: 'nbar', style: 'height:4px' }, h('b', { style: 'width:100%;transition:none' })));
  ctx.host.append(box);
  const bar = box.querySelector('.nbar b');
  const move = e => {
    const r = frame.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    px = (p.clientX - r.left) / r.width; py = (p.clientY - r.top) / r.height;
  };
  frame.addEventListener('pointermove', move);
  frame.addEventListener('touchmove', move, { passive: true });

  function loop(now) {
    const k = Math.min(1, (now - t0) / DUR);
    run = k;
    Plates.set({ run: k });
    bar.style.width = `${(1 - k) * 100}%`;
    // 조준선: 손이 떨리고, 사람이 없으면 달리는 사람 쪽으로 천천히 따라간다.
    const rx = (8 + 84 * k) / 100, ry = 33.5 / 75;
    const tx = px == null ? rx - 0.03 : px, ty = py == null ? ry + 0.02 : py;
    const sway = reduceMotion() ? 0 : 0.012;
    const x = tx + Math.sin(now / 170) * sway + Math.sin(now / 53) * sway * 0.4;
    const y = ty + Math.cos(now / 210) * sway + Math.sin(now / 71) * sway * 0.4;
    cross.style.left = `${x * 100}%`;
    cross.style.top = `${y * 100}%`;
    if (k >= 1) { if (!decided) decide(false, true); cleanup(); return; }
    raf = requestAnimationFrame(loop);
  }
  function cleanup() {
    cancelAnimationFrame(raf);
    frame.removeEventListener('pointermove', move);
    frame.removeEventListener('touchmove', move);
    cross.remove();
  }
  function decide(shot, timeout) {
    if (decided) return;
    decided = true;
    ctx.flag('shot', shot);
    box.querySelectorAll('.opt').forEach(b => (b.disabled = true));
    if (shot) {
      Sound.fx('shot');
      Plates.set({ puff: run });
      Plates.shake();
      ctx.add(h('p', { class: 'act' }, '방아쇠를 당겼다'));
    } else {
      ctx.add(h('p', { class: 'act' }, timeout ? '그가 사라질 때까지 손가락이 움직이지 않았다' : '총을 내렸다'));
    }
    // 그가 흉벽 끝까지 달려 사라지는 것을 본다.
    t0 = performance.now() - run * DUR;
    setTimeout(() => { cleanup(); Plates.set({ run: 1.2 }); ctx.done(); }, shot ? 1600 : 1300);
  }
  Plates.set({ run: 0, puff: -1 });
  raf = requestAnimationFrame(loop);
};

// ── 5월 사태의 신문들 ──────────────────────────────────
GAMES.papers = ctx => {
  const PAPERS = [
    { mast: 'Treball', lean: '카탈루냐 공산당(PSUC) 계열', head: 'POUM이 일으킨 무장 봉기. 프랑코와 내통한 트로츠키파의 음모.' },
    { mast: 'Daily Worker', lean: '영국 공산당 기관지', head: '바르셀로나의 트로츠키파 반란 진압. 독일·이탈리아 첩자들과 연결된 제5열.' },
    { mast: 'London Daily', lean: '영국의 보수 신문들', head: '바르셀로나 무정부 상태. 거리마다 시체. 빨갱이끼리의 학살.' },
    { mast: 'La Batalla', lean: 'POUM 기관지', head: '노동계급이 반혁명의 도발을 물리쳤다.' },
  ];
  const mine = ctx.S.notes.filter(n => n.s === ctx.S.scene).slice(-3);
  const tally = { yes: 0, no: 0, unk: 0 };
  let i = 0;
  const box = h('div', { class: 'game' });
  ctx.host.append(box);
  function render() {
    const p = PAPERS[i];
    box.innerHTML = '';
    box.append(
      h('h3', null, `신문 ${i + 1} / ${PAPERS.length}`),
      h('div', { class: 'paper-card' }, h('div', { class: 'mast' }, h('span', null, p.mast), h('span', null, 'MAYO 1937')), h('div', { class: 'head' }, p.head), h('div', { class: 'lean' }, p.lean)),
      h('div', { class: 'saw' }, h('b', null, '내가 지붕 위에서 본 것'), mine.map(n => h('p', null, n.text))),
      h('div', { class: 'verdicts' },
        h('button', { onclick: () => judge('yes') }, '내가 본 것과 맞는다'),
        h('button', { onclick: () => judge('no') }, '맞지 않는다'),
        h('button', { onclick: () => judge('unk') }, '나는 모른다')),
    );
    ctx.reveal(box);
  }
  function judge(v) {
    tally[v]++;
    Sound.fx('page');
    i++;
    if (i < PAPERS.length) return render();
    box.innerHTML = '';
    box.append(
      h('h3', null, '네 신문, 하나의 사흘'),
      h('div', { class: 'tally' },
        h('div', null, h('span', null, '내가 본 것과 맞는다'), h('b', null, String(tally.yes))),
        h('div', null, h('span', null, '맞지 않는다'), h('b', null, String(tally.no))),
        h('div', null, h('span', null, '나는 모른다'), h('b', null, String(tally.unk)))),
      h('p', { class: 'sub' }, '내가 본 것은 지붕 위의 배고픔과 지루함, 손을 흔들던 돌격대원, 권총을 땅에 내려놓던 코프였다. 그것을 쓴 신문은 없었다.'),
      h('p', { class: 'sub' }, '신문 제목은 당시 각 신문의 주장을 요약해 옮긴 것이다. 실제 제목을 그대로 옮긴 것이 아니다.'),
      h('button', { class: 'next', onclick: ctx.done }, '계속', h('kbd', null, 'Space')));
    ctx.reveal(box);
  }
  render();
};

// ── 톨레도: 기억과 지금 ────────────────────────────────
GAMES.memory = ctx => {
  const STEPS = [
    [0.25, '하늘은 그대로다. 그레코의 초록빛 하늘.'],
    [0.5, '알카사르의 탑이 없다. 네 귀퉁이가 모두 무너져 내렸다.'],
    [0.75, '골목에 사람이 없다. 창문들이 검게 그을렸다.'],
    [1, '유령의 도시. 그레코의 그림 속으로 걸어 들어온 것 같다. 그림 속 사람들만 모두 떠나 버린.'],
  ];
  let shown = 0;
  const input = h('input', { type: 'range', min: '0', max: '100', value: '0', id: 'memory-range', 'aria-label': '1926년의 기억에서 1936년 11월의 지금으로' });
  const next = h('button', { class: 'next', hidden: true, onclick: ctx.done }, '계속', h('kbd', null, 'Space'));
  const box = h('div', { class: 'game' },
    h('h3', null, '기억에서 지금으로'),
    h('p', { class: 'sub' }, '열 해 전의 톨레도가 눈앞의 톨레도와 겹친다. 막대를 오른쪽으로 끌어 지금으로 온다.'),
    h('div', { class: 'memory-ctl' }, input, h('div', { class: 'ends' }, h('span', null, '1926년 여름'), h('span', null, '1936년 11월'))),
    next);
  ctx.host.append(box);
  input.addEventListener('input', () => {
    const v = input.value / 100;
    Plates.set({ mix: v });
    while (shown < STEPS.length && v >= STEPS[shown][0] - 0.001) {
      ctx.add(h('p', { class: 'p' }, STEPS[shown][1]));
      shown++;
      if (shown === 1) Sound.fx('wind');
    }
    if (shown === STEPS.length) { next.hidden = false; ctx.reveal(box); }
  });
  input.focus({ preventScroll: true });
};

// ── 헤타페: 누가 싸우는가 ──────────────────────────────
GAMES.tag = ctx => {
  const spots = ctx.beat.spots;
  const map = Maps.europe();
  const seen = new Set();
  const chips = h('div', { class: 'look-list' });
  const count = h('span', { class: 'count-line' });
  const next = h('button', { class: 'next', hidden: true, onclick: () => { Plates.setSpots([]); ctx.done(); } }, '계속', h('kbd', null, 'Space'));
  const box = h('div', { class: 'game' },
    h('h3', null, '누가 싸우는가'),
    h('p', { class: 'sub' }, '헤타페의 거리에서 보고 들은 것을 하나씩 눌러 본다. 그것이 어디서 왔는지 지도에 그려진다.'),
    chips, map.el, h('div', { class: 'look-hint' }, count, next));
  ctx.host.append(box);
  const chipEls = {};
  const pick = sp => {
    if (seen.has(sp.id)) return;
    seen.add(sp.id);
    Plates.markSpot(sp.id);
    chipEls[sp.id].classList.add('seen');
    ctx.add(h('p', { class: 'seen-line' }, h('b', null, sp.label), sp.text));
    map.arrow(sp.from, sp.side);
    Sound.fx('page');
    count.textContent = `${seen.size} / ${spots.length}`;
    if (seen.size === spots.length) {
      next.hidden = false;
      ctx.note('베를린, 로마, 테투안, 리스본 → 마드리드 ← 모스크바, 파리', 'obs');
    }
    ctx.reveal(box);
  };
  spots.forEach(sp => { chipEls[sp.id] = h('button', { onclick: () => pick(sp) }, sp.label); chips.append(chipEls[sp.id]); });
  count.textContent = `0 / ${spots.length}`;
  Plates.setSpots(spots, pick);
};

// ── 기사 쓰기와 검열 ───────────────────────────────────
GAMES.dispatchSheet = (d, compact) => {
  const sheet = h('div', { class: 'dispatch' },
    h('div', { class: 'mast' }, h('b', null, 'ΚΑΘΗΜΕΡΙΝΗ'), h('span', null, compact ? d.title : '스페인 특파원 · 살라망카 경유')),
    h('h4', null, d.frame),
    h('div', { class: 'lines' }, d.lines.length
      ? d.lines.map(l => h('p', { class: 'ln' + (l.cut ? ' cut' : '') + (l.soft ? ' soft' : '') }, l.soft ? l.soft : l.text))
      : h('p', { class: 'empty' }, '(문장 없음)')));
  if (d.lines.some(l => l.cut)) sheet.append(h('div', { class: 'stamp' }, 'CENSURADO'));
  return sheet;
};

GAMES.compose = ctx => {
  const b = ctx.beat, S = ctx.S;
  for (const l of b.lines) if (!S.seen.some(x => x.id === l.id)) S.seen.push({ id: l.id, text: l.text, tag: l.tag });
  App.meters(ctx.book, S);
  let frame = null;
  const chosen = new Set();
  const box = h('div', { class: 'game' });
  ctx.host.append(box);

  function render() {
    box.innerHTML = '';
    box.append(h('h3', null, `기사: ${b.title}`), h('p', { class: 'sub' }, `제목의 틀을 하나 고르고, 본 것 가운데 ${b.max}줄까지 골라 쓴다. 기사는 살라망카의 선전국을 거쳐 아테네로 간다.`));
    const frames = h('div', { class: 'frames' });
    b.frames.forEach(f => frames.append(h('button', { class: 'opt' + (frame === f ? ' used' : ''), 'aria-pressed': String(frame === f), onclick: () => { frame = f; render(); } },
      h('span', { class: 'k' }, frame === f ? '✓' : ''), h('span', null, f.label, h('span', { class: 'sub' }, f.sub)))));
    box.append(h('div', { class: 'prompt' }, h('b', null, '1. 제목')), frames);
    const pick = h('div', { class: 'pick' });
    b.lines.forEach(l => {
      const on = chosen.has(l.id);
      const input = h('input', { type: 'checkbox', id: 'ln-' + l.id, checked: on, disabled: !on && chosen.size >= b.max });
      input.addEventListener('change', () => { if (input.checked) chosen.add(l.id); else chosen.delete(l.id); render(); });
      pick.append(h('label', { class: on ? 'on' : '', for: 'ln-' + l.id }, input, h('span', null, l.text)));
    });
    box.append(h('div', { class: 'prompt' }, h('b', null, '2. 문장'), ` ${chosen.size} / ${b.max}`), pick);
    box.append(h('div', { class: 'g-row' }, h('button', { class: 'next', disabled: !frame || !chosen.size, onclick: submit }, '선전국에 넘긴다')));
    ctx.reveal(box);
  }

  function submit() {
    const lines = b.lines.filter(l => chosen.has(l.id)).map(l => ({ id: l.id, text: l.text, tag: l.tag, cut: false }));
    const d = { id: b.id, title: b.title, frame: frame.label, lines };
    box.innerHTML = '';
    const sheet = GAMES.dispatchSheet({ ...d, lines: lines.map(l => ({ ...l })) });
    box.append(h('h3', null, '검열'), sheet);
    ctx.reveal(box);
    const els = sheet.querySelectorAll('.ln');
    let k = 0, anyCut = false;
    const tick = () => {
      if (k < lines.length) {
        if (b.cut.includes(lines[k].tag)) {
          lines[k].cut = true; anyCut = true;
          els[k].classList.add('cut');
          Sound.fx('stamp');
        }
        k++;
        return setTimeout(tick, reduceMotion() ? 50 : 420);
      }
      if (anyCut) sheet.append(h('div', { class: 'stamp' }, 'CENSURADO'));
      for (const l of lines) if (!l.cut && !S.sent.some(x => x.id === l.id)) S.sent.push({ id: l.id, text: l.text, tag: l.tag });
      S.dispatches.push({ ...d, lines });
      App.meters(ctx.book, S);
      const said = anyCut ? b.censorSays : '장교는 아무것도 지우지 않았다. 도장을 찍어 주었다.';
      const left = b.lines.length - lines.filter(l => !l.cut).length;
      box.append(
        h('p', { class: 'sub' }, said),
        h('p', { class: 'sub' }, `본 것 ${b.lines.length}가지 가운데 아테네로 가는 것은 ${lines.filter(l => !l.cut).length}가지. 나머지 ${left}가지는 이 수첩에만 남는다.`),
        h('button', { class: 'next', onclick: ctx.done }, '아테네로 보낸다', h('kbd', null, 'Space')));
      ctx.reveal(box);
    };
    setTimeout(tick, reduceMotion() ? 50 : 500);
  }
  render();
};

// ── 오려 붙인 기사들 ───────────────────────────────────
GAMES.clippings = ctx => {
  const S = ctx.S;
  const box = h('div', { class: 'game' }, h('h3', null, '수첩에 오려 붙인 기사'),
    h('p', { class: 'sub' }, '아테네의 독자들이 읽은 것. 붉은 줄은 그들이 읽지 못한 것이다.'));
  if (!S.dispatches.length) box.append(h('p', { class: 'sub' }, '(보낸 기사가 없다)'));
  S.dispatches.forEach(d => box.append(GAMES.dispatchSheet(d)));
  box.append(h('button', { class: 'next', onclick: ctx.done }, '계속', h('kbd', null, 'Space')));
  ctx.host.append(box);
};

// ── 책으로 묶기 ───────────────────────────────────────
GAMES.revise = ctx => {
  const S = ctx.S;
  const SOFT = {
    hero: t => t.replace('버틴 사람들.', '버틴 사람들. 그들 곁에도, 성 밖에도 사람이 죽어 갔다.'),
    red: t => t + ' 그 장교는 다른 죽음에 대해서는 말하지 않았다.',
  };
  const choice = {}; // 줄 id → 'keep' | 'soft' | 'restore' | 'cut'
  let subtitle = null;
  const SUBS = ['자유로운 포위된 사람들', '두 개의 스페인', '¡Viva la muerte! — 죽음 만세!', '톨레도의 유령'];
  const box = h('div', { class: 'game' });
  ctx.host.append(box);
  function render() {
    box.innerHTML = '';
    box.append(h('h3', null, '『여행하며: 스페인』, 1937년 봄'),
      h('p', { class: 'sub' }, '신문에 실린 문장을 그대로 둘지, 누그러뜨릴지 정한다. 검열에 지워진 문장은 되살릴 수도 있다.'));
    S.dispatches.forEach(d => {
      box.append(h('div', { class: 'prompt' }, h('b', null, d.title), ` — ${d.frame}`));
      const list = h('div', { class: 'pick' });
      d.lines.forEach(l => {
        const opts = l.cut ? [['cut', '지운 채 둔다'], ['restore', '되살린다']] : (SOFT[l.tag] ? [['keep', '그대로'], ['soft', '누그러뜨린다']] : [['keep', '그대로']]);
        const cur = choice[l.id] || opts[0][0];
        const row = h('label', { class: cur === 'soft' || cur === 'restore' ? 'on' : '' },
          h('span', null, l.cut ? '✕' : '·'),
          h('span', { style: l.cut && cur !== 'restore' ? 'text-decoration:line-through;color:var(--ink-3)' : '' }, cur === 'soft' ? SOFT[l.tag](l.text) : l.text),
          h('span', { class: 't' }, ...opts.map(([k, lab]) => h('button', { class: 'next ghost', style: 'padding:3px 9px;margin-left:4px' + (cur === k ? ';background:var(--ink);color:var(--paper)' : ''), onclick: e => { e.preventDefault(); choice[l.id] = k; render(); } }, lab))));
        list.append(row);
      });
      box.append(list);
    });
    box.append(h('div', { class: 'prompt' }, h('b', null, '내전 부분의 부제')));
    const subs = h('div', { class: 'opts' });
    SUBS.forEach((s, i) => subs.append(h('button', { class: 'opt' + (subtitle === s ? ' used' : ''), onclick: () => { subtitle = s; render(); } }, h('span', { class: 'k' }, subtitle === s ? '✓' : String(i + 1)), h('span', null, s))));
    box.append(subs);
    box.append(h('button', { class: 'next', disabled: !subtitle, onclick: bind }, '책으로 묶는다'));
    ctx.reveal(box);
  }
  function bind() {
    const kept = [];
    let soft = 0, restored = 0;
    S.dispatches.forEach(d => d.lines.forEach(l => {
      const c = choice[l.id] || (l.cut ? 'cut' : 'keep');
      if (c === 'cut') return;
      if (c === 'soft') soft++;
      if (c === 'restore') restored++;
      kept.push({ id: l.id, tag: l.tag, how: c });
    }));
    S.book2 = kept;
    ctx.flag('subtitle', subtitle);
    box.innerHTML = '';
    box.append(h('h3', null, '책이 묶였다'),
      h('p', { class: 'sub' }, `책에 남긴 문장 ${kept.length}개. 누그러뜨린 문장 ${soft}개, 되살린 문장 ${restored}개. 내전 부분의 부제: ${subtitle}`),
      h('button', { class: 'next', onclick: ctx.done }, '계속', h('kbd', null, 'Space')));
    ctx.note(`책: 남긴 ${kept.length} · 누그러뜨린 ${soft} · 되살린 ${restored}. 부제 「${subtitle}」`, 'thought');
    ctx.reveal(box);
  }
  render();
};

const Games = { dispatchSheet: GAMES.dispatchSheet };
