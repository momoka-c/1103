(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- 数値だけのstyleを画面サイズ基準(--u)に変換 ---------- */
  $$('[style]').forEach(el => {
    (el.getAttribute('style') || '').split(';').forEach(decl => {
      const [k, v] = decl.split(':').map(s => s && s.trim());
      if (k && v && /^-?\d+(\.\d+)?$/.test(v)) el.style.setProperty(k, `calc(var(--u) * ${v})`);
    });
  });

  /* ---------- assets フォルダの画像を読み込む(無ければ仮シェイプ) ---------- */
  $$('[data-asset]').forEach(el => {
    const file = (window.ASSETS || {})[el.dataset.asset];
    if (!file) return;
    // assets/ フォルダ → 無ければ index.html と同じ階層 の順に探す
    const candidates = ['assets/' + file, file];
    const tryLoad = i => {
      if (i >= candidates.length) return;
      const url = candidates[i];
      const img = new Image();
      img.onload = () => {
        const z = (window.SCALE || {})[el.dataset.asset];
        if (z && z !== 1) el.style.scale = z; // 中心を基準に拡大
        el.classList.add('hasimg');
        el.style.setProperty('--img', `url("${url}")`);
        el.style.backgroundImage = `url("${url}")`;
      };
      img.onerror = () => tryLoad(i + 1);
      img.src = url;
    };
    tryLoad(0);
  });

  /* ---------- 画面遷移 ---------- */
  const show = id => {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    if (id === 'box') renderBox();
    if (id === 'calendar') renderCalendar();
  };
  $('#goFind').onclick = () => show('shoot');
  $('#goBox').onclick = () => show('box');
  $('#shootBack').onclick = () => show('home');
  $('#cropBack').onclick = () => show('shoot');
  $('#titleBack').onclick = () => show('home');
  $('#goCal').onclick = () => show('calendar');
  $('#calBack').onclick = () => show('box');

  /* ---------- IndexedDB ---------- */
  const dbp = new Promise((res, rej) => {
    const r = indexedDB.open('texturebox', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('items', { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const tx = async (mode, fn) => {
    const db = await dbp;
    return new Promise((res, rej) => {
      const t = db.transaction('items', mode);
      const out = fn(t.objectStore('items'));
      t.oncomplete = () => res(out && out.result);
      t.onerror = () => rej(t.error);
    });
  };
  const getAll = () => tx('readonly', s => s.getAll());
  const put = item => tx('readwrite', s => s.put(item));
  const del = id => tx('readwrite', s => s.delete(id));

  /* ---------- 日付 ---------- */
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmt = s => s.replaceAll('-', '/');
  $('#dateOut').textContent = fmt(ymd(new Date()));

  /* ---------- 撮影 / 選択 ---------- */
  const camArea = $('#camArea');
  const openCam = () => $('#fileCam').click();
  camArea.onclick = openCam;
  $('#shutter').onclick = openCam;
  $('#pickBtn').onclick = () => $('#fileLib').click();
  const onFile = e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (f) loadForCrop(f);
  };
  $('#fileCam').onchange = onFile;
  $('#fileLib').onchange = onFile;

  /* ---------- 切り抜き ---------- */
  const area = $('#cropArea'), img = $('#cropImg'), frame = $('#frame'), handle = $('#handle');
  let g = null; // {scale, offX, offY, dw, dh}
  let fr = { x: 0, y: 0, s: 0 };

  function loadForCrop(file) {
    const url = URL.createObjectURL(file);
    img.onload = () => {
      show('crop');
      $('#dateOut').textContent = fmt(ymd(new Date()));
      $('#noticeIn').value = '';
      requestAnimationFrame(initCrop);
    };
    img.src = url;
  }

  function initCrop() {
    const aw = area.clientWidth, ah = area.clientHeight;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const scale = Math.min(aw / nw, ah / nh);
    g = { scale, dw: nw * scale, dh: nh * scale, offX: (aw - nw * scale) / 2, offY: (ah - nh * scale) / 2 };
    const s = Math.min(g.dw, g.dh) * 0.6;
    fr = { x: g.offX + (g.dw - s) / 2, y: g.offY + (g.dh - s) / 2, s };
    frame.style.display = 'block';
    drawFrame();
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function drawFrame() {
    frame.style.left = fr.x + 'px'; frame.style.top = fr.y + 'px';
    frame.style.width = fr.s + 'px'; frame.style.height = fr.s + 'px';
  }
  function drag(el, onMove) {
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      let lx = e.clientX, ly = e.clientY;
      const mv = ev => { onMove(ev.clientX - lx, ev.clientY - ly); lx = ev.clientX; ly = ev.clientY; drawFrame(); };
      const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
  }
  drag(frame, (dx, dy) => {
    fr.x = clamp(fr.x + dx, g.offX, g.offX + g.dw - fr.s);
    fr.y = clamp(fr.y + dy, g.offY, g.offY + g.dh - fr.s);
  });
  drag(handle, (dx, dy) => {
    const d = (dx + dy) / 2;
    const max = Math.min(g.offX + g.dw - fr.x, g.offY + g.dh - fr.y);
    fr.s = clamp(fr.s + d, 40, max);
  });

  /* ランダムな形状(多角形) */
  function randomPoly() {
    const n = 7 + Math.floor(Math.random() * 4);
    const rot = Math.random() * Math.PI * 2;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2 + (Math.random() - .5) * 0.35;
      const r = 0.58 + Math.random() * 0.42;
      pts.push([0.5 + Math.cos(a) * r * 0.5, 0.5 + Math.sin(a) * r * 0.5]);
    }
    return pts;
  }

  $('#saveBtn').onclick = async () => {
    if (!g) return;
    const sx = (fr.x - g.offX) / g.scale, sy = (fr.y - g.offY) / g.scale, ss = fr.s / g.scale;
    const out = Math.min(420, Math.round(ss));
    const c = document.createElement('canvas');
    c.width = c.height = out;
    const ctx = c.getContext('2d');
    const poly = randomPoly();
    ctx.beginPath();
    poly.forEach(([x, y], i) => i ? ctx.lineTo(x * out, y * out) : ctx.moveTo(x * out, y * out));
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, sx, sy, ss, ss, 0, 0, out, out);
    const now = new Date();
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      img: c.toDataURL('image/png'),
      notice: $('#noticeIn').value.trim(),
      date: ymd(now),
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      size: 74 + Math.round(Math.random() * 42),
      rot: Math.round((Math.random() - .5) * 50)
    };
    await put(item);
    g = null;
    show('box');
  };

  /* ---------- Texture Box ---------- */
  async function renderBox() {
    const items = (await getAll()).sort((a, b) => (b.date + b.time + b.id).localeCompare(a.date + a.time + a.id));
    const pile = $('#pile');
    pile.innerHTML = '';
    $('#empty').style.display = items.length ? 'none' : 'block';
    items.forEach(it => {
      const b = document.createElement('button');
      b.className = 'tex';
      b.style.width = b.style.height = `calc(var(--u) * ${it.size})`;
      b.style.setProperty('--r', it.rot + 'deg');
      b.style.animationDelay = Math.random() * 0.25 + 's';
      b.innerHTML = `<img src="${it.img}" alt="">`;
      b.onclick = () => openDetail(it);
      pile.appendChild(b);
    });
    const last = items[0];
    $('#lNotice').textContent = last ? (last.notice || '—') : '—';
    $('#lDate').textContent = last ? fmt(last.date) : '—';
  }

  /* ---------- 詳細 ---------- */
  let current = null;
  function openDetail(it) {
    current = it;
    $('#dImg').src = it.img;
    $('#dNotice').textContent = it.notice || '(コメントなし)';
    $('#dDate').textContent = `${fmt(it.date)}  ${it.time || ''}`;
    $('#detail').hidden = false;
  }
  $('#dClose').onclick = () => { $('#detail').hidden = true; };
  $('#detail').onclick = e => { if (e.target.id === 'detail') $('#detail').hidden = true; };
  $('#dDel').onclick = async () => {
    if (!current || !confirm('このテクスチャーを削除しますか?')) return;
    await del(current.id);
    $('#detail').hidden = true;
    const active = $('.screen.active').id;
    if (active === 'box') renderBox(); else if (active === 'calendar') renderCalendar();
  };

  /* ---------- カレンダー ---------- */
  async function renderCalendar() {
    const items = await getAll();
    const byDate = {};
    items.forEach(it => { (byDate[it.date] ||= []).push(it); });
    const today = new Date();
    const months = new Set();
    for (let d = -1; d <= 1; d++) {
      const m = new Date(today.getFullYear(), today.getMonth() + d, 1);
      months.add(`${m.getFullYear()}-${m.getMonth()}`);
    }
    items.forEach(it => { const [y, m] = it.date.split('-'); months.add(`${+y}-${+m - 1}`); });
    const list = [...months].map(s => s.split('-').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const body = $('#calBody');
    body.innerHTML = '';
    list.forEach(([y, m]) => {
      const wrap = document.createElement('div');
      wrap.className = 'month';
      wrap.dataset.cur = (y === today.getFullYear() && m === today.getMonth()) ? '1' : '';
      let html = `<h3>${y}年${m + 1}月</h3><div class="grid">` +
        ['日', '月', '火', '水', '木', '金', '土'].map(d => `<div class="dow">${d}</div>`).join('');
      const first = new Date(y, m, 1).getDay();
      const days = new Date(y, m + 1, 0).getDate();
      for (let i = 0; i < first; i++) html += '<div></div>';
      for (let d = 1; d <= days; d++) {
        const key = `${y}-${pad(m + 1)}-${pad(d)}`;
        const hit = byDate[key];
        const isToday = key === ymd(today);
        if (hit) html += `<button class="d has" data-k="${key}" style="background-image:url(${hit[hit.length - 1].img});background-color:#a99">${d}</button>`;
        else html += `<div class="d${isToday ? ' today' : ''}">${d}</div>`;
      }
      wrap.innerHTML = html + '</div>';
      body.appendChild(wrap);
    });
    $$('.d.has', body).forEach(b => {
      b.onclick = () => {
        const arr = byDate[b.dataset.k];
        openDetail(arr[arr.length - 1]);
      };
    });
    const cur = $('.month[data-cur="1"]', body);
    if (cur) body.scrollTop = cur.offsetTop - 60;
  }
})();