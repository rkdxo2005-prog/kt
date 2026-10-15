/* ──────────────────────────────────────────────────────────────
   게임 진행: 상태, 화면, 애니매틱 플레이어, 연출 노트
   ────────────────────────────────────────────────────────────── */
(function (G) {
  'use strict';
  const K = G.KONTI;
  const ST = K.STORY;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduceMotion = () => G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 저장 (이 브라우저 전용 편의 기능) ── */
  const LS_KEY = 'konti-maccha-v1';
  const store = {
    get() { try { return JSON.parse(G.localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; } },
    set(v) { try { G.localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } },
    clear() { try { G.localStorage.removeItem(LS_KEY); } catch (e) { /* 무시 */ } },
  };

  /* ── 진행 단계 ── */
  const STEPS = [{ type: 'title' }, { type: 'pre', d: ST.PRE }];
  ST.SCENES.forEach((sc) => sc.decisions.forEach((d) => {
    if (d.fixed) return;
    STEPS.push({ type: d.kind === 'rhythm' ? 'rhythm' : 'dec', sc, d });
  }));
  STEPS.push({ type: 'final' });
  const DECISIONS = STEPS.filter((s) => s.type === 'dec' || s.type === 'rhythm');
  const MAX_PTS = DECISIONS.length * 3;

  let state = { step: 0, name: '', aspect: 1.85, choices: {}, sel: null, peek: null, guides: true, take: 1 };

  /* ── 파생 데이터 ── */
  function optOf(d, id) { return d.options.find((o) => o.id === id); }
  function sceneState(sc, choices, upto) {
    const cuts = [], byId = {};
    let rhythm = null;
    for (const d of sc.decisions) {
      if (d === upto) break;
      const code = 'S' + sc.num + ' ' + d.cut;
      if (d.fixed) {
        const c = { id: d.cut, code, shot: K.composeShot(d.shot, null, { code }), fixed: true, decs: [], sheet: d.sheet, sc, note: d.note };
        cuts.push(c); byId[d.cut] = c; continue;
      }
      const oid = choices[d.id];
      if (!oid) break;
      const o = optOf(d, oid);
      if (d.kind === 'rhythm') { rhythm = { d, o }; continue; }
      if (d.modifies && byId[d.cut]) {
        const c = byId[d.cut];
        c.shot = K.composeShot(c.shot, o.shot, { code });
        c.decs.push({ d, o });
      } else {
        const c = { id: d.cut, code, shot: K.composeShot(d.base, o.shot, { code }), decs: [{ d, o }], sheet: d.sheet, sc };
        cuts.push(c); byId[d.cut] = c;
      }
    }
    return { cuts, byId, rhythm };
  }
  function allCuts(choices) {
    const out = [];
    for (const sc of ST.SCENES) {
      const ss = sceneState(sc, choices || state.choices);
      out.push(...ss.cuts);
    }
    return out;
  }
  function previewShot(step, oid) {
    const { sc, d } = step;
    const ss = sceneState(sc, state.choices, d);
    const o = optOf(d, oid);
    const base = d.modifies && ss.byId[d.cut] ? ss.byId[d.cut].shot : d.base;
    return K.composeShot(base, o.shot, { code: 'S' + sc.num + ' ' + d.cut });
  }
  function prevCutFor(step) {
    const ss = sceneState(step.sc, state.choices, step.d);
    return ss.cuts[ss.cuts.length - 1] || null;
  }
  function sheetFor(step) {
    if (!step.d.modifies) return step.d.sheet || {};
    const ss = sceneState(step.sc, state.choices, step.d);
    return (ss.byId[step.d.cut] && ss.byId[step.d.cut].sheet) || {};
  }
  function scoreOf(choices) {
    let pts = 0, bonus = 0, n = 0;
    const tally = { ok: 0, keep: 0, soso: 0, ng: 0 };
    const bonusNotes = [];
    for (const s of DECISIONS) {
      const oid = choices[s.d.id];
      if (!oid) continue;
      const o = optOf(s.d, oid);
      pts += ST.GRADE[o.grade].pts; tally[o.grade]++; n++;
      if (s.d.bonus) { const b = s.d.bonus(choices); if (b) { bonus += b.pts; bonusNotes.push(b.text); } }
    }
    return { pts, bonus, n, tally, bonusNotes, max: n * 3 };
  }

  /* ── 렌더 캐시 ── */
  const cache = new Map();
  function panel(shot, opts) {
    opts = Object.assign({ aspect: state.aspect }, opts || {});
    const key = JSON.stringify([shot, opts]);
    let s = cache.get(key);
    if (!s) {
      s = K.renderShot(shot, opts);
      cache.set(key, s);
      if (cache.size > 320) cache.delete(cache.keys().next().value);
    }
    return s;
  }
  const planCache = new Map();
  function plan(shot) {
    const key = JSON.stringify(shot);
    let s = planCache.get(key);
    if (!s) { s = K.renderPlan(shot); planCache.set(key, s); if (planCache.size > 120) planCache.delete(planCache.keys().next().value); }
    return s;
  }
  function specOf(shot, aspect) { return K.shotSpec(shot, aspect || state.aspect); }
  function camLine(shot) {
    const sp = specOf(shot);
    return [sp.size, sp.angle, sp.lens, sp.move].filter(Boolean).join(' · ');
  }
  function hasMotion(shot) {
    return !!((shot.move && shot.move.type && shot.move.type !== 'static') || (shot.cast || []).some((c) => c.move) || shot.trainV);
  }

  /* ── 공통 조각 ── */
  function chip(grade) { const g = ST.GRADE[grade]; return '<span class="chip ' + grade + '">' + esc(g.label) + '</span>'; }
  function today() { const d = new Date(); return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0'); }
  function directorName() { return state.name && state.name.trim() ? state.name.trim() : '무명 감독'; }
  function firstSentence(t) { const m = String(t).match(/^.+?[.!?](\s|$)/); return m ? m[0].trim() : t; }

  /* ── 상단 바 ── */
  function renderTop() {
    const st = STEPS[state.step];
    const cur = st.type === 'title' ? -1 : st.type === 'pre' ? 0 : st.type === 'final' ? 7 : st.sc.num;
    const items = [['PRE', 0]].concat(ST.SCENES.map((s) => ['S#' + s.num, s.num])).concat([['콘티북', 7]]);
    $('#progress').innerHTML = items.map(([t, i]) => '<span class="pg' + (i === cur ? ' now' : i < cur ? ' done' : '') + '"' + (i === cur ? ' aria-current="step"' : '') + '>' + t + '</span>').join('');
    const sc = scoreOf(state.choices);
    $('#score').innerHTML = sc.n ? '<b>' + (sc.pts + sc.bonus) + '</b>/' + sc.max + '점 · OK ' + sc.tally.ok + ' · NG ' + sc.tally.ng : '';
  }

  /* ── 필름 스트립 ── */
  function renderStrip() {
    const st = STEPS[state.step];
    const el = $('#strip');
    if (st.type === 'title' || st.type === 'final') { el.hidden = true; return; }
    el.hidden = false;
    const cuts = allCuts();
    const list = cuts.map((c, i) => {
      const dots = c.fixed ? '<i class="dot fixed" title="대본에 고정된 컷"></i>' : c.decs.map((x) => '<i class="dot ' + x.o.grade + '" title="' + esc(x.d.title + ': ' + ST.GRADE[x.o.grade].label) + '"></i>').join('');
      return '<button class="strip-item" data-act="play-cut" data-i="' + i + '" aria-label="' + esc(c.code + ' 애니매틱 보기') + '">' + panel(c.shot, { thumb: true }) + '<span class="c"><span>' + esc(c.code) + '</span><span>' + dots + '</span></span></button>';
    }).join('');
    $('#strip-list').innerHTML = list || '<span class="strip-empty">아직 찍은 컷이 없습니다. 첫 결정을 내리면 여기에 콘티가 쌓입니다.</span>';
    $('#strip-count').textContent = cuts.length ? cuts.length + '컷 · 클릭하면 애니매틱' : '';
  }

  /* ── 타이틀 ── */
  let demoTimer = null;
  const DEMO = [];
  function buildDemo() {
    if (DEMO.length) return;
    const s1 = ST.SCENES[0], s2 = ST.SCENES[1], s4 = ST.SCENES[3], s6 = ST.SCENES[5];
    const c1 = K.composeShot(K.composeShot(K.composeShot(s1.decisions[0].base, s1.decisions[0].options[0].shot), s1.decisions[1].options[0].shot), s1.decisions[2].options[0].shot, { code: 'S1 C1' });
    DEMO.push({ shot: c1, cap: '오프닝 — 비 내리는 도시, 크레인 다운' });
    DEMO.push({ shot: K.composeShot(s2.decisions[1].base, s2.decisions[1].options[0].shot, { code: 'S2 C2' }), cap: '리버스 숏 — 180도 선을 지킨 어깨 너머' });
    DEMO.push({ shot: K.composeShot(s4.decisions[2].base, s4.decisions[2].options[0].shot, { code: 'S4 C3' }), cap: '깨달음 — 안전등 아래 느린 푸시 인' });
    DEMO.push({ shot: K.composeShot(s6.decisions[1].base, s6.decisions[1].options[0].shot, { code: 'S6 C2' }), cap: '엔딩 — 프리즈 프레임, 사진이 된다' });
  }
  function viewTitle() {
    buildDemo();
    const saved = store.get();
    const canResume = saved && saved.step > 1 && saved.step < STEPS.length - 1;
    const d0 = DEMO[0];
    return '<section class="title-screen wrap">' +
      '<div class="title-copy">' +
      '<span class="eyebrow">연출 의사결정 게임 · 단편영화 「막차」</span>' +
      '<h1>오늘 밤,<br>당신이 감독이다</h1>' +
      '<p class="logline">' + esc(ST.logline) + '</p>' +
      '<p class="lede">여섯 개의 씬, 열여섯 번의 결정. 샷 사이즈와 앵글, 180도 법칙, 조명, 편집 리듬까지. 선택할 때마다 콘티와 평면도가 다시 그려지고, 현장의 선배 감독이 이유를 짚어 준다.</p>' +
      '<ol class="how">' +
      '<li><span><b>시나리오와 연출 의도</b>를 읽는다.</span></li>' +
      '<li><span>선택지마다 그려진 <b>콘티 패널과 평면도</b>를 비교하고 한 컷을 고른다.</span></li>' +
      '<li><span><b>OK · KEEP · 아쉬움 · NG</b> 판정과 이유를 듣는다. 끝에는 완성된 콘티북과 애니매틱이 기다린다.</span></li>' +
      '</ol>' +
      '<div class="title-actions">' +
      '<button class="btn primary" data-act="start">' + (canResume ? '처음부터 촬영' : '촬영 시작') + ' <span class="kbd">Enter</span></button>' +
      (canResume ? '<button class="btn" data-act="resume">이어서 하기 · ' + esc(stepLabel(saved.step)) + '</button>' : '') +
      '<button class="btn ghost" data-act="notes">연출 노트 먼저 보기</button>' +
      '</div></div>' +
      '<div class="title-board">' +
      '<div class="clapper" aria-label="슬레이트">' +
      '<div class="sticks"></div>' +
      '<div class="rows">' +
      '<div class="cell"><span class="k">Prod.</span><span class="v">막차</span></div>' +
      '<div class="cell"><span class="k">Scene</span><span class="v">1</span></div>' +
      '<div class="cell"><span class="k">Take</span><span class="v">' + state.take + '</span></div>' +
      '<div class="cell wide"><label class="k" for="director">Director · 감독 이름</label><input class="v" id="director" maxlength="16" placeholder="무명 감독" value="' + esc(state.name) + '" autocomplete="off"></div>' +
      '<div class="cell"><span class="k">Camera</span><span class="v">A</span></div>' +
      '<div class="cell"><span class="k">Roll</span><span class="v">001</span></div>' +
      '<div class="cell"><span class="k">Date</span><span class="v">' + today() + '</span></div>' +
      '</div></div>' +
      '<figure class="demo-sheet" style="margin:0"><div class="demo-frame" id="demo-frame">' + panel(d0.shot, { aspect: 1.85 }) + '</div>' +
      '<figcaption class="demo-cap"><span id="demo-cap">' + esc(d0.cap) + '</span><span class="mono" id="demo-code">S1 C1 · 예시 콘티</span></figcaption></figure>' +
      '</div></section>';
  }
  function startDemo() {
    clearInterval(demoTimer);
    let i = 0;
    demoTimer = setInterval(() => {
      const fr = $('#demo-frame');
      if (!fr) { clearInterval(demoTimer); return; }
      i = (i + 1) % DEMO.length;
      fr.innerHTML = panel(DEMO[i].shot, { aspect: 1.85 });
      $('#demo-cap').textContent = DEMO[i].cap;
      $('#demo-code').textContent = DEMO[i].shot.code + ' · 예시 콘티';
    }, 3600);
  }
  function stepLabel(i) {
    const s = STEPS[i];
    if (!s) return '';
    if (s.type === 'pre') return '화면비';
    if (s.type === 'final') return '콘티북';
    if (s.type === 'title') return '타이틀';
    return 'S#' + s.sc.num + ' ' + s.d.title;
  }

  /* ── 결정 화면 ── */
  function screenplayHtml(sc) {
    return sc.script.map((l) => l.t === 'a' ? '<p>' + esc(l.x) + '</p>' : '<p class="dl"><span class="who">' + esc(l.who) + '</span>' + (l.p ? '<span class="par">(' + esc(l.p) + ')</span>' : '') + esc(l.x) + '</p>').join('');
  }
  function briefHtml(step) {
    if (step.type === 'pre') {
      return '<aside class="brief">' +
        '<div class="slate-mini"><span class="sn"><span>PRE-PRODUCTION</span><span>TAKE ' + state.take + '</span></span><span class="hd">「막차」 촬영 준비</span></div>' +
        '<details class="screenplay" open><summary>로그라인</summary><div class="sp"><p>' + esc(ST.logline) + '</p><p>비 오는 도시, 24시 식당, 암실, 그리고 막차의 플랫폼. 대사보다 이미지로 말하는 18분짜리 단편.</p></div></details>' +
        '<div class="intent"><span class="label">연출 의도</span><p>영화 전체를 담을 그릇을 고른다. 모든 콘티는 이 비율로 그려진다.</p></div></aside>';
    }
    const sc = step.sc;
    return '<aside class="brief">' +
      '<div class="slate-mini"><span class="sn"><span>Scene ' + sc.num + ' / 6</span><span>TAKE ' + state.take + '</span></span><span class="hd">' + esc(sc.heading) + '</span></div>' +
      '<details class="screenplay" open><summary>시나리오 S#' + sc.num + '</summary><div class="sp">' + screenplayHtml(sc) + '</div></details>' +
      '<div class="intent"><span class="label">연출 의도</span><p>' + esc(sc.intent) + '</p></div>' +
      '</aside>';
  }
  function notesHtml(sheet, shot, extraCam) {
    const sp = shot ? specOf(shot) : null;
    return '<dl class="notes">' +
      '<dt>Action</dt><dd>' + esc(sheet.action || '') + '</dd>' +
      (sheet.dial ? '<dt>Dial.</dt><dd>' + esc(sheet.dial) + '</dd>' : '') +
      '<dt>Camera</dt><dd class="cam">' + esc(extraCam || (shot ? camLine(shot) : '')) + '</dd>' +
      '<dt>SFX</dt><dd>' + esc(sheet.sfx || '—') + '</dd>' +
      (sp ? '<dt>Time</dt><dd>' + sp.dur + '초 · ' + esc(sp.look) + '</dd>' : '') +
      '</dl>';
  }
  function specListHtml(shot, aspect) {
    const sp = specOf(shot, aspect);
    return '<dl class="spec-list">' +
      (sp.size ? '<dt>SIZE</dt><dd>' + esc(sp.size) + '</dd>' : '') +
      '<dt>ANGLE</dt><dd>' + esc(sp.angle) + '</dd>' +
      '<dt>LENS</dt><dd>' + esc(sp.lens) + '</dd>' +
      '<dt>MOVE</dt><dd>' + esc(sp.move) + '</dd>' +
      '<dt>LIGHT</dt><dd>' + esc(sp.look) + '</dd>' +
      '</dl>';
  }
  function stampFor(o) { return o && o.grade ? { grade: o.grade, text: ST.GRADE[o.grade].label } : null; }

  function viewDecision(step) {
    const d = step.d;
    const isPre = step.type === 'pre', isRh = step.type === 'rhythm';
    const chosen = state.choices[d.id];
    const revealed = !!chosen;
    const curId = revealed ? (state.peek || chosen) : (state.sel || d.options[0].id);
    const cur = optOf(d, curId);
    const cutCode = isPre ? 'PRE' : isRh ? 'EDIT' : d.cut;
    let html = '<div class="play wrap">' + briefHtml(step) + '<section class="board" aria-labelledby="q-title">';
    html += '<div class="q-head"><span class="cut-code">' + esc(cutCode) + '</span>' + (d.lesson ? '<span class="lesson-tag">' + esc(d.lesson) + '</span>' : '') + (d.modifies ? '<span class="lesson-tag" style="color:var(--ink-3)">같은 컷 다듬기</span>' : '') + '<h2 id="q-title">' + esc(d.title) + '</h2></div>';
    html += '<p class="question">' + esc(d.q) + '</p>';
    html += '<p class="hint">' + esc(d.hint) + '</p>';
    html += '<div id="preview">' + previewHtml(step, cur, revealed) + '</div>';
    // 선택지
    html += '<div class="options" role="radiogroup" aria-label="선택지">';
    d.options.forEach((o) => {
      const checked = revealed ? o.id === chosen : o.id === state.sel;
      const previewing = o.id === curId;
      let thumb;
      if (isPre) thumb = panel(ST.PRE.shot, { aspect: o.aspect, thumb: true, annotate: false });
      else if (isRh) thumb = miniTimeline(o.rhythm);
      else thumb = panel(previewShot(step, o.id), { thumb: true });
      html += '<button class="opt' + (previewing ? ' previewing' : '') + '" role="radio" aria-checked="' + checked + '" data-act="opt" data-opt="' + o.id + '" aria-label="' + esc(o.id + '안: ' + o.label) + '">' +
        '<div class="thumb">' + thumb + '</div>' +
        '<div class="meta"><span class="top"><span class="letter">' + o.id + '</span><span class="name">' + esc(o.label) + '</span></span>' +
        '<span class="spec">' + esc(o.spec) + '</span><span class="desc">' + esc(o.desc) + '</span></div>' +
        (revealed && o.grade ? chip(o.grade) : '') + '</button>';
    });
    html += '</div>';
    if (!revealed) {
      const sel = state.sel;
      html += '<div class="decide-bar"><button class="btn primary" data-act="lock"' + (sel ? '' : ' disabled') + '>' + (sel ? sel + '안으로 결정 — 컷!' : '선택지를 고르세요') + ' <span class="kbd">Enter</span></button>' +
        '<span class="note">카드를 눌러 콘티를 비교하세요 · 키보드 1–' + d.options.length + '</span></div>';
    } else {
      html += feedbackHtml(step, optOf(d, chosen));
    }
    html += '</section></div>';
    return html;
  }

  function previewHtml(step, cur, revealed) {
    const d = step.d;
    const isPre = step.type === 'pre', isRh = step.type === 'rhythm';
    const stamp = revealed ? stampFor(cur) : null;
    const lbl = revealed ? (cur.id === state.choices[d.id] ? cur.id + '안 · 내 선택' : cur.id + '안 · 비교해 보기') : (state.sel === cur.id ? cur.id + '안 · 선택됨' : cur.id + '안 · 미리보기');
    if (isPre) {
      const shot = ST.PRE.shot;
      return '<div class="sheet" style="--ar:' + cur.aspect + '"><div class="sheet-main"><div class="panel-box">' + panel(shot, { aspect: cur.aspect, guides: state.guides, stamp: null }) + '</div>' +
        '<div class="panel-tools"><button class="btn small" data-act="guides" aria-pressed="' + state.guides + '">가이드 선</button><span class="preview-label">' + esc(lbl) + ' · ' + esc(cur.label) + '</span></div>' +
        notesHtml({ action: '창가 부스, 마주 앉은 서연과 준호.', sfx: '빗소리' }, null, cur.label + ' — ' + cur.spec) + '</div>' +
        '<div class="sheet-side"><span class="side-cap"><span>평면도</span><span>위에서 본 배치</span></span>' + plan(shot) + specListHtml(shot, cur.aspect) + '</div></div>';
    }
    if (isRh) return rhythmHtml(step, cur);
    const shot = previewShot(step, cur.id);
    const sheet = sheetFor(step);
    const tools = '<div class="panel-tools">' +
      (hasMotion(shot) ? '<button class="btn small" data-act="play-move">▶ 무빙 재생</button>' : '') +
      (d.compare ? '<button class="btn small" data-act="play-cmp">▶ 이어 붙여 보기</button>' : '') +
      '<button class="btn small" data-act="guides" aria-pressed="' + state.guides + '">가이드 선</button>' +
      '<span class="preview-label">' + esc(lbl) + '</span></div>';
    if (d.compare) {
      const prev = prevCutFor(step);
      return '<div class="sheet compare"><div class="cmp">' +
        '<div class="cmp-cell"><span class="cmp-cap"><b>앞 컷 · ' + esc(prev ? prev.code : '') + '</b><span>' + esc(prev ? camLine(prev.shot) : '') + '</span></span><div id="cmp-prev">' + (prev ? panel(prev.shot, { guides: state.guides }) : '') + '</div></div>' +
        '<div class="cut-mark" aria-hidden="true">CUT<br>→</div>' +
        '<div class="cmp-cell"><span class="cmp-cap"><b>이번 컷 · ' + esc(shot.code) + '</b><span>' + esc(cur.label) + '</span></span><div class="panel-box" id="panel-box">' + panel(shot, { guides: state.guides, stamp }) + '</div></div>' +
        '</div>' + tools +
        '<div class="cmp-bottom">' + notesHtml(sheet, shot) + '<div class="sheet-side"><span class="side-cap"><span>평면도</span><span>' + (shot.axis ? '빨간 점선 = 180° 선' : '파란 화살표 = 동선') + '</span></span>' + plan(shot) + '</div></div></div>';
    }
    return '<div class="sheet" style="--ar:' + state.aspect + '"><div class="sheet-main"><div class="panel-box" id="panel-box">' + panel(shot, { guides: state.guides, stamp }) + '</div>' + tools + notesHtml(sheet, shot) + '</div>' +
      '<div class="sheet-side"><span class="side-cap"><span>평면도</span><span>' + (shot.axis ? '빨간 점선 = 180° 선' : '위에서 본 배치') + '</span></span>' + plan(shot) + specListHtml(shot) + '</div></div>';
  }

  /* 리듬 */
  function rhythmCuts(step, o) {
    const ss = sceneState(step.sc, state.choices, step.d);
    const c1 = ss.byId.C1 ? ss.byId.C1.shot : null, c2 = ss.byId.C2 ? ss.byId.C2.shot : null;
    const M = ST.MONTAGE;
    const seqs = { 5: [c1, c2, M.feet, M.clock, M.face], 1: [c1], 6: [c1, M.feet, c2, M.clock, M.face, c2] };
    const list = (seqs[o.rhythm.length] || seqs[5]).map((s, i) => K.composeShot(s || M.face, { dur: o.rhythm[i] }, { code: 'S5 M' + (i + 1) }));
    return list;
  }
  function miniTimeline(r) {
    const tot = r.reduce((a, b) => a + b, 0);
    return '<div class="mini-tl" aria-hidden="true">' + r.map((x) => '<i style="flex:' + x + '"></i>').join('') + '</div><div class="ruler" style="padding:0 8px;background:var(--sheet)"><span>0</span><span>' + tot + '초</span></div>';
  }
  function rhythmHtml(step, cur) {
    const cuts = rhythmCuts(step, cur);
    const tot = cur.rhythm.reduce((a, b) => a + b, 0);
    const segs = cuts.map((c, i) => '<div class="seg" style="flex:' + cur.rhythm[i] + '" data-seg="' + i + '">' + panel(c, { thumb: true, annotate: false }).replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ') + '<span class="sec">' + cur.rhythm[i] + 's</span></div>').join('');
    const marks = [];
    for (let s = 0; s <= tot; s += tot > 10 ? 2 : 1) marks.push('<span>' + s + 's</span>');
    return '<div class="sheet compare"><div class="rhythm">' +
      '<div class="panel-box" id="panel-box">' + panel(cuts[0], { guides: false }) + '</div>' +
      '<div class="panel-tools"><button class="btn small" data-act="play-rhythm">▶ 리듬 재생 (' + tot + '초)</button><span class="preview-label">' + esc(cur.id + '안 · ' + cur.label) + '</span></div>' +
      '<div class="timeline" id="timeline">' + segs + '</div><div class="ruler">' + marks.join('') + '</div>' +
      notesHtml(step.d.sheet || {}, null, cur.spec) + '</div></div>';
  }

  function feedbackHtml(step, o) {
    const d = step.d;
    const isPre = step.type === 'pre';
    let html = '<div class="feedback" role="status">';
    if (isPre) html += '<div class="stamp neutral pop">' + esc(o.label.split(' ')[0]) + '<small>화면비 결정</small></div>';
    else html += '<div class="stamp ' + o.grade + ' pop">' + esc(ST.GRADE[o.grade].label) + '<small>+' + ST.GRADE[o.grade].pts + '점 · ' + esc(ST.GRADE[o.grade].name) + '</small></div>';
    html += '<div class="fb-body"><h3>' + esc(o.id + '안 · ' + o.label) + (isPre ? '' : ' — ' + esc(ST.GRADE[o.grade].desc)) + '</h3><p class="why">' + esc(o.why) + '</p>';
    if (d.bonus) { const b = d.bonus(state.choices); if (b) html += '<p class="bonus">' + esc(b.text) + '</p>'; }
    html += '<ul class="others">' + d.options.filter((x) => x.id !== o.id).map((x) => '<li><span class="l">' + x.id + '</span>' + (x.grade ? chip(x.grade) : '<span></span>') + '<span><b>' + esc(x.label) + '</b> — ' + esc(firstSentence(x.why)) + '</span></li>').join('') + '</ul>';
    if (d.tip) html += '<p class="tip">' + esc(d.tip) + '</p>';
    const nx = STEPS[state.step + 1];
    let nextLabel = '다음 결정';
    if (nx && nx.type === 'final') nextLabel = '콘티북 완성하기';
    else if (nx && nx.sc && (!step.sc || nx.sc !== step.sc)) nextLabel = 'S#' + nx.sc.num + '로 이동';
    html += '<div class="fb-actions"><button class="btn primary" data-act="next">' + nextLabel + ' <span class="kbd">→</span></button><span class="note" style="color:var(--ink-3);font-size:var(--step--1)">다른 카드를 눌러 판정을 비교해 보세요</span></div>';
    html += '</div></div>';
    return html;
  }

  /* ── 최종: 콘티북 ── */
  const VERDICTS = [
    [0.9, '칸의 기립박수', '모든 컷이 이유를 갖고 있다. 이 콘티라면 촬영장이 흔들리지 않는다.'],
    [0.75, '장편 데뷔 확정', '문법을 알고, 언제 비틀지도 안다. 몇몇 컷만 다듬으면 된다.'],
    [0.6, '영화제 단편 부문 초청', '감각은 분명하다. 연결 규칙과 의도의 일치를 조금 더 챙기자.'],
    [0.45, '재촬영 회의 소집', '좋은 순간도 있지만 관객이 길을 잃는 곳이 있다. 아래 노트를 확인하자.'],
    [0, '연출부 막내부터 다시', '괜찮다, 모든 감독이 여기서 시작했다. 연출 노트를 펴고 다시 찍어 보자.'],
  ];
  function styleProfile() {
    const tot = { classic: 0, expressive: 0, realist: 0, minimal: 0 };
    const add = (o) => { if (o && o.style) for (const k in o.style) tot[k] += o.style[k]; };
    add(optOf(ST.PRE, state.choices.aspect));
    for (const s of DECISIONS) add(optOf(s.d, state.choices[s.d.id]));
    const top = Object.keys(tot).sort((a, b) => tot[b] - tot[a])[0];
    return { tot, top };
  }
  function viewFinal() {
    const sc = scoreOf(state.choices);
    const pct = sc.max ? sc.pts / sc.max : 0;
    const v = VERDICTS.find((x) => pct >= x[0]);
    const prof = styleProfile();
    const maxS = Math.max(1, ...Object.values(prof.tot));
    const S = ST.STYLE[prof.top];
    let html = '<section class="final wrap">';
    html += '<div class="final-head"><div>' +
      '<span class="eyebrow">콘티북 완성 · ' + today() + '</span>' +
      '<h1>「막차」 콘티북</h1>' +
      '<p class="sub" style="font-family:var(--f-hand);font-size:1.6rem;color:var(--ink)">' + (state.name && state.name.trim() ? '감독 ' + esc(state.name.trim()) : '이름 없는 감독의 첫 작품') + '</p>' +
      '<p class="sub">화면비 ' + esc((optOf(ST.PRE, state.choices.aspect) || {}).label || '1.85 : 1') + ' · 6씬 · ' + allCuts().length + '컷 · 테이크 ' + state.take + '</p>' +
      '<div class="verdict"><span class="big-score">' + (sc.pts + sc.bonus) + '<small>/' + sc.max + '</small></span><span class="tt">' + esc(v[1]) + '<span>' + esc(v[2]) + '</span></span></div>' +
      '<div class="tally">' + ['ok', 'keep', 'soso', 'ng'].map((g) => '<span class="chip ' + g + '">' + ST.GRADE[g].label + ' ' + sc.tally[g] + '</span>').join('') + (sc.bonus ? '<span class="chip ok">보너스 +' + sc.bonus + '</span>' : '') + '</div>' +
      '<div class="final-actions" style="margin-top:18px"><button class="btn primary" data-act="play-all">▶ 전체 애니매틱 보기</button><button class="btn" data-act="copy">샷 리스트 복사</button><button class="btn ghost" data-act="restart">다시 찍기 (테이크 ' + (state.take + 1) + ')</button></div>' +
      '<div id="copy-area"></div>' +
      '</div>' +
      '<div class="style-card"><span class="label">당신의 연출 스타일</span><h2>' + esc(S.name) + '</h2><p>' + esc(S.desc) + '</p><p style="color:var(--ink-3);font-size:var(--step--1)">참고: ' + esc(S.refs) + '</p>' +
      '<div class="bars">' + Object.keys(prof.tot).map((k) => '<div class="row' + (k === prof.top ? ' top' : '') + '"><span>' + esc(ST.STYLE[k].name) + '</span><span class="track"><i style="width:' + Math.round(prof.tot[k] / maxS * 100) + '%"></i></span><span class="n">' + prof.tot[k] + '</span></div>').join('') + '</div></div>' +
      '</div>';
    // 콘티북
    html += '<h2 class="section-title">콘티북</h2>';
    for (const s of ST.SCENES) {
      const ss = sceneState(s, state.choices);
      html += '<div class="sb-scene"><div class="sb-scene-head"><span class="n">S#' + s.num + '</span><span class="h">' + esc(s.heading) + '</span></div><div class="sb-grid">';
      for (const c of ss.cuts) {
        const grades = c.fixed ? '<span class="chip" style="color:var(--g-soso)">고정 컷</span>' : c.decs.map((x) => chip(x.o.grade)).join(' ');
        const sh = c.sheet || {};
        html += '<div class="sb-cell"><span class="cap"><span>' + esc(c.code) + '</span><span>' + grades + '</span></span>' + panel(c.shot, {}) +
          '<span class="spec">' + esc(camLine(c.shot)) + ' · ' + specOf(c.shot).dur + 's</span>' +
          '<span class="hand">' + esc(sh.action || '') + '</span>' + (sh.dial ? '<span class="hand d">' + esc(sh.dial) + '</span>' : '') + '</div>';
      }
      if (ss.rhythm) {
        const r = ss.rhythm.o;
        html += '<div class="sb-cell"><span class="cap"><span>S5 편집 리듬</span>' + chip(r.grade) + '</span>' + miniTimeline(r.rhythm) + '<span class="spec">' + esc(r.spec) + '</span><span class="hand">' + esc(r.label) + '</span></div>';
      }
      html += '</div></div>';
    }
    // 감독 노트
    const missed = DECISIONS.filter((s) => { const o = optOf(s.d, state.choices[s.d.id]); return o && o.grade !== 'ok'; });
    html += '<h2 class="section-title">현장 노트 — 다시 생각해 볼 컷</h2>';
    if (!missed.length) html += '<p>모든 결정이 OK 컷이다. 이제 규칙을 일부러 깨 보는 다른 테이크를 찍어 볼 차례.</p>';
    else {
      html += '<div class="lessons">' + missed.map((s) => {
        const o = optOf(s.d, state.choices[s.d.id]);
        const best = s.d.options.filter((x) => x.grade === 'ok');
        return '<div class="ls ' + o.grade + '"><span class="h">S#' + s.sc.num + ' · ' + esc(s.d.title) + ' <span class="lesson-tag">' + esc(s.d.lesson) + '</span></span>' +
          '<span class="w">내 선택: <b>' + esc(o.label) + '</b> ' + chip(o.grade) + ' → 추천: <b>' + esc(best.map((b) => b.label).join(' / ')) + '</b></span>' +
          '<span class="w">' + esc(best[0] ? best[0].why : '') + '</span></div>';
      }).join('') + '</div>';
    }
    html += '</section>';
    return html;
  }
  function shotListText() {
    const lines = ['「막차」 샷 리스트 — 감독 ' + directorName() + ' (' + today() + ')', '화면비 ' + ((optOf(ST.PRE, state.choices.aspect) || {}).label || '1.85 : 1'), ''];
    for (const s of ST.SCENES) {
      lines.push('S#' + s.num + ' ' + s.heading);
      const ss = sceneState(s, state.choices);
      for (const c of ss.cuts) {
        const sp = specOf(c.shot);
        const sh = c.sheet || {};
        lines.push('  ' + c.code + ' | ' + [sp.size, sp.angle, sp.lens, sp.move, sp.look].filter(Boolean).join(' · ') + ' | ' + sp.dur + 's' + (sh.action ? ' | ' + sh.action : '') + (sh.dial ? ' | ' + sh.dial : ''));
      }
      if (ss.rhythm) lines.push('  편집 리듬: ' + ss.rhythm.o.label + ' (' + ss.rhythm.o.spec + ')');
      lines.push('');
    }
    const sc = scoreOf(state.choices);
    lines.push('점수 ' + (sc.pts + sc.bonus) + '/' + sc.max);
    return lines.join('\n');
  }

  /* ── 화면 그리기 ── */
  function render(keepScroll) {
    const y = G.scrollY;
    const st = STEPS[state.step];
    const view = $('#view');
    clearInterval(demoTimer);
    if (st.type === 'title') { view.innerHTML = viewTitle(); startDemo(); }
    else if (st.type === 'final') view.innerHTML = viewFinal();
    else view.innerHTML = viewDecision(st);
    renderTop();
    renderStrip();
    if (keepScroll) G.scrollTo(0, y);
    persist();
  }
  function persist() {
    store.set({ step: state.step, name: state.name, aspect: state.aspect, choices: state.choices, take: state.take, guides: state.guides });
  }
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  /* ── 씬 전환 슬레이트 ── */
  function showSlate(sc, done) {
    const ov = $('#slate');
    if (reduceMotion()) { done && done(); return; }
    ov.innerHTML = '<div class="clapper" role="dialog" aria-label="씬 ' + sc.num + ' 슬레이트"><div class="sticks"></div><div class="rows">' +
      '<div class="cell"><span class="k">Prod.</span><span class="v">막차</span></div>' +
      '<div class="cell"><span class="k">Scene</span><span class="v">' + sc.num + '</span></div>' +
      '<div class="cell"><span class="k">Take</span><span class="v">' + state.take + '</span></div>' +
      '<div class="cell wide"><span class="k">' + esc(sc.place) + '</span><span class="v">' + esc(sc.heading) + '</span></div>' +
      '<div class="cell"><span class="k">Director</span><span class="v">' + esc(directorName()) + '</span></div>' +
      '<div class="cell"><span class="k">Camera</span><span class="v">A</span></div>' +
      '<div class="cell"><span class="k">Date</span><span class="v">' + today() + '</span></div>' +
      '</div></div><p class="tap">레디… 액션! · 누르면 넘어갑니다</p>';
    ov.hidden = false;
    let closed = false;
    const close = () => { if (closed) return; closed = true; ov.hidden = true; ov.innerHTML = ''; ov.onclick = null; done && done(); };
    ov.onclick = close;
    setTimeout(close, 1700);
  }

  /* ── 진행 ── */
  function go(step) {
    const prev = STEPS[state.step];
    state.step = Math.max(0, Math.min(STEPS.length - 1, step));
    state.sel = null; state.peek = null;
    const st = STEPS[state.step];
    render();
    G.scrollTo(0, 0);
    if (st.sc && (!prev || prev.sc !== st.sc)) showSlate(st.sc);
    const h = $('#q-title') || $('h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  function select(oid) {
    const st = STEPS[state.step];
    if (!st.d) return;
    stopAnim();
    const revealed = !!state.choices[st.d.id];
    if (revealed) state.peek = oid;
    else state.sel = oid;
    // 미리보기와 카드 상태만 갱신
    const cur = optOf(st.d, oid);
    $('#preview').innerHTML = previewHtml(st, cur, revealed);
    document.querySelectorAll('.opt').forEach((b) => {
      const id = b.dataset.opt;
      b.classList.toggle('previewing', id === oid);
      b.setAttribute('aria-checked', String(revealed ? id === state.choices[st.d.id] : id === state.sel));
    });
    const lockBtn = $('[data-act="lock"]');
    if (lockBtn) { lockBtn.disabled = false; lockBtn.innerHTML = oid + '안으로 결정 — 컷! <span class="kbd">Enter</span>'; }
    persist();
  }
  function lock() {
    const st = STEPS[state.step];
    if (!st.d || !state.sel || state.choices[st.d.id]) return;
    state.choices[st.d.id] = state.sel;
    if (st.type === 'pre') state.aspect = optOf(st.d, state.sel).aspect;
    state.peek = null;
    render(true);
    const fb = $('.feedback');
    if (fb) fb.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }
  function restart() {
    state = { step: 0, name: state.name, aspect: 1.85, choices: {}, sel: null, peek: null, guides: state.guides, take: state.take + 1 };
    go(1);
  }

  /* ── 애니매틱 ── */
  let anim = null;
  function stopAnim() { if (anim) { cancelAnimationFrame(anim.raf); anim = null; } }
  function boil() {
    const t = document.getElementById('kSketchAT');
    if (t) t.setAttribute('seed', String(1 + Math.floor(Math.random() * 90)));
  }
  /* 패널 자리에서 바로 재생 */
  function playInline(box, seq, onFrame, onEnd) {
    stopAnim();
    const total = seq.reduce((a, s) => a + s.dur, 0);
    const t0 = performance.now();
    let last = 0;
    const tick = (now) => {
      const el = (now - t0) / 1000;
      if (el >= total) { anim = null; onEnd && onEnd(); return; }
      if (now - last > 85) {
        last = now;
        let acc = 0, i = 0;
        while (i < seq.length - 1 && el > acc + seq[i].dur) { acc += seq[i].dur; i++; }
        const lt = Math.min(1, (el - acc) / seq[i].dur);
        boil();
        box.innerHTML = K.renderShot(seq[i].shot, { aspect: state.aspect, t: lt, anim: true, annotate: false });
        onFrame && onFrame(i, el / total);
      }
      anim.raf = requestAnimationFrame(tick);
    };
    anim = { raf: requestAnimationFrame(tick) };
  }
  function playerSeqAll() {
    const seq = [];
    for (const s of ST.SCENES) {
      const ss = sceneState(s, state.choices);
      if (!ss.cuts.length) continue;
      seq.push({ card: true, title: s.heading, small: 'S#' + s.num, dur: 1.6 });
      let cuts = ss.cuts.map((c) => ({ shot: c.shot, dur: specOf(c.shot).dur, sub: (c.sheet && c.sheet.dial) || '' }));
      if (ss.rhythm) {
        const step = STEPS.find((x) => x.d === ss.rhythm.d);
        cuts = rhythmCuts(step, ss.rhythm.o).map((c) => ({ shot: c, dur: c.dur, sub: '' }));
      }
      seq.push(...cuts);
    }
    seq.push({ card: true, title: '막차', small: '감독 ' + directorName(), dur: 2.4 });
    return seq;
  }
  function openPlayer(seq) {
    const pl = $('#player');
    pl.hidden = false;
    pl.innerHTML = '<div class="screen" id="pl-screen"></div><div class="bar"><button class="btn small" data-act="pl-toggle">일시정지</button><button class="btn small" data-act="pl-restart">처음부터</button><span class="prog"><i id="pl-prog"></i></span><span id="pl-time">0.0s</span><button class="btn small" data-act="pl-close">닫기 <span class="kbd">Esc</span></button></div>';
    const total = seq.reduce((a, s) => a + s.dur, 0);
    let el = 0, playing = true, last = performance.now(), lastDraw = 0, curIdx = -1;
    const screen = $('#pl-screen');
    function draw(force) {
      let acc = 0, i = 0;
      while (i < seq.length - 1 && el > acc + seq[i].dur) { acc += seq[i].dur; i++; }
      const it = seq[i];
      const lt = Math.min(1, (el - acc) / it.dur);
      if (it.card) {
        if (curIdx !== i || force) screen.innerHTML = '<div class="card"><div><small>' + esc(it.small) + '</small>' + esc(it.title) + '</div></div>';
      } else {
        boil();
        screen.innerHTML = K.renderShot(it.shot, { aspect: state.aspect, t: lt, anim: true, annotate: false }) + (it.sub ? '<div class="sub">' + esc(it.sub) + '</div>' : '');
      }
      curIdx = i;
      $('#pl-prog').style.width = (el / total * 100).toFixed(1) + '%';
      $('#pl-time').textContent = el.toFixed(1) + 's / ' + total.toFixed(0) + 's';
    }
    function tick(now) {
      if (!anim) return;
      const dt = (now - last) / 1000; last = now;
      if (playing) el += dt;
      if (el >= total) { el = total - 0.001; playing = false; $('[data-act="pl-toggle"]', pl).textContent = '다시 재생'; }
      if (now - lastDraw > 85 || !playing) { lastDraw = now; if (playing || curIdx === -1) draw(); }
      anim.raf = requestAnimationFrame(tick);
    }
    stopAnim();
    anim = { raf: requestAnimationFrame(tick), toggle() { if (el >= total - 0.01) el = 0; playing = !playing; last = performance.now(); $('[data-act="pl-toggle"]', pl).textContent = playing ? '일시정지' : '재생'; }, restart() { el = 0; playing = true; curIdx = -1; $('[data-act="pl-toggle"]', pl).textContent = '일시정지'; } };
    draw(true);
    $('[data-act="pl-close"]', pl).focus();
  }
  function closePlayer() { stopAnim(); const pl = $('#player'); pl.hidden = true; pl.innerHTML = ''; }

  /* ── 연출 노트 (용어집) ── */
  let notesBuilt = false;
  function legendSvg(kind) {
    const R = '#C4362C', B = '#2F74C0';
    const m = { cam: '<path d="M4 13H46" stroke="' + R + '" stroke-width="3" marker-end="url(#kArrR)"/>', sub: '<path d="M4 13H46" stroke="' + B + '" stroke-width="3" marker-end="url(#kArrB)"/>', end: '<rect x="2" y="2" width="50" height="22" fill="none" stroke="#2A2D31" stroke-width="2"/><rect x="16" y="7" width="22" height="12" fill="none" stroke="' + R + '" stroke-width="2" stroke-dasharray="4 3"/><path d="M5 4 14 7M49 4 40 7" stroke="' + R + '" stroke-width="1.6"/>', hl: '<path d="M2 15H52" stroke="#7FB9DD" stroke-width="2"/><text x="3" y="11" font-size="9" fill="#7FB9DD" font-family="IBM Plex Mono, monospace">HL</text>', fix: '<rect x="8" y="5" width="38" height="16" rx="2" fill="none" stroke="' + R + '" stroke-width="1.6"/><text x="27" y="17" font-size="11" text-anchor="middle" fill="' + R + '" font-family="Nanum Pen Script, cursive">FIX</text>', axis: '<circle cx="10" cy="13" r="5" fill="#fff" stroke="#2A2D31" stroke-width="1.5"/><circle cx="44" cy="13" r="5" fill="#858B92" stroke="#2A2D31" stroke-width="1.5"/><path d="M0 13H54" stroke="' + R + '" stroke-width="1.6" stroke-dasharray="5 3"/>' };
    return '<svg viewBox="0 0 54 26" aria-hidden="true">' + m[kind] + '</svg>';
  }
  function buildNotes() {
    const body = $('#notes-body');
    const P = (o) => Object.assign({ who: 'seoyeon' }, o);
    const platBase = { set: 'platform', look: 'platform', trainX: 98, cast: [P({ pos: [2.3, 1.1, -1.55], face: 0, expr: 'neutral' })], dof: true };
    const sizes = [
      ['ELS', '익스트림 롱 숏', '공간이 주인공. 인물은 점.', { cam: { pos: [-14, 9, 22], target: [2.3, 2.2, -1.6], lens: 24 } }],
      ['LS', '롱 숏', '인물과 주변 공간의 관계.', { cam: { frame: { who: 'seoyeon', size: 'LS', rel: 10 }, lens: 28 } }],
      ['FS', '풀 숏', '머리부터 발끝까지. 몸짓이 보인다.', { cam: { frame: { who: 'seoyeon', size: 'FS', rel: 10 }, lens: 35 } }],
      ['MS', '미디엄 숏', '허리 위. 대화의 기본 크기.', { cam: { frame: { who: 'seoyeon', size: 'MS', rel: 10 }, lens: 50 } }],
      ['MCU', '미디엄 클로즈업', '가슴 위. 표정과 몸짓 모두.', { cam: { frame: { who: 'seoyeon', size: 'MCU', rel: 10 }, lens: 50 } }],
      ['CU', '클로즈업', '얼굴. 감정의 크기.', { cam: { frame: { who: 'seoyeon', size: 'CU', rel: 10 }, lens: 85 } }],
      ['ECU', '익스트림 클로즈업', '눈, 손, 사물. 가장 센 카드.', { cam: { frame: { who: 'seoyeon', size: 'ECU', rel: 10 }, lens: 85 } }],
    ];
    const jBase = { set: 'diner', look: 'diner', cast: [{ who: 'junho', pos: [0.5, 0, -0.95], face: -60, arm: 'pocket', expr: 'tired' }, { who: 'seoyeon', pos: [-0.72, 0, 0], face: 124, pose: 'sit', arm: 'table', hide: true }], focusOn: 'junho' };
    const angles = [
      ['아이 레벨', '중립. 관객과 같은 높이.', { cam: { pos: [-0.85, 1.6, -0.35], target: [0.5, 1.48, -0.95], lens: 35 } }],
      ['로우 앵글', '올려다본다. 크고 위압적으로.', { cam: { pos: [-0.25, 0.55, -0.62], target: [0.5, 1.55, -0.95], lens: 24 } }],
      ['하이 앵글', '내려다본다. 작고 약하게.', { cam: { pos: [-0.55, 2.55, -0.25], target: [0.5, 1.35, -0.95], lens: 28 } }],
      ['버드아이', '수직 부감. 구조와 운명.', { cam: { pos: [0.3, 3.6, -0.9], yaw: 0, pitch: -89.5, lens: 24 }, dof: false }],
      ['더치 앵글', '기울어진 수평. 불안과 혼란.', { cam: { pos: [-0.85, 1.55, -0.35], target: [0.5, 1.48, -0.95], lens: 35, roll: 14 } }],
    ];
    const sBase = { set: 'street', look: 'night', cast: [P({ pos: [0, 0.15, 0.9], face: -60, expr: 'sad' })], focusOn: 'seoyeon', seed: 41 };
    const lenses = [
      ['24mm 광각', '배경이 멀고 넓다. 공간이 과장된다.', 24],
      ['50mm 표준', '사람 눈과 비슷한 원근.', 50],
      ['135mm 망원', '배경이 당겨져 압축되고 흐려진다.', 135],
    ];
    const card = (shot, b, s, g) => '<div class="gl-card">' + K.renderShot(shot, { aspect: 1.85, thumb: true, guides: !!g }) + '<b>' + esc(b) + '</b><span>' + esc(s) + '</span></div>';
    let h = '';
    h += '<section class="gl-sec"><h3>콘티 기호 읽는 법</h3><div class="legend">' +
      '<div>' + legendSvg('cam') + '<span><b>빨간 화살표</b><br>카메라의 움직임</span></div>' +
      '<div>' + legendSvg('sub') + '<span><b>파란 화살표</b><br>인물의 움직임 (동선)</span></div>' +
      '<div>' + legendSvg('end') + '<span><b>빨간 점선 사각형</b><br>무빙이 끝나는 프레임</span></div>' +
      '<div>' + legendSvg('hl') + '<span><b>HL (Horizon Line)</b><br>지평선 = 카메라 높이</span></div>' +
      '<div>' + legendSvg('fix') + '<span><b>FIX</b><br>카메라 고정</span></div>' +
      '<div>' + legendSvg('axis') + '<span><b>평면도의 빨간 점선</b><br>180도 선 (액션 축)</span></div>' +
      '</div></section>';
    h += '<section class="gl-sec"><h3>샷 사이즈</h3><p>관객과 인물 사이의 거리. 같은 인물, 같은 장소에서 크기만 바꾸었다.</p><div class="gl-grid">' +
      sizes.map(([k, n, d, c]) => card(Object.assign({}, platBase, c, { size: k }), k + ' · ' + n, d)).join('') + '</div></section>';
    h += '<section class="gl-sec"><h3>카메라 앵글</h3><p>카메라의 높이와 기울기가 인물의 힘을 바꾼다. 지평선(HL)의 위치를 눈여겨보라.</p><div class="gl-grid">' +
      angles.map(([n, d, c]) => card(Object.assign({}, jBase, c, { angle: n }), n, d, true)).join('') + '</div></section>';
    h += '<section class="gl-sec"><h3>렌즈 (초점거리)</h3><p>세 컷 모두 같은 클로즈업이다. 렌즈가 길어질수록 카메라는 멀어지고, 배경은 크게 당겨지며 흐려진다.</p><div class="gl-grid">' +
      lenses.map(([n, d, l]) => card(Object.assign({}, sBase, { cam: { frame: { who: 'seoyeon', size: 'CU', rel: 35 }, lens: l } }), n, d)).join('') + '</div></section>';
    h += '<section class="gl-sec"><h3>카메라 무빙</h3><ul class="gl-list">' + [
      ['팬 / 틸트', '카메라는 제자리에서 고개만 좌우(팬)·상하(틸트)로 돌린다. 둘러보는 시선.'],
      ['달리 인 / 아웃', '카메라 자체가 다가가거나 물러난다. 원근이 변해 "다가감"으로 느껴진다.'],
      ['줌 인 / 아웃', '렌즈만 바뀐다. 원근은 그대로라 "확대해 봄"으로 느껴진다.'],
      ['돌리 줌', '달리와 줌을 반대로 동시에. 인물은 그대로, 배경만 일그러진다.'],
      ['트랙', '인물과 나란히 옆으로 이동한다. 동행하는 시선.'],
      ['크레인', '위아래로 크게 오르내린다. 오프닝과 엔딩의 단골.'],
      ['핸드헬드', '손으로 든 카메라. 흔들림이 호흡과 불안을 만든다.'],
      ['스테디캠', '몸에 단 안정 장치. 흔들림 없이 따라가는 유려함.'],
    ].map(([a, b]) => '<li><b>' + a + '</b><span>' + b + '</span></li>').join('') + '</ul></section>';
    h += '<section class="gl-sec"><h3>연결 규칙</h3><ul class="gl-list">' + [
      ['180도 법칙', '두 인물의 시선을 잇는 선의 한쪽에만 카메라를 둔다. 넘으면 좌우가 뒤집혀 관객이 공간을 잃는다.'],
      ['30도 법칙', '같은 피사체를 이어 붙일 때는 각도를 30도 이상, 또는 사이즈를 크게 바꾼다. 아니면 점프 컷.'],
      ['화면 방향', '오른쪽으로 가던 인물은 다음 컷에서도 오른쪽으로. 방향을 바꾸려면 정면 컷을 다리로.'],
      ['아이라인 매치', '인물이 보는 방향과, 다음 컷에서 보이는 대상의 위치가 맞아야 한다.'],
      ['인서트', '사물이나 디테일을 끼워 넣어 "이것이 중요하다"고 가리킨다.'],
    ].map(([a, b]) => '<li><b>' + a + '</b><span>' + b + '</span></li>').join('') + '</ul></section>';
    h += '<section class="gl-sec"><h3>조명</h3><ul class="gl-list">' + [
      ['하이키', '전체가 밝고 그림자가 옅다. 명랑함, 정보, 일상.'],
      ['로우키', '어둠이 넓고 빛이 좁다. 긴장, 비밀, 고독.'],
      ['역광', '빛이 피사체 뒤에서 온다. 실루엣, 윤곽, 빗줄기와 연기가 보인다.'],
      ['동기 있는 조명', '화면 속 광원(가로등, 안전등)이 빛의 이유가 된다. 사실감의 기본.'],
      ['키 / 필 / 백', '주광, 그림자를 채우는 보조광, 윤곽을 따는 뒷빛. 3점 조명의 기본 구성.'],
    ].map(([a, b]) => '<li><b>' + a + '</b><span>' + b + '</span></li>').join('') + '</ul></section>';
    body.innerHTML = h;
    notesBuilt = true;
  }
  function openNotes() {
    const dr = $('#notes');
    dr.hidden = false;
    if (!notesBuilt) { $('#notes-body').innerHTML = '<p style="color:var(--ink-3)">콘티를 그리는 중…</p>'; setTimeout(buildNotes, 30); }
    $('[data-act="notes-close"]').focus();
  }
  function closeNotes() { $('#notes').hidden = true; }

  /* ── 이벤트 ── */
  function onClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t) {
      if (e.target.id === 'notes') closeNotes();
      return;
    }
    const act = t.dataset.act;
    const st = STEPS[state.step];
    switch (act) {
      case 'start': state.choices = {}; state.aspect = 1.85; go(1); break;
      case 'resume': {
        const s = store.get();
        if (s) { Object.assign(state, { step: 1, name: s.name || state.name, aspect: s.aspect || 1.85, choices: s.choices || {}, take: s.take || 1, guides: s.guides !== false }); go(s.step); }
        break;
      }
      case 'notes': openNotes(); break;
      case 'notes-close': closeNotes(); break;
      case 'home': stopAnim(); go(0); break;
      case 'opt': select(t.dataset.opt); break;
      case 'lock': lock(); break;
      case 'next': go(state.step + 1); break;
      case 'guides': state.guides = !state.guides; render(true); break;
      case 'restart': restart(); break;
      case 'play-move': {
        const box = $('#panel-box');
        const cur = state.choices[st.d.id] ? (state.peek || state.choices[st.d.id]) : (state.sel || st.d.options[0].id);
        const shot = previewShot(st, cur);
        t.disabled = true;
        playInline(box, [{ shot, dur: Math.min(specOf(shot).dur, 6) }], null, () => { t.disabled = false; render(true); });
        break;
      }
      case 'play-cmp': {
        const box = $('#panel-box');
        const prev = prevCutFor(st);
        const cur = state.choices[st.d.id] ? (state.peek || state.choices[st.d.id]) : (state.sel || st.d.options[0].id);
        const shot = previewShot(st, cur);
        if (!prev) break;
        const pbox = $('#cmp-prev');
        t.disabled = true;
        box.style.opacity = '.25';
        playInline(pbox, [{ shot: prev.shot, dur: 1.6 }], null, () => {
          pbox.innerHTML = panel(prev.shot, { guides: state.guides });
          box.style.opacity = '1';
          pbox.style.opacity = '.25';
          playInline(box, [{ shot, dur: 1.8 }], null, () => { t.disabled = false; render(true); });
        });
        break;
      }
      case 'play-rhythm': {
        const cur = optOf(st.d, state.choices[st.d.id] ? (state.peek || state.choices[st.d.id]) : (state.sel || st.d.options[0].id));
        const cuts = rhythmCuts(st, cur);
        t.disabled = true;
        const segs = document.querySelectorAll('#timeline .seg');
        playInline($('#panel-box'), cuts.map((c) => ({ shot: c, dur: c.dur })), (i) => { segs.forEach((s, j) => s.classList.toggle('on', i === j)); }, () => { t.disabled = false; render(true); });
        break;
      }
      case 'play-cut': {
        const cuts = allCuts();
        const c = cuts[+t.dataset.i];
        if (c) openPlayer([{ shot: c.shot, dur: specOf(c.shot).dur, sub: (c.sheet && c.sheet.dial) || '' }]);
        break;
      }
      case 'play-all': openPlayer(playerSeqAll()); break;
      case 'pl-close': closePlayer(); break;
      case 'pl-toggle': anim && anim.toggle && anim.toggle(); break;
      case 'pl-restart': anim && anim.restart && anim.restart(); break;
      case 'copy': {
        const txt = shotListText();
        const fallback = () => { $('#copy-area').innerHTML = '<p style="margin-top:12px;color:var(--ink-2);font-size:var(--step--1)">복사가 막혀 있어요. 아래 텍스트를 선택해서 복사하세요.</p><textarea class="copy-fallback" id="copy-text" readonly>' + esc(txt) + '</textarea>'; const ta = $('#copy-text'); ta.focus(); ta.select(); };
        try {
          navigator.clipboard.writeText(txt).then(() => toast('샷 리스트를 복사했어요'), fallback);
        } catch (err) { fallback(); }
        break;
      }
      default: break;
    }
  }
  function onKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      if (e.key === 'Enter' && e.target.id === 'director') { state.choices = {}; state.aspect = 1.85; go(1); }
      return;
    }
    if (e.key === 'Escape') { if (!$('#player').hidden) closePlayer(); else if (!$('#notes').hidden) closeNotes(); return; }
    if (!$('#player').hidden || !$('#notes').hidden || !$('#slate').hidden) return;
    const st = STEPS[state.step];
    if (st.type === 'title' && e.key === 'Enter' && !(e.target && e.target.closest && e.target.closest('button'))) { state.choices = {}; state.aspect = 1.85; go(1); return; }
    if (!st.d) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= st.d.options.length) { select(st.d.options[n - 1].id); return; }
    const L = e.key && e.key.toUpperCase();
    if (L && L.length === 1 && st.d.options.some((o) => o.id === L)) { select(L); return; }
    if (e.key === 'Enter' && !state.choices[st.d.id] && state.sel && !(e.target && e.target.closest && e.target.closest('button'))) { lock(); return; }
    if ((e.key === 'ArrowRight') && state.choices[st.d.id]) go(state.step + 1);
  }
  function onInput(e) { if (e.target.id === 'director') { state.name = e.target.value; persist(); } }

  /* ── 시작 ── */
  function start(data) {
    K.installDefs();
    const saved = store.get();
    if (saved) { state.name = saved.name || ''; state.take = saved.take || 1; state.guides = saved.guides !== false; }
    if (data && data.state) state = Object.assign(state, data.state);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener('input', onInput);
    $('#brand').addEventListener('click', () => { closePlayer(); closeNotes(); go(0); });
    $('#btn-notes').addEventListener('click', openNotes);
    render();
    if (G.claude && G.claude.hot && G.claude.hot.snapshot) G.claude.hot.snapshot(() => ({ state }));
  }
  const hot = G.claude && G.claude.hot;
  if (hot && hot.ready) hot.ready(start);
  else start((hot && hot.data) || {});
})(typeof window !== 'undefined' ? window : globalThis);
