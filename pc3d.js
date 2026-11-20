/*
 * pc3d.js — 3D-превью сборки внизу страницы.
 * Не меняет старый код: следит за корзиной (#cartList, #total, #watts)
 * и читает глобальный массив cartList из script.js.
 * three.js подгружается сам с CDN.
 */
(function () {
  'use strict';

  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const ACCENT = 0x07f178;
  const CATS = [
    ['case', 'Корпус'], ['motherboard', 'Мат. плата'], ['cpu', 'Процессор'], ['cooler', 'Охлаждение'],
    ['ram', 'Память'], ['gpu', 'Видеокарта'], ['storage', 'Накопитель'], ['psu', 'Блок питания']
  ];

  // ---------- Стили и разметка (используют переменные из style.css) ----------
  const style = document.createElement('style');
  style.textContent = `
    .pc3d{margin:0 16px 16px;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:16px}
    .pc3d-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
    .pc3d-head h2{font-size:18px;font-weight:500}
    .pc3d-chips{display:flex;gap:6px;flex-wrap:wrap}
    .pc3d-chip{font-size:12px;padding:3px 9px;border-radius:12px;border:1px solid var(--border);color:var(--muted);transition:color .25s,border-color .25s,background .25s}
    .pc3d-chip.on{color:var(--accent);border-color:var(--accent);background:var(--accent-dim)}
    .pc3d-view{position:relative;height:520px;border-radius:8px;overflow:hidden;cursor:grab;touch-action:pan-y;
      background:radial-gradient(ellipse at 50% 38%,#13203a 0%,var(--bg) 78%)}
    .pc3d-view:active{cursor:grabbing}
    .pc3d-view canvas{display:block;width:100%;height:100%}
    .pc3d-msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center;color:var(--muted);font-size:14px}
    .pc3d-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:10px;font-size:12px;color:var(--muted)}
    @media (max-width:720px){.pc3d{margin:0 16px 16px}.pc3d-view{height:380px}}
  `;
  document.head.appendChild(style);

  const section = document.createElement('section');
  section.className = 'pc3d';
  section.innerHTML = `
    <div class="pc3d-head">
      <h2>3D-превью сборки</h2>
      <div class="pc3d-chips">${CATS.map(c => `<span class="pc3d-chip" data-k="${c[0]}">${c[1]}</span>`).join('')}</div>
    </div>
    <div class="pc3d-view"><div class="pc3d-msg">Загрузка 3D…</div></div>
    <div class="pc3d-foot">
      <span>Тяни мышью — вращение. Ctrl + колесо — масштаб.</span>
      <button class="btn ghost" type="button" id="pc3dReset">Сбросить вид</button>
    </div>`;
  const footer = document.querySelector('footer');
  footer ? footer.before(section) : document.body.appendChild(section);

  const view = section.querySelector('.pc3d-view');
  const msg = section.querySelector('.pc3d-msg');

  loadThree().then(init).catch(function () {
    msg.textContent = 'Не удалось загрузить three.js — проверь интернет-соединение.';
  });

  function loadThree() {
    return new Promise(function (resolve, reject) {
      if (window.THREE) return resolve(window.THREE);
      const s = document.createElement('script');
      s.src = THREE_URL;
      s.onload = function () { resolve(window.THREE); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // ---------- 3D ----------
  function init(THREE) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      msg.textContent = 'WebGL недоступен в этом браузере.';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.appendChild(renderer.domElement);
    msg.remove();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    const target = new THREE.Vector3(0, 0.1, 0);

    // --- свет ---
    scene.add(new THREE.AmbientLight(0x9fb0d0, 0.65));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(5, 8, 6);
    scene.add(sun);
    const p1 = new THREE.PointLight(ACCENT, 0.9, 9); p1.position.set(0.3, 0.3, 1.8); scene.add(p1);
    const p2 = new THREE.PointLight(0x00c8ff, 0.7, 9); p2.position.set(0.3, 1.8, -1.5); scene.add(p2);

    // --- материалы (общие, не пересоздаются) ---
    const std = (color, r, m, o) => new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: r, metalness: m }, o));
    const basic = (color, o) => new THREE.MeshBasicMaterial(Object.assign({ color: color }, o));
    const M = {
      dark: std(0x141c30, 0.6, 0.4), steel: std(0x9aa5b8, 0.3, 0.85), pcb: std(0x0f3a46, 0.7, 0.2),
      black: std(0x05080f, 0.8, 0.2), copper: std(0xc77a35, 0.3, 0.9), gpu: std(0x1a2238, 0.45, 0.6),
      tray: std(0x0a1020, 0.8, 0.3), rubber: std(0x0c111d, 0.9, 0),
      led: basic(ACCENT), cyan: basic(0x00c8ff),
      glass: std(0x9ec5ff, 0.1, 0.1, { transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide }),
      front: std(0x0b1222, 0.6, 0.2, { transparent: true, opacity: 0.4 }),
      ghost: basic(ACCENT, { transparent: true, opacity: 0.05, depthWrite: false }),
      line: new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.55 }),
      ghostLine: new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.22 })
    };

    // --- пол ---
    const floor = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(6, 64), basic(0x0a1020, { transparent: true, opacity: 0.7 }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = -2.47; floor.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(5.9, 6, 64), basic(ACCENT, { transparent: true, opacity: 0.45 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -2.46; floor.add(ring);
    const grid = new THREE.GridHelper(12, 24, 0x1f2c47, 0x14203a);
    grid.position.y = -2.46; floor.add(grid);
    scene.add(floor);

    const dyn = new THREE.Group();   // всё, что зависит от корзины
    scene.add(dyn);
    const spinners = [];             // вентиляторы

    // --- хелперы ---
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const mm = (v, def, a, b) => clamp((+v || def) * 0.0095, a, b);   // мм → единицы сцены
    const add = (p, geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); p.add(o); return o; };
    const box = (p, w, h, d, m, x, y, z) => add(p, new THREE.BoxGeometry(w, h, d), m, x, y, z);
    const wire = (p, w, h, d, m, x, y, z) => {
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), m);
      l.position.set(x, y, z); p.add(l);
    };
    const cyl = (p, r, len, m, axis, x, y, z) => {
      const o = add(p, new THREE.CylinderGeometry(r, r, len, 20), m, x, y, z);
      if (axis === 'x') o.rotation.z = Math.PI / 2;
      if (axis === 'z') o.rotation.x = Math.PI / 2;
      return o;
    };

    function fan(p, size, x, y, z, led) {
      const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
      const s = size / 2;
      box(g, size, 0.04, 0.1, M.dark, 0, s - 0.02, 0); box(g, size, 0.04, 0.1, M.dark, 0, -s + 0.02, 0);
      box(g, 0.04, size, 0.1, M.dark, s - 0.02, 0, 0); box(g, 0.04, size, 0.1, M.dark, -s + 0.02, 0, 0);
      add(g, new THREE.TorusGeometry(s * 0.9, 0.015, 6, 40), led, 0, 0, 0.05);
      const rotor = new THREE.Group(); g.add(rotor);
      cyl(rotor, s * 0.2, 0.08, M.black, 'z', 0, 0, 0);
      for (let i = 0; i < 7; i++) {
        const a = new THREE.Group(); a.rotation.z = i * Math.PI * 2 / 7; rotor.add(a);
        box(a, s * 0.55, s * 0.2, 0.012, M.black, s * 0.55, 0, 0).rotation.x = 0.6;
      }
      spinners.push(rotor);
    }

    // --- геометрия сборки ---
    // Корпус: x от -1.1 (задняя стенка под плату) до 1.1 (стекло), y ±2.3, z от -2.2 (зад) до 2.2 (перед)
    const BX = -1.01;                      // поверхность материнской платы
    const CY = 1.25, CZ = -1.15;           // положение сокета
    const slotZ = i => CZ + 0.75 + i * 0.13;

    function layout(mb) {
      const f = String((mb && mb.form_factor) || 'atx').toLowerCase();
      let L = { h: 3, d: 2.5, gpuY: 0, m2Y: 0.75, slots: 4, atx: true };
      if (f.indexOf('itx') > -1) L = { h: 1.7, d: 2, gpuY: 0.4, m2Y: 0.85, slots: 2, atx: false };
      else if (f.indexOf('micro') > -1 || f.indexOf('matx') > -1 || f.indexOf('m-atx') > -1) L = { h: 2.4, d: 2.5, gpuY: 0, m2Y: 0.75, slots: 4, atx: false };
      if (mb && +mb.ram_slots) L.slots = clamp(+mb.ram_slots, 1, 4);
      return L;
    }

    function caseGroup(ghost) {
      const g = new THREE.Group(), W = 2.2, H = 4.6, D = 4.4;
      wire(g, W, H, D, ghost ? M.ghostLine : M.line, 0, 0, 0);
      if (ghost) return g;
      box(g, W, 0.08, D, M.dark, 0, -2.3, 0); box(g, W, 0.08, D, M.dark, 0, 2.3, 0);
      box(g, 0.06, H, D, M.tray, -1.1, 0, 0); box(g, W, H, 0.06, M.dark, 0, 0, -2.2);
      box(g, W, H, 0.06, M.front, 0, 0, 2.2);
      box(g, 0.03, H, D, M.glass, 1.1, 0, 0);
      [[-0.8, -1.7], [0.8, -1.7], [-0.8, 1.7], [0.8, 1.7]].forEach(p => cyl(g, 0.1, 0.12, M.black, 'y', p[0], -2.4, p[1]));
      [1.5, 0, -1.5].forEach(y => fan(g, 1.15, 0, y, 2.08, M.cyan));
      fan(g, 0.95, 0, 1.55, -2.1, M.cyan);
      return g;
    }

    function boardGroup(L, mb) {
      const g = new THREE.Group(), ghost = !mb, cy = 2.05 - L.h / 2, cz = -2 + L.d / 2;
      box(g, 0.06, L.h, L.d, ghost ? M.ghost : M.pcb, BX - 0.03, cy, cz);
      wire(g, 0.06, L.h, L.d, ghost ? M.ghostLine : M.line, BX - 0.03, cy, cz);
      if (ghost) return g;
      box(g, 0.09, 0.12, 0.9, M.black, BX + 0.045, L.gpuY, -1.5);                         // PCIe
      for (let i = 0; i < L.slots; i++) box(g, 0.09, 1.3, 0.05, M.black, BX + 0.045, CY, slotZ(i)); // слоты RAM
      box(g, 0.04, 0.6, 0.6, M.black, BX + 0.02, CY, CZ);                                 // сокет
      box(g, 0.22, 0.3, 1.1, M.dark, BX + 0.11, 1.85, CZ + 0.05);                         // VRM сверху
      box(g, 0.22, 0.8, 0.3, M.dark, BX + 0.11, CY, -1.78);                               // VRM сзади
      if (L.atx) box(g, 0.1, 0.45, 0.45, M.steel, BX + 0.05, -0.6, -0.3);                 // чипсет
      return g;
    }

    function cpuGroup() {
      const g = new THREE.Group();
      box(g, 0.04, 0.4, 0.4, M.steel, BX + 0.06, CY, CZ);
      box(g, 0.01, 0.3, 0.3, M.dark, BX + 0.085, CY, CZ);
      return g;
    }

    function coolerGroup(c) {
      const g = new THREE.Group();
      if (/liquid|aio|water|жидк|сжо/.test(String(c.cooling_type || '').toLowerCase())) {
        cyl(g, 0.27, 0.22, M.dark, 'x', BX + 0.2, CY, CZ);                                // помпа
        add(g, new THREE.TorusGeometry(0.19, 0.02, 6, 32), M.led, BX + 0.32, CY, CZ).rotation.y = Math.PI / 2;
        box(g, 0.6, 2.6, 0.25, M.dark, 0, 0.7, 1.88);                                     // радиатор спереди
        [0, 1].forEach(k => {
          const pts = [[-0.75, 1.45 - k * 0.25, -0.9 + k * 0.1], [-0.3, 1.9 - k * 0.15, -0.2], [-0.05, 1.95 - k * 0.1, 1.0], [0, 1.9 - k * 0.15, 1.78]]
            .map(p => new THREE.Vector3(p[0], p[1], p[2]));
          add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.035, 8), M.rubber, 0, 0, 0);
        });
      } else {
        const h = mm(c.height_mm, 155, 0.9, 1.65), x0 = BX + 0.16, mid = x0 + h * 0.425;
        box(g, 0.1, 0.5, 0.5, M.copper, BX + 0.12, CY, CZ);
        for (let i = 0; i < 11; i++) box(g, h * 0.85, 1.1, 0.012, M.steel, mid, CY, CZ - 0.25 + i * 0.05);
        [-0.18, -0.06, 0.06, 0.18].forEach(dz => cyl(g, 0.028, h * 0.85, M.copper, 'x', mid, CY, CZ + dz));
        fan(g, Math.min(1.1, h * 0.8), x0 + h * 0.45, CY, CZ + 0.33, M.led);
      }
      return g;
    }

    function ramGroup(r, L) {
      const g = new THREE.Group();
      let n = typeof r.kit === 'number' ? r.kit : (+((/(\d+)\s*[x×х]/i.exec(String(r.kit || '')) || [])[1]) || 1);
      n = clamp(n, 1, L.slots);
      const order = L.slots >= 4 ? [1, 3, 0, 2] : [0, 1, 2];
      for (let k = 0; k < n; k++) {
        const z = slotZ(order[k]);
        box(g, 0.3, 1.25, 0.045, M.dark, BX + 0.19, CY, z);
        box(g, 0.025, 1.2, 0.05, M.led, BX + 0.34, CY, z);
      }
      return g;
    }

    function gpuGroup(c, L) {
      const g = new THREE.Group(), len = mm(c.length_mm, 280, 1.6, 3.5), z0 = -1.98, cx = BX + 0.05 + 0.575;
      box(g, 1.15, 0.5, len, M.gpu, cx, L.gpuY, z0 + len / 2);
      box(g, 0.02, 0.04, len * 0.8, M.led, BX + 1.21, L.gpuY, z0 + len / 2);
      box(g, 1.2, 0.58, 0.02, M.steel, BX + 0.65, L.gpuY, z0 - 0.02);                     // планка
      for (let i = 0; i < 8; i++) box(g, 0.03, 0.46, 0.03, M.black, BX + 1.205, L.gpuY, z0 + len * (0.12 + i * 0.11));
      return g;
    }

    function storageGroup(s, L) {
      const g = new THREE.Group();
      if (/nvme|m\.?2|pcie/i.test(String(s.interface) + ' ' + String(s.form_factor))) {
        box(g, 0.03, 0.2, 0.8, M.dark, BX + 0.015, L.m2Y, CZ + 0.1);
        box(g, 0.05, 0.22, 0.78, M.steel, BX + 0.065, L.m2Y, CZ + 0.1);
      } else {
        box(g, 0.1, 0.7, 0.95, M.dark, -1.02, 1.3, 1.2);                                   // 2.5" на задней стенке
        box(g, 0.012, 0.5, 0.7, M.steel, -0.965, 1.3, 1.2);
      }
      return g;
    }

    function psuGroup() {
      const g = new THREE.Group();
      box(g, 1.4, 0.82, 1.55, M.dark, -0.37, -1.85, -1.365);
      box(g, 0.02, 0.06, 1.2, M.led, 0.34, -1.85, -1.365);
      box(g, 0.02, 0.3, 0.5, M.steel, 0.335, -1.85, -1.8);
      return g;
    }

    // ---------- синхронизация с корзиной ----------
    let shown = new Set();
    const born = new Map();   // key -> время появления (для анимации вылета)

    function sync() {
      const items = (typeof cartList !== 'undefined' && Array.isArray(cartList)) ? cartList : [];
      const by = {};
      items.forEach(it => { if (it && it.category && !by[it.category]) by[it.category] = it; });

      dyn.children.slice().forEach(c => {
        c.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        dyn.remove(c);
      });
      spinners.length = 0;

      const L = layout(by.motherboard), next = new Set(), now = performance.now();
      const put = (cat, build, ghost) => {
        const it = by[cat];
        let g;
        if (it) {
          g = build(it);
          const key = cat + ':' + it.vendor + it.model;
          next.add(key);
          if (!shown.has(key)) born.set(key, now);
          g.userData.key = key;
          if (born.has(key)) g.position.x = 3;
        } else if (ghost) {
          g = ghost();
        }
        if (g) dyn.add(g);
      };
      put('case', () => caseGroup(false), () => caseGroup(true));
      put('motherboard', mb => boardGroup(L, mb), () => boardGroup(L, null));
      put('cpu', cpuGroup);
      put('cooler', coolerGroup);
      put('ram', r => ramGroup(r, L));
      put('gpu', c => gpuGroup(c, L));
      put('storage', s => storageGroup(s, L));
      put('psu', psuGroup);
      shown = next;

      section.querySelectorAll('.pc3d-chip').forEach(ch => ch.classList.toggle('on', !!by[ch.dataset.k]));
    }

    let pending = false;
    function schedule() {
      if (pending) return;
      pending = true;
      setTimeout(function () { pending = false; sync(); }, 0);
    }
    const mo = new MutationObserver(schedule);
    ['cartList', 'total', 'watts'].forEach(id => {
      const el = document.getElementById(id);
      if (el) mo.observe(el, { childList: true, characterData: true, subtree: true });
    });
    sync();

    // ---------- камера ----------
    const DEF = { theta: 0.75, phi: 1.28 };
    let theta = DEF.theta, phi = DEF.phi, zoom = 1, baseR = 11.5;
    let drag = null, lastInteract = -1e9, swing = 1, visible = true;

    view.addEventListener('pointerdown', e => {
      drag = { x: e.clientX, y: e.clientY };
      lastInteract = performance.now();
      try { view.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    view.addEventListener('pointermove', e => {
      if (!drag) return;
      theta -= (e.clientX - drag.x) * 0.008;
      phi = clamp(phi - (e.clientY - drag.y) * 0.006, 0.4, 1.65);
      drag.x = e.clientX; drag.y = e.clientY;
      lastInteract = performance.now();
    });
    const endDrag = () => { drag = null; lastInteract = performance.now(); };
    view.addEventListener('pointerup', endDrag);
    view.addEventListener('pointercancel', endDrag);
    view.addEventListener('wheel', e => {
      if (!e.ctrlKey) return;               // обычная прокрутка страницы не перехватывается
      e.preventDefault();
      zoom = clamp(zoom * (1 + e.deltaY * 0.002), 0.5, 1.6);
      lastInteract = performance.now();
    }, { passive: false });
    section.querySelector('#pc3dReset').addEventListener('click', () => {
      theta = DEF.theta; phi = DEF.phi; zoom = 1; lastInteract = performance.now();
    });

    function resize() {
      const w = view.clientWidth, h = view.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      baseR = 11.5 * Math.max(1, 1.2 / camera.aspect);
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(view);
    window.addEventListener('resize', resize);
    resize();
    if (window.IntersectionObserver) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(view);
    }

    // ---------- цикл ----------
    const ease = t => 1 - Math.pow(1 - t, 3);
    let last = performance.now();

    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      spinners.forEach(r => { r.rotation.z -= 7 * dt; });

      dyn.children.forEach(g => {
        const t0 = born.get(g.userData.key);
        if (t0 === undefined) return;
        const t = (now - t0) / 700;
        if (t >= 1) { born.delete(g.userData.key); g.position.x = 0; }
        else g.position.x = (1 - ease(Math.max(0, t))) * 3;
      });

      swing += ((now - lastInteract > 3500 && !drag ? 1 : 0) - swing) * 0.04;
      const th = theta + swing * Math.sin(now * 0.0004) * 0.35, r = baseR * zoom;
      camera.position.set(
        target.x + r * Math.sin(phi) * Math.sin(th),
        target.y + r * Math.cos(phi),
        target.z + r * Math.sin(phi) * Math.cos(th)
      );
      camera.lookAt(target);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }
})();
