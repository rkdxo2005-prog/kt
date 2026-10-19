// 장면 엔진: 한 장면의 비트(beat)를 차례로 풀어 수첩 한 면에 쌓는다.
//   { say }  내레이션     { hist } 역사 메모    { cross } 다른 수첩과 겹치는 시간
//   { look } 둘러보기     { choose } 행동       { write } 수첩에 적기 → 그들의 문장
//   { ask }  묻기         { game } 미니 게임    { echo } 그들의 문장
//   { note } { set } { paint } { sound } { fx } { if }  — 즉시 처리
const BOOKS = { orwell: ORWELL, kazan: KAZAN };

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

const Engine = (() => {
  let book = null;   // ORWELL | KAZAN
  let S = null;      // 진행 상태
  let queue = [];    // 남은 비트
  let ui = null;     // { log, act }
  let busy = false;

  const typeOf = b => ['say', 'hist', 'cross', 'echo', 'note', 'set', 'paint', 'sound', 'fx', 'if', 'look', 'choose', 'write', 'ask', 'game']
    .find(k => k in b);

  function fresh(bk) {
    const v = { ...bk.start };
    return {
      book: bk.id, scene: 0, v, flags: {}, notes: [], echoes: [], writes: [],
      track: bk.id === 'orwell' ? [{ s: -1, side: v.side, people: v.people }] : [],
      seen: [], sent: [], dispatches: [], seized: null, book2: null,
    };
  }

  function begin(bookId, saved) {
    book = BOOKS[bookId];
    S = saved ? clone(saved) : fresh(book);
    ui = App.playShell(book);
    runScene(S.scene);
  }

  function runScene(i) {
    S.scene = i;
    Store.saveBook(book.id, clone(S));
    const sc = book.scenes[i];
    App.setScene(book, sc, i, S);
    Plates.show(sc.paint, sc.params || {});
    Sound.ambient(sc.sound);
    ui.log.innerHTML = '';
    ui.act.innerHTML = '';
    queue = sc.beats.slice();
    window.scrollTo({ top: 0, behavior: 'auto' });
    step();
  }

  // 즉시 처리되는 비트는 이어서 돌고, 사람의 손이 필요한 비트에서 멈춘다.
  function step() {
    while (queue.length) {
      const b = queue.shift();
      const r = run(b);
      if (r === 'wait') { waitNext(); return; }
      if (r === 'async') return;
    }
    sceneEnd();
  }

  function waitNext(label) {
    ui.act.innerHTML = '';
    const btn = h('button', { class: 'next', onclick: () => { ui.act.innerHTML = ''; step(); } }, label || '계속', h('kbd', null, 'Space'));
    ui.act.append(btn);
    reveal(btn);
  }

  // 새로 쌓인 것이 보이도록 굴린다. 좁은 화면에서는 위에 붙은 그림 판만큼 가려진다.
  function topInset() {
    const bar = document.querySelector('.bar');
    let t = bar ? bar.getBoundingClientRect().bottom : 0;
    const plate = document.querySelector('.plate');
    if (plate && window.innerWidth <= 860) t = Math.max(t, plate.getBoundingClientRect().bottom);
    return t;
  }
  function reveal(el) {
    requestAnimationFrame(() => {
      if (!el.isConnected) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight, top = topInset();
      let dy = 0;
      if (r.height > vh - top - 24) {
        // 화면보다 긴 것: 아직 보지 못한 경우에만 머리를 맞춘다
        if (r.top > vh * 0.62) dy = r.top - top - 10;
      } else if (r.bottom > vh - 16) dy = r.bottom - (vh - 16);
      else if (r.top < top) dy = r.top - top - 10;
      if (Math.abs(dy) > 2) window.scrollBy({ top: dy, behavior: reduceMotion() ? 'auto' : 'smooth' });
    });
  }

  function add(el) {
    ui.log.append(el);
    reveal(el);
    return el;
  }

  const fmt = t => esc(t).replace(/\*([^*]+)\*/g, '<em>$1</em>');

  function run(b) {
    const t = typeOf(b);
    switch (t) {
      case 'say': {
        const p = h('p', { class: 'p' + (b.cls ? ' ' + b.cls : '') });
        if (b.who) p.append(h('span', { class: 'who' }, b.who));
        p.insertAdjacentHTML('beforeend', fmt(b.say));
        add(p);
        return 'wait';
      }
      case 'hist':
        add(h('div', { class: 'hist' }, h('b', null, '역사 메모'), b.hist));
        return 'wait';
      case 'cross':
        add(h('div', { class: 'cross', html:
          '<svg viewBox="0 0 28 22" aria-hidden="true"><path d="M2 3h10a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M26 3H16a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h11z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' +
          '<div><b>같은 무렵, 다른 수첩</b>' + esc(b.cross) + '</div>' }));
        return 'wait';
      case 'echo':
        add(echoCard(b.echo));
        return 'wait';
      case 'note':
        addNote(b.note, 'obs');
        return 'go';
      case 'set':
        applySet(b.set);
        return 'go';
      case 'paint':
        Plates.show(b.paint, b.params || {});
        return 'go';
      case 'sound':
        Sound.ambient(b.sound);
        return 'go';
      case 'fx':
        return fx(b.fx);
      case 'if': {
        const ok = !!b.if(S);
        queue.unshift(...((ok ? b.then : b.else) || []));
        return 'go';
      }
      case 'look': look(b.look); return 'async';
      case 'choose': choose(b.choose); return 'async';
      case 'write': write(b.write); return 'async';
      case 'ask': ask(b.ask); return 'async';
      case 'game': game(b); return 'async';
    }
    console.warn('알 수 없는 비트', b);
    return 'go';
  }

  function fx(kind) {
    if (kind === 'flash') {
      Sound.fx('shot');
      Plates.flash();
      ui.act.innerHTML = '';
      setTimeout(step, reduceMotion() ? 200 : 1500);
      return 'async';
    }
    if (kind === 'seize') {
      S.seized = S.scene;
      Sound.fx('stamp');
      App.toast('경찰이 수첩을 가져갔다', '지금까지 적은 것은 이제 당신의 기억 속에만 있다.');
      App.updateNoteCount(S);
      return 'go';
    }
    if (kind === 'imagine') { Plates.imagine(true); return 'go'; }
    if (kind === 'imagine-off') { Plates.imagine(false); return 'go'; }
    if (kind === 'shake') { Plates.shake(); return 'go'; }
    return 'go';
  }

  // ── 상태 ──────────────────────────────────────────────
  function addNote(text, kind, quiet) {
    S.notes.push({ s: S.scene, text, kind: kind || 'obs' });
    App.updateNoteCount(S, true);
    if (!quiet) App.toast('수첩에 적었다', text);
  }
  function applySet(d) {
    for (const [k, v] of Object.entries(d)) S.v[k] = Math.max(0, Math.min(10, (S.v[k] || 0) + v));
    App.meters(book, S, d);
  }
  function addEcho(id) { if (!S.echoes.includes(id)) S.echoes.push(id); }

  function echoCard(id, mine) {
    const e = ECHOES[id];
    if (!e) return h('p', null, '');
    addEcho(id);
    const by = e.kind === 'quote'
      ? (e.by === 'orwell' ? '오웰은 이렇게 썼다' : e.by === 'kazan' ? '카잔차키스는 이렇게 남겼다' : BY_LABEL[e.by])
      : '기록에 따르면';
    const fig = h('figure', { class: 'echo' },
      h('div', { class: 'echo-k' }, h('span', { class: 'by' }, by), h('span', { class: 'kind ' + e.kind }, KIND_LABEL[e.kind])),
      h('blockquote', { class: 'echo-ko' + (e.kind === 'quote' ? '' : ' gisty') }, e.ko),
      e.orig ? h('p', { class: 'echo-orig', lang: e.by === 'kazan' ? 'el' : 'en' }, e.orig) : null,
      h('figcaption', { class: 'echo-src' }, e.src),
      e.more ? h('p', { class: 'echo-more' }, e.more) : null,
    );
    if (mine) {
      const you = h('div', { class: 'echo-you' },
        h('span', { class: 'prompt' }, '당신이 적은 문장'),
        h('span', { class: 'mine' }, mine.text));
      if (mine.res != null) you.append(h('span', { class: 'res r' + mine.res }, RES_LINE[mine.res]));
      if (mine.reply) you.append(h('span', { class: 'echo-more' }, mine.reply));
      fig.append(you);
    }
    return fig;
  }

  // ── 둘러보기 ──────────────────────────────────────────
  function look(L) {
    const need = Math.min(L.need || L.spots.length, L.spots.length);
    const seen = new Set();
    const chips = h('div', { class: 'look-list' });
    const count = h('span', { class: 'count-line' });
    const foot = h('div', { class: 'look-hint' }, count);
    const next = h('button', { class: 'next', hidden: true, onclick: finish }, '계속', h('kbd', null, 'Space'));
    foot.append(next);
    ui.act.innerHTML = '';
    ui.act.append(h('div', { class: 'prompt' }, L.prompt), chips, foot);

    const pick = sp => {
      if (seen.has(sp.id)) return;
      seen.add(sp.id);
      Plates.markSpot(sp.id);
      chipEls[sp.id].classList.add('seen');
      chipEls[sp.id].setAttribute('aria-pressed', 'true');
      Sound.fx('page');
      ui.log.append(h('p', { class: 'seen-line' }, h('b', null, sp.label), sp.text));
      if (sp.note) addNote(sp.note, 'obs');
      upd();
      reveal(ui.act);
    };
    const chipEls = {};
    for (const sp of L.spots) {
      chipEls[sp.id] = h('button', { 'aria-pressed': 'false', onclick: () => pick(sp) }, sp.label);
      chips.append(chipEls[sp.id]);
    }
    Plates.setSpots(L.spots, pick);
    function upd() {
      count.textContent = seen.size >= need
        ? (seen.size < L.spots.length ? `${seen.size} / ${L.spots.length} — 더 둘러봐도 좋다` : '다 둘러보았다')
        : `${seen.size} / ${need}`;
      next.hidden = seen.size < need;
    }
    function finish() {
      Plates.setSpots([]);
      ui.act.innerHTML = '';
      step();
    }
    upd();
    reveal(ui.act);
  }

  // ── 고르기 ────────────────────────────────────────────
  function choose(C) {
    ui.act.innerHTML = '';
    if (C.prompt) ui.act.append(h('div', { class: 'prompt' }, C.prompt));
    const box = h('div', { class: 'opts' });
    let tries = 0;
    C.options.forEach((o, i) => {
      box.append(h('button', { class: 'opt', onclick: () => pick(o) }, h('span', { class: 'k' }, String(i + 1)), h('span', null, o.label)));
    });
    ui.act.append(box);
    reveal(ui.act);

    function pick(o) {
      if (C.voice && tries === 0) {
        tries++;
        box.querySelectorAll('.opt').forEach(b => b.classList.add('faint'));
        ui.log.append(h('p', { class: 'p dim' }, '목소리가 나오지 않는다. 쉰 바람 소리만 새어 나온다. 다시 한번.'));
        Sound.fx('breath');
        reveal(ui.act);
        return;
      }
      ui.act.innerHTML = '';
      add(h('p', { class: 'act' }, o.act || o.label));
      if (o.flag) S.flags[o.flag] = true;
      if (o.set) applySet(o.set);
      if (o.note) addNote(o.note, 'obs');
      const cont = [...(o.then || [])];
      if (o.again) cont.push({ choose: { ...C, voice: false, options: C.options.filter(x => x !== o) } });
      else cont.push(...(C.after || []));
      queue.unshift(...cont);
      step();
    }
  }

  // ── 수첩에 적기 → 그들의 문장 ─────────────────────────
  function write(W) {
    ui.act.innerHTML = '';
    if (W.showFirst) {
      const first = S.writes.find(w => w.s === 0);
      if (first) ui.act.append(h('div', { class: 'saw' }, h('b', null, '첫 장에 적었던 문장'), h('p', null, first.text)));
    }
    if (W.chart) ui.act.append(App.miniChart(S));
    if (W.gap) ui.act.append(App.miniGap(S));
    ui.act.append(h('div', { class: 'prompt' }, h('b', null, '수첩에 적는다. '), W.prompt));
    const box = h('div', { class: 'opts' });
    W.options.forEach((o, i) => box.append(
      h('button', { class: 'opt write', onclick: () => pick(o) }, h('span', { class: 'k' }, String(i + 1)), h('span', null, o.text))));
    ui.act.append(box);
    reveal(ui.act);

    function pick(o) {
      ui.act.innerHTML = '';
      Sound.fx('pencil');
      add(h('p', { class: 'note-ink' }, h('small', null, '수첩에 적었다'), o.text));
      S.notes.push({ s: S.scene, text: o.text, kind: 'thought' });
      App.updateNoteCount(S, true);
      S.writes.push({ s: S.scene, echo: W.echo || null, text: o.text, res: o.res == null ? null : o.res, prompt: W.prompt });
      if (W.echo) add(echoCard(W.echo, { text: o.text, res: o.res, reply: o.reply }));
      waitNext();
    }
  }

  // ── 묻기 ──────────────────────────────────────────────
  function ask(A) {
    const asked = A._asked || 0;
    const rest = A.questions;
    ui.act.innerHTML = '';
    ui.act.append(h('div', { class: 'prompt' }, A.prompt));
    const box = h('div', { class: 'opts' });
    rest.forEach((q, i) => box.append(h('button', { class: 'opt', onclick: () => pick(q) }, h('span', { class: 'k' }, String(i + 1)), h('span', null, q.q))));
    if (asked >= A.need || !rest.length) {
      box.append(h('button', { class: 'opt', onclick: leave }, h('span', { class: 'k' }, String(rest.length + 1)), h('span', null, '인사를 하고 일어선다')));
    }
    ui.act.append(box);
    reveal(ui.act);
    function pick(q) {
      ui.act.innerHTML = '';
      add(h('p', { class: 'act' }, q.q));
      const left = rest.filter(x => x !== q);
      queue.unshift(...q.a.map(b => (b.say && !b.who ? { ...b, who: A.who } : b)),
        ...(left.length || asked + 1 >= A.need ? [{ ask: { ...A, questions: left, _asked: asked + 1 } }] : []));
      step();
    }
    function leave() { ui.act.innerHTML = ''; step(); }
  }

  // ── 미니 게임 ─────────────────────────────────────────
  function game(b) {
    ui.act.innerHTML = '';
    const ctx = {
      S, book, beat: b, host: ui.act,
      add, reveal,
      say: text => add(h('p', { class: 'p' }, text)),
      note: (text, kind) => addNote(text, kind),
      set: applySet,
      flag: (k, v = true) => { S.flags[k] = v; },
      done: () => { ui.act.innerHTML = ''; step(); },
    };
    const g = GAMES[b.game];
    if (!g) { console.warn('게임 없음', b.game); ctx.done(); return; }
    g(ctx);
    reveal(ui.act);
  }

  // ── 장면의 끝 ─────────────────────────────────────────
  function sceneEnd() {
    if (book.id === 'orwell') S.track.push({ s: S.scene, side: S.v.side, people: S.v.people });
    const last = S.scene === book.scenes.length - 1;
    const nextSc = book.scenes[S.scene + 1];
    const end = h('div', { class: 'scene-end' },
      h('p', { class: 'p dim' }, `— ${book.scenes[S.scene].title} —`),
      h('button', { class: 'next', onclick: () => (last ? finish() : runScene(S.scene + 1)) },
        last ? '수첩을 덮는다' : `다음: ${nextSc.when} · ${nextSc.title}`, h('kbd', null, 'Space')));
    ui.act.innerHTML = '';
    ui.act.append(end);
    reveal(end);
    // 장면을 마친 상태를 기록해 두고, 다시 열면 다음 장면부터 시작한다.
    const snap = clone(S);
    if (!last) { snap.scene = S.scene + 1; Store.saveBook(book.id, snap); }
  }

  function finish() {
    Store.finishBook(book.id, clone(S));
    Sound.ambient(null);
    App.bookEnd(book.id);
  }

  return {
    begin, step,
    get S() { return S; },
    get book() { return book; },
    echoCard, h,
  };
})();
