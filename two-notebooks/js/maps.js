// 작은 지도들: 표지의 두 길, 장면 표지판의 위치, 헤타페의 "누가 싸우는가"
const Maps = (() => {
  const view = name => {
    const m = MAPDATA[name];
    const c = Math.cos(((m.lat0 + m.lat1) / 2) * Math.PI / 180);
    const k = m.w / ((m.lon1 - m.lon0) * c);
    return { ...m, p: ([lon, lat]) => [(lon - m.lon0) * c * k, (m.lat1 - lat) * k] };
  };
  const IB = view('iberia');
  const EU = view('europe');

  const PLACES = {
    barcelona: [2.17, 41.39], alcubierre: [-0.45, 41.8], huesca: [-0.41, 42.14], fabian: [-0.33, 42.1],
    barbastro: [0.13, 42.03], lerida: [0.62, 41.61], tarragona: [1.25, 41.12], portbou: [3.13, 42.42],
    border: [-1.79, 43.34], salamanca: [-5.66, 40.97], avila: [-4.7, 40.66], talavera: [-4.83, 39.96],
    toledo: [-4.02, 39.86], getafe: [-3.73, 40.31], madrid: [-3.7, 40.42],
  };
  const CITIES = {
    berlin: { ll: [13.4, 52.52], name: '베를린' }, rome: { ll: [12.5, 41.9], name: '로마' },
    moscow: { ll: [37.62, 55.75], name: '모스크바' }, tetuan: { ll: [-5.37, 35.57], name: '테투안' },
    lisbon: { ll: [-9.14, 38.72], name: '리스본' }, paris: { ll: [2.35, 48.86], name: '파리' },
    madrid: { ll: [-3.7, 40.42], name: '마드리드' },
  };

  const LABEL_AT = { berlin: [8, -6, 'start'], rome: [8, -6, 'start'], moscow: [-8, -8, 'end'], tetuan: [6, 18, 'start'], lisbon: [4, 18, 'start'], paris: [8, -6, 'start'] };

  // 오간 길을 구별하려고 구간마다 살짝 휜 곡선으로 잇는다.
  function curve(v, pts, bend = 0.18) {
    let d = '';
    pts.forEach((ll, i) => {
      const [x, y] = v.p(ll);
      if (!i) { d += `M${x.toFixed(1)},${y.toFixed(1)}`; return; }
      const [x0, y0] = v.p(pts[i - 1]);
      const mx = (x0 + x) / 2, my = (y0 + y) / 2;
      const s = (i % 2 ? 1 : -1) * bend;
      const cx = mx - (y - y0) * s, cy = my + (x - x0) * s;
      d += `Q${cx.toFixed(1)},${cy.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return d;
  }

  const P = PLACES;
  const ORWELL_ROUTE = [P.barcelona, P.alcubierre, P.huesca, P.barcelona, P.fabian, P.barbastro, P.lerida, P.tarragona, P.barcelona, P.portbou];
  const KAZAN_ROUTE = [P.salamanca, P.avila, P.talavera, P.toledo, P.getafe];

  function base(v, extra = '') {
    return `<rect class="m-sea" width="${v.w}" height="${v.h}"/>
      <path class="m-land" d="${v.land}"/>
      ${v.portugal ? `<path class="m-pt" d="${v.portugal}"/>` : ''}
      <path class="m-spain" d="${v.spain}"/>${extra}`;
  }

  function label(v, ll, text, dx = 8, dy = 4, cls = 'm-label', anchor = 'start') {
    const [x, y] = v.p(ll);
    return `<circle class="m-city" cx="${x}" cy="${y}" r="3"/><text class="${cls}" x="${x + dx}" y="${y + dy}" text-anchor="${anchor}">${text}</text>`;
  }

  function cover(big) {
    const v = IB;
    const [mx, my] = v.p(P.madrid);
    const [bx, by] = v.p(P.border);
    const [sx, sy] = v.p(P.salamanca);
    return `<svg viewBox="0 0 ${v.w} ${v.h}" role="img" aria-label="오웰과 카잔차키스의 스페인 동선">
      ${base(v)}
      <path class="m-route k" d="M${bx},${by} Q${(bx + sx) / 2 + 30},${(by + sy) / 2} ${sx},${sy}" opacity="0.5"/>
      <path class="m-route k" d="${curve(v, KAZAN_ROUTE, 0.12)}"/>
      <path class="m-route o" d="${curve(v, ORWELL_ROUTE, 0.22)}"/>
      <circle class="m-madrid" cx="${mx}" cy="${my}" r="17"/>
      ${label(v, P.madrid, '마드리드', 22, -8, 'm-label big')}
      <text class="m-label" x="${mx + 22}" y="${my + 10}">${big ? '두 사람 모두 들어가지 못한 도시' : '들어가지 못한 도시'}</text>
      ${label(v, P.barcelona, '바르셀로나', 8, 16)}
      ${label(v, P.huesca, '우에스카', -8, -6, 'm-label', 'end')}
      ${label(v, P.alcubierre, '알쿠비에레', -8, 14, 'm-label', 'end')}
      ${label(v, P.portbou, '포르트부', -6, -8, 'm-label', 'end')}
      ${label(v, P.salamanca, '살라망카', -8, -6, 'm-label', 'end')}
      ${big ? label(v, P.avila, '아빌라', 4, -9) : ''}
      ${label(v, P.toledo, '톨레도', -6, 16, 'm-label', 'end')}
      ${big ? label(v, P.getafe, '헤타페', 10, 26) : ''}
      <text class="m-label" x="${bx - 6}" y="${by - 10}" text-anchor="end">프랑스에서</text>
    </svg>`;
  }

  function locator(book, sc) {
    const v = sc.map === 'europe' ? EU : IB;
    const [x, y] = v.p(sc.at);
    return `<svg class="locator" viewBox="0 0 ${v.w} ${v.h}" role="img" aria-label="${esc(sc.where)}의 위치">
      ${base(v)}
      <circle class="m-here" cx="${x}" cy="${y}" r="${v === EU ? 12 : 13}"/>
    </svg>`;
  }

  // 헤타페: 도착하는 화살표를 하나씩 그린다.
  function europe() {
    const v = EU;
    const [mx, my] = v.p(CITIES.madrid.ll);
    const wrap = document.createElement('div');
    wrap.className = 'mapbox';
    wrap.innerHTML = `<svg viewBox="0 0 ${v.w} ${v.h}" role="img" aria-label="마드리드로 모여드는 나라들">
      ${base(v)}
      <g class="arrows"></g>
      <circle class="m-madrid" cx="${mx}" cy="${my}" r="9"/>
      <text class="m-label big" x="${mx - 12}" y="${my + 26}" text-anchor="middle">마드리드</text>
      <g class="cities"></g>
    </svg>
    <div class="legend"><span><i style="background:var(--k-accent-2)"></i>국민파를 도운 쪽</span><span><i style="background:var(--k-accent)"></i>공화국을 도운 쪽</span></div>`;
    const svg = wrap.querySelector('svg');
    const ns = 'http://www.w3.org/2000/svg';
    function arrow(from, side) {
      const c = CITIES[from];
      const [x, y] = v.p(c.ll);
      const dx = mx - x, dy = my - y, len = Math.hypot(dx, dy);
      const cx = (x + mx) / 2 - dy * 0.18, cy = (y + my) / 2 + dx * 0.18;
      // 끝을 마드리드 동그라미 바깥에서 멈춘다.
      const ex = mx - (dx / len) * 12, ey = my - (dy / len) * 12;
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('class', 'm-arrow ' + side);
      path.setAttribute('d', `M${x},${y} Q${cx},${cy} ${ex},${ey}`);
      svg.querySelector('.arrows').append(path);
      const total = path.getTotalLength();
      path.style.strokeDasharray = total;
      path.style.strokeDashoffset = reduceMotion() ? 0 : total;
      path.getBoundingClientRect();
      path.style.transition = 'stroke-dashoffset 1.1s ease';
      path.style.strokeDashoffset = 0;
      // 화살촉
      const t = path.getPointAtLength(total - 0.5), t0 = path.getPointAtLength(Math.max(0, total - 12));
      const ang = Math.atan2(t.y - t0.y, t.x - t0.x);
      const head = document.createElementNS(ns, 'path');
      const hx = t.x, hy = t.y, s = 8;
      head.setAttribute('d', `M${hx},${hy} L${hx - s * Math.cos(ang - 0.45)},${hy - s * Math.sin(ang - 0.45)} M${hx},${hy} L${hx - s * Math.cos(ang + 0.45)},${hy - s * Math.sin(ang + 0.45)}`);
      head.setAttribute('class', 'm-arrow ' + side);
      svg.querySelector('.arrows').append(head);
      const g = document.createElementNS(ns, 'g');
      const [ox, oy, an] = LABEL_AT[from] || [8, -6, 'start'];
      g.innerHTML = `<circle class="m-city" cx="${x}" cy="${y}" r="3.5"/><text class="m-label big" x="${x + ox}" y="${y + oy}" text-anchor="${an}">${c.name}</text>`;
      svg.querySelector('.cities').append(g);
    }
    return { el: wrap, arrow };
  }

  return { cover, locator, europe, IB, EU };
})();
