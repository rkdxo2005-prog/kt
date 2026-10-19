// 소리: Web Audio로 만든 바람·거리·참호·기차·바다. 녹음 파일은 쓰지 않는다.
// 브라우저는 사람이 누르기 전에는 소리를 내지 못하므로, 위쪽 '소리' 단추를 눌러야 켜진다.
const Sound = (() => {
  let ac = null, master = null, on = false, current = null, amb = null;
  let white = null, brown = null;

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.8;
    master.connect(ac.destination);
    const len = ac.sampleRate * 3;
    white = ac.createBuffer(1, len, ac.sampleRate);
    brown = ac.createBuffer(1, len, ac.sampleRate);
    const w = white.getChannelData(0), b = brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const r = Math.random() * 2 - 1;
      w[i] = r;
      last = (last + 0.02 * r) / 1.02;
      b[i] = last * 3.5;
    }
    return true;
  }

  // 끝없이 도는 잡음 한 줄기: 소스 → 필터 → 음량
  function bed(out, { buf = 'white', type = 'lowpass', freq = 800, q = 0.7, gain = 0.1 }) {
    const src = ac.createBufferSource();
    src.buffer = buf === 'brown' ? brown : white;
    src.loop = true;
    src.loopStart = Math.random();
    const f = ac.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(out);
    src.start(0, Math.random() * 2);
    return { src, f, g };
  }
  function lfo(param, rate, depth) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = rate; g.gain.value = depth;
    o.connect(g).connect(param);
    o.start();
    return o;
  }
  // 짧은 소리 하나: 잡음 터짐 또는 음
  function burst(out, { buf = 'white', type = 'bandpass', freq = 1200, q = 1, gain = 0.3, attack = 0.002, decay = 0.15, at = 0 }) {
    const t = ac.currentTime + at;
    const src = ac.createBufferSource();
    src.buffer = buf === 'brown' ? brown : white;
    const f = ac.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 2);
    src.stop(t + attack + decay + 0.05);
  }
  function tone(out, { freq = 440, to = null, type = 'sine', gain = 0.1, attack = 0.005, decay = 0.2, at = 0 }) {
    const t = ac.currentTime + at;
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  // 배경 소리마다 { stop } 을 돌려준다.
  function scene(build) {
    const out = ac.createGain();
    out.gain.value = 0.0001;
    out.connect(master);
    out.gain.exponentialRampToValueAtTime(1, ac.currentTime + 1.5);
    const timers = [], nodes = [];
    const every = (min, max, fn) => {
      let alive = true;
      const go = () => { if (!alive) return; fn(); timers.push(setTimeout(go, (min + Math.random() * (max - min)) * 1000)); };
      timers.push(setTimeout(go, Math.random() * max * 500));
      return () => (alive = false);
    };
    build(out, { every, keep: n => nodes.push(n) });
    return {
      stop() {
        timers.forEach(clearTimeout);
        timers.length = 0;
        const t = ac.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(out.gain.value, t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch (e) { /* 이미 멈춤 */ } }); out.disconnect(); }, 1000);
      },
    };
  }

  const shot = (out, gain = 0.5, far = 1) => {
    burst(out, { type: 'lowpass', freq: 2600 / far, q: 0.4, gain, decay: 0.22 * far });
    tone(out, { freq: 90, to: 40, gain: gain * 0.6, decay: 0.25 });
  };

  const build = {
    wind(out, { keep }) {
      const a = bed(out, { buf: 'brown', freq: 420, gain: 0.32 });
      const b = bed(out, { type: 'bandpass', freq: 900, q: 0.6, gain: 0.03 });
      keep(a.src); keep(b.src);
      keep(lfo(a.f.frequency, 0.07, 260)); keep(lfo(a.g.gain, 0.11, 0.14)); keep(lfo(b.f.frequency, 0.05, 400));
    },
    city(out, { keep, every }) {
      const a = bed(out, { type: 'bandpass', freq: 420, q: 0.5, gain: 0.07 });
      keep(a.src); keep(lfo(a.g.gain, 0.2, 0.025));
      every(1.2, 4, () => burst(out, { freq: 1800 + Math.random() * 1500, q: 3, gain: 0.03, decay: 0.05 }));
      every(10, 22, () => { tone(out, { freq: 1320, gain: 0.03, decay: 0.6 }); tone(out, { freq: 1320, gain: 0.025, decay: 0.6, at: 0.28 }); });
    },
    hall(out, { keep, every }) {
      const a = bed(out, { type: 'bandpass', freq: 260, q: 0.6, gain: 0.05 });
      keep(a.src);
      every(5, 9, () => { for (let i = 0; i < 6; i++) burst(out, { buf: 'brown', type: 'lowpass', freq: 500, gain: 0.12, decay: 0.12, at: i * 0.55 }); });
    },
    street(out, { keep, every }) {
      const a = bed(out, { type: 'bandpass', freq: 380, q: 0.5, gain: 0.035 });
      keep(a.src);
      every(1.5, 6, () => { shot(out, 0.12 + Math.random() * 0.1, 2.2); if (Math.random() < 0.4) setTimeout(() => shot(out, 0.1, 2.4), 180 + Math.random() * 300); });
    },
    room(out, { keep, every }) {
      const a = bed(out, { buf: 'brown', freq: 260, gain: 0.05 });
      keep(a.src);
      every(1, 1, () => burst(out, { type: 'highpass', freq: 3500, gain: 0.02, decay: 0.02 }));
    },
    night(out, { keep, every }) {
      const a = bed(out, { buf: 'brown', freq: 300, gain: 0.12 });
      keep(a.src); keep(lfo(a.f.frequency, 0.05, 120));
      every(0.6, 1.6, () => { for (let i = 0; i < 3; i++) tone(out, { freq: 4300, gain: 0.012, decay: 0.03, at: i * 0.06 }); });
    },
    train(out, { keep, every }) {
      const a = bed(out, { buf: 'brown', freq: 180, gain: 0.35 });
      const b = bed(out, { type: 'bandpass', freq: 700, q: 0.8, gain: 0.03 });
      keep(a.src); keep(b.src); keep(lfo(a.g.gain, 1.1, 0.06));
      every(0.95, 0.95, () => { burst(out, { buf: 'brown', type: 'lowpass', freq: 900, gain: 0.22, decay: 0.07 }); burst(out, { buf: 'brown', type: 'lowpass', freq: 900, gain: 0.18, decay: 0.07, at: 0.13 }); });
    },
    country(out, { keep, every }) {
      const a = bed(out, { buf: 'brown', freq: 600, gain: 0.08 });
      keep(a.src); keep(lfo(a.g.gain, 0.08, 0.04));
      every(1, 4, () => { const f = 2400 + Math.random() * 1800; tone(out, { freq: f, to: f * 1.3, gain: 0.02, decay: 0.09 }); tone(out, { freq: f * 1.1, to: f * 0.9, gain: 0.016, decay: 0.1, at: 0.14 }); });
    },
    guns(out, { keep, every }) {
      const a = bed(out, { buf: 'brown', freq: 380, gain: 0.22 });
      keep(a.src); keep(lfo(a.f.frequency, 0.06, 200));
      every(3, 8, () => { tone(out, { freq: 62, to: 34, gain: 0.35, decay: 0.9 }); burst(out, { buf: 'brown', type: 'lowpass', freq: 300, gain: 0.25, decay: 1.2, attack: 0.02 }); });
      every(9, 18, () => { tone(out, { type: 'sawtooth', freq: 110, to: 104, gain: 0.006, attack: 1.2, decay: 2.5 }); });
    },
    sea(out, { keep }) {
      const a = bed(out, { buf: 'brown', freq: 520, gain: 0.25 });
      const b = bed(out, { type: 'highpass', freq: 2600, gain: 0.015 });
      keep(a.src); keep(b.src); keep(lfo(a.g.gain, 0.09, 0.18)); keep(lfo(b.g.gain, 0.09, 0.012));
    },
  };

  const FX = {
    shot: () => shot(master, 0.6, 1),
    stamp: () => { tone(master, { freq: 140, to: 70, gain: 0.3, decay: 0.12 }); burst(master, { type: 'lowpass', freq: 1500, gain: 0.15, decay: 0.05 }); },
    page: () => burst(master, { freq: 2400, q: 0.5, gain: 0.05, attack: 0.03, decay: 0.12 }),
    pencil: () => { for (let i = 0; i < 5; i++) burst(master, { freq: 3200 + Math.random() * 900, q: 4, gain: 0.03, decay: 0.05, at: i * 0.07 }); },
    breath: () => burst(master, { type: 'lowpass', freq: 1300, gain: 0.12, attack: 0.15, decay: 0.6 }),
    wind: () => burst(master, { buf: 'brown', type: 'lowpass', freq: 700, gain: 0.25, attack: 0.3, decay: 1 }),
  };

  function stopAmb() { if (amb) { amb.stop(); amb = null; } }
  function ambient(id) {
    if (id === current && amb) return;
    current = id;
    if (!on || !ac) return;
    stopAmb();
    if (id && build[id]) amb = scene(build[id]);
  }
  function fx(id) {
    if (!on || !ac || !FX[id]) return;
    try { FX[id](); } catch (e) { /* 소리는 없어도 된다 */ }
  }
  function toggle() {
    on = !on;
    if (on) {
      if (!ac && !init()) { on = false; return false; }
      ac.resume();
      const id = current; current = null;
      ambient(id);
    } else {
      stopAmb();
    }
    return on;
  }
  return { ambient, fx, toggle, get on() { return on; } };
})();
