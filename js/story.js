/* ──────────────────────────────────────────────────────────────
   「막차」 — 시나리오, 연출 결정, 피드백
   grade: ok(3) · keep(2) · soso(1) · ng(0)
   style: classic(고전) · expressive(표현) · realist(사실) · minimal(절제)
   ────────────────────────────────────────────────────────────── */
(function (G) {
  'use strict';
  const K = G.KONTI;

  /* 배우 블로킹 */
  const SY = (o) => Object.assign({ who: 'seoyeon' }, o);
  const JH = (o) => Object.assign({ who: 'junho' }, o);
  const cityS = () => SY({ pos: [8.4, 0.15, 10.3], face: -90, arm: { R: 'umbrella', L: 'down' }, expr: 'sad' });
  const dinerS = (o) => SY(Object.assign({ pos: [-0.72, 0, 0], face: 90, pose: 'sit', arm: 'table', expr: 'cold', lookAt: 'junho' }, o));
  const dinerJ = (o) => JH(Object.assign({ pos: [0.72, 0, 0], face: -90, pose: 'sit', arm: 'table', expr: 'tired', lookAt: 'seoyeon' }, o));
  const darkS = (o) => SY(Object.assign({ pos: [0, 0, 0.12], face: 0, arm: 'tray', expr: 'down', headDown: true }, o));
  const runS = (o) => SY(Object.assign({ pos: [0, 0.15, 0.9], face: 90, pose: 'run', expr: 'pant', move: [7, 0, 0] }, o));
  const WIN = [[1.7, 2.05, 0.32], [3.2, 2.05, 0.32], [3.2, 2.95, 0.32], [1.7, 2.95, 0.32]];
  const platS = (o) => SY(Object.assign({ pos: [2.3, 1.1, -1.55], face: 0, expr: 'sad', lookAt: 'junho' }, o));
  const platJ = (o) => JH(Object.assign({ pos: [2.45, 1.12, 1.25], face: 180, expr: 'soft', clip: WIN, arm: 'down', lookAt: 'seoyeon' }, o));

  const GRADE = {
    ok: { pts: 3, label: 'OK', name: 'OK 컷', desc: '이 장면의 의도에 가장 잘 맞는 선택' },
    keep: { pts: 2, label: 'KEEP', name: '킵', desc: '좋은 대안. 편집실에서 쓸 수 있다' },
    soso: { pts: 1, label: '아쉬움', name: '아쉬움', desc: '틀리진 않았지만 의도를 약하게 만든다' },
    ng: { pts: 0, label: 'NG', name: 'NG', desc: '연결이나 논리가 깨진다' },
  };

  const STYLE = {
    classic: { name: '고전주의자', desc: '관객이 길을 잃지 않게 안내하는 정석의 문법. 보이지 않는 편집, 명확한 공간, 감정에 맞춘 샷 사이즈.', refs: '할리우드 고전기의 연속 편집 전통' },
    expressive: { name: '표현주의자', desc: '빛, 앵글, 움직임으로 감정을 증폭시킨다. 이미지가 곧 인물의 마음이다.', refs: '박찬욱의 양식화된 구도, 왕가위의 색과 속도' },
    realist: { name: '리얼리스트', desc: '카메라의 개입을 줄이고 현장의 숨결을 붙잡는다. 핸드헬드와 동기 있는 조명.', refs: '다르덴 형제의 따라가는 카메라, 이창동의 절제된 사실주의' },
    minimal: { name: '미니멀리스트', desc: '고정된 프레임과 여백, 긴 호흡. 덜 보여줘서 더 느끼게 한다.', refs: '오즈 야스지로의 고정 카메라, 홍상수의 롱테이크' },
  };

  /* ── 프리 프로덕션: 화면비 ── */
  const twoShot = { set: 'diner', look: 'diner', cast: [dinerS(), dinerJ()], cam: { pos: [0, 1.15, -2.7], target: [0, 1.0, 0], lens: 32 }, axis: ['seoyeon', 'junho'] };
  const PRE = {
    id: 'aspect',
    title: '화면비 정하기',
    q: '촬영 전에 정해야 할 첫 번째 결정. 이 영화의 프레임은 어떤 모양일까?',
    hint: '화면비는 영화 전체의 그릇이다. 정답은 없지만, 이야기의 성격과 맞아야 한다. 이후 모든 콘티가 이 비율로 그려진다.',
    options: [
      { id: 'A', aspect: 1.33, label: '1.33 : 1 (4:3)', spec: '아카데미 비율', desc: '좁고 높은 프레임. 인물에 집중하고 갇힌 느낌을 준다.', why: '좌우가 좁아 인물이 프레임에 갇힌 듯 보인다. 오래된 사진첩 같은 향수와 폐쇄감. 아버지와 딸, 두 사람의 좁은 세계에 집중하는 영화라면 좋은 그릇이다.', style: { minimal: 1 } },
      { id: 'B', aspect: 1.85, label: '1.85 : 1', spec: '비스타비전', desc: '현대 영화의 표준. 인물과 공간의 균형.', why: '얼굴과 공간이 균형을 이룬다. 실내 대화와 거리 장면이 모두 자연스럽다. 가장 무난하고 유연한 선택.', style: { classic: 1 } },
      { id: 'C', aspect: 2.39, label: '2.39 : 1', spec: '시네마스코프', desc: '넓은 가로 프레임. 공간 속 고립과 스케일.', why: '넓은 프레임은 인물 옆의 빈 공간을 강조한다. 도시 속 고립, 텅 빈 플랫폼처럼 "여백"이 감정이 되는 영화에 강하다. 대신 클로즈업에서 위아래가 잘린다.', style: { expressive: 1 } },
    ],
    shot: twoShot,
  };

  /* ── 씬 ── */
  const SCENES = [
    {
      id: 's1', num: 1, heading: 'EXT. 도심 횡단보도 — 밤 (비)', set: 'city', place: '도심 횡단보도',
      script: [
        { t: 'a', x: '비 내리는 도심. 네온이 젖은 아스팔트에 번진다.' },
        { t: 'a', x: '빨간 우산을 쓴 서연(34)이 횡단보도 앞에 홀로 서 있다. 신호는 바뀌지 않는다.' },
        { t: 'a', x: '주머니 속 휴대폰이 진동한다. 화면에는 \'아빠\' — 부재중 전화 3통.' },
      ],
      intent: '영화의 첫 이미지. 관객은 서연이 거대한 도시 속에서 얼마나 혼자인지 느껴야 한다.',
      decisions: [
        {
          id: 's1d1', cut: 'C1', title: '오프닝 샷 사이즈', lesson: '샷 사이즈',
          q: '관객이 이 영화에서 처음 보게 될 이미지는 얼마나 넓어야 할까?',
          hint: '샷 사이즈는 관객과 인물 사이의 거리다. 넓을수록 공간과 관계가, 좁을수록 감정이 보인다.',
          base: { set: 'city', look: 'night', cast: [cityS()], dur: 6, seed: 3 },
          sheet: { action: '횡단보도 앞, 우산을 쓰고 홀로 선 서연.', sfx: '빗소리, 먼 차 소리' },
          options: [
            { id: 'A', label: '익스트림 롱 숏', spec: 'ELS · 28mm · 하이 앵글', desc: '빌딩 숲 사이, 점처럼 작은 서연.', grade: 'ok', style: { classic: 1 },
              shot: { size: 'ELS', cam: { pos: [2.5, 26, -22], target: [8.0, 2, 10.6], lens: 28 } },
              why: '도시가 프레임을 가득 채우고 서연은 그 속의 작은 점이다. 관객은 설명 없이도 "이 사람은 혼자다"를 이해한다. 공간과 고립을 한 번에 세우는 설정 숏(establishing shot)의 정석.' },
            { id: 'B', label: '풀 숏', spec: 'FS · 35mm · 아이 레벨', desc: '머리부터 발끝까지, 뒤로 거리가 보인다.', grade: 'keep', style: { classic: 1 },
              shot: { size: 'FS', cam: { frame: { who: 'seoyeon', size: 'FS', rel: 62, k: 1.15 }, lens: 35 } },
              why: '인물과 공간을 함께 보여주는 균형 잡힌 선택. 다만 도시가 그녀를 "압도"하지는 못한다. 고립의 크기를 느끼기엔 프레임이 그녀 쪽으로 너무 가깝다.' },
            { id: 'C', label: '미디엄 숏', spec: 'MS · 50mm · 아이 레벨', desc: '허리 위. 표정과 우산이 함께.', grade: 'soso', style: { realist: 1 },
              shot: { size: 'MS', cam: { frame: { who: 'seoyeon', size: 'MS', rel: 45 }, lens: 50 } },
              why: '무난하지만 아무것도 강조하지 않는다. 표정을 보기엔 멀고, 도시를 보기엔 가깝다. 첫 이미지로는 인상이 약하다.' },
            { id: 'D', label: '클로즈업', spec: 'CU · 85mm · 아이 레벨', desc: '젖은 얼굴. 배경은 빛망울로 흐려진다.', grade: 'soso', style: { expressive: 1 },
              shot: { size: 'CU', cam: { frame: { who: 'seoyeon', size: 'CU', rel: 38 }, lens: 85 } },
              why: '감정은 보이지만 "도시 속의 고립"이라는 관계가 사라진다. 공간이 없으면 외로움은 표정으로만 설명된다. 클로즈업 오프닝은 미스터리를 만들 때 강력하지만 이 씬의 목적과는 다르다.' },
          ],
          tip: '현장 팁: 설정 숏은 "어디서, 언제, 누가"를 한 장에 답한다. 큰 공간을 먼저 보여주고 점점 인물에게 다가가는 것이 관객을 안내하는 가장 오래된 방법이다.',
        },
        {
          id: 's1d2', cut: 'C1', modifies: true, title: '카메라 무빙', lesson: '카메라 무빙',
          q: '이 첫 샷에서 카메라는 움직여야 할까? 움직인다면 어떻게?',
          hint: '카메라의 움직임은 관객의 시선을 어디로 데려갈지에 대한 결정이다. 움직임에는 반드시 이유가 있어야 한다.',
          options: [
            { id: 'A', label: '크레인 다운', spec: 'CRANE DOWN · 6초', desc: '빌딩 꼭대기에서 서연에게로 천천히 내려온다.', grade: 'ok', style: { classic: 1, expressive: 1 },
              shot: { move: { type: 'craneDown', rise: 24, tk: 1.1 } },
              why: '하늘과 빌딩에서 시작해 한 사람에게 도착하는 움직임. 시선의 이동이 곧 이야기다. "이 거대한 도시에서, 이 사람의 이야기"라고 카메라가 말한다.' },
            { id: 'B', label: '고정', spec: 'FIX · 6초', desc: '카메라는 움직이지 않는다. 비만 내린다.', grade: 'keep', style: { minimal: 1 },
              shot: { move: { type: 'static' } },
              why: '정지된 프레임은 고립을 "견디게" 만든다. 차분하고 단단하지만, 관객을 인물에게 안내하는 힘은 약하다. 다음 컷이 그 역할을 맡아야 한다.' },
            { id: 'C', label: '핸드헬드', spec: 'HANDHELD · 6초', desc: '어깨에 멘 카메라의 미세한 흔들림.', grade: 'soso', style: { realist: 1 },
              shot: { move: { type: 'handheld', amp: 0.8 } },
              why: '핸드헬드는 다큐멘터리 같은 즉시성과 불안을 만든다. 긴박함이 아직 없는 첫 장면에서는 "정적인 고독"과 충돌한다. 불안의 카드는 아껴 두자.' },
          ],
          tip: '현장 팁: 무빙이 끝나는 지점(end frame)을 먼저 정하고 시작 지점을 역산하라. 콘티에서는 빨간 화살표가 카메라의 움직임, 파란 화살표가 인물의 움직임이다.',
        },
        {
          id: 's1d3', cut: 'C1', modifies: true, title: '조명 설계', lesson: '조명',
          q: '비 오는 밤. 빛을 어디에 둘까?',
          hint: '빗줄기는 그 자체로는 거의 보이지 않는다. 빛이 어느 방향에서 오느냐가 비를 "보이게" 한다.',
          options: [
            { id: 'A', label: '역광 (가로등을 뒤에)', spec: 'BACKLIGHT', desc: '서연 뒤의 가로등. 빗줄기가 빛나고 서연은 실루엣.', grade: 'ok', style: { expressive: 1 },
              shot: { look: 'backlight' },
              why: '비는 역광일 때만 화면에 보인다. 뒤에서 오는 빛이 빗줄기를 은빛 선으로 바꾸고, 서연은 얼굴 없는 실루엣이 된다. 익명의 도시 속 한 사람, 정확히 이 씬의 감정이다.' },
            { id: 'B', label: '네온 로우키', spec: 'LOW-KEY · PRACTICAL', desc: '간판 네온이 얼굴 한쪽을 물들인다.', grade: 'keep', style: { realist: 1, expressive: 1 },
              shot: { look: 'neon' },
              why: '화면 속 간판이 실제 광원이 되는 "동기 있는 조명". 분위기는 좋지만 앞에서 오는 빛 속에서 빗줄기는 거의 사라진다. 비 오는 밤이라는 정보가 약해진다.' },
            { id: 'C', label: '플랫한 고조도', spec: 'HIGH-KEY', desc: '모든 곳이 고르게 밝다.', grade: 'soso', style: {},
              shot: { look: 'flat' },
              why: '밤의 고독이 사라진다. 모든 것이 고르게 밝으면 시선이 갈 곳이 없고, 비 오는 밤이 흐린 낮처럼 보인다. TV 드라마식 균일 조명은 정보 전달엔 좋지만 감정을 깎아낸다.' },
          ],
          tip: '현장 팁: 비 장면에서는 살수차와 함께 반드시 역광 조명을 친다. 같은 비라도 순광에서는 화면에 거의 남지 않는다.',
        },
      ],
    },
    {
      id: 's2', num: 2, heading: 'INT. 24시 식당 — 밤', set: 'diner', place: '24시 식당',
      script: [
        { t: 'a', x: '창가 부스. 식은 커피 두 잔. 맞은편에 준호(64)가 앉아 있다.' },
        { t: 'a', x: '준호가 낡은 필름 카메라를 테이블 위로 밀어 놓는다.' },
        { t: 'd', who: '준호', x: '네 엄마가 쓰던 거다.' },
        { t: 'd', who: '서연', p: '카메라를 보지 않고', x: '10년 만에 하는 말이 그거예요?' },
        { t: 'd', who: '준호', p: '한참 만에', x: '…미안하다. 그 말 하려고 왔다.' },
      ],
      intent: '10년의 거리. 같은 테이블에 앉아 있지만 두 사람 사이에는 벽이 있다.',
      decisions: [
        {
          id: 's2d1', cut: 'C1', title: '마스터 숏', lesson: '구도',
          q: '두 사람을 처음 한 화면에 담는 마스터 숏. 어디서 볼까?',
          hint: '마스터 숏은 장면 전체의 공간 지도다. 관객은 이 숏으로 누가 어디에 앉아 어느 쪽을 보는지 기억한다.',
          base: { set: 'diner', look: 'diner', cast: [dinerS(), dinerJ({ arm: { L: 'table', R: 'reach' } })], dur: 5, axis: ['seoyeon', 'junho'] },
          sheet: { action: '준호, 필름 카메라를 서연 쪽으로 민다.', dial: '준호: 네 엄마가 쓰던 거다.', sfx: '창밖 빗소리, 냉장고 소음' },
          options: [
            { id: 'A', label: '측면 대칭 투숏', spec: 'MS 투숏 · 32mm · 아이 레벨', desc: '테이블을 사이에 두고 마주 앉은 옆모습.', grade: 'ok', style: { minimal: 1, classic: 1 },
              shot: { size: 'MS', cam: { pos: [0, 1.15, -2.7], target: [0, 1.0, 0], lens: 32 } },
              why: '두 사람 사이의 거리(테이블)가 화면 한가운데 그대로 놓인다. 좌우 대칭은 대립을 만든다. 누가 어디를 보는지 공간 지도도 가장 명확하다.' },
            { id: 'B', label: '서연 어깨 너머', spec: 'OTS · 45mm', desc: '서연의 뒷모습 너머로 준호의 얼굴.', grade: 'keep', style: { classic: 1 },
              shot: { size: 'MCU', cam: { pos: [-1.12, 1.2, -0.3], target: [0.72, 1.14, 0.0], lens: 45, shift: [0.3, 0.06] }, focusOn: 'junho' },
              why: '관객을 서연의 자리에 앉힌다. 관계는 느껴지지만 첫 숏으로는 서연의 얼굴이 없다. 마스터로 쓰기엔 정보가 한쪽에 치우친다.' },
            { id: 'C', label: '버드아이 탑샷', spec: '부감 · 24mm', desc: '천장에서 내려다본 테이블.', grade: 'soso', style: { expressive: 1 },
              shot: { size: 'LS', angle: '버드아이 (부감)', cam: { pos: [0, 3.7, 0.0], yaw: 0, pitch: -89.5, lens: 24 }, dof: false },
              why: '두 사람이 체스판 위의 말처럼 보인다. 구조는 선명하지만 얼굴이 없다. 감정의 장면보다 관찰자의 시선이 된다. 장면 중간의 강조 컷으로는 쓸 만하다.' },
          ],
          tip: '현장 팁: 마스터 숏을 먼저 찍어 두면 편집실에서 길을 잃지 않는다. 배우들도 장면 전체를 한 번에 연기하며 리듬을 찾는다.',
        },
        {
          id: 's2d2', cut: 'C2', title: '리버스 숏 — 180도 법칙', lesson: '180도 법칙', compare: true,
          q: '서연의 대답 "10년 만에 하는 말이 그거예요?" — 카메라를 어디에 둘까?',
          hint: '두 사람의 시선을 잇는 가상의 선(액션 축)이 있다. 평면도의 빨간 점선을 보라. 앞 컷에서 서연은 화면 오른쪽을 보고 있었다.',
          base: { set: 'diner', look: 'diner', cast: [dinerS(), dinerJ()], dur: 3, axis: ['seoyeon', 'junho'], focusOn: 'seoyeon' },
          sheet: { action: '서연, 카메라를 내려다보지 않는다.', dial: '서연: 10년 만에 하는 말이 그거예요?', sfx: '' },
          options: [
            { id: 'A', label: '준호 어깨 너머 (같은 쪽)', spec: 'OTS · 50mm', desc: '앞 컷과 같은 쪽에서, 준호의 어깨 너머로 서연.', grade: 'ok', style: { classic: 1 },
              shot: { size: 'MCU', cam: { pos: [1.12, 1.2, -0.3], target: [-0.72, 1.06, 0.0], lens: 50, shift: [-0.3, 0.06] } },
              why: '선을 지켰다. 서연은 여전히 화면 오른쪽을 보고, 두 컷이 이어 붙어도 두 사람이 서로를 마주 본다. 흐릿한 준호의 어깨가 서연이 마주한 "벽"이 된다.' },
            { id: 'B', label: '반대편 어깨 너머', spec: 'OTS · 50mm · 선 넘음', desc: '테이블 반대편으로 돌아가 준호의 어깨 너머로.', grade: 'ng', style: {},
              shot: { size: 'MCU', cam: { pos: [1.12, 1.2, 0.3], target: [-0.72, 1.06, 0.0], lens: 50, shift: [0.3, 0.06] } },
              why: '180도 선을 넘었다. 앞 컷에서 오른쪽을 보던 서연이 갑자기 왼쪽을 본다. 편집하면 두 사람이 서로가 아니라 같은 방향을 보는 것처럼 느껴진다. 배경도 창문에서 카운터로 바뀌어 관객이 공간을 잃는다.' },
            { id: 'C', label: '선 위의 정면 (준호 시점)', spec: 'POV · 40mm · 축 위', desc: '준호의 눈 위치에서. 서연이 렌즈를 똑바로 본다.', grade: 'keep', style: { minimal: 1, expressive: 1 },
              shot: { size: 'MCU', cam: { pos: [0.7, 1.2, 0.0], target: [-0.72, 1.08, 0.0], lens: 40 }, castPatch: { junho: { hide: true, planShow: true } } },
              why: '카메라를 선 "위"에 두면 서연이 관객을 정면으로 쏘아본다. 오즈 야스지로가 즐겨 쓴 강렬한 정면성. 의도된 양식이라면 강력하지만, 일반적인 대화의 흐름에서는 관객을 장면 밖으로 끌어낸다.' },
            { id: 'D', label: '클린 싱글 (같은 쪽)', spec: 'MCU · 85mm', desc: '준호를 화면에서 완전히 지운 서연 단독.', grade: 'keep', style: { minimal: 1 },
              shot: { size: 'MCU', cam: { pos: [0.55, 1.15, -1.5], target: [-0.72, 1.12, 0.0], lens: 85 } },
              why: '선은 지켰다. 아버지가 프레임에서 사라져 고립감이 강해진다. 하지만 이 장면의 갈등은 두 사람 "사이"에 있다. 클린 싱글만 반복하면 대화가 독백처럼 보인다.' },
          ],
          tip: '현장 팁: 촬영 전 바닥에 테이프로 액션 축을 표시해 두는 감독도 있다. 선을 넘어야 한다면, 카메라가 선을 넘는 과정을 한 숏 안에서 보여주거나 정면 숏을 다리로 삼는다.',
        },
        {
          id: 's2d3', cut: 'C3', title: '감정의 정점', lesson: '샷 사이즈의 진행',
          q: '준호의 "…미안하다." 장면의 가장 중요한 대사. 어떤 크기로?',
          hint: '대화의 감정이 깊어질수록 샷 사이즈를 어떻게 바꾸는지가 장면의 리듬을 만든다. 가장 센 카드를 언제 쓸지 생각하라.',
          base: { set: 'diner', look: 'diner', cast: [dinerS(), dinerJ({ expr: 'sad' })], dur: 4, axis: ['seoyeon', 'junho'], focusOn: 'junho' },
          sheet: { action: '한참의 침묵. 준호, 고개를 든다.', dial: '준호: …미안하다. 그 말 하려고 왔다.', sfx: '빗소리가 커진다' },
          options: [
            { id: 'A', label: '클로즈업', spec: 'CU · 85mm · 같은 쪽', desc: '준호의 얼굴로 다가간다.', grade: 'ok', style: { classic: 1 },
              shot: { size: 'CU', cam: { frame: { who: 'junho', size: 'CU', rel: -32 }, lens: 85 } },
              why: '마스터 → 어깨 너머 → 클로즈업. 감정이 고조될수록 샷이 좁아지는 고전 문법이다. 관객을 인물의 얼굴 가까이로 데려가 대사 뒤의 떨림까지 보게 한다.' },
            { id: 'B', label: '다시 마스터로', spec: 'MS 투숏 · 32mm', desc: '결정적 대사를 넓게, 두 사람 모두.', grade: 'keep', style: { minimal: 1 },
              shot: { size: 'MS', cam: { pos: [0, 1.15, -2.7], target: [0, 1.0, 0], lens: 32 }, focusOn: null },
              why: '가장 중요한 순간에 오히려 물러나면 둘 사이의 "거리"가 강조된다. 절제된 감독들이 즐겨 쓰는 역발상. 다만 준호의 표정은 놓친다.' },
            { id: 'C', label: '익스트림 클로즈업', spec: 'ECU · 85mm', desc: '안경 너머의 눈만.', grade: 'soso', style: { expressive: 1 },
              shot: { size: 'ECU', cam: { frame: { who: 'junho', size: 'ECU', rel: -28 }, lens: 85 } },
              why: '너무 이른 극단. ECU는 영화에서 아껴 쓰는 카드다. 지금 써 버리면 정작 클라이맥스(암실, 플랫폼)에서 더 갈 곳이 없다.' },
            { id: 'D', label: '카메라 인서트', spec: 'INSERT · 50mm', desc: '대사 위로, 테이블 위의 필름 카메라.', grade: 'keep', style: { expressive: 1 },
              shot: { size: 'INS', cam: { pos: [-0.42, 0.98, -0.58], target: [-0.1, 0.82, -0.2], lens: 50 }, focusOn: null, focus: 0.5 },
              why: '사과의 말을 얼굴 대신 사물에 얹는다. 카메라는 엄마, 과거, 그리고 영화의 결말을 잇는 열쇠다. 대사를 "듣게" 만드는 영리한 선택이지만 준호의 감정은 비워 둔다.' },
          ],
          tip: '현장 팁: 커버리지를 찍을 때 같은 렌즈 계열로 양쪽 인물의 사이즈를 맞춰라. 한쪽만 클로즈업이면 관객은 그쪽이 "더 중요하다"고 읽는다.',
        },
      ],
    },
    {
      id: 's3', num: 3, heading: 'INT. 24시 식당 — 계속', set: 'diner', place: '24시 식당',
      script: [
        { t: 'a', x: '준호가 천천히 일어선다. 코트 주머니에 손을 넣는다.' },
        { t: 'd', who: '준호', x: '오늘 밤 막차로 내려간다. 그 카메라… 네가 가져라.' },
        { t: 'a', x: '준호, 나간다. 문에 달린 종이 울린다. 서연은 움직이지 않는다.' },
        { t: 'a', x: '맞은편 빈자리. 식은 커피.' },
      ],
      intent: '서연에게 아버지는 아직 크고 차가운 사람이다. 그리고 그가 떠난 자리의 공허.',
      decisions: [
        {
          id: 's3d1', cut: 'C1', title: '일어선 아버지', lesson: '카메라 앵글',
          q: '자리에서 일어나 서연을 내려다보는 준호. 카메라 높이는?',
          hint: '앵글은 권력이다. 올려다보면 인물이 커지고, 내려다보면 작아진다. 지금은 누구의 시선으로 그를 보고 있는가?',
          base: { set: 'diner', look: 'diner', cast: [dinerS({ face: 124, arm: 'table', gaze: [0.3, 0.7] }), JH({ pos: [0.5, 0, -0.95], face: -60, arm: 'pocket', expr: 'tired', gaze: [0, -0.6] })], dur: 4, focusOn: 'junho', axis: ['seoyeon', 'junho'] },
          sheet: { action: '준호, 일어서서 서연을 내려다본다.', dial: '준호: 오늘 밤 막차로 내려간다. 그 카메라… 네가 가져라.', sfx: '' },
          options: [
            { id: 'A', label: '로우 앵글', spec: 'MS · 28mm · 앉은 눈높이', desc: '앉아 있는 서연의 눈높이에서 올려다본다.', grade: 'ok', style: { expressive: 1 },
              shot: { size: 'MS', cam: { pos: [-0.5, 1.02, -0.3], target: [0.5, 1.5, -0.95], lens: 28 }, castPatch: { seoyeon: { hide: true, planShow: true } } },
              why: '앉은 서연의 눈높이에서 올려다보면 아버지는 거대하고 차갑다. 시점(누가 보는가)과 권력(누가 큰가)을 한 번에 말하는 앵글. 천장의 조명이 그의 머리 위에서 그림자를 드리운다.' },
            { id: 'B', label: '아이 레벨', spec: 'MS · 35mm · 선 눈높이', desc: '준호와 같은 높이에서 수평으로.', grade: 'keep', style: { realist: 1 },
              shot: { size: 'MS', cam: { pos: [-0.85, 1.6, -0.35], target: [0.5, 1.48, -0.95], lens: 35 } },
              why: '중립적이다. 카메라가 그를 판단하지 않는다. 담백하지만, 지금 이 순간 서연이 느끼는 위압감은 전달되지 않는다.' },
            { id: 'C', label: '하이 앵글', spec: 'MS · 28mm · 위에서', desc: '천장 근처에서 그를 내려다본다.', grade: 'soso', style: { expressive: 1 },
              shot: { size: 'MS', cam: { pos: [-0.55, 2.55, -0.25], target: [0.5, 1.35, -0.95], lens: 28 } },
              why: '하이 앵글은 인물을 작고 약하게 만든다. 지금 서연이 느끼는 아버지와는 정반대다. 하지만 기억해 두자. 반전(S#4) 이후라면 이 앵글이 오히려 진실이 된다.' },
          ],
          tip: '현장 팁: 로우 앵글은 렌즈가 넓을수록 효과가 커진다. 28mm 이하에서 아래에서 올려다보면 인물이 탑처럼 솟는다.',
        },
        {
          id: 's3c2', fixed: true, cut: 'C2', title: '남겨진 서연',
          note: '대본에 따라 고정된 컷. 준호가 프레임 밖으로 나간 뒤 서연의 미디엄 숏.',
          shot: { set: 'diner', look: 'diner', cast: [dinerS({ expr: 'sad', arm: 'table', gaze: [-0.4, -0.2] }), dinerJ({ hide: true })], size: 'MS', cam: { pos: [0.2, 1.12, -1.75], target: [-0.72, 1.02, 0.0], lens: 50 }, dur: 3, focusOn: 'seoyeon' },
          sheet: { action: '문이 닫힌다. 서연, 움직이지 않는다.', sfx: '문 종소리' },
        },
        {
          id: 's3d2', cut: 'C3', title: '빈자리', lesson: '컷 연결 · 여백', compare: true,
          q: '방금 서연의 미디엄 숏을 보았다. 다음에 무엇을 붙일까?',
          hint: '같은 인물을 비슷한 각도와 크기로 연달아 붙이면 화면이 "튄다". 다음 컷은 앞 컷과 충분히 달라야 한다. 그리고 이 컷의 주인공은 서연일까, 빈자리일까?',
          base: { set: 'diner', look: 'diner', cast: [dinerS({ expr: 'sad', gaze: [-0.4, -0.3] }), dinerJ({ hide: true })], dur: 5, focusOn: 'seoyeon' },
          sheet: { action: '맞은편 빈자리. 식은 커피 한 잔.', sfx: '빗소리만' },
          options: [
            { id: 'A', label: '같은 앵글, 조금 더 가까이', spec: 'MS → MS · 50mm', desc: '거의 같은 자리에서 살짝 다가간 서연.', grade: 'ng', style: {},
              shot: { size: 'MS', cam: { pos: [0.12, 1.12, -1.6], target: [-0.72, 1.04, 0.0], lens: 50 } },
              why: '점프 컷이다. 카메라 각도 변화가 30도에 훨씬 못 미치고 크기 변화도 작아서, 편집점에서 인물이 "튀어" 보인다. 관객은 감정이 아니라 편집을 의식하게 된다. (30도 법칙)' },
            { id: 'B', label: '와이드 — 한쪽엔 서연, 한쪽엔 빈자리', spec: 'LS · 28mm · 여백', desc: '프레임 왼쪽 끝의 서연, 오른쪽의 빈 좌석.', grade: 'ok', style: { minimal: 1 },
              shot: { size: 'LS', cam: { pos: [0.6, 1.25, -2.15], target: [0.0, 0.95, 0.0], lens: 24, shift: [-0.08, 0] } },
              why: '여백이 감정이다. 텅 빈 오른쪽이 떠난 사람을 "연기"한다. 각도와 크기가 모두 크게 바뀌어 연결도 매끄럽다. 넓은 화면비라면 효과가 더 커진다.' },
            { id: 'C', label: '빈자리 인서트', spec: 'INSERT · 40mm', desc: '준호가 앉았던 자리와 식은 커피.', grade: 'keep', style: { classic: 1 },
              shot: { size: 'INS', cam: { pos: [-0.05, 1.0, -0.75], target: [0.55, 0.68, 0.05], lens: 32 }, focusOn: null, focus: 0.9 },
              why: '부재를 직접 보여준다. 명확하지만, 서연이 프레임에 없어서 그 빈자리를 바라보는 사람의 감정은 관객이 대신 채워야 한다.' },
          ],
          tip: '현장 팁: 30도 법칙. 같은 피사체를 이어 붙일 때는 카메라 각도를 30도 이상 바꾸거나 샷 사이즈를 두 단계 이상 바꿔라.',
        },
      ],
    },
    {
      id: 's4', num: 4, heading: 'INT. 서연의 암실 — 밤', set: 'darkroom', place: '서연의 암실',
      script: [
        { t: 'a', x: '붉은 안전등 아래. 서연이 카메라 속에 남아 있던 필름을 현상한다.' },
        { t: 'a', x: '현상액 속에서 상이 떠오른다. 지난달 서연의 첫 사진전, 전시장 입구에 선 서연. 길 건너에서 몰래 찍은 사진이다.' },
        { t: 'a', x: '줄에 걸린 다른 사진들. 졸업식, 이삿날. 모두 멀리서.' },
        { t: 'a', x: '서연의 손이 멈춘다.' },
      ],
      intent: '반전. 아버지는 10년 동안 멀리서 그녀를 보고 있었다. 관객이 서연과 "동시에" 깨닫게 하라.',
      decisions: [
        {
          id: 's4d1', cut: 'C1', title: '암실의 빛', lesson: '동기 있는 조명',
          q: '이 공간의 빛은 어디에서 와야 할까?',
          hint: '관객은 빛의 출처를 무의식적으로 믿는다. 화면 속 광원이 빛의 이유가 될 때 공간은 진짜가 된다. 그리고 여기는 암실이다.',
          base: { set: 'darkroom', look: 'safelight', cast: [darkS()], dur: 5, size: 'LS', cam: { pos: [1.5, 1.6, -1.95], target: [0, 1.1, 0.6], lens: 22 }, focusOn: 'seoyeon' },
          sheet: { action: '서연, 트레이 앞에 서서 인화지를 흔든다.', sfx: '물 찰랑이는 소리, 타이머 째깍' },
          options: [
            { id: 'A', label: '붉은 안전등만', spec: 'PRACTICAL · SAFELIGHT', desc: '벽의 안전등 하나. 붉은 어둠.', grade: 'ok', style: { realist: 1 },
              shot: { look: 'safelight' },
              why: '동기 있는 조명(motivated lighting). 화면 속 안전등이 곧 빛의 이유다. 사실적이면서 동시에 정서적이다. 붉은 어둠은 이 장면을 비밀스럽고 내밀한 공간으로 만든다.' },
            { id: 'B', label: '천장 형광등', spec: 'FLUORESCENT · FLAT', desc: '모든 것이 잘 보이는 백색광.', grade: 'ng', style: {},
              shot: { look: 'fluor' },
              why: '현상 중에 백색광을 켜면 인화지가 전부 감광되어 새까매진다. 공간의 논리를 깨는 조명은 관객의 몰입을 깬다. 사진을 아는 관객이라면 이 컷에서 웃음이 터진다.' },
            { id: 'C', label: '안전등 + 파란 얼굴 키', spec: 'SAFELIGHT + BLUE KEY', desc: '붉은 공간 속 얼굴에만 차가운 빛.', grade: 'keep', style: { expressive: 1 },
              shot: { look: 'safekey' },
              why: '표정은 잘 보이지만 출처가 없는 빛이다. 붉은색과 파란색의 대비는 양식적으로 아름답지만, 사실적인 공간감은 조금 무너진다. 의도된 스타일이라면 가능.' },
          ],
          tip: '현장 팁: 화면 안에 보이는 실제 조명기구를 "프랙티컬(practical)"이라 부른다. 프랙티컬을 먼저 정하고, 그 빛을 흉내 내도록 영화 조명을 보강하는 것이 사실적 조명의 기본이다.',
        },
        {
          id: 's4d2', cut: 'C2', title: '떠오르는 사진', lesson: '인서트와 시점',
          q: '현상액 속에서 상이 떠오르는 순간. 무엇을 보여줄까?',
          hint: '관객이 언제 정보를 알게 되는지가 감정을 결정한다. 인물보다 먼저 알면 서스펜스, 인물과 동시에 알면 공감이 된다.',
          base: { set: 'darkroom', look: 'safelight', cast: [darkS()], dur: 4, focusOn: 'seoyeon' },
          sheet: { action: '현상액 속에서 상이 떠오른다. 전시장 입구의 서연.', sfx: '물소리. 타이머가 멈춘다' },
          options: [
            { id: 'A', label: '트레이 탑샷 인서트', spec: 'INSERT · 부감 · 45mm', desc: '서연의 시선 그대로, 위에서 내려다본 사진.', grade: 'ok', style: { classic: 1 },
              shot: { size: 'INS', angle: '탑샷 (서연 시점)', cam: { pos: [-0.52, 1.45, 0.82], yaw: 0, pitch: -89.5, lens: 45 }, castPatch: { seoyeon: { hide: true, planShow: true } }, focusOn: null, focus: 0.5 },
              why: '서연의 시점(POV)과 정보를 동시에. 관객은 그녀와 같은 순간에 사진을 본다. 인서트는 "이것이 중요하다"고 가리키는 감독의 손가락이다.' },
            { id: 'B', label: '얼굴 먼저 (사진은 숨김)', spec: 'MCU · 50mm', desc: '사진을 내려다보는 서연의 얼굴만.', grade: 'keep', style: { expressive: 1 },
              shot: { size: 'MCU', cam: { pos: [0.2, 1.42, 1.08], target: [0, 1.45, 0.12], lens: 50 }, castPatch: { seoyeon: { expr: 'shock' } } },
              why: '반응을 먼저 보여주면 "무엇을 봤지?"라는 서스펜스가 생긴다. 강력한 기법이지만, 이 씬의 목표는 관객이 서연과 "동시에" 깨닫는 것이다. 정보가 한 박자 늦어진다.' },
            { id: 'C', label: '와이드 그대로', spec: 'LS · 22mm', desc: '작업대와 서연 전체. 사진은 작게.', grade: 'soso', style: { realist: 1 },
              shot: { size: 'LS', cam: { pos: [1.5, 1.6, -1.95], target: [0, 1.1, 0.6], lens: 22 } },
              why: '사진이 너무 작아 정보가 전달되지 않는다. 관객은 서연이 왜 멈췄는지 모른 채 장면을 지나친다. 가장 중요한 정보에는 화면을 내줘야 한다.' },
          ],
          tip: '현장 팁: 인서트는 대개 본 촬영 후 소규모 팀이 따로 찍는다. 그래서 콘티에 정확한 프레이밍을 그려 두지 않으면 엉뚱한 인서트가 나온다.',
        },
        {
          id: 's4d3', cut: 'C3', title: '깨달음', lesson: '무빙과 감정',
          q: '서연이 모든 것을 이해하는 순간. 카메라는 어떻게 움직일까?',
          hint: '같은 클로즈업이라도 어떻게 도착하느냐에 따라 의미가 달라진다. 달리(카메라 이동)와 줌(렌즈 변화)은 다르게 느껴진다.',
          base: { set: 'darkroom', look: 'safelight', cast: [darkS({ expr: 'realize', headDown: false, gaze: [0, -0.3] })], dur: 6, size: 'CU', cam: { pos: [0.16, 1.47, 0.98], target: [0, 1.5, 0.12], lens: 50 }, focusOn: 'seoyeon' },
          sheet: { action: '서연의 손이 멈춘다. 숨을 삼킨다.', sfx: '모든 소리가 서서히 빠진다' },
          options: [
            { id: 'A', label: '느린 달리 인', spec: 'PUSH IN · 6초', desc: '미디엄에서 클로즈업으로, 아주 천천히.', grade: 'ok', style: { classic: 1 },
              shot: { move: { type: 'pushIn', k: 1.9 } },
              why: '느린 푸시 인은 인물의 내면으로 들어가는 움직임이다. 관객은 자신도 모르게 서연에게 다가가며 그녀의 깨달음에 동참한다. 조용한 반전의 고전 문법.' },
            { id: 'B', label: '크래시 줌', spec: 'CRASH ZOOM · 0.5초', desc: '순식간에 얼굴로 줌인.', grade: 'soso', style: { expressive: 1 },
              shot: { move: { type: 'crash', z: 3 } },
              why: '급격한 줌은 충격, 코미디, 장르적 쾌감의 언어다. 조용한 깨달음에는 과하다. 관객은 서연이 아니라 카메라를 의식하게 된다.' },
            { id: 'C', label: '돌리 줌', spec: 'DOLLY ZOOM · 4초', desc: '달리 인과 줌 아웃을 동시에. 배경이 늘어난다.', grade: 'keep', style: { expressive: 1 },
              shot: { move: { type: 'dollyZoom', k: 2.2 } },
              why: '인물 크기는 그대로인데 배경이 일그러진다. 히치콕의 「현기증」 이후 "세계가 뒤틀리는 순간"의 상징. 강렬하지만 이 영화의 절제된 톤에서는 튀어 보일 수 있다.' },
            { id: 'D', label: '고정', spec: 'FIX · 6초', desc: '움직이지 않고 배우의 얼굴을 믿는다.', grade: 'keep', style: { minimal: 1 },
              shot: { move: { type: 'static' } },
              why: '절제. 배우의 연기를 믿는 선택이다. 강한 배우라면 가장 아름다운 컷이 될 수 있다. 다만 카메라가 관객의 감정을 "안내"하지는 않는다.' },
          ],
          tip: '현장 팁: 달리 인은 배경과 인물의 관계(원근)가 변하고, 줌은 변하지 않는다. 그래서 달리는 "다가감"으로, 줌은 "확대해 봄"으로 느껴진다.',
        },
      ],
    },
    {
      id: 's5', num: 5, heading: 'EXT. 역으로 가는 길 — 밤 (비)', set: 'street', place: '역으로 가는 길',
      script: [
        { t: 'a', x: '서연이 우산도 없이 뛴다. 골목을 지나, 역을 향해.' },
        { t: 'a', x: '역 시계 23:53. 막차는 23:55.' },
      ],
      intent: '시간과의 싸움. 관객이 숨이 차야 한다. 그리고 역은 언제나 "오른쪽"에 있다.',
      decisions: [
        {
          id: 's5d1', cut: 'C1', title: '달리는 서연', lesson: '카메라 스타일',
          q: '뛰는 서연을 따라가는 카메라. 어떤 방식으로?',
          hint: '카메라를 지지하는 방식이 화면의 성격을 바꾼다. 손으로 들면 숨이, 장비에 얹으면 흐름이 생긴다.',
          base: { set: 'street', look: 'night', cast: [runS()], dur: 4, focusOn: 'seoyeon', seed: 21 },
          sheet: { action: '서연, 빗속을 달린다. 역 방향(→).', sfx: '거친 숨, 발소리, 빗소리' },
          options: [
            { id: 'A', label: '핸드헬드 팔로우', spec: 'HANDHELD · 32mm', desc: '어깨에 멘 카메라가 서연과 함께 뛴다.', grade: 'ok', style: { realist: 1 },
              shot: { size: 'MLS', cam: { pos: [-3.1, 1.45, -1.9], target: [1.6, 1.25, 1.3], lens: 32 }, move: { type: 'handheld', follow: 'seoyeon', amp: 1.2 } },
              why: '흔들림이 서연의 호흡이 된다. 카메라가 그녀와 같이 뛰는 것처럼 느껴져 관객의 심장도 빨라진다. 다큐멘터리 같은 즉시성.' },
            { id: 'B', label: '스테디캠 팔로우', spec: 'STEADICAM · 32mm', desc: '흔들림 없이 미끄러지듯 따라간다.', grade: 'keep', style: { classic: 1 },
              shot: { size: 'MLS', cam: { pos: [-3.1, 1.45, -1.9], target: [1.6, 1.25, 1.3], lens: 32 }, move: { type: 'steadicam', follow: 'seoyeon', dir: 1 } },
              why: '유려하고 몰입적이다. 하지만 매끄러움은 긴박함보다 "흐름"을 만든다. 꿈속을 달리는 듯한 느낌이 필요할 때 더 어울린다.' },
            { id: 'C', label: '고정 와이드', spec: 'LS · 28mm · FIX', desc: '카메라는 서 있고 서연이 프레임을 가로지른다.', grade: 'soso', style: { minimal: 1 },
              shot: { size: 'LS', cam: { pos: [-20, 1.4, -6.6], target: [-20, 1.7, 1.5], lens: 28 }, move: { type: 'static' }, castPatch: { seoyeon: { pos: [-20, 0.15, 0.9], move: [11, 0, 0] } } },
              why: '프레임을 가로지르는 인물은 관찰자의 거리를 만든다. 공간과 방향은 명확하지만 카메라가 그녀를 내버려 두는 느낌이라 긴박감이 약하다.' },
          ],
          tip: '현장 팁: 핸드헬드도 연출이다. 촬영감독에게 "얼마나" 흔들릴지 말해 줘야 한다. 숨 고르기, 놓치기, 다시 찾기까지 리허설한다.',
        },
        {
          id: 's5d2', cut: 'C2', title: '다음 컷의 방향', lesson: '화면 방향', compare: true,
          q: '앞 컷에서 서연은 화면 왼쪽에서 오른쪽으로 달렸다. 다음 컷은?',
          hint: '관객은 화면 위의 방향으로 지리를 기억한다. 역은 오른쪽에 있다. 평면도에서 카메라가 서연의 진행선 어느 쪽에 있는지 보라.',
          base: { set: 'street', look: 'night', cast: [runS({ pos: [9, 0.15, 0.9] })], dur: 2, focusOn: 'seoyeon', seed: 22 },
          sheet: { action: '서연, 표지판 앞을 지나 계속 달린다.', sfx: '' },
          options: [
            { id: 'A', label: '같은 쪽에서, 앞질러', spec: 'MS · 35mm', desc: '같은 쪽 보도 앞에서 다가오는 서연.', grade: 'ok', style: { classic: 1 },
              shot: { size: 'MS', cam: { pos: [13.6, 1.35, -2.4], target: [9.4, 1.25, 0.9], lens: 35 } },
              why: '화면 방향을 지켰다. 서연은 여전히 왼쪽에서 오른쪽으로 달리고, 관객은 그녀가 같은 목적지를 향해 가고 있다고 느낀다. 표지판의 화살표도 오른쪽을 가리킨다.' },
            { id: 'B', label: '반대쪽에서', spec: 'MS · 28mm · 선 넘음', desc: '가게 쪽으로 돌아가서 잡은 서연.', grade: 'ng', style: {},
              shot: { size: 'MS', cam: { pos: [12.2, 1.4, 3.2], target: [9, 1.2, 0.9], lens: 28 } },
              why: '진행선을 넘었다. 방금까지 오른쪽으로 달리던 서연이 왼쪽으로 달린다. 관객은 그녀가 "되돌아간다"고 읽는다. 표지판 화살표마저 반대(← 해원역)로 보인다.' },
            { id: 'C', label: '정면에서 다가옴', spec: 'MS · 85mm · 정면', desc: '망원 렌즈로, 서연이 카메라를 향해 달려온다.', grade: 'keep', style: { classic: 1 },
              shot: { size: 'MS', cam: { pos: [16, 1.35, 0.9], target: [9, 1.35, 0.9], lens: 85 } },
              why: '방향이 중립인 컷이다. 진행선 위에서 찍으면 좌우 방향이 사라져, 다음 컷에서 방향을 바꿔도 되는 "다리"가 된다. 망원으로 압축된 거리는 아무리 뛰어도 줄지 않는 시간처럼 보인다.' },
          ],
          tip: '현장 팁: 추격 장면은 평면도에 진행선(화살표)을 먼저 그린다. 카메라를 모두 같은 쪽에 두면 수십 컷을 이어도 관객은 길을 잃지 않는다.',
        },
        {
          id: 's5d3', kind: 'rhythm', title: '편집 리듬', lesson: '컷의 길이',
          q: '역까지의 질주 시퀀스. 컷의 길이를 어떻게 설계할까?',
          hint: '같은 장면도 컷의 길이에 따라 다르게 느껴진다. 시간이 줄어드는 느낌은 어떤 리듬에서 나올까?',
          sheet: { action: '질주 몽타주: 달리기 → 발 → 역 시계 → 얼굴', sfx: '숨소리가 점점 가빠진다' },
          options: [
            { id: 'A', label: '점점 짧아지는 컷', spec: '4 · 3 · 2 · 1.2 · 0.8초', desc: '긴 컷에서 시작해 점점 빨라진다.', grade: 'ok', style: { classic: 1 }, rhythm: [4, 3, 2, 1.2, 0.8],
              why: '컷이 짧아질수록 관객의 맥박이 빨라진다. 남은 시간이 줄어드는 상황을 편집 리듬 자체가 연기한다. 가속하는 편집은 클라이맥스로 향하는 가장 확실한 엔진이다.' },
            { id: 'B', label: '롱테이크 하나', spec: '14초 원 테이크', desc: '자르지 않고 처음부터 끝까지 따라간다.', grade: 'keep', style: { realist: 1, minimal: 1 }, rhythm: [14],
              why: '실시간의 긴장. 관객은 서연과 똑같은 시간을 견딘다. 강력하지만 "시간이 줄어든다"는 감각보다 "시간이 길다"는 감각이 남는다.' },
            { id: 'C', label: '일정한 2초 컷', spec: '2 · 2 · 2 · 2 · 2 · 2초', desc: '같은 길이의 컷을 반복.', grade: 'soso', style: {}, rhythm: [2, 2, 2, 2, 2, 2],
              why: '메트로놈처럼 일정한 리듬은 긴장을 평평하게 만든다. 관객은 패턴에 금방 익숙해지고, 익숙함은 긴박감의 적이다.' },
          ],
          tip: '현장 팁: 편집 리듬은 촬영 단계에서 이미 결정된다. 짧게 쓸 컷은 짧게 찍어도 되지만, 가속하려면 긴 컷의 "여유"를 충분히 찍어 두어야 한다.',
        },
      ],
    },
    {
      id: 's6', num: 6, heading: 'EXT. 해원역 플랫폼 — 밤', set: 'platform', place: '해원역 플랫폼',
      script: [
        { t: 'a', x: '서연이 계단을 뛰어오르는 순간, 막차의 문이 닫힌다.' },
        { t: 'a', x: '창 너머의 준호. 두 사람의 눈이 마주친다.' },
        { t: 'a', x: '서연이 엄마의 카메라를 들어 올린다. 찰칵.' },
        { t: 'a', x: '기차가 떠난다.' },
      ],
      intent: '말 없는 화해. 대사 없이, 이미지로만 끝내라.',
      decisions: [
        {
          id: 's6d1', cut: 'C1', title: '유리창 너머', lesson: '프레임 속 프레임',
          q: '닫힌 문, 창 너머의 아버지. 두 사람의 눈맞춤을 어떻게 보여줄까?',
          hint: '창문, 문틀, 거울은 화면 안에 또 하나의 프레임을 만든다. 프레임 속 프레임은 인물을 가두거나, 갈라놓는다.',
          base: { set: 'platform', look: 'platform', cast: [platS(), platJ()], dur: 4, focusOn: 'junho' },
          sheet: { action: '창 너머의 준호, 서연을 본다.', sfx: '출발 경보음' },
          options: [
            { id: 'A', label: '서연의 시점: 창틀 속 준호', spec: 'POV · 32mm', desc: '유리창의 테두리가 준호를 가둔다.', grade: 'ok', style: { expressive: 1 },
              shot: { size: 'MS', cam: { pos: [2.2, 2.62, -2.7], target: [2.45, 2.5, 0.35], lens: 32 }, castPatch: { seoyeon: { hide: true, planShow: true } } },
              why: '창틀이 "프레임 속 프레임"이 되어 둘 사이의 유리벽을 시각화한다. 보이지만 닿을 수 없다. 서연의 시점이기에 관객도 그 유리 앞에 선다.' },
            { id: 'B', label: '측면 투숏', spec: 'LS · 35mm', desc: '플랫폼의 서연과 기차 창문을 한 화면에.', grade: 'keep', style: { classic: 1 },
              shot: { size: 'LS', cam: { pos: [-3.4, 2.25, -4.6], target: [2.4, 2.25, -0.4], lens: 35 }, focusOn: 'seoyeon' },
              why: '두 사람의 공간 관계가 명확하다. 하지만 눈맞춤의 강도가 약하다. 관객은 두 사람을 "관찰"할 뿐 그 시선 안으로 들어가지 못한다.' },
            { id: 'C', label: '높은 부감', spec: 'LS · 28mm · 하이 앵글', desc: '지붕 높이에서 플랫폼과 열차를 내려다본다.', grade: 'soso', style: { minimal: 1 },
              shot: { size: 'LS', cam: { pos: [6.2, 5.3, -7.2], target: [2.6, 1.5, -0.6], lens: 28 }, focusOn: 'seoyeon', dof: false },
              why: '구조는 아름답지만 얼굴이 사라진다. 이 영화의 가장 사적인 순간을 신의 시점으로 보면 감정이 식는다. 이 앵글은 마지막을 위해 아껴 두자.' },
          ],
          tip: '현장 팁: 유리를 사이에 둔 촬영에서는 반사가 적이 되기도, 친구가 되기도 한다. 편광 필터로 반사를 지울지, 남겨서 의미로 쓸지 미리 정하라.',
        },
        {
          id: 's6d2', cut: 'C2', title: '마지막 이미지', lesson: '엔딩',
          q: '서연이 셔터를 누른다. 이 영화의 마지막 이미지는?',
          hint: '마지막 컷은 관객이 극장을 나서며 들고 가는 이미지다. 영화가 처음 던진 질문에 이미지로 답하라. 오프닝에서 무엇을 했는지 기억나는가?',
          base: { set: 'platform', look: 'platform', cast: [platS({ arm: 'camera', expr: 'sad' }), platJ()], dur: 6, focusOn: 'junho' },
          sheet: { action: '서연, 카메라를 들어 셔터를 누른다. 기차가 떠난다.', sfx: '찰칵. 기차 소리가 멀어진다' },
          options: [
            { id: 'A', label: '프리즈 프레임 → 사진', spec: 'FREEZE · 창 속 준호', desc: '셔터 소리와 함께 화면이 멈추고 사진이 된다.', grade: 'ok', style: { expressive: 1 },
              shot: { size: 'MS', fx: 'freeze', cam: { pos: [2.28, 2.62, -2.05], target: [2.45, 2.55, 0.35], lens: 40 }, castPatch: { seoyeon: { hide: true, planShow: true } }, dur: 5 },
              why: '영화가 한 장의 사진이 되며 끝난다. 사진가인 딸, 엄마의 카메라, 멀리서 딸을 찍던 아버지. 모든 실이 이 한 장으로 모인다. 처음으로 딸이 아버지를 찍었다.' },
            { id: 'B', label: '크레인 업 — 떠나는 기차', spec: 'ELS · CRANE UP · 28mm', desc: '서연에게서 하늘로. 홀로 남은 플랫폼.', grade: 'ok', style: { classic: 1 },
              shot: { size: 'ELS', look: 'platformBack', trainX: 98, trainV: 6, speed: true, cam: { pos: [-1.5, 15, 17], target: [3.4, 1.8, -1.6], lens: 28 }, move: { type: 'craneUp', from: { pos: [2.4, 2.4, 1.6], target: [2.3, 2.45, -1.55], lens: 35 } }, castPatch: { seoyeon: { arm: 'down' }, junho: { hide: true } }, focusOn: 'seoyeon', dof: false, dur: 8 },
              why: '서연에게서 떠올라 기차와 도시를 품는 고전적인 엔딩. 한 사람의 이야기를 다시 세상 속으로 돌려보낸다.' },
            { id: 'C', label: '셔터음과 함께 컷 투 블랙', spec: 'CUT TO BLACK', desc: '찰칵, 그리고 암전.', grade: 'keep', style: { minimal: 1 },
              shot: { fx: 'black', dur: 3 },
              why: '소리로 끝나는 엔딩. 사진에 무엇이 찍혔는지는 관객의 상상에 맡긴다. 여운이 길지만, 이미지로 답하라는 이 씬의 목표에서는 한 걸음 물러서 있다.' },
            { id: 'D', label: '눈물의 클로즈업, 페이드 아웃', spec: 'CU · 85mm · FADE', desc: '우는 서연의 얼굴이 천천히 어두워진다.', grade: 'soso', style: { classic: 1 },
              shot: { size: 'CU', fx: 'fade', cam: { frame: { who: 'seoyeon', size: 'CU', rel: 24 }, lens: 85 }, castPatch: { seoyeon: { expr: 'tears', arm: 'down' } }, focusOn: 'seoyeon', dur: 6 },
              why: '감정을 "설명"하는 엔딩. 눈물은 관객이 느껴야 할 몫을 대신 보여준다. 말 없는 화해라는 의도에 비하면 너무 직접적이다.' },
          ],
          tip: '현장 팁: 오프닝과 엔딩을 나란히 놓고 보라. 크레인 다운으로 시작한 영화가 크레인 업으로 끝나면 수미상관의 구조가 생긴다.',
          bonus(choices) {
            if (choices.s6d2 === 'B' && choices.s1d2 === 'A') return { pts: 1, text: '수미상관 보너스 +1 — 크레인 다운으로 들어와 크레인 업으로 나간다. 관객은 영화가 "닫혔다"고 느낀다.' };
            if (choices.s6d2 === 'A' && choices.s2d3 === 'D') return { pts: 1, text: '복선 회수 보너스 +1 — S#2에서 인서트로 강조한 카메라가 마지막 이미지를 만든다.' };
            return null;
          },
        },
      ],
    },
  ];

  /* 질주 몽타주용 고정 컷 */
  const MONTAGE = {
    feet: { set: 'street', look: 'night', cast: [runS({ pos: [3, 0.15, 0.9], phase0: 0.4 })], size: 'INS', cam: { pos: [3.2, 0.32, -0.9], target: [3.4, 0.25, 0.9], lens: 35 }, move: { type: 'static' }, focusOn: 'seoyeon', seed: 31, alt: '물웅덩이를 밟는 발' },
    clock: { set: 'street', look: 'night', cast: [runS({ pos: [20, 0.15, 0.9] })], size: 'INS', cam: { pos: [38, 4.5, -1.5], target: [64, 11.6, -3.4], lens: 85 }, move: { type: 'static' }, dof: false, seed: 32, alt: '역 시계 23:53' },
    face: { set: 'street', look: 'night', cast: [runS({ pos: [14, 0.15, 0.9] })], size: 'CU', cam: { frame: { who: 'seoyeon', size: 'CU', rel: 30 }, lens: 85 }, move: { type: 'handheld', follow: 'seoyeon' }, focusOn: 'seoyeon', seed: 33, alt: '숨이 찬 서연' },
  };

  /* 샷 합성: base(또는 직전 컷) + 선택지의 덮어쓰기 */
  function composeShot(base, patch, meta) {
    const out = Object.assign({}, base);
    out.cast = (base.cast || []).map((c) => Object.assign({}, c));
    if (patch) {
      for (const k in patch) {
        if (k === 'castPatch') continue;
        if (k === 'cast') { out.cast = patch.cast.map((c) => Object.assign({}, c)); continue; }
        out[k] = patch[k];
      }
      if (patch.castPatch) {
        out.cast = out.cast.map((c) => (patch.castPatch[c.who] ? Object.assign({}, c, patch.castPatch[c.who]) : c));
      }
    }
    if (meta) Object.assign(out, meta);
    return out;
  }
  K.composeShot = composeShot;

  /* 새 표정: 깨달음 */
  K.EXPR.realize = { lid: 1.18, brow: 0.85, bh: 0.008, mouth: -0.2, open: 0.3 };

  K.STORY = { title: '막차', en: 'The Last Train', logline: '사진가 서연은 10년 만에 아버지를 만난다. 그는 오늘 밤 막차로 도시를 떠난다고 한다.', PRE, SCENES, GRADE, STYLE, MONTAGE };
})(typeof window !== 'undefined' ? window : globalThis);
