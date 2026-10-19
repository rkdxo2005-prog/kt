// 화면: 표지 · 진행 · 수첩 서랍 · 한 권의 끝 · 두 권을 나란히
// 저장은 이 브라우저에만 한다(장면이 시작될 때마다).
const Store = (() => {
  const KEY = 'two-notebooks/v1';
  let data = { saves: {}, done: {}, sound: false };
  try { const raw = localStorage.getItem(KEY); if (raw) data = { ...data, ...JSON.parse(raw) }; } catch (e) { /* 저장소를 못 쓰면 이번 세션만 */ }
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 무시 */ } };
  return {
    get data() { return data; },
    adopt(d) { if (d && d.saves) { data = d; write(); } },
    saveBook(id, s) { data.saves[id] = s; write(); },
    finishBook(id, s) { data.done[id] = s; delete data.saves[id]; write(); },
    reset(id) { delete data.saves[id]; delete data.done[id]; write(); },
    setSound(on) { data.sound = on; write(); },
  };
})();

const App = (() => {
  const $ = id => document.getElementById(id);
  const screen = $('screen');
  let view = { name: 'cover' };
  let shell = null;

  function setBook(id) {
    if (id) document.body.dataset.book = id;
    else delete document.body.dataset.book;
  }

  // ── 표지 ─────────────────────────────────────────────
  function cover() {
    view = { name: 'cover' };
    setBook(null);
    Plates.stop();
    Sound.ambient(null);
    $('btn-book').hidden = true;
    $('bar-mid').innerHTML = '';
    const d = Store.data;
    const prog = id => {
      const total = BOOKS[id].scenes.length;
      if (d.done[id]) return { text: '다 읽음', go: '다시 펼치기', resume: false };
      if (d.saves[id]) return { text: `${d.saves[id].scene + 1} / ${total}장`, go: '이어서 읽기', resume: true };
      return { text: `${total}장`, go: '펼치기', resume: false };
    };
    const po = prog('orwell'), pk = prog('kazan');
    const both = d.done.orwell && d.done.kazan;

    screen.innerHTML = `
      <section class="cover">
        <div class="cover-head">
          <div class="cover-kicker">스페인 내전 · 1936–1937 · 1인칭 기록 게임</div>
          <h1><span class="two">두 권</span>의 <span class="books">수첩</span></h1>
          <p class="cover-lede">한 사람은 총을 들고 바르셀로나에 내렸다. 한 사람은 기자증을 들고 살라망카에 내렸다.
          같은 전쟁의 양쪽 끝에서, 두 작가는 각자의 수첩에 무엇을 적었을까. 직접 겪고, 적고, 그들이 실제로 남긴 문장과 맞춰 본다.</p>
        </div>
        <div class="cover-grid">
          <button class="nb o" id="open-orwell">
            <span class="nb-label">수첩 하나 · 모눈 공책, 연필</span>
            <span class="nb-name">조지 오웰<small>에릭 블레어, 33세, 영국</small></span>
            <span class="nb-hand">“그것만이 생각할 수 있는 유일한 일 같았다.”</span>
            <span class="nb-meta">1936년 12월 바르셀로나 → 아라곤 전선 → 5월의 바르셀로나 → 총상 → 숨어 지낸 6월 → 국경. 민병대원으로서, 공화국 진영 안쪽에서.</span>
            <span class="nb-foot"><span class="nb-prog">${po.text}</span><span class="nb-go">${po.go} →</span></span>
          </button>
          <figure class="cover-map">
            ${Maps.cover()}
            <figcaption>붉은 선은 오웰, 점선은 카잔차키스의 길. 두 사람 모두 마드리드로 가려 했고, 둘 다 들어가지 못했다.</figcaption>
          </figure>
          <button class="nb k" id="open-kazan">
            <span class="nb-label">수첩 둘 · 줄 공책, 잉크</span>
            <span class="nb-name">니코스 카잔차키스<small>53세, 그리스 크레타</small></span>
            <span class="nb-hand">“나는 혼자다.” — 그가 받아 적은 말</span>
            <span class="nb-meta">1926년의 톨레도 → 1936년 10월 살라망카 → 우나무노의 서재 → 폐허의 톨레도 → 헤타페 → 기사와 책. 특파원으로서, 국민파 진영 안쪽에서.</span>
            <span class="nb-foot"><span class="nb-prog">${pk.text}</span><span class="nb-go">${pk.go} →</span></span>
          </button>
        </div>
        <div>
          <button class="both-btn" id="open-both" ${both ? '' : 'disabled'}>두 권을 나란히 펼치기</button>
          <span class="count-line" style="margin-left:10px">${both ? '' : '두 수첩을 다 읽으면 열린다'}</span>
          ${(d.done.orwell || d.done.kazan || d.saves.orwell || d.saves.kazan) ? '<button class="reset-btn" id="reset-all">기록 지우기</button>' : ''}
        </div>
        <div class="cover-notes">
          <div>
            <h2>어떻게 하나</h2>
            <p>장면마다 그림을 둘러보고, 행동을 고르고, 그날 밤 수첩에 한 줄을 적는다. 적고 나면 그 사람이 실제로 쓴 문장이나 남긴 기록이 드러난다.
            맞히는 게임이 아니다. 같은 일을 겪었을 때 내 마음이 그들의 마음 어디쯤에 닿는지 보는 게임이다.</p>
          </div>
          <div>
            <h2>무엇이 사실인가</h2>
            <p>장소와 날짜, 사건은 기록을 따랐다. 1인칭 내레이션은 그들의 글과 연구를 바탕으로 다시 쓴 것이다.
            그들의 문장은 출처와 함께 따로 표시한다.</p>
            <div class="tags"><span class="kind quote">원문</span><span class="kind gist">요지</span><span class="kind fact">기록</span><span class="kind reported">전해짐</span></div>
          </div>
          <div>
            <h2>키보드</h2>
            <p><b>Space</b> 계속 · <b>1–4</b> 고르기 · <b>N</b> 수첩 열기 · <b>Esc</b> 닫기. 소리는 오른쪽 위에서 켠다. 진행은 이 브라우저에 저장된다.</p>
          </div>
        </div>
      </section>`;
    $('open-orwell').onclick = () => openBook('orwell');
    $('open-kazan').onclick = () => openBook('kazan');
    const ob = $('open-both'); if (ob && both) ob.onclick = bothEnd;
    const ra = $('reset-all');
    if (ra) ra.onclick = () => {
      if (ra.dataset.sure) { Store.reset('orwell'); Store.reset('kazan'); cover(); return; }
      ra.dataset.sure = '1';
      ra.textContent = '정말 지울까? 한 번 더 누르면 지운다';
    };
    window.scrollTo(0, 0);
  }

  function openBook(id) {
    const d = Store.data;
    if (d.done[id] && !d.saves[id]) Store.reset(id);
    view = { name: 'play', book: id };
    Engine.begin(id, Store.data.saves[id] || null);
  }

  // ── 진행 화면 골격 ────────────────────────────────────
  function playShell(bk) {
    setBook(bk.id);
    $('btn-book').hidden = false;
    screen.innerHTML = `
      <div class="play">
        <section class="plate" aria-label="장면 그림">
          <div class="frame" id="frame">
            <canvas id="cv" aria-hidden="true"></canvas>
            <div class="spots" id="spots"></div>
            <div class="flash" id="flash"></div>
            <div class="imagine-tag" id="imagine" hidden>상상</div>
            <div class="frame-cap"><span class="fc-when" id="fc-when"></span><span class="fc-where" id="fc-where"></span></div>
          </div>
          <div class="plate-cap">
            <div>
              <div class="pc-num" id="pc-num"></div>
              <h2 class="pc-title" id="pc-title"></h2>
              <div class="pc-sub" id="pc-sub"></div>
              <div id="pc-meters"></div>
            </div>
            <div id="pc-loc"></div>
          </div>
        </section>
        <article class="page" id="page">
          <div class="page-head" id="page-head"></div>
          <div class="log" id="log" aria-live="polite"></div>
          <div class="act-area" id="act"></div>
        </article>
      </div>`;
    Plates.mount($('frame'));
    shell = { log: $('log'), act: $('act') };
    return shell;
  }

  function setScene(bk, sc, i, S) {
    const n = bk.scenes.length;
    $('pc-num').textContent = `${i + 1} / ${n}장`;
    $('pc-title').textContent = sc.title;
    $('pc-sub').textContent = `${sc.when} · ${sc.where}`;
    $('fc-when').textContent = sc.when;
    $('fc-where').textContent = sc.where;
    $('pc-loc').innerHTML = Maps.locator(bk, sc);
    $('bar-mid').innerHTML = `<span class="who">${esc(bk.name)}</span><span class="sep">·</span><span class="count">${i + 1}/${n}</span><span class="sep where">·</span><span class="where">${esc(sc.title)}</span>`;
    $('page-head').innerHTML = `<div class="pc-num">${i + 1} / ${n}장 · ${esc(sc.when)}</div><div class="pc-title">${esc(sc.title)}</div><div class="pc-sub">${esc(sc.where)}</div><div id="ph-meters"></div>`;
    meters(bk, S);
    updateNoteCount(S);
  }

  // ── 마음의 눈금 ──────────────────────────────────────
  function meterHTML(bk, S, d) {
    if (bk.id === 'orwell') {
      const row = (k, label) => {
        const v = S.v[k];
        const dv = d && d[k] ? `<span class="delta">${d[k] > 0 ? '+' : ''}${d[k]}</span>` : '';
        return `<div class="meter m-${k}" title="${label === '우리 편' ? '공화국 진영과 그 지도부, 그 신문들에 대한 믿음' : '곁에 있는 사람들의 품위에 대한 믿음'}"><span>${label}</span><span class="ticks">${Array.from({ length: 10 }, (_, j) => `<i class="${j < v ? 'on' : ''}"></i>`).join('')}</span><span class="val">${v}${dv}</span></div>`;
      };
      return `<div class="meters">${row('side', '우리 편')}${row('people', '사람')}</div>`;
    }
    const seen = S.seen.length, sent = S.sent.length;
    const max = Math.max(10, seen);
    return `<div class="gap" title="기사로 쓸 수 있었던 것과 신문에 실린 것">
      <div class="gap-row seen"><span>본 것</span><span class="gap-bar"><b style="width:${(seen / max) * 100}%"></b></span><span class="val">${seen}</span></div>
      <div class="gap-row sent"><span>실린 것</span><span class="gap-bar"><b style="width:${(sent / max) * 100}%"></b></span><span class="val">${sent}</span></div>
    </div>`;
  }
  function meters(bk, S, d) {
    const html = meterHTML(bk, S, d);
    const a = $('pc-meters'), b = $('ph-meters');
    if (a) a.innerHTML = html;
    if (b) b.innerHTML = html;
  }

  function miniChart(S) {
    return h('div', { class: 'chart', html: chartSVG(S.track, 420, 150) });
  }
  function miniGap(S) {
    return h('div', { html: meterHTML(BOOKS.kazan, S) });
  }

  // 오웰: 두 믿음의 궤적
  function chartSVG(track, W = 520, H = 200) {
    const pad = { l: 64, r: 14, t: 14, b: 26 };
    const n = Math.max(track.length - 1, 1);
    const x = i => pad.l + (i / n) * (W - pad.l - pad.r);
    const y = v => pad.t + (1 - v / 10) * (H - pad.t - pad.b);
    const line = k => track.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join('');
    const last = track[track.length - 1];
    const ticks = [0, 5, 10].map(v => `<line class="c-axis" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text class="c-lbl" x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');
    const marks = track.map((p, i) => i === 0 ? '' : `<text class="c-lbl" x="${x(i)}" y="${H - 8}" text-anchor="middle">${p.s + 1}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="장면마다의 두 믿음: 우리 편 ${last.side}, 사람 ${last.people}">
      ${ticks}${marks}
      <text class="c-lbl" x="${pad.l - 8}" y="${H - 8}" text-anchor="end">장</text>
      <path class="c-side" d="${line('side')}"/><path class="c-people" d="${line('people')}"/>
      <circle class="c-dot-side" cx="${x(track.length - 1)}" cy="${y(last.side)}" r="4"/>
      <circle class="c-dot-people" cx="${x(track.length - 1)}" cy="${y(last.people)}" r="4"/>
    </svg>`;
  }

  // ── 알림과 수첩 수 ───────────────────────────────────
  let toastT = 0;
  function toast(title, text) {
    const t = $('toast');
    t.innerHTML = `${esc(title)}${text ? ': <b>' + esc(text) + '</b>' : ''}`;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 2600);
  }
  function updateNoteCount(S, bump) {
    const n = $('note-count');
    if (!n) return;
    n.textContent = S.notes.length;
    if (bump) { const b = $('btn-book'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  }

  // ── 수첩 서랍 ────────────────────────────────────────
  let drawerTab = 'notes';
  function openDrawer(tab) {
    const S = Engine.S;
    if (!S || view.name !== 'play') return;
    drawerTab = tab || drawerTab;
    const bk = BOOKS[S.book];
    const tabs = [['notes', '내 수첩'], ['echoes', '그들의 문장']];
    if (bk.id === 'kazan') tabs.push(['dispatches', '보낸 기사']);
    $('drawer-tabs').innerHTML = tabs.map(([k, l]) => `<button role="tab" aria-selected="${k === drawerTab}" data-tab="${k}">${l}</button>`).join('');
    $('drawer-tabs').querySelectorAll('button').forEach(b => (b.onclick = () => openDrawer(b.dataset.tab)));
    const body = $('drawer-body');
    body.innerHTML = '';
    if (drawerTab === 'notes') {
      if (!S.notes.length) body.append(h('p', { class: 'd-empty' }, '아직 적은 것이 없다.'));
      const byScene = {};
      S.notes.forEach(n => (byScene[n.s] = byScene[n.s] || []).push(n));
      for (const s of Object.keys(byScene).map(Number).sort((a, b) => a - b)) {
        const sc = bk.scenes[s];
        const seized = S.seized != null && s <= S.seized;
        const box = h('div', { class: 'd-scene' + (seized ? ' seized' : '') },
          seized && s === 0 ? h('span', { class: 'seized-stamp' }, '압수') : null,
          h('h4', null, `${s + 1}장 · ${sc.when} · ${sc.title}`),
          byScene[s].map(n => h('p', { class: 'd-note ' + n.kind }, n.text)));
        body.append(box);
      }
      if (S.seized != null) body.prepend(h('p', { class: 'd-empty' }, '1937년 6월, 경찰이 이 수첩을 가져갔다. 회색으로 바랜 장은 이제 기억 속에만 있다.'));
    } else if (drawerTab === 'echoes') {
      if (!S.echoes.length) body.append(h('p', { class: 'd-empty' }, '아직 드러난 문장이 없다.'));
      S.echoes.forEach(id => body.append(Engine.echoCard(id)));
    } else {
      if (!S.dispatches.length) body.append(h('p', { class: 'd-empty' }, '아직 보낸 기사가 없다.'));
      S.dispatches.forEach(d => body.append(Games.dispatchSheet(d, true)));
    }
    $('drawer').hidden = false;
    $('scrim').hidden = false;
    $('drawer-x').focus();
  }
  function closeDrawer() {
    $('drawer').hidden = true;
    $('scrim').hidden = true;
  }

  // ── 한 권의 끝 ───────────────────────────────────────
  function pairsHTML(S, cls) {
    return S.writes.filter(w => w.echo).map(w => {
      const e = ECHOES[w.echo];
      const sc = BOOKS[S.book].scenes[w.s];
      return `<div class="pair ${cls}">
        <div><div class="ctx">${w.s + 1}장 · ${esc(sc.title)} · 당신</div><div class="mine">${esc(w.text)}</div>${w.res != null ? `<div class="res r${w.res}">${RES_LINE[w.res]}</div>` : ''}</div>
        <div><div class="ctx">${e.kind === 'quote' ? '그가 쓴 문장' : '기록'} · <span class="kind ${e.kind}">${KIND_LABEL[e.kind]}</span></div><div class="theirs">${esc(e.ko)}</div><div class="echo-src">${esc(e.src)}</div></div>
      </div>`;
    }).join('');
  }
  function resSummary(S) {
    const r = S.writes.filter(w => w.res != null);
    const near = r.filter(w => w.res === 2).length;
    return { near, total: r.length };
  }

  function gapBarsSVG(S, W = 520) {
    const tags = [
      ['hero', '용기와 영웅'], ['ruin', '폐허와 풍경'], ['beauty', '도시의 기억'],
      ['red', '공화국 쪽의 폭력'], ['white', '국민파 쪽의 폭력'],
      ['nat-foreign', '국민파를 돕는 외국'], ['rep-foreign', '공화국을 돕는 외국'],
    ];
    const rows = tags.map(([k, l]) => ({ l, seen: S.seen.filter(x => x.tag === k).length, sent: S.sent.filter(x => x.tag === k).length, book: (S.book2 || []).filter(x => x.tag === k).length })).filter(r => r.seen);
    const rh = 34, padL = 150, H = rows.length * rh + 30;
    const mx = Math.max(1, ...rows.map(r => r.seen));
    const sx = v => (v / mx) * (W - padL - 40);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="본 것과 실린 것, 갈래별">
      ${rows.map((r, i) => {
        const y = 10 + i * rh;
        return `<text class="c-lbl strong" x="${padL - 10}" y="${y + 15}" text-anchor="end">${r.l}</text>
          <rect class="c-bar-bg" x="${padL}" y="${y + 4}" width="${sx(r.seen)}" height="9" rx="1"/>
          <rect class="c-bar-seen" x="${padL}" y="${y + 4}" width="${sx(r.seen)}" height="4" rx="1"/>
          <rect class="c-bar-sent" x="${padL}" y="${y + 14}" width="${Math.max(sx(r.sent), r.sent ? 2 : 0)}" height="9" rx="1"/>
          <text class="c-lbl" x="${padL + sx(r.seen) + 8}" y="${y + 22}">${r.sent}/${r.seen}</text>`;
      }).join('')}
      <text class="c-lbl" x="${padL}" y="${H - 4}">위: 본 것 · 아래: 신문에 실린 것</text>
    </svg>`;
  }

  function bookEnd(id) {
    const S = Store.data.done[id];
    const bk = BOOKS[id];
    view = { name: 'bookEnd', book: id };
    setBook(id);
    Plates.stop();
    $('btn-book').hidden = true;
    $('bar-mid').innerHTML = `<span class="who">${esc(bk.name)}</span><span class="sep">·</span><span>덮음</span>`;
    const other = id === 'orwell' ? 'kazan' : 'orwell';
    const otherDone = !!Store.data.done[other];
    const rs = resSummary(S);
    const intro = id === 'orwell'
      ? `에릭 블레어는 1937년 6월 스페인을 떠났다. 그는 기억에 기대어 『카탈루냐 찬가』를 썼고, 남은 생의 글을 \'1936년 이후\'라는 말로 설명했다.`
      : `니코스 카잔차키스는 1936년 11월 스페인을 떠났다. 그는 본 것의 일부를 신문에 실었고, 이듬해 책에서 그 기울기를 덜어 냈다. 그리고 훗날 \'자유\'라는 말을 무덤에 새겼다.`;
    const chart = id === 'orwell'
      ? `<section class="end-sec"><h2>두 믿음</h2>
          <p>붉은 선은 \'우리 편\', 곧 공화국 진영과 그 지도부와 신문에 대한 믿음이다. 검은 선은 곁에 있던 사람들에 대한 믿음이다. 오웰은 앞의 것을 잃었고, 뒤의 것은 오히려 커졌다고 썼다.</p>
          <div class="chart">${chartSVG(S.track, 640, 240)}</div>
          <div class="legend"><span><i style="background:var(--o-accent)"></i>우리 편 ${S.v.side}</span><span><i style="background:var(--o-accent-2)"></i>사람 ${S.v.people}</span></div></section>`
      : `<section class="end-sec"><h2>본 것과 실린 것</h2>
          <p>기사로 쓸 수 있었던 것 ${S.seen.length}가지 가운데 신문에 실린 것은 ${S.sent.length}가지. 검열관의 붉은 연필이 무엇을 지웠는지, 갈래별로 본다.</p>
          <div class="chart">${gapBarsSVG(S, 640)}</div></section>`;
    screen.innerHTML = `
      <section class="ending">
        <div class="end-sec">
          <div class="cover-kicker">${esc(bk.name)} · 덮음</div>
          <h1>${id === 'orwell' ? '수정 같은 정신' : '나는 자유다'}</h1>
          <p class="lede">${intro}</p>
        </div>
        ${chart}
        <section class="end-sec"><h2>당신의 문장, 그의 문장</h2>
          <p>당신이 적은 문장 ${rs.total}개 가운데 ${rs.near}개가 그의 기록과 거의 같은 자리에 닿았다.</p>
          <div class="pairs">${pairsHTML(S, id === 'orwell' ? 'o' : 'k')}</div>
        </section>
        <div class="end-actions">
          ${otherDone ? '<button class="both-btn" id="go-both">두 권을 나란히 펼치기</button>' : `<button class="both-btn" id="go-other">${esc(BOOKS[other].name)} 펼치기</button>`}
          <button class="next ghost" id="go-cover">표지로</button>
        </div>
      </section>`;
    const gb = $('go-both'); if (gb) gb.onclick = bothEnd;
    const go = $('go-other'); if (go) go.onclick = () => openBook(other);
    $('go-cover').onclick = cover;
    window.scrollTo(0, 0);
  }

  // ── 두 권을 나란히 ───────────────────────────────────
  function bothEnd() {
    const O = Store.data.done.orwell, K = Store.data.done.kazan;
    if (!O || !K) return cover();
    view = { name: 'both' };
    setBook(null);
    Plates.stop();
    Sound.ambient(null);
    $('btn-book').hidden = true;
    $('bar-mid').innerHTML = '<span class="who">두 권을 나란히</span>';
    const ro = resSummary(O), rk = resSummary(K);
    screen.innerHTML = `
      <section class="ending">
        <div class="end-sec">
          <div class="cover-kicker">두 권을 나란히</div>
          <h1>같은 겨울, 두 개의 스페인</h1>
          <p class="lede">한 사람은 총을 들고 한쪽 편에 섰고, 자기 편이 퍼뜨린 거짓을 기록했다.
          한 사람은 기자증을 들고 한쪽 진영에 들어갔고, 그 진영의 침묵을 나중에 덜어 냈다.
          둘 다 마드리드로 가려 했고, 둘 다 들어가지 못했다.</p>
        </div>
        <section class="end-sec"><h2>두 개의 길</h2>
          <div class="mapbox">${Maps.cover(true)}</div>
          <div class="legend"><span><i style="background:var(--o-accent)"></i>오웰 1936.12–1937.6 (공화국 쪽)</span><span><i style="background:var(--k-accent)"></i>카잔차키스 1936.10–11 (국민파 쪽)</span><span><i style="border:1.4px dashed var(--ink);height:10px;width:10px;border-radius:50%"></i>마드리드</span></div>
        </section>
        <section class="end-sec"><h2>엇갈린 시간</h2>
          <p>카잔차키스가 스페인을 떠나고 한 달 뒤 오웰이 도착했다. 오웰이 아라곤의 참호에서 장작을 줍던 1937년 1월, 아테네의 신문에는 카잔차키스의 스페인 기사가 실리고 있었다.</p>
          <div class="timeline">${timelineSVG()}</div>
        </section>
        <section class="end-sec">
          <div class="end-two">
            <div><h2>오웰의 두 믿음</h2><div class="chart">${chartSVG(O.track, 520, 210)}</div>
              <div class="legend"><span><i style="background:var(--o-accent)"></i>우리 편</span><span><i style="background:var(--o-accent-2)"></i>사람</span></div></div>
            <div><h2>카잔차키스가 본 것과 실린 것</h2><div class="chart">${gapBarsSVG(K, 520)}</div></div>
          </div>
        </section>
        <section class="end-sec"><h2>당신의 문장, 그들의 문장</h2>
          <p>오웰의 수첩에서 ${ro.total}개 중 ${ro.near}개, 카잔차키스의 수첩에서 ${rk.total}개 중 ${rk.near}개가 그들의 기록과 거의 같은 자리에 닿았다.</p>
          <div class="pairs">${pairsHTML(O, 'o')}${pairsHTML(K, 'k')}</div>
        </section>
        <section class="end-sec"><h2>마지막 문장</h2>
          <div class="epi">
            <figure class="o"><blockquote>이제껏 터진 어떤 폭탄도 그 수정 같은 정신을 부수지 못하리라.</blockquote>
              <div class="orig">No bomb that ever burst / Shatters the crystal spirit.</div>
              <figcaption>조지 오웰, 「이탈리아 병사가 내 손을 잡았다」(1939)</figcaption></figure>
            <figure class="k"><blockquote>나는 아무것도 바라지 않는다. 나는 아무것도 두려워하지 않는다. 나는 자유다.</blockquote>
              <div class="orig">Δεν ελπίζω τίποτα. Δε φοβούμαι τίποτα. Είμαι λέφτερος.</div>
              <figcaption>니코스 카잔차키스의 비문, 이라클리오(1957)</figcaption></figure>
          </div>
          <p>오웰의 문장은 한 사람의 얼굴을 붙든다. 카잔차키스의 문장은 모든 편에서 걸어 나온다. 하나는 사람 곁에 서는 자유, 하나는 어느 편에도 매이지 않는 자유다.</p>
        </section>
        <section class="end-sec sources"><h2>출처</h2>${SOURCES_HTML}</section>
        <div class="end-actions"><button class="next ghost" id="go-cover">표지로</button></div>
      </section>`;
    $('go-cover').onclick = cover;
    window.scrollTo(0, 0);
  }

  function timelineSVG() {
    const W = 760, H = 150, l = 20, r = 20;
    const t0 = Date.parse('1936-09-15'), t1 = Date.parse('1937-07-15');
    const x = d => l + ((Date.parse(d) - t0) / (t1 - t0)) * (W - l - r);
    const months = ['1936-10-01', '1936-11-01', '1936-12-01', '1937-01-01', '1937-02-01', '1937-03-01', '1937-04-01', '1937-05-01', '1937-06-01', '1937-07-01'];
    const mlab = ['10월', '11월', '12월', '1937.1', '2월', '3월', '4월', '5월', '6월', '7월'];
    const bar = (a, b, y, cls, label) => `<rect class="${cls}" x="${x(a)}" y="${y}" width="${Math.max(3, x(b) - x(a))}" height="14" rx="2"/><text class="tl-lbl strong" x="${x(a)}" y="${y - 6}">${label}</text>`;
    const pin = (d, y, label, cls = 'tl-lbl') => `<line class="tl-tick" x1="${x(d)}" x2="${x(d)}" y1="${y}" y2="${y + 22}"/><text class="${cls}" x="${x(d) + 4}" y="${y + 34}">${label}</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="두 사람의 스페인 체류 기간">
      ${months.map((m, i) => `<line class="tl-tick" x1="${x(m)}" x2="${x(m)}" y1="${H - 26}" y2="${H - 20}"/><text class="tl-lbl" x="${x(m) + 3}" y="${H - 8}">${mlab[i]}</text>`).join('')}
      ${bar('1936-10-19', '1936-11-28', 30, 'tl-k', '카잔차키스, 국민파 쪽')}
      ${bar('1936-11-24', '1937-01-17', 50, 'tl-k2', '')}
      <text class="tl-lbl" x="${x('1936-11-24')}" y="${78}">기사 45편 연재</text>
      ${bar('1936-12-26', '1937-06-23', 30, 'tl-o', '')}
      <text class="tl-lbl strong" x="${x('1936-12-26') + 74}" y="${24}">오웰, 공화국 쪽</text>
      ${pin('1937-05-03', 46, '5월 사태')}
      ${pin('1937-05-20', 66, '총상')}
    </svg>`;
  }

  return {
    cover, playShell, setScene, meters, miniChart, miniGap, toast, updateNoteCount,
    openDrawer, closeDrawer, bookEnd, bothEnd,
    get view() { return view; },
  };
})();

const SOURCES_HTML = `<ul>
  <li>조지 오웰, 『카탈루냐 찬가』(1938), 「스페인 전쟁을 돌아보며」(1942), 「나는 왜 쓰는가」(1946), 시 「이탈리아 병사가 내 손을 잡았다」(1939)</li>
  <li><a href="https://www.orwellfoundation.com/the-orwell-foundation/orwell/poetry/the-italian-soldier-shook-my-hand/" target="_blank" rel="noopener">The Orwell Foundation — The Italian Soldier Shook My Hand</a> · <a href="https://libcom.org/library/looking-back-on-the-spanish-war-george-orwell" target="_blank" rel="noopener">Looking Back on the Spanish War (libcom)</a></li>
  <li><a href="https://orwellsociety.com/homage-to-catalonia-visit-report/" target="_blank" rel="noopener">Orwell Society — Homage to Catalonia visit report</a> · <a href="https://elnacional.cat/en/culture/homage-to-george-orwell-plaque-recalls-where-the-writer-witnessed-the-fets-maig-in-barcelona_1217619_102.html" target="_blank" rel="noopener">El Nacional — 폴리오라마 기념판</a></li>
  <li><a href="https://lithub.com/the-communist-plot-to-assassinate-george-orwell/" target="_blank" rel="noopener">Lit Hub — The Communist Plot to Assassinate George Orwell</a> · <a href="https://en.wikipedia.org/wiki/Georges_Kopp" target="_blank" rel="noopener">Georges Kopp</a> · <a href="https://www.cambridge.org/core/journals/historical-journal/article/death-of-bob-smillie-the-spanish-civil-war-and-the-eclipse-of-the-independent-labour-party/674B22ABCFB885A1512B278BD1A291BB" target="_blank" rel="noopener">Buchanan, The Death of Bob Smillie</a></li>
  <li><a href="https://www.fronterad.com/kazantzakis-octubre-de-1936/" target="_blank" rel="noopener">fronterad — Kazantzakis, octubre de 1936</a> · <a href="https://www.fronterad.com/unamuno-12-de-octubre-de-1936-en-el-paraninfo-de-salamanca-el-testimonio-de-nikos-kazantzakis/" target="_blank" rel="noopener">fronterad — Unamuno y Kazantzakis</a></li>
  <li><a href="https://letralia.com/articulos-y-reportajes/2018/10/26/kazantzakis-y-la-guerra-civil-espanola/" target="_blank" rel="noopener">Letralia — Kazantzakis y la Guerra Civil española</a> · <a href="https://www.revistasculturales.com/xrevistas/PDF/90/1196.pdf" target="_blank" rel="noopener">Letra Internacional (PDF)</a> · <a href="https://vscw.ca/en/node/862" target="_blank" rel="noopener">Nikos Kazantzakis and Spain (vscw.ca)</a></li>
  <li><a href="https://vestigiosguerraciviltoledo.blogspot.com/2024/10/nikos-kazantzakis-corresponsal-de.html" target="_blank" rel="noopener">Vestigios de la Guerra Civil en Toledo</a> · <a href="https://juanmalcala.es/getafe/nikkos-kazatzakis-llega-a-getafe/" target="_blank" rel="noopener">Getafe — Nikos Kazantzakis llega a Getafe</a> · <a href="https://www.kazantzaki.gr/en/travel-writing/taksideuontas-a%CE%84-ispania-156" target="_blank" rel="noopener">카잔차키스 재단 — Ταξιδεύοντας: Ισπανία</a></li>
  <li><a href="https://blogs.cervantes.es/atenas/2010/03/11/kazantzakis-en-la-guerra-civil-espanola/" target="_blank" rel="noopener">Instituto Cervantes Atenas — Kazantzakis en la Guerra Civil española</a> · <a href="https://cvc.cervantes.es/trujaman/anteriores/julio_13/31072013.htm" target="_blank" rel="noopener">CVC El Trujamán</a></li>
</ul>`;

// ── 전역 키보드·버튼 ─────────────────────────────────────
document.getElementById('brand').onclick = () => { App.closeDrawer(); App.cover(); };
document.getElementById('btn-book').onclick = () => App.openDrawer('notes');
document.getElementById('drawer-x').onclick = App.closeDrawer;
document.getElementById('scrim').onclick = App.closeDrawer;
document.getElementById('btn-sound').onclick = () => {
  const on = Sound.toggle();
  Store.setSound(on);
  document.getElementById('btn-sound').setAttribute('aria-pressed', on);
  document.getElementById('sound-label').textContent = on ? '소리 켜짐' : '소리 꺼짐';
};
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const drawerOpen = !document.getElementById('drawer').hidden;
  if (e.key === 'Escape') { App.closeDrawer(); return; }
  if (drawerOpen) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if ((e.key === 'n' || e.key === 'N' || e.key === 'ㅜ') && App.view.name === 'play') { App.openDrawer('notes'); e.preventDefault(); return; }
  const act = document.getElementById('act');
  if (!act) return;
  if (e.key === ' ' || e.key === 'Enter') {
    if (tag === 'button' && e.key === 'Enter') return;
    const nx = act.querySelector('.next:not([hidden])');
    if (nx) { e.preventDefault(); nx.click(); }
    return;
  }
  if (/^[1-9]$/.test(e.key)) {
    const opts = act.querySelectorAll('.opts > .opt');
    const o = opts[Number(e.key) - 1];
    if (o) { e.preventDefault(); o.click(); }
  }
});

// ── 시작 ─────────────────────────────────────────────────
function start(data) {
  if (data && data.store) Store.adopt(data.store);
  const v = data && data.view;
  if (v && v.name === 'play' && BOOKS[v.book] && Store.data.saves[v.book]) Engine.begin(v.book, Store.data.saves[v.book]);
  else if (v && v.name === 'bookEnd' && Store.data.done[v.book]) App.bookEnd(v.book);
  else if (v && v.name === 'both' && Store.data.done.orwell && Store.data.done.kazan) App.bothEnd();
  else App.cover();
}
window.claude?.hot?.snapshot?.(() => ({ store: Store.data, view: App.view }));
if (window.claude?.hot?.ready) window.claude.hot.ready(start);
else start(window.claude?.hot?.data ?? {});
