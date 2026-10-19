// 장면 그림들. 좌표는 100 × 75 단위. 둘러보기 지점(spots)의 좌표와 같은 자리에 그 물건이 그려진다.
// 오웰의 장면은 유리창처럼 평평하고 분명한 색으로, 카잔차키스의 장면은 엘 그레코처럼 굽이치는 하늘과 길쭉한 몸으로 그린다.
const PAINTERS = (() => {
  const { rng, fbm, mix, rgba, lin, rad, rect, poly, line, ellipse, sky, ridge, glow, stars, snow, smoke, person, flag, windows, wall, vignette, grecoClouds, text } = U;
  const P = {};

  P.blank = { base(g) { rect(g, 0, 0, 100, 75, '#20262b'); } };

  // ── 공용 조각 ─────────────────────────────────────────
  // 벽 위의 점: 가까운 모서리 n과 먼 모서리 f 사이, x에서 위(0)~아래(1) 비율 v의 y
  const onWall = (n, f, x, v) => {
    const k = (x - n.x) / (f.x - n.x);
    const t = n.t + (f.t - n.t) * k, b = n.b + (f.b - n.b) * k;
    return t + (b - t) * v;
  };
  const quadOn = (n, f, x0, x1, v0, v1) => [[x0, onWall(n, f, x0, v0)], [x1, onWall(n, f, x1, v0)], [x1, onWall(n, f, x1, v1)], [x0, onWall(n, f, x0, v1)]];

  function planeTree(g, x, y, h, leafy, seed) {
    const r = rng(seed);
    poly(g, [[x - h * 0.03, y], [x + h * 0.03, y], [x + h * 0.02, y - h * 0.55], [x - h * 0.02, y - h * 0.55]], '#8d8a76');
    for (let i = 0; i < 4; i++) ellipse(g, x + (r() - 0.5) * h * 0.03, y - h * (0.1 + r() * 0.4), h * 0.012, h * 0.03, '#b7b39c');
    g.lineCap = 'round';
    const branch = (x0, y0, a, len, d) => {
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      line(g, x0, y0, x1, y1, '#5d5648', Math.max(0.06, h * 0.012 * (4 - d)));
      if (d < 3) { branch(x1, y1, a - 0.35 - r() * 0.3, len * 0.72, d + 1); branch(x1, y1, a + 0.3 + r() * 0.3, len * 0.7, d + 1); }
      else if (leafy) for (let k = 0; k < 2; k++) ellipse(g, x1 + (r() - 0.5) * h * 0.08, y1 + (r() - 0.5) * h * 0.05, h * 0.07, h * 0.045, rgba(r() > 0.5 ? '#8bab55' : '#a2bd68', 0.8));
    };
    branch(x, y - h * 0.55, -Math.PI / 2 - 0.4, h * 0.22, 0);
    branch(x, y - h * 0.55, -Math.PI / 2 + 0.4, h * 0.22, 0);
  }

  function sandbags(g, y0, y1, { seed = 3, color = '#544a3b', top = '#6f6450', frost = 0, rows = 5, rim = null } = {}) {
    const r = rng(seed);
    const rh = (y1 - y0) / rows;
    for (let j = 0; j < rows; j++) {
      const y = y0 + j * rh;
      const off = (j % 2) * 4;
      for (let x = -6 + off; x < 106; x += 8) {
        const w = 7.6 + r() * 0.8, hh = rh * 1.05;
        ellipse(g, x + w / 2, y + hh / 2, w / 2, hh / 2, mix(color, '#000000', r() * 0.18));
        ellipse(g, x + w / 2, y + hh * 0.36, w * 0.42, hh * 0.22, rgba(top, 0.55));
        if (rim) ellipse(g, x + w / 2, y + hh * 0.12, w * 0.44, hh * 0.08, rgba(rim, 0.75));
        if (frost) ellipse(g, x + w / 2, y + hh * 0.18, w * 0.4, hh * 0.13, rgba('#f2f5f8', frost));
      }
    }
  }

  // ── 바르셀로나, 람블라스 (12월 / 4월) ─────────────────
  const LW = { n: { x: -2, t: -4, b: 62 }, f: { x: 40, t: 19, b: 37 } };
  const RW = { n: { x: 102, t: -6, b: 63 }, f: { x: 62, t: 18, b: 37 } };
  P.barcelona = {
    base(g, p) {
      const apr = p.variant === 'apr';
      sky(g, apr ? [[0, '#7fafd8'], [0.55, '#cfe1ec'], [1, '#efe7d8']] : [[0, '#8aa1b4'], [0.6, '#cdd6db'], [1, '#e1e1db']]);
      const r = rng(apr ? 9 : 4);
      for (let i = 0; i < 6; i++) ellipse(g, 30 + r() * 40, 4 + r() * 10, 6 + r() * 6, 1.2 + r(), rgba('#ffffff', apr ? 0.5 : 0.3));
      // 길 끝: 항구 쪽 건물들과 콜럼버스 기념탑
      rect(g, 38, 22, 26, 15, apr ? '#b9b6ab' : '#a7adb0');
      windows(g, 39, 23, 24, 12, 9, 4, { color: rgba('#5b5a58', 0.45) });
      rect(g, 51.1, 11, 1, 25, '#7b7975');
      ellipse(g, 51.6, 10.6, 1.1, 0.7, '#5d5b58');
      person(g, 51.6, 10.2, 2, { color: '#4a4845' });
      // 땅: 양쪽 차도와 가운데 산책로
      poly(g, [[-2, 62], [40, 37], [62, 37], [102, 63], [102, 76], [-2, 76]], apr ? '#8e8a83' : '#86837c');
      poly(g, [[22, 76], [48, 37], [56, 37], [82, 76]], apr ? '#d9cdb3' : '#cfc6b3');
      for (let i = 0; i < 9; i++) { const k = i / 9; line(g, 48 - 26 * k ** 1.6, 37 + 39 * k ** 1.6, 56 + 26 * k ** 1.6, 37 + 39 * k ** 1.6, rgba('#8a7f68', 0.25), 0.15); }
      // 양쪽 건물
      wall(g, LW.n, LW.f, { fill: apr ? '#d0ad80' : '#c2a27a', cols: 9, rows: 5, win: '#3a2e25', balcony: '#2a2522', persp: 1.6 });
      wall(g, RW.n, RW.f, { fill: apr ? '#c6a276' : '#b79772', cols: 9, rows: 5, win: '#3a2e25', balcony: '#2a2522', persp: 1.6 });
      poly(g, [[-2, 62], [40, 37], [40, 38.2], [-2, 64.5]], '#6d5a46');
      poly(g, [[102, 63], [62, 37], [62, 38.2], [102, 65.5]], '#6d5a46');
      if (!apr) {
        // 허물어지는 교회와 비계
        const top = [[7, onWall(LW.n, LW.f, 7, 0.06)], [10, 2.5], [12.5, 6], [15, 1.5], [17.5, 7.5], [20, 6.2], [23, onWall(LW.n, LW.f, 23, 0.1)]];
        poly(g, [...top, [23, onWall(LW.n, LW.f, 23, 0.995)], [7, onWall(LW.n, LW.f, 7, 0.995)]], '#a39b8f');
        ellipse(g, 15, 21, 3, 3.2, '#4b4440');
        for (let a = 0; a < 8; a++) line(g, 15, 21, 15 + Math.cos(a * 0.785) * 3, 21 + Math.sin(a * 0.785) * 3.2, '#a39b8f', 0.25);
        poly(g, [[13.3, 52.5], [13.3, 42], [15, 39], [16.7, 42], [16.7, 51]], '#2c2622');
        for (const x of [8, 11.5, 15, 18.5, 22]) line(g, x, onWall(LW.n, LW.f, x, 0.08), x, onWall(LW.n, LW.f, x, 0.99), '#4a3c2c', 0.22);
        for (let v = 0.2; v < 0.95; v += 0.17) line(g, 7, onWall(LW.n, LW.f, 7, v), 23, onWall(LW.n, LW.f, 23, v), '#5a4632', 0.35);
        person(g, 10, onWall(LW.n, LW.f, 10, 0.37), 4, { color: '#3b3a37', arms: 'up' });
        person(g, 19.5, onWall(LW.n, LW.f, 19.5, 0.54), 3.6, { color: '#3b3a37', arms: 'front' });
        poly(g, [[6, 58], [12, 54], [20, 55], [24, 50], [26, 52], [24, 58]], '#9c9284');
      } else {
        // 식당: 길가 창에 불빛과 먹는 사람들
        poly(g, quadOn(LW.n, LW.f, 10, 24, 0.76, 0.97), '#f2c879');
        for (const x of [12.5, 15.8, 19, 22]) person(g, x, onWall(LW.n, LW.f, x, 0.95), 4.2, { color: '#3a2c22', pose: 'sit' });
        line(g, 10, onWall(LW.n, LW.f, 10, 0.87), 24, onWall(LW.n, LW.f, 24, 0.87), '#7a5a3a', 0.35);
        text(g, 'RESTAURANT', 17, onWall(LW.n, LW.f, 17, 0.73), 1.5, { color: '#5a3a22', align: 'center', rot: -0.33 });
      }
      // 가게 문간
      poly(g, quadOn(LW.n, LW.f, 25, 29, 0.6, 1), '#2a221d');
      // 가로수
      const tree = (k, side) => {
        const kk = k ** 1.5;
        const x = side < 0 ? 47.5 - 25 * kk : 56.5 + 25 * kk, y = 37 + 39 * kk;
        planeTree(g, x, y, 10 + 30 * kk, apr, Math.round(k * 50) + (side < 0 ? 1 : 2));
      };
      for (const k of [0.25, 0.45, 0.68]) { tree(k, -1); tree(k, 1); }
      // 가로등과 확성기
      line(g, 60, 51, 60, 21.5, '#2f3b33', 0.45);
      ellipse(g, 60, 21.2, 1, 0.6, '#2f3b33');
      if (!apr) { poly(g, [[59.6, 22.6], [55.2, 20.6], [55.2, 25.2], [59.6, 23.6]], '#3a463d'); ellipse(g, 55.2, 22.9, 0.5, 2.3, '#1f2722'); }
      // 사람들
      const R = rng(apr ? 31 : 13);
      const crowd = apr
        ? [['#2f3135', 'hat'], ['#3a3236', 'scarf', true], ['#2b2d31', 'hat'], ['#6e4f39', 'none', true], ['#3e5a78', 'cap'], ['#2f3135', 'hat']]
        : [['#3e5a78', 'cap'], ['#5a4a3a', 'beret'], ['#55573a', 'cap', false, true], ['#3a3240', 'scarf', true], ['#3e5a78', 'none'], ['#55573a', 'cap', false, true]];
      const spots = [[41, 46, 6], [45, 48, 7], [52, 47, 6.5], [49, 53, 9], [44, 56, 10.5], [55, 57, 11]];
      spots.forEach(([x, y, hh], i) => {
        const [c, hat, skirt, rifle] = crowd[i % crowd.length];
        person(g, x, y, hh, { color: c, hat, skirt: skirt ? c : null, rifle, pose: 'walk', t: R() * 6, dir: R() > 0.5 ? 1 : -1, skin: '#c99d7a', hatColor: hat === 'scarf' ? '#2d2a2c' : null });
      });
      if (apr) {
        // 모피 목도리의 부인과 신사
        person(g, 36, 66, 14, { color: '#2b2a2f', coat: '#4a3a33', hat: 'hat', skin: '#d0a88a', dir: 1 });
        ellipse(g, 36.6, 55.8, 1.5, 0.7, '#8a6446');
        // 인민군 장교들
        person(g, 61, 62, 12, { color: '#575d3e', hat: 'peaked', skin: '#c99d7a' });
        person(g, 65.6, 63, 12.4, { color: '#5a603f', hat: 'peaked', skin: '#c99d7a', dir: -1 });
        line(g, 59.8, 56, 62.2, 57.8, '#2a2418', 0.25);
        // 벽보
        const wq = (x0, x1, v0, v1, c) => poly(g, quadOn(RW.n, RW.f, x0, x1, v0, v1), c);
        wq(84, 87.4, 0.6, 0.8, '#c8311f'); wq(87.8, 91.2, 0.58, 0.8, '#e9dcc0'); wq(91.6, 95, 0.6, 0.79, '#2b2b2b');
        line(g, 88.2, onWall(RW.n, RW.f, 88.2, 0.64), 90.8, onWall(RW.n, RW.f, 90.8, 0.64), '#b02a1c', 0.4);
        text(g, '¡DISCIPLINA!', 89.5, onWall(RW.n, RW.f, 89.5, 0.72), 0.9, { color: '#222', align: 'center', rot: 0.55 });
        // 빵 줄
        for (let i = 0; i < 6; i++) person(g, 70 + i * 4.6, 64 + i * 1.4, 10 + i * 0.9, { color: ['#4a4038', '#3a3240', '#504a3a'][i % 3], skirt: i % 2 ? '#3a3240' : null, hat: i % 2 ? 'scarf' : 'beret', dir: -1, skin: '#c99d7a' });
      } else {
        // 구두닦이
        person(g, 79.5, 69, 9, { color: '#3e5a78', pose: 'sit', hat: 'beret', skin: '#c99d7a', dir: 1 });
        poly(g, [[82.2, 66.2], [86, 66.2], [86, 69.2], [82.2, 69.2]], '#b8231b');
        poly(g, [[82.2, 69.2], [86, 66.2], [86, 69.2]], '#161616');
        person(g, 89, 72, 15, { color: '#55573a', hat: 'cap', rifle: true, skin: '#c99d7a', dir: -1 });
      }
      // 가게 점원
      person(g, 28, 61, 11.5, { color: '#2f2a26', shirt: apr ? '#e2ddd2' : '#3e5a78', arms: apr ? 'down' : 'wave', skin: '#c99d7a', dir: 1 });
      vignette(g, 0.22);
    },
    anim(g, t, p) {
      const apr = p.variant === 'apr';
      const fade = apr ? 0.45 : 0;
      const F = apr
        ? [[70, 9, 5, 3.6, 'cnt'], [83, 4, 6, 4, 'red'], [22, 12, 4, 3, 'red']]
        : [[70, 9, 5, 3.6, 'cnt'], [76, 13, 4.4, 3.2, 'red'], [83, 4, 6, 4, 'red'], [91, 9, 5.4, 3.8, 'cnt'], [65.5, 17, 3.4, 2.5, 'cnt'], [22, 12, 4, 3, 'red'], [31, 18, 3.2, 2.3, 'cnt'], [3, 6, 5, 3.6, 'cnt']];
      F.forEach(([x, y, w, h, k], i) => flag(g, x, y, w, h, k, t + i, { fade, torn: apr ? '#c6a276' : null, pole: 1.5 }));
    },
  };

  // ── 레닌 병영 ───────────────────────────────────────
  P.barracks = {
    base(g) {
      rect(g, 0, 0, 100, 75, '#6e5c45');
      // 뒷벽과 세 개의 아치
      rect(g, 18, 10, 64, 33, '#8d7859');
      for (const x of [24, 44, 64]) {
        g.beginPath(); g.moveTo(x, 43); g.lineTo(x, 22); g.arc(x + 6, 22, 6, Math.PI, 0); g.lineTo(x + 12, 43); g.closePath();
        g.fillStyle = lin(g, 0, 16, 0, 43, [[0, '#f6ead0'], [1, '#d9c79f']]); g.fill();
        rect(g, x - 1, 43, 14, 0.6, '#6a5640');
      }
      // 옆벽(원근)
      poly(g, [[0, -2], [18, 10], [18, 43], [0, 70]], '#76644b');
      poly(g, [[100, -2], [82, 10], [82, 43], [100, 70]], '#73614a');
      for (const k of [0.25, 0.55, 0.82]) {
        const x = 18 * (1 - k); line(g, x, 10 - 12 * (1 - k) + 0, x, 43 + 27 * (1 - k), '#5c4c38', 0.9 * (1 - k) + 0.3);
        const xr = 82 + 18 * (1 - k); line(g, xr, 10 - 12 * (1 - k), xr, 43 + 27 * (1 - k), '#5c4c38', 0.9 * (1 - k) + 0.3);
      }
      // 바닥(모래)
      poly(g, [[0, 70], [18, 43], [82, 43], [100, 70], [100, 76], [0, 76]], lin(g, 0, 43, 0, 75, [[0, '#b39a6a'], [1, '#c9b282']]));
      // 빛줄기
      for (const x of [24, 44, 64]) poly(g, [[x, 26], [x + 12, 26], [x + 22, 70], [x + 6, 72]], rgba('#fff3d6', 0.13));
      // 벽보: 머리글자들
      const posters = [['POUM', '#b8231b', '#f3e9d6', 9, 15, -0.1], ['CNT·FAI', '#161616', '#e9dcc0', 14, 20, -0.12], ['UGT', '#c0221c', '#fff', 7.5, 24, -0.08], ['JCI', '#2a3a6a', '#f3e9d6', 13, 27, -0.1]];
      posters.forEach(([s, bg, fg, x, y, rot]) => {
        g.save(); g.translate(x, y); g.rotate(rot); rect(g, -3.4, -2.6, 6.8, 4.6, bg); text(g, s, 0, 0.8, 1.6, { color: fg, align: 'center', family: 'Arial, sans-serif', weight: 800 }); g.restore();
      });
      // 행진하는 신병들
      const R = rng(21);
      const cols = ['#3e5a78', '#5a4a3a', '#6a6a4a', '#3a3a3c', '#7a5a3a', '#4a5a6a'];
      for (let i = 0; i < 6; i++) person(g, 40 + i * 3.6, 53 + (i % 2) * 0.6, 9.5 + R() * 1.2, { color: cols[i], pose: 'march', t: i * 0.9, hat: i % 2 ? 'cap' : 'beret', skin: '#c79c78', broom: i === 3 });
      // 빗자루를 멘 소년
      person(g, 73, 59, 8.6, { color: '#4b4a44', pose: 'march', t: 1, broom: true, hat: 'beret', skin: '#d1a785' });
      // 장교 탁자와 지도
      person(g, 13, 56, 11, { color: '#3d3a32', pose: 'sit', hat: 'cap', skin: '#c79c78' });
      person(g, 20.5, 56, 11, { color: '#4a4436', pose: 'sit', skin: '#c79c78', dir: -1 });
      poly(g, [[6, 54], [33, 52], [35, 55.5], [5, 58]], '#3a2a1c');
      poly(g, [[12, 54], [24, 53.2], [25, 55.4], [12.5, 56.2]], '#e2d7b8');
      line(g, 14, 55, 22, 54, '#8a6a4a', 0.2); line(g, 16, 54.2, 18, 55.8, '#8a6a4a', 0.2);
      line(g, 7, 58, 7, 66, '#2a1e14', 0.6); line(g, 33.5, 55, 33.5, 64, '#2a1e14', 0.6);
      // 이탈리아 민병대원
      person(g, 28, 62, 17, { color: '#3b3529', shirt: '#4d4535', hat: 'cap', hatColor: '#2a1f16', hair: '#c98a3c', skin: '#d2a37d', arms: 'hips' });
      vignette(g, 0.4, '#1a120a');
    },
    anim(g, t) {
      const r = rng(5);
      for (let i = 0; i < 26; i++) {
        const x = 24 + r() * 50 + Math.sin(t * 0.3 + i) * 1.5, y = (30 + r() * 40 + t * (0.4 + r())) % 45 + 26;
        ellipse(g, x, y, 0.12, 0.12, rgba('#fff4d8', 0.5));
      }
    },
  };

  // ── 알쿠비에레의 겨울밤 ───────────────────────────────
  P.trench = {
    dyn: ['warmth', 'light'],
    base(g, p) {
      const night = p.night || 1;
      sky(g, [[0, '#08111f'], [0.45, '#17253c'], [0.6, '#24344d'], [1, '#24344d']]);
      stars(g, 120, 7, 34);
      g.beginPath(); g.arc(82, 10, 2.4, 0, Math.PI * 2); g.fillStyle = '#e9e6d6'; g.fill();
      g.beginPath(); g.arc(83.2, 9.4, 2.2, 0, Math.PI * 2); g.fillStyle = '#0d182a'; g.fill();
      ridge(g, { y: 37, amp: 7, freq: 0.035, seed: 11, fill: '#1b2638' });
      ridge(g, { y: 45, amp: 3.5, freq: 0.06, seed: 5, fill: '#24324a' });
      for (let x = 0; x < 100; x += 1.7) ellipse(g, x, 47 + fbm(x * 0.2, 3) * 4, 1.2, 0.2, rgba('#b8c8dc', 0.12));
      // 참호 안쪽 바닥과 엄폐호
      rect(g, 0, 56, 100, 20, '#1d1914');
      poly(g, [[5, 75], [6, 57], [26, 56], [27, 75]], '#120f0c');
      line(g, 6, 57, 26, 56, '#4a3a28', 1); line(g, 7, 57, 7, 75, '#4a3a28', 0.9); line(g, 25.5, 56.2, 25.5, 75, '#4a3a28', 0.9);
      // 보초 (흉벽 너머를 본다)
      person(g, 70, 66, 15, { color: '#07080b', hat: 'cap', rifle: true, dir: -1 });
      // 흉벽 모래주머니
      sandbags(g, 50, 60, { seed: 4, color: '#3b342b', top: '#5a5143', frost: night >= 3 ? 0.35 + (night - 3) * 0.2 : 0.05, rows: 3 });
      // 불 곁에 웅크린 두 사람
      person(g, 31, 72, 8.5, { color: '#151413', pose: 'sit', hat: 'cap' });
      person(g, 42, 72, 8.5, { color: '#191715', pose: 'sit', dir: -1, coat: '#191715' });
      if (night >= 3) for (let x = 0; x < 100; x += 2.5) ellipse(g, x, 61 + Math.sin(x) * 0.4, 1.6, 0.35, rgba('#e9eef4', 0.25 + (night - 3) * 0.15));
    },
    anim(g, t, p) {
      const night = p.night || 1, warm = p.warmth == null ? 0.6 : p.warmth, light = p.light == null ? 0.6 : p.light;
      // 적의 불
      for (const [x, y, k] of [[70, 33.4, 1], [77, 32.6, 2.3], [58, 35, 4.1]]) {
        const f = 0.6 + 0.4 * Math.sin(t * 6 + k) * Math.sin(t * 2.3 + k);
        glow(g, x, y, 1.6 + f, '#ff9a4a', 0.5 * f); ellipse(g, x, y, 0.22, 0.22, '#ffd59a');
      }
      // 우리 불: 장작이 있을수록 크다
      const fx = 36.5, fy = 70, s = 0.4 + warm * 1.4, f = 0.7 + 0.3 * Math.sin(t * 9) * Math.sin(t * 3.7);
      glow(g, fx, fy - 1, 9 * s * f, '#ff8a3a', 0.45);
      for (let i = 0; i < 5; i++) {
        const ph = (t * 1.6 + i / 5) % 1;
        ellipse(g, fx + Math.sin(t * 7 + i) * 0.5 * s, fy - ph * 4 * s, (1.2 - ph) * s, (2 - ph * 1.4) * s, rgba(ph < 0.4 ? '#ffd07a' : '#ff7a2a', (1 - ph) * 0.85));
      }
      // 엄폐호 속 촛불
      if (light > 0.25) { glow(g, 13, 63, 5 * light, '#ffcf7a', 0.5); ellipse(g, 13, 63.5, 0.3, 0.6, '#ffe9b0'); }
      // 진눈깨비·눈
      if (night === 3) { g.strokeStyle = 'rgba(220,230,240,0.35)'; g.lineWidth = 0.12; const r = rng(2); for (let i = 0; i < 70; i++) { const x = (r() * 110 + t * 9) % 110 - 5, y = (r() * 80 + t * 40) % 80; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 0.8, y + 2.4); g.stroke(); } }
      if (night >= 4) snow(g, t, night === 5 ? 130 : 60, { speed: 2.4, size: 0.28, alpha: 0.75 });
      // 멀리서 총구 불꽃
      const k = Math.floor(t / 4.3);
      if ((t % 4.3) < 0.12 && rng(k)() > 0.4) glow(g, 50 + rng(k + 9)() * 40, 33, 1.5, '#fff2c0', 0.9);
    },
  };

  // ── 우에스카: 사탕무 밭과 적의 흉벽 ───────────────────
  P.parapet = {
    dyn: ['run', 'puff', 'puffAt'],
    base(g) {
      sky(g, [[0, '#93adc6'], [0.42, '#d6dcd8'], [0.47, '#efd6b4'], [1, '#efd6b4']]);
      ridge(g, { y: 28, amp: 8, freq: 0.03, seed: 2, fill: '#a7b4be' });
      ridge(g, { y: 32, amp: 3, freq: 0.05, seed: 8, fill: '#8d9a8c' });
      rect(g, 0, 32, 100, 10, '#7e7a52');
      // 적의 흉벽
      poly(g, [[-1, 38.3], [-1, 34.6], [101, 33.8], [101, 38.3]], '#8b7958');
      for (let x = -2; x < 102; x += 3.1) ellipse(g, x, 34.4 + Math.sin(x) * 0.15, 1.6, 0.7, '#a48f68');
      line(g, -1, 38.3, 101, 38.3, '#5d5038', 0.4);
      // 철조망
      for (let x = 1; x < 100; x += 4.5) line(g, x, 38.6, x + 0.3, 41, '#4a4232', 0.22);
      g.strokeStyle = '#4a4232'; g.lineWidth = 0.1; g.beginPath();
      for (let x = 1; x < 100; x += 0.75) g.lineTo(x, 39.5 + (Math.round(x / 0.75) % 2) * 0.7);
      g.stroke();
      // 사탕무 밭
      poly(g, [[-1, 41], [101, 41], [101, 76], [-1, 76]], '#6a6640');
      for (let k = -34; k <= 34; k++) line(g, 50 + k * 1.4, 41, 50 + k * 9, 76, rgba('#4f4b2c', 0.7), 0.22);
      const r = rng(17);
      for (let j = 0; j < 14; j++) {
        const yy = 42 + (j / 14) ** 1.5 * 30;
        for (let k = -34; k <= 34; k++) {
          const xx = 50 + k * (1.4 + (yy - 41) / 35 * 7.6) + (r() - 0.5);
          ellipse(g, xx, yy, 0.25 + (yy - 41) * 0.03, 0.15 + (yy - 41) * 0.018, rgba(r() > 0.5 ? '#5f7a3a' : '#4d6a30', 0.85));
        }
      }
      // 우리가 숨은 배수로의 가장자리
      ridge(g, { y: 68, amp: 3, freq: 0.08, seed: 4, fill: '#3b3622' });
      for (let x = 0; x < 100; x += 1.3) line(g, x, 66 + r() * 2, x + (r() - 0.5) * 1.5, 62 + r() * 2, '#57532f', 0.25);
    },
    anim(g, t, p) {
      // 우리 비행기들
      for (let i = 0; i < 3; i++) {
        const x = ((t * 2.2 + i * 6) % 130) - 15, y = 9 + i * 2.4 + Math.sin(t + i) * 0.3;
        line(g, x - 2.2, y, x + 2.2, y, '#2d3036', 0.5); line(g, x - 1.6, y + 0.1, x + 1.8, y + 0.1, '#2d3036', 0.25);
        line(g, x - 2.6, y - 0.6, x - 2.2, y, '#2d3036', 0.3);
      }
      const run = p.run == null ? -1 : p.run;
      if (run >= 0 && run <= 1.05) {
        const x = 8 + 84 * run;
        person(g, x, 34, 5.4, { pose: 'run', t: t * 14, arms: 'trousers', color: '#3b3a35', legs: '#3b3a35', shirt: '#ece7da', sleeve: '#d9b08c', skin: '#d9b08c', hair: '#2a2420' });
      }
      if (p.puff != null && p.puff >= 0 && p.puffAt) {
        const age = (performance.now() - p.puffAt) / 1000;
        if (age < 1.6) {
          const x = 8 + 84 * p.puff + 2.5;
          for (let i = 0; i < 5; i++) ellipse(g, x + (i - 2) * 0.6 * (1 + age), 37.6 - age * 1.5 - i * 0.2, 0.6 + age * 1.6, 0.4 + age, rgba('#8a7656', 0.6 * (1 - age / 1.6)));
        }
      }
    },
  };

  // ── 폴리오라마 지붕에서 ───────────────────────────────
  P.rooftop = {
    base(g) {
      sky(g, [[0, '#5f9bd4'], [0.7, '#c4def0'], [1, '#d8e8f2']]);
      // 먼 도시의 탑들
      for (const [x, w, h] of [[82, 3.5, 18], [87, 5, 12], [93, 3, 20], [97, 4, 14]]) rect(g, x, 32 - h, w, h + 2, '#a9b4be');
      // 맞은편 건물들
      rect(g, 18, 8, 64, 48, '#cbb595');
      rect(g, 80, 30, 21, 26, '#c3ab8a');
      // POUM 본부
      rect(g, 20, 12, 22, 44, '#bea583');
      windows(g, 20, 14, 22, 30, 4, 4, { color: '#3a2f27', lit: (i, j) => (j < 3 && (i + j) % 2 ? '#d8d0bf' : null) });
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) for (let k = 0; k < 3; k++) line(g, 21.6 + i * 5.5, 15.6 + j * 7.5 + k * 1.2, 24.6 + i * 5.5, 15.6 + j * 7.5 + k * 1.2, '#b0a690', 0.25);
      rect(g, 20.5, 31, 21, 4.4, '#b8231b');
      text(g, 'P. O. U. M.', 31, 34.4, 3, { color: '#f6efe2', align: 'center', family: 'Arial, sans-serif', weight: 800 });
      // 가운데 건물
      windows(g, 42, 12, 14, 34, 2, 4, { color: '#3a2f27', balcony: '#3a3029' });
      // 카페 모카 건물
      rect(g, 56, 10, 24, 46, '#d3bd9c');
      windows(g, 56, 12, 24, 34, 4, 4, { color: '#2e2620', balcony: '#3a3029' });
      rect(g, 57, 48.2, 22, 3.6, '#efe3c8');
      text(g, 'CAFÉ MOKA', 68, 51.2, 2.6, { color: '#3b2a1e', align: 'center', family: 'Georgia, serif', weight: 700 });
      rect(g, 56, 52, 24, 4.2, '#2a221c');
      windows(g, 80, 32, 21, 18, 3, 2, { color: '#33291f' });
      // 창마다 돌격대원
      for (const [x, y] of [[59.5, 40.6], [65.5, 40.6], [71.5, 40.6], [65.5, 32.2], [77.5, 40.6]]) {
        ellipse(g, x, y - 1, 0.9, 1, '#2b2a2a');
        poly(g, [[x - 1.1, y - 1.7], [x + 1.1, y - 1.7], [x + 0.9, y - 2.6], [x - 0.9, y - 2.6]], '#2f3c55');
        line(g, x + 0.4, y, x + 3, y + 0.8, '#1a1a1a', 0.3);
      }
      // 거리와 바리케이드
      rect(g, 0, 56, 100, 11, '#857e72');
      for (let x = 0; x < 100; x += 1.6) for (let y = 57; y < 67; y += 1) ellipse(g, x + (y % 2) * 0.8, y, 0.65, 0.3, rgba('#6e675c', 0.6));
      const r = rng(8);
      for (let i = 0; i < 60; i++) { const x = 40 + r() * 22, y = 60 + r() * 5.5 - Math.sin(((x - 40) / 22) * Math.PI) * 2.6; poly(g, [[x, y], [x + 1.4, y - 0.2], [x + 1.5, y + 0.8], [x + 0.1, y + 1]], mix('#8f877a', '#5a544b', r())); }
      // 우리 지붕: 난간과 천문대
      rect(g, 0, 67, 100, 9, '#cdbfa6');
      rect(g, 0, 66, 100, 1.4, '#e2d6c0');
      for (let x = 1; x < 100; x += 2.6) { ellipse(g, x, 71, 0.7, 2.4, '#bcae95'); ellipse(g, x - 0.2, 70.4, 0.35, 1.6, '#ddd1bc'); }
      rect(g, 0, 73.4, 100, 1.8, '#a39579');
      rect(g, 2, 34, 14, 33, '#c7b79b');
      g.beginPath(); g.arc(9, 34, 7, Math.PI, 0); g.fillStyle = '#8b9196'; g.fill();
      rect(g, 6.5, 41, 2.2, 5, '#2f2a25'); rect(g, 10.5, 41, 2.2, 5, '#2f2a25');
      line(g, 9, 27, 9, 23, '#55595d', 0.3);
      vignette(g, 0.18);
    },
    anim(g, t) {
      smoke(g, 85, 28, t, { color: '#6e6a66', alpha: 0.3, lean: 0.6, seed: 4 });
      smoke(g, 96, 24, t, { color: '#5e5a56', alpha: 0.25, lean: 0.4, seed: 9, size: 2 });
      flag(g, 93.5, 8.6, 3.6, 2.4, 'cnt', t, { pole: 3.2 });
      flag(g, 83.6, 10.6, 3, 2, 'cat', t + 1, { pole: 3 });
      const k = Math.floor(t / 2.7);
      if (t % 2.7 < 0.1) glow(g, 82 + rng(k)() * 16, 20 + rng(k + 3)() * 10, 1.2, '#fff0b0', 0.9);
    },
  };

  // ── 토레 파비안의 새벽 ────────────────────────────────
  P.dawn = {
    base(g) {
      sky(g, [[0, '#353a5e'], [0.32, '#6d6588'], [0.5, '#c79aa1'], [0.56, '#e9bea2'], [1, '#e9bea2']]);
      ridge(g, { y: 40, amp: 3, freq: 0.05, seed: 3, fill: '#4b4a5c' });
      for (let x = 2; x < 100; x += 5) line(g, x, 41.6, x, 43.2, '#2c2a36', 0.3);
      rect(g, 0, 42.6, 100, 18, '#5a5649');
      for (const [x, h] of [[18, 14], [21.5, 17], [24, 12], [83, 15]]) { line(g, x, 43, x, 43 - h, '#2b2a2f', 0.35); ellipse(g, x, 43 - h * 0.6, 1.4, h * 0.45, '#2e2d33'); }
      sandbags(g, 50, 75, { seed: 6, color: '#3d342b', top: '#5a4c3d', rows: 5, rim: '#f0b27a' });
      rect(g, 44, 55.5, 6, 3.8, '#16131a');
      person(g, 79, 64, 17, { color: '#1c1a20', hat: 'cap', rifle: true, dir: -1 });
      glow(g, 50, 75, 40, '#f3a76a', 0.18);
    },
    anim(g, t) {
      for (let i = 0; i < 3; i++) ellipse(g, ((t * 0.6 + i * 40) % 140) - 20, 45 + i * 1.6, 22, 1.2, rgba('#e8d6d0', 0.12));
    },
  };

  // ── 병원 ─────────────────────────────────────────────
  P.ward = {
    base(g) {
      rect(g, 0, 0, 100, 75, '#e4ded1');
      poly(g, [[0, 0], [30, 18], [30, 44], [0, 75]], '#d8d1c2');
      poly(g, [[100, 0], [70, 18], [70, 44], [100, 75]], '#dcd5c6');
      rect(g, 30, 18, 40, 26, '#e9e4d8');
      poly(g, [[0, 75], [30, 44], [70, 44], [100, 75]], '#b6aa92');
      for (let i = 1; i < 8; i++) { const k = (i / 8) ** 1.5; line(g, 30 - 30 * k, 44 + 31 * k, 70 + 30 * k, 44 + 31 * k, rgba('#8f8470', 0.4), 0.15); }
      for (const k of [0.15, 0.45, 0.8]) { const x0 = 70 + 30 * k, x1 = 70 + 30 * (k + 0.12); poly(g, [[x0, 18 - 18 * k + 4], [x1, 18 - 18 * (k + 0.12) + 4], [x1, 40 + 31 * (k + 0.12) - 8], [x0, 40 + 31 * k - 8]], '#fbf6e6'); }
      for (const k of [0.1, 0.35, 0.65]) {
        const x = 30 - 30 * k, y = 44 + 31 * k, s = 0.5 + k;
        poly(g, [[x + 2 * s, y - 2 * s], [x + 16 * s, y - 2 * s], [x + 16 * s, y + 1.5 * s], [x + 2 * s, y + 1.5 * s]], '#f4f1ea');
        line(g, x + 2 * s, y - 5 * s, x + 2 * s, y + 3 * s, '#3a3a3a', 0.25 * s);
        line(g, x + 16 * s, y - 3 * s, x + 16 * s, y + 3 * s, '#3a3a3a', 0.25 * s);
        ellipse(g, x + 4 * s, y - 2.6 * s, 1.1 * s, 0.9 * s, '#c79c78');
      }
      person(g, 56, 60, 16, { color: '#3b3d44', skirt: '#f0eee8', shirt: '#f0eee8', hat: 'scarf', hatColor: '#f4f2ee', skin: '#d4ab8a' });
      glow(g, 88, 30, 30, '#fff6dc', 0.25);
    },
  };

  // ── 콘티넨탈 호텔 라운지 ──────────────────────────────
  P.lobby = {
    base(g) {
      rect(g, 0, 0, 100, 75, '#4b2f25');
      rect(g, 14, 6, 72, 40, '#6a4535');
      for (const x of [22, 42, 62]) {
        g.beginPath(); g.moveTo(x, 42); g.lineTo(x, 14); g.arc(x + 8, 14, 8, Math.PI, 0); g.lineTo(x + 16, 42); g.closePath();
        g.fillStyle = lin(g, 0, 6, 0, 42, [[0, '#fbeccb'], [1, '#e7c991']]); g.fill();
        for (let k = 0; k < 6; k++) line(g, x + 1.5 + k * 2.6, 8, x + 1.5 + k * 2.6, 42, rgba('#ffffff', 0.35), 0.5);
        poly(g, [[x - 1.6, 4], [x + 2, 4], [x + 1, 43], [x - 2.4, 43]], '#7a1f22');
        poly(g, [[x + 14, 4], [x + 17.6, 4], [x + 18.4, 43], [x + 15, 43]], '#7a1f22');
      }
      poly(g, [[0, 75], [14, 46], [86, 46], [100, 75]], '#cfc6b4');
      for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) {
        const k0 = (j / 6) ** 1.4, k1 = ((j + 1) / 6) ** 1.4;
        const y0 = 46 + 29 * k0, y1 = 46 + 29 * k1;
        const xa = (u, k) => (14 - 14 * k) + (72 + 28 * k) * u;
        if ((i + j) % 2) poly(g, [[xa(i / 9, k0), y0], [xa((i + 1) / 9, k0), y0], [xa((i + 1) / 9, k1), y1], [xa(i / 9, k1), y1]], '#a79d89');
      }
      // 야자 화분
      rect(g, 6, 58, 6, 6, '#7a4a32');
      for (let a = -1.3; a < 1.4; a += 0.35) { g.beginPath(); g.moveTo(9, 58); g.quadraticCurveTo(9 + Math.sin(a) * 6, 46, 9 + Math.sin(a) * 10, 50 + Math.abs(a) * 4); g.strokeStyle = '#3c5a2e'; g.lineWidth = 0.7; g.stroke(); }
      // 안락의자와 신문 읽는 사람들
      for (const [x, d] of [[22, 1], [78, -1]]) {
        poly(g, [[x - 6, 64], [x + 6, 64], [x + 6.5, 55], [x - 6.5, 55]], '#6b2723');
        rect(g, x - 7, 56, 14, 3, '#7e302a');
        person(g, x, 63, 12, { color: '#2a2a2e', pose: 'sit', dir: d, skin: '#cfa384', arms: 'front' });
        poly(g, [[x + 1.5 * d, 52], [x + 6.5 * d, 51.4], [x + 6.8 * d, 56.5], [x + 1.8 * d, 57]], '#e9e2d2');
      }
      // 아일린
      person(g, 50, 70, 23, { color: '#1f1c22', skirt: '#2b2530', shirt: '#2b2530', skin: '#d9b496', hair: '#3a2a22', arms: 'down' });
      glow(g, 50, 30, 50, '#ffd9a0', 0.12);
      vignette(g, 0.45, '#140a06');
    },
    anim(g, t) {
      line(g, 50, 0, 50, 6, '#3a2a20', 0.25);
      glow(g, 50, 7.5, 6 + Math.sin(t * 2) * 0.3, '#ffe3a8', 0.45);
      for (let i = 0; i < 7; i++) ellipse(g, 46 + i * 1.3, 7.6 + Math.sin(i) * 0.4, 0.3, 0.5, rgba('#fff3d0', 0.7 + 0.3 * Math.sin(t * 3 + i)));
    },
  };

  // ── 숨은 밤 ─────────────────────────────────────────
  P.night = {
    base(g) {
      sky(g, [[0, '#070b17'], [0.6, '#151c31'], [1, '#1e2438']]);
      stars(g, 90, 12, 36);
      const r = rng(3);
      let x = 28;
      while (x < 100) { const w = 4 + r() * 7, hh = 8 + r() * 12; rect(g, x, 46 - hh, w, hh + 1, '#0d111b'); for (let i = 0; i < 3; i++) if (r() > 0.6) rect(g, x + r() * (w - 1), 46 - hh + r() * (hh - 2), 0.7, 0.9, '#e8c070'); x += w + 0.3; }
      // 부서진 건물
      poly(g, [[0, 60], [0, 14], [6, 12], [9, 17], [14, 13], [19, 20], [24, 18], [26, 60]], '#151924');
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) rect(g, 3 + i * 7.5, 22 + j * 8.5, 3.4, 4.6, i === 1 && j === 0 ? '#1a2238' : '#0e1426');
      // 가로등
      line(g, 72, 60, 72, 24, '#1a1d24', 0.5);
      ellipse(g, 72, 23.5, 1.4, 0.8, '#2a2a2a');
      poly(g, [[71, 24], [73, 24], [80, 60], [64, 60]], rgba('#f3d58a', 0.08));
      glow(g, 72, 24, 6, '#ffd98a', 0.6);
      // 공터의 긴 풀과 웅크려 누운 사람
      rect(g, 0, 58, 100, 18, '#141a14');
      person(g, 56, 68.5, 13, { color: '#0c0d10', pose: 'lie', dir: -1, skin: '#2a2622' });
    },
    anim(g, t) {
      const a = -2.2 + Math.sin(t * 0.25) * 0.6;
      g.save();
      g.translate(88, 46);
      g.rotate(a);
      poly(g, [[0, -0.4], [80, -4], [80, 4], [0, 0.4]], rgba('#cfd8ff', 0.07));
      g.restore();
      const r = rng(11);
      for (let i = 0; i < 160; i++) {
        const x = r() * 104 - 2, base = 76, hh = 6 + r() * 12;
        const sway = Math.sin(t * 1.4 + x * 0.3) * 0.8;
        g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + sway * 0.5, base - hh * 0.6, x + sway, base - hh);
        g.strokeStyle = i % 3 ? '#1f2a1d' : '#2c3a28'; g.lineWidth = 0.35; g.stroke();
      }
    },
  };

  // ── 국경으로 가는 열차 ────────────────────────────────
  P.train = {
    base(g) {
      rect(g, 0, 0, 100, 75, '#4f3324');
      for (let x = 0; x < 100; x += 6) line(g, x, 56, x, 75, '#5c3d2b', 0.4);
      // 창(가운데는 비워 두고 움직이는 풍경이 들어온다)
      g.clearRect(10, 8, 80, 46);
      rect(g, 8, 6, 84, 2.4, '#2f1d14'); rect(g, 8, 53.6, 84, 2.6, '#2f1d14');
      rect(g, 8, 6, 2.4, 50, '#2f1d14'); rect(g, 89.6, 6, 2.4, 50, '#2f1d14');
      rect(g, 49, 8, 1.4, 46, '#3a251a');
      // 좌석과 신문
      rect(g, 0, 64, 100, 11, '#6a2e2a');
      poly(g, [[58, 63], [80, 61.8], [81.5, 67.5], [59.5, 68.6]], '#e8e1cf');
      for (let k = 0; k < 5; k++) line(g, 61, 64 + k * 0.9, 78, 63 + k * 0.9, rgba('#6a645a', 0.6), 0.25);
      text(g, 'LA VANGUARDIA', 69, 63.6, 1.2, { color: '#222', align: 'center', rot: -0.055 });
    },
    anim(g, t) {
      g.save();
      g.beginPath(); g.rect(10.4, 8.4, 79.2, 45.2); g.clip();
      rect(g, 0, 0, 100, 60, lin(g, 0, 8, 0, 54, [[0, '#a6c4dc'], [0.7, '#e3e8dc'], [1, '#e3e8dc']]));
      const scroll = (speed, fn) => { const o = (t * speed) % 100; g.save(); g.translate(-o, 0); fn(); g.translate(100, 0); fn(); g.restore(); };
      scroll(1.2, () => ridge(g, { y: 30, amp: 8, freq: 0.06, seed: 4, fill: '#9aa98f', x0: 0, x1: 100 }));
      // 국경이 가까워지면 바다가 보인다
      const sea = Math.min(1, Math.max(0, (t % 60) / 30 - 0.5));
      if (sea > 0) { rect(g, 54, 33, 36, 4, rgba('#6aa0c4', sea)); for (let i = 0; i < 12; i++) ellipse(g, 56 + i * 3 + Math.sin(t + i) * 0.6, 34 + (i % 3), 0.5, 0.12, rgba('#ffffff', sea * 0.7)); }
      scroll(6, () => {
        ridge(g, { y: 40, amp: 4, freq: 0.08, seed: 9, fill: '#8d9a62', x0: 0, x1: 100 });
        for (let x = 2; x < 100; x += 6) { ellipse(g, x, 39 - fbm(x * 0.08, 9) * 4, 1.6, 1.2, '#6c7a4a'); line(g, x, 40 - fbm(x * 0.08, 9) * 4, x, 41.4 - fbm(x * 0.08, 9) * 4, '#5a4a3a', 0.3); }
      });
      scroll(22, () => {
        rect(g, 0, 44, 100, 12, '#a39463');
        for (let x = 0; x < 100; x += 2.2) line(g, x, 44, x - 4, 56, '#7a6f45', 0.5);
        line(g, 30, 14, 30, 50, '#3a3026', 0.5); line(g, 27.5, 16, 32.5, 16, '#3a3026', 0.4);
        line(g, 80, 14, 80, 50, '#3a3026', 0.5); line(g, 77.5, 16, 82.5, 16, '#3a3026', 0.4);
      });
      g.restore();
      rect(g, 10.4, 8.4, 79.2, 45.2, rgba('#ffffff', 0.04));
      rect(g, 49, 8, 1.4, 46, '#3a251a');
    },
  };

  // ── 남부 잉글랜드 ────────────────────────────────────
  P.england = {
    base(g) {
      sky(g, [[0, '#b4cfe5'], [0.55, '#e7ecea'], [1, '#f3efe2']]);
      ridge(g, { y: 30, amp: 4, freq: 0.04, seed: 1, fill: '#9cba78' });
      // 마을
      const r = rng(6);
      for (let i = 0; i < 9; i++) { const x = 54 + i * 1.8 + r(), y = 31.5 + r() * 2; rect(g, x, y, 1.5, 1.4, '#efe7d6'); poly(g, [[x - 0.2, y], [x + 0.75, y - 1], [x + 1.7, y]], '#a84a32'); }
      rect(g, 60.4, 26, 1, 6, '#e6dfcf'); poly(g, [[60.2, 26], [60.9, 21.5], [61.6, 26]], '#8a8378');
      ridge(g, { y: 38, amp: 3, freq: 0.05, seed: 2, fill: '#86a862' });
      ridge(g, { y: 46, amp: 3, freq: 0.05, seed: 3, fill: '#76a052' });
      for (const y of [33, 41, 48.6]) for (let x = 0; x < 100; x += 0.9) ellipse(g, x, y - fbm(x * 0.05, y) * 3, 0.7, 0.45, '#4b6b33');
      // 느릅나무
      for (const [x, y, s] of [[40, 32, 3.4], [72, 37, 2.8], [18, 42, 4.2], [90, 43, 3.6]]) { line(g, x, y, x, y - s, '#3a3022', 0.4); ellipse(g, x, y - s * 1.6, s * 0.9, s * 1.2, '#3f5f30'); ellipse(g, x - s * 0.3, y - s * 1.8, s * 0.55, s * 0.7, '#4c6f38'); }
      ridge(g, { y: 56, amp: 2, freq: 0.06, seed: 4, fill: '#6a9548' });
      // 말 두 마리
      for (const [x, d] of [[26, 1], [31, -1]]) {
        ellipse(g, x, 52, 2.6, 1.3, '#7a4a2a');
        poly(g, [[x + 1.9 * d, 51.6], [x + 3.2 * d, 49], [x + 4.3 * d, 49.4], [x + 2.8 * d, 52.2]], '#7a4a2a');
        ellipse(g, x + 4.1 * d, 49.9, 0.9, 0.55, '#6a3e22');
        for (const lx of [-1.8, -1.1, 1.1, 1.8]) line(g, x + lx, 52.6, x + lx, 55.2, '#5a3a20', 0.35);
      }
      // 개울과 버드나무
      g.beginPath(); g.moveTo(30, 66); g.quadraticCurveTo(48, 58, 56, 63); g.quadraticCurveTo(66, 68, 84, 61);
      g.strokeStyle = '#7fa7c0'; g.lineWidth = 2.6; g.stroke();
      for (const x of [47, 60]) { line(g, x, 62, x, 56, '#4a3d2a', 0.4); for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(x, 55.5); g.quadraticCurveTo(x + k * 0.9, 54, x + k * 1.2, 60); g.strokeStyle = '#88a65a'; g.lineWidth = 0.35; g.stroke(); } }
      // 광고판
      line(g, 76, 50, 76, 55, '#3a3026', 0.45); line(g, 87, 50, 87, 55, '#3a3026', 0.45);
      rect(g, 74.6, 43, 14, 7.4, '#f3ead6');
      rect(g, 75.2, 43.6, 6.2, 6.2, '#2d4a7a'); text(g, 'CRICKET', 78.3, 47.4, 1.2, { color: '#f3ead6', align: 'center', family: 'Arial, sans-serif', weight: 800 });
      rect(g, 81.8, 43.6, 6.2, 6.2, '#b8231b'); text(g, 'ROYAL', 84.9, 46.6, 1.1, { color: '#f3ead6', align: 'center', family: 'Arial, sans-serif', weight: 800 }); text(g, 'WEDDING', 84.9, 48.2, 0.9, { color: '#f3ead6', align: 'center', family: 'Arial, sans-serif', weight: 800 });
      // 철길과 들꽃
      rect(g, 0, 68, 100, 8, '#7d7a62');
      line(g, 0, 70, 100, 69, '#4a4a48', 0.5); line(g, 0, 73.5, 100, 72.5, '#4a4a48', 0.5);
      for (let i = 0; i < 70; i++) ellipse(g, r() * 100, 66 + r() * 3, 0.35, 0.35, ['#d8433a', '#e9c440', '#f4f0f0', '#7f5ab0'][i % 4]);
    },
    anim(g, t) {
      for (let i = 0; i < 4; i++) { const x = ((t * 0.8 + i * 30) % 130) - 15; ellipse(g, x, 8 + i * 3, 9, 2, rgba('#ffffff', 0.6)); ellipse(g, x + 4, 7 + i * 3, 6, 2.2, rgba('#ffffff', 0.5)); }
      for (let i = 0; i < 3; i++) { const x = ((t * 3 + i * 9) % 120) - 10, y = 16 + Math.sin(t * 2 + i) * 1.5; g.beginPath(); g.moveTo(x - 0.9, y - 0.4); g.quadraticCurveTo(x, y + 0.2, x + 0.9, y - 0.4); g.strokeStyle = '#3a3a3a'; g.lineWidth = 0.2; g.stroke(); }
    },
  };

  // ════════ 카잔차키스 ════════════════════════════════════

  // ── 톨레도: 엘 그레코의 하늘, 기억(mix 0)과 지금(mix 1) ──
  P.toledo = {
    base(g, p) {
      const m = Math.max(0, Math.min(1, p.mix || 0));
      const c = (a, b) => mix(a, b, m);
      sky(g, [[0, c('#0d262f', '#191f21')], [0.25, c('#1f4a4c', '#3a4342')], [0.45, c('#5f8a7c', '#6e7470')], [0.62, c('#a9c0a6', '#8f9188')], [1, c('#a9c0a6', '#8f9188')]]);
      grecoClouds(g, { seed: 7, y0: 2, y1: 26, n: 30, light: c('#eef4e6', '#c9c8c0'), dark: c('#163236', '#22282a') });
      // 먼 언덕
      ridge(g, { y: 40, amp: 6, freq: 0.04, seed: 21, fill: c('#2c4d3a', '#3b3f37') });
      // 타베라 병원(성 밖)
      rect(g, 6, 28, 12, 7, c('#c9cbc0', '#9a9a92'));
      g.beginPath(); g.arc(12, 28, 3, Math.PI, 0); g.fillStyle = c('#9aa196', '#6e706a'); g.fill();
      windows(g, 6.5, 29, 11, 5, 5, 2, { color: '#3a3e3a' });
      // 도시의 언덕
      g.beginPath(); g.moveTo(-1, 60); g.bezierCurveTo(14, 44, 26, 36, 46, 37); g.bezierCurveTo(66, 35, 84, 40, 101, 54); g.lineTo(101, 76); g.lineTo(-1, 76); g.closePath();
      g.fillStyle = lin(g, 0, 36, 0, 70, [[0, c('#2f5c38', '#454a3a')], [1, c('#1d3a26', '#2f3229')]]); g.fill();
      // 도시: 엘 그레코가 그린 듯한 창백한 덩어리들
      const r = rng(31);
      const blocks = [];
      for (let i = 0; i < 46; i++) {
        const x = 22 + r() * 62, w = 1.6 + r() * 3.4, hh = 2 + r() * 4.2;
        const base = 41 - Math.sin(((x - 22) / 62) * Math.PI) * 6 + r() * 1.5;
        blocks.push([x, base, w, hh]);
      }
      blocks.sort((a, b) => a[1] - b[1]).forEach(([x, base, w, hh], i) => {
        rect(g, x, base - hh, w, hh, c('#d9ddd1', '#b6b3a8'));
        rect(g, x + w * 0.62, base - hh, w * 0.38, hh, c('#9aa79b', '#7d7a72'));
        poly(g, [[x - 0.2, base - hh], [x + w * 0.5, base - hh - 1], [x + w + 0.2, base - hh]], c('#8f8a7c', '#5f5a52'));
        if (i % 3 === 0) rect(g, x + w * 0.3, base - hh * 0.6, 0.3, 0.5, '#333a36');
        if (m > 0.3 && i % 4 === 1) rect(g, x, base - hh, w, hh, rgba('#1d1814', (m - 0.3) * 0.9));
      });
      // 대성당과 탑
      rect(g, 24, 27, 7.4, 10, c('#dcdfd4', '#b9b6aa'));
      poly(g, [[23.6, 27], [27.7, 23.6], [31.8, 27]], c('#8d8a7e', '#5f5b53'));
      rect(g, 32.6, 17, 2.6, 19, c('#e2e4da', '#bdbaae'));
      poly(g, [[32.4, 17], [33.9, 10], [35.4, 17]], c('#3a4048', '#3a3a38'));
      // 알카사르
      rect(g, 57, 19.5, 13, 9.5, c('#e3e5db', '#a9a597'));
      windows(g, 57.5, 21, 12, 7, 6, 2, { color: '#3a3f3c' });
      const tw = (x) => {
        const hgt = 7.5 * (1 - m) + 1.6 * m;
        rect(g, x - 1.2, 19.5 - hgt * 0.55, 2.4, hgt * 0.55 + 9.5, c('#e8eae0', '#a29d8f'));
        if (m < 0.6) poly(g, [[x - 1.5, 19.5 - hgt * 0.55], [x, 19.5 - hgt * 0.55 - 5 * (1 - m)], [x + 1.5, 19.5 - hgt * 0.55]], rgba('#2f363e', 1 - m * 1.5));
        if (m > 0.4) for (let k = 0; k < 4; k++) poly(g, [[x - 1.2 + k * 0.6, 19.5 - hgt * 0.55], [x - 0.9 + k * 0.6, 19.5 - hgt * 0.55 - 0.9 * (k % 2 + 0.4)], [x - 0.6 + k * 0.6, 19.5 - hgt * 0.55]], c('#e8eae0', '#a29d8f'));
      };
      [57, 70].forEach(tw);
      if (m > 0.35) {
        for (let i = 0; i < 18; i++) rect(g, 57 + r() * 13, 19.5 + r() * 9, 0.9 + r(), 0.7 + r(), rgba('#26201a', (m - 0.35) * 1.4));
        for (let i = 0; i < 14; i++) ellipse(g, 56 + r() * 16, 29 + r() * 3, 1 + r(), 0.6, rgba('#8e877a', m));
      }
      // 다리와 강
      g.beginPath(); g.moveTo(-1, 64); g.bezierCurveTo(25, 60, 45, 70, 101, 63); g.lineTo(101, 69); g.bezierCurveTo(45, 76, 25, 66, -1, 70); g.closePath();
      g.fillStyle = c('#355a5c', '#4a5452'); g.fill();
      for (let i = 0; i < 9; i++) ellipse(g, 6 + i * 11, 65.5 + Math.sin(i) * 1.2, 2.5, 0.25, rgba('#cfe3d8', 0.35 * (1 - m * 0.6)));
      rect(g, 9, 53.5, 19, 4, c('#b9b39f', '#9b968a'));
      for (const x of [11, 17.2, 23.4]) { g.beginPath(); g.arc(x + 1.8, 61, 2.6, Math.PI, 0); g.lineTo(x + 4.4, 57.4); g.lineTo(x - 0.8, 57.4); g.closePath(); g.fillStyle = c('#a39d89', '#87837a'); g.fill(); g.beginPath(); g.arc(x + 1.8, 61.2, 1.9, Math.PI, 0); g.fillStyle = c('#2a4446', '#3a4442'); g.fill(); }
      rect(g, 8, 50.5, 2.4, 4, c('#c6c0ac', '#a6a196')); rect(g, 26.6, 50.5, 2.4, 4, c('#c6c0ac', '#a6a196'));
      // 수풀
      const rr = rng(4);
      for (let i = 0; i < 60; i++) ellipse(g, rr() * 100, 44 + rr() * 22, 0.9 + rr() * 1.4, 0.6 + rr() * 0.9, rgba(c('#1f4a28', '#4a4232'), 0.8));
      // 지금: 무너진 성문과 붉은 모자의 보초
      if (m > 0.5) {
        const a = Math.min(1, (m - 0.5) * 2.2);
        g.save(); g.globalAlpha = a;
        rect(g, 77, 46, 4, 20, '#8f8a7c'); rect(g, 89, 49, 4, 17, '#8f8a7c');
        poly(g, [[77, 46], [81, 46], [84, 43.5], [86, 47], [89, 49], [93, 49], [93, 52], [77, 52]], '#7c776a');
        for (let i = 0; i < 8; i++) poly(g, [[78 + i * 1.8, 66], [79 + i * 1.8, 63.5 + (i % 3)], [80.4 + i * 1.8, 66]], '#6d685c');
        person(g, 82.5, 67, 13, { color: '#3d3427', cape: '#8a7a5e', hat: 'fez', rifle: true, skin: '#7a5236', stretch: 1.15, dir: -1 });
        g.restore();
      }
      vignette(g, 0.35, '#0a1414');
    },
    anim(g, t, p) {
      const m = p.mix || 0;
      if (m > 0.2) {
        smoke(g, 63, 19, t, { color: '#5a5650', alpha: 0.32 * m, lean: 0.8, seed: 2, size: 2.2 });
        smoke(g, 44, 35, t + 3, { color: '#4e4a45', alpha: 0.22 * m, lean: 0.6, seed: 6, size: 1.6, rise: 1.6 });
        flag(g, 63.4, 12.6, 3, 2, 'nat', t, { amp: 0.12, pole: 2.4 + 4 * (1 - m) });
      }
      // 구름 가장자리의 흰 빛이 숨 쉬듯
      g.save(); g.globalAlpha = 0.08 + 0.05 * Math.sin(t * 0.7);
      grecoClouds(g, { seed: 13, y0: 4, y1: 18, n: 6, light: '#ffffff', dark: '#000000', t });
      g.restore();
    },
  };

  // ── 아테네의 작업실 ───────────────────────────────────
  const spainPath = (() => { try { return new Path2D(MAPDATA.iberia.spain); } catch (e) { return null; } })();
  P.athens = {
    base(g) {
      rect(g, 0, 0, 100, 75, '#3b342d');
      // 창밖: 저녁의 아크로폴리스
      rect(g, 52, 6, 44, 40, lin(g, 0, 6, 0, 46, [[0, '#3a3f6b'], [0.55, '#c7765a'], [1, '#ebb27c']]));
      ridge(g, { y: 36, amp: 6, freq: 0.08, seed: 3, fill: '#5e4a40', x0: 52, x1: 96, bottom: 46 });
      poly(g, [[60, 36], [64, 26], [82, 25], [87, 36]], '#8a6a4a');
      rect(g, 66, 21.8, 12, 1.2, '#e8c79a'); poly(g, [[66, 21.8], [72, 19.6], [78, 21.8]], '#e3c08f');
      for (let i = 0; i < 9; i++) rect(g, 66.4 + i * 1.32, 23, 0.55, 3, '#e0bb88');
      rect(g, 65.8, 26, 12.6, 0.8, '#d9b07c');
      const r = rng(5);
      for (let i = 0; i < 26; i++) { const x = 52 + r() * 44, y = 38 + r() * 7; rect(g, x, y, 1.4 + r() * 2, 1, '#d8cbb5'); }
      rect(g, 50.6, 4.6, 46.8, 2, '#2a211a'); rect(g, 50.6, 45, 46.8, 2.4, '#2a211a');
      rect(g, 50.6, 4.6, 2, 42, '#2a211a'); rect(g, 95.4, 4.6, 2, 42, '#2a211a'); rect(g, 73, 6, 1.2, 40, '#2a211a');
      // 벽의 스페인 지도
      g.save(); g.translate(15, 30); g.rotate(-0.03);
      rect(g, -9.5, -9, 19, 17, '#e9e0c9');
      if (spainPath) {
        g.save(); g.translate(-8.4, -7.6); g.scale(17 / 600, 17 / 600);
        g.fillStyle = '#d8ccb0'; g.fill(spainPath); g.lineWidth = 12; g.strokeStyle = '#7a6a50'; g.stroke(spainPath);
        g.restore();
      }
      line(g, -2, -1.6, 0.4, 2.4, '#a0522d', 0.25);
      g.beginPath(); g.arc(-1.3, 2.4, 0.9, 0, Math.PI * 2); g.arc(-1.3, 2.4, 1.3, 0, Math.PI * 2); g.strokeStyle = '#a0522d'; g.lineWidth = 0.18; g.stroke();
      ellipse(g, 0, -8.4, 0.5, 0.5, '#b8231b');
      g.restore();
      // 책상
      rect(g, 0, 52, 100, 23, '#4c3524');
      rect(g, 0, 52, 100, 1, '#6a4a32');
      // 신문
      g.save(); g.translate(35, 59); g.rotate(-0.06);
      rect(g, -11, -5, 22, 10.5, '#e9e2cf');
      text(g, 'ΚΑΘΗΜΕΡΙΝΗ', 0, -2.4, 2, { color: '#1d1b18', align: 'center' });
      line(g, -10, -1.6, 10, -1.6, '#1d1b18', 0.15);
      for (let k = 0; k < 4; k++) for (let j = 0; j < 5; j++) line(g, -10 + k * 5.2, j * 1.1, -6 + k * 5.2, j * 1.1, rgba('#5c564c', 0.6), 0.2);
      g.restore();
      // 램프와 잉크병
      rect(g, 10.4, 44, 1.2, 10, '#2a2a28'); poly(g, [[6, 44], [16, 44], [14, 38], [8, 38]], '#2f5a3a');
      ellipse(g, 26, 55, 1.6, 0.6, '#1c1c24'); rect(g, 24.8, 52.8, 2.4, 2.4, '#1c1c24');
      line(g, 44, 57, 52, 54, '#2a2018', 0.35);
      glow(g, 11, 48, 22, '#ffcf80', 0.28);
    },
  };

  // ── 살라망카, 마요르 광장 ─────────────────────────────
  P.salamanca = {
    base(g) {
      sky(g, [[0, '#6c9ccd'], [0.8, '#cfe0ea'], [1, '#e2ecef']]);
      rect(g, 0, 9, 100, 54, lin(g, 0, 9, 0, 63, [[0, '#dcab62'], [1, '#c48f4a']]));
      rect(g, 0, 8, 100, 1.6, '#b07a3c');
      windows(g, 0, 11, 100, 29, 16, 3, { color: '#3a2a1c', balcony: '#2e2219', ww: 0.38, wh: 0.5 });
      for (let x = 2; x < 100; x += 6.25) { g.beginPath(); g.arc(x + 1.1, 42.4, 1.2, 0, Math.PI * 2); g.fillStyle = '#b8823f'; g.fill(); g.lineWidth = 0.2; g.strokeStyle = '#8a5a2a'; g.stroke(); }
      // 아케이드
      for (let x = 0; x < 100; x += 6.25) {
        g.beginPath(); g.moveTo(x + 0.9, 63); g.lineTo(x + 0.9, 49); g.arc(x + 3.1, 49, 2.2, Math.PI, 0); g.lineTo(x + 5.3, 63); g.closePath();
        g.fillStyle = '#4a2f18'; g.fill();
      }
      rect(g, 0, 44.6, 100, 1, '#a8733a');
      // 그랜드 호텔 간판
      rect(g, 6, 36.6, 16, 4.4, '#2a2018');
      text(g, 'GRAN HOTEL', 14, 39.9, 2.2, { color: '#e9c46a', align: 'center', family: 'Georgia, serif', weight: 700 });
      // 광장 바닥
      rect(g, 0, 63, 100, 12, '#cbb592');
      for (let i = 0; i < 10; i++) line(g, 0, 63 + i * 1.3, 100, 63 + i * 1.3, rgba('#a8936e', 0.4), 0.12);
      // 흰 망토의 모로코 기병들
      person(g, 27.5, 63.5, 15, { color: '#d9d0bf', cape: '#efe8da', hat: 'hood', hatColor: '#efe8da', skin: '#6e4a30', rifle: true, stretch: 1.12 });
      person(g, 33, 63.5, 15, { color: '#d9d0bf', cape: '#ebe3d4', hat: 'hood', hatColor: '#ebe3d4', skin: '#6e4a30', rifle: true, stretch: 1.12, dir: -1 });
      // 행진하는 푸른 셔츠
      for (let i = 0; i < 5; i++) person(g, 38 + i * 4, 68.5 - (i % 2) * 0.4, 13, { color: '#24262c', shirt: '#2d4a7a', sleeve: '#2d4a7a', pose: 'march', t: i * 1.2, skin: '#c99d7a', stretch: 1.1, hat: i === 2 ? 'beret' : null, hatColor: '#1a1a1a' });
      // 카페의 독일 장교들
      poly(g, [[65, 61.5], [76, 61.5], [75, 62.6], [66, 62.6]], '#5a4a3a');
      line(g, 70.5, 62.6, 70.5, 67, '#3a2e22', 0.5);
      person(g, 66.5, 67, 12, { color: '#5f6466', pose: 'sit', hat: 'peaked', hatColor: '#4f5456', skin: '#d8b090', stretch: 1.08 });
      person(g, 75, 67, 12, { color: '#62676a', pose: 'sit', hat: 'peaked', hatColor: '#4f5456', skin: '#d8b090', dir: -1, stretch: 1.08 });
      ellipse(g, 69, 61, 0.6, 0.35, '#f4efe4'); ellipse(g, 72.5, 61, 0.6, 0.35, '#f4efe4');
      // 사제와 장교
      person(g, 85.5, 66, 16, { color: '#141416', skirt: '#151517', hat: 'teja', skin: '#d0a88a', stretch: 1.14 });
      person(g, 90.5, 66.4, 15.4, { color: '#4f5638', hat: 'peaked', skin: '#c99d7a', stretch: 1.12, dir: -1 });
      vignette(g, 0.2);
    },
    anim(g, t) {
      const F = [[12, 13.8, 'falange'], [31, 13.8, 'nat'], [50, 13.8, 'falange'], [68.6, 13.8, 'nat'], [87, 13.8, 'falange'], [24.8, 23.4, 'nat'], [56, 23.4, 'falange'], [81, 23.4, 'nat']];
      F.forEach(([x, y, k], i) => flag(g, x, y, 4.2, 3, k, t + i * 0.7, { amp: 0.06, pole: 0.6 }));
      flag(g, 54, 51.5, 3.4, 2.4, 'falange', t, { pole: 6 });
    },
  };

  // ── 우나무노의 서재 ───────────────────────────────────
  P.study = {
    base(g) {
      rect(g, 0, 0, 100, 75, '#271e18');
      // 책장
      rect(g, 0, 0, 29, 62, '#3a2a1e');
      const r = rng(19);
      for (let j = 0; j < 6; j++) {
        const y = 3 + j * 9.6;
        rect(g, 0, y + 8, 29, 0.9, '#2a1d14');
        let x = 0.8;
        while (x < 28) { const w = 0.7 + r() * 1.2, hh = 6 + r() * 1.8; rect(g, x, y + 8 - hh, w, hh, mix(['#6a3a2a', '#3a4a5a', '#5a5a3a', '#7a6a4a', '#4a2a2a'][Math.floor(r() * 5)], '#000000', r() * 0.3)); x += w + 0.12; }
      }
      // 창: 저녁의 대성당
      rect(g, 74, 6, 23, 28, lin(g, 0, 6, 0, 34, [[0, '#46557a'], [1, '#d09a70']]));
      poly(g, [[74, 34], [74, 26], [78, 24], [80, 18], [82, 24], [86, 23], [86, 16], [88, 12], [90, 16], [90, 22], [95, 25], [97, 25], [97, 34]], '#2a2430');
      g.beginPath(); g.arc(86.4, 23, 3.4, Math.PI, 0); g.fillStyle = '#2a2430'; g.fill();
      rect(g, 73, 5, 25, 1.4, '#1c140f'); rect(g, 73, 33.6, 25, 1.6, '#1c140f'); rect(g, 73, 5, 1.4, 30, '#1c140f'); rect(g, 96.6, 5, 1.4, 30, '#1c140f'); rect(g, 85, 6, 1, 28, '#1c140f');
      // 책상과 등잔
      rect(g, 24, 52, 58, 3, '#4a3322'); rect(g, 26, 55, 54, 20, '#33241a');
      line(g, 52, 52, 52, 40, '#2a2420', 0.6); poly(g, [[47, 40], [57, 40], [55, 35], [49, 35]], '#2c4a3a');
      glow(g, 52, 46, 26, '#ffcf7a', 0.38);
      // 노인
      person(g, 66, 66, 26, { color: '#141214', pose: 'sit', dir: -1, skin: '#e2c4a6', arms: 'front', glasses: '#2a2420', beard: '#eeeae2', hair: '#e8e4dc', stretch: 1.1 });
      // 종이새들
      for (let i = 0; i < 6; i++) {
        const x = 36 + i * 2.4, y = 51.4 - (i % 2) * 0.6;
        poly(g, [[x - 1, y], [x + 1.1, y], [x + 0.2, y - 1.6]], '#f4f1ea');
        poly(g, [[x + 0.9, y], [x + 1.7, y - 1.3], [x + 1.4, y]], '#e2ddd2');
        poly(g, [[x - 0.9, y], [x - 1.4, y - 0.9], [x - 0.5, y]], '#e9e5dc');
      }
      // 원고와 펜
      poly(g, [[56, 51.6], [64, 51], [64.4, 52.2], [56.4, 52.6]], '#e6dcc6');
      vignette(g, 0.55, '#0c0806');
    },
    anim(g, t) {
      glow(g, 52, 44, 8 + Math.sin(t * 3.1) * 0.4 + Math.sin(t * 7) * 0.2, '#ffdf9a', 0.18);
    },
  };

  // ── 아빌라의 성벽 ─────────────────────────────────────
  P.avila = {
    base(g) {
      sky(g, [[0, '#6f7a88'], [0.6, '#bfc5c8'], [1, '#cdd1cf']]);
      grecoClouds(g, { seed: 3, y0: 2, y1: 20, n: 16, light: '#e6e8e6', dark: '#4a525c' });
      rect(g, 0, 28, 100, 26, '#a69a80');
      for (let j = 0; j < 6; j++) for (let x = (j % 2) * 2; x < 100; x += 4) rect(g, x, 29 + j * 4, 3.7, 3.7, rgba(j % 2 ? '#988c72' : '#b2a68c', 0.5));
      for (let x = 0; x < 100; x += 2.4) rect(g, x, 26.4, 1.4, 1.8, '#a69a80');
      for (const x of [4, 18, 32, 68, 82, 96]) { rect(g, x - 3, 24, 6, 30, '#b0a48a'); for (let k = 0; k < 3; k++) rect(g, x - 2.8 + k * 2.2, 22.6, 1.3, 1.6, '#b0a48a'); rect(g, x + 1.2, 24, 1.8, 30, rgba('#7d725c', 0.6)); }
      for (const x of [44, 56]) { rect(g, x - 4, 18, 8, 36, '#b6aa90'); for (let k = 0; k < 4; k++) rect(g, x - 3.8 + k * 2.2, 16.4, 1.3, 1.8, '#b6aa90'); }
      g.beginPath(); g.moveTo(46, 54); g.lineTo(46, 42); g.arc(50, 42, 4, Math.PI, 0); g.lineTo(54, 54); g.closePath(); g.fillStyle = '#2c2620'; g.fill();
      rect(g, 0, 54, 100, 21, '#8a7f6c');
      poly(g, [[44, 54], [56, 54], [80, 75], [20, 75]], '#9a8f7a');
      // 군용 차량
      poly(g, [[22, 62], [26, 57.5], [34, 57.5], [37, 61], [40, 61.4], [40, 64.4], [22, 64.4]], '#1a1a1c');
      rect(g, 27, 58.4, 6, 2.6, '#5a6a78');
      ellipse(g, 26, 64.6, 1.8, 1.8, '#0c0c0e'); ellipse(g, 36.5, 64.6, 1.8, 1.8, '#0c0c0e');
      line(g, 39, 61, 39, 57, '#333', 0.2);
      // 보초
      person(g, 45, 61, 10, { color: '#4b5236', hat: 'peaked', rifle: true, stretch: 1.1 });
      person(g, 55, 61, 10, { color: '#4b5236', hat: 'peaked', rifle: true, stretch: 1.1, dir: -1 });
    },
    anim(g, t) {
      flag(g, 39, 56.2, 2.2, 1.4, 'nat', t, { amp: 0.15, hang: false });
    },
  };

  // ── 헤타페, 함락 몇 시간 뒤 ───────────────────────────
  P.getafe = {
    base(g) {
      sky(g, [[0, '#7f807c'], [0.5, '#b7b2a6'], [1, '#cfc7b6']]);
      // 북쪽 지평선의 마드리드
      ridge(g, { y: 31, amp: 2, freq: 0.06, seed: 5, fill: '#8a877d', x0: 60 });
      for (const [x, w, h] of [[74, 3, 3], [78, 2, 4.5], [81, 3.4, 2.6], [86, 2.2, 3.6], [90, 3, 3], [94, 2.6, 4.2]]) rect(g, x, 30 - h, w, h + 1, '#6e6c66');
      rect(g, 87.6, 20, 1.6, 10, '#6a6862');
      g.beginPath(); g.arc(83, 27.6, 1.8, Math.PI, 0); g.fillStyle = '#6a6862'; g.fill();
      // 비행장 격납고
      g.beginPath(); g.moveTo(34, 40); g.quadraticCurveTo(44, 30, 56, 40); g.closePath(); g.fillStyle = '#7d7a70'; g.fill();
      rect(g, 32, 39.6, 26, 1, '#6a675e');
      // 왼쪽: 부서진 가게들
      rect(g, -1, 8, 31, 48, '#a69580');
      windows(g, 0, 10, 30, 22, 4, 2, { color: '#2e2822', shutter: '#5a5040' });
      for (let i = 0; i < 3; i++) {
        rect(g, 1 + i * 10, 38, 8, 16, '#231d18');
        poly(g, [[1 + i * 10, 38], [9 + i * 10, 38], [8 + i * 10, 42 + i], [2 + i * 10, 44 - i]], '#6a6152');
      }
      rect(g, 0, 34, 30, 3, '#3a3a5a');
      text(g, 'ULTRAMARINOS', 15, 36.3, 2, { color: '#e9e2cf', align: 'center', family: 'Georgia, serif' });
      poly(g, [[22, 8], [26, 4], [30, 8]], '#a69580');
      // 길과 잔해
      poly(g, [[-1, 54], [101, 44], [101, 76], [-1, 76]], '#7a7266');
      const r = rng(23);
      for (let i = 0; i < 70; i++) { const x = r() * 40, y = 54 + r() * 6; poly(g, [[x, y], [x + 1 + r(), y - 0.4], [x + 1.4, y + 0.6], [x + 0.2, y + 0.8]], mix('#8f8578', '#4f4840', r())); }
      for (let i = 0; i < 40; i++) ellipse(g, r() * 70, 56 + r() * 18, 0.18, 0.1, rgba('#e8f2f5', 0.7));
      // 트럭
      rect(g, 8, 46.5, 13, 7, '#4a4d36'); rect(g, 20.5, 48, 6, 5.5, '#3e4130'); rect(g, 21.6, 48.8, 3.2, 2.2, '#8a9aa8');
      ellipse(g, 12, 54, 1.8, 1.8, '#1a1a1a'); ellipse(g, 23.4, 54, 1.8, 1.8, '#1a1a1a');
      person(g, 30, 56.6, 10, { color: '#4a4a3a', hat: 'beret', skin: '#c9a07a', stretch: 1.08 });
      // 이탈리아 소형 전차
      poly(g, [[32, 57], [33.5, 54], [43, 54], [44.6, 57]], '#5d5f47');
      rect(g, 31.4, 57, 13.8, 2.6, '#3a3a2e');
      for (let x = 32.4; x < 44.6; x += 1.6) ellipse(g, x, 58.3, 0.7, 0.7, '#22221c');
      line(g, 35, 55.2, 30.4, 55, '#2a2a22', 0.3); line(g, 35, 55.9, 30.4, 55.8, '#2a2a22', 0.3);
      person(g, 40, 54.6, 6, { color: '#5a5c45', hat: 'beret', skin: '#c9a07a' });
      // 포로와 그를 지키는 병사
      person(g, 56, 70, 13, { color: '#2e2f33', shirt: '#4a5e78', arms: 'up', skin: '#c9a07a', stretch: 1.1 });
      person(g, 61.5, 70.5, 13.4, { color: '#4b5236', hat: 'cap', rifle: true, skin: '#c9a07a', stretch: 1.1, dir: -1 });
      // 쉬는 모로코 병사들
      person(g, 71.5, 66.5, 11, { color: '#5a4630', pose: 'sit', cape: '#7a6040', hat: 'fez', skin: '#6e4a30', stretch: 1.1 });
      person(g, 78, 66.5, 11, { color: '#d8d0bf', pose: 'sit', cape: '#e8e0d0', hat: 'fez', skin: '#6e4a30', stretch: 1.1, dir: -1 });
      person(g, 83, 67, 14, { color: '#5a4630', cape: '#6e5a3e', hat: 'fez', rifle: true, skin: '#6e4a30', stretch: 1.12 });
    },
    anim(g, t) {
      smoke(g, 82, 26, t, { color: '#555', alpha: 0.35, lean: 0.4, seed: 3 });
      smoke(g, 92, 27, t + 2, { color: '#4a4a4a', alpha: 0.3, lean: 0.3, seed: 8, size: 2 });
      // 융커스 세 대(세 발 엔진)
      const bob = Math.sin(t * 0.8) * 0.3;
      for (const [x, y] of [[70, 10.6], [64.5, 13.2], [75.5, 13.4]]) {
        const yy = y + bob;
        line(g, x - 3.8, yy, x + 3.8, yy, '#3a3c40', 0.55);
        poly(g, [[x - 0.6, yy - 0.5], [x + 3, yy - 0.2], [x + 3, yy + 0.3], [x - 0.6, yy + 0.5]], '#3a3c40');
        poly(g, [[x - 0.6, yy - 0.4], [x - 2.8, yy - 0.15], [x - 2.8, yy + 0.2], [x - 0.6, yy + 0.4]], '#3a3c40');
        for (const ex of [-1.8, 1.4, 3.1]) ellipse(g, x + ex, yy + 0.1, 0.35, 0.35, '#2a2c30');
        line(g, x - 2.6, yy - 1, x - 2.8, yy + 0.1, '#3a3c40', 0.3);
      }
    },
  };

  // ── 마드리드 앞 언덕 (상상: inside) ───────────────────
  P.madrid = {
    base(g, p) {
      if (p.inside) {
        g.save();
        g.filter = 'sepia(0.35) blur(0.35px)';
        sky(g, [[0, '#9fb7cc'], [1, '#e9e2d0']]);
        wall(g, { x: -2, t: -6, b: 66 }, { x: 40, t: 16, b: 40 }, { fill: '#cbb8a0', cols: 8, rows: 6, win: '#3a3028', balcony: '#2a2420' });
        wall(g, { x: 102, t: -6, b: 66 }, { x: 60, t: 16, b: 40 }, { fill: '#c2ae95', cols: 8, rows: 6, win: '#3a3028', balcony: '#2a2420' });
        rect(g, 40, 16, 20, 24, '#b9a68e');
        poly(g, [[-2, 66], [40, 40], [60, 40], [102, 66], [102, 76], [-2, 76]], '#8e877a');
        poly(g, [[8, 18], [92, 18], [90, 25], [10, 25]], '#b8231b');
        text(g, '¡NO PASARÁN!', 50, 23.6, 5, { color: '#f6efe2', align: 'center', family: 'Arial, sans-serif', weight: 900 });
        sandbags(g, 58, 66, { seed: 9, color: '#9a8a6a', top: '#b8a888', rows: 2 });
        const cols = ['#3e5a78', '#2f3135', '#3e5a78', '#5a4a3a', '#3a3240'];
        [[30, 58, 11], [40, 56, 9], [62, 57, 10], [70, 60, 12], [50, 55, 8]].forEach(([x, y, h], i) => person(g, x, y, h, { color: cols[i], hat: i % 2 ? 'cap' : 'none', rifle: true, skirt: i === 3 ? '#5a4a3a' : null, skin: '#c99d7a' }));
        g.restore();
        vignette(g, 0.5, '#efe6d0');
        return;
      }
      sky(g, [[0, '#262b48'], [0.4, '#7a5662'], [0.55, '#d08a5c'], [1, '#d08a5c']]);
      rect(g, 0, 40, 100, 16, '#5a4a3a');
      for (const [x, w, h] of [[20, 3, 3], [24, 4, 2.4], [29, 2.4, 4], [33, 5, 2.6], [39, 3, 3.6], [45, 2, 8], [48, 4, 3], [53, 6, 4.4], [60, 3, 2.6], [64, 4, 3.8], [69, 2.2, 5.5], [73, 5, 3], [79, 3, 2.4]]) rect(g, x, 40 - h, w, h + 0.5, '#2c2430');
      g.beginPath(); g.arc(56, 35.6, 2.2, Math.PI, 0); g.fillStyle = '#2c2430'; g.fill();
      ridge(g, { y: 58, amp: 5, freq: 0.04, seed: 6, fill: '#3a2e26' });
      const r = rng(14);
      for (let i = 0; i < 90; i++) { const x = r() * 100; line(g, x, 75, x + (r() - 0.5), 66 - r() * 6, '#5a4a32', 0.2); }
      person(g, 16, 66, 16, { color: '#1c1a1c', coat: '#252220', hat: 'cap', arms: 'front', stretch: 1.12 });
      person(g, 23, 66.4, 15.4, { color: '#1e1c1c', hat: 'beret', stretch: 1.12, dir: -1 });
    },
    anim(g, t, p) {
      if (p.inside) return;
      for (const [x, s] of [[34, 2], [50, 7], [62, 4], [71, 9]]) smoke(g, x, 38, t + s, { color: '#3a3238', alpha: 0.35, lean: 0.4, seed: s, size: 2.2, rise: 3 });
      const k = Math.floor(t / 1.7);
      if (t % 1.7 < 0.18) { const x = 25 + rng(k)() * 55; glow(g, x, 37, 3, '#ffb060', 0.85); }
    },
  };

  // ── 오려 붙인 신문 ───────────────────────────────────
  P.press = {
    base(g) {
      rect(g, 0, 0, 100, 75, '#3b2a1f');
      g.save(); g.translate(50, 38); g.rotate(-0.04);
      rect(g, -43, -33, 86, 66, '#e9e2cf');
      text(g, 'ΚΑΘΗΜΕΡΙΝΗ', 0, -24, 6, { color: '#1d1b18', align: 'center' });
      line(g, -40, -21, 40, -21, '#1d1b18', 0.35); line(g, -40, -20.2, 40, -20.2, '#1d1b18', 0.12);
      text(g, 'Η ΙΣΠΑΝΙΑ', -20, -13.5, 3.2, { color: '#1d1b18', align: 'center' });
      for (let k = 0; k < 4; k++) for (let j = 0; j < 22; j++) if (!(k === 2 && j > 3 && j < 14)) line(g, -40 + k * 20.6, -10 + j * 1.9, -22 + k * 20.6, -10 + j * 1.9, rgba('#5c564c', 0.55), 0.3);
      g.setLineDash([0.8, 0.6]); g.strokeStyle = '#6a645a'; g.lineWidth = 0.2; g.strokeRect(1.2, -3.2, 18.6, 19.6); g.setLineDash([]);
      rect(g, 1.4, -3, 18.2, 19.2, '#3b2a1f');
      g.restore();
      // 오려 낸 기사
      g.save(); g.translate(76, 60); g.rotate(0.12);
      rect(g, -9, -9, 18, 19, '#ece6d4');
      for (let j = 0; j < 9; j++) line(g, -7.5, -6 + j * 1.8, 7.5, -6 + j * 1.8, rgba('#5c564c', 0.6), 0.3);
      g.restore();
      // 가위
      g.save(); g.translate(18, 64); g.rotate(-0.5);
      g.beginPath(); g.arc(-3, 0, 1.6, 0, Math.PI * 2); g.arc(-3, 3.6, 1.6, 0, Math.PI * 2); g.strokeStyle = '#2a2a2e'; g.lineWidth = 0.6; g.stroke();
      line(g, -1.6, 0.6, 9, 2.4, '#8a8e94', 0.7); line(g, -1.6, 3, 9, 1.4, '#9aa0a6', 0.7);
      g.restore();
      g.fillStyle = lin(g, 0, 0, 100, 75, [[0, 'rgba(255,240,210,0.18)'], [0.5, 'rgba(255,240,210,0)']]);
      g.fillRect(0, 0, 100, 75);
    },
  };

  // ── 책 ───────────────────────────────────────────────
  P.book = {
    base(g) {
      rect(g, 0, 0, 100, 75, '#5a4430');
      for (let i = 0; i < 12; i++) line(g, 0, i * 6.5 + 2, 100, i * 6.5 + 4, rgba('#4a3624', 0.6), 0.5);
      g.save(); g.translate(46, 40); g.rotate(-0.05);
      rect(g, -15.6, -23.4, 32, 48, '#3a1a1a');
      rect(g, -16, -24, 31, 47, '#7a2a2a');
      g.strokeStyle = '#d9b45a'; g.lineWidth = 0.3; g.strokeRect(-13.4, -21.4, 25.8, 41.8);
      text(g, 'Ν. ΚΑΖΑΝΤΖΑΚΗ', -0.5, -14, 2, { color: '#e9cf8a', align: 'center' });
      text(g, 'ΤΑΞΙΔΕΥΟΝΤΑΣ', -0.5, -4, 2.8, { color: '#f0d896', align: 'center' });
      text(g, 'ΙΣΠΑΝΙΑ', -0.5, 2.6, 4.4, { color: '#f0d896', align: 'center' });
      line(g, -8, 6.4, 7, 6.4, '#d9b45a', 0.25);
      text(g, '1937', -0.5, 15, 1.8, { color: '#e9cf8a', align: 'center' });
      g.restore();
      line(g, 66, 66, 80, 58, '#1a1410', 0.8); line(g, 79, 58.6, 81, 57.4, '#c9a24a', 0.8);
      // 아몬드 꽃 가지
      rect(g, 80, 46, 7, 14, rgba('#cfe0e6', 0.45)); rect(g, 80, 58, 7, 2, rgba('#cfe0e6', 0.6));
      const br = (x0, y0, x1, y1) => { line(g, x0, y0, x1, y1, '#3a2a20', 0.45); };
      br(83.5, 50, 82, 30); br(82.8, 40, 90, 22); br(82.4, 34, 76, 18); br(86, 31, 92, 33);
      const r = rng(8);
      for (let i = 0; i < 34; i++) { const tt = r(); const [x0, y0, x1, y1] = [[82, 30, 83.5, 50], [82.8, 40, 90, 22], [82.4, 34, 76, 18], [86, 31, 92, 33]][i % 4]; const x = x0 + (x1 - x0) * tt + (r() - 0.5) * 2, y = y0 + (y1 - y0) * tt + (r() - 0.5) * 2; for (let k = 0; k < 5; k++) ellipse(g, x + Math.cos(k * 1.26) * 0.55, y + Math.sin(k * 1.26) * 0.55, 0.45, 0.45, i % 3 ? '#f6e9ec' : '#f1cfd8'); ellipse(g, x, y, 0.25, 0.25, '#c96a7a'); }
      g.fillStyle = lin(g, 0, 0, 100, 75, [[0, 'rgba(255,245,215,0.22)'], [0.6, 'rgba(255,245,215,0)']]);
      g.fillRect(0, 0, 100, 75);
    },
  };

  // ── 이라클리오의 성벽 ─────────────────────────────────
  P.crete = {
    base(g) {
      sky(g, [[0, '#3c84c8'], [0.5, '#9cc8e8'], [1, '#cfe6f2']]);
      ridge(g, { y: 30, amp: 9, freq: 0.035, seed: 9, fill: '#8aa6bf', x0: 55 });
      ridge(g, { y: 34, amp: 4, freq: 0.05, seed: 2, fill: '#9fb8c8', x0: 40 });
      rect(g, 0, 36, 100, 40, lin(g, 0, 36, 0, 75, [[0, '#3d84b8'], [1, '#235f8f']]));
      // 성벽(마르티넨고 보루)
      poly(g, [[24, 76], [46, 37], [101, 34], [101, 76]], '#c8a368');
      poly(g, [[24, 76], [46, 37], [49, 37], [29, 76]], '#a8844e');
      for (let j = 0; j < 12; j++) { const y = 40 + j * 3.2; line(g, 46 - (y - 37) * 0.56, y, 101, y - 1, rgba('#9a7a44', 0.6), 0.2); }
      rect(g, 46, 33.6, 55, 3.6, '#d9b77c');
      // 무덤: 돌과 나무 십자가
      rect(g, 55, 31.4, 10, 2.4, '#e2dccd');
      rect(g, 59.5, 12, 1.1, 20, '#6a4a2a');
      rect(g, 56.4, 16.4, 7.3, 1, '#6a4a2a');
      vignette(g, 0.18);
    },
    anim(g, t) {
      for (let i = 0; i < 24; i++) { const x = (i * 9.7 + Math.sin(t * 0.7 + i) * 2) % 46, y = 40 + (i * 7.3) % 34; ellipse(g, x, y, 0.9, 0.12, rgba('#ffffff', 0.35 + 0.3 * Math.sin(t * 2 + i))); }
      for (let i = 0; i < 3; i++) { const x = ((t * 2.4 + i * 22) % 120) - 10, y = 14 + i * 4 + Math.sin(t * 1.3 + i) * 1.2; g.beginPath(); g.moveTo(x - 1.4, y - 0.5); g.quadraticCurveTo(x - 0.5, y - 0.9, x, y); g.quadraticCurveTo(x + 0.5, y - 0.9, x + 1.4, y - 0.5); g.strokeStyle = '#f7f7f7'; g.lineWidth = 0.28; g.stroke(); }
      for (let i = 0; i < 3; i++) { const x = ((t * 0.6 + i * 40) % 140) - 20; ellipse(g, x, 8 + i * 4, 8, 1.6, rgba('#ffffff', 0.55)); }
    },
  };

  return P;
})();
