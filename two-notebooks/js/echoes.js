// 그들의 문장: 플레이어가 먼저 겪고 적은 뒤에 드러나는 실제 기록
//   kind: quote(원문 인용) · gist(글의 요지) · fact(확인된 사실) · reported(전해지는 이야기)
//   orig: 원문(인용일 때), src: 출처, more: 덧붙이는 맥락
const KIND_LABEL = { quote: '원문', gist: '요지', fact: '기록', reported: '전해짐' };
const BY_LABEL = {
  orwell: '오웰은 이렇게 썼다',
  kazan: '카잔차키스의 기록',
  unamuno: '우나무노의 말',
};

const ECHOES = {
  // ── 조지 오웰 ───────────────────────────────────────────
  'o-window': {
    by: 'orwell', kind: 'quote',
    ko: '좋은 산문은 유리창과 같다.',
    orig: 'Good prose is like a windowpane.',
    src: '「나는 왜 쓰는가」(1946)',
  },
  'o-join': {
    by: 'orwell', kind: 'quote',
    ko: '나는 신문 기사나 몇 편 써 볼까 하는 생각으로 스페인에 왔다. 그러나 거의 곧바로 민병대에 들어갔다. 그때 그 분위기에서는 그것만이 생각할 수 있는 유일한 일 같았다.',
    orig: 'I had come to Spain with some notion of writing newspaper articles, but I had joined the militia almost immediately, because at that time and in that atmosphere it seemed the only conceivable thing to do.',
    src: '『카탈루냐 찬가』(1938)',
  },
  'o-tip': {
    by: 'orwell', kind: 'quote',
    ko: '팁은 법으로 금지되어 있었다. 내가 거의 처음 겪은 일이, 엘리베이터 소년에게 팁을 주려다 호텔 지배인에게 훈계를 들은 것이었다.',
    orig: 'Tipping was forbidden by law; almost my first experience was receiving a lecture from a hotel manager for trying to tip a lift-boy.',
    src: '『카탈루냐 찬가』(1938)',
  },
  'o-saddle': {
    by: 'orwell', kind: 'quote',
    ko: '노동계급이 말안장에 올라탄 도시에 와 본 것은 처음이었다. … 이해하지 못하는 것도 많았고, 어떤 면에서는 마음에 들지도 않았다. 그러나 나는 그것이 싸울 가치가 있는 상태라는 것을 곧바로 알아보았다.',
    orig: 'It was the first time that I had ever been in a town where the working class was in the saddle. … There was much in it that I did not understand, in some ways I did not even like it, but I recognized it immediately as a state of affairs worth fighting for.',
    src: '『카탈루냐 찬가』(1938)',
  },
  'o-ilp': {
    by: 'orwell', kind: 'gist',
    ko: '오웰은 POUM 민병대에 들어간 데 특별한 이유가 없었다고 썼다. 마침 영국 독립노동당(ILP)의 소개장을 들고 바르셀로나에 왔기 때문이다. 그때 그는 정당들 사이의 차이에 별 관심이 없었다.',
    src: '『카탈루냐 찬가』(1938)',
  },
  'o-italian': {
    by: 'orwell', kind: 'quote',
    ko: '낯선 사람에게 느끼는 애정이란 참 묘하다! 마치 그의 영혼과 내 영혼이 한순간 언어와 전통의 간극을 건너, 더없이 가까이 만난 것 같았다.',
    orig: 'Queer, the affection you can feel for a stranger! It was as though his spirit and mine had momentarily succeeded in bridging the gulf of language and tradition and meeting in utter intimacy.',
    src: '『카탈루냐 찬가』(1938)',
    more: '오웰이 민병대에 들어가기 전날, 레닌 병영에서였다. 그는 그 사람을 다시 보지 못했다.',
  },
  'o-five': {
    by: 'orwell', kind: 'quote',
    ko: '참호전에서는 다섯 가지가 중요하다. 장작, 음식, 담배, 초, 그리고 적. 겨울의 사라고사 전선에서는 바로 그 순서대로 중요했고, 적은 한참 처진 꼴찌였다.',
    orig: 'In trench warfare five things are important: firewood, food, tobacco, candles and the enemy. In winter on the Zaragoza front they were important in that order, with the enemy a bad last.',
    src: '『카탈루냐 찬가』(1938)',
  },
  'o-toast': {
    by: 'orwell', kind: 'gist',
    ko: '오웰은 우리 쪽 선전원이 확성기로 적 참호를 향해 "버터 바른 토스트!"를 외치던 밤을 적었다. 새빨간 거짓말이었지만, 그 소리를 듣는 오웰도 배가 고파졌다.',
    src: '『카탈루냐 찬가』(1938)',
  },
  'o-trousers': {
    by: 'orwell', kind: 'quote',
    ko: '내가 쏘지 않은 데는 바지 때문이기도 했다. 나는 \'파시스트\'를 쏘러 거기 왔다. 그러나 바지를 붙들고 있는 사람은 \'파시스트\'가 아니다. 그는 누가 봐도 너와 같은 동료 인간이고, 그를 쏘고 싶은 마음은 들지 않는다.',
    orig: "I did not shoot partly because of that detail about the trousers. I had come here to shoot at 'Fascists'; but a man who is holding up his trousers isn't a 'Fascist', he is visibly a fellow-creature, similar to yourself, and you don't feel like shooting at him.",
    src: '「스페인 전쟁을 돌아보며」(1942년 집필)',
    more: '그는 자기 사격 솜씨로는 백 미터 밖을 달리는 사람을 맞히기 어려웠다는 것, 그리고 적이 비행기에 정신이 팔린 사이 참호로 돌아갈 생각뿐이었다는 것도 함께 적었다.',
  },
  'o-changed': {
    by: 'orwell', kind: 'gist',
    ko: '넉 달 만에 돌아온 바르셀로나에서 오웰은 혁명의 분위기가 사라졌다고 적었다. 부자와 가난한 사람, 윗계급과 아랫계급으로 나뉘는 평범한 사회의 모습이 되살아나고 있었다.',
    src: '『카탈루냐 찬가』(1938)',
    more: '그는 처음에는 "혁명보다 전쟁에 먼저 이기자"는 공산당의 주장이 옳다고 여겼다고도 털어놓았다.',
  },
  'o-papers': {
    by: 'orwell', kind: 'quote',
    ko: '나는 어려서부터 어떤 사건도 신문에 제대로 보도되지 않는다는 것을 알고 있었다. 그러나 스페인에서 처음으로, 사실과 아무 관계도 없는 신문 기사를 보았다. 평범한 거짓말에 담긴 정도의 관계조차 없는.',
    orig: 'Early in life I had noticed that no event is ever correctly reported in a newspaper, but in Spain, for the first time, I saw newspaper reports which do not bear any relation to the facts, not even the relationship which is implied in an ordinary lie.',
    src: '「스페인 전쟁을 돌아보며」(1942년 집필)',
  },
  'o-history': {
    by: 'orwell', kind: 'quote',
    ko: '언젠가 아서 쾨슬러에게 "역사는 1936년에 멈췄다"고 말한 적이 있다. 그는 곧바로 알아듣고 고개를 끄덕였다.',
    orig: "I remember saying once to Arthur Koestler, 'History stopped in 1936', at which he nodded in immediate understanding.",
    src: '「스페인 전쟁을 돌아보며」(1942년 집필)',
    more: '일어난 일이 아니라 일어났어야 할 일이 역사로 기록되기 시작했다는 뜻이었다. 『1984』의 진리부는 지난 신문을 날마다 고쳐 쓴다.',
  },
  'o-explosion': {
    by: 'orwell', kind: 'quote',
    ko: '대충 말하자면, 폭발의 한가운데에 있는 느낌이었다.',
    orig: 'Roughly speaking it was the sensation of being at the centre of an explosion.',
    src: '『카탈루냐 찬가』(1938)',
  },
  'o-wife': {
    by: 'orwell', kind: 'quote',
    ko: '아내가 좋아하겠군, 하고 생각했다. 아내는 늘 내가 부상을 입기를 바랐다. 그러면 큰 전투가 벌어질 때 죽지 않을 테니까.',
    orig: 'This ought to please my wife, I thought; she had always wanted me to be wounded, which would save me from being killed when the great battle came.',
    src: '『카탈루냐 찬가』(1938)',
  },
  'o-first': {
    by: 'orwell', kind: 'quote',
    ko: '처음 떠오른 생각은, 상투적이게도, 아내였다. 두 번째는 이 세상을 떠나야 한다는 데 대한 격렬한 분노였다. 따지고 보면 이 세상은 내게 아주 잘 맞는 곳이었다.',
    orig: 'My first thought, conventionally enough, was for my wife. My second was a violent resentment at having to leave this world which, when all is said and done, suits me so well.',
    src: '『카탈루냐 찬가』(1938)',
  },
  'o-connolly': {
    by: 'orwell', kind: 'quote',
    ko: '나는 놀라운 것들을 보았고, 마침내 사회주의를 정말로 믿게 되었다. 전에는 한 번도 믿어 본 적이 없었는데.',
    orig: 'I have seen wonderful things & at last really believe in Socialism, which I never did before.',
    src: '친구 시릴 코널리에게 보낸 편지(1937, 부상 뒤)',
    more: '목에 총을 맞고, 같은 편의 신문들이 POUM을 \'프랑코의 첩자\'라 부르던 때에 쓴 편지다. 그는 『카탈루냐 찬가』에서 스페인의 민병대를 \'계급 없는 사회의 축소판\' 같은 것이라 불렀다.',
  },
  'o-diary': {
    by: 'orwell', kind: 'fact',
    ko: '6월 중순, 경찰은 아일린의 호텔 방을 뒤져 오웰의 일기와 편지, 책, 신문 스크랩을 가져갔다. 일기는 끝내 돌아오지 않았다. 옛 소련 문서고 어딘가에 있으리라는 추측만 남아 있다. 그는 『카탈루냐 찬가』를 기억에 기대어 썼다.',
    src: '『카탈루냐 찬가』(1938), 오웰 협회 자료',
  },
  'o-bourgeois': {
    by: 'orwell', kind: 'gist',
    ko: '오웰은 돈 많은 영국인 관광객처럼 보이는 것이 자신들을 살렸다고 적었다. 넉 달 전의 바르셀로나에서라면 그 차림이야말로 의심받았을 것이다.',
    src: '『카탈루냐 찬가』(1938)',
  },
  'o-officer': {
    by: 'orwell', kind: 'gist',
    ko: '전쟁부의 \'작은 장교\'는 코프가 POUM 소속이라는 말을 듣고도 오웰을 경찰청장에게 데려가 편지를 되찾게 도왔다. 헤어질 때 그는 오웰과 악수했다. 오웰은 그 악수에 깊이 감동했다고 적었다.',
    src: '『카탈루냐 찬가』(1938)',
  },
  'o-spaniards': {
    by: 'orwell', kind: 'quote',
    ko: '스페인에 대해서는 더없이 끔찍한 기억들이 있다. 그러나 스페인 사람들에 대한 나쁜 기억은 거의 없다.',
    orig: 'I have the most evil memories of Spain, but I have very few bad memories of Spaniards.',
    src: '『카탈루냐 찬가』(1938)',
  },
  'o-decency': {
    by: 'orwell', kind: 'quote',
    ko: '이상하게도, 이 모든 경험은 인간의 품위에 대한 내 믿음을 줄이지 않았다. 오히려 키워 주었다.',
    orig: 'Curiously enough the whole experience has left me with not less but more belief in the decency of human beings.',
    src: '『카탈루냐 찬가』(1938)',
  },
  'o-sleep': {
    by: 'orwell', kind: 'quote',
    ko: '… 모두가 잉글랜드의 깊고 깊은 잠에 빠져 있다. 나는 가끔 두렵다. 폭탄의 굉음에 끌려 나오기 전까지는 우리가 끝내 깨어나지 못할까 봐.',
    orig: '… all sleeping the deep, deep sleep of England, from which I sometimes fear that we shall never wake till we are jerked out of it by the roar of bombs.',
    src: '『카탈루냐 찬가』의 마지막 문장',
    more: '2년 뒤 제2차 세계대전이 시작되었고, 1940년 9월 런던에 폭탄이 쏟아졌다.',
  },
  'o-why': {
    by: 'orwell', kind: 'quote',
    ko: '1936년 이후 내가 쓴 진지한 글은 한 줄 한 줄이 모두, 직접이든 간접이든, 전체주의에 반대하고 내가 이해하는 민주적 사회주의를 위해 쓴 것이다.',
    orig: 'Every line of serious work that I have written since 1936 has been written, directly or indirectly, against totalitarianism and for democratic Socialism, as I understand it.',
    src: '「나는 왜 쓰는가」(1946)',
    more: '그 뒤에 나온 책이 『동물농장』(1945)과 『1984』(1949)이다.',
  },
  'o-crystal': {
    by: 'orwell', kind: 'quote',
    ko: '이탈리아 병사가 내 손을 잡았다 / 위병소 탁자 옆에서 … // 그러나 네 얼굴에서 내가 본 것은 / 어떤 권력도 빼앗아 가지 못하리라. / 이제껏 터진 어떤 폭탄도 / 그 수정 같은 정신을 부수지 못하리라.',
    orig: 'The Italian soldier shook my hand / Beside the guard-room table; … // But the thing that I saw in your face / No power can disinherit: / No bomb that ever burst / Shatters the crystal spirit.',
    src: '시 「이탈리아 병사가 내 손을 잡았다」(1939), 「스페인 전쟁을 돌아보며」에 실림',
    more: '레닌 병영에서 단 한 번 손을 맞잡은 그 민병대원을 오웰은 다시 만나지 못했다. 그가 살아남았는지도 알 수 없었다.',
  },

  // ── 니코스 카잔차키스 ─────────────────────────────────
  'k-1926': {
    by: 'kazan', kind: 'fact',
    ko: '카잔차키스는 1926년 여름 처음 스페인에 갔다. 독재자 프리모 데 리베라를 인터뷰했고, 톨레도에서 엘 그레코를 처음 만났다. 크레타 출신인 이 화가를 그는 같은 섬의 선조처럼 여겼다. 1932–33년에는 마드리드에 오래 머물며 스페인 시를 그리스어로 옮겼다.',
    src: '카잔차키스 스페인 여행 연구(Letra Internacional, vscw.ca)',
  },
  'k-greco': {
    by: 'kazan', kind: 'fact',
    ko: '그가 마지막으로 쓴 책은 『엘 그레코에게 보내는 보고서』다. 자기 삶을 같은 크레타 사람인 화가에게 \'보고\'하는 형식의 자전적 소설로, 그가 죽은 뒤인 1961년에 나왔다.',
    src: '『엘 그레코에게 보내는 보고서』(1961)',
  },
  'k-assign': {
    by: 'kazan', kind: 'fact',
    ko: '보수 일간지 「카티메리니」는 1936년 10월 2일 그의 스페인 파견을 알렸다. 그는 10월 9일 마르세유를 거쳐 10월 19일 살라망카에 도착해 그랜드 호텔에 묵었다.',
    src: '카잔차키스의 1936년 스페인 취재 연구(fronterad, Letralia)',
  },
  'k-unamuno': {
    by: 'kazan', kind: 'reported',
    ko: '카잔차키스가 전한 우나무노는 프랑코와 몰라를 신중한 사람들이라 했고, 지금은 질서가 먼저라고 했다. 자신은 우파로 돌아서지 않았다고도 했다. 그리고 말했다. 나는 파시스트도 볼셰비키도 아니다, 나는 혼자다. 그는 스페인이 둘로 찢어지는 것을 두려워했다.',
    src: '카잔차키스의 우나무노 인터뷰(1936년 10월 21일, 12월 중순 게재)',
    more: '우나무노는 그해 12월 31일, 사실상 갇혀 지내던 집에서 세상을 떠났다.',
  },
  'k-pass': {
    by: 'kazan', kind: 'fact',
    ko: '10월 30일에 받은 통행증은 톨레도와 전선 방문, 그리고 \'마드리드 입성\'을 허락했다. 그는 \'문학\' 특파원으로 분류되었다.',
    src: '카잔차키스의 1936년 스페인 취재 연구(fronterad, Letra Internacional)',
  },
  'k-besieged': {
    by: 'kazan', kind: 'fact',
    ko: '카잔차키스는 알카사르를 다룬 글에 디오니시오스 솔로모스의 시 「자유로운 포위된 사람들」의 제목을 빌려 왔다. 1826년 오스만 군대에 포위된 메솔롱기의 그리스인들을 노래한 시다. 그는 포위를 견딘 친구의 이야기를 통해 알카사르의 방어자들을 메솔롱기의 영웅처럼 그렸다.',
    src: '카잔차키스의 톨레도 취재 연구(Vestigios de la Guerra Civil en Toledo)',
  },
  'k-lorca': {
    by: 'kazan', kind: 'reported',
    ko: '카잔차키스는 톨레도에서 로르카가 죽었다는 소식을 들었다고 전해진다. 그는 로르카를 그리스어로 옮겨 그리스 독자에게 소개한 사람이기도 했다.',
    src: '카잔차키스의 톨레도 취재 연구, vscw.ca',
    more: '로르카는 1936년 8월 그라나다 근교에서 반란군 쪽 사람들에게 총살당했다.',
  },
  'k-bias': {
    by: 'kazan', kind: 'gist',
    ko: '연구자들은 그의 기사가 반란군 쪽으로 기울어 있었고, 국민파가 저지른 폭력에는 입을 다물었다고 지적한다. 동시에 그 기사들이 정치 분석보다 풍경과 인물과 신화에 기댄 \'문학\'이었다는 점도 함께 지적한다.',
    src: 'Letralia(2018), 세르반테스 문화원 아테네 블로그',
  },
  'k-international': {
    by: 'kazan', kind: 'gist',
    ko: '카잔차키스는 이 전쟁이 내전이라기보다 국제전에 가깝다고 결론 내렸다.',
    src: '카잔차키스의 1936년 스페인 취재 연구(Letralia, CVC)',
    more: '독일의 콘도르 군단과 이탈리아군은 국민파 편에서, 소련의 무기와 군사 고문, 그리고 50여 개 나라에서 온 국제여단은 공화국 편에서 싸웠다. 몇 해 뒤 시작될 세계대전의 무기와 전술이 이 땅에서 먼저 시험되었다.',
  },
  'k-cross': {
    by: 'kazan', kind: 'reported',
    ko: '그는 객관적인 시각을 갖고 싶어 했고, 공화국 쪽으로 넘어가 보는 것까지 고민했다고 전해진다. 그러나 넘어가지 않았다.',
    src: 'Letralia(2018), fronterad',
  },
  'k-dispatches': {
    by: 'kazan', kind: 'fact',
    ko: '그의 기사는 1936년 11월 24일부터 1937년 1월 17일까지 「카티메리니」에 45편 실렸다.',
    src: '카잔차키스의 1936년 스페인 취재 연구(Letralia, CVC)',
  },
  'k-book': {
    by: 'kazan', kind: 'fact',
    ko: '1937년 4월, 카잔차키스는 1926년과 1932–33년, 1936년의 스페인 여행기를 묶어 『여행하며: 스페인』을 냈다. 책에서는 신문 기사의 편향된 대목들을 누그러뜨렸다. 내전을 다룬 부분에는 \'¡Viva la muerte!(죽음 만세!)\'라는 부제가 붙었다.',
    src: '카잔차키스 재단(kazantzaki.gr), 세르반테스 문화원 아테네 블로그',
    more: '\'죽음 만세!\'는 스페인 외인부대의 구호다. 1936년 10월 12일 살라망카 대학 강당에서 우나무노가 맞섰던 바로 그 외침이다.',
  },
  'k-epitaph': {
    by: 'kazan', kind: 'quote',
    ko: '나는 아무것도 바라지 않는다. 나는 아무것도 두려워하지 않는다. 나는 자유다.',
    orig: 'Δεν ελπίζω τίποτα. Δε φοβούμαι τίποτα. Είμαι λέφτερος.',
    src: '이라클리오 성벽 위 그의 무덤 비문(1957)',
  },
};

// 플레이어가 고른 문장이 실제 기록과 얼마나 닿았는지
const RES_LINE = {
  2: '거의 같은 자리에 닿았다.',
  1: '가까이 갔지만, 그는 조금 다르게 적었다.',
  0: '그는 다른 것을 보았다.',
};
